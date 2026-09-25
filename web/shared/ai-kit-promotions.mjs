/**
 * Renderer for the upstream candidate feed on the AI-d kit offers page.
 *
 * The source is the read-only promotion endpoint owned by The Drop's database. This
 * module deliberately contains no mail, newsletter, or story ingestion code. It only
 * applies the safety rule that an unknown/expired offer is never rendered as active,
 * then renders the endpoint's reviewed output.
 *
 * WHAT CHANGED, AND WHY IT IS NO LONGER THE PAGE'S SOURCE OF TRUTH
 * ---------------------------------------------------------------
 * This used to own the whole page. It now owns one labelled section near the bottom:
 * candidates, not offers. The live lists come from `offers.json` in this repo, via
 * `ai-kit-offers.mjs`, because a row in a repo file arrives with a verification record
 * attached, gets read by a human in a pull request, and can be corrected by whoever
 * spots the problem. A row from an endpoint has none of those properties — The Drop's
 * editorial layer is not the same thing as someone opening the offer page and writing
 * down what they saw, and this page's promise to the reader is the second thing.
 *
 * So these rows are a work queue: what to go and verify. Nothing here is presented as
 * live. Its DOM hooks are `data-drop-*` so that it cannot paint into the live lists
 * even by accident.
 */

export const OFFER_STATES = Object.freeze(['active', 'expired', 'unverified']);

const OFFER_KINDS = new Set(['time_boxed', 'standing_tier']);

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return asText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeUrl(value) {
  const url = asText(value);
  return /^https:\/\//i.test(url) ? url : '';
}

function parsedDate(value) {
  const text = asText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cadenceExpired(offer, now) {
  const verified = parsedDate(offer.last_verified_at);
  const cadence = Number(offer.recheck_cadence_days);
  if (!verified || !Number.isFinite(cadence) || cadence <= 0) return true;
  return verified.getTime() + cadence * 86_400_000 <= now.getTime();
}

/**
 * Apply client-side safety to one server row. The server performs the same
 * transition before reading, but the duplicate check prevents a stale cache
 * from putting an expired or unknown offer back on the public page.
 */
export function effectiveOfferState(offer, now = new Date()) {
  if (!offer || !OFFER_KINDS.has(offer.kind)) return 'unverified';
  const status = OFFER_STATES.includes(offer.status) ? offer.status : 'unverified';
  if (offer.kind === 'time_boxed') {
    const expiry = parsedDate(offer.expires_at);
    if (!expiry) return 'unverified';
    if (expiry.getTime() <= now.getTime()) return 'expired';
    return status === 'active' ? 'active' : status;
  }
  // A standing tier has no expiry. It is still unsafe when its verification
  // date/cadence is absent or overdue.
  if (cadenceExpired(offer, now)) return 'unverified';
  return status === 'active' ? 'active' : status;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Normalize the endpoint contract into three explicit state buckets. Rows
 * marked unreviewed/rejected by the Drops editorial layer never become active.
 */
export function normalizeOfferPayload(payload, now = new Date()) {
  const rows = [
    ...asArray(payload?.active),
    ...asArray(payload?.standing_tiers),
    ...asArray(payload?.unverified),
    ...asArray(payload?.archive),
  ];
  const seen = new Set();
  const result = { active: [], expired: [], unverified: [], archive: [] };

  for (const offer of rows) {
    const id = asText(offer?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const state = effectiveOfferState(offer, now);
    const reviewed = asText(offer?.review_status) === 'approved';
    const normalized = { ...offer, id, state };
    if (state === 'active' && reviewed && asText(offer?.offer_decision) === 'free_offer') result.active.push(normalized);
    else if (state === 'expired') {
      result.expired.push(normalized);
      result.archive.push(normalized);
    } else {
      result.unverified.push(normalized);
    }
  }

  // The endpoint's archive can include rows not present in the other buckets;
  // keep those rows visible as history while applying the same date guard.
  for (const offer of asArray(payload?.archive)) {
    const id = asText(offer?.id);
    if (!id || result.archive.some((row) => row.id === id)) continue;
    const state = effectiveOfferState(offer, now);
    const normalized = { ...offer, id, state };
    if (state === 'expired') result.archive.push(normalized);
    else if (state === 'unverified') result.unverified.push(normalized);
  }
  return result;
}

function dateLabel(value) {
  const date = parsedDate(value);
  return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'date not verified';
}

function renderOffer(offer, state, stateLabel = state) {
  const url = safeUrl(offer.url);
  const title = escapeHtml(offer.title || 'Untitled offer');
  const summary = escapeHtml(offer.summary || 'No public description has been reviewed yet.');
  const provider = escapeHtml(offer.provider || offer.source_name || 'Source not named');
  const link = url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Open source ↗</a>` : '<span>No verified source link</span>';
  const detail = offer.kind === 'standing_tier'
    ? `Last verified ${dateLabel(offer.last_verified_at)} · recheck every ${escapeHtml(String(offer.recheck_cadence_days || '—'))} days`
    : `Expiry ${dateLabel(offer.expires_at)}`;
  const reviewNote = offer.review_status === 'evidence_fixture'
    ? '<p class="offer-detail">Withdrawal evidence · not published as an active offer</p>'
    : '';
  return `<article class="offer-card offer-${escapeHtml(state)}"><div class="offer-card-head"><span class="offer-state">${escapeHtml(stateLabel.toUpperCase())}</span><span>${provider}</span></div><h3>${title}</h3><p>${summary}</p><p class="offer-detail">${escapeHtml(detail)}</p>${reviewNote}<p class="offer-link">${link}</p></article>`;
}

/**
 * Paint the upstream feed into the candidate section. Every row renders with the
 * `candidate` class and a CANDIDATE badge regardless of what the endpoint says about
 * it, because nothing that arrives here has been verified for this page. The `active`
 * styling is not reachable from this function.
 */
export function renderCandidatePayload(payload, root, now = new Date()) {
  const normalized = normalizeOfferPayload(payload, now);
  if (!root) return normalized;
  // Upstream "active" rows are the ones worth checking first; expired upstream rows are
  // not worth anyone's afternoon, so the queue is the active and unverified ones.
  const queue = [...normalized.active, ...normalized.unverified];
  const status = root.querySelector('[data-drop-status]');
  if (status) {
    status.textContent = `${queue.length} upstream candidate(s) from The Drop, none of them verified for this page. ${normalized.archive.length} upstream row(s) have already expired and are not listed.`;
  }
  const container = root.querySelector('[data-drop-candidates]');
  if (container) {
    container.innerHTML = queue.length
      ? queue.map((offer) => renderOffer(offer, 'candidate', 'candidate · unverified here')).join('')
      : '<p class="offer-empty">The upstream feed has nothing to check right now.</p>';
  }
  return normalized;
}

export async function fetchOfferPayload(endpoint, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('promotion_read_path_unavailable');
  const response = await fetchImpl(endpoint, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`promotion_read_path_http_${response.status}`);
  const payload = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('promotion_read_path_invalid');
  return payload;
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-drop-feed]');
  if (root) {
    const endpoint = root.getAttribute('data-endpoint');
    fetchOfferPayload(endpoint)
      .then((payload) => renderCandidatePayload(payload, root))
      .catch((error) => {
        // The live lists come from offers.json, so this failing costs the reader a work
        // queue and nothing else. Say so rather than implying the page is broken.
        const status = root.querySelector('[data-drop-status]');
        if (status) status.textContent = 'The upstream Drop feed is unavailable. The verified lists above are unaffected — they come from this repo, not from the feed.';
        const container = root.querySelector('[data-drop-candidates]');
        if (container) container.innerHTML = '<p class="offer-empty">Not loaded — the upstream feed could not be read.</p>';
        console.warn('AI-d kit upstream candidate feed unavailable', error);
      });
  }
}
