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

test('date-only expiry values remain active through their expiry date', async () => {
  const { entryState } = await import(builder);
  const today = '2026-10-24';
  const midnight = Date.parse('2026-10-24T00:00:01Z');
  const noon = Date.parse('2026-10-24T12:00:00Z');
  const nextDay = Date.parse('2026-10-25T00:00:01Z');

  assert.equal(entryState({ last_verified: '2026-10-01', expiry: today }, midnight), 'active');
  assert.equal(entryState({ last_verified: '2026-10-01', expiry: today }, noon), 'active');
  assert.equal(entryState({ last_verified: '2026-10-01', expiry: today }, nextDay), 'is-expired');
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

test('inline browser script has valid syntax and parses without error', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'index.html contains an inline script tag');
  assert.doesNotThrow(() => {
    new Function(match[1]);
  });
});

test('the suggestion form does not claim a submission was queued', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.doesNotMatch(html, /Submission queued for review/);
  assert.match(html, /nothing was sent or saved/);
});

test('cards and comparison rows preserve initial order via data-order', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.match(html, /class="card entry-card[^"]*"[^>]*data-order="0"/);
  assert.match(html, /class="entry-row[^"]*"[^>]*data-order="0"/);
  assert.match(html, /cards\.sort\(\(a, b\) => Number\(a\.dataset\.order\) - Number\(b\.dataset\.order\)\)/);
  assert.match(html, /rows\.sort\(\(a, b\) => Number\(a\.dataset\.order\) - Number\(b\.dataset\.order\)\)/);
});

test('sorting by recent and then default restores initial order', () => {
  const el = (name, date, order) => ({
    dataset: { name, date, order: String(order) }
  });
  const initial = [
    el('Old Verified', '2023-01-01', 0),
    el('New Verified', '2024-05-01', 1)
  ];
  const sortedRecent = [...initial].sort((a, b) => new Date(b.dataset.date) - new Date(a.dataset.date));
  assert.equal(sortedRecent[0].dataset.name, 'New Verified');
  assert.equal(sortedRecent[1].dataset.name, 'Old Verified');

  const restored = [...sortedRecent].sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
  assert.equal(restored[0].dataset.name, 'Old Verified');
  assert.equal(restored[1].dataset.name, 'New Verified');
  assert.deepEqual(restored, initial);
});

test('comparison toggle checkbox remains keyboard-focusable and accessible', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.doesNotMatch(html, /\.compare-toggle\s*\{\s*display:\s*none;?\s*\}/, 'toggle is not removed via display:none');
  assert.match(html, /\.compare-toggle\s*\{[^}]*clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
  assert.match(html, /\.compare-toggle:focus-visible/);
  assert.match(html, /<input type="checkbox" id="compare-[^"]*" class="compare-toggle" aria-label="Toggle comparison view/);
});

test('grid tracks can shrink on narrow phone viewports', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  assert.match(html, /minmax\(min\(100%,\s*320px\),\s*1fr\)/);
});

test('harnesses data has no past fixture expiry dates', () => {
  const harnesses = JSON.parse(fs.readFileSync(path.join(__dirname, '../../web/platform-guide/data/harnesses.json'), 'utf8'));
  for (const entry of harnesses) {
    assert.equal(entry.expiry, null, `${entry.name} should not have fixture expiry date`);
  }
});

test('all entries in data files are rendered in the generated index.html', async () => {
  const { readSectionEntries } = await import(builder);
  const sections = ['harnesses', 'memory', 'skills', 'design', 'animation', 'orchestration', 'autonomy', 'speech'];
  const html = fs.readFileSync(path.join(__dirname, '../../web/platform-guide/index.html'), 'utf8');
  for (const s of sections) {
    const entries = await readSectionEntries(path.join(__dirname, '../../web/platform-guide/data'), s);
    for (const entry of entries) {
      assert.ok(html.includes(entry.name), `index.html contains ${entry.name}`);
    }
  }
});
