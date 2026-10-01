const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const builder = pathToFileURL(path.join(__dirname, '../../web/platform-guide/build.mjs')).href;

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'platform-guide-'));
}

test('a missing section file is created empty', async () => {
  const { readSectionEntries } = await import(builder);
  const dir = tempDir();
  assert.deepEqual(await readSectionEntries(dir, 'memory'), []);
  assert.equal(fs.readFileSync(path.join(dir, 'memory.json'), 'utf8'), '[]');
});

test('malformed JSON fails the build and leaves the data file untouched', async () => {
  const { readSectionEntries } = await import(builder);
  const dir = tempDir();
  const file = path.join(dir, 'memory.json');
  const original = '[{"name": "Tool", "bad": "truncated...';
  fs.writeFileSync(file, original);
  await assert.rejects(readSectionEntries(dir, 'memory'), /invalid JSON/);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
});

test('an unreadable section file fails the build instead of being replaced', async () => {
  const { readSectionEntries } = await import(builder);
  const dir = tempDir();
  // A directory where the file should be: readFile fails with EISDIR, not ENOENT.
  fs.mkdirSync(path.join(dir, 'memory.json'));
  await assert.rejects(readSectionEntries(dir, 'memory'), (e) => e.code === 'EISDIR' || e.code === 'EPERM');
  assert.ok(fs.statSync(path.join(dir, 'memory.json')).isDirectory());
});

test('the suggestion form does not claim a submission was queued', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.doesNotMatch(html, /Submission queued for review/);
  assert.match(html, /nothing was sent or saved/);
});
