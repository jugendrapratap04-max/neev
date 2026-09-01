/* A tiny local drop box, used only while pulling generated images out of a
   browser tab. The image lives behind a signed, cookie-protected URL, so it
   cannot be curl'd from outside the browser — but the page itself can POST the
   bytes here.

       node scripts/photo-receiver.mjs          (then Ctrl-C when done)

   In the page:
       fetch('http://localhost:4399/store-01', { method: 'POST', body: blob })

   Localhost only, dev only, and it writes nowhere except ./photos with a
   sanitised name. Do not ship it and do not leave it running. */
import http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('photos');
mkdirSync(OUT, { recursive: true });
const PORT = 4399;

http.createServer((req, res) => {
  /* the page is on another origin, so it needs permission to POST here */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  /* Chrome's Private Network Access blocks an https page from reaching
     http://localhost unless the preflight is answered with this. */
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405).end('POST only'); return; }

  const id = decodeURIComponent(req.url.replace(/^\//, '')).trim();
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/i.test(id)) { res.writeHead(400).end('bad id'); return; }

  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > 25 * 1024 * 1024) { req.destroy(); return; }   // no runaway writes
    chunks.push(c);
  });
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    if (!buf.length) { res.writeHead(400).end('empty'); return; }
    const png = buf[0] === 0x89 && buf[1] === 0x50;
    const jpg = buf[0] === 0xff && buf[1] === 0xd8;
    const webp = buf.slice(0, 4).toString() === 'RIFF';
    if (!png && !jpg && !webp) { res.writeHead(415).end('not an image'); return; }
    const ext = png ? '.png' : jpg ? '.jpg' : '.webp';
    const file = path.join(OUT, id + ext);
    writeFileSync(file, buf);
    console.log(`saved ${path.basename(file)}  ${(buf.length / 1024 | 0)} KB`);
    res.writeHead(204).end();
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`photo receiver listening on http://localhost:${PORT} -> ${OUT}`);
});
