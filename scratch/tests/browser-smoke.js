const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const BASE = process.env.SDFOREST_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT = process.env.SDFOREST_QA_OUTPUT || '/tmp/sdforest-qa';

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
  '/web/calendar/index.html',
  '/web/manifesto-newborn/index.html',
  '/web/m-popova/index.html',
  '/web/power-law-odyssey/index.html?seed=qa-seed',
];

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.route(/(youtube|vimeo|googleapis|gstatic|lovable|blumenkraft)\./, (route) => route.abort());

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
      assert.ok(overflow <= 3, `${route} overflows horizontally by ${overflow}px`);
      assert.deepEqual(pageErrors, [], `${route} page errors: ${pageErrors.join(' | ')}`);
    } catch (error) {
      failures.push(error.message);
    } finally {
      await page.close();
    }
  }

  const home = await context.newPage();
  await home.goto(BASE, { waitUntil: 'domcontentloaded' });
  assert.equal(await home.locator('.portal').count(), 15);
  await home.locator('[data-project="vfx"]').hover();
  await home.waitForTimeout(180);
  assert.equal(await home.locator('[data-preview-title]').textContent(), 'VFX Portfolio');
  await home.screenshot({ path: `${OUTPUT}/home-landing.png`, fullPage: false });
  await home.locator('[data-assembly]').scrollIntoViewIfNeeded();
  await home.evaluate(() => scrollTo(0, innerHeight * 1.55));
  await home.waitForTimeout(250);
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

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const mobileHome = await mobile.newPage();
  await mobileHome.goto(BASE, { waitUntil: 'domcontentloaded' });
  assert.equal(await mobileHome.locator('.portal').count(), 15);
  const mobileOverflow = await mobileHome.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(mobileOverflow <= 3, `mobile home overflows by ${mobileOverflow}px`);
  await mobileHome.screenshot({ path: `${OUTPUT}/home-mobile.png`, fullPage: false });
  await mobile.close();

  const calm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const calmHome = await calm.newPage();
  await calmHome.goto(BASE, { waitUntil: 'domcontentloaded' });
  assert.equal(await calmHome.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--assembly').trim()), '1');
  await calmHome.screenshot({ path: `${OUTPUT}/home-reduced-motion.png`, fullPage: false });
  await calm.close();

  await context.close();
  await browser.close();

  if (failures.length) throw new Error(`Route smoke failures:\n${failures.join('\n')}`);
  console.log(`Browser smoke passed: ${routes.length} routes, desktop/mobile/reduced-motion. Screenshots: ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
