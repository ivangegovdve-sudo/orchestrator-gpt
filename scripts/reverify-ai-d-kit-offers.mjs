/**
 * Re-verification for the AI-d kit offers file.
 *
 * WHAT THIS IS FOR
 * ----------------
 * Render-time expiry (`ai-kit-offers.mjs`) handles offers that announce their own death:
 * a promotion past `expiresAt` leaves the live list on its own. This file handles the
 * other half — the offers that die quietly. A standing free tier never expires, but it
 * shrinks, moves behind a login wall, or turns into a pricing page, and the row on the
 * page keeps saying what was true in June. A promotion's stated end date can also simply
 * be wrong.
 *
 * THE RULE THIS FILE EXISTS TO PROTECT
 * ------------------------------------
 * Never write a `checkedAt` for a page that was not actually opened. A routine that
 * refreshes dates without looking is worse than no routine, because it launders stale
 * data into fresh-looking data and the page then lies with more confidence than before.
 *
 * So the work is split, and the split is enforced here rather than requested in prose:
 *
 *   PROBE (automated, this script). Opens every `url` with one GET and classifies what
 *   the server said into exactly three verdicts. It can DEMOTE a row to UNVERIFIED on
 *   hard evidence, because a 404 is something the script genuinely observed. It can
 *   never PROMOTE a row and never refresh a date on its own.
 *
 *   READ (a person or agent, then `--apply --observations`). Refreshing `checkedAt`,
 *   `observed`, `lastVerifiedAt` or `expiresAt` requires an observation record naming
 *   what was seen on the page this time. No observation, no new date. The script
 *   cross-checks each observation against this run's probe, so an observation for a URL
 *   that could not be opened has to say so explicitly (`openedManually: true`).
 *
 * WHY 403 AND A TIMEOUT DO NOT DEMOTE
 * -----------------------------------
 * A bot-blocking CDN and a withdrawn offer look identical from a fetch: both are a
 * non-200. `oracle.com/cloud/free` already returns 403 to this repo's fetches while the
 * offer is entirely real. Demoting on a soft signal would fill the unverified section
 * with live offers, which trains the reader to ignore the distinction the page is built
 * on. Soft signals are reported as `inconclusive` and handed to a human instead.
 *
 * NEVER TRANSACT
 * --------------
 * One GET per URL, no cookies, no credentials, no bodies, no form submissions, no
 * signups. `probeOffer` has no code path that sends anything other than a GET.
 *
 * TIMEZONE
 * --------
 * UTC, the same as the renderer. Dates written here are plain `YYYY-MM-DD` UTC calendar
 * days, so a date written by a firing at 23:00 in Amsterdam means the same day to the
 * page as it does to the person who wrote it.
 *
 * USAGE
 *   node scripts/reverify-ai-d-kit-offers.mjs                      # probe, report, write nothing
 *   node scripts/reverify-ai-d-kit-offers.mjs --report-out r.json   # same, plus machine report
 *   node scripts/reverify-ai-d-kit-offers.mjs --only id-a,id-b      # probe a subset
 *   node scripts/reverify-ai-d-kit-offers.mjs --apply               # write demotions only
 *   node scripts/reverify-ai-d-kit-offers.mjs --apply --observations obs.json
 *
 * Exit 0 = ran, nothing needs a human. Exit 1 = ran, something needs a human (listed).
 * Exit 2 = could not run (unreadable file, bad arguments, refused write).
 */

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  classifyOffer,
  daysBetween,
  isPlainDate,
  offerDocumentProblems,
  offerRows,
  utcToday,
} from '../web/shared/ai-kit-offers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const OFFERS_PATH = 'web/pools/ai-d-kit/free-stuff-in-promotions/offers.json';
export const LOG_PATH = 'web/pools/ai-d-kit/free-stuff-in-promotions/reverification-log.ndjson';

/**
 * How long a row may go unread before a firing asks a human to open it again.
 *
 * Promotions are the volatile kind — a stated end date can be wrong and the window can
 * be pulled early — so they come up every fortnight. Standing tiers come up monthly,
 * which is a third of the renderer's 90-day STALE_AFTER_DAYS: a row only reaches the
 * reader marked STALE if this routine has been broken for two whole cycles, and then the
 * page says so out loud rather than the data quietly aging.
 */
export const DUE_AFTER_DAYS = Object.freeze({ promotion: 14, standing_tier: 30 });

/** An honest UA. Sites that block it produce `inconclusive`, which costs a human read, not a row. */
export const USER_AGENT =
  'sdforest-ai-d-kit-reverifier/1.0 (+https://sdforest.site/web/pools/ai-d-kit/; read-only link check)';

export const REQUEST_TIMEOUT_MS = 20_000;
export const PROBE_CONCURRENCY = 4;

/** `checkedBy` for a row the probe demoted. Not a person's name — the probe did this, not Neo. */
export const PROBE_AUTHOR = 'Re-verification probe (automated)';

/** Verdicts a probe can reach. Only `gone` is allowed to change the file on its own. */
export const PROBE_VERDICTS = Object.freeze(['reachable', 'gone', 'inconclusive']);

const LOGIN_SHAPED = /(^|\/)(login|log-in|signin|sign-in|signup|sign-up|register|auth|authorize|oauth|sso)(\/|$)/i;
const PRICING_SHAPED = /(^|\/)(pricing|plans|upgrade|billing|buy|checkout|subscribe|store)(\/|$)/i;

/** Text too short to be a page. A 200 with nothing in it is a failure dressed as a success. */
const MIN_BODY_TEXT = 200;

/** An `observed` note has to be an observation. These are not observations. */
const NON_OBSERVATIONS = [
  'ok',
  'fine',
  'good',
  'checked',
  'still there',
  'looks fine',
  'looks good',
  'no change',
  'unchanged',
  'verified',
  'confirmed',
];
const MIN_OBSERVED_CHARS = 40;

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function urlPath(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return '';
  }
}

/** Strip tags and scripts. Crude on purpose: this is used for presence checks, not display. */
export function visibleText(html) {
  return asText(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Turn one HTTP outcome into a verdict plus the literal evidence for it.
 *
 * The evidence string is what ends up in `verification.observed` when a row is demoted,
 * so it says what the server said, not what the script concluded.
 */
export function classifyProbe({ requestedUrl, finalUrl, status, error, bodyText = '' }) {
  const ended = asText(finalUrl) || asText(requestedUrl);
  const where = ended && ended !== requestedUrl ? ` (redirected to ${ended})` : '';

  if (error) {
    return {
      verdict: 'inconclusive',
      evidence: `GET ${requestedUrl} failed before a response arrived: ${error}. That is not evidence the offer is gone.`,
    };
  }

  if (status === 404 || status === 410) {
    return { verdict: 'gone', evidence: `GET ${requestedUrl} returned HTTP ${status}${where}. The page the row points at is not there.` };
  }

  if (status === 401 || status === 403 || status === 429 || status >= 500) {
    return {
      verdict: 'inconclusive',
      evidence: `GET ${requestedUrl} returned HTTP ${status}${where}. A block, a rate limit or an outage looks the same as a withdrawal from here, so this does not demote the row.`,
    };
  }

  if (status < 200 || status >= 400) {
    return { verdict: 'inconclusive', evidence: `GET ${requestedUrl} returned HTTP ${status}${where}, which this script does not know how to read.` };
  }

  const requestedPath = urlPath(requestedUrl);
  const finalPath = urlPath(ended);
  const moved = finalPath !== '' && finalPath !== requestedPath;

  // Only a row that was NOT already pointing at a login or pricing URL can be demoted
  // for arriving at one. Plenty of real free tiers are documented on a /pricing page.
  if (moved && LOGIN_SHAPED.test(finalPath) && !LOGIN_SHAPED.test(requestedPath)) {
    return { verdict: 'gone', evidence: `GET ${requestedUrl} redirected to a sign-in URL, ${ended}. The offer page is now behind a login wall.` };
  }
  if (moved && PRICING_SHAPED.test(finalPath) && !PRICING_SHAPED.test(requestedPath)) {
    return { verdict: 'gone', evidence: `GET ${requestedUrl} redirected to a pricing URL, ${ended}. The free offer page now lands on paid plans.` };
  }

  if (bodyText.length < MIN_BODY_TEXT) {
    return {
      verdict: 'inconclusive',
      evidence: `GET ${requestedUrl} returned HTTP ${status}${where} with only ${bodyText.length} characters of text — probably a shell rendered by JavaScript. Somebody has to open it.`,
    };
  }

  return { verdict: 'reachable', evidence: `GET ${requestedUrl} returned HTTP ${status}${where} with ${bodyText.length} characters of text.` };
}

/**
 * Cheap hints for whoever reads the page next. Deliberately advisory: "the provider name
 * is no longer on the page" is a reason to look, never a reason to demote, because a
 * JavaScript-rendered page routinely fails all of these while being perfectly fine.
 */
export function bodySignals(offer, bodyText) {
  if (!bodyText) return [];
  const haystack = bodyText.toLowerCase();
  const signals = [];
  if (asText(offer.provider) && !haystack.includes(asText(offer.provider).toLowerCase())) {
    signals.push(`the provider name "${offer.provider}" does not appear in the page text`);
  }
  if (/\b(no longer available|has ended|promotion has ended|offer has ended|discontinued|sunset|deprecated)\b/.test(haystack)) {
    signals.push('the page text contains an ended/withdrawn phrase — read it before trusting the row');
  }
  if (/\b(free tier|free plan|free credits?|no cost|always free)\b/.test(haystack) === false) {
    signals.push('no "free tier"/"free credits" wording found in the page text');
  }
  if (offer.kind === 'promotion' && isPlainDate(offer.expiresAt) && !haystack.includes(offer.expiresAt)) {
    const readable = new Date(`${offer.expiresAt}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    if (!haystack.includes(readable.toLowerCase())) {
      signals.push(`the stated expiresAt ${offer.expiresAt} is not written on the page — confirm the end date`);
    }
  }
  return signals;
}

/** One read-only GET. No cookies, no credentials, no request body, ever. */
export async function probeOffer(offer, { fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const requestedUrl = asText(offer.url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetchImpl(requestedUrl, {
      method: 'GET',
      redirect: 'follow',
      credentials: 'omit',
      signal: controller.signal,
      headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': USER_AGENT },
    });
    const html = await response.text().catch(() => '');
    const bodyText = visibleText(html);
    const classified = classifyProbe({
      requestedUrl,
      finalUrl: response.url,
      status: response.status,
      bodyText,
    });
    return {
      id: offer.id,
      requestedUrl,
      finalUrl: response.url || requestedUrl,
      status: response.status,
      ...classified,
      signals: classified.verdict === 'reachable' ? bodySignals(offer, bodyText) : [],
      ms: Date.now() - started,
    };
  } catch (error) {
    const reason = error?.name === 'AbortError' ? `no response within ${timeoutMs}ms` : error?.message || String(error);
    return {
      id: offer.id,
      requestedUrl,
      finalUrl: requestedUrl,
      status: null,
      ...classifyProbe({ requestedUrl, error: reason }),
      signals: [],
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe many rows with a small pool, so a sweep does not look like a scrape. */
export async function probeOffers(rows, { concurrency = PROBE_CONCURRENCY, ...options } = {}) {
  const results = new Array(rows.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, rows.length)) }, async () => {
    while (next < rows.length) {
      const index = next;
      next += 1;
      results[index] = await probeOffer(rows[index], options);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Which rows a human has to open this firing, and why. The probe covers every row; this
 * decides whose turn it is to be *read*, which is the expensive part.
 */
export function planReverification(payload, { now = new Date(), dueAfterDays = DUE_AFTER_DAYS } = {}) {
  const rows = offerRows(payload) ?? [];
  const today = utcToday(now);
  return rows.map((offer, index) => {
    const state = classifyOffer(offer, { now });
    if (state.bucket === 'invalid') {
      return { index, id: asText(offer?.id) || `offers[${index}]`, kind: offer?.kind ?? null, due: false, reason: 'malformed row — fix it with the validator, not with a page read', age: null };
    }
    const checkedAt = offer.verification.checkedAt;
    const age = daysBetween(checkedAt, today);
    const limit = dueAfterDays[offer.kind] ?? DUE_AFTER_DAYS.standing_tier;
    if (offer.verification.status !== 'VERIFIED') {
      return { index, id: offer.id, kind: offer.kind, due: true, reason: `UNVERIFIED since ${checkedAt} — re-read it and either record what you saw or leave it demoted`, age };
    }
    if (state.bucket === 'expired') {
      return { index, id: offer.id, kind: offer.kind, due: false, reason: `expired on ${offer.expiresAt} and already out of the live list`, age };
    }
    if (age >= limit) {
      return { index, id: offer.id, kind: offer.kind, due: true, reason: `last read ${age} days ago, ${offer.kind} limit is ${limit}`, age };
    }
    return { index, id: offer.id, kind: offer.kind, due: false, reason: `read ${age} days ago, inside the ${limit}-day window`, age };
  });
}

function truncate(value, max) {
  const text = asText(value);
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Keep the old record visible inside the new one. A demotion should not erase history. */
function withPrevious(note, verification) {
  const previous = truncate(verification?.observed, 240);
  if (!previous) return note;
  return `${note} Previously recorded ${asText(verification.checkedAt) || 'undated'} by ${asText(verification.checkedBy) || 'unknown'}: "${previous}"`;
}

/**
 * Apply the probe's own findings. This is the only automated write, it only ever moves a
 * row from VERIFIED to UNVERIFIED, and it only fires on a `gone` verdict.
 *
 * `lastVerifiedAt` is deliberately NOT advanced on a demotion: it records the last time
 * the offer was seen to be real, and a 404 is the opposite of that.
 */
export function applyProbeResults(rows, probes, { now = new Date() } = {}) {
  const today = utcToday(now);
  const byId = new Map(probes.map((probe) => [probe.id, probe]));
  const demotions = [];
  const next = rows.map((offer) => {
    const probe = byId.get(offer?.id);
    if (!probe || probe.verdict !== 'gone') return offer;
    if (offer.verification?.status !== 'VERIFIED') return offer;
    const observed = withPrevious(`Automated re-verification ${today}: ${probe.evidence} Demoted to UNVERIFIED by the probe, not deleted, so the change is visible on the page.`, offer.verification);
    demotions.push({ id: offer.id, evidence: probe.evidence, status: probe.status });
    return {
      ...offer,
      verification: { ...offer.verification, status: 'UNVERIFIED', checkedAt: today, checkedBy: PROBE_AUTHOR, observed },
    };
  });
  return { rows: next, demotions };
}

/** Problems with one observation record, as sentences. Same shape as `offerProblems`. */
export function observationProblems(observation, index = 0) {
  const at = `observations[${index}]`;
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) return [`${at} is not an object`];
  const label = asText(observation.id) ? `${at} (${asText(observation.id)})` : at;
  const problems = [];
  if (!asText(observation.id)) problems.push(`${label}: id is required and must match a row in offers.json`);
  const observed = asText(observation.observed);
  if (observed.length < MIN_OBSERVED_CHARS) {
    problems.push(`${label}: observed must be at least ${MIN_OBSERVED_CHARS} characters of what you actually saw on the page`);
  } else if (NON_OBSERVATIONS.includes(observed.toLowerCase().replace(/[.!]+$/, ''))) {
    problems.push(`${label}: "${observed}" is a verdict, not an observation — write down what the page said`);
  }
  if (observation.status !== undefined && observation.status !== 'VERIFIED' && observation.status !== 'UNVERIFIED') {
    problems.push(`${label}: status must be VERIFIED or UNVERIFIED when present`);
  }
  if (observation.expiresAt !== undefined && !isPlainDate(observation.expiresAt)) {
    problems.push(`${label}: expiresAt must be YYYY-MM-DD when present`);
  }
  if (observation.url !== undefined && !/^https:\/\//i.test(asText(observation.url))) {
    problems.push(`${label}: url must be an https:// URL when present`);
  }
  if (observation.openedManually !== undefined && typeof observation.openedManually !== 'boolean') {
    problems.push(`${label}: openedManually must be true or false when present`);
  }
  return problems;
}

/**
 * Apply human observations. Every refresh of a date goes through here, and every one of
 * them needs an observation naming what was seen.
 *
 * Refusals, and why each one exists:
 *   unknown id          — an observation for a row that is not in the file is a typo or a
 *                         stale worksheet, and applying it would write a date nowhere.
 *   probe said `gone`   — the machine got a 404 and the human says it is fine. One of the
 *                         two is wrong; guessing picks the wrong one half the time. Supply
 *                         a replacement `url` (which the CLI re-probes) or a demoting
 *                         `status`.
 *   probe inconclusive  — the URL could not be opened by this run, so the observation has
 *                         to claim `openedManually: true` before a date is written. That
 *                         is the whole "never write a checkedAt for a page nobody opened"
 *                         rule, expressed as a refusal rather than as a comment.
 *   probe was of some
 *   other URL           — the check is against the URL the observation is *claiming*, which
 *                         for a row being moved is the replacement, not the dead original.
 *                         An unprobed replacement needs `openedManually: true` like any
 *                         other page this run did not open.
 */
export function applyObservations(rows, observations, probes, { now = new Date(), checkedBy = 'Neo' } = {}) {
  const today = utcToday(now);
  const probeById = new Map(probes.map((probe) => [probe.id, probe]));
  const rowIndexById = new Map();
  rows.forEach((offer, index) => {
    if (asText(offer?.id)) rowIndexById.set(offer.id, index);
  });

  const next = rows.slice();
  const refreshed = [];
  const refused = [];

  observations.forEach((observation, index) => {
    const problems = observationProblems(observation, index);
    if (problems.length > 0) {
      refused.push({ id: asText(observation?.id) || `observations[${index}]`, why: problems.join('; ') });
      return;
    }
    const rowIndex = rowIndexById.get(observation.id);
    if (rowIndex === undefined) {
      refused.push({ id: observation.id, why: 'no row in offers.json has this id' });
      return;
    }
    const offer = next[rowIndex];
    const status = observation.status ?? 'VERIFIED';
    const changingUrl = asText(observation.url) && asText(observation.url) !== asText(offer.url);

    // The claim being recorded is about one specific page. For a row that is being moved
    // that page is the replacement URL, so a probe of the dead original says nothing
    // about it either way.
    const claimedUrl = changingUrl ? asText(observation.url) : asText(offer.url);
    const found = probeById.get(observation.id);
    const probe = found && asText(found.requestedUrl) === claimedUrl ? found : null;

    if (status === 'VERIFIED' && probe?.verdict === 'gone') {
      refused.push({
        id: observation.id,
        why: `this run's probe says the page is gone (${probe.evidence}) but the observation reports it live. Supply the working url in the observation, or set status UNVERIFIED.`,
      });
      return;
    }
    if (status === 'VERIFIED' && probe && probe.verdict === 'inconclusive' && observation.openedManually !== true) {
      refused.push({
        id: observation.id,
        why: `the probe could not open the page (${probe.evidence}). If you opened it by hand, say so with "openedManually": true; otherwise no date is written.`,
      });
      return;
    }
    if (status === 'VERIFIED' && !probe && observation.openedManually !== true) {
      refused.push({
        id: observation.id,
        why: `this run did not open ${claimedUrl}, so set "openedManually": true if you opened it yourself`,
      });
      return;
    }

    const manual = observation.openedManually === true;
    const observed = manual
      ? `${asText(observation.observed)} (Page opened by hand on ${today}; the automated probe did not get a usable response.)`
      : asText(observation.observed);

    const updated = {
      ...offer,
      ...(changingUrl ? { url: asText(observation.url) } : {}),
      verification: { ...offer.verification, status, checkedAt: today, checkedBy: asText(observation.checkedBy) || checkedBy, observed },
    };

    if (status === 'VERIFIED' && offer.kind === 'standing_tier') updated.lastVerifiedAt = today;
    if (offer.kind === 'promotion' && observation.expiresAt && observation.expiresAt !== offer.expiresAt) {
      updated.expiresAt = observation.expiresAt;
    }
    if (status === 'UNVERIFIED' && offer.verification?.status === 'VERIFIED') {
      // A human demotion keeps history the same way the probe's does.
      updated.verification.observed = withPrevious(observed, offer.verification);
    }

    next[rowIndex] = updated;
    refreshed.push({
      id: observation.id,
      status,
      urlChanged: changingUrl ? asText(observation.url) : null,
      expiresAtChanged: updated.expiresAt !== offer.expiresAt ? updated.expiresAt : null,
      openedManually: manual,
    });
  });

  return { rows: next, refreshed, refused };
}

/** The whole picture of one firing, in one object. Written to `--report-out` verbatim. */
export function buildReport({ payload, plan, probes, now = new Date() }) {
  const counts = probes.reduce((totals, probe) => ({ ...totals, [probe.verdict]: (totals[probe.verdict] ?? 0) + 1 }), {
    reachable: 0,
    gone: 0,
    inconclusive: 0,
  });
  const byId = new Map(probes.map((probe) => [probe.id, probe]));
  const attention = [];
  for (const probe of probes) {
    if (probe.verdict === 'gone') attention.push({ id: probe.id, why: 'probe says gone — will be demoted by --apply', detail: probe.evidence });
    else if (probe.verdict === 'inconclusive') attention.push({ id: probe.id, why: 'probe could not read it — open it by hand', detail: probe.evidence });
    else if (probe.signals.length > 0) attention.push({ id: probe.id, why: 'page read oddly — confirm it still matches the row', detail: probe.signals.join('; ') });
  }
  for (const row of plan) {
    if (!row.due) continue;
    if (attention.some((item) => item.id === row.id)) continue;
    attention.push({ id: row.id, why: 'due for a read', detail: row.reason });
  }
  return {
    ranAt: new Date(now).toISOString(),
    today: utcToday(now),
    rows: (offerRows(payload) ?? []).length,
    probed: probes.length,
    counts,
    dueForReading: plan.filter((row) => row.due).map((row) => row.id),
    attention,
    probes: probes.map((probe) => ({ ...probe, due: plan.find((row) => row.id === probe.id)?.due ?? false })),
    unprobed: plan.filter((row) => !byId.has(row.id)).map((row) => row.id),
  };
}

function serialize(rows) {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

async function readJson(file) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    throw new Error(`cannot read ${file}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
}

function parseArgs(argv) {
  const options = {
    offers: path.join(ROOT, OFFERS_PATH),
    observations: null,
    reportOut: null,
    log: null,
    apply: false,
    only: null,
    timeoutMs: REQUEST_TIMEOUT_MS,
    concurrency: PROBE_CONCURRENCY,
    checkedBy: 'Neo',
    noLog: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    const needsValue = () => {
      if (!value) throw new Error(`${flag} needs a value`);
      index += 1;
      return value;
    };
    switch (flag) {
      case '--apply': options.apply = true; break;
      case '--no-log': options.noLog = true; break;
      case '--offers': options.offers = path.resolve(needsValue()); break;
      case '--observations': options.observations = path.resolve(needsValue()); break;
      case '--report-out': options.reportOut = path.resolve(needsValue()); break;
      case '--log': options.log = path.resolve(needsValue()); break;
      case '--only': options.only = needsValue().split(',').map((id) => id.trim()).filter(Boolean); break;
      case '--timeout': options.timeoutMs = Number(needsValue()); break;
      case '--concurrency': options.concurrency = Number(needsValue()); break;
      case '--checked-by': options.checkedBy = needsValue(); break;
      default: throw new Error(`unknown argument ${flag}`);
    }
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) throw new Error('--timeout must be a positive number of milliseconds');
  if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) throw new Error('--concurrency must be a positive number');
  return options;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('reverify-ai-d-kit-offers.mjs');
if (invokedDirectly) {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('usage: node scripts/reverify-ai-d-kit-offers.mjs [--apply] [--observations <path>] [--offers <path>] [--report-out <path>] [--only id,id] [--timeout ms] [--concurrency n] [--checked-by name] [--log <path>] [--no-log]');
    process.exit(2);
  }

  let payload;
  try {
    payload = await readJson(options.offers);
  } catch (error) {
    console.error(`could not run — ${error.message}`);
    process.exit(2);
  }

  const problems = offerDocumentProblems(payload);
  const rows = offerRows(payload);
  if (rows === null) {
    console.error('could not run — offers.json is not an array of offer rows');
    process.exit(2);
  }
  if (problems.length > 0) {
    console.error(`${problems.length} schema problem(s) in ${path.relative(ROOT, options.offers) || options.offers}:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    if (options.apply) {
      console.error('\nRefusing to write to a file that is already malformed. Fix it with `npm run validate:ai-d-kit` first.');
      process.exit(2);
    }
  }

  const now = new Date();
  const plan = planReverification(payload, { now });
  const selected = rows.filter((offer) => {
    if (!/^https:\/\//i.test(asText(offer?.url))) return false;
    if (!options.only) return true;
    return options.only.includes(asText(offer?.id));
  });
  if (options.only) {
    const missing = options.only.filter((id) => !selected.some((offer) => offer.id === id));
    if (missing.length > 0) console.error(`--only named ${missing.length} id(s) that are not in the file: ${missing.join(', ')}`);
  }

  console.log(`Probing ${selected.length} of ${rows.length} row(s) — one read-only GET each, ${options.concurrency} at a time.`);
  const probes = await probeOffers(selected, { timeoutMs: options.timeoutMs, concurrency: options.concurrency });
  const report = buildReport({ payload, plan, probes, now });

  for (const probe of probes) {
    const mark = { reachable: 'ok  ', gone: 'GONE', inconclusive: '??  ' }[probe.verdict];
    console.log(`${mark} ${probe.id} — ${probe.evidence}`);
    for (const signal of probe.signals) console.log(`       signal: ${signal}`);
  }

  console.log(
    `\n${report.counts.reachable} reachable, ${report.counts.gone} gone, ${report.counts.inconclusive} inconclusive. ` +
      `${report.dueForReading.length} row(s) due for a human read.`,
  );

  let wrote = null;
  let demotions = [];
  let refreshed = [];
  let refused = [];

  if (options.apply) {
    const observations = options.observations ? await readJson(options.observations).catch((error) => {
      console.error(`could not run — ${error.message}`);
      process.exit(2);
    }) : [];
    if (!Array.isArray(observations)) {
      console.error('could not run — the observations file must be a JSON array');
      process.exit(2);
    }

    const afterProbe = applyProbeResults(rows, probes, { now });
    demotions = afterProbe.demotions;

    // An observation that moves a row to a new URL is a claim about a page this run has
    // not opened yet. Open it, so the replacement gets the same scrutiny the original had
    // — a worksheet with a typo in the new link is caught here rather than published.
    const replacements = observations
      .filter((observation) => /^https:\/\//i.test(asText(observation?.url)))
      .map((observation) => {
        const offer = rows.find((row) => row?.id === asText(observation.id));
        return offer ? { ...offer, url: asText(observation.url) } : null;
      })
      .filter((offer) => offer && offer.url !== asText(rows.find((row) => row?.id === offer.id)?.url));
    if (replacements.length > 0) {
      console.log(`\nOpening ${replacements.length} replacement URL(s) named in the observations.`);
      const replacementProbes = await probeOffers(replacements, { timeoutMs: options.timeoutMs, concurrency: options.concurrency });
      for (const probe of replacementProbes) {
        console.log(`${{ reachable: 'ok  ', gone: 'GONE', inconclusive: '??  ' }[probe.verdict]} ${probe.id} (replacement) — ${probe.evidence}`);
        const at = probes.findIndex((existing) => existing.id === probe.id);
        if (at === -1) probes.push(probe);
        else probes[at] = probe;
      }
    }

    const afterHuman = applyObservations(afterProbe.rows, observations, probes, { now, checkedBy: options.checkedBy });
    refreshed = afterHuman.refreshed;
    refused = afterHuman.refused;

    const resultingProblems = offerDocumentProblems(afterHuman.rows);
    if (resultingProblems.length > 0) {
      console.error('\nRefusing to write — the result would be malformed:');
      for (const problem of resultingProblems) console.error(`  - ${problem}`);
      process.exit(2);
    }

    const next = serialize(afterHuman.rows);
    const before = serialize(rows);
    if (next !== before) {
      await writeFile(options.offers, next, 'utf8');
      wrote = path.relative(ROOT, options.offers) || options.offers;
    }

    for (const demotion of demotions) console.log(`demoted ${demotion.id} to UNVERIFIED — ${demotion.evidence}`);
    for (const row of refreshed) {
      const extras = [row.urlChanged && `url → ${row.urlChanged}`, row.expiresAtChanged && `expiresAt → ${row.expiresAtChanged}`, row.openedManually && 'read by hand'].filter(Boolean);
      console.log(`refreshed ${row.id} as ${row.status}${extras.length ? ` (${extras.join(', ')})` : ''}`);
    }
    for (const row of refused) console.error(`REFUSED ${row.id} — ${row.why}`);
    console.log(wrote ? `\nWrote ${wrote}.` : '\nNothing changed, so nothing was written.');
  }

  if (options.reportOut) {
    await writeFile(options.reportOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Report written to ${path.relative(ROOT, options.reportOut) || options.reportOut}.`);
  }

  // The log is how somebody with only the repo can tell whether a firing happened, and
  // when. It is appended on --apply (what a firing does) or on an explicit --log, and it
  // is append-only NDJSON so two firings never conflict in a merge.
  const logFile = options.log ?? (options.apply && !options.noLog ? path.join(ROOT, LOG_PATH) : null);
  if (logFile) {
    const entry = {
      ranAt: report.ranAt,
      mode: options.apply ? 'apply' : 'probe',
      // Repo-relative with forward slashes, so a line written on Windows and a line
      // written on Linux describe the same file to whoever reads the log later.
      offersFile: (path.relative(ROOT, options.offers) || options.offers).split(path.sep).join('/'),
      rows: report.rows,
      probed: report.probed,
      ...report.counts,
      dueForReading: report.dueForReading.length,
      demoted: demotions.map((row) => row.id),
      refreshed: refreshed.map((row) => row.id),
      refused: refused.map((row) => row.id),
      wrote: Boolean(wrote),
    };
    await appendFile(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
    console.log(`Logged this run to ${path.relative(ROOT, logFile) || logFile}.`);
  }

  const needsHuman = report.attention.length > 0 || refused.length > 0;
  process.exit(needsHuman ? 1 : 0);
}
