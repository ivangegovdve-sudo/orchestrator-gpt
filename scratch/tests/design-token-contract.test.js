const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const publicRoutes = [
  '/',
  '/web/kids/',
  '/web/math-mania/',
  '/web/kids-movie-library/',
  '/web/library/',
  '/web/library/glossary/',
  '/web/library/platform/',
  '/web/library/rag.html',
  '/web/library/repos/',
  '/web/library/general/',
  '/web/library/chloe/',
  '/web/library/memory/',
  '/web/ai-init/',
  '/web/council/',
  '/web/ai-research/',
  '/web/c2c-dolphin/',
  '/web/c2c-self/',
  '/web/power-law-odyssey/',
  '/web/life-in-time/',
  '/web/mendeleev-bg/',
  '/web/hypertrophyos/',
  '/web/womens-health-os/',
  '/web/calendar/',
  '/web/manifesto-newborn/',
  '/web/manifesto-newborn/bg/',
  '/web/manifesto-newborn/de/',
  '/web/manifesto-newborn/es/',
  '/web/manifesto-newborn/fr/',
  '/web/manifesto-newborn/it/',
  '/web/manifesto-newborn/mk/',
  '/web/manifesto-newborn/pt/',
  '/web/manifesto-newborn/ru/',
  '/web/manifesto-newborn/zh/',
  '/web/m-popova/',
  '/web/morning-news/',
  '/web/open-overview/',
  '/web/open-overview/openrouter/',
  '/web/open-overview/github/',
  '/web/vfx-portfolio/',
  '/web/replicator-void/',
  '/web/math-forest/',
  '/web/avatar-playground/',
  '/web/upload/',
];

let baseUrl;
let browser;
let server;

before(async () => {
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
      '.json': 'application/json; charset=utf-8',
      '.woff2': 'font/woff2',
    }[path.extname(filePath)] || 'application/octet-stream';
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

test('all reviewed internal pages inherit the exact canonical design tokens', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const failures = [];

  for (const route of publicRoutes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;inset:auto;visibility:hidden;pointer-events:none';
      document.body.append(probe);
      const resolve = (cssProperty, value) => {
        probe.style.setProperty(cssProperty, value);
        return getComputedStyle(probe).getPropertyValue(cssProperty).trim();
      };
      const rootStyle = getComputedStyle(document.documentElement);
      const font = resolve('font-family', 'var(--font)')
        .replace(/["'\s]/g, '')
        .toLowerCase();
      const result = {
        bg: resolve('background-color', 'var(--bg)'),
        surface: resolve('background-color', 'var(--surface)'),
        border: resolve('border-top-color', 'var(--border)'),
        textPrimary: resolve('color', 'var(--text-primary)'),
        textMuted: resolve('color', 'var(--text-muted)'),
        accent: resolve('color', 'var(--accent)'),
        accentGreen: resolve('color', 'var(--accent-green)'),
        radius: resolve('border-radius', 'var(--radius)'),
        font,
        raw: {
          border: rootStyle.getPropertyValue('--border').trim(),
          font: rootStyle.getPropertyValue('--font').trim(),
        },
      };
      probe.remove();
      return result;
    });
    if (
      state.bg !== 'rgb(7, 7, 11)'
      || state.surface !== 'rgb(15, 15, 21)'
      || state.border !== 'rgba(255, 255, 255, 0.08)'
      || state.textPrimary !== 'rgb(243, 244, 246)'
      || state.textMuted !== 'rgb(156, 163, 175)'
      || state.accent !== 'rgb(79, 70, 229)'
      || state.accentGreen !== 'rgb(34, 197, 94)'
      || state.radius !== '8px'
      || state.font !== '-apple-system,blinkmacsystemfont,segoeui,roboto,sans-serif'
    ) {
      failures.push({ route, ...state });
    }
  }

  assert.deepEqual(failures, []);
  await page.close();
});
