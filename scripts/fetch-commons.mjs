/* Fills empty photo slots from Wikimedia Commons.

   Why Commons and not a stock API: Pexels/Unsplash need a key, Openverse and
   Pixabay are both unreachable from this machine (measured: connect fail and
   429). Commons answers keyless and its licences are all reuse-safe.

   What it does NOT do: portraits of named staff, salon before/after pairs, and
   map slots. A stranger's face under "Dr. Anjali Verma" is a lie the licence
   also forbids, and two unrelated people as one person's before/after is worse.
   Those slots are marked SKIP here and handled by panels.mjs instead.

   Output: photos/<slot-id>.jpg  +  photos/CREDITS.json
   Then run scripts/photos.mjs to convert and inject.

   Commons rate-limits at roughly 10 rapid requests, so every call waits. */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const UA = 'neev-template-photos/1.0 (https://neev-5h1.pages.dev; contact via site)';
const OUT = path.resolve('photos');
mkdirSync(OUT, { recursive: true });

/* Per-slot search terms. Hand-written, not derived from the slot label: the
   labels are written for a photographer ("cardio deck by the window"), which is
   not what an archive is indexed by. Several terms per slot, tried in order. */
const Q = {
  // ---------- store: Trivedi Brass & Copper, Moradabad ----------
  'store-02': ['brass thali', 'brass plate india'],
  'store-03': ['brass polishing', 'metal polishing hand'],
  'store-04': ['brass dinner set', 'thali set brass'],
  'store-05': ['puja thali', 'pooja thali brass'],
  'store-06': ['copper water bottle', 'copper bottle india'],
  'store-07': ['brass idol hindu', 'brass statue deity'],
  'store-08': ['gift box wrapped', 'gift packaging box'],
  'store-09': ['indian wedding gifts', 'wedding gift tray india'],
  'store-10': ['brass thali plate', 'thali traditional brass'],
  'store-11': ['copper bottle', 'copper water storer'],
  'store-12': ['urli bowl', 'brass bowl flowers water'],
  'store-13': ['copper jug', 'copper pitcher glass'],
  'store-14': ['diya oil lamp lit', 'diwali diya lamps'],
  'store-15': ['katori brass bowl', 'bronze bowl india'],
  'store-16': ['puja thali bell', 'temple puja items'],
  'store-17': ['copper handi', 'copper cooking pot india'],
  'store-18': ['brass ganesha', 'ganesha brass statue'],
  'store-19': ['tiffin carrier', 'indian lunch box steel'],
  'store-20': ['temple bell brass', 'hindu temple bell'],
  'store-21': ['gift hamper open', 'hamper basket gift'],
  'store-22': ['brass thali food', 'thali brass serving'],
  'store-23': ['copper bottle hand', 'copper drinking bottle'],
  'store-24': ['urli flowers floating', 'brass urli diya'],
  'store-25': ['diya clay lamp', 'oil lamp india close'],
  'store-26': ['brass workshop moradabad', 'metal workshop india'],
  'store-27': ['coppersmith hammering', 'metalworking hammer craft'],
  'store-28': 'SKIP-PORTRAIT',
  'store-29': 'SKIP-MAP',

  // ---------- restaurant: Aangan ----------
  'restaurant-02': ['tandoor oven', 'tandoor roti baking'],
  'restaurant-03': ['sarson ka saag', 'makki di roti saag'],
  'restaurant-04': ['paneer tikka', 'paneer tikka skewer'],
  'restaurant-05': ['ghevar', 'rabri sweet india'],
  'restaurant-06': 'SKIP-PORTRAIT',
  'restaurant-07': ['making roti hands', 'rolling chapati dough'],
  'restaurant-08': ['restaurant interior india', 'indian restaurant dining hall'],
  'restaurant-09': ['dal makhani', 'dal makhani bowl'],
  'restaurant-10': ['masala chai kulhad', 'chai clay cup india'],
  'restaurant-11': ['indian sweets shop counter', 'mithai shop display'],
  'restaurant-12': ['tandoor chef cooking', 'naan tandoor cook'],
  'restaurant-13': ['family eating restaurant', 'people dining together india'],
  'restaurant-14': ['restaurant table setting', 'set table four'],
  'restaurant-15': ['restaurant exterior india', 'dhaba front india'],

  // ---------- hotel: Shreenath Residency ----------
  'hotel-02': ['hotel room double bed', 'hotel bedroom india'],
  'hotel-03': ['hotel twin room', 'twin beds hotel'],
  'hotel-04': ['hotel family room', 'hotel room three beds'],
  'hotel-05': ['hotel suite sitting area', 'hotel suite room'],
  'hotel-06': ['hotel dining hall', 'hotel breakfast room'],
  'hotel-07': ['indian thali', 'thali meal served'],
  'hotel-08': 'SKIP-PORTRAIT',
  'hotel-09': ['hotel reception lobby', 'hotel lobby desk'],
  'hotel-10': ['hotel corridor', 'hotel hallway rooms'],
  'hotel-11': ['hotel bed linen', 'made bed hotel'],
  'hotel-12': ['hotel bathroom', 'bathroom clean tiles'],
  'hotel-13': ['hotel balcony view', 'balcony street view india'],
  'hotel-14': ['rooftop restaurant evening', 'rooftop seating india'],
  'hotel-15': ['hotel courtyard parking', 'guest house courtyard india'],
  'hotel-16': ['breakfast table laid', 'breakfast spread table'],
  'hotel-17': 'SKIP-MAP',

  // ---------- clinic: Sanjeevani ----------
  'clinic-02': ['hospital waiting room', 'clinic waiting area seating'],
  'clinic-03': ['doctor consultation room', 'medical examination room'],
  'clinic-04': ['blood sample collection', 'phlebotomy counter'],
  'clinic-05': 'SKIP-PORTRAIT',
  'clinic-06': ['medical laboratory analyser', 'pathology laboratory bench'],
  'clinic-07': ['x-ray room radiography', 'radiography equipment room'],
  'clinic-08': ['treatment room clinic', 'dressing room hospital'],
  'clinic-09': ['clinic entrance india', 'medical clinic signboard'],
  'clinic-10': 'SKIP-MAP',
  'clinic-11': ['pharmacy counter', 'medical store india'],

  // ---------- salon: Aarna Salon & Studio ----------
  'salon-02': ['hairdresser cutting hair', 'haircut salon scissors'],
  'salon-03': ['hair products shelf', 'salon product display'],
  'salon-04': ['hair salon interior mirror', 'salon reception mirrors'],
  'salon-05': 'SKIP-PORTRAIT',
  'salon-06': ['pedicure salon', 'pedicure station spa'],
  'salon-07': 'SKIP-PORTRAIT',
  'salon-08': 'SKIP-PORTRAIT',
  'salon-09': 'SKIP-PORTRAIT',
  'salon-10': 'SKIP-PORTRAIT',
  'salon-11': 'SKIP-BEFOREAFTER',
  'salon-12': 'SKIP-BEFOREAFTER',
  'salon-13': 'SKIP-BEFOREAFTER',
  'salon-14': 'SKIP-BEFOREAFTER',
  'salon-15': 'SKIP-BEFOREAFTER',
  'salon-16': 'SKIP-BEFOREAFTER',
  'salon-17': 'SKIP-BEFOREAFTER',
  'salon-18': 'SKIP-BEFOREAFTER',
  'salon-19': ['beauty salon shopfront', 'salon exterior shop'],
  'salon-20': ['shop street india signboard', 'shopfront street india'],

  // ---------- gym: Vajra Strength Co. ----------
  'gym-02': ['free weights gym', 'dumbbell rack gym'],
  'gym-03': ['treadmill gym', 'cardio machines gym'],
  'gym-04': 'SKIP-PORTRAIT',
  'gym-05': 'SKIP-PORTRAIT',
  'gym-06': 'SKIP-PORTRAIT',
  'gym-07': 'SKIP-PORTRAIT',
  'gym-08': ['gym entrance', 'fitness centre entrance'],
  'gym-09': ['gym reception desk', 'fitness reception'],
  'gym-10': ['locker room', 'changing room lockers'],
  'gym-11': ['aerobics studio', 'fitness class hall'],
  'gym-12': ['gym turf sled', 'functional training area gym'],

  // ---------- saas: Prabhat Academy (coaching institute) ----------
  'saas-02': ['person using smartphone', 'hand holding phone message'],
  'saas-03': ['teacher blackboard india', 'teacher explaining class'],
  'saas-04': ['registration desk', 'admission office desk'],
  'saas-05': 'SKIP-PORTRAIT',
  'saas-06': 'SKIP-PORTRAIT',
  'saas-07': 'SKIP-PORTRAIT',
  'saas-08': ['empty classroom desks', 'classroom seating india'],
  'saas-09': ['notice board school', 'bulletin board notices'],
  'saas-10': ['school building india', 'college building entrance india'],

  // ---------- dashboard: Shree Anand Sweets ----------
  'dashboard-02': 'SKIP-PORTRAIT',
  'dashboard-03': ['kaju katli', 'kaju barfi sweet'],
  'dashboard-04': ['besan laddu', 'laddu indian sweet'],
  'dashboard-05': ['namkeen indian snack', 'bhujia sev snack'],
  'dashboard-06': ['peda sweet', 'milk peda india'],
  'dashboard-07': ['kaju katli sweet tray', 'barfi sweets tray'],
  'dashboard-08': ['ghee jar', 'clarified butter ghee'],
  'dashboard-09': ['sweet box india', 'mithai box packaging'],
  'dashboard-10': ['cashew nuts sack', 'cashew nuts pile'],
};

/* Titles that are photographs of the thing, not pictures about the thing.
   Commons is full of maps, coats of arms, scans and 19th-century engravings,
   and every one of them would land in a slot that wants a photo. */
const BAD_TITLE = /(logo|map\b|diagram|chart|coat[ _]of[ _]arms|flag|icon|seal\b|poster|scan|drawing|sketch|engraving|painting|illustration|stamp|banknote|coin|graph|plaque|sign(ature)?\b|screenshot|\.svg)/i;

const api = async (params) => {
  const u = 'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({ format: 'json', origin: '*', ...params });
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`non-JSON (${r.status}): ${text.slice(0, 60)}`); }
};

const search = async (q) => {
  const j = await api({
    action: 'query', generator: 'search', gsrsearch: q,
    gsrnamespace: '6', gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '1400',
  });
  return Object.values(j.query?.pages || {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
};

/* A slot wants one usable landscape-ish photograph, big enough to render at
   2x in an 800px frame without looking soft. */
const usable = (p) => {
  const i = p.imageinfo?.[0];
  if (!i) return false;
  if (!/^image\/(jpeg|png|webp)$/.test(i.mime || '')) return false;
  if (BAD_TITLE.test(p.title)) return false;
  if ((i.width || 0) < 900) return false;
  const ar = i.width / i.height;
  return ar > 0.55 && ar < 2.6;
};

const slots = JSON.parse(readFileSync('photo-slots.json', 'utf8'));
const credits = existsSync('photos/CREDITS.json')
  ? JSON.parse(readFileSync('photos/CREDITS.json', 'utf8')) : {};

const only = process.argv[2];          // optional: one slug, e.g. "store"
const todo = slots.filter((s) => {
  if (/-0?1$/.test(s.id)) return false;              // heroes already have photos
  if (only && s.slug !== only) return false;
  if (existsSync(path.join(OUT, s.id + '.jpg'))) return false;   // resumable
  return true;
});

console.log(`${todo.length} slots to fetch\n`);
const skipped = [];
let got = 0, failed = 0;

for (const s of todo) {
  const q = Q[s.id];
  if (typeof q === 'string') { skipped.push(`${s.id}  ${q}`); continue; }
  if (!q) { skipped.push(`${s.id}  NO-QUERY`); continue; }

  let picked = null, usedQ = null;
  for (const term of q) {
    try {
      await sleep(1100);                              // Commons rate limit
      const hits = await search(term);
      const ok = hits.filter(usable);
      if (ok.length) { picked = ok[0]; usedQ = term; break; }
    } catch (e) { console.log(`  ! ${s.id} "${term}": ${e.message}`); await sleep(3000); }
  }

  if (!picked) { failed++; console.log(`MISS ${s.id.padEnd(14)} ${q[0]}`); continue; }

  const i = picked.imageinfo[0];
  const url = i.thumburl || i.url;
  try {
    await sleep(400);
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(path.join(OUT, s.id + '.jpg'), buf);
    credits[s.id] = {
      want: s.want,
      query: usedQ,
      title: picked.title,
      page: i.descriptionurl,
      licence: i.extmetadata?.LicenseShortName?.value || 'see page',
      artist: (i.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 80),
    };
    got++;
    console.log(`OK   ${s.id.padEnd(14)} ${(usedQ + '').padEnd(28)} ${picked.title.replace('File:', '').slice(0, 46)}`);
  } catch (e) {
    failed++;
    console.log(`DL   ${s.id.padEnd(14)} failed: ${e.message}`);
  }
}

writeFileSync('photos/CREDITS.json', JSON.stringify(credits, null, 2));
console.log(`\ndownloaded ${got}, missed ${failed}, skipped ${skipped.length}`);
if (skipped.length) console.log('\nskipped (handled by panels, not photos):\n  ' + skipped.join('\n  '));
