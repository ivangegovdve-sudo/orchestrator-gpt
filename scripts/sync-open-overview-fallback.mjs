import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ENDPOINTS, FALLBACK_REQUESTS, assertResponseIdentity, canonicalPath, fallbackFreshnessMap, isSyntheticEvidenceRecord, mapBounded, readPublicJsonResponse, topAppModelRequests, topGitHubEnrichmentRequests } from "../web/open-overview/open-overview-api.js";
import { ContractError, assertPublishedRun, safePublicUrl, sha256Hex, validateAppModelMatrix, validateAppModels, validateFreeFrontiers, validateGitHubEnrichment, validateGitHubRanking, validateHistory, validateManifest, validateOpenRouterCollection, validateProviders, validatePublicError } from "../web/open-overview/open-overview-schema.js";

const fetchJson = async (base, relative, fetchImpl, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), timeoutMs);
  try {
    const response = await fetchImpl(new URL(`/api/public/v2${canonicalPath(relative)}`, base), { method: "GET", headers: { Accept: "application/json" }, credentials: "omit", signal: controller.signal, redirect: "error", cache: "no-store" });
    if (response.redirected) throw new ContractError("invalid_http_response", "Fallback source redirects are not allowed");
    if (!response.ok) { const publicError = validatePublicError(await readPublicJsonResponse(response, "Fallback source"), "2"); throw new ContractError("http_error", publicError.error.message, { status: response.status, availability: response.status === 404 || response.status >= 500, apiCode: publicError.error.code }); }
    return readPublicJsonResponse(response, "Fallback source");
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError") throw new ContractError("timeout", "Fallback source request timed out", { availability: true });
    if (error instanceof TypeError) throw new ContractError("network_unavailable", "Fallback source network request failed", { availability: true });
    throw error;
  } finally { clearTimeout(timer); }
};
const validateFor = (spec, raw) => spec.kind === "github" ? validateGitHubRanking(raw, "2") : spec.kind === "githubEnrichment" ? validateGitHubEnrichment(raw, "2") : spec.kind === "matrix" ? validateAppModelMatrix(raw, "2") : spec.kind === "appModels" ? validateAppModels(raw, "2") : spec.kind === "providers" ? validateProviders(raw, "2") : spec.kind === "freeFrontiers" ? validateFreeFrontiers(raw, "2") : spec.kind === "history" ? validateHistory(raw, "2") : validateOpenRouterCollection(raw, spec.kind, "2");
const MAX_FALLBACK_BYTES = 4 * 1024 * 1024;
export function assertFallbackBundleSize(bundle) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(bundle, null, 2)}\n`).length;
  if (bytes > MAX_FALLBACK_BYTES) throw new ContractError("response_too_large", "Final fallback aggregate exceeds the 4 MiB limit");
  return bytes;
}

export async function buildFallback({ apiBase, outPath, maxAgeHours, requireLive, now = new Date(), fetchImpl = globalThis.fetch, requests = FALLBACK_REQUESTS, timeoutMs = 8000 }) {
  const origin = safePublicUrl(apiBase);
  if (!origin || origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("apiBase must be a credential-free HTTPS origin");
  if (requireLive !== true) throw new Error("Fallback generation requires --require-live");
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0 || maxAgeHours > 48) throw new Error("Fallback max age must be greater than zero and no more than 48 hours");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error("Fallback fetch timeout is outside the supported range");
  const manifest = validateManifest(await fetchJson(origin, ENDPOINTS.manifest, fetchImpl, timeoutMs), "2");
  if (manifest.sources.some(isSyntheticEvidenceRecord)) throw new Error("Fallback generation rejects fixture, test, seed, or deterministic preview transforms");
  const responses = {}; const accepted = [];
  const fetchSpec = async (spec) => {
    let raw;
    try { raw = await fetchJson(origin, spec.path, fetchImpl, timeoutMs); }
    catch (error) { if (spec.optional && error?.details?.availability === true) return null; throw error; }
    const response = validateFor(spec, raw); assertResponseIdentity(spec, response); if (spec.sourceId) assertPublishedRun(manifest, spec.sourceId, response);
    const stale = response?.stale === true || response?.coverage?.stale === true;
    if (response?.status === "unavailable" || stale) {
      if (spec.optional) return null;
      throw new ContractError("unavailable", `${spec.key} is unavailable or stale`, { availability: true });
    }
    if (Array.isArray(response.provenance) && response.provenance.some(isSyntheticEvidenceRecord)) throw new Error(`${spec.key} contains fixture, test, seed, or deterministic preview provenance`);
    return { spec, response };
  };
  const collect = async (specs) => {
    const unique = []; const seen = new Set(Object.keys(responses));
    for (const spec of specs) { const path = canonicalPath(spec.path); if (!seen.has(path)) { seen.add(path); unique.push(spec); } }
    const results = await mapBounded(unique, 6, fetchSpec);
    for (const result of results) if (result) { responses[canonicalPath(result.spec.path)] = result.response; accepted.push(result); }
  };
  await collect(requests.slice());
  const apps = accepted.find((result) => result.spec.key === "apps")?.response;
  await collect(topAppModelRequests(apps));
  const maintenanceRankings = accepted.filter((result) => result.spec.kind === "github" && result.response?.ranking?.metric === "maintenance").map((result) => result.response);
  await collect(topGitHubEnrichmentRequests(maintenanceRankings));
  const datasetFreshness = fallbackFreshnessMap(responses);
  const oldestFetchedAtMs = Math.min(...Object.values(datasetFreshness).map((item) => Date.parse(item.oldestFetchedAt)));
  const ageHours = (now.getTime() - oldestFetchedAtMs) / 3_600_000;
  if (ageHours < 0 || ageHours >= maxAgeHours) throw new Error(`The oldest successful response is older than ${maxAgeHours} hours`);
  const unsigned = { schemaVersion: "2", mode: "snapshot", bundleKind: "live", generationMethod: "require-live", productionEligible: true, label: "Live-derived snapshot · require-live validated", sourceApiBase: origin.origin, generatedAt: now.toISOString(), oldestFetchedAt: new Date(oldestFetchedAtMs).toISOString(), datasetFreshness, manifest, responses };
  const bundle = { ...unsigned, checksum: await sha256Hex(unsigned) }; assertFallbackBundleSize(bundle); const directory = path.dirname(outPath); const temporary = path.join(directory, `.${path.basename(outPath)}.tmp-${process.pid}`); await mkdir(directory, { recursive: true }); await writeFile(temporary, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  try { await rename(temporary, outPath); } finally { await rm(temporary, { force: true }); }
  return bundle;
}

export function parseCli(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) { const key = argv[index]; if (key === "--require-live") values.set(key, true); else if (key.startsWith("--")) values.set(key, argv[++index]); }
  const apiBase = values.get("--api-base"); const outPath = values.get("--out"); const maxAgeHours = Number(values.get("--max-age-hours")); const timeoutMs = values.has("--timeout-ms") ? Number(values.get("--timeout-ms")) : 8000;
  if (!apiBase || !outPath || !Number.isFinite(maxAgeHours) || maxAgeHours <= 0) throw new Error("Usage: --api-base URL --out FILE --max-age-hours HOURS --require-live");
  return { apiBase, outPath: path.resolve(outPath), maxAgeHours, requireLive: values.get("--require-live") === true, timeoutMs };
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invoked) buildFallback(parseCli(process.argv.slice(2))).then((bundle) => process.stdout.write(`Wrote live fallback ${bundle.checksum} to disk\n`)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
