/* Photographs every template in templates/<slug>/index.html at desktop and
   phone size, straight from the file. These are the catalogue previews, so they
   are pictures of pages that really exist and that a visitor can open.

   node scripts/shots-templates.mjs [slug ...]      (no args = all of them) */
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const ROOT = path.resolve('.');
const TPL = path.join(ROOT, 'templates');
const OUT = path.join(ROOT, 'assets', 'img', 'templates');
mkdirSync(OUT, { recursive: true });

const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(TPL).filter((d) => existsSync(path.join(TPL, d, 'index.html')));
if (!slugs.length) { console.error('no templates found in ' + TPL); process.exit(1); }

const PORT = 9348;
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-tplshots',
  'about:blank',
], { stdio: 'ignore' });

let list = null;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); list = await r.json(); if (list.length) break; } catch {}
  await sleep(250);
}
if (!list?.length) { console.error('no CDP target'); proc.kill(); process.exit(1); }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id; pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Runtime.enable');

const VIEWS = [
  { name: 'desktop', w: 1280, h: 800, mobile: false, dsf: 1 },
  { name: 'mobile', w: 390, h: 844, mobile: true, dsf: 2 },
];

for (const slug of slugs) {
  const file = path.join(TPL, slug, 'index.html');
  if (!existsSync(file)) { console.log(`SKIP ${slug} (no index.html)`); continue; }
  for (const v of VIEWS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: v.w, height: v.h, deviceScaleFactor: v.dsf, mobile: v.mobile,
    });
    await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
    let ok = false;
    for (let i = 0; i < 60; i++) {
      await sleep(200);
      if (await ev('document.readyState==="complete" && document.fonts.status==="loaded"')) { ok = true; break; }
    }
    /* The DEMO ribbon belongs on the live demo page, not inside the catalogue
       thumbnail — the card already carries a DEMO badge, and the preview should
       show the design. Hide it for the photograph only. */
    const hidden = await ev("(() => { const r = document.querySelectorAll('.neev-demo-ribbon'); r.forEach(e => e.style.display = 'none'); return r.length; })()");
    if (hidden > 1) console.log(`    (note: ${slug} carries ${hidden} demo ribbons — run scripts/demo-ribbon.mjs to clean up)`);
    /* Entrance animations must finish, or the shot catches a half-faded hero. */
    await sleep(900);
    await ev('window.scrollTo(0,0)');
    await sleep(200);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const b64 = shot.result?.data;
    if (!b64) { console.log(`FAIL ${slug}-${v.name}`); continue; }
    writeFileSync(path.join(OUT, `${slug}-${v.name}.png`), Buffer.from(b64, 'base64'));
    console.log(`${ok ? 'OK  ' : 'WARN'} ${slug}-${v.name}  ${(Buffer.from(b64, 'base64').length / 1024 | 0)}KB`);
  }
}
ws.close(); proc.kill();
