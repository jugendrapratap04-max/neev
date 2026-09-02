/* Measures what a real browser actually pulls, on a throttled connection.
   The site claims it is fast on 3G, so that claim has to be measured rather
   than hoped for — and measured in the right state: lazy images below the fold
   must NOT be counted, because a real visitor never waits for them.

   node scripts/perf-check.mjs [base-url] */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = (process.argv[2] || 'https://neev-5h1.pages.dev').replace(/\/$/, '');
const PATHS = ['/', '/designs', '/pricing', '/templates/restaurant/', '/templates/gym/'];

/* Chrome DevTools' own "Fast 3G" preset. */
const NET = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9364;
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-perf',
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
let bytes = 0, requests = 0, loadAt = 0, startAt = 0;
const failures = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Network.loadingFinished') { bytes += m.params.encodedDataLength || 0; requests++; }
  if (m.method === 'Network.loadingFailed') failures.push(m.params.errorText);
  if (m.method === 'Page.loadEventFired') loadAt = m.params.timestamp;
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id; pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Network.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

console.log(`${BASE}   phone 390px, Fast 3G (1.6 Mbps, 150ms latency)\n`);
console.log('  page                        requests   transferred   load');

for (const p of PATHS) {
  bytes = 0; requests = 0; loadAt = 0; failures.length = 0;
  await send('Network.emulateNetworkConditions', NET);
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const t0 = Date.now();
  await send('Page.navigate', { url: BASE + p });
  for (let i = 0; i < 150; i++) {
    await sleep(200);
    if (await ev('document.readyState==="complete"')) break;
  }
  /* Let anything the load event kicked off settle, but do NOT scroll —
     scrolling would pull the lazy images a real visitor has not asked for. */
  await sleep(1200);
  const secs = (Date.now() - t0) / 1000;
  const kb = bytes / 1024;
  const flag = kb > 400 ? '  <-- heavy' : '';
  console.log(`  ${p.padEnd(28)} ${String(requests).padStart(4)}   ${kb.toFixed(0).padStart(7)} KB   ${secs.toFixed(1)}s${flag}`);
  if (failures.length) console.log(`      ${failures.length} request(s) failed: ${failures.slice(0, 2).join(', ')}`);
}

console.log('\n  The site claims "opens in about two seconds" on 3G. Anything above');
console.log('  roughly 400 KB on a phone makes that claim untrue.');

ws.close(); proc.kill();
