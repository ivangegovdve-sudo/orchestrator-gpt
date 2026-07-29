const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const chromeExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let baseUrl;
let browser;
let server;

before(async () => {
  assert.equal(fs.existsSync(chromeExecutable), true, 'system Chrome must be installed');
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
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    }[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
});

after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

test('six scroll chapters expose only the active layer to assistive technology', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=chapter-proof`, {
    waitUntil: 'domcontentloaded',
  });

  const identity = await page.evaluate(() => {
    const tokens = getComputedStyle(document.documentElement);
    return {
      title: document.title,
      chapters: [...document.querySelectorAll('.layer')].map((layer) => (
        layer.querySelector('h1, h2')?.textContent.trim()
      )),
      bg: tokens.getPropertyValue('--bg').trim().toLowerCase(),
      surface: tokens.getPropertyValue('--surface').trim().toLowerCase(),
      accent: tokens.getPropertyValue('--accent').trim().toLowerCase(),
    };
  });
  assert.match(identity.title, /Power Law Odyssey/);
  assert.equal(identity.chapters.length, 6);
  assert.equal(identity.chapters.every((heading) => heading.length > 20), true);
  assert.deepEqual(
    { bg: identity.bg, surface: identity.surface, accent: identity.accent },
    { bg: '#07070b', surface: '#0f0f15', accent: '#4f46e5' },
  );

  const samples = [0.02, 0.16, 0.36, 0.56, 0.76, 0.92];
  for (let index = 0; index < samples.length; index += 1) {
    const progress = samples[index];
    await setScrollProgress(page, progress);
    await page.waitForFunction(
      ({ expectedIndex, expectedProgress }) => {
        const actualProgress = Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--scroll-p'),
        );
        return (
          Math.abs(actualProgress - expectedProgress) < 0.015
          && document.querySelectorAll('.layer.is-active').length === 1
          && document.querySelectorAll('.layer')[expectedIndex].classList.contains('is-active')
        );
      },
      { expectedIndex: index, expectedProgress: progress },
    );

    const layerState = await page.locator('.layer').evaluateAll((layers) => (
      layers.map((layer) => ({
        active: layer.classList.contains('is-active'),
        inert: layer.inert,
        ariaHidden: layer.getAttribute('aria-hidden'),
      }))
    ));
    assert.equal(layerState[index].active, true);
    assert.equal(layerState[index].inert, false);
    assert.equal(layerState[index].ariaHidden, 'false');
    assert.equal(
      layerState.every((state, stateIndex) => (
        stateIndex === index || (state.inert && state.ariaHidden === 'true')
      )),
      true,
    );
  }

  await page.close();
});

test('the venture sandbox supports one bet, one batch announcement, and reset', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=sandbox-proof`, {
    waitUntil: 'domcontentloaded',
  });
  await setScrollProgress(page, 0.8);
  await page.waitForFunction(() => document.querySelector('#layer5').classList.contains('is-active'));

  await pointerClick(page, '#betButton');
  assert.equal(await page.locator('#betField > .bet-coin').count(), 1);
  assert.equal(await page.locator('#attemptCount').textContent(), '1');

  await pointerClick(page, '#resetBets');
  assert.equal(await page.locator('#betField > .bet-coin').count(), 0);
  assert.equal(await page.locator('#attemptCount').textContent(), '0');

  await page.evaluate(() => {
    const status = document.querySelector('#portfolioStatus');
    window.__portfolioAnnouncements = [];
    window.__portfolioObserver = new MutationObserver(() => {
      window.__portfolioAnnouncements.push(status.textContent.trim());
    });
    window.__portfolioObserver.observe(status, { childList: true, subtree: true });
  });
  await pointerClick(page, '#batchButton');
  await page.waitForFunction(() => document.querySelectorAll('#betField > .bet-coin').length === 50);
  await page.waitForFunction(() => document.querySelector('#betField').classList.contains('is-converged'));

  const final = await page.evaluate(() => {
    window.__portfolioObserver.disconnect();
    return {
      announcements: window.__portfolioAnnouncements,
      attempts: document.querySelector('#attemptCount').textContent,
      failures: document.querySelector('#failureCount').textContent,
      neutral: document.querySelector('#neutralCount').textContent,
      outliers: document.querySelector('#outlierCount').textContent,
      status: document.querySelector('#portfolioStatus').textContent.trim(),
      statsLive: document.querySelector('.sandbox-stats').getAttribute('aria-live'),
      transitions: [...document.querySelectorAll('#betField > .bet-coin')].map((coin) => {
        const style = getComputedStyle(coin);
        return {
          outcome: coin.dataset.outcome,
          property: style.transitionProperty,
          duration: style.transitionDuration,
          easing: style.transitionTimingFunction,
        };
      }),
    };
  });
  assert.deepEqual(
    {
      attempts: final.attempts,
      failures: final.failures,
      neutral: final.neutral,
      outliers: final.outliers,
    },
    { attempts: '50', failures: '47', neutral: '2', outliers: '1' },
  );
  assert.deepEqual(final.announcements, [final.status]);
  assert.match(final.status, /Portfolio recovered/);
  assert.notEqual(final.statsLive, 'polite');
  assert.equal(final.transitions.length, 50);
  assert.equal(final.transitions.at(-1).outcome, 'outlier');
  assert.equal(final.transitions.every(({ property, duration, easing }) => (
    property === 'left, top, transform, box-shadow'
    && duration === Array(4).fill('0.5s').join(', ')
    && easing === Array(4)
      .fill('cubic-bezier(0.34, 1.56, 0.64, 1)')
      .join(', ')
  )), true, JSON.stringify(final.transitions[0]));

  await pointerClick(page, '#resetBets');
  assert.equal(await page.locator('#betField > .bet-coin').count(), 0);
  assert.equal(await page.locator('#attemptCount').textContent(), '0');
  assert.equal(await page.getByRole('button', { name: 'Place next bet' }).isEnabled(), true);
  await page.close();
});

test('reduced motion keeps every chapter accessible and lays bets out in an orderly grid', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=reduced-proof`, {
    waitUntil: 'domcontentloaded',
  });

  const accessibility = await page.locator('.layer').evaluateAll((layers) => (
    layers.map((layer) => ({
      inert: layer.inert,
      ariaHidden: layer.getAttribute('aria-hidden'),
    }))
  ));
  assert.equal(
    accessibility.every((state) => !state.inert && state.ariaHidden === null),
    true,
  );

  const betButton = page.getByRole('button', { name: 'Place next bet' });
  await betButton.scrollIntoViewIfNeeded();
  await betButton.click();
  await betButton.click();
  await betButton.click();

  const layout = await page.evaluate(() => {
    const field = document.querySelector('#betField');
    const coins = [...field.children].map((coin) => {
      const rect = coin.getBoundingClientRect();
      const style = getComputedStyle(coin);
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        position: style.position,
        cssLeft: style.left,
        cssTop: style.top,
        transform: style.transform,
      };
    });
    return {
      fieldDisplay: getComputedStyle(field).display,
      fieldRect: field.getBoundingClientRect().toJSON(),
      coins,
    };
  });
  assert.equal(layout.fieldDisplay, 'grid');
  assert.equal(layout.coins.every((coin) => coin.position !== 'absolute'), true);
  assert.equal(layout.coins.every((coin) => coin.transform === 'none'), true);
  assert.equal(layout.coins[0].right <= layout.coins[1].left, true);
  assert.equal(layout.coins[1].right <= layout.coins[2].left, true);
  assert.equal(
    layout.coins.every((coin) => (
      coin.left >= layout.fieldRect.left && coin.right <= layout.fieldRect.right
    )),
    true,
  );

  await context.close();
});

test('mobile stays within the viewport while scroll speed still drives and settles the slide', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=mobile-proof`, {
    waitUntil: 'domcontentloaded',
  });

  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(overflow.documentWidth <= overflow.viewport);
  assert.ok(overflow.bodyWidth <= overflow.viewport);

  await setScrollProgress(page, 0.18);
  const movingSlip = await page.evaluate(async () => {
    const track = document.querySelector('#scrollTrack');
    const distance = track.offsetHeight - window.innerHeight;
    window.scrollTo(0, track.offsetTop + distance * 0.58);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--scroll-slip'),
    );
  });
  assert.ok(Math.abs(movingSlip) > 0.25, `expected a velocity slip, received ${movingSlip}`);

  await page.waitForFunction(() => (
    Math.abs(Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--scroll-slip'),
    )) < 0.25
  ));
  const settled = await page.evaluate(() => ({
    slip: Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--scroll-slip'),
    ),
    transform: getComputedStyle(document.querySelector('.layer.is-active .layer-inner')).transform,
  }));
  assert.ok(Math.abs(settled.slip) < 0.25);
  assert.notEqual(settled.transform, 'none');
  await page.close();
});

test('every chapter holds still at the camera plane and the track never goes blank', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=hold-proof`, {
    waitUntil: 'domcontentloaded',
  });

  const timeline = await page.evaluate(() => {
    const root = document.documentElement;
    const depthOf = (el) => {
      const match = getComputedStyle(el).transform.match(/matrix3d\(([^)]*)\)/);
      return match ? Math.round(Number(match[1].split(',')[14])) : 0;
    };
    const layers = [...document.querySelectorAll('.stage-3d .layer')];
    const holds = {};
    let blankFrames = 0;

    for (let step = 0; step <= 200; step += 1) {
      const progress = step / 200;
      root.style.setProperty('--scroll-p', progress);
      const lit = layers.filter((layer) => Number(getComputedStyle(layer).opacity) > 0.05);
      if (!lit.length) blankFrames += 1;
      for (const layer of lit) {
        if (depthOf(layer) === 0 && Number(getComputedStyle(layer).opacity) > 0.99) {
          (holds[layer.id] = holds[layer.id] || []).push(progress);
        }
      }
    }
    root.style.removeProperty('--scroll-p');
    return {
      blankFrames,
      holds: Object.fromEntries(
        Object.entries(holds).map(([id, points]) => [id, points.at(-1) - points[0]]),
      ),
    };
  });

  // A linear camera leaves every chapter permanently mid-flight; the piecewise
  // rig must park each one at Tz = 0 for a readable stretch.
  assert.equal(timeline.blankFrames, 0, 'the camera must never show an empty frame');
  assert.deepEqual(
    Object.keys(timeline.holds).sort(),
    ['layer1', 'layer2', 'layer3', 'layer4', 'layer5', 'layer6'],
    'every chapter needs a still hold at the camera plane',
  );
  for (const [id, span] of Object.entries(timeline.holds)) {
    assert.ok(span >= 0.05, `${id} holds for only ${span} of the track`);
  }
  // The interactive chapter earns the widest hold of the content chapters.
  assert.ok(timeline.holds.layer5 >= 0.075, `sandbox hold too short: ${timeline.holds.layer5}`);
  await page.close();
});

test('the venture sandbox is a stationary pointer target throughout its hold', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=stationary-proof`, {
    waitUntil: 'domcontentloaded',
  });

  const boxes = [];
  for (const progress of [0.79, 0.82, 0.86]) {
    await setScrollProgress(page, progress);
    await page.waitForFunction(() => Math.abs(Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--scroll-slip'),
    )) < 0.25);
    boxes.push(await page.locator('#betButton').boundingBox());
  }
  const drift = Math.max(
    ...boxes.slice(1).map((box) => Math.max(
      Math.abs(box.x - boxes[0].x),
      Math.abs(box.y - boxes[0].y),
      Math.abs(box.width - boxes[0].width),
    )),
  );
  assert.ok(drift <= 2, `the bet button drifted ${drift}px across its hold window`);

  // And it takes real pointer input where it sits, not just synthetic clicks.
  await setScrollProgress(page, 0.82);
  await page.waitForFunction(() => document.querySelector('#layer5').classList.contains('is-active'));
  await pointerClick(page, '#betButton');
  assert.equal(await page.locator('.bet-coin').count(), 1);

  await pointerClick(page, '#batchButton');
  await page.waitForFunction(() => document.querySelectorAll('.bet-coin').length === 50);
  const ledger = await page.evaluate(() => ({
    outliers: document.querySelector('#outlierCount').textContent,
    failures: document.querySelector('#failureCount').textContent,
    balance: document.querySelector('#balanceCount').textContent,
    status: document.querySelector('#portfolioStatus').textContent,
  }));
  assert.deepEqual(
    { outliers: ledger.outliers, failures: ledger.failures, balance: ledger.balance },
    { outliers: '1', failures: '47', balance: '+2' },
  );
  assert.match(ledger.status, /Portfolio recovered/);
  await page.close();
});

test('a phone sheds the per-frame blur, shortens the camera throw, and shrinks the star budget', async () => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=phone-proof`, {
    waitUntil: 'domcontentloaded',
  });

  const phone = await page.evaluate(() => {
    const root = document.documentElement;
    const depthOf = (el) => {
      const match = getComputedStyle(el).transform.match(/matrix3d\(([^)]*)\)/);
      return match ? Number(match[1].split(',')[14]) : 0;
    };
    let peakScale = 1;
    for (let step = 0; step <= 100; step += 1) {
      root.style.setProperty('--scroll-p', step / 100);
      for (const layer of document.querySelectorAll('.stage-3d .layer')) {
        if (Number(getComputedStyle(layer).opacity) > 0.05) {
          peakScale = Math.max(peakScale, 1000 / (1000 - depthOf(layer)));
        }
      }
    }
    root.style.removeProperty('--scroll-p');
    const canvas = document.querySelector('#starfield');
    return {
      peakScale,
      blurs: [...document.querySelectorAll('.chart-panel,.sandbox,.risk-panel,.branch-panel')]
        .map((panel) => getComputedStyle(panel).backdropFilter),
      backingRatio: canvas.width / window.innerWidth,
      devicePixelRatio: window.devicePixelRatio,
    };
  });

  // backdrop-filter forces a readback of everything behind a panel on every
  // frame that panel moves, and these panels move for the whole scroll.
  assert.deepEqual(new Set(phone.blurs), new Set(['none']), 'phones must not pay for backdrop blur');
  assert.ok(phone.devicePixelRatio >= 2, 'fixture must emulate a high-DPR phone');
  assert.ok(
    phone.backingRatio <= 1.5,
    `starfield backing store is ${phone.backingRatio}x device pixels, capped at 1.5x`,
  );
  // A shallow throw keeps composited layers near 1:1 so the phone GPU is not
  // re-rasterising a magnified layer on every frame.
  assert.ok(phone.peakScale < 1.25, `phone camera magnifies to ${phone.peakScale}x`);
  await page.close();
});

test('the starfield idles when it is off-screen and never reads style back per frame', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    window.__arcCalls = 0;
    window.__styleReads = 0;
    const { arc } = CanvasRenderingContext2D.prototype;
    CanvasRenderingContext2D.prototype.arc = function countedArc(...args) {
      window.__arcCalls += 1;
      return arc.apply(this, args);
    };
    const nativeGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function countedGetComputedStyle(...args) {
      window.__styleReads += 1;
      return nativeGetComputedStyle.apply(window, args);
    };
  });
  await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=idle-proof`, {
    waitUntil: 'domcontentloaded',
  });

  const sample = () => page.evaluate(async () => {
    window.__arcCalls = 0;
    window.__styleReads = 0;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { arcs: window.__arcCalls, styleReads: window.__styleReads };
  });

  await setScrollProgress(page, 0.5);
  await page.waitForTimeout(300);
  const onStage = await sample();
  assert.ok(onStage.arcs > 200, `starfield should animate on stage, saw ${onStage.arcs} arcs`);
  // Idle on stage the page runs exactly one loop, the starfield, and it must
  // read --scroll-p from a cached JS value. Reading it back off the root with
  // getComputedStyle forces a style resolution per frame — that regression
  // shows up here as roughly one style read per animation frame (~30 per
  // 500ms sample), so anything above a handful is the bug returning.
  assert.ok(
    onStage.styleReads <= 4,
    `per-frame getComputedStyle detected: ${onStage.styleReads} style reads in 500ms idle`,
  );

  // Park in the blueprint appendix, well past the sticky viewport.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  const inAppendix = await sample();
  assert.ok(
    inAppendix.arcs < onStage.arcs / 10,
    `starfield kept running off-screen: ${inAppendix.arcs} arcs vs ${onStage.arcs} on stage`,
  );
  await page.close();
});

test('no chapter pushes its exhibit past the fold, on a wide desktop or a small phone', async () => {
  // The venture sandbox is the whole point of chapter 5, and the reader has to
  // reach its controls and its bet field. A width-only type scale used to push
  // that field 256px below the bottom of a 1366x720 laptop.
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1366, height: 720 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ];
  const holds = [0.03, 0.245, 0.445, 0.645, 0.82, 0.975];
  const offenders = [];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/web/power-law-odyssey/?seed=fit-proof`, { waitUntil: 'load' });
    for (let index = 0; index < holds.length; index += 1) {
      await setScrollProgress(page, holds[index]);
      await page.waitForTimeout(120);
      const fit = await page.evaluate((chapter) => {
        const layer = document.querySelector(`#layer${chapter}`);
        const inner = layer.querySelector('.layer-inner').getBoundingClientRect();
        const stage = document.querySelector('.viewport-sticky').getBoundingClientRect();
        return {
          below: Math.round(inner.bottom - stage.bottom),
          above: Math.round(stage.top - inner.top),
        };
      }, index + 1);
      if (fit.below > 0 || fit.above > 0) {
        offenders.push(`${viewport.width}x${viewport.height} layer${index + 1} `
          + `clipped ${Math.max(fit.below, fit.above)}px`);
      }
    }
    await page.close();
  }

  assert.deepEqual(offenders, [], `chapters clipped by the fold:\n${offenders.join('\n')}`);
});

async function setScrollProgress(page, progress) {
  await page.evaluate((targetProgress) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const track = document.querySelector('#scrollTrack');
    const distance = track.offsetHeight - window.innerHeight;
    window.scrollTo(0, track.offsetTop + distance * targetProgress);
  }, progress);
}

async function pointerClick(page, selector) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, `${selector} must have a visible pointer target`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
