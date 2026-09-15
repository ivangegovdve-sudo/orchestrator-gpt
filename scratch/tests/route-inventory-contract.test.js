const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const registryModule = import('../../scripts/static-route-registry.mjs');
const catalogModule = import('../../web/shared/project-catalog.mjs');

async function inventory() {
  return import(`${pathToFileURL(path.join(ROOT, 'web/shared/route-inventory.mjs')).href}?v=20260807a`);
}

test('actual copied HTML routes have one registry entry and catalog owner independently of navigation', async () => {
  const [{ ROUTE_REGISTRY, discoverCopiedHtmlRoutes }, { ROUTE_OWNERS }] = await Promise.all([
    registryModule, catalogModule,
  ]);
  const discovered = discoverCopiedHtmlRoutes(ROOT);
  assert.equal(discovered.length, 68, 'the current build copies 68 HTML routes');
  for (const { route, source } of discovered) {
    const entries = ROUTE_REGISTRY.filter(({ paths }) => paths.includes(route));
    const owners = ROUTE_OWNERS.filter(({ routes }) => routes.includes(route));
    assert.equal(entries.length, 1, `${route} has one registry entry`);
    assert.equal(owners.length, 1, `${route} has one catalog owner`);
    assert.equal(entries[0].source, source, route);
    assert.equal(entries[0].ownerId, owners[0].id, route);
  }
});

test('Forest Trails uses the navigation compatibility map and only its declared trail IDs', async () => {
  const [{ ROUTE_INVENTORY, FOREST_TRAIL_ROUTE_IDS }, trails] = await Promise.all([
    inventory(),
    import(pathToFileURL(path.join(ROOT, 'web/shared/forest-trails.mjs')).href),
  ]);
  assert.equal(trails.ROUTE_INVENTORY, ROUTE_INVENTORY);
  assert.equal(new Set(ROUTE_INVENTORY.map(({ id }) => id)).size, ROUTE_INVENTORY.length);
  assert.equal(new Set(FOREST_TRAIL_ROUTE_IDS).size, FOREST_TRAIL_ROUTE_IDS.length);
  assert.deepEqual(trails.FOREST_ROUTES.map(({ id }) => id), ['forest-hub', ...FOREST_TRAIL_ROUTE_IDS]);
  for (const id of FOREST_TRAIL_ROUTE_IDS) {
    const entry = ROUTE_INVENTORY.find((route) => route.id === id);
    assert.ok(entry, `${id} has navigation metadata`);
    assert.equal(trails.getForestTrailContext(entry.href)?.current.id, id);
  }
  assert.equal(trails.getForestTrailContext('/web/chloe-pwa/'), null, 'internal Chloé is not a trail card');
  const introduction = read('web/shared/route-inventory.mjs').split(/\r?\n/).slice(0, 2).join(' ');
  assert.match(introduction, /navigation compatibility map/i, 'navigation must not claim deployment ownership');
});

test('AI_INIT exact parent redirects and its shim target the glossary while embeds and assets remain reachable', () => {
  const redirects = JSON.parse(read('vercel.json')).redirects;
  assert.deepEqual(redirects.filter(({ source }) => source.startsWith('/web/ai-init')), [
    { source: '/web/ai-init', destination: '/web/library/glossary/', permanent: true },
    { source: '/web/ai-init/', destination: '/web/library/glossary/', permanent: true },
  ]);
  const shim = read('web/ai-init/index.html');
  assert.ok(shim.split(/\r?\n/).length < 100, 'AI_INIT redirect stays minimal');
  assert.doesNotMatch(shim, /glossary-(?:data|search)|home-search-input|library-tree/i);
  assert.equal(shim.match(/<meta\b[^>]*http-equiv="refresh"[^>]*content="([^"]+)"/i)?.[1], '0; url=/web/library/glossary/');
  assert.equal(shim.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1], '/web/library/glossary/');
  assert.match(shim, /name="robots" content="noindex"/i);
  assert.match(shim, /<a\b[^>]*href="\/web\/library\/glossary\/"/i);
  const replaced = [];
  for (const [, attributes, script] of shim.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc=/.test(attributes)) vm.runInNewContext(script, { location: { replace: (url) => replaced.push(url) } });
  }
  assert.deepEqual(replaced, ['/web/library/glossary/']);
  for (const asset of ['web/ai-init/embed/index.html', 'web/ai-init/glossary-data.js', 'web/ai-init/glossary-search.js']) {
    assert.ok(fs.statSync(path.join(ROOT, asset)).size > 0, `${asset} remains available`);
  }
  assert.match(read('web/library/index.html'), /src="\/web\/ai-init\/glossary-data\.js/);
});

test('route ownership validates delivery and visibility without requiring page-specific back-link markup', async () => {
  const [{ ROUTE_REGISTRY, discoverCopiedHtmlRoutes, validateRouteRegistry }, { ROUTE_OWNERS }] = await Promise.all([
    registryModule, catalogModule,
  ]);
  assert.deepEqual(validateRouteRegistry({
    routes: ROUTE_REGISTRY,
    routeOwners: ROUTE_OWNERS,
    discoveredHtmlRoutes: discoverCopiedHtmlRoutes(ROOT),
    vercelRedirects: JSON.parse(read('vercel.json')).redirects,
  }), []);
  for (const [routePath, ownerId, delivery, navigation, access] of [
    ['/web/hypertrophyos/', 'hypertrophyos', 'page', 'manual', 'public'],
    ['/web/chloe-pwa/', 'chloe-pwa', 'page', 'unlisted', 'internal'],
    ['/web/fleet/', 'fleet-board', 'page', 'unlisted', 'internal'],
    ['/web/board/', 'fleet-board', 'page', 'unlisted', 'internal'],
    ['/web/ai-init/embed/', 'ai-init-embed', 'embed', 'unlisted', 'public'],
    ['/web/morning-news/', 'morning-news', 'external-redirect', 'unlisted', 'public'],
  ]) {
    const entry = ROUTE_REGISTRY.find(({ paths }) => paths.includes(routePath));
    assert.ok(entry, routePath);
    assert.deepEqual(
      [entry.ownerId, entry.delivery, entry.visibility.navigation, entry.visibility.access],
      [ownerId, delivery, navigation, access],
      routePath,
    );
    for (const dimension of ['search', 'indexing']) {
      assert.equal(typeof entry.visibility[dimension], 'string', `${routePath}: ${dimension}`);
    }
  }
});

test('manually authored landing portals retain direct C2C destinations', () => {
  const home = read('index.html');
  assert.match(home, /data-project="c2c-dolphin"[^>]*data-href="\/web\/c2c-dolphin\/"/);
  assert.match(home, /data-project="c2c-self"[^>]*data-href="\/web\/c2c-self\/"/);
});

test('homepage cards retain their manual order and Poetry and Calendar entries independently of catalog enumeration', () => {
  const home = read('index.html');
  const cards = [...home.matchAll(/<(?:a|article)\b[^>]*\bdata-project="([^"]+)"[^>]*>/g)];
  assert.deepEqual(cards.map((match) => match[1]), [
    'chair-ladder', 'morning-news', 'reader', 'audiobook', 'manifesto', 'we-are-the-training-data', 'voice', 'poetry',
    'vfx', 'kids', 'power', 'void', 'gallery', 'found', 'flowform', 'lobester', 'multiply', 'math',
    'time', 'rubiks', 'library', 'avatar', 'council', 'mendeleev', 'explore', 'calendar',
    'health', 'open-dashboard', 'muscle', 'c2c-dolphin', 'tinylm', 'c2c-self',
  ], 'the authored card order is a curation decision');
  for (const destination of ['/web/m-popova/', '/web/calendar/']) {
    assert.equal(cards.filter(([tag]) => tag.includes(`data-href="${destination}"`)).length, 1, destination);
  }
  assert.doesNotMatch(home, /static-route-registry|ROUTE_REGISTRY|project-catalog|ROUTE_INVENTORY/);
});

test('the static-route validator exits zero and npm exposes the dependency-free foundation runner', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-static-routes.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(read('package.json')).scripts.test, 'node scripts/run-contract-tests.mjs');
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts/run-contract-tests.mjs')), 'the npm runner exists');
});
