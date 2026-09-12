import { formatNpmDownloadAge } from "./npm-downloads.js";

export const NPM_RELEASES_URL = "https://registry.npmjs.org/open-dashboard-mcp";
export const NPM_RELEASE_CACHE_KEY = "open-dashboard-mcp:npm-releases:v1";
export const NPM_RELEASE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const NPM_RELEASE_TO_SHOW = "1.1.2";

const NPM_PACKAGE = "open-dashboard-mcp";
const NPM_RELEASE_CACHE_VERSION = 1;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function validVersion(value) {
  return typeof value === "string" && VERSION.test(value);
}

function normalizeReleaseFacts(value) {
  if (
    !value ||
    value.package !== NPM_PACKAGE ||
    !validVersion(value.latest) ||
    !Array.isArray(value.published) ||
    value.published.length < 2 ||
    value.published.some((version) => !validVersion(version)) ||
    !value.published.includes(NPM_RELEASE_TO_SHOW) ||
    !value.published.includes(value.latest) ||
    value.sourceUrl !== NPM_RELEASES_URL
  )
    return null;

  return {
    package: NPM_PACKAGE,
    latest: value.latest,
    published: [...new Set(value.published)],
    sourceUrl: NPM_RELEASES_URL,
  };
}

export function parseNpmReleaseMetadata(payload) {
  const versions = payload?.versions;
  const latest = payload?.["dist-tags"]?.latest;
  if (
    !payload ||
    payload.name !== NPM_PACKAGE ||
    !versions ||
    typeof versions !== "object" ||
    Array.isArray(versions) ||
    !Object.hasOwn(versions, NPM_RELEASE_TO_SHOW) ||
    !validVersion(latest) ||
    !Object.hasOwn(versions, latest)
  )
    return null;

  return normalizeReleaseFacts({
    package: NPM_PACKAGE,
    latest,
    published: [NPM_RELEASE_TO_SHOW, latest],
    sourceUrl: NPM_RELEASES_URL,
  });
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

function readCachedNpmReleaseFacts(storage, now) {
  if (!storage || typeof storage.getItem !== "function") return null;
  let serialized;
  try {
    serialized = storage.getItem(NPM_RELEASE_CACHE_KEY);
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
    record.version !== NPM_RELEASE_CACHE_VERSION ||
    !Number.isSafeInteger(record.cachedAt) ||
    record.cachedAt > now
  )
    return null;

  const ageMs = now - record.cachedAt;
  if (ageMs < 0 || ageMs >= NPM_RELEASE_CACHE_TTL_MS) return null;
  const facts = normalizeReleaseFacts(record);
  return facts ? { facts, cachedAt: record.cachedAt, ageMs } : null;
}

function writeCachedNpmReleaseFacts(storage, facts, cachedAt) {
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(
      NPM_RELEASE_CACHE_KEY,
      JSON.stringify({
        version: NPM_RELEASE_CACHE_VERSION,
        ...facts,
        cachedAt,
      }),
    );
  } catch {
    // Storage can be disabled or full; a network result remains usable.
  }
}

export async function fetchNpmReleaseFacts(
  fetchImpl = globalThis.fetch,
  options = {},
) {
  if (typeof fetchImpl !== "function")
    throw new Error("NPM release fetch is unavailable");
  const { storage, now } = resolveOptions(options);
  const cached = readCachedNpmReleaseFacts(storage, now);
  if (cached) return cached.facts;

  const response = await fetchImpl(NPM_RELEASES_URL, {
    credentials: "omit",
    cache: "no-store",
  });
  if (!response?.ok) {
    const error = new Error(
      `NPM registry returned ${response?.status ?? "unknown"}`,
    );
    error.code = "unavailable";
    throw error;
  }
  const facts = parseNpmReleaseMetadata(await response.json());
  if (!facts) {
    const error = new Error(
      "NPM registry response did not contain the expected releases",
    );
    error.code = "invalid";
    throw error;
  }
  writeCachedNpmReleaseFacts(storage, facts, now);
  return facts;
}

export async function readNpmReleaseState(
  fetchImpl = globalThis.fetch,
  options = {},
) {
  const resolved = resolveOptions(options);
  const cached = readCachedNpmReleaseFacts(resolved.storage, resolved.now);
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
      facts: await fetchNpmReleaseFacts(fetchImpl, resolved),
      source: "live",
      cachedAt: resolved.now,
      ageMs: 0,
    };
  } catch (error) {
    return {
      status: error?.code === "unavailable" ? "unavailable" : "error",
      message: error instanceof Error ? error.message : "NPM release lookup failed",
    };
  }
}

export function formatNpmReleaseAge(ageMs) {
  return formatNpmDownloadAge(ageMs);
}
