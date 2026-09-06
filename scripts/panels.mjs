/* Turns the 28 slots that must NOT hold a photograph into designed panels.

   Which 28, and why not a photo:
   - 17 named staff portraits. A generated or stock face under "Dr. Anjali
     Verma" is a person who does not exist, and Pexels' own licence forbids
     implying the people in its photos endorse anything. Gets a monogram, the
     same pattern Gmail and Slack use — obviously a graphic, never mistaken for
     a photograph. The real name and role are already in the markup underneath.
   - 8 salon before/after halves. Two unrelated people shown as one person's
     result is the single most trust-destroying thing that can go on a salon
     page. Keeps its label and icon, gets a treated background.
   - 3 map slots. A photograph was never the right answer here; they get a
     drawn street map.

   Idempotent — the marker class is checked before anything is written, so it
   can be run as often as you like.

   node scripts/panels.mjs            all templates
   node scripts/panels.mjs --revert   put the plain placeholders back */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const revert = process.argv.includes('--revert');

/* Initials come from the name the template already prints under the slot, so
   the monogram and the caption can never drift apart. Where a slot has no name
   beside it (the restaurant's "the family", the hotel's front desk) the
   business initial is used instead — inventing a person to fill it would be
   the exact thing this script exists to avoid. */
const MONOGRAM = {
  'store-28': 'RT',        // Rakesh Trivedi
  'restaurant-06': 'A',    // Aangan — text names the family, not one owner
  'hotel-08': 'SR',        // Shreenath Residency — no name in the markup
  'clinic-05': 'AV',       // Dr. Anjali Verma
  'salon-05': 'RS',        // Ritika Sharma
  'salon-07': 'RS',        // Ritika Sharma
  'salon-08': 'NY',        // Neha Yadav
  'salon-09': 'FQ',        // Farheen Qureshi
  'salon-10': 'SK',        // Sunil Kumar
  'gym-04': 'RC',          // Rohit Chaudhary
  'gym-05': 'NS',          // Neha Sharma
  'gym-06': 'IQ',          // Imran Qureshi
  'gym-07': 'PB',          // Priya Bansal
  'saas-05': 'PS',         // Prabhat Kumar Sharma
  'saas-06': 'AV',         // Anjali Verma
  'saas-07': 'RC',         // Rohit Chaudhary
  'dashboard-02': 'RA',    // Rakesh Anand
};

const BEFORE = new Set(['salon-11', 'salon-13', 'salon-15', 'salon-17']);
const AFTER = new Set(['salon-12', 'salon-14', 'salon-16', 'salon-18']);
const MAPS = new Set(['store-29', 'hotel-17', 'clinic-10']);

/* The slot labels were written for a photograph that was going to be dropped in
   ("Google map of the shop", "map screenshot"). The panel draws its own map, so
   those captions now describe something that is not there and credit a company
   that has nothing to do with it. */
const MAP_LABEL = {
  'store-29': 'Shop location',
  'hotel-17': 'Hotel location',
  'clinic-10': 'Clinic location',
};

/* A drawn street map: blocks, two roads, a pin. Everything is currentColor, so
   it picks up whatever tone that template already gives its placeholders and
   cannot clash with a palette this script has never seen. */
const MAP_SVG = `<svg class="pnl-map" viewBox="0 0 320 200" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
<g fill="currentColor">
<rect x="0" y="0" width="320" height="200" opacity=".07"/>
<rect x="14" y="16" width="86" height="52" rx="3" opacity=".13"/>
<rect x="14" y="80" width="86" height="40" rx="3" opacity=".11"/>
<rect x="14" y="132" width="86" height="52" rx="3" opacity=".13"/>
<rect x="122" y="16" width="70" height="40" rx="3" opacity=".11"/>
<rect x="122" y="132" width="70" height="52" rx="3" opacity=".13"/>
<rect x="214" y="16" width="92" height="52" rx="3" opacity=".13"/>
<rect x="214" y="80" width="92" height="40" rx="3" opacity=".10"/>
<rect x="214" y="132" width="92" height="52" rx="3" opacity=".12"/>
</g>
<g stroke="currentColor" fill="none" stroke-linecap="round">
<path d="M0 74 H320" stroke-width="11" opacity=".22"/>
<path d="M0 126 H320" stroke-width="7" opacity=".16"/>
<path d="M108 0 V200" stroke-width="9" opacity=".20"/>
<path d="M200 0 V200" stroke-width="6" opacity=".14"/>
<path d="M0 74 H320" stroke-width="1.5" opacity=".28" stroke-dasharray="7 9"/>
</g>
<g transform="translate(154 88)">
<path d="M0 26 C0 26 13 11 13 1 A13 13 0 1 0 -13 1 C-13 11 0 26 0 26 Z"
      fill="currentColor" opacity=".85"/>
<circle cy="0" r="4.6" fill="#fff" opacity=".95"/>
</g>
</svg>`;

const CSS_MARK = '/* neev:panels */';
const CSS = `
${CSS_MARK}
/* Tint the section's own background rather than painting over it. The first
   version laid a white gradient on top, which was fine on the seven light
   templates and turned the gym's coach cards into glaring white slabs on a
   black page — the dark override keyed on .ph--dark, and those slots do not
   carry it. Mixing currentColor into transparent needs no knowledge of the
   palette and gets both cases right on its own. */
.ph--panel{
  background:linear-gradient(158deg,
    color-mix(in srgb,currentColor 24%,transparent) 0%,
    color-mix(in srgb,currentColor 11%,transparent) 55%,
    color-mix(in srgb,currentColor 18%,transparent) 100%);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 24%,transparent);
}
@supports not (background:color-mix(in srgb,red 50%,transparent)){
  .ph--panel{background:linear-gradient(158deg,rgba(128,128,128,.20),rgba(128,128,128,.11))}
}
/* The monogram replaces the caption: the person's name is already printed
   directly beneath the slot, so repeating it inside would say it twice. */
.ph--mono::after{content:none}
.ph--mono{gap:0}
.pnl-mono{
  display:flex;align-items:center;justify-content:center;
  width:100%;height:100%;
  font-weight:700;letter-spacing:.06em;
  font-size:clamp(26px,26cqw,54px);
  line-height:1;opacity:.62;
  font-variant-ligatures:none;
}
.ph--mono{container-type:inline-size}
@supports not (font-size:1cqw){ .pnl-mono{font-size:34px} }
/* Before/after keeps its own label and icon — the treatment is only there so a
   sample slot reads as designed rather than missing. */
.ph--swatch.is-before{filter:saturate(.55)}
.ph--swatch.is-after::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(118deg,transparent 34%,rgba(255,255,255,.30) 50%,transparent 66%);
}
.ph--map{padding:0}
.ph--map::after{
  position:absolute;left:0;right:0;bottom:9px;
  opacity:.72;font-size:10.5px;
}
.pnl-map{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit}
.ph--map .ph-i,.ph--map .ph-ico{display:none}
`;

const slugOf = (id) => id.replace(/-\d+$/, '');
const ids = [...Object.keys(MONOGRAM), ...BEFORE, ...AFTER, ...MAPS];
const bySlug = {};
for (const id of ids) (bySlug[slugOf(id)] ||= []).push(id);

let changed = 0;
for (const [slug, list] of Object.entries(bySlug)) {
  const file = path.join('templates', slug, 'index.html');
  let html = readFileSync(file, 'utf8');
  const before = html;

  for (const id of list) {
    /* Anchor on one short single-line snippet. These files are CRLF and a
       multi-line match with \n silently fails on every one of them. */
    const re = new RegExp(`(<div class=")([^"]*?\\bph\\b[^"]*?)("[^>]*data-ph-id="${id}"[^>]*>)([\\s\\S]*?)(</div>)`);
    const m = html.match(re);
    if (!m) { console.log(`  ? ${id} not found`); continue; }

    let cls = m[2].replace(/\s*\bph--(panel|mono|swatch|map)\b/g, '')
                  .replace(/\s*\bis-(before|after)\b/g, '').trim();
    let attrs = m[3];
    let inner = m[4];

    /* The caption lives in data-ph and is printed by .ph::after, so a map slot's
       label has to be corrected on the attribute, not in the body. */
    if (MAP_LABEL[id] && !revert) {
      attrs = attrs.replace(/data-ph="[^"]*"/, `data-ph="${MAP_LABEL[id]}"`);
    }

    if (!revert) {
      if (MONOGRAM[id]) {
        cls += ' ph--panel ph--mono';
        inner = `<span class="pnl-mono">${MONOGRAM[id]}</span>`;
      } else if (MAPS.has(id)) {
        cls += ' ph--panel ph--map';
        inner = MAP_SVG;
      } else {
        cls += ` ph--panel ph--swatch ${BEFORE.has(id) ? 'is-before' : 'is-after'}`;
        /* icon and label are kept exactly as they were */
      }
    } else if (MONOGRAM[id] || MAPS.has(id)) {
      /* Put back the generic icon the placeholder shipped with. */
      inner = `<svg class="ph-i" viewBox="0 0 24 24" aria-hidden="true"><use href="#${MAPS.has(id) ? 'i-map' : 'i-person'}"></use></svg>`;
    }

    html = html.replace(re, () => `${m[1]}${cls}${attrs}${inner}${m[5]}`);
  }

  /* One copy of the panel CSS, appended to the last style block. */
  /* Always strip the old block before writing the new one, so an edit to CSS
     above actually reaches templates that were panelled on an earlier run. */
  if (html.includes(CSS_MARK)) {
    html = html.replace(new RegExp(`\\r?\\n?${CSS_MARK.replace(/[*/]/g, '\\$&')}[\\s\\S]*?(?=\\r?\\n\\s*</style>)`), '');
  }
  if (!revert) {
    const i = html.lastIndexOf('</style>');
    if (i < 0) console.log(`  ! ${slug}: no </style> to append to`);
    else html = html.slice(0, i) + CSS + html.slice(i);
  }

  if (html !== before) { writeFileSync(file, html); changed++; console.log(`${revert ? 'reverted' : 'panelled'} ${slug} (${list.length} slots)`); }
  else console.log(`unchanged ${slug}`);
}
console.log(`\n${changed} template(s) written`);
