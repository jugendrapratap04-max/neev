/* Verifies one template in templates/<slug>/index.html against the house rules.
   Run:  node scripts/check-template.mjs <slug>
   Exits non-zero and lists every problem, so a builder can loop until clean. */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/check-template.mjs <slug>'); process.exit(2); }
const file = path.resolve('templates', slug, 'index.html');
if (!existsSync(file)) { console.error('MISSING: ' + file); process.exit(2); }

const problems = [];
const src = readFileSync(file, 'utf8');

/* ---- static checks, before a browser is even opened ---- */
const externalImg = [...src.matchAll(/<img[^>]+src=["'](https?:)?\/\//gi)].length;
if (externalImg) problems.push(`${externalImg} <img> pulls from an external URL — templates must carry no outside images`);
const externalCss = [...src.matchAll(/url\(\s*["']?(https?:)?\/\//gi)]
  .filter((m) => !/fonts\.gstatic|fonts\.googleapis/.test(src.slice(m.index, m.index + 120))).length;
if (externalCss) problems.push(`${externalCss} CSS url() points outside the file`);
for (const bad of ['Nexora', 'NovaCommerce', 'SaaSMax', 'FinDash', 'Taskly', 'lh3.googleusercontent']) {
  if (src.includes(bad)) problems.push(`contains "${bad}" — template-shop branding must not appear`);
}
if (!/<html[^>]+lang=/.test(src)) problems.push('no lang attribute on <html>');
if (!/<meta[^>]+viewport/.test(src)) problems.push('no viewport meta');
if (!/<title>/.test(src)) problems.push('no <title>');
if (!/data-ph=/.test(src)) problems.push('no data-ph image placeholders — Jugendra needs slots to drop his photos into');
if (!/wa\.me\//.test(src)) problems.push('no WhatsApp link');
if (!/tel:/.test(src)) problems.push('no tel: link');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(2); }

/* Hash the whole slug: keying on the first letter alone put saas, salon and
   store on one port, so back-to-back runs fought over the same Chrome. */
const PORT = 9350 + ([...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 40, 7));
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-tpl-' + slug,
  'about:blank',
], { stdio: 'ignore' });

let list = null;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); list = await r.json(); if (list.length) break; } catch {}
  await sleep(250);
}
if (!list?.length) { console.error('no CDP target'); proc.kill(); process.exit(2); }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const consoleErrors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.text || 'exception');
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id; pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Runtime.enable');

const PAGE_CHECK = `(() => {
  const out = [];
  const vis = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => el.tagName.toLowerCase() + ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '"';

  const de = document.documentElement;
  if (de.scrollWidth > window.innerWidth + 1) {
    const wide = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed';
    }).slice(0, 3).map(name);
    out.push('page scrolls sideways (' + de.scrollWidth + ' > ' + window.innerWidth + '): ' + wide.join(' | '));
  }

  document.querySelectorAll('a[href], button').forEach((el) => {
    if (!vis(el)) return;
    if (getComputedStyle(el).display === 'inline' && el.closest('p')) return;
    const r = el.getBoundingClientRect();
    if (r.height < 44) out.push('tap target ' + Math.round(r.height) + 'px: ' + name(el));
  });

  /* Real body copy must be readable; a short caption or a label under an avatar
     is allowed to be smaller, which is ordinary typography. Nothing may go
     below 11px either way. */
  document.querySelectorAll('p, li, td, dd, label').forEach((el) => {
    if (!vis(el) || el.children.length) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11) out.push('text ' + fs + 'px is below the 11px floor: ' + name(el));
    else if (fs < 15 && text.length > 60) out.push('body copy at ' + fs + 'px (needs 15px+): ' + name(el));
  });

  document.querySelectorAll('img').forEach((el) => {
    if (el.getAttribute('alt') === null) out.push('img with no alt: ' + el.getAttribute('src'));
  });

  const h1 = document.querySelectorAll('h1').length;
  if (h1 !== 1) out.push(h1 + ' <h1> elements (need exactly 1)');

  if (document.body.scrollHeight < 1400) out.push('page is only ' + document.body.scrollHeight + 'px tall — too thin to read as a real site');

  return out.slice(0, 25);
})()`;

for (const v of [{ n: 'phone', w: 360, h: 800, m: true }, { n: 'desktop', w: 1280, h: 900, m: false }]) {
  await send('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.m });
  await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
  for (let i = 0; i < 60; i++) {
    await sleep(150);
    if (await ev('document.readyState==="complete"')) break;
  }
  await sleep(400);
  const found = await ev(PAGE_CHECK);
  (found || []).forEach((p) => problems.push(`[${v.n}] ${p}`));
}
consoleErrors.forEach((e) => problems.push('console error: ' + e));

ws.close(); proc.kill();

if (problems.length) {
  console.log(`FAIL ${slug} — ${problems.length} problem(s):`);
  problems.forEach((p) => console.log('  - ' + p));
  process.exitCode = 1;
} else {
  console.log(`OK ${slug} — clean at 360px and 1280px`);
  process.exitCode = 0;
}
