const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const storageKey = 'sdforest:manifesto:reading-position';
const manifestoRoutes = [
  '/web/manifesto-newborn/',
  '/web/manifesto-newborn/bg/',
  '/web/manifesto-newborn/de/',
  '/web/manifesto-newborn/es/',
  '/web/manifesto-newborn/fr/',
  '/web/manifesto-newborn/it/',
  '/web/manifesto-newborn/mk/',
  '/web/manifesto-newborn/pt/',
  '/web/manifesto-newborn/ru/',
  '/web/manifesto-newborn/zh/',
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

async function scrollRatio(page) {
  return page.evaluate(() => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    return scrollY / maxScroll;
  });
}

async function waitForRatio(page, expected) {
  await page.waitForFunction(
    (target) => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      return Math.abs((scrollY / maxScroll) - target) <= 0.03;
    },
    expected,
  );
}

async function activateLanguage(page, hreflang) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.locator(`.lang a[hreflang="${hreflang}"]`).evaluate((link) => link.click()),
  ]);
}

test('Manifesto preserves a bounded reading ratio across EN, BG, ZH, and back to EN', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const writes = [];
  await page.exposeFunction('__recordManifestoSessionWrite', (key, value) => {
    writes.push({ key, value: JSON.parse(value) });
  });
  await page.addInitScript(({ key }) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(storageKey, value) {
      if (this === sessionStorage && storageKey === key) {
        window.__recordManifestoSessionWrite(storageKey, value);
      }
      return original.call(this, storageKey, value);
    };
  }, { key: storageKey });
  await page.goto(`${baseUrl}/web/manifesto-newborn/`, { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    scrollTo(0, maxScroll * 0.42);
  });
  const enRatio = await scrollRatio(page);
  await activateLanguage(page, 'bg');
  await page.waitForURL('**/web/manifesto-newborn/bg/');
  await waitForRatio(page, enRatio);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, storageKey);
  assert.equal(writes[0].value.target, '/web/manifesto-newborn/bg/');
  assert.ok(writes[0].value.ratio >= 0 && writes[0].value.ratio <= 1);
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), storageKey), null);

  await page.evaluate(() => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    scrollTo(0, maxScroll * 0.61);
  });
  const bgRatio = await scrollRatio(page);
  await activateLanguage(page, 'zh-Hans');
  await page.waitForURL('**/web/manifesto-newborn/zh/');
  await waitForRatio(page, bgRatio);
  assert.equal(writes.length, 2);
  assert.equal(writes[1].value.target, '/web/manifesto-newborn/zh/');
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), storageKey), null);

  const zhRatio = await scrollRatio(page);
  await activateLanguage(page, 'en');
  await page.waitForURL('**/web/manifesto-newborn/');
  await waitForRatio(page, zhRatio);
  assert.equal(writes.length, 3);
  assert.equal(writes[2].value.target, '/web/manifesto-newborn/');
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), storageKey), null);
  await context.close();
});

test('Manifesto ignores and retains a stale reading target for another pathname', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/manifesto-newborn/`, { waitUntil: 'networkidle' });
  await page.evaluate(({ key }) => {
    sessionStorage.setItem(key, JSON.stringify({
      target: '/web/manifesto-newborn/fr/',
      ratio: 0.75,
    }));
    scrollTo(0, 0);
  }, { key: storageKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.ok((await scrollRatio(page)) < 0.03);
  assert.notEqual(await page.evaluate((key) => sessionStorage.getItem(key), storageKey), null);
  await context.close();
});

test('every Manifesto locale exposes its final static reduced-motion reading state', async () => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  for (const route of manifestoRoutes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => ({
      plexusHidden: document.querySelector('#plexus')?.hidden,
      plexusDisplay: getComputedStyle(document.querySelector('#plexus')).display,
      bodyOverflow: document.body.scrollWidth - document.documentElement.clientWidth,
      activeLanguages: document.querySelectorAll('.lang [aria-current="page"]').length,
    }));
    assert.equal(state.plexusHidden, true, route);
    assert.equal(state.plexusDisplay, 'none', route);
    assert.ok(state.bodyOverflow <= 1, route);
    assert.equal(state.activeLanguages, 1, route);
  }
  await context.close();
});

test('Design History fully retints and resets every Playful Grove surface', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const routes = [
    '/web/kids/',
    '/web/math-mania/',
    '/web/kids-movie-library/',
  ];
  const historical = {
    bg: '#020617',
    surface: '#0b1220',
    ink: '#e5e7eb',
    yellow: '#38bdf8',
    moss: '#22c55e',
    coral: '#f472b6',
    sky: '#38bdf8',
  };

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const root = document.documentElement;
      const properties = [
        '--grove-bg',
        '--grove-surface',
        '--grove-ink',
        '--grove-yellow',
        '--grove-moss',
        '--grove-coral',
        '--grove-sky',
      ];
      const read = () => {
        const style = getComputedStyle(root);
        return Object.fromEntries(properties.map((property) => [
          property.replace('--grove-', ''),
          style.getPropertyValue(property).trim().toLowerCase(),
        ]));
      };
      const original = read();
      window.__forestDesignHistory.apply('prompt-builder');
      const applied = read();
      window.__forestDesignHistory.reset();
      const reset = read();
      const inlineAfterReset = Object.fromEntries(properties.map((property) => [
        property,
        root.style.getPropertyValue(property),
      ]));
      return { original, applied, reset, inlineAfterReset };
    });

    assert.deepEqual(state.applied, historical, route);
    assert.deepEqual(state.reset, state.original, route);
    assert.ok(Object.values(state.inlineAfterReset).every((value) => value === ''), route);
  }
  await context.close();
});
