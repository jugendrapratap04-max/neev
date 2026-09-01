/* PNG screenshots -> WebP. The raw shots are 4.4MB total; a site that claims
   "3G par fast" cannot ship those. Uses the sharp already installed next door
   so we do not add another 40MB dependency to this project. */
import { pathToFileURL } from 'node:url';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const NEIGHBOUR = 'F:/APP Downloads/stitch_nexora_premium_digital_marketplace/stitch_nexora_premium_digital_marketplace/node_modules/sharp/dist/index.mjs';

let sharp;
try { sharp = (await import(pathToFileURL(NEIGHBOUR).href)).default; }
catch (e) { console.error('sharp load failed:', e.message); process.exit(1); }

const JOBS = [
  { dir: 'F:/projects/neev/assets/img/work',    match: /-desktop\.png$/, width: 1200, q: 78 },
  { dir: 'F:/projects/neev/assets/img/work',    match: /-mobile\.png$/,  width: 480,  q: 78 },
  { dir: 'F:/projects/neev/assets/img/templates', match: /-desktop\.png$/, width: 1200, q: 78 },
  { dir: 'F:/projects/neev/assets/img/templates', match: /-mobile\.png$/, width: 480 , q: 78 },
];

let before = 0, after = 0;
for (const job of JOBS) {
  for (const f of readdirSync(job.dir)) {
    if (!job.match.test(f)) continue;
    const src = path.join(job.dir, f);
    const out = src.replace(/\.png$/, '.webp');
    const meta = await sharp(src).metadata();
    const info = await sharp(src)
      .resize({ width: Math.min(job.width, meta.width), withoutEnlargement: true })
      .webp({ quality: job.q })
      .toFile(out);
    const b = statSync(src).size;
    before += b; after += info.size;
    console.log(`${f.padEnd(26)} ${meta.width}x${meta.height} ${(b / 1024 | 0)}KB -> ${info.width}x${info.height} ${(info.size / 1024 | 0)}KB`);
  }
}
console.log(`\nTOTAL ${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB`);
