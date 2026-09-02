/* Pulls the Latin subsets of Inter out of Google Fonts and stores them locally.

   Why: measured on a phone over Fast 3G, Google was sending 130KB of font —
   nearly half the homepage — across two extra domains, each costing its own DNS
   and TLS round trip at 150ms latency. The Latin subsets alone are a fraction
   of that, and served from our own origin they cost no extra connection.

   ONE subset only. The rupee sign (U+20B9) lives in `latin-ext`, which Google
   ships as 83KB — for that single glyph, on top of the 47KB Latin alphabet.
   That is the whole reason the font bill was 130KB. Dropping it lets ₹ fall
   back to the system typeface, which every phone and desktop draws perfectly
   well, and halves the heaviest thing on the page.

   Inter is licensed under the SIL Open Font License, which permits this.

   node scripts/fetch-font.mjs */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('assets', 'fonts');
mkdirSync(OUT, { recursive: true });

/* A modern browser UA, or Google serves the far larger legacy formats. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap';

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

/* Google labels each @font-face with a range comment just above it. */
const parts = css.split(/\/\*\s*([a-z-]+)\s*\*\//).slice(1);   // [name, css, name, css...]
const ranges = {};
for (let i = 0; i + 1 < parts.length; i += 2) ranges[parts[i].trim()] = parts[i + 1];
console.log('ranges offered:', Object.keys(ranges).join(', '), '\n');

const WANT = ['latin'];
const faces = [];

for (const name of WANT) {
  const block = ranges[name];
  if (!block) { console.error('missing range: ' + name); process.exit(1); }
  const url = (block.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
  const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
  if (!url) { console.error('no woff2 url for ' + name); process.exit(1); }
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  const out = 'inter-' + name + '.woff2';
  writeFileSync(path.join(OUT, out), buf);
  faces.push({ name, out, range: (range || '').trim(), kb: buf.length / 1024 });
  console.log(out.padEnd(24) + (buf.length / 1024).toFixed(0).padStart(4) + ' KB');
}

console.log('
The rupee sign (U+20B9) is deliberately NOT covered: it lives in');
console.log('latin-ext, which costs 83KB for that one glyph. It falls back to the system');
console.log('font instead. Look at pricing.html after changing anything here.');

   Why: measured on a phone over Fast 3G, Google was sending 130KB of font —
   nearly half the homepage — across two extra domains, each costing its own DNS
   and TLS round trip at 150ms latency. The Latin subsets alone are a fraction
   of that, and served from our own origin they cost no extra connection.

   ONE subset only. The rupee sign (U+20B9) lives in `latin-ext`, which Google
   ships as 83KB — for that single glyph, on top of the 47KB Latin alphabet.
   That is the whole reason the font bill was 130KB. Dropping it lets ₹ fall
   back to the system typeface, which every phone and desktop draws perfectly
   well, and halves the heaviest thing on the page.

   Inter is licensed under the SIL Open Font License, which permits this.

   node scripts/fetch-font.mjs */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('assets', 'fonts');
mkdirSync(OUT, { recursive: true });

/* A modern browser UA, or Google serves the far larger legacy formats. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap';

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

/* Google labels each @font-face with a range comment just above it. */
const parts = css.split(/\/\*\s*([a-z-]+)\s*\*\//).slice(1);   // [name, css, name, css...]
const ranges = {};
for (let i = 0; i + 1 < parts.length; i += 2) ranges[parts[i].trim()] = parts[i + 1];
console.log('ranges offered:', Object.keys(ranges).join(', '), '\n');

const WANT = ['latin'];
const faces = [];

for (const name of WANT) {
  const block = ranges[name];
  if (!block) { console.error('missing range: ' + name); process.exit(1); }
  const url = (block.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
  const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
  if (!url) { console.error('no woff2 url for ' + name); process.exit(1); }
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  const out = 'inter-' + name + '.woff2';
  writeFileSync(path.join(OUT, out), buf);
  faces.push({ name, out, range: (range || '').trim(), kb: buf.length / 1024 });
  console.log(out.padEnd(24) + (buf.length / 1024).toFixed(0).padStart(4) + ' KB');
}

const rupee = faces.find((f) => /20B9/i.test(f.range) || /20AD-20CF/i.test(f.range));
console.log('\nrupee sign (U+20B9) covered by: ' + (rupee ? rupee.name : 'NOTHING — check the ranges'));

console.log('\nCSS for src/input.css:\n');
for (const f of faces) {
  console.log(`@font-face{font-family:Inter;font-style:normal;font-weight:400 700;font-display:swap;`
    + `src:url('../fonts/${f.out}') format('woff2');unicode-range:${f.range}}`);
}
