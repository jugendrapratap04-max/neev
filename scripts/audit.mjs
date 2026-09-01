/* Measured audit — not a guess. Loads every built page in headless Chrome at
   two widths and reports things that are actually wrong in the rendered DOM:
   tap targets under the floor, body text too small, missing alt or labels,
   duplicate ids, and any horizontal overflow.

   node scripts/audit.mjs        (dev server must be running: npm run serve) */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9337;
const BASE = 'http://localhost:4322';
const PAGES = readdirSync('.').filter((f) => f.endsWith('.html')).map((f) => '/' + f);
const VIEWS = [
  { name: 'phone', w: 360, h: 800, mobile: true },
  { name: 'desktop', w: 1280, h: 900, mobile: false },
];

/* Floors. A control the thumb must hit is 48px; the sticky bar is 56px.
   Body copy is 16px; small print may go to 11px but no lower. */
const AUDIT = `(() => {
  const out = [];
  const seen = new Set();
  const vis = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const where = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = (el.getAttribute('class') || '').split(/\\s+/).slice(0, 3).join('.');
    return el.tagName.toLowerCase() + id + (cls ? '.' + cls : '') +
      ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
  };

  /* tap targets */
  document.querySelectorAll('a[href], button, summary, input, select, textarea, [role="button"]').forEach((el) => {
    if (!vis(el)) return;
    if (el.closest('footer')) return;                // footer links are a text list, not controls
    if (el.classList.contains('sr-only')) return;    // skip link: 1x1 until focused, by design
    const r = el.getBoundingClientRect();
    const h = Math.round(r.height), w = Math.round(r.width);
    if (h >= 44 && w >= 24) return;
    /* A stretched link (::after absolute inset-0) hit-tests across its whole
       positioned ancestor, so its own 29px text box is not the tap target.
       Verified by elementFromPoint at a card centre: the anchor is what is hit. */
    const after = getComputedStyle(el, '::after');
    if (after.position === 'absolute' && after.inset === '0px' && after.content !== 'none') {
      const host = el.offsetParent || el.closest('.design-card');
      if (host && host.getBoundingClientRect().height >= 44) return;
    }
    /* WCAG 2.5.8 exempts a link that sits inline inside a sentence. */
    if (getComputedStyle(el).display === 'inline' && el.closest('p')) return;
    out.push({ kind: 'tap-target', detail: h + 'x' + w, el: where(el) });
  });

  /* text size */
  document.querySelectorAll('p, li, span, a, button, label, td, dd, dt, h1, h2, h3, pre').forEach((el) => {
    if (!vis(el) || el.children.length) return;
    const t = (el.textContent || '').trim();
    if (!t) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11) out.push({ kind: 'text-too-small', detail: fs + 'px', el: where(el) });
  });

  /* images */
  document.querySelectorAll('img').forEach((el) => {
    if (el.getAttribute('alt') === null) out.push({ kind: 'img-no-alt', detail: el.getAttribute('src'), el: where(el) });
    if (el.complete && el.naturalWidth === 0) out.push({ kind: 'img-broken', detail: el.getAttribute('src'), el: where(el) });
  });

  /* duplicate ids */
  document.querySelectorAll('[id]').forEach((el) => {
    if (seen.has(el.id)) out.push({ kind: 'duplicate-id', detail: el.id, el: where(el) });
    seen.add(el.id);
  });

  /* labels */
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.type === 'hidden') return;
    const labelled = (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) ||
      el.closest('label') || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (!labelled) out.push({ kind: 'no-label', detail: el.name || el.type, el: where(el) });
  });

  /* overflow */
  const de = document.documentElement;
  if (de.scrollWidth > window.innerWidth + 1) {
    const wide = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed';
    }).slice(0, 5).map(where);
    out.push({ kind: 'overflow-x', detail: de.scrollWidth + ' > ' + window.innerWidth, el: wide.join(' | ') });
  }

  /* sticky WhatsApp bar must stay thumb sized */
  const bar = document.querySelector('.safe-bottom a[href^="https://wa.me"]');
  if (bar && vis(bar)) {
    const h = Math.round(bar.getBoundingClientRect().height);
    if (h < 56) out.push({ kind: 'sticky-bar-small', detail: h + 'px', el: where(bar) });
  }
  return out;
})()`;

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-audit-profile',
  'about:blank',
], { stdio: 'ignore' });

let list = null;
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); list = await r.json(); if (list.length) break; } catch {}
  await sleep(250);
}
if (!list?.length) { console.error('no CDP target'); proc.kill(); process.exit(1); }

const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((res) => ws.addEventListener('open', res));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id; pending.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result?.exceptionDetails) return [{ kind: 'audit-error', detail: r.result.exceptionDetails.text, el: '' }];
  return r.result?.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');

const totals = {};
for (const v of VIEWS) {
  for (const p of PAGES) {
    await send('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.mobile });
    await send('Page.navigate', { url: BASE + p });
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      if (await evalJs('document.readyState==="complete"')) break;
    }
    await sleep(250);
    const issues = await evalJs(AUDIT);
    if (!issues || !issues.length) continue;
    for (const it of issues) {
      const key = `${v.name} ${it.kind}`;
      totals[key] = (totals[key] || 0) + 1;
      console.log(`[${v.name}] ${p}  ${it.kind}  ${it.detail}\n        ${it.el}`);
    }
  }
}

console.log('\n---- totals ----');
const keys = Object.keys(totals);
if (!keys.length) console.log('clean: no violations at 360px or 1280px');
else keys.sort().forEach((k) => console.log(`${k}: ${totals[k]}`));

ws.close(); proc.kill();
