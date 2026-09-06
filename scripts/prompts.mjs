/* Writes PROMPTS.md — one ready-to-paste ChatGPT prompt per empty photo slot.

   Three things this exists to get right, all of them learned the hard way:

   1. SHAPE. Slots are measured (photo-shapes.json), not guessed. A 3:2 image
      dropped into a 2:3 product frame is cropped to its middle third.
   2. SET CONSISTENCY. Every prompt in a template carries the same ANCHOR line.
      On madhav-guest-house a set of individually fine photos looked cheap
      purely because they disagreed with each other on light and colour.
   3. NO TEXT, NO FACES. Generated lettering is always wrong, and a generated
      face under a named staff member is a person who does not exist. Portrait
      and before/after slots are excluded here on purpose — panels.mjs covers
      them.

   node scripts/prompts.mjs           all templates
   node scripts/prompts.mjs store     one template */
import { readFileSync, writeFileSync } from 'node:fs';

const slots = JSON.parse(readFileSync('photo-slots.json', 'utf8'));
const shapes = new Map(JSON.parse(readFileSync('photo-shapes.json', 'utf8')).map((s) => [s.id, s]));

/* Same shop, same day, same camera — repeated in every prompt of a template. */
const ANCHOR = {
  store: 'A small brass and copper utensil shop in Moradabad, north India. Warm tungsten shop light, cream and brown tones, shallow depth of field, shot on a 50mm lens.',
  restaurant: 'A mid-range north Indian family restaurant in the evening. Warm lamp light, dark wood and brass, appetising but not glossy, shot on a 50mm lens.',
  hotel: 'A clean, simple mid-range Indian guest house. Daylight through windows, white linen, warm neutral walls, shot on a 35mm lens.',
  clinic: 'A small, clean, modern Indian neighbourhood clinic. Bright even daylight, white and soft teal surfaces, uncluttered, shot on a 35mm lens.',
  salon: 'A modern unisex salon in a small Indian city. Bright warm light, wood and cream fittings, plants, shot on a 35mm lens.',
  gym: 'A serious Indian strength gym. Dark walls, rubber flooring, hard directional light with strong shadows, shot on a 35mm lens.',
  saas: 'A private coaching institute in a small Indian city. Daylight from big windows, plain painted walls, simple wooden furniture, shot on a 35mm lens.',
  dashboard: 'A traditional Indian mithai shop. Warm light, steel and glass display trays, cream and gold tones, shot on a 50mm lens.',
};

/* Per-slot subject. Written as a photographer's brief, not copied from the slot
   label, because the labels are shorthand ("cardio deck by the window"). */
const SUBJECT = {
  'store-02': 'A single polished brass thali plate resting on a wooden counter, close up, catching the light',
  'store-03': 'A cloth polishing the rim of a brass pot on a workbench, close up on the metal, worker out of frame',
  'store-04': 'A complete brass dinner set — thali, katoris, spoon, glass — arranged on a dark wooden surface',
  'store-05': 'A decorated brass pooja thali with small oil lamps and marigold petals, seen from above',
  'store-06': 'A row of tall copper water bottles standing together on a shop shelf',
  'store-07': 'A shelf of small brass deity idols in a shop, arranged in rows',
  'store-08': 'A finished gift box tied with ribbon, a brass item just visible inside, on a counter',
  'store-09': 'A large bulk order of brass thalis stacked and wrapped for a wedding, on a shop floor',
  'store-10': 'A brass thali set photographed from directly above on a plain cream background',
  'store-11': 'One tall copper water bottle standing upright, plain cream background, product shot',
  'store-12': 'A wide shallow brass urli bowl filled with water and floating marigold flowers, plain background',
  'store-13': 'A copper jug with a matching copper glass beside it, plain cream background, product shot',
  'store-14': 'Six small brass diya oil lamps arranged together and lit, plain dark background',
  'store-15': 'A set of four small kansa bronze katori bowls stacked and fanned, plain cream background',
  'store-16': 'A round brass pooja thali with a small bell, incense holder and lamp on it, plain background',
  'store-17': 'A copper handi cooking pot with its lid slightly off, plain cream background, product shot',
  'store-18': 'A flat brass Ganesha wall panel hanging on a plain painted wall',
  'store-19': 'A three-tier stainless steel and brass tiffin lunch box, closed, plain cream background',
  'store-20': 'A brass temple bell hanging from a hook against a plain background',
  'store-21': 'An open gift hamper box with brass and copper items nested in tissue paper',
  'store-22': 'A brass thali set styled on a woven mat with a folded cloth napkin, seen at an angle',
  'store-23': 'A copper bottle standing on a windowsill with soft daylight behind it',
  'store-24': 'A brass urli placed on the floor with lit diyas around it, evening light',
  'store-25': 'A close up of two brass diya lamps, flames lit, dark background',
  'store-26': 'The inside of a small brass workshop — workbenches, hand tools, unfinished vessels, no people',
  'store-27': 'Hands hammering a design into a brass plate on an anvil, close crop on the metal and the hammer',

  'restaurant-02': 'A tandoor oven mouth glowing orange with a roti stuck to the clay wall, close up',
  'restaurant-03': 'Sarson ka saag in a brass bowl with a stack of makki roti and a knob of butter, top down',
  'restaurant-04': 'Paneer tikka cubes on skewers with char marks, mint chutney and onion rings beside',
  'restaurant-05': 'A slice of ghevar topped with rabri and silver leaf on a small plate',
  'restaurant-07': 'Hands rolling out a roti on a floured board beside a tandoor, close crop on the dough',
  'restaurant-08': 'A north Indian restaurant dining hall in the evening with lamps lit and tables laid, wide, no people',
  'restaurant-09': 'Dal makhani in a small copper handi with a swirl of cream, close up',
  'restaurant-10': 'Masala chai being poured into clay kulhad cups, steam rising, close up',
  'restaurant-11': 'A glass sweet counter tray filled with rows of Indian mithai, close up',
  'restaurant-12': 'A cook reaching into a tandoor with long tongs, seen from behind, face not visible',
  'restaurant-13': 'A family of four eating together at a corner restaurant table, seen from a distance, faces not readable',
  'restaurant-14': 'A corner restaurant table set for four in the evening, water glasses and napkins, no people',
  'restaurant-15': 'The front of a north Indian restaurant from the street in daytime, blank signboard, no lettering',

  'hotel-02': 'A clean deluxe double hotel room seen from the doorway, bed made with white linen, daylight',
  'hotel-03': 'A hotel room with two single beds and a window between them, daylight',
  'hotel-04': 'A family hotel room with a double bed and an extra single bed, wide view, daylight',
  'hotel-05': 'A hotel suite with a small sitting area, two chairs and a balcony door, daylight',
  'hotel-06': 'A simple hotel dining hall with tables laid for breakfast, morning light, no people',
  'hotel-07': 'A north Indian thali being set down on a table, seen close up from above',
  'hotel-09': 'A small hotel reception desk and lobby seating, warm daylight, no people',
  'hotel-10': 'A hotel corridor with room doors on both sides receding into the distance',
  'hotel-11': 'A close view of a made hotel bed — folded towel, white pillows, side lamp',
  'hotel-12': 'A small clean tiled hotel bathroom, well lit, mirror and basin',
  'hotel-13': 'The view from a hotel balcony looking down onto an Indian street, daytime',
  'hotel-14': 'Rooftop seating with plastic chairs and string lights in the evening, Indian town skyline behind',
  'hotel-15': 'A hotel courtyard with a parked scooter and a car, seen from the gate, daylight',
  'hotel-16': 'A breakfast table laid with paratha, curd, pickle and tea, seen from above',

  'clinic-02': 'A clinic waiting area with a row of empty chairs against a light wall, bright daylight',
  'clinic-03': 'A doctor consultation room — desk, chair, examination couch behind a curtain, no people',
  'clinic-04': 'A sample collection counter with tube racks and a small chair, clean and bright',
  'clinic-06': 'A pathology laboratory bench with an analyser machine and sample racks, no people',
  'clinic-07': 'A digital x-ray room with the machine and table, clean and empty',
  'clinic-08': 'A small dressing and injection room with a couch, trolley and supplies, no people',
  'clinic-09': 'The entrance of a small clinic seen from the road, glass door, blank signboard, no lettering',
  'clinic-11': 'A pharmacy and billing counter with medicine shelves behind it, no people',

  'salon-02': 'Close view of a haircut in progress — scissors and a comb in hair, face out of frame',
  'salon-03': 'A shelf of hair and skin product bottles in a salon, neatly arranged, close up',
  'salon-04': 'A salon mirror wall with styling chairs and a reception counter, bright, no people',
  'salon-06': 'A pedicure station with two chairs and foot basins, plants beside, no people',
  'salon-19': 'The front of a small salon seen from the road in daylight, glass door, blank signboard, no lettering',
  'salon-20': 'A small Indian shopping street with a salon among the shops, daytime, no readable signage',

  'gym-02': 'A free weights area with dumbbell racks and a bench, dark walls, hard light, no people',
  'gym-03': 'A row of treadmills and cross trainers facing a window, daylight coming in, no people',
  'gym-08': 'The entrance of a gym from the street at dusk, glass door lit from inside, blank signboard',
  'gym-09': 'A gym reception desk with a counter and stools, dark interior, no people',
  'gym-10': 'A changing room with a bench and a row of metal lockers, clean, no people',
  'gym-11': 'An empty group class hall with a wooden sprung floor and mirrors, no people',
  'gym-12': 'A strip of artificial turf inside a gym with a weighted sled on it, no people',

  'saas-02': 'A close crop of a hand holding a phone showing a plain messaging screen, no readable text',
  'saas-03': 'A teacher writing on a whiteboard mid-explanation, seen from behind, face not visible',
  'saas-04': 'An admission desk with an open register, a pen and a small stack of forms, no people',
  'saas-08': 'An empty classroom with rows of wooden desks and benches, daylight from windows',
  'saas-09': 'A cork notice board with plain sheets of paper pinned to it, no readable text',
  'saas-10': 'A small institute building entrance seen from the road, daytime, blank signboard, no lettering',

  'dashboard-03': 'A tray of diamond-cut kaju katli with silver leaf, seen from above',
  'dashboard-04': 'A close up of besan laddoo piled in a steel tray',
  'dashboard-05': 'An open packet of mixed namkeen snacks spilling onto a plain surface',
  'dashboard-06': 'A box of milk peda seen from directly above, neat rows',
  'dashboard-07': 'A large steel tray of kaju katli in a shop display case, at an angle',
  'dashboard-08': 'A tin of desi ghee on a shop shelf, warm light',
  'dashboard-09': 'A sweet shop gift box, open, with mithai arranged inside in paper cups',
  'dashboard-10': 'An open jute sack of whole cashew nuts in a store room, close up',
};

const RULES = 'No text, no lettering, no signage, no logos, no watermark anywhere in the image. No visible faces. Photorealistic photograph, not an illustration or a 3D render.';

const only = process.argv[2];
const bySlug = new Map();
for (const s of slots) {
  if (!SUBJECT[s.id]) continue;                 // heroes, portraits, before/after, maps
  if (only && s.slug !== only) continue;
  if (!bySlug.has(s.slug)) bySlug.set(s.slug, []);
  bySlug.get(s.slug).push(s);
}

let md = `# ChatGPT image prompts — NEEV templates

Generated by \`node scripts/prompts.mjs\`. **Do one template at a time.**

## How to use

1. Pick a template below and open ChatGPT.
2. Paste prompt 1, save the image. Then prompt 2, save. **Keep the order** —
   the collector matches downloads by the order they were saved, not by name.
3. When that template's list is finished, come back and run:

   \`\`\`
   cd F:\\projects\\neev
   node scripts/collect-slots.mjs <template>
   node scripts/photos.mjs
   \`\`\`

4. Downloads go to your normal Chrome folder. Nothing needs renaming.

Slots not listed here are handled without photos: named staff portraits, the
salon before/after pairs, and the three map slots.

`;

let total = 0;
for (const [slug, list] of bySlug) {
  md += `\n---\n\n## ${slug} — ${list.length} images\n\n`;
  list.forEach((s, i) => {
    const sh = shapes.get(s.id);
    md += `### ${i + 1}. \`${s.id}\` — ${sh?.ask || '1:1 square'}\n\n`;
    md += '```\n' + `${SUBJECT[s.id]}. ${ANCHOR[slug]} ${RULES} Aspect ratio ${sh?.ask || '1:1 square'}.` + '\n```\n\n';
    total++;
  });
}

md += `\n---\n\n**Total: ${total} images.**\n`;
writeFileSync('PROMPTS.md', md);
console.log(`wrote PROMPTS.md — ${total} prompts across ${bySlug.size} templates`);
for (const [slug, list] of bySlug) console.log(`  ${slug.padEnd(12)} ${list.length}`);
