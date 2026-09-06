/* Prints the rendered shape of EVERY photo slot, not just the heroes.

   measure-heroes.mjs does slot 01 only. Asking ChatGPT for a 3:2 image that
   lands in a 4:5 product frame wastes a generation, and there are 88 of them,
   so every slot gets measured before a single prompt is written.

   node scripts/measure-slots.mjs            all templates
   node scripts/measure-slots.mjs store      one template
   node scripts/measure-slots.mjs --json     machine-readable, for prompts.mjs */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const only = args.find((a) => !a.startsWith('--'));

const PORT = 9362;
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-measure-slots',
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
/* Desktop, because that is the widest the slot ever renders and therefore the
   size the image has to satisfy. */
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

/* ChatGPT only emits three shapes, so a measured ratio has to be rounded to the
   nearest one it can actually produce. */
const askFor = (ar) => {
  if (ar >= 1.25) return { shape: 'landscape', ask: '3:2 landscape' };
  if (ar <= 0.85) return { shape: 'portrait', ask: '2:3 portrait' };
  return { shape: 'square', ask: '1:1 square' };
};

const out = [];
for (const slug of readdirSync('templates')) {
  if (only && slug !== only) continue;
  const file = path.resolve('templates', slug, 'index.html');
  if (!existsSync(file)) continue;

  await send('Page.navigate', { url: pathToFileURL(file).href });
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    if (await ev('document.readyState==="complete"')) break;
  }
  await sleep(400);

  const rows = await ev(`(() => {
    return [...document.querySelectorAll('[data-ph-id]')].map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute('data-ph-id'), w: Math.round(r.width), h: Math.round(r.height) };
    });
  })()`);

  for (const r of rows || []) {
    if (!r.w || !r.h) continue;
    const ar = r.w / r.h;
    out.push({ ...r, slug, ar: +ar.toFixed(2), ...askFor(ar) });
  }
}

ws.close(); proc.kill();

if (asJson) {
  writeFileSync('photo-shapes.json', JSON.stringify(out, null, 2));
  console.log(`wrote photo-shapes.json (${out.length} slots)`);
} else {
  let slug = '';
  for (const r of out) {
    if (r.slug !== slug) { slug = r.slug; console.log(`\n=== ${slug} ===`); }
    console.log(`${r.id.padEnd(14)} ${String(r.w).padStart(4)}x${String(r.h).padEnd(4)}  ar=${String(r.ar).padEnd(5)} -> ${r.ask}`);
  }
  const c = {};
  out.forEach((r) => { c[r.shape] = (c[r.shape] || 0) + 1; });
  console.log('\ntotals:', c);
}
