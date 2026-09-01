/* Capture desktop + mobile screenshots of the real, live sites shown in the
   catalogue. Chrome's --screenshot flag applies no device emulation and clips
   narrow captures, so we drive CDP and set device metrics before capturing. */
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find(p => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9334;
const OUT = 'F:/projects/neev/assets/img/work';
const SITES = [
  { id: 'mithai',    url: 'https://mithai-wala-nuh.vercel.app' },
  { id: 'madhav',    url: 'https://madhav-guest-house.vercel.app' },
  { id: 'mithaas',   url: 'https://mithaas-sable.vercel.app' },
  { id: 'portfolio', url: 'https://jugendra-pratap.vercel.app' },
];
const VIEWS = [
  { name: 'desktop', w: 1280, h: 800, mobile: false, dsf: 1 },
  { name: 'mobile',  w: 390,  h: 844, mobile: true,  dsf: 2 },
];

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-shots-profile',
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

for (const s of SITES) {
  for (const v of VIEWS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: v.w, height: v.h, deviceScaleFactor: v.dsf, mobile: v.mobile,
    });
    await send('Page.navigate', { url: s.url });
    let ok = false;
    for (let i = 0; i < 60; i++) {
      await sleep(250);
      if (await evalJs('document.readyState==="complete" && document.fonts.status==="loaded"')) { ok = true; break; }
    }
    await sleep(1200);                       // let entrance animations settle
    await evalJs('window.scrollTo(0,0)');
    await sleep(200);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const b64 = shot.result?.data;
    if (!b64) { console.log(`FAIL ${s.id}-${v.name}`); continue; }
    const f = `${OUT}/${s.id}-${v.name}.png`;
    writeFileSync(f, Buffer.from(b64, 'base64'));
    console.log(`${ok ? 'OK  ' : 'WARN'} ${s.id}-${v.name}  ${(Buffer.from(b64,'base64').length/1024|0)}KB`);
  }
}
ws.close(); proc.kill();
