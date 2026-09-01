/* Re-render the template's own pages at real device sizes. The bundled
   screen.png files are full-page captures at odd widths (488x1600 for the
   homepage), which crop badly in a 16:10 card. */
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { createRequire } from 'node:module';
const SCRUB = createRequire(import.meta.url)('./scrub.js');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find(p => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9335;
const SRC = 'F:/projects/neev/_stitch/stitch_nexora_digital_marketplace';
const OUT = 'F:/projects/neev/assets/img/designs';
const JOBS = [
  { page: 'nexora_marketplace_homepage',       out: 'marketplace-desktop.png', w: 1280, h: 800, mobile: false, dsf: 1, scrollTo: 'Featured Products' },
  { page: 'nexora_marketplace_mobile_home',    out: 'marketplace-mobile.png',  w: 390,  h: 844, mobile: true,  dsf: 2, scrollTo: 'Featured' },
  { page: 'submit_a_brief_desktop',            out: 'booking-desktop.png',     w: 1280, h: 800, mobile: false, dsf: 1 },
  { page: 'submit_a_brief_mobile',             out: 'booking-mobile.png',      w: 390,  h: 844, mobile: true,  dsf: 2 },
  { page: 'nexora_checkout_desktop',           out: 'checkout-desktop.png',    w: 1280, h: 800, mobile: false, dsf: 1 },
  { page: 'nexora_checkout_mobile',            out: 'checkout-mobile.png',     w: 390,  h: 844, mobile: true,  dsf: 2 },
];

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-designs-profile',
  'about:blank',
], { stdio: 'ignore' });

let list = null;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); list = await r.json(); if (list.length) break; } catch {}
  await sleep(250);
}
if (!list?.length) { console.error('no CDP target'); proc.kill(); process.exit(1); }

const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(res => ws.addEventListener('open', res));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise(res => {
  const i = ++id; pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Runtime.enable');

for (const j of JOBS) {
  await send('Emulation.setDeviceMetricsOverride', { width: j.w, height: j.h, deviceScaleFactor: j.dsf, mobile: j.mobile });
  await send('Page.navigate', { url: `file:///${SRC}/${j.page}/code.html` });
  let ok = false;
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    // Tailwind arrives over CDN and rewrites the page; wait for images too.
    const done = await evalJs('document.readyState==="complete" && [...document.images].every(i=>i.complete)');
    if (done) { ok = true; break; }
  }
  await sleep(1000);
  const scrubbed = await evalJs(SCRUB);
  if (j.scrollTo) {
    const found = await evalJs(`(() => {
      const want = ${JSON.stringify(j.scrollTo)};
      const el = [...document.querySelectorAll('h1,h2,h3,p,span,div')]
        .filter(e => !e.children.length && (e.textContent || '').trim().toLowerCase().includes(want.toLowerCase()))[0];
      if (!el) return false;
      const top = el.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo(0, Math.max(0, top));
      return Math.round(window.scrollY);
    })()`);
    if (found === false) console.log(`  (scrollTo "${j.scrollTo}" not found in ${j.page})`);
  }
  await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const b64 = shot.result?.data;
  if (!b64) { console.log(`FAIL ${j.out}`); continue; }
  writeFileSync(`${OUT}/${j.out}`, Buffer.from(b64, 'base64'));
  console.log(`${ok ? 'OK  ' : 'WARN'} ${j.out.padEnd(24)} ${(Buffer.from(b64,'base64').length/1024|0)}KB  scrubbed=${JSON.stringify(scrubbed)}`);
}
ws.close(); proc.kill();
