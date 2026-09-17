/**
 * Capture the public dashboard catalogue for static deployments.
 *
 * The browser prefers the live endpoint, but preview and alternate hosted
 * origins may not be allowed by its CORS policy. A dated build snapshot keeps
 * the explorer complete in that case. This route is public and read-only; no
 * account credentials or inference calls are used.
 */
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PUBLIC_CATALOGUE_URL =
  "https://openrouter-github-dashboard.vercel.app/api/public/v2/live-models";
export const PUBLIC_CATALOGUE_PAGE_SIZE = 500;
export const PUBLIC_CATALOGUE_MAX_PAGES = 40;
const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public-catalogue.json",
);

function pageUrl(cursor) {
  const url = new URL(PUBLIC_CATALOGUE_URL);
  url.searchParams.set("limit", String(PUBLIC_CATALOGUE_PAGE_SIZE));
  if (cursor !== null) url.searchParams.set("cursor", cursor);
  return url.href;
}

function validatePage(payload) {
  if (!payload || typeof payload !== "object")
    throw new Error("PUBLIC_CATALOGUE_SHAPE_INVALID");
  if (!String(payload.schemaVersion ?? "").startsWith("2."))
    throw new Error("PUBLIC_CATALOGUE_SCHEMA_UNSUPPORTED");
  if (!Array.isArray(payload.data))
    throw new Error("PUBLIC_CATALOGUE_DATA_INVALID");
  if (payload.cursor !== null && typeof payload.cursor !== "string")
    throw new Error("PUBLIC_CATALOGUE_CURSOR_INVALID");
}

/** Fetch every bounded page and retain exact provider/model identities. */
export async function collectPublicCatalogue(
  fetchImpl = fetch,
  { now = () => new Date(), maxPages = PUBLIC_CATALOGUE_MAX_PAGES } = {},
) {
  if (!Number.isInteger(maxPages) || maxPages < 1)
    throw new Error("PUBLIC_CATALOGUE_PAGE_BOUND_INVALID");
  const rows = new Map();
  const pages = [];
  const seenCursors = new Set();
  let cursor = null;
  do {
    const response = await fetchImpl(pageUrl(cursor), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (!response?.ok) throw new Error(`PUBLIC_CATALOGUE_HTTP_${response?.status ?? "UNKNOWN"}`);
    const payload = await response.json();
    validatePage(payload);
    const { data, ...meta } = payload;
    pages.push(meta);
    for (const row of data) {
      if (
        !row ||
        typeof row.provider !== "string" ||
        !row.provider.trim() ||
        typeof row.id !== "string" ||
        !row.id.trim()
      )
        continue;
      const key = `${row.provider}:${row.id}`;
      if (!rows.has(key)) rows.set(key, row);
    }
    cursor = payload.cursor ?? null;
    if (cursor && seenCursors.has(cursor))
      throw new Error("PUBLIC_CATALOGUE_CURSOR_REPEATED");
    if (cursor) seenCursors.add(cursor);
  } while (cursor !== null && pages.length < maxPages);

  return {
    schemaVersion: "2.0",
    sourceUrl: PUBLIC_CATALOGUE_URL,
    fetchedAt: now().toISOString(),
    snapshot: true,
    hasMore: cursor !== null,
    pages,
    population: {
      received: [...rows.values()].length,
      retained: [...rows.values()].length,
      pagesRead: pages.length,
      maxPages,
      completeness: cursor === null ? "complete_at_source" : "page_bound_reached",
    },
    data: [...rows.values()],
  };
}

export async function refreshPublicCatalogue(
  fetchImpl = fetch,
  options = {},
) {
  const snapshot = await collectPublicCatalogue(fetchImpl, options);
  const serialized = JSON.stringify(snapshot, null, 2) + "\n";
  const temporaryPath = `${outputPath}.tmp`;
  try {
    await writeFile(temporaryPath, serialized, "utf8");
    await rename(temporaryPath, outputPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  console.log(
    JSON.stringify(
      {
        output: "web/open-dashboard/public-catalogue.json",
        models: snapshot.data.length,
        pages: snapshot.pages.length,
        hasMore: snapshot.hasMore,
        fetchedAt: snapshot.fetchedAt,
      },
      null,
      2,
    ),
  );
  return snapshot;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  refreshPublicCatalogue().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
