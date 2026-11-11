const BASE = 'https://www.kochi-qigong.nl/';

const ORG = BASE + '#organisatie';
const PETRA = BASE + '#petra';
const SITE = BASE + '#website';
const ref = (id) => ({ '@id': id });

const organisation = {
  '@type': 'ProfessionalService',
  '@id': ORG,
  name: 'Ko-Chi Qigong',
  alternateName: 'Ko-Chi Qigong & Coaching',
  description: 'Coaching, Qigong, meditatie en workshops voor particulieren en organisaties. In de praktijk in Geldermalsen, op locatie door heel Nederland of online.',
  url: BASE,
  logo: BASE + 'assets/logo.png',
  image: BASE + 'assets/og/home.jpg',
  email: 'kochi.qigong@gmail.com',
  telephone: '+31652535721',
  address: { '@type': 'PostalAddress', addressLocality: 'Geldermalsen', addressCountry: 'NL' },
  areaServed: { '@type': 'Country', name: 'Nederland' },
  founder: ref(PETRA),
  vatID: 'NL005383130B08',
  identifier: { '@type': 'PropertyValue', propertyID: 'KvK-nummer', value: '99393379' },
  priceRange: '€13 - €170',
  knowsLanguage: 'nl',
  sameAs: ['https://www.facebook.com/profile.php?id=100077919487021']
};

const petra = {
  '@type': 'Person',
  '@id': PETRA,
  name: 'Petra Koolen',
  jobTitle: 'Coach en Qigong-docente',
  description: 'Petra Koolen is coach sinds 2006 en doet Qigong sinds 2014. Ze trainde bij Chinese leermeesters, reisde naar China en volgde The Science of Well-Being. Ze werkt als (emotie)coach, mindfulnessinstructeur en Qigong-docente.',
  url: BASE + 'over-mij.html',
  image: BASE + 'assets/portret-petra.webp',
  worksFor: ref(ORG),
  knowsAbout: ['Qigong', 'Coaching', 'Emotiecoaching', 'Mindfulness', 'Meditatie', 'Levensenergie (Chi)', 'Familieopstellingen'],
  knowsLanguage: 'nl',
  sameAs: ['https://www.linkedin.com/in/petra-koolen-7aaa9b13/']
};

const website = {
  '@type': 'WebSite',
  '@id': SITE,
  url: BASE,
  name: 'Ko-Chi Qigong',
  inLanguage: 'nl-NL',
  publisher: ref(ORG)
};

// ---- services (prices as on tarieven.html) ----
const offer = (name, price) => ({ '@type': 'Offer', name, price: String(price), priceCurrency: 'EUR' });
const PARTICULIEREN = { '@type': 'Audience', audienceType: 'Particulieren' };
const ORGANISATIES = { '@type': 'BusinessAudience', audienceType: 'Organisaties, teams en leidinggevenden' };

const SERVICES = {
  qigong: {
    page: 'qigong.html', name: 'Qigong', serviceType: 'Qigong-lessen en -trainingen', audience: PARTICULIEREN,
    offers: [
      offer('Groepstraining Nature Qigong (buiten, woensdagavond, Geldermalsen), losse les', 20),
      offer('Groepstraining Nature Qigong, lidmaatschap per periode van 8 weken (€16 per les)', 128),
      offer('Qigong privéles, per uur', 95),
      offer('Qigong training op maat, per keer (incl. videobestand)', 170),
      offer('Qigong proefles', 13)
    ]
  },
  coaching: {
    page: 'coaching.html', name: 'Coaching', serviceType: 'Persoonlijke coaching en emotiecoaching', audience: PARTICULIEREN,
    offers: [
      offer('Coaching voor particulieren, per uur', 95),
      offer('Kennismakingsgesprek (max. 30 minuten, live of online)', 0)
    ]
  },
  meditatie: {
    page: 'meditatie.html', name: 'Meditatie', serviceType: 'Meditatiebegeleiding', audience: PARTICULIEREN,
    offers: [offer('Meditatie privésessie (max. 30 minuten)', 50)]
  },
  teams: {
    page: 'leiderschap-en-teams.html', name: 'Workshop leiderschap en teams', serviceType: 'Teamworkshop', audience: ORGANISATIES
  },
  professionals: {
    page: 'coaching-professionals.html', name: 'Coaching voor professionals', serviceType: 'Zakelijke coaching', audience: ORGANISATIES
  },
  werkvloer: {
    page: 'vitaliteit-werkvloer.html', name: 'Vitaliteit en ontspanning op de werkvloer (Qigong op het werk)', serviceType: 'Vitaliteitsprogramma', audience: ORGANISATIES
  }
};

// "De sleutels tot Geluk" (voor-particulieren.html#Agenda): a home course by email, a fixed product.
const sleutelsTotGeluk = {
  '@type': 'Course',
  '@id': BASE + 'voor-particulieren.html#sleutels-tot-geluk',
  name: 'De sleutels tot Geluk',
  description: 'Een 8-weekse thuiscursus per e-mail: acht sleutels tot meer geluk, elk met wetenschappelijk onderbouwde uitleg, achtergrondinformatie en een eenvoudige oefening. In je eigen tempo, vanaf circa 15 minuten per week.',
  provider: ref(ORG),
  author: ref(PETRA),
  inLanguage: 'nl',
  offers: { '@type': 'Offer', price: '80', priceCurrency: 'EUR', category: 'Paid' },
  hasCourseInstance: {
    '@type': 'CourseInstance', courseMode: 'Online', instructor: ref(PETRA),
    courseSchedule: { '@type': 'Schedule', repeatFrequency: 'Weekly', repeatCount: 8 }
  }
};

// ---- the pages ----
// label:    short name, as in the menu (breadcrumb, llms.txt); the full name is the page's <title>
// type:     schema.org page type (default WebPage)
// parent:   for the breadcrumb (Home › parent › page)
// services: SERVICES keys described on that page
const PAGES = {
  'index.html': { label: 'Home' },
  'voor-particulieren.html': { label: 'Voor Particulieren', services: ['qigong', 'coaching', 'meditatie'], extra: [sleutelsTotGeluk] },
  'qigong.html': { label: 'Qigong', parent: 'voor-particulieren.html', services: ['qigong'] },
  'coaching.html': { label: 'Coaching', parent: 'voor-particulieren.html', services: ['coaching'] },
  'meditatie.html': { label: 'Meditatie', parent: 'voor-particulieren.html', services: ['meditatie'] },
  'over-mij.html': { label: 'Over mij', type: 'ProfilePage', parent: 'voor-particulieren.html', mainEntity: PETRA },
  'tarieven.html': { label: 'Tarieven', parent: 'voor-particulieren.html', services: ['qigong', 'coaching', 'meditatie'] },
  'voor-organisaties.html': { label: 'Voor Organisaties', services: ['teams', 'professionals', 'werkvloer'] },
  'leiderschap-en-teams.html': { label: 'Leiderschap en teams', parent: 'voor-organisaties.html', services: ['teams'] },
  'coaching-professionals.html': { label: 'Coaching voor professionals', parent: 'voor-organisaties.html', services: ['professionals'] },
  'vitaliteit-werkvloer.html': { label: 'Vitaliteit op de werkvloer', parent: 'voor-organisaties.html', services: ['werkvloer'] },
  'mijn-visie.html': { label: 'Mijn visie', type: 'AboutPage', parent: 'voor-organisaties.html', mainEntity: PETRA },
  'inspiratie.html': { label: 'Inspiratie', type: 'CollectionPage' },
  'contact.html': { label: 'Contact', type: 'ContactPage', mainEntity: ORG }
};

// ---- building blocks ----
// pageInfo(file) → { url, name, description, image } read from the page (see sync-schema.js)
function serviceNode(key, pageInfo) {
  const s = SERVICES[key];
  const p = pageInfo(s.page);
  const node = {
    '@type': 'Service',
    '@id': p.url + '#dienst',
    name: s.name,
    serviceType: s.serviceType,
    description: p.description,
    url: p.url,
    provider: ref(ORG),
    areaServed: { '@type': 'Country', name: 'Nederland' },
    audience: s.audience
  };
  if (s.offers) node.offers = s.offers;
  return node;
}

function breadcrumb(id, crumbs) {
  return {
    '@type': 'BreadcrumbList',
    '@id': id,
    itemListElement: crumbs.map((c, n) => ({ '@type': 'ListItem', position: n + 1, name: c.name, item: c.url }))
  };
}

// Structured data for a normal page.
function pageGraph(file, pageInfo) {
  const cfg = PAGES[file];
  if (!cfg) throw new Error(file + ' is not in PAGES (tools/schema.js)');
  const p = pageInfo(file);
  const services = (cfg.services || []).map((k) => serviceNode(k, pageInfo));
  const page = {
    '@type': cfg.type || 'WebPage',
    '@id': p.url + '#webpage',
    url: p.url,
    name: p.name,
    description: p.description,
    inLanguage: 'nl-NL',
    isPartOf: ref(SITE),
    about: ref(ORG),
    primaryImageOfPage: p.image ? { '@type': 'ImageObject', url: p.image } : undefined
  };
  if (cfg.mainEntity) page.mainEntity = ref(cfg.mainEntity);
  if (services.length) page.mentions = services.map((s) => ref(s['@id']));
  const graph = [page, organisation, petra, website, ...services, ...(cfg.extra || [])];
  if (file !== 'index.html') {
    const crumbs = [{ name: 'Home', url: BASE }];
    if (cfg.parent) crumbs.push({ name: PAGES[cfg.parent].label, url: pageInfo(cfg.parent).url });
    crumbs.push({ name: cfg.label, url: p.url });
    page.breadcrumb = ref(p.url + '#kruimelpad');
    graph.push(breadcrumb(p.url + '#kruimelpad', crumbs));
  }
  return graph;
}

// Structured data for an inspiratie piece page.
// a = { url, headline, description, image, pdf, seriesName, words, inspiratieUrl }
function pieceGraph(a) {
  const article = {
    '@type': 'Article',
    '@id': a.url + '#artikel',
    headline: a.headline,
    description: a.description,
    url: a.url,
    mainEntityOfPage: a.url,
    inLanguage: 'nl-NL',
    image: a.image,
    author: ref(PETRA),
    publisher: ref(ORG),
    isPartOf: { '@type': 'CreativeWorkSeries', name: a.seriesName, url: a.inspiratieUrl },
    isAccessibleForFree: true
  };
  if (a.words) article.wordCount = a.words;
  if (a.pdf) article.encoding = { '@type': 'MediaObject', contentUrl: a.pdf, encodingFormat: 'application/pdf' };
  return [
    article,
    breadcrumb(a.url + '#kruimelpad', [
      { name: 'Home', url: BASE },
      { name: 'Inspiratie', url: a.inspiratieUrl },
      { name: a.headline, url: a.url }
    ]),
    organisation, petra, website
  ];
}

// The <script> block that goes into <head>, between markers so the scripts can replace it.
const MARK_START = '<!-- structured data (schema.org) for search engines and AI assistants: generated by tools/schema.js, do not edit here -->';
const MARK_END = '<!-- /structured data -->';
function ldBlock(graph) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1).replace(/<\//g, '<\\/');
  return MARK_START + '\n<script type="application/ld+json">\n' + json + '\n</script>\n' + MARK_END + '\n';
}
// Put the block in a page's <head> (replacing an earlier one).
function putInHead(html, graph) {
  const block = ldBlock(graph);
  const start = html.indexOf(MARK_START);
  if (start >= 0) {
    const end = html.indexOf(MARK_END, start);
    if (end < 0) throw new Error('structured data start marker without end marker');
    return html.slice(0, start) + block + html.slice(end + MARK_END.length).replace(/^\r?\n/, '');
  }
  if (!/<\/head>/.test(html)) throw new Error('no </head>');
  return html.replace(/<\/head>/, block + '</head>');
}

// pageReader(root)(file) → { url, name, description, image }, read from the page's canonical link,
// <title> (without " - Ko-Chi Qigong"), meta description and og:image.
function pageReader(root) {
  const fs = require('fs');
  const path = require('path');
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const cache = {};
  return function pageInfo(file) {
    if (cache[file]) return cache[file];
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const pick = (re, what) => {
      const m = html.match(re);
      if (!m) throw new Error(file + ': no ' + what);
      return decode(m[1]);
    };
    return (cache[file] = {
      url: pick(/<link rel="canonical" href="([^"]+)"/, 'canonical link'),
      name: pick(/<title>([^<]*)<\/title>/, '<title>').replace(/\s+-\s+Ko-Chi Qigong$/, ''),
      description: pick(/<meta name="description" content="([^"]*)"/, 'meta description'),
      image: (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1]
    });
  };
}

module.exports = { BASE, PAGES, pageGraph, pieceGraph, putInHead, pageReader };
