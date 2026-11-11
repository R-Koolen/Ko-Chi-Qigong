// Ko-Chi Qigong — Inspiratie data, used by inspiratie.html and the piece pages (inspiratie-….html).
//
// To add a piece: add one line at the top of ITEMS (newest first):
//   ['id', 'series', 'Label', year, 'image-name', 'pdf-name']
//   - series:     'energie', 'geluk' or 'nb' (see SERIES)
//   - image-name: file in assets/insp/ without .webp. A .png/.jpg also works if you write the
//                 extension ('nb-nieuw.png'), but WebP is ~45% smaller: convert at squoosh.app
//                 (WebP, lossless) or with:  python tools/optimize-images.py
//   - pdf-name:   file in assets/pdf/ without .pdf (leave out if there is no PDF yet → "PDF volgt")
// Then run:  node tools/sync-inspiratie.js
//   → writes one page per piece (inspiratie-<series>-<label>.html, e.g. inspiratie-nieuwsbrief-het-zaadje.html)
//     with the text of its PDF in it (for Google, AI assistants and screen readers), updates the
//     static copy in inspiratie.html and the piece list in sitemap.xml, and warns about missing images/PDFs.
//   The page address comes from the series name + label. Changing a label later changes the
//   address; the script then turns the old page into a redirect, so old links keep working.

var SERIES = {
  energie: { key: 'energie', name: 'Bewust-zijn met energie', unit: 'edities', color: '#A1565B', photo: 'assets/meditatie-clouds.webp', ctaTitle: 'Doe mee met de volgende editie', cta: 'Schrijf je in', ctaHref: 'voor-particulieren.html#Agenda' },
  geluk: { key: 'geluk', name: 'Ontdek de sleutels tot geluk', unit: 'edities', color: '#5b739e', photo: 'assets/strandpalen-beach.webp', ctaTitle: 'Doe mee met de volgende cursus', cta: 'Schrijf je in', ctaHref: 'voor-particulieren.html#Agenda' },
  nb: { key: 'nb', name: 'Nieuwsbrief', unit: 'nummers', color: '#1F3864', photo: 'assets/hero-china.webp', ctaTitle: 'Ontvang de nieuwsbrief', cta: 'Aanmelden', ctaHref: 'contact.html' }
};
var ITEMS = [
  ['e7','energie','28 juni 2026',2026,'energie-28juni-2026','energie-28-juni-2026'],
  ['n10','nb','Het zaadje',2026,'nb-zaadje-hq','nieuwsbrief-het-zaadje'],
  ['e6','energie','26 april 2026',2026,'energie-26april-2026','energie-26-april-2026'],
  ['n13','nb','Podcast',2026,'nb-podcast','nieuwsbrief-podcast'],
  ['n12','nb','Wat is geluk?',2026,'nb-wat-is-geluk','nieuwsbrief-wat-is-geluk'],
  ['n9','nb','Eindejaar: Wie weet?',2025,'nb-eindejaar','nieuwsbrief-eindejaar'],
  ['n11','nb','Angst, paraplu en innerlijke wijsheid',2025,'nb-angst','nieuwsbrief-angst'],
  ['g4','geluk','Editie 2025',2025,'geluk-2025','geluk-2025'],
  ['e5','energie','November 2024',2024,'energie-november-2024','energie-november-2024'],
  ['e4','energie','1 juni 2024',2024,'energie-juni2024-hq','energie-1-juni-2024'],
  ['g3','geluk','Editie 2024',2024,'geluk-2024','geluk-2024'],
  ['n8','nb','Januari 2024',2024,'nb-jan2024','nieuwsbrief-januari-2024'],
  ['e3','energie','Februari 2024',2024,'energie-2024','energie-februari-2024'],
  ['g2','geluk','Najaar 2023',2023,'geluk-2023','geluk-najaar-2023'],
  ['e2','energie','Oktober 2023',2023,'energie-2023','energie-oktober-2023'],
  ['n7','nb','September 2023',2023,'nb-sep2023','nieuwsbrief-september-2023'],
  ['n6','nb','April 2023',2023,'nb-apr2023','nieuwsbrief-april-2023'],
  ['e1','energie','Mei en juni 2023',2023,'energie-meijuni2023','energie-mei-juni-2023'],
  ['g1','geluk','Week 8: Gelukkiger worden',2023,'geluk-w8','geluk-week-8'],
  ['n2','nb','Januari 2023',2023,'nb-jan2023','nieuwsbrief-januari-2023'],
  ['n5','nb','Oktober 2022',2022,'nb-oktober','nieuwsbrief-oktober-2022'],
  ['n4','nb','Augustus 2022',2022,'nb-augustus','nieuwsbrief-augustus-2022'],
  ['n3','nb','April 2022',2022,'nb-april','nieuwsbrief-april-2022']
].map(([id, s, label, year, img, pdf]) => ({ id, s, label, year, img: 'assets/insp/' + img + (/\.\w+$/.test(img) ? '' : '.webp'), pdf: pdf ? 'assets/pdf/' + pdf + '.pdf' : null, href: 'inspiratie-' + slug(SERIES[s].name + ' ' + label) + '.html' }));

// 'Ontdek de sleutels tot geluk Editie 2025' → 'ontdek-de-sleutels-tot-geluk-editie-2025'
function slug(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
