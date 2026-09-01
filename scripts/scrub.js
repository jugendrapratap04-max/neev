/* The template's own pages ship with someone else's brand name and invented
   social proof ("Trusted by 2,000+ creators", a "+2k" avatar cluster, dollar
   prices). None of that may sit inside a preview image shown to a customer, so
   it is scrubbed in the page just before the screenshot is taken.

   Text nodes are not enough: the template also carries the brand in
   placeholder/alt/title/value attributes ("e.g. Nexora Q3 Campaign"), which
   render as visible text in a screenshot.

   Exported as a string for CDP eval. */
module.exports = String.raw`(() => {
  const KILL = [
    /trusted by [\d,]+\+? creators/i,
    /[\d,.]+k\+?\s*(happy customers|products sold)/i,
    /\d+%\s*satisfaction/i,
    /24\/7\s*expert support/i,
    /built for creators/i,
    /^\+\s*\d+k$/i,                       // the "+2k" avatar-cluster counter
    /^(payment method|tax|discount code|gst)\b/i,  // a card gateway the site does not offer
  ];
  const BRANDS = /Nexora|NovaCommerce|SaaSMax|FinDash Pro|FinDash|Taskly/g;
  let hidden = 0, textFixed = 0, attrFixed = 0;

  const hide = (el) => { (el.closest('div, section, li, p, label') || el).style.visibility = 'hidden'; hidden++; };

  document.querySelectorAll('body *').forEach((el) => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim();
    if (t && KILL.some((re) => re.test(t))) hide(el);
  });

  /* An avatar cluster or a logo image carrying the template's brand. */
  document.querySelectorAll('img[alt*="Nexora" i], img[alt*="avatar" i]').forEach(hide);

  const money = (s) => s.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, (_, d) =>
    '₹' + Math.round(parseFloat(d.replace(/,/g, '')) * 10).toLocaleString('en-IN'));

  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  nodes.forEach((n) => {
    const v0 = n.nodeValue;
    if (!v0) return;
    const v = money(v0.replace(BRANDS, 'Your Brand'));
    if (v !== v0) { n.nodeValue = v; textFixed++; }
  });

  ['placeholder', 'alt', 'title', 'value', 'aria-label'].forEach((name) => {
    document.querySelectorAll('[' + name + ']').forEach((el) => {
      const v0 = el.getAttribute(name);
      if (!v0) return;
      const v = money(v0.replace(BRANDS, 'Your Brand'));
      if (v !== v0) { el.setAttribute(name, v); attrFixed++; }
    });
  });

  return { hidden, textFixed, attrFixed };
})()`;
