const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(repoRoot, 'web/mendeleev-bg/index.html'), 'utf8');

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

test('uses canonical chrome tokens and exposes an accessible element deep-dive', () => {
  assert.match(html, /--bg:\s*#07070b\b/);
  assert.match(html, /--surface:\s*#0f0f15\b/);
  assert.match(html, /--accent:\s*#4f46e5\b/);
  assert.match(html, /id="overlay"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html, /class="compound-actions"/);
  assert.doesNotMatch(html, /mendeleev-table/i);
});

test('starts Bulgarian-first, preserves keyboard selection, and confines hover decoration to hover devices', async () => {
  assert.match(html, /let currentLang = 'bg'/);
  assert.match(html, /@media \(hover:hover\)[\s\S]*#langBtn:hover/);

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await page.goto(`${baseUrl}/web/mendeleev-bg/?touch-selection`, { waitUntil: 'domcontentloaded' });
  assert.match(await page.locator('.subtitle').textContent(), /Кликни на символа/);

  const hydrogen = page.locator('.el[data-num="1"] .sym-wrap');
  await hydrogen.focus();
  await page.keyboard.press('Enter');
  await page.locator('#overlay.on').waitFor({ state: 'visible' });
  assert.match(await page.locator('#mhead h2').textContent(), /Водород/);
  await page.keyboard.press('Escape');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  await page.close();
});

test('compound highlighting survives language changes on a mobile viewport', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/web/mendeleev-bg/?mobile-compound`, { waitUntil: 'domcontentloaded' });

  const compoundButton = page.locator('.compound-actions .cbtn:not(.reset)').first();
  await compoundButton.click();
  assert.equal(await compoundButton.getAttribute('class').then((value) => value.includes('active')), true);
  assert.equal(await page.locator('#ptGrid').getAttribute('class').then((value) => value.includes('compound-on')), true);
  assert.ok(await page.locator('#ptGrid .el.lit').count() >= 2);
  assert.ok(await compoundButton.evaluate((button) => button.getBoundingClientRect().height) >= 44);

  await page.locator('#langBtn').click();
  assert.match(await page.locator('.subtitle').textContent(), /Click element symbol/i);
  assert.ok(await page.locator('.compound-actions .cbtn.active').count() === 1);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    actionOverflow: document.querySelector('.compound-actions').scrollWidth >
      document.querySelector('.compound-actions').clientWidth,
  }));
  assert.equal(dimensions.body, dimensions.viewport);
  assert.equal(dimensions.actionOverflow, true);
  await page.close();
});

test('Bulgarian element detail is readable and contained on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/web/mendeleev-bg/?mobile-modal`, { waitUntil: 'domcontentloaded' });
  await page.locator('.el[data-num="1"] .sym-wrap').click();
  await page.locator('#overlay.on').waitFor({ state: 'visible' });

  assert.match(await page.locator('#mhead h2').textContent(), /Водород/);
  assert.equal(await page.locator('#overlay').getAttribute('aria-modal'), 'true');
  const layout = await page.evaluate(() => {
    const modal = document.querySelector('#modal');
    const body = document.querySelector('#mbody');
    const rect = modal.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      direction: getComputedStyle(body).flexDirection,
      contentFits: modal.scrollWidth <= modal.clientWidth,
      activeElementIsClose: document.activeElement?.classList.contains('xbtn'),
    };
  });
  assert.ok(layout.left >= 0 && layout.right <= layout.viewportWidth);
  assert.ok(layout.top >= 0 && layout.bottom <= layout.viewportHeight);
  assert.equal(layout.direction, 'column');
  assert.equal(layout.contentFits, true);
  assert.equal(layout.activeElementIsClose, true);

  await page.keyboard.press('Escape');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  await page.close();
});

test('trend content is external bilingual data with qualitative provenance', () => {
  const trendsPath = path.join(repoRoot, 'web/mendeleev-bg/data/trends.json');
  assert.equal(fs.existsSync(trendsPath), true, 'trend content should live in data/trends.json');
  assert.match(html, /fetch\('data\/trends\.json'/);
  assert.doesNotMatch(html, /atomic-size|ionization-energy|electronegativity/);

  const trends = JSON.parse(fs.readFileSync(trendsPath, 'utf8'));
  assert.ok(Array.isArray(trends) && trends.length >= 3);
  for (const trend of trends) {
    assert.ok(trend.id);
    assert.ok(trend.bg?.label && trend.en?.label);
    assert.ok(trend.bg?.explanation && trend.en?.explanation);
    assert.ok(trend.source?.bg && trend.source?.en);
    assert.equal(Object.keys(trend.values).length, 118);
    assert.ok(Object.values(trend.values).every((level) => Number.isInteger(level) && level >= 1 && level <= 5));
  }
});

test('trend lens maps the symbolic table to a qualitative submicroscopic reading', async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await page.goto(`${baseUrl}/web/mendeleev-bg/?trend-lens`, { waitUntil: 'networkidle' });

  assert.equal(await page.locator('#trendBar').count(), 1);
  assert.ok(await page.locator('.trend-btn').count() >= 3);

  const firstTrend = page.locator('.trend-btn').first();
  await firstTrend.click();
  assert.equal(await firstTrend.getAttribute('aria-pressed'), 'true');
  assert.ok(await page.locator('#ptGrid.trend-on').count() === 1);
  assert.ok(await page.locator('.el[data-trend-level]').count() >= 118);
  assert.match(await page.locator('#trendExplainer').textContent(), /модел|Модел/);

  await page.locator('.el[data-num="1"] .sym-wrap').click();
  await page.locator('#overlay.on').waitFor({ state: 'visible' });
  assert.ok(await page.locator('.trend-reading').count() === 1);
  assert.match(await page.locator('.trend-reading').textContent(), /ниско|средно|високо/i);
  await page.close();
});

test('trend lens remains active and translates its explanation to English', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/web/mendeleev-bg/?trend-language`, { waitUntil: 'networkidle' });

  await page.locator('.trend-btn').nth(1).click();
  await page.locator('#langBtn').click();
  assert.match(await page.locator('#trendExplainer').textContent(), /pattern|electron|pull/i);
  assert.equal(await page.locator('.trend-btn[aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator('#ptGrid.trend-on').count(), 1);
  assert.equal(await page.locator('#ptGrid').getAttribute('data-trend-id'), await page.locator('.trend-btn[aria-pressed="true"]').getAttribute('data-trend-id'));
  assert.ok(await page.locator('.trend-btn').first().evaluate((button) => button.getBoundingClientRect().height >= 44));
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
  }));
  assert.equal(dimensions.body, dimensions.viewport);
  await page.close();
});
