// Contract tests for the AI-d kit data machinery.
//
// The point of this file is that the two promises the offers page makes to a reader are
// checked by running the renderer, not by reading it. Both rules are asserted against
// the HTML the renderer actually emits:
//
//   - a promotion with a past expiresAt is ABSENT from the live list
//   - a row with status UNVERIFIED is absent from the live list and never carries the
//     live class, even when its dates are valid
//
// There is no DOM library in this repo and a static site does not need one, so the tests
// use a small stub that records what each container was given. That is enough: the
// assertion is about the emitted markup, which is a string either way.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const offersModule = import('../../web/shared/ai-kit-offers.mjs');
const entriesModule = import('../../web/shared/ai-kit-troubleshooting.mjs');
const validatorModule = import('../../scripts/validate-ai-d-kit-data.mjs');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

/** Minimal stand-in for the page root: every selector gets its own recording element. */
function stubRoot() {
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', hidden: false });
    return elements.get(selector);
  };
  return {
    elements,
    html: (selector) => element(selector).innerHTML,
    querySelector: (selector) => element(selector),
    querySelectorAll: (selector) => selector.split(',').map((one) => element(one.trim())),
  };
}

const LIVE_SELECTORS = ['[data-offers-active]', '[data-offers-standing]'];

function liveHtml(root) {
  return LIVE_SELECTORS.map((selector) => root.html(selector)).join('\n');
}

const VERIFIED = { status: 'VERIFIED', checkedAt: '2026-09-01', checkedBy: 'Neo', observed: 'Saw the offer on the page.' };

function promotion(overrides = {}) {
  return {
    id: 'a-promotion',
    name: 'A promotion',
    url: 'https://example.com/a',
    provider: 'Example Provider',
    kind: 'promotion',
    summary: 'Something free.',
    expiresAt: '2026-12-31',
    verification: { ...VERIFIED },
    ...overrides,
  };
}

function standingTier(overrides = {}) {
  return {
    id: 'a-standing-tier',
    name: 'A standing tier',
    url: 'https://example.com/b',
    provider: 'Example Provider',
    kind: 'standing_tier',
    summary: 'A permanent free tier.',
    lastVerifiedAt: '2026-09-01',
    verification: { ...VERIFIED },
    ...overrides,
  };
}

// ---------------------------------------------------------------- render-time expiry

test('a promotion past its expiresAt is absent from the live list', async () => {
  const { renderOffersInto } = await offersModule;
  const root = stubRoot();
  const now = new Date('2026-09-25T12:00:00Z');

  const grouped = renderOffersInto(root, [
    promotion({ id: 'still-open', name: 'Still open', expiresAt: '2026-10-01' }),
    promotion({ id: 'ended-yesterday', name: 'Ended yesterday', expiresAt: '2026-09-24' }),
  ], { now });

  const live = liveHtml(root);
  assert.match(live, /Still open/, 'the in-window promotion is live');
  assert.doesNotMatch(live, /Ended yesterday/, 'the expired promotion is NOT in the live list');
  assert.deepEqual(grouped.livePromotions.map((row) => row.offer.id), ['still-open']);
  assert.deepEqual(grouped.expired.map((row) => row.offer.id), ['ended-yesterday']);
  // It is kept as history, and its own date is on the card.
  assert.match(root.html('[data-offers-archive]'), /Ended yesterday/);
  // "Sep" or "Sept" depending on the ICU build; the date itself is the assertion.
  assert.match(root.html('[data-offers-archive]'), /Expired 24 Sept? 2026/);
});

test('the same file stops showing a promotion as live purely because the date moved', async () => {
  const { renderOffersInto } = await offersModule;
  const rows = [promotion({ id: 'expires-today', name: 'Expires today', expiresAt: '2026-09-25' })];

  // Nothing about the data changes between these two renders. Only the clock does,
  // which is the whole claim: the page is correct tomorrow with nobody touching it.
  const before = stubRoot();
  renderOffersInto(before, rows, { now: new Date('2026-09-25T23:59:59Z') });
  assert.match(liveHtml(before), /Expires today/, 'live through the whole of its expiry day');

  const after = stubRoot();
  renderOffersInto(after, rows, { now: new Date('2026-09-26T00:00:01Z') });
  assert.doesNotMatch(liveHtml(after), /Expires today/, 'gone the next UTC day, with no edit');
});

test('expiry is decided on UTC calendar days, so every reader is told the same thing', async () => {
  const { classifyOffer } = await offersModule;
  const offer = promotion({ expiresAt: '2026-09-25' });
  // 2026-09-26T09:00 in Auckland (+12) is still 2026-09-25 in UTC. Both readers get 'live'.
  assert.equal(classifyOffer(offer, { now: new Date('2026-09-25T21:00:00Z') }).bucket, 'live');
  assert.equal(classifyOffer(offer, { now: new Date('2026-09-26T00:00:00Z') }).bucket, 'expired');
});

// ------------------------------------------------------------ the verification gate

test('an UNVERIFIED row is never live and never carries the live class, valid dates or not', async () => {
  const { renderOffersInto } = await offersModule;
  const root = stubRoot();
  const now = new Date('2026-09-25T12:00:00Z');

  renderOffersInto(root, [
    promotion({
      id: 'unchecked',
      name: 'Unchecked but in date',
      expiresAt: '2027-01-01',
      verification: { status: 'UNVERIFIED', checkedAt: '2026-09-25', checkedBy: 'Neo', observed: 'Not checked yet.' },
    }),
    standingTier({
      id: 'unchecked-tier',
      name: 'Unchecked tier',
      lastVerifiedAt: '2026-09-24',
      verification: { status: 'UNVERIFIED', checkedAt: '2026-09-24', checkedBy: 'Neo', observed: 'Not checked yet.' },
    }),
  ], { now });

  const live = liveHtml(root);
  assert.equal(live.replaceAll('<p class="offer-empty">No verified promotion is inside its window today.</p>', '').replaceAll('<p class="offer-empty">No verified standing tier is listed.</p>', '').trim(), '');
  assert.doesNotMatch(live, /Unchecked/);

  const unverified = root.html('[data-offers-unverified]');
  assert.match(unverified, /Unchecked but in date/);
  assert.match(unverified, /Unchecked tier/);
  assert.doesNotMatch(unverified, /offer-live/, 'the unverified section cannot emit the live class');
  assert.match(unverified, /UNVERIFIED/);
});

test('renderNotLiveOffer cannot produce live markup for any bucket', async () => {
  const { renderNotLiveOffer, classifyOffer } = await offersModule;
  const now = new Date('2026-09-25T12:00:00Z');
  // Hand it a row that WOULD be live, and ask each not-live bucket to render it. The
  // guarantee is structural: this function has no branch that emits offer-live.
  const offer = promotion();
  const state = classifyOffer(offer, { now });
  assert.equal(state.bucket, 'live');
  for (const bucket of ['expired', 'unverified', 'invalid']) {
    assert.doesNotMatch(renderNotLiveOffer({ offer, state }, bucket), /offer-live/, `${bucket} never renders as live`);
  }
});

// -------------------------------------------------------------------- visible dates

test('every rendered card shows its own date to the reader', async () => {
  const { renderOffersInto } = await offersModule;
  const root = stubRoot();
  renderOffersInto(root, [
    promotion({ id: 'p', name: 'P', expiresAt: '2026-12-31' }),
    standingTier({ id: 's', name: 'S', lastVerifiedAt: '2026-09-01' }),
    promotion({ id: 'e', name: 'E', expiresAt: '2026-01-01' }),
    promotion({ id: 'u', name: 'U', expiresAt: '2026-12-31', verification: { ...VERIFIED, status: 'UNVERIFIED' } }),
  ], { now: new Date('2026-09-25T12:00:00Z') });

  assert.match(root.html('[data-offers-active]'), /Expires 31 Dec 2026/);
  assert.match(root.html('[data-offers-standing]'), /Last verified 1 Sept? 2026/);
  assert.match(root.html('[data-offers-archive]'), /Expired 1 Jan 2026/);
  assert.match(root.html('[data-offers-unverified]'), /Expires 31 Dec 2026/);
});

test('a standing tier past 90 days stays listed but is marked stale', async () => {
  const { renderOffersInto, STALE_AFTER_DAYS } = await offersModule;
  assert.equal(STALE_AFTER_DAYS, 90);
  const root = stubRoot();
  const grouped = renderOffersInto(root, [
    standingTier({ id: 'fresh', name: 'Fresh tier', lastVerifiedAt: '2026-09-01' }),
    standingTier({ id: 'old', name: 'Old tier', lastVerifiedAt: '2026-01-01' }),
  ], { now: new Date('2026-09-25T12:00:00Z') });

  const standing = root.html('[data-offers-standing]');
  assert.match(standing, /Fresh tier/);
  assert.match(standing, /Old tier/, 'a stale tier is not hidden');
  assert.match(standing, /STALE/, 'but it says so');
  assert.deepEqual(grouped.liveStandingTiers.filter((row) => row.state.stale).map((row) => row.offer.id), ['old']);
});

// ------------------------------------------------------------------- failing visibly

test('a malformed row renders as broken rather than as an offer', async () => {
  const { renderOffersInto } = await offersModule;
  const root = stubRoot();
  const grouped = renderOffersInto(root, [
    { id: 'no-expiry', name: 'Promotion with no expiry', url: 'https://example.com/x', provider: 'X', kind: 'promotion', summary: 'No date.', verification: { ...VERIFIED } },
  ], { now: new Date('2026-09-25T12:00:00Z') });

  assert.deepEqual(grouped.invalid.map((row) => row.offer.id), ['no-expiry']);
  assert.doesNotMatch(liveHtml(root), /Promotion with no expiry/);
  const invalid = root.html('[data-offers-invalid]');
  assert.match(invalid, /BROKEN RECORD/);
  // The problem text is escaped on its way into the card, quotes included.
  assert.match(invalid, /expiresAt is required for kind &quot;promotion&quot;/);
  assert.equal(root.querySelector('[data-offers-invalid-section]').hidden, false, 'the broken section is revealed');
});

test('an unreadable payload raises instead of rendering an empty page', async () => {
  const { renderOffersInto } = await offersModule;
  // "The file could not be read" must never reach the reader as "there are no offers".
  assert.throws(() => renderOffersInto(stubRoot(), { unexpected: 'shape' }), /offers_payload_not_an_array/);
  assert.throws(() => renderOffersInto(stubRoot(), null), /offers_payload_not_an_array/);
});

test('seed example rows announce themselves and withdraw the banner when removed', async () => {
  const { renderOffersInto } = await offersModule;
  const withExample = stubRoot();
  renderOffersInto(withExample, [promotion({ example: true })], { now: new Date('2026-09-25T12:00:00Z') });
  assert.equal(withExample.querySelector('[data-offers-seed-banner]').hidden, false);
  assert.match(withExample.html('[data-offers-active]'), /EXAMPLE ROW/);

  const withoutExample = stubRoot();
  renderOffersInto(withoutExample, [promotion()], { now: new Date('2026-09-25T12:00:00Z') });
  assert.equal(withoutExample.querySelector('[data-offers-seed-banner]').hidden, true, 'nobody has to remember to remove the banner');
  assert.doesNotMatch(withoutExample.html('[data-offers-active]'), /EXAMPLE ROW/);
});

// ------------------------------------------------------------------------- validator

test('the validator rejects deliberately malformed rows and names each problem', async () => {
  const { checkOffers, checkEntries } = await validatorModule;

  const badOffer = checkOffers([
    { id: 'Not Kebab Case', name: '', url: 'http://insecure.example.com', kind: 'freebie', summary: '', expiresAt: '2026-13-40', verification: { status: 'PROBABLY', checkedAt: 'soon', checkedBy: '', observed: '' } },
  ]);
  assert.ok(badOffer.problems.length > 0, 'a malformed offer is rejected');
  const offerText = badOffer.problems.join('\n');
  for (const expected of [
    'id must be a kebab-case slug',
    'name is required',
    'provider is required',
    'url must be an https:// URL',
    'kind must be one of promotion, standing_tier',
    'verification.status must be one of VERIFIED, UNVERIFIED',
    'verification.checkedAt is required',
    'verification.checkedBy is required',
    'verification.observed is required',
    'expiresAt must be YYYY-MM-DD when present',
  ]) {
    assert.ok(offerText.includes(expected), `reports: ${expected}`);
  }

  assert.ok(checkOffers({ nope: true }).problems.some((p) => p.includes('must be a JSON array')));
  assert.ok(checkOffers([promotion({ id: 'dup' }), promotion({ id: 'dup' })]).problems.some((p) => p.includes('duplicate id dup')));

  const badEntry = checkEntries([{ id: 'ok-id', problem: 'x', symptom: '', cause: 'y', fix: 'z' }]);
  const entryText = badEntry.problems.join('\n');
  assert.ok(entryText.includes('symptom is required'));
  assert.ok(entryText.includes('isWorkaround is required and must be true or false'));
});

test('the shipped data files pass the validator', async () => {
  const { checkOffers, checkEntries, OFFERS_PATH, ENTRIES_PATH } = await validatorModule;
  const offers = checkOffers(readJson(OFFERS_PATH));
  assert.deepEqual(offers.problems, [], `offers.json must validate: ${offers.problems.join('; ')}`);
  const entries = checkEntries(readJson(ENTRIES_PATH));
  assert.deepEqual(entries.problems, [], `entries.json must validate: ${entries.problems.join('; ')}`);
});

// ------------------------------------------------------- troubleshooting entries page

test('curated entries render their four fields and distinguish fixes from workarounds', async () => {
  const { renderEntriesInto } = await entriesModule;
  const root = stubRoot();
  renderEntriesInto(root, [
    { id: 'a-fix', problem: 'A problem', symptom: 'What you see', cause: 'Why', fix: 'Do this', isWorkaround: false },
    { id: 'a-workaround', problem: 'Another problem', symptom: 'Seen', cause: 'Why', fix: 'Paper over it', isWorkaround: true, appliesTo: 'v1 only' },
  ]);

  const html = root.html('[data-entries-list]');
  for (const field of ['symptom', 'cause', 'fix']) {
    assert.match(html, new RegExp(`data-field="${field}"`), `renders the ${field} field`);
  }
  assert.match(html, /FIX — this addresses the cause/);
  assert.match(html, /WORKAROUND — this relieves the symptom without fixing the cause/);
  assert.match(html, /Applies to:<\/strong> v1 only/);
  assert.match(root.querySelector('[data-entries-status]').textContent, /1 marked as workarounds/);
});

test('entry text renders fenced blocks as code and escapes everything else', async () => {
  const { renderRichText, renderEntry } = await entriesModule;
  const rendered = renderRichText('Plain line with `inline` code.\n\n```\nERROR: <not markup>\n```');
  assert.match(rendered, /<code>inline<\/code>/);
  assert.match(rendered, /<pre class="entry-code"><code>ERROR: &lt;not markup&gt;\n?<\/code><\/pre>/);
  // The data file is trusted to the extent that it is reviewed in a pull request, but a
  // public page should not be one bad paste away from executing something.
  const nasty = renderEntry({ id: 'x', problem: '<script>alert(1)</script>', symptom: 's', cause: 'c', fix: 'f', isWorkaround: false });
  assert.doesNotMatch(nasty, /<script>/);
  assert.match(nasty, /&lt;script&gt;/);
});

test('a malformed entry renders as broken rather than as partial guidance', async () => {
  const { renderEntry } = await entriesModule;
  const html = renderEntry({ id: 'missing-fix', problem: 'A problem', symptom: 's', cause: 'c', isWorkaround: false });
  assert.match(html, /entry-invalid/);
  assert.match(html, /fix is required/);
  assert.doesNotMatch(html, /data-field="symptom"/, 'no field is rendered from an unusable record');
});

// ------------------------------------------------------------------------ page wiring

test('both pages are wired to their data files and degrade without JavaScript', () => {
  const offersPage = read('web/pools/ai-d-kit/free-stuff-in-promotions/index.html');
  assert.match(offersPage, /data-offers-app/);
  assert.match(offersPage, /data-offers-src="offers\.json"/);
  assert.match(offersPage, /ai-kit-offers\.mjs/);
  for (const hook of ['data-offers-active', 'data-offers-standing', 'data-offers-unverified', 'data-offers-archive', 'data-offers-invalid']) {
    assert.ok(offersPage.includes(hook), `offers page has ${hook}`);
  }
  // Never a blank page that reads as "no offers".
  assert.match(offersPage, /<noscript>/);
  assert.match(offersPage, /not because there are no offers/);
  assert.match(offersPage, /UTC/, 'the page states the timezone its dates are compared in');
  assert.match(offersPage, /90 days/, 'the page states the staleness threshold');
  // The upstream feed is present but can never be read as a verified list.
  assert.match(offersPage, /data-drop-feed/);
  assert.match(offersPage, /none of them has been verified for this page/);

  const troubleshooting = read('web/pools/ai-d-kit/troubleshooting/index.html');
  assert.match(troubleshooting, /data-entries-app/);
  assert.match(troubleshooting, /data-entries-src="entries\.json"/);
  assert.match(troubleshooting, /ai-kit-troubleshooting\.mjs/);
  // The 108-entry static record is the JS-off fallback, so it must stay in the markup.
  assert.equal((troubleshooting.match(/class="troubleshooting-entry"/g) || []).length, 108);

  const pool = read('web/pools/ai-d-kit/index.html');
  assert.match(pool, /href="\/web\/pools\/ai-d-kit\/troubleshooting\/"/);
  assert.match(pool, /href="\/web\/pools\/ai-d-kit\/free-stuff-in-promotions\/"/);
});
