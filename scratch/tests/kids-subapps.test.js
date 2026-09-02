const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const mathSource = fs.readFileSync(path.join(repoRoot, 'web/math-mania/index.html'), 'utf8');
const moviesSource = fs.readFileSync(path.join(repoRoot, 'web/kids-movie-library/styles.css'), 'utf8');

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
      '.json': 'application/json; charset=utf-8',
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

test('both Kids Corner sub-apps declare the canonical house chrome', () => {
  for (const [label, source] of [['Math Mania', mathSource], ['Movie Library', moviesSource]]) {
    assert.match(source, /--bg:\s*#07070b\b/, `${label} --bg`);
    assert.match(source, /--surface:\s*#0f0f15\b/, `${label} --surface`);
    assert.match(source, /--accent:\s*#4f46e5\b/, `${label} --accent`);
  }
  assert.doesNotMatch(moviesSource, /(?:animation|transition)[^;]*\b(?:0?\.\d+s|\d+ms)\b/);
});

test('Math Mania remains an operable, contained portal on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/web/math-mania/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('iframe[title="Math Mania Lovable app"]').count(), 1);
  assert.equal(await page.locator('a[href="/web/kids/"]').count() >= 2, true);
  const state = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    surface: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    minAction: Math.min(...[...document.querySelectorAll('.button')].map(
      (button) => button.getBoundingClientRect().height,
    )),
  }));
  assert.ok(state.bodyWidth <= state.viewportWidth + 1);
  assert.deepEqual([state.bg, state.surface, state.accent], ['#07070b', '#0f0f15', '#4f46e5']);
  assert.ok(state.minAction >= 44);
  await page.close();
});

test('Movie Library filtering and watched state persist on mobile', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/kids-movie-library/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.movie-card').first().waitFor();
  await page.locator('#searchInput').fill('Klaus');
  await page.waitForTimeout(180);
  assert.equal(await page.locator('.movie-card').count(), 1);
  assert.match(await page.locator('.movie-card h2').textContent(), /Klaus/i);
  await page.locator('.watch-btn').click();
  assert.equal(await page.locator('.movie-card.watched').count(), 1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#statusFilter').selectOption('watched');
  await page.locator('#searchInput').fill('Klaus');
  await page.waitForTimeout(180);
  assert.equal(await page.locator('.movie-card.watched').count(), 1);

  const state = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    surface: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    controls: [...document.querySelectorAll('input, select, button')]
      .filter((element) => element.getClientRects().length)
      .map((element) => ({
        label: element.id || element.className || element.tagName,
        height: element.getBoundingClientRect().height,
      })),
  }));
  assert.ok(state.bodyWidth <= state.viewportWidth + 1);
  assert.deepEqual([state.bg, state.surface, state.accent], ['#07070b', '#0f0f15', '#4f46e5']);
  const undersized = state.controls.filter(({ height }) => height < 44);
  assert.deepEqual(undersized, []);
  await context.close();
});
