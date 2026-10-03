const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const base = process.env.SDFOREST_TEST_URL || 'http://127.0.0.1:4591';
const out = path.resolve(process.env.SDFOREST_PIPELINE_EVIDENCE || path.join(ROOT, 'docs/sdforest-pipeline-evidence/interaction'));
const ids = ['growingapp', 'ai-d-kit', 'tinkerbox', 'health', 'design-gallery', 'artificial-self', 'my-story'];
let browser;
const evidence = [];

before(async () => {
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu', '--force-color-profile=srgb'] });
});
after(async () => {
  await browser?.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ base, capturedAt: new Date().toISOString(), evidence }, null, 2) + '\n');
});

async function openedPage({ phone = false, reduced = false, javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({
    viewport: phone ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    hasTouch: phone,
    javaScriptEnabled,
  });
  await context.addInitScript(() => {
    Element.prototype.requestPointerLock = function () { return Promise.resolve(); };
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.runtimeErrors = [];
  page.on('pageerror', (error) => page.runtimeErrors.push(error.message));
  await page.goto(`${base}/?frame=opened`, { waitUntil: 'networkidle' });
  if (javaScriptEnabled) {
    await page.waitForFunction(() => document.documentElement.dataset.resolveState === 'opened' && document.documentElement.dataset.forestFinished === 'true');
    await page.evaluate(() => document.fonts.ready);
  }
  return page;
}

async function freshIntroPage({ width = 1440, height = 900, phone = false, reduced = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: phone,
    deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(() => {
    // Observe the real media object without replacing playback or its events.
    const NativeAudio = window.Audio;
    window.introAudioEvidence = [];
    window.Audio = function (...args) { const audio = new NativeAudio(...args); window.introAudioEvidence.push(audio); return audio; };
    window.Audio.prototype = NativeAudio.prototype;
    Element.prototype.requestPointerLock = function () { return Promise.resolve(); };
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.runtimeErrors = [];
  page.on('pageerror', error => page.runtimeErrors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.forestFinished === 'true');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function introProgress(page) { return page.evaluate(() => (window.sdforestResolve.time + 6) / 11); }
async function scrollIntro(page, progress) {
  await page.evaluate(p => {
    const stage = document.querySelector('[data-resolve-stage]');
    const distance = Math.max(innerHeight, stage.parentElement.offsetHeight - stage.offsetHeight);
    scrollTo({ top: p * distance, behavior: 'instant' });
  }, progress);
  await page.waitForTimeout(120);
}

test('intro: a free guided start hands its exact position to wheel scroll, fades narration, and reverses growth', async () => {
  const page = await freshIntroPage();
  try {
    assert.equal(await page.evaluate(() => document.documentElement.dataset.resolveMotion), 'scrub');
    assert.equal(await page.locator('[data-growth-intro]').evaluate(node => getComputedStyle(node).display), 'none', '1440x900 renders the native code compositor');
    const initial = await introProgress(page);
    await page.waitForTimeout(180);
    assert.ok(await introProgress(page) > initial, 'the guide starts by itself on a fresh visit');
    const listen = page.getByRole('button', { name: 'Play the intro word poem' });
    if (await listen.isVisible()) await listen.click();
    await page.waitForTimeout(100);
    const before = await introProgress(page);
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(100);
    const after = await introProgress(page);
    assert.ok(Math.abs(after - before) < .015, `wheel handoff preserves position (${before} -> ${after})`);
    await page.waitForTimeout(500);
    const audio = await page.evaluate(() => {
      const narration = window.introAudioEvidence.find(audio => audio.src.endsWith('/seed-to-forest.mp3'));
      return { src: narration?.src, paused: narration?.paused, volume: narration?.volume };
    });
    assert.equal(audio.paused, true);
    assert.equal(audio.volume, 0);
    assert.ok(Math.abs(await introProgress(page) - after) < .005, 'the guide stops advancing after takeover');
    await scrollIntro(page, .25);
    const earlier = await page.locator('.resolve-scene').evaluate(node => ({ transform: node.style.transform, tree: node.querySelector('.resolve-tree').style.transform }));
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(150);
    const laterProgress = await introProgress(page);
    assert.ok(laterProgress > .45, 'forward wheel advances growth');
    const later = await page.locator('.resolve-scene').evaluate(node => ({ transform: node.style.transform, tree: node.querySelector('.resolve-tree').style.transform }));
    assert.notEqual(later.transform, earlier.transform);
    assert.notEqual(later.tree, earlier.tree);
    await prove(page, 'intro-code-growing', { progress: laterProgress, audio, compositor: later });
    await page.mouse.wheel(0, -1100);
    await page.waitForTimeout(150);
    assert.ok(await introProgress(page) < laterProgress - .15, 'reverse wheel rewinds the same growth timeline');
    await scrollIntro(page, 1);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.resolveState), 'opened');
    assert.equal(await page.locator('.forest-project-dot').count(), 5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(page.runtimeErrors, []);
    await prove(page, 'intro-code-finished', { progress: await introProgress(page), pools: await poolBounds(page) });
  } finally { await page.context().close(); }
});

test('intro: every promoted symbol grows together and keeps its mature appearance at handoff', async () => {
  const page = await freshIntroPage();
  try {
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(120);
    await scrollIntro(page, .88);
    const growing = await page.locator('.forest-project-dot').evaluateAll(nodes => nodes.map(node => ({ transform: node.style.transform, visible: getComputedStyle(node).visibility })));
    assert.equal(new Set(growing.map(node => node.transform)).size, 1, 'all five sprout at the same progress');
    assert.ok(growing.every(node => node.visible === 'visible' && /scale\(0\.5/.test(node.transform)), JSON.stringify(growing));
    await scrollIntro(page, .99);
    const mature = await page.locator('.forest-project-dot').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
    await scrollIntro(page, 1);
    const final = await page.locator('.forest-project-dot').evaluateAll(nodes => nodes.map(node => ({ rect: node.getBoundingClientRect().toJSON(), animation: getComputedStyle(node).animationName })));
    assert.ok(final.every(node => node.animation === 'none'), 'opening does not restart a CSS sprout');
    final.forEach((node, index) => {
      assert.ok(Math.abs(node.rect.width - mature[index].width / 1.016) < .15, 'only the last camera zoom resolves at the boundary');
    });
    await page.waitForTimeout(300);
    assert.deepEqual(await page.locator('.forest-project-dot').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON())), final.map(node => node.rect));
  } finally { await page.context().close(); }
});

test('intro: a completed same-session return stays open while reload replays the introduction', async () => {
  const page = await freshIntroPage();
  try {
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(120);
    await scrollIntro(page, 1);
    await page.goto(`${base}/web/pools/growingapp/`, { waitUntil: 'domcontentloaded' });
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.resolveState), 'opened');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.resolveMotion), 'static');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.resolveMotion), 'scrub');
    assert.ok(await introProgress(page) < .2, 'reload restarts near the seed');
    assert.deepEqual(page.runtimeErrors, []);
  } finally { await page.context().close(); }
});

test('intro: resize preserves progress and switches a cached video geometry to its native compositor', async () => {
  const page = await freshIntroPage({ width: 1920, height: 1080 });
  try {
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(120);
    await scrollIntro(page, .55);
    const before = await introProgress(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(150);
    const after = await introProgress(page);
    assert.ok(Math.abs(after - before) < .03, `resize keeps growth position (${before} -> ${after})`);
    assert.equal(await page.locator('[data-growth-intro]').evaluate(node => getComputedStyle(node).display), 'none');
    assert.equal(await page.locator('.resolve-tree').count(), 1, 'resize preserves one connected tree');
    assert.equal(await page.locator('.forest-intro-seed').count(), 1);
    await page.mouse.wheel(0, -350);
    await page.waitForTimeout(120);
    assert.ok(await introProgress(page) < after, 'the resized compositor remains scroll owned');
    assert.deepEqual(page.runtimeErrors, []);
  } finally { await page.context().close(); }
});

test('phone intro: native touch movement takes over the guide and leaves narration paused', async () => {
  const page = await freshIntroPage({ width: 390, height: 844, phone: true });
  try {
    const before = await introProgress(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 620 }] });
    for (const y of [600, 580, 560, 540, 520]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
      await page.waitForTimeout(20);
    }
    await page.waitForTimeout(150); // finish at rest, without a fling changing the sample
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(450);
    const after = await introProgress(page);
    assert.ok(after >= before && after - before < .08, `touch continues near its current position (${before} -> ${after})`);
    const audio = await page.evaluate(() => {
      const narration = window.introAudioEvidence.find(audio => audio.src.endsWith('/seed-to-forest.mp3'));
      return { paused: narration.paused, volume: narration.volume };
    });
    assert.deepEqual(audio, { paused: true, volume: 0 });
    const held = await introProgress(page);
    await page.waitForTimeout(400);
    assert.ok(Math.abs(await introProgress(page) - held) < .005, 'touch takeover stops the guided clock');
    assert.deepEqual(page.runtimeErrors, []);
    await prove(page, 'intro-touch-takeover', { before, after, audio });
  } finally { await page.context().close(); }
});

test('fresh reduced-motion visits bypass the guide and hold the finished page on desktop and phone', async () => {
  for (const phone of [false, true]) {
    const page = await freshIntroPage(phone ? { width: 390, height: 844, phone, reduced: true }
      : { width: 1920, height: 1080, reduced: true });
    try {
      assert.equal(await page.evaluate(() => document.documentElement.dataset.resolveState), 'opened');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.resolveMotion), 'static');
      assert.equal(await introProgress(page), 1);
      const bounds = await poolBounds(page);
      await page.waitForTimeout(500);
      assert.deepEqual(await poolBounds(page), bounds);
      assert.ok(bounds.every(pool => pool.visible && !pool.inert && pool.withinViewport));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const audio = await page.evaluate(() => window.introAudioEvidence.map(audio => audio.paused));
      assert.ok(audio.every(Boolean), 'reduced motion does not start narration');
      assert.deepEqual(page.runtimeErrors, []);
      await prove(page, `fresh-reduced-${phone ? 'phone' : 'desktop'}`, bounds);
    } finally { await page.context().close(); }
  }
});

const videoMetadata = path.join(ROOT, 'web/assets/sdforest-intro/video-render.json');
test('encoded desktop and phone videos end on the locked frame with literally equal decoded RGB pixels', {
  skip: !fs.existsSync(videoMetadata) && process.env.SDFOREST_VIDEO_READY !== '1',
}, () => {
  const metadata = JSON.parse(fs.readFileSync(videoMetadata, 'utf8'));
  const assets = path.dirname(videoMetadata);
  const lock = JSON.parse(fs.readFileSync(path.join(assets, 'final-frame-lock.json'), 'utf8'));
  assert.equal(metadata.videos.length, 2);
  const proof = [];
  for (const video of metadata.videos) {
    assert.match(video.codec, /lossless final frame/);
    assert.equal(video.compression.growthLossless, false);
    assert.equal(video.compression.growthFrames, 288);
    assert.equal(video.compression.growthCrf, 24);
    assert.equal(video.compression.finalFrame, 288);
    assert.equal(video.compression.finalLossless, true);
    const file = path.join(assets, video.file);
    assert.ok(fs.statSync(file).size < 100000000, 'video remains a publishable GitHub blob');
    const reference = lock.frames.find(frame => frame.file === video.reference);
    assert.ok(reference, `${video.file} identifies its locked reference`);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries',
      'stream=codec_name,width,height,nb_read_frames,pix_fmt,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' });
    assert.equal(probe.status, 0, probe.stderr);
    const stream = JSON.parse(probe.stdout).streams[0];
    assert.equal(stream.codec_name, 'vp9');
    assert.equal(stream.width, reference.width);
    assert.equal(stream.height, reference.height);
    assert.equal(Number(stream.nb_read_frames), 289);
    assert.equal(stream.r_frame_rate, '24/1');
    const decode = args => {
      const result = spawnSync('ffmpeg', ['-v', 'error', ...args, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
        { maxBuffer: reference.width * reference.height * 4 });
      assert.equal(result.status, 0, String(result.stderr));
      return result.stdout;
    };
    const expected = decode(['-i', path.join(assets, reference.file)]);
    const actual = decode(['-i', file, '-vf', 'select=eq(n\\,288)']);
    assert.equal(actual.length, reference.width * reference.height * 3);
    assert.ok(actual.equals(expected), `${video.file} final decoded RGB matches the frozen live page exactly`);
    proof.push({ video: video.file, reference: reference.file, width: stream.width, height: stream.height,
      codec: stream.codec_name, frames: 289, fps: 24, differentRgbChannels: 0,
      decodedRgbSha256: crypto.createHash('sha256').update(actual).digest('hex') });
  }
  evidence.push({ name: 'encoded-final-frame-proof', details: proof });
});

async function poolBounds(page) {
  return page.locator('[data-pool-link]').evaluateAll((links) => links.map((link) => {
    const rect = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    return { id: link.dataset.poolLink, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      opacity: Number(style.opacity), visible: style.visibility !== 'hidden', inert: link.inert,
      withinViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1 };
  }));
}

async function prove(page, name, details) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(out, file) });
  evidence.push({ name, url: page.url(), screenshot: file, details });
}

async function innerStyles(page, id) {
  const selector = id ? `[data-pool-link="${id}"] .portal-art *` : '[data-pool-link] .portal-art *';
  return page.locator(selector).evaluateAll(nodes => nodes.map(node => node.getAttribute('style')));
}

test('desktop: inner instruments hold their idle pose until hover wakes a pool', async () => {
  const page = await openedPage();
  try {
    await page.waitForTimeout(120);
    const idle = await innerStyles(page);
    await page.waitForTimeout(1000);
    assert.deepEqual(await innerStyles(page), idle, 'inner inline poses remain still while window frames idle');
    const healthIdle = await innerStyles(page, 'health');
    const otherIdle = await innerStyles(page, 'growingapp');
    await page.locator('[data-pool-link="health"]').hover();
    await page.waitForTimeout(300);
    assert.notDeepEqual(await innerStyles(page, 'health'), healthIdle, 'hover wakes the ECG');
    assert.deepEqual(await innerStyles(page, 'growingapp'), otherIdle, 'an untouched pool retains its idle pose');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(450);
    const settled = await innerStyles(page);
    await page.waitForTimeout(500);
    assert.deepEqual(await innerStyles(page), settled, 'leaving the pool settles its inner instruments again');
    assert.deepEqual(page.runtimeErrors, []);
  } finally { await page.context().close(); }
});

test('phone: inner instruments run by default and Pause motion holds their current pose', async () => {
  const page = await openedPage({ phone: true });
  try {
    const initial = await innerStyles(page);
    await page.waitForTimeout(600);
    assert.notDeepEqual(await innerStyles(page), initial, 'phone visitors see the inner gesture without hover');
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.waitForTimeout(80);
    const paused = await innerStyles(page);
    await page.waitForTimeout(600);
    assert.deepEqual(await innerStyles(page), paused, 'pause freezes the current inner pose');
    assert.deepEqual(page.runtimeErrors, []);
  } finally { await page.context().close(); }
});

for (const phone of [false, true]) {
  const name = phone ? 'phone' : 'desktop';
  test(`${name}: seven fixed pool windows stay fully visible without horizontal overflow`, async () => {
    const page = await openedPage({ phone });
    try {
      const first = await poolBounds(page);
      assert.deepEqual(first.map(({ id }) => id).sort(), [...ids].sort());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const pool of first) {
        assert.ok(pool.visible && !pool.inert && pool.opacity >= 0.99 && pool.withinViewport, `${pool.id}: ${JSON.stringify(pool)}`);
        assert.ok(pool.width >= 44 && pool.height >= 44, `${pool.id} has a usable target`);
      }
      await page.waitForTimeout(700);
      const second = await poolBounds(page);
      second.forEach((pool, i) => {
        assert.ok(Math.abs(pool.x - first[i].x) < 0.1 && Math.abs(pool.y - first[i].y) < 0.1, `${pool.id} keeps its fixed anchor`);
      });
      assert.deepEqual(page.runtimeErrors, []);
      await prove(page, `windows-${name}`, { pools: first, overflow: false });
    } finally { await page.context().close(); }
  });

  test(`${name}: selection enlarges; repeated clicks and double-click stay home; explicit round Enter opens`, async () => {
    const page = await openedPage({ phone });
    try {
      const pool = page.locator('[data-pool-link="growingapp"]');
      const home = page.url();
      const original = await pool.boundingBox();
      if (phone) await pool.tap(); else await pool.click();
      await page.waitForTimeout(280);
      const selected = await pool.boundingBox();
      assert.ok(selected.width > original.width * 1.03, 'selection visibly enlarges the window');
      assert.ok((await pool.getAttribute('class')).split(/\s+/).includes('is-selected'));
      const enter = page.getByRole('link', { name: 'Enter GrowingApp', exact: true });
      assert.equal(await enter.count(), 1);
      assert.equal(await enter.getAttribute('href'), `${base}/web/pools/growingapp/`);
      const shape = await enter.evaluate((link) => { const style = getComputedStyle(link); return { width: link.clientWidth, height: link.clientHeight, radius: style.borderRadius }; });
      assert.equal(shape.width, shape.height);
      assert.equal(shape.radius, '50%');
      if (phone) await pool.tap(); else await pool.click();
      await pool.dblclick();
      assert.equal(page.url(), home, 'window clicks never navigate');
      assert.equal(await enter.count(), 1, 'repeated clicks do not duplicate Enter');
      await prove(page, `selected-${name}`, { enlarged: true, explicitRoundEnter: shape });
      await enter.click();
      await page.waitForURL('**/web/pools/growingapp/', { waitUntil: 'domcontentloaded', timeout: 10000 });
      assert.match(page.url(), /\/web\/pools\/growingapp\/$/);
      assert.equal(await page.locator('main[data-pool-id="growingapp"]').count(), 1);
    } finally { await page.context().close(); }
  });
}

test('keyboard: Tab reaches Enter and Escape closes selection and restores its window focus', async () => {
  const page = await openedPage();
  try {
    const pool = page.locator('[data-pool-link="health"]');
    await pool.focus();
    await page.keyboard.press('Enter');
    // Keyboard selection may place focus directly on Enter. The native sequence
    // must also expose it on Tab from the window that selected it.
    await pool.focus();
    let reached = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => document.activeElement?.classList.contains('portal-enter'));
      if (reached) break;
    }
    assert.equal(reached, true, 'the selected window exposes Enter in native Tab order');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Enter Health');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.portal-enter').count(), 0);
    assert.equal((await pool.getAttribute('class')).split(/\s+/).includes('is-selected'), false);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.poolLink), 'health');
    assert.equal(await page.locator('#workbench-status').textContent(), '');
  } finally { await page.context().close(); }
});

test('the five promoted symbols point to the approved public project destinations', async () => {
  const page = await openedPage();
  try {
    const promoted = await page.locator('.forest-project-dot').evaluateAll((links) => links.map((link) => ({
      name: link.getAttribute('aria-label').split(':')[0], href: link.getAttribute('href'), pool: link.dataset.promotedPool,
    })));
    assert.equal(promoted.length, 5);
    const expected = [
      ['Gym Scholar', 'health', 'https://gymscholar.lovable.app'],
      [['Math Mania', 'Forest Math', 'Math Mania / Forest Math'], 'growingapp', '/web/math-mania/'],
      ['The Drop', 'ai-d-kit', '/web/morning-news/'],
      ['Explore Repos', 'ai-d-kit', '/web/explore/'],
      ['Open Dashboard MCP', 'ai-d-kit', '/web/open-dashboard/'],
    ];
    for (const [name, pool, href] of expected) {
      const entry = promoted.find((project) => (Array.isArray(name) ? name : [name]).includes(project.name));
      assert.ok(entry, `${name} is promoted`);
      assert.equal(entry.pool, pool);
      assert.equal(entry.href, href, `${name} uses its public project route`);
      if (href.startsWith('/')) {
        const response = await page.request.get(`${base}${href}`);
        assert.equal(response.status(), 200, `${name} local destination is served`);
        assert.doesNotMatch(await response.text(), /<meta[^>]+name="robots"[^>]+content="noindex, nofollow"/, `${name} does not lead to internal documentation`);
      }
    }
    const dotsCanReceiveClicks = await page.locator('.forest-project-dot').evaluateAll((links) => links.map((link) => {
      const rect = link.getBoundingClientRect();
      return link.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    }));
    assert.ok(dotsCanReceiveClicks.every(Boolean), 'all five symbol centers receive pointer clicks');
    const { PROJECT_CATALOG } = await import('../../web/shared/project-catalog.mjs');
    const binding = (id, route) => PROJECT_CATALOG.find((project) => project.id === id)?.routeBindings.some((entry) => entry.url === route || entry.route === route);
    assert.ok(binding('gym-scholar', 'https://gymscholar.lovable.app'));
    assert.ok(binding('math-forest', '/web/math-mania/'));
    assert.ok(binding('explore', '/web/explore/'));
    await prove(page, 'promoted-desktop', promoted);
  } finally { await page.context().close(); }
});

test('phone: a promoted symbol first reveals its name and teaser; a second tap follows the project link', async () => {
  const page = await openedPage({ phone: true });
  try {
    const home = page.url();
    const math = page.locator('.forest-project-dot[data-promoted-pool="growingapp"]');
    const caption = math.locator('.project-dot-caption');
    await math.tap();
    assert.equal(page.url(), home, 'the first touch stays on the forest');
    assert.equal(await math.getAttribute('aria-expanded'), 'true');
    assert.equal(await caption.isVisible(), true);
    assert.match(await caption.textContent(), /Forest Math.*A little mathematical play/);
    const box = await caption.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 391, 'the phone caption stays readable within the viewport');
    await prove(page, 'promoted-phone-disclosed', { firstTapDiscloses: true, caption: box });
    await math.tap();
    await page.waitForURL('**/web/math-mania/', { waitUntil: 'domcontentloaded' });
  } finally { await page.context().close(); }
});

for (const phone of [false, true]) {
  test(`${phone ? 'phone' : 'desktop'} reduced motion holds a usable finished page`, async () => {
    const page = await openedPage({ phone, reduced: true });
    try {
      const first = await poolBounds(page);
      await page.waitForTimeout(700);
      assert.deepEqual(await poolBounds(page), first);
      assert.equal(await page.locator('[data-growth-intro]').evaluate((intro) => getComputedStyle(intro).visibility === 'hidden' || Number(getComputedStyle(intro).opacity) === 0), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator('[data-pool-link="health"]').click();
      assert.equal(await page.getByRole('link', { name: 'Enter Health', exact: true }).count(), 1);
      await page.keyboard.press('Escape');
      await prove(page, `reduced-${phone ? 'phone' : 'desktop'}`, first);
    } finally { await page.context().close(); }
  });
}

test('without JavaScript the seven native pool links remain visible and enterable', async () => {
  const page = await openedPage({ phone: true, javaScriptEnabled: false });
  try {
    assert.equal(await page.locator('[data-pool-link]').count(), 7);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const id of ids) {
      const pool = page.locator(`[data-pool-link="${id}"]`);
      assert.equal(await pool.isVisible(), true, id);
      assert.equal(await pool.getAttribute('href'), `/web/pools/${id}/`);
    }
    await prove(page, 'noscript-phone', await poolBounds(page));
    const story = page.locator('[data-pool-link="my-story"]');
    const original = await story.boundingBox();
    await story.hover();
    const hovered = await story.boundingBox();
    assert.ok(Math.abs(hovered.y - original.y) < 1, 'no-script hover preserves the fixed phone window position');
    await story.click();
    await page.waitForURL('**/web/pools/my-story/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    assert.equal(await page.getByRole('heading', { name: 'My Story', exact: true }).count(), 1);
  } finally { await page.context().close(); }
});
