const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

function openingTag(source, tagName, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.match(new RegExp(`<${tagName}\\b[^>]*\\bid="${escapedId}"[^>]*>`, 'i'))?.[0] || '';
}

async function loadForestTrails() {
  return import(pathToFileURL(path.join(repoRoot, 'web/shared/forest-trails.js')).href);
}

test('Knowledge Ingest resolves as a connected Signals & Systems trail', async () => {
  const trails = await loadForestTrails();
  const context = trails.getForestTrailContext('/web/upload/index.html?source=trail');

  assert.equal(context.current.label, 'Knowledge Ingest');
  assert.equal(context.current.path, '/web/upload/');
  assert.equal(context.trail.label, 'Signals & Systems');
  assert.ok(context.next.length >= 2);

  const routeIds = new Set(trails.FOREST_ROUTES.map(({ id }) => id));
  for (const connectionId of context.current.connectionIds) {
    assert.ok(routeIds.has(connectionId), `upload connection ${connectionId} must resolve`);
  }
});

test('Mendeleev search and element-cell actions expose keyboard-native names', () => {
  const source = read('web/mendeleev-bg/index.html');
  const search = openingTag(source, 'input', 'searchInput');

  assert.match(search, /\baria-label="[^"]+"/i);
  assert.match(source, /<button type="button" class="n"[^>]*aria-label=/);
  assert.match(source, /<button type="button" class="sym-wrap"[^>]*aria-label=/);
  assert.doesNotMatch(source, /<span class="n"[^>]*>/);
  assert.doesNotMatch(source, /<div class="sym-wrap"[^>]*>/);
});

test('Life in Time labels are explicitly bound to their controls', () => {
  const source = read('web/life-in-time/index.html');

  for (const id of ['birthYear', 'parentYear', 'childYear', 'lifeExp']) {
    assert.match(source, new RegExp(`<label\\s+for="${id}"[^>]*>`));
  }
});

test('Women’s Health evidence tabs and inputs expose their interaction semantics', () => {
  const source = read('web/womens-health-os/index.html');
  const tabs = openingTag(source, 'div', 'tabs');
  const search = openingTag(source, 'input', 'search');
  const topic = openingTag(source, 'select', 'topic');
  const chatInput = openingTag(source, 'input', 'whChatInput');

  assert.match(tabs, /\brole="tablist"/);
  assert.match(tabs, /\baria-label="[^"]+"/);
  for (const tab of ['facts', 'rules', 'claims', 'papers', 'cycle']) {
    assert.match(
      source,
      new RegExp(
        `<button\\b[^>]*\\bid="tab-${tab}"[^>]*\\brole="tab"[^>]*`
          + `\\baria-controls="view"[^>]*\\baria-selected="(?:true|false)"[^>]*>`,
      ),
    );
  }
  assert.match(search, /\baria-label="[^"]+"/);
  assert.match(topic, /\baria-label="[^"]+"/);
  assert.match(source, /<input id="api-input"[^>]*aria-label="[^"]+"/);
  assert.match(chatInput, /\baria-label="[^"]+"/);
});

test('Women’s Health research chat behaves as a labelled modal with focus return', () => {
  const source = read('web/womens-health-os/index.html');
  const fab = openingTag(source, 'button', 'whChatFab');
  const panel = openingTag(source, 'section', 'whChatPanel');

  assert.match(fab, /\baria-controls="whChatPanel"/);
  assert.match(fab, /\baria-expanded="false"/);
  assert.match(panel, /\brole="dialog"/);
  assert.match(panel, /\baria-modal="true"/);
  assert.match(panel, /\baria-labelledby="whChatTitle"/);
  assert.match(panel, /\baria-hidden="true"/);
  assert.match(source, /id="whChatTitle"/);
  assert.match(source, /function openChat\(\)/);
  assert.match(source, /function closeChat\(\)/);
  assert.match(source, /fab\.focus\(\)/);
  assert.match(source, /e\.key === "Escape"/);
  assert.match(source, /e\.key !== "Tab"/);
});

test('Kids Corner keeps card emoji decorative for assistive technology', () => {
  const source = read('web/kids/index.html');
  const icons = [...source.matchAll(/<div class="kid-icon"[^>]*>/g)].map(([tag]) => tag);

  assert.equal(icons.length, 2);
  for (const icon of icons) assert.match(icon, /\baria-hidden="true"/);
});
