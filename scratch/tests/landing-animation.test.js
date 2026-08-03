const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const landingSource = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const homeCss = fs.readFileSync(path.join(repoRoot, 'web/shared/forest-home.css'), 'utf8');
const threeSource = fs.readFileSync(path.join(repoRoot, 'web/shared/forest-three.js'), 'utf8');
const slamsSource = fs.readFileSync(
  path.join(repoRoot, 'web/shared/forest-three/slams.js'),
  'utf8',
);

let baseUrl;
let browser;
let server;

before(async () => {
  server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filePath = path.resolve(repoRoot, requestPath.replace(/^\/+/, ''));
    if (!filePath.startsWith(repoRoot)) return response.writeHead(403).end('Forbidden');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return response.writeHead(404).end('Not found');
    }
    const type = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.woff2': 'font/woff2',
    }[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
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

test('landing keeps one title crown and exposes Life in Time in the 24-card directory', () => {
  // Tag-agnostic like sdforest-foundation.test.js: the crown moved into the
  // h1 (and so became a span) to centre on the wordmark. The guard here is
  // that there is exactly ONE crown, which is the regression that matters.
  assert.equal((landingSource.match(/<(?:div|span)\b[^>]*\bdata-title-crown\b/g) || []).length, 1);
  assert.equal((landingSource.match(/<symbol\s+id="leaf"\s/g) || []).length, 1);
  assert.match(landingSource, /data-project="time"[^>]+data-href="\/web\/life-in-time\//);
  assert.equal((landingSource.match(/class="portal"/g) || []).length, 24);
  assert.doesNotMatch(landingSource, /voice(?:2|[- ]to[- ])voice|v2v/i);
});

test('title crown has separate entrance, rooted breathing, and deterministic cluster sway', () => {
  assert.match(landingSource, /class="[^"]*\bcrown-wrap\b[^"]*"[^>]*>[\s\S]*?<svg[^>]+class="crown"/);
  assert.ok((landingSource.match(/class="leaf-cluster"/g) || []).length >= 3);
  assert.match(homeCss, /\.crown\s*\{[\s\S]*animation:\s*crown-breathe/);
  assert.match(homeCss, /transform-origin:\s*50%\s+90%/);
  assert.match(homeCss, /\.leaf-cluster\s*\{[\s\S]*animation:\s*cluster-sway/);
  assert.match(homeCss, /\.crown-wrap[\s\S]*animation:\s*crown-enter/);
});

test('scroll-speed-linked sliding physics remains intact', () => {
  assert.match(threeSource, /function updateScrollPhysics\(dt\)/);
  assert.match(threeSource, /scroll\.velocity\s*\+=/);
  assert.match(threeSource, /scroll\.vNorm\s*=/);
  assert.match(slamsSource, /scroll\.vNorm/);
  assert.match(slamsSource, /scroll\.impact/);
  assert.match(slamsSource, /style\.setProperty\('--sx'/);
});

test('leaf fall fires once after leaving the hero and cleans up every generated SVG', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('html.is-born').waitFor({ state: 'attached' });
  assert.equal(await page.locator('[data-title-crown] svg').count(), 1);
  const crownAnimations = await page.evaluate(() => [
    ...document.querySelector('[data-title-crown]').getAnimations({ subtree: true }),
  ].map((animation) => animation.animationName));
  assert.ok(crownAnimations.includes('crown-enter'));
  assert.ok(crownAnimations.includes('crown-breathe'));
  assert.ok(crownAnimations.includes('cluster-sway'));
  await page.evaluate(() => scrollTo(0, innerHeight + 120));
  await page.locator('.falling-leaf').first().waitFor({ state: 'attached' });
  const count = await page.locator('.falling-leaf').count();
  assert.ok(count >= 6 && count <= 10, `expected 6–10 leaves, received ${count}`);

  const fills = await page.locator('.falling-leaf').evaluateAll((leaves) =>
    [...new Set(leaves.map((leaf) => getComputedStyle(leaf).fill))]);
  assert.ok(fills.length >= 3);

  await page.locator('.falling-leaf').evaluateAll((leaves) => {
    for (const leaf of leaves) leaf.dispatchEvent(new AnimationEvent('animationend'));
  });
  assert.equal(await page.locator('.falling-leaf').count(), 0);

  await page.evaluate(() => {
    scrollTo(0, 0);
    scrollTo(0, innerHeight + 120);
  });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.falling-leaf').count(), 0);
  await page.close();
});

test('reduced motion skips leaf generation entirely', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => scrollTo(0, innerHeight + 120));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.falling-leaf').count(), 0);
  await context.close();
});
