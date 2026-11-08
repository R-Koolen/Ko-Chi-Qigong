// Ko-Chi qigong — fills the Inspiratie pages from assets/inspiratie-data.js (SERIES, ITEMS).
// The HTML already contains a complete static version; this script refreshes it from the data,
// picks the piece for inspiratie-stuk.html?id=..., and draws its PDF.
//
// Markup hooks (written by the converter):
//   data-bind="expr"          → element text
//   data-bind-<attr>="expr"   → attribute (e.g. data-bind-src="item.img")
//   data-bind-style="expr"    → inline style object
//   <x-if data-if="expr">     → shown when expr is truthy
//   <x-for data-for="list" data-as="it"><template>…</template></x-for> → repeated per item
(function () {
  var UNITLESS = { fontWeight: 1, lineHeight: 1, opacity: 1, zIndex: 1, order: 1, flexGrow: 1, flexShrink: 1 };

  function get(scope, expr) {
    var parts = String(expr).trim().split('.');
    var v = scope[parts[0]];
    for (var i = 1; i < parts.length; i++) v = v == null ? undefined : v[parts[i]];
    return v;
  }
  function text(v) { return v == null || typeof v === 'boolean' ? '' : String(v); }

  function bind(node, scope) {
    var all = [].slice.call(node.querySelectorAll('*'));
    // skip anything inside an <x-for>; the x-for renders its own items with their own scope
    var own = all.filter(function (el) {
      for (var p = el.parentElement; p && p !== node; p = p.parentElement) if (p.tagName === 'X-FOR') return false;
      return true;
    });
    own.forEach(function (el) {
      if (el.hasAttribute('data-bind')) el.textContent = text(get(scope, el.getAttribute('data-bind')));
      if (el.hasAttribute('data-if')) el.style.display = get(scope, el.getAttribute('data-if')) ? '' : 'none';
      [].slice.call(el.attributes).forEach(function (a) {
        if (a.name.indexOf('data-bind-') !== 0 || a.name === 'data-bind-style') return;
        var name = a.name.slice('data-bind-'.length), v = get(scope, a.value);
        if (v == null) el.removeAttribute(name); else if (el.getAttribute(name) !== String(v)) el.setAttribute(name, String(v));
      });
      if (el.hasAttribute('data-bind-style')) {
        var o = get(scope, el.getAttribute('data-bind-style')) || {};
        Object.keys(o).forEach(function (k) {
          var v = o[k];
          el.style[k] = typeof v === 'number' && v !== 0 && !UNITLESS[k] ? v + 'px' : v;
        });
      }
      if (el.tagName === 'X-FOR') {
        var tpl = el.querySelector(':scope > template');
        var list = get(scope, el.getAttribute('data-for')) || [];
        var as = el.getAttribute('data-as');
        [].slice.call(el.childNodes).forEach(function (c) { if (c !== tpl) el.removeChild(c); });
        list.forEach(function (item) {
          var s = Object.create(scope);
          s[as] = item;
          var frag = tpl.content.cloneNode(true);
          bind(frag, s);
          el.appendChild(frag);
        });
      }
    });
  }

  var main = document.querySelector('main');
  var page = document.body.getAttribute('data-page');

  // ---- inspiratie.html: one card per series ----
  if (page === 'inspiratie') {
    var series = Object.keys(SERIES).map(function (key) {
      var s = SERIES[key];
      var its = ITEMS.filter(function (i) { return i.s === s.key; });
      var ys = its.map(function (i) { return i.year; });
      return Object.assign({}, s, {
        items: its,
        meta: its.length + ' ' + s.unit + ' · ' + Math.min.apply(null, ys) + '–' + Math.max.apply(null, ys),
        latest: its[0],
        latestLabel: s.name + ': ' + its[0].label
      });
    });
    bind(main, { total: ITEMS.length, series: series });
  }

  // ---- inspiratie-stuk.html?id=…: one piece, its PDF and related pieces ----
  if (page === 'inspiratie-stuk') {
    var id = new URLSearchParams(window.location.search).get('id');
    // no ?id → newest piece (matches the static HTML); unknown ?id → "niet gevonden"
    var item = id ? ITEMS.filter(function (i) { return i.id === id; })[0] : ITEMS[0];
    if (!item) {
      document.title = 'Stuk niet gevonden - Ko-Chi qigong';
      main.innerHTML =
        '<section style="max-width: 640px; margin: 60px auto; text-align: center; color: #1F3864;">' +
          '<h1 style="margin: 0; font-family: \'Cinzel Decorative\', serif; font-weight: 700; letter-spacing: 0.05em; font-size: 30px; line-height: 1.2;">Stuk niet gevonden</h1>' +
          '<p style="margin: 18px 0 28px;">Dit inspiratiestuk bestaat niet (meer). Misschien is de link verouderd of zit er een typfout in.</p>' +
          '<a class="hv0" href="inspiratie.html" style="display: inline-flex; align-items: center; padding: 14px 26px; border-radius: 100px; background-color: #1F3864; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; line-height: 1;">Alle inspiratie</a>' +
        '</section>';
      return;
    }
    var s = SERIES[item.s];
    document.title = s.name + ': ' + item.label + ' - Ko-Chi qigong';
    var state = { pdfLoading: true, pdfError: false };
    var render = function () {
      bind(main, {
        item: item,
        series: s,
        hasPdf: !!item.pdf && !state.pdfError,
        noPdf: !item.pdf || state.pdfError,
        pdfLoading: state.pdfLoading,
        related: ITEMS.filter(function (i) { return i.s === item.s && i.id !== item.id; }).slice(0, 8),
        tagStyle: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: s.color }
      });
    };
    render();

    if (item.pdf) (async function () {
      try {
        var base = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/';
        var pdfjs = await import(base + 'pdf.min.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
        var doc = await pdfjs.getDocument(new URL(item.pdf, window.location.href).href).promise;
        var el = document.querySelector('[data-pdf-target]');
        if (!el) return;
        el.innerHTML = '';
        var dpr = window.devicePixelRatio || 1;
        for (var p = 1; p <= doc.numPages; p++) {
          var pg = await doc.getPage(p);
          var w = el.clientWidth || 800;
          var vp0 = pg.getViewport({ scale: 1 });
          var vp = pg.getViewport({ scale: (w / vp0.width) * dpr });
          var c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height;
          c.style.cssText = 'display:block;width:100%;height:auto;border-radius:10px;background:#fff;box-shadow:0 4px 20px rgba(31,56,100,0.1);';
          el.appendChild(c);
          await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          if (p === 1) { state.pdfLoading = false; render(); }
        }
      } catch (e) {
        console.warn('PDF render failed', e);
        state.pdfLoading = false; state.pdfError = true; render();
      }
    })();
  }
})();
