const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const CACHE_VERSION = '20260729g';
const htmlFiles = () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : (entry.isFile() && file.endsWith('.html') ? [file] : []);
  });
  return [path.join(ROOT, 'index.html'), ...['web', 'calendar', 'movies', 'frontend'].flatMap((dir) => walk(path.join(ROOT, dir)))];
};

let browser;
let server;
let baseUrl;

before(async () => {
  server = http.createServer((request, response) => {
    let file = path.resolve(ROOT, decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, ''));
    if (!file.startsWith(ROOT)) return response.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': ['.js', '.mjs'].includes(path.extname(file)) ? 'text/javascript' : path.extname(file) === '.css' ? 'text/css' : 'text/html' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
});

after(async () => {
  await browser?.close();
  server?.closeAllConnections();
  await new Promise((resolve) => server?.close(resolve));
});

test('shared tokens have canonical owners while public names remain aliases', () => {
  const design = fs.readFileSync(path.join(ROOT, 'web/shared/forest-design.css'), 'utf8');
  const shell = fs.readFileSync(path.join(ROOT, 'web/shared/forest-shell.css'), 'utf8');
  const home = fs.readFileSync(path.join(ROOT, 'web/shared/forest-home.css'), 'utf8');
  assert.match(design, /--theme-shell-bg:\s*#070a08/);
  assert.match(design, /--theme-ui-bg:\s*#07070b/);
  assert.match(design, /--theme-home-bg:\s*var\(--theme-ui-bg\)/);
  assert.match(design, /--forest-bg:\s*var\(--theme-shell-bg\)/);
  assert.match(design, /--bg:\s*var\(--theme-ui-bg\)/);
  assert.match(design, /--home-bg:\s*var\(--theme-home-bg\)/);
  assert.match(design, /--duration-deliberation-stagger:\s*200ms/);
  assert.match(design, /--duration-convergence:\s*500ms/);
  assert.doesNotMatch(shell, /--forest-bg:\s*#/);
  assert.doesNotMatch(home, /--home-bg:\s*(?:#|var\(--bg\))/);
});

test('feedback is deferred exactly once in the head of all 55 shipped HTML sources', () => {
  const files = htmlFiles();
  assert.equal(files.length, 55);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const tags = source.match(new RegExp(`<script\\s+defer\\s+src=["']\\/web\\/shared\\/feedback\\.js\\?v=${CACHE_VERSION}["']><\\/script>`, 'g')) || [];
    assert.equal(tags.length, 1, path.relative(ROOT, file));
    assert.ok(source.indexOf(tags[0]) < source.toLowerCase().indexOf('</head>'), `${path.relative(ROOT, file)} feedback tag must be in head`);
  }
});

test('every shared CSS or JavaScript asset reference uses the single current cache version', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() && !['vercel-public', 'node_modules', 'scratch'].includes(entry.name) ? walk(file) : (entry.isFile() && /\.(?:html|js|mjs|css)$/.test(file) ? [file] : []);
  });
  const references = [];
  for (const file of walk(ROOT)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\/web\/shared\/[^"'`\s)]+?\.(?:css|js|mjs)\?v=([^"'`\s)&]+)/g)) {
      references.push({ file: path.relative(ROOT, file), version: match[1], asset: match[0] });
    }
  }
  assert.ok(references.length > 0, 'expected shared asset references');
  assert.deepEqual([...new Set(references.map(({ version }) => version))], [CACHE_VERSION], JSON.stringify(references, null, 2));

  const unversionedReferences = [];
  const relativeModuleReferences = [];
  for (const file of walk(ROOT)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\/web\/shared\/[^"'`\s)]+?\.(?:css|js|mjs)(?:\?[^"'`\s)]*)?/g)) {
      if (!match[0].includes(`?v=${CACHE_VERSION}`)) {
        unversionedReferences.push({ file: path.relative(ROOT, file), asset: match[0] });
      }
    }
    if (!file.startsWith(path.join(ROOT, 'web', 'shared'))) continue;
    for (const match of source.matchAll(/\b(?:from|import)\s*\(?\s*['"](\.\/[^'"]+?\.(?:js|mjs|css)(?:\?[^'"]*)?)['"]/g)) {
      if (!match[1].includes(`?v=${CACHE_VERSION}`)) {
        relativeModuleReferences.push({ file: path.relative(ROOT, file), asset: match[1] });
      }
    }
  }
  assert.deepEqual(unversionedReferences, [], 'every absolute shared asset reference carries the current cache key');
  assert.deepEqual(relativeModuleReferences, [], 'every shared-relative module reference carries the current cache key');
});

test('route inventory browser modules use native mjs paths without stale JavaScript references', () => {
  for (const moduleName of ['forest-trails', 'route-inventory']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'web/shared', `${moduleName}.mjs`)), `${moduleName} is a native module`);
    assert.equal(fs.existsSync(path.join(ROOT, 'web/shared', `${moduleName}.js`)), false, `${moduleName} no longer has a typeless .js duplicate`);
  }

  const routeSources = [
    'index.html',
    'web/shared/forest-motion.js',
    'web/shared/forest-trails.mjs',
  ].map((file) => ({ file, source: fs.readFileSync(path.join(ROOT, file), 'utf8') }));
  for (const { file, source } of routeSources) {
    assert.doesNotMatch(source, /(?:forest-trails|route-inventory)\.js\b/, `${file} has no stale route module reference`);
  }
  assert.match(routeSources[0].source, new RegExp(`/web/shared/forest-trails\\.mjs\\?v=${CACHE_VERSION}`));
  assert.match(routeSources[1].source, new RegExp(`/web/shared/forest-trails\\.mjs\\?v=${CACHE_VERSION}`));
  assert.match(routeSources[2].source, new RegExp(`from '\\.\/route-inventory\\.mjs\\?v=${CACHE_VERSION}'`));
  assert.match(routeSources[1].source, new RegExp(`/web/shared/forest-themes\\.mjs\\?v=${CACHE_VERSION}`));
});

test('Task 1 browser fixture serves native modules with a JavaScript MIME type', async () => {
  const response = await fetch(`${baseUrl}/web/shared/forest-trails.mjs?v=${CACHE_VERSION}`);
  assert.match(response.headers.get('content-type'), /^text\/javascript/);
});

test('computed public aliases resolve to their canonical token family values', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const aliases = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const pairs = [
      ['--theme-shell-bg', '--forest-bg'], ['--theme-shell-surface', '--forest-surface'],
      ['--theme-shell-ink', '--forest-ink'], ['--theme-shell-display', '--forest-display'],
      ['--theme-shell-body', '--forest-body'], ['--theme-shell-sans', '--forest-sans'],
      ['--theme-ui-bg', '--bg'], ['--theme-ui-surface', '--surface'], ['--theme-ui-border', '--border'],
      ['--theme-ui-text-primary', '--text-primary'], ['--theme-ui-text-muted', '--text-muted'],
      ['--theme-ui-accent', '--accent'], ['--theme-ui-accent-green', '--accent-green'],
      ['--theme-ui-radius', '--radius'], ['--theme-ui-font', '--font'],
      ['--theme-home-bg', '--home-bg'], ['--theme-home-surface', '--home-surface'],
      ['--theme-home-ink', '--home-ink'], ['--theme-home-soft', '--home-soft'],
      ['--theme-home-muted', '--home-muted'], ['--theme-home-line', '--home-line'],
      ['--theme-home-amber', '--home-amber'], ['--theme-home-moss', '--home-moss'],
      ['--theme-home-display', '--home-display'], ['--theme-home-body', '--home-body'], ['--theme-home-sans', '--home-sans'],
    ];
    return pairs.map(([canonical, alias]) => ({ canonical, alias, expected: root.getPropertyValue(canonical).trim(), actual: root.getPropertyValue(alias).trim() }));
  });
  assert.deepEqual(aliases.map(({ canonical, alias, expected, actual }) => ({ canonical, alias, expected, actual: expected })), aliases);
  await page.close();
});

test('feedback injects an accessible dialog, sends the trimmed message and restores focus', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('https://formspree.io/**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const trigger = page.getByRole('button', { name: 'Send feedback' });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Site feedback' });
  await assert.doesNotReject(dialog.waitFor());
  await page.getByLabel("What's wrong, missing, or could be better?").fill('  Needs a little more moss.  ');
  const request = page.waitForRequest((request) => request.url() === 'https://formspree.io/f/PLACEHOLDER' && request.method() === 'POST');
  await page.getByRole('button', { name: 'Submit' }).click();
  assert.deepEqual(JSON.parse((await request).postData()), { message: 'Needs a little more moss.', url: `${baseUrl}/` });
  await assert.doesNotReject(page.getByText('Thanks — noted.').waitFor());
  assert.equal(await dialog.locator('form').count(), 0);
  assert.equal(await dialog.getByRole('status').textContent(), 'Thanks — noted.');
  await page.waitForTimeout(2100);
  assert.equal(await dialog.count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Send feedback');
  await page.close();
});

test('feedback supports escape, backdrop, failure, reduced motion, and has no persistence side effects', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.route('https://formspree.io/**', async (route) => route.fulfill({ status: 500, body: 'nope' }));
  await page.goto(`${baseUrl}/web/kids/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Send feedback' }).click();
  const dialog = page.getByRole('dialog', { name: 'Site feedback' });
  assert.equal(await dialog.evaluate((node) => getComputedStyle(node).transitionDuration), '0s');
  await page.getByLabel("What's wrong, missing, or could be better?").fill('Please retry');
  await page.getByRole('button', { name: 'Submit' }).click();
  await assert.doesNotReject(page.getByText("Couldn't send — try again later.").waitFor());
  assert.deepEqual(await page.evaluate(() => [document.cookie, localStorage.length, sessionStorage.length]), ['', 0, 0]);
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await page.locator('[data-feedback-backdrop]').click({ position: { x: 4, y: 4 } });
  assert.equal(await dialog.count(), 0);
  const clearsFixedControl = await page.evaluate(async () => {
    const blocker = document.createElement('button');
    blocker.textContent = 'Existing fixed action';
    blocker.style.cssText = 'position:fixed;right:18px;bottom:18px;width:150px;height:44px;z-index:2147483647';
    document.body.append(blocker);
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const feedback = document.querySelector('button[aria-label="Send feedback"]');
    const feedbackRect = feedback.getBoundingClientRect();
    const blockerRect = blocker.getBoundingClientRect();
    const overlaps = feedbackRect.left < blockerRect.right
      && feedbackRect.right > blockerRect.left
      && feedbackRect.top < blockerRect.bottom
      && feedbackRect.bottom > blockerRect.top;
    blocker.remove();
    window.dispatchEvent(new Event('resize'));
    return {
      overlaps,
      shiftedBottom: feedback.style.bottom,
    };
  });
  assert.equal(clearsFixedControl.overlaps, false);
  assert.ok(Number.parseFloat(clearsFixedControl.shiftedBottom) >= 18);
  const clearsLateFixedControl = await page.evaluate(async () => {
    const blocker = document.createElement('button');
    blocker.textContent = 'Late fixed action';
    blocker.style.cssText = 'position:fixed;right:18px;bottom:18px;width:150px;height:44px;z-index:2147483647';
    document.body.append(blocker);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const feedback = document.querySelector('button[aria-label="Send feedback"]');
    const feedbackRect = feedback.getBoundingClientRect();
    const blockerRect = blocker.getBoundingClientRect();
    const overlaps = feedbackRect.left < blockerRect.right
      && feedbackRect.right > blockerRect.left
      && feedbackRect.top < blockerRect.bottom
      && feedbackRect.bottom > blockerRect.top;
    blocker.remove();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      overlaps,
      shiftedBottom: feedback.style.bottom,
    };
  });
  assert.equal(clearsLateFixedControl.overlaps, false);
  assert.ok(Number.parseFloat(clearsLateFixedControl.shiftedBottom) >= 18);
  await page.close();
});

test('design history retints canonical properties and reset clears every override', async () => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const result = await page.evaluate(() => {
    window.__forestDesignHistory.apply('prompt-builder');
    const applied = getComputedStyle(document.documentElement).getPropertyValue('--theme-shell-bg').trim();
    const alias = getComputedStyle(document.documentElement).getPropertyValue('--forest-bg').trim();
    window.__forestDesignHistory.reset();
    return { applied, alias, reset: document.documentElement.style.getPropertyValue('--theme-shell-bg') };
  });
  assert.deepEqual(result, { applied: '#020617', alias: '#020617', reset: '' });
  await page.close();
});
