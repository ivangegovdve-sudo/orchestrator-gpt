export const NPM_DOWNLOADS_URL =
  "https://api.npmjs.org/downloads/point/last-week/open-dashboard-mcp";
export const NPM_DOWNLOAD_CACHE_KEY =
  "open-dashboard-mcp:npm-downloads:last-week:v1";
// A weekly point changes slowly; six hours limits npm traffic without allowing a
// browser tab to carry a cached count across a meaningful part of a day.
export const NPM_DOWNLOAD_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const NPM_PACKAGE = "open-dashboard-mcp";
const NPM_DOWNLOAD_CACHE_VERSION = 1;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function parseNpmDownloadPoint(payload) {
  if (
    !payload ||
    payload.package !== NPM_PACKAGE ||
    !Number.isSafeInteger(payload.downloads) ||
    payload.downloads < 0 ||
    !validIsoDate(payload.start) ||
    !validIsoDate(payload.end) ||
    payload.start > payload.end
  )
    return null;

  return {
    downloads: payload.downloads,
    start: payload.start,
    end: payload.end,
    package: payload.package,
    sourceUrl: NPM_DOWNLOADS_URL,
  };
}

function defaultStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function resolveOptions(options = {}) {
  return {
    storage: options.storage === undefined ? defaultStorage() : options.storage,
    now: Number.isFinite(options.now) ? options.now : Date.now(),
  };
}

function readCachedNpmDownloadFacts(storage, now) {
  if (!storage || typeof storage.getItem !== "function") return null;
  let serialized;
  try {
    serialized = storage.getItem(NPM_DOWNLOAD_CACHE_KEY);
  } catch {
    return null;
  }
  if (!serialized) return null;

  let record;
  try {
    record = JSON.parse(serialized);
  } catch {
    return null;
  }
  if (
    !record ||
    record.version !== NPM_DOWNLOAD_CACHE_VERSION ||
    record.sourceUrl !== NPM_DOWNLOADS_URL ||
    !Number.isSafeInteger(record.cachedAt) ||
    record.cachedAt > now
  )
    return null;

  const ageMs = now - record.cachedAt;
  if (ageMs < 0 || ageMs >= NPM_DOWNLOAD_CACHE_TTL_MS) return null;
  const facts = parseNpmDownloadPoint(record);
  return facts ? { facts, cachedAt: record.cachedAt, ageMs } : null;
}

function writeCachedNpmDownloadFacts(storage, facts, cachedAt) {
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(
      NPM_DOWNLOAD_CACHE_KEY,
      JSON.stringify({
        version: NPM_DOWNLOAD_CACHE_VERSION,
        ...facts,
        cachedAt,
      }),
    );
  } catch {
    // Storage can be disabled or full; a network result remains usable.
  }
}

export async function fetchNpmDownloadFacts(
  fetchImpl = globalThis.fetch,
  options = {},
) {
  if (typeof fetchImpl !== "function")
    throw new Error("NPM downloads fetch is unavailable");
  const { storage, now } = resolveOptions(options);
  const cached = readCachedNpmDownloadFacts(storage, now);
  if (cached) return cached.facts;

  const response = await fetchImpl(NPM_DOWNLOADS_URL, {
    credentials: "omit",
    cache: "no-store",
  });
  if (!response?.ok) {
    const error = new Error(
      `NPM downloads returned ${response?.status ?? "unknown"}`,
    );
    error.code = "unavailable";
    throw error;
  }
  const facts = parseNpmDownloadPoint(await response.json());
  if (!facts) {
    const error = new Error(
      "NPM downloads response did not match expected point schema",
    );
    error.code = "invalid";
    throw error;
  }
  writeCachedNpmDownloadFacts(storage, facts, now);
  return facts;
}

export async function readNpmDownloadState(
  fetchImpl = globalThis.fetch,
  options = {},
) {
  const resolved = resolveOptions(options);
  const cached = readCachedNpmDownloadFacts(resolved.storage, resolved.now);
  if (cached) {
    return {
      status: "available",
      facts: cached.facts,
      source: "cache",
      cachedAt: cached.cachedAt,
      ageMs: cached.ageMs,
    };
  }

  try {
    return {
      status: "available",
      facts: await fetchNpmDownloadFacts(fetchImpl, resolved),
      source: "live",
      cachedAt: resolved.now,
      ageMs: 0,
    };
  } catch (error) {
    return {
      status: error?.code === "unavailable" ? "unavailable" : "error",
      message: error instanceof Error ? error.message : "NPM downloads failed",
    };
  }
}

export function formatNpmDownloadAge(ageMs) {
  const minutes = Math.max(0, Math.floor(ageMs / 60000));
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function formatNpmDownloadRange(facts, locale = "en-GB") {
  const format = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const start = new Date(`${facts.start}T00:00:00.000Z`);
  const end = new Date(`${facts.end}T00:00:00.000Z`);
  if (facts.start === facts.end) return format.format(start);
  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    const monthYear = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(end);
    return `${start.getUTCDate()}–${end.getUTCDate()} ${monthYear}`;
  }
  return `${format.format(start)}–${format.format(end)}`;
}
