import {
  PROVIDERS,
  compact,
  consecutiveHistoryDays,
  dateLabel,
} from "./explorer-data.js";
import { colorFor, emptyChart } from "./explorer-charts.js";

const OTHER = "__other_groups__";
const providerIds = Object.keys(PROVIDERS);
const integer = (value) => {
  if (typeof value === "number")
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  return typeof value === "string" && /^\d{1,60}$/.test(value)
    ? BigInt(value)
    : null;
};
const exact = (value) => BigInt(value).toLocaleString("en");
const share = (value, total) =>
  total > 0n ? Number((value * 100000000n) / total) / 1000000 : null;
const percentLabel = (value) =>
  value === null
    ? "share undefined"
    : value > 0 && value < 0.1
      ? "<0.1%"
      : `${Number(value.toFixed(1))}%`;
const stableColor = (id) => {
  let hash = 0;
  for (const character of id)
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  return colorFor(providerIds[hash % providerIds.length]);
};
function bound(value, name) {
  if (!Number.isInteger(value) || value < 2 || value > 8)
    throw new RangeError(`${name} must be between 2 and 8`);
  return value;
}
function composition(groups, { maxSlices = 7, ...meta } = {}) {
  bound(maxSlices, "maxSlices");
  groups.sort((a, b) =>
    BigInt(a.value) === BigInt(b.value)
      ? a.label.localeCompare(b.label)
      : BigInt(a.value) > BigInt(b.value)
        ? -1
        : 1,
  );
  const total = groups.reduce((sum, g) => sum + BigInt(g.value), 0n);
  groups = groups.map((g) => ({
    ...g,
    percent: share(BigInt(g.value), total),
    isOther: false,
  }));
  const slices =
    groups.length <= maxSlices
      ? groups.slice()
      : groups.slice(0, maxSlices - 1);
  if (groups.length > maxSlices) {
    const memberGroups = groups.slice(maxSlices - 1),
      value = memberGroups.reduce((sum, g) => sum + BigInt(g.value), 0n);
    slices.push({
      id: OTHER,
      label: "Other",
      value: value.toString(),
      percent: share(value, total),
      color: "var(--muted)",
      isOther: true,
      memberGroups,
      members: memberGroups.flatMap((g) => g.members),
    });
  }
  return { ...meta, total: total.toString(), groups, slices };
}

/** Exclusive categories: an entry with several modalities belongs to one combination. */
export function modelBreakdown(
  models,
  { groupBy = "provider", maxSlices = 7 } = {},
) {
  if (!["provider", "modality"].includes(groupBy))
    throw new Error("Unsupported catalogue grouping");
  const unique = new Map();
  let duplicateCount = 0,
    omitted = 0;
  for (const row of Array.isArray(models) ? models : []) {
    if (
      !row ||
      typeof row.provider !== "string" ||
      !row.provider ||
      typeof row.id !== "string" ||
      !row.id
    ) {
      omitted++;
      continue;
    }
    const key = JSON.stringify([row.provider, row.id]);
    if (unique.has(key)) {
      duplicateCount++;
      continue;
    }
    unique.set(key, row);
  }
  const labels = {
    text: "Text",
    image: "Image",
    video: "Video",
    audio: "Audio",
    unknown: "Unclassified output",
  };
  const groups = new Map();
  for (const row of unique.values()) {
    const modalities = [
      ...new Set(
        (Array.isArray(row.modalities) ? row.modalities : [])
          .filter((m) => typeof m === "string" && m.trim())
          .map((m) => m.trim().toLowerCase()),
      ),
    ].sort();
    const id =
      groupBy === "provider" ? row.provider : modalities.join("+") || "unknown";
    const label =
      groupBy === "provider"
        ? PROVIDERS[id] || id
        : modalities.length
          ? modalities.map((m) => labels[m] || m).join(" + ")
          : labels.unknown;
    const group = groups.get(id) || {
      id,
      label,
      value: "0",
      members: [],
      color:
        groupBy === "provider" ? colorFor(id) : stableColor(`modality:${id}`),
      groupBy,
    };
    group.members.push(row);
    group.value = String(group.members.length);
    groups.set(id, group);
  }
  return composition([...groups.values()], {
    kind: "models",
    groupBy,
    maxSlices,
    omitted,
    duplicateCount,
    denominatorLabel:
      "Share of distinct provider-specific entries in this filter. Catalogue composition is not market share.",
    unit: "entries",
  });
}

/** The denominator is only these selected apps' reported rolling totals. */
export function appBreakdown(apps, { maxSlices = 7 } = {}) {
  const rows = Array.isArray(apps) ? apps : [],
    counts = new Map();
  let omitted = 0;
  for (const row of rows)
    if (typeof row?.appId === "string")
      counts.set(row.appId, (counts.get(row.appId) || 0) + 1);
  const groups = [];
  for (const row of rows) {
    const value = integer(row?.totalTokens);
    if (
      typeof row?.appId !== "string" ||
      !row.appId ||
      counts.get(row.appId) !== 1 ||
      value === null
    ) {
      omitted++;
      continue;
    }
    groups.push({
      id: row.appId,
      label: row.appName || row.appId,
      value: value.toString(),
      members: [row],
      color: stableColor(`app:${row.appId}`),
    });
  }
  return composition(groups, {
    kind: "apps",
    maxSlices,
    omitted,
    duplicateCount: 0,
    unit: "tokens",
    denominatorLabel:
      "Share of the known rolling 30-day token totals for these selected apps; not all OpenRouter traffic.",
  });
}

/** Summed source observations, not zero-filled model series or an inferred population. */
export function historyStackData(days, { chosen = "all", maxSeries = 6 } = {}) {
  bound(maxSeries, "maxSeries");
  const buckets = consecutiveHistoryDays(days),
    totals = new Map(),
    labels = new Map();
  const parsed = buckets.map((day) => {
    if (day.complete !== true)
      return {
        ...day,
        total: null,
        segments: [],
        gapReason:
          day.gapReason ||
          (!day.rows.length ? "missing_day" : "incomplete_day"),
      };
    const selected =
      chosen === "all"
        ? day.rows
        : day.rows.filter((row) => row.id === chosen && row.remainder == null);
    if (!selected.length)
      return {
        ...day,
        complete: false,
        total: null,
        segments: [],
        gapReason: chosen === "all" ? "no_observations" : "model_not_observed",
      };
    const ids = new Set();
    let invalid = false,
      ambiguous = false;
    const observations = selected.map((row) => {
      const value = integer(row.value),
        id = row.id;
      if (typeof id !== "string" || !id || value === null) invalid = true;
      if (ids.has(id)) ambiguous = true;
      ids.add(id);
      return {
        ...row,
        value: value?.toString() ?? null,
        isRemainder: row.remainder != null,
      };
    });
    if (invalid || ambiguous)
      return {
        ...day,
        complete: false,
        total: null,
        segments: [],
        gapReason: ambiguous ? "ambiguous_rows" : "unknown_total",
      };
    for (const row of observations)
      if (!row.isRemainder) {
        totals.set(row.id, (totals.get(row.id) || 0n) + BigInt(row.value));
        labels.set(row.id, row.label || row.id);
      }
    return {
      ...day,
      observations,
      total: observations
        .reduce((sum, row) => sum + BigInt(row.value), 0n)
        .toString(),
      segments: [],
      gapReason: null,
    };
  });
  // Choose once across complete returned dates; keep the source remainder in Other.
  const selectedIds =
    chosen === "all"
      ? [...totals]
          .sort((a, b) =>
            a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] > b[1] ? -1 : 1,
          )
          .slice(0, maxSeries - 1)
          .map(([id]) => id)
      : [chosen];
  const series = selectedIds.map((id) => ({
    id,
    label: labels.get(id) || id,
    color: stableColor(`history:${id}`),
  }));
  let hasOther = false;
  for (const day of parsed) {
    if (day.total === null) continue;
    const other = [];
    for (const row of day.observations) {
      const entry = series.find((s) => s.id === row.id && !row.isRemainder);
      if (!entry) {
        other.push(row);
        continue;
      }
      day.segments.push({
        ...entry,
        value: row.value,
        members: [row],
        memberIds: [row.id],
        isOther: false,
        hasSourceRemainder: false,
      });
    }
    if (other.length) {
      hasOther = true;
      day.segments.push({
        id: OTHER,
        label: "Other published values",
        color: "var(--muted)",
        value: other
          .reduce((sum, row) => sum + BigInt(row.value), 0n)
          .toString(),
        members: other,
        memberIds: other.map((row) => row.id),
        isOther: true,
        hasSourceRemainder: other.some((row) => row.isRemainder),
      });
    }
    day.segments.sort(
      (a, b) =>
        (a.isOther ? maxSeries : selectedIds.indexOf(a.id)) -
        (b.isOther ? maxSeries : selectedIds.indexOf(b.id)),
    );
    let cumulative = 0n;
    day.segments = day.segments.map((segment) => {
      const start = cumulative;
      cumulative += BigInt(segment.value);
      return {
        ...segment,
        start: start.toString(),
        end: cumulative.toString(),
        percent: share(BigInt(segment.value), BigInt(day.total)),
      };
    });
  }
  if (hasOther)
    series.push({
      id: OTHER,
      label: "Other published values",
      color: "var(--muted)",
      isOther: true,
    });
  return {
    buckets: parsed,
    series,
    chosen,
    completeDays: parsed.filter((day) => day.total !== null).length,
    gapDays: parsed.filter((day) => day.total === null).length,
    denominatorLabel:
      chosen === "all"
        ? "Each bar sums the published values for that UTC date, including the source remainder once. Other contains remaining observed models and any source remainder."
        : "Each bar shows this model’s observed tokens for that UTC date. An absent observation is a gap.",
  };
}

/** Ranks are comparable only within one source category; source value is not rank. */
export function rankHistoryData(
  days,
  { chosen = "all", scope = "", maxSeries = 5 } = {},
) {
  bound(maxSeries, "maxSeries");
  const buckets = consecutiveHistoryDays(days),
    scopeIds = [
      ...new Set(
        buckets.flatMap((day) => day.rows.map((row) => row.scope ?? "")),
      ),
    ]
      .filter((s) => typeof s === "string")
      .sort();
  const scopes = scopeIds.map((id) => ({
    id,
    label: id ? id.replaceAll("-", " ") : "Published ranking",
  }));
  const selectedScope = scopeIds.includes(scope) ? scope : (scopeIds[0] ?? "");
  const frequency = new Map(),
    labels = new Map();
  const prepared = buckets.map((day) => {
    const entries = day.rows.filter(
        (row) => (row.scope ?? "") === selectedScope,
      ),
      counts = new Map();
    for (const row of entries)
      counts.set(row.id, (counts.get(row.id) || 0) + 1);
    const rows = entries.map((row) => ({
      ...row,
      usable:
        day.complete === true &&
        typeof row.id === "string" &&
        row.id &&
        counts.get(row.id) === 1 &&
        Number.isSafeInteger(row.rank) &&
        row.rank > 0,
      reason:
        day.complete !== true
          ? "incomplete_or_missing_day"
          : counts.get(row.id) !== 1
            ? "ambiguous_rank"
            : !Number.isSafeInteger(row.rank) || row.rank <= 0
              ? "rank_not_reported"
              : null,
    }));
    for (const row of rows)
      if (row.usable) {
        const stat = frequency.get(row.id) || { count: 0, rankSum: 0 };
        stat.count++;
        stat.rankSum += row.rank;
        frequency.set(row.id, stat);
        labels.set(row.id, row.label || row.id);
      }
    return { ...day, rankRows: rows };
  });
  const ids =
    chosen === "all"
      ? [...frequency]
          .sort(
            (a, b) =>
              b[1].count - a[1].count ||
              a[1].rankSum / a[1].count - b[1].rankSum / b[1].count ||
              a[0].localeCompare(b[0]),
          )
          .slice(0, maxSeries)
          .map(([id]) => id)
      : [chosen];
  const series = ids.map((id) => ({
    id,
    label: labels.get(id) || id,
    color: stableColor(`rank:${selectedScope}:${id}`),
    points: prepared.map((day) => {
      const row = day.rankRows.find((row) => row.id === id),
        rank = row?.usable ? row.rank : null;
      return {
        id,
        label: labels.get(id) || id,
        date: day.date,
        scope: selectedScope,
        rank,
        value: rank === null ? null : String(rank),
        sourceValue: row?.value ?? null,
        stars: row?.stars ?? null,
        forks: row?.forks ?? null,
        complete: rank !== null,
        reason: rank !== null ? null : row?.reason || "not_observed",
      };
    }),
  }));
  return {
    buckets: prepared,
    series,
    scopes,
    scope: selectedScope,
    chosen,
    availableSeries: frequency.size,
    gapDays: prepared.filter(
      (_, index) => !series.some((s) => s.points[index].rank !== null),
    ).length,
  };
}

function frame(node) {
  const focus = node.contains(document.activeElement)
    ? document.activeElement?.getAttribute("data-variant-key")
    : null;
  node.replaceChildren();
  return { d3: globalThis.d3, w: Math.max(260, node.clientWidth), focus };
}
function svgAt(d3, node, w, h, label) {
  return d3
    .select(node)
    .append("svg")
    .attr("viewBox", `0 0 ${w} ${h}`)
    .attr("width", "100%")
    .attr("height", h)
    .attr("role", "group")
    .attr("aria-label", label)
    .style("display", "block")
    .style("font-family", "inherit");
}
function paragraph(node, text) {
  const p = document.createElement("p");
  p.className = "chart-note variant-note";
  p.style.cssText = "font-size:12px;line-height:1.6;padding:10px 18px;margin:0";
  p.textContent = text;
  node.append(p);
  return p;
}
function keyMarks(selection, choose, focusKey) {
  const nodes = selection.nodes();
  selection
    .attr("tabindex", (d, i) => (i === 0 ? 0 : -1))
    .attr("role", "button")
    .attr("data-variant-key", (d) => d.id)
    .style("cursor", "pointer")
    .on("click", (event, d) => choose(d))
    .on("keydown", function (event, d) {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        choose(d);
        return;
      }
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      const index = nodes.indexOf(this),
        next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? nodes.length - 1
              : (index +
                  (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) +
                  nodes.length) %
                nodes.length;
      selection.attr("tabindex", -1);
      nodes[next].setAttribute("tabindex", "0");
      nodes[next].focus();
    });
  if (focusKey) {
    const target =
      nodes.find((n) => n.getAttribute("data-variant-key") === focusKey) ||
      nodes[0];
    if (target) {
      selection.attr("tabindex", -1);
      target.setAttribute("tabindex", "0");
      target.focus({ preventScroll: true });
    }
  }
}
function groupLabel(group, summary) {
  return `${group.label}: ${exact(group.value)} ${summary.unit}, ${percentLabel(group.percent)} of the displayed denominator`;
}
function legendButton(
  parent,
  group,
  summary,
  choose,
  { subgroup = false, narrow = false } = {},
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "variant-legend-item";
  button.setAttribute("data-variant-key", group.id);
  button.setAttribute("aria-label", groupLabel(group, summary));
  button.style.cssText = `display:flex;flex-direction:${narrow ? "column" : "row"};align-items:${narrow ? "stretch" : "center"};gap:${narrow ? "4px" : "10px"};justify-content:space-between;width:100%;min-height:44px;text-align:left;border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent;padding:9px ${subgroup ? "20px" : "10px"};font-size:12px;color:var(--ink)`;
  const name = document.createElement("span");
  name.style.cssText = "display:flex;gap:8px;align-items:center;min-width:0";
  const swatch = document.createElement("i");
  swatch.className = "legend-dot";
  swatch.style.cssText = `display:block;flex:none;width:9px;height:9px;border-radius:50%;background:${group.color};--dot:${group.color}`;
  const label = document.createElement("span");
  label.textContent = group.label;
  label.style.overflowWrap = "anywhere";
  name.append(swatch, label);
  const amount = document.createElement("span");
  amount.style.cssText = `flex:none;min-width:0;overflow-wrap:anywhere;text-align:${narrow ? "left" : "right"};${narrow ? "padding-left:17px;" : ""}font-variant-numeric:tabular-nums`;
  amount.textContent = `${exact(group.value)} · ${percentLabel(group.percent)}`;
  button.append(name, amount);
  button.onclick = () => choose(group);
  parent.append(button);
  return button;
}

/** Shares/counts only: accepts composition summaries, never raw price coordinates. */
export function renderBreakdown(
  node,
  summary,
  { variant = "bars", onSelect = () => {}, selected = null } = {},
) {
  if (!["bars", "donut"].includes(variant))
    throw new Error("Unsupported composition chart");
  if (!summary.groups.length) {
    emptyChart(
      node,
      "No known observations in this selection.",
      "Try another filter. Missing values are not zero.",
    );
    return summary;
  }
  const { d3, w, focus } = frame(node);
  paragraph(
    node,
    `${exact(summary.total)} ${summary.unit} in the denominator. ${summary.denominatorLabel}${summary.omitted ? ` ${summary.omitted} records with missing or ambiguous values are excluded.` : ""}`,
  );
  const detail = paragraph(document.createElement("div"), "");
  const choose = (group) => {
    detail.textContent =
      groupLabel(group, summary) +
      (group.isOther
        ? `. Includes ${group.memberGroups.map((g) => g.label).join(", ")}.`
        : "");
    node
      .querySelectorAll("[data-variant-key]")
      .forEach((element) =>
        element.setAttribute(
          "aria-pressed",
          String(element.getAttribute("data-variant-key") === group.id),
        ),
      );
    if (group.isOther) {
      const disclosure = node.querySelector("details");
      if (disclosure) disclosure.open = true;
    }
    onSelect(group);
  };
  if (variant === "donut") {
    const layout = document.createElement("div");
    layout.className = "variant-composition";
    layout.style.cssText = `display:grid;grid-template-columns:${w >= 640 ? "minmax(240px,.9fr) minmax(280px,1.1fr)" : "minmax(0,1fr)"};align-items:start;padding:8px 18px;gap:16px`;
    node.append(layout);
    const plot = document.createElement("div"),
      legend = document.createElement("div");
    layout.append(plot, legend);
    const pw = w >= 640 ? (w - 52) * 0.45 : w - 36,
      h = 270,
      r = Math.min(112, pw / 2 - 15),
      svg = svgAt(d3, plot, pw, h, "Catalogue or app composition");
    const group = svg.append("g").attr("transform", `translate(${pw / 2},128)`);
    const arcs = d3
      .pie()
      .sort(null)
      .value((d) => Number(d.value))(
      summary.slices.filter((s) => BigInt(s.value) > 0n),
    );
    const arc = d3
      .arc()
      .innerRadius(r * 0.63)
      .outerRadius(r)
      .padAngle(0.015);
    const paths = group
      .selectAll("path")
      .data(arcs)
      .join("path")
      .attr("class", "data-point variant-arc")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "var(--surface)")
      .attr("stroke-width", 2)
      .attr("aria-label", (d) => groupLabel(d.data, summary));
    // D3's arc wrappers do not carry the stable legend key; attach it explicitly.
    arcs.forEach((a) => {
      a.id = a.data.id;
    });
    keyMarks(paths, (d) => choose(d.data), focus);
    group
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", -3)
      .attr("fill", "var(--ink)")
      .style("font-size", "25px")
      .style("font-weight", "650")
      .text(compact(Number(summary.total)));
    group
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", 21)
      .attr("fill", "var(--muted)")
      .style("font-size", "12px")
      .text(
        summary.unit === "tokens" ? "selected-app tokens" : "catalogue entries",
      );
    if (BigInt(summary.total) === 0n)
      group
        .append("circle")
        .attr("r", r * 0.82)
        .attr("fill", "none")
        .attr("stroke", "var(--line)")
        .attr("stroke-width", r * 0.35);
    for (const slice of summary.slices)
      legendButton(legend, slice, summary, choose, { narrow: w < 600 });
    const other = summary.slices.find((s) => s.isOther);
    if (other) {
      const disclosure = document.createElement("details"),
        caption = document.createElement("summary");
      caption.textContent = `Other includes ${other.memberGroups.length} groups`;
      caption.style.cssText = "cursor:pointer;padding:14px 10px;font-size:12px";
      disclosure.append(caption);
      for (const child of other.memberGroups)
        legendButton(disclosure, child, summary, choose, {
          subgroup: true,
          narrow: w < 600,
        });
      legend.append(disclosure);
    }
  } else {
    const rowHeight = 68,
      h = summary.groups.length * rowHeight + 20;
    const scroll = document.createElement("div");
    scroll.style.cssText =
      "max-height:460px;overflow-y:auto;overscroll-behavior:contain";
    scroll.setAttribute("aria-label", "All ranked groups; scroll to see more");
    node.append(scroll);
    if (h > 460)
      paragraph(
        node,
        `All ${summary.groups.length} groups are shown. Scroll within the ranked chart to see each one.`,
      );
    const svg = svgAt(
      d3,
      scroll,
      w,
      h,
      "Ranked values with visible counts and shares",
    );
    const max = Math.max(...summary.groups.map((g) => Number(g.value)), 1),
      x = d3
        .scaleLinear()
        .domain([0, max])
        .range([0, w - 40]);
    const rows = svg
      .selectAll("g")
      .data(summary.groups)
      .join("g")
      .attr("transform", (g, i) => `translate(20,${i * rowHeight + 7})`)
      .attr("aria-label", (g) => groupLabel(g, summary));
    rows
      .append("rect")
      .attr("width", w - 40)
      .attr("height", rowHeight - 3)
      .attr("fill", "transparent");
    rows
      .append("text")
      .attr("x", 0)
      .attr("y", 13)
      .attr("fill", "var(--ink)")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .text((g) => g.label);
    rows
      .append("text")
      .attr("x", 0)
      .attr("y", 32)
      .attr("text-anchor", "start")
      .attr("fill", "var(--muted)")
      .style("font-size", "12px")
      .text(
        (g) => `${exact(g.value)} ${summary.unit} · ${percentLabel(g.percent)}`,
      );
    rows
      .append("rect")
      .attr("x", 0)
      .attr("y", 41)
      .attr("width", w - 40)
      .attr("height", 12)
      .attr("rx", 3)
      .attr("fill", "var(--surface-soft)");
    rows
      .append("rect")
      .attr("class", "data-point")
      .attr("x", 0)
      .attr("y", 41)
      .attr("width", (g) => x(Number(g.value)))
      .attr("height", 12)
      .attr("rx", 3)
      .attr("fill", (g) => g.color);
    keyMarks(rows, choose, focus);
  }
  detail.setAttribute("role", "status");
  detail.setAttribute("aria-live", "polite");
  node.append(detail);
  const initial =
    summary.groups.find((g) => g.id === selected) || summary.groups[0];
  detail.textContent = groupLabel(initial, summary);
  return summary;
}

export function renderHistoryStacks(
  node,
  days,
  { chosen = "all", maxSeries = 6, onSelect = () => {} } = {},
) {
  const view = historyStackData(days, { chosen, maxSeries });
  if (!view.buckets.length) {
    emptyChart(
      node,
      "No daily history is published yet.",
      "Missing observations cannot establish daily totals.",
    );
    return view;
  }
  const { d3, w, focus } = frame(node),
    h = 340,
    m = { left: 58, right: 18, top: 22, bottom: 40 };
  paragraph(
    node,
    `${view.completeDays} observed daily totals · ${view.gapDays} gaps. ${view.denominatorLabel}`,
  );
  const svg = svgAt(
    d3,
    node,
    w,
    h,
    "Daily stacked observed tokens; missing dates remain gaps",
  );
  const x = d3
    .scaleBand()
    .domain(view.buckets.map((b) => b.date))
    .range([m.left, w - m.right])
    .padding(0.2);
  const y = d3
    .scaleLinear()
    .domain([
      0,
      Math.max(
        ...view.buckets.map((b) => (b.total === null ? 0 : Number(b.total))),
        1,
      ),
    ])
    .nice()
    .range([h - m.bottom, m.top]);
  svg
    .append("g")
    .attr("class", "chart-grid")
    .attr("transform", `translate(${m.left},0)`)
    .call(
      d3
        .axisLeft(y)
        .ticks(4)
        .tickSize(-(w - m.left - m.right))
        .tickFormat(""),
    );
  const tickEvery = Math.max(
    1,
    Math.ceil(view.buckets.length / (w < 500 ? 4 : 7)),
  );
  svg
    .append("g")
    .attr("class", "chart-axis")
    .attr("transform", `translate(0,${h - m.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(
          view.buckets.filter((_, i) => i % tickEvery === 0).map((d) => d.date),
        )
        .tickFormat((date) => date.slice(5))
        .tickSizeOuter(0),
    )
    .selectAll("text")
    .style("font-size", "12px");
  svg
    .append("g")
    .attr("class", "chart-axis")
    .attr("transform", `translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(compact).tickSizeOuter(0))
    .selectAll("text")
    .style("font-size", "12px");
  const detail = document.createElement("div");
  detail.className = "variant-day-detail";
  detail.style.cssText =
    "padding:12px 18px;font-size:12px;line-height:1.6;overflow-wrap:anywhere";
  detail.setAttribute("aria-live", "polite");
  const controls = document.createElement("label");
  controls.style.cssText =
    "display:flex;align-items:center;gap:10px;padding:8px 18px;font-size:12px";
  controls.append("Inspect UTC day");
  const picker = document.createElement("select");
  picker.setAttribute("aria-label", "Inspect UTC day and exact token total");
  picker.style.cssText =
    "min-height:44px;min-width:0;max-width:100%;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:8px";
  controls.append(picker);
  const inspect = (day, segment = null, notify = false) => {
    picker.value = day.date;
    detail.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = `${dateLabel(day.date)} · ${day.total === null ? "No known daily total" : exact(day.total) + " observed tokens"}`;
    detail.append(title);
    if (day.total === null) {
      const p = document.createElement("p");
      p.textContent = `Gap: ${day.gapReason.replaceAll("_", " ")}. No zero is inferred.`;
      detail.append(p);
      return;
    }
    const membership = document.createElement("div");
    membership.style.cssText = "display:grid;gap:4px;margin-top:8px";
    for (const s of day.segments) {
      const line = document.createElement("div");
      line.textContent = `${s.label}: ${exact(s.value)} tokens (${percentLabel(s.percent)}).`;
      membership.append(line);
      if (s.isOther) {
        const p = document.createElement("small");
        p.style.fontSize = "12px";
        p.textContent = `Includes ${s.members.map((r) => (r.isRemainder ? "source remainder" : r.label || r.id)).join(", ")}.`;
        membership.append(p);
      }
    }
    detail.append(membership);
    if (notify && segment)
      onSelect({
        ...segment,
        date: new Date(`${day.date}T00:00:00Z`),
        complete: true,
        dayTotal: day.total,
      });
  };
  for (const day of view.buckets) {
    const option = document.createElement("option");
    option.value = day.date;
    option.textContent = `${day.date} · ${day.total === null ? "gap" : exact(day.total) + " tokens"}`;
    picker.append(option);
  }
  picker.onchange = () =>
    inspect(view.buckets.find((d) => d.date === picker.value));
  const marks = view.buckets.flatMap((day) =>
    day.segments.map((segment) => ({
      ...segment,
      id: JSON.stringify([day.date, segment.id]),
      seriesId: segment.id,
      day,
    })),
  );
  const rects = svg
    .append("g")
    .selectAll("rect")
    .data(marks)
    .join("rect")
    .attr("class", "data-point")
    .attr("x", (d) => x(d.day.date))
    .attr("y", (d) => y(Number(d.end)))
    .attr("width", x.bandwidth())
    .attr("height", (d) => Math.max(0, y(Number(d.start)) - y(Number(d.end))))
    .attr("fill", (d) => d.color)
    .attr("stroke", "var(--surface)")
    .attr("stroke-width", 0.5)
    .attr(
      "aria-label",
      (d) =>
        `${d.day.date}, ${d.label}: ${exact(d.value)} tokens; daily total ${exact(d.day.total)}`,
    );
  keyMarks(rects, (d) => inspect(d.day, { ...d, id: d.seriesId }, true), focus);
  svg
    .append("g")
    .selectAll("line")
    .data(view.buckets.filter((d) => d.total === null))
    .join("line")
    .attr("x1", (d) => x(d.date))
    .attr("x2", (d) => x(d.date) + x.bandwidth())
    .attr("y1", h - m.bottom - 3)
    .attr("y2", h - m.bottom - 3)
    .attr("stroke", "var(--muted)")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "2 2");
  const legend = document.createElement("div");
  legend.style.cssText =
    "display:flex;flex-wrap:wrap;gap:10px 18px;padding:5px 18px;font-size:12px";
  for (const item of view.series) {
    const label = document.createElement("span");
    label.style.cssText =
      "display:flex;gap:6px;align-items:center;max-width:100%;overflow-wrap:anywhere";
    const swatch = document.createElement("i");
    swatch.className = "legend-dot";
    swatch.style.cssText = `--dot:${item.color};background:${item.color};width:8px;height:8px;border-radius:50%;flex:none`;
    const text = document.createElement("span");
    text.style.minWidth = "0";
    text.textContent = item.label;
    label.append(swatch, text);
    legend.append(label);
  }
  node.append(legend, controls, detail);
  inspect(
    view.buckets.findLast((d) => d.total !== null) || view.buckets.at(-1),
  );
  return view;
}

export function renderRankHistory(
  node,
  days,
  { chosen = "all", scope = "", maxSeries = 5, onSelect = () => {} } = {},
) {
  const view = rankHistoryData(days, { chosen, scope, maxSeries });
  const points = view.series.flatMap((series) =>
    series.points
      .filter((p) => p.rank !== null)
      .map((p) => ({
        ...p,
        color: series.color,
        key: JSON.stringify([p.scope, p.id, p.date]),
      })),
  );
  if (!points.length) {
    emptyChart(
      node,
      "No observed ranks in this selection.",
      "Choose another entity or category. Missing ranks are not zero or last place.",
    );
    return view;
  }
  const { d3, w, focus } = frame(node),
    h = 335,
    m = { left: 46, right: 22, top: 30, bottom: 40 };
  const scopeLabel =
    view.scopes.find((s) => s.id === view.scope)?.label || "Published ranking";
  paragraph(
    node,
    `${scopeLabel}. Rank 1 is at the top. ${chosen === "all" ? `${view.series.length} of ${view.availableSeries} observed entities shown; select an entity to follow it.` : "Following one selected entity."} Missing and incomplete UTC days break the lines.`,
  );
  const svg = svgAt(
    d3,
    node,
    w,
    h,
    "Observed rank history with rank one at the top",
  );
  let extent = d3.extent(view.buckets, (d) => new Date(`${d.date}T00:00:00Z`));
  if (+extent[0] === +extent[1])
    extent = [new Date(+extent[0] - 43200000), new Date(+extent[1] + 43200000)];
  const x = d3
    .scaleUtc()
    .domain(extent)
    .range([m.left, w - m.right]);
  const maximum = Math.max(...points.map((p) => p.rank), 2),
    y = d3
      .scaleLinear()
      .domain([1, maximum])
      .range([m.top, h - m.bottom]);
  const tickStep = Math.max(1, Math.ceil((maximum - 1) / 5)),
    rankTicks = [1];
  for (let rank = 1 + tickStep; rank <= maximum; rank += tickStep)
    rankTicks.push(rank);
  svg
    .append("g")
    .attr("class", "chart-grid")
    .attr("transform", `translate(${m.left},0)`)
    .call(
      d3
        .axisLeft(y)
        .tickValues(rankTicks)
        .tickSize(-(w - m.left - m.right))
        .tickFormat(""),
    );
  svg
    .append("g")
    .attr("class", "chart-axis")
    .attr("transform", `translate(${m.left},0)`)
    .call(
      d3
        .axisLeft(y)
        .tickValues(rankTicks)
        .tickFormat((rank) => `#${rank}`)
        .tickSizeOuter(0),
    )
    .selectAll("text")
    .style("font-size", "12px");
  svg
    .append("g")
    .attr("class", "chart-axis")
    .attr("transform", `translate(0,${h - m.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(w < 500 ? 4 : 7)
        .tickFormat(d3.utcFormat("%d %b"))
        .tickSizeOuter(0),
    )
    .selectAll("text")
    .style("font-size", "12px");
  svg
    .append("text")
    .attr("x", m.left)
    .attr("y", 16)
    .attr("fill", "var(--muted)")
    .style("font-size", "12px")
    .text("Observed rank · lower is higher");
  const line = d3
    .line()
    .defined((p) => p.rank !== null)
    .x((p) => x(new Date(`${p.date}T00:00:00Z`)))
    .y((p) => y(p.rank));
  for (const series of view.series)
    svg
      .append("path")
      .datum(series.points)
      .attr("fill", "none")
      .attr("stroke", series.color)
      .attr("stroke-width", 2)
      .attr("d", line);
  const detail = paragraph(document.createElement("div"), "");
  detail.setAttribute("aria-live", "polite");
  const choose = (point) => {
    detail.textContent = `${point.label} · rank ${point.rank} on ${dateLabel(point.date)}${point.scope ? " within " + point.scope.replaceAll("-", " ") : ""}.`;
    onSelect({ ...point, date: new Date(`${point.date}T00:00:00Z`) });
  };
  const circles = svg
    .append("g")
    .selectAll("circle")
    .data(points.map((p) => ({ ...p, entityId: p.id, id: p.key })))
    .join("circle")
    .attr("class", "data-point")
    .attr("cx", (p) => x(new Date(`${p.date}T00:00:00Z`)))
    .attr("cy", (p) => y(p.rank))
    .attr("r", 4)
    .attr("fill", (p) => p.color)
    .attr("aria-label", (p) => `${p.label}, ${p.date}: rank ${p.rank}`);
  keyMarks(circles, (p) => choose({ ...p, id: p.entityId }), focus);
  const legend = document.createElement("div");
  legend.style.cssText =
    "display:flex;flex-wrap:wrap;gap:8px 16px;padding:8px 18px;font-size:12px";
  for (const series of view.series) {
    const item = document.createElement("span");
    item.style.cssText =
      "display:flex;align-items:center;gap:6px;overflow-wrap:anywhere";
    const dot = document.createElement("i");
    dot.className = "legend-dot";
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;flex:none;--dot:${series.color};background:${series.color}`;
    const label = document.createElement("span");
    label.textContent = series.label;
    item.append(dot, label);
    legend.append(item);
  }
  // Native selector is the full-size touch alternative to small SVG points.
  const label = document.createElement("label");
  label.style.cssText =
    "display:flex;align-items:center;gap:10px;padding:8px 18px;font-size:12px";
  label.append("Inspect rank");
  const picker = document.createElement("select");
  picker.setAttribute("aria-label", "Inspect exact observed rank");
  picker.style.cssText =
    "min-height:44px;min-width:0;max-width:100%;font:inherit;padding:8px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:6px";
  for (const point of points) {
    const option = document.createElement("option");
    option.value = point.key;
    option.textContent = `${point.date} · ${point.label} · #${point.rank}`;
    picker.append(option);
  }
  picker.onchange = () => choose(points.find((p) => p.key === picker.value));
  label.append(picker);
  node.append(legend, label, detail);
  detail.textContent = `${points[0].label} · rank ${points[0].rank} on ${dateLabel(points[0].date)}.`;
  return view;
}
