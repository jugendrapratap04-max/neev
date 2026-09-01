/* NEEV — brief wizard.
   Four steps, validation, a saved draft, and one complete WhatsApp message
   at the end. With JavaScript off, all four steps simply show at once and the
   plain WhatsApp link still works — the form is never a dead end. */
(function () {
  'use strict';

  var form = document.getElementById('briefForm');
  if (!form || !window.NEEV) return;

  var DRAFT_KEY = 'neev.brief.v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var steps = $$('.brief-step', form);
  var dots = $$('[data-step-dot]');
  var backBtn = $('#briefBack');
  var nextBtn = $('#briefNext');
  var sendBtn = $('#briefSend');
  var savedTag = $('#briefSaved');
  var preview = $('#briefPreview');
  var current = 1;
  var LAST = steps.length;
  var SMOOTH = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  /* ---------- populate from data ---------- */
  var pkgBox = $('#pkgOptions');
  if (pkgBox && !pkgBox.children.length) {
    var opts = window.NEEV.PACKAGES.map(function (p) {
      return '<label class="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/70 p-4 hover:bg-surface-container">' +
        '<input type="radio" name="pkg" value="' + p.name + ' (' + window.NEEV.inr(p.price) + ')" class="mt-0.5 h-5 w-5 shrink-0 border-outline text-secondary focus:ring-secondary">' +
        '<span><span class="block text-body-md font-semibold text-on-surface">' + p.name + ' — ' + window.NEEV.inr(p.price) + '</span>' +
        '<span class="block text-label-md text-on-surface-variant">' + p.for + '</span></span></label>';
    });
    opts.push('<label class="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/70 p-4 hover:bg-surface-container">' +
      '<input type="radio" name="pkg" value="Not sure — please advise" class="mt-0.5 h-5 w-5 shrink-0 border-outline text-secondary focus:ring-secondary">' +
      '<span><span class="block text-body-md font-semibold text-on-surface">I don\'t know</span>' +
      '<span class="block text-label-md text-on-surface-variant">Have a look and tell me what suits</span></span></label>');
    pkgBox.innerHTML = opts.join('');
  }

  var designSel = $('#design');
  if (designSel && designSel.options.length <= 1) {
    window.NEEV.DESIGNS.forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.name;
      o.dataset.id = d.id;
      o.textContent = d.name + (d.badge === 'live' ? '  (live)' : '');
      designSel.appendChild(o);
    });
  }

  /* Arriving from design-<id>.html should pre-select that design. This runs
     AFTER restore(): an older saved draft must not wipe out the design the
     visitor just clicked on. */
  function preselectDesign() {
    if (!designSel) return;
    var qs = new URLSearchParams(location.search).get('design');
    if (!qs) return;
    var match = $$('option', designSel).filter(function (o) { return o.dataset.id === qs; })[0];
    if (match) designSel.value = match.value;
  }

  /* ---------- draft ---------- */
  function collect() {
    var d = {};
    $$('input, select, textarea', form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') {
        if (!d[el.name]) d[el.name] = [];
        if (el.checked) d[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (el.checked) d[el.name] = el.value;
      } else {
        d[el.name] = el.value;
      }
    });
    return d;
  }
  function restore() {
    var raw;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return; }
    $$('input, select, textarea', form).forEach(function (el) {
      if (!el.name || !(el.name in d)) return;
      var v = d[el.name];
      if (el.type === 'checkbox') el.checked = Array.isArray(v) && v.indexOf(el.value) !== -1;
      else if (el.type === 'radio') el.checked = v === el.value;
      else el.value = v;
    });
  }
  var saveTimer;
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collect())); } catch (e) { return; }
    if (!savedTag) return;
    savedTag.classList.remove('hidden');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { savedTag.classList.add('hidden'); }, 1800);
  }

  /* ---------- validation ---------- */
  function wrapOf(el) { return el.closest('.field-wrap'); }
  function markBad(el, bad) {
    var w = wrapOf(el);
    if (w) w.classList.toggle('field-invalid', bad);
    if (el && el.setAttribute && el.tagName !== 'DIV') el.setAttribute('aria-invalid', bad ? 'true' : 'false');
  }
  function validField(el) {
    if (el.name === 'wa') return /^[6-9]\d{9}$/.test(el.value.replace(/\D/g, ''));
    if (el.type === 'radio') {
      return $$('input[name="' + el.name + '"]', form).some(function (r) { return r.checked; });
    }
    return el.value.trim() !== '';
  }
  function validateStep(n) {
    var sec = steps[n - 1];
    var required = $$('[required]', sec);
    var ok = true;
    var firstBad = null;
    required.forEach(function (el) {
      var good = validField(el);
      markBad(el, !good);
      if (!good) { ok = false; if (!firstBad) firstBad = el; }
    });
    /* The step-2 radio group is checked by hand: a fieldset cannot take [required]. */
    if (n === 2) {
      var pkgOk = $$('input[name="pkg"]', form).some(function (r) { return r.checked; });
      var pkgWrap = pkgBox && pkgBox.closest('.field-wrap');
      if (pkgWrap) pkgWrap.classList.toggle('field-invalid', !pkgOk);
      if (!pkgOk) { ok = false; if (!firstBad) firstBad = pkgBox; }
    }
    if (firstBad && firstBad.focus) {
      firstBad.scrollIntoView({ block: 'center', behavior: SMOOTH });
      if (firstBad.tagName !== 'DIV') firstBad.focus({ preventScroll: true });
    }
    return ok;
  }

  /* ---------- message ---------- */
  function buildMessage() {
    var d = collect();
    var L = [];
    L.push('Hello Jugendra, I would like a website for my business.');
    L.push('');
    L.push('Business: ' + (d.bizName || '-'));
    L.push('Type: ' + (d.bizType || '-'));
    L.push('City: ' + (d.city || '-'));
    L.push('Package: ' + (d.pkg || '-'));
    if (d.design) L.push('Design: ' + d.design);
    if (d.want && d.want.length) L.push('Needs: ' + d.want.join(', '));
    if (d.items) L.push('Items: ' + d.items);
    if (d.photos) L.push('Photos: ' + d.photos);
    if (d.domain) L.push('Domain: ' + d.domain);
    if (d.when) L.push('Timeline: ' + d.when);
    L.push('');
    L.push('Name: ' + (d.name || '-'));
    L.push('WhatsApp: ' + (d.wa || '-'));
    if (d.note && d.note.trim()) { L.push(''); L.push('Note: ' + d.note.trim()); }
    return L.join('\n');
  }
  function refreshPreview() {
    var msg = buildMessage();
    if (preview) preview.textContent = msg;
    if (sendBtn) sendBtn.href = window.NEEV.CONFIG.waBase + '?text=' + encodeURIComponent(msg);
  }

  /* ---------- step nav ---------- */
  function show(n) {
    current = Math.min(Math.max(n, 1), LAST);
    steps.forEach(function (s, i) { s.classList.toggle('hidden', i + 1 !== current); });
    dots.forEach(function (li, i) {
      var dot = li.querySelector('.dot');
      var done = i + 1 <= current;
      dot.classList.toggle('bg-primary', done);
      dot.classList.toggle('text-on-primary', done);
      dot.classList.toggle('bg-surface-container', !done);
      dot.classList.toggle('text-on-surface-variant', !done);
      var bar = li.querySelector('.bar');
      if (bar) bar.classList.toggle('bg-primary', i + 1 < current);
    });
    var hadFocus = document.activeElement === nextBtn || document.activeElement === backBtn;
    backBtn.classList.toggle('invisible', current === 1);
    nextBtn.classList.toggle('hidden', current === LAST);
    sendBtn.classList.toggle('hidden', current !== LAST);
    if (hadFocus) {
      var sec = steps[current - 1];
      sec.setAttribute('tabindex', '-1');
      sec.focus({ preventScroll: true });
    }
    if (current === LAST) refreshPreview();
    var top = form.getBoundingClientRect().top + window.scrollY - 110;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: SMOOTH });
  }

  nextBtn.addEventListener('click', function () {
    if (!validateStep(current)) return;
    saveDraft();
    show(current + 1);
  });
  backBtn.addEventListener('click', function () { show(current - 1); });

  sendBtn.addEventListener('click', function (e) {
    if (!validateStep(LAST)) { e.preventDefault(); return; }
    refreshPreview();
    /* Only clear the draft once the message is actually on its way. */
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }
    var msg = buildMessage();
    try { sessionStorage.setItem('neev.brief.sent', msg); } catch (err) { /* ignore */ }
    setTimeout(function () { location.href = 'thanks.html'; }, 400);
  });

  form.addEventListener('input', function (e) {
    if (e.target.name === 'note') {
      var c = $('#noteCount');
      if (c) c.textContent = String(e.target.value.length);
    }
    if (wrapOf(e.target) && validField(e.target)) markBad(e.target, false);
    saveDraft();
    if (current === LAST) refreshPreview();
  });
  form.addEventListener('change', function () { saveDraft(); if (current === LAST) refreshPreview(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- go ---------- */
  restore();
  preselectDesign();
  var noteEl = $('#note');
  var noteCount = $('#noteCount');
  if (noteEl && noteCount) noteCount.textContent = String(noteEl.value.length);
  show(1);
  refreshPreview();
})();
