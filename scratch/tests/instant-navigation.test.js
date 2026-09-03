const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const CACHE_VERSION = '20260807a';

const walkHtml = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory()
    ? walkHtml(file)
    : (entry.isFile() && file.endsWith('.html') ? [file] : []);
});

const htmlFiles = () => [
  path.join(ROOT, 'index.html'),
  ...['web', 'calendar', 'movies', 'frontend'].flatMap((directory) => walkHtml(path.join(ROOT, directory))),
];

const relative = (file) => path.relative(ROOT, file).replaceAll('\\', '/');

const REDIRECT_PATHS = Object.freeze([
  'calendar/calendario.html',
  'calendar/index.html',
  'movies/index.html',
  'web/ai-init/index.html',
  'web/council/byok/index.html',
  'web/council/inner/index.html',
  'web/council/tinylm/index.html',
  'web/llm-db/index.html',
  'web/tinylm/index.html',
]);

const NON_ATLAS_UTILITY_PATHS = Object.freeze([
  'frontend/index.html',
  'web/ai-init/embed/index.html',
]);

const ADVERTISER_PATHS = () => htmlFiles()
  .map(relative)
  .filter((file) => (
    file === 'index.html'
    || (file.startsWith('web/') && !REDIRECT_PATHS.includes(file) && !NON_ATLAS_UTILITY_PATHS.includes(file))
  ));

const SAFE_PRERENDER_CANDIDATES = Object.freeze([
  '/web/ai-research/',
  '/web/c2c-dolphin/',
  '/web/c2c-self/',
  '/web/calendar/',
  '/web/council/',
  '/web/hypertrophyos/',
  '/web/kids/',
  '/web/kids-movie-library/',
  '/web/library/',
  '/web/library/general/',
  '/web/library/glossary/',
  '/web/library/memory/',
  '/web/library/platform/',
  '/web/library/rag.html',
  '/web/library/repos/',
  '/web/life-in-time/',
  '/web/m-popova/',
  '/web/math-mania/',
  '/web/mendeleev-bg/',
  '/web/morning-news/',
  '/web/upload/',
  '/web/vfx-portfolio/index.html',
]);

const UNSAFE_PRERENDER_CANDIDATES = Object.freeze([
  '/web/avatar-playground/',
  '/web/replicator-void/',
  '/web/chloe-pwa/',
  '/web/open-dashboard/',
  '/web/open-dashboard/github/',
  '/web/power-law-odyssey/',
  '/web/library/chloe/',
  '/web/manifesto-newborn/',
  '/web/manifesto-newborn/bg/',
  '/web/womens-health-os/',
  '/web/ai-init/',
  '/web/llm-db/',
  '/web/tinylm/',
  '/web/council/byok/',
  '/web/council/inner/',
  '/web/council/tinylm/',
  '/web/evolution/',
  '/web/future-autonomous-loop/',
  '/web/math-forest/',
]);

const navigationModule = () => import(pathToFileURL(path.join(ROOT, 'web/shared/forest-navigation.mjs')).href);
const runtimeModule = () => import(pathToFileURL(path.join(ROOT, 'web/shared/forest-runtime-boot.mjs')).href);

function matchesPattern(pattern, href) {
  if (pattern.endsWith('*')) return href.startsWith(pattern.slice(0, -1));
  return href === pattern;
}

function matchesWhere(where, href) {
  if (where.href_matches) return matchesPattern(where.href_matches, href);
  if (where.and) return where.and.every((clause) => matchesWhere(clause, href));
  if (where.or) return where.or.some((clause) => matchesWhere(clause, href));
  if (where.not) return !matchesWhere(where.not, href);
  throw new Error(`Unsupported speculation clause: ${JSON.stringify(where)}`);
}

test('navigation policy returns literal landing, hub, canonical, redirect, and alias results', async () => {
  const {
    getDocumentPrefetches,
    normalizePathname,
  } = await navigationModule();

  assert.equal(
    normalizePathname('https://www.sdforest.site/web/vfx-portfolio/index.html?from=atlas#showreel'),
    '/web/vfx-portfolio/',
  );
  assert.equal(normalizePathname('/web/library/rag.html/'), '/web/library/rag.html');
  assert.deepEqual(getDocumentPrefetches('/'), ['/web/life-in-time/', '/web/vfx-portfolio/']);
  assert.deepEqual(
    getDocumentPrefetches('/web/kids/'),
    ['/web/kids-movie-library/', '/web/math-mania/'],
  );
  assert.deepEqual(
    getDocumentPrefetches('/web/ai-research/'),
    ['/web/avatar-playground/', '/web/c2c-dolphin/'],
  );
  assert.deepEqual(
    getDocumentPrefetches('/web/council/'),
    ['/web/explore/', '/web/ai-research/'],
  );
  assert.deepEqual(
    getDocumentPrefetches('/web/library/rag.html'),
    ['/web/upload/', '/web/open-dashboard/'],
  );
  assert.deepEqual(
    getDocumentPrefetches('/web/manifesto-newborn/bg/index.html'),
    ['/web/vfx-portfolio/', '/web/m-popova/'],
  );

  for (const pathname of [
    '/web/ai-init/',
    '/web/llm-db/',
    '/web/tinylm/',
    '/web/council/byok/',
    '/web/council/inner/',
    '/web/council/tinylm/',
    '/calendar/',
    '/calendar/calendario.html',
    '/movies/',
    '/web/ai-init/embed/',
    '/frontend/',
    '/not-a-route/',
  ]) {
    assert.deepEqual(getDocumentPrefetches(pathname), [], pathname);
  }
});

test('every route prefetch set is local, unique, self-free, eligible, and capped at two', async () => {
  const {
    getDocumentPrefetches,
    normalizePathname,
  } = await navigationModule();
  const candidates = [
    '/',
    '/web/morning-news/',
    '/web/upload/',
    '/web/library/',
    '/web/open-dashboard/',
    '/web/council/',
    '/web/ai-research/',
    '/web/c2c-dolphin/',
    '/web/c2c-self/',
    '/web/avatar-playground/',
    '/web/chloe-pwa/',
    '/web/life-in-time/',
    '/web/womens-health-os/',
    '/web/hypertrophyos/',
    '/web/calendar/',
    '/web/kids/',
    '/web/math-mania/',
    '/web/kids-movie-library/',
    '/web/math-forest/',
    '/web/mendeleev-bg/',
    '/web/vfx-portfolio/',
    '/web/manifesto-newborn/',
    '/web/m-popova/',
    '/web/power-law-odyssey/',
    '/web/replicator-void/',
    '/web/evolution/',
  ];
  for (const pathname of candidates) {
    const actual = getDocumentPrefetches(pathname);
    assert.ok(actual.length <= 2, pathname);
    assert.equal(new Set(actual).size, actual.length, pathname);
    assert.ok(actual.every((href) => href.startsWith('/')), pathname);
    assert.ok(!actual.includes(normalizePathname(pathname)), pathname);
    assert.ok(!actual.some((href) => [
      '/web/chloe-pwa/',
      '/web/math-forest/',
      '/web/evolution/',
      '/web/ai-init/',
      '/web/llm-db/',
      '/web/tinylm/',
    ].includes(href)), pathname);
  }
});

test('document prefetch installation creates real document hints once without touching navigation state', async () => {
  const { installDocumentPrefetches } = await navigationModule();
  const appended = [];
  const fakeDocument = {
    head: { append: (...nodes) => appended.push(...nodes) },
    querySelectorAll: () => [],
    createElement: () => ({
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
    }),
  };
  assert.deepEqual(
    installDocumentPrefetches({ targetDocument: fakeDocument, pathname: '/web/kids/' }),
    ['/web/kids-movie-library/', '/web/math-mania/'],
  );
  assert.deepEqual(
    appended.map(({ attributes }) => attributes),
    [
      { rel: 'prefetch', as: 'document', href: '/web/kids-movie-library/' },
      { rel: 'prefetch', as: 'document', href: '/web/math-mania/' },
    ],
  );
  assert.deepEqual(
    installDocumentPrefetches({ targetDocument: fakeDocument, pathname: '/web/kids/' }),
    ['/web/kids-movie-library/', '/web/math-mania/'],
  );
  assert.equal(appended.length, 2);
});

test('all 63 heads load navigation once while redirects and utilities advertise no prerender', () => {
  const files = htmlFiles();
  assert.equal(files.length, 63);
  const advertisers = new Set(ADVERTISER_PATHS());
  assert.equal(advertisers.size, 53);

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const filePath = relative(file);
    const head = source.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || '';
    const navigationTags = head.match(
      new RegExp(`<script\\s+type=["']module["']\\s+src=["']\\/web\\/shared\\/forest-navigation\\.mjs\\?v=${CACHE_VERSION}["']><\\/script>`, 'g'),
    ) || [];
    const speculationTags = head.match(/<script\s+type=["']speculationrules["']>/g) || [];
    const faviconTags = head.match(
      new RegExp(`<link\\s+rel=["']icon["']\\s+href=["']\\/web\\/shared\\/favicon\\.svg\\?v=${CACHE_VERSION}["']\\s+type=["']image\\/svg\\+xml["']>`, 'g'),
    ) || [];
    assert.equal(navigationTags.length, 1, filePath);
    assert.equal(faviconTags.length, 1, filePath);
    assert.equal(speculationTags.length, advertisers.has(filePath) ? 1 : 0, filePath);
  }
});

test('charset metadata remains parser-visible before large navigation hints', () => {
  for (const file of htmlFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const filePath = relative(file);
    const charsetIndex = source.search(/<meta\s+charset=/i);
    const speculationIndex = source.search(/<script\s+type=["']speculationrules["']>/i);

    assert.ok(charsetIndex >= 0 && charsetIndex < 1024, filePath);
    if (speculationIndex >= 0) {
      assert.ok(charsetIndex < speculationIndex, filePath);
    }
  }
});

test('moderate speculation rules match only the audited safe allow-list', () => {
  for (const filePath of ADVERTISER_PATHS()) {
    const source = fs.readFileSync(path.join(ROOT, filePath), 'utf8');
    const block = source.match(/<script\s+type=["']speculationrules["']>([\s\S]*?)<\/script>/);
    assert.ok(block, filePath);
    const rules = JSON.parse(block[1]);
    assert.equal(rules.prerender.length, 1, filePath);
    assert.equal(rules.prerender[0].eagerness, 'moderate', filePath);
    const where = rules.prerender[0].where;
    for (const href of SAFE_PRERENDER_CANDIDATES) {
      assert.equal(matchesWhere(where, href), true, `${filePath} should allow ${href}`);
    }
    for (const href of UNSAFE_PRERENDER_CANDIDATES) {
      assert.equal(matchesWhere(where, href), false, `${filePath} should exclude ${href}`);
    }
  }
});

test('critical preloads exist only on non-redirect Forest documents and use the correct glyph subset', () => {
  const preloadFiles = new Set(ADVERTISER_PATHS());
  for (const file of htmlFiles()) {
    const filePath = relative(file);
    const source = fs.readFileSync(file, 'utf8');
    const head = source.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || '';
    const designPreloads = head.match(
      new RegExp(`<link\\s+rel=["']preload["']\\s+href=["']\\/web\\/shared\\/forest-design\\.css\\?v=${CACHE_VERSION}["']\\s+as=["']style["']>`),
    );
    const fontPreloads = [...head.matchAll(/<link\s+rel=["']preload["']\s+href=["']([^"']+\.woff2)["']\s+as=["']font["']\s+type=["']font\/woff2["']\s+crossorigin>/g)]
      .map((match) => match[1]);
    assert.equal(Boolean(designPreloads), preloadFiles.has(filePath), filePath);
    if (!preloadFiles.has(filePath) || filePath === 'web/manifesto-newborn/zh/index.html') {
      assert.deepEqual(fontPreloads, [], filePath);
      continue;
    }
    assert.equal(fontPreloads.length, 2, filePath);
    for (const href of fontPreloads) {
      assert.ok(fs.existsSync(path.join(ROOT, href.replace(/^\//, ''))), `${filePath}: ${href}`);
    }
    const cyrillic = (
      filePath === 'web/mendeleev-bg/index.html'
      || /^web\/manifesto-newborn\/(?:bg|mk|ru)\//.test(filePath)
    );
    assert.ok(fontPreloads.every((href) => href.includes(cyrillic ? '-cyrillic.woff2' : '-latin.woff2')), filePath);
    assert.ok(
      fontPreloads.some((href) => href.includes(
        filePath === 'index.html'
          ? 'cormorant-garamond-normal-500-'
          : 'cormorant-garamond-normal-600-',
      )),
      filePath,
    );
    assert.ok(fontPreloads.some((href) => href.includes('alegreya-normal-400-900-')), filePath);
  }
});

test('runtime boot waits through prerender and imports exactly once after activation', async () => {
  const { createRuntimeBoot } = await runtimeModule();
  const listeners = [];
  const imports = [];
  const fakeDocument = {
    prerendering: true,
    documentElement: { dataset: {} },
    addEventListener(type, listener, options) {
      listeners.push({ type, listener, options });
    },
  };
  const controller = createRuntimeBoot({
    targetDocument: fakeDocument,
    runtime: 'motion',
    importer: async (specifier) => imports.push(specifier),
  });
  const duplicate = createRuntimeBoot({
    targetDocument: fakeDocument,
    runtime: 'motion',
    importer: async () => imports.push('duplicate'),
  });
  assert.equal(controller, duplicate);
  assert.deepEqual(imports, []);
  assert.equal(fakeDocument.documentElement.dataset.forestRuntimeBoot, 'waiting');
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].type, 'prerenderingchange');
  assert.deepEqual(listeners[0].options, { once: true });
  fakeDocument.prerendering = false;
  listeners[0].listener();
  await controller.whenBooted();
  listeners[0].listener();
  await controller.whenBooted();
  assert.deepEqual(imports, [`./forest-motion.js?v=${CACHE_VERSION}`]);
  assert.equal(fakeDocument.documentElement.dataset.forestRuntimeBoot, 'ready');
});

test('runtime boot imports immediately once during a normal navigation', async () => {
  const { createRuntimeBoot } = await runtimeModule();
  const imports = [];
  const fakeDocument = {
    prerendering: false,
    documentElement: { dataset: {} },
    addEventListener() {
      throw new Error('normal navigation must not register a prerender listener');
    },
  };
  const controller = createRuntimeBoot({
    targetDocument: fakeDocument,
    runtime: 'three',
    importer: async (specifier) => imports.push(specifier),
  });
  await controller.whenBooted();
  controller.bootOnce();
  await controller.whenBooted();
  assert.deepEqual(imports, [`./forest-three.js?v=${CACHE_VERSION}`]);
  assert.equal(fakeDocument.documentElement.dataset.forestRuntimeBoot, 'ready');
});

test('all shared Forest runtimes are activation-gated at their original document positions', () => {
  let threeLoaders = 0;
  let motionLoaders = 0;
  for (const file of htmlFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const filePath = relative(file);
    assert.doesNotMatch(source, /<script[^>]+src=["'][^"']*forest-three\.js/, filePath);
    assert.doesNotMatch(source, /<script[^>]+src=["'][^"']*forest-motion\.js/, filePath);
    const loaders = [...source.matchAll(
      new RegExp(`<script\\s+type=["']module["']\\s+data-forest-runtime=["'](three|motion)["']\\s+src=["']\\/web\\/shared\\/forest-runtime-boot\\.mjs\\?v=${CACHE_VERSION}["']><\\/script>`, 'g'),
    )].map((match) => match[1]);
    assert.ok(loaders.length <= 1, filePath);
    threeLoaders += loaders.filter((runtime) => runtime === 'three').length;
    motionLoaders += loaders.filter((runtime) => runtime === 'motion').length;
  }
  assert.equal(threeLoaders, 1);
  assert.equal(motionLoaders, 48);
});

test('view transitions name only persistent Forest chrome and become static under reduced motion', () => {
  const design = fs.readFileSync(path.join(ROOT, 'web/shared/forest-design.css'), 'utf8');
  const home = fs.readFileSync(path.join(ROOT, 'web/shared/forest-home.css'), 'utf8');
  const shell = fs.readFileSync(path.join(ROOT, 'web/shared/forest-shell.css'), 'utf8');
  assert.match(design, /@view-transition\s*\{\s*navigation:\s*auto;\s*\}/);
  assert.match(design, /::view-transition-old\(root\)/);
  assert.match(design, /::view-transition-new\(root\)/);
  assert.match(design, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*::view-transition-old\(root\)[\s\S]*animation:\s*none/);
  assert.match(
    design,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*::view-transition-group\(forest-chrome\)[\s\S]*animation:\s*none/,
  );
  assert.match(home, /\.home-brand\s*\{[^}]*view-transition-name:\s*forest-chrome/s);
  assert.match(shell, /\.forest-back\s*,?[\s\S]*?\{[^}]*view-transition-name:\s*forest-chrome/s);
  for (const [file, source] of [
    ['forest-design.css', design],
    ['forest-home.css', home],
    ['forest-shell.css', shell],
  ]) {
    assert.doesNotMatch(source, /\.(?:home-nav|forest-topbar|forest-trails)[^{]*\{[^}]*view-transition-name/s, file);
  }
});

test('Chloé remains the only scoped service worker and no root worker exists', () => {
  const sourceFiles = [
    ...htmlFiles(),
    ...fs.readdirSync(path.join(ROOT, 'web/shared'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(?:js|mjs)$/.test(entry.name))
      .map((entry) => path.join(ROOT, 'web/shared', entry.name)),
  ];
  const registrations = sourceFiles.flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return source.includes('serviceWorker.register') ? [relative(file)] : [];
  });
  assert.deepEqual(registrations, ['web/chloe-pwa/index.html']);
  const chloe = fs.readFileSync(path.join(ROOT, registrations[0]), 'utf8');
  assert.match(chloe, /serviceWorker\.register\('\.\/sw\.js',\s*\{\s*scope:\s*'\.\/'\s*\}\)/);
  assert.equal(fs.existsSync(path.join(ROOT, 'sw.js')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'web/chloe-pwa/sw.js')), true);
});
