import {
  API_BASE,
  dateLabel,
  finite,
  loadCollection,
  money,
  safeUrl,
} from "./explorer-data.js";

export const BENCHMARK_SOURCES = Object.freeze([
  {
    id: "artificial-analysis",
    label: "Artificial Analysis",
    defaultMetric: "codingIndex",
    defaultPrice: "input",
    metrics: [
      { id: "codingIndex", label: "Coding index" },
      { id: "intelligenceIndex", label: "Intelligence index" },
      { id: "agenticIndex", label: "Agentic index" },
    ],
  },
  {
    id: "design-arena",
    label: "Design Arena",
    defaultMetric: "elo",
    defaultPrice: "input",
    metrics: [
      { id: "elo", label: "Elo score" },
      { id: "winRate", label: "Win rate (%)" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter evaluations",
    defaultMetric: "accuracy",
    defaultPrice: "task",
    metrics: [
      { id: "accuracy", label: "Accuracy (published ratio)" },
      { id: "primaryScore", label: "Published primary score" },
    ],
  },
]);
export const BENCHMARK_PRICES = Object.freeze([
  { id: "input", label: "Published input price · USD / 1M tokens" },
  { id: "output", label: "Published output price · USD / 1M tokens" },
  { id: "task", label: "Average evaluation cost · USD / task" },
]);
export const CHANGE_RANGES = Object.freeze([
  { id: "year", label: "Up to one year ahead of source snapshot" },
  { id: "all", label: "All published dates" },
]);
const DATASETS = [
  {
    id: "benchmarks",
    path: "/benchmarks?limit=100",
    label: "Published benchmark observations",
    pages: 20,
  },
  {
    id: "changes",
    path: "/price-changes?limit=200",
    label: "OpenRouter price comparison",
    pages: 10,
  },
  {
    id: "deprecations",
    path: "/deprecations?limit=200",
    label: "OpenRouter lifecycle observations",
    pages: 10,
  },
];
const validStamp = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
const validDay = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
    ? value
    : null;
const scoreNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const rowsOf = (collection) =>
  Array.isArray(collection?.data) ? collection.data : [];
const latest = (values) =>
  values.filter(Boolean).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ??
  null;
const titleCase = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function evidenceMeta(collection, id = "benchmarks") {
  const descriptor = DATASETS.find((item) => item.id === id);
  const pages = Array.isArray(collection?.pages)
    ? collection.pages
    : collection
      ? [collection]
      : [];
  const provenance = pages.flatMap((page) =>
    Array.isArray(page?.provenance) ? page.provenance : [],
  );
  return {
    id,
    label: descriptor?.label ?? id,
    url: `${API_BASE}${descriptor?.path ?? ""}`,
    fetchedAt: latest(provenance.map((row) => validStamp(row.fetchedAt))),
    sourceAsOf: latest(provenance.map((row) => validStamp(row.sourceAsOf))),
    publishedOn: latest(pages.map((page) => validDay(page?.window?.end))),
    stale: pages.some((page) => page.stale === true),
    hasMore:
      collection?.hasMore === true ||
      (!!collection?.cursor && !Array.isArray(collection?.pages)),
    acquisitionComplete:
      pages.length > 0 &&
      pages.every((page) => page.completeness?.acquisitionComplete === true),
    provenance,
    available: !!collection,
  };
}

export async function loadEvidence({ loader = loadCollection } = {}) {
  const results = await Promise.allSettled(
    DATASETS.map((item) => loader(item.path, item.pages)),
  );
  const output = {
    benchmarks: null,
    changes: null,
    deprecations: null,
    sources: [],
    errors: [],
  };
  results.forEach((result, index) => {
    const descriptor = DATASETS[index];
    if (result.status === "fulfilled") {
      output[descriptor.id] = result.value;
      output.sources.push(evidenceMeta(result.value, descriptor.id));
    } else
      output.errors.push({
        id: descriptor.id,
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "This public source is unavailable.",
      });
  });
  return output;
}

function groupFor(row) {
  if (row.source === "design-arena")
    return {
      id: JSON.stringify([row.arena, row.category]),
      label: `${titleCase(row.arena)} · ${titleCase(row.category)}`,
    };
  if (row.source === "openrouter")
    return {
      id: JSON.stringify([
        row.benchmarkType,
        row.primaryMetric,
        row.searchEngine,
        row.searchSurface,
      ]),
      label: [
        titleCase(row.benchmarkType),
        row.primaryMetric,
        row.searchEngine,
        row.searchSurface,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  return { id: "all", label: "All published variants" };
}

/** Prices belong to this published observation. No join to today's model catalogue occurs. */
export function benchmarkView(collection, options = {}) {
  const source =
    BENCHMARK_SOURCES.find((item) => item.id === options.source) ??
    BENCHMARK_SOURCES[0];
  const metric =
    source.metrics.find((item) => item.id === options.metric) ??
    source.metrics.find((item) => item.id === source.defaultMetric);
  const priceOptions = BENCHMARK_PRICES.filter(
    (item) => source.id === "openrouter" || item.id !== "task",
  );
  const price =
    priceOptions.find((item) => item.id === options.price) ??
    priceOptions.find((item) => item.id === source.defaultPrice);
  const sourceRows = rowsOf(collection).filter(
    (row) =>
      row?.source === source.id &&
      typeof row.modelPermaslug === "string" &&
      row.modelPermaslug &&
      typeof row.displayName === "string",
  );
  const groups = [
    ...new Map(
      sourceRows.map((row) => {
        const group = groupFor(row);
        return [group.id, group];
      }),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label));
  // Arena categories and separate evaluation tasks never share a score axis.
  const preferredGroup =
    source.id === "design-arena"
      ? groups.find(
          (group) => group.id === JSON.stringify(["models", "website"]),
        )
      : null;
  const group =
    groups.find((item) => item.id === options.group) ??
    preferredGroup ??
    groups[0] ??
    null;
  const selectedRows = sourceRows.filter(
    (row) => groupFor(row).id === group?.id,
  );
  const meta = evidenceMeta(collection, "benchmarks");
  const observations = selectedRows.map((row, index) => {
    const rate =
      price.id === "input"
        ? finite(row.pricing?.prompt)
        : price.id === "output"
          ? finite(row.pricing?.completion)
          : finite(row.avgCostPerTask);
    const px =
      rate === null ? null : price.id === "task" ? rate : finite(rate * 1e6);
    const py = scoreNumber(row[metric.id]);
    return {
      kind: "benchmark",
      key: JSON.stringify([
        row.source,
        row.modelPermaslug,
        row.displayName,
        group?.id,
        index,
      ]),
      id: row.modelPermaslug,
      modelId: row.modelPermaslug,
      name: row.displayName,
      variantLabel: row.displayName,
      source: row.source,
      sourceLabel: source.label,
      group: group?.id,
      groupLabel: group?.label,
      matchStatus: row.matchStatus === "matched" ? "matched" : "unmatched",
      px,
      py,
      price: price.id,
      metric: metric.id,
      xLabel: price.label,
      yLabel:
        metric.id === "primaryScore" && row.primaryMetric
          ? row.primaryMetric
          : metric.label,
      sourceAt: meta.sourceAsOf ?? meta.fetchedAt,
      fetchedAt: meta.fetchedAt,
      evaluatedAt: validStamp(row.lastRunTimestamp),
      sourceUrl: safeUrl(row.sourceUrl) ?? meta.url,
      citation: row.citation ?? null,
      raw: row,
    };
  });
  const points = observations.filter(
    (row) => row.px !== null && row.py !== null,
  );
  const omitted = observations.length - points.length;
  const emptyReason = !collection
    ? "Benchmark observations are unavailable."
    : !selectedRows.length
      ? "No observations were published for this source and evaluation group."
      : !points.length
        ? `No published observations contain both ${price.label.toLowerCase()} and ${metric.label.toLowerCase()} for this selection.`
        : null;
  return {
    points,
    observations,
    omitted,
    total: selectedRows.length,
    sourceTotal: sourceRows.length,
    source: source.id,
    sourceLabel: source.label,
    metric: metric.id,
    price: price.id,
    group: group?.id ?? null,
    groupLabel: group?.label ?? null,
    groups,
    metrics: source.metrics,
    priceOptions,
    xLabel: price.label,
    yLabel: metric.label,
    meta,
    emptyReason,
  };
}

const TRANSITIONS = {
  became_paid: "Left free pricing",
  became_free: "Became free",
  price_increased: "Price increased",
  price_decreased: "Price decreased",
  price_changed: "Mixed price change",
  price_withdrawn: "Price no longer published",
  price_published: "Price published",
};
const LIFECYCLE = {
  scheduled_deprecation: "Scheduled retirement",
  past_expiration_still_listed: "Past expiry, still listed",
  absent_from_catalog: "Observed absent",
  removed_or_unavailable: "Observed removed or unavailable",
};

/** The price envelope's date is the HEAD publication, never the comparison's full span. */
export function changeView({ changes, deprecations } = {}, options = {}) {
  const priceMeta = evidenceMeta(changes, "changes"),
    lifecycleMeta = evidenceMeta(deprecations, "deprecations");
  const pricePages = changes?.pages ?? (changes ? [changes] : []);
  const comparison = pricePages[0]?.comparison ?? null;
  const comparisonKnown =
    typeof comparison?.baseRunId === "string" &&
    typeof comparison?.headRunId === "string" &&
    comparison.baseRunId !== comparison.headRunId;
  const headPublishedOn = priceMeta.publishedOn;
  const priceEvents = rowsOf(changes)
    .filter(
      (row) =>
        row &&
        typeof row.modelId === "string" &&
        Object.hasOwn(TRANSITIONS, row.transition),
    )
    .map((row, index) => ({
      kind: "price-change",
      key: `price:${row.modelId}:${index}`,
      id: row.modelId,
      modelId: row.modelId,
      name: row.modelId,
      label: TRANSITIONS[row.transition],
      transition: row.transition,
      date: comparisonKnown ? headPublishedOn : null,
      dateBasis:
        "Publication date of the latest compared catalogue; the exact change date is not published.",
      sourceAt: priceMeta.fetchedAt,
      sourceUrl: priceMeta.url,
      comparison,
      beforeInput:
        finite(row.basePromptPrice) === null
          ? null
          : finite(Number(row.basePromptPrice) * 1e6),
      beforeOutput:
        finite(row.baseCompletionPrice) === null
          ? null
          : finite(Number(row.baseCompletionPrice) * 1e6),
      afterInput:
        finite(row.headPromptPrice) === null
          ? null
          : finite(Number(row.headPromptPrice) * 1e6),
      afterOutput:
        finite(row.headCompletionPrice) === null
          ? null
          : finite(Number(row.headCompletionPrice) * 1e6),
      raw: row,
    }));
  const lifecycleRows = rowsOf(deprecations);
  const lifecycleEvents = lifecycleRows
    .filter(
      (row) =>
        row &&
        typeof row.modelId === "string" &&
        Object.hasOwn(LIFECYCLE, row.state),
    )
    .map((row, index) => {
      const scheduled =
        row.state === "scheduled_deprecation" ||
        row.state === "past_expiration_still_listed";
      return {
        kind: "lifecycle",
        key: `lifecycle:${row.modelId}:${row.state}:${index}`,
        id: row.modelId,
        modelId: row.modelId,
        name: row.modelId,
        label: LIFECYCLE[row.state],
        state: row.state,
        date: scheduled
          ? validDay(row.expirationDate)
          : validStamp(row.lastObservedAt),
        dateBasis: scheduled
          ? "Published expiration date; this is not confirmation that the model stopped serving."
          : "Last observation of this catalogue status; the exact removal date is not published.",
        sourceAt: validStamp(row.lastObservedAt) ?? lifecycleMeta.fetchedAt,
        firstObservedAt: validStamp(row.firstObservedAt),
        evidenceRunId: row.evidenceRunId ?? null,
        sourceUrl: lifecycleMeta.url,
        raw: row,
      };
    });
  const events = [...priceEvents, ...lifecycleEvents].filter((row) =>
    options.kind === "prices"
      ? row.kind === "price-change"
      : options.kind === "retirements"
        ? row.kind === "lifecycle"
        : true,
  );
  const undated = events.filter((row) => !row.date).length;
  const dated = events
    .filter((row) => row.date)
    .sort(
      (a, b) =>
        Date.parse(a.date) - Date.parse(b.date) ||
        a.modelId.localeCompare(b.modelId),
    );
  const anchor =
    latest([lifecycleMeta.publishedOn, priceMeta.publishedOn]) ??
    latest(dated.map((row) => row.sourceAt));
  const range = options.range === "all" ? "all" : "year";
  let through = null;
  if (anchor) {
    const future = new Date(anchor);
    future.setUTCFullYear(future.getUTCFullYear() + 1);
    through = future.toISOString();
  }
  // Past recorded events remain visible; only future dates beyond the announced horizon are excluded.
  const inRange = dated.filter(
    (row) =>
      range === "all" ||
      !through ||
      Date.parse(row.date) <= Date.parse(through),
  );
  const maxItems = Number.isInteger(options.maxItems)
    ? Math.min(150, Math.max(1, options.maxItems))
    : 50;
  const points = inRange.slice(0, maxItems);
  const outsideRange = dated.length - inRange.length;
  const pricePartial = priceMeta.hasMore || !priceMeta.acquisitionComplete;
  const priceSummary = !changes
    ? "The public price comparison is unavailable; no all-clear can be inferred."
    : !comparisonKnown
      ? "The source did not identify two distinct comparison runs."
      : !priceEvents.length
        ? `${pricePartial ? "No price changes were returned in this incomplete comparison slice" : "No price changes were published between the latest two compared OpenRouter runs"}. The latest snapshot was published ${dateLabel(headPublishedOn)}.`
        : `${priceEvents.length} price changes were returned from ${pricePartial ? "an incomplete slice of " : ""}the latest two compared OpenRouter runs. The latest snapshot was published ${dateLabel(headPublishedOn)}.`;
  return {
    points,
    events,
    total: events.length,
    omitted: events.length - points.length,
    undated,
    outsideRange,
    capped: inRange.length - points.length,
    range,
    anchor,
    through,
    headPublishedOn,
    comparison: comparisonKnown ? comparison : null,
    priceSummary,
    priceCoverage:
      "The API publishes run IDs, but not both run dates. It does not establish a complete date range or predict future charges.",
    noAnnouncedExpiration: lifecycleRows.filter(
      (row) => row?.state === "no_announced_expiration",
    ).length,
    metadata: { changes: priceMeta, deprecations: lifecycleMeta },
    emptyReason:
      !changes && !deprecations
        ? "Price and lifecycle evidence is unavailable."
        : !points.length
          ? "No dated events are available for this selection and range."
          : null,
  };
}

function paragraph(node, text, className = "chart-note") {
  const item = node.ownerDocument.createElement("p");
  item.className = className;
  item.textContent = text;
  node.append(item);
  return item;
}
function startChart(node, options, title) {
  const d3 = globalThis.d3;
  if (!d3) {
    paragraph(
      node,
      "The chart library is unavailable. Reload the page to try again.",
    );
    return null;
  }
  const width = options.width ?? Math.max(320, node.clientWidth || 720),
    height = options.height ?? 360;
  const svg = d3
    .select(node)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("role", "group")
    .attr("aria-label", title)
    .style("display", "block")
    .style("max-width", "100%");
  svg.append("title").text(title);
  return { d3, svg, width, height };
}
function activate(selection, onInspect, label) {
  selection
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", label)
    .style("cursor", "pointer")
    .on("click", (_event, datum) => onInspect?.(datum))
    .on("keydown", (event, datum) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onInspect?.(datum);
      }
    });
  selection.append("title").text(label);
}
function styleAxis(axis) {
  axis
    .selectAll("text")
    .style("font-size", "12px")
    .attr("fill", "var(--muted)");
  axis.selectAll("path,line").attr("stroke", "var(--line)");
}

export function renderBenchmarks(node, collection, options = {}) {
  node.replaceChildren();
  const view = benchmarkView(collection, options);
  if (view.emptyReason) {
    paragraph(node, view.emptyReason);
    if (view.omitted)
      paragraph(
        node,
        `${view.omitted} observations are missing a selected score or price. Unknown values are not plotted as zero.`,
      );
    return view;
  }
  const chart = startChart(
    node,
    options,
    `${view.sourceLabel}: ${view.yLabel} against ${view.xLabel}`,
  );
  if (!chart) return view;
  const { d3, svg, width, height } = chart,
    margin = { left: 66, right: 25, top: 28, bottom: 72 };
  const innerWidth = width - margin.left - margin.right,
    innerHeight = height - margin.top - margin.bottom;
  const x = d3
    .scaleSymlog()
    .constant(1)
    .domain([0, d3.max(view.points, (row) => row.px) || 1])
    .nice()
    .range([0, innerWidth]);
  const extent = d3.extent(view.points, (row) => row.py),
    lower = Math.min(0, extent[0]),
    upper = Math.max(0, extent[1]);
  const y = d3
    .scaleLinear()
    .domain(lower === upper ? [lower - 1, upper + 1] : [lower, upper])
    .nice()
    .range([innerHeight, 0]);
  const plot = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  plot
    .append("g")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""))
    .call((axis) => {
      axis.selectAll(".domain").remove();
      axis
        .selectAll("line")
        .attr("stroke", "var(--line)")
        .attr("stroke-dasharray", "2,4");
    });
  plot
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width < 500 ? 4 : 6)
        .tickFormat((value) => money(value)),
    )
    .call(styleAxis);
  plot.append("g").call(d3.axisLeft(y).ticks(5)).call(styleAxis);
  svg
    .append("text")
    .attr("x", margin.left)
    .attr("y", height - 22)
    .attr("fill", "var(--muted)")
    .style("font-size", "12px")
    .text(view.xLabel);
  svg
    .append("text")
    .attr("x", margin.left)
    .attr("y", 16)
    .attr("fill", "var(--muted)")
    .style("font-size", "12px")
    .text(view.yLabel);
  const symbols = plot
    .selectAll("circle.evidence-point")
    .data(view.points, (row) => row.key)
    .join("circle")
    .attr("class", "evidence-point")
    .attr("cx", (row) => x(row.px))
    .attr("cy", (row) => y(row.py))
    .attr("r", 5.5)
    .attr("fill", (row) =>
      row.matchStatus === "matched" ? "var(--accent)" : "var(--surface)",
    )
    .attr("fill-opacity", 0.85)
    .attr("stroke", "var(--accent)")
    .attr("stroke-width", 1.4);
  activate(
    symbols,
    options.onInspect,
    (row) =>
      `${row.variantLabel}. ${row.yLabel}: ${row.py}. ${row.xLabel}: ${money(row.px)}. ${row.matchStatus === "matched" ? "Matched by source" : "Unmatched by source"}. Source snapshot ${dateLabel(row.sourceAt)}.`,
  );
  paragraph(
    node,
    `${view.points.length} published variants plotted${view.omitted ? ` · ${view.omitted} missing a selected price or score` : ""}. Filled points: source-matched. Hollow points: source-unmatched. Price uses a log scale that includes zero.`,
  );
  paragraph(
    node,
    `Scores and prices come from the same published observation. Variant labels are preserved; no join to current model IDs is made. ${view.groupLabel && view.groupLabel !== "All published variants" ? `Evaluation: ${view.groupLabel}. ` : ""}Source snapshot ${dateLabel(view.meta.sourceAsOf ?? view.meta.fetchedAt)}${view.meta.stale ? " · marked stale by source" : ""}${!view.meta.acquisitionComplete ? " · source acquisition is incomplete" : ""}${view.meta.hasMore ? " · more observations remain beyond the loaded pages" : ""}.`,
  );
  return view;
}

export function renderChanges(node, data, options = {}) {
  node.replaceChildren();
  const view = changeView(data, options);
  paragraph(node, view.priceSummary, "evidence-price-summary");
  paragraph(node, view.priceCoverage);
  if (view.emptyReason) {
    paragraph(node, view.emptyReason);
    if (view.noAnnouncedExpiration)
      paragraph(
        node,
        `${view.noAnnouncedExpiration} lifecycle records have no announced expiration. They are not retirement events.`,
      );
    return view;
  }
  const height = options.height ?? Math.max(260, 110 + view.points.length * 38);
  const chart = startChart(
    node,
    { ...options, height },
    "Published model lifecycle dates and price comparison observations",
  );
  if (!chart) return view;
  const { d3, svg, width } = chart,
    margin = { top: 30, right: 24, bottom: 50, left: width < 500 ? 116 : 195 };
  const timestamps = view.points.map((row) => new Date(row.date));
  if (view.anchor) timestamps.push(new Date(view.anchor));
  let [start, end] = d3.extent(timestamps);
  if (+start === +end) {
    start = new Date(+start - 86400000);
    end = new Date(+end + 86400000);
  }
  const x = d3
    .scaleUtc()
    .domain([start, end])
    .nice()
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleBand()
    .domain(view.points.map((row) => row.key))
    .range([margin.top, height - margin.bottom])
    .padding(0.45);
  const today = view.anchor ? x(new Date(view.anchor)) : margin.left;
  const rowGroups = svg
    .selectAll("g.evidence-event")
    .data(view.points, (row) => row.key)
    .join("g")
    .attr("class", "evidence-event")
    .attr(
      "transform",
      (row) => `translate(0,${y(row.key) + y.bandwidth() / 2})`,
    );
  rowGroups
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("stroke", "var(--line)")
    .attr("stroke-dasharray", "2,4");
  rowGroups
    .append("text")
    .attr("x", margin.left - 12)
    .attr("y", 4)
    .attr("text-anchor", "end")
    .attr("fill", "var(--muted)")
    .style("font-size", "12px")
    .text((row) => {
      const label = row.name.split("/").at(-1);
      const cap = width < 500 ? 14 : 26;
      return label.length > cap ? `${label.slice(0, cap - 1)}…` : label;
    })
    .append("title")
    .text((row) => row.name);
  rowGroups
    .filter(
      (row) =>
        row.kind === "lifecycle" &&
        Date.parse(row.date) >= Date.parse(view.anchor),
    )
    .append("line")
    .attr("x1", today)
    .attr("x2", (row) => x(new Date(row.date)))
    .attr("stroke", "var(--coral)")
    .attr("stroke-width", 2);
  const symbols = rowGroups
    .append("path")
    .attr("transform", (row) => `translate(${x(new Date(row.date))},0)`)
    .attr(
      "d",
      d3
        .symbol()
        .type((row) =>
          row.kind === "price-change" ? d3.symbolDiamond : d3.symbolCircle,
        )
        .size(95),
    )
    .attr("fill", (row) =>
      row.kind === "price-change" ? "var(--accent)" : "var(--coral)",
    )
    .attr("stroke", "var(--surface)")
    .attr("stroke-width", 2);
  activate(
    symbols,
    options.onInspect,
    (row) =>
      `${row.modelId}. ${row.label}: ${dateLabel(row.date)}. ${row.dateBasis} Evidence observed ${dateLabel(row.sourceAt)}.`,
  );
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width < 500 ? 3 : 6)
        .tickFormat(
          d3.utcFormat(
            view.range === "all" &&
              end.getUTCFullYear() - start.getUTCFullYear() > 2
              ? "%Y"
              : "%d %b",
          ),
        ),
    )
    .call(styleAxis);
  paragraph(
    node,
    `Dates shown in UTC, ${start.getUTCFullYear() === end.getUTCFullYear() ? start.getUTCFullYear() : `${start.getUTCFullYear()}–${end.getUTCFullYear()}`}. Dots mark published lifecycle dates; diamonds mark the publication of a price comparison. Scheduled retirement is not confirmed removal.${view.outsideRange ? ` ${view.outsideRange} published dates fall after the one-year range; choose all published dates to see them.` : ""}${view.capped ? ` ${view.capped} additional events are outside this ${view.points.length}-event display.` : ""}${view.undated ? ` ${view.undated} events have no usable date.` : ""}`,
  );
  if (
    view.metadata.deprecations.stale ||
    view.metadata.deprecations.hasMore ||
    (data?.deprecations && !view.metadata.deprecations.acquisitionComplete)
  )
    paragraph(
      node,
      "Lifecycle evidence is stale or incomplete. This view does not establish a complete history.",
    );
  if (view.noAnnouncedExpiration)
    paragraph(
      node,
      `${view.noAnnouncedExpiration} other lifecycle records have no announced expiration.`,
    );
  return view;
}
