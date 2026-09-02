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
