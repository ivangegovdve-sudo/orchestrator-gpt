const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const projectDirectories = [
  'avatar-playground', 'c2c-dolphin', 'c2c-self', 'council', 'hypertrophyos', 'kids',
  'library', 'life-in-time', 'manifesto-newborn', 'mendeleev-bg', 'morning-news', 'm-popova',
  'open-overview', 'power-law-odyssey', 'replicator-void', 'vfx-portfolio', 'womens-health-os',
  'math-forest', 'ai-research', 'calendar', 'chloe-pwa', 'evolution', 'kids-movie-library',
  'math-mania', 'upload', 'explore', 'ai-init', 'llm-db', 'tinylm',
];

async function inventory() {
  return import(`${pathToFileURL(path.join(ROOT, 'web/shared/route-inventory.mjs')).href}?v=20260729g`);
}

test('route inventory owns every project directory exactly once with machine-readable delivery controls', async () => {
  const { ROUTE_INVENTORY } = await inventory();
  assert.equal(ROUTE_INVENTORY.length, projectDirectories.length);
  assert.deepEqual(
    [...ROUTE_INVENTORY.map((entry) => entry.id)].sort(),
    [...projectDirectories].sort(),
  );

  for (const entry of ROUTE_INVENTORY) {
    assert.deepEqual(
      Object.keys(entry).filter((key) => ['id', 'href', 'state', 'parent', 'placement', 'prefetch', 'prerender'].includes(key)).sort(),
      ['href', 'id', 'parent', 'placement', 'prefetch', 'prerender', 'state'],
      `${entry.id} exposes the inventory contract`,
    );
    assert.match(entry.href, /^\/web\/[a-z0-9-]+\/$/);
    assert.equal(typeof entry.prefetch, 'boolean');
    assert.equal(typeof entry.prerender, 'boolean');
  }

  assert.deepEqual(
    Object.fromEntries(ROUTE_INVENTORY.map(({ id, state }) => [id, state])),
    {
      'avatar-playground': 'main-atlas', 'c2c-dolphin': 'main-atlas', 'c2c-self': 'main-atlas',
      council: 'main-atlas', hypertrophyos: 'main-atlas', kids: 'main-atlas', library: 'main-atlas',
      'life-in-time': 'main-atlas', 'manifesto-newborn': 'main-atlas', 'mendeleev-bg': 'main-atlas',
      'morning-news': 'main-atlas', 'm-popova': 'main-atlas', 'open-overview': 'main-atlas',
      'power-law-odyssey': 'main-atlas', 'replicator-void': 'main-atlas', 'vfx-portfolio': 'main-atlas',
      'womens-health-os': 'main-atlas', 'math-forest': 'greenhouse', 'ai-research': 'hub-trail',
      calendar: 'hub-trail', 'chloe-pwa': 'hub-trail', evolution: 'hub-trail',
      'kids-movie-library': 'hub-trail', 'math-mania': 'hub-trail', upload: 'hub-trail',
      explore: 'hub-trail',
      'ai-init': 'redirect', 'llm-db': 'redirect', tinylm: 'redirect',
    },
  );
});

test('Forest Trails consumes and re-exports the canonical route inventory', async () => {
  const [{ ROUTE_INVENTORY }, trails] = await Promise.all([
    inventory(),
    import(pathToFileURL(path.join(ROOT, 'web/shared/forest-trails.mjs')).href),
  ]);
  assert.equal(trails.ROUTE_INVENTORY, ROUTE_INVENTORY);
  assert.ok(trails.FOREST_ROUTES.some(({ id }) => id === 'chloe-pwa'));
  const chloe = trails.FOREST_ROUTES.find(({ id }) => id === 'chloe-pwa');
  assert.equal(chloe.label, 'Private client — token required');
  assert.equal(chloe.path, '/web/chloe-pwa/');
  const trailIds = new Set(trails.FOREST_ROUTES.map(({ id }) => id));
  for (const entry of ROUTE_INVENTORY.filter(({ state }) => state !== 'redirect')) {
    assert.ok(trailIds.has(entry.id), `${entry.id} is represented by Forest Trails`);
  }
});

test('only exact AI_INIT parent routes redirect while embeds, glossary assets, and Library imports remain reachable', () => {
  const redirect = read('web/ai-init/index.html');
  assert.ok(redirect.split(/\r?\n/).length < 100, 'AI_INIT redirect stays minimal');
  assert.doesNotMatch(redirect, /glossary-(?:data|search)|home-search-input|library-tree/i);
  assert.match(redirect, /http-equiv="refresh"[^>]*\/web\/library\//i);
  assert.match(redirect, /rel="canonical" href="\/web\/library\//i);
  assert.match(redirect, /name="robots" content="noindex"/i);
  assert.match(redirect, /class="forest-back" href="\/"/i);
  assert.match(redirect, /href="\/web\/library\/"/i);
  assert.match(redirect, /location\.replace\("\/web\/library\/"\)/);
  for (const asset of ['web/ai-init/embed/index.html', 'web/ai-init/glossary-data.js', 'web/ai-init/glossary-search.js']) {
    assert.ok(fs.statSync(path.join(ROOT, asset)).size > 0, `${asset} remains available`);
  }
  assert.match(read('web/library/index.html'), /src="\/web\/ai-init\/glossary-data\.js/);
});

test('AI_INIT Vercel redirects cover only exact parent paths', () => {
  const redirects = JSON.parse(read('vercel.json')).redirects;
  const aiInit = redirects.filter(({ source }) => source.startsWith('/web/ai-init'));
  assert.deepEqual(aiInit, [
    { source: '/web/ai-init', destination: '/web/library/', permanent: true },
    { source: '/web/ai-init/', destination: '/web/library/', permanent: true },
  ]);
});

test('canonical project pages retain explicit forest-back ownership links', async () => {
  const { ROUTE_INVENTORY } = await inventory();
  const kidsChildren = new Set(['kids-movie-library', 'math-mania']);
  for (const entry of ROUTE_INVENTORY.filter(({ state }) => state !== 'redirect')) {
    const source = read(`web/${entry.id}/index.html`);
    assert.match(
      source,
      /<link rel="stylesheet" href="\/web\/shared\/forest-shell\.css\?v=20260729g">/,
      `${entry.id} loads the shared forest-back styling`,
    );
    const expectedHref = kidsChildren.has(entry.id) ? '/web/kids/' : '/';
    const expectedLabel = kidsChildren.has(entry.id) ? '← Kids Corner' : '← SDForest';
    assert.match(
      source,
      new RegExp(`<a\\b[^>]*class="[^"]*forest-back[^"]*"[^>]*href="${expectedHref.replace('/', '\\/')}"[^>]*>${expectedLabel}`),
      `${entry.id} exposes its canonical parent return`,
    );
  }
});

test('landing portals restore direct C2C destinations', () => {
  const home = read('index.html');
  assert.match(home, /data-project="c2c-dolphin"[^>]*data-href="\/web\/c2c-dolphin\/"/);
  assert.match(home, /data-project="c2c-self"[^>]*data-href="\/web\/c2c-self\/"/);
});

test('Poetry remains one main-atlas portal while Calendar remains trail-only', async () => {
  const { ROUTE_INVENTORY } = await inventory();
  const poetry = ROUTE_INVENTORY.find(({ id }) => id === 'm-popova');
  const calendar = ROUTE_INVENTORY.find(({ id }) => id === 'calendar');
  assert.equal(poetry.state, 'main-atlas');
  assert.equal(calendar.state, 'hub-trail');

  const home = read('index.html');
  const projectGrid = home.match(/<div class="project-grid" data-project-grid>[\s\S]*?<\/section>/)?.[0] || '';
  assert.equal(
    (projectGrid.match(/data-href="\/web\/m-popova\/"/g) || []).length,
    1,
    'Poetry has exactly one landing portal',
  );
  assert.equal(
    (projectGrid.match(/data-href="\/web\/calendar\/"/g) || []).length,
    0,
    'Calendar has no landing portal',
  );
});
