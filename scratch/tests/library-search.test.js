const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(repoRoot, 'web/library/index.html'), 'utf8');
const dataContext = { window: {} };
vm.createContext(dataContext);
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'web/ai-init/glossary-data.js'), 'utf8'), dataContext);
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'web/library/platforms-data.js'), 'utf8'), dataContext);
const glossaryCount = dataContext.window.AI_INIT_GLOSSARY_DATA.length;
const platformCount = dataContext.window.LIBRARY_PLATFORMS.length;

let baseUrl;
let browser;
let server;

before(async () => {
  server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let filePath = path.resolve(repoRoot, requestPath.replace(/^\/+/, ''));
    if (!filePath.startsWith(repoRoot)) return response.writeHead(403).end('Forbidden');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return response.writeHead(404).end('Not found');
    const type = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2' }[path.extname(filePath)] || 'application/octet-stream';
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

test('library contract is data-derived, unified, bounded, and route-safe', () => {
  assert.equal(glossaryCount, 527);
  assert.equal(platformCount, 165);
  assert.equal(glossaryCount + platformCount, 692);
  assert.doesNotMatch(html, /entries\.length\s*=\s*692|of 692 entries/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-source="all"[^>]+aria-pressed="true">All/);
  assert.match(html, /data-source="glossary"[^>]+>Glossary/);
  assert.match(html, /data-source="platform"[^>]+>Platforms/);
  assert.match(html, /function scheduleRender\(\)[\s\S]*requestAnimationFrame/);
  assert.doesNotMatch(html, /setTimeout\(renderAll/);
  assert.match(html, /document\.createElement\("h3"\)/);
  assert.match(html, /row\.setAttribute\("aria-labelledby", heading\.id\)/);
  assert.match(html, /link\.setAttribute\("aria-label", "Visit " \+ entry\.title\)/);
  assert.match(
    html,
    /\.library-row:nth-child\(n\+11\)\{animation-delay:calc\(var\(--stagger-card\) \* 10\)\}/,
  );
  assert.match(html, /prefers-reduced-motion:reduce\)\{\.library-row\{animation:none/);
  for (const href of [
    '/web/library/glossary/', '/web/library/platform/', '/web/library/rag.html',
    '/web/library/repos/', '/web/library/general/', '/web/library/chloe/',
    '/web/library/memory/',
  ]) assert.match(html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.doesNotMatch(html, /href="\/web\/ai-init\/"/);
  assert.match(html, /src="\/web\/ai-init\/glossary-data\.js/);
});

test('search and source filters update one unified live result set', async () => {
  const context = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/library/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#result-count').textContent(), '692 of 692 entries');
  assert.equal(await page.locator('.library-row').count(), 692);

  await page.locator('[data-source="glossary"]').click();
  await page.waitForFunction(() => document.querySelector('#result-count').textContent.startsWith('527 of '));
  assert.equal(await page.locator('.library-row[data-type="glossary"]').count(), 527);
  assert.equal(await page.locator('[data-source="glossary"]').getAttribute('aria-pressed'), 'true');

  await page.locator('#q').fill('CUDA');
  await page.waitForFunction(() => document.querySelectorAll('.library-row').length < 527);
  assert.match(await page.locator('#library-list').textContent(), /CUDA/i);

  await page.locator('[data-source="platform"]').click();
  await page.locator('#q').fill('OpenAI');
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('.library-row')];
    return rows.length > 0 && rows.every((row) => row.dataset.type === 'platform');
  });
  assert.match(await page.locator('#library-list').textContent(), /OpenAI/i);
  const semantics = await page.locator('.library-row').evaluateAll((rows) => rows.map((row) => {
    const heading = row.querySelector('h3');
    const link = row.querySelector('a');
    return {
      labelledBy: row.getAttribute('aria-labelledby'),
      headingId: heading?.id || '',
      linkName: link?.getAttribute('aria-label') || '',
    };
  }));
  assert.equal(semantics.every(({ labelledBy, headingId }) => labelledBy === headingId), true);
  assert.equal(
    semantics.filter(({ linkName }) => linkName).every(({ linkName }) => /^Visit .+/.test(linkName)),
    true,
  );

  await page.locator('#search-clear').click();
  await page.locator('[data-source="all"]').click();
  await page.waitForFunction(() => document.querySelector('#result-count').textContent === '692 of 692 entries');
  const motion = await page.locator('.library-row').evaluateAll((rows) => ({
    tenth: getComputedStyle(rows[9]).animationName,
    eleventh: getComputedStyle(rows[10]).animationName,
    eleventhDelay: getComputedStyle(rows[10]).animationDelay,
  }));
  assert.notEqual(motion.tenth, 'none');
  assert.notEqual(motion.eleventh, 'none');
  assert.equal(motion.eleventhDelay, '0.8s');
  await context.close();
});

test('reduced motion is static and mobile has no horizontal overflow', async () => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/web/library/`, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => ({
    overflow: document.body.scrollWidth - document.documentElement.clientWidth,
    animation: getComputedStyle(document.querySelector('.library-row')).animationName,
  }));
  assert.equal(result.overflow, 0);
  assert.equal(result.animation, 'none');
  await context.close();
});
