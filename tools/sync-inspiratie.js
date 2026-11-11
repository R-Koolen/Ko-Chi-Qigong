// Ko-Chi Qigong — run after editing assets/inspiratie-data.js (or the layout in inspiratie-stuk.html):
//
//   node tools/sync-inspiratie.js
//
// It writes, from the data file:
//   - one page per piece, inspiratie-<series>-<label>.html, copied from the template
//     inspiratie-stuk.html and filled in with that piece. Each page has its own title, description,
//     canonical link and structured data (tools/schema.js), and the text of its PDF, hidden from
//     view (the PDF itself is what visitors see) but readable for Google, AI assistants and screen
//     readers. A page whose address changed (label edited) becomes a redirect to the new address.
//   - the static copy inside inspiratie.html and inspiratie-stuk.html
//     (what Google and visitors without JavaScript see: counts, latest piece, related list)
//   - links written as inspiratie-stuk.html?id=… in the other pages → the piece's own page
//   - the piece entries in sitemap.xml
//   - llms.txt (see tools/llms.js)
//
// PDF text: the first time a PDF is seen its text is extracted (with pdftotext, which comes with
// Git for Windows) and saved as tools/pdf-tekst/<pdf-name>.txt. That file is what goes into the page:
// one paragraph per line, "- " for a list item. You can correct it by hand; it is never overwritten.
// Replaced a PDF? Delete its .txt file and run the script again.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const { BASE, pieceGraph, putInHead } = require('./schema.js');
const { writeLlms } = require('./llms.js');

const root = path.join(__dirname, '..');
const exists = (f) => fs.existsSync(path.join(root, f));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => {
  if (exists(f) && read(f) === s) return;
  console.log((exists(f) ? 'updated    ' : 'new        ') + f);
  fs.writeFileSync(path.join(root, f), s);
};
// replace that must match (so a changed template fails loudly instead of silently)
const must = (html, re, to, what) => {
  if (!re.test(html)) throw new Error('inspiratie-stuk.html: cannot find ' + what);
  return html.replace(re, to);
};

// ---- load the data file exactly as the browser does ----
const ctx = {};
vm.runInNewContext(read('assets/inspiratie-data.js') + '\nthis.SERIES = SERIES; this.ITEMS = ITEMS;', ctx);
const { SERIES, ITEMS } = ctx;
if (!ITEMS.length) throw new Error('ITEMS is empty');
const ids = new Set(), hrefs = new Set();
ITEMS.forEach((i) => {
  if (ids.has(i.id)) throw new Error('duplicate id ' + i.id);
  if (hrefs.has(i.href)) throw new Error(i.id + ': same page address as another piece: ' + i.href + ' (make the label different)');
  ids.add(i.id);
  hrefs.add(i.href);
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

// ---- PDF text ----
function pdftotext(pdf) {
  for (const exe of ['pdftotext', 'C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe']) {
    const r = spawnSync(exe, ['-enc', 'UTF-8', path.join(root, pdf), '-'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return r.stdout;
  }
  return null;
}

// pdftotext output → one paragraph per line, "- " for list items
function cleanText(raw) {
  const t = raw
    .replace(/\r/g, '')
    .replace(/\f/g, '\n\n')                          // page break
    .replace(/[\uE000-\uF8FF]/g, '')                 // icon-font glyphs
    .replace(/\s*[➢•▪●❖]\s*/g, '\n- ');              // bullets: each on its own line
  const out = [];
  for (const block of t.split(/\n\s*\n/)) {
    let cur = null, lastLine = '';
    for (let line of block.split('\n')) {
      line = line.replace(/\s+/g, ' ').trim();
      if (!line || line === '-') continue;
      const wrapped = cur && !line.startsWith('- ') &&
        (/^[a-zà-ÿ(]/.test(line) || (lastLine.length >= 60 && !/[.!?:;"”’)]$/.test(lastLine)));
      if (wrapped) cur += ' ' + line;
      else { if (cur) out.push(cur); cur = line; }
      lastLine = line;
    }
    if (cur) out.push(cur);
  }
  return out.join('\n') + '\n';
}

function pieceText(item) {
  if (!item.pdf || !exists(item.pdf)) return null;
  const txt = 'tools/pdf-tekst/' + path.basename(item.pdf, '.pdf') + '.txt';
  if (!exists(txt)) {
    const raw = pdftotext(item.pdf);
    if (raw == null) { console.warn('WARNING ' + item.id + ': pdftotext not found; page made without the PDF text'); return null; }
    fs.mkdirSync(path.join(root, 'tools/pdf-tekst'), { recursive: true });
    write(txt, cleanText(raw));
    if (raw.trim().split(/\s+/).length < 30) console.warn('WARNING ' + item.id + ': hardly any text in ' + item.pdf + ' (scanned image?). Type it into ' + txt);
  }
  const content = read(txt);
  // a decorative font without text mapping comes out as ���; those words must be typed in by hand
  if (content.includes('�')) console.warn('WARNING ' + item.id + ': unreadable characters (�) in ' + txt + '. Replace them with the words from the PDF.');
  return content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function textToHtml(lines) {
  let html = '', inList = false;
  for (const l of lines) {
    const li = l.startsWith('- ');
    if (li && !inList) html += '\n        <ul>';
    if (!li && inList) html += '\n        </ul>';
    inList = li;
    html += li ? '\n          <li>' + esc(l.slice(2)) + '</li>' : '\n        <p>' + esc(l) + '</p>';
  }
  return html + (inList ? '\n        </ul>' : '') + '\n      ';
}

// meta description: "Series, label: first real paragraph…" (max ~160 characters)
function description(item, s, lines) {
  const head = s.name + ', ' + item.label;
  // first real paragraph: not a list item, not the letterhead line ("Qigong en Coaching …"),
  // not a table of contents (❖ / ∞), and at least one full sentence
  const para = (lines || []).find((l) => !l.startsWith('- ') && l.length >= 80 &&
    !/^Qigong en Coaching\b/.test(l) && !/[❖∞]/.test(l) && /[.!?](\s|$)/.test(l));
  if (!para) return head + ', geschreven door Petra Koolen van Ko-Chi Qigong.';
  const room = 158 - head.length - 2;
  let ex = para.replace(/^[~\s]+/, '');
  if (ex.length > room) ex = ex.slice(0, room).replace(/\s+\S*$/, '').replace(/[,;:]$/, '') + '…';
  return head + ': ' + ex;
}

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

// ---- the template filled in for one piece ----
const TEMPLATE = 'inspiratie-stuk.html';
function filled(item) {
  const s = SERIES[item.s];
  const html = inMain(read(TEMPLATE), (b) => fill(b, {
    item, series: s,
    hasPdf: !!item.pdf, noPdf: !item.pdf, pdfLoading: true,
    related: ITEMS.filter((i) => i.s === item.s && i.id !== item.id).slice(0, 8)
  }));
  return must(html, /(\.d-tagStyle\.d-tagStyle \{[^}]*color: )#[0-9A-Fa-f]{3,6}/, '$1' + s.color, 'the .d-tagStyle colour');
}

// inspiratie-stuk.html itself: static copy shows the newest piece
write(TEMPLATE, filled(ITEMS[0]));

// ---- one page per piece ----
const GEN = '<!-- generated by tools/sync-inspiratie.js from inspiratie-stuk.html: edit that file (and assets/inspiratie-data.js), then run the script -->';
const MOVED = '<!-- generated by tools/sync-inspiratie.js: old address of a piece -->';
let words = 0, withText = 0;
for (const item of ITEMS) {
  const s = SERIES[item.s];
  const url = BASE + item.href;
  const title = s.name + ': ' + item.label;
  const lines = pieceText(item);
  const desc = description(item, s, lines);
  const count = lines ? lines.join(' ').split(/\s+/).length : 0;
  if (lines) { words += count; withText++; }

  let html = filled(item);
  html = must(html, /<!-- TEMPLATE[\s\S]*?-->\r?\n/, '', 'the TEMPLATE comment');
  html = must(html, /<!-- template-only: -->[\s\S]*?<!-- \/template-only -->\r?\n/, '', 'the template-only block');
  html = must(html, /^<!DOCTYPE html>\r?\n/, '<!DOCTYPE html>\n' + GEN + '\n', '<!DOCTYPE html>');
  html = must(html, /<meta name="description" content="[^"]*">/,
    '<meta name="description" content="' + esc(desc) + '">\n<link rel="canonical" href="' + esc(url) + '">\n<meta property="og:url" content="' + esc(url) + '">',
    'meta description');
  html = must(html, /<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="article">', 'og:type');
  html = must(html, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(title + ' - Ko-Chi Qigong') + '">', 'og:title');
  html = must(html, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(desc) + '">', 'og:description');
  html = must(html, /<title>[^<]*<\/title>/, '<title>' + esc(title + ' - Ko-Chi Qigong') + '</title>', '<title>');
  html = must(html, /<body data-page="inspiratie-stuk">/, '<body data-page="inspiratie-stuk" data-id="' + esc(item.id) + '">', '<body data-page="inspiratie-stuk">');
  html = must(html, /(<div class="visually-hidden" data-pdf-tekst>)[\s\S]*?(<\/div>)/,
    (m, a, b) => a + (lines ? textToHtml(lines) : '') + b, 'the <div … data-pdf-tekst> for the PDF text');
  html = putInHead(html, pieceGraph({
    url, headline: title, description: desc, words: count,
    image: BASE + item.img,
    pdf: item.pdf ? BASE + item.pdf : null,
    seriesName: s.name,
    inspiratieUrl: BASE + 'inspiratie.html'
  }));
  write(item.href, html);
}

// ---- pages whose address changed (or whose piece was removed) ----
for (const f of fs.readdirSync(root)) {
  if (!/^inspiratie-.+\.html$/.test(f) || f === TEMPLATE || hrefs.has(f)) continue;
  const html = read(f);
  if (!html.includes(GEN) && !html.includes(MOVED)) continue; // not ours
  const id = (html.match(/(?:data-id|piece id)="([^"]+)"/) || [])[1];
  const item = ITEMS.find((i) => i.id === id);
  if (!item) {
    fs.unlinkSync(path.join(root, f));
    console.warn('REMOVED    ' + f + ' (its piece is no longer in assets/inspiratie-data.js; links to it now give the 404 page)');
    continue;
  }
  write(f, `<!DOCTYPE html>
${MOVED}
<!-- piece id="${esc(item.id)}" -->
<html lang="nl">
<head>
<meta charset="utf-8">
<title>Ko-Chi Qigong</title>
<link rel="canonical" href="${esc(BASE + item.href)}">
<meta http-equiv="refresh" content="0; url=${esc(item.href)}">
<script>location.replace(${JSON.stringify(item.href)} + location.search + location.hash);</script>
</head>
<body>
<p>Deze pagina is verhuisd: <a href="${esc(item.href)}">ga verder</a>.</p>
</body>
</html>
`);
}

// ---- links written as inspiratie-stuk.html?id=… in the other pages ----
for (const f of fs.readdirSync(root)) {
  if (!f.endsWith('.html')) continue;
  const html = read(f);
  const out = html.replace(/href="inspiratie-stuk\.html\?id=([\w-]+)"/g, (m, id) => {
    const item = ITEMS.find((i) => i.id === id);
    if (!item) { console.warn('WARNING ' + f + ': link to unknown piece ?id=' + id); return m; }
    return 'href="' + item.href + '"';
  });
  if (out !== html) write(f, out);
}

// ---- sitemap.xml ----
const sm = read('sitemap.xml');
const base = sm.match(/<loc>(.*?)inspiratie\.html<\/loc>/);
if (!base) throw new Error('sitemap.xml has no inspiratie.html entry to add the pieces after');
const lines = ITEMS.map((i) => '  <url><loc>' + base[1] + i.href + '</loc></url>\n').join('');
write('sitemap.xml', sm
  .replace(/[ \t]*<url><loc>[^<]*inspiratie-[\w-]+\.html(\?id=[^<]*)?<\/loc><\/url>\r?\n/g, '')
  .replace(/(<url><loc>[^<]*inspiratie\.html<\/loc><\/url>\r?\n)/, '$1' + lines));

console.log(ITEMS.length + ' pieces: ' + series.map((x) => x.name + ' ' + x.items.length).join(', '));
console.log(withText + ' piece pages with PDF text, ' + words + ' words in total');
writeLlms();
