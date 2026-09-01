/* Picks the freshly downloaded hero images out of the Downloads folder and
   files them into photos/<template>/ — so nothing has to be renamed or dragged
   around by hand.

   Chrome names ChatGPT downloads "ChatGPT Image Sep 1, 2026, 08_57_12 PM.png",
   which says nothing about what is in them. What it does preserve is the order
   they were saved in, so that is what this matches on — and then it CHECKS the
   guess: each hero was asked for in a particular shape, so if the shapes do not
   line up, the order is wrong and nothing is copied.

     node scripts/collect-downloads.mjs --dry     show the plan, copy nothing
     node scripts/collect-downloads.mjs           do it
     node scripts/collect-downloads.mjs --force   copy even if shapes disagree
     node scripts/collect-downloads.mjs --dir "D:\\some\\folder"
     node scripts/collect-downloads.mjs --since "2026-09-01T20:30"

   Windows lets Downloads be moved off C:, so the real location is read from the
   registry rather than assumed. */
import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const NEIGHBOUR = 'F:/APP Downloads/stitch_nexora_premium_digital_marketplace/stitch_nexora_premium_digital_marketplace/node_modules/sharp/dist/index.mjs';
let sharp = null;
try { sharp = (await import(pathToFileURL(NEIGHBOUR).href)).default; } catch { /* shape check is skipped */ }

/* The order the heroes were generated in, and therefore the order to download,
   with the shape each one was asked for. */
const ORDER = [
  { slug: 'store', what: 'brass and copper counter', shape: 'landscape' },
  { slug: 'restaurant', what: 'thali from above', shape: 'landscape' },
  { slug: 'hotel', what: 'building at dusk with a scooter', shape: 'square' },
  { slug: 'clinic', what: 'reception with waiting chairs', shape: 'portrait' },
  { slug: 'salon', what: 'salon interior', shape: 'landscape' },
  { slug: 'gym', what: 'dark gym floor', shape: 'portrait' },
  { slug: 'saas', what: 'classroom from the back', shape: 'portrait' },
  { slug: 'dashboard', what: 'sweet shop front', shape: 'landscape' },
];

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : null);
const dry = flag('--dry');
const force = flag('--force');

function downloadsDir() {
  const given = val('--dir');
  if (given) return given;
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command',
      "(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders')." +
      "'{374DE290-123F-4565-9164-39C4925E467B}'"], { encoding: 'utf8' }).trim();
    if (out) return out.replace(/%([^%]+)%/g, (_, v) => process.env[v] || '');
  } catch { /* fall through */ }
  return path.join(os.homedir(), 'Downloads');
}

const DIR = downloadsDir();
const OUT = path.resolve('photos');
const IMG = /\.(png|jpe?g|webp)$/i;
if (!existsSync(DIR)) { console.error('No Downloads folder at ' + DIR); process.exit(1); }
console.log('Downloads folder: ' + DIR + '\n');

const since = val('--since') ? new Date(val('--since')).getTime() : 0;
let found = readdirSync(DIR)
  .filter((f) => IMG.test(f))
  .map((f) => ({ f, p: path.join(DIR, f), t: statSync(path.join(DIR, f)).mtimeMs }))
  .filter((x) => x.t > since)
  .sort((a, b) => a.t - b.t);

/* Old downloads pile up in there, so take the newest N — they are the ones
   just saved. */
if (found.length > ORDER.length) found = found.slice(-ORDER.length);

if (found.length < ORDER.length) {
  console.log(`Found ${found.length} image(s), expected ${ORDER.length}. Download the rest, then run again.`);
  if (!found.length) process.exit(0);
}

const shapeOf = (w, h) => (w / h > 1.25 ? 'landscape' : w / h < 0.8 ? 'portrait' : 'square');
const rows = [];
let mismatches = 0;

for (let i = 0; i < found.length; i++) {
  const want = ORDER[i];
  let shape = '?';
  if (sharp) {
    const m = await sharp(found[i].p).metadata();
    shape = shapeOf(m.width, m.height);
  }
  const ok = shape === '?' || shape === want.shape;
  if (!ok) mismatches++;
  rows.push({ i, file: found[i].f, from: found[i].p, want, shape, ok });
}

for (const r of rows) {
  console.log(`${String(r.i + 1).padStart(2)}. ${r.file.slice(0, 42).padEnd(44)} ${r.shape.padEnd(10)} -> photos/${r.want.slug.padEnd(11)} ${r.ok ? '' : 'MISMATCH, wanted ' + r.want.shape}`);
  console.log(`${' '.repeat(4)}${r.want.what}`);
}

if (mismatches && !force) {
  console.log(`\n${mismatches} image(s) are not the shape that slot was asked for, so the download order`);
  console.log('is probably wrong. Nothing has been copied. Either re-download in order, or');
  console.log('pass --force if you are sure, or file them by hand into photos/<template>/.');
  process.exit(1);
}

if (dry) { console.log('\nDry run — nothing copied. Drop --dry to do it.'); process.exit(0); }

let done = 0;
for (const r of rows) {
  mkdirSync(path.join(OUT, r.want.slug), { recursive: true });
  copyFileSync(r.from, path.join(OUT, r.want.slug, r.file));
  done++;
}
console.log(`\n${done} image(s) filed${mismatches ? ' (forced past ' + mismatches + ' shape mismatch)' : ', every shape as expected'}.`);
console.log('Now run:  npm run photos && npm run shots:templates && npm run build');
