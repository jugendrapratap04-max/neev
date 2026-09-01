/* NEEV ships in clean English — Jugendra asked for that explicitly. This sweeps
   the templates for Devanagari and for Hindi phrases written in Latin letters.

   Indian food and dish names are NOT touched: a Mathura restaurant's English
   menu still says thali, mithai and paneer, exactly as an English menu anywhere
   says pizza or sushi. Those are the names of the things.

   Idempotent. node scripts/language-sweep.mjs */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const TPL = path.resolve('templates');

/* [pattern, replacement, why]
   Longest phrases first: replacing "udhaar" on its own would leave the
   surrounding Hinglish sentence half-translated. */
const RULES = [
  [/Aaj ka hisaab, ek screen mein/g, "Today's takings, on one screen", 'Hindi headline'],
  [/Counter sales, online orders, udhaar and stock — sab kuch yahin\./g,
    'Counter sales, online orders, credit and stock — all in one place.', 'Hindi sentence'],
  [/Numbers ([\d:]+ [AP]M) tak ke hain\./g, 'Figures are up to $1.', 'Hindi sentence'],
  [/Naye column, apna logo, alag report — jo chahiye WhatsApp par bata dijiye\./g,
    'New columns, your own logo, a different report — tell me on WhatsApp what you need.', 'Hindi sentence'],
  [/\bAaj ka khaas\b/g, "Today's specials", 'Hindi heading'],
  [/\bAaj ka\b/g, "Today's", 'Hindi'],
  [/On credit \(udhaar\)/g, 'On credit', 'Hindi gloss'],
  [/\bUdhaar\b/g, 'Credit', 'Hindi — it has a plain English word'],
  [/\budhaar\b/g, 'credit', 'Hindi — it has a plain English word'],
  [/\bNamaste\b/g, 'Hello', 'greeting in WhatsApp prefills'],
  [/\bnamaste\b/g, 'hello', 'greeting in WhatsApp prefills'],
  [/“samajh aa gaya”/g, '“I get it now”', 'Hindi phrase in a headline'],
  [/"samajh aa gaya"/g, '"I get it now"', 'Hindi phrase in a headline'],
  [/\bsamajh aa gaya\b/g, 'I get it now', 'Hindi phrase'],
  [/\bkripya\b/gi, 'please', 'Hindi'],
  [/\bdhanyavaad\b/gi, 'thank you', 'Hindi'],
];

/* Words that stay: they are the names of the things, exactly as an English
   menu anywhere says pizza or sushi. */
const KEEP = ['thali', 'mithai', 'paneer', 'namkeen', 'roti', 'dal', 'lassi', 'katori', 'kansa', 'tandoor', 'saag', 'chutney', 'kulhad', 'ghevar', 'rabri', 'laddoo', 'peda', 'urli', 'diya', 'pooja'];

const DEVANAGARI = /[ऀ-ॿ]/;

let touched = 0;
const report = [];
for (const slug of readdirSync(TPL)) {
  const file = path.join(TPL, slug, 'index.html');
  if (!existsSync(file)) continue;
  let s = readFileSync(file, 'utf8');
  const before = s;
  for (const [re, to, why] of RULES) {
    const hits = (s.match(re) || []).length;
    if (hits) { s = s.replace(re, to); report.push(`  ${slug}: ${hits} x ${why}`); }
  }
  if (DEVANAGARI.test(s)) {
    const sample = s.match(new RegExp('.{0,40}' + DEVANAGARI.source + '.{0,40}'))?.[0] || '';
    report.push(`  ${slug}: DEVANAGARI STILL PRESENT — fix by hand: ${sample.trim()}`);
  }
  if (s !== before) { writeFileSync(file, s); touched++; }
}

console.log(report.length ? report.join('\n') : '  nothing to change');
console.log(`\n${touched} template(s) rewritten`);

/* A last sweep for Hinglish nobody wrote a rule for yet. These are flagged,
   not rewritten — a machine cannot tell a stray Hindi word from a dish name. */
const SUSPECT = /\b(hisaab|udhaar|sab kuch|yahin|kripya|dijiye|kijiye|karo|hoga|apna|apni|kitna|kaise|kahan|thoda|zyada|jaldi|shukriya|paisa|bhai)\b/gi;
const flagged = [];
for (const slug of readdirSync(TPL)) {
  const file = path.join(TPL, slug, 'index.html');
  if (!existsSync(file)) continue;
  const s = readFileSync(file, 'utf8');
  const hits = [...new Set((s.match(SUSPECT) || []).map((h) => h.toLowerCase()))]
    .filter((h) => !KEEP.includes(h));
  if (hits.length) flagged.push(`  ${slug}: ${hits.join(', ')}`);
}
if (flagged.length) {
  console.log('\nPossible Hinglish still in the templates — check by hand:');
  console.log(flagged.join('\n'));
} else {
  console.log('No suspect Hinglish left.');
}
