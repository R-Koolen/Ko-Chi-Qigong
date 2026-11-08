// Ko-Chi qigong — run after editing assets/inspiratie-data.js:
//
//   node tools/sync-inspiratie.js
//
// It rewrites, from the data file:
//   - the static copy inside inspiratie.html and inspiratie-stuk.html
//     (what Google and visitors without JavaScript see: counts, latest piece, related list)
//   - the inspiratie-stuk.html?id=… entries in sitemap.xml
// It fills the same data-bind / x-for / x-if hooks that assets/inspiratie.js fills in the browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => {
  if (read(f) === s) return console.log('unchanged  ' + f);
  fs.writeFileSync(path.join(root, f), s);
  console.log('updated    ' + f);
};

// ---- load the data file exactly as the browser does ----
const ctx = {};
vm.runInNewContext(read('assets/inspiratie-data.js') + '\nthis.SERIES = SERIES; this.ITEMS = ITEMS;', ctx);
const { SERIES, ITEMS } = ctx;
if (!ITEMS.length) throw new Error('ITEMS is empty');
const ids = new Set();
ITEMS.forEach((i) => {
  if (ids.has(i.id)) throw new Error('duplicate id ' + i.id);
  ids.add(i.id);
  if (!SERIES[i.s]) throw new Error(i.id + ': unknown series "' + i.s + '"');
  if (!fs.existsSync(path.join(root, i.img))) console.warn('WARNING ' + i.id + ': missing image ' + i.img);
  if (i.pdf && !fs.existsSync(path.join(root, i.pdf))) console.warn('WARNING ' + i.id + ': missing PDF ' + i.pdf);
});

// ---- tiny template filler (mirrors assets/inspiratie.js) ----
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = (scope, expr) => expr.trim().split('.').reduce((v, k) => (v == null ? undefined : v[k]), scope);
const text = (v) => (v == null || typeof v === 'boolean' ? '' : String(v));

function fillFlat(html, scope) {
  // <tag … data-bind="expr">text</tag>
  html = html.replace(/(<([a-z][\w-]*)\b[^>]*\sdata-bind="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g,
    (m, open, tag, expr, close) => open + esc(text(get(scope, expr))) + close);
  // name="old" data-bind-name="expr"   (the plain attribute is optional)
  html = html.replace(/(\s(?!data-bind)([\w-]+)="[^"]*")?(\s)data-bind-([\w-]+)="([^"]+)"/g,
    (m, prev, prevName, sp, name, expr) => {
      if (name === 'style') return m;
      const keep = prev && prevName !== name ? prev : '';
      const v = get(scope, expr);
      return keep + (v == null ? '' : sp + name + '="' + esc(v) + '"') + sp + 'data-bind-' + name + '="' + expr + '"';
    });
  // <x-if data-if="expr"> → hidden with style="display: none;" when false
  html = html.replace(/<x-if data-if="([^"]+)"( style="display: none;")?>/g,
    (m, expr) => '<x-if data-if="' + expr + '"' + (get(scope, expr) ? '' : ' style="display: none;"') + '>');
  return html;
}

function fill(html, scope) {
  // each <x-for>: keep its <template>, rebuild the static items after it
  const blocks = [];
  html = html.replace(/(<x-for data-for="([^"]+)" data-as="([^"]+)"><template>)([\s\S]*?)(<\/template>)[\s\S]*?(<\/x-for>)/g,
    (m, open, list, as, tpl, tplEnd, close) => {
      const items = (get(scope, list) || []).map((it) => fillFlat(tpl, Object.assign(Object.create(scope), { [as]: it })));
      blocks.push(open + tpl + tplEnd + items.join('') + close);
      return '\u0000' + (blocks.length - 1) + '\u0000';
    });
  html = fillFlat(html, scope);
  return html.replace(/\u0000(\d+)\u0000/g, (m, n) => blocks[n]);
}

// only touch <main>; header/footer stay as they are
const inMain = (html, fn) => html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/, (m, a, body, b) => a + fn(body) + b);

// ---- inspiratie.html ----
const series = Object.keys(SERIES).map((key) => {
  const s = SERIES[key];
  const its = ITEMS.filter((i) => i.s === s.key);
  const ys = its.map((i) => i.year);
  return Object.assign({}, s, {
    items: its,
    meta: its.length + ' ' + s.unit + ' · ' + Math.min(...ys) + '–' + Math.max(...ys),
    latest: its[0],
    latestLabel: s.name + ': ' + its[0].label
  });
});
write('inspiratie.html', inMain(read('inspiratie.html'), (b) => fill(b, { total: ITEMS.length, series })));

// ---- inspiratie-stuk.html (static copy shows the newest piece) ----
const item = ITEMS[0];
const s = SERIES[item.s];
let stuk = inMain(read('inspiratie-stuk.html'), (b) => fill(b, {
  item, series: s,
  hasPdf: !!item.pdf, noPdf: !item.pdf, pdfLoading: true,
  related: ITEMS.filter((i) => i.s === item.s && i.id !== item.id).slice(0, 8)
}));
stuk = stuk.replace(/(\.d-tagStyle\.d-tagStyle \{[^}]*color: )#[0-9A-Fa-f]{3,6}/, '$1' + s.color);
write('inspiratie-stuk.html', stuk);

// ---- sitemap.xml ----
const sm = read('sitemap.xml');
const base = sm.match(/<loc>(.*?)inspiratie\.html<\/loc>/);
if (!base) throw new Error('sitemap.xml has no inspiratie.html entry to add the pieces after');
const lines = ITEMS.map((i) => '  <url><loc>' + base[1] + 'inspiratie-stuk.html?id=' + i.id + '</loc></url>\n').join('');
write('sitemap.xml', sm
  .replace(/[ \t]*<url><loc>[^<]*inspiratie-stuk\.html\?id=[^<]*<\/loc><\/url>\r?\n/g, '')
  .replace(/(<url><loc>[^<]*inspiratie\.html<\/loc><\/url>\r?\n)/, '$1' + lines));

console.log(ITEMS.length + ' pieces: ' + series.map((x) => x.name + ' ' + x.items.length).join(', '));
