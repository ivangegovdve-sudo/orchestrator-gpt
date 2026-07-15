import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ENDPOINTS, FALLBACK_REQUESTS, canonicalPath } from "../web/open-overview/open-overview-api.js";
import { ContractError, assertPublishedRun, safePublicUrl, sha256Hex, validateAppModelMatrix, validateAppModels, validateFreeFrontiers, validateGitHubRanking, validateHistory, validateManifest, validateOpenRouterCollection, validateProviders, validatePublicError } from "../web/open-overview/open-overview-schema.js";

const fetchJson = async (base, relative, fetchImpl) => {
  const response = await fetchImpl(new URL(`/api/public/v2${canonicalPath(relative)}`, base), { headers: { Accept: "application/json" }, credentials: "omit" });
  if (!response.ok) { const publicError = validatePublicError(await response.json(), "2"); throw new ContractError("http_error", publicError.error.message, { status: response.status, availability: response.status >= 500, apiCode: publicError.error.code }); }
  return response.json();
};
const validateFor = (spec, raw) => spec.kind === "github" ? validateGitHubRanking(raw, "2") : spec.kind === "matrix" ? validateAppModelMatrix(raw, "2") : spec.kind === "appModels" ? validateAppModels(raw, "2") : spec.kind === "providers" ? validateProviders(raw, "2") : spec.kind === "freeFrontiers" ? validateFreeFrontiers(raw, "2") : spec.kind === "history" ? validateHistory(raw, "2") : validateOpenRouterCollection(raw, spec.kind, "2");

export async function buildFallback({ apiBase, outPath, maxAgeHours, requireLive, now = new Date(), fetchImpl = globalThis.fetch, requests = FALLBACK_REQUESTS }) {
  const origin = safePublicUrl(apiBase);
  if (!origin || origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("apiBase must be a credential-free HTTPS origin");
  if (requireLive !== true) throw new Error("Fallback generation requires --require-live");
  const manifest = validateManifest(await fetchJson(origin, ENDPOINTS.manifest, fetchImpl), "2");
  if (manifest.sources.some((source) => /fixture|test|seed/i.test(source.transformVersion))) throw new Error("Fallback generation rejects fixture, test, or seed transforms");
  const responses = {}; const fetchedTimes = []; const queue = requests.slice();
  for (let index = 0; index < queue.length; index += 1) {
    const spec = queue[index]; let raw;
    try { raw = await fetchJson(origin, spec.path, fetchImpl); }
    catch (error) { if (spec.optional && error?.details?.availability === true) continue; throw error; }
    const response = validateFor(spec, raw); if (spec.sourceId) assertPublishedRun(manifest, spec.sourceId, response);
    if (Array.isArray(response.provenance) && response.provenance.some((item) => /fixture|test|seed/i.test(item.transformVersion || "") || /fixture/i.test(item.citation || ""))) throw new Error(`${spec.key} contains fixture/test provenance`);
    if (!spec.optional && Array.isArray(response.provenance)) for (const item of response.provenance) fetchedTimes.push(Date.parse(item.fetchedAt));
    responses[canonicalPath(spec.path)] = response;
    if (spec.key === "apps") for (const app of response.data.slice(0, 10)) queue.push({ key: `appModels:${app.appId}`, path: ENDPOINTS.appModels(app.appId), kind: "appModels", sourceId: null, optional: true });
  }
  if (!fetchedTimes.length || fetchedTimes.some((value) => !Number.isFinite(value))) throw new Error("Required responses have no valid fetchedAt provenance");
  const oldestFetchedAtMs = Math.min(...fetchedTimes); const ageHours = (now.getTime() - oldestFetchedAtMs) / 3_600_000;
  if (ageHours < 0 || ageHours > maxAgeHours) throw new Error(`The oldest required response is older than ${maxAgeHours} hours`);
  const unsigned = { schemaVersion: "2", mode: "snapshot", sourceApiBase: origin.origin, generatedAt: now.toISOString(), oldestFetchedAt: new Date(oldestFetchedAtMs).toISOString(), manifest, responses };
  const bundle = { ...unsigned, checksum: await sha256Hex(unsigned) }; const directory = path.dirname(outPath); const temporary = path.join(directory, `.${path.basename(outPath)}.tmp-${process.pid}`); await mkdir(directory, { recursive: true }); await writeFile(temporary, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  try { await rename(temporary, outPath); } finally { await rm(temporary, { force: true }); }
  return bundle;
}

export function parseCli(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) { const key = argv[index]; if (key === "--require-live") values.set(key, true); else if (key.startsWith("--")) values.set(key, argv[++index]); }
  const apiBase = values.get("--api-base"); const outPath = values.get("--out"); const maxAgeHours = Number(values.get("--max-age-hours"));
  if (!apiBase || !outPath || !Number.isFinite(maxAgeHours) || maxAgeHours <= 0) throw new Error("Usage: --api-base URL --out FILE --max-age-hours HOURS --require-live");
  return { apiBase, outPath: path.resolve(outPath), maxAgeHours, requireLive: values.get("--require-live") === true };
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invoked) buildFallback(parseCli(process.argv.slice(2))).then((bundle) => process.stdout.write(`Wrote live fallback ${bundle.checksum} to disk\n`)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
