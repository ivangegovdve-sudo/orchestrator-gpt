const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');

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
      '.json': 'application/json; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    }[path.extname(filePath)] || 'application/octet-stream';

    response.writeHead(200, { 'content-type': contentType });
    fs.createReadStream(filePath).pipe(response);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  browser = await launchProjectChromium();
});

after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

test('real Three.js scene stays fixed-size and responds to pointer, click, and scroll velocity', async () => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/web/library/?three-browser-test`, { waitUntil: 'domcontentloaded' });
  await waitForAmbient(page);

  const initial = await page.evaluate(() => ({
    rect: document.querySelector('canvas[data-forest-scene]').getBoundingClientRect().toJSON(),
    snapshot: window.__forestAmbient.snapshot()[0],
  }));
  assert.equal(initial.snapshot.engine, 'three');
  assert.equal(initial.snapshot.renderer, 'WebGLRenderer');
  assert.equal(initial.snapshot.theme, 'library');
  assert.deepEqual(initial.snapshot.uniforms.uResolution, [1100, 640]);

  await page.mouse.move(880, 150);
  await page.waitForFunction(() => {
    const mouse = window.__forestAmbient.snapshot()[0].uniforms.uMouse;
    return mouse[0] > 0.2 && mouse[1] > 0.2;
  });
  const afterPointer = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.ok(afterPointer.uniforms.uMouse[0] > 0.2);
  assert.ok(afterPointer.uniforms.uMouse[1] > 0.2);

  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 770,
      clientY: 250,
      bubbles: true,
      pointerType: 'mouse',
    }));
  });
  await page.waitForFunction(() => window.__forestAmbient.snapshot()[0].uniforms.uClick > 0);
  const afterClick = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.ok(afterClick.uniforms.uClick > 0);
  assert.ok(afterClick.uniforms.uClickOrigin[0] > 0.2);

  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await page.waitForTimeout(32);
  const afterScroll = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.notEqual(afterScroll.uniforms.uScroll, 0);

  await page.mouse.move(540, 320);
  await page.waitForTimeout(80);
  const finalRect = await page.locator('canvas[data-forest-scene]').evaluate((canvas) => (
    canvas.getBoundingClientRect().toJSON()
  ));
  assert.deepEqual(finalRect, initial.rect);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('visibility, intersection, resize, context recovery, and pagehide own the render loop lifecycle', async () => {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await page.goto(`${baseUrl}/web/kids/?three-lifecycle-test`, { waitUntil: 'domcontentloaded' });
  await waitForAmbient(page);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => {
    const snapshot = window.__forestAmbient.snapshot()[0];
    return snapshot.documentVisible === false && snapshot.running === false;
  });

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => window.__forestAmbient.snapshot()[0].documentVisible === true);

  const canvas = page.locator('canvas[data-forest-scene]');
  await canvas.evaluate((element) => { element.style.display = 'none'; });
  await page.waitForFunction(() => {
    const snapshot = window.__forestAmbient.snapshot()[0];
    return snapshot.intersectionVisible === false && snapshot.running === false;
  });
  await canvas.evaluate((element) => { element.style.display = 'block'; });
  await page.waitForFunction(() => window.__forestAmbient.snapshot()[0].intersectionVisible === true);

  await page.setViewportSize({ width: 760, height: 520 });
  await page.waitForFunction(() => {
    const resolution = window.__forestAmbient.snapshot()[0].uniforms.uResolution;
    return resolution[0] === 760 && resolution[1] === 520;
  });

  await canvas.dispatchEvent('webglcontextlost');
  await page.waitForFunction(() => (
    document.querySelector('canvas[data-forest-scene]')?.dataset.forestState === 'context-lost'
  ));
  await canvas.dispatchEvent('webglcontextrestored');
  await page.waitForFunction(() => (
    document.querySelector('canvas[data-forest-scene]')?.dataset.forestState === 'ready'
  ));

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForFunction(() => window.__forestAmbient.snapshot()[0].destroyed === true);
  const destroyed = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.equal(destroyed.state, 'destroyed');
  assert.equal(destroyed.running, false);
  await page.close();
});

test('reduced motion renders a static scene without pointer, click, or scroll animation', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/web/kids/?three-reduced-test`, { waitUntil: 'domcontentloaded' });
  await waitForAmbient(page);

  const reduced = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.equal(reduced.theme, 'kids');
  assert.equal(reduced.reducedMotion, true);
  assert.equal(reduced.running, false);
  assert.equal(reduced.uniforms.uClick, 0);
  assert.equal(reduced.uniforms.uScroll, 0);
  assert.deepEqual(reduced.uniforms.uResolution, [390, 844]);

  await page.mouse.click(300, 200);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(50);
  const afterInput = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.equal(afterInput.running, false);
  assert.equal(afterInput.uniforms.uClick, 0);
  assert.equal(afterInput.uniforms.uScroll, 0);
  await context.close();
});

test('module import and WebGL creation failures settle into the static fallback', async () => {
  const importPage = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await importPage.route('**/web/vendor/three/three.module.min.js', (route) => route.abort());
  await importPage.goto(`${baseUrl}/web/library/?three-import-fallback`, {
    waitUntil: 'domcontentloaded',
  });
  await importPage.waitForFunction(() => window.__forestAmbient?.engine === 'static-fallback');
  assert.equal(
    await importPage.locator('canvas[data-forest-scene]').getAttribute('data-forest-state'),
    'fallback',
  );
  await importPage.close();

  const webglPage = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await webglPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function blockedWebGL(type, ...args) {
      if (/^webgl2?$/.test(String(type))) return null;
      return original.call(this, type, ...args);
    };
  });
  await webglPage.goto(`${baseUrl}/web/kids/?three-webgl-fallback`, {
    waitUntil: 'domcontentloaded',
  });
  await webglPage.waitForFunction(() => window.__forestAmbient?.engine === 'static-fallback');
  assert.equal(
    await webglPage.locator('canvas[data-forest-scene]').getAttribute('data-forest-state'),
    'fallback',
  );
  await webglPage.close();
});

test('representative public routes mount their theme and scoped entrance inventory', async () => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(`${page.url()}: ${error.message}`));
  const routes = [
    { path: '/web/kids/', theme: 'kids', target: '.kid-card', motionClass: 'forest-motion-card' },
    { path: '/web/kids-movie-library/', theme: 'movie', target: '.header-row', motionClass: 'forest-motion-header' },
    { path: '/web/library/', theme: 'library', target: '.library-index', motionClass: 'forest-motion-card' },
    { path: '/web/library/glossary/', theme: 'library' },
    { path: '/web/library/platform/', theme: 'library' },
    { path: '/web/library/rag.html', theme: 'library' },
    { path: '/web/ai-research/', theme: 'ai-research' },
  ];

  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}?three-route-sweep`, { waitUntil: 'domcontentloaded' });
    await waitForAmbient(page);
    const snapshot = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
    assert.equal(snapshot.theme, route.theme, route.path);
    assert.equal(snapshot.state, 'ready', route.path);
    assert.equal(
      await page.locator('canvas[data-forest-scene]').evaluate((canvas) => getComputedStyle(canvas).position),
      'fixed',
      route.path,
    );
    if (route.target) {
      await page.locator(route.target).first().waitFor({ state: 'attached' });
      assert.equal(
        await page.locator(route.target).first().evaluate(
          (element, motionClass) => element.classList.contains(motionClass),
          route.motionClass,
        ),
        true,
        `${route.path} ${route.target}`,
      );
    }
  }

  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Open Overview retains route-local Three ownership and shared motion makes no vendor request', async () => {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 420 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const vendorRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/web/vendor/three/three.module.min.js')) {
      vendorRequests.push(request.url());
    }
  });

  await page.goto(`${baseUrl}/web/open-overview/?forest-route-owner-test`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__forestAmbient?.engine === 'route-managed');
  await page.waitForTimeout(250);

  assert.deepEqual(vendorRequests, []);
  assert.equal(await page.locator('canvas[data-forest-scene]').count(), 0);
  assert.equal(
    await page.locator('body').getAttribute('data-forest-scene-owner'),
    'route',
  );
  await context.close();
});

async function waitForAmbient(page) {
  await page.locator('canvas[data-forest-scene]').waitFor({ state: 'attached' });
  await page.waitForFunction(() => (
    document.querySelector('canvas[data-forest-scene]')?.dataset.forestState === 'ready'
  ));
  await page.evaluate(() => window.__forestAmbient.ready);
}

async function launchProjectChromium() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (executablePath) return chromium.launch({ headless: true, executablePath });

  try {
    return await chromium.launch({ headless: true });
  } catch (bundledError) {
    try {
      return await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (channelError) {
      throw new AggregateError(
        [bundledError, channelError],
        'Neither the project Playwright Chromium nor the Playwright Chrome channel could launch',
      );
    }
  }
}
