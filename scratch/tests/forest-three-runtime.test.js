const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('shared CSS publishes the exact SDForest motion tokens in the design root', () => {
  const css = read('web/shared/forest-design.css');
  const required = new Map([
    ['--spring', 'cubic-bezier(0.34, 1.56, 0.64, 1)'],
    ['--ease-out', 'cubic-bezier(0.16, 1, 0.3, 1)'],
    ['--duration-fast', '150ms'],
    ['--duration-normal', '300ms'],
    ['--duration-slow', '600ms'],
    ['--duration-spring', '400ms'],
    ['--stagger-card', '80ms'],
    ['--stagger-list', '30ms'],
  ]);

  for (const [token, value] of required) {
    assert.match(css, new RegExp(`${token}:\\s*${value.replace(/[().]/g, '\\$&')}`), token);
  }
  assert.match(css, /@keyframes\s+card-slam/);
  assert.match(css, /\.forest-motion-card\.in/);
  assert.match(css, /\.forest-motion-header\.in/);
});

test('ambient runtime is Three.js with real continuous interaction uniforms', () => {
  const runtime = read('web/shared/forest-motion.js');

  assert.match(runtime, /three\.module\.min\.js/);
  assert.match(runtime, /new THREE\.WebGLRenderer/);
  assert.match(runtime, /new THREE\.ShaderMaterial/);
  for (const uniform of ['uTime', 'uMouse', 'uClick', 'uClickOrigin', 'uResolution', 'uScroll']) {
    assert.match(runtime, new RegExp(`\\b${uniform}\\b`), uniform);
  }
  assert.match(runtime, /pointermove/);
  assert.match(runtime, /pointerdown/);
  assert.match(runtime, /scroll/);
  assert.match(runtime, /webglcontextlost/);
  assert.match(runtime, /webglcontextrestored/);
  assert.match(runtime, /visibilitychange/);
  assert.match(runtime, /prefers-reduced-motion/);
  assert.match(runtime, /window\.__forestAmbient/);
  assert.match(runtime, /dataset\.forestSceneOwner/);
  assert.match(runtime, /route-managed/);
});

test('theme registry gives public destinations distinct, deterministic scene identities', async () => {
  const themes = await import(`${pathToFileUrl(path.join(ROOT, 'web/shared/forest-themes.mjs'))}?t=${Date.now()}`);
  const expected = [
    'portal', 'kids', 'math', 'movie', 'library', 'council', 'power', 'time',
    'mendeleev', 'health', 'muscle', 'calendar', 'ink', 'poetry', 'news',
    'open-overview', 'ai-research', 'void', 'vfx', 'avatar', 'upload',
  ];
  const kinds = new Set();

  for (const id of expected) {
    const theme = themes.resolveForestTheme(id);
    assert.equal(theme.id, id, `missing theme ${id}`);
    assert.ok(theme.label);
    assert.ok(theme.kind);
    assert.equal(kinds.has(theme.kind), false, `theme kind reused: ${theme.kind}`);
    kinds.add(theme.kind);
  }

  const first = themes.createThemePoints(themes.resolveForestTheme('power'), 12, 42);
  const second = themes.createThemePoints(themes.resolveForestTheme('power'), 12, 42);
  assert.deepEqual(first, second);
  assert.equal(first.positions.length, 36);
  assert.equal(first.phases.length, 12);
});

test('public subpages opt into a named shared Three.js scene', () => {
  const pages = new Map([
    ['web/kids/index.html', 'kids'],
    ['web/math-mania/index.html', 'math'],
    ['web/kids-movie-library/index.html', 'movie'],
    ['web/library/index.html', 'library'],
    ['web/library/glossary/index.html', 'library'],
    ['web/library/platform/index.html', 'library'],
    ['web/library/rag.html', 'library'],
    ['web/ai-init/index.html', 'library'],
    ['web/council/index.html', 'council'],
    ['web/ai-research/index.html', 'ai-research'],
    ['web/c2c-dolphin/index.html', 'ai-research'],
    ['web/c2c-self/index.html', 'ai-research'],
    ['web/power-law-odyssey/index.html', 'power'],
    ['web/life-in-time/index.html', 'time'],
    ['web/mendeleev-bg/index.html', 'mendeleev'],
    ['web/hypertrophyos/index.html', 'muscle'],
    ['web/womens-health-os/index.html', 'health'],
    ['web/calendar/index.html', 'calendar'],
    ['web/manifesto-newborn/index.html', 'ink'],
    ['web/m-popova/index.html', 'poetry'],
    ['web/morning-news/index.html', 'news'],
    ['web/open-overview/index.html', 'open-overview'],
    ['web/open-overview/openrouter/index.html', 'open-overview'],
    ['web/open-overview/github/index.html', 'open-overview'],
    ['web/vfx-portfolio/index.html', 'vfx'],
    ['web/replicator-void/index.html', 'void'],
    ['web/math-forest/index.html', 'math'],
    ['web/avatar-playground/index.html', 'avatar'],
    ['web/upload/index.html', 'upload'],
  ]);

  for (const [relativePath, theme] of pages) {
    const html = read(relativePath);
    assert.match(
      html,
      new RegExp(`<body[^>]+data-forest-page=["']${theme}["']`, 'i'),
      `${relativePath} does not declare ${theme}`,
    );
    assert.match(html, /\/web\/shared\/forest-motion\.js/, `${relativePath} does not load the runtime`);
    assert.match(html, /\/web\/shared\/forest-design\.css/, `${relativePath} does not load shared tokens`);
  }
});

test('Open Overview keeps ownership of its capability-gated route-local Three.js scene', () => {
  for (const relativePath of [
    'web/open-overview/index.html',
    'web/open-overview/openrouter/index.html',
    'web/open-overview/github/index.html',
  ]) {
    const html = read(relativePath);
    assert.match(
      html,
      /<body[^>]+data-forest-scene-owner=["']route["']/i,
      `${relativePath} does not preserve route-local renderer ownership`,
    );
    assert.match(html, /\/web\/shared\/forest-motion\.js\?v=20260725c/);
    assert.match(html, /\/web\/open-overview\/open-overview\.js/);
  }

  const localRenderer = read('web/open-overview/open-overview-three.js');
  assert.match(localRenderer, /new THREE\.ShaderMaterial/);
  assert.match(localRenderer, /\buMouse\b/);
  assert.match(localRenderer, /\buClick\b/);
  assert.match(localRenderer, /pointermove/);
  assert.match(localRenderer, /pointerdown/);
});

test('entrance inventory scopes page-specific cards and headers without a global card selector', () => {
  const runtime = read('web/shared/forest-motion.js');

  for (const selector of [
    'body[data-forest-page="kids"] .kid-card',
    'body[data-forest-page="library"] .panel',
    'body[data-forest-page="movie"] .header-row',
    'body[data-open-overview-route] .oo-header',
  ]) {
    assert.match(runtime, new RegExp(escapeRegExp(selector)), selector);
  }
  assert.doesNotMatch(runtime, /(?:^|,\s*)\.card(?:\s*,|\s*['"`])/m);
});

test('shared runtime cache key is current across the reviewed public inventory', () => {
  const oldKeyFiles = [];
  const publicRoot = path.join(ROOT, 'web');

  for (const filePath of walkHtml(publicRoot)) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (!html.includes('/web/shared/forest-motion.js')) continue;
    // Power Law is owned by its independent implementation/review round.
    if (filePath.endsWith(path.join('power-law-odyssey', 'index.html'))) continue;
    if (!html.includes('/web/shared/forest-motion.js?v=20260729a')) {
      oldKeyFiles.push(path.relative(ROOT, filePath));
    }
  }

  assert.deepEqual(oldKeyFiles, []);
});

function pathToFileUrl(filePath) {
  return new URL(`file:///${filePath.replaceAll('\\', '/')}`).href;
}

function walkHtml(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
