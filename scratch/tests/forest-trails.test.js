const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const expectedPaths = [
  '/',
  '/web/morning-news/',
  '/web/upload/',
  '/web/library/',
  '/web/open-overview/',
  '/web/council/',
  '/web/ai-research/',
  '/web/c2c-dolphin/',
  '/web/c2c-self/',
  '/web/avatar-playground/',
  '/web/chloe-pwa/',
  '/web/life-in-time/',
  '/web/womens-health-os/',
  '/web/hypertrophyos/',
  '/web/calendar/',
  '/web/kids/',
  '/web/math-mania/',
  '/web/kids-movie-library/',
  '/web/math-forest/',
  '/web/mendeleev-bg/',
  '/web/vfx-portfolio/',
  '/web/manifesto-newborn/',
  '/web/m-popova/',
  '/web/power-law-odyssey/',
  '/web/replicator-void/',
  '/web/evolution/',
];
const privateClientPaths = new Set(['/web/chloe-pwa/']);

const libraryChildPaths = [
  '/web/ai-init/',
  '/web/library/glossary/',
  '/web/library/platform/',
  '/web/library/rag.html',
  '/web/library/repos/',
  '/web/library/general/',
  '/web/library/chloe/',
  '/web/library/memory/',
];

const routedChildViews = [
  ['/web/open-overview/openrouter/', 'Open Overview'],
  ['/web/open-overview/github/', 'Open Overview'],
  ['/web/manifesto-newborn/bg/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/de/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/es/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/fr/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/it/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/mk/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/pt/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/ru/', 'Manifesto for a Newborn'],
  ['/web/manifesto-newborn/zh/', 'Manifesto for a Newborn'],
];

let baseUrl;
let browser;
let server;

before(async () => {
  server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = requestPath.replace(/^\/+/, '');
    let filePath = path.resolve(repoRoot, relativePath);

    if (!filePath.startsWith(repoRoot)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }

    const contentType = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
    }[path.extname(filePath)] || 'application/octet-stream';

    response.writeHead(200, { 'content-type': contentType });
    fs.createReadStream(filePath).pipe(response);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
});

after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

test('publishes the exact canonical public route manifest', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  const moduleResponse = await page.request.get(`${baseUrl}/web/shared/forest-trails.mjs?v=manifest-test`);
  assert.match(moduleResponse.headers()['content-type'], /^text\/javascript/);

  const routes = await page.evaluate(async (moduleUrl) => {
    const trails = await import(moduleUrl);
    return trails.FOREST_ROUTES.map(({ id, label, path: routePath }) => ({
      id,
      label,
      path: routePath,
    }));
  }, `${baseUrl}/web/shared/forest-trails.mjs?manifest-test`);

  assert.deepEqual(routes.map((route) => route.path), expectedPaths);
  assert.equal(new Set(routes.map((route) => route.id)).size, routes.length);
  assert.equal(new Set(routes.map((route) => route.path)).size, routes.length);

  for (const route of routes) {
    const response = await page.request.get(`${baseUrl}${route.path}`);
    assert.equal(response.status(), 200, `${route.label} must resolve at ${route.path}`);
  }

  await page.close();
});

test('every canonical public page mounts Forest Trails through production scripts', {
  timeout: 45_000,
}, async () => {
  const page = await browser.newPage();

  for (const routePath of expectedPaths.filter((routePath) => !privateClientPaths.has(routePath))) {
    const response = await page.goto(`${baseUrl}${routePath}`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200, `${routePath} must load`);

    const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
    await navigation.waitFor({
      state: 'attached',
      timeout: 4_000,
    });
    assert.equal(await navigation.count(), 1, `${routePath} must mount one route rail`);
    assert.equal(
      await navigation.locator('[aria-current="page"]').count(),
      1,
      `${routePath} must identify its current route`,
    );

    const homeLink = navigation.getByRole('link', { name: 'Back to Forest HUB' });
    if (routePath === '/') {
      assert.equal(await homeLink.count(), 0, 'the HUB must not link to itself');
      assert.equal(await navigation.getAttribute('data-at-hub'), 'true');
    } else {
      assert.equal(await homeLink.count(), 1, `${routePath} must expose one HUB return`);
      assert.equal(await homeLink.getAttribute('href'), '/');
      assert.equal(await navigation.getAttribute('data-at-hub'), 'false');
    }
  }

  await page.close();
});

test('Library child views inherit one Library trail with a persistent HUB return', {
  timeout: 20_000,
}, async () => {
  const page = await browser.newPage();

  for (const childPath of libraryChildPaths) {
    const response = await page.goto(`${baseUrl}${childPath}`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200, `${childPath} must load`);

    const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
    await navigation.waitFor({ state: 'attached', timeout: 4_000 });
    assert.equal(await navigation.count(), 1, `${childPath} must mount one route rail`);
    assert.equal(
      await navigation.locator('.forest-trails__current').textContent(),
      'Library & Platforms',
    );
    assert.equal(
      await navigation.getByRole('link', { name: 'Back to Forest HUB' }).count(),
      1,
      `${childPath} must keep the HUB reachable`,
    );
  }

  await page.close();
});

test('translated and route-specific child views remain connected to their parent trail', {
  timeout: 20_000,
}, async () => {
  const page = await browser.newPage();

  for (const [childPath, parentLabel] of routedChildViews) {
    const response = await page.goto(`${baseUrl}${childPath}`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200, `${childPath} must load`);

    const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
    await navigation.waitFor({ state: 'attached', timeout: 4_000 });
    assert.equal(
      await navigation.locator('.forest-trails__current').textContent(),
      parentLabel,
      `${childPath} must inherit ${parentLabel}`,
    );
    assert.equal(
      await navigation.getByRole('link', { name: 'Back to Forest HUB' }).count(),
      1,
    );
  }

  await page.close();
});

test('resolves a canonical current page and meaningful next trail connections', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/web/life-in-time/`, { waitUntil: 'domcontentloaded' });

  const context = await page.evaluate(async (moduleUrl) => {
    const trails = await import(moduleUrl);
    const result = trails.getForestTrailContext(
      '/web/life-in-time/index.html?from=forest#remaining-time',
    );
    return {
      current: result.current.label,
      trail: result.trail.label,
      next: result.next.map((route) => route.path),
    };
  }, `${baseUrl}/web/shared/forest-trails.mjs?context-test`);

  assert.deepEqual(context, {
    current: 'Life in Time',
    trail: 'Living Systems',
    next: [
      '/web/calendar/',
      '/web/womens-health-os/',
      '/web/power-law-odyssey/',
    ],
  });

  await page.close();
});

test('keeps every public destination in a safe, bounded route graph', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

  const graph = await page.evaluate(async (moduleUrl) => {
    const trails = await import(moduleUrl);
    return {
      trails: trails.FOREST_TRAILS,
      routes: trails.FOREST_ROUTES,
    };
  }, `${baseUrl}/web/shared/forest-trails.mjs?graph-test`);

  assert.deepEqual(
    graph.trails.map(({ label }) => label),
    [
      'Signals & Systems',
      'Machine Grove',
      'Living Systems',
      'Wonder Path',
      'Story Path',
      'Wild Lab',
    ],
  );

  const routeIds = new Set(graph.routes.map(({ id }) => id));
  const trailIds = new Set(graph.trails.map(({ id }) => id));
  const forbiddenCanonicalPath = /tinylm|\/council\/(?:inner|byok)|llm-db|ai-init/i;
  const forbiddenAliasPath = /tinylm|\/council\/(?:inner|byok)|llm-db/i;

  for (const route of graph.routes) {
    assert.equal(
      forbiddenCanonicalPath.test(route.path),
      false,
      `${route.path} is not a canonical public trail`,
    );
    for (const aliasPath of route.aliasPaths || []) {
      assert.equal(
        forbiddenAliasPath.test(aliasPath),
        false,
        `${aliasPath} is not a public trail alias`,
      );
    }
    assert.ok(
      route.id === 'forest-hub' || trailIds.has(route.trailId),
      `${route.label} must belong to a public trail`,
    );
    assert.ok(
      route.connectionIds.length >= 2 && route.connectionIds.length <= 4,
      `${route.label} must expose 2–4 next connections`,
    );
    assert.equal(new Set(route.connectionIds).size, route.connectionIds.length);
    assert.equal(route.connectionIds.includes(route.id), false);
    for (const connectionId of route.connectionIds) {
      assert.ok(routeIds.has(connectionId), `${route.label} points to ${connectionId}`);
    }
  }

  await page.close();
});

test('real canonical pages load one accessible rail without a test-only import', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/web/life-in-time/`, { waitUntil: 'domcontentloaded' });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  assert.equal(await navigation.count(), 1);
  assert.equal(
    await navigation.locator('.forest-trails__current').textContent(),
    'Life in Time',
  );

  const nextLinks = await navigation
    .locator('[data-forest-trails-next] a')
    .evaluateAll((links) => links.map((link) => ({
      label: link.textContent,
      path: new URL(link.href).pathname,
    })));

  assert.deepEqual(nextLinks, [
    { label: 'Calendar Generator', path: '/web/calendar/' },
    { label: 'Women’s Health OS', path: '/web/womens-health-os/' },
    { label: 'Power Law Odyssey', path: '/web/power-law-odyssey/' },
  ]);

  const mapButton = navigation.getByRole('button', { name: 'Open full route map' });
  assert.equal(await mapButton.getAttribute('aria-expanded'), 'false');
  assert.equal(await mapButton.getAttribute('aria-controls'), 'forest-trails-map');
  assert.equal(await page.locator('#forest-trails-map').count(), 1);

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  const homeNavigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await homeNavigation.waitFor({ timeout: 4_000 });
  assert.equal(await homeNavigation.count(), 1);
  assert.equal(
    await homeNavigation.locator('.forest-trails__current').textContent(),
    'Forest HUB',
  );

  await page.close();
});

test('opens a keyboard-safe full map grouped into all six trails', { timeout: 6_000 }, async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/web/kids/`, { waitUntil: 'domcontentloaded' });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  const mapButton = navigation.getByRole('button', { name: 'Open full route map' });
  await mapButton.click({ timeout: 2_000 });

  const drawer = page.locator('#forest-trails-map');
  assert.equal(await drawer.getAttribute('open'), '');
  assert.equal(await mapButton.getAttribute('aria-expanded'), 'true');
  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
    'Close route map',
  );
  assert.deepEqual(
    await drawer.getByRole('heading', { level: 3 }).allTextContents(),
    [
      'Signals & Systems',
      'Machine Grove',
      'Living Systems',
      'Wonder Path',
      'Story Path',
      'Wild Lab',
    ],
  );
  assert.equal(
    (await drawer.locator('.forest-trails__trail-description').allTextContents())
      .every((description) => description.trim().length > 12),
    true,
  );

  const mappedPaths = await drawer.locator('[data-forest-route]').evaluateAll(
    (routes) => routes.map((route) => route.dataset.forestRoute),
  );
  assert.deepEqual(mappedPaths, expectedPaths);
  assert.equal(
    await drawer.locator('[aria-current="page"]').textContent(),
    'Kids Corner',
  );

  await page.keyboard.press('Escape');
  assert.equal(await drawer.getAttribute('open'), null);
  assert.equal(await mapButton.getAttribute('aria-expanded'), 'false');
  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
    'Open full route map',
  );

  await page.close();
});

test('native route map stays visible without resetting deep Power Law scroll', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/web/power-law-odyssey/`, {
    waitUntil: 'domcontentloaded',
  });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  const before = await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    const track = document.querySelector('.scroll-container');
    const scrollDistance = track.offsetHeight - window.innerHeight;
    window.scrollTo(0, track.offsetTop + (scrollDistance * 0.82));
    return {
      targetY: track.offsetTop + (scrollDistance * 0.82),
    };
  });
  await page.waitForFunction(() => (
    Math.abs(
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
      ) - 0.82,
    ) < 0.01
  ));

  const scrollState = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollProgress: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
    ),
  }));
  assert.ok(Math.abs(scrollState.scrollY - before.targetY) < 2);

  const mapButton = navigation.getByRole('button', { name: 'Open full route map' });
  await mapButton.click();
  await page.waitForFunction(() => {
    const drawer = document.querySelector('#forest-trails-map');
    const rect = drawer.getBoundingClientRect();
    return (
      getComputedStyle(drawer).position === 'fixed'
      && rect.top >= 0
      && rect.bottom <= window.innerHeight
    );
  });
  const openState = await page.locator('#forest-trails-map').evaluate((drawer) => {
    const rect = drawer.getBoundingClientRect();
    return {
      position: getComputedStyle(drawer).position,
      visible: (
        rect.width > 0
        && rect.height > 0
        && rect.top >= 0
        && rect.bottom <= window.innerHeight
      ),
      scrollY: window.scrollY,
      scrollProgress: Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
      ),
    };
  });

  assert.equal(openState.position, 'fixed');
  assert.equal(openState.visible, true);
  assert.ok(Math.abs(openState.scrollY - scrollState.scrollY) < 2);
  assert.ok(Math.abs(openState.scrollProgress - scrollState.scrollProgress) < 0.002);

  await page.keyboard.press('Escape');
  assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - scrollState.scrollY) < 2);
  await page.close();
});

test('renders a fixed touch-safe route network and disables its motion when requested', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseUrl}/web/m-popova/`, { waitUntil: 'domcontentloaded' });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  await page.waitForFunction(() => {
    const link = document.querySelector('link[data-forest-trails-styles]');
    return Boolean(link?.sheet);
  }, null, { timeout: 2_000 });

  const network = navigation.locator('svg.forest-trails__network');
  assert.equal(await network.getAttribute('aria-hidden'), 'true');
  assert.equal(await network.locator('.forest-trails__node').count(), 4);

  const measurements = await page.evaluate(() => {
    const navigationRect = document.querySelector('.forest-trails').getBoundingClientRect();
    const mapButtonRect = document
      .querySelector('.forest-trails__map-button')
      .getBoundingClientRect();
    const pathStyle = getComputedStyle(document.querySelector('.forest-trails__edge'));
    return {
      left: navigationRect.left,
      right: navigationRect.right,
      bottom: navigationRect.bottom,
      mapButtonHeight: mapButtonRect.height,
      pathAnimation: pathStyle.animationName,
    };
  });

  assert.ok(measurements.left >= 0);
  assert.ok(measurements.right <= 390);
  assert.ok(measurements.bottom <= 844);
  assert.ok(measurements.mapButtonHeight >= 44);
  assert.equal(measurements.pathAnimation, 'none');

  await page.close();
});

test('representative route keeps Design History usable under reduced motion', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseUrl}/web/c2c-dolphin/`, { waitUntil: 'domcontentloaded' });

  const history = page.getByRole('button', { name: 'Design history', exact: true });
  await history.click();
  assert.equal(await history.getAttribute('aria-expanded'), 'true');
  await page.getByRole('button', { name: 'The prompt builder' }).click();
  assert.equal(await page.locator('.dh-root').getAttribute('class'), 'dh-root is-open is-previewing');
  assert.equal(
    await page.evaluate(() => document.documentElement.style.getPropertyValue('--forest-amber')),
    '#38bdf8',
  );
  await page.locator('.dh-banner button').click();
  assert.equal(await page.locator('.dh-root').getAttribute('class'), 'dh-root');
  await page.close();
});

test('heavy and private-client pages keep a visible shared-shell forest return', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const routePath of ['/web/replicator-void/', '/web/chloe-pwa/']) {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
    const back = page.locator('.forest-back').first();
    await back.waitFor({ state: 'visible' });
    assert.equal(await back.getAttribute('href'), '/');
    assert.notEqual(await back.evaluate((element) => getComputedStyle(element).display), 'none');
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 3),
      `${routePath} must not gain horizontal overflow`,
    );
  }
  await page.close();
});

test('forced dialog fallback traps focus, closes on Escape, and restores its trigger', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto(`${baseUrl}/web/power-law-odyssey/`, {
    waitUntil: 'domcontentloaded',
  });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  const scrollState = await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    const track = document.querySelector('.scroll-container');
    const scrollDistance = track.offsetHeight - window.innerHeight;
    window.scrollTo(0, track.offsetTop + (scrollDistance * 0.82));
    return {
      scrollY: window.scrollY,
      scrollProgress: Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
      ),
    };
  });
  await page.waitForFunction(() => (
    Math.abs(
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
      ) - 0.82,
    ) < 0.01
  ));
  scrollState.scrollProgress = await page.evaluate(() => Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
  ));
  const mapButton = navigation.getByRole('button', { name: 'Open full route map' });
  await mapButton.click();

  const drawer = page.locator('#forest-trails-map');
  assert.equal(await drawer.getAttribute('data-forest-dialog-mode'), 'fallback');
  assert.equal(await drawer.getAttribute('role'), 'dialog');
  assert.equal(await drawer.getAttribute('aria-modal'), 'true');
  assert.equal(await drawer.getAttribute('open'), '');
  assert.equal(await page.locator('.forest-trails__fallback-backdrop').isVisible(), true);
  const drawerState = await drawer.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      visible: rect.top >= 0 && rect.bottom <= window.innerHeight,
      scrollY: window.scrollY,
      scrollProgress: Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
      ),
    };
  });
  assert.equal(drawerState.position, 'fixed');
  assert.equal(drawerState.visible, true);
  assert.ok(Math.abs(drawerState.scrollY - scrollState.scrollY) < 2);
  assert.ok(Math.abs(drawerState.scrollProgress - scrollState.scrollProgress) < 0.002);

  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await page.evaluate(() => document.querySelector('#forest-trails-map')
      .contains(document.activeElement)),
    true,
  );
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => document.querySelector('#forest-trails-map')
      .contains(document.activeElement)),
    true,
  );

  await page.keyboard.press('Escape');
  assert.equal(await drawer.getAttribute('open'), null);
  assert.equal(await mapButton.getAttribute('aria-expanded'), 'false');
  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
    'Open full route map',
  );
  assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - scrollState.scrollY) < 2);

  await context.close();
});

test('mobile rail starts compact and clears actual fixed simulation controls', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/web/replicator-void/`, { waitUntil: 'domcontentloaded' });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  await page.waitForFunction(() => (
    Number.parseFloat(
      document.querySelector('#forest-trails')?.style.getPropertyValue('--forest-trails-lift'),
    ) > 0
  ), null, { timeout: 4_000 });

  assert.equal(await navigation.getAttribute('data-collapsed'), 'true');
  assert.equal(await page.locator('.forest-trails__clearance').getAttribute('hidden'), '');
  assert.equal(await navigation.locator('[data-forest-trails-next]').getAttribute('hidden'), '');
  assert.equal(
    await navigation.locator('.forest-trails__current').textContent(),
    'Replicator Void',
  );

  const separation = await page.evaluate(() => {
    const rail = document.querySelector('#forest-trails').getBoundingClientRect();
    const controls = document.querySelector('.hud').getBoundingClientRect();
    return {
      railBottom: rail.bottom,
      controlsTop: controls.top,
      mapHeight: document.querySelector('.forest-trails__map-button')
        .getBoundingClientRect().height,
    };
  });
  assert.ok(
    separation.railBottom <= separation.controlsTop - 6,
    `rail bottom ${separation.railBottom} must clear controls at ${separation.controlsTop}`,
  );
  assert.ok(separation.mapHeight >= 44);

  const toggle = navigation.getByRole('button', { name: 'Expand Forest Trails' });
  await toggle.click();
  assert.equal(await navigation.getAttribute('data-collapsed'), 'false');
  assert.equal(await navigation.locator('[data-forest-trails-next]').getAttribute('hidden'), null);

  await navigation.getByRole('button', { name: 'Minimize Forest Trails' }).click();
  assert.equal(await navigation.getAttribute('data-collapsed'), 'true');
  assert.equal(await navigation.locator('.forest-trails__current').isVisible(), true);
  assert.equal(
    await navigation.getByRole('button', { name: 'Open full route map' }).isVisible(),
    true,
  );

  await page.close();
});

test('short mobile rail compacts between the safe top and a tall fixed panel', async () => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 600 },
    hasTouch: true,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseUrl}/web/womens-health-os/`, {
    waitUntil: 'domcontentloaded',
  });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  await page.waitForFunction(() => (
    Boolean(document.querySelector('link[data-forest-trails-styles]')?.sheet)
  ));
  await page.locator('#whChatFab').click();
  await page.waitForFunction(() => (
    Number.parseFloat(
      document.querySelector('#forest-trails')
        ?.style.getPropertyValue('--forest-trails-lift'),
    ) > 0
  ));
  await page.waitForFunction(() => {
    const navigation = document.querySelector('#forest-trails');
    const panel = document.querySelector('#whChatPanel');
    const navigationRect = navigation.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return (
      navigation.dataset.collisionConstrained === 'true'
      && navigationRect.top >= 5
      && navigationRect.bottom <= panelRect.top - 5
    );
  }, null, { timeout: 4_000 });

  const measurements = await page.evaluate(() => {
    const bounds = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        height: rect.height,
      };
    };
    const navigation = document.querySelector('#forest-trails');
    return {
      navigation: bounds(navigation),
      panel: bounds(document.querySelector('#whChatPanel')),
      mapButton: bounds(navigation.querySelector('.forest-trails__map-button')),
      collapseButton: bounds(navigation.querySelector('.forest-trails__collapse')),
      collapseDisabled: navigation.querySelector('.forest-trails__collapse').disabled,
      collapsed: navigation.dataset.collapsed,
      constrained: navigation.dataset.collisionConstrained,
    };
  });

  assert.ok(
    measurements.navigation.top >= 5,
    `rail top ${measurements.navigation.top} must respect the 5px safe inset`,
  );
  assert.ok(
    measurements.navigation.bottom <= measurements.panel.top - 5,
    `rail bottom ${measurements.navigation.bottom} must clear panel at ${measurements.panel.top}`,
  );
  assert.ok(measurements.mapButton.height >= 44);
  assert.ok(measurements.collapseButton.height >= 44);
  assert.equal(measurements.collapseDisabled, true);
  assert.equal(measurements.collapsed, 'true');
  assert.equal(measurements.constrained, 'true');

  await page.setViewportSize({ width: 1400, height: 600 });
  await page.waitForFunction(() => !matchMedia('(max-width: 680px)').matches);
  const rotationSamples = await page.evaluate(async () => {
    const samples = [];
    for (let index = 0; index < 20; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 35));
      const navigation = document.querySelector('#forest-trails');
      samples.push({
        collapsed: navigation.dataset.collapsed,
        constrained: navigation.dataset.collisionConstrained,
        locked: navigation.dataset.collisionLocked,
      });
    }
    return samples;
  });
  assert.equal(
    rotationSamples.every((sample) => (
      sample.collapsed === 'true'
      && sample.constrained === 'true'
      && sample.locked === 'true'
    )),
    true,
  );
  const rotatedState = await navigation.evaluate((element) => ({
    collapsed: element.dataset.collapsed,
    constrained: element.dataset.collisionConstrained,
    collapseDisabled: element.querySelector('.forest-trails__collapse').disabled,
  }));
  assert.equal(rotatedState.constrained, 'true');
  assert.equal(rotatedState.collapsed, 'true');
  assert.equal(rotatedState.collapseDisabled, true);

  await page.locator('#whChatClose').click();
  await page.waitForFunction(() => {
    const navigation = document.querySelector('#forest-trails');
    return (
      navigation.dataset.collisionConstrained === undefined
      && !navigation.querySelector('.forest-trails__collapse').disabled
    );
  });
  assert.equal(await navigation.getAttribute('data-collapsed'), 'false');
  assert.equal(await navigation.locator('[data-forest-trails-next]').getAttribute('hidden'), null);

  await page.close();
});

test('collision recovery restores an explicit expanded preference', async () => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 600 },
    hasTouch: true,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${baseUrl}/web/womens-health-os/`, {
    waitUntil: 'domcontentloaded',
  });

  const navigation = page.getByRole('navigation', { name: 'Forest Trails' });
  await navigation.waitFor({ timeout: 4_000 });
  await page.waitForFunction(() => (
    Boolean(document.querySelector('link[data-forest-trails-styles]')?.sheet)
  ));

  await navigation.getByRole('button', { name: 'Expand Forest Trails' }).click();
  assert.equal(await navigation.getAttribute('data-collapsed'), 'false');
  await page.locator('#whChatFab').click();
  await page.waitForFunction(() => {
    const navigation = document.querySelector('#forest-trails');
    return (
      navigation.dataset.collisionConstrained === 'true'
      && navigation.dataset.collapsed === 'true'
      && navigation.querySelector('.forest-trails__collapse').disabled
    );
  }, null, { timeout: 4_000 });

  await page.locator('#whChatClose').click();
  await page.waitForFunction(() => {
    const navigation = document.querySelector('#forest-trails');
    return (
      navigation.dataset.collisionConstrained === undefined
      && !navigation.querySelector('.forest-trails__collapse').disabled
    );
  });
  assert.equal(await navigation.getAttribute('data-collapsed'), 'false');
  assert.equal(await navigation.locator('[data-forest-trails-next]').getAttribute('hidden'), null);

  await page.close();
});

test('Forest Trails animation CSS consumes shared tokens with no raw timing literals', () => {
  const trailsCss = fs.readFileSync(
    path.join(repoRoot, 'web', 'shared', 'forest-trails.css'),
    'utf8',
  );
  const designCss = fs.readFileSync(
    path.join(repoRoot, 'web', 'shared', 'forest-design.css'),
    'utf8',
  );

  assert.equal(
    /\b\d*\.?\d+(?:ms|s)\b/i.test(trailsCss),
    false,
    'Forest Trails CSS must not declare raw animation or transition timings',
  );
  assert.equal(
    /cubic-bezier\(|\bease(?:-in|-out|-in-out)?\b|\blinear\b/i.test(
      trailsCss.replace(/var\([^)]*\)/g, ''),
    ),
    false,
    'Forest Trails CSS must not declare raw easing curves',
  );

  for (const token of [
    '--forest-trails-duration-arrive',
    '--forest-trails-duration-flow',
    '--forest-trails-duration-glow',
    '--forest-trails-duration-drawer',
    '--forest-trails-edge-stagger',
    '--forest-trails-node-stagger',
    '--forest-trails-ease-flow',
    '--forest-trails-ease-glow',
  ]) {
    assert.match(designCss, new RegExp(`${token}\\s*:`), `${token} must be shared`);
    assert.match(trailsCss, new RegExp(`var\\(${token}\\)`), `${token} must be consumed`);
  }
});

test('maps public child views to their trail while leaving retired council paths unlisted', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

  const matches = await page.evaluate(async (moduleUrl) => {
    const trails = await import(moduleUrl);
    const resolve = (pathname) => trails.getForestTrailContext(pathname)?.current.label || null;
    return {
      manifestoTranslation: resolve('/web/manifesto-newborn/bg/index.html'),
      openOverviewChild: resolve('/web/open-overview/github/index.html'),
      libraryChild: resolve('/web/library/glossary/index.html'),
      legacyGlossary: resolve('/web/ai-init/index.html'),
      ragHub: resolve('/web/library/rag.html'),
      repoSearch: resolve('/web/library/repos/index.html'),
      generalSearch: resolve('/web/library/general/'),
      chloeSearch: resolve('/web/library/chloe/index.html'),
      memorySearch: resolve('/web/library/memory/'),
      retiredStandalone: resolve('/web/council/tinylm/index.html'),
      retiredKeyConsole: resolve('/web/council/byok/index.html'),
      retiredInnerCouncil: resolve('/web/council/inner/index.html'),
    };
  }, `${baseUrl}/web/shared/forest-trails.mjs?alias-test`);

  assert.deepEqual(matches, {
    manifestoTranslation: 'Manifesto for a Newborn',
    openOverviewChild: 'Open Overview',
    libraryChild: 'Library & Platforms',
    legacyGlossary: null,
    ragHub: 'Library & Platforms',
    repoSearch: 'Library & Platforms',
    generalSearch: 'Library & Platforms',
    chloeSearch: 'Library & Platforms',
    memorySearch: 'Library & Platforms',
    retiredStandalone: null,
    retiredKeyConsole: null,
    retiredInnerCouncil: null,
  });

  await page.close();
});
