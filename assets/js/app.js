/* NEEV — shortlist, catalogue filters and small UI glue.
   The site works fully without this; it is only the layer on top. */
(function () {
  'use strict';

  var SAVE_KEY = 'neev.shortlist.v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var attr = function (s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };

  /* localStorage can throw in private mode — every access is wrapped. */
  function readSaved() {
    var arr;
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      arr = raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
    if (!Array.isArray(arr)) return [];
    /* Drop ids for designs that no longer exist, so the header badge and the
       shortlist page can never disagree. */
    if (window.NEEV && window.NEEV.DESIGNS) {
      var live = window.NEEV.DESIGNS.map(function (d) { return d.id; });
      var kept = arr.filter(function (id) { return live.indexOf(id) !== -1; });
      if (kept.length !== arr.length) { writeSaved(kept); return kept; }
      return kept;
    }
    return arr;
  }
  function writeSaved(list) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  /* ---------- shortlist ---------- */
  function paintSaveButtons() {
    var saved = readSaved();
    $$('.js-save').forEach(function (btn) {
      var on = saved.indexOf(btn.dataset.id) !== -1;
      if (!btn.closest('#shortlistBox')) btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('!bg-secondary', on);
      btn.classList.toggle('!text-white', on);
      btn.classList.toggle('!border-secondary', on);
      if (btn.closest('#shortlistBox')) return;
      var svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
      btn.title = on ? 'Saved to shortlist' : 'Save to shortlist';
    });
    var n = saved.length;
    $$('.js-save-count').forEach(function (el) {
      el.textContent = n ? String(n) : '';
      el.classList.toggle('hidden', n === 0);
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.js-save') : null;
    if (!btn) return;
    e.preventDefault();
    var id = btn.dataset.id;
    var saved = readSaved();
    var i = saved.indexOf(id);
    if (i === -1) saved.push(id); else saved.splice(i, 1);
    writeSaved(saved);
    paintSaveButtons();
    renderShortlist();
  });

  /* ---------- mobile menu (<details>) ---------- */
  document.addEventListener('click', function (e) {
    $$('details.js-menu[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });
  $$('details.js-menu a').forEach(function (a) {
    a.addEventListener('click', function () { a.closest('details').removeAttribute('open'); });
  });

  /* ---------- catalogue filter ---------- */
  var baseOrder = null;   // the document order as built, captured once
  function applyFilter() {
    var grid = $('#designGrid');
    if (!grid) return;
    var q = ($('#designSearch') && $('#designSearch').value || '').trim().toLowerCase();
    var cat = grid.dataset.cat || 'all';
    var sort = ($('#designSort') && $('#designSort').value) || 'default';

    var cards = $$('.design-card', grid);
    var shown = 0;
    cards.forEach(function (c) {
      var okCat = cat === 'all' || c.dataset.cat === cat;
      var okQ = !q || c.dataset.name.indexOf(q) !== -1;
      var show = okCat && okQ;
      c.classList.toggle('hidden', !show);
      if (show) shown++;
    });

    if (baseOrder === null) baseOrder = cards.slice();

    if (sort === 'default') {
      baseOrder.forEach(function (c) { grid.appendChild(c); });
    } else {
      var sorted = cards.slice().sort(function (a, b) {
        var pa = +a.dataset.price, pb = +b.dataset.price;
        if (sort === 'live') {
          var la = a.dataset.badge === 'live' ? 0 : 1, lb = b.dataset.badge === 'live' ? 0 : 1;
          return la - lb || pa - pb;
        }
        return sort === 'low' ? pa - pb : pb - pa;
      });
      sorted.forEach(function (c) { grid.appendChild(c); });
    }

    var empty = $('#designEmpty');
    if (empty) empty.classList.toggle('hidden', shown !== 0);
    var count = $('#designCount');
    if (count) count.textContent = shown + (shown === 1 ? ' design' : ' designs');
  }

  $$('.cat-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var grid = $('#designGrid');
      if (!grid) return;
      grid.dataset.cat = chip.dataset.cat;
      $$('.cat-chip').forEach(function (c) {
        var on = c === chip;
        c.setAttribute('aria-pressed', String(on));
        c.classList.toggle('bg-primary', on);
        c.classList.toggle('text-on-primary', on);
        c.classList.toggle('border-primary', on);
        c.classList.toggle('bg-surface-container-lowest', !on);
        c.classList.toggle('text-on-surface-variant', !on);
      });
      applyFilter();
    });
  });
  if ($('#designSearch')) $('#designSearch').addEventListener('input', applyFilter);
  if ($('#designSort')) $('#designSort').addEventListener('change', applyFilter);

  /* ---------- shortlist page ---------- */
  function renderShortlist() {
    var box = $('#shortlistBox');
    if (!box || !window.NEEV) return;
    var saved = readSaved();
    var items = window.NEEV.DESIGNS.filter(function (d) { return saved.indexOf(d.id) !== -1; });
    var empty = $('#shortlistEmpty');
    var actions = $('#shortlistActions');

    if (!items.length) {
      box.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      if (actions) actions.classList.add('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (actions) actions.classList.remove('hidden');

    box.innerHTML = items.map(function (d) {
      var pkg = window.NEEV.PACKAGES.filter(function (p) { return p.id === d.pkg; })[0];
      var badge = d.badge === 'live'
        ? '<span class="badge-live"><span class="h-2 w-2 rounded-full bg-success"></span>LIVE</span>'
        : '<span class="badge-design">DESIGN</span>';
      return '<article class="card flex items-center gap-4 p-4">' +
        '<img src="' + d.img.desktop + '" alt="" width="160" height="100" class="hidden h-20 w-32 shrink-0 rounded object-cover object-top sm:block">' +
        '<div class="min-w-0 flex-1">' +
          '<div class="mb-1">' + badge + '</div>' +
          '<h3 class="text-headline-md font-semibold leading-snug text-on-surface"><a class="hover:text-secondary" href="design-' + d.id + '.html">' + attr(d.name) + '</a></h3>' +
          '<p class="mt-1 text-label-md text-on-surface-variant">' + pkg.name + ' — ' + window.NEEV.inr(pkg.price) + '</p>' +
        '</div>' +
        '<button type="button" class="js-save btn btn-outline btn-sm !px-3" data-id="' + d.id + '" aria-label="Remove ' + attr(d.name) + ' from shortlist">' +
          '<svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true"><path d="M6 6.7 8.3 9 6 11.3l.7.7L9 9.7l2.3 2.3.7-.7L9.7 9 12 6.7l-.7-.7L9 8.3 6.7 6 6 6.7Z"/><path fill-rule="evenodd" d="M9 1a8 8 0 1 0 0 16A8 8 0 0 0 9 1ZM2.5 9a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" clip-rule="evenodd"/></svg>' +
        '</button>' +
      '</article>';
    }).join('');

    var send = $('#shortlistWa');
    if (send) {
      var lines = items.map(function (d, i) { return (i + 1) + '. ' + d.name; }).join('\n');
      var msg = 'Hello Jugendra, I like these designs:\n' + lines + '\n\nMy business is ______. Please tell me the price and how long it takes.';
      send.href = window.NEEV.CONFIG.waBase + '?text=' + encodeURIComponent(msg);
    }
    paintSaveButtons();
  }

  /* ---------- go ---------- */
  paintSaveButtons();
  renderShortlist();
  applyFilter();
})();
