/* ===================================================================
   NEEV — SINGLE SOURCE OF TRUTH
   Every price, every line and every design on the site comes from this
   file. To change any text on the site, edit here and run: npm run build
   -------------------------------------------------------------------
   RULE: no invented numbers here. No fake customer counts, no fake
   ratings, no "500+ projects delivered". Only what is actually true —
   that is what sells when you are new.
   =================================================================== */

const CONFIG = {
  brand: 'NEEV',
  brandFull: 'neev web studio',
  owner: 'Jugendra Pratap',
  tagline: 'Websites for small businesses.',
  /* Already public on his existing site, so safe to print here. */
  phone: '918439305810',
  phoneDisplay: '+91 84393 05810',
  city: 'Mathura, UP',
  siteUrl: 'https://neev-5h1.pages.dev',
  waBase: 'https://wa.me/918439305810',
  /* Which template fills the browser frame in the homepage hero. */
  heroDesign: 'restaurant',
};

/* Package ladder. Derived from the 2,999 / 5,999 / 9,999 list Jugendra
   locked earlier, lowered because he has no paying client yet — a new seller
   prices to get the first yes, then raises. The half-payment is COMPUTED
   below, never typed, so it can never drift away from the price. */
const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    price: 1999,
    days: '3 days',
    for: 'One shop, one page, one phone number.',
    features: [
      'One-page website',
      'Perfect on phones — tested on a real phone',
      'Large WhatsApp and call buttons',
      'Your location on Google Maps',
      'Up to 8 photos',
      'Free hosting — no monthly fee',
    ],
    popular: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 3999,
    days: '5 days',
    for: 'Menu, price list, gallery — your whole shop online.',
    features: [
      '4-5 pages',
      'Menu or price list, up to 25 items',
      'Photo gallery',
      'Enquiry form that lands in your WhatsApp',
      'Basic setup so Google can find you',
      'Everything in Starter',
    ],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 6999,
    days: '7 days',
    for: 'Full catalogue, your own domain name, a month of changes.',
    features: [
      '8+ pages',
      'Unlimited products or menu items',
      'Your own domain (yourshop.in) set up',
      'Google Business profile prepared for you',
      'One month of free changes',
      'Everything in Business',
    ],
    popular: false,
  },
];

/* Optional and yearly costs, listed separately so nothing feels hidden. */
const EXTRAS = [
  {
    label: 'Hosting',
    value: 'Free, always',
    note: 'The site is small and static, so it runs on a free plan.',
  },
  {
    label: 'Your own domain',
    value: '₹700-1,000 / year',
    note: 'This goes to the domain company, not to me. You can buy it yourself if you prefer.',
  },
  {
    label: 'Extra page',
    value: '₹399 each',
    note: null,
  },
  {
    label: 'Yearly upkeep',
    value: '₹999 / year',
    note: 'Change the number, photos or prices as often as you like.',
  },
];

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'store', label: 'Online Stores' },
  { id: 'food', label: 'Food & Stay' },
  { id: 'services', label: 'Clinics, Salons & Gyms' },
  { id: 'business', label: 'Business & Apps' },
  { id: 'personal', label: 'Portfolio' },
];

/* badge 'demo' = a ready template. The link opens the real page and you can
     click around it — it lives at templates/<id>/index.html on this very site.
   badge 'mine' = something I built for myself, shown as proof of range.
   Every preview image is a photograph of a page that really loads. If a picture
   is not of something that runs, it does not go in this file. */
const DESIGNS = [
  {
    id: 'store', badge: 'demo', cat: 'store', pkg: 'premium',
    name: "Online store",
    url: 'templates/store/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "A product grid with rupee prices, categories and a per-product order button. Orders arrive on your WhatsApp, so there is no payment gateway and no monthly charge.",
    bullets: [
      "Unlimited products with prices",
      "Category filter and bestsellers row",
      "Order button on every product",
      "UPI and cash on delivery explained",
    ],
    img: { desktop: 'assets/img/templates/store-desktop.webp', mobile: 'assets/img/templates/store-mobile.webp' },
  },
  {
    id: 'restaurant', badge: 'demo', cat: 'food', pkg: 'business',
    name: "Restaurant or cafe",
    url: 'templates/restaurant/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "The full menu, priced and grouped by course, built to be read on a phone at the table. Plus specials, a gallery and a table-booking button.",
    bullets: [
      "Today's specials on top",
      "Full menu with rupee prices",
      "Photo gallery",
      "Book a table on WhatsApp",
    ],
    img: { desktop: 'assets/img/templates/restaurant-desktop.webp', mobile: 'assets/img/templates/restaurant-mobile.webp' },
  },
  {
    id: 'hotel', badge: 'demo', cat: 'food', pkg: 'business',
    name: "Hotel or guest house",
    url: 'templates/hotel/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "Room cards with per-night rates and what each room includes, a booking bar, amenities and directions by landmark. The phone number never leaves the screen.",
    bullets: [
      "Booking bar that opens WhatsApp",
      "Room cards with nightly rates",
      "Amenities and guest information",
      "Directions by landmark",
    ],
    img: { desktop: 'assets/img/templates/hotel-desktop.webp', mobile: 'assets/img/templates/hotel-mobile.webp' },
  },
  {
    id: 'clinic', badge: 'demo', cat: 'services', pkg: 'business',
    name: "Clinic or doctor",
    url: 'templates/clinic/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "Services, consultation timings day by day, the doctor profile and one clear appointment button. Calm and plain, because that is what a patient wants.",
    bullets: [
      "Appointment button at the top",
      "Timings table by day",
      "Doctor profile and qualifications",
      "What to bring and fees",
    ],
    img: { desktop: 'assets/img/templates/clinic-desktop.webp', mobile: 'assets/img/templates/clinic-mobile.webp' },
  },
  {
    id: 'salon', badge: 'demo', cat: 'services', pkg: 'business',
    name: "Salon or spa",
    url: 'templates/salon/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "A services price list grouped by category with durations, a stylists strip, a gallery and booking on WhatsApp.",
    bullets: [
      "Price list with durations",
      "Stylists and specialities",
      "Gallery",
      "Booking on WhatsApp",
    ],
    img: { desktop: 'assets/img/templates/salon-desktop.webp', mobile: 'assets/img/templates/salon-mobile.webp' },
  },
  {
    id: 'gym', badge: 'demo', cat: 'services', pkg: 'business',
    name: "Gym or fitness studio",
    url: 'templates/gym/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "The weekly class timetable, membership plans priced monthly to yearly, trainers and facilities — with a free-trial button that opens WhatsApp.",
    bullets: [
      "Weekly class timetable",
      "Membership plans with prices",
      "Trainers and facilities",
      "Free trial on WhatsApp",
    ],
    img: { desktop: 'assets/img/templates/gym-desktop.webp', mobile: 'assets/img/templates/gym-mobile.webp' },
  },
  {
    id: 'saas', badge: 'demo', cat: 'business', pkg: 'business',
    name: "Startup or service landing page",
    url: 'templates/saas/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "One long page that makes a single promise and ends in a sign-up. Suits a coaching centre, an agency or a small software product.",
    bullets: [
      "Hero with one clear promise",
      "Features and how it works",
      "Three pricing tiers",
      "FAQ and closing call to action",
    ],
    img: { desktop: 'assets/img/templates/saas-desktop.webp', mobile: 'assets/img/templates/saas-mobile.webp' },
  },
  {
    id: 'dashboard', badge: 'demo', cat: 'business', pkg: 'premium',
    name: "Admin dashboard",
    url: 'templates/dashboard/index.html',
    note: "A ready template. It gets your name, your photos and your prices — the layout stays.",
    blurb: "One screen showing your own numbers: stat tiles, a revenue chart, recent orders and low stock. On a phone the table becomes cards.",
    bullets: [
      "Stat tiles with change indicators",
      "Revenue chart drawn in the page",
      "Orders table with status",
      "Collapses cleanly onto a phone",
    ],
    img: { desktop: 'assets/img/templates/dashboard-desktop.webp', mobile: 'assets/img/templates/dashboard-mobile.webp' },
  },
  {
    id: 'mithaas', badge: 'mine', cat: 'store', pkg: 'premium',
    name: 'Mithaas — multi-shop marketplace',
    url: 'https://mithaas-sable.vercel.app',
    note: 'My own project. It shows what a catalogue with many shops looks like.',
    blurb: 'One storefront, many shops, product cards with prices — the pattern behind any catalogue business.',
    bullets: [
      'Product grid with prices',
      'A page per shop',
      'Orders go straight to the shop',
    ],
    img: { desktop: 'assets/img/work/mithaas-desktop.webp', mobile: 'assets/img/work/mithaas-mobile.webp' },
  },
  {
    id: 'portfolio', badge: 'mine', cat: 'personal', pkg: 'starter',
    name: 'Personal portfolio',
    url: 'https://jugendra-pratap.vercel.app',
    note: 'My own portfolio. The same build a freelancer, doctor or teacher gets.',
    blurb: 'One page that says who you are, what you do, and how to reach you. Nothing else.',
    bullets: [
      'One page, opens instantly',
      'Your work or service list',
      'Contact buttons',
    ],
    img: { desktop: 'assets/img/work/portfolio-desktop.webp', mobile: 'assets/img/work/portfolio-mobile.webp' },
  },
  {
    id: 'booking-form', badge: 'demo', cat: 'business', pkg: 'business',
    name: 'Booking or enquiry form',
    url: 'brief.html',
    note: 'This is the enquiry form on this very site — open it and fill it in yourself.',
    blurb: 'A long form split into four easy steps, so people actually finish it. Nothing is stored anywhere — the answers arrive as one WhatsApp message.',
    bullets: [
      'Four steps, saved as the customer types',
      'A half-filled form cannot be sent',
      'Everything arrives as one WhatsApp message',
    ],
    img: { desktop: 'assets/img/work/booking-desktop.webp', mobile: 'assets/img/work/booking-mobile.webp' },
  },
];

const PROCESS = [
  {
    n: '1', title: 'Talk',
    body: 'Ten minutes on WhatsApp. You tell me what the business is and what it should show. No forms.',
  },
  {
    n: '2', title: 'Demo',
    body: 'In two or three days I build a demo of your site and send it to you. This costs nothing.',
  },
  {
    n: '3', title: 'Your yes',
    body: 'If you like it, half the payment. If you do not, we cancel and you pay nothing.',
  },
  {
    n: '4', title: 'Live',
    body: 'The site goes on the internet and the link is yours. The other half is paid then.',
  },
];

const FAQ = [
  {
    q: 'Why is this so cheap? Is something wrong with it?',
    a: 'I am an engineering student starting out on my own. I have no office to pay for, so my rates are low. The work is complete — look at the demo and judge it yourself.',
  },
  {
    q: 'Do you have any clients?',
    a: 'Not a paying one yet — you could be the first, and that is exactly why the rates are this low. Every template on this site was designed and built by me, and you can open any of them and click through it. Two entries are my own projects rather than templates, and the enquiry form is the one running on this site.',
  },
  {
    q: 'When do I pay?',
    a: 'After you have seen the demo. Half when you approve it, the other half when the site goes live. If you do not like it, you pay nothing and there is no argument.',
  },
  {
    q: 'What will it cost me every month?',
    a: 'Nothing for hosting. The only yearly cost is a domain, and only if you want your own name like yourshop.in — that is ₹700-1,000 a year, paid to the domain company, not to me.',
  },
  {
    q: 'What if I need to change a number or a price later?',
    a: 'Small changes — a number, a photo, a price — I handle. Premium includes the first month free. After that it is ₹999 a year for as many changes as you need.',
  },
  {
    q: 'I do not have good photos.',
    a: 'That is fine. Send whatever you have from your phone and I will clean it up. Where there is no photo at all, the design carries it — the whole hero of the Mithai Wala site is a painted board, with no photo anywhere.',
  },
  {
    q: 'Will my site show up on Google?',
    a: 'Business and Premium include the basic setup — title, description and sitemap. Premium also prepares your Google Business profile, though you have to finish the verification yourself, because Google sends a postcard or asks for a video call.',
  },
  {
    q: 'Is the free demo really free?',
    a: 'Yes. I build three free demos a month, because each one takes about two days. After that, the next one moves to the following month.',
  },
];

const TRUST = [
  { title: 'Perfect on phones', note: 'Every site is tested on a real phone' },
  { title: 'Fast on 3G', note: 'A light site that opens in about two seconds' },
  { title: 'Ready for Google', note: 'Title, description and sitemap set up' },
  { title: 'WhatsApp button', note: 'Customers reach you in one tap' },
];

const half = (p) => Math.ceil(p / 2);
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

const DATA = { CONFIG, PACKAGES, EXTRAS, CATS, DESIGNS, PROCESS, FAQ, TRUST };

if (typeof module !== 'undefined' && module.exports) module.exports = { ...DATA, half, inr };
if (typeof window !== 'undefined') { window.NEEV = { ...DATA, half, inr }; }
