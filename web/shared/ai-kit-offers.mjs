/**
 * The AI-d kit offer contract: schema, expiry, and the verification gate.
 *
 * WHY THE RULES LIVE HERE AND NOT IN A STYLESHEET
 * ----------------------------------------------
 * A page of plausible-but-dead free offers is worse than an empty page, because it
 * costs the reader their afternoon and then their trust. So the two rules that keep
 * the page honest are decisions made in this file, on the code path that chooses what
 * to emit:
 *
 *   1. RENDER-TIME EXPIRY. `expiresAt` is compared to today on every page load. A
 *      promotion past its date leaves the live list on its own, with no cron, no
 *      sweep, and nobody deleting a row. The page is correct tomorrow even if nobody
 *      opens it.
 *   2. UNVERIFIED IS A VISIBLE STATE. Nothing reaches the live list unless
 *      `verification.status === "VERIFIED"`. Unverified rows render through a
 *      different function, into a different, labelled section.
 *
 * The class names below are labels, not enforcement. `classifyOffer` decides the
 * bucket; `renderLiveOffer` is only ever called for the live buckets and
 * `renderNotLiveOffer` cannot emit the live class. A future edit that wants to show
 * an unverified row as live has to delete a branch, not add a CSS rule.
 *
 * TIMEZONE
 * --------
 * Every date in the data files is a plain calendar date (`YYYY-MM-DD`) with no time
 * and no offset, and every comparison is done as a UTC calendar day. "Today" is the
 * UTC date, so a reader in Auckland and a reader in Los Angeles are told the same
 * thing about the same offer. A promotion stays live through the whole of its
 * `expiresAt` day and drops out when the UTC date passes it — the generous reading,
 * because the alternative hides an offer that is still claimable.
 *
 * STALENESS
 * ---------
 * A standing tier has no expiry, so it cannot expire — but an unrechecked one is
 * still a claim about the past. Past `STALE_AFTER_DAYS` (90) it keeps its seat and
 * gains a visible STALE marker. It is deliberately not demoted: a standing tier that
 * was real in June is usually still real in October, and hiding it would trade a
 * stale-but-useful row for an empty page. The marker is the honest middle.
 *
 * WHERE THE THRESHOLD LIVES
 * -------------------------
 * The 90 days and the UTC rule are constants in this file rather than fields in
 * `offers.json`, because they are enforcement and the data file is the thing being
 * enforced against. A data file that carries its own staleness threshold can raise it.
 *
 * THE FILE IS A BARE ARRAY
 * ------------------------
 * `offers.json` is a JSON array of offer rows, which is the shape the schema in the
 * ticket implies and the shape `troubleshooting/entries.json` already uses. An object
 * wrapping the array under `offers` is also accepted, because the cost of guessing
 * wrong is a blank page and the cost of accepting both is one line.
 */

export const STALE_AFTER_DAYS = 90;
export const OFFER_KINDS = Object.freeze(['promotion', 'standing_tier']);
export const VERIFICATION_STATUSES = Object.freeze(['VERIFIED', 'UNVERIFIED']);

/** Buckets a row can land in. Only `live` is rendered as live; the renderer enforces it. */
export const OFFER_BUCKETS = Object.freeze(['live', 'expired', 'unverified', 'invalid']);

const DAY_MS = 86_400_000;
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function escapeHtml(value) {
  return asText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * A plain calendar date, strictly. `2026-13-40` matches the shape but is not a date,
 * and `new Date` would happily roll it over into next year, so the parsed value is
 * compared back against the text it came from.
 */
export function isPlainDate(value) {
  const text = asText(value);
  if (!PLAIN_DATE.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === text;
}

/** The current UTC calendar day as `YYYY-MM-DD`. */
export function utcToday(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10);
}

function dayNumber(plainDate) {
  return Math.floor(new Date(`${plainDate}T00:00:00Z`).getTime() / DAY_MS);
}

/** Whole UTC days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from, to) {
  return dayNumber(to) - dayNumber(from);
}

/** A date a reader can read, always rendered in UTC so it matches the comparison. */
export function formatDate(plainDate) {
  if (!isPlainDate(plainDate)) return 'no date recorded';
  return new Date(`${plainDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function safeUrl(value) {
  const url = asText(value);
  return /^https:\/\//i.test(url) ? url : '';
}

/**
 * Every way one row can be wrong, as a list of sentences. Returning problems rather
 * than throwing lets the validator report all of them in one run instead of making
 * Neo fix them one exception at a time.
 */
export function offerProblems(offer, index = 0) {
  const at = `offers[${index}]`;
  if (!offer || typeof offer !== 'object' || Array.isArray(offer)) return [`${at} is not an object`];
  const label = asText(offer.id) ? `offers[${index}] (${asText(offer.id)})` : at;
  const problems = [];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(asText(offer.id))) {
    problems.push(`${label}: id must be a kebab-case slug`);
  }
  for (const field of ['name', 'provider', 'summary']) {
    if (!asText(offer[field])) problems.push(`${label}: ${field} is required and must be a non-empty string`);
  }
  if (!safeUrl(offer.url)) problems.push(`${label}: url must be an https:// URL`);
  if (!OFFER_KINDS.includes(offer.kind)) {
    problems.push(`${label}: kind must be one of ${OFFER_KINDS.join(', ')}`);
  }

  // The conditional requirement is the whole point of having two kinds: a promotion
  // without an expiry date cannot be expired by the renderer, and a standing tier
  // without a last-verified date cannot be shown as stale. Either omission would
  // quietly defeat the mechanism, so neither is allowed through.
  if (offer.kind === 'promotion') {
    if (!isPlainDate(offer.expiresAt)) {
      problems.push(`${label}: expiresAt is required for kind "promotion" and must be YYYY-MM-DD`);
    }
  } else if (offer.kind === 'standing_tier') {
    if (!isPlainDate(offer.lastVerifiedAt)) {
      problems.push(`${label}: lastVerifiedAt is required for kind "standing_tier" and must be YYYY-MM-DD`);
    }
  }
  if (offer.expiresAt !== undefined && !isPlainDate(offer.expiresAt)) {
    problems.push(`${label}: expiresAt must be YYYY-MM-DD when present`);
  }
  if (offer.lastVerifiedAt !== undefined && !isPlainDate(offer.lastVerifiedAt)) {
    problems.push(`${label}: lastVerifiedAt must be YYYY-MM-DD when present`);
  }

  if (offer.example !== undefined && typeof offer.example !== 'boolean') {
    problems.push(`${label}: example must be true or false when present`);
  }

  const verification = offer.verification;
  if (!verification || typeof verification !== 'object' || Array.isArray(verification)) {
    problems.push(`${label}: verification is required and must be an object`);
  } else {
    if (!VERIFICATION_STATUSES.includes(verification.status)) {
      problems.push(`${label}: verification.status must be one of ${VERIFICATION_STATUSES.join(', ')}`);
    }
    if (!isPlainDate(verification.checkedAt)) {
      problems.push(`${label}: verification.checkedAt is required and must be YYYY-MM-DD`);
    }
    for (const field of ['checkedBy', 'observed']) {
      if (!asText(verification[field])) {
        problems.push(`${label}: verification.${field} is required and must be a non-empty string`);
      }
    }
  }
  return problems;
}

/**
 * The rows in a parsed `offers.json`, accepting either the canonical bare array or an
 * object wrapping it under `offers`. Returns null — not an empty array — when the
 * payload is neither, so "unreadable" never collapses into "no offers".
 */
export function offerRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.offers)) return payload.offers;
  return null;
}

/** Problems with the file as a whole, including every row. */
export function offerDocumentProblems(payload) {
  const rows = offerRows(payload);
  if (rows === null) return ['offers.json must be a JSON array of offer rows'];

  const problems = [];
  const seen = new Set();
  rows.forEach((offer, index) => {
    problems.push(...offerProblems(offer, index));
    const id = asText(offer?.id);
    if (!id) return;
    if (seen.has(id)) problems.push(`offers[${index}]: duplicate id ${id}`);
    seen.add(id);
  });
  return problems;
}

/**
 * Decide the one bucket a row belongs to. This is the gate; everything downstream
 * only asks which bucket it got.
 *
 * Precedence, and why:
 *   invalid   — a malformed row is never guessed at. It renders visibly broken.
 *   expired   — a passed date wins over verification state, because "this window
 *               closed" tells the reader more than "nobody checked it", and a passed
 *               date can never become live again.
 *   unverified— the hard rule. No verification record, no live list, whatever the dates.
 *   live      — what is left.
 */
export function classifyOffer(offer, { now = new Date(), staleAfterDays = STALE_AFTER_DAYS } = {}) {
  const problems = offerProblems(offer);
  const today = utcToday(now);
  if (problems.length > 0) {
    return { bucket: 'invalid', stale: false, problems, dateLabel: 'unusable record', reason: problems[0] };
  }

  if (offer.kind === 'promotion') {
    const remaining = daysBetween(today, offer.expiresAt);
    const dateLabel = `Expires ${formatDate(offer.expiresAt)}`;
    if (remaining < 0) {
      return {
        bucket: 'expired',
        stale: false,
        problems,
        dateLabel: `Expired ${formatDate(offer.expiresAt)}`,
        reason: `expired ${Math.abs(remaining)} day(s) ago`,
      };
    }
    if (offer.verification.status !== 'VERIFIED') {
      return { bucket: 'unverified', stale: false, problems, dateLabel, reason: 'no verification record' };
    }
    return { bucket: 'live', stale: false, problems, dateLabel, reason: `${remaining} day(s) left` };
  }

  // standing_tier
  const age = daysBetween(offer.lastVerifiedAt, today);
  const dateLabel = `Last verified ${formatDate(offer.lastVerifiedAt)}`;
  if (offer.verification.status !== 'VERIFIED') {
    return { bucket: 'unverified', stale: age > staleAfterDays, problems, dateLabel, reason: 'no verification record' };
  }
  return {
    bucket: 'live',
    stale: age > staleAfterDays,
    problems,
    dateLabel,
    reason: age > staleAfterDays ? `not rechecked for ${age} days` : `rechecked ${age} day(s) ago`,
  };
}

/** Sort the whole file into buckets, preserving file order inside each. */
export function groupOffers(payload, { now = new Date() } = {}) {
  const rows = offerRows(payload) ?? [];
  const groups = { live: [], expired: [], unverified: [], invalid: [] };
  for (const offer of rows) {
    const state = classifyOffer(offer, { now, staleAfterDays: STALE_AFTER_DAYS });
    groups[state.bucket].push({ offer, state });
  }
  return {
    ...groups,
    livePromotions: groups.live.filter((row) => row.offer.kind === 'promotion'),
    liveStandingTiers: groups.live.filter((row) => row.offer.kind === 'standing_tier'),
    // Seed rows announce themselves. Nobody has to remember to take a banner down:
    // when the last `example: true` row leaves the file, the banner and the per-card
    // stamps go with it.
    examples: rows.filter((offer) => offer?.example === true).length,
    staleAfterDays: STALE_AFTER_DAYS,
    unreadable: offerRows(payload) === null,
    today: utcToday(now),
  };
}

function offerLink(offer) {
  const url = safeUrl(offer.url);
  return url
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Open the offer page ↗</a>`
    : '<span>No https link recorded</span>';
}

function card(classes, badge, offer, state, extra = '') {
  const example = offer.example === true
    ? '<p class="offer-detail offer-example-note">EXAMPLE ROW — a seed fixture, not a real offer. Do not follow the link expecting credits.</p>'
    : '';
  return [
    `<article class="offer-card ${classes}${offer.example === true ? ' offer-example' : ''}">`,
    '<div class="offer-card-head">',
    `<span class="offer-state">${badge}</span>`,
    `<span>${escapeHtml(offer.provider)}</span>`,
    '</div>',
    `<h3>${escapeHtml(offer.name)}</h3>`,
    example,
    `<p>${escapeHtml(offer.summary)}</p>`,
    // Every rendered row carries its own date. A date that only exists in the JSON
    // does not help the reader decide whether to spend an afternoon on this.
    `<p class="offer-detail"><strong>${escapeHtml(state.dateLabel)}</strong> · ${escapeHtml(state.reason)}</p>`,
    extra,
    `<p class="offer-link">${offerLink(offer)}</p>`,
    '</article>',
  ].join('');
}

/**
 * Render a live row. Only ever called with rows from the live buckets — see
 * `renderOffersInto`, which picks the function from the bucket name and never from
 * anything on the row itself.
 */
export function renderLiveOffer({ offer, state }) {
  const stale = state.stale
    ? '<p class="offer-detail offer-stale-note">STALE — past the recheck window. Still listed, but confirm it yourself before relying on it.</p>'
    : '';
  return card(`offer-live${state.stale ? ' offer-stale' : ''}`, state.stale ? 'LIVE · STALE' : 'LIVE', offer, state, stale);
}

/**
 * Render a row that is not live. There is no argument by which this function emits
 * `offer-live`, which is the point: the live styling is unreachable from here.
 */
export function renderNotLiveOffer({ offer, state }, bucket) {
  const badge = { expired: 'EXPIRED', unverified: 'UNVERIFIED', invalid: 'BROKEN RECORD' }[bucket] ?? 'NOT LIVE';
  if (bucket === 'invalid') {
    const list = state.problems.map((problem) => `<li>${escapeHtml(problem)}</li>`).join('');
    return [
      '<article class="offer-card offer-invalid">',
      `<div class="offer-card-head"><span class="offer-state">${badge}</span><span>${escapeHtml(offer?.provider) || 'unknown provider'}</span></div>`,
      `<h3>${escapeHtml(offer?.name) || 'Unusable offer record'}</h3>`,
      '<p>This row does not match the offer schema, so it is shown as broken instead of being rendered as an offer.</p>',
      `<ul class="offer-problems">${list}</ul>`,
      '</article>',
    ].join('');
  }
  const note = bucket === 'unverified'
    ? '<p class="offer-detail">Nobody has confirmed this one. It is listed here so the queue is visible, and it cannot appear in the live list until someone checks it and records what they saw.</p>'
    : '<p class="offer-detail">Kept as history. It left the live list by itself when its date passed.</p>';
  return card(`offer-${bucket}`, badge, offer, state, note);
}

function renderRows(container, rows, bucket, emptyMessage) {
  if (!container) return;
  if (rows.length === 0) {
    container.innerHTML = `<p class="offer-empty">${escapeHtml(emptyMessage)}</p>`;
    return;
  }
  container.innerHTML = rows
    .map((row) => (bucket === 'live' ? renderLiveOffer(row) : renderNotLiveOffer(row, bucket)))
    .join('');
}

/** Paint a parsed offers file into the page. Returns the grouping, for tests. */
export function renderOffersInto(root, payload, { now = new Date() } = {}) {
  const grouped = groupOffers(payload, { now });
  if (!root) return grouped;
  // A payload that is not an array of rows is a read failure, not an empty list, and
  // is raised the same way a 404 is. Falling through here would paint "no offers".
  if (grouped.unreadable) throw new Error('offers_payload_not_an_array');

  const seedBanner = root.querySelector('[data-offers-seed-banner]');
  if (seedBanner) seedBanner.hidden = grouped.examples === 0;

  const status = root.querySelector('[data-offers-status]');
  if (status) {
    status.textContent = [
      `Computed from offers.json on page load, ${grouped.today} (UTC):`,
      `${grouped.livePromotions.length} live promotion(s),`,
      `${grouped.liveStandingTiers.length} live standing tier(s),`,
      `${grouped.unverified.length} awaiting verification,`,
      `${grouped.expired.length} expired and withheld from the live list,`,
      `${grouped.invalid.length} broken record(s).`,
      `Standing tiers are marked stale after ${grouped.staleAfterDays} days.`,
    ].join(' ');
  }

  renderRows(root.querySelector('[data-offers-active]'), grouped.livePromotions, 'live', 'No verified promotion is inside its window today.');
  renderRows(root.querySelector('[data-offers-standing]'), grouped.liveStandingTiers, 'live', 'No verified standing tier is listed.');
  renderRows(root.querySelector('[data-offers-unverified]'), grouped.unverified, 'unverified', 'Nothing is waiting for verification.');
  renderRows(root.querySelector('[data-offers-archive]'), grouped.expired, 'expired', 'No offer has expired out of the list yet.');

  const invalid = root.querySelector('[data-offers-invalid]');
  const invalidSection = root.querySelector('[data-offers-invalid-section]');
  // A malformed row must look broken, not absent. The section only appears when
  // there is something wrong, and then it is impossible to miss.
  if (invalidSection) invalidSection.hidden = grouped.invalid.length === 0;
  if (grouped.invalid.length > 0) renderRows(invalid, grouped.invalid, 'invalid', '');

  return grouped;
}

export async function fetchOffers(url, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('offers_fetch_unavailable');
  const response = await fetchImpl(url, { headers: { accept: 'application/json' }, cache: 'no-cache' });
  if (!response.ok) throw new Error(`offers_http_${response.status}`);
  return response.json();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-offers-app]');
  if (root) {
    const source = root.getAttribute('data-offers-src') || 'offers.json';
    fetchOffers(source)
      .then((payload) => renderOffersInto(root, payload))
      .catch((error) => {
        // Failing to read the file must not look like "there are no offers today".
        // The static markup underneath already says the list could not be read, so
        // all that is needed here is to stop claiming it is loading and reveal it.
        const status = root.querySelector('[data-offers-status]');
        if (status) status.textContent = `offers.json could not be read (${error.message}). Nothing is shown as live.`;
        const failure = root.querySelector('[data-offers-error]');
        if (failure) failure.hidden = false;
        for (const container of root.querySelectorAll('[data-offers-active],[data-offers-standing],[data-offers-unverified],[data-offers-archive]')) {
          container.innerHTML = '<p class="offer-empty">Not loaded — the offer file could not be read. This is not the same as "none".</p>';
        }
        console.warn('AI-d kit offers could not be rendered', error);
      });
  }
}
