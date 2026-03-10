import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = 4183;
const BASE = `http://127.0.0.1:${PORT}`;

function startServer() {
  return spawn('python', ['-m', 'http.server', String(PORT)], {
    cwd: process.cwd(),
    stdio: 'ignore',
    windowsHide: true,
  });
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(`${BASE}/web/ai-init/`);
      if (response.ok) {
        return;
      }
    } catch (_error) {
    }
    await delay(200);
  }
  throw new Error('Local server failed to start for e2e test');
}

const server = startServer();
let browser;

try {
  await waitForServer();

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.addInitScript(() => {
    window.__copiedText = '';
    const clip = {
      writeText: async (text) => {
        window.__copiedText = text;
      },
      readText: async () => window.__copiedText,
    };

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      enumerable: true,
      get() {
        return clip;
      },
    });

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      get() {
        return true;
      },
    });
  });

  const page = await context.newPage();
  await page.goto(`${BASE}/web/ai-init/`, { waitUntil: 'domcontentloaded' });

  // a) default route loads Home Search view
  await page.waitForSelector('#home-view.active');
  await page.waitForSelector('#home-search-input');

  // b) books icon exists + hover animation class/state
  await page.waitForSelector('#home-library-button .books-icon');
  await page.hover('#home-library-button');
  const animationName = await page.$eval('#home-library-button .books-icon', (el) => getComputedStyle(el).animationName);
  assert.equal(animationName, 'bookHoverLoop');

  // c) typing shows dropdown
  await page.fill('#home-search-input', 'LLM');
  await page.waitForSelector('#home-results:not([hidden]) .result-item');
  const resultCount = await page.$$eval('#home-results .result-item', (nodes) => nodes.length);
  assert.ok(resultCount > 0 && resultCount <= 10);

  // d) click first result copies expected text
  await page.click('#home-results .result-item:first-child');
  const copied = await page.evaluate(() => window.__copiedText || '');
  assert.match(copied, /^[^\s].+ — .+/);

  // e) click books icon enters library view
  await page.click('#home-library-button');
  await page.waitForSelector('#library-view.active');

  // f) categories collapsed by default
  const openCategories = await page.$$eval('#library-tree .accordion.open', (nodes) => nodes.length);
  assert.equal(openCategories, 0);

  // g) expand category reveals entries
  await page.click('#library-tree .accordion.category .accordion-trigger');
  const hasOpenCategory = await page.$eval('#library-tree .accordion.category', (node) => node.classList.contains('open'));
  assert.equal(hasOpenCategory, true);

  // h) orchestrator button does NOT exist
  const orchestratorExists = await page.locator('text=Send to Orchestrator GPT').count();
  assert.equal(orchestratorExists, 0);

  // i) A-Z filter does NOT exist
  const azExists = await page.locator('text=A-Z').count();
  assert.equal(azExists, 0);

  await page.goto(`${BASE}/web/ai-init/embed/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#embed-search-input');

  console.log('glossary e2e checks passed');
} finally {
  if (browser) {
    await browser.close();
  }
  server.kill('SIGTERM');
}
