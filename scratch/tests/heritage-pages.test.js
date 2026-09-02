const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const manifestoLocales = ['', 'bg', 'de', 'es', 'fr', 'it', 'mk', 'pt', 'ru', 'zh'];
const pageFiles = [
  'web/calendar/index.html',
  'web/m-popova/index.html',
  ...manifestoLocales.map((locale) =>
    path.posix.join('web/manifesto-newborn', locale, 'index.html')),
];

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

test('calendar, poetry, and every manifesto locale use the canonical dark chrome', () => {
  for (const relativeFile of pageFiles) {
    const source = fs.readFileSync(path.join(repoRoot, relativeFile), 'utf8') +
      (relativeFile === 'web/calendar/index.html'
        ? fs.readFileSync(path.join(repoRoot, 'web/calendar/styles.css'), 'utf8')
        : '');
    assert.match(source, /--bg:\s*#07070b\b/, `${relativeFile} must declare --bg`);
    assert.match(source, /--surface:\s*#0f0f15\b/, `${relativeFile} must declare --surface`);
    assert.match(source, /--accent:\s*#4f46e5\b/, `${relativeFile} must declare --accent`);
    assert.match(source, /href="\/"[^>]*>[^<]*(?:Forest HUB|SDForest)/, `${relativeFile} needs a Forest HUB return`);
    assert.match(source, /forest-motion\.js\?v=20260725c/, `${relativeFile} must load current ambient motion`);
  }
});

for (const route of [
  '/web/calendar/',
  '/web/manifesto-newborn/',
  '/web/manifesto-newborn/bg/',
  '/web/manifesto-newborn/mk/',
  '/web/manifesto-newborn/zh/',
  '/web/m-popova/',
]) {
  test(`${route} is contained and operable at 390px`, async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await page.locator('body').waitFor();
    const state = await page.evaluate(() => {
      const back = [...document.querySelectorAll('a')].find((link) =>
        /Forest HUB|SDForest/i.test(link.textContent || ''));
      const backRect = back?.getBoundingClientRect();
      const style = getComputedStyle(document.documentElement);
      return {
        bodyWidth: document.body.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        bg: style.getPropertyValue('--bg').trim(),
        surface: style.getPropertyValue('--surface').trim(),
        accent: style.getPropertyValue('--accent').trim(),
        backVisible: Boolean(backRect && backRect.width > 0 && backRect.height > 0),
      };
    });
    assert.ok(state.bodyWidth <= state.viewportWidth + 1);
    assert.deepEqual(
      [state.bg, state.surface, state.accent],
      ['#07070b', '#0f0f15', '#4f46e5'],
    );
    assert.equal(state.backVisible, true);
    await page.close();
  });
}

test('poetry reveals all words without delayed timers for reduced-motion readers', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/m-popova/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.word').count(), 0);
  assert.match(await page.locator('.poem-body').first().textContent(), /You are here/);
  await context.close();
});

test('manifesto suspends its legacy plexus for reduced-motion readers', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/manifesto-newborn/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#plexus').getAttribute('hidden'), '');
  await context.close();
});
