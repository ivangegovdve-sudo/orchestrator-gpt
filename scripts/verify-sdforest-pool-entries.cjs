/* Browser evidence for the six code-rendered pool entries. Requires playwright-core. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright-core');

const base = process.env.SDFOREST_TEST_URL || 'http://127.0.0.1:4580';
const out = path.resolve(process.env.SDFOREST_ENTRY_EVIDENCE || 'docs/sdforest-pipeline-evidence/pool-entries');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pools = ['growingapp', 'ai-d-kit', 'tinkerbox', 'design-gallery', 'artificial-self', 'my-story'];
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const report = [];
  try {
    for (const mode of ['desktop', 'phone', 'reduced']) {
      const context = await browser.newContext({
        viewport: mode === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 },
        reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
        hasTouch: mode !== 'desktop',
      });
      await context.addInitScript(() => {
        Element.prototype.requestPointerLock = function () { return Promise.resolve(); };
        Element.prototype.setPointerCapture = function () {};
        Element.prototype.releasePointerCapture = function () {};
      });
      for (const id of pools) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        const url = `${base}/web/pools/${id}/`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForSelector('[data-entry-motion]');
        const canvas = page.locator('[data-entry-canvas]');
        const first = hash(await canvas.screenshot());
        await page.waitForTimeout(1100);
        const second = hash(await canvas.screenshot());
        if (mode === 'reduced') assert.equal(second, first, `${id} reduced-motion canvas holds its composed still`);
        else assert.notEqual(second, first, `${id} live canvas advances`);
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          scene: document.querySelector('[data-pool-entry]').dataset.entryScene,
          layout: document.querySelector('[data-pool-entry]').dataset.entryLayout,
          stageHeight: document.querySelector('[data-sc-stage]').getBoundingClientRect().height,
          viewportHeight: innerHeight,
        }));
        assert.equal(layout.overflow, false, `${id} ${mode} has no horizontal overflow`);
        assert.equal(layout.scene, id);
        assert.equal(layout.layout, mode === 'desktop' ? 'landscape' : 'portrait');
        if (mode === 'reduced') {
          assert.equal(await page.locator('[data-pool-entry]').getAttribute('data-sc-act'), 'flow');
        }
        const phase = mode === 'reduced' ? null : Number((await page.locator('[data-sc-stage]').getAttribute('data-sc-verify-state')).split('|')[0]);
        if (mode === 'desktop') {
          // Returning from the project list must not skip several seconds of the gesture.
          await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          await page.waitForTimeout(1600);
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await page.waitForTimeout(180);
          const resumed = Number((await page.locator('[data-sc-stage]').getAttribute('data-sc-verify-state')).split('|')[0]);
          assert.ok(resumed - phase <= 5, `${id} pauses off-screen: ${phase} → ${resumed}`);
        }
        // Freeze the resolved composition to make visual review reproducible.
        if (mode !== 'reduced') {
          await page.goto(`${url}?entry-t=7&entry-p=0`, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
        }
        const framePath = path.join(out, `${id}-${mode}.png`);
        await page.screenshot({ path: framePath });
        await page.locator('.entry-go').click();
        await page.waitForFunction(() => document.getElementById('pool-world').getBoundingClientRect().top < innerHeight);
        const feedback = page.locator('[data-feedback-open]').first();
        assert.ok(await feedback.count(), `${id} retains project feedback`);
        await feedback.click();
        assert.equal(await page.getByRole('dialog', { name: 'Site feedback' }).count(), 1);
        await page.locator('[data-feedback-close]').click();
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-feedback-open')), true);
        assert.deepEqual(errors, [], `${id} ${mode} browser/runtime errors`);
        report.push({ pool: id, mode, url, screenshot: path.basename(framePath), canvasAnimated: first !== second, ...layout, errors });
        console.log(`${id} ${mode}: passed`);
        await page.close();
      }
      await context.close();
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ base, capturedAt: new Date().toISOString(), results: report }, null, 2) + '\n');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
