const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function copyPath(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function createGlossaryFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-verified-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  copyPath(path.join(REPO_ROOT, 'glossary'), path.join(root, 'glossary'));
  copyPath(path.join(REPO_ROOT, 'web', 'ai-init'), path.join(root, 'web', 'ai-init'));
  copyPath(
    path.join(REPO_ROOT, 'web', 'library', 'glossary'),
    path.join(root, 'web', 'library', 'glossary'),
  );
  copyPath(
    path.join(REPO_ROOT, 'scripts', 'build-glossary-bundle.cjs'),
    path.join(root, 'scripts', 'build-glossary-bundle.cjs'),
  );
  return root;
}

const VALID_ENTRY = {
  term: 'VerifiedPlaceholder',
  expansion: '',
  desc: 'Synthetic reviewed definition.',
  category: 'AI / Concepts',
  source: 'Synthetic primary reference',
  sourceUrl: 'https://example.test/reference',
  misread: '',
};

const INVALID_VERIFIED_ENTRIES = [
  ['empty term', { ...VALID_ENTRY, term: '' }],
  ['empty definition', { ...VALID_ENTRY, desc: '' }],
  ['empty source', { ...VALID_ENTRY, source: '' }],
  ['non-HTTP source URL', { ...VALID_ENTRY, sourceUrl: 'ftp://example.test/reference' }],
  ['source URL with an empty hostname label', { ...VALID_ENTRY, sourceUrl: 'https://example..test/reference' }],
];

for (const [name, entry] of INVALID_VERIFIED_ENTRIES) {
  test(`builder rejects verified input with ${name}`, (t) => {
    const root = createGlossaryFixture(t);
    fs.writeFileSync(
      path.join(root, 'glossary', 'verified-terms.json'),
      `${JSON.stringify({ terms: [entry] }, null, 2)}\n`,
      'utf8',
    );

    const result = spawnSync(
      process.execPath,
      [path.join(root, 'scripts', 'build-glossary-bundle.cjs')],
      { cwd: root, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /verified-terms\.json entry 1 is invalid/);
    assert.doesNotMatch(result.stderr, /VerifiedPlaceholder/);
  });
}
