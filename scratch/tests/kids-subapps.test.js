const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const kidsSource = fs.readFileSync(path.join(repoRoot, 'web/kids/index.html'), 'utf8');
const mathSource = fs.readFileSync(path.join(repoRoot, 'web/math-mania/index.html'), 'utf8');
const moviesSource = fs.readFileSync(path.join(repoRoot, 'web/kids-movie-library/styles.css'), 'utf8');
const movieAppSource = fs.readFileSync(path.join(repoRoot, 'web/kids-movie-library/app.js'), 'utf8');
const grovePalette = {
  '--grove-bg': '#100d0a',
  '--grove-surface': '#261c13',
  '--grove-ink': '#fff7dc',
  '--grove-yellow': '#ffd15a',
  '--grove-moss': '#8fe6ae',
  '--grove-coral': '#ff8a70',
  '--grove-sky': '#73e9ff',
};

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

test('the three repository-owned Kids surfaces declare the locked Playful Grove palette', () => {
  for (const [label, source] of [
    ['Kids Corner', kidsSource],
    ['Math Mania', mathSource],
    ['Movie Library', moviesSource],
  ]) {
    for (const [token, value] of Object.entries(grovePalette)) {
      assert.match(
        source,
        new RegExp(`${token}:\\s*${value.replace('#', '\\#')}\\b`),
        `${label} ${token}`,
      );
    }
  }
  assert.doesNotMatch(moviesSource, /(?:animation|transition)[^;]*\b(?:0?\.\d+s|\d+ms)\b/);
  assert.doesNotMatch(movieAppSource, /\.style\.animationDelay\b/);
});

test('Math Mania remains an operable, contained portal on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('https://forest-math-plus.lovable.app/**', (route) => route.abort());
  await page.goto(`${baseUrl}/web/math-mania/`, { waitUntil: 'domcontentloaded' });
  const frame = page.locator('iframe[title="Math Mania Lovable app"]');
  assert.equal(await frame.count(), 1);
  assert.equal(await frame.getAttribute('src'), 'https://forest-math-plus.lovable.app');
  assert.equal(await page.locator('a[href="/web/kids/"]').count() >= 2, true);
  const state = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bg: getComputedStyle(document.documentElement).getPropertyValue('--grove-bg').trim(),
    surface: getComputedStyle(document.documentElement).getPropertyValue('--grove-surface').trim(),
    ink: getComputedStyle(document.documentElement).getPropertyValue('--grove-ink').trim(),
    minAction: Math.min(...[...document.querySelectorAll('.button')].map(
      (button) => button.getBoundingClientRect().height,
    )),
  }));
  assert.ok(state.bodyWidth <= state.viewportWidth + 1);
  assert.deepEqual([state.bg, state.surface, state.ink], ['#100d0a', '#261c13', '#fff7dc']);
  assert.ok(state.minAction >= 44);
  await page.close();
});

test('Movie Library filtering and watched state persist on mobile', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/kids-movie-library/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.movie-card').first().waitFor();
  await page.locator('#searchInput').fill('Spirited Away');
  await page.waitForTimeout(180);
  assert.equal(await page.locator('.movie-card').count(), 1);
  assert.match(await page.locator('.movie-card h2').textContent(), /Spirited Away/i);
  await page.locator('.watch-btn').click();
  assert.equal(await page.locator('.movie-card.watched').count(), 1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#statusFilter').selectOption('watched');
  await page.locator('#searchInput').fill('Spirited Away');
  await page.waitForTimeout(180);
  assert.equal(await page.locator('.movie-card.watched').count(), 1);

  const state = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bg: getComputedStyle(document.documentElement).getPropertyValue('--grove-bg').trim(),
    surface: getComputedStyle(document.documentElement).getPropertyValue('--grove-surface').trim(),
    ink: getComputedStyle(document.documentElement).getPropertyValue('--grove-ink').trim(),
    controls: [...document.querySelectorAll('input, select, button')]
      .filter((element) => element.getClientRects().length)
      .map((element) => ({
        label: element.id || element.className || element.tagName,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
  }));
  assert.ok(state.bodyWidth <= state.viewportWidth + 1);
  assert.deepEqual([state.bg, state.surface, state.ink], ['#100d0a', '#261c13', '#fff7dc']);
  const undersized = state.controls.filter(({ width, height }) => width < 44 || height < 44);
  assert.deepEqual(undersized, []);
  await context.close();
});

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  for (const route of ['/web/kids/', '/web/math-mania/', '/web/kids-movie-library/']) {
    test(`${route} keeps every owned and shared control at least 44px at ${viewport.width}px`, async () => {
      const context = await browser.newContext({ viewport });
      await context.route('https://forest-math-plus.lovable.app/**', (request) => request.abort());
      const page = await context.newPage();
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });

      await page.locator('.dh-tab').click();
      await page.getByRole('button', { name: 'Close design history' }).waitFor();
      const historyControls = await page.locator('.dh-root a, .dh-root button')
        .evaluateAll((elements) => elements.filter((element) => {
          const style = getComputedStyle(element);
          return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden';
        }).map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') || element.textContent.trim(),
            width: rect.width,
            height: rect.height,
          };
        }));
      await page.getByRole('button', { name: 'Close design history' }).click();

      await page.getByRole('button', { name: 'Send feedback' }).click();
      const feedbackControls = await page.locator('[data-feedback-backdrop] button')
        .evaluateAll((elements) => elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { label: element.textContent.trim(), width: rect.width, height: rect.height };
        }));
      await page.locator('[data-feedback-close]').click();

      const pageControls = await page.locator('body > a, main a, main button, main input, main select, main textarea')
        .evaluateAll((elements) => elements.filter((element) => {
          const style = getComputedStyle(element);
          return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden';
        }).map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') || element.textContent.trim() || element.id,
            width: rect.width,
            height: rect.height,
          };
        }));

      const undersized = [...historyControls, ...feedbackControls, ...pageControls]
        .filter(({ width, height }) => width < 44 || height < 44);
      assert.deepEqual(undersized, []);
      assert.ok(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth + 1));
      await context.close();
    });
  }
}

test('Movie Library caps its token-driven card stagger at 800ms and skips it for reduced motion', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/web/kids-movie-library/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.movie-card').nth(11).waitFor();
  const delays = await page.locator('.movie-card').evaluateAll((cards) =>
    cards.slice(0, 12).map((card) => getComputedStyle(card).animationDelay));
  assert.deepEqual(delays.slice(0, 3), ['0s', '0.08s', '0.16s']);
  assert.deepEqual(delays.slice(10), ['0.8s', '0.8s']);
  await page.close();

  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const reducedPage = await context.newPage();
  await reducedPage.goto(`${baseUrl}/web/kids-movie-library/`, { waitUntil: 'domcontentloaded' });
  await reducedPage.locator('.movie-card').first().waitFor();
  const reduced = await reducedPage.locator('.movie-card').first().evaluate((card) => ({
    animationName: getComputedStyle(card).animationName,
    transitionDuration: getComputedStyle(card).transitionDuration,
    inlineStep: card.style.getPropertyValue('--movie-stagger-step'),
  }));
  assert.deepEqual(reduced, { animationName: 'none', transitionDuration: '0s', inlineStep: '' });
  await context.close();
});
