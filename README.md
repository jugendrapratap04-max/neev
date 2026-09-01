# NEEV — neev web studio

The shop-front for selling websites to small businesses. Static HTML, no backend,
no database. Every lead arrives as a pre-written WhatsApp message.

Live sites shown in the catalogue: mithai-wala-nuh, madhav-guest-house,
mithaas-sable, jugendra-pratap — all real, all clickable.

---

## Change something

**All the text and every price lives in one file: `src/data.js`.**
Edit it, then rebuild:

```bash
npm run build
```

That regenerates every `.html` file in the project root and rebuilds the CSS.
Nothing else needs touching. In particular:

| To change | Edit |
| --- | --- |
| A price, a package, what is included | `PACKAGES` in `src/data.js` |
| Domain / hosting / extra-page costs | `EXTRAS` |
| A catalogue entry, its blurb or bullets | `DESIGNS` |
| The four process steps | `PROCESS` |
| A question and answer | `FAQ` |
| Phone number, city, brand name | `CONFIG` |

The half-payment line (`₹2,000 now · ₹1,999 when the site goes live`) is
**computed** from the price. Change the price and it follows automatically —
it can never drift out of sync.

Page layout and headings live in `src/pages/*.html`; the header, footer and
sticky WhatsApp bar live in `src/partials/*.html`.

---

## See it

```bash
npm run serve
```

Then open <http://localhost:4322>.

---

## Check it before shipping

```bash
npm run check
```

That builds, then runs all three checks:

| Command | What it measures | Expected |
| --- | --- | --- |
| `npm run audit` | tap targets, text sizes, alt text, form labels, duplicate ids and overflow, at 360px and 1280px | `clean: no violations` |
| `npm run test` | a real browser driven through the filter, the shortlist and the whole brief wizard | `46 passed, 0 failed` |
| `npm run images` | every `<img>` on every page actually decodes | `all 33 images decode` |

A green `npm run build` on its own proves nothing — Tailwind silently ignores
class names that do not exist, so the checks above are the real gate.

One thing that looks like a bug and is not: a full-page screenshot lazy-loads,
so cards below the fold come out blank in the image. `npm run images` is what
actually settles whether a picture is broken.

---

## The templates

`templates/<slug>/index.html` — one self-contained file each. No build step, no
framework, no external images. Open one straight in a browser.

Rules every template follows, enforced by `node scripts/check-template.mjs <slug>`:

- **One file.** All CSS inline. Google Fonts is the only outside request.
- **No external images at all.** Every photo slot is
  `<div class="ph" data-ph="what goes here">` — a tasteful placeholder that reads
  as "a photo belongs here", never as a broken image. **Drop your photos into
  those slots** and the design is done.
- Works at 360px and 1280px with no sideways scrolling; 44px tap targets;
  a real WhatsApp link and a real `tel:` link; exactly one `<h1>`.

### Putting real photos in

Every slot has a stable id — `store-01`, `clinic-05` and so on — listed in
`photo-slots.json` with what belongs in it. `node scripts/measure-heroes.mjs`
prints the shape each hero slot renders at, so an image can be asked for in the
right aspect ratio instead of being cropped to its middle third.

Drop images into `photos/<template>/` in the order you saved them — **the file
names do not matter**, they are matched to slots oldest-first. An exact name
(`photos/store-01.png`) always wins, for fixing a single slot. Then:

```bash
npm run photos            # convert to WebP, place, hide the empty-slot styling
npm run shots:templates   # re-photograph the catalogue thumbnails
npm run build
```

It is reversible: delete the image and re-run, and the slot goes back to being
a placeholder.

**You do not need all 124.** The placeholders read as "your photo goes here",
which on a template you are *selling* is a better message than a stock photo of
somebody else's shop — the client's own photos go in at delivery. What actually
needs a real picture is the eight hero slots, because those are the catalogue
thumbnails that do the selling.

### The demo ribbon

`node scripts/demo-ribbon.mjs` stamps the black DEMO strip on top of every
template. That strip matters: each demo invents a business name and prints a
real phone number, so it has to say plainly that it is a sample and not a real
shop. It also links back here, which is the only route home from a shared demo
link. It is idempotent — run it after any template edit.

To add a template: create `templates/<slug>/index.html`, add an entry to
`DESIGNS` in `src/data.js`, then `npm run shots:templates && npm run build`.

## Screenshots

```bash
npm run shots
```

This re-photographs the live sites at desktop and phone size and converts
everything to WebP. It needs Chrome and an internet connection. Raw `.png` files
are gitignored; only the `.webp` files ship.

**Why every preview is a screenshot of something real.** The catalogue first
used the template's own stock renders. They turned out to be photographs of
monitors on desks, with other companies' brand names and dollar prices baked
into the pixels — NovaCommerce, SaaSMax, FinDash Pro, Taskly — next to invented
social proof ("Trusted by 2,000+ creators", star ratings). No script can edit
text that is part of a raster image, so those entries were removed rather than
patched. `scripts/scrub.js` still exists for template pages that do have a DOM,
but the rule is now simpler: **if a preview is not a picture of something that
really runs, it does not ship.**

---

## Deploy

Use **Cloudflare Pages**, not Vercel. Vercel's free Hobby tier forbids
commercial use, and this site sells a service.

1. Push the repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build command: `npm run build`. Output directory: `/` (the project root).
4. After the first deploy, set the real URL in `CONFIG.siteUrl` in
   `src/data.js` and rebuild, so `sitemap.xml` and the meta tags point at the
   right domain.

`_headers` already sets a one-year cache on `/assets/*` and basic security
headers.

---

## Rules that keep this site honest

These are not style preferences. They are what makes a suspicious shopkeeper
believe the page.

1. **Never invent a number.** No customer counts, no ratings, no "500+ projects",
   no years of experience. There is no paying client yet, and the site says so
   out loud — on the homepage, in the FAQ and in the footer. That admission is
   the strongest thing on the page, not a weakness.
2. **`badge: 'live'` means the link opens a real running site.** `badge: 'design'`
   means a design that has not been built for anyone yet. Never relabel one as
   the other.
3. **Prices come from Jugendra.** Do not adjust them to look better.
4. **Nothing is promised that a static site cannot do.** No accounts, no online
   payment, no live chat, no guaranteed Google ranking.
5. **The sticky WhatsApp bar stays at least 56px.** It is the trust device on a
   phone; shrinking it costs leads.
