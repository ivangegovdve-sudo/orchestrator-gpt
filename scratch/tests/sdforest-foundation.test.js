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
  assert.equal((home.match(/data-title-crown/g) || []).length, 1);
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
