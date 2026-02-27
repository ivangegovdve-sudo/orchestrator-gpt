const fs = require('node:fs');
const assert = require('node:assert/strict');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const indexHtml = read('web/ai-init/index.html');
const appJs = read('web/ai-init/app.js');
const embedHtml = read('web/ai-init/embed/index.html');

const forbidden = [
  'Send to Orchestrator GPT',
  'orchText',
  'front-panel',
  'Transfer to Orchestrator GPT',
  'A-Z',
  'first letter',
  'alphabet filter',
];

for (const token of forbidden) {
  assert.equal(indexHtml.includes(token), false, `Forbidden token found: ${token}`);
}

const requiredIndex = [
  'id="home-view"',
  'id="home-search-input"',
  'id="home-library-button"',
  'id="home-search-button"',
  'id="library-view"',
  'id="library-tree"',
  'id="copy-toast"',
  'bookHoverLoop',
];

for (const token of requiredIndex) {
  assert.equal(indexHtml.includes(token), true, `Required token missing in index: ${token}`);
}

const requiredAppTokens = [
  'switchView',
  'renderHomeResults',
  'renderLibraryTree',
  'copyEntry',
  'state.homeActiveIndex',
];

for (const token of requiredAppTokens) {
  assert.equal(appJs.includes(token), true, `Required app behavior token missing: ${token}`);
}

assert.equal(embedHtml.includes('embed-search-input'), true, 'Embed search input missing');
assert.equal(embedHtml.includes('../glossary-search.js'), true, 'Embed page not wired to shared search module');

console.log('glossary lint/static checks passed');
