const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { enqueueCandidates } = require('../../scripts/glossary-candidate-queue.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function copyPath(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function digest(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function temporaryQueue(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-queue-validation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return {
    root,
    queuePath: path.join(root, 'glossary', 'candidates', 'pending.json'),
  };
}

function writeStoredQueue(queuePath, candidates, extra = {}) {
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(
    queuePath,
    `${JSON.stringify({
      schemaVersion: 1,
      _readme: ['Synthetic queue fixture.'],
      candidates,
      ...extra,
    }, null, 2)}\n`,
    'utf8',
  );
}

test('persists a pending candidate without adding it to the generated glossary', (t) => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-candidate-'));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  copyPath(path.join(REPO_ROOT, 'glossary'), path.join(fixtureRoot, 'glossary'));
  copyPath(path.join(REPO_ROOT, 'web', 'ai-init'), path.join(fixtureRoot, 'web', 'ai-init'));
  copyPath(
    path.join(REPO_ROOT, 'web', 'library', 'glossary'),
    path.join(fixtureRoot, 'web', 'library', 'glossary'),
  );
  copyPath(
    path.join(REPO_ROOT, 'scripts', 'build-glossary-bundle.cjs'),
    path.join(fixtureRoot, 'scripts', 'build-glossary-bundle.cjs'),
  );

  const queuePath = path.join(fixtureRoot, 'glossary', 'candidates', 'pending.json');
  const verifiedPath = path.join(fixtureRoot, 'glossary', 'verified-terms.json');
  const bundlePath = path.join(fixtureRoot, 'web', 'library', 'glossary', 'glossary-bundle.json');
  const verifiedBefore = digest(verifiedPath);
  const bundleBefore = digest(bundlePath);

  const result = enqueueCandidates(
    {
      candidates: [
        { term: 'QueueOnlyTerm', evidenceCount: 3, sourceKinds: ['repository'] },
      ],
    },
    { root: fixtureRoot },
  );

  assert.deepEqual(result, { added: 1, total: 1 });
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  assert.deepEqual(queue.candidates, [
    {
      term: 'QueueOnlyTerm',
      evidenceCount: 3,
      sourceKinds: ['repository'],
      status: 'pending-human-review',
    },
  ]);
  assert.equal(digest(verifiedPath), verifiedBefore);

  const build = spawnSync(process.execPath, [path.join(fixtureRoot, 'scripts', 'build-glossary-bundle.cjs')], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  assert.equal(build.status, 0, 'isolated glossary build failed');
  assert.equal(digest(bundlePath), bundleBefore);

  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  assert.equal(bundle.terms.some((entry) => entry.term === 'QueueOnlyTerm'), false);
});

test('rejects private-shaped candidate material before changing the queue', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  enqueueCandidates(
    { candidates: [{ term: 'RAG', evidenceCount: 2, sourceKinds: ['manual'] }] },
    { root },
  );
  const before = digest(queuePath);
  const privateShapedTerm = ['service', 'internal'].join('.');

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: 'SafeCandidate', evidenceCount: 2, sourceKinds: ['manual'] },
          { term: privateShapedTerm, evidenceCount: 2, sourceKinds: ['repository'] },
        ],
      },
      { root },
    ),
    /private-shaped candidate material/,
  );
  assert.equal(digest(queuePath), before);
});

test('rejects alternate hostname-shaped candidate representations', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const hostnameShapes = [
    ['service', 'internal', ''].join('.'),
    ['service', 'team', 'example'].join('.'),
    ['service', 'prod'].join('.'),
  ];

  for (const term of hostnameShapes) {
    assert.throws(
      () => enqueueCandidates(
        { candidates: [{ term, evidenceCount: 2, sourceKinds: ['manual'] }] },
        { root },
      ),
      /private-shaped candidate material/,
    );
  }
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects every dotted candidate term as private-shaped', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const dottedPlaceholder = ['Public', 'Placeholder'].join('.');

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: dottedPlaceholder, evidenceCount: 2, sourceKinds: ['manual'] },
        ],
      },
      { root },
    ),
    /private-shaped candidate material/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects opaque credential-shaped candidate material before changing the queue', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  enqueueCandidates(
    { candidates: [{ term: 'RAG', evidenceCount: 2, sourceKinds: ['manual'] }] },
    { root },
  );
  const before = digest(queuePath);
  const opaqueCandidate = ['Synthetic', '9', 'Placeholder', '7'].join('');

  assert.throws(
    () => enqueueCandidates(
      { candidates: [{ term: opaqueCandidate, evidenceCount: 2, sourceKinds: ['manual'] }] },
      { root },
    ),
    /credential-shaped candidate material/,
  );
  assert.equal(digest(queuePath), before);
});

test('rejects long opaque candidate shapes even when they use only two character classes', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const opaqueCandidates = [
    ['SYNTHETIC', '42', 'PLACEHOLDER', '7'].join(''),
    ['synthetic', '42', 'placeholder', '7'].join(''),
  ];

  for (const term of opaqueCandidates) {
    assert.throws(
      () => enqueueCandidates(
        { candidates: [{ term, evidenceCount: 2, sourceKinds: ['manual'] }] },
        { root },
      ),
      /credential-shaped candidate material/,
    );
  }
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects high-entropy single-case opaque candidate material', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const opaqueCandidate = ['placeholder', 'quick', 'brown', 'z', 'fox'].join('');

  assert.throws(
    () => enqueueCandidates(
      { candidates: [{ term: opaqueCandidate, evidenceCount: 2, sourceKinds: ['manual'] }] },
      { root },
    ),
    /credential-shaped candidate material/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects short mixed-class opaque candidate material', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const opaquePlaceholder = ['Sample', '9', 'Mark', '7'].join('');

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: opaquePlaceholder, evidenceCount: 2, sourceKinds: ['manual'] },
        ],
      },
      { root },
    ),
    /credential-shaped candidate material/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects short two-class opaque candidate material', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const opaquePlaceholder = ['SAMPLE', '42', 'MARK'].join('');

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: opaquePlaceholder, evidenceCount: 2, sourceKinds: ['manual'] },
        ],
      },
      { root },
    ),
    /credential-shaped candidate material/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects unstructured evidence fields instead of silently accepting them', (t) => {
  const { root, queuePath } = temporaryQueue(t);

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          {
            term: 'RAG',
            evidenceCount: 2,
            sourceKinds: ['manual'],
            rawEvidence: 'free-form evidence is not queue data',
          },
        ],
      },
      { root },
    ),
    /unsupported candidate fields/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects source labels that could disclose private corpus names', (t) => {
  const { root, queuePath } = temporaryQueue(t);

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: 'RAG', evidenceCount: 2, sourceKinds: ['workspace-name'] },
        ],
      },
      { root },
    ),
    /unsupported source kind/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects private-source candidates without explicit human publicness attestation', (t) => {
  for (const sourceKind of ['sessions', 'email']) {
    const { root, queuePath } = temporaryQueue(t);
    assert.throws(
      () => enqueueCandidates(
        {
          candidates: [
            { term: 'PublicPlaceholder', evidenceCount: 2, sourceKinds: [sourceKind] },
          ],
        },
        { root },
      ),
      /human publicness attestation/,
    );
    assert.equal(fs.existsSync(queuePath), false);
  }
});

test('persists the explicit human publicness attestation for a private-source candidate', (t) => {
  const { root, queuePath } = temporaryQueue(t);

  assert.deepEqual(
    enqueueCandidates(
      {
        candidates: [
          {
            term: 'PublicPlaceholder',
            evidenceCount: 2,
            sourceKinds: ['sessions'],
            humanPublicnessAttested: true,
          },
        ],
      },
      { root },
    ),
    { added: 1, total: 1 },
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(queuePath, 'utf8')).candidates, [
    {
      term: 'PublicPlaceholder',
      evidenceCount: 2,
      sourceKinds: ['sessions'],
      humanPublicnessAttested: true,
      status: 'pending-human-review',
    },
  ]);
});

test('retains publicness attestation when a public candidate gains private-source evidence', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  enqueueCandidates(
    {
      candidates: [
        { term: 'PublicPlaceholder', evidenceCount: 1, sourceKinds: ['manual'] },
      ],
    },
    { root },
  );

  enqueueCandidates(
    {
      candidates: [
        {
          term: 'PublicPlaceholder',
          evidenceCount: 2,
          sourceKinds: ['sessions'],
          humanPublicnessAttested: true,
        },
      ],
    },
    { root },
  );

  assert.equal(
    JSON.parse(fs.readFileSync(queuePath, 'utf8')).candidates[0].humanPublicnessAttested,
    true,
  );
});

test('rejects malformed publicness attestations instead of silently dropping them', (t) => {
  const { root, queuePath } = temporaryQueue(t);

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          {
            term: 'PublicPlaceholder',
            evidenceCount: 2,
            sourceKinds: ['manual'],
            humanPublicnessAttested: 'placeholder',
          },
        ],
      },
      { root },
    ),
    /publicness attestation must be true/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects candidate terms outside the bounded public-term format', (t) => {
  const { root, queuePath } = temporaryQueue(t);

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: 'two words', evidenceCount: 2, sourceKinds: ['manual'] },
        ],
      },
      { root },
    ),
    /candidate term format/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects invalid evidence counts before persistence', (t) => {
  const { root, queuePath } = temporaryQueue(t);

  for (const evidenceCount of [0, 2.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(
      () => enqueueCandidates(
        {
          candidates: [
            { term: 'RAG', evidenceCount, sourceKinds: ['manual'] },
          ],
        },
        { root },
      ),
      /evidence count/,
    );
  }
  assert.equal(fs.existsSync(queuePath), false);
});

test('merges candidates case-insensitively and remains idempotent on rerun', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  enqueueCandidates(
    { candidates: [{ term: 'RAG', evidenceCount: 2, sourceKinds: ['manual'] }] },
    { root },
  );
  const input = {
    candidates: [
      { term: 'rag', evidenceCount: 5, sourceKinds: ['repository'] },
      {
        term: 'RLHF',
        evidenceCount: 3,
        sourceKinds: ['sessions'],
        humanPublicnessAttested: true,
      },
    ],
  };

  assert.deepEqual(enqueueCandidates(input, { root }), { added: 1, total: 2 });
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  assert.deepEqual(queue.candidates, [
    {
      term: 'RAG',
      evidenceCount: 5,
      sourceKinds: ['manual', 'repository'],
      status: 'pending-human-review',
    },
    {
      term: 'RLHF',
      evidenceCount: 3,
      sourceKinds: ['sessions'],
      humanPublicnessAttested: true,
      status: 'pending-human-review',
    },
  ]);

  const beforeRerun = digest(queuePath);
  assert.deepEqual(enqueueCandidates(input, { root }), { added: 0, total: 2 });
  assert.equal(digest(queuePath), beforeRerun);
});

test('CLI writes the review queue without printing candidate material', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-queue-cli-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const inputPath = path.join(root, 'input.json');
  const queuePath = path.join(root, 'glossary', 'candidates', 'pending.json');
  const scriptPath = path.join(root, 'scripts', 'glossary-candidate-queue.cjs');
  copyPath(path.join(REPO_ROOT, 'scripts', 'glossary-candidate-queue.cjs'), scriptPath);
  fs.writeFileSync(
    inputPath,
    JSON.stringify({
      candidates: [{ term: 'RAG', evidenceCount: 2, sourceKinds: ['manual'] }],
    }),
    'utf8',
  );

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      '--input',
      inputPath,
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'Queued 1 candidate for human review.\n');
  assert.equal(JSON.parse(fs.readFileSync(queuePath, 'utf8')).candidates.length, 1);
});

test('CLI cannot redirect candidate persistence into a glossary source path', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-queue-path-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const inputPath = path.join(root, 'input.json');
  const protectedPath = path.join(root, 'verified-terms.json');
  fs.writeFileSync(
    inputPath,
    JSON.stringify({
      candidates: [{ term: 'RAG', evidenceCount: 2, sourceKinds: ['manual'] }],
    }),
    'utf8',
  );

  const result = spawnSync(
    process.execPath,
    [
      path.join(REPO_ROOT, 'scripts', 'glossary-candidate-queue.cjs'),
      '--input',
      inputPath,
      '--queue',
      protectedPath,
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'Candidate queue rejected.\n');
  assert.equal(fs.existsSync(protectedPath), false);
});

test('module API cannot redirect candidate persistence into a glossary source path', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-queue-api-path-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const protectedPath = path.join(root, 'verified-terms.json');

  assert.throws(
    () => enqueueCandidates(
      { candidates: [{ term: 'RAG', evidenceCount: 2, sourceKinds: ['manual'] }] },
      { queuePath: protectedPath },
    ),
    /unsupported queue destination/,
  );
  assert.equal(fs.existsSync(protectedPath), false);
});

test('rejects input-level metadata that could carry private material', (t) => {
  const { root, queuePath } = temporaryQueue(t);

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [{ term: 'RAG', evidenceCount: 2, sourceKinds: ['manual'] }],
        rawCorpus: 'free-form corpus metadata is not queue data',
      },
      { root },
    ),
    /unsupported input fields/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('rejects oversized candidate batches before persistence', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const candidates = Array.from({ length: 501 }, (_, index) => ({
    term: `Term${index}`,
    evidenceCount: 1,
    sourceKinds: ['manual'],
  }));

  assert.throws(
    () => enqueueCandidates({ candidates }, { root }),
    /candidate batch is too large/,
  );
  assert.equal(fs.existsSync(queuePath), false);
});

test('refuses to grow the pending review queue beyond its bounded capacity', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const candidates = Array.from({ length: 500 }, (_, index) => ({
    term: `Term${index}`,
    evidenceCount: 1,
    sourceKinds: ['manual'],
  }));
  enqueueCandidates({ candidates }, { root });
  const before = digest(queuePath);

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: 'OverflowTerm', evidenceCount: 1, sourceKinds: ['manual'] },
        ],
      },
      { root },
    ),
    /candidate queue is full/,
  );
  assert.equal(digest(queuePath), before);
});

test('rejects unknown stored queue envelope keys without rewriting the file', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  writeStoredQueue(
    queuePath,
    [
      {
        term: 'RAG',
        evidenceCount: 2,
        sourceKinds: ['manual'],
        status: 'pending-human-review',
      },
    ],
    { unexpected: 'synthetic-placeholder' },
  );
  const before = digest(queuePath);

  assert.throws(
    () => enqueueCandidates(
      {
        candidates: [
          { term: 'RLHF', evidenceCount: 1, sourceKinds: ['manual'] },
        ],
      },
      { root },
    ),
    /unsupported stored queue envelope/,
  );
  assert.equal(digest(queuePath), before);
});

test('rejects more than 500 stored rows before duplicate collapse or rewrite', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  const storedRows = Array.from({ length: 501 }, () => ({
    term: 'RAG',
    evidenceCount: 2,
    sourceKinds: ['manual'],
    status: 'pending-human-review',
  }));
  writeStoredQueue(queuePath, storedRows);
  const before = digest(queuePath);

  assert.throws(
    () => enqueueCandidates({ candidates: [] }, { root }),
    /stored queue exceeds capacity/,
  );
  assert.equal(digest(queuePath), before);
});

test('rejects case-insensitive stored duplicates without losing evidence counts', (t) => {
  const { root, queuePath } = temporaryQueue(t);
  writeStoredQueue(queuePath, [
    {
      term: 'RAG',
      evidenceCount: 9,
      sourceKinds: ['manual'],
      status: 'pending-human-review',
    },
    {
      term: 'rag',
      evidenceCount: 1,
      sourceKinds: ['repository'],
      status: 'pending-human-review',
    },
  ]);
  const before = digest(queuePath);

  assert.throws(
    () => enqueueCandidates({ candidates: [] }, { root }),
    /duplicate stored candidate term/,
  );
  assert.equal(digest(queuePath), before);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(queuePath, 'utf8')).candidates.map((candidate) => candidate.evidenceCount),
    [9, 1],
  );
});
