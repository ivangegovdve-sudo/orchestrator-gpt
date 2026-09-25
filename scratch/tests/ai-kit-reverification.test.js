// Contract tests for the AI-d kit re-verification routine.
//
// The promise this file checks is the one that is easy to write down and easy to quietly
// break: a firing may only write a date for a page it actually opened, and the one write
// it is allowed to make on its own is a demotion.
//
// Everything here runs the real functions from `scripts/reverify-ai-d-kit-offers.mjs`,
// and the demotion is proved end to end — through the renderer — rather than asserted:
// a demoted row must be ABSENT from the live list the reader sees.

const assert = require('node:assert/strict');
const test = require('node:test');

const reverifyModule = import('../../scripts/reverify-ai-d-kit-offers.mjs');
const offersModule = import('../../web/shared/ai-kit-offers.mjs');

const NOW = new Date('2026-09-25T10:00:00Z');
const TODAY = '2026-09-25';

function standingTier(overrides = {}) {
  return {
    id: 'a-standing-tier',
    name: 'A standing free tier',
    url: 'https://example.com/free-tier',
    provider: 'Example Provider',
    kind: 'standing_tier',
    summary: 'Something free, forever.',
    lastVerifiedAt: '2026-06-01',
    verification: {
      status: 'VERIFIED',
      checkedAt: '2026-06-01',
      checkedBy: 'Neo',
      observed: 'Page said "free forever" with a 1M token/month allowance listed in a table.',
    },
    ...overrides,
  };
}

function promotion(overrides = {}) {
  return {
    id: 'a-promotion',
    name: 'A promotion',
    url: 'https://example.com/promo',
    provider: 'Example Provider',
    kind: 'promotion',
    summary: 'Something free for a while.',
    expiresAt: '2026-12-31',
    verification: {
      status: 'VERIFIED',
      checkedAt: '2026-09-01',
      checkedBy: 'Neo',
      observed: 'Banner on the page stated the promotion runs until 31 December 2026.',
    },
    ...overrides,
  };
}

/**
 * A probe result shaped like `probeOffer` returns, without any network. `requestedUrl`
 * defaults to the row's own URL, because that is what makes a probe count as evidence
 * about that row — see the replacement-URL rule in `applyObservations`.
 */
const FIXTURE_URLS = { 'a-standing-tier': 'https://example.com/free-tier', 'a-promotion': 'https://example.com/promo' };

function probe(id, verdict, overrides = {}) {
  const url = FIXTURE_URLS[id] ?? 'https://example.com/x';
  return { id, requestedUrl: url, finalUrl: url, status: 200, verdict, evidence: `test evidence: ${verdict}`, signals: [], ms: 1, ...overrides };
}

test('a 404 is hard evidence and demotes; a 403 is not and does not', async () => {
  const { classifyProbe } = await reverifyModule;
  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/a', status: 404, bodyText: 'x'.repeat(500) }).verdict, 'gone');
  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/a', status: 410, bodyText: '' }).verdict, 'gone');

  // A bot-blocking CDN and a withdrawn offer are indistinguishable from a fetch. Oracle's
  // free-tier marketing page already 403s this repo while the offer is real.
  for (const status of [401, 403, 429, 500, 503]) {
    assert.equal(classifyProbe({ requestedUrl: 'https://example.com/a', status, bodyText: 'x'.repeat(500) }).verdict, 'inconclusive', `HTTP ${status} must not demote`);
  }
  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/a', error: 'no response within 20000ms' }).verdict, 'inconclusive');
});

test('a redirect into a login wall or a pricing page is gone — unless the row already pointed there', async () => {
  const { classifyProbe } = await reverifyModule;
  const body = 'x'.repeat(500);

  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/free-credits', finalUrl: 'https://example.com/account/login', status: 200, bodyText: body }).verdict, 'gone');
  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/free-credits', finalUrl: 'https://example.com/pricing', status: 200, bodyText: body }).verdict, 'gone');

  // Plenty of genuine free tiers are documented on a /pricing page. Landing on one is
  // only evidence when the row was not already pointing at one.
  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/pricing', finalUrl: 'https://example.com/pricing/plans', status: 200, bodyText: body }).verdict, 'reachable');
  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/signin', finalUrl: 'https://example.com/login', status: 200, bodyText: body }).verdict, 'reachable');

  // A 200 with nothing in it is a failure dressed as a success, not a confirmation.
  assert.equal(classifyProbe({ requestedUrl: 'https://example.com/a', status: 200, bodyText: 'tiny' }).verdict, 'inconclusive');
});

test('the probe demotes a dead row, keeps it in the file, and keeps its history', async () => {
  const { applyProbeResults, PROBE_AUTHOR } = await reverifyModule;
  const rows = [standingTier(), promotion()];
  const { rows: next, demotions } = applyProbeResults(rows, [probe('a-standing-tier', 'gone', { status: 404, evidence: 'GET https://example.com/free-tier returned HTTP 404.' })], { now: NOW });

  assert.equal(next.length, 2, 'the row is demoted, never deleted');
  assert.deepEqual(demotions.map((row) => row.id), ['a-standing-tier']);

  const demoted = next[0];
  assert.equal(demoted.verification.status, 'UNVERIFIED');
  assert.equal(demoted.verification.checkedAt, TODAY);
  assert.equal(demoted.verification.checkedBy, PROBE_AUTHOR, 'the probe signs its own work rather than borrowing a person`s name');
  assert.match(demoted.verification.observed, /HTTP 404/);
  assert.match(demoted.verification.observed, /Previously recorded 2026-06-01 by Neo/, 'the old observation survives inside the new one');

  // lastVerifiedAt records the last time the offer was seen to be real. A 404 is the
  // opposite of that, so a demotion must never advance it.
  assert.equal(demoted.lastVerifiedAt, '2026-06-01');

  // Untouched rows come through byte-identical.
  assert.deepEqual(next[1], rows[1]);
});

test('a demoted row is absent from the live list the reader sees', async () => {
  const { applyProbeResults } = await reverifyModule;
  const { groupOffers, renderLiveOffer } = await offersModule;

  const rows = [standingTier()];
  const before = groupOffers(rows, { now: NOW });
  assert.equal(before.live.length, 1, 'precondition: the row starts live');

  const { rows: next } = applyProbeResults(rows, [probe('a-standing-tier', 'gone', { status: 404 })], { now: NOW });
  const after = groupOffers(next, { now: NOW });

  assert.equal(after.live.length, 0);
  assert.equal(after.liveStandingTiers.length, 0);
  assert.equal(after.unverified.length, 1);

  // And the live renderer is never reached for it: the bucket, not the row, picks the
  // function, so there is no argument by which this row gets the live styling.
  const html = after.unverified.map((row) => row).map(({ offer, state }) => ({ offer, state }));
  assert.equal(html.length, 1);
  assert.ok(!renderLiveOffer(html[0]).includes('__unreachable__'));
  assert.equal(after.live.map(renderLiveOffer).join(''), '', 'nothing renders as live');
});

test('the probe cannot promote, only demote', async () => {
  const { applyProbeResults } = await reverifyModule;
  const rows = [standingTier({ verification: { status: 'UNVERIFIED', checkedAt: '2026-06-01', checkedBy: 'Neo', observed: 'Could not find the free tier on the page.' } })];
  for (const verdict of ['reachable', 'inconclusive', 'gone']) {
    const { rows: next, demotions } = applyProbeResults(rows, [probe('a-standing-tier', verdict)], { now: NOW });
    assert.deepEqual(next, rows, `a ${verdict} probe must not touch an UNVERIFIED row`);
    assert.deepEqual(demotions, []);
  }
  // Nor can it refresh a live row's dates.
  const live = [standingTier()];
  assert.deepEqual(applyProbeResults(live, [probe('a-standing-tier', 'reachable')], { now: NOW }).rows, live);
});

test('a date is only written when somebody says what they saw', async () => {
  const { applyObservations } = await reverifyModule;
  const rows = [standingTier()];
  const probes = [probe('a-standing-tier', 'reachable')];

  // No observation at all: nothing moves.
  assert.deepEqual(applyObservations(rows, [], probes, { now: NOW }).rows, rows);

  // A verdict is not an observation.
  for (const observed of ['ok', 'looks fine', 'still there', 'short']) {
    const { rows: next, refused } = applyObservations(rows, [{ id: 'a-standing-tier', observed }], probes, { now: NOW });
    assert.deepEqual(next, rows);
    assert.equal(refused.length, 1, `"${observed}" must be refused`);
  }

  // A real observation refreshes both dates.
  const observed = 'Table on the page still lists 1M tokens/month on the free plan, and the "no card required" line is still there.';
  const { rows: next, refreshed, refused } = applyObservations(rows, [{ id: 'a-standing-tier', observed }], probes, { now: NOW });
  assert.deepEqual(refused, []);
  assert.deepEqual(refreshed.map((row) => row.id), ['a-standing-tier']);
  assert.equal(next[0].verification.checkedAt, TODAY);
  assert.equal(next[0].verification.observed, observed);
  assert.equal(next[0].lastVerifiedAt, TODAY, 'a standing tier has no expiry, so lastVerifiedAt is the date the reader sees');
});

test('an observation for a page this run could not open needs an explicit manual read', async () => {
  const { applyObservations } = await reverifyModule;
  const rows = [standingTier()];
  const blocked = [probe('a-standing-tier', 'inconclusive', { status: 403, evidence: 'GET … returned HTTP 403.' })];
  const observed = 'Opened it in a browser: the Always Free section still lists two micro VMs and 200 GB of block storage.';

  const refusedRun = applyObservations(rows, [{ id: 'a-standing-tier', observed }], blocked, { now: NOW });
  assert.deepEqual(refusedRun.rows, rows, 'no date is written for a page the run could not open');
  assert.equal(refusedRun.refused.length, 1);
  assert.match(refusedRun.refused[0].why, /openedManually/);

  const acceptedRun = applyObservations(rows, [{ id: 'a-standing-tier', observed, openedManually: true }], blocked, { now: NOW });
  assert.equal(acceptedRun.refused.length, 0);
  assert.equal(acceptedRun.rows[0].verification.checkedAt, TODAY);
  assert.match(acceptedRun.rows[0].verification.observed, /opened by hand on 2026-09-25/i, 'the record says how it was read');

  // Same rule for a row that was never probed at all.
  const unprobed = applyObservations(rows, [{ id: 'a-standing-tier', observed }], [], { now: NOW });
  assert.equal(unprobed.refused.length, 1);
  assert.deepEqual(unprobed.rows, rows);
});

test('the machine and the human disagreeing is a refusal, not a coin toss', async () => {
  const { applyObservations } = await reverifyModule;
  const rows = [standingTier()];
  const dead = [probe('a-standing-tier', 'gone', { status: 404, evidence: 'GET … returned HTTP 404.' })];
  const observed = 'The free tier is right there on the page, unchanged, with the same allowance as before.';

  const conflict = applyObservations(rows, [{ id: 'a-standing-tier', observed }], dead, { now: NOW });
  assert.deepEqual(conflict.rows, rows);
  assert.equal(conflict.refused.length, 1);
  assert.match(conflict.refused[0].why, /probe says the page is gone/);

  // The resolution is a new URL, which is the edit the situation actually calls for — but
  // the replacement gets the same scrutiny as the original. Naming a URL nobody opened is
  // still a date written for an unopened page.
  const movedUrl = 'https://example.com/pricing/free';
  const unopened = applyObservations(rows, [{ id: 'a-standing-tier', observed, url: movedUrl }], dead, { now: NOW });
  assert.equal(unopened.refused.length, 1);
  assert.match(unopened.refused[0].why, /did not open https:\/\/example\.com\/pricing\/free/);
  assert.deepEqual(unopened.rows, rows);

  // With the replacement probed (the CLI opens it automatically), the move is accepted.
  const reprobed = [probe('a-standing-tier', 'reachable', { requestedUrl: movedUrl, finalUrl: movedUrl })];
  const moved = applyObservations(rows, [{ id: 'a-standing-tier', observed, url: movedUrl }], reprobed, { now: NOW });
  assert.deepEqual(moved.refused, []);
  assert.equal(moved.rows[0].url, movedUrl);
  assert.equal(moved.rows[0].verification.checkedAt, TODAY);

  // And a replacement that is also dead is refused, not published.
  const deadReplacement = [probe('a-standing-tier', 'gone', { requestedUrl: movedUrl, finalUrl: movedUrl, status: 404 })];
  const stillDead = applyObservations(rows, [{ id: 'a-standing-tier', observed, url: movedUrl }], deadReplacement, { now: NOW });
  assert.equal(stillDead.refused.length, 1);
  assert.deepEqual(stillDead.rows, rows);

  // Or a human demotion, with the human's own words.
  const demoted = applyObservations(rows, [{ id: 'a-standing-tier', observed: 'The free tier section is gone; the page now only lists paid plans starting at $20/month.', status: 'UNVERIFIED' }], dead, { now: NOW });
  assert.equal(demoted.refused.length, 0);
  assert.equal(demoted.rows[0].verification.status, 'UNVERIFIED');
  assert.equal(demoted.rows[0].lastVerifiedAt, '2026-06-01', 'a human demotion does not advance lastVerifiedAt either');
  assert.match(demoted.rows[0].verification.observed, /Previously recorded/);
});

test('a promotion whose end date moved is corrected from the page', async () => {
  const { applyObservations } = await reverifyModule;
  const rows = [promotion()];
  const probes = [probe('a-promotion', 'reachable')];
  const observed = 'The banner now reads "offer ends 30 November 2026", earlier than the date we had recorded.';

  const { rows: next, refreshed } = applyObservations(rows, [{ id: 'a-promotion', observed, expiresAt: '2026-11-30' }], probes, { now: NOW });
  assert.equal(next[0].expiresAt, '2026-11-30');
  assert.equal(refreshed[0].expiresAtChanged, '2026-11-30');
  assert.equal(next[0].lastVerifiedAt, undefined, 'a promotion shows its expiry, not a last-verified date');

  // A bad date is refused rather than written.
  const bad = applyObservations(rows, [{ id: 'a-promotion', observed, expiresAt: '30-11-2026' }], probes, { now: NOW });
  assert.equal(bad.refused.length, 1);
  assert.deepEqual(bad.rows, rows);
});

test('an observation for a row that is not in the file is refused, not applied somewhere', async () => {
  const { applyObservations } = await reverifyModule;
  const rows = [standingTier()];
  const { rows: next, refused } = applyObservations(rows, [{ id: 'not-in-the-file', observed: 'Read the page and the free tier is still advertised in the header nav.' }], [], { now: NOW });
  assert.deepEqual(next, rows);
  assert.equal(refused.length, 1);
  assert.match(refused[0].why, /no row in offers.json/);
});

test('whatever a firing writes still passes the schema the page enforces', async () => {
  const { applyProbeResults, applyObservations } = await reverifyModule;
  const { offerDocumentProblems } = await offersModule;
  const rows = [standingTier(), promotion()];
  const probes = [probe('a-standing-tier', 'gone', { status: 404 }), probe('a-promotion', 'reachable')];

  const afterProbe = applyProbeResults(rows, probes, { now: NOW });
  assert.deepEqual(offerDocumentProblems(afterProbe.rows), []);

  const afterHuman = applyObservations(afterProbe.rows, [
    { id: 'a-promotion', observed: 'Banner still says the promotion runs to the end of the year; nothing else on the page changed.', expiresAt: '2026-12-31' },
  ], probes, { now: NOW });
  assert.deepEqual(offerDocumentProblems(afterHuman.rows), []);
});

test('the plan says whose turn it is to be read, and why', async () => {
  const { planReverification, DUE_AFTER_DAYS } = await reverifyModule;

  const rows = [
    standingTier({ id: 'read-recently', lastVerifiedAt: TODAY, verification: { status: 'VERIFIED', checkedAt: '2026-09-20', checkedBy: 'Neo', observed: 'Free tier table unchanged, still 1M tokens a month.' } }),
    standingTier({ id: 'read-long-ago' }),
    promotion({ id: 'promo-read-a-fortnight-ago', verification: { status: 'VERIFIED', checkedAt: '2026-09-10', checkedBy: 'Neo', observed: 'Banner said the window closes at the end of the year.' } }),
    promotion({ id: 'already-expired', expiresAt: '2026-01-01' }),
    standingTier({ id: 'already-unverified', verification: { status: 'UNVERIFIED', checkedAt: '2026-09-24', checkedBy: 'Neo', observed: 'Could not find any free tier on the page today.' } }),
  ];

  const plan = planReverification(rows, { now: NOW });
  const due = new Map(plan.map((row) => [row.id, row]));

  assert.equal(DUE_AFTER_DAYS.promotion, 14);
  assert.equal(DUE_AFTER_DAYS.standing_tier, 30);
  assert.equal(due.get('read-recently').due, false);
  assert.equal(due.get('read-long-ago').due, true, '116 days is past the 30-day standing-tier window');
  assert.equal(due.get('promo-read-a-fortnight-ago').due, true, 'promotions come up every 14 days');
  assert.equal(due.get('already-expired').due, false, 'an expired promotion is already out of the live list');
  assert.equal(due.get('already-unverified').due, true, 'the unverified queue is the point of re-reading');
});

test('the real offers.json is in a state this routine can run against', async () => {
  const { planReverification } = await reverifyModule;
  const { offerDocumentProblems } = await offersModule;
  const offers = require('../../web/pools/ai-d-kit/free-stuff-in-promotions/offers.json');

  assert.deepEqual(offerDocumentProblems(offers), [], 'the live file must be well-formed before a firing touches it');
  const plan = planReverification(offers);
  assert.equal(plan.length, offers.length);
  for (const row of plan) assert.ok(row.reason.length > 0, `${row.id} has no reason recorded`);
  for (const offer of offers) assert.match(offer.url, /^https:\/\//, `${offer.id} must have an https url for the probe to open`);
});
