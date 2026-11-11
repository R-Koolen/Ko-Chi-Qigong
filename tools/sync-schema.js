// Ko-Chi Qigong — writes the structured data (schema.org JSON-LD, see tools/schema.js) into the
// <head> of every normal page, and rewrites llms.txt (see tools/llms.js). Visitors don't see
// either; Google and AI assistants read them.
//
//   node tools/sync-schema.js
//
// Run it after changing tools/schema.js, or a page's <title> / <meta name="description">.
// The inspiratie piece pages get theirs from tools/sync-inspiratie.js.
const fs = require('fs');
const path = require('path');
const { PAGES, pageGraph, putInHead, pageReader } = require('./schema.js');
const { writeLlms } = require('./llms.js');

const root = path.join(__dirname, '..');
const pageInfo = pageReader(root);

let changed = 0;
for (const file of Object.keys(PAGES)) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const out = putInHead(html, pageGraph(file, pageInfo));
  if (out !== html) { fs.writeFileSync(path.join(root, file), out); changed++; console.log('updated    ' + file); }
  else console.log('unchanged  ' + file);
}
console.log(Object.keys(PAGES).length + ' pages, ' + changed + ' updated');
writeLlms();
