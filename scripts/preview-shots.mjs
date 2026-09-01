/* Local site ke screenshots. Browser pane is machine par blank deta hai,
   isliye seedha CDP se capture karte hain. Output scratchpad me jaata hai. */
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find(p => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9336;
const BASE = 'http://localhost:4322';
const OUT = process.argv[2] || 'C:/Users/KISHAN/AppData/Local/Temp/claude/C--Users-KISHAN/6539a264-20f1-4a0b-a82d-8d71dd02ac8b/scratchpad/neev-shots';
mkdirSync(OUT, { recursive: true });

const JOBS = (process.env.JOBS ? JSON.parse(process.env.JOBS) : [
  { path: '/',                        out: 'home-desktop.png',   w: 1280, h: 900,  full: true },
  { path: '/',                        out: 'home-mobile.png',    w: 390,  h: 844,  full: true,  mobile: true },
  { path: '/designs.html',            out: 'designs-desktop.png',w: 1280, h: 900,  full: true },
  { path: '/design-mithai-wala.html', out: 'detail-desktop.png', w: 1280, h: 900,  full: true },
  { path: '/pricing.html',            out: 'pricing-desktop.png',w: 1280, h: 900,  full: true },
  { path: '/brief.html',              out: 'brief-desktop.png',  w: 1280, h: 900,  full: true },
  { path: '/brief.html',              out: 'brief-mobile.png',   w: 390,  h: 844,  full: true,  mobile: true },
  { path: '/shortlist.html',          out: 'shortlist.png',      w: 1280, h: 900,  full: true },
]);

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-preview-profile',
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
await send('Log.enable');
const consoleErrors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Log.entryAdded' && m.params?.entry?.level === 'error') consoleErrors.push(m.params.entry.text);
});

for (const j of JOBS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: j.w, height: j.h, deviceScaleFactor: j.mobile ? 2 : 1, mobile: !!j.mobile,
  });
  await send('Page.navigate', { url: BASE + j.path });
  let ok = false;
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    if (await evalJs('document.readyState==="complete" && document.fonts.status==="loaded" && [...document.images].every(i=>i.complete)')) { ok = true; break; }
  }
  await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!j.full });
  const b64 = shot.result?.data;
  if (!b64) { console.log(`FAIL ${j.out}`); continue; }
  writeFileSync(`${OUT}/${j.out}`, Buffer.from(b64, 'base64'));
  const overflow = await evalJs('document.documentElement.scrollWidth > window.innerWidth ? document.documentElement.scrollWidth : 0');
  console.log(`${ok ? 'OK  ' : 'WARN'} ${j.out.padEnd(22)} ${(Buffer.from(b64,'base64').length/1024|0)}KB  overflowX=${overflow || 'none'}`);
}
if (consoleErrors.length) console.log('\nCONSOLE ERRORS:\n' + consoleErrors.join('\n'));
else console.log('\nno console errors');
ws.close(); proc.kill();
