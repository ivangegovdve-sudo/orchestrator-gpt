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

test('real Three.js scene stays fixed-size and responds to pointer, click, and scroll velocity', async () => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/web/library/?three-browser-test`, { waitUntil: 'domcontentloaded' });
  await page.locator('canvas[data-forest-scene]').waitFor({ state: 'attached' });
  await page.waitForFunction(() => (
    document.querySelector('canvas[data-forest-scene]')?.dataset.forestState === 'ready'
  ));
  await page.evaluate(() => window.__forestAmbient.ready);

  const initial = await page.evaluate(() => ({
    rect: document.querySelector('canvas[data-forest-scene]').getBoundingClientRect().toJSON(),
    snapshot: window.__forestAmbient.snapshot()[0],
  }));
  assert.equal(initial.snapshot.engine, 'three');
  assert.equal(initial.snapshot.renderer, 'WebGLRenderer');
  assert.equal(initial.snapshot.theme, 'library');
  assert.deepEqual(initial.snapshot.uniforms.uResolution, [1100, 640]);

  await page.mouse.move(880, 150);
  await page.waitForTimeout(80);
  const afterPointer = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.ok(afterPointer.uniforms.uMouse[0] > 0.2);
  assert.ok(afterPointer.uniforms.uMouse[1] > 0.2);

  await page.mouse.click(770, 250);
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

test('reduced motion renders a static scene and lifecycle state recovers cleanly', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/web/kids/?three-reduced-test`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    document.querySelector('canvas[data-forest-scene]')?.dataset.forestState === 'ready'
  ));
  await page.evaluate(() => window.__forestAmbient.ready);

  const canvas = page.locator('canvas[data-forest-scene]');
  const reduced = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.equal(reduced.theme, 'kids');
  assert.equal(reduced.reducedMotion, true);
  assert.equal(reduced.uniforms.uClick, 0);
  assert.equal(reduced.uniforms.uScroll, 0);
  assert.deepEqual(reduced.uniforms.uResolution, [390, 844]);

  await canvas.dispatchEvent('webglcontextlost');
  await page.waitForFunction(() => (
    document.querySelector('canvas[data-forest-scene]')?.dataset.forestState === 'context-lost'
  ));
  await canvas.dispatchEvent('webglcontextrestored');
  await page.waitForFunction(() => (
    document.querySelector('canvas[data-forest-scene]')?.dataset.forestState === 'ready'
  ));

  const recovered = await page.evaluate(() => window.__forestAmbient.snapshot()[0]);
  assert.equal(recovered.contextLost, false);
  assert.equal(recovered.state, 'ready');
  await context.close();
});
