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
  const header = html.indexOf('class="header"');
  const meter = html.indexOf('class="year-prog-wrap"');
  const form = html.indexOf('class="form-wrap"');
  const wake = html.indexOf('class="wake-header"');
  const pivot = html.indexOf('class="pivot-wrap"', wake);
  const kid = html.indexOf('id="kidBlock"', wake);
  const stats = html.indexOf('id="statsGrid"', wake);
  assert.ok(header < meter && meter < form && form < wake && wake < pivot && pivot < kid && kid < stats);
  assert.equal((html.match(/class="year-prog-wrap"/g) || []).length, 1);
  assert.match(html, /var yearProgressRendered = false;/);
  assert.match(html, /function renderYearProgress\(\) \{\s*if \(yearProgressRendered\) return;\s*yearProgressRendered = true;/);
  assert.match(html, /function renderYearProgress\(\)[\s\S]*requestAnimationFrame\(function\(\) \{\s*requestAnimationFrame/);
  assert.match(html, /if \(REDUCED_MOTION\.matches\) \{\s*bar\.style\.width = pct \+ '%';\s*return;/);
});

test('a shared URL restores all current inputs and results in a fresh context', async () => {
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
    `${baseUrl}/web/life-in-time/?by=1988&py=1960&cy=2018&le=83`,
    { waitUntil: 'domcontentloaded' },
  );

  await page.locator('#results').waitFor({ state: 'visible' });
  assert.deepEqual(await page.locator('#birthYear, #parentYear, #childYear, #lifeExp').evaluateAll(
    (inputs) => inputs.map((input) => input.value),
  ), ['1988', '1960', '2018', '83']);

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
    le: '83',
  });

  await context.close();
  const freshContext = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  const freshPage = await freshContext.newPage();
  await freshPage.goto(copied, { waitUntil: 'domcontentloaded' });
  await freshPage.locator('#results').waitFor({ state: 'visible' });
  assert.deepEqual(await freshPage.locator('#birthYear, #parentYear, #childYear, #lifeExp').evaluateAll(
    (inputs) => inputs.map((input) => input.value),
  ), ['1988', '1960', '2018', '83']);
  await freshContext.close();
});

test('normal-motion year progress waits for two animation frames before arriving', async () => {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 700 },
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    const frames = [];
    window.requestAnimationFrame = (callback) => {
      frames.push(callback);
      return frames.length;
    };
    window.cancelAnimationFrame = () => {};
    window.__flushLifeFrame = () => {
      const wave = frames.splice(0, frames.length);
      wave.forEach((callback) => callback(performance.now()));
    };
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/life-in-time/`, {
    waitUntil: 'domcontentloaded',
  });
  assert.equal(await page.locator('#results').isVisible(), false);
  assert.equal(await page.locator('.year-prog-wrap').isVisible(), true);

  const readMeter = () => page.locator('#yearProgBar').evaluate((bar) => {
    const style = getComputedStyle(bar);
    const meter = bar.parentElement;
    return {
      width: bar.style.width,
      target: `${meter.getAttribute('aria-valuenow')}%`,
      duration: style.transitionDuration,
      easing: style.transitionTimingFunction,
    };
  });
  assert.equal((await readMeter()).width, '0%');
  await page.evaluate(() => window.__flushLifeFrame());
  assert.equal((await readMeter()).width, '0%');
  await page.evaluate(() => window.__flushLifeFrame());
  const arrived = await readMeter();
  assert.equal(arrived.width, arrived.target);
  assert.equal(arrived.duration, '0.6s');
  assert.equal(arrived.easing, 'cubic-bezier(0.16, 1, 0.3, 1)');
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
    fillWidth: document.querySelector('#yearProgBar').style.width,
  }));
  assert.equal(dimensions.body, dimensions.viewport);
  assert.ok(dimensions.trackHeight >= 14);
  assert.equal(dimensions.fillWidth, `${current}%`);
  await context.close();
});
