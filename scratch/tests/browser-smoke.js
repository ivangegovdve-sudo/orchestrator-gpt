const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const STATIC_ROOT = process.env.SDFOREST_STATIC_ROOT;
const BASE = process.env.SDFOREST_BASE_URL || (STATIC_ROOT ? 'http://sdforest.local' : 'http://127.0.0.1:4173');
const OUTPUT = process.env.SDFOREST_QA_OUTPUT || '/tmp/sdforest-qa';
const launchedBrowsers = [];

const routes = [
  '/',
  '/web/vfx-portfolio/index.html',
  '/web/council/index.html',
  '/web/replicator-void/index.html',
  '/web/hypertrophyos/index.html',
  '/web/morning-news/index.html',
  '/web/life-in-time/index.html',
  '/web/kids/index.html',
  '/web/womens-health-os/index.html',
  '/web/library/index.html',
  '/web/open-dashboard/index.html',
  '/web/calendar/index.html',
  '/web/manifesto-newborn/index.html',
  '/web/m-popova/index.html',
  '/web/power-law-odyssey/index.html?seed=qa-seed',
];

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const launchOptions = { headless: true };
  if (process.env.SDFOREST_CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.SDFOREST_CHROMIUM_PATH;
    if (process.platform !== 'win32') {
      launchOptions.args = [
        '--ash-no-nudges', '--disable-domain-reliability', '--disable-print-preview',
        '--no-default-browser-check', '--no-pings', '--single-process', '--font-render-hinting=none',
        '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process',
        '--enable-features=SharedArrayBuffer', '--ignore-gpu-blocklist', '--in-process-gpu',
        '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--allow-running-insecure-content', '--disable-setuid-sandbox', '--disable-site-isolation-trials',
        '--disable-web-security', '--no-sandbox', '--no-zygote', '--disable-dev-shm-usage',
      ];
    }
  }
  const browser = await chromium.launch(launchOptions);
  launchedBrowsers.push(browser);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await installRoutes(context);

  const failures = [];
  for (const route of routes) {
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    try {
      const response = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      assert.ok(response && response.ok(), `${route} returned ${response?.status()}`);
      assert.ok(await page.title(), `${route} has no title`);
      await page.waitForTimeout(route.includes('replicator') ? 900 : 120);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const overflowSources = overflow > 3 ? await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        return [...document.querySelectorAll('body *')]
          .map((element) => ({ element, rect: element.getBoundingClientRect() }))
          .filter(({ rect }) => rect.right > viewport + 3 || rect.left < -3)
          .slice(0, 6)
          .map(({ element, rect }) => `${element.tagName.toLowerCase()}.${element.className || ''}[${Math.round(rect.left)},${Math.round(rect.right)}]`);
      }) : [];
      assert.ok(overflow <= 3, `${route} overflows horizontally by ${overflow}px (${overflowSources.join(', ')})`);
      assert.deepEqual(pageErrors, [], `${route} page errors: ${pageErrors.join(' | ')}`);
      if (route.includes('power-law-odyssey')) {
        assert.equal(await page.locator('.back-link').evaluate((element) => getComputedStyle(element).position), 'fixed');
        assert.equal(await page.locator('.progress-rail').evaluate((element) => getComputedStyle(element).position), 'fixed');
      }
      if (route.includes('womens-health-os')) {
        assert.equal(await page.locator('.wh-chat-fab').evaluate((element) => getComputedStyle(element).position), 'fixed');
        assert.equal(await page.locator('.wh-chat-panel').evaluate((element) => getComputedStyle(element).position), 'fixed');
      }
    } catch (error) {
      failures.push(error.message);
    } finally {
      await page.close();
    }
  }

  const home = await context.newPage();
  await home.goto(BASE, { waitUntil: 'domcontentloaded' });
  assert.equal(await home.locator('.portal').count(), 16);
  await home.screenshot({ path: `${OUTPUT}/home-landing.png`, fullPage: false });
  await home.evaluate(() => {
    const assembly = document.querySelector('[data-assembly]');
    scrollTo(0, assembly.offsetTop + assembly.offsetHeight - innerHeight);
  });
  await home.waitForTimeout(320);
  await home.locator('[data-project="vfx"]').hover();
  await home.waitForTimeout(180);
  assert.equal(await home.locator('[data-preview-title]').textContent(), 'VFX Portfolio');
  const overviewPortal = home.locator('[data-project="open-dashboard"]');
  await overviewPortal.focus();
  await home.waitForFunction(() => window.__forestThree?.tiles?.some((tile) => tile.element.dataset.project === 'open-dashboard'));
  await home.waitForFunction(() => {
    const tile = window.__forestThree?.tiles?.find((item) => item.element.dataset.project === 'open-dashboard');
    return tile?.target === 1 && tile.alpha > 0;
  });
  const overviewTileDebug = await home.evaluate(() => {
    const tile = window.__forestThree?.tiles?.find((item) => item.element.dataset.project === 'open-dashboard');
    return {
      primaryAccent: tile ? `#${tile.accentColor.getHexString()}` : null,
      secondaryAccent: tile ? `#${tile.secondaryColor.getHexString()}` : null,
      parts: tile?.parts.map(({ object }) => ({
        colorVertexCount: object.geometry?.attributes?.color?.count ?? 0,
        vertexColors: object.material?.vertexColors === true,
      })) ?? [],
    };
  });
  assert.equal(overviewTileDebug.primaryAccent, '#73e9ff');
  assert.equal(overviewTileDebug.secondaryAccent, '#a9b2ff');
  assert.ok(
    overviewTileDebug.parts.some((part) => part.colorVertexCount > 0 && part.vertexColors),
    `Open Dashboard tile lacks populated vertex-color geometry: ${JSON.stringify(overviewTileDebug)}`,
  );
  assert.equal(await overviewPortal.getAttribute('aria-pressed'), 'true');
  assert.equal(await home.locator('[data-preview-number]').textContent(), '07');
  assert.equal(await home.locator('[data-preview-title]').textContent(), 'Open Dashboard');
  assert.equal(await home.locator('[data-preview-status]').textContent(), 'Public snapshot');
  assert.equal(
    await home.locator('[data-preview-description]').textContent(),
    'Compare OpenRouter models and apps with GitHub AI ecosystems through ten-deep rankings, observed relationships, lifecycle signals, and clearly labeled source evidence.',
  );
  assert.equal(await home.locator('[data-preview-open]').getAttribute('href'), '/web/open-dashboard/index.html');
  assert.equal(await home.locator('[data-preview-open]').getAttribute('target'), '_self');
  await home.screenshot({ path: `${OUTPUT}/home-dashboard.png`, fullPage: false });
  await home.close();

  const vfx = await context.newPage();
  await vfx.goto(`${BASE}/web/vfx-portfolio/index.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await vfx.locator('.experience-card').count(), 9);
  assert.equal(await vfx.locator('.game-link').count(), 39);
  assert.ok(await vfx.locator('.vfx-portrait').evaluate((image) => image.complete && image.naturalWidth > 0));
  await vfx.screenshot({ path: `${OUTPUT}/vfx-portfolio.png`, fullPage: false });
  await vfx.close();

  const council = await context.newPage();
  await council.goto(`${BASE}/web/council/index.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await council.locator('[data-council-mode]').count(), 2);
  await council.close();

  const voidPage = await context.newPage();
  await voidPage.goto(`${BASE}/web/replicator-void/index.html`, { waitUntil: 'domcontentloaded' });
  await voidPage.waitForTimeout(900);
  assert.ok(Number(await voidPage.locator('#population').textContent()) > 0);
  await voidPage.close();

  const hyper = await context.newPage();
  await hyper.goto(`${BASE}/web/hypertrophyos/index.html`, { waitUntil: 'domcontentloaded' });
  await hyper.locator('#lift-weight').fill('100');
  await hyper.locator('#lift-reps').fill('5');
  assert.equal(await hyper.locator('#one-rm').textContent(), '112.5');
  await hyper.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await installRoutes(mobile);
  const mobileHome = await mobile.newPage();
  await mobileHome.goto(BASE, { waitUntil: 'domcontentloaded' });
  assert.equal(await mobileHome.locator('.portal').count(), 16);
  assert.equal(await mobileHome.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
  await mobileHome.locator('[data-project="open-dashboard"] .portal-icon').click();
  assert.equal(await mobileHome.locator('[data-preview-title]').textContent(), 'Open Dashboard');
  assert.equal(await mobileHome.locator('[data-preview-status]').textContent(), 'Public snapshot');
  const mobileOverflow = await mobileHome.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(mobileOverflow <= 3, `mobile home overflows by ${mobileOverflow}px`);
  await mobileHome.screenshot({ path: `${OUTPUT}/home-mobile.png`, fullPage: false });

  await mobileHome.setViewportSize({ width: 834, height: 1112 });
  await mobileHome.reload({ waitUntil: 'domcontentloaded' });
  const tabletLayout = await mobileHome.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const board = document.querySelector('.portal-board').getBoundingClientRect();
    const preview = document.querySelector('.preview-stage').getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - viewport,
      boardFits: board.left >= 0 && board.right <= viewport,
      previewFits: preview.left >= 0 && preview.right <= viewport,
      columns: getComputedStyle(document.querySelector('.factory-frame')).gridTemplateColumns,
    };
  });
  assert.ok(tabletLayout.overflow <= 3, `tablet home overflows by ${tabletLayout.overflow}px`);
  assert.ok(tabletLayout.boardFits && tabletLayout.previewFits, `tablet panels clip (${tabletLayout.columns})`);
  await mobileHome.locator('[data-assembly]').scrollIntoViewIfNeeded();
  await mobileHome.waitForTimeout(120);
  await mobileHome.screenshot({ path: `${OUTPUT}/home-tablet.png`, fullPage: false });
  await mobile.close();
  await context.close();
  await browser.close();

  // The serverless Chromium build runs in single-process mode in this sandbox;
  // use a fresh process for the reduced-motion profile instead of a third context.
  const calmBrowser = await chromium.launch(launchOptions);
  launchedBrowsers.push(calmBrowser);
  const calm = await calmBrowser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await installRoutes(calm);
  const calmHome = await calm.newPage();
  await calmHome.goto(BASE, { waitUntil: 'domcontentloaded' });
  assert.equal(await calmHome.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--assembly').trim()), '1');
  const calmOverview = calmHome.locator('[data-project="open-dashboard"]');
  assert.equal(await calmOverview.isVisible(), true);
  await calmOverview.focus();
  assert.equal(await calmHome.locator('[data-preview-title]').textContent(), 'Open Dashboard');
  assert.equal(await calmHome.evaluate(() => window.__forestThree?.webgl ?? false), false);
  await calmHome.screenshot({ path: `${OUTPUT}/home-reduced-motion.png`, fullPage: false });
  await calm.close();
  await calmBrowser.close();

  if (failures.length) throw new Error(`Route smoke failures:\n${failures.join('\n')}`);
  console.log(`Browser smoke passed: ${routes.length} routes, desktop/mobile/reduced-motion. Screenshots: ${OUTPUT}`);
}

async function installRoutes(context) {
  await context.route(/(youtube|vimeo|googleapis|gstatic|lovable|blumenkraft)\./, (route) => route.abort());
  if (!STATIC_ROOT) return;

  const mime = {
    '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.woff2': 'font/woff2',
  };
  await context.route('http://sdforest.local/**', async (route) => {
    const url = new URL(route.request().url());
    let relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
    const absolutePath = path.resolve(STATIC_ROOT, relativePath);
    const rootPath = path.resolve(STATIC_ROOT);
    const relativeToRoot = path.relative(rootPath, absolutePath);
    const escapesRoot = relativeToRoot === '..' || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot);
    if (escapesRoot || !fs.existsSync(absolutePath)) {
      await route.fulfill({ status: 404, body: 'Not found' });
      return;
    }
    const extension = path.extname(absolutePath).toLowerCase();
    await route.fulfill({ status: 200, contentType: mime[extension] || 'application/octet-stream', body: fs.readFileSync(absolutePath) });
  });
}

main().catch(async (error) => {
  console.error(error.stack || error);
  await Promise.allSettled(launchedBrowsers.filter((browser) => browser.isConnected()).map((browser) => browser.close()));
  process.exitCode = 1;
});
