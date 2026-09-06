/* Files a template's freshly downloaded ChatGPT images into photos/<slot-id>.png.

   collect-downloads.mjs does the eight heroes only, one per template. This is
   the same idea for the other 88: pick the newest N images out of Downloads,
   assign them to that template's slots in the order they were saved, and CHECK
   the guess against the shape each slot was asked for before copying anything.

   Chrome names them "ChatGPT Image Sep 6, 2026, 08_57_12 PM.png", which carries
   no subject, so order is the only signal there is — which is exactly why the
   shape check has to be there.

     node scripts/collect-slots.mjs store --dry     show the plan, copy nothing
     node scripts/collect-slots.mjs store           do it
     node scripts/collect-slots.mjs store --force   copy even if shapes disagree
     node scripts/collect-slots.mjs store --dir "D:\\folder"
     node scripts/collect-slots.mjs store --count 6 only the newest 6

   Partial runs are fine: slots that already have a file in photos/ are skipped,
   so a template can be done six images at a time. */
import { readdirSync, statSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEIGHBOUR = 'F:/APP Downloads/stitch_nexora_premium_digital_marketplace/stitch_nexora_premium_digital_marketplace/node_modules/sharp/dist/index.mjs';
let sharp = null;
try { sharp = (await import(pathToFileURL(NEIGHBOUR).href)).default; }
catch { console.log('note: sharp not loadable, shape check skipped'); }

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : null);
const slug = args.find((a) => !a.startsWith('--') && a !== val('--dir') && a !== val('--count'));
if (!slug) { console.error('usage: node scripts/collect-slots.mjs <template> [--dry] [--force]'); process.exit(1); }

const dry = flag('--dry');
const force = flag('--force');

/* Windows lets Downloads be moved off C: — his is on F: — so read the real
   location out of the registry instead of assuming the profile folder. */
function downloadsDir() {
  const given = val('--dir');
  if (given) return given;
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command',
      "(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders')." +
      "'{374DE290-123F-4565-9164-39C4925E467B}'"], { encoding: 'utf8' }).trim();
    if (out) return out.replace(/%([^%]+)%/g, (_, v) => process.env[v] || '');
  } catch { /* fall through */ }
  return path.join(process.env.USERPROFILE || '', 'Downloads');
}

const shapes = new Map(JSON.parse(readFileSync('photo-shapes.json', 'utf8')).map((s) => [s.id, s]));
const slots = JSON.parse(readFileSync('photo-slots.json', 'utf8'));

/* The slots this template still needs, in slot order — the same order the
   prompts are listed in PROMPTS.md, which is the order he generates them in. */
const PROMPTED = new Set(readFileSync('PROMPTS.md', 'utf8').match(/`([a-z]+-\d\d)`/g)?.map((m) => m.replace(/`/g, '')) || []);
const want = slots
  .filter((s) => s.slug === slug && PROMPTED.has(s.id))
  .filter((s) => !['.png', '.jpg', '.jpeg', '.webp'].some((e) => existsSync(path.join('photos', s.id + e))));

if (!want.length) { console.log(`${slug}: every prompted slot already has an image`); process.exit(0); }

const DIR = downloadsDir();
const IMG = /\.(png|jpe?g|webp)$/i;
const pool = readdirSync(DIR).filter((f) => IMG.test(f))
  .map((f) => ({ f, p: path.join(DIR, f), t: statSync(path.join(DIR, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);                       // newest first

const n = Math.min(Number(val('--count')) || want.length, want.length, pool.length);
if (!n) { console.log(`nothing to do — ${pool.length} images in ${DIR}`); process.exit(0); }

/* Newest N, flipped back into save order so the oldest of them is prompt 1. */
const picked = pool.slice(0, n).reverse();
const plan = picked.map((img, i) => ({ img, slot: want[i] }));

const shapeOf = (w, h) => (w / h >= 1.25 ? 'landscape' : w / h <= 0.85 ? 'portrait' : 'square');
let bad = 0;
console.log(`Downloads: ${DIR}\n${slug}: matching ${n} newest images to ${n} slots\n`);

for (const row of plan) {
  const wantShape = shapes.get(row.slot.id)?.shape || '?';
  let got = '?';
  if (sharp) {
    try { const m = await sharp(row.img.p).metadata(); got = shapeOf(m.width, m.height); } catch { got = 'unreadable'; }
  }
  const ok = got === '?' || got === wantShape;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${row.slot.id.padEnd(14)} want ${wantShape.padEnd(9)} got ${String(got).padEnd(10)} ${row.img.f.slice(0, 44)}`);
  row.ok = ok;
}

if (bad && !force) {
  console.log(`\n${bad} of ${n} shapes disagree — nothing copied.`);
  console.log('That almost always means the download order does not match the prompt order.');
  console.log('Re-check PROMPTS.md, or pass --force if you are sure.');
  process.exit(1);
}
if (dry) { console.log('\n--dry: nothing copied'); process.exit(0); }

for (const row of plan) {
  const ext = path.extname(row.img.f).toLowerCase();
  copyFileSync(row.img.p, path.join('photos', row.slot.id + ext));
}
console.log(`\ncopied ${plan.length} into photos/ — now run: node scripts/photos.mjs`);
