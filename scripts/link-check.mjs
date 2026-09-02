/* Crawls the live site and reports every link and asset that does not answer.
   A dead link on a page you are asking a stranger to trust costs more than a
   slow one, and nothing else in the toolchain looks at the deployed site.

   node scripts/link-check.mjs [https://base-url]  */
const BASE = (process.argv[2] || 'https://neev-5h1.pages.dev').replace(/\/$/, '');

const seen = new Set();
const results = [];
const queue = ['/'];

const isInternal = (u) => u.startsWith('/') || u.startsWith(BASE);
const norm = (u) => {
  if (u.startsWith(BASE)) u = u.slice(BASE.length) || '/';
  return u.split('#')[0];
};

async function head(url) {
  try {
    const r = await fetch(BASE + url, { redirect: 'follow', signal: AbortSignal.timeout(25000) });
    return { status: r.status, type: r.headers.get('content-type') || '', size: +(r.headers.get('content-length') || 0), html: r.headers.get('content-type')?.includes('text/html') ? await r.text() : null };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

while (queue.length) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);

  const r = await head(url);
  results.push({ url, status: r.status, error: r.error });

  if (!r.html) continue;
  /* follow links and check every asset the page pulls */
  const hrefs = [...r.html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const h of hrefs) {
    if (/^(mailto:|tel:|javascript:|data:|#)/.test(h)) continue;
    if (/^https?:\/\//.test(h) && !h.startsWith(BASE)) continue;   // external, not ours to police
    const n = norm(h.startsWith('/') || h.startsWith(BASE) ? h : resolve(url, h));
    if (!seen.has(n) && !queue.includes(n)) queue.push(n);
  }
}

function resolve(from, rel) {
  const dir = from.endsWith('/') ? from : from.replace(/\/[^/]*$/, '/');
  const out = (dir + rel).replace(/\/\.\//g, '/');
  let prev;
  let cur = out;
  do { prev = cur; cur = cur.replace(/\/[^/]+\/\.\.\//, '/'); } while (cur !== prev);
  return cur;
}

const bad = results.filter((r) => r.status === 0 || r.status >= 400);
const ok = results.filter((r) => r.status >= 200 && r.status < 400);

console.log(`checked ${results.length} urls on ${BASE}`);
console.log(`  ${ok.length} answered, ${bad.length} did not\n`);
if (bad.length) {
  bad.forEach((b) => console.log(`  ${String(b.status).padEnd(4)} ${b.url}${b.error ? '  (' + b.error + ')' : ''}`));
  process.exitCode = 1;
} else {
  console.log('  every link and asset on the live site answers');
}
