const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');

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
  return { id, catalogEntityId: id, routes, redirectSources };
}

function validateInput(overrides = {}) {
  return {
    routes: [],
    routeOwners: [],
    catalogEntities: (overrides.routeOwners || []).map(({ catalogEntityId }) => ({ id: catalogEntityId, kind: 'pool' })),
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
  assert.equal(issue.message, 'ROUTE_OWNER_MISSING: /orphan/ has no catalog owner');
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

test('reports an owner referencing an absent catalog entity separately from missing ownership', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routes: [route('orphan', 'orphan-owner', '/orphan/')],
    routeOwners: [{ ...owner('orphan-owner', ['/orphan/']), catalogEntityId: 'absent-entity' }],
    catalogEntities: [],
  }));
  assert.deepEqual(issues, [{
    code: 'ROUTE_CATALOG_ENTITY_MISSING',
    message: 'ROUTE_CATALOG_ENTITY_MISSING: catalog owner orphan-owner references missing catalog entity absent-entity',
    ownerId: 'orphan-owner', catalogEntityId: 'absent-entity',
  }]);
});

test('checks entity references even for an owner with no declared paths', async () => {
  const { validateRouteRegistry } = await registryModule;
  const issues = validateRouteRegistry(validateInput({
    routeOwners: [owner('empty-owner', [])], catalogEntities: [],
  }));
  assert.equal(issueWithCode(issues, 'ROUTE_CATALOG_ENTITY_MISSING').message,
    'ROUTE_CATALOG_ENTITY_MISSING: catalog owner empty-owner references missing catalog entity empty-owner');
});

for (const routeBindings of [undefined, [], null, {}]) {
  test(`a catalog project with ${JSON.stringify(routeBindings)} bindings has no valid route`, async () => {
    const { validateRouteRegistry } = await registryModule;
    assert.deepEqual(validateRouteRegistry(validateInput({
      catalogEntities: [{ id: 'unbound-project', kind: 'project', routeBindings }],
    })), [{
      code: 'CATALOG_PROJECT_ROUTE_MISSING',
      message: 'CATALOG_PROJECT_ROUTE_MISSING: catalog project unbound-project has no explicit valid route binding',
      catalogEntityId: 'unbound-project',
    }]);
  });
}

for (const [binding, reason] of [
  [null, 'type must be local, external, or shared-pool-tab'],
  [{ type: 'invented', route: '/target/' }, 'type must be local, external, or shared-pool-tab'],
  [{ type: 'local', route: '/missing/#section' }, 'local route /missing/ is not registered with a valid catalog owner'],
  [{ type: 'shared-pool-tab', route: '/missing/#section' }, 'shared-pool-tab route /missing/ is not registered with a valid catalog owner'],
  ...['#section', 'target/', '//example.com/path', '/\\example.com/path', '', 42].map((route) => [
    { type: 'local', route }, 'local route must be an absolute local path',
  ]),
  ...['http://example.com/', 'https://', 'https:example.com', 'https:///example.com/', '//example.com/', 'https://exa mple.com/', 'https://example.com/ white', 'https://example.com/\u0000', 'https://example.com\\evil', 'https://user:pass@example.com/', null].map((url) => [
    { type: 'external', url }, 'external URL must be well-formed HTTPS without credentials',
  ]),
]) {
  test(`rejects invalid project binding ${JSON.stringify(binding)}`, async () => {
    const { validateRouteRegistry } = await registryModule;
    const issues = validateRouteRegistry(validateInput({
      catalogEntities: [{ id: 'invalid-project', kind: 'project', routeBindings: [binding] }],
    }));
    assert.deepEqual(issues, [{
      code: 'CATALOG_PROJECT_ROUTE_MISSING',
      message: 'CATALOG_PROJECT_ROUTE_MISSING: catalog project invalid-project has no explicit valid route binding',
      catalogEntityId: 'invalid-project',
    }, {
      code: 'PROJECT_ROUTE_BINDING_INVALID',
      message: `PROJECT_ROUTE_BINDING_INVALID: catalog project invalid-project binding 0: ${reason}`,
      catalogEntityId: 'invalid-project', bindingIndex: 0,
    }]);
  });
}

test('accepts direct, external, and shared pool bindings without deploying fragments separately', async () => {
  const { validateRouteRegistry } = await registryModule;
  const input = validateInput({
    routes: [route('local', 'local', '/local/'), route('pool', 'pool', '/pool/')],
    routeOwners: [owner('local', ['/local/']), owner('pool', ['/pool/'])],
    catalogEntities: [
      { id: 'local', kind: 'project', routeBindings: [{ type: 'local', route: '/local/index.html#entry' }] },
      { id: 'external', kind: 'project', routeBindings: [{ type: 'external', url: 'https://example.com/app?view=1#entry' }] },
      { id: 'shared-one', kind: 'project', routeBindings: [{ type: 'shared-pool-tab', route: '/pool/#one' }] },
      { id: 'shared-two', kind: 'project', routeBindings: [{ type: 'shared-pool-tab', route: '/pool/#two' }] },
      { id: 'pool', kind: 'pool' },
    ],
  });
  assert.deepEqual(validateRouteRegistry(input), []);
  const mixed = structuredClone(input);
  mixed.catalogEntities[0].routeBindings.push({ type: 'external', url: 'http://example.com/' });
  const issues = validateRouteRegistry(mixed);
  assert.equal(issues.length, 1, 'a valid binding does not hide another invalid binding');
  assert.equal(issues[0].code, 'PROJECT_ROUTE_BINDING_INVALID');
  assert.equal(issues[0].bindingIndex, 1);
});

test('a registered path without a valid owner cannot satisfy a project binding', async () => {
  const { validateRouteRegistry } = await registryModule;
  for (const routeOwners of [[], [owner('dangling', ['/other/'])], [owner('dangling', ['/target/'])]]) {
    const issues = validateRouteRegistry(validateInput({
      routes: [route('target', 'dangling', '/target/')], routeOwners,
      catalogEntities: [{ id: 'project', kind: 'project', routeBindings: [{ type: 'local', route: '/target/' }] }],
    }));
    assert.equal(issueWithCode(issues, 'CATALOG_PROJECT_ROUTE_MISSING').catalogEntityId, 'project');
    assert.equal(issueWithCode(issues, 'PROJECT_ROUTE_BINDING_INVALID').message,
      'PROJECT_ROUTE_BINDING_INVALID: catalog project project binding 0: local route /target/ is not registered with a valid catalog owner');
  }
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
  assert.equal(issue.message, 'ROUTE_DUPLICATE: /same/ is owned by first and second');
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
  assert.equal(issue.message, 'REDIRECT_CONFLICT: redirect /same/ shadows page route owned by page-owner');
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

for (const suffix of [':path*', ':path*/']) {
  test(`wildcard /${suffix} rejects slash-backslash authority in place of a local destination`, async () => {
    const { validateRouteRegistry } = await registryModule;
    const rule = { source: `/legacy/${suffix}`, destination: `/\\current/${suffix}`, permanent: true };
    const issues = validateRouteRegistry(validateInput({
      routes: [route('legacy', 'legacy', '/legacy/child/', {
        delivery: 'redirect', source: 'legacy/child/index.html', destination: '/current/child/',
        expectedVercelRedirects: [rule],
      })],
      routeOwners: [owner('legacy', ['/legacy/child/'], [rule.source])],
      discoveredHtmlRoutes: [{ route: '/legacy/child/', source: 'legacy/child/index.html' }],
      vercelRedirects: [rule],
    }));

    assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/child/');
  });

  test(`wildcard /${suffix} rejects a network-path destination in place of a local path`, async () => {
    const { validateRouteRegistry } = await registryModule;
    const rule = { source: `/legacy/${suffix}`, destination: `//current/${suffix}`, permanent: true };
    const issues = validateRouteRegistry(validateInput({
      routes: [route('legacy', 'legacy', '/legacy/child/', {
        delivery: 'redirect', source: 'legacy/child/index.html', destination: '/current/child/',
        expectedVercelRedirects: [rule],
      })],
      routeOwners: [owner('legacy', ['/legacy/child/'], [rule.source])],
      discoveredHtmlRoutes: [{ route: '/legacy/child/', source: 'legacy/child/index.html' }],
      vercelRedirects: [rule],
    }));

    assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, '/legacy/child/');
  });

  for (const [label, routePath, destination, htmlSource] of [
    ['empty root', '/web/open-overview/', '/web/open-dashboard/', 'web/open-overview/index.html'],
    ['child', '/web/open-overview/github/', '/web/open-dashboard/github/', 'web/open-overview/github/index.html'],
    ['nested child', '/web/open-overview/github/repos/', '/web/open-dashboard/github/repos/', 'web/open-overview/github/repos/index.html'],
  ]) {
    const rule = {
      source: `/web/open-overview/${suffix}`,
      destination: `/web/open-dashboard/${suffix}`,
      permanent: true,
    };
    const input = validateInput({
      routes: [route('open-overview', 'open-overview', routePath, {
        delivery: 'redirect', source: null, destination, expectedVercelRedirects: [rule],
      })],
      routeOwners: [owner('open-overview', [routePath], [rule.source])],
      vercelRedirects: [rule],
    });

    test(`wildcard /${suffix} expands the ${label} destination`, async () => {
      const { validateRouteRegistry } = await registryModule;
      assert.deepEqual(validateRouteRegistry(input), []);
    });

    test(`wildcard /${suffix} rejects an incorrect ${label} destination`, async () => {
      const { validateRouteRegistry } = await registryModule;
      const wrongRule = { ...rule, destination: `/wrong/${suffix}` };
      const issues = validateRouteRegistry({
        ...input,
        routes: [{ ...input.routes[0], expectedVercelRedirects: [wrongRule] }],
        vercelRedirects: [wrongRule],
      });
      assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, routePath);
    });

    test(`wildcard /${suffix} rejects a source-less declaration over copied ${label} HTML`, async () => {
      const { validateRouteRegistry } = await registryModule;
      const issues = validateRouteRegistry({
        ...input,
        discoveredHtmlRoutes: [{ route: routePath, source: htmlSource }],
      });
      assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, routePath);
    });

    test(`wildcard /${suffix} accepts matching copied ${label} redirect-shell evidence`, async () => {
      const { validateRouteRegistry } = await registryModule;
      assert.deepEqual(validateRouteRegistry({
        ...input,
        routes: [{ ...input.routes[0], source: htmlSource }],
        discoveredHtmlRoutes: [{ route: routePath, source: htmlSource }],
      }), []);
    });
  }
}

for (const [label, source, routePath, htmlSource, target, destination] of [
  ['named parameter', '/web/:project/index.html', '/web/old/', 'web/old/index.html', '/current/:project/index.html', '/current/old/'],
  ['empty repeated parameter', '/web/old/:path*/index.html', '/web/old/', 'web/old/index.html', '/current/:path*/index.html', '/current/'],
  ['nested repeated parameter', '/web/old/:path*/index.html', '/web/old/child/nested/', 'web/old/child/nested/index.html', '/current/:path*/index.html', '/current/child/nested/'],
]) {
  const rule = { source, destination: target, permanent: true };
  const entry = route('old', 'old', routePath, {
    delivery: 'redirect', source: htmlSource, destination, expectedVercelRedirects: [rule],
  });
  const input = validateInput({
    routes: [entry],
    routeOwners: [owner('old', [routePath], [rule.source])],
    discoveredHtmlRoutes: [{ route: routePath, source: htmlSource }],
    vercelRedirects: [rule],
  });

  test(`${label} ending in /index.html rejects a wrong destination for copied HTML`, async () => {
    const { validateRouteRegistry } = await registryModule;
    const wrongRule = { ...rule, destination: '/wrong/' };
    const issues = validateRouteRegistry({
      ...input,
      routes: [{ ...entry, expectedVercelRedirects: [wrongRule] }],
      vercelRedirects: [wrongRule],
    });
    assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, routePath);
  });

  test(`${label} ending in /index.html detects copied page shadowing`, async () => {
    const { validateRouteRegistry } = await registryModule;
    const issues = validateRouteRegistry({ ...input, routes: [{ ...entry, delivery: 'page' }] });
    assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, routePath);
  });

  test(`${label} ending in /index.html requires the copied shell source`, async () => {
    const { validateRouteRegistry } = await registryModule;
    const issues = validateRouteRegistry({ ...input, routes: [{ ...entry, source: null }] });
    assert.equal(issueWithCode(issues, 'REDIRECT_CONFLICT').route, routePath);
  });

  test(`${label} ending in /index.html accepts matching copied shell evidence`, async () => {
    const { validateRouteRegistry } = await registryModule;
    assert.deepEqual(validateRouteRegistry(input), []);
  });
}

test('every matching alias is checked when wildcard captures change the destination query', async () => {
  const { validateRouteRegistry } = await registryModule;
  const rule = { source: '/legacy/:path*', destination: '/current/?alias=:path*', permanent: true };
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy', 'legacy', '/legacy/', {
      delivery: 'redirect', source: 'legacy/index.html', destination: '/current/?alias=',
      expectedVercelRedirects: [rule],
    })],
    routeOwners: [owner('legacy', ['/legacy/'], [rule.source])],
    discoveredHtmlRoutes: [{ route: '/legacy/', source: 'legacy/index.html' }],
    vercelRedirects: [rule],
  }));

  // /legacy passes with an empty capture; /legacy/index.html changes ?alias=.
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

test('reports each missing expected redirect even when another directory alias remains configured', async () => {
  const { validateRouteRegistry } = await registryModule;
  const rules = ['/legacy', '/legacy/'].map((source) => ({ source, destination: '/current/', permanent: true }));
  const issues = validateRouteRegistry(validateInput({
    routes: [route('legacy', 'legacy', '/legacy/', {
      delivery: 'redirect', source: null, destination: '/current/', expectedVercelRedirects: rules,
    })],
    routeOwners: [owner('legacy', ['/legacy/'], rules.map(({ source }) => source))],
    vercelRedirects: [rules[0]],
  }));

  assert.deepEqual(issues, [{
    code: 'VERCEL_REDIRECT_MISSING',
    message: 'VERCEL_REDIRECT_MISSING: /legacy/ to /current/ is not configured',
    route: '/legacy/', ownerId: 'legacy',
  }]);
});

test('discovers all copied input families and reports each unregistered HTML route', async () => {
  const { discoverCopiedHtmlRoutes, validateRouteRegistry } = await registryModule;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdforest-static-routes-'));

  try {
    for (const relativePath of [
      'index.html',
      'web/alpha/index.html',
      'web/named.html',
      'calendar/calendario.html',
      'movies/index.html',
      'frontend/index.html',
      'public/unowned.html',
      'config/unowned.html',
      'data/presets/nested/unowned.html',
      'docs/ignored.html',
      'data/uncopied.html',
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
      { route: '/config/unowned.html', source: 'config/unowned.html' },
      { route: '/data/presets/nested/unowned.html', source: 'data/presets/nested/unowned.html' },
      { route: '/frontend/', source: 'frontend/index.html' },
      { route: '/', source: 'index.html' },
      { route: '/movies/', source: 'movies/index.html' },
      { route: '/public/unowned.html', source: 'public/unowned.html' },
      { route: '/web/alpha/', source: 'web/alpha/index.html' },
      { route: '/web/named.html', source: 'web/named.html' },
    ]);
    const issues = validateRouteRegistry(validateInput({ discoveredHtmlRoutes: discovered }));
    assert.equal(issues.length, 9);
    for (const routePath of ['/public/unowned.html', '/config/unowned.html', '/data/presets/nested/unowned.html']) {
      assert.ok(issues.some(({ code, route }) => code === 'COPIED_HTML_UNREGISTERED' && route === routePath), routePath);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('discovery follows additional individual files and directories declared only by the build manifest', async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'sdforest-manifest-'));
  try {
    for (const source of ['scripts/static-route-registry.mjs', 'web/shared/project-catalog.mjs']) {
      const target = path.join(fixture, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ROOT, source), target);
    }
    fs.writeFileSync(path.join(fixture, 'scripts/static-build-inputs.cjs'), `module.exports = {
      STATIC_COPY_FILES: ['extra.html', 'missing.html', 'resume.json'],
      STATIC_COPY_DIRECTORIES: ['additional'],
      STATIC_DATA_COPIES: { files: ['single.html', 'missing.html'], directories: ['more'] },
    };`);
    for (const source of ['extra.html', 'additional/index.html', 'data/single.html', 'data/more/index.html', 'web/ignored.html', 'data/ignored.html']) {
      const target = path.join(fixture, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, '<!doctype html>');
    }
    const { discoverCopiedHtmlRoutes, validateRouteRegistry } = await import(pathToFileURL(path.join(fixture, 'scripts/static-route-registry.mjs')).href);
    const discovered = discoverCopiedHtmlRoutes(fixture).sort((left, right) => left.source.localeCompare(right.source));
    assert.deepEqual(discovered, [
      { route: '/additional/', source: 'additional/index.html' },
      { route: '/data/more/', source: 'data/more/index.html' },
      { route: '/data/single.html', source: 'data/single.html' },
      { route: '/extra.html', source: 'extra.html' },
    ]);
    const issues = validateRouteRegistry(validateInput({ discoveredHtmlRoutes: discovered }));
    assert.equal(issues.length, 4);
    assert.ok(issues.every(({ code }) => code === 'COPIED_HTML_UNREGISTERED'));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
