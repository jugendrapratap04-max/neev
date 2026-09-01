/* Assembles dist/ — exactly the files that should be on the internet, and
   nothing else. src/, scripts/, photos/ and node_modules stay behind.

   dist/ is committed on purpose. It means the host needs no build step at all:
   point it at this folder and it serves. Nothing to install, nothing in CI that
   can fail on a day when a site needs to go live.

   Runs as part of `npm run build`, so it can never fall behind the site. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* Everything here is copied. Anything not listed does not ship. */
const FILES = ['favicon.svg', 'robots.txt', 'sitemap.xml', '_headers'];
const DIRS = ['assets', 'templates'];
const SKIP_EXT = new Set(['.png']);      // raw screenshots; the .webp ship

let files = 0;
let bytes = 0;

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, e.name);
    const dst = path.join(to, e.name);
    if (e.isDirectory()) { copyDir(src, dst); continue; }
    if (SKIP_EXT.has(path.extname(e.name).toLowerCase())) continue;
    fs.copyFileSync(src, dst);
    files++; bytes += fs.statSync(dst).size;
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const f of fs.readdirSync(ROOT)) {
  if (!f.endsWith('.html')) continue;
  fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
  files++; bytes += fs.statSync(path.join(DIST, f)).size;
}
for (const f of FILES) {
  if (!fs.existsSync(path.join(ROOT, f))) continue;
  fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
  files++; bytes += fs.statSync(path.join(DIST, f)).size;
}
for (const d of DIRS) {
  if (fs.existsSync(path.join(ROOT, d))) copyDir(path.join(ROOT, d), path.join(DIST, d));
}

console.log(`dist/: ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
