/* Turns a template into a real client's site.

     node scripts/new-client.mjs <template> "<Business Name>" <10-digit phone> ["City"]
     node scripts/new-client.mjs hotel "Sharma Guest House" 9876543210 Mathura

   Why this exists: Jugendra's own number appears 12 to 29 times in a template,
   inside text, tel: links and wa.me links. Change them by hand and one will be
   missed — and then the client's customers ring him instead of the client.

   It changes every one, then checks its own work and refuses to finish if a
   single trace of his number or of the demo business is left.

   The first version of this script only replaced the FULL demo name and left
   ten bare "Shreenath" behind in logos and alt text, which is exactly the bug
   it exists to prevent. It now replaces the distinctive words too.

   What it cannot do, and says so: the address, the prices and the photos still
   need a person. */
import { readdirSync, readFileSync, writeFileSync, existsSync, cpSync } from 'node:fs';
import path from 'node:path';

const OWNER_INTL = '918439305810';          // Jugendra's — must never survive
const OWNER_LOCAL = '8439305810';
const OWNER_PRETTY = /\+?\s?91[\s-]?84393[\s-]?05810|84393[\s-]?05810/g;

const [tpl, name, phoneRaw, city] = process.argv.slice(2);
if (!tpl || !name || !phoneRaw) {
  console.log('usage: node scripts/new-client.mjs <template> "<Business Name>" <10-digit phone> ["City"]');
  console.log('       templates: ' + readdirSync('templates').join(', '));
  process.exit(2);
}

const phone = phoneRaw.replace(/\D/g, '').slice(-10);
if (!/^[6-9]\d{9}$/.test(phone)) {
  console.error(`"${phoneRaw}" is not a 10-digit Indian mobile number.`);
  process.exit(2);
}
const intl = '91' + phone;
const pretty = phone.replace(/(\d{5})(\d{5})/, '$1 $2');

if (!existsSync(path.join('templates', tpl, 'index.html'))) {
  console.error('No template called "' + tpl + '". Have: ' + readdirSync('templates').join(', '));
  process.exit(2);
}

const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const outDir = path.join('clients', slug);
if (existsSync(outDir)) {
  console.error('clients/' + slug + ' already exists. Delete it or pick another name.');
  process.exit(2);
}

cpSync(path.join('templates', tpl), outDir, { recursive: true });
const outFile = path.join(outDir, 'index.html');
let s = readFileSync(outFile, 'utf8');

/* the demo business, read from the title the template carries */
const titleRaw = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
const demoName = titleRaw.replace(/^Demo\s*·\s*/, '').split('—')[0].trim();
const demoPlain = demoName.replace(/&amp;/g, '&');

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeName = name.replace(/&/g, '&amp;');
const clientShort = name.split(/\s+/)[0];

/* Words that describe the trade rather than name the business — replacing
   these would mangle ordinary sentences. */
const GENERIC = new Set(['and', 'the', 'for', 'inc', 'ltd', 'pvt', 'guest', 'house', 'hotel',
  'rooms', 'clinic', 'diagnostic', 'centre', 'center', 'salon', 'spa', 'studio', 'academy',
  'school', 'sweets', 'namkeen', 'brass', 'copper', 'kansa', 'strength', 'fitness', 'gym',
  'residency', 'cafe', 'restaurant', 'kitchen', 'tandoor', 'store', 'shop', 'veg', 'pure']);
const demoTokens = [...new Set(
  demoPlain.split(/[^A-Za-z]+/).filter((w) => w.length > 2 && !GENERIC.has(w.toLowerCase()))
)].sort((a, b) => b.length - a.length);       // longest first: "Shree Anand" before "Anand"

/* ---- phone, in every shape it appears in ---- */
s = s.split(OWNER_INTL).join(intl);           // wa.me/91... and tel:+91...
s = s.replace(OWNER_PRETTY, pretty);
s = s.split(OWNER_LOCAL).join(phone);

/* ---- business name ----
   The name also sits inside the prefilled WhatsApp links, percent-encoded as
   "Shreenath%20Residency". A plain replace never sees that form, and \b cannot
   help either: the character before the S is the 0 of %20, which is a word
   character, so no boundary exists. Encoded forms are replaced explicitly and
   the token pass uses letter-only lookarounds. */
if (demoName) s = s.replace(new RegExp(esc(demoName), 'g'), safeName);
if (demoPlain) s = s.replace(new RegExp(esc(demoPlain), 'g'), name);
if (demoPlain) {
  s = s.split(encodeURIComponent(demoPlain)).join(encodeURIComponent(name));
  s = s.split(demoPlain.replace(/ /g, '%20')).join(name.replace(/ /g, '%20'));
}
demoTokens.forEach((t) => { s = s.replace(new RegExp('(?<![A-Za-z])' + esc(t) + '(?![A-Za-z])', 'gi'), clientShort); });
/* two demo words sitting together become the short name twice */
s = s.replace(new RegExp('\\b(' + esc(clientShort) + ')(\\s+\\1\\b)+', 'g'), '$1');

/* Run-together forms: the demo email was stay@shreenathresidency.in, where the
   name has no separator at all, so neither the phrase nor the token pass could
   see it. Squash both names to bare letters and swap those too. */
const squash = (x) => x.toLowerCase().replace(/[^a-z]/g, '');
const demoSquashed = squash(demoPlain);
if (demoSquashed.length > 5) {
  s = s.replace(new RegExp(esc(demoSquashed), 'gi'), squash(name));
}

if (city) s = s.replace(/\bMathura\b/g, city).replace(/\bMoradabad\b/g, city);

/* ---- it is a real business now ---- */
s = s.replace(/\s*<!--\s*neev-demo-ribbon[\s\S]*?<\/div>/g, '');
s = s.replace(/<meta name="robots" content="noindex">\s*/g, '');
s = s.replace(/<title>Demo\s*·\s*/, '<title>');

writeFileSync(outFile, s);

/* ---- check its own work ---- */
const check = readFileSync(outFile, 'utf8');
const problems = [];
const hisPhone = (check.match(new RegExp(OWNER_INTL + '|' + OWNER_LOCAL, 'g')) || []).length;
if (hisPhone) problems.push(`${hisPhone} occurrence(s) of YOUR phone number are still here`);
if (demoPlain && check.includes(demoPlain)) problems.push(`the demo name "${demoPlain}" is still here`);
if (demoPlain && check.includes(demoPlain.replace(/ /g, '%20'))) problems.push('the demo name is still inside a WhatsApp link');
demoTokens.forEach((t) => {
  const n = (check.match(new RegExp('(?<![A-Za-z])' + esc(t) + '(?![A-Za-z])', 'gi')) || []).length;
  if (n) problems.push(`"${t}" from the demo business is still here ${n} time(s)`);
});
if (/neev-demo-ribbon/.test(check)) problems.push('the DEMO ribbon is still here');
if (/noindex/.test(check)) problems.push('the page still tells Google to stay away');

if (problems.length) {
  console.log('STOPPED — this copy is not safe to hand over:');
  problems.forEach((p) => console.log('  - ' + p));
  console.log('\nIt is at ' + outDir + '. Fix it by hand, or delete the folder and re-run.');
  process.exitCode = 1;
} else {
  console.log(`clients/${slug}/  ready`);
  console.log(`  business : ${name}`);
  console.log(`  phone    : ${pretty}   — yours appears 0 times, checked`);
  console.log(`  from     : the ${tpl} template`);
}

/* ---- what still needs a person ---- */
const slots = (check.match(/data-ph=/g) || []).length;
const addr = (check.match(/[^<>]{0,45}(Road|Ghat|Nagar|Market|Bypass|Gate)[^<>]{0,30}/g) || [])[0];
/* An invented email address on a live client site bounces every message sent
   to it, and the client never learns why. Always surface it. */
const emails = [...new Set(check.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [])];

console.log('\nSTILL NEEDS YOU:');
console.log(`  ${slots} photo slot(s) — drop the client's photos in and run: npm run photos`);
if (addr) console.log('  the address is still the demo one: ' + addr.trim().slice(0, 60));
if (emails.length) {
  console.log('  these email addresses are invented and will bounce — replace them with');
  console.log('  the client\'s real one, or delete the line:');
  emails.forEach((e) => console.log('      ' + e));
}
console.log('  the prices and the menu / room / service list are still demo content');
console.log('\nTHEN:');
console.log(`  1. open clients/${slug}/index.html and read it as the shop owner would`);
console.log(`  2. dash.cloudflare.com → Workers & Pages → Create → Pages → Upload assets`);
console.log(`     drag the clients/${slug} folder in`);
console.log('  3. send them the link, and the folder zipped, so they are never locked in');
