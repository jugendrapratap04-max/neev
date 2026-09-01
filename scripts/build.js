/* ===================================================================
   NEEV build — src/pages/*.html + src/partials/*.html  ->  ./*.html
   -------------------------------------------------------------------
   Everything is rendered here, on the machine, before the site ships.
   Turn JavaScript off in the browser and the whole site still reads —
   the client-side JS only adds filtering, the shortlist and the wizard.

     node scripts/build.js        (or: npm run build, which also builds CSS)
   =================================================================== */
const fs = require('fs');
const path = require('path');
const D = require('../src/data.js');

const ROOT = path.join(__dirname, '..');
const P = (...a) => path.join(ROOT, ...a);

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const wa = (text) => `${D.CONFIG.waBase}?text=${encodeURIComponent(text)}`;
const pkgById = (id) => D.PACKAGES.find((p) => p.id === id);
const catLabel = (id) => (D.CATS.find((c) => c.id === id) || { label: id }).label;

/* 'demo' opens a template that really loads and can be clicked through;
   'mine' is one of his own projects, shown as proof of range. The wording must
   never let one be mistaken for the other. */
const badgeFor = (d) => (d.badge === 'demo'
  ? '<span class="badge-live"><span class="h-2 w-2 rounded-full bg-success"></span>DEMO</span>'
  : '<span class="badge-design">MY PROJECT</span>');
const openLabel = (d) => (d.badge === 'demo' ? 'Open the demo' : 'Open the site');
const frameLabel = (d) => (d.badge === 'demo' ? 'demo · ' + d.name : d.url);

const icon = {
  check: '<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clip-rule="evenodd"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1s-.7 1-.9 1.2c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.3 5.3 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4l-.4-.4ZM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>',
  arrow: '<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0" aria-hidden="true"><path fill-rule="evenodd" d="M3 10a1 1 0 0 1 1-1h9.6l-3.3-3.3a1 1 0 1 1 1.4-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L13.6 11H4a1 1 0 0 1-1-1Z" clip-rule="evenodd"/></svg>',
  ext: '<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0" aria-hidden="true"><path d="M11 3a1 1 0 1 0 0 2h2.6l-6.3 6.3a1 1 0 1 0 1.4 1.4L15 6.4V9a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1h-5Z"/><path d="M5 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3a1 1 0 1 0-2 0v3H5V7h3a1 1 0 0 0 0-2H5Z"/></svg>',
  heart: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5 shrink-0" aria-hidden="true"><path d="M10 16.5s-6-3.9-6-7.9a3.4 3.4 0 0 1 6-2.2 3.4 3.4 0 0 1 6 2.2c0 4-6 7.9-6 7.9Z" stroke-linejoin="round"/></svg>',
  phone: '<svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5 shrink-0" aria-hidden="true"><path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h1A1.5 1.5 0 0 1 7 3.2l.5 2.3a1.5 1.5 0 0 1-.7 1.6l-.9.5a11 11 0 0 0 4.5 4.5l.5-.9a1.5 1.5 0 0 1 1.6-.7l2.3.5a1.5 1.5 0 0 1 1.2 1.5v1a2.5 2.5 0 0 1-2.5 2.5A13.5 13.5 0 0 1 2 5.5v-1Z"/></svg>',
};

/* ---------- section renderers ---------- */

function renderTrust() {
  return D.TRUST.map((t) => `
        <div class="flex items-start gap-3">
          <span class="mt-0.5 text-secondary">${icon.check}</span>
          <div>
            <p class="text-label-md font-semibold text-on-surface">${esc(t.title)}</p>
            <p class="mt-0.5 text-label-sm text-on-surface-variant">${esc(t.note)}</p>
          </div>
        </div>`).join('');
}

function renderCatChips(active = 'all') {
  return D.CATS.map((c) => `
          <button type="button" data-cat="${attr(c.id)}" aria-pressed="${c.id === active}"
                  class="cat-chip min-h-[44px] shrink-0 rounded-full border border-outline-variant/70 px-4 text-label-md font-medium transition-colors ${c.id === active ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'}">
            ${esc(c.label)}
          </button>`).join('');
}

function designCard(d) {
  const pkg = pkgById(d.pkg);
  const badge = badgeFor(d);
  /* The title link is stretched over the whole card with ::after, so the tap
     target is the card rather than one 29px line of text. The two controls at
     the bottom sit above it on z-10 so they still get their own taps. */
  return `
        <article class="design-card card hover-shadow relative flex flex-col overflow-hidden"
                 data-cat="${attr(d.cat)}" data-badge="${attr(d.badge)}"
                 data-name="${attr((d.name + ' ' + catLabel(d.cat)).toLowerCase())}"
                 data-price="${pkg.price}">
          <img src="${attr(d.img.desktop)}" alt="${attr(d.name)} — design preview" loading="lazy" decoding="async"
               width="1200" height="750" class="aspect-[16/10] w-full bg-surface-container object-cover object-top">
          <div class="flex flex-1 flex-col p-5">
            <div class="mb-2 flex items-center justify-between gap-2">
              ${badge}
              <span class="chip">${esc(catLabel(d.cat))}</span>
            </div>
            <h3 class="text-headline-md font-semibold leading-snug text-on-surface">
              <a href="design-${attr(d.id)}.html"
                 class="after:absolute after:inset-0 after:content-[''] hover:text-secondary">${esc(d.name)}</a>
            </h3>
            <p class="mt-2 flex-1 text-body-md text-on-surface-variant">${esc(d.blurb)}</p>
            <div class="mt-4 flex items-center justify-between gap-3 border-t border-outline-variant/50 pt-4">
              <div>
                <p class="text-label-sm uppercase text-on-surface-variant">${esc(pkg.name)} from</p>
                <p class="text-headline-md font-bold text-on-surface">${D.inr(pkg.price)}</p>
              </div>
              <div class="relative z-10 flex items-center gap-2">
                <button type="button" class="js-save btn btn-outline btn-sm !px-3" data-id="${attr(d.id)}"
                        aria-label="Save ${attr(d.name)} to shortlist" title="Save to shortlist">${icon.heart}</button>
                <a href="design-${attr(d.id)}.html" class="btn btn-primary btn-sm" aria-label="View ${attr(d.name)}">View</a>
              </div>
            </div>
          </div>
        </article>`;
}

const renderDesigns = (list) => list.map(designCard).join('');

function renderPackages() {
  return D.PACKAGES.map((p) => {
    const ring = p.popular ? 'ring-2 ring-secondary' : '';
    /* "Recommended" is my own advice, not a sales statistic. With no paying
       customers yet, "most popular" would be a lie. */
    const flag = p.popular
      ? `<span class="absolute -top-3 left-6 rounded-full bg-secondary px-3 py-1 text-label-sm font-semibold text-white">MY RECOMMENDATION</span>`
      : '';
    return `
        <div class="card relative flex flex-col p-6 md:p-7 ${ring}">
          ${flag}
          <h3 class="text-headline-md font-bold text-on-surface">${esc(p.name)}</h3>
          <p class="mt-1 text-body-md text-on-surface-variant">${esc(p.for)}</p>
          <div class="mt-5 flex items-end gap-2">
            <span class="text-display-lg-mobile font-bold leading-none text-on-surface">${D.inr(p.price)}</span>
            <span class="pb-1 text-label-md text-on-surface-variant">&middot; ${esc(p.days)}</span>
          </div>
          <p class="mt-2 text-label-md text-on-surface-variant">
            ${D.inr(D.half(p.price))} now &middot; ${D.inr(p.price - D.half(p.price))} when the site goes live
          </p>
          <ul class="mt-6 flex-1 space-y-3">
            ${p.features.map((f) => `<li class="flex items-start gap-2.5"><span class="mt-1 text-secondary">${icon.check}</span><span class="text-body-md text-on-surface-variant">${esc(f)}</span></li>`).join('')}
          </ul>
          <a class="btn ${p.popular ? 'btn-primary' : 'btn-outline'} mt-6 w-full" target="_blank" rel="noopener noreferrer"
             href="${attr(wa(`Hello Jugendra, I would like to talk about the ${p.name} package (${D.inr(p.price)}).`))}">
            ${icon.wa} Ask about ${esc(p.name)}
          </a>
        </div>`;
  }).join('');
}

function renderExtras() {
  return D.EXTRAS.map((e) => `
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-outline-variant/50 py-4 last:border-0">
            <span class="text-body-md font-medium text-on-surface">${esc(e.label)}</span>
            <span class="text-body-md font-semibold text-on-surface">${esc(e.value)}</span>
            ${e.note ? `<p class="w-full text-label-sm text-on-surface-variant">${esc(e.note)}</p>` : ''}
          </div>`).join('');
}

function renderProcess() {
  return D.PROCESS.map((s) => `
          <div class="relative">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-headline-md font-bold text-on-primary">${esc(s.n)}</span>
            <h3 class="mt-4 text-headline-md font-semibold text-on-surface">${esc(s.title)}</h3>
            <p class="mt-2 text-body-md text-on-surface-variant">${esc(s.body)}</p>
          </div>`).join('');
}

function renderFaq() {
  /* No accordion. A buyer comparing ₹1,999 against ₹6,999 should not have to
     hunt for "what do I get" — hiding it is how a sale gets talked away. */
  return D.FAQ.map((f) => `
          <div class="border-b border-outline-variant/50 py-6 last:border-0">
            <h3 class="text-headline-md font-semibold text-on-surface">${esc(f.q)}</h3>
            <p class="mt-2 max-w-3xl text-body-md text-on-surface-variant">${esc(f.a)}</p>
          </div>`).join('');
}

/* ---------- design detail page ---------- */
function renderDesignDetail(d) {
  const pkg = pkgById(d.pkg);
  const waText = `Hello Jugendra, I like this design: "${d.name}". My business is ______. Please tell me the price and how long it takes.`;
  const previews = `
            <div class="card overflow-hidden">
              <div class="flex items-center gap-1.5 border-b border-outline-variant/50 bg-surface-container px-4 py-3">
                <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
                <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
                <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
                <span class="ml-3 truncate text-label-sm text-on-surface-variant">${attr(frameLabel(d))}</span>
              </div>
              <img src="${attr(d.img.desktop)}" alt="${attr(d.name)} on a computer" width="1200" height="750"
                   class="w-full object-cover object-top" decoding="async">
            </div>
            ${d.img.mobile ? `
            <div class="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div class="w-[190px] shrink-0 rounded-[26px] border-[6px] border-primary bg-primary shadow-lg">
                <img src="${attr(d.img.mobile)}" alt="${attr(d.name)} on a phone" width="480" height="1039"
                     class="w-full rounded-[20px] object-cover object-top" loading="lazy" decoding="async">
              </div>
              <p class="text-body-md text-on-surface-variant">
                This is the same design on a phone. Most of your customers will arrive on this screen,
                which is why every site is built for the phone first and the computer second.
              </p>
            </div>` : ''}`;

  return `
        <div class="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>${previews}</div>
          <aside class="lg:sticky lg:top-28 lg:self-start">
            <div class="card p-6">
              <div class="flex items-center justify-between gap-2">
                ${badgeFor(d)}
                <span class="chip">${esc(catLabel(d.cat))}</span>
              </div>
              <h1 class="mt-4 text-headline-lg font-bold leading-tight text-on-surface">${esc(d.name)}</h1>
              <p class="mt-3 text-body-md text-on-surface-variant">${esc(d.blurb)}</p>
              <ul class="mt-5 space-y-2.5">
                ${d.bullets.map((b) => `<li class="flex items-start gap-2.5"><span class="mt-1 text-secondary">${icon.check}</span><span class="text-body-md text-on-surface-variant">${esc(b)}</span></li>`).join('')}
              </ul>
              <div class="mt-6 rounded-lg bg-surface-container p-4">
                <p class="text-label-sm uppercase text-on-surface-variant">${esc(pkg.name)} package</p>
                <p class="mt-1 text-display-lg-mobile font-bold leading-none text-on-surface">${D.inr(pkg.price)}</p>
                <p class="mt-2 text-label-md text-on-surface-variant">${D.inr(D.half(pkg.price))} now &middot; ${D.inr(pkg.price - D.half(pkg.price))} when it goes live &middot; ${esc(pkg.days)}</p>
              </div>
              <a class="btn btn-wa mt-5 w-full" target="_blank" rel="noopener noreferrer" href="${attr(wa(waText))}">
                ${icon.wa} I want this design
              </a>
              <a class="btn btn-outline mt-3 w-full" target="_blank" rel="noopener noreferrer" href="${attr(d.url)}">${icon.ext} ${esc(openLabel(d))}</a>
              <a class="btn btn-ghost mt-1 w-full" href="brief.html?design=${attr(d.id)}">${icon.arrow} Send me your details</a>
              <p class="mt-4 text-body-md text-on-surface-variant">${esc(d.note)}</p>
            </div>
          </aside>
        </div>`;
}

/* ---------- template engine (partials + slots) ---------- */
function applyPartials(html, partials) {
  return html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    return partials[name];
  });
}
function applySlots(html, slots) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    if (!(key in slots)) throw new Error(`Unknown slot: {{ ${key} }}`);
    return slots[key];
  });
}

/* ---------- build ---------- */
const partialsDir = P('src', 'partials');
const partials = {};
for (const f of fs.readdirSync(partialsDir)) {
  if (f.endsWith('.html')) partials[f.replace(/\.html$/, '')] = fs.readFileSync(path.join(partialsDir, f), 'utf8');
}

const demoOnes = D.DESIGNS.filter((d) => d.badge === 'demo');

/* The homepage hero frame follows CONFIG.heroDesign, so swapping which template
   fronts the whole site is a one-line edit in src/data.js. */
const hero = D.DESIGNS.find((d) => d.id === D.CONFIG.heroDesign) || D.DESIGNS[0];

function renderHeroFrame() {
  return `
        <div class="card overflow-hidden">
          <div class="flex items-center gap-1.5 border-b border-outline-variant/50 bg-surface-container px-4 py-3">
            <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
            <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
            <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
            <span class="ml-3 truncate text-label-sm text-on-surface-variant">${attr(frameLabel(hero))}</span>
          </div>
          <img src="${attr(hero.img.desktop)}" width="1200" height="750"
               alt="${attr(hero.name)} template, shown on a computer"
               fetchpriority="high" decoding="async" class="w-full object-cover object-top">
        </div>

        <div class="absolute -bottom-8 -left-2 hidden w-[128px] rounded-[20px] border-[5px] border-primary bg-primary shadow-lg sm:block">
          <img src="${attr(hero.img.mobile)}" width="480" height="1039"
               alt="The same template on a phone" loading="lazy" decoding="async"
               class="w-full rounded-[15px] object-cover object-top">
        </div>

        <p class="mt-6 text-label-md text-on-surface-variant sm:pl-[140px]">
          A ready template &mdash;
          <a class="link" href="${attr(hero.url)}" target="_blank" rel="noopener noreferrer">open it and click around</a>.
        </p>`;
}

const commonSlots = {
  brand: D.CONFIG.brand,
  brandFull: D.CONFIG.brandFull,
  owner: D.CONFIG.owner,
  city: D.CONFIG.city,
  phone: D.CONFIG.phone,
  phoneDisplay: D.CONFIG.phoneDisplay,
  siteUrl: D.CONFIG.siteUrl,
  year: '2026',
  waIcon: icon.wa,
  arrowIcon: icon.arrow,
  phoneIcon: icon.phone,
  waHero: attr(wa('Hello Jugendra, I would like a website for my business. My business is ______.')),
  waNav: attr(wa('Hello Jugendra, I would like to talk about a website.')),
  waDemo: attr(wa('Hello Jugendra, I would like a free demo. My business is ______, in ______.')),
  trustStrip: renderTrust(),
  catChips: renderCatChips(),
  heroFrame: renderHeroFrame(),
  liveDesigns: renderDesigns(demoOnes),
  allDesigns: renderDesigns(D.DESIGNS),
  liveCount: String(demoOnes.length),
  designCount: String(D.DESIGNS.length),
  packages: renderPackages(),
  extras: renderExtras(),
  process: renderProcess(),
  faq: renderFaq(),
  starterPrice: D.inr(D.PACKAGES[0].price),
  briefPackages: D.PACKAGES.map((p) => `
                <label class="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/70 p-4 hover:bg-surface-container">
                  <input type="radio" name="pkg" value="${attr(p.name + ' (' + D.inr(p.price) + ')')}" class="mt-0.5 h-5 w-5 shrink-0 border-outline text-secondary focus:ring-secondary">
                  <span><span class="block text-body-md font-semibold text-on-surface">${esc(p.name)} — ${D.inr(p.price)}</span>
                  <span class="block text-label-md text-on-surface-variant">${esc(p.for)}</span></span>
                </label>`).join('') + `
                <label class="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/70 p-4 hover:bg-surface-container">
                  <input type="radio" name="pkg" value="Not sure — please advise" class="mt-0.5 h-5 w-5 shrink-0 border-outline text-secondary focus:ring-secondary">
                  <span><span class="block text-body-md font-semibold text-on-surface">I don&rsquo;t know</span>
                  <span class="block text-label-md text-on-surface-variant">Have a look and tell me what suits</span></span>
                </label>`,
  briefDesignOptions: D.DESIGNS.map((d) =>
    `<option value="${attr(d.name)}" data-id="${attr(d.id)}">${esc(d.name)}${d.badge === 'live' ? ' (live)' : ''}</option>`).join(''),
};

const pagesDir = P('src', 'pages');
const built = [];

for (const f of fs.readdirSync(pagesDir)) {
  if (!f.endsWith('.html') || f.startsWith('_')) continue;
  const raw = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  fs.writeFileSync(P(f), applySlots(applyPartials(raw, partials), commonSlots));
  built.push(f);
}

/* one static page per design — no query strings, indexable */
const detailTpl = fs.readFileSync(P('src', 'pages', '_design.html'), 'utf8');
for (const d of D.DESIGNS) {
  const sameCat = D.DESIGNS.filter((x) => x.id !== d.id && x.cat === d.cat).slice(0, 3);
  const more = sameCat.length ? sameCat : D.DESIGNS.filter((x) => x.id !== d.id).slice(0, 3);
  const out = applySlots(applyPartials(detailTpl, partials), {
    ...commonSlots,
    pageTitle: attr(`${d.name} — ${D.CONFIG.brand}`),
    pageDesc: attr(d.blurb.slice(0, 155)),
    designName: esc(d.name),
    designDetail: renderDesignDetail(d),
    moreDesigns: renderDesigns(more),
  });
  const name = `design-${d.id}.html`;
  fs.writeFileSync(P(name), out);
  built.push(name);
}

/* sitemap + robots */
const noIndex = new Set(['404.html', 'thanks.html', 'shortlist.html', 'brief.html']);
const urls = built
  .filter((f) => !noIndex.has(f))
  .map((f) => `  <url><loc>${D.CONFIG.siteUrl}/${f === 'index.html' ? '' : f}</loc></url>`)
  .join('\n');
fs.writeFileSync(P('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
fs.writeFileSync(P('robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${D.CONFIG.siteUrl}/sitemap.xml\n`);

/* client-side copy of the data — same file, one source of truth */
fs.writeFileSync(
  P('assets', 'js', 'data.js'),
  '/* AUTO-GENERATED from src/data.js by scripts/build.js — do not edit. */\n' +
    fs.readFileSync(P('src', 'data.js'), 'utf8')
);

console.log(`built ${built.length} pages\n+ sitemap.xml, robots.txt, assets/js/data.js`);
