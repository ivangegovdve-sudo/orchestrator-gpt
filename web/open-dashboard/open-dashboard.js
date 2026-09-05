import { CATALOGUE_PROVIDERS, CATALOGUE_SERVED_AS_OF, ENDPOINTS, MATRIX_REQUESTS, buildModelCatalogue, resolveTaskModel, GITHUB_CATEGORIES, OVERVIEW_REQUESTS, createOpenDashboardClient, manifestPublicationIdentity, topAppModelRequests, topGitHubEnrichmentRequests } from "./open-dashboard-api.js";
import { compactIntegerString } from "./open-dashboard-schema.js";
import { renderAppModelMatrix, renderHistoryVisualization, renderPending, renderRankTable, renderSourceStates, renderUnavailable } from "./open-dashboard-charts.js";

// "Not requested", "requested and failed", and "requested, returned nothing" are
// three different facts about the world and used to render as one sentence. A
// panel may only claim a failure the page actually observed.
export const datasetState = (view, key) =>
  Object.hasOwn(view.responses, key) ? "ready" : Object.hasOwn(view.errors, key) ? "failed" : "pending";
const PENDING_NOTE = "Not requested yet — this panel loads when it scrolls into view.";
// Prefer the SOURCE's own error code over our parser's classification, and carry
// the HTTP status with it. A label that names the wrong party ends the reader's
// investigation in the wrong place.
const failureCode = (failure) => {
  if (!failure) return null;
  const status = failure?.details?.status;
  const named = failure?.details?.apiCode ?? failure?.code ?? failure?.message ?? null;
  return status ? `${named ?? "error"} · HTTP ${status}` : named;
};
const renderDatasetGap = (document, view, key, title, pendingNote = PENDING_NOTE) => {
  if (datasetState(view, key) === "pending") return renderPending({ document, title, note: pendingNote });
  const failure = view.errors[key];
  return renderUnavailable({ document, title, reason: "This request failed; nothing is shown in its place.", code: failureCode(failure) });
};

export const OPENROUTER_VIEWS = Object.freeze({
  usage: { label: "Usage", requests: [{ key: "models", path: ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" }, { key: "history", path: ENDPOINTS.history, kind: "history", optional: true }] },
  apps: { label: "Apps", requests: [{ key: "apps", path: ENDPOINTS.appsPopular, kind: "apps", sourceId: "apps_ranked" }, { key: "history", path: ENDPOINTS.history, kind: "history", optional: true }] },
  "app-to-model": { label: "App-to-Model", requests: [{ key: "models", path: ENDPOINTS.modelsTopWeekly, kind: "models", sourceId: "models_current" }, { key: "apps", path: ENDPOINTS.appsPopular, kind: "apps", sourceId: "apps_ranked" }, { key: "matrix", path: ENDPOINTS.appModelMatrix, kind: "matrix", optional: true }] },
  free: { label: "Free", requests: [{ key: "free", path: ENDPOINTS.freeModels, kind: "free", sourceId: "models_current" }, { key: "freeFrontierQuality", path: ENDPOINTS.freeFrontierQualityThroughput, kind: "freeFrontiers", optional: true }, { key: "freeFrontierContext", path: ENDPOINTS.freeFrontierContextPopularity, kind: "freeFrontiers", optional: true }] },
  deprecations: { label: "Deprecations", requests: [{ key: "deprecations", path: ENDPOINTS.deprecations, kind: "deprecations", sourceId: "models_current" }] },
  tasks: { label: "Tasks", requests: [{ key: "tasks", path: ENDPOINTS.tasks, kind: "tasks", sourceId: "task_classifications" }] },
  benchmarks: { label: "Benchmarks", requests: [{ key: "benchmarks", path: ENDPOINTS.benchmarks, kind: "benchmarks", sourceId: "benchmarks_current" }] },
  providers: { label: "Providers", requests: [{ key: "providers", path: ENDPOINTS.providers, kind: "providers", optional: true }] },
  "source-status": { label: "Source Status", requests: [] }
});
const GITHUB_METRICS = Object.freeze([["adoption", "Adoption"], ["momentum", "Momentum"], ["maintenance", "Maintenance"]]);
const GITHUB_FACETS = Object.freeze(["Maturity", "Interoperability", "Openness", "Confidence"]);
// Three pages cover the OpenRouter catalogue today (598 rows at 200/page).
// The bound stops a runaway cursor; if the catalogue grows past it the join
// degrades to "not in catalogue" per row, which the view states rather than
// silently dropping the price column.
const MAX_CATALOGUE_PAGES = 4;
const CATALOGUE_KEYS = Object.freeze(CATALOGUE_PROVIDERS.filter(([, , served]) => served).map(([slug]) => `catalogue:${slug}`));
const CATALOGUE_REQUESTS = Object.freeze(CATALOGUE_PROVIDERS.filter(([, , served]) => served)
  .map(([slug]) => ({ key: `catalogue:${slug}`, path: ENDPOINTS.liveModels(slug), kind: "liveModels", optional: true })));
const OVERVIEW_DEFERRED_KEYS = new Set(["providers", "freeFrontierQuality", "freeFrontierContext", "history", ...CATALOGUE_KEYS]);
const OVERVIEW_INITIAL_REQUESTS = Object.freeze(OVERVIEW_REQUESTS.filter((spec) => !OVERVIEW_DEFERRED_KEYS.has(spec.key)));
const OVERVIEW_DEFERRED_REQUESTS = Object.freeze([...OVERVIEW_REQUESTS.filter((spec) => OVERVIEW_DEFERRED_KEYS.has(spec.key)), ...CATALOGUE_REQUESTS]);

export function parseOpenRouterState(url) {
  const query = new URL(url).searchParams; const requested = query.get("view") || "usage"; const appId = query.get("app");
  return Object.freeze({ view: requested in OPENROUTER_VIEWS ? requested : "usage", appId: appId && /^(?:0|[1-9]\d*)$/.test(appId) ? appId : null, freeMode: query.get("freeMode") === "pareto" ? "pareto" : "popularity" });
}
export function parseGithubState(url) {
  const query = new URL(url).searchParams; const categories = new Set(GITHUB_CATEGORIES.map(([slug]) => slug)); const metrics = new Set(GITHUB_METRICS.map(([slug]) => slug)); const requestedWindow = Number(query.get("window") || "7");
  return Object.freeze({ category: categories.has(query.get("category")) ? query.get("category") : GITHUB_CATEGORIES[0][0], metric: metrics.has(query.get("metric")) ? query.get("metric") : "adoption", windowDays: [7,30,90].includes(requestedWindow) ? requestedWindow : 7 });
}

const hasDom = typeof document !== "undefined";
const exact = (value) => value === null || value === undefined ? "—" : String(value);
const population = (acquisitionComplete, completeness) => acquisitionComplete === false || completeness === "partial_or_unknown" ? "partial" : "complete";
const SOURCE_STATE_LABELS = Object.freeze({
  current: "Current",
  "published-but-old": "Published but overdue",
  stale: "Stale",
  "never-published": "Never published",
  failed: "Failed",
  "approval-pending": "Approval pending",
  "collection-disabled": "Collection disabled",
  pending: "Pending",
});
const DATASET_SOURCE_IDS = Object.freeze({ models: "models_current", apps: "apps_ranked", free: "models_current", deprecations: "models_current", tasks: "task_classifications", benchmarks: "benchmarks_current" });
const parsedTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const sourceFreshness = (state) => state === "current" ? "current" : state === "published-but-old" ? "overdue" : state === "stale" ? "stale" : "unavailable";

export function classifySourceState(source, response, { now = new Date(), snapshotStale = false, runMismatch = false } = {}) {
  const responseReason = response?.reason;
  if (responseReason === "approval_incomplete") return "approval-pending";
  if (responseReason === "collection_disabled") return "collection-disabled";
  if (runMismatch) return "failed";
  const publishedAt = parsedTime(source.publishedAt);
  if (source.publishedRunId === null || publishedAt === null) return "never-published";
  const attemptedAt = parsedTime(source.lastAttemptStartedAt) ?? parsedTime(source.lastAttemptFinishedAt);
  if (source.lastAttemptStatus === "failed" && attemptedAt !== null && attemptedAt >= publishedAt) return "failed";
  if (source.stale || response?.stale || response?.coverage?.stale || snapshotStale) return "stale";
  const scheduledAt = parsedTime(source.nextScheduledAt);
  if (scheduledAt !== null && now.getTime() >= scheduledAt && (attemptedAt === null || attemptedAt < scheduledAt)) return "published-but-old";
  return "current";
}

function sourceStatusNote(source, state) {
  const published = source.publishedAt || null;
  const scheduled = source.nextScheduledAt || null;
  const failure = source.lastAttemptErrorCode ? ` · ${source.lastAttemptErrorCode}` : "";
  if (state === "current") return `Current · last published ${published || "unknown"}`;
  if (state === "published-but-old") return `Published ${published || "unknown"} · scheduled refresh ${scheduled || "unknown"} is overdue`;
  if (state === "stale") return `Published ${published || "unknown"} · stale threshold crossed`;
  if (state === "never-published") return `Never published${source.lastAttemptStatus === "failed" ? ` · last attempt failed${failure}` : ""}`;
  if (state === "failed") return `Last attempt failed${failure}${published ? ` · last published ${published}` : ""}`;
  if (state === "approval-pending") return "Collection is quiet pending the required approvals";
  if (state === "collection-disabled") return "Collection is disabled by configuration";
  return SOURCE_STATE_LABELS[state] || state;
}

export function datasetStatusLabel(view, key, now = new Date()) {
  if (Object.hasOwn(view.errors || {}, key)) return SOURCE_STATE_LABELS.failed;
  const rows = buildSourceRows(view, { now });
  const direct = rows.find((row) => row.datasetKey === key);
  const sourceId = DATASET_SOURCE_IDS[key];
  const source = sourceId ? rows.find((row) => row.datasetKey === `source:${sourceId}`) : null;
  if (direct || source) return SOURCE_STATE_LABELS[(direct || source).state] || SOURCE_STATE_LABELS.current;
  return !Object.hasOwn(view.responses || {}, key) ? SOURCE_STATE_LABELS.pending : SOURCE_STATE_LABELS.current;
}

export function appRankingSourceLabel(response) {
  const period = response?.requestSlice?.period;
  const sort = response?.requestSlice?.sort;
  const days = typeof period === "string" && /^(?:[1-9]\d*)d$/.test(period) ? Number(period.slice(0, -1)) : null;
  return days && typeof sort === "string" ? `OpenRouter ${days}-day · ${sort}` : "OpenRouter published app slice";
}

export function appModelPresentation(response) {
  if (!response || response.status !== "available") {
    return Object.freeze({
      models: Object.freeze([]),
      coverageLabel: response?.reason ? `Unavailable · ${response.reason}` : "No published app-model ranking",
    });
  }
  const models = (Array.isArray(response.data) ? response.data : [])
    .slice()
    .sort((left, right) => left.rank - right.rank || String(left.modelId).localeCompare(String(right.modelId)))
    .slice(0, 3)
    .map((row) => Object.freeze({
      id: row.resolvedModelId || row.modelId || row.sourcePermaslug,
      rank: row.rank,
      totalTokens: row.totalTokens,
      matchMethod: row.matchMethod,
    }));
  const coverage = response.coverage || {};
  const population = String(coverage.populationCompleteness || "partial_or_unknown").replaceAll("_", " ");
  return Object.freeze({
    models: Object.freeze(models),
    coverageLabel: `${coverage.mappedModels ?? "—"} mapped · ${coverage.unmappedModels ?? "—"} unmapped · ${population}`,
  });
}

export function taskModelPresentation(task) {
  const models = (Array.isArray(task?.models) ? task.models : [])
    .slice()
    .sort((left, right) => left.sourcePosition - right.sourcePosition || String(left.id).localeCompare(String(right.id)))
    .map((row) => Object.freeze({
      id: row.id,
      sourcePosition: row.sourcePosition,
      usageShare: row.usageShare,
      tokenShare: row.tokenShare,
    }));
  return Object.freeze({ models: Object.freeze(models), complete: task?.topModelsComplete === true });
}

export function lifecycleTimelineModel(rows) {
  return Object.freeze((Array.isArray(rows) ? rows : [])
    .filter((row) => row && typeof row.modelId === "string" && typeof row.state === "string")
    .map((row) => Object.freeze({
      modelId: row.modelId,
      state: row.state,
      firstObservedAt: row.firstObservedAt ?? null,
      lastObservedAt: row.lastObservedAt ?? null,
      expirationDate: row.expirationDate ?? null,
    }))
    .sort((left, right) =>
      String(left.expirationDate ?? "9999-12-31").localeCompare(String(right.expirationDate ?? "9999-12-31")) ||
      left.modelId.localeCompare(right.modelId)));
}

export function benchmarkSourceRegions(rows) {
  const grouped = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row.source !== "string") continue;
    if (!grouped.has(row.source)) grouped.set(row.source, []);
    grouped.get(row.source).push(row);
  }
  return Object.freeze([...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, sourceRows]) => Object.freeze({
      source,
      rows: Object.freeze(sourceRows.map((row, index) => Object.freeze({ ...row, sourceRank: index + 1 }))),
    })));
}

function context() {
  if (!hasDom) throw new Error("Rendering requires a document");
  return { document, root: document.getElementById("oo-view-root"), sourceToggle: document.getElementById("oo-source-status"), sourcePanel: document.getElementById("oo-source-panel"), inspector: document.getElementById("oo-inspector") };
}
const section = (document, id, className) => { const value = document.createElement("section"); if (id) value.id = id; value.className = className; return value; };
const envelopeRows = (view, key) => Array.isArray(view.responses[key]?.data) ? view.responses[key].data : [];
const appendSnapshotNotice = (document, root, view) => {
  if (!["snapshot", "fixture"].includes(view.mode)) return;
  const notice = document.createElement("p");
  notice.className = "oo-snapshot-notice";
  notice.textContent = `${view.fallbackLabel || "Archived validated snapshot"} · oldest evidence ${view.oldestFetchedAt || "unknown"} · live and snapshot rows are never mixed.`;
  root.appendChild(notice);
};

const OPTIONAL_DATASET_KEYS = new Set(["matrix", "providers", "freeFrontierQuality", "freeFrontierContext", "history", "appModels"]);
const isOptionalDataset = (key) => OPTIONAL_DATASET_KEYS.has(key) || key.startsWith("github:") || key.startsWith("githubEnrichment:") || key.startsWith("momentum:") || key.startsWith("fallback:");

export function buildSourceRows(view, { now = new Date() } = {}) {
  const manifestIndex = new Map(view.manifest.sources.map((source) => [source.sourceId, source]));
  const rows = view.manifest.sources.map((source) => {
    const response = Object.values(view.responses).find((item) => Array.isArray(item?.provenance) && item.provenance.some((entry) => entry.sourceId === source.sourceId));
    const provenance = response?.provenance?.find((entry) => entry.sourceId === source.sourceId);
    const runMismatch = Boolean(provenance && provenance.runId !== source.publishedRunId);
    const state = classifySourceState(source, response, { now, snapshotStale: view.snapshotStale, runMismatch });
    return { datasetKey: `source:${source.sourceId}`, sourceId: source.sourceId, required: true, mode: view.mode, state, freshness: sourceFreshness(state), completeness: source.publishedRunId === null || runMismatch ? "unavailable" : response?.completeness ? population(response.completeness.acquisitionComplete, response.completeness.populationCompleteness) : response?.coverage ? population(response.coverage.acquisitionComplete, response.coverage.populationCompleteness) : population(source.lastAttemptAcquisitionComplete ?? true, source.lastAttemptPopulationCompleteness ?? "partial_or_unknown"), asOf: provenance?.sourceAsOf ?? source.publishedAt, publishedAt: source.publishedAt, nextScheduledAt: source.nextScheduledAt, lastAttemptStatus: source.lastAttemptStatus, lastAttemptErrorCode: source.lastAttemptErrorCode, statusNote: sourceStatusNote(source, state), ...(runMismatch ? { reason: "provenance_run_mismatch" } : {}) };
  });
  for (const [key, response] of Object.entries(view.responses)) {
    if (key.startsWith("githubEnrichment:") && Array.isArray(response?.provenance)) {
      for (const evidence of response.provenance) {
        const stargazers = evidence.id.endsWith(":stargazers");
        const complete = stargazers ? response.starBuckets.length > 0 && response.starBuckets.every((bucket) => bucket.populationCompleteness === "full") : response.releaseCadence.coverageComplete;
        rows.push({ datasetKey: `${key}:${evidence.id}`, sourceId: `github.enrichment:${response.repositoryId}:${stargazers ? "stargazers" : "releases"}`, sourceKind: "github-enrichment", required: false, mode: view.mode, state: view.snapshotStale ? "stale" : "current", freshness: view.snapshotStale ? "stale" : "current", completeness: complete ? "complete" : "partial", asOf: evidence.fetchedAt, statusNote: view.snapshotStale ? "Stale snapshot evidence" : "Current evidence", sourceUrl: evidence.sourceUrl, publicationIdentity: evidence.id });
      }
      continue;
    }
    const publicationProvenance = Array.isArray(response?.provenance) ? response.provenance.filter((entry) => typeof entry?.sourceId === "string") : [];
    const unmanifested = publicationProvenance.find((entry) => !manifestIndex.has(entry.sourceId));
    const mismatched = publicationProvenance.find((entry) => manifestIndex.has(entry.sourceId) && manifestIndex.get(entry.sourceId).publishedRunId !== entry.runId);
    if (unmanifested || mismatched) rows.push({ datasetKey: key, sourceId: unmanifested?.sourceId || mismatched.sourceId, required: !isOptionalDataset(key), mode: view.mode, state: "failed", freshness: "stale", completeness: "unavailable", asOf: (unmanifested || mismatched).sourceAsOf ?? (unmanifested || mismatched).fetchedAt ?? null, statusNote: unmanifested ? "Evidence is not listed in the manifest" : "Evidence came from a different collection run", reason: unmanifested ? "provenance_not_in_manifest" : "provenance_run_mismatch" });
    else if (key.startsWith("github:") || key === "ranking" || key.startsWith("momentum:")) { const state = response.coverage.stale || view.snapshotStale ? "stale" : "current"; rows.push({ datasetKey: key, sourceId: `github.${response.ranking.metric}:${response.ranking.category}`, required: !isOptionalDataset(key), mode: view.mode, state, freshness: state, completeness: population(response.coverage.acquisitionComplete, response.coverage.populationCompleteness), asOf: response.coverage.resolvedAsOf, statusNote: state === "stale" ? "Published evidence is stale" : "Current published evidence" }); }
    else if (response?.status === "unavailable") { const state = response.reason === "approval_incomplete" ? "approval-pending" : response.reason === "collection_disabled" ? "collection-disabled" : "failed"; rows.push({ datasetKey: key, sourceId: key, required: !isOptionalDataset(key), mode: view.mode, state, freshness: state === "failed" ? "unavailable" : "current", completeness: "unavailable", asOf: response.lastSuccessAt, statusNote: state === "approval-pending" ? "Collection is quiet pending the required approvals" : state === "collection-disabled" ? "Collection is disabled by configuration" : "Request failed", reason: response.reason }); }
    else if (!Array.isArray(response?.provenance) || response.provenance.length === 0) { const state = response?.stale || view.snapshotStale ? "stale" : "current"; rows.push({ datasetKey: key, sourceId: key, required: !isOptionalDataset(key), mode: view.mode, state, freshness: state, completeness: response?.completeness ? population(response.completeness.acquisitionComplete, response.completeness.populationCompleteness) : response?.coverage ? population(response.coverage.acquisitionComplete, response.coverage.populationCompleteness) : "complete", asOf: response?.window?.end ?? response?.resolvedPeriod?.end ?? null, statusNote: state === "stale" ? "Published evidence is stale" : "Current published evidence" }); }
  }
  for (const [key, error] of Object.entries(view.errors || {})) rows.push({ datasetKey: key, sourceId: key, required: !isOptionalDataset(key), mode: view.mode, state: "failed", freshness: view.snapshotStale ? "stale" : "unavailable", completeness: "unavailable", asOf: null, statusNote: "Request failed", reason: error?.code || error?.message || "request_failed" });
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function summarizeSourceRows(datasets) {
  const freshness = datasets.some((item) => item.freshness === "stale") ? "stale" : datasets.some((item) => item.freshness === "overdue") ? "overdue" : datasets.some((item) => item.freshness === "unavailable") ? "unavailable" : "current";
  const completeness = datasets.some((item) => item.required && item.completeness === "unavailable") ? "unavailable" : datasets.some((item) => item.completeness !== "complete") ? "partial" : "complete";
  const status = datasets.find((item) => item.state && item.state !== "current")?.state || "current";
  return Object.freeze({ freshness, completeness, status });
}

export function renderSourceRail(view) {
  const { document, sourceToggle, sourcePanel } = context(); const datasets = buildSourceRows(view); sourcePanel.replaceChildren(renderSourceStates({ document, datasets }));
  const { freshness, completeness, status } = summarizeSourceRows(datasets);
  sourceToggle.textContent = `Sources · ${view.mode} · ${SOURCE_STATE_LABELS[status] || status} · ${freshness} · ${completeness}`;
}

let lastInspectorTrigger = null;
export function dismissMatrixEvidence({ restoreFocus = lastInspectorTrigger } = {}) {
  if (!hasDom) return; const { inspector } = context(); inspector.hidden = true; inspector.removeAttribute("role"); inspector.removeAttribute("aria-modal"); inspector.removeAttribute("aria-labelledby"); inspector.onkeydown = null;
  const target = restoreFocus?.isConnected ? restoreFocus : lastInspectorTrigger?.isConnected ? lastInspectorTrigger : null; lastInspectorTrigger = null; if (target) target.focus();
}

function showMatrixEvidence({ appId, modelId, cell, model, trigger }) {
  const { document, inspector } = context(); lastInspectorTrigger = trigger || null;
  const close = document.createElement("button"); close.type = "button"; close.className = "oo-inspector-close"; close.textContent = "Close details"; close.addEventListener("click", () => dismissMatrixEvidence());
  const heading = document.createElement("h2"); heading.id = "oo-inspector-title"; heading.textContent = "App/model evidence"; const identity = document.createElement("p"); identity.textContent = `${appId} → ${modelId}`; const detail = document.createElement("p"); detail.textContent = model.state === "observed" ? `${model.exact} observed tokens · rank ${model.rank} · ${cell.period.start}` : `Unknown: ${model.reason}`; inspector.replaceChildren(close, heading, identity, detail);
  if (model.evidenceUrl) { const link = document.createElement("a"); link.href = model.evidenceUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Open source evidence"; inspector.appendChild(link); }
  const modal = matchMedia("(max-width: 720px)").matches; inspector.setAttribute("role", "dialog"); inspector.setAttribute("aria-modal", String(modal)); inspector.setAttribute("aria-labelledby", heading.id); inspector.hidden = false;
  inspector.onkeydown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); dismissMatrixEvidence(); return; }
    if (!modal || event.key !== "Tab") return; const focusable = Array.from(inspector.querySelectorAll("button,a[href]")); if (!focusable.length) return; const first = focusable[0]; const last = focusable.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  close.focus();
}

const HISTORY_MIN_CONSECUTIVE_DAYS = 8;
const HISTORY_MAX_BUCKETS = 90;
const HISTORY_MAX_ROWS_PER_BUCKET = 10;
const utcDay = (value) => Date.parse(`${value}T00:00:00.000Z`);

export function historySeriesModel(series) {
  const buckets = (Array.isArray(series) ? series : []).filter((bucket) => bucket.complete).slice().sort((left, right) => left.date.localeCompare(right.date)).slice(-HISTORY_MAX_BUCKETS).map((bucket) => Object.freeze({ ...bucket, rows: Object.freeze(bucket.rows.slice(0, HISTORY_MAX_ROWS_PER_BUCKET)) }));
  const consecutive = [];
  for (let index = buckets.length - 1; index >= 0; index -= 1) {
    if (consecutive.length && utcDay(consecutive[0].date) - utcDay(buckets[index].date) !== 86_400_000) break;
    consecutive.unshift(buckets[index]);
  }
  const sparklineEligible = consecutive.length >= HISTORY_MIN_CONSECUTIVE_DAYS;
  const chartBuckets = sparklineEligible ? consecutive : [];
  const exactRows = buckets.flatMap((bucket) => bucket.rows.map((row) => Object.freeze({ ...row, date: bucket.date })));
  return Object.freeze({ buckets: Object.freeze(buckets), chartBuckets: Object.freeze(chartBuckets), exactRows: Object.freeze(exactRows), sparklineEligible, reason: sparklineEligible ? null : "requires_8_consecutive_complete_days" });
}

export function renderHistoryPanel(view, seriesKey, title, visualization = seriesKey === "modelUsage" ? "stacked-area" : seriesKey === "githubRanks" ? "small-multiples" : "bump") {
  const { document } = context();
  if (datasetState(view, "history") !== "ready") return renderDatasetGap(document, view, "history", title);
  const history = view.responses.history;
  if (!history || history.status === "unavailable") return renderUnavailable({ document, title, reason: history?.reason || "The source published no history for this window." });
  const model = historySeriesModel(history.data[seriesKey]); const buckets = model.buckets;
  if (!buckets.length) return renderUnavailable({ document, title, reason: "insufficient_history" });
  const region = section(document, "", "oo-data-region oo-history-panel"); const heading = document.createElement("h2"); heading.className = "oo-region-title"; heading.textContent = title; region.appendChild(heading);
  const chart = model.sparklineEligible ? renderHistoryVisualization({ document, type: visualization, buckets: model.chartBuckets, title }) : null;
  if (chart) region.appendChild(chart);
  else { const explanation = document.createElement("p"); explanation.className = "oo-region-meta oo-history-explanation"; explanation.textContent = model.sparklineEligible ? "The published series cannot form compatible chart geometry; showing bounded exact values only." : "Trend charts require eight consecutive complete daily buckets; showing bounded exact values only."; region.appendChild(explanation); }
  const details = document.createElement("details"); const summary = document.createElement("summary"); summary.textContent = "Exact history values"; details.append(summary, renderRankTable({ document, title: `${title} exact values`, rows: model.exactRows, sourceLabel: "Approved-run history", asOf: buckets.at(-1).date, columns: [{ label: "Date", value: (row) => row.date }, { label: "Item", value: (row) => row.label }, { label: "Scope", value: (row) => exact(row.scope) }, { label: "Rank", value: (row) => exact(row.rank) }, { label: "Value", value: (row) => exact(row.value) }, { label: "Remainder", value: (row) => exact(row.remainder) }, { label: "Stars", value: (row) => exact(row.stars) }, { label: "Forks", value: (row) => exact(row.forks) }] })); region.appendChild(details); return region;
}

function leaderboard(document, id, title, rows, source, asOf, kind) {
  const table = renderRankTable({ document, title, rows, sourceLabel: source, asOf, emphasizeTopThree: true, columns: kind === "model" ? [{ label: "Rank", value: (row) => row.weeklyRank }, { label: "Model", value: (row) => row.name }, { label: "Context", value: (row) => exact(row.contextLength) }, { label: "Lifecycle", value: (row) => row.lifecycleState }] : [{ label: "Rank", value: (row) => row.rank }, { label: "App", value: (row) => row.appName }, { label: "Tokens", value: (row) => compactIntegerString(row.totalTokens), exact: (row) => row.totalTokens }, { label: "Requests", value: (row) => compactIntegerString(row.totalRequests), exact: (row) => row.totalRequests }] }); table.id = id; return table;
}

const titleCaseSource = (source) => String(source).split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");

function modelChipList(document, models, className) {
  const list = document.createElement("span");
  list.className = className;
  if (!models.length) {
    const missing = document.createElement("span");
    missing.className = "oo-evidence-unavailable";
    missing.textContent = "No published ranking";
    list.appendChild(missing);
    return list;
  }
  for (const model of models) {
    const chip = document.createElement("span");
    chip.className = "oo-model-chip";
    chip.textContent = `${model.rank ?? model.sourcePosition}. ${model.id}`;
    const exactTokens = model.totalTokens ? ` · ${model.totalTokens} tokens` : "";
    chip.title = `${model.id}${exactTokens}`;
    list.appendChild(chip);
  }
  return list;
}

function appLeaderboard(document, id, title, rows, source, asOf, view) {
  const evidence = new Map(rows.map((row) => [row.appId, appModelPresentation(view.responses[`appModels:${row.appId}`])]));
  const table = renderRankTable({
    document,
    title,
    rows,
    sourceLabel: source,
    asOf,
    emphasizeTopThree: true,
    columns: [
      { label: "Rank", value: (row) => row.rank },
      { label: "App", value: (row) => row.appName },
      { label: "Returned models", render: (row) => modelChipList(document, evidence.get(row.appId).models, "oo-app-row-evidence") },
      { label: "Coverage", render: (row) => { const value = document.createElement("span"); value.className = "oo-app-coverage"; value.textContent = evidence.get(row.appId).coverageLabel; return value; } },
      { label: "Tokens", value: (row) => compactIntegerString(row.totalTokens), exact: (row) => row.totalTokens },
      { label: "Requests", value: (row) => compactIntegerString(row.totalRequests), exact: (row) => row.totalRequests },
    ],
  });
  table.id = id;
  return table;
}


function renderLifecycleTimeline(document, rows) {
  const events = lifecycleTimelineModel(rows);
  const region = document.createElement("section");
  region.className = "oo-lifecycle-timeline";
  region.setAttribute("aria-label", "Observed model lifecycle timeline");
  if (!events.length) {
    region.setAttribute("role", "status");
    region.textContent = "No observed model lifecycle events.";
    return region;
  }
  const list = document.createElement("ol");
  for (const event of events) {
    const item = document.createElement("li");
    const identity = document.createElement("strong");
    identity.textContent = `${event.modelId} · ${event.state}`;
    item.appendChild(identity);
    for (const [label, value] of [["First observed", event.firstObservedAt], ["Last observed", event.lastObservedAt], ["Expiration", event.expirationDate]]) {
      const field = document.createElement("span");
      field.textContent = `${label}: `;
      if (value) {
        const time = document.createElement("time");
        time.dateTime = value;
        time.textContent = value;
        field.appendChild(time);
      } else field.append("—");
      item.appendChild(field);
    }
    list.appendChild(item);
  }
  region.appendChild(list);
  return region;
}

function renderBenchmarkRegions(document, rows, response) {
  const fragment = document.createDocumentFragment();
  for (const region of benchmarkSourceRegions(rows)) {
    const wrapper = document.createElement("section");
    wrapper.className = "oo-benchmark-source";
    const title = `${titleCaseSource(region.source)} ranking`;
    wrapper.appendChild(renderRankTable({
      document,
      title,
      rows: region.rows,
      sourceLabel: region.source,
      asOf: response?.provenance?.[0]?.sourceAsOf ?? response?.window?.end,
      emphasizeTopThree: true,
      columns: [
        { label: "Source rank", value: (row) => row.sourceRank },
        { label: "Model", value: (row) => row.displayName },
        { label: "Score", value: (row) => row.source === "artificial-analysis" ? exact(row.intelligenceIndex) : row.source === "openrouter" ? exact(row.primaryScore ?? row.accuracy) : exact(row.elo) },
        { label: "Match", value: (row) => row.matchStatus },
      ],
    }));
    fragment.appendChild(wrapper);
  }
  return fragment;
}

export function renderOverview(view, config) {
  const { document, root } = context(); root.replaceChildren(); renderSourceRail(view); appendSnapshotNotice(document, root, view);
  const segments = document.createElement("div"); segments.className = "oo-mobile-segments"; segments.setAttribute("role", "group"); segments.setAttribute("aria-label", "Combined overview data");
  const field = section(document, "oo-overview-field", "oo-overview-field");
  for (const [key,label] of [["models","Models"],["apps","Apps"],["matrix","Matrix"]]) { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.dataset.segment = key; button.setAttribute("aria-pressed", String(key === "models")); button.addEventListener("click", () => { for (const control of segments.querySelectorAll("button")) control.setAttribute("aria-pressed", String(control.dataset.segment === key)); field.dataset.mobileSegment = key; }); segments.appendChild(button); }
  root.appendChild(segments);
  const models = envelopeRows(view, "models"); const apps = envelopeRows(view, "apps");
  const modelRail = leaderboard(document, "oo-model-rail", "Weekly model leaders", models, "OpenRouter weekly", view.responses.models?.provenance?.[0]?.sourceAsOf ?? view.responses.models?.window?.end, "model"); modelRail.dataset.mobilePanel = "models";
  const matrix = renderAppModelMatrix({ document, response: view.responses.matrix, apps, models, onInspect: showMatrixEvidence, onDismiss: dismissMatrixEvidence }); matrix.id = "oo-matrix-field"; matrix.dataset.mobilePanel = "matrix";
  const appRail = appLeaderboard(document, "oo-app-rail", "Popular app leaders", apps, appRankingSourceLabel(view.responses.apps), view.responses.apps?.provenance?.[0]?.sourceAsOf ?? view.responses.apps?.window?.end, view); appRail.dataset.mobilePanel = "apps";
  field.append(modelRail, matrix, appRail); field.dataset.mobileSegment = "models"; root.appendChild(field);
  const analysis = section(document, "oo-analysis-strip", "oo-analysis-strip");
  for (const [title, key, note] of [["Free", "free", "Popularity default"], ["Deprecations", "deprecations", "Lifecycle evidence"], ["Tasks", "tasks", "7-day sample"], ["Benchmarks", "benchmarks", "Source-separated"], ["Providers", "providers", "Published endpoints"], ["Pareto Q×T", "freeFrontierQuality", "Quality × throughput"], ["Pareto C×P", "freeFrontierContext", "Context × popularity"]]) { const rows = envelopeRows(view,key); const article = document.createElement("article"); article.className = "oo-micro-panel"; article.dataset.overviewDataset = key; const h = document.createElement("h2"); h.textContent = title; const count = document.createElement("strong"); count.textContent = String(rows.length); const p = document.createElement("p"); p.textContent = view.errors[key] ? `Failed · ${failureCode(view.errors[key]) ?? "error"}` : !Object.hasOwn(view.responses,key) && OVERVIEW_DEFERRED_KEYS.has(key) ? "Pending · loads near this rail" : `${datasetStatusLabel(view, key)} · ${note}`; article.append(h,count,p); analysis.appendChild(article); }
  root.appendChild(analysis);
  const history = section(document, "oo-history-grid", "oo-history-grid"); history.append(renderHistoryPanel(view,"modelUsage","Model usage over time","stacked-area"),renderHistoryPanel(view,"modelUsage","Model rank movement","bump"),renderHistoryPanel(view,"githubRanks","GitHub category history","small-multiples")); root.appendChild(history);
  root.appendChild(renderProviderRail(view));
  const github = section(document, "oo-github-grid", "oo-github-grid");
  for (const [slug,label] of GITHUB_CATEGORIES) { const response = view.responses[`github:${slug}`]; github.appendChild(response ? renderRankTable({ document, title: label, rows: response.data.slice(0,10), sourceLabel: "GitHub adoption · percent_rank", asOf: response.coverage.resolvedAsOf, emphasizeTopThree: true, columns: [{ label:"Rank",value:(row)=>row.rank },{ label:"Project",value:(row)=>row.fullName,href:(row)=>`https://github.com/${row.fullName}` },{ label:"Stars",value:(row)=>compactIntegerString(row.stars),exact:(row)=>row.stars },{ label:"Forks",value:(row)=>compactIntegerString(row.forks),exact:(row)=>row.forks }] }) : renderDatasetGap(document, view, `github:${slug}`, label)); }
  root.appendChild(github); root.setAttribute("aria-busy", "false"); installThreeEnhancement(view, config);
}

export function renderMatrix(view) {
  const { document, root } = context();
  root.replaceChildren();
  renderSourceRail(view);
  appendSnapshotNotice(document, root, view);
  const content = section(document, "oo-matrix-route-content", "oo-route-content oo-matrix-route-content");
  const intro = section(document, "oo-matrix-route-intro", "oo-matrix-route-intro");
  const heading = document.createElement("h2");
  heading.className = "oo-region-title";
  heading.textContent = "A bounded relationship, kept inspectable";
  const copy = document.createElement("p");
  copy.textContent = "This is the same observed app-to-model evidence used by the overview, given room to read. It is a top-10 slice for one complete published window — not a complete census of apps, models, or causal usage.";
  intro.append(heading, copy);
  content.appendChild(intro);
  const legend = document.createElement("div");
  legend.className = "oo-matrix-legend";
  legend.setAttribute("aria-label", "Matrix legend");
  for (const [label, note, className] of [["Observed", "exact daily tokens", "is-observed"], ["?", "unknown in the source", "is-unknown"], ["—", "cell not returned", "is-missing"]]) {
    const item = document.createElement("span");
    item.className = "oo-matrix-legend-item";
    const swatch = document.createElement("b");
    swatch.className = `oo-matrix-legend-swatch ${className}`;
    swatch.textContent = label;
    const text = document.createElement("span");
    text.textContent = note;
    item.append(swatch, text);
    legend.appendChild(item);
  }
  content.appendChild(legend);
  const apps = envelopeRows(view, "apps");
  const models = envelopeRows(view, "models");
  const matrix = renderAppModelMatrix({ document, response: view.responses.matrix, apps, models, onInspect: showMatrixEvidence, onDismiss: dismissMatrixEvidence });
  matrix.id = "oo-matrix-field";
  content.appendChild(matrix);
  const note = document.createElement("p");
  note.className = "oo-matrix-footnote";
  note.textContent = "Select any observed cell for its exact value and source evidence. Keyboard users can move through the grid with the arrow keys, Home, and End.";
  content.appendChild(note);
  root.appendChild(content);
  root.setAttribute("aria-busy", "false");
}

export const mergeCompatibleViews = (primary, deferred) => {
  if (primary.mode !== deferred.mode) throw new Error("Live and snapshot responses cannot be mixed");
  const primaryPublication = primary.publicationIdentity || manifestPublicationIdentity(primary.manifest); const deferredPublication = deferred.publicationIdentity || manifestPublicationIdentity(deferred.manifest);
  if (primaryPublication !== deferredPublication) throw new Error("Responses from different manifest publication generations cannot be mixed");
  return Object.freeze({ ...primary, responses: Object.freeze({ ...primary.responses, ...deferred.responses }), errors: Object.freeze({ ...primary.errors, ...deferred.errors }) });
};

function hydrateOverviewDeferred(view) {
  renderSourceRail(view); const { document } = context();
  for (const [key, note] of [["providers", "Published endpoints"], ["freeFrontierQuality", "Quality × throughput"], ["freeFrontierContext", "Context × popularity"]]) { const article = document.querySelector(`[data-overview-dataset="${key}"]`); if (!article) continue; article.querySelector("strong").textContent = String(envelopeRows(view,key).length); article.querySelector("p").textContent = view.errors[key] ? `Request failed · ${failureCode(view.errors[key]) ?? "error"}` : note; }
  const rail = document.getElementById("oo-provider-rail"); if (rail) rail.replaceWith(renderProviderRail(view));
  const history = document.getElementById("oo-history-grid"); if (history) history.replaceChildren(renderHistoryPanel(view,"modelUsage","Model usage over time","stacked-area"),renderHistoryPanel(view,"modelUsage","Model rank movement","bump"),renderHistoryPanel(view,"githubRanks","GitHub category history","small-multiples"));
  const currentAppRail = document.getElementById("oo-app-rail");
  if (currentAppRail) {
    const apps = envelopeRows(view, "apps");
    const nextAppRail = appLeaderboard(document, "oo-app-rail", "Popular app leaders", apps, appRankingSourceLabel(view.responses.apps), view.responses.apps?.provenance?.[0]?.sourceAsOf ?? view.responses.apps?.window?.end, view);
    nextAppRail.dataset.mobilePanel = "apps";
    currentAppRail.replaceWith(nextAppRail);
  }
}

function installOverviewDeferredLoad(client, initialView) {
  const { document } = context(); const target = document.getElementById("oo-history-grid"); if (!target || !OVERVIEW_DEFERRED_REQUESTS.length) return;
  const requests = Object.freeze([...OVERVIEW_DEFERRED_REQUESTS, ...topAppModelRequests(initialView.responses.apps)]);
  const load = async () => { target.dataset.deferredState = "loading"; try { const deferred = await client.loadView(requests, initialView.mode === "snapshot" ? {} : { manifest: initialView.manifest }); hydrateOverviewDeferred(mergeCompatibleViews(initialView, deferred)); target.dataset.deferredState = "ready"; } catch (error) { const failed = Object.fromEntries(requests.map((spec) => [spec.key, error])); hydrateOverviewDeferred(Object.freeze({ ...initialView, errors: Object.freeze({ ...initialView.errors, ...failed }) })); target.dataset.deferredState = "failed"; } };
  if (typeof IntersectionObserver !== "function") { load(); return; }
  const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) return; observer.disconnect(); load(); }, { rootMargin: "100px" }); observer.observe(target);
}

const openRouterNav = (document, state) => { const nav = document.createElement("nav"); nav.className = "oo-section-nav"; nav.setAttribute("aria-label", "OpenRouter sections"); for (const [key, definition] of Object.entries(OPENROUTER_VIEWS)) { const link = document.createElement("a"); link.href = `/web/open-dashboard/openrouter/index.html?view=${encodeURIComponent(key)}`; link.textContent = definition.label; if (key === state.view) link.setAttribute("aria-current", "page"); nav.appendChild(link); } return nav; };
const freeModeNav = (document, state) => { const nav = document.createElement("nav"); nav.className = "oo-mode-nav"; nav.setAttribute("aria-label", "Free model ranking mode"); for (const [key,label] of [["popularity","Weekly popularity"],["pareto","Pareto: quality x throughput"]]) { const link = document.createElement("a"); link.href = `/web/open-dashboard/openrouter/index.html?view=free&freeMode=${key}`; link.textContent = label; if (state.freeMode === key) link.setAttribute("aria-current", "page"); nav.appendChild(link); } return nav; };

const openRouterColumns = {
  usage: [{ label:"Rank",value:(row)=>row.weeklyRank },{ label:"Model",value:(row)=>row.name },{ label:"Context",value:(row)=>exact(row.contextLength) },{ label:"Lifecycle",value:(row)=>row.lifecycleState }],
  apps: [{ label:"Rank",value:(row)=>row.rank },{ label:"App",value:(row)=>row.appName },{ label:"Tokens",value:(row)=>compactIntegerString(row.totalTokens),exact:(row)=>row.totalTokens },{ label:"Requests",value:(row)=>compactIntegerString(row.totalRequests),exact:(row)=>row.totalRequests }],
  free: [{ label:"Rank",value:(row)=>row.weeklyRank },{ label:"Concrete model",value:(row)=>row.id },{ label:"Context",value:(row)=>exact(row.contextLength) },{ label:"Lifecycle",value:(row)=>row.lifecycleState }],
  deprecations: [{ label:"Model",value:(row)=>row.modelId },{ label:"State",value:(row)=>row.state },{ label:"First observed",value:(row)=>exact(row.firstObservedAt) },{ label:"Last observed",value:(row)=>exact(row.lastObservedAt) },{ label:"May be removed after",value:(row)=>exact(row.expirationDate) }],
  tasks: [{ label:"Task",value:(row)=>row.displayName },{ label:"Category",value:(row)=>row.macroCategory },{ label:"Usage share",value:(row)=>row.usageShare },{ label:"Token share",value:(row)=>row.tokenShare }],
  benchmarks: [{ label:"Model",value:(row)=>row.displayName },{ label:"Source",value:(row)=>row.source },{ label:"Score",value:(row)=>row.source === "artificial-analysis" ? exact(row.intelligenceIndex) : row.source === "openrouter" ? exact(row.primaryScore ?? row.accuracy) : exact(row.elo) },{ label:"Match",value:(row)=>row.matchStatus }]
};

export function renderOpenRouter(view, state, catalogue = buildModelCatalogue([])) {
  const { document, root } = context(); root.replaceChildren(openRouterNav(document,state)); renderSourceRail(view); appendSnapshotNotice(document, root, view); const content = section(document,"oo-openrouter-content","oo-route-content"); const key = state.view === "usage" ? "models" : state.view;
  if (state.view === "source-status") content.appendChild(renderSourceStates({ document, datasets: buildSourceRows(view) }));
  else if (state.view === "app-to-model") { const apps = envelopeRows(view,"apps"); const models = envelopeRows(view,"models"); const picker = document.createElement("nav"); picker.className = "oo-app-picker"; picker.setAttribute("aria-label","Top apps"); for (const app of apps.slice(0,10)) { const link = document.createElement("a"); link.href = `/web/open-dashboard/openrouter/index.html?view=app-to-model&app=${encodeURIComponent(app.appId)}`; link.textContent = `${app.rank}. ${app.appName}`; if (app.appId === state.appId) link.setAttribute("aria-current","page"); picker.appendChild(link); } content.append(picker,renderAppModelMatrix({ document,response:view.responses.matrix,apps,models,onInspect:showMatrixEvidence }),renderHarnessRoster(view)); if (state.appId) { const response=view.responses.appModels; content.appendChild(response?.status === "available" ? renderRankTable({ document,title:`${response.appName} model ranking`,rows:response.data,sourceLabel:"Observed daily tokens",asOf:response.resolvedPeriod.end,columns:[{label:"Rank",value:(row)=>row.rank},{label:"Model",value:(row)=>row.modelId},{label:"Tokens",value:(row)=>compactIntegerString(row.totalTokens),exact:(row)=>row.totalTokens}] }) : renderUnavailable({document,title:"Per-app model ranking",reason:response?`Enrichment unavailable: ${response.reason}`:"Per-app request failed"})); } }
  else if (state.view === "providers") { const rows=envelopeRows(view,"providers"); content.appendChild(rows.length ? renderRankTable({ document,title:"Providers",rows,sourceLabel:"Published endpoints",asOf:view.responses.providers?.provenance?.[0]?.fetchedAt,columns:[{label:"Model",value:(row)=>row.modelId},{label:"Provider",value:(row)=>row.provider},{label:"Quant",value:(row)=>exact(row.quantization)},{label:"Context",value:(row)=>exact(row.contextLength)},{label:"Prompt",value:(row)=>exact(row.promptPrice)},{label:"Completion",value:(row)=>exact(row.completionPrice)},{label:"Uptime",value:(row)=>exact(row.uptime)},{label:"Latency",value:(row)=>exact(row.latency)},{label:"Throughput",value:(row)=>exact(row.throughput)},{label:"Status",value:(row)=>exact(row.status)}] }) : (datasetState(view,"providers")!=="ready" ? renderDatasetGap(document,view,"providers","Providers") : renderUnavailable({document,title:"Providers",reason:"The source published no provider endpoints for this slice; no values are inferred."}))); }
  else if (state.view === "free" && state.freeMode === "pareto") { content.appendChild(freeModeNav(document,state)); let rendered=0; for(const key of ["freeFrontierQuality","freeFrontierContext"]){const response=view.responses[key];const frontier=envelopeRows(view,key)[0];if(!frontier)continue;rendered+=1;content.appendChild(renderRankTable({document,title:`Free Pareto · ${frontier.dimensions.x} × ${frontier.dimensions.y}`,rows:frontier.members,sourceLabel:`${frontier.ruleVersion} · ${frontier.dimensions.x} ${frontier.dimensions.xDirection} × ${frontier.dimensions.y} ${frontier.dimensions.yDirection}`,asOf:response?.window?.end,columns:[{label:"Model",value:(row)=>row.modelId},{label:frontier.dimensions.x,value:(row)=>row.x},{label:frontier.dimensions.y,value:(row)=>row.y}]}));}if(!rendered){const frontierKeys=["freeFrontierQuality","freeFrontierContext"];const failedKey=frontierKeys.find((frontierKey)=>datasetState(view,frontierKey)==="failed");content.appendChild(failedKey?renderDatasetGap(document,view,failedKey,"Free Pareto frontiers"):frontierKeys.every((frontierKey)=>datasetState(view,frontierKey)==="pending")?renderPending({document,title:"Free Pareto frontiers",note:PENDING_NOTE}):renderUnavailable({document,title:"Free Pareto frontiers",reason:"The source published no frontier for these dimensions. Popularity remains available; no composite efficiency score is substituted."}));} }
  else if (datasetState(view,key)!=="ready") content.appendChild(renderDatasetGap(document,view,key,OPENROUTER_VIEWS[state.view].label));
  else {
    const rows=envelopeRows(view,key);
    const sourceLabel="OpenRouter public v2";
    const asOf=view.responses[key]?.provenance?.[0]?.sourceAsOf ?? view.responses[key]?.window?.end;
    if (state.view === "apps") content.appendChild(appLeaderboard(document,"oo-openrouter-apps","Apps",rows,appRankingSourceLabel(view.responses.apps),asOf,view));
    else if (state.view === "tasks") content.appendChild(renderTaskFitness(view, catalogue));
    else if (state.view === "benchmarks") content.appendChild(rows.length ? renderBenchmarkRegions(document,rows,view.responses.benchmarks) : (datasetState(view,"benchmarks")!=="ready"?renderDatasetGap(document,view,"benchmarks","Benchmarks"):renderUnavailable({document,title:"Benchmarks",reason:"No source benchmark rankings are published."})));
    else content.appendChild(renderRankTable({document,title:OPENROUTER_VIEWS[state.view].label,rows,sourceLabel,asOf,emphasizeTopThree:state.view==="usage"||state.view==="free",columns:openRouterColumns[state.view]}));
    if(state.view==="usage")content.appendChild(renderHistoryPanel(view,"modelUsage","Model usage over time"));
    if(state.view==="apps")content.appendChild(renderHistoryPanel(view,"appRanks","App rank over time"));
    if(state.view==="deprecations")content.appendChild(renderLifecycleTimeline(document,rows));
    if(state.view==="free"){content.prepend(freeModeNav(document,state));const note=document.createElement("p");note.className="oo-router-note";note.textContent="openrouter/free is a router and is never counted as a concrete :free model.";content.appendChild(note);}
  }
  root.appendChild(content); root.setAttribute("aria-busy","false");
}

function githubControls(document,state,view) {
  const controls=document.createElement("div");controls.className="oo-github-controls";const sheet=document.createElement("details");sheet.className="oo-category-sheet";const summary=document.createElement("summary");summary.textContent="Categories";const categories=document.createElement("nav");categories.className="oo-category-list";categories.setAttribute("aria-label","GitHub categories");
  for(const[slug,label]of GITHUB_CATEGORIES){const link=document.createElement("a");link.href=`/web/open-dashboard/github/index.html?category=${encodeURIComponent(slug)}&metric=${encodeURIComponent(state.metric)}`;link.textContent=label;if(slug===state.category)link.setAttribute("aria-current","page");categories.appendChild(link);} const media=matchMedia("(max-width: 760px)");sheet.open=!media.matches;media.addEventListener?.("change",event=>{sheet.open=!event.matches});sheet.append(summary,categories);
  const available=[7,30,90].filter(days=>{const response=view.responses[`momentum:${days}`];return response?.ranking?.metric==="momentum"&&response.ranking.windowDays===days&&response.ranking.eligiblePopulation>0&&response.coverage.acquisitionComplete&&response.coverage.populationCompleteness==="full"});
  const rankings=document.createElement("nav");rankings.className="oo-ranking-nav";rankings.setAttribute("aria-label","GitHub ranking");for(const[slug,label]of GITHUB_METRICS){if(slug==="momentum"&&!available.length){const span=document.createElement("span");span.textContent=label;span.setAttribute("aria-disabled","true");rankings.appendChild(span);continue}const link=document.createElement("a");link.href=`/web/open-dashboard/github/index.html?category=${encodeURIComponent(state.category)}&metric=${slug}${slug==="momentum"?`&window=${available.includes(state.windowDays)?state.windowDays:available[0]}`:""}`;link.textContent=label;if(slug===state.metric)link.setAttribute("aria-current","page");rankings.appendChild(link)}
  const windows=document.createElement("nav");windows.className="oo-momentum-windows";windows.setAttribute("aria-label","Momentum window");for(const days of[7,30,90]){if(!available.includes(days)){const span=document.createElement("span");span.textContent=`${days} days`;span.setAttribute("aria-disabled","true");windows.appendChild(span)}else{const link=document.createElement("a");link.href=`/web/open-dashboard/github/index.html?category=${encodeURIComponent(state.category)}&metric=momentum&window=${days}`;link.textContent=`${days} days`;if(state.metric==="momentum"&&state.windowDays===days)link.setAttribute("aria-current","page");windows.appendChild(link)}}
  const facets=document.createElement("div");facets.className="oo-facet-list";facets.setAttribute("aria-label","GitHub evidence facets");for(const label of GITHUB_FACETS){const span=document.createElement("span");span.textContent=`${label} facet`;facets.appendChild(span)}controls.append(sheet,rankings,windows,facets);return controls;
}

const starGlyph = (value, maximum) => { if (maximum === 0n) return "▁"; const scaled=value*8n; for(const [threshold,glyph] of [[7n,"█"],[6n,"▇"],[5n,"▆"],[4n,"▅"],[3n,"▄"],[2n,"▃"],[1n,"▂"]])if(scaled>=maximum*threshold)return glyph;return "▁"; };
export function starBucketPresentation(buckets){const values=Array.isArray(buckets)?buckets:[];const exact=values.length>0&&values.every((bucket)=>bucket.populationCompleteness==="full");return Object.freeze({exact,completeness:exact?"complete":"partial",badge:exact?"Full coverage":"Partial coverage",noun:exact?"exact daily star buckets":"published partial-coverage star buckets"})}
function renderStarBucketDisclosure(document,fullName,buckets){const visible=(Array.isArray(buckets)?buckets:[]).slice(-7);if(!visible.length){const span=document.createElement("span");span.textContent="—";span.setAttribute("aria-label","No published star buckets");return span}const presentation=starBucketPresentation(visible);const values=visible.map((bucket)=>BigInt(bucket.count));const maximum=values.reduce((largest,value)=>value>largest?value:largest,0n);const details=document.createElement("details");details.className="oo-github-enrichment-disclosure";details.dataset.completeness=presentation.completeness;const summary=document.createElement("summary");summary.setAttribute("aria-label",`Show ${presentation.noun} for ${fullName}`);const glyph=document.createElement("span");glyph.className="oo-github-star-sparkline";glyph.setAttribute("role","img");glyph.setAttribute("aria-label",`${visible.length} ${presentation.noun} for ${fullName}`);glyph.textContent=visible.map((_bucket,index)=>starGlyph(values[index],maximum)).join("");const badge=document.createElement("span");badge.className="oo-coverage-badge";badge.textContent=presentation.badge;summary.append(glyph,badge);const list=document.createElement("ol");list.setAttribute("aria-label",`${presentation.badge} star bucket values for ${fullName}`);for(const bucket of visible){const item=document.createElement("li");item.textContent=`${bucket.start}: ${bucket.count}${bucket.populationCompleteness==="full"?"":" (partial coverage)"}`;list.appendChild(item)}details.append(summary,list);return details}

export function renderGithub(view,state){
  const{document,root}=context();const envelope=view.responses.ranking;root.replaceChildren(githubControls(document,state,view));renderSourceRail(view);appendSnapshotNotice(document,root,view);const content=section(document,"oo-github-content","oo-route-content");
  if(datasetState(view,"ranking")!=="ready"){content.appendChild(renderDatasetGap(document,view,"ranking",`${GITHUB_METRICS.find(([slug])=>slug===state.metric)[1]} · ${GITHUB_CATEGORIES.find(([slug])=>slug===state.category)[1]}`));root.appendChild(content);root.setAttribute("aria-busy","false");return}
  const rows=Array.isArray(envelope?.data)?envelope.data:[];const definition=GITHUB_METRICS.find(([slug])=>slug===state.metric)[1];
  const enrichmentByRepository=new Map(Object.values(view.responses).filter((response)=>response?.releaseCadence&&Array.isArray(response.starBuckets)).map((response)=>[response.repositoryId,response]));
  const columns=[{label:"Rank",value:(row)=>row.rank},{label:"Project",value:(row)=>row.fullName,href:(row)=>`https://github.com/${row.fullName}`},{label:"Stars",value:(row)=>compactIntegerString(row.stars),exact:(row)=>row.stars},{label:"Forks",value:(row)=>compactIntegerString(row.forks),exact:(row)=>row.forks},{label:definition,value:(row)=>exact(row.score)}];
  if(state.metric==="maintenance")columns.push({label:"Stable releases 90d",value:(row)=>enrichmentByRepository.get(row.repositoryId)?.releaseCadence.stableReleaseCount90d??row.maintenanceEvidence?.stableReleaseCount90d??null},{label:"Median cadence",value:(row)=>{const value=enrichmentByRepository.get(row.repositoryId)?.releaseCadence.medianStableReleaseIntervalDays365d??row.maintenanceEvidence?.medianStableReleaseIntervalDays365d;return value===null||value===undefined?null:`${value} days`}},{label:"7-day stars",render:(row)=>renderStarBucketDisclosure(document,row.fullName,enrichmentByRepository.get(row.repositoryId)?.starBuckets)});
  content.appendChild(renderRankTable({document,title:`${definition} · ${GITHUB_CATEGORIES.find(([slug])=>slug===state.category)[1]}`,rows,sourceLabel:"GitHub project-family ranking",asOf:envelope?.coverage.resolvedAsOf,emphasizeTopThree:true,columns,className:state.metric==="maintenance"?"oo-github-maintenance":""}));
  const meta=document.createElement("p");meta.className="oo-ranking-meta";meta.textContent=envelope?.ranking?`${envelope.ranking.rankMethod} · ${envelope.ranking.ruleVersion} · Taxonomy: ${envelope.ranking.taxonomyVersion} · Eligible population: ${envelope.ranking.eligiblePopulation}`:"Ranking metadata unavailable";const method=document.createElement("p");method.className="oo-ranking-method";method.textContent=state.metric==="adoption"?"Adoption = 0.75 × percent_rank(log1p(stars)) + 0.25 × percent_rank(log1p(forks)); raw stars and forks remain visible.":state.metric==="momentum"?"Momentum requires a fully covered 7, 30, or 90-day window; incomplete windows are ineligible.":"Maintenance is a recency ranking using default-branch commit and stable-release evidence, not a health score. Expand each seven-bucket sparkline for published bucket counts; partial coverage is labeled and never described as exact.";content.append(meta,method,renderHistoryPanel(view,"githubRanks","GitHub rank over time"));root.appendChild(content);root.setAttribute("aria-busy","false");
}

const supportsWebGL=()=>{try{const canvas=document.createElement("canvas");return Boolean(canvas.getContext("webgl2")||canvas.getContext("webgl"))}catch{return false}};
const reducedMotion=()=>new URL(location.href).searchParams.get("motion")==="reduce"||matchMedia("(prefers-reduced-motion: reduce)").matches;
// A catalogue is what a provider's own API lists today, which is NOT the same
// artefact as the OpenRouter "Providers" view (endpoint-level serving data for
// OpenRouter models). Conflating the two has already caused one wrong reading,
// so the two surfaces stay separate and each says which it is.
export function catalogueSummary(rows) {
  const list = Array.isArray(rows) ? rows : [];
  // A model whose modalities the source does not publish is UNKNOWN, never "not
  // chat". Cerebras publishes no outputModalities at all, so reporting 0 chat
  // models there would be a claim the data does not support.
  // An empty array publishes nothing, so it is UNKNOWN, not "some other modality".
  // Treating it as other produced the literal string "1 other modality ()".
  const declared = (row) => Array.isArray(row.outputModalities) && row.outputModalities.length > 0;
  const text = list.filter((row) => declared(row) && row.outputModalities.includes("text"));
  const other = list.filter((row) => declared(row) && !row.outputModalities.includes("text"));
  const unknown = list.filter((row) => !declared(row));
  const otherKinds = [...new Set(other.flatMap((row) => row.outputModalities))].sort();
  // Fields null on EVERY row are unpublished by this source, not zero.
  const columns = ["contextLength", "pricing", "isFree", "providerActive", "performance"];
  const unpublished = columns.filter((key) => list.length > 0 && list.every((row) => row[key] === null
    || (key === "pricing" && row.pricing?.promptUsdPerToken === null && row.pricing?.completionUsdPerToken === null)));
  // Cerebras publishes no modalities at all, so filtering to text-capable would
  // render an empty table for a provider that does list models. Fall back to
  // EVERY row -- falling back to the unknown ones alone hid real other-modality
  // models while the note claimed the source published no modalities.
  const shown = text.length ? text : list;
  return Object.freeze({
    total: list.length, text: Object.freeze(text), textCount: text.length,
    shown: Object.freeze(shown), shownAreNotTextCapable: text.length === 0 && list.length > 0,
    noModalityPublished: unknown.length > 0 && other.length === 0,
    otherCount: other.length, otherKinds: Object.freeze(otherKinds),
    unknownCount: unknown.length, unpublished: Object.freeze(unpublished),
    disappeared: list.filter((row) => row.availability === "disappeared").length
  });
}

// TASK FITNESS. This answers "for this task, what do people actually route to",
// which is REVEALED PREFERENCE, not a quality verdict. That distinction is the
// whole point: an unsourced claim that a model is good enough is worse than a
// plain ranking, so nothing here scores a model. Usage share is the source's
// own; price and context are joined from the published catalogue and each row
// carries HOW it was matched.
const percent = (share) => `${(Number(share) * 100).toFixed(1)}%`;

export function taskFitnessRows(task, catalogue) {
  return Object.freeze((Array.isArray(task?.models) ? task.models : [])
    .slice()
    .sort((left, right) => left.sourcePosition - right.sourcePosition)
    .map((model) => {
      const resolved = resolveTaskModel(model.id, catalogue);
      return Object.freeze({
        id: model.id, sourcePosition: model.sourcePosition,
        usageShare: model.usageShare, tokenShare: model.tokenShare,
        match: resolved.match, via: resolved.via,
        contextLength: resolved.row?.contextLength ?? null,
        promptPrice: resolved.row?.pricing?.promptUsdPerToken ?? null
      });
    }));
}

export function renderTaskFitness(view, catalogue) {
  const { document } = context();
  const wrap = section(document, "oo-task-fitness", "oo-task-fitness");
  const intro = document.createElement("p"); intro.className = "oo-router-note";
  intro.textContent = "What people actually route to for each task, from observed usage. This is revealed preference, not a quality verdict: nothing here scores a model or claims one is good enough. Usage share is the source's own; price and context are joined from the published catalogue.";
  wrap.appendChild(intro);
  const quality = document.createElement("p"); quality.className = "oo-region-meta oo-catalogue-unpublished";
  // This view does not request /benchmarks, so it cannot claim the evidence is
  // unavailable -- that would be asserting an absence it never observed, which
  // is the same error as reporting a failure as a finding.
  quality.textContent = datasetState(view, "benchmarks") === "failed"
    ? "The benchmark request failed on this view, so no quality term is shown and none is invented. The ranking below is by observed usage only."
    : "No quality score is computed here and none is invented. Benchmark evidence is not loaded on this view -- see the Benchmarks tab for it. The ranking below is by observed usage only.";
  wrap.appendChild(quality);
  if (!catalogue.complete) {
    const partial = document.createElement("p"); partial.className = "oo-region-meta oo-catalogue-unpublished";
    partial.textContent = `The model catalogue was only partly read (${catalogue.size} entries), so price and context are joined against an incomplete set. Rows shown as unmatched below may simply be on a page that was not read. This is a failure of the join, not a statement about the source.`;
    wrap.appendChild(partial);
  }
  const tasks = envelopeRows(view, "tasks").slice().sort((left, right) => Number(right.usageShare) - Number(left.usageShare));
  const asOf = view.responses.tasks?.provenance?.[0]?.sourceAsOf ?? null;
  for (const task of tasks) {
    const rows = taskFitnessRows(task, catalogue);
    const region = section(document, "", "oo-data-region oo-task");
    const heading = document.createElement("h2"); heading.className = "oo-region-title";
    heading.textContent = `${task.displayName} · ${task.macroCategory}`; region.appendChild(heading);
    const meta = document.createElement("p"); meta.className = "oo-region-meta";
    meta.textContent = `${percent(task.usageShare)} of all observed usage · ${percent(task.categoryUsageShare)} within ${task.macroCategory} · ${task.tag}`;
    region.appendChild(meta);
    const caveats = [];
    if (task.sampled) caveats.push("the source samples rather than counting every request");
    if (task.otherExcluded) caveats.push("a long tail is excluded from these shares");
    if (task.topModelsComplete === false) caveats.push("this is the published top slice, not every model used");
    if (caveats.length) {
      const note = document.createElement("p"); note.className = "oo-region-meta oo-catalogue-unpublished";
      note.textContent = `Source caveats: ${caveats.join("; ")}.`;
      region.appendChild(note);
    }
    const substituted = rows.filter((row) => row.match === "undated").length;
    const unresolved = rows.filter((row) => row.match === "unresolved").length;
    if (substituted || unresolved) {
      const join = document.createElement("p"); join.className = "oo-region-meta oo-catalogue-unpublished";
      const parts = [];
      if (substituted) parts.push(`${substituted} priced via an undated catalogue entry, because the task names a date-pinned build the catalogue does not list \u2014 that price belongs to the undated entry, not to the pinned build`);
      if (unresolved) parts.push(catalogue.complete
        ? `${unresolved} absent from the published catalogue, so no price or context is shown`
        : `${unresolved} unmatched, but the catalogue was only partly read, so this is an incomplete join and NOT evidence the models are absent`);
      join.textContent = `Join: ${parts.join("; ")}.`;
      region.appendChild(join);
    }
    region.appendChild(renderRankTable({
      document, title: `${task.displayName} model usage`, rows, sourceLabel: "Observed usage \u00b7 task_classifications", asOf,
      columns: [
        { label: "#", value: (row) => row.sourcePosition },
        { label: "Model", value: (row) => row.id },
        { label: "Usage", value: (row) => percent(row.usageShare), exact: (row) => row.usageShare },
        { label: "Tokens", value: (row) => percent(row.tokenShare), exact: (row) => row.tokenShare },
        { label: "Prompt $/tok", value: (row) => row.promptPrice === null ? "\u2014" : row.promptPrice },
        { label: "Context", value: (row) => row.contextLength === null ? "\u2014" : compactIntegerString(row.contextLength), exact: (row) => row.contextLength },
        { label: "Matched", value: (row) => row.match === "exact" ? "exact" : row.match === "undated" ? `via ${row.via}` : catalogue.complete ? "not in catalogue" : "join incomplete" }
      ]
    }));
    wrap.appendChild(region);
  }
  return wrap;
}

// PAIRING, harness half. WHICH open-source harnesses exist, with licence
// actually verified, is publishable today. Which MODELS each one routes to is
// not: /app-model-matrix and /apps/{id}/models are collection_disabled, and no
// published field joins a GitHub repository to an OpenRouter app. So the view
// shows both halves and names the missing link rather than guessing it by name.
export function renderHarnessRoster(view) {
  const { document } = context();
  if (datasetState(view, "harnesses") !== "ready") return renderDatasetGap(document, view, "harnesses", "Open-source harnesses");
  const response = view.responses.harnesses;
  const wrap = section(document, "", "oo-data-region oo-harness-roster");
  const heading = document.createElement("h2"); heading.className = "oo-region-title";
  heading.textContent = "Open-source harnesses"; wrap.appendChild(heading);
  const note = document.createElement("p"); note.className = "oo-region-meta";
  note.textContent = "The harness half of the pairing. These are repositories the GitHub taxonomy classifies as harnesses; the apps leaderboard above is largely the same software seen as an API consumer. No published field joins the two, so this page does not assert which repository is which app.";
  wrap.appendChild(note);
  wrap.appendChild(renderRankTable({
    document, title: "Open-source harnesses", rows: response.data.slice(0, 25),
    sourceLabel: "GitHub taxonomy \u00b7 project-family", asOf: response.coverage?.resolvedAsOf ?? null,
    columns: [
      { label: "Repository", value: (row) => row.fullName, href: (row) => row.url },
      { label: "Language", value: (row) => exact(row.language) },
      { label: "Licence", value: (row) => row.license === null ? "not published" : String(row.license).replaceAll("_", " ") },
      { label: "Lifecycle", value: (row) => exact(row.lifecycle) },
      { label: "Stars", value: (row) => compactIntegerString(row.stars), exact: (row) => row.stars },
      { label: "Forks", value: (row) => compactIntegerString(row.forks), exact: (row) => row.forks }
    ]
  }));
  return wrap;
}

export function renderProviderRail(view) {
  const { document } = context();
  const rail = section(document, "oo-provider-rail", "oo-provider-rail");
  const heading = document.createElement("h2"); heading.className = "oo-region-title";
  heading.textContent = "Providers compared"; rail.appendChild(heading);
  const note = document.createElement("p"); note.className = "oo-region-meta";
  note.textContent = "What each provider's own API lists today. Full tables, with every model and its source, are on the Catalogues page.";
  rail.appendChild(note);
  const grid = document.createElement("div"); grid.className = "oo-analysis-grid";
  for (const [slug, label, served] of CATALOGUE_PROVIDERS) {
    const key = `catalogue:${slug}`;
    const article = document.createElement("article");
    article.className = "oo-micro-panel"; article.dataset.overviewDataset = key;
    const h = document.createElement("h2"); h.textContent = label;
    const count = document.createElement("strong");
    const p = document.createElement("p");
    // A count is only ever printed where one was actually measured. "0" is a
    // measurement; not-yet-loaded and failed are not, so they render as an em
    // dash. Both reviewers caught this rail printing 0 for states that are not
    // counts at all.
    if (!served) {
      // An unserved provider is named, not omitted. Asking for four and quietly
      // seeing three is the failure this dashboard exists to prevent.
      count.textContent = "—";
      p.textContent = `No source publishes this catalogue (measured ${CATALOGUE_SERVED_AS_OF})`;
    } else if (datasetState(view, key) === "ready") {
      const summary = catalogueSummary(view.responses[key]?.data);
      count.textContent = String(summary.total);
      // catalogueSummary's own comment forbids reporting 0 text-capable for a
      // source that publishes no modalities -- that is a claim its data cannot
      // support. Cerebras is exactly that case.
      p.textContent = summary.noModalityPublished
        ? "modality not published by this source"
        : `${summary.textCount} text-capable`;
    } else if (datasetState(view, key) === "failed") {
      count.textContent = "—";
      p.textContent = `Request failed · ${failureCode(view.errors[key]) ?? "error"}`;
    } else {
      count.textContent = "—";
      p.textContent = "Loads near this rail";
    }
    article.append(h, count, p); grid.appendChild(article);
  }
  rail.appendChild(grid);
  const link = document.createElement("p"); link.className = "oo-region-meta";
  const a = document.createElement("a"); a.href = "/web/open-dashboard/catalogues/index.html";
  a.textContent = "Open the Catalogues page";
  link.appendChild(a); rail.appendChild(link);
  return rail;
}

export function renderCatalogues(view) {
  const { document, root } = context();
  root.replaceChildren(); renderSourceRail(view); appendSnapshotNotice(document, root, view);
  const content = section(document, "oo-catalogue-content", "oo-route-content");
  const intro = document.createElement("p"); intro.className = "oo-router-note";
  intro.textContent = "What each provider's own API lists as available today. This is a different artefact from the OpenRouter Providers view, which describes endpoint-level serving for OpenRouter models only.";
  content.appendChild(intro);
  for (const [slug, label, served, sourceId] of CATALOGUE_PROVIDERS) {
    const key = `catalogue:${slug}`;
    if (!served) {
      content.appendChild(renderUnavailable({ document, title: label, reason: `No source publishes this catalogue. The public API rejects it as an unknown provider, so nothing is shown in its place and no figure is inferred. Measured ${CATALOGUE_SERVED_AS_OF}; if the API starts serving it, this panel is what goes stale.`, code: "provider not served · HTTP 400 INVALID_QUERY" }));
      continue;
    }
    if (datasetState(view, key) !== "ready") { content.appendChild(renderDatasetGap(document, view, key, label)); continue; }
    const response = view.responses[key];
    // Name THIS provider's source, not whichever happens to be listed first.
    const provenance = (response?.provenance ?? []).find((entry) => entry.sourceId === sourceId) ?? null;
    const summary = catalogueSummary(response?.data);
    const region = section(document, "", "oo-data-region oo-catalogue");
    const heading = document.createElement("h2"); heading.className = "oo-region-title"; heading.textContent = label; region.appendChild(heading);
    const counts = document.createElement("p"); counts.className = "oo-region-meta";
    // A cursor means this is one page, not the catalogue. Reporting the page as a
    // total is exactly the denominator error this dashboard exists to avoid.
    const paged = Boolean(response?.cursor);
    const parts = [paged ? `${summary.total} shown (first page; the source pages this catalogue)` : `${summary.total} listed`, `${summary.textCount} text-capable`];
    if (summary.otherCount) parts.push(`${summary.otherCount} other modality (${summary.otherKinds.join(", ")})`);
    if (summary.unknownCount) parts.push(`${summary.unknownCount} modality not published`);
    if (summary.disappeared) parts.push(`${summary.disappeared} disappeared`);
    counts.textContent = parts.join(" · ");
    region.appendChild(counts);
    if (summary.unpublished.length) {
      const gap = document.createElement("p"); gap.className = "oo-region-meta oo-catalogue-unpublished";
      gap.textContent = `Not published by this source for any model: ${summary.unpublished.join(", ")}. Blank cells below are unpublished, not zero.`;
      region.appendChild(gap);
    }
    region.appendChild(renderRankTable({
      document, title: `${label} catalogue`, rows: summary.shown.slice(0, 25),
      sourceLabel: `${label} catalogue · ${provenance ? provenance.sourceId : `${sourceId} (not named in this response)`}`,
      asOf: provenance?.fetchedAt ?? null,
      columns: [
        { label: "Model", value: (row) => row.id },
        { label: "Context", value: (row) => row.contextLength === null ? "—" : compactIntegerString(row.contextLength), exact: (row) => row.contextLength },
        { label: "Prompt $/tok", value: (row) => exact(row.pricing?.promptUsdPerToken) },
        { label: "Completion $/tok", value: (row) => exact(row.pricing?.completionUsdPerToken) },
        { label: "Modality", value: (row) => Array.isArray(row.outputModalities) && row.outputModalities.length ? row.outputModalities.join(", ") : "not published" },
        { label: "Free", value: (row) => row.isFree === null ? "—" : row.isFree ? "yes" : "no" },
        { label: "Seen", value: (row) => String(row.lastConfirmedAt).slice(0, 10) }
      ]
    }));
    if (summary.shownAreNotTextCapable) {
      const note = document.createElement("p"); note.className = "oo-region-meta oo-catalogue-unpublished";
      note.textContent = summary.noModalityPublished
        ? "This source publishes no output modalities, so these models are listed without a text-capable claim being made about them."
        : "No model here declares text output. Every listed model is shown with the modality its source does declare.";
      region.appendChild(note);
    }
    if (summary.shown.length > 25) {
      const more = document.createElement("p"); more.className = "oo-region-meta";
      more.textContent = `Showing the first 25 of ${summary.shown.length}${paged ? " on this page" : ""}.`;
      region.appendChild(more);
    }
    content.appendChild(region);
  }
  root.appendChild(content); root.setAttribute("aria-busy", "false");
}

export function buildRelationshipGraph(view){const nodes=[];const edges=[];const seen=new Set();const matrix=view.responses.matrix;if(matrix?.status==="available"){for(const appId of matrix.appIds){const id=`app:${appId}`;seen.add(id);nodes.push({id,label:appId,kind:"app"})}for(const modelId of matrix.modelIds){const id=`model:${modelId}`;seen.add(id);nodes.push({id,label:modelId,kind:"model"})}for(const cell of matrix.cells.filter(item=>item.state==="observed").sort((a,b)=>a.rankWithinPeriod-b.rankWithinPeriod||a.appId.localeCompare(b.appId)||a.modelId.localeCompare(b.modelId)).slice(0,100))edges.push({sourceId:`app:${cell.appId}`,targetId:`model:${cell.modelId}`})}const categories=GITHUB_CATEGORIES.map(([slug,label])=>({slug,label,response:view.responses[`github:${slug}`]})).filter(item=>item.response);for(const category of categories){const id=`category:${category.slug}`;seen.add(id);nodes.push({id,label:category.label,kind:"category"})}for(let rowIndex=0;nodes.length<32&&rowIndex<10;rowIndex++)for(const category of categories){const row=category.response.data[rowIndex];if(!row||nodes.length>=32)continue;const id=`repository:${row.repositoryId}`;if(!seen.has(id)){seen.add(id);nodes.push({id,label:row.fullName,kind:"repository"});if(edges.length<110)edges.push({sourceId:`category:${category.slug}`,targetId:id})}}return Object.freeze({nodes:Object.freeze(nodes),edges:Object.freeze(edges)})}
async function mountThreeNow(host,graph){const module=await import("./open-dashboard-three.js?v=20260725c");return module.mountRelationshipCanopy({host,graph})}
export function installThreeEnhancement(view,config){const{document}=context();const host=document.getElementById("oo-network-region");const graph=buildRelationshipGraph(view);host.replaceChildren();if(!config.threeEnabled||!graph.nodes.length||reducedMotion()||!supportsWebGL()||typeof IntersectionObserver!=="function"){const note=document.createElement("p");note.className="oo-network-note";note.textContent="Relationship map omitted; the semantic matrix and ranking tables remain authoritative.";host.appendChild(note);return}const load=async()=>{if(host.dataset.threeState==="loading"||host.dataset.threeState==="ready")return;host.dataset.threeState="loading";try{const controller=await mountThreeNow(host,graph);host.dataset.threeState="ready";const active=new IntersectionObserver(([entry])=>controller.setActive(entry.isIntersecting));active.observe(host);window.addEventListener("pagehide",()=>{active.disconnect();controller.destroy()},{once:true})}catch{const note=document.createElement("p");note.className="oo-network-note";note.textContent="WebGL map unavailable; the semantic matrix and ranking tables remain authoritative.";host.replaceChildren(note);host.dataset.threeState="failed"}};if(navigator.connection?.saveData){const button=document.createElement("button");button.type="button";button.className="oo-load-map";button.textContent="Load ecosystem map";button.addEventListener("click",()=>{button.remove();load()},{once:true});host.appendChild(button);return}const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)return;observer.disconnect();load()},{rootMargin:"100px"});observer.observe(host)}

export async function readConfig(fetchImpl,timeoutMs=8000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(new DOMException("timed out","TimeoutError")),timeoutMs);try{const response=await fetchImpl("/web/open-dashboard/config.json",{credentials:"omit",cache:"no-store",redirect:"error",signal:controller.signal});if(!response.ok)throw new Error("Open Dashboard config is unavailable");return response.json()}catch(error){if(controller.signal.aborted||error?.name==="AbortError"||error?.name==="TimeoutError")throw new Error("Open Dashboard config request timed out");throw error}finally{clearTimeout(timer)}}
export async function bootOpenDashboard({ fetchImpl = globalThis.fetch.bind(globalThis) } = {}) {
  const { document, root, sourceToggle, sourcePanel } = context();
  sourceToggle.addEventListener("click", () => {
    const expanded = sourceToggle.getAttribute("aria-expanded") === "true";
    sourceToggle.setAttribute("aria-expanded", String(!expanded));
    sourcePanel.hidden = expanded;
  });
  try {
    const config = await readConfig(fetchImpl);
    const client = createOpenDashboardClient({ ...config, fetchImpl });
    const route = document.body.dataset.openDashboardRoute;
    if (route === "overview") {
      const view = await client.loadView(OVERVIEW_INITIAL_REQUESTS);
      renderOverview(view, config);
      installOverviewDeferredLoad(client, view);
    } else if (route === "openrouter") {
      const state = parseOpenRouterState(location.href);
      const requests = OPENROUTER_VIEWS[state.view].requests.slice();
      if (state.view === "app-to-model" && state.appId) requests.push({ key: "appModels", path: ENDPOINTS.appModels(state.appId), kind: "appModels", optional: true });
      let view = await client.loadView(requests);
      if (state.view === "apps" && view.responses.apps) {
        const appRequests = topAppModelRequests(view.responses.apps);
        if (appRequests.length) {
          try {
            const evidence = await client.loadView(appRequests, view.mode === "snapshot" ? {} : { manifest: view.manifest });
            view = mergeCompatibleViews(view, evidence);
          } catch (error) {
            const errors = Object.fromEntries(appRequests.map((spec) => [spec.key, error]));
            view = Object.freeze({ ...view, errors: Object.freeze({ ...view.errors, ...errors }) });
          }
        }
      }
      let catalogue = buildModelCatalogue([]);
      if (state.view === "tasks") {
        const pages = [];
        let cursor = null;
        let complete = false;
        for (let page = 0; page < MAX_CATALOGUE_PAGES; page += 1) {
          let loaded = null;
          try { loaded = await client.loadView([{ key: `catalogue:page:${page}`, path: ENDPOINTS.liveModels("openrouter", cursor), kind: "liveModels", optional: true }], view.mode === "snapshot" ? {} : { manifest: view.manifest }); }
          catch { break; }
          const response = loaded.responses[`catalogue:page:${page}`];
          // A missing page is a FAILED read, not the end of the catalogue.
          if (!response) break;
          pages.push(response);
          cursor = response.cursor;
          // Only a null cursor means we reached the end. Running out of page
          // budget with a cursor still in hand does not.
          if (!cursor) { complete = true; break; }
        }
        catalogue = buildModelCatalogue(pages, { complete });
      }
      if (state.view === "app-to-model") {
        try { view = mergeCompatibleViews(view, await client.loadView([{ key: "harnesses", path: ENDPOINTS.githubRepositories("ai-harnesses", 25), kind: "githubRepositories", optional: true }], view.mode === "snapshot" ? {} : { manifest: view.manifest })); }
        catch (error) { view = Object.freeze({ ...view, errors: Object.freeze({ ...view.errors, harnesses: error }) }); }
      }
      renderOpenRouter(view, state, catalogue);
    } else if (route === "github") {
      const state = parseGithubState(location.href);
      const request = { key: "ranking", path: ENDPOINTS.githubRanking(state.category, state.metric, state.metric === "momentum" ? state.windowDays : null), kind: "github" };
      const availability = [7, 30, 90].map((days) => ({ key: `momentum:${days}`, path: ENDPOINTS.githubRanking(state.category, "momentum", days, 1), kind: "github", optional: true }));
      let view = await client.loadView([request, ...availability, { key: "history", path: ENDPOINTS.history, kind: "history", optional: true }]);
      if (state.metric === "maintenance" && view.responses.ranking) {
        const enrichmentRequests = topGitHubEnrichmentRequests(view.responses.ranking);
        if (enrichmentRequests.length) {
          try {
            view = mergeCompatibleViews(view, await client.loadView(enrichmentRequests, view.mode === "snapshot" ? {} : { manifest: view.manifest }));
          } catch (error) {
            const errors = Object.fromEntries(enrichmentRequests.map((spec) => [spec.key, error]));
            view = Object.freeze({ ...view, errors: Object.freeze({ ...view.errors, ...errors }) });
          }
        }
      }
      renderGithub(view, state);
    } else if (route === "catalogues") {
      const requests = CATALOGUE_PROVIDERS.filter(([, , served]) => served)
        .map(([slug]) => ({ key: `catalogue:${slug}`, path: ENDPOINTS.liveModels(slug), kind: "liveModels", optional: true }));
      renderCatalogues(await client.loadView(requests));
    } else if (route === "matrix") {
      renderMatrix(await client.loadView(MATRIX_REQUESTS));
    } else {
      // An unrecognised route used to fall through this if/else and complete the
      // try having done nothing: no request, no render, no error, and the static
      // "Loading validated public data..." placeholder left on screen forever.
      // That is how a renamed data-open-dashboard-route attribute hid for a whole
      // build. A route the page cannot serve is a failure and must say so.
      throw new Error(`Unknown Open Dashboard route ${JSON.stringify(route ?? null)}; the page cannot choose what to load.`);
    }
  } catch (error) {
    // Lead with a sentence; keep the thrown message as evidence rather than as
    // the headline, which is where a bare "Failed to fetch" used to land.
    root.replaceChildren(renderUnavailable({ document, title: "Open Dashboard unavailable", reason: "This page could not load its evidence. Nothing is shown in its place rather than guessing.", code: error.message }));
    root.setAttribute("aria-busy", "false");
    sourceToggle.textContent = "Sources · unavailable";
  }
}
if(hasDom)bootOpenDashboard();
