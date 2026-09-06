const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const build = spawnSync(process.execPath, ['build-vercel-static.cjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});

assert.equal(build.status, 0, build.stderr || build.stdout);

const built = (relativePath) =>
  fs.readFileSync(path.join(ROOT, 'vercel-public', relativePath), 'utf8');

test('Forest HUB built artifact exposes the required foundation portals and title crown', () => {
  const home = built('index.html');

  assert.match(home, />Forest HUB</);
  assert.equal(
    (home.match(/<[^>]+data-title-crown\b/g) || []).length,
    1,
    'the built title must contain exactly one crown element',
  );
  assert.equal((home.match(/data-project="kids"/g) || []).length, 1);
  assert.equal((home.match(/data-project="library"/g) || []).length, 1);
  assert.equal((home.match(/data-project="morning-news"/g) || []).length, 1);
  assert.match(home, /data-project="kids"[^>]+data-href="\/web\/kids\/"/);
  assert.match(home, /data-project="library"[^>]+data-href="\/web\/library\/"/);
  assert.match(home, /data-project="morning-news"[^>]+data-href="\/web\/morning-news\/"/);
  assert.doesNotMatch(home, /Lovable experience/);
  assert.doesNotMatch(home, /voice[ -]?2[ -]?voice|voice[- ]to[- ]voice|\bv2v\b/i);
});

test('The Drop links the live publication and AI dependency map', () => {
  const morning = built('web/morning-news/index.html');

  assert.doesNotMatch(morning, /forest-voice-news\.lovable\.app/);
  assert.match(morning, /https:\/\/thismorningsdrop\.vercel\.app/);
  assert.doesNotMatch(morning, /Morning News|Morning News Anchor/);
  assert.match(morning, /href="\/series\/dependency-map"[^>]*>AI dependency map<\/a>/);
});

test('Forest HUB built styles publish the canonical design tokens', () => {
  const foundation = built('web/shared/forest-design.css');

  assert.match(foundation, /--theme-ui-bg:\s*#07070b\b/);
  assert.match(foundation, /--theme-ui-surface:\s*#0f0f15\b/);
  assert.match(foundation, /--theme-ui-accent:\s*#4f46e5\b/);
  assert.match(foundation, /--bg:\s*var\(--theme-ui-bg\)/);
  assert.match(foundation, /--surface:\s*var\(--theme-ui-surface\)/);
  assert.match(foundation, /--accent:\s*var\(--theme-ui-accent\)/);
});

test('Kids Corner links exactly the two approved existing sub-apps', () => {
  const kids = built('web/kids/index.html');
  const hrefs = [...kids.matchAll(/class="kid-card[^"]*" href="([^"]+)"/g)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(hrefs, ['/web/kids-movie-library/', '/web/math-mania/']);
  assert.match(kids, /Math Mania/);
  assert.match(kids, /Kids Movie Library/);
});

test('Library is canonical and llm-db has deployment and static redirect coverage', () => {
  const library = built('web/library/index.html');
  const moved = built('web/llm-db/index.html');
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

  assert.match(library, /--bg:\s*#07070b\b/);
  assert.match(library, /--surface:\s*#0f0f15\b/);
  assert.match(library, /--accent:\s*#4f46e5\b/);
  assert.match(moved, /url=\/web\/library\//);
  assert.match(moved, /location\.replace\(["']\/web\/library\/["']\)/);
  assert.deepEqual(vercel.redirects, [
    {
      source: '/web/ai-init',
      destination: '/web/library/glossary/',
      permanent: true,
    },
    {
      source: '/web/ai-init/',
      destination: '/web/library/glossary/',
      permanent: true,
    },
    {
      source: '/web/llm-db/',
      destination: '/web/library/',
      permanent: true,
    },
    {
      source: '/web/llm-db/:path*/',
      destination: '/web/library/',
      permanent: true,
    },
    {
      source: '/web/llm-db/:path*',
      destination: '/web/library/',
      permanent: true,
    },
    {
      source: '/web/tinylm',
      destination: '/web/council/index.html#tinylm',
      permanent: true,
    },
    {
      source: '/web/tinylm/',
      destination: '/web/council/index.html#tinylm',
      permanent: true,
    },
    {
      source: '/web/open-overview',
      destination: '/web/open-dashboard/',
      permanent: true,
    },
    {
      source: '/web/open-overview/',
      destination: '/web/open-dashboard/',
      permanent: true,
    },
    {
      source: '/web/open-overview/open-overview.js',
      destination: '/web/open-dashboard/open-dashboard.js',
      permanent: true,
    },
    {
      source: '/web/open-overview/open-overview.css',
      destination: '/web/open-dashboard/open-dashboard.css',
      permanent: true,
    },
    {
      source: '/web/open-overview/open-overview-api.js',
      destination: '/web/open-dashboard/open-dashboard-api.js',
      permanent: true,
    },
    {
      source: '/web/open-overview/open-overview-charts.js',
      destination: '/web/open-dashboard/open-dashboard-charts.js',
      permanent: true,
    },
    {
      source: '/web/open-overview/open-overview-schema.js',
      destination: '/web/open-dashboard/open-dashboard-schema.js',
      permanent: true,
    },
    {
      source: '/web/open-overview/open-overview-three.js',
      destination: '/web/open-dashboard/open-dashboard-three.js',
      permanent: true,
    },
    {
      source: '/web/open-overview/mcp/',
      destination: '/web/open-dashboard/mcp/',
      permanent: true,
    },
    {
      source: '/web/open-overview/openrouter/',
      destination: '/web/open-dashboard/openrouter/',
      permanent: true,
    },
    {
      source: '/web/open-overview/github/',
      destination: '/web/open-dashboard/github/',
      permanent: true,
    },
    {
      source: '/web/open-overview/catalogues/',
      destination: '/web/open-dashboard/catalogues/',
      permanent: true,
    },
    {
      source: '/web/open-overview/:path*/',
      destination: '/web/open-dashboard/:path*/',
      permanent: true,
    },
    {
      source: '/web/open-overview/:path*',
      destination: '/web/open-dashboard/:path*',
      permanent: true,
    },
    {
      source: '/series',
      destination: 'https://thismorningsdrop.vercel.app/series',
      permanent: false,
    },
    {
      source: '/series/',
      destination: 'https://thismorningsdrop.vercel.app/series',
      permanent: false,
    },
    {
      source: '/series/dependency-map/',
      destination: 'https://thismorningsdrop.vercel.app/series/dependency-map',
      permanent: false,
    },
    {
      source: '/series/dependency-map',
      destination: 'https://thismorningsdrop.vercel.app/series/dependency-map',
      permanent: false,
    },
  ]);
});

test('Vercel upload keeps the public Library Memory route', () => {
  const route = 'web/library/memory/index.html';
  const ignored = spawnSync('git', [
    'ls-files',
    '--cached',
    '--ignored',
    '--exclude-from=.vercelignore',
    '--',
    route,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  assert.equal(ignored.status, 0, ignored.stderr);
  assert.equal(
    ignored.stdout.trim(),
    '',
    `${route} is excluded from the Vercel source upload`,
  );
  assert.ok(
    fs.existsSync(path.join(ROOT, 'vercel-public', route)),
    `${route} is missing from the built artifact`,
  );
});
