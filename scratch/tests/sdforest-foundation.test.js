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
  assert.doesNotMatch(home, /voice[ -]?2[ -]?voice|voice[- ]to[- ]voice|\bv2v\b/i);
});

test('Forest HUB built styles publish the canonical design tokens', () => {
  const styles = built('web/shared/forest-home.css');

  assert.match(styles, /--bg:\s*#07070b\b/);
  assert.match(styles, /--surface:\s*#0f0f15\b/);
  assert.match(styles, /--accent:\s*#4f46e5\b/);
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
      source: '/web/llm-db/',
      destination: '/web/library/',
      permanent: true,
    },
    {
      source: '/web/llm-db/:path*',
      destination: '/web/library/',
      permanent: true,
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
