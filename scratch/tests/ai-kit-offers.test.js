const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const offers = import('../../web/shared/ai-kit-promotions.mjs');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('AI-d kit subpages are published from observed boundaries', () => {
  const troubleshooting = read('web/pools/ai-d-kit/troubleshooting/index.html');
  const promotions = read('web/pools/ai-d-kit/free-stuff-in-promotions/index.html');

  assert.match(troubleshooting, /AnyCloudLLM .* not published/i);
  assert.match(troubleshooting, /Open Dashboard/);
  assert.match(troubleshooting, /Explore Repos/);
  assert.match(troubleshooting, /The Drop/);
  assert.match(promotions, /data-endpoint="https:\/\/ifugbkvmdpqzjgjqmfxh\.supabase\.co\/functions\/v1\/ai-kit-promotions"/);
  assert.match(promotions, /Time-boxed promotions/);
  assert.match(promotions, /Standing free tiers/);
  assert.match(promotions, /Unverified/);
  assert.match(promotions, /Withdrawn archive/);
  assert.match(promotions, /does not ingest mail/);
});

test('promotion state safety never treats unknown or stale rows as active', async () => {
  const { effectiveOfferState } = await offers;
  const now = new Date('2026-09-21T12:00:00Z');
  assert.equal(effectiveOfferState({ kind: 'time_boxed', status: 'active', expires_at: null }, now), 'unverified');
  assert.equal(effectiveOfferState({ kind: 'time_boxed', status: 'active', expires_at: '2026-09-20T00:00:00Z' }, now), 'expired');
  assert.equal(effectiveOfferState({ kind: 'time_boxed', status: 'active', expires_at: '2026-09-30T00:00:00Z' }, now), 'active');
  assert.equal(effectiveOfferState({ kind: 'standing_tier', status: 'active', last_verified_at: '2026-08-01T00:00:00Z', recheck_cadence_days: 30 }, now), 'unverified');
  assert.equal(effectiveOfferState({ kind: 'standing_tier', status: 'active', last_verified_at: '2026-09-01T00:00:00Z', recheck_cadence_days: 30 }, now), 'active');
});

test('normalization requires review for active publication but keeps expiry history', async () => {
  const { normalizeOfferPayload } = await offers;
  const now = new Date('2026-09-21T12:00:00Z');
  const result = normalizeOfferPayload({
    active: [
      { id: 'approved', kind: 'time_boxed', offer_decision: 'free_offer', status: 'active', review_status: 'approved', expires_at: '2026-09-30T00:00:00Z' },
      { id: 'unreviewed', kind: 'time_boxed', offer_decision: 'free_offer', status: 'active', review_status: 'unreviewed', expires_at: '2026-09-30T00:00:00Z' },
    ],
    archive: [{ id: 'ended', kind: 'time_boxed', offer_decision: 'not_free', status: 'active', review_status: 'evidence_fixture', expires_at: '2026-09-01T00:00:00Z' }],
  }, now);

  assert.deepEqual(result.active.map(({ id }) => id), ['approved']);
  assert.deepEqual(result.expired.map(({ id }) => id), ['ended']);
  assert.deepEqual(result.archive.map(({ id }) => id), ['ended']);
  assert.deepEqual(result.unverified.map(({ id }) => id), ['unreviewed']);
});
