/* Renders src/og.html to og-image.png (1200x630) — the card WhatsApp shows
   when the link is pasted. PNG, not WebP: WhatsApp previews are unreliable
   with WebP. */
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find(p => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9340;
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-og-profile', 'about:blank',
], { stdio: 'ignore' });

let list = null;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); list = await r.json(); if (list.length) break; } catch {}
  await sleep(250);
}
if (!list?.length) { console.error('no CDP target'); proc.kill(); process.exit(1); }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise(res => {
  const i = ++id; pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'file:///F:/projects/neev/src/og.html' });
let ok = false;
for (let i = 0; i < 60; i++) {
  await sleep(200);
  if (await ev('document.readyState==="complete" && document.fonts.status==="loaded" && document.fonts.check("700 76px Inter")')) { ok = true; break; }
}
await sleep(400);
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync('F:/projects/neev/og-image.png', Buffer.from(shot.result.data, 'base64'));
console.log(`${ok ? 'OK' : 'WARN'} og-image.png ${(Buffer.from(shot.result.data, 'base64').length / 1024 | 0)}KB`);
ws.close(); proc.kill();
