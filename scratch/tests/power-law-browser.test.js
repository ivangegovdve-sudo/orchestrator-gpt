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
  await page.waitForTimeout(650);

  const final = await page.evaluate(() => {
    window.__portfolioObserver.disconnect();
    const field = document.querySelector('#betField').getBoundingClientRect();
    const target = {
      x: field.left + field.width / 2,
      y: field.top + field.height / 2,
    };
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
      centerDeltas: [...document.querySelectorAll('#betField > .bet-coin')].map((coin) => {
        const rect = coin.getBoundingClientRect();
        return {
          x: Math.abs(rect.left + rect.width / 2 - target.x),
          y: Math.abs(rect.top + rect.height / 2 - target.y),
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
  assert.equal(
    final.centerDeltas.every(({ x, y }) => x <= 1 && y <= 1),
    true,
    JSON.stringify(final.centerDeltas),
  );

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
