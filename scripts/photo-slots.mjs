/* Gives every photo placeholder a stable id, in document order, so a generated
   image can be dropped in by filename and never lands in the wrong hole.

   Idempotent — ids already present are left alone, so filenames never shift
   when a template is edited.

   node scripts/photo-slots.mjs */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const TPL = path.resolve('templates');
const slugs = readdirSync(TPL).filter((d) => existsSync(path.join(TPL, d, 'index.html')));

const all = [];
for (const slug of slugs) {
  const file = path.join(TPL, slug, 'index.html');
  let s = readFileSync(file, 'utf8');
  let n = 0;
  const slots = [];

  s = s.replace(/<div\b([^>]*?)\bdata-ph="([^"]*)"([^>]*?)>/g, (m, pre, desc, post) => {
    n++;
    const existing = /data-ph-id="([^"]+)"/.exec(m);
    const id = existing ? existing[1] : `${slug}-${String(n).padStart(2, '0')}`;
    slots.push({ id, want: decodeEntities(desc) });
    if (existing) return m;
    return `<div${pre}data-ph="${desc}" data-ph-id="${id}"${post}>`;
  });

  writeFileSync(file, s);
  slots.forEach((x) => all.push({ slug, ...x }));
  console.log(`${slug.padEnd(11)} ${String(slots.length).padStart(2)} slots`);
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

writeFileSync('photo-slots.json', JSON.stringify(all, null, 2));
console.log(`\n${all.length} slots -> photo-slots.json`);
console.log('Save a generated image as photos/<id>.png, then: npm run photos');
