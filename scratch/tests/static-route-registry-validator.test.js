const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const registryModule = import('../../scripts/static-route-registry.mjs');

const visibility = Object.freeze({
  navigation: 'unlisted',
  search: 'excluded',
  indexing: 'noindex',
  access: 'public',
});

function route(id, ownerId, routePath, overrides = {}) {
  return {
    id,
    delivery: 'page',
    ownerId,
    paths: [routePath],
    visibility,
    ...overrides,
  };
}

function owner(id, routes, redirectSources = []) {
  return { id, routes, redirectSources };
}

function validateInput(overrides = {}) {
  return {
    routes: [],
    routeOwners: [],
    discoveredHtmlRoutes: [],
    vercelRedirects: [],
    ...overrides,
  };
}

function issueWithCode(issues, code) {
  const issue = issues.find((candidate) => candidate.code === code);
  assert.ok(issue, `expected ${code} in ${JSON.stringify(issues)}`);
  return issue;
}

test('normalizes extensionless and index routes without changing named HTML files', async () => {
  const { normalizeRoutePath } = await registryModule;

  assert.equal(normalizeRoutePath('/x'), '/x/');
  assert.equal(normalizeRoutePath('/x/'), '/x/');
  assert.equal(normalizeRoutePath('/x/index.html'), '/x/');
  assert.equal(normalizeRoutePath('/calendar/calendario.html'), '/calendar/calendario.html');
  assert.equal(normalizeRoutePath('/index.html'), '/');
});

test('reports a route whose declared owner does not own that path', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routes: [route('orphan', 'missing-owner', '/orphan/')],
  }));

  const issue = issueWithCode(issues, 'ROUTE_OWNER_MISSING');
  assert.match(issue.message, /^ROUTE_OWNER_MISSING: \/orphan\/ has no catalog owner/);
  assert.equal(issue.route, '/orphan/');
  assert.equal(issue.ownerId, 'missing-owner');
});

test('reports a catalog owner whose declared route is absent from the registry', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routeOwners: [owner('lonely', ['/lonely/'])],
  }));

  const issue = issueWithCode(issues, 'CATALOG_ROUTE_MISSING');
  assert.match(issue.message, /^CATALOG_ROUTE_MISSING: catalog owner lonely has no route/);
  assert.equal(issue.route, '/lonely/');
  assert.equal(issue.ownerId, 'lonely');
});

test('reports duplicate normalized paths with both owners', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routes: [
      route('first-route', 'first', '/same'),
      route('second-route', 'second', '/same/index.html'),
    ],
    routeOwners: [owner('first', ['/same/']), owner('second', ['/same/'])],
  }));

  const issue = issueWithCode(issues, 'ROUTE_DUPLICATE');
  assert.match(issue.message, /^ROUTE_DUPLICATE: \/same\/ is owned by first and second/);
  assert.equal(issue.route, '/same/');
});

test('reports an exact redirect that shadows a page route', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routes: [route('page', 'page-owner', '/same/')],
    routeOwners: [owner('page-owner', ['/same/'])],
    vercelRedirects: [{ source: '/same/', destination: '/elsewhere/', permanent: true }],
  }));

  const issue = issueWithCode(issues, 'REDIRECT_CONFLICT');
  assert.match(issue.message, /^REDIRECT_CONFLICT: redirect \/same\/ shadows page route owned by page-owner/);
  assert.equal(issue.route, '/same/');
  assert.equal(issue.ownerId, 'page-owner');
});

test('an exact redirect does not shadow a child route', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routes: [route('child', 'child-owner', '/same/child/')],
    routeOwners: [owner('child-owner', ['/same/child/'])],
    vercelRedirects: [{ source: '/same/', destination: '/elsewhere/', permanent: true }],
  }));

  assert.equal(issues.some(({ code }) => code === 'REDIRECT_CONFLICT'), false);
});

test('a wildcard redirect shadows a matching child page', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routes: [route('child', 'child-owner', '/same/child/')],
    routeOwners: [owner('child-owner', ['/same/child/'])],
    vercelRedirects: [{ source: '/same/:path*', destination: '/elsewhere/:path*', permanent: true }],
  }));

  const issue = issueWithCode(issues, 'REDIRECT_CONFLICT');
  assert.equal(issue.route, '/same/child/');
  assert.equal(issue.ownerId, 'child-owner');
});

test('accepts an intentional HTML redirect shell when owner, destination, and rule agree', async () => {
  const { validateRouteRegistry } = await registryModule;
  const vercelRule = { source: '/legacy/', destination: '/current/', permanent: true };
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy-shell', 'legacy', '/legacy/', {
      delivery: 'redirect',
      source: 'web/legacy/index.html',
      destination: '/current/',
      expectedVercelRedirects: [vercelRule],
    })],
    routeOwners: [owner('legacy', ['/legacy/'], ['/legacy/'])],
    discoveredHtmlRoutes: [{ route: '/legacy/', source: 'web/legacy/index.html' }],
    vercelRedirects: [vercelRule],
  }));

  assert.deepEqual(issues, []);
});

test('accepts a declared redirect-only route when no copied HTML occupies its path', async () => {
  const { validateRouteRegistry } = await registryModule;
  const vercelRule = { source: '/legacy/', destination: '/current/', permanent: true };
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy-host-rule', 'legacy', '/legacy/', {
      delivery: 'redirect',
      source: null,
      destination: '/current/',
      expectedVercelRedirects: [vercelRule],
    })],
    routeOwners: [owner('legacy', ['/legacy/'], ['/legacy/'])],
    vercelRedirects: [vercelRule],
  }));

  assert.deepEqual(issues, []);
});

test('a redirect-only wildcard family agrees with the expanded destination at its registered root', async () => {
  const { validateRouteRegistry } = await registryModule;
  const rules = [
    { source: '/legacy/', destination: '/current/', permanent: true },
    { source: '/legacy/:path*', destination: '/current/:path*', permanent: true },
  ];
  const input = validateInput({
    routes: [route('legacy-host-rules', 'legacy', '/legacy/', {
      delivery: 'redirect', source: null, destination: '/current/', expectedVercelRedirects: rules,
    })],
    routeOwners: [owner('legacy', ['/legacy/'], rules.map(({ source }) => source))],
    vercelRedirects: rules,
  });

  assert.deepEqual(validateRouteRegistry(input), []);
  const wrongTarget = { source: '/legacy/:path*', destination: '/wrong/:path*', permanent: true };
  const issues = validateRouteRegistry({
    ...input,
    routes: [{ ...input.routes[0], expectedVercelRedirects: [rules[0], wrongTarget] }],
    vercelRedirects: [rules[0], wrongTarget],
  });
  assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/');
});

test('redirect-only exemptions still require the declared owner, delivery, destination, and expected rule', async () => {
  const { validateRouteRegistry } = await registryModule;
  const rule = { source: '/legacy/', destination: '/current/', permanent: true };
  const entry = route('legacy-host-rule', 'legacy', '/legacy/', {
    delivery: 'redirect', source: null, destination: '/current/', expectedVercelRedirects: [rule],
  });
  const declaredOwner = owner('legacy', ['/legacy/'], [rule.source]);
  for (const overrides of [
    { routes: [{ ...entry, delivery: 'page' }] },
    { routes: [{ ...entry, destination: '/wrong/' }] },
    { routes: [{ ...entry, expectedVercelRedirects: [] }] },
    { routeOwners: [{ ...declaredOwner, redirectSources: [] }] },
    { routeOwners: [] },
  ]) {
    const issues = validateRouteRegistry(validateInput({
      routes: [entry], routeOwners: [declaredOwner], vercelRedirects: [rule], ...overrides,
    }));
    assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/');
  }
});

test('does not exempt a redirect shell whose registry entry omits its source', async () => {
  const { validateRouteRegistry } = await registryModule;
  const vercelRule = { source: '/legacy/', destination: '/current/', permanent: true };
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy-shell', 'legacy', '/legacy/', {
      delivery: 'redirect',
      destination: '/current/',
      expectedVercelRedirects: [vercelRule],
    })],
    routeOwners: [owner('legacy', ['/legacy/'], ['/legacy/'])],
    discoveredHtmlRoutes: [{ route: '/legacy/', source: 'web/legacy/index.html' }],
    vercelRedirects: [vercelRule],
  }));

  assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/');
});

test('does not exempt a redirect shell whose declared source is absent', async () => {
  const { validateRouteRegistry } = await registryModule;
  const vercelRule = { source: '/legacy/', destination: '/current/', permanent: true };
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy-shell', 'legacy', '/legacy/', {
      delivery: 'redirect',
      source: 'web/legacy/index.html',
      destination: '/current/',
      expectedVercelRedirects: [vercelRule],
    })],
    routeOwners: [owner('legacy', ['/legacy/'], ['/legacy/'])],
    vercelRedirects: [vercelRule],
  }));

  assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/');
  assert.equal(issueWithCode(issues, 'SOURCE_FILE_MISSING').route, '/legacy/');
});

test('does not exempt a redirect shell whose source resolves to another route', async () => {
  const { validateRouteRegistry } = await registryModule;
  const vercelRule = { source: '/legacy/', destination: '/current/', permanent: true };
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy-shell', 'legacy', '/legacy/', {
      delivery: 'redirect',
      source: 'web/current/index.html',
      destination: '/current/',
      expectedVercelRedirects: [vercelRule],
    })],
    routeOwners: [owner('legacy', ['/legacy/'], ['/legacy/'])],
    discoveredHtmlRoutes: [{ route: '/current/', source: 'web/current/index.html' }],
    vercelRedirects: [vercelRule],
  }));

  assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/');
  assert.equal(issues.some(({ code }) => code === 'SOURCE_FILE_MISSING'), false);
});

test('does not exempt a redirect shell when its configured destination disagrees', async () => {
  const { validateRouteRegistry } = await registryModule;
  const expectedRule = { source: '/legacy/', destination: '/current/', permanent: true };
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy-shell', 'legacy', '/legacy/', {
      delivery: 'redirect',
      source: 'web/legacy/index.html',
      destination: '/current/',
      expectedVercelRedirects: [expectedRule],
    })],
    routeOwners: [owner('legacy', ['/legacy/'], ['/legacy/'])],
    discoveredHtmlRoutes: [{ route: '/legacy/', source: 'web/legacy/index.html' }],
    vercelRedirects: [{ ...expectedRule, destination: '/unexpected/' }],
  }));

  assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/');
});

test('reports copied HTML with no registry entry using its own code', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    discoveredHtmlRoutes: [{ route: '/unregistered/', source: 'web/unregistered/index.html' }],
  }));

  const issue = issueWithCode(issues, 'COPIED_HTML_UNREGISTERED');
  assert.match(issue.message, /^COPIED_HTML_UNREGISTERED: \/unregistered\//);
  assert.equal(issue.route, '/unregistered/');
});

test('reports a registry HTML source absent from discovery using its own code', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routes: [route('missing-source', 'source-owner', '/missing/', {
      source: 'web/missing/index.html',
    })],
    routeOwners: [owner('source-owner', ['/missing/'])],
  }));

  const issue = issueWithCode(issues, 'SOURCE_FILE_MISSING');
  assert.match(issue.message, /^SOURCE_FILE_MISSING: web\/missing\/index\.html/);
  assert.equal(issue.route, '/missing/');
  assert.equal(issue.ownerId, 'source-owner');
});

test('reports a configured redirect absent from the registry using its own code', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    vercelRedirects: [{ source: '/legacy/', destination: '/current/', permanent: true }],
  }));

  const issue = issueWithCode(issues, 'VERCEL_REDIRECT_UNREGISTERED');
  assert.match(issue.message, /^VERCEL_REDIRECT_UNREGISTERED: \/legacy\//);
  assert.equal(issue.route, '/legacy/');
});

test('discovers root and copied-directory HTML while retaining named HTML routes', async () => {
  const { discoverCopiedHtmlRoutes } = await registryModule;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdforest-static-routes-'));

  try {
    for (const relativePath of [
      'index.html',
      'web/alpha/index.html',
      'web/named.html',
      'calendar/calendario.html',
      'movies/index.html',
      'frontend/index.html',
      'public/ignored.html',
    ]) {
      const file = path.join(root, ...relativePath.split('/'));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '<!doctype html>');
    }

    const discovered = discoverCopiedHtmlRoutes(root)
      .map(({ route: routePath, source }) => ({ route: routePath, source }))
      .sort((left, right) => left.source.localeCompare(right.source));

    assert.deepEqual(discovered, [
      { route: '/calendar/calendario.html', source: 'calendar/calendario.html' },
      { route: '/frontend/', source: 'frontend/index.html' },
      { route: '/', source: 'index.html' },
      { route: '/movies/', source: 'movies/index.html' },
      { route: '/web/alpha/', source: 'web/alpha/index.html' },
      { route: '/web/named.html', source: 'web/named.html' },
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
