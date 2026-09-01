/* Every template demo invents a business name and prints Jugendra's real phone
   number, so a visitor could easily mistake one for a real shop. This stamps a
   plain strip on top of every template saying what it is, and gives anyone who
   lands on a shared demo link a way back to NEEV.

   Idempotent: run it as often as you like.
   node scripts/demo-ribbon.mjs */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const TPL = path.resolve('templates');
const MARK = 'neev-demo-ribbon';

const RIBBON = `
<!-- ${MARK}: added by scripts/demo-ribbon.mjs, not by hand -->
<style>
  .${MARK}{position:relative;z-index:2147483647;display:flex;flex-wrap:wrap;align-items:center;
    justify-content:center;gap:.5rem 1rem;padding:.75rem 1rem;background:#020812;color:#fff;
    font:500 14px/1.45 Inter,ui-sans-serif,system-ui,"Segoe UI",Roboto,sans-serif;text-align:center}
  .${MARK} b{background:#0051d5;color:#fff;border-radius:999px;padding:.15rem .55rem;
    font-size:11px;letter-spacing:.08em;font-weight:700}
  .${MARK} span{opacity:.75}
  .${MARK} a{display:inline-flex;align-items:center;min-height:44px;padding:0 1rem;
    border-radius:8px;background:#0f7b45;color:#fff;text-decoration:none;font-weight:600}
  .${MARK} a.ghost{background:transparent;border:1px solid rgba(255,255,255,.25)}
  @media (max-width:520px){.${MARK}{font-size:13px}}
</style>
<div class="${MARK}">
  <b>DEMO</b>
  <span>A sample design by NEEV. This is not a real business &mdash; the name, prices and photos are placeholders.</span>
  <a href="https://wa.me/918439305810?text=Hello%20Jugendra%2C%20I%20like%20this%20demo%20design.%20My%20business%20is%20______.">Get this design</a>
  <a class="ghost" href="../../index.html">All templates</a>
</div>
`;

let done = 0;
for (const slug of readdirSync(TPL)) {
  const file = path.join(TPL, slug, 'index.html');
  if (!existsSync(file)) continue;
  let s = readFileSync(file, 'utf8');

  /* Strip every previous copy so re-running never stacks them. The end anchor
     is \s* rather than \n: these files are written with CRLF, and requiring a
     bare \n silently matched nothing, which is how two ribbons ended up in
     every template. */
  const strip = new RegExp(`\\s*<!--\\s*${MARK}[\\s\\S]*?</div>`, 'g');
  const had = (s.match(strip) || []).length;
  s = s.replace(strip, '');
  if (had > 1) console.log(`  (removed ${had} stacked ribbons from ${slug})`);

  if (!/<body[^>]*>/.test(s)) { console.log(`SKIP ${slug} (no <body>)`); continue; }
  s = s.replace(/(<body[^>]*>)/, `$1${RIBBON}`);

  /* Say it in the tab title too, and keep demos out of search results so they
     never outrank a real client site built from the same template. */
  s = s.replace(/<title>(?!Demo · )/, '<title>Demo · ');
  if (!/name="robots"/.test(s)) {
    s = s.replace(/<\/title>/, '</title>\n<meta name="robots" content="noindex">');
  }

  /* Without this the browser asks for /favicon.ico and gets a 404 on every
     demo. An inline data URI makes no request at all, and it is deliberately a
     neutral mark — a client's own site should never carry NEEV's. */
  if (!/rel="icon"/.test(s)) {
    const ICON = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="7" fill="#020812"/>' +
      '<circle cx="16" cy="16" r="6" fill="none" stroke="#F6F3ED" stroke-width="2.5"/></svg>');
    s = s.replace(/<\/title>/, `</title>\n<link rel="icon" href="${ICON}">`);
  }

  writeFileSync(file, s);
  done++;
  console.log(`stamped ${slug}`);
}
console.log(`\n${done} template(s) carry the demo ribbon`);
