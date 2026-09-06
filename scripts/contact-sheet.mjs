/* Builds one labelled grid image out of everything in photos/, so a whole
   template's fetched set can be judged in a single look instead of opening 25
   files. Titles lie (a Commons file called "copper handi" turned out to be a
   scan of a 1909 book), so the sheet is the check that actually counts. */
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEIGHBOUR = 'F:/APP Downloads/stitch_nexora_premium_digital_marketplace/stitch_nexora_premium_digital_marketplace/node_modules/sharp/dist/index.mjs';
const sharp = (await import(pathToFileURL(NEIGHBOUR).href)).default;

const only = process.argv[2] || '';
const OUTDIR = process.argv[3] || '.';
mkdirSync(OUTDIR, { recursive: true });

const files = readdirSync('photos')
  .filter((f) => /\.jpg$/i.test(f))
  .filter((f) => !only || f.startsWith(only + '-'))
  .sort();

if (!files.length) { console.log('nothing to sheet'); process.exit(0); }

const CELL = 260, LABEL = 26, COLS = 5;
const rows = Math.ceil(files.length / COLS);
const W = COLS * CELL, H = rows * (CELL + LABEL);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const composites = [];

for (const [n, f] of files.entries()) {
  const x = (n % COLS) * CELL, y = Math.floor(n / COLS) * (CELL + LABEL);
  const buf = await sharp(path.join('photos', f))
    .resize(CELL - 4, CELL - 4, { fit: 'cover' })
    .jpeg({ quality: 70 }).toBuffer();
  composites.push({ input: buf, left: x + 2, top: y + 2 });
  const svg = `<svg width="${CELL}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111"/>
    <text x="6" y="18" font-family="monospace" font-size="13" fill="#fff">${esc(f.replace('.jpg', ''))}</text>
  </svg>`;
  composites.push({ input: Buffer.from(svg), left: x, top: y + CELL });
}

const out = path.join(OUTDIR, `sheet-${only || 'all'}.jpg`);
await sharp({ create: { width: W, height: H, channels: 3, background: '#222' } })
  .composite(composites).jpeg({ quality: 78 }).toFile(out);

console.log(`${files.length} images -> ${out}`);
