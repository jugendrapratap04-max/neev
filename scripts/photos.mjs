/* Drops generated photos into the templates.

   1. Save an image as  photos/<slot-id>.png   (or .jpg / .jpeg / .webp)
      e.g. photos/store-01.png
   2. node scripts/photos.mjs

   For each file it finds, it converts to WebP at a sensible width, writes
   templates/<slug>/img/<id>.webp, and puts an <img> inside that placeholder.
   The placeholder div stays as the frame, so the layout does not move and the
   change is reversible — delete the file and re-run to go back to a blank slot.

   Idempotent. Run it as often as you like. */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEIGHBOUR = 'F:/APP Downloads/stitch_nexora_premium_digital_marketplace/stitch_nexora_premium_digital_marketplace/node_modules/sharp/dist/index.mjs';
let sharp;
try { sharp = (await import(pathToFileURL(NEIGHBOUR).href)).default; }
catch (e) { console.error('sharp load failed:', e.message); process.exit(1); }

const ROOT = path.resolve('.');
const IN = path.join(ROOT, 'photos');
const TPL = path.join(ROOT, 'templates');
mkdirSync(IN, { recursive: true });

const slots = existsSync('photo-slots.json')
  ? JSON.parse(readFileSync('photo-slots.json', 'utf8'))
  : [];
if (!slots.length) {
  console.error('No photo-slots.json — run: node scripts/photo-slots.mjs');
  process.exit(1);
}
const byId = new Map(slots.map((s) => [s.id, s]));

/* Measured, not guessed: hero slots render about 500px wide (see
   scripts/measure-heroes.mjs), so 1200px covers a 2x screen with room to
   spare. Shipping the full 1536px original was costing ~130KB per hero for
   pixels nobody ever sees, on a site that promises to be fast on 3G. */
const widthFor = (id) => (/-0?1$/.test(id) ? 1200 : 900);
const QUALITY = 76;

/* Two ways to hand images in, so nothing has to be renamed by hand:

   1. photos/<slug>/  — drop a template's images in this folder in the order
      they were generated. Oldest file becomes slot 01, next becomes 02, and so
      on. This is the easy path: download and drop, no renaming.
   2. photos/<slot-id>.png — an exact name always wins, for fixing one slot. */
const IMG = /\.(png|jpe?g|webp)$/i;
const jobs = [];   // {file, id}

for (const f of readdirSync(IN).filter((f) => IMG.test(f))) {
  jobs.push({ file: path.join(IN, f), id: f.replace(/\.[^.]+$/, ''), how: 'name' });
}

for (const d of readdirSync(IN, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const slug = d.name;
  const slugSlots = slots.filter((s) => s.slug === slug);
  if (!slugSlots.length) { console.log(`SKIP folder ${slug}/ — no template by that name`); continue; }
  const dir = path.join(IN, slug);
  const inOrder = readdirSync(dir).filter((f) => IMG.test(f))
    .map((f) => ({ f, t: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => a.t - b.t)
    .map((x) => x.f);
  if (inOrder.length > slugSlots.length) {
    console.log(`NOTE ${slug}/ has ${inOrder.length} images but only ${slugSlots.length} slots — the extras are ignored`);
  }
  inOrder.slice(0, slugSlots.length).forEach((f, i) => {
    jobs.push({ file: path.join(dir, f), id: slugSlots[i].id, how: 'order' });
  });
}

if (!jobs.length) {
  console.log(`Nothing new to place. Put images in ${IN}\\<template>\\ — for example photos\\restaurant\\`);
  console.log('They are matched to slots in the order you saved them. Ids: photo-slots.json');
  /* Do not stop here: the sync pass below still has to run, so that deleting a
     photo really does put its placeholder back. */
}

/* ---- convert ---- */
const ready = new Map();   // slug -> [{id, rel}]
for (const job of jobs) {
  const { id } = job;
  const f = path.basename(job.file);
  const slot = byId.get(id);
  if (!slot) { console.log(`SKIP ${f} — no slot called "${id}"`); continue; }
  const outDir = path.join(TPL, slot.slug, 'img');
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, id + '.webp');
  const src = job.file;
  const meta = await sharp(src).metadata();
  const info = await sharp(src)
    .resize({ width: Math.min(widthFor(id), meta.width), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out);
  if (!ready.has(slot.slug)) ready.set(slot.slug, []);
  ready.get(slot.slug).push({ id, rel: `img/${id}.webp`, want: slot.want });
  console.log(`${f.padEnd(22)} ${meta.width}x${meta.height} ${(statSync(src).size / 1024 | 0)}KB -> ${info.width}x${info.height} ${(info.size / 1024 | 0)}KB`);
}

/* ---- wire into the HTML ---- */
let placed = 0;
for (const [slug, items] of ready) {
  const file = path.join(TPL, slug, 'index.html');
  let s = readFileSync(file, 'utf8');

  for (const it of items) {
    const re = new RegExp(`(<div\\b[^>]*data-ph-id="${it.id}"[^>]*>)([\\s\\S]*?)(</div>)`);
    if (!re.test(s)) { console.log(`  ! ${it.id} not found in ${slug}/index.html`); continue; }
    const img = `<img src="${it.rel}" alt="${escapeAttr(it.want)}" loading="lazy" decoding="async" `
      + `style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    s = s.replace(re, (m, open, inner, close) => {
      const cleaned = inner.replace(/<img\b[^>]*>/g, '');   // replace, never stack
      const positioned = /position\s*:\s*relative/.test(open) ? open
        : open.replace(/>$/, ' style="position:relative">').replace(/style="([^"]*)"\s+style="position:relative"/, 'style="$1;position:relative"');
      return positioned + cleaned + img + close;
    });
    placed++;
  }

  /* The placeholder's icon and caption are drawn with ::before/::after, which
     would sit on top of a real photo. Hide them once a slot is filled. */
  if (!s.includes('/* photo-filled */')) {
    s = s.replace('</head>', `<style>/* photo-filled */
  [data-ph-id]:has(> img)::before, [data-ph-id]:has(> img)::after { content: none !important; }
  [data-ph-id]:has(> img) { background-image: none !important; }
</style>
</head>`);
  }

  writeFileSync(file, s);
}

/* ---- sync: a slot shows a photo only while its file exists ----
   The webp files under templates/<slug>/img are the source of truth, so
   deleting one and re-running really does put the placeholder back. */
let removed = 0;
for (const slug of readdirSync(TPL).filter((d) => existsSync(path.join(TPL, d, 'index.html')))) {
  const imgDir = path.join(TPL, slug, 'img');
  const have = new Set(existsSync(imgDir)
    ? readdirSync(imgDir).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, ''))
    : []);
  const file = path.join(TPL, slug, 'index.html');
  let s = readFileSync(file, 'utf8');
  const before = s;

  s = s.replace(/<div\b([^>]*?)data-ph-id="([^"]+)"([^>]*?)>([\s\S]*?)<\/div>/g, (m, pre, id, post, inner) => {
    if (have.has(id) || !/<img\b/.test(inner)) return m;
    removed++;
    return `<div${pre}data-ph-id="${id}"${post}>${inner.replace(/<img\b[^>]*>/g, '')}</div>`;
  });

  if (s !== before) writeFileSync(file, s);
}

console.log(`\n${placed} photo(s) placed${removed ? `, ${removed} slot(s) put back to placeholder` : ''}.`);
console.log('Now run:  npm run shots:templates && npm run build');

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
