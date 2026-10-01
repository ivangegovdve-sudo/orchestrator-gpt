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

test('a pending or undated entry is never rendered as current', async () => {
  const { entryState } = await import(builder);
  const now = Date.parse('2026-10-01T00:00:00Z');
  // The exact object the suggestion form tells readers to paste into a data file.
  assert.equal(entryState({ name: 'X', status: 'pending' }, now), 'is-pending');
  assert.equal(entryState({ name: 'X', last_verified: '2026-09-30', status: 'pending' }, now), 'is-pending');
  assert.equal(entryState({ name: 'X' }, now), 'is-pending');
  assert.equal(entryState({ name: 'X', last_verified: 'not a date' }, now), 'is-pending');
  assert.equal(entryState({ last_verified: '2026-09-01' }, now), 'active');
  assert.equal(entryState({ last_verified: '2026-06-01' }, now), 'is-stale');
  assert.equal(entryState({ last_verified: '2026-09-01', expiry: '2026-09-15' }, now), 'is-expired');
});

test('contributor fields cannot inject markup or unsafe links', async () => {
  const { escapeHtml, safeUrl } = await import(builder);
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escapeHtml('a" onmouseover="x'), 'a&quot; onmouseover=&quot;x');
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl('data:text/html,<b>x</b>'), '#');
  assert.equal(safeUrl('/relative'), '#');
  assert.equal(safeUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.doesNotMatch(html, /href="(?!https?:\/\/|#)/, 'every rendered link is http(s) or inert');
});

test('freshness badges are recomputed in the browser, not frozen at build time', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.match(html, /const entryState = function entryState\(entry, now\)/);
  assert.match(html, /refreshStatuses\(\);/);
  const cards = html.match(/class="card entry-card[^"]*"[^>]*>/g) || [];
  assert.ok(cards.length > 0);
  for (const card of cards) assert.match(card, /data-verified="[^"]*" data-expiry="[^"]*" data-pending="[^"]*"/);
});

test('the suggestion form does not claim a submission was queued', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.doesNotMatch(html, /Submission queued for review/);
  assert.match(html, /nothing was sent or saved/);
});
