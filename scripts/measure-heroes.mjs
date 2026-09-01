/* Prints the rendered shape of each template's hero slot, so an image can be
   asked for in the right aspect ratio. A 3:2 photo dropped into a portrait slot
   gets cropped to its middle third, which is how heroes end up looking wrong.

   node scripts/measure-heroes.mjs */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9361;
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-measure',
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
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

for (const slug of readdirSync('templates')) {
  const file = path.resolve('templates', slug, 'index.html');
  if (!existsSync(file)) continue;
  await send('Page.navigate', { url: pathToFileURL(file).href });
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    if (await ev('document.readyState==="complete"')) break;
  }
  await sleep(350);
  const r = await ev(`(() => {
    const el = document.querySelector('[data-ph-id="${slug}-01"]');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const brandEl = document.querySelector('.brand-name, .brand strong, .brand span, header h1');
    return {
      w: Math.round(b.width), h: Math.round(b.height),
      want: el.dataset.ph,
      brand: ((brandEl && brandEl.textContent) || '').trim().slice(0, 40),
      title: document.title.replace(/^Demo · /, '').slice(0, 60),
    };
  })()`);
  if (!r) { console.log(slug.padEnd(11) + ' hero slot not found'); continue; }
  const ratio = r.w / r.h;
  const ask = ratio >= 1.6 ? '3:2 landscape'
    : ratio >= 1.25 ? '4:3 landscape'
      : ratio >= 0.85 ? '1:1 square'
        : '2:3 portrait';
  console.log(`${slug.padEnd(11)} ${String(r.w).padStart(4)}x${String(r.h).padEnd(4)} (${ratio.toFixed(2)})  ask for ${ask.padEnd(14)} | ${r.brand || r.title}`);
  console.log(`${' '.repeat(12)}subject: ${r.want}`);
}
ws.close(); proc.kill();
