const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const offers = import('../../web/shared/ai-kit-promotions.mjs');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readBuffer(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

test('AI-d kit subpages are published from observed boundaries', () => {
  const troubleshooting = read('web/pools/ai-d-kit/troubleshooting/index.html');
  const troubleshootingSource = read('web/pools/ai-d-kit/troubleshooting/TROUBLESHOOTING.md');
  const promotions = read('web/pools/ai-d-kit/free-stuff-in-promotions/index.html');

  assert.match(troubleshooting, /data-source-repository="ivangegovdve-sudo\/hermes-agent"/);
  assert.match(troubleshooting, /data-source-branch="docs\/ivan-troubleshooting-20260921"/);
  assert.match(troubleshooting, /data-source-snapshot="e19037333c1f1e410c52ee4ef09d7484018fdf50"/);
  assert.match(troubleshooting, /data-source-formatting-repair="89f0d1b50cba8ff6d067ef284e4fec79c0764f79"/);
  assert.match(troubleshooting, /data-source-blob="c7d630ce8832df253d07f8b4309e76bf64acc45a"/);
  assert.match(troubleshooting, /data-part-count="14"/);
  assert.match(troubleshooting, /data-entry-count="108"/);
  assert.equal((troubleshooting.match(/class="troubleshooting-entry"/g) || []).length, 108);
  for (const field of ['symptom', 'cause', 'cost', 'check']) {
    assert.ok(troubleshooting.includes(`data-field="${field}"`), `renders ${field} fields`);
  }
  assert.match(troubleshooting, /six months from/);
  assert.doesNotMatch(troubleshooting, /AnyCloudLLM — Troubleshooting/);
  const sourceBytes = readBuffer('web/pools/ai-d-kit/troubleshooting/TROUBLESHOOTING.md');
  const gitBlob = Buffer.concat([Buffer.from(`blob ${sourceBytes.length}\0`), sourceBytes]);
  assert.equal(
    crypto.createHash('sha1').update(gitBlob).digest('hex'),
    'c7d630ce8832df253d07f8b4309e76bf64acc45a',
  );
  assert.equal((troubleshootingSource.match(/^## Part \d+\b/gm) || []).length, 14);
  assert.equal((troubleshootingSource.match(/^### /gm) || []).length, 108);
  for (const field of ['Symptom', 'Cause', 'Cost', 'Check']) {
    assert.match(troubleshootingSource, new RegExp(`^\\*\\*${field}\\*\\*`, 'm'));
  }
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
