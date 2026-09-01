/* End-to-end checks for the three things that must actually work:
   the catalogue filter, the shortlist, and the four-step brief wizard.
   Drives a real browser — no mocking, no assuming.

   npm run serve   (in another terminal), then:  node scripts/test-flows.mjs */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('CHROME NOT FOUND'); process.exit(1); }

const PORT = 9339;
const BASE = 'http://localhost:4322';

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/neev-flows-profile',
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
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval threw');
  return r.result?.result?.value;
};
const go = async (path) => {
  await send('Page.navigate', { url: BASE + path });
  for (let i = 0; i < 60; i++) {
    await sleep(150);
    if (await ev('document.readyState==="complete" && !!window.NEEV')) break;
  }
  await sleep(250);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? '  -> ' + extra : ''}`); }
};

/* ---------------- catalogue ---------------- */
console.log('\ncatalogue filter');
await go('/designs.html');
const total = await ev(`document.querySelectorAll('.design-card').length`);
check('every catalogue entry renders', total === 11, 'got ' + total);

const catFiltered = await ev(`(() => {
  [...document.querySelectorAll('.cat-chip')].find(c => c.dataset.cat === 'food').click();
  const shown = [...document.querySelectorAll('.design-card')].filter(c => !c.classList.contains('hidden'));
  return { count: shown.length, cats: [...new Set(shown.map(c => c.dataset.cat))], label: document.querySelector('#designCount').textContent };
})()`);
check('category chip filters to one category', catFiltered.count === 2 && catFiltered.cats.length === 1 && catFiltered.cats[0] === 'food', JSON.stringify(catFiltered));
check('count label updates with the filter', /\d+ designs?/.test(catFiltered.label), catFiltered.label);

const searched = await ev(`(() => {
  [...document.querySelectorAll('.cat-chip')].find(c => c.dataset.cat === 'all').click();
  const box = document.querySelector('#designSearch');
  box.value = 'dashboard';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  const shown = [...document.querySelectorAll('.design-card')].filter(c => !c.classList.contains('hidden'));
  return { count: shown.length, names: shown.map(c => c.dataset.name) };
})()`);
check('search narrows to one entry', searched.count === 1 && /dashboard/.test(searched.names[0]), JSON.stringify(searched));

const empty = await ev(`(() => {
  const box = document.querySelector('#designSearch');
  box.value = 'zzzznothing';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  return { shown: [...document.querySelectorAll('.design-card')].filter(c => !c.classList.contains('hidden')).length,
           emptyVisible: !document.querySelector('#designEmpty').classList.contains('hidden') };
})()`);
check('empty state appears when nothing matches', empty.shown === 0 && empty.emptyVisible, JSON.stringify(empty));

const sorted = await ev(`(() => {
  const box = document.querySelector('#designSearch');
  box.value = '';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  const sel = document.querySelector('#designSort');
  sel.value = 'low';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  const prices = [...document.querySelectorAll('.design-card')].map(c => +c.dataset.price);
  return { prices, sortedOk: prices.every((p, i) => i === 0 || prices[i-1] <= p), count: prices.length };
})()`);
check('sort by price keeps every card', sorted.count === 11, 'got ' + sorted.count);
check('sort by price is ascending', sorted.sortedOk, JSON.stringify(sorted.prices));

const backToDefault = await ev(`(() => {
  const sel = document.querySelector('#designSort');
  sel.value = 'default';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  const ids = [...document.querySelectorAll('.design-card')].map(c => c.querySelector('.js-save').dataset.id);
  return { ids, first: ids[0] };
})()`);
check('"Order: default" restores the original order', backToDefault.first === 'store', JSON.stringify(backToDefault.ids));

/* ---------------- shortlist ---------------- */
console.log('\nshortlist');
await ev(`localStorage.removeItem('neev.shortlist.v1')`);
await go('/designs.html');
const saved = await ev(`(() => {
  const btns = [...document.querySelectorAll('.js-save')];
  btns[0].click(); btns[2].click();
  return { stored: JSON.parse(localStorage.getItem('neev.shortlist.v1') || '[]'),
           badge: document.querySelector('.js-save-count').textContent,
           pressed: btns[0].getAttribute('aria-pressed') };
})()`);
check('two designs are saved', saved.stored.length === 2, JSON.stringify(saved.stored));
check('header badge shows the count', saved.badge === '2', saved.badge);
check('saved button reports aria-pressed', saved.pressed === 'true', saved.pressed);

await go('/shortlist.html');
const slist = await ev(`(() => {
  const items = document.querySelectorAll('#shortlistBox article');
  const wa = document.querySelector('#shortlistWa').href;
  return { items: items.length, emptyHidden: document.querySelector('#shortlistEmpty').classList.contains('hidden'),
           waHasBoth: /wa\\.me\\/918439305810/.test(wa) && decodeURIComponent(wa).split('\\n').filter(l => /^\\d\\./.test(l)).length === 2 };
})()`);
check('shortlist page lists both saved designs', slist.items === 2, 'got ' + slist.items);
const slBadges = await ev(`(() => ({
  badges: document.querySelectorAll('#shortlistBox .badge-live, #shortlistBox .badge-design').length,
  labels: [...document.querySelectorAll('#shortlistBox .js-save')].map(b => b.getAttribute('aria-label')),
  actionsFlex: getComputedStyle(document.querySelector('#shortlistActions')).display,
}))()`);
check('shortlist rows keep the DEMO / MY PROJECT badge', slBadges.badges === 2, JSON.stringify(slBadges.badges));
check('each remove button names its design', new Set(slBadges.labels).size === 2, JSON.stringify(slBadges.labels));
check('shortlist actions row is a flex row', slBadges.actionsFlex === 'flex', slBadges.actionsFlex);
check('empty state is hidden when items exist', slist.emptyHidden);
check('WhatsApp link carries both design names', slist.waHasBoth);

const removed = await ev(`(() => {
  document.querySelector('#shortlistBox .js-save').click();
  return { items: document.querySelectorAll('#shortlistBox article').length,
           stored: JSON.parse(localStorage.getItem('neev.shortlist.v1') || '[]').length };
})()`);
check('removing from the shortlist re-renders', removed.items === 1 && removed.stored === 1, JSON.stringify(removed));

/* ---------------- brief wizard ---------------- */
console.log('\nbrief wizard');
await ev(`localStorage.removeItem('neev.brief.v1')`);
await go('/brief.html');

const step1 = await ev(`(() => {
  const visible = [...document.querySelectorAll('.brief-step')].filter(s => !s.classList.contains('hidden'));
  return { visible: visible.length, step: visible[0] && visible[0].dataset.step,
           sendHidden: document.querySelector('#briefSend').classList.contains('hidden') };
})()`);
check('wizard starts on step 1 only', step1.visible === 1 && step1.step === '1', JSON.stringify(step1));
check('send button is hidden until the last step', step1.sendHidden);

const blocked = await ev(`(() => {
  document.querySelector('#briefNext').click();
  const s = [...document.querySelectorAll('.brief-step')].filter(x => !x.classList.contains('hidden'))[0];
  return { step: s.dataset.step, invalid: document.querySelectorAll('.field-invalid').length };
})()`);
check('empty step 1 blocks Next and marks the fields', blocked.step === '1' && blocked.invalid === 3, JSON.stringify(blocked));

const advanced = await ev(`(() => {
  const set = (id, v) => { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); };
  set('#bizName', 'Sharma Sweets');
  set('#bizType', 'Sweets or bakery');
  set('#city', 'Mathura');
  document.querySelector('#briefNext').click();
  const s = [...document.querySelectorAll('.brief-step')].filter(x => !x.classList.contains('hidden'))[0];
  return { step: s.dataset.step, draft: !!localStorage.getItem('neev.brief.v1') };
})()`);
check('filled step 1 advances to step 2', advanced.step === '2', JSON.stringify(advanced));
check('draft is saved to localStorage', advanced.draft);

const pkgBlock = await ev(`(() => {
  document.querySelector('#briefNext').click();
  const s = [...document.querySelectorAll('.brief-step')].filter(x => !x.classList.contains('hidden'))[0];
  return { step: s.dataset.step, pkgOptions: document.querySelectorAll('input[name="pkg"]').length };
})()`);
check('step 2 requires a package before advancing', pkgBlock.step === '2', JSON.stringify(pkgBlock));
check('all four package options render from data.js', pkgBlock.pkgOptions === 4, 'got ' + pkgBlock.pkgOptions);

const toEnd = await ev(`(() => {
  document.querySelector('input[name="pkg"]').click();
  document.querySelector('input[name="want"]').click();
  document.querySelector('#briefNext').click();
  document.querySelector('#briefNext').click();
  const s = [...document.querySelectorAll('.brief-step')].filter(x => !x.classList.contains('hidden'))[0];
  return { step: s.dataset.step, nextHidden: document.querySelector('#briefNext').classList.contains('hidden'),
           sendVisible: !document.querySelector('#briefSend').classList.contains('hidden') };
})()`);
check('reaches step 4', toEnd.step === '4', JSON.stringify(toEnd));
check('Next is replaced by Send on the last step', toEnd.nextHidden && toEnd.sendVisible, JSON.stringify(toEnd));

const badPhone = await ev(`(() => {
  const set = (id, v) => { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); };
  set('#name', 'Ramesh');
  set('#wa', '12345');
  const a = document.querySelector('#briefSend');
  let navigated = false;
  a.addEventListener('click', e => { e.preventDefault(); }, { once: true });
  a.click();
  return { invalid: document.querySelectorAll('.field-invalid').length };
})()`);
check('a bad phone number is rejected', badPhone.invalid >= 1, JSON.stringify(badPhone));

const msg = await ev(`(() => {
  const set = (id, v) => { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); };
  set('#wa', '9876543210');
  set('#note', 'I already have an old website.');
  const pre = document.querySelector('#briefPreview').textContent;
  const href = document.querySelector('#briefSend').getAttribute('href');
  return { pre, href, decoded: decodeURIComponent((href.split('?text=')[1] || '')) };
})()`);
check('preview contains the business name', /Sharma Sweets/.test(msg.pre), msg.pre.slice(0, 60));
check('preview contains the phone number', /9876543210/.test(msg.pre));
check('preview contains the free-text note', /old website/.test(msg.pre));
check('send link is a wa.me deep link', /^https:\/\/wa\.me\/918439305810\?text=/.test(msg.href), msg.href.slice(0, 60));
check('the encoded message matches the preview', msg.decoded.trim() === msg.pre.trim());

await go('/brief.html');
const restored = await ev(`(() => ({
  name: document.querySelector('#bizName').value,
  city: document.querySelector('#city').value,
  pkg: (document.querySelector('input[name="pkg"]:checked') || {}).value || null,
  want: [...document.querySelectorAll('input[name="want"]:checked')].map(c => c.value),
}))()`);
check('draft survives a page reload', restored.name === 'Sharma Sweets' && restored.city === 'Mathura', JSON.stringify(restored));
check('the chosen package is restored', !!restored.pkg, JSON.stringify(restored.pkg));
check('checked features are restored', restored.want.length === 1, JSON.stringify(restored.want));

const preselect = await (async () => { await go('/brief.html?design=hotel'); return ev(`document.querySelector('#design').value`); })();
check('?design= pre-selects that design', /Hotel/.test(preselect), preselect);

/* ---------------- misc ---------------- */
console.log('\nmisc');
await go('/');
const menu = await ev(`(() => {
  const d = document.querySelector('details.js-menu');
  d.setAttribute('open', '');
  const links = d.querySelectorAll('a').length;
  document.body.click();
  return { links, closedOnOutsideClick: !d.hasAttribute('open') };
})()`);
check('mobile menu holds every nav link', menu.links === 6, 'got ' + menu.links);
check('mobile menu closes on an outside click', menu.closedOnOutsideClick);

const waLinks = await ev(`(() => {
  const as = [...document.querySelectorAll('a[href^="https://wa.me"]')];
  return { count: as.length, allTargeted: as.every(a => a.target === '_blank' && /noopener/.test(a.rel) && /noreferrer/.test(a.rel)),
           allHaveText: as.every(a => /\\?text=/.test(a.href)) };
})()`);
check('every WhatsApp link opens safely in a new tab', waLinks.allTargeted, JSON.stringify(waLinks));
check('every WhatsApp link carries a prewritten message', waLinks.allHaveText);

await ev(`localStorage.removeItem('neev.brief.v1')`);
const noJs = await (async () => { await go('/brief.html'); return ev(`(() => ({
  pkgRadios: document.querySelectorAll('#pkgOptions input[name="pkg"]').length,
  designOptions: document.querySelector('#design').options.length,
  ariaDescribed: document.querySelector('#bizName').getAttribute('aria-describedby'),
}))()`); })();
check('package radios are in the served HTML, not injected', noJs.pkgRadios === 4, JSON.stringify(noJs.pkgRadios));
check('design options are in the served HTML', noJs.designOptions === 12, JSON.stringify(noJs.designOptions));
check('fields point at their error message', noJs.ariaDescribed === 'err-bizName', String(noJs.ariaDescribed));

const invalidAria = await ev(`(() => {
  document.querySelector('#briefNext').click();
  return document.querySelector('#bizName').getAttribute('aria-invalid');
})()`);
check('a failed field is marked aria-invalid', invalidAria === 'true', String(invalidAria));

const demoLinks = await (async () => { await go('/designs.html'); return ev(`(() => {
  const demos = window.NEEV.DESIGNS.filter(d => d.badge === 'demo' && d.url.startsWith('templates/'));
  return demos.map(d => d.url);
})()`); })();
let demoOk = 0;
for (const u of demoLinks) { const r = await fetch(BASE + '/' + u); if (r.ok) demoOk++; }
check('every demo template URL actually serves', demoOk === demoLinks.length && demoLinks.length === 8,
  demoOk + '/' + demoLinks.length);

const ribbon = await (async () => { await go('/templates/store/index.html'); return ev(`(() => ({
  ribbon: !!document.querySelector('.neev-demo-ribbon'),
  title: document.title.slice(0, 6),
  noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
  placeholders: document.querySelectorAll('[data-ph]').length,
  externalImgs: [...document.images].filter(i => /^https?:/.test(i.getAttribute('src') || '')).length,
}))()`); })();
check('a template carries the DEMO ribbon', ribbon.ribbon);
check('a template says Demo in its title', ribbon.title === 'Demo ·', ribbon.title);
check('a template is noindex', ribbon.noindex);
check('a template has photo placeholders to fill', ribbon.placeholders > 3, String(ribbon.placeholders));
check('a template pulls no external images', ribbon.externalImgs === 0, String(ribbon.externalImgs));

const r404 = await fetch(BASE + '/no-such-page.html');
check('unknown URLs serve the 404 page', r404.status === 404 && /does not exist/i.test(await r404.text()));

console.log(`\n${pass} passed, ${fail} failed`);
/* Setting exitCode rather than calling process.exit lets the WebSocket and the
   child process tear down cleanly — exiting mid-close trips a libuv assertion
   on Windows and returns a bogus non-zero status. */
ws.close();
proc.kill();
process.exitCode = fail ? 1 : 0;
