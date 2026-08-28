// Contract tests for the self-refreshing free-model roster.
//
// The property under test throughout is that the public council can only ever run free
// models, and can only ever advertise models it has actually called. Both halves have
// failed in production before: the roster went stale and served two withdrawn slugs,
// and a listing-based check would have kept `google/gemma-4-26b-a4b-it:free`, which is
// listed and answers nothing.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const ROSTER_PATH = path.join(ROOT, 'web/council/free-roster.json');
const COUNCIL_JS = path.join(ROOT, 'web/council/council.js');

const importGenerator = () => import(
  require('node:url').pathToFileURL(path.join(ROOT, 'scripts/refresh-free-roster.mjs')).href
);

// A minimal stand-in for OpenRouter's catalogue map: id -> listing.
const catalogueOf = (entries) => new Map(entries.map((entry) => [
  entry.id,
  { pricing: { prompt: entry.prompt ?? '0', completion: entry.completion ?? '0' } },
]));

// ── The free-only invariant ──────────────────────────────────────────────────

test('assertFreeOnly accepts a roster of listed zero-priced :free slugs', async () => {
  const { assertFreeOnly } = await importGenerator();
  const catalogue = catalogueOf([{ id: 'a/one:free' }, { id: 'b/two:free' }]);
  assert.equal(assertFreeOnly({ proposer: ['a/one:free'], critic: ['b/two:free'] }, catalogue), true);
});

test('assertFreeOnly refuses a slug without the :free suffix', async () => {
  const { assertFreeOnly } = await importGenerator();
  const catalogue = catalogueOf([{ id: 'a/paid' }]);
  assert.throws(
    () => assertFreeOnly({ proposer: ['a/paid'] }, catalogue),
    /non-free slug in proposer/,
  );
});

test('assertFreeOnly refuses a :free slug that OpenRouter prices above zero', async () => {
  // The suffix is a convention, not a guarantee. If a `:free` slug ever starts billing,
  // the price check is what stops it reaching a visitor.
  const { assertFreeOnly } = await importGenerator();
  const catalogue = catalogueOf([{ id: 'a/one:free', prompt: '0.0000004' }]);
  assert.throws(
    () => assertFreeOnly({ synthesis: ['a/one:free'] }, catalogue),
    /priced slug in synthesis/,
  );
});

test('assertFreeOnly refuses a slug missing from the live catalogue', async () => {
  const { assertFreeOnly } = await importGenerator();
  assert.throws(
    () => assertFreeOnly({ critic: ['ghost/gone:free'] }, catalogueOf([])),
    /unlisted slug in critic/,
  );
});

// ── Gate 3 classification ────────────────────────────────────────────────────
// Each case below is a real response shape observed through the relay on 2026-08-28.

const streamResponse = (frames) => ({
  ok: true,
  headers: { get: () => 'text/event-stream' },
  body: {
    getReader() {
      let sent = false;
      return {
        read: async () => {
          if (sent) return { done: true };
          sent = true;
          return { done: false, value: new TextEncoder().encode(frames) };
        },
      };
    },
  },
});

test('probeModel accepts a stream that carries actual content', async () => {
  const { probeModel } = await importGenerator();
  const frames = 'data: {"choices":[{"delta":{"content":"COUNCIL OK"}}]}\n\ndata: [DONE]\n\n';
  const result = await probeModel('a/one:free', { fetchImpl: async () => streamResponse(frames) });
  assert.equal(result.ok, true);
  assert.equal(result.chars, 10);
});

test('probeModel rejects a cleanly terminated stream that carries no content', async () => {
  // `poolside/laguna-s-2.1:free` does exactly this when it spends its budget reasoning.
  // A well-formed empty stream is the failure a listing check cannot see.
  const { probeModel } = await importGenerator();
  const result = await probeModel('a/one:free', {
    fetchImpl: async () => streamResponse('data: [DONE]\n\n'),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'empty-200');
});

test('probeModel rejects a stream that ends without content or a completion marker', async () => {
  const { probeModel } = await importGenerator();
  const result = await probeModel('a/one:free', { fetchImpl: async () => streamResponse('') });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'empty-stream');
});

test('probeModel rejects a JSON error body served under HTTP 200', async () => {
  const { probeModel } = await importGenerator();
  const result = await probeModel('a/one:free', {
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'relay-refused');
  assert.match(result.detail, /Rate limit/);
});

test('probeModel reports a non-OK status rather than treating it as a pass', async () => {
  const { probeModel } = await importGenerator();
  const result = await probeModel('a/one:free', {
    fetchImpl: async () => ({ ok: false, status: 502, headers: { get: () => '' } }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'http-502');
});

test('probeWithRetries keeps trying and passes once a later attempt answers', async () => {
  // The whole reason retries exist: free slugs return a transient empty stream under
  // load, and one bad attempt is not evidence a model is dead.
  const { probeWithRetries } = await importGenerator();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls < 3
      ? streamResponse('')
      : streamResponse('data: {"choices":[{"delta":{"content":"COUNCIL OK"}}]}\n\ndata: [DONE]\n\n');
  };
  const result = await probeWithRetries('a/one:free', { fetchImpl, sleepImpl: async () => {} });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 3);
});

// ── The rolling health window ────────────────────────────────────────────────

test('mergeHealth remembers the last success when the current attempt fails', async () => {
  const { mergeHealth } = await importGenerator();
  const previous = { 'a/one:free': { lastOkAt: '2026-08-27T00:00:00.000Z', consecutiveFailures: 1 } };
  const merged = mergeHealth(previous, 'a/one:free', { ok: false, reason: 'empty-200' }, '2026-08-28T00:00:00.000Z');
  assert.equal(merged.lastOkAt, '2026-08-27T00:00:00.000Z');
  assert.equal(merged.consecutiveFailures, 2);
  assert.equal(merged.lastReason, 'empty-200');
});

test('mergeHealth clears the failure streak on a success', async () => {
  const { mergeHealth } = await importGenerator();
  const previous = { 'a/one:free': { lastOkAt: '2026-08-20T00:00:00.000Z', consecutiveFailures: 4 } };
  const merged = mergeHealth(previous, 'a/one:free', { ok: true, ms: 900 }, '2026-08-28T00:00:00.000Z');
  assert.equal(merged.lastOkAt, '2026-08-28T00:00:00.000Z');
  assert.equal(merged.consecutiveFailures, 0);
});

test('a model throttled today but healthy yesterday keeps its seat', async () => {
  const { isWithinWindow } = await importGenerator();
  assert.equal(isWithinWindow('2026-08-27T00:00:00.000Z', '2026-08-28T00:00:00.000Z'), true);
});

test('a model that has not answered for longer than the window loses its seat', async () => {
  const { isWithinWindow } = await importGenerator();
  assert.equal(isWithinWindow('2026-08-01T00:00:00.000Z', '2026-08-28T00:00:00.000Z'), false);
});

test('a model that has never answered is never within the window', async () => {
  const { isWithinWindow } = await importGenerator();
  assert.equal(isWithinWindow(null, '2026-08-28T00:00:00.000Z'), false);
});

// ── Lifecycle ───────────────────────────────────────────────────────────────

test('daysUntil measures a real announced retirement', async () => {
  // Guards against the gate becoming decorative. OpenRouter really does publish
  // expiration_date — dots-studio/dots-3-note-preview:free carried 2026-09-30 — so a
  // change that stopped reading it would make this check silently never fire.
  const { daysUntil } = await importGenerator();
  assert.equal(daysUntil('2026-09-30', '2026-08-28T00:00:00.000Z'), 33);
  assert.equal(daysUntil(null, '2026-08-28T00:00:00.000Z'), Infinity);
});

// ── Tier assignment ─────────────────────────────────────────────────────────

test('assignTiers spreads providers so one outage cannot empty a tier', async () => {
  // The critic tier died because both its seats were withdrawn at once. Interleaving by
  // provider is what stops a single vendor owning a whole tier.
  const { assignTiers } = await importGenerator();
  const rosters = assignTiers([
    { id: 'nvidia/a:free', contextLength: 900 },
    { id: 'nvidia/b:free', contextLength: 800 },
    { id: 'nvidia/c:free', contextLength: 700 },
    { id: 'cohere/d:free', contextLength: 600 },
    { id: 'minimax/e:free', contextLength: 500 },
    { id: 'liquid/f:free', contextLength: 400 },
  ]);
  for (const tier of ['proposer', 'critic', 'synthesis']) {
    const providers = new Set(rosters[tier].map((id) => id.split('/')[0]));
    assert.ok(providers.size > 1, `${tier} drew every seat from one provider: ${rosters[tier].join(', ')}`);
  }
});

test('assignTiers keeps a tier diverse when one provider dominates the pool', async () => {
  // The case the six-model fixture above misses, and the one that was actually broken:
  // three models from one provider and a single alternative. The previous interleave
  // gave the proposer tier all three NVIDIA seats, so a single provider outage emptied
  // it — the exact failure this rule exists to prevent.
  const { assignTiers } = await importGenerator();
  const rosters = assignTiers([
    { id: 'nvidia/a:free', contextLength: 900 },
    { id: 'nvidia/b:free', contextLength: 800 },
    { id: 'nvidia/c:free', contextLength: 700 },
    { id: 'cohere/d:free', contextLength: 600 },
  ]);
  for (const [tier, models] of Object.entries(rosters)) {
    const providers = new Set(models.map((id) => id.split('/')[0]));
    assert.ok(providers.size > 1, `${tier} drew every seat from one provider: ${models.join(', ')}`);
  }
});

test('assignTiers fills every seat even when only one provider exists', async () => {
  // Diversity is preferred, not mandatory: with a single provider a short tier would be
  // worse than a concentrated one.
  const { assignTiers } = await importGenerator();
  const rosters = assignTiers([
    { id: 'nvidia/a:free', contextLength: 900 },
    { id: 'nvidia/b:free', contextLength: 800 },
    { id: 'nvidia/c:free', contextLength: 700 },
  ]);
  for (const [tier, models] of Object.entries(rosters)) {
    assert.equal(models.length, 3, `${tier} left a seat empty`);
  }
});

test('assignTiers never emits a duplicate seat within a tier', async () => {
  const { assignTiers } = await importGenerator();
  const rosters = assignTiers([
    { id: 'a/one:free', contextLength: 200 },
    { id: 'b/two:free', contextLength: 100 },
  ]);
  for (const [tier, models] of Object.entries(rosters)) {
    assert.equal(new Set(models).size, models.length, `${tier} repeated a seat`);
  }
});

// ── The committed artifact ──────────────────────────────────────────────────

test('the committed roster only contains :free slugs', () => {
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'));
  for (const [tier, models] of Object.entries(roster.rosters)) {
    assert.ok(models.length > 0, `${tier} is empty`);
    for (const model of models) {
      assert.ok(model.endsWith(':free'), `${tier} carries a non-free slug: ${model}`);
    }
  }
});

test('every model on the committed roster was actually verified, not merely listed', () => {
  // The point of the whole pipeline: nothing reaches a visitor on the strength of a
  // catalogue entry alone.
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'));
  const verified = new Set(roster.verified.map((entry) => entry.id));
  for (const [tier, models] of Object.entries(roster.rosters)) {
    for (const model of models) {
      assert.ok(verified.has(model), `${tier} advertises unverified ${model}`);
    }
  }
});

test('the committed roster carries a parseable verification timestamp', () => {
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'));
  assert.equal(roster.schemaVersion, '1');
  assert.ok(Number.isFinite(Date.parse(roster.verifiedAt)), 'verifiedAt is not a date');
  assert.ok(Number.isFinite(Date.parse(roster.generatedAt)), 'generatedAt is not a date');
});

test('verifiedAt is a real success, never merely the moment the run happened', () => {
  // A run whose probes all fail still publishes, because the health window is what keeps
  // a throttled afternoon from gutting the roster. It must not also reset the staleness
  // clock: stamping verifiedAt with the run time would let the page claim "verified
  // today" with no live confirmation behind it.
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, 'utf8'));
  const successes = roster.verified.map((entry) => Date.parse(entry.lastOkAt));
  assert.equal(Date.parse(roster.verifiedAt), Math.max(...successes));
  assert.ok(
    Date.parse(roster.verifiedAt) <= Date.parse(roster.generatedAt),
    'verifiedAt is later than the run that wrote it',
  );
});

test('a run where nothing answers keeps the roster but does not advance verifiedAt', async () => {
  // The exact scenario the health window exists for, and the exact way it could have
  // lied. Every probe fails; the previously-healthy models keep their seats, but the
  // page must not be told the roster was verified now. verifiedAt therefore stays at
  // yesterday's success while generatedAt records that the job did run.
  const { buildRoster } = await importGenerator();
  const os = require('node:os');
  const rosterPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'roster-')), 'free-roster.json');
  const yesterday = '2026-08-27T06:00:00.000Z';
  fs.writeFileSync(rosterPath, JSON.stringify({
    schemaVersion: '1',
    health: {
      'nvidia/a:free': { lastOkAt: yesterday, consecutiveFailures: 0 },
      'cohere/b:free': { lastOkAt: yesterday, consecutiveFailures: 0 },
    },
  }));

  const roster = await buildRoster({
    now: new Date('2026-08-28T06:00:00.000Z'),
    rosterPath,
    log: () => {},
    sleepImpl: async () => {},
    catalogue: async () => ({
      status: 'ok',
      stale: false,
      warnings: [],
      candidates: [
        { id: 'nvidia/a:free', isFree: true, freeKind: 'concrete_free', contextLength: '900' },
        { id: 'cohere/b:free', isFree: true, freeKind: 'concrete_free', contextLength: '800' },
      ],
    }),
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: [
          { id: 'nvidia/a:free', context_length: 900, pricing: { prompt: '0', completion: '0' } },
          { id: 'cohere/b:free', context_length: 800, pricing: { prompt: '0', completion: '0' } },
        ],
      }),
    }),
    probe: async () => ({ ok: false, reason: 'empty-stream', ms: 300, attempts: 3 }),
  });

  assert.equal(roster.freshlyVerified, 0, 'no model should have been confirmed live');
  assert.equal(roster.verified.length, 2, 'both models should keep their seats');
  assert.equal(roster.verifiedAt, yesterday, 'verifiedAt advanced without a live success');
  assert.equal(roster.generatedAt, '2026-08-28T06:00:00.000Z');
  assert.ok(Date.parse(roster.verifiedAt) < Date.parse(roster.generatedAt));
  fs.rmSync(path.dirname(rosterPath), { recursive: true, force: true });
});

test('a run spends its probe budget on the models with the oldest evidence', async () => {
  // Verification shares the relay's free-tier budget with real visitors, so a run checks
  // a subset. It must pick the models whose evidence is weakest, not an arbitrary slice,
  // or a model could sit unverified until its window lapsed while others were re-checked
  // daily.
  const { buildRoster, PROBE_BUDGET_PER_RUN } = await importGenerator();
  const os = require('node:os');
  const rosterPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'roster-')), 'free-roster.json');
  const ids = Array.from({ length: PROBE_BUDGET_PER_RUN + 3 }, (_, i) => `p${i}/m${i}:free`);
  // p0 is the freshest, ascending to the oldest. The last three should never be skipped.
  const health = {};
  ids.forEach((id, i) => {
    health[id] = { lastOkAt: new Date(Date.parse('2026-08-28T00:00:00.000Z') - i * 3_600_000).toISOString() };
  });
  fs.writeFileSync(rosterPath, JSON.stringify({ schemaVersion: '1', health }));

  const probed = [];
  const roster = await buildRoster({
    now: new Date('2026-08-28T06:00:00.000Z'),
    rosterPath,
    log: () => {},
    sleepImpl: async () => {},
    catalogue: async () => ({
      status: 'ok',
      stale: false,
      warnings: [],
      candidates: ids.map((id) => ({ id, isFree: true, freeKind: 'concrete_free', contextLength: '900' })),
    }),
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: ids.map((id) => ({ id, context_length: 900, pricing: { prompt: '0', completion: '0' } })),
      }),
    }),
    probe: async (id) => { probed.push(id); return { ok: true, ms: 100, attempts: 1 }; },
  });

  assert.equal(probed.length, PROBE_BUDGET_PER_RUN, 'run exceeded its probe budget');
  assert.equal(roster.probed, PROBE_BUDGET_PER_RUN);
  assert.equal(roster.eligible, ids.length);
  // The three oldest are ids at the end of the list.
  for (const oldest of ids.slice(-3)) {
    assert.ok(probed.includes(oldest), `${oldest} has the oldest evidence and was not probed`);
  }
  // Everything still keeps its seat: skipped models ride their existing evidence.
  assert.equal(roster.verified.length, ids.length);
  fs.rmSync(path.dirname(rosterPath), { recursive: true, force: true });
});

test('a model skipped by the budget still drops once its window lapses', async () => {
  // The budget delays re-verification; it must not exempt anything from it.
  const { buildRoster } = await importGenerator();
  const os = require('node:os');
  const rosterPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'roster-')), 'free-roster.json');
  const ids = Array.from({ length: 12 }, (_, i) => `p${i}/m${i}:free`);
  const health = {};
  ids.forEach((id, i) => {
    // The freshest four are recent; everything else answered five weeks ago and so is
    // far outside the window, whether or not this run gets round to probing it.
    health[id] = { lastOkAt: i < 4 ? '2026-08-28T00:00:00.000Z' : '2026-07-20T00:00:00.000Z' };
  });
  fs.writeFileSync(rosterPath, JSON.stringify({ schemaVersion: '1', health }));

  const roster = await buildRoster({
    now: new Date('2026-08-28T06:00:00.000Z'),
    rosterPath,
    log: () => {},
    sleepImpl: async () => {},
    catalogue: async () => ({
      status: 'ok',
      stale: false,
      warnings: [],
      candidates: ids.map((id) => ({ id, isFree: true, freeKind: 'concrete_free', contextLength: '900' })),
    }),
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: ids.map((id) => ({ id, context_length: 900, pricing: { prompt: '0', completion: '0' } })),
      }),
    }),
    probe: async () => ({ ok: false, reason: 'empty-stream', ms: 300, attempts: 3 }),
  });

  const kept = new Set(roster.verified.map((entry) => entry.id));
  for (const id of ids.slice(4)) {
    assert.ok(!kept.has(id), `${id} is five weeks stale and kept its seat`);
  }
  assert.equal(kept.size, 4, 'only the models inside the window should remain');
  fs.rmSync(path.dirname(rosterPath), { recursive: true, force: true });
});

test('the page tells the visitor when the latest check confirmed nothing', () => {
  const source = fs.readFileSync(COUNCIL_JS, 'utf8');
  assert.match(source, /freshlyVerified === 0/);
  assert.match(source, /confirmed no models/);
});

test('the refresh workflow never runs third-party code in a job that can write', () => {
  // The generator executes `npx -y open-dashboard-mcp`, i.e. code downloaded at run time.
  // It must not share a job with a write token or a persisted credential.
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/free-roster.yml'), 'utf8');
  const jobs = workflow.split(/\n  (?=\w[\w-]*:\n)/);
  const npxJob = jobs.find((job) => job.includes('npx') || job.includes('refresh-free-roster.mjs'));
  assert.ok(npxJob, 'no job runs the generator');
  assert.doesNotMatch(npxJob, /contents: write/, 'the generator job holds write access');
  assert.match(npxJob, /persist-credentials: false/, 'the generator job persists a credential');
  const writeJob = jobs.find((job) => job.includes('contents: write'));
  assert.ok(writeJob, 'no job can commit');
  assert.doesNotMatch(writeJob, /npx/, 'the committing job runs third-party code');
});

test('the committed roster does not carry the two slugs that were withdrawn', () => {
  // Regression pin for the failure that prompted this work.
  const raw = fs.readFileSync(ROSTER_PATH, 'utf8');
  for (const dead of ['openai/gpt-oss-20b:free', 'nvidia/nemotron-3-nano-30b-a3b:free']) {
    assert.doesNotMatch(raw, new RegExp(dead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${dead} is back`);
  }
});

// ── The client contract ─────────────────────────────────────────────────────

test('council.js still refuses a non-free model at call time', () => {
  // The runtime guard is the last line of defence and predates this work. A refactor
  // that removed it would leave the free-only promise resting entirely on a generated
  // file, which is remote input by the time the browser sees it.
  const source = fs.readFileSync(COUNCIL_JS, 'utf8');
  assert.match(source, /if \(!model\.endsWith\(':free'\)\) throw/);
});

test('council.js validates the fetched roster before adopting any of it', () => {
  const source = fs.readFileSync(COUNCIL_JS, 'utf8');
  assert.match(source, /function validateRosterDocument/);
  assert.match(source, /carries a non-free slug/);
});

test('the built-in fallback roster is itself free-only and non-empty', () => {
  // If the fetch fails, this list is what a visitor runs on. It must satisfy the same
  // guarantee as the generated one.
  const source = fs.readFileSync(COUNCIL_JS, 'utf8');
  const block = source.match(/const FALLBACK_ROSTERS = \{[\s\S]*?\n  \};/);
  assert.ok(block, 'FALLBACK_ROSTERS block not found');
  const slugs = [...block[0].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(slugs.length >= 3, 'fallback roster is suspiciously small');
  for (const slug of slugs) {
    assert.ok(slug.endsWith(':free'), `fallback roster carries a non-free slug: ${slug}`);
  }
});

test('the page reports roster staleness rather than serving an ageing list silently', () => {
  const source = fs.readFileSync(COUNCIL_JS, 'utf8');
  assert.match(source, /ROSTER_STALE_AFTER_DAYS/);
  assert.match(source, /function rosterStatusText/);
  const markup = fs.readFileSync(path.join(ROOT, 'web/council/index.html'), 'utf8');
  assert.match(markup, /id="openrouter-roster-status"/);
});
