const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(repoRoot, 'web/life-in-time/index.html'), 'utf8');

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

test('publishes canonical tokens, an accessible year meter, and a prominent late-achiever pivot', () => {
  assert.match(html, /--bg:\s*#07070b\b/);
  assert.match(html, /--surface:\s*#0f0f15\b/);
  assert.match(html, /--accent:\s*#4f46e5\b/);
  assert.match(html, /class="year-prog-track"[^>]+role="progressbar"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="100"/);
  assert.match(html, /id="late-achiever-title"[^>]*>The late-achiever pivot</);
  assert.match(html, /prefers-reduced-motion/);
});

test('a shared URL restores all current inputs and results on reload', async () => {
  const context = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText(value) {
          window.__copiedLifeUrl = value;
          return Promise.resolve();
        },
      },
    });
  });
  const page = await context.newPage();
  await page.goto(
    `${baseUrl}/web/life-in-time/?by=1988&py=1960&cy=2018&le=89`,
    { waitUntil: 'domcontentloaded' },
  );

  await page.locator('#results').waitFor({ state: 'visible' });
  assert.deepEqual(await page.locator('#birthYear, #parentYear, #childYear, #lifeExp').evaluateAll(
    (inputs) => inputs.map((input) => input.value),
  ), ['1988', '1960', '2018', '89']);

  await page.locator('.btn-pivot').click();
  await page.locator('#positive').waitFor({ state: 'visible' });
  await page.locator('#shareBtn').click();
  const copied = await page.evaluate(() => window.__copiedLifeUrl);
  const copiedUrl = new URL(copied);
  assert.equal(copiedUrl.pathname, '/web/life-in-time/');
  assert.deepEqual(Object.fromEntries(copiedUrl.searchParams), {
    by: '1988',
    py: '1960',
    cy: '2018',
    le: '89',
  });

  await page.goto(copied, { waitUntil: 'domcontentloaded' });
  await page.locator('#results').waitFor({ state: 'visible' });
  assert.deepEqual(await page.locator('#birthYear, #parentYear, #childYear, #lifeExp').evaluateAll(
    (inputs) => inputs.map((input) => input.value),
  ), ['1988', '1960', '2018', '89']);
  await context.close();
});

test('year meter is current and the mobile layout stays inside the viewport', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/life-in-time/`, { waitUntil: 'domcontentloaded' });

  const meter = page.locator('.year-prog-track');
  const current = Number(await meter.getAttribute('aria-valuenow'));
  assert.ok(current >= 0 && current <= 100);
  assert.ok(await meter.getAttribute('aria-valuetext'));
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    trackHeight: document.querySelector('.year-prog-track').getBoundingClientRect().height,
  }));
  assert.equal(dimensions.body, dimensions.viewport);
  assert.ok(dimensions.trackHeight >= 14);
  await context.close();
});
