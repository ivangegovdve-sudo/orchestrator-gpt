/**
 * Renderer for the AI-d kit "Free stuff in promotions" surface.
 *
 * The source of truth is the read-only promotion endpoint owned by The Drop's
 * database. This module deliberately contains no mail, newsletter, or story
 * ingestion code. It only applies the safety rule that an unknown/expired offer
 * is never rendered as active, then renders the endpoint's reviewed output.
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

export function renderOffer(offer, state) {
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
  const stateLabel = escapeHtml(state.toUpperCase());
  const stateGlyph = state === 'active' ? '●' : state === 'expired' ? '×' : '?';
  return `<article class="offer-row offer-card offer-${escapeHtml(state)}" data-offer-state="${escapeHtml(state)}"><details class="offer-disclosure"><summary class="offer-summary"><span class="offer-state" title="${stateLabel}"><span class="offer-state-glyph" aria-hidden="true">${stateGlyph}</span><span class="offer-state-label">${stateLabel}</span></span><span class="offer-provider">${provider}</span><span class="offer-title">${title}</span></summary><div class="offer-details"><p class="offer-description">${summary}</p><p class="offer-detail">${escapeHtml(detail)}</p>${reviewNote}<p class="offer-link">${link}</p></div></details></article>`;
}

function renderSection(container, rows, state, emptyMessage) {
  container.innerHTML = rows.length ? rows.map((offer) => renderOffer(offer, state)).join('') : `<p class="offer-empty">${escapeHtml(emptyMessage)}</p>`;
}

export function renderOfferPayload(payload, root, now = new Date()) {
  if (!root) return normalizeOfferPayload(payload, now);
  const normalized = normalizeOfferPayload(payload, now);
  const status = root.querySelector('[data-offers-status]');
  const active = root.querySelector('[data-offers-active]');
  const standing = root.querySelector('[data-offers-standing]');
  const unverified = root.querySelector('[data-offers-unverified]');
  const archive = root.querySelector('[data-offers-archive]');
  if (status) status.textContent = `Drops read path · ${normalized.active.length} active, ${normalized.unverified.length} unverified, ${normalized.archive.length} archived`;
  if (active) renderSection(active, normalized.active.filter((offer) => offer.kind === 'time_boxed'), 'active', 'No reviewed time-boxed promotions are active right now.');
  if (standing) renderSection(standing, normalized.active.filter((offer) => offer.kind === 'standing_tier'), 'active', 'No standing tiers have a current verification.');
  if (unverified) renderSection(unverified, normalized.unverified, 'unverified', 'Nothing is waiting for verification.');
  if (archive) renderSection(archive, normalized.archive, 'expired', 'The archive is empty.');
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
  const root = document.querySelector('[data-offers-app]');
  if (root) {
    const endpoint = root.getAttribute('data-endpoint');
    const status = root.querySelector('[data-offers-status]');
    fetchOfferPayload(endpoint)
      .then((payload) => renderOfferPayload(payload, root))
      .catch((error) => {
        if (status) status.textContent = 'Drops read path unavailable; no promotion is shown as active.';
        const message = root.querySelector('[data-offers-error]');
        if (message) message.hidden = false;
        console.warn('AI-d kit promotion read path unavailable', error);
      });
  }
}
