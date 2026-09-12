import {
  API_BASE,
  DEFAULT_STATE,
  finite,
  request,
  tokenPoints,
  observedCells,
  consecutiveHistoryDays,
} from "./explorer-data.js";
import { PACKAGE_VERSION, TOOLS } from "./setup-data.js";
import { CATEGORIES, projectUrl, rankingRows } from "./github/projects.js";

const array = (value) => (Array.isArray(value) ? value : []);
const stamp = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
const latest = (values) =>
  values
    .map(stamp)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
const count = (value) =>
  Number.isSafeInteger(Number(value)) && /^(0|[1-9]\d*)$/.test(String(value))
    ? Number(value)
    : null;
const integer = (value) =>
  typeof value === "string" && /^\d{1,40}$/.test(value)
    ? value
    : Number.isSafeInteger(value) && value >= 0
      ? String(value)
      : null;
const target = {
  dashboard_catalogue: {
    view: "models",
    modelChart: "catalogue",
    modality: "all",
  },
  dashboard_model_economics: {
    view: "models",
    modelChart: "prices",
    modality: "text",
  },
  dashboard_free_models: {
    view: "models",
    modelChart: "catalogue",
    modality: "all",
    free: true,
  },
  dashboard_model_status: {
    view: "models",
    modelChart: "catalogue",
    modality: "all",
    inactive: true,
  },
  dashboard_whats_changed: { view: "changes" },
  dashboard_usage_leaders: { view: "history" },
  dashboard_matrix: "#connections",
  dashboard_github_trending: "#overview-projects",
  dashboard_github_movers: "./github/",
  dashboard_benchmarks: { view: "benchmarks" },
  dashboard_speed: "#overview-methods",
  dashboard_source_health: "#overview-health",
  dashboard_contract: "#overview-methods",
};

/** A discovery map, not a claim that the browser reproduces every tool workflow. */
export const MCP_COVERAGE = Object.freeze(
  TOOLS.map((tool) => ({
    ...tool,
    target: target[tool.id] ?? `./mcp/?tools=${tool.id}`,
    agentWorkflow: [
      "dashboard_resolve_model",
      "dashboard_key_inventory",
      "dashboard_price_comparison",
    ].includes(tool.id),
  })),
);

// Reviewed against the installed 1.1.3 contract and speed tool.
// These package facts have their own version; the page load is not a new probe.
export const PACKAGE_EVIDENCE = Object.freeze({
  version: PACKAGE_VERSION,
  checkedAt: "2026-09-11",
  schemaVersion: "1.0",
  priceUnits: [
    "token_in",
    "token_out",
    "token_cached",
    "token_cache_create",
    "image",
    "megapixel",
    "video_second",
    "video",
    "request",
    "gpu_hour",
  ],
  conditionKinds: [
    "latency_window",
    "time_band",
    "tier",
    "rate_class",
    "price_scope",
  ],
  provenance: ["published", "derived", "parsed_from_prose", "unknown"],
  speed: {
    numericRates: 0,
    protocol: {
      maxTokens: 700,
      requestedRuns: 4,
      discardedRuns: 1,
      retainedRuns: 3,
      stream: true,
      statistic: "Median and range of the retained three runs",
    },
    observations: [
      {
        provider: "cerebras",
        model: "gpt-oss-120b",
        state: "unknown",
        note: "The package withdrew an unsupported 3,000 tokens/second claim. A general relative-speed claim is not a per-model measurement.",
      },
      {
        provider: "cerebras",
        model: "gpt-oss-120b",
        state: "historical measurement, rate withheld",
        note: "A real-call record dated 2026-08-28 lacks its exact timestamp, vantage point, prompt hash and token basis. It is not a protocol-complete speed probe.",
      },
      {
        provider: "groq",
        model: "gpt-oss-120b",
        state: "unknown",
        note: "The package withdrew an 8,000 tokens/second claim that confused a tokens-per-minute quota with measured throughput.",
      },
    ],
  },
  deprecations: [
    ...[
      "catalogueModel.pricing",
      "catalogueModel.pricing.prices",
      "liveModel.pricing",
      "modelEconomicsModel.pricing",
      "freeModels.liveCandidates[].pricing",
      "modelStatus.model.pricing",
    ].map((field) => ({
      field,
      removed_in: "1.0.0",
      replaced_by: "pricePoints",
      reason: null,
      since: "2026-09-08",
      state: "published",
    })),
    {
      field: "liveModel.pricingWindow",
      removed_in: "1.0.0",
      replaced_by: "pricePoints[].condition",
      reason: null,
      since: "2026-09-08",
      state: "published",
    },
    {
      field: "priceComparison.rows[].claimAssessment",
      removed_in: "1.0.0",
      replaced_by: null,
      reason:
        "Per-model assessment of a vendor discount claim is not published in 1.0. vendorClaim.globalAssessment still reports whether the claim is established across the platform, but no per-model verdict replaces this field.",
      since: "2026-09-08",
      state: "published",
    },
  ],
});

export const FRONTIER_VIEWS = Object.freeze([
  {
    id: "context-popularity",
    label: "Context × popularity",
    x: "contextLength",
    y: "weeklyPopularityRank",
    xLabel: "Context · tokens",
    yLabel: "Weekly popularity rank",
    xDirection: "max",
    yDirection: "min",
  },
  {
    id: "quality-throughput",
    label: "Quality × throughput",
    x: "benchmarkQuality",
    y: "medianThroughput",
    xLabel: "Published benchmark quality",
    yLabel: "Median throughput · tokens/s",
    xDirection: "max",
    yDirection: "max",
  },
]);

export function sourceSummary(raw) {
  const pages = Array.isArray(raw?.pages) ? raw.pages : raw ? [raw] : [];
  const provenance = pages.flatMap((page) => array(page.provenance));
  const collectedDates = provenance
    .map((row) => stamp(row.fetchedAt))
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return {
    available: !!raw,
    sourceAt:
      latest(provenance.map((row) => row.sourceAsOf)) ??
      latest(pages.map((page) => page.window?.end)),
    fetchedAt: latest(provenance.map((row) => row.fetchedAt)),
    collectedFrom: collectedDates[0] ?? null,
    collectedTo: collectedDates.at(-1) ?? null,
    stale: pages.some((page) => page.stale === true),
    acquisitionComplete:
      pages.length > 0 &&
      pages.every((page) => page.completeness?.acquisitionComplete === true),
    hasMore: raw?.hasMore === true || !!raw?.cursor,
    populations: [
      ...new Set(
        pages
          .map((page) => page.completeness?.populationCompleteness)
          .filter(Boolean),
      ),
    ],
  };
}

export function normalizeFreeFrontier(raw, viewId) {
  const view = FRONTIER_VIEWS.find((entry) => entry.id === viewId);
  if (!view) throw new Error("Unknown frontier view");
  const sourceUrl = `${API_BASE}/free-frontiers?x=${view.x}&y=${view.y}&limit=100`;
  const matches = array(raw?.data).filter(
    (row) =>
      row.dimensions?.x === view.x &&
      row.dimensions?.y === view.y &&
      row.dimensions?.xDirection === view.xDirection &&
      row.dimensions?.yDirection === view.yDirection,
  );
  if (matches.length !== 1)
    throw new Error("The public frontier does not match the requested axes");
  const row = matches[0],
    members = [],
    rejected = [];
  const identities = new Map();
  for (const member of array(row.members))
    identities.set(member?.modelId, (identities.get(member?.modelId) ?? 0) + 1);
  for (const member of array(row.members)) {
    const x = finite(member?.x),
      y = finite(member?.y);
    const id = typeof member?.modelId === "string" ? member.modelId : "";
    if (
      !id ||
      identities.get(id) !== 1 ||
      x === null ||
      y === null ||
      (view.y === "weeklyPopularityRank" && (!Number.isInteger(y) || y < 1))
    ) {
      rejected.push({
        modelId: id || null,
        reason: "Invalid or ambiguous numeric member",
      });
      continue;
    }
    members.push({
      modelId: id,
      x,
      y,
      xExact: String(member.x),
      yExact: String(member.y),
    });
  }
  return {
    ...view,
    status: "available",
    sourceUrl,
    source: sourceSummary(raw),
    members,
    excluded: array(row.excluded).map((entry) => ({
      modelId: typeof entry.modelId === "string" ? entry.modelId : null,
      reason:
        typeof entry.reason === "string" ? entry.reason : "Reason not reported",
    })),
    rejected,
    reportedMembers: array(row.members).length,
    ruleVersion: typeof row.ruleVersion === "string" ? row.ruleVersion : null,
  };
}

/** Failed newer attempts never become the provenance of the displayed publication. */
export function normalizeSourceHealth(raw, now = new Date()) {
  const nowMs = Number(now instanceof Date ? now.getTime() : now);
  const sources = array(raw?.data)
    .filter((row) => typeof row?.sourceId === "string")
    .map((row) => {
      const scheduled = Date.parse(row.nextScheduledAt);
      const attempted = Math.max(
        Date.parse(row.lastAttemptStartedAt) || 0,
        Date.parse(row.lastAttemptFinishedAt) || 0,
      );
      const missedSchedule =
        Number.isFinite(nowMs) &&
        Number.isFinite(scheduled) &&
        nowMs > scheduled &&
        attempted < scheduled;
      const publishedAttempt =
        typeof row.publishedRunId === "string" &&
        row.lastAttemptRunId === row.publishedRunId &&
        row.lastAttemptStatus === "published";
      return {
        id: row.sourceId,
        sourceUrl: row.citationUrl ?? null,
        publishedAt: stamp(row.publishedAt),
        lastSuccessAt: stamp(row.lastSuccessAt),
        nextScheduledAt: stamp(row.nextScheduledAt),
        lastAttemptAt:
          stamp(row.lastAttemptFinishedAt) ?? stamp(row.lastAttemptStartedAt),
        lastAttemptStatus: row.lastAttemptStatus ?? "unknown",
        errorCode: row.lastAttemptErrorCode ?? null,
        failed: row.lastAttemptStatus === "failed",
        missedSchedule,
        stale: typeof row.stale === "boolean" ? row.stale : null,
        failureCount: count(row.consecutiveFailureCount),
        population: publishedAttempt
          ? (row.lastAttemptPopulationCompleteness ?? "unknown")
          : "unknown",
        acquisitionComplete:
          publishedAttempt && row.lastAttemptAcquisitionComplete === true,
        publishedRunId: row.publishedRunId ?? null,
      };
    });
  return {
    available: !!raw,
    sources,
    total: raw ? sources.length : null,
    failed: raw ? sources.filter((row) => row.failed).length : null,
    stale: raw ? sources.filter((row) => row.stale === true).length : null,
    delayed: raw ? sources.filter((row) => row.missedSchedule).length : null,
    unknown: raw
      ? sources.filter((row) => row.stale === null || !row.publishedAt).length
      : null,
  };
}

export function normalizeTrending(raw, now = new Date()) {
  if (
    !Array.isArray(raw?.data) ||
    raw.data.length > 100 ||
    raw.since !== "daily" ||
    raw.language !== null
  )
    throw new Error("Unexpected GitHub trending slice");
  const collectedAt = stamp(raw.collectedAt);
  const ageHours = collectedAt
    ? Math.max(0, (Number(now) - Date.parse(collectedAt)) / 3600000)
    : null;
  const repositories = raw.data.flatMap((row) => {
    const url = projectUrl(row.url);
    return url && typeof row.fullName === "string"
      ? [
          {
            fullName: row.fullName,
            url,
            description:
              typeof row.description === "string" ? row.description : null,
            language: row.language ?? null,
            stars: count(row.stars),
            forks: count(row.forks),
            starsGained: Number.isSafeInteger(row.starsGained)
              ? row.starsGained
              : null,
          },
        ]
      : [];
  });
  return {
    status: "available",
    repositories,
    reportedCount: raw.data.length,
    rejectedCount: raw.data.length - repositories.length,
    collectedAt,
    ageHours,
    stale: ageHours === null ? null : ageHours >= 6,
    acquisitionPath: raw.source ?? "unknown",
    fallbackReason: raw.fallbackReason ?? null,
    sourceUrl: "https://github.com/trending?since=daily",
  };
}

export function normalizeMomentum(raw, category) {
  if (
    !Array.isArray(raw?.data) ||
    raw.data.length > 5 ||
    raw.ranking?.metric !== "momentum" ||
    raw.ranking?.windowDays !== 7 ||
    raw.ranking?.entityLevel !== "project-family" ||
    raw.ranking?.category !== category
  )
    throw new Error("Unexpected GitHub momentum slice");
  return {
    category,
    label: CATEGORIES.find((row) => row[0] === category)?.[1] ?? category,
    status: "available",
    rows: rankingRows(raw).map((row) => ({
      ...row,
      url: projectUrl(`https://github.com/${row.fullName}`),
    })),
    asOf: stamp(raw.coverage?.resolvedAsOf),
    baseline: stamp(raw.ranking?.baselineDate),
    stale: raw.coverage?.stale === true,
    eligiblePopulation: count(raw.ranking?.eligiblePopulation),
    coverageExcluded: count(raw.ranking?.coverageExcluded),
    acquisitionComplete: raw.coverage?.acquisitionComplete === true,
    hasMore: !!raw.page?.nextCursor,
    sourceUrl: `${API_BASE}/github/rankings?metric=momentum&window=7&category=${encodeURIComponent(category)}&entity_level=project-family&limit=5`,
  };
}

/** Eleven fixed public reads, at most four in flight. Each failure owns its empty state. */
export async function loadOverviewSupplemental({
  requester = request,
  now = new Date(),
} = {}) {
  const jobs = [
    ...FRONTIER_VIEWS.map((view) => ({
      id: view.id,
      kind: "frontier",
      path: `/free-frontiers?x=${view.x}&y=${view.y}&limit=100`,
      normalize: (raw) => normalizeFreeFrontier(raw, view.id),
    })),
    {
      id: "trending",
      kind: "trending",
      path: "/github/trending?since=daily",
      normalize: (raw) => normalizeTrending(raw, now),
    },
    ...CATEGORIES.map(([id, label]) => ({
      id,
      label,
      kind: "momentum",
      path: `/github/rankings?metric=momentum&window=7&category=${id}&entity_level=project-family&limit=5`,
      normalize: (raw) => normalizeMomentum(raw, id),
    })),
  ];
  const result = {
    frontiers: [],
    trending: null,
    momentum: { categories: [] },
    errors: [],
    loaded: true,
  };
  let next = 0;
  const values = new Array(jobs.length);
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < jobs.length) {
        const index = next++,
          job = jobs[index];
        try {
          values[index] = job.normalize(await requester(job.path));
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Public source unavailable";
          values[index] = {
            id: job.id,
            category: job.id,
            label: job.label,
            status: "unavailable",
            message,
          };
          result.errors.push({ id: job.id, message });
        }
      }
    }),
  );
  jobs.forEach((job, index) => {
    if (job.kind === "frontier") result.frontiers.push(values[index]);
    else if (job.kind === "trending") result.trending = values[index];
    else result.momentum.categories.push(values[index]);
  });
  return result;
}

function historySummary(history, key) {
  const days = array(history?.data?.[key]);
  const byDate = new Map();
  for (const day of days) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day?.date ?? "") ||
      !stamp(day.date) ||
      new Date(day.date).toISOString().slice(0, 10) !== day.date
    )
      continue;
    // Duplicate days are ambiguous, not two observed days or additive counts.
    byDate.set(
      day.date,
      byDate.has(day.date)
        ? { date: day.date, complete: false, rows: [] }
        : day,
    );
  }
  const validDays = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return {
    key,
    available: !!history,
    days: validDays.length,
    completeDays: validDays.filter((day) => day.complete === true).length,
    start: validDays[0]?.date ?? null,
    end: validDays.at(-1)?.date ?? null,
    entities: new Set(
      validDays.flatMap((day) =>
        array(day.rows)
          .filter((row) => row.remainder == null && row.id !== "other")
          .map((row) => JSON.stringify([row.scope ?? null, row.id])),
      ),
    ).size,
    buckets: validDays,
  };
}

/** A single exact source identity; missing days and duplicate observations are gaps. */
export function overviewHistorySeries(summary) {
  let buckets;
  try {
    buckets = consecutiveHistoryDays(array(summary?.buckets));
  } catch {
    return null;
  }
  const latestDay = buckets.findLast(
    (day) => day.complete === true && day.rows.length > 0,
  );
  const ranked = array(latestDay?.rows)
    .filter(
      (row) =>
        typeof row.id === "string" &&
        row.id !== "other" &&
        row.remainder == null &&
        count(row.rank) > 0,
    )
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        String(a.scope).localeCompare(String(b.scope)) ||
        a.id.localeCompare(b.id),
    );
  const selected = ranked[0];
  if (!selected) return null;
  return {
    id: selected.id,
    scope: selected.scope ?? null,
    label: selected.label || selected.id,
    metric: summary.key === "modelUsage" ? "daily tokens" : "published rank",
    points: buckets.map((day) => {
      const matches = day.rows.filter(
        (row) =>
          row.id === selected.id &&
          (row.scope ?? null) === (selected.scope ?? null),
      );
      const row =
        matches.length === 1 && day.complete === true ? matches[0] : null;
      const exact =
        summary.key === "modelUsage"
          ? integer(row?.value)
          : count(row?.rank) > 0
            ? String(row.rank)
            : null;
      return {
        date: day.date,
        value: exact === null ? null : Number(exact),
        exact,
      };
    }),
  };
}

export function summarizeOverview({
  models = [],
  apps = [],
  matrix,
  history,
  metadata = {},
  evidence,
  supplemental,
} = {}) {
  const entries = [
    ...new Map(
      models
        .filter(
          (model) =>
            typeof model?.provider === "string" &&
            typeof model?.id === "string",
        )
        .map((model) => [JSON.stringify([model.provider, model.id]), model]),
    ).values(),
  ];
  const partitions = [
    "text",
    "image",
    "video",
    "audio",
    "mixed",
    "other",
    "unknown",
  ].map((id) => ({ id, count: 0 }));
  const output = (model) => {
    const kinds = [...new Set(array(model.modalities))];
    return kinds.length > 1
      ? "mixed"
      : ["text", "image", "video", "audio", "other"].includes(kinds[0])
        ? kinds[0]
        : "unknown";
  };
  entries.forEach(
    (model) => partitions.find((part) => part.id === output(model)).count++,
  );
  const nativePrices = entries.filter((model) =>
    array(model.pricePoints).some((point) => finite(point.amount) !== null),
  );
  const tokenQuotes = tokenPoints(entries, {
    ...DEFAULT_STATE,
    x: "input",
    y: "output",
  });
  const benchmarkRows = array(evidence?.benchmarks?.data);
  const transitions = array(evidence?.changes?.data);
  const lifecycleRows = array(evidence?.deprecations?.data);
  const lifecycleStates = [
    "scheduled_deprecation",
    "past_expiration_still_listed",
    "absent_from_catalog",
    "removed_or_unavailable",
  ];
  const cells = observedCells(matrix);
  return {
    catalogue: {
      available: !!metadata.live || !!metadata.media || entries.length > 0,
      entries: entries.length,
      providers: new Set(entries.map((model) => model.provider)).size,
      partitions,
      tokenQuotes: tokenQuotes.length,
      nativePrices: nativePrices.length,
      freePrices: entries.filter((model) => model.freeOffer === "zero_price")
        .length,
      freePlans: entries.filter((model) => model.freeOffer === "free_plan")
        .length,
      source: sourceSummary(metadata.live),
      nativeAt: stamp(metadata.media?.fetchedAt),
    },
    apps: {
      available: !!metadata.apps || apps.length > 0,
      count: apps.length,
      rows: apps.map((row) => ({
        ...row,
        totalTokens: integer(row.totalTokens),
        totalRequests: integer(row.totalRequests),
      })),
      source: sourceSummary(metadata.apps),
      period: metadata.apps?.requestSlice?.period ?? null,
    },
    matrix: {
      available: matrix?.status === "available",
      cells: cells.length,
      possibleCells: count(matrix?.coverage?.possibleCells),
      unmapped: count(matrix?.coverage?.unmappedObservations),
      appCount: array(matrix?.apps).length,
      modelCount: array(matrix?.models).length,
      sourceAt: matrix?.resolvedPeriod?.start ?? null,
    },
    histories: ["modelUsage", "appRanks", "githubRanks"].map((key) =>
      historySummary(history, key),
    ),
    historySource: sourceSummary(history),
    benchmarks: {
      available: !!evidence?.benchmarks,
      count: benchmarkRows.length,
      groups: [
        ...new Set(benchmarkRows.map((row) => row.source).filter(Boolean)),
      ].map((id) => ({
        id,
        count: benchmarkRows.filter((row) => row.source === id).length,
      })),
      source: sourceSummary(evidence?.benchmarks),
    },
    changes: {
      available: !!evidence?.changes,
      count: transitions.length,
      becamePaid: transitions.filter((row) => row.transition === "became_paid")
        .length,
      source: sourceSummary(evidence?.changes),
    },
    lifecycle: {
      available: !!evidence?.deprecations,
      count: lifecycleRows.length,
      events: lifecycleRows.filter((row) => lifecycleStates.includes(row.state))
        .length,
      states: lifecycleStates.map((id) => ({
        id,
        count: lifecycleRows.filter((row) => row.state === id).length,
      })),
      source: sourceSummary(evidence?.deprecations),
    },
    health: normalizeSourceHealth(metadata.sourceStatus),
    supplemental: supplemental ?? {
      loaded: false,
      frontiers: [],
      trending: null,
      momentum: { categories: [] },
      errors: [],
    },
  };
}
