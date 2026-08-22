const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GENERATED_OUTPUTS = [
  path.join('web', 'library', 'glossary', 'glossary-bundle.json'),
  path.join('glossary', 'QUARANTINE.md'),
  path.join('glossary', 'MISUSE.md'),
];

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

function generatedDigests(root) {
  return GENERATED_OUTPUTS.map((relativePath) => crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest('hex'));
}

function spawnBuilder(root) {
  return spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'build-glossary-bundle.cjs')],
    { cwd: root, encoding: 'utf8' },
  );
}

function runBuilder(root, verifiedDocument) {
  fs.writeFileSync(
    path.join(root, 'glossary', 'verified-terms.json'),
    `${JSON.stringify(verifiedDocument, null, 2)}\n`,
    'utf8',
  );
  return spawnBuilder(root);
}

const VALID_ENTRY = {
  term: 'VerifiedPlaceholder',
  expansion: '',
  desc: 'Synthetic reviewed definition.',
  category: 'AI / Concepts',
  source: 'Synthetic primary reference',
  sourceUrl: 'https://example.com/reference',
  misread: '',
};

const INVALID_VERIFIED_ENTRIES = [
  ['empty term', { ...VALID_ENTRY, term: '' }],
  ['empty definition', { ...VALID_ENTRY, desc: '' }],
  ['empty source', { ...VALID_ENTRY, source: '' }],
  ['non-HTTP source URL', { ...VALID_ENTRY, sourceUrl: 'ftp://example.com/reference' }],
  ['source URL with an empty hostname label', { ...VALID_ENTRY, sourceUrl: 'https://example..com/reference' }],
  ['source URL credentials', { ...VALID_ENTRY, sourceUrl: 'https://REDACTED:REDACTED@example.com/reference' }],
  ['localhost source URL', { ...VALID_ENTRY, sourceUrl: 'http://localhost/reference' }],
  ['IPv4 loopback source URL', { ...VALID_ENTRY, sourceUrl: 'http://127.0.0.1/reference' }],
  ['IPv4 link-local source URL', { ...VALID_ENTRY, sourceUrl: 'http://169.254.10.20/reference' }],
  ['IPv4 private source URL', { ...VALID_ENTRY, sourceUrl: 'http://10.20.30.40/reference' }],
  ['IPv4 private 172-range source URL', { ...VALID_ENTRY, sourceUrl: 'http://172.20.30.40/reference' }],
  ['IPv4 private 192-range source URL', { ...VALID_ENTRY, sourceUrl: 'http://192.168.30.40/reference' }],
  ['IPv4 shared-address source URL', { ...VALID_ENTRY, sourceUrl: 'http://100.64.10.20/reference' }],
  ['IPv4 reserved source URL', { ...VALID_ENTRY, sourceUrl: 'http://192.0.2.10/reference' }],
  ['IPv4 benchmark source URL', { ...VALID_ENTRY, sourceUrl: 'http://198.18.10.20/reference' }],
  ['IPv4 documentation source URL', { ...VALID_ENTRY, sourceUrl: 'http://203.0.113.10/reference' }],
  ['IPv4 multicast source URL', { ...VALID_ENTRY, sourceUrl: 'http://224.0.0.10/reference' }],
  ['IPv4 future-use source URL', { ...VALID_ENTRY, sourceUrl: 'http://240.0.0.10/reference' }],
  ['IPv6 unspecified source URL', { ...VALID_ENTRY, sourceUrl: 'http://[::]/reference' }],
  ['IPv6 loopback source URL', { ...VALID_ENTRY, sourceUrl: 'http://[::1]/reference' }],
  ['IPv6 link-local source URL', { ...VALID_ENTRY, sourceUrl: 'http://[fe80::10]/reference' }],
  ['IPv6 site-local source URL', { ...VALID_ENTRY, sourceUrl: 'http://[fec0::10]/reference' }],
  ['IPv6 private source URL', { ...VALID_ENTRY, sourceUrl: 'http://[fd00::10]/reference' }],
  ['IPv6 reserved source URL', { ...VALID_ENTRY, sourceUrl: 'http://[2001:db8::10]/reference' }],
  ['IPv6 translation source URL', { ...VALID_ENTRY, sourceUrl: 'http://[64:ff9b::10]/reference' }],
  ['IPv6 unallocated source URL', { ...VALID_ENTRY, sourceUrl: 'http://[4000::10]/reference' }],
  ['IPv6 reserved-high source URL', { ...VALID_ENTRY, sourceUrl: 'http://[f000::10]/reference' }],
  ['IPv6 multicast source URL', { ...VALID_ENTRY, sourceUrl: 'http://[ff02::10]/reference' }],
  ['IPv4-mapped private source URL', { ...VALID_ENTRY, sourceUrl: 'http://[::ffff:192.168.10.20]/reference' }],
  ['single-label source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder/reference' }],
  ['local source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder.local/reference' }],
  ['private-use source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder.internal/reference' }],
  ['LAN source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder.lan/reference' }],
  ['home-network source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder.home.arpa/reference' }],
  ['reserved source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder.test/reference' }],
  ['invalid source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder.invalid/reference' }],
  ['special-use source domain', { ...VALID_ENTRY, sourceUrl: 'http://placeholder.onion/reference' }],
];

for (const [name, entry] of INVALID_VERIFIED_ENTRIES) {
  test(`builder rejects verified input with ${name}`, (t) => {
    const root = createGlossaryFixture(t);
    const before = generatedDigests(root);
    const result = runBuilder(root, { terms: [entry] });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /verified-terms\.json entry 1 is invalid/);
    assert.doesNotMatch(result.stderr, /VerifiedPlaceholder/);
    assert.doesNotMatch(result.stderr, /REDACTED/);
    assert.deepEqual(generatedDigests(root), before);
  });
}

const INVALID_VERIFIED_ROOTS = [
  ['null root', null],
  ['array root', []],
  ['missing terms array', {}],
  ['non-array terms field', { terms: { redacted: true } }],
];

for (const [name, document] of INVALID_VERIFIED_ROOTS) {
  test(`builder rejects verified input with ${name} without mutating outputs`, (t) => {
    const root = createGlossaryFixture(t);
    const before = generatedDigests(root);
    const result = runBuilder(root, document);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /verified-terms\.json root is invalid/);
    assert.doesNotMatch(result.stderr, /redacted/i);
    assert.deepEqual(generatedDigests(root), before);
  });
}

const ABSENT_VERIFIED_SOURCES = [
  ['missing verified source', (verifiedPath) => fs.rmSync(verifiedPath)],
  ['empty verified source', (verifiedPath) => fs.writeFileSync(verifiedPath, '', 'utf8')],
];

for (const [name, makeAbsent] of ABSENT_VERIFIED_SOURCES) {
  test(`builder rejects ${name} without mutating outputs`, (t) => {
    const root = createGlossaryFixture(t);
    const before = generatedDigests(root);
    makeAbsent(path.join(root, 'glossary', 'verified-terms.json'));
    const result = spawnBuilder(root);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /verified-terms\.json root is invalid/);
    assert.deepEqual(generatedDigests(root), before);
  });
}
