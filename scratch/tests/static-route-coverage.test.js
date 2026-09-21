const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const read = (source) => fs.readFileSync(path.join(ROOT, source), 'utf8');
const registryModule = import('../../scripts/static-route-registry.mjs');
const catalogModule = import('../../web/shared/project-catalog.mjs');
const vercelRedirects = JSON.parse(read('vercel.json')).redirects;

async function actualInput() {
  const { ROUTE_REGISTRY, discoverCopiedHtmlRoutes } = await registryModule;
  const { ROUTE_OWNERS } = await catalogModule;
  return {
    routes: ROUTE_REGISTRY,
    routeOwners: ROUTE_OWNERS,
    discoveredHtmlRoutes: discoverCopiedHtmlRoutes(ROOT),
    vercelRedirects,
  };
}

async function routeFor(routePath) {
  const { ROUTE_REGISTRY } = await registryModule;
  const matches = ROUTE_REGISTRY.filter(({ paths }) => paths.includes(routePath));
  assert.equal(matches.length, 1, `${routePath} has one explicit registry entry`);
  return matches[0];
}

test('every HTML route copied by the build has exactly one explicit source and owner', async () => {
  const { routes, discoveredHtmlRoutes } = await actualInput();
  assert.equal(discoveredHtmlRoutes.length, 75, 'current copied HTML boundary');
  assert.equal(routes.filter(({ source }) => source).length, discoveredHtmlRoutes.length);
  for (const discovered of discoveredHtmlRoutes) {
    const entry = await routeFor(discovered.route);
    assert.equal(entry.source, discovered.source, discovered.route);
    assert.ok(entry.ownerId, `${discovered.route} declares its owner`);
  }
  assert.equal(new Set(routes.map(({ id }) => id)).size, routes.length);
  for (const entry of routes) {
    assert.ok(['page', 'child', 'embed', 'html-shim', 'redirect', 'external-redirect'].includes(entry.delivery));
    assert.ok(entry.paths.every((routePath) => !/[:*]/.test(routePath)), 'ownership never uses a catch-all');
    for (const dimension of ['navigation', 'search', 'indexing', 'access']) {
      assert.equal(typeof entry.visibility[dimension], 'string', `${entry.id}: ${dimension}`);
    }
  }
});

test('seven canonical pool pages have explicit public pool owners and sources', async () => {
  const { ROUTE_OWNERS, CATALOG_ENTITIES } = await catalogModule;
  const expectedPools = ['growingapp', 'ai-d-kit', 'tinkerbox', 'health', 'design-gallery', 'artificial-self', 'my-story'];
  for (const id of expectedPools) {
    const routePath = `/web/pools/${id}/`;
    const entry = await routeFor(routePath);
    assert.equal(entry.id, `pool-${id}`);
    assert.equal(entry.ownerId, `pool-${id}`);
    assert.deepEqual(entry.paths, [routePath]);
    assert.equal(entry.source, `web/pools/${id}/index.html`);
    assert.equal(entry.delivery, 'page');
    const owners = ROUTE_OWNERS.filter(({ routes }) => routes.includes(routePath));
    assert.equal(owners.length, 1);
    const [owner] = owners;
    assert.equal(owner.id, entry.ownerId);
    assert.equal(owner.catalogEntityId, id);
    assert.equal(CATALOG_ENTITIES.find((entity) => entity.id === id).kind, 'pool');
    assert.equal(owner.role, 'pool');
    assert.equal(Object.hasOwn(owner, 'projectId'), false);
    assert.deepEqual(owner.routes, [routePath]);
    assert.deepEqual(owner.redirectSources, []);
    const publicVisibility = { navigation: 'manual', search: 'unreviewed', indexing: 'unspecified', access: 'public' };
    assert.deepEqual(entry.visibility, publicVisibility);
    assert.deepEqual(owner.visibility, { ...publicVisibility, publicSurface: 'pool' });
  }
});

test('every configured Vercel source has exactly one explicit expected rule and catalog owner', async () => {
  const { routes, routeOwners } = await actualInput();
  const expected = routes.flatMap((entry) => (entry.expectedVercelRedirects || []).map((rule) => ({ entry, rule })));
  assert.equal(vercelRedirects.length, 27);
  assert.equal(expected.length, vercelRedirects.length);
  for (const configured of vercelRedirects) {
    const matches = expected.filter(({ rule }) => rule.source === configured.source);
    assert.equal(matches.length, 1, `${configured.source} is declared exactly once`);
    const [{ entry, rule }] = matches;
    assert.deepEqual(rule, configured);
    assert.ok(['redirect', 'external-redirect'].includes(entry.delivery));
    assert.ok(routeOwners.find(({ id }) => id === entry.ownerId).redirectSources.includes(rule.source));
  }
});

test('the real catalog, registry, copied inputs, and redirects validate without issues', async () => {
  const { validateRouteRegistry } = await registryModule;
  assert.deepEqual(validateRouteRegistry(await actualInput()), []);
});

test('Morning News keeps its copied shell and redirects both parent variants directly to The Drop', async () => {
  const entry = await routeFor('/web/morning-news/');
  assert.equal(entry.ownerId, 'morning-news');
  assert.equal(entry.delivery, 'external-redirect');
  assert.equal(entry.source, 'web/morning-news/index.html');
  assert.equal(entry.destination, 'https://thedrop.sdforest.site');
  assert.ok(fs.statSync(path.join(ROOT, entry.source)).size > 0);
  assert.deepEqual(vercelRedirects.filter(({ source }) => source.startsWith('/web/morning-news')), [
    { source: '/web/morning-news', destination: 'https://thedrop.sdforest.site', permanent: true },
    { source: '/web/morning-news/', destination: 'https://thedrop.sdforest.site', permanent: true },
  ]);
});

test('existing series redirects retain their exact destinations and temporary behavior', () => {
  assert.deepEqual(vercelRedirects.filter(({ source }) => source.startsWith('/series')), [
    { source: '/series', destination: 'https://thedrop.sdforest.site/series', permanent: false },
    { source: '/series/', destination: 'https://thedrop.sdforest.site/series', permanent: false },
    { source: '/series/dependency-map/', destination: 'https://thedrop.sdforest.site/series/dependency-map', permanent: false },
    { source: '/series/dependency-map', destination: 'https://thedrop.sdforest.site/series/dependency-map', permanent: false },
  ]);
});

test('Fleet and Board share one internal owner while retaining both source pages', async () => {
  for (const routePath of ['/web/fleet/', '/web/board/']) {
    const entry = await routeFor(routePath);
    assert.equal(entry.ownerId, 'fleet-board');
    assert.equal(entry.delivery, 'page');
    assert.equal(entry.visibility.navigation, 'unlisted');
    assert.equal(entry.visibility.access, 'internal');
    assert.equal(entry.visibility.indexing, 'noindex');
  }
});

test('private and legacy compatibility routes carry explicit noindex metadata', async () => {
  const expected = [
    ['/web/upload/', 'upload', 'private'],
    ['/web/library/chloe/', 'library-chloe', 'internal'],
    ['/web/library/general/', 'library-memory', 'internal'],
    ['/web/library/memory/', 'library-memory', 'internal'],
    ['/web/library/repos/', 'library-repos', 'internal'],
    ['/web/voice-playground/', 'voice-playground', 'public'],
    ['/web/gallery/', 'gallery', 'public'],
  ];
  for (const [routePath, ownerId, access] of expected) {
    const entry = await routeFor(routePath);
    assert.equal(entry.ownerId, ownerId, routePath);
    assert.equal(entry.visibility.navigation, 'unlisted', routePath);
    assert.equal(entry.visibility.search, 'excluded', routePath);
    assert.equal(entry.visibility.indexing, 'noindex', routePath);
    assert.equal(entry.visibility.access, access, routePath);
    const html = read(entry.source);
    assert.match(html, /<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i, routePath);
  }
});

test('AI_INIT redirects only its parent while its embed and companion assets stay distinct', async () => {
  const parent = await routeFor('/web/ai-init/');
  const embed = await routeFor('/web/ai-init/embed/');
  assert.equal(parent.ownerId, 'ai-init');
  assert.equal(parent.delivery, 'redirect');
  assert.equal(parent.destination, '/web/library/glossary/');
  assert.equal(embed.ownerId, 'ai-init-embed');
  assert.equal(embed.delivery, 'embed');
  assert.equal(embed.source, 'web/ai-init/embed/index.html');
  assert.deepEqual(vercelRedirects.filter(({ source }) => source.startsWith('/web/ai-init')), [
    { source: '/web/ai-init', destination: '/web/library/glossary/', permanent: true },
    { source: '/web/ai-init/', destination: '/web/library/glossary/', permanent: true },
  ]);
  for (const source of ['web/ai-init/embed/index.html', 'web/ai-init/glossary-data.js', 'web/ai-init/glossary-search.js']) {
    assert.ok(fs.statSync(path.join(ROOT, source)).size > 0, `${source} remains copied`);
  }
});

test('AI_INIT canonical, meta refresh, fallback link, and client redirect agree with the host', () => {
  const html = read('web/ai-init/index.html');
  assert.equal(html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1], '/web/library/glossary/');
  assert.equal(html.match(/<meta\b[^>]*http-equiv="refresh"[^>]*content="([^"]+)"/i)?.[1], '0; url=/web/library/glossary/');
  const fallbackLinks = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  assert.ok(fallbackLinks.includes('/web/library/glossary/'));
  const replaced = [];
  for (const [, attributes, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc=/.test(attributes)) vm.runInNewContext(script, { location: { replace: (url) => replaced.push(url) } });
  }
  assert.deepEqual(replaced, ['/web/library/glossary/']);
});

test('named HTML, language children, internal pages, and HTML-only shims keep explicit delivery', async () => {
  for (const [routePath, ownerId, delivery] of [
    ['/calendar/', 'calendar', 'html-shim'],
    ['/calendar/calendario.html', 'calendar', 'html-shim'],
    ['/movies/', 'kids-movie-library', 'page'],
    ['/frontend/', 'item-icon-generator', 'page'],
    ['/web/library/rag.html', 'library-workspace', 'child'],
    ['/web/manifesto-newborn/bg/', 'manifesto-newborn', 'child'],
    ['/web/council/tinylm/', 'council', 'html-shim'],
    ['/web/open-dashboard/catalogues/', 'open-dashboard-notices', 'html-shim'],
  ]) {
    const entry = await routeFor(routePath);
    assert.equal(entry.ownerId, ownerId);
    assert.equal(entry.delivery, delivery);
  }
  assert.equal((await routeFor('/web/library/memory/')).visibility.access, 'internal');
  assert.equal((await routeFor('/web/we-are-the-training-data/')).visibility.indexing, 'noindex');
});

test('the registry remains validation-only with no homepage or Forest Trails consumer', async () => {
  const home = await routeFor('/');
  assert.equal(home.delivery, 'page');
  assert.equal(home.source, 'index.html');
  assert.equal(home.visibility.navigation, 'manual');
  const { ROUTE_REGISTRY } = await registryModule;
  assert.ok(ROUTE_REGISTRY.every((entry) => !entry.consumers?.length));
  for (const source of ['index.html', 'web/shared/forest-trails.mjs', 'web/shared/forest-navigation.mjs', 'web/shared/route-inventory.mjs']) {
    assert.doesNotMatch(read(source), /static-route-registry|ROUTE_REGISTRY|project-catalog/);
  }
});

test('the CLI resolves its repository root independently of the caller and is silent when clean', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/validate-static-routes.mjs')], {
    cwd: os.tmpdir(), encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

async function withCliFixture(check) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'sdforest-route-cli-'));
  try {
    for (const source of ['scripts/validate-static-routes.mjs', 'scripts/static-route-registry.mjs', 'scripts/static-build-inputs.cjs', 'web/shared/project-catalog.mjs']) {
      const target = path.join(fixture, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ROOT, source), target);
    }
    const { discoveredHtmlRoutes } = await actualInput();
    for (const { source } of discoveredHtmlRoutes) {
      const target = path.join(fixture, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, '<!doctype html>');
    }
    fs.writeFileSync(path.join(fixture, 'vercel.json'), JSON.stringify({ redirects: vercelRedirects }));
    const run = () => spawnSync(process.execPath, [path.join(fixture, 'scripts/validate-static-routes.mjs')], {
      cwd: os.tmpdir(), encoding: 'utf8',
    });
    await check(fixture, run);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

test('the CLI exits one and writes only issue messages when a configured redirect is unregistered', async () => {
  await withCliFixture((fixture, run) => {
    fs.writeFileSync(path.join(fixture, 'vercel.json'), JSON.stringify({ redirects: [
      ...vercelRedirects, { source: '/unregistered/', destination: '/elsewhere/', permanent: true },
    ] }));
    const result = run();
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), 'VERCEL_REDIRECT_UNREGISTERED: /unregistered/ to /elsewhere/ is not registered');
  });
});

for (const source of ['public/unowned.html', 'config/unowned.html', 'data/presets/unowned.html']) {
  test(`the CLI rejects unregistered copied HTML at ${source}`, async () => {
    await withCliFixture((fixture, run) => {
      const target = path.join(fixture, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, '<!doctype html>');
      const result = run();
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr.trim(), `COPIED_HTML_UNREGISTERED: /${source} copied from ${source} is not registered`);
    });
  });
}

test('the CLI reports all declared host redirects when configuration omits them', async () => {
  const { routes } = await actualInput();
  const expected = routes.flatMap((entry) => entry.expectedVercelRedirects || []);
  await withCliFixture((fixture, run) => {
    fs.writeFileSync(path.join(fixture, 'vercel.json'), JSON.stringify({}));
    const result = run();
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    const messages = result.stderr.trim().split(/\r?\n/);
    assert.equal(messages.length, 31);
    assert.deepEqual(messages.sort(), [
      ...expected.map(({ source, destination }) =>
        `VERCEL_REDIRECT_MISSING: ${source} to ${destination} is not configured`,
      ),
      'PROJECT_ROUTE_BINDING_INVALID: catalog project council binding 4: local route /web/tinylm/ has no copied HTML or configured host redirect evidence',
      'PROJECT_ROUTE_BINDING_INVALID: catalog project morning-news binding 2: local route /series/ has no copied HTML or configured host redirect evidence',
      'PROJECT_ROUTE_BINDING_INVALID: catalog project morning-news binding 3: local route /series/dependency-map/ has no copied HTML or configured host redirect evidence',
      'PROJECT_ROUTE_BINDING_INVALID: catalog project open-dashboard binding 6: local route /web/open-overview/ has no copied HTML or configured host redirect evidence',
    ].sort());
  });
});
