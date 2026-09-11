export const NPM_DOWNLOADS_URL =
  "https://api.npmjs.org/downloads/point/last-week/open-dashboard-mcp";

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
    payload.package !== "open-dashboard-mcp" ||
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

export async function fetchNpmDownloadFacts(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function")
    throw new Error("NPM downloads fetch is unavailable");
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
  return facts;
}

export async function readNpmDownloadState(fetchImpl = globalThis.fetch) {
  try {
    return { status: "available", facts: await fetchNpmDownloadFacts(fetchImpl) };
  } catch (error) {
    return {
      status: error?.code === "unavailable" ? "unavailable" : "error",
      message: error instanceof Error ? error.message : "NPM downloads failed",
    };
  }
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
