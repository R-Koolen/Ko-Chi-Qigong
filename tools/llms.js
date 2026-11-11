// Ko-Chi Qigong — writes llms.txt: a short Markdown overview of the site for AI assistants
// (proposal: https://llmstxt.org). Rewritten automatically by tools/sync-schema.js and
// tools/sync-inspiratie.js, so don't edit llms.txt itself.
//
// Edit here: INTRO (the text at the top), SECTIONS and SERIES_INTRO. The page links and their
// one-line descriptions come from each page's <title> and <meta name="description">; the
// inspiratie pieces from assets/inspiratie-data.js.
//
// Note: like robots.txt, llms.txt only counts at the root of a domain, so it starts working
// after the switch to www.kochi-qigong.nl.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { BASE, PAGES, pageReader } = require('./schema.js');

const INTRO = `# Ko-Chi Qigong

> Ko-Chi Qigong is de praktijk van Petra Koolen in Geldermalsen. Ze geeft Qigong-lessen, coaching, meditatie en workshops aan particulieren en organisaties: in Geldermalsen, op locatie in heel Nederland of online.

Petra Koolen is coach sinds 2006 en doet Qigong sinds 2014. Ze trainde bij Chinese leermeesters en reisde naar China. Elke woensdag om 19:30 geeft ze buiten in Geldermalsen de groepsles Nature Qigong. Een kennismakingsgesprek voor coaching is gratis, en voor Qigong is er een proefles. Alle prijzen staan op de pagina Tarieven.

Contact: kochi.qigong@gmail.com, telefoon en WhatsApp 06 525 357 21.
`;

// heading → pages (in this order)
const SECTIONS = {
  'Voor particulieren': ['voor-particulieren.html', 'qigong.html', 'coaching.html', 'meditatie.html', 'tarieven.html', 'over-mij.html'],
  'Voor organisaties': ['voor-organisaties.html', 'leiderschap-en-teams.html', 'coaching-professionals.html', 'vitaliteit-werkvloer.html', 'mijn-visie.html'],
  'Algemeen': ['index.html', 'inspiratie.html', 'contact.html']
};

const SERIES_INTRO = {
  energie: "Uitnodigingen voor de dagworkshop 'Bewust-zijn met energie', over het voelen van en werken met je levensenergie (Chi).",
  geluk: "Flyers en een les uit de 8-weekse thuiscursus 'Ontdek de sleutels tot geluk'.",
  nb: 'Nieuwsbrieven van Petra Koolen: korte stukken over Qigong, emoties, geluk en de seizoenen, en aankondigingen van lessen en workshops.'
};

function writeLlms() {
  const root = path.join(__dirname, '..');
  const pageInfo = pageReader(root);
  const data = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/inspiratie-data.js'), 'utf8') + '\nthis.SERIES = SERIES; this.ITEMS = ITEMS;', data);

  const listed = Object.values(SECTIONS).flat();
  Object.keys(PAGES).filter((f) => !listed.includes(f)).forEach((f) => console.warn('WARNING ' + f + ' is not in a section of tools/llms.js'));

  const line = (title, url, desc) => '- [' + title + '](' + url + ')' + (desc ? ': ' + desc : '');
  let out = INTRO;
  for (const [heading, files] of Object.entries(SECTIONS)) {
    out += '\n## ' + heading + '\n\n';
    out += files.map((f) => { const p = pageInfo(f); return line(p.name, p.url, p.description); }).join('\n') + '\n';
  }
  for (const key of Object.keys(data.SERIES)) {
    const s = data.SERIES[key];
    out += '\n## Inspiratie: ' + s.name + '\n\n' + (SERIES_INTRO[key] ? SERIES_INTRO[key] + '\n\n' : '');
    out += data.ITEMS.filter((i) => i.s === key).map((i) => {
      // the piece page's description is "Series, label: first sentences…"; keep the sentences
      const prefix = s.name + ', ' + i.label + ': ';
      const desc = fs.existsSync(path.join(root, i.href)) ? pageInfo(i.href).description : '';
      const d = desc.startsWith(prefix) ? desc.slice(prefix.length) : '';
      return line(i.label, BASE + i.href, d);
    }).join('\n') + '\n';
  }

  const file = path.join(root, 'llms.txt');
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === out) return;
  fs.writeFileSync(file, out);
  console.log('updated    llms.txt');
}

module.exports = { writeLlms };
