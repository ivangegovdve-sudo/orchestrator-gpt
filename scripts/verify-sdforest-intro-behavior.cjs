// Browser proof for guide takeover, native scrolling, focus and native geometry.
// Run separately from verify-sdforest-video.cjs, which checks literal RGB equality.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = process.env.SDFOREST_BASE_URL || 'http://127.0.0.1:4580';
const out = path.resolve(process.env.SDFOREST_INTRO_EVIDENCE || 'docs/sdforest-pipeline-evidence/intro-behavior');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const report = [];
let browser;
const near = (a, b, message, tolerance = .015) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`);
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function open(viewport = { width: 1440, height: 900 }, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.sdforestResolve && document.documentElement.dataset.forestFinished === 'true');
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}
const state = page => page.evaluate(() => ({
  time: window.sdforestResolve.time,
  p: (window.sdforestResolve.time + 6) / 11,
  y: scrollY,
  runway: Math.max(innerHeight, document.querySelector('[data-resolve-stage]').parentElement.offsetHeight - document.querySelector('[data-resolve-stage]').offsetHeight),
  phase: document.documentElement.dataset.growthPhase,
  locked: document.documentElement.hasAttribute('data-frame-locked'),
  overflow: document.documentElement.scrollWidth > innerWidth,
}));
async function stable(page, before, label) {
  await page.waitForTimeout(650);
  const later = await state(page);
  near(later.time, before.time, label + ' stays under native control');
  return later;
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--disable-gpu', '--force-color-profile=srgb'] });
  // Native compositor samples expose masking/camera problems hidden by a film.
  {
    const { context, page, errors } = await open();
    for (const p of [0, .3, .6, .9, 1]) {
      await page.evaluate(p => window.sdforestResolve.seek(-6 + 11 * p), p);
      await page.waitForTimeout(100);
      const current = await state(page);
      near(current.p, p, 'requested native sample');
      assert.equal(current.overflow, false, 'native sample has no horizontal overflow');
      assert.equal(await page.locator('.resolve-tree').getAttribute('mask'), null, 'growth never clips the outer SVG viewport');
      assert.equal(await page.locator('.resolve-tree image').getAttribute('mask'), null, 'source anatomy stays connected throughout growth');
      await page.screenshot({ path: path.join(out, `native-${p}.png`) });
      report.push({ check: 'native-frame', requested: p, ...current });
    }
    // Reversing from completion freezes the same machinery that forward growth does.
    await page.evaluate(() => window.sdforestResolve.seek(-6 + 11 * .99));
    assert.equal((await state(page)).locked, true, 'reverse growth locks ambient motion');
    await page.evaluate(() => window.sdforestResolve.seek(-6 + 11 * .6));
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(200);
    const resized = await state(page);
    near(resized.p, .6, 'resize preserves native progress');
    assert.equal(resized.overflow, false, 'phone native geometry has no overflow');
    await page.screenshot({ path: path.join(out, 'native-resize-phone.png') });
    report.push({ check: 'native-resize', ...resized });
    assert.deepEqual(errors, []);
    await context.close();
  }
  for (const gesture of ['wheel', 'focused-PageDown', 'raw-scroll', 'touchmove']) {
    const { context, page, errors } = await open();
    await page.waitForTimeout(900);
    const before = await state(page);
    if (gesture === 'wheel') await page.mouse.wheel(0, 300);
    else if (gesture === 'focused-PageDown') { await page.locator('.resolve-skip').focus(); await page.keyboard.press('PageDown'); }
    else if (gesture === 'raw-scroll') await page.evaluate(() => scrollTo(0, 900));
    else await page.evaluate(() => dispatchEvent(new Event('touchmove')));
    await page.waitForTimeout(500);
    const after = await state(page);
    near(after.p, after.y / after.runway, gesture + ' aligns native runway');
    if (gesture === 'wheel' || gesture === 'touchmove') assert.ok(after.p >= before.p - .015, gesture + ' preserves the current guided frame');
    const later = await stable(page, after, gesture);
    report.push({ check: 'takeover', gesture, before, after, later });
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Both film and native composition keep hidden controls out of keyboard focus.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const { context, page, errors } = await open(viewport);
    await page.evaluate(() => window.sdforestResolve.seek(-6 + 11 * .3));
    const focus = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
      const active = await page.evaluate(() => {
        const element = document.activeElement;
        const blocked = element.closest('.resolve-scene,.resolve-directory,.resolve-controls,.resolve-history,[data-support-control]');
        return { name: element.className, hidden: !!element.closest('[inert]'), inBlockedIntroControl: !!blocked, phase: document.documentElement.dataset.growthPhase };
      });
      assert.equal(active.hidden, false, 'Tab never focuses inert content');
      if (active.phase !== 'complete') assert.equal(active.inBlockedIntroControl, false, 'Tab does not reach content covered by intro');
      focus.push(active);
    }
    report.push({ check: 'focus', viewport, focus });
    assert.deepEqual(errors, []);
    await context.close();
  }
  {
    const { context, page, errors } = await open();
    await page.waitForFunction(() => document.documentElement.dataset.growthPhase === 'complete', null, { timeout: 25000 });
    const complete = await state(page);
    near(complete.y, complete.runway, 'guide finishes at native runway end', 1);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(350);
    const forward = await state(page);
    near(forward.p, 1, 'first wheel after guide keeps finished frame');
    await page.mouse.wheel(0, -complete.runway * .6);
    await page.waitForTimeout(400);
    const reverse = await state(page);
    assert.ok(reverse.p > 0 && reverse.p < 1, 'reverse wheel returns into growth');
    near(reverse.p, reverse.y / reverse.runway, 'reverse wheel follows native runway');
    assert.equal(reverse.locked, true, 'reverse wheel freezes ambient motion');
    const later = await stable(page, reverse, 'reverse wheel');
    await page.screenshot({ path: path.join(out, 'native-reverse.png') });
    report.push({ check: 'guide-completion-and-reverse', complete, forward, reverse, later });
    assert.deepEqual(errors, []);
    await context.close();
  }
  {
    const { context, page, errors } = await open({ width: 390, height: 844 }, 'reduce');
    const reduced = await state(page);
    near(reduced.p, 1, 'reduced motion opens the finished page');
    assert.equal(reduced.locked, false);
    assert.equal(await page.locator('.resolve-tree image').getAttribute('mask'), null);
    const a = hash(await page.screenshot());
    await page.waitForTimeout(650);
    const b = hash(await page.screenshot({ path: path.join(out, 'reduced-phone.png') }));
    assert.equal(a, b, 'reduced motion holds a still page');
    report.push({ check: 'reduced-motion', ...reduced, screenshotStable: true });
    assert.deepEqual(errors, []);
    await context.close();
  }
  {
    const { context, page, errors } = await open();
    await page.evaluate(() => window.sdforestResolve.open());
    await page.locator('.resolve-motion-toggle').click();
    await page.waitForTimeout(100);
    const machine = page.locator('.forest-machine');
    const a = hash(await machine.screenshot());
    await page.waitForTimeout(650);
    const b = hash(await machine.screenshot());
    assert.equal(a, b, 'Pause motion holds the working machine');
    assert.equal(await page.locator('.resolve-motion-toggle').innerText(), 'Resume motion');
    report.push({ check: 'pause-motion', machineStable: true });
    assert.deepEqual(errors, []);
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ base, report }, null, 2) + '\n');
  console.log('SD Forest intro behavior passed: takeover, completed handoff, reverse, resize, focus, reduced motion and pause.');
})().catch(async error => { await browser?.close(); console.error(error); process.exitCode = 1; });
