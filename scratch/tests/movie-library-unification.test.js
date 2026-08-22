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
    let filePath = path.resolve(repoRoot, requestPath.replace(/^\/+/, ''));
    if (!filePath.startsWith(repoRoot)) return response.writeHead(403).end('Forbidden');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return response.writeHead(404).end('Not found');
    }
    const contentType = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    }[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': contentType });
    fs.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
});

async function openMoviePage() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/kids-movie-library/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.movie-card').first().waitFor();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.movie-card').first().waitFor();
  return { context, page };
}

after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

test('reconciles the curated and imported Klaus records into one rich card', async () => {
  const { context, page } = await openMoviePage();
  await page.locator('#searchInput').fill('Klaus');
  await page.waitForTimeout(180);

  const cards = page.locator('.movie-card');
  assert.equal(await cards.count(), 1);
  assert.match(await cards.first().textContent(), /Netflix/);
  assert.match(await cards.first().textContent(), /IMDb 8\.2/);
  assert.equal(await cards.first().evaluate((card) => card.classList.contains('watched')), true);
  await context.close();
});

test('renders imported movies in the normal card collection with no archive surface', async () => {
  const { context, page } = await openMoviePage();
  await page.locator('#searchInput').fill('Big Hero 6');
  await page.waitForTimeout(180);

  assert.equal(await page.locator('.movie-card').count(), 1);
  assert.match(await page.locator('.movie-card h2').textContent(), /^Big Hero 6$/);
  assert.equal(await page.locator('.already-watched').count(), 0);

  await page.locator('#searchInput').fill('');
  await page.waitForTimeout(180);
  const titles = await page.locator('.movie-card h2').allTextContents();
  assert.equal(titles.length, 74);
  assert.equal(new Set(titles.map((title) => title.toLocaleLowerCase())).size, titles.length);
  assert.equal(await page.locator('#movieTotal').textContent(), '74');
  assert.equal(await page.locator('#watchedTotal').textContent(), '34');
  await context.close();
});

test('renders a safe explicit fallback when imported IMDb metadata is missing', async () => {
  const { context, page } = await openMoviePage();
  await page.locator('#searchInput').fill('Abominable');
  await page.waitForTimeout(180);

  const card = page.locator('.movie-card');
  assert.equal(await card.count(), 1);
  assert.match(await card.textContent(), /IMDb pending/);
  await context.close();
});

test('uses imported watch history initially but lets persisted user state override it', async () => {
  const { context, page } = await openMoviePage();
  await page.locator('#searchInput').fill('Klaus');
  await page.waitForTimeout(180);
  assert.equal(await page.locator('.movie-card.watched').count(), 1);

  await page.evaluate(() => {
    localStorage.setItem('forestKidsMoviesState', JSON.stringify({
      'Klaus-2019': { watched: false, rating: 4 },
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#searchInput').fill('Klaus');
  await page.waitForTimeout(180);

  const card = page.locator('.movie-card');
  assert.equal(await card.count(), 1);
  assert.equal(await card.evaluate((element) => element.classList.contains('watched')), false);
  assert.equal(await card.locator('.watch-btn').textContent(), 'Mark watched');
  assert.equal(await card.locator('.star-btn.active').count(), 4);
  await context.close();
});
