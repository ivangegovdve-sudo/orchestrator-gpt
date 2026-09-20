import { initShell, copyText } from "./shell.js";
import {
  API_BASE,
  PROVIDERS,
  DEFAULT_STATE,
  AXES,
  compact,
  money,
  isPriceOutlier,
  dateLabel,
  safeUrl,
  request,
  loadCollection,
  normalizeModels,
  mergeMedia,
  combineNativeSnapshots,
  filterModels,
  compareProviders,
  tokenPoints,
  exactComparisons,
  observedCells,
  readState,
  stateQuery,
  keyOf,
  providerCoverage,
  DIRECT_PROVIDER_IDS,
  loadRoutingProviders,
  loadModelEndpoints,
  modelFilterSummary,
  clearModelFilters,
  parseProviderPair,
} from "./explorer-data.js";
import {
  modelBreakdown,
  appBreakdown,
  renderBreakdown,
  renderHistoryStacks,
  rankHistoryData,
  renderRankHistory,
} from "./chart-variants.js";
import { loadOverviewSupplemental } from "./overview-data.js";
import { renderOverview } from "./overview.js";
import {
  normalizeMediaCatalogue,
  mediaPriceSeries,
  MEDIA_UNITS,
} from "./media-data.js";
import {
  OPENROUTER_FREE_LIMITS as OR,
  GROQ_FREE_LIMITS as GROQ,
} from "./provider-limits.js";
import {
  scatter,
  flow,
  appBars,
  historyChart,
  emptyChart,
  colorFor,
  catalogueMap,
  providerCompareChart,
  clearChartZoom,
} from "./explorer-charts.js";
import {
  loadEvidence,
  benchmarkView,
  changeView,
  renderBenchmarks,
  renderChanges,
  BENCHMARK_SOURCES,
  CHANGE_RANGES,
} from "./evidence-charts.js";
import { validateAppModelMatrix } from "./open-dashboard-schema.js";

initShell();
const $ = (id) => document.getElementById(id),
  escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let evidence = null,
  evidencePromise = null;
const endpointCache = new Map();
let endpointTimer;
function initialState() {
  const result = readState(location.search);
  // A clean visit should get straight to the useful, interactive explorer.
  // The overview remains available as a tab and explicit `view=overview` links
  // continue to open it for people who want the source-backed tour first.
  if (!location.search || location.search === "?") result.view = "models";
  return result;
}
let state = initialState(),
  models = [],
  filtered = [],
  matrix = null,
  matrixArchive = null,
  apps = [],
  history = null,
  metadata = {},
  failures = [],
  loaded = false,
  providerOptions = [...DIRECT_PROVIDER_IDS],
  resizeTimer,
  toastTimer;
let supplemental = null;
let capabilityStatePromise = null;
const mediaMode = () =>
  ["video", "image", "audio", "unknown"].includes(state.modality);
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3200);
}
function persist() {
  const params = new URLSearchParams(stateQuery(state));
  params.set("view", state.view);
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    `${location.pathname}${query ? "?" + query : ""}${location.hash}`,
  );
}
function option(value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}
function link(url, label, className = "source-link") {
  const u = safeUrl(url);
  return u
    ? `<a class="${className}" href="${escape(u)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`
    : "";
}
function detailsList(items) {
  return `<dl class="detail-list">${items.map(([k, v]) => `<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join("")}</dl>`;
}
function selectModel(m) {
  if (!m) return;
  state.selected = m.key;
  persist();
  renderInspector(m);
  $("inspect-model").value = m.key;
  renderMainChart();
}
function formatCondition(condition) {
  if (!condition) return "No conditions reported";
  if (typeof condition === "string") return condition;
  return Object.entries(condition)
    .map(
      ([k, v]) =>
        `${k.replaceAll("_", " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`,
    )
    .join(" · ");
}
function priceOutlierNote(model, media) {
  if (media) {
    const peersByUnit = new Map();
    for (const candidate of models) {
      for (const point of candidate.pricePoints || []) {
        if (typeof point?.unit !== "string") continue;
        const peers = peersByUnit.get(point.unit) || [];
        peers.push(point.amount);
        peersByUnit.set(point.unit, peers);
      }
    }
    if (
      (model.pricePoints || []).some((point) =>
        isPriceOutlier(point?.amount, peersByUnit.get(point?.unit) || []),
      )
    )
      return '<p class="price-outlier-note">Observed outlier · published price is far outside the comparable catalogue range.</p>';
    return "";
  }
  const inputPeers = models.map((candidate) => candidate.input),
    outputPeers = models.map((candidate) => candidate.output);
  return isPriceOutlier(model.input, inputPeers) ||
    isPriceOutlier(model.output, outputPeers)
    ? '<p class="price-outlier-note">Observed outlier · published price is far outside the comparable catalogue range.</p>'
    : "";
}
function renderInspector(m) {
  if (!m) return;
  const available =
    m.availability === "disappeared"
      ? "Disappeared from catalogue"
      : m.providerActive === false
        ? "Provider marked inactive"
        : "Listed in catalogue";
  const quota = m.quota;
  const freeLabel =
    m.freeOffer === "zero_price"
      ? "Zero token price"
      : m.freeOffer === "free_plan"
        ? "Free plan available"
        : null;
  const media =
    m.kind === "media" ||
    (!(m.modalities.length === 1 && m.modalities[0] === "text") &&
      !(
        m.modalities.length === 0 &&
        m.input !== null &&
        m.output !== null &&
        (m.input > 0 || m.output > 0)
      ));
  const nativePrices = m.pricePoints || [];
  let prices = media
    ? `<div class="native-prices">${nativePrices.length ? nativePrices.map((p) => `<div class="native-price"><strong>${money(Number(p.amount))}</strong><span> / ${escape(p.unit.replaceAll("_", " "))}</span><small>${escape(formatCondition(p.condition))}</small></div>`).join("") : "<p>Native output price not established. Zero or missing token fields do not price media generation.</p>"}</div>`
    : `<div class="metric-pair"><div><span>Input / 1M tokens</span><strong>${money(m.input)}</strong></div><div><span>Output / 1M tokens</span><strong>${money(m.output)}</strong></div></div>`;
  const outlierNote = priceOutlierNote(m, media);
  let quotaText = "";
  if (quota?.kind === "free_variant_quota") {
    const requestsPerMinute = Number.isFinite(Number(quota.requestsPerMinute))
      ? `${Number(quota.requestsPerMinute).toLocaleString()} requests/minute`
      : "requests/minute unavailable";
    const dailyTiers = Array.isArray(quota.dailyTiers)
      ? quota.dailyTiers
          .filter((tier) => tier && Number.isFinite(Number(tier.requestsPerDay)))
          .map(
            (tier) =>
              `${escape(tier.label)}: ${Number(tier.requestsPerDay).toLocaleString()}/day`,
          )
          .join("; ")
      : "";
    quotaText =
      `<strong>OpenRouter free limits</strong>${requestsPerMinute}. ${dailyTiers || "Daily tiers unavailable"}. Policy checked ${dateLabel(quota.checkedAt)}. Quota exhaustion does not switch this model to paid inference.`;
  }
  if (quota?.kind === "free_plan_quota") {
    const units = {
      requestsPerMinute: "requests/min",
      requestsPerDay: "requests/day",
      tokensPerMinute: "tokens/min",
      tokensPerDay: "tokens/day",
      audioSecondsPerHour: "audio seconds/hour",
      audioSecondsPerDay: "audio seconds/day",
    };
    quotaText =
      "<strong>Groq Free Plan</strong>" +
      Object.entries(units)
        .filter(([k]) => quota[k] != null)
        .map(([k, label]) => `${Number(quota[k]).toLocaleString()} ${label}`)
        .join(" · ") +
      ". Organization-wide limits; paid API prices above are separate.";
  }
  $("inspector").innerHTML =
    `<p class="eyebrow">${escape(PROVIDERS[m.provider] || m.provider)} · ${media ? "Model evidence" : "Find your fit"}</p><h3>${escape(m.name)}</h3><div class="model-id"><code>${escape(m.id)}</code><button type="button" id="copy-model-id" aria-label="Copy exact model ID">Copy</button></div>${prices}${outlierNote}${detailsList(
      [
        ["Output", m.modalities.join(", ") || "Not reported"],
        [
          "Context",
          m.context ? compact(m.context) + " tokens" : "Not reported",
        ],
        [
          "Tool calling",
          m.tools === true
            ? "Confirmed"
            : m.tools === false
              ? "Not listed"
              : "Not reported",
        ],
        ["Availability", available],
        ["Observed", dateLabel(m.sourceAt)],
      ],
    )}<div class="tag-row">${freeLabel ? `<span class="tag">${freeLabel}</span>` : ""}${m.modalities.map((v) => `<span class="tag">${escape(v)}</span>`).join("")}</div>${quotaText ? `<div class="quota-note">${quotaText}<button class="inline-button" id="selected-limits">All free-tier details ↗</button></div>` : ""}${media ? `<small>${escape(m.pricingNote || "Native quotes can have different resolutions, durations or other conditions. Compare those conditions before choosing.")}</small>${(m.sourceNotes || []).map((n) => `<small>${escape(typeof n === "string" ? n : JSON.stringify(n))}</small>`).join("")}` : ""}<div id="model-comparison"></div><a class="button primary" href="./mcp/?preset=${media ? "prices" : "models"}">Ask your agent about this ↗</a>${link(m.sourceUrl, "Open provider source")}<small>Catalogue listing does not guarantee that a request will succeed. ${m.kind === "media" ? "Media snapshot" : "Published catalogue"} · ${dateLabel(m.sourceAt)}.</small>`;
  $("copy-model-id").onclick = async () => {
    if (!(await copyText(m.id, $("copy-model-id"))))
      toast(
        "Copy unavailable in this browser. Select the model ID to copy it.",
      );
  };
  $("selected-limits")?.addEventListener("click", openLimits);
  if (m.nativeCatalogue) {
    const note = document.createElement("small");
    note.textContent = m.priceCondition
      ? `The plotted token quote requires ${formatCondition(m.priceCondition)}.`
      : m.pricingNote ||
        "Native source rates retain their original billing conditions.";
    $("inspector").append(note);
    if (m.capabilities?.length) {
      const p = document.createElement("small");
      p.textContent = `Published capabilities: ${m.capabilities.join(", ")}.`;
      $("inspector").append(p);
    }
  }
  if (!media) {
    const comparison = exactComparisons(m, models);
    if (comparison.length > 1) {
      const max = Math.max(...comparison.map((c) => c.input + c.output));
      $("model-comparison").innerHTML =
        `<div class="provider-compare"><h4>The same exact model ID</h4><p class="filter-note">Input + output price for 1M tokens each</p>${comparison.map((c) => `<div class="compare-row"><span>${escape(PROVIDERS[c.provider] || c.provider)}</span><span>${money(c.input + c.output)}</span><div class="compare-bar"><i style="width:${max ? (100 * (c.input + c.output)) / max : 0}%"></i></div></div>`).join("")}<small>Exact provider IDs only. Endpoint conditions can differ; matching names alone are not treated as equivalent.</small></div>`;
    }
  }
  if (m.provider === "openrouter") renderEndpointComparison(m);
}

function renderEndpointComparison(model) {
  const container = document.createElement("div");
  container.className = "provider-compare";
  container.id = "endpoint-comparison";
  container.innerHTML =
    '<h4>Providers for this exact model</h4><p class="filter-note" role="status">Loading published OpenRouter routes…</p>';
  $("model-comparison").append(container);
  clearTimeout(endpointTimer);
  endpointTimer = setTimeout(async () => {
    if (!endpointCache.has(model.id)) {
      if (endpointCache.size >= 40)
        endpointCache.delete(endpointCache.keys().next().value);
      endpointCache.set(
        model.id,
        loadModelEndpoints(model).catch((error) => {
          endpointCache.delete(model.id);
          throw error;
        }),
      );
    }
    try {
      const result = await endpointCache.get(model.id);
      if (state.selected !== model.key || !container.isConnected) return;
      if (!result.rows.length) {
        container.innerHTML = `<h4>Provider routes</h4><p>No endpoint observations were returned for this exact model. This does not establish that the model is unavailable.</p>${link(result.sourceUrl, "Check provider routes")}`;
        return;
      }
      const rows = result.rows
        .slice()
        .sort(
          (a, b) =>
            (a.input !== null && a.output !== null
              ? a.input + a.output
              : Infinity) -
            (b.input !== null && b.output !== null
              ? b.input + b.output
              : Infinity),
        );
      const priced = rows.filter((r) => r.input !== null && r.output !== null),
        maximum = Math.max(0, ...priced.map((r) => r.input + r.output));
      container.innerHTML = `<h4>${rows.length} ${rows.length === 1 ? "route" : "routes"} · ${result.providerCount} ${result.providerCount === 1 ? "provider" : "providers"}</h4><p class="filter-note">${result.textPricing ? "Input + output price for 1M tokens each." : "Token fields do not establish media output prices."} Exact OpenRouter model ID; quantization and endpoint conditions may differ.</p><label class="control">Inspect route <select id="endpoint-select" aria-label="Inspect provider route"></select></label><div class="endpoint-route-list"></div><div class="endpoint-detail" aria-live="polite"></div>${link(result.sourceUrl, "Open all provider routes")}<small>OpenRouter routes are distinct from direct catalogue adapters. Read ${dateLabel(result.sourceAt)}; other charges and account conditions may apply.</small>`;
      const picker = container.querySelector("select"),
        list = container.querySelector(".endpoint-route-list"),
        detail = container.querySelector(".endpoint-detail");
      const inspect = (route) => {
        picker.value = route.key;
        for (const button of list.children)
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.route === route.key),
          );
        detail.innerHTML = detailsList([
          ["Provider", route.provider],
          ["Route", route.tag || route.name],
          ["Input / 1M tokens", money(route.input)],
          ["Output / 1M tokens", money(route.output)],
          [
            "Context",
            route.context === null
              ? "Not reported"
              : compact(route.context) + " tokens",
          ],
          ["Quantization", route.quantization || "Not reported"],
          [
            "Tool calling",
            route.tools === null
              ? "Not reported"
              : route.tools
                ? "Published support"
                : "Not listed",
          ],
          [
            "Source status code",
            route.status === null ? "Not reported" : String(route.status),
          ],
        ]);
        if (route.supportedParameters.length) {
          const p = document.createElement("small");
          p.textContent = `Parameters: ${route.supportedParameters.join(", ")}.`;
          detail.append(p);
        }
      };
      for (const route of rows) {
        picker.append(
          option(
            route.key,
            `${route.provider} · ${route.tag || route.quantization || route.name}`,
          ),
        );
        const button = document.createElement("button");
        button.type = "button";
        button.className = "compare-row endpoint-route";
        button.dataset.route = route.key;
        const sum =
          route.input !== null && route.output !== null
            ? route.input + route.output
            : null;
        button.innerHTML = `<span>${escape(route.provider)}${route.quantization ? " · " + escape(route.quantization) : ""}</span><span>${sum === null ? "Price unknown" : money(sum)}</span>${sum !== null ? `<span class="compare-bar"><i style="width:${maximum ? (sum / maximum) * 100 : 0}%"></i></span>` : ""}`;
        button.onclick = () => inspect(route);
        list.append(button);
      }
      picker.onchange = () =>
        inspect(rows.find((r) => r.key === picker.value) || rows[0]);
      inspect(rows[0]);
    } catch {
      if (state.selected === model.key && container.isConnected)
        container.innerHTML = `<h4>Provider routes are unavailable</h4><p>The endpoint source could not be read. Missing route prices are not zero.</p>${link(`https://openrouter.ai/${model.id}/providers`, "Check provider routes")}`;
    }
  }, 180);
}
function syncControls() {
  for (const o of $("context").querySelectorAll("[data-custom]")) o.remove();
  if (
    ![...$("context").options].some((o) => Number(o.value) === state.context)
  ) {
    const custom = option(
      state.context,
      `${state.context.toLocaleString()} tokens`,
    );
    custom.dataset.custom = "true";
    $("context").append(custom);
  }
  for (const id of ["provider", "modality", "x", "y", "scale", "context"])
    $(id).value = state[id];
  for (const id of ["free", "tools", "inactive"]) $(id).checked = state[id];
  $("search").value = state.q;
  $("input-tokens").value = state.inputTokens;
  $("output-tokens").value = state.outputTokens;
  $("flow-app").value = state.app;
  $("flow-model").value = state.flowModel;
  $("flow-weight").value = state.weight;
  $("model-chart").value = state.modelChart;
  $("model-group").value = state.modelGroup;
  syncProviderPairControls();
}
function syncProviderPairControls() {
  const first = $("compare-a"),
    second = $("compare-b");
  if (!first || !second) return;
  const current = parseProviderPair(state.compare),
    draft = current.length === 2
      ? current
      : [first.value, second.value].filter((value) => value),
    options = [...new Set(providerOptions)].sort((a, b) =>
      (PROVIDERS[a] || a).localeCompare(PROVIDERS[b] || b),
    );
  for (const select of [first, second]) {
    const value = select.value;
    select.replaceChildren(
      option("", "Choose a provider"),
      ...options.map((id) => option(id, PROVIDERS[id] || id)),
    );
    if (draft.includes(value)) select.value = value;
  }
  if (current.length === 2) {
    first.value = current[0];
    second.value = current[1];
    $("compare-help").textContent =
      `${PROVIDERS[current[0]] || current[0]} ↔ ${PROVIDERS[current[1]] || current[1]} · exact IDs stay separate`;
    $("clear-compare").hidden = false;
  } else {
    $("compare-help").textContent = "Choose two providers to compare their catalogues side by side.";
    $("clear-compare").hidden = true;
  }
}
function showFilterSummary() {
  const chips = modelFilterSummary(state);
  $("active-filters").replaceChildren();
  for (const item of chips) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip";
    button.textContent = `${item.label} ×`;
    button.setAttribute("aria-label", `Remove filter: ${item.label}`);
    button.onclick = () => {
      state[item.key] =
        item.key === "modality" ? "all" : DEFAULT_STATE[item.key];
      if (item.key === "compare") {
        $("compare-a").value = "";
        $("compare-b").value = "";
        state.modelChart = DEFAULT_STATE.modelChart;
      }
      state.selected = "";
      syncControls();
      render();
    };
    $("active-filters").append(button);
  }
  $("filter-results").textContent =
    `${filtered.length.toLocaleString()} matching of ${models.length.toLocaleString()} catalogue entries${state.inactive ? "" : " · current listings only"}`;
  const counts = new Map();
  for (const model of filterModels(models, {
    ...state,
    provider: "all",
    compare: "",
  }))
    counts.set(model.provider, (counts.get(model.provider) || 0) + 1);
  for (const o of $("provider").options)
    o.textContent =
      o.value === "all"
        ? "All providers"
        : `${PROVIDERS[o.value] || o.value} (${(counts.get(o.value) || 0).toLocaleString()})`;
  $("clear-filters").hidden = chips.length === 0;
  const count = chips.filter((c) => c.advanced).length;
  $("more-filters").textContent =
    `${$("extra-filters").hidden ? "More filters +" : "Fewer filters −"}${count ? ` (${count} active)` : ""}`;
}
function updateOverview() {
  renderOverview($("overview-panel"), {
    models,
    apps,
    matrix,
    history,
    metadata,
    evidence,
    supplemental,
    onNavigate: (patch) => {
      if (patch.openLimits) {
        openLimits();
        return;
      }
      state = {
        ...(patch.view === "models"
          ? { ...clearModelFilters(state), inactive: true }
          : state),
        selected: "",
        ...patch,
      };
      if (patch.view === "history") {
        state.historyModel = "all";
        state.historyScope = "";
      }
      syncControls();
      render();
      document
        .querySelector(`[data-view="${state.view}"]`)
        ?.focus({ preventScroll: true });
      $("explore").scrollIntoView({ behavior: "smooth", block: "start" });
    },
  });
}
function render() {
  if (!loaded) return;
  syncControls();
  filtered = filterModels(models, state);
  $("model-controls").hidden = state.view !== "models";
  $("alternate-controls").hidden =
    state.view === "models" || state.view === "overview" || state.view === "state";
  $("overview-panel").hidden = state.view !== "overview";
  $("model-panel").hidden = state.view === "overview";
  for (const b of document.querySelectorAll("[data-view]")) {
    b.setAttribute("aria-selected", String(b.dataset.view === state.view));
    b.tabIndex = b.dataset.view === state.view ? 0 : -1;
  }
  $("model-panel").setAttribute("aria-labelledby", `tab-${state.view}`);
  if (state.view === "overview") {
    updateOverview();
    persist();
    return;
  }
  $("inspect-model").closest("label").hidden = state.view !== "models";
  if (state.view === "models") {
    showFilterSummary();
    const prices = state.modelChart === "prices";
    $("text-axes").hidden = !prices || mediaMode();
    $("media-axes").hidden = !prices || !mediaMode();
    $("scale-control").hidden = !prices;
    $("model-group-control").hidden = !["bars", "donut"].includes(
      state.modelChart,
    );
    $("workload-controls").hidden =
      !prices ||
      mediaMode() ||
      !(state.x === "workload" || state.y === "workload");
    const units = [...(MEDIA_UNITS[state.modality] || []), "catalogue"];
    $("media-unit").replaceChildren(
      ...units.map((u) =>
        option(
          u,
          u === "catalogue"
            ? "All entries · catalogue map"
            : `USD / ${u.replaceAll("_", " ")}`,
        ),
      ),
    );
    if (!units.includes(state.unit))
      state.unit = state.modality === "audio" ? "catalogue" : units[0];
    $("media-unit").value = state.unit;
    $("scale-control").hidden =
      !prices || (mediaMode() && state.unit === "catalogue");
    const chooser = $("inspect-model");
    chooser.replaceChildren(
      option("", "Select a model"),
      ...filtered
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) =>
          option(m.key, `${m.name} · ${PROVIDERS[m.provider] || m.provider}`),
        ),
    );
    const chosen = filtered.find((m) => m.key === state.selected);
    if (chosen) {
      chooser.value = chosen.key;
      renderInspector(chosen);
    } else if (filtered.length) {
      const m =
        filtered.find(
          (m) => m.id === "openai/gpt-oss-120b" && m.provider === "openrouter",
        ) ||
        filtered.find((m) =>
          mediaMode()
            ? m.pricePoints?.length
            : m.input > 0 && m.context > 100000,
        ) ||
        filtered[0];
      state.selected = m.key;
      chooser.value = m.key;
      renderInspector(m);
    } else {
      $("inspector").innerHTML =
        '<p class="eyebrow">Keep exploring</p><h3>No models match this combination.</h3><p>Widen the filters to see more of the landscape.</p><button id="clear-empty" class="button primary">Reset filters</button>';
      $("clear-empty").onclick = clearFilters;
    }
  } else renderAlternateControls();
  renderMainChart();
  persist();
}
function renderProviderPairDetails(comparison) {
  const container = $("pair-comparison");
  if (!container) return;
  const pair = comparison?.providers || [];
  if (pair.length !== 2) {
    container.hidden = true;
    container.replaceChildren();
    return;
  }
  const [first, second] = pair,
    shared = comparison.sharedPrices || [],
    heading = document.createElement("div");
  container.hidden = false;
  container.replaceChildren();
  heading.className = "pair-comparison-heading";
  heading.innerHTML = `<strong>${escape(PROVIDERS[first] || first)} ↔ ${escape(PROVIDERS[second] || second)}</strong><span>${comparison.counts[first].toLocaleString()} and ${comparison.counts[second].toLocaleString()} catalogue entries · ${comparison.sharedIds.length.toLocaleString()} exact IDs in both</span>`;
  container.append(heading);
  if (!shared.length) {
    const empty = document.createElement("p");
    empty.className = "pair-comparison-empty";
    empty.textContent =
      "No exact model IDs currently publish comparable token prices in both catalogues. Nothing is silently alias-matched.";
    container.append(empty);
    return;
  }
  const table = document.createElement("table");
  table.className = "pair-comparison-table";
  table.innerHTML = `<caption>Exact shared IDs with published token prices</caption><thead><tr><th scope="col">Model ID</th><th scope="col">${escape(PROVIDERS[first] || first)} input / output</th><th scope="col">${escape(PROVIDERS[second] || second)} input / output</th></tr></thead>`;
  const body = document.createElement("tbody");
  for (const row of shared) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<th scope="row"><code>${escape(row.id)}</code></th><td>${money(row.first.input)} / ${money(row.first.output)}</td><td>${money(row.second.input)} / ${money(row.second.output)}</td>`;
    body.append(tr);
  }
  table.append(body);
  container.append(table);
}
function capabilityStateLabel(observation) {
  const state = String(observation?.state || "unknown").toUpperCase();
  if (state === "KNOWN") return "Known";
  if (state === "EXPIRED") return "Expired";
  return "Unknown";
}
function capabilityStateValue(observation, format = (value) => value) {
  if (!observation || observation.state !== "known" || observation.value == null)
    return capabilityStateLabel(observation);
  return format(observation.value);
}
function renderCapabilityState() {
  const data = metadata.capabilityState;
  if (!data && !capabilityStatePromise) ensureCapabilityState();
  if (!data) {
    $("chart-title").textContent = "Loading decision state";
    $("chart-subtitle").textContent = "Reading the dated capability export";
    $("chart").innerHTML = '<p class="loading-overview">Loading one state row per live model…</p>';
    $("plot-summary").textContent = "Unknown values remain blocked until the export is read.";
    return;
  }
  if (!data || data.status !== "ok") {
    emptyChart(
      $("chart"),
      "The decision state is unavailable.",
      "The dated export could not be read. The model landscape remains available.",
    );
    $("chart-title").textContent = "Decision state needs a complete source";
    $("chart-subtitle").textContent = "No rows are silently treated as selectable";
    $("plot-summary").textContent = data?.message || data?.summary || "Capability state export unavailable.";
    $("inspector").innerHTML = '<p class="eyebrow">Decision state</p><h3>Evidence is missing.</h3><p>Unknown values stay unknown until a real probe publishes them.</p>';
    return;
  }
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const providers = new Set(rows.map((row) => row.provider));
  const directProviders = Array.isArray(data.providers) ? data.providers.filter((provider) => provider.directAdapter).length : providers.size;
  const unknowns = rows.reduce((count, row) => count + (row.selection?.publicCouncil?.state === "unknown" ? 1 : 0), 0);
  const publicQuery = data.queries?.publicCouncil;
  const privateQuery = data.queries?.innerObserver;
  const measurement = data.measurement;
  $("chart-title").textContent = "One state object, two honest decisions";
  $("chart-subtitle").textContent = `${rows.length.toLocaleString()} live model rows · ${directProviders} direct adapters · ${providers.size} with rows · dated ${dateLabel(data.generatedAt)}`;
  $("chart-hint").textContent = "Every unknown is named";
  $("plot-summary").textContent = `${data.scope.completeness === "full" ? "Full" : "Partial"} live-slug coverage. ${unknowns.toLocaleString()} rows cannot be selected for the public council because required evidence is unknown or expired.`;
  const formatList = (values) => Array.isArray(values) && values.length ? values.map((value) => `<code>${escape(value)}</code>`).join(" ") : "None";
  const queryCard = (label, query) => `<article class="state-query-card"><p class="eyebrow">${escape(label)}</p><h4>${query?.decisionState === "decidable" ? "Decision available" : "Blocked by missing evidence"}</h4><p>${escape(query?.basis || "No decision rule published.")}</p><dl class="state-query-meta"><div><dt>Rows considered</dt><dd>${Number(query?.consideredRows || 0).toLocaleString()}</dd></div><div><dt>Missing fields</dt><dd>${formatList(query?.missingFields)}</dd></div></dl></article>`;
  const vantageSummary = (measurement?.vantagePoints || []).map((point) => `<span class="state-vantage"><strong>${escape(point.label)}</strong><small>${escape(point.state.toUpperCase())}</small></span>`).join("");
  const measurementCard = measurement ? `<article class="state-measurement-card"><div><p class="eyebrow">Weekly measured workload · ${escape(measurement.version)}</p><h4>${escape(measurement.workload.prompt)} <span>n=${escape(measurement.workload.sampleSize)}</span></h4><p>${escape(measurement.workload.note)}</p><p class="state-measurement-cost"><strong>PUBLISHED estimate</strong> · $${escape(measurement.weeklyCost.estimateUsd)}/week lower bound · ${Number(measurement.weeklyCost.callsPerWeek).toLocaleString()} calls · ${escape(measurement.weeklyCost.measuredReplacement)}</p></div><div class="state-vantage-list" aria-label="Measurement vantage points">${vantageSummary}</div><p class="state-measurement-foot">p50 and max-of-8 are publishable; p95 is withheld at n=8. Result snapshots: <strong>${escape(measurement.resultSnapshots.state)}</strong> until each vantage point supplies signed JSON.</p></article>` : "";
  const visibleRows = rows;
  const rowTable = visibleRows.map((row) => `<tr><th scope="row"><code>${escape(row.id)}</code><small>${escape(PROVIDERS[row.provider] || row.provider)}</small></th><td><span class="state-pill state-${escape(row.reachability?.state || "unknown")}">${escape(row.reachability?.state || "unknown")}</span></td><td>${escape(capabilityStateValue(row.costPerGeneration))}</td><td>${escape(capabilityStateValue(row.toolCalling, (value) => value ? "Yes" : "No"))}</td><td>${escape(capabilityStateValue(row.functionality?.p50Latency, (value) => `${value} ms`))}</td><td>${escape(capabilityStateValue(row.contextWindow, (value) => String(value)))}</td></tr>`).join("");
  const providerSummary = (data.providers || []).map((provider) => `<span class="state-provider-chip"><strong>${escape(PROVIDERS[provider.id] || provider.id)}</strong><small>${Number(provider.liveRows || 0).toLocaleString()} live rows${provider.state === "no_live_rows" ? " · no live row in this snapshot" : ""}</small></span>`).join("");
  $("chart").innerHTML = `<div class="capability-state-view"><div class="state-provider-summary" aria-label="Provider coverage">${providerSummary}</div><div class="state-query-grid">${queryCard("PUBLIC · literal cheapest paid", publicQuery)}${queryCard("PRIVATE · cheapest functional", privateQuery)}</div>${measurementCard}<div class="state-ledger-heading"><div><p class="eyebrow">Shared ledger</p><h4>Evidence per live slug</h4></div><a class="text-link" href="./capability-state.json" target="_blank" rel="noopener">Open full JSON export ↗</a></div><div class="state-table-wrap"><table class="state-table"><caption class="sr-only">Capability state rows</caption><thead><tr><th scope="col">Model</th><th scope="col">Reachability</th><th scope="col">Measured cost</th><th scope="col">Tool calling</th><th scope="col">p50 latency</th><th scope="col">Context</th></tr></thead><tbody>${rowTable}</tbody></table></div><p class="state-table-note">Showing all ${visibleRows.length.toLocaleString()} rows here. The JSON export contains every available live slug and every field, including UNKNOWN and EXPIRED observations.</p></div>`;
  $("inspector").innerHTML = `<p class="eyebrow">How to read this</p><h3>Unknown is a real state.</h3><p>Catalogue price is published rate-card evidence. It never stands in for a measured generation charge. A model becomes selectable only when the required cost, reachability and functionality fields are current.</p><p>Export generated ${escape(dateLabel(data.generatedAt))} from <code>${escape(data.sourceEndpoint)}</code>.</p>`;
}
function ensureCapabilityState() {
  if (capabilityStatePromise) return capabilityStatePromise;
  capabilityStatePromise = fetch("./capability-state.json", {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  }).then(async (response) => {
    if (!response.ok) throw new Error("Capability state export unavailable");
    const result = await response.json();
    if (result?.status !== "ok" || result?.schemaVersion !== "1.0" || !Array.isArray(result.rows)) throw new Error("Capability state export did not match the expected shape");
    metadata.capabilityState = result;
    if (state.view === "state") renderMainChart();
    return result;
  }).catch((error) => {
    metadata.capabilityState = { status: "error", summary: error.message };
    if (state.view === "state") renderMainChart();
    return metadata.capabilityState;
  });
  return capabilityStatePromise;
}
function renderMainChart() {
  if (!loaded) return;
  if (state.view === "overview") return;
  $("chart-legend").replaceChildren();
  renderProviderPairDetails(null);
  if (state.view === "state") {
    renderCapabilityState();
    return;
  }
  if (state.view === "models") {
    let rows = [];
    if (state.modelChart === "compare") {
      const comparison = compareProviders(filtered, state.compare);
      providerCompareChart($("chart"), comparison, {
        onSelect: (provider) => {
          state.provider = provider;
          state.compare = "";
          state.modelChart = "catalogue";
          syncControls();
          render();
        },
      });
      renderProviderPairDetails(comparison);
      const pair = comparison.providers;
      $("chart-title").textContent =
        pair.length === 2
          ? `${PROVIDERS[pair[0]] || pair[0]} ↔ ${PROVIDERS[pair[1]] || pair[1]}`
          : "Compare two provider catalogues";
      $("chart-subtitle").textContent =
        pair.length === 2
          ? "Side-by-side catalogue coverage · exact IDs only"
          : "Choose two providers above to make the comparison explicit";
      $("plot-summary").textContent =
        pair.length === 2
          ? `${comparison.counts[pair[0]].toLocaleString()} ${PROVIDERS[pair[0]] || pair[0]} entries and ${comparison.counts[pair[1]].toLocaleString()} ${PROVIDERS[pair[1]] || pair[1]} entries match the current filters. ${comparison.pricedCounts[pair[0]].toLocaleString()} and ${comparison.pricedCounts[pair[1]].toLocaleString()} have both token legs. Shared IDs are joined exactly, never by alias.`
          : "Select two distinct providers to compare catalogue size, price coverage and exact shared IDs.";
      $("chart-hint").textContent = "Select a provider bar to inspect its catalogue";
      $("filter-results").textContent =
        `${filtered.length.toLocaleString()} matching of ${models.length.toLocaleString()} catalogue entries · two-provider scope`;
      return;
    }
    if (["bars", "donut", "catalogue"].includes(state.modelChart)) {
      const catalogue = state.modelChart === "catalogue";
      if (catalogue && filtered.length <= 10000) {
        catalogueMap($("chart"), filtered, {
          onSelect: selectModel,
          selected: state.selected,
        });
      } else {
        const groupBy = catalogue ? "provider" : state.modelGroup;
        renderBreakdown($("chart"), modelBreakdown(filtered, { groupBy }), {
          variant: state.modelChart === "donut" ? "donut" : "bars",
          onSelect: (group) => {
            if (groupBy === "provider" && group.id && !group.isOther) {
              state.provider = group.id;
              state.modelChart = "catalogue";
              syncControls();
              render();
            }
          },
        });
      }
      $("chart-title").textContent = catalogue
        ? "Every matching model has a place"
        : "How the catalogue is composed";
      $("chart-subtitle").textContent =
        catalogue && filtered.length > 10000
          ? "Grouped by provider for readability · select a provider to open its model map"
          : "Provider-specific catalogue entries · unknown prices stay included";
      $("plot-summary").textContent =
        `${filtered.length.toLocaleString()} matching entries represented. Counts describe this catalogue, not market share, quality or usage. One underlying model can have entries at several providers.`;
      $("chart-hint").textContent = catalogue
        ? "Select a provider or model"
        : "Exact counts and shares stay visible";
      return;
    } else if (mediaMode()) {
      if (state.unit === "catalogue") {
        catalogueMap($("chart"), filtered, {
          onSelect: selectModel,
          selected: state.selected,
        });
        $("chart-title").textContent =
          state.modality === "unknown"
            ? "The unclassified model landscape"
            : `The ${state.modality} model landscape`;
        $("chart-subtitle").textContent =
          "One dot per catalogue entry · grouped by provider";
        $("plot-summary").textContent =
          `${filtered.length.toLocaleString()} entries match. Group size shows catalogue coverage, not model quality or popularity.`;
      } else {
        const byId = new Map(filtered.map((m) => [m.key, m]));
        rows = mediaPriceSeries(
          filtered.filter((m) => m.kind === "media"),
          { kind: state.modality, unit: state.unit },
        ).map((p) => ({
          ...byId.get(keyOf(p.provider, p.modelId)),
          key: p.key,
          modelKey: keyOf(p.provider, p.modelId),
          px: p.value,
          py: 0,
          rate: p,
        }));
        const providers = [...new Set(rows.map((r) => r.provider))];
        scatter($("chart"), rows, {
          state,
          media: true,
          unit: state.unit,
          providerOrder: providers,
          selected: state.selected,
          onSelect: (m) => selectModel(byId.get(m.modelKey)),
        });
        $("chart-title").textContent = `Compare ${state.modality} prices`;
        $("chart-subtitle").textContent =
          "Native provider rates · same unit, conditions may differ";
        $("plot-summary").textContent =
          `${rows.length} native rates across ${new Set(rows.map((r) => r.modelKey)).size} models · ${filtered.length.toLocaleString()} entries match. Unknown prices are not zero; inspect any entry or switch to the catalogue map.`;
      }
    } else {
      rows = tokenPoints(filtered, state);
      scatter($("chart"), rows, {
        state,
        selected: state.selected,
        onSelect: selectModel,
      });
      $("chart-title").textContent = "A landscape of possibilities";
      $("chart-subtitle").textContent =
        state.x === "workload" || state.y === "workload"
          ? "Illustrative API cost · adjust your input and output above"
          : "Published token prices · USD per million tokens";
      $("plot-summary").textContent =
        `${rows.length.toLocaleString()} entries with comparable token quotes plotted · ${filtered.length.toLocaleString()} entries match. ${filtered.length - rows.length} lack these dimensions or use other output units. ${state.scale === "symlog" ? "Log + zero keeps zero prices visible." : "Linear axes start at zero."}`;
    }
    $("filter-results").textContent =
      `${filtered.length.toLocaleString()} matching of ${models.length.toLocaleString()} catalogue entries${mediaMode() && state.unit === "catalogue" ? " · all matching entries mapped" : ` · ${rows.length.toLocaleString()} ${mediaMode() ? "rates" : "points"} in price view`}${state.inactive ? "" : " · current listings only"}`;
    $("chart-hint").textContent = "Click or tap to inspect";
    const providers = [
      ...new Set((rows.length ? rows : filtered).map((m) => m.provider)),
    ];
    for (const p of providers) {
      const item = document.createElement("span");
      item.className = "legend-item";
      const count =
        state.unit === "catalogue" && mediaMode()
          ? ` · ${filtered.filter((model) => model.provider === p).length}`
          : "";
      item.innerHTML = `<span class="legend-dot" style="--dot:${colorFor(p)}"></span>${escape(PROVIDERS[p] || p)}${count}`;
      $("chart-legend").append(item);
    }
  } else if (state.view === "apps") {
    if (state.appChart === "flow") {
      flow($("chart"), matrix, {
        app: state.app,
        model: state.flowModel,
        weight: state.weight,
        onInspect: inspectFlow,
      });
    } else
      renderBreakdown($("chart"), appBreakdown(apps), {
        variant: state.appChart,
        onSelect: (group) => inspectApp(apps.find((a) => a.appId === group.id)),
      });
    $("chart-title").textContent = "Where people put their models to work";
    $("chart-subtitle").textContent =
      state.appChart === "flow"
        ? `App–model relationships · ${matrix?.status === "available" ? dateLabel(matrix.resolvedPeriod.start) : "common date unavailable"}`
        : "OpenRouter public apps · rolling 30-day token totals";
    $("plot-summary").textContent =
      state.appChart === "flow"
        ? `${observedCells(matrix).filter((c) => (state.app === "all" || c.appId === state.app) && (state.flowModel === "all" || c.modelId === state.flowModel)).length} of ${matrix?.coverage?.observedCells ?? 0} observed links in this selection; missing links are unobserved, not zero. Bar and pie views use rolling app totals from a separate window.`
        : `Shares of the ${apps.length} returned apps, not every OpenRouter app. Exact totals and the denominator remain visible in both charts.`;
    if (state.appChart === "flow")
      $("inspector").innerHTML =
        '<p class="eyebrow">Observed relationships</p><h3>Follow a connection.</h3><p>Select a link to inspect its exact daily token count. App and model filters narrow this shared day.</p><p>Bar and pie charts compare app totals over a separate, rolling 30-day window.</p>';
    else if (apps.length)
      inspectApp(apps.find((a) => a.appId === state.usageApp) || apps[0]);
    else
      $("inspector").innerHTML =
        '<p class="eyebrow">App usage</p><h3>No published app totals available.</h3><p>Other explorer views and the setup guide remain available.</p>';
  } else if (state.view === "history") {
    if (state.historyDataset !== "modelUsage") {
      const days = history?.data?.[state.historyDataset] || [];
      const view = renderRankHistory($("chart"), days, {
        chosen: state.historyModel,
        scope: state.historyScope,
        onSelect: inspectRank,
      });
      $("chart-title").textContent =
        state.historyDataset === "appRanks"
          ? "How app rankings move"
          : "Follow projects in their category";
      $("chart-subtitle").textContent =
        `Published rank · #1 at the top${view.scope ? ` · ${view.scope.replaceAll("-", " ")}` : ""}`;
      $("plot-summary").textContent =
        `${view.availableSeries} observed series in this scope · ${days.length} published days. Gaps remain visible; rank is not an absolute usage count.`;
      $("inspector").innerHTML =
        '<p class="eyebrow">Published rank history</p><h3>Track a position over time.</h3><p>Select a point to see its rank and observation date. Each GitHub category has its own ranking; categories are kept separate.</p>';
      return;
    }
    const days = history?.data?.modelUsage || [];
    const legends =
      state.historyChart === "bars"
        ? (renderHistoryStacks($("chart"), days, {
            chosen: state.historyModel,
            onSelect: inspectHistory,
          }),
          [])
        : historyChart($("chart"), days, {
            chosen: state.historyModel,
            onSelect: inspectHistory,
          });
    for (const item of legends) {
      const el = document.createElement("span");
      el.className = "legend-item";
      el.innerHTML = `<span class="legend-dot" style="--dot:${item.color}"></span>${escape(item.label)}`;
      $("chart-legend").append(el);
    }
    $("chart-title").textContent = "Watch the landscape change";
    $("chart-subtitle").textContent =
      "OpenRouter observed daily model tokens · UTC";
    $("plot-summary").textContent =
      `${days.length} published daily observations. ${state.historyChart === "bars" ? "Stacked bars show reported daily totals, with other models and the published remainder grouped as Other." : "Lines show the five most consistently observed series; select any collected model above."} Missing or incomplete days stay gaps.`;
    if (!days.length)
      $("inspector").innerHTML =
        '<p class="eyebrow">Usage history</p><h3>No daily observations available.</h3><p>Other explorer views and the setup guide remain available.</p>';
    else {
      $("inspector").innerHTML =
        '<p class="eyebrow">Follow the signal</p><h3>Usage changes. Stay curious.</h3><p>Choose a model above or select a daily point to inspect the exact observed token count.</p><p>Popularity is a signal of adoption, not a measure of model quality.</p><a class="button primary" href="./mcp/?preset=usage">Explore usage with your agent ↗</a>';
    }
  } else renderEvidenceView();
}
function renderAlternateControls() {
  const box = $("alternate-controls");
  box.replaceChildren();
  if (state.view === "apps") {
    chartControl("App chart type", "appChart", [
      ["flow", "Connections"],
      ["bars", "Bar chart"],
      ["donut", "Pie / donut chart"],
    ]);
    if (state.appChart === "flow") {
      chartControl("App", "app", [
        ["all", "All published apps"],
        ...(matrix?.apps || []).map((a) => [a.appId, a.appName]),
      ]);
      chartControl("Model", "flowModel", [
        ["all", "All published models"],
        ...(matrix?.models || []).map((m) => [m.modelId, m.modelName]),
      ]);
      chartControl("Link weight", "weight", [
        ["tokens", "Daily tokens · √ scale"],
        ["equal", "Equal width"],
      ]);
      return;
    }
    const label = document.createElement("label");
    label.className = "control";
    label.textContent = "Inspect app ";
    const s = document.createElement("select");
    s.id = "usage-app";
    s.append(...apps.map((a) => option(a.appId, a.appName)));
    if (apps.some((a) => a.appId === state.usageApp)) s.value = state.usageApp;
    s.onchange = () => inspectApp(apps.find((a) => a.appId === s.value));
    label.append(s);
    box.append(label);
    const a = document.createElement("a");
    a.className = "text-link";
    a.href = "#connections";
    a.textContent = "Trace app–model connections below ↓";
    box.append(a);
  } else if (state.view === "history") {
    chartControl("History dataset", "historyDataset", [
      ["modelUsage", "Model tokens"],
      ["appRanks", "App ranks"],
      ["githubRanks", "GitHub project ranks"],
    ]);
    if (state.historyDataset === "modelUsage")
      chartControl("History chart type", "historyChart", [
        ["lines", "Line chart"],
        ["bars", "Stacked bars"],
      ]);
    const days = history?.data?.[state.historyDataset] || [];
    if (state.historyDataset === "githubRanks") {
      const ranked = rankHistoryData(days, { scope: state.historyScope });
      state.historyScope = ranked.scope;
      chartControl(
        "Project category",
        "historyScope",
        ranked.scopes.map((s) => [s.id, s.label]),
      );
    }
    const label = document.createElement("label");
    label.className = "control";
    label.textContent =
      state.historyDataset === "modelUsage" ? "Model " : "Ranked entity ";
    const select = document.createElement("select");
    const map = new Map(
      days
        .flatMap((d) => d.rows)
        .filter(
          (r) =>
            !r.remainder &&
            (state.historyDataset !== "githubRanks" ||
              (r.scope ?? "") === state.historyScope),
        )
        .map((r) => [r.id, r.label]),
    );
    if (state.historyModel !== "all" && !map.has(state.historyModel))
      state.historyModel = "all";
    select.append(
      option("all", "Five most observed series"),
      ...[...map].map(([id, name]) => option(id, name)),
    );
    select.value = state.historyModel;
    select.onchange = () => {
      state.historyModel = select.value;
      persist();
      renderMainChart();
    };
    label.append(select);
    box.append(label);
    const note = document.createElement("span");
    note.className = "filter-note";
    note.textContent =
      "Requested 90-day window · available published days only";
    box.append(note);
  } else renderEvidenceControls();
}
function chartControl(label, key, options) {
  const wrapper = document.createElement("label");
  wrapper.className = "control";
  const title = document.createElement("span");
  title.textContent = label;
  const select = document.createElement("select");
  select.setAttribute("aria-label", label);
  select.append(...options.map(([id, name]) => option(id, name)));
  select.value = state[key];
  select.onchange = () => {
    state[key] = select.value;
    if (["historyDataset", "historyScope"].includes(key))
      state.historyModel = "all";
    render();
    if (["app", "flowModel", "weight"].includes(key)) renderFlow();
  };
  wrapper.append(title, select);
  $("alternate-controls").append(wrapper);
}
function inspectApp(app) {
  if (!app) return;
  state.usageApp = app.appId;
  if ($("usage-app")) $("usage-app").value = app.appId;
  persist();
  $("inspector").innerHTML =
    `<p class="eyebrow">Public app usage</p><h3>${escape(app.appName)}</h3><div class="metric-pair"><div><span>Tokens / 30 days</span><strong>${compact(Number(app.totalTokens))}</strong></div><div><span>Requests / 30 days</span><strong>${compact(Number(app.totalRequests))}</strong></div></div>${detailsList(
      [
        ["Published rank", app.rank],
        ["Observed tokens", BigInt(app.totalTokens).toLocaleString()],
        ["Observed requests", BigInt(app.totalRequests).toLocaleString()],
        ["Window", "Rolling 30 days"],
      ],
    )}<p>These are public OpenRouter observations. They do not measure all usage of this app across every provider.</p><a class="button primary" href="#connections">See app–model connections ↓</a>`;
}
function inspectHistory(p) {
  if (p.isOther) {
    $("inspector").innerHTML =
      `<p class="eyebrow">Grouped daily observations</p><h3>${escape(p.label)}</h3>${detailsList(
        [
          ["Date (UTC)", dateLabel(p.date.toISOString())],
          ["Exact grouped tokens", BigInt(p.value).toLocaleString()],
        ],
      )}<p>This is a sum of published values. It has no single model ID.</p><ul class="history-members">${(p.members || []).map((member) => `<li>${escape(member.isRemainder ? "Published source remainder" : member.label || member.id)}: ${BigInt(member.value).toLocaleString()} tokens</li>`).join("")}</ul>`;
    return;
  }
  $("inspector").innerHTML =
    `<p class="eyebrow">One day in the landscape</p><h3>${escape(p.label)}</h3><p class="model-id"><code>${escape(p.id)}</code></p><div class="metric-pair"><div><span>Daily tokens</span><strong>${compact(Number(p.value))}</strong></div></div>${detailsList(
      [
        ["Date (UTC)", dateLabel(p.date.toISOString())],
        ["Exact token count", BigInt(p.value).toLocaleString()],
        ["Observation", "Complete published day"],
      ],
    )}<small>Source series identities are preserved. A date suffix or variant is not silently joined to a different catalogue ID.</small>`;
}
function inspectRank(p) {
  $("inspector").innerHTML =
    `<p class="eyebrow">Published rank observation</p><h3>${escape(p.label)}</h3><div class="model-id"><code>${escape(p.id)}</code></div>${detailsList(
      [
        ["Rank", `#${p.rank}`],
        ["Date (UTC)", dateLabel(p.date.toISOString())],
        ["Ranking scope", p.scope || "OpenRouter apps"],
      ],
    )}<p>Ranks are compared within the same published scope. Missing dates are not interpolated.</p>`;
}
function renderFlow() {
  if (matrix?.status === "available")
    $("flow-inspection").textContent =
      `Source coverage: ${matrix.coverage.observedCells} observed relationships / ${matrix.coverage.possibleCells} possible pairs · ${matrix.coverage.unmappedObservations} unmapped observations. Select a connection to inspect exact tokens.`;
  flow($("flow-chart"), matrix, {
    app: state.app,
    model: state.flowModel,
    weight: state.weight,
    onInspect: inspectFlow,
  });
  $("flow-period").textContent =
    matrix?.status === "available"
      ? `${matrixArchive ? "Archived view · " : ""}${dateLabel(matrix.resolvedPeriod.start)} · UTC`
      : "No common published date";
}
function inspectFlow(cell) {
  const el = $("flow-inspection");
  if (cell.nodeKind) {
    const isApp = cell.nodeKind === "app";
    state[isApp ? "app" : "flowModel"] = isApp ? cell.appId : cell.modelId;
    syncControls();
    renderFlow();
    if (state.view === "apps" && state.appChart === "flow") render();
    el.textContent = `Showing observed connections for ${isApp ? cell.appName : cell.modelName}. Use “All” in the filters to restore the full view.`;
    persist();
    return;
  }
  const app = matrix.apps.find((a) => a.appId === cell.appId),
    model = matrix.models.find((m) => m.modelId === cell.modelId);
  el.innerHTML = `<strong>${escape(app?.appName)} → ${escape(model?.modelName)}</strong> · ${BigInt(cell.totalTokens).toLocaleString()} tokens on ${dateLabel(cell.period.start)}. ${link(cell.evidenceUrl, "Source evidence", "text-link")}`;
  if (state.view === "apps" && state.appChart === "flow")
    $("inspector").innerHTML =
      `<p class="eyebrow">Observed connection</p><h3>${escape(app?.appName)} → ${escape(model?.modelName)}</h3>${detailsList(
        [
          ["Daily tokens", BigInt(cell.totalTokens).toLocaleString()],
          ["Observed day", dateLabel(cell.period.start)],
          ["Scope", "OpenRouter public observations"],
        ],
      )}${link(cell.evidenceUrl, "Source evidence")}<p>Missing connections are unobserved, not zero usage.</p>`;
}
function sourceCard(title, description, url) {
  return `<div class="source-item"><strong>${escape(title)}</strong><p>${escape(description)}</p>${link(url, "Source", "text-link")}</div>`;
}
function renderSources() {
  const live = metadata.live;
  const native = metadata.native || metadata.media;
  const dates = [
    ...new Set(
      (live?.pages || [])
        .flatMap((p) => p.provenance || [])
        .map((p) => dateLabel(p.sourceAsOf || p.fetchedAt)),
    ),
  ];
  $("source-summary").textContent =
    `Direct catalogues, documented IDs and OpenRouter routes · ${live?.snapshot ? "dated build snapshot" : failures.length ? "some sources unavailable" : "view coverage by provider"}`;
  const catalogueDescription = live
    ? `${live.data.length.toLocaleString()} ${live.snapshot ? "captured snapshot entries" : "archived entries"}. ${live.hasMore ? "Page limit reached; coverage is partial." : "All returned pages loaded."}${live.snapshot ? " The browser live route was unavailable here, so this dated build snapshot keeps the catalogue visible." : ""} Source dates: ${dates.join(", ")}. Listing is not a live inference check.`
    : "Catalogue unavailable; count and coverage unknown. Listing is not a live inference check.";
  const nousInference = metadata.nous?.inference;
  const nousInferenceDescription = nousInference
    ? nousInference.status === "verified"
      ? `Nous Portal inference smoke test passed ${dateLabel(nousInference.checkedAt)} on ${nousInference.model || "a recorded model"}; the Hermes API server key is a separate credential.`
      : `Inference status: ${nousInference.status}. ${nousInference.reason || "No generation result is included in this snapshot."}`
    : "Inference status is unverified; no Nous generation claim is made.";
  $("sources").innerHTML =
    sourceCard(
      "Model catalogues",
      catalogueDescription,
      `${API_BASE}/live-models?limit=500`,
    ) +
    sourceCard(
      "MCP-backed native catalogues",
      `${native ? native.models.length.toLocaleString() + " acquired native records" : "Native source unavailable; entry count unknown"} · snapshot ${dateLabel(native?.fetchedAt)}. Text, image, video, audio, other and unclassified entries are retained. Price coverage is partial; exact IDs, billing units and conditions remain separate.`,
      native?.providers?.[0]?.sourceUrl,
    ) +
    sourceCard(
      "Nous Research catalogue",
      metadata.nous
        ? `${metadata.nous.models.length.toLocaleString()} catalogue identities captured ${dateLabel(metadata.nous.fetchedAt)}; ${metadata.nous.population?.freeTokenPairs ?? 0} publish zero input/output token rates. ${nousInferenceDescription}`
        : "Nous catalogue snapshot unavailable; no Nous inference claim is made.",
      metadata.nous?.sourceUrl || "https://nousresearch.com/",
    ) +
    sourceCard(
      "App–model observations",
      matrix?.status === "available"
        ? `${matrixArchive ? "Archived view from repaired published history" : "Latest common published day"}: ${dateLabel(matrix.resolvedPeriod.start)}. ${matrix.coverage.observedCells}/${matrix.coverage.possibleCells} relationships observed. ${matrix.coverage.unmappedObservations} observations could not be joined to this model axis. ${matrixArchive ? "Captured " + dateLabel(matrixArchive.capturedAt) + ". The live view is currently unavailable; this is a dated archive." : ""}`
        : "No aligned published app–model snapshot is available.",
      "https://openrouter.ai/apps",
    ) +
    sourceCard(
      "Usage history",
      "Public OpenRouter observations. Daily model series and rolling 30-day app totals remain separate.",
      "https://openrouter.ai/rankings",
    ) +
    sourceCard(
      "Free-tier policies",
      `OpenRouter and Groq official policies checked ${OR.checkedAt}. These are account quotas, not remaining allowance or speed measurements.`,
      OR.sourceUrl,
    ) +
    sourceCard(
      "MCP package",
      metadata.packageFacts
        ? `${metadata.packageFacts.name} ${metadata.packageFacts.version} · ${metadata.packageFacts.tools.length} selectable tools, ${metadata.packageFacts.providers.length} direct provider adapters. This is not a count of the inference providers behind OpenRouter. Provider-published catalogue prices keep their units and conditions; measured generation cost is a separate fact and may be unavailable.`
        : "Package facts unavailable; version and package counts are unknown. This is not a count of the inference providers behind OpenRouter. Provider-published catalogue prices keep their units and conditions; measured generation cost is a separate fact and may be unavailable.",
      "https://www.npmjs.com/package/open-dashboard-mcp",
    );
  const routing = metadata.routingProviders,
    archive = metadata.endpointArchive;
  $("sources").innerHTML += sourceCard(
    "OpenRouter routing providers",
    `${routing ? routing.data.length + " providers listed in the public routing directory" : "Routing directory unavailable; total unknown"}. ${archive ? archive.data.length + " archived endpoints across " + new Set(archive.data.map((r) => r.provider)).size + " provider names and " + new Set(archive.data.map((r) => r.modelId)).size + " exact model IDs. " + (archive.hasMore ? "This archive reached the page bound." : "The archive is a collected slice, not every model route.") : "Endpoint archive unavailable."} Select an OpenRouter model to read its current exact endpoint list on demand.`,
    routing?.sourceUrl || "https://openrouter.ai/api/v1/providers",
  );
  for (const provider of providerCoverage(
    models,
    native,
    metadata.sourceStatus,
    metadata.live,
  )) {
    const archiveCount =
      provider.archiveCount === null
        ? "archive count unknown"
        : `${provider.archiveCount} published archive entries`;
    const nativeCount =
      provider.nativeCount === null
        ? "no native supplement acquired"
        : `${provider.nativeCount} native/document entries`;
    const status =
      provider.status === "unavailable"
        ? "No entries acquired; this does not establish an empty provider catalogue."
        : `${provider.models} distinct entries in this explorer; ${provider.pricedModels} have usable published rates here. ${archiveCount}; ${nativeCount}.`;
    const special =
      provider.verification === "document_verification_failed"
        ? " Sail pricing verification failed: the current document differs from the pinned verification. Documented model IDs remain available; quotes are withheld."
        : provider.scope === "public_pricing_rows_only"
          ? " Public pricing identities only; account-visible model inventory is unknown."
          : provider.id === "chutes"
            ? " Model IDs and deployment UUIDs are separate identities."
            : "";
    $("sources").innerHTML += sourceCard(
      `${provider.label} · ${provider.status}`,
      `${status} Population coverage: ${provider.population.replaceAll("_", " ")}. Observed ${dateLabel(provider.sourceAt)}.${provider.stale === true ? " Published source is stale." : ""}${special}`,
      provider.sourceUrl,
    );
  }
  for (const error of failures)
    $("sources").innerHTML += sourceCard(error.name, error.message, null);
}
function openLimits() {
  $("limits-dialog").showModal();
}
function prepareLimits() {
  const maximumDaily = Math.max(
    0,
    ...OR.tiers.map((tier) => Number(tier.requestsPerDay) || 0),
  );
  const dailyTiers = OR.tiers
    .map((tier) => {
      const requestsPerDay = Number(tier.requestsPerDay);
      const width =
        maximumDaily > 0 && Number.isFinite(requestsPerDay)
          ? Math.round((requestsPerDay / maximumDaily) * 100)
          : 0;
      return `<div><span>${escape(tier.label)}</span><i style="width:${width}%"></i><strong>${Number.isFinite(requestsPerDay) ? requestsPerDay.toLocaleString() : "Unavailable"} / day</strong></div>`;
    })
    .join("");
  $("limits-content").innerHTML =
    `<h3>OpenRouter free variants</h3><p>Both tiers allow up to <strong>${Number(OR.requestsPerMinute).toLocaleString()} requests per minute</strong>, shared across the account’s free-model requests.</p><div class="quota-bars">${dailyTiers}</div><p>${escape(OR.qualification)}</p><p>${escape(OR.note)}</p>${link(OR.sourceUrl, "Read OpenRouter limits", "text-link")}<h3>Groq Free Plan</h3><p>${escape(GROQ.note)}</p><label class="control">Check a model <select id="groq-limit-model"></select></label><div id="groq-quota-detail" class="quota-note"></div><p>${link(GROQ.sourceUrl, "Published Groq limits", "text-link")} · ${link(GROQ.accountUrl, "Your organization limits", "text-link")}</p><small>Policies checked ${OR.checkedAt}. This explorer cannot see your balance or remaining quota, and does not forecast when a provider will change pricing.</small>`;
  const s = $("groq-limit-model");
  s.append(...Object.keys(GROQ.models).map((id) => option(id, id)));
  const show = () => {
    const labels = {
      requestsPerMinute: "Requests per minute",
      requestsPerDay: "Requests per day",
      tokensPerMinute: "Tokens per minute",
      tokensPerDay: "Tokens per day",
      audioSecondsPerHour: "Audio seconds per hour",
      audioSecondsPerDay: "Audio seconds per day",
    };
    $("groq-quota-detail").innerHTML = detailsList(
      Object.entries(GROQ.models[s.value]).map(([key, value]) => [
        labels[key] || key,
        Number(value).toLocaleString(),
      ]),
    );
  };
  s.onchange = show;
  show();
  $("open-limits").onclick = openLimits;
  $("close-limits").onclick = () => $("limits-dialog").close();
  $("limits-dialog").addEventListener("click", (e) => {
    if (
      e.target === $("limits-dialog") &&
      e.offsetX >= 0 &&
      e.offsetX >= $("limits-dialog").clientWidth
    )
      $("limits-dialog").close();
  });
}
function reset() {
  clearChartZoom($("chart"));
  for (const key of [
    "x",
    "y",
    "scale",
    "modelChart",
    "modelGroup",
    "inputTokens",
    "outputTokens",
    "unit",
  ])
    state[key] = DEFAULT_STATE[key];
  syncControls();
  render();
}
function clearFilters() {
  state = clearModelFilters(state);
  $("compare-a").value = "";
  $("compare-b").value = "";
  syncControls();
  render();
}
for (const id of [
  "provider",
  "modality",
  "x",
  "y",
  "scale",
  "context",
  "free",
  "tools",
  "inactive",
])
  $(id).addEventListener("change", () => {
    if (id === "provider" && state.compare) {
      state.compare = "";
      state.modelChart =
        state.modelChart === "compare"
          ? DEFAULT_STATE.modelChart
          : state.modelChart;
      $("compare-a").value = "";
      $("compare-b").value = "";
    }
    state[id] = ["free", "tools", "inactive"].includes(id)
      ? $(id).checked
      : id === "context"
        ? Number($(id).value)
        : $(id).value;
    render();
  });
$("clear-filters").onclick = clearFilters;
function updateProviderPair() {
  const first = $("compare-a").value,
    second = $("compare-b").value;
  if (first && second && first === second) {
    $("compare-b").value = "";
    state.compare = "";
    state.modelChart = DEFAULT_STATE.modelChart;
    $("compare-help").textContent = "Choose two different providers to compare.";
    render();
    return;
  }
  if (first && second) {
    state.compare = `${first},${second}`;
    state.provider = "all";
    state.selected = "";
    state.modelChart = "compare";
  } else {
    if (state.compare) state.modelChart = DEFAULT_STATE.modelChart;
    state.compare = "";
    state.selected = "";
  }
  render();
}
$("compare-a").onchange = updateProviderPair;
$("compare-b").onchange = updateProviderPair;
$("clear-compare").onclick = () => {
  state.compare = "";
  state.selected = "";
  state.modelChart = DEFAULT_STATE.modelChart;
  $("compare-a").value = "";
  $("compare-b").value = "";
  syncControls();
  render();
};
for (const [id, key] of [
  ["model-chart", "modelChart"],
  ["model-group", "modelGroup"],
])
  $(id).onchange = () => {
    state[key] = $(id).value;
    render();
  };
$("search").addEventListener("input", () => {
  state.q = $("search").value;
  render();
});
$("media-unit").onchange = () => {
  state.unit = $("media-unit").value;
  render();
};
$("inspect-model").onchange = () =>
  selectModel(filtered.find((m) => m.key === $("inspect-model").value));
for (const [id, key] of [
  ["input-tokens", "inputTokens"],
  ["output-tokens", "outputTokens"],
])
  $(id).onchange = () => {
    state[key] = Math.max(0, Math.min(1e9, Number($(id).value) || 0));
    $(id).value = state[key];
    render();
  };
$("more-filters").onclick = () => {
  const open = $("extra-filters").hidden;
  $("extra-filters").hidden = !open;
  $("more-filters").setAttribute("aria-expanded", String(open));
  showFilterSummary();
};
$("reset-view").onclick = reset;
$("share-view").onclick = async () => {
  persist();
  toast(
    (await copyText(location.href))
      ? "View link copied. Filters and chart settings are included."
      : "Copy unavailable. The address bar contains your current view.",
  );
};
for (const b of document.querySelectorAll("[data-view]")) {
  b.onclick = () => {
    state.view = b.dataset.view;
    render();
  };
  b.onkeydown = (e) => {
    if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const list = [...document.querySelectorAll("[data-view]")],
        i = list.indexOf(b),
        next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? list.length - 1
              : (i + (e.key === "ArrowRight" ? 1 : -1) + list.length) %
                list.length;
      list[next].click();
      list[next].focus();
    }
  };
}
for (const [id, key] of [
  ["flow-app", "app"],
  ["flow-model", "flowModel"],
  ["flow-weight", "weight"],
])
  $(id).onchange = () => {
    state[key] = $(id).value;
    renderFlow();
    if (state.view === "apps" && state.appChart === "flow") render();
    persist();
  };
window.addEventListener("popstate", () => {
  state = initialState();
  syncControls();
  render();
  renderFlow();
});
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (loaded) {
      renderMainChart();
      renderFlow();
    }
  }, 160);
}).observe($("chart"));
prepareLimits();
syncControls();
$("overview-panel").hidden = state.view !== "overview";
$("model-panel").hidden = state.view === "overview";
for (const tab of document.querySelectorAll("[data-view]")) {
  tab.setAttribute("aria-selected", String(tab.dataset.view === state.view));
  tab.tabIndex = tab.dataset.view === state.view ? 0 : -1;
}

async function boot() {
  const jobs = {
    live: () => loadCollection("/live-models?limit=500", 40),
    details: () => loadCollection("/models?limit=100&rank_source=none", 64),
    sourceStatus: () => request("/source-status"),
    endpointArchive: () => loadCollection("/providers?limit=100", 64),
    routingProviders: () => loadRoutingProviders(),
    publicCatalogue: async () => {
      const r = await fetch("./public-catalogue.json", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error("Public catalogue snapshot unavailable");
      const snapshot = await r.json();
      if (
        snapshot?.snapshot !== true ||
        !Array.isArray(snapshot.data) ||
        !Array.isArray(snapshot.pages)
      )
        throw new Error("Public catalogue snapshot did not match the expected shape");
      return snapshot;
    },
    packageFacts: async () => {
      const r = await fetch("./package-facts.json", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error("Package facts unavailable");
      const facts = await r.json();
      if (
        facts?.name !== "open-dashboard-mcp" ||
        typeof facts.version !== "string" ||
        !Array.isArray(facts.providers) ||
        !Array.isArray(facts.tools)
      )
        throw new Error("Package facts did not match the expected shape");
      return facts;
    },
    media: async () => {
      const r = await fetch("./media-catalogue.json", {
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error("Media snapshot unavailable");
      return r.json();
    },
    nous: async () => {
      const r = await fetch("./nous-catalogue.json", {
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error("Nous catalogue snapshot unavailable");
      const snapshot = await r.json();
      if (
        snapshot?.provider !== "nous" ||
        !Array.isArray(snapshot.models) ||
        !Array.isArray(snapshot.providers)
      )
        throw new Error("Nous catalogue snapshot did not match the expected shape");
      return snapshot;
    },
    matrix: async () =>
      validateAppModelMatrix(
        await request(
          "/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete",
        ),
      ),
    apps: () => request("/apps?limit=25&period=30d&sort=popular"),
    history: () => request("/history?window=90d&limit=25"),
  };
  const keys = Object.keys(jobs);
  const results = await Promise.allSettled(keys.map((k) => jobs[k]()));
  results.forEach((r, i) =>
    r.status === "fulfilled"
      ? (metadata[keys[i]] = r.value)
      : failures.push({ name: keys[i], message: r.reason.message }),
  );
  if (
    (!metadata.live?.data?.length || metadata.live.hasMore === true) &&
    metadata.publicCatalogue?.data?.length
  ) {
    metadata.live = {
      ...metadata.publicCatalogue,
      snapshot: true,
    };
    failures = failures.filter((failure) => failure.name !== "live");
  }
  metadata.native = combineNativeSnapshots(metadata.media, metadata.nous);
  models = mergeMedia(
    normalizeModels(
      metadata.live || { data: [] },
      metadata.details || { data: [] },
    ),
    normalizeMediaCatalogue(metadata.native),
  );
  matrix = metadata.matrix;
  apps = metadata.apps?.data || [];
  history = metadata.history;
  if (matrix?.status !== "available") {
    try {
      const [r, m] = await Promise.all([
        fetch("./matrix-snapshot.json"),
        fetch("./matrix-snapshot-meta.json"),
      ]);
      if (!r.ok || !m.ok) throw new Error("No archived matrix");
      const snapshot = validateAppModelMatrix(await r.json()),
        meta = await m.json();
      if (snapshot.status === "available") {
        matrix = snapshot;
        matrixArchive = meta;
      }
    } catch {}
  }
  const providers = [
    ...new Set([...DIRECT_PROVIDER_IDS, ...models.map((m) => m.provider)]),
  ].sort();
  providerOptions = providers;
  $("provider").append(...providers.map((p) => option(p, PROVIDERS[p] || p)));
  $("modality").append(option("unknown", "Unclassified output"));
  if (state.provider !== "all" && !providers.includes(state.provider))
    state.provider = "all";
  if (matrix?.status === "available") {
    $("flow-app").append(...matrix.apps.map((a) => option(a.appId, a.appName)));
    $("flow-model").append(
      ...matrix.models.map((m) => option(m.modelId, m.modelName)),
    );
    if (!matrix.appIds.includes(state.app)) state.app = "all";
    if (!matrix.modelIds.includes(state.flowModel)) state.flowModel = "all";
  }
  $("model-count").textContent = models.length.toLocaleString();
  $("provider-count").textContent = Array.isArray(metadata.packageFacts?.providers)
    ? metadata.packageFacts.providers.length.toLocaleString()
    : "Unknown";
  $("tool-count").textContent = Array.isArray(metadata.packageFacts?.tools)
    ? metadata.packageFacts.tools.length.toLocaleString()
    : "Unknown";
  $("coverage-note").textContent =
    `${metadata.packageFacts?.providers?.length ?? "Unknown"} direct adapters · ${metadata.routingProviders?.data.length ?? "Unknown"} OpenRouter routing providers. See source coverage below.`;
  $("data-status").textContent = failures.length
    ? "Some sources unavailable"
    : metadata.live?.snapshot
      ? "Published snapshot · sources below"
      : "Published data · sources below";
  loaded = true;
  syncControls();
  render();
  renderFlow();
  renderSources();
  loadOverviewSupplemental()
    .then((result) => {
      supplemental = result;
      if (state.view === "overview") updateOverview();
    })
    .catch((error) => {
      supplemental = {
        loaded: true,
        frontiers: [],
        trending: null,
        momentum: { categories: [] },
        errors: [{ message: error.message }],
      };
      if (state.view === "overview") updateOverview();
    });
  ensureEvidence();
  if (!models.length && state.view === "models") {
    emptyChart(
      $("chart"),
      "The catalogues could not be loaded.",
      "Try refreshing the page. The setup guide remains available.",
    );
  }
}
boot().catch((error) => {
  console.error("Open Dashboard:", error);
  $("data-status").textContent = "Data could not be loaded";
  emptyChart(
    $("chart"),
    "The explorer hit a loading problem.",
    "Please refresh. The setup guide remains available.",
  );
});
function evidenceOptions() {
  return {
    source: state.benchSource,
    metric: state.benchMetric,
    price: state.benchPrice,
    group: state.benchGroup,
  };
}
function evidenceControl(label, key, items, value) {
  const l = document.createElement("label");
  l.className = "control";
  const title = document.createElement("span");
  title.textContent = label;
  const s = document.createElement("select");
  s.setAttribute("aria-label", label);
  s.append(...items.map((i) => option(i.id, i.label)));
  s.value = value;
  s.onchange = () => {
    state[key] = s.value;
    if (key === "benchSource") state.benchGroup = "";
    renderEvidenceControls();
    renderEvidenceView();
    persist();
  };
  l.append(title, s);
  $("alternate-controls").append(l);
}
function renderEvidenceControls() {
  const box = $("alternate-controls");
  box.replaceChildren();
  if (!evidence) {
    const p = document.createElement("p");
    p.className = "filter-note";
    p.textContent = "Loading published evidence…";
    box.append(p);
    return;
  }
  if (state.view === "benchmarks") {
    const view = benchmarkView(evidence.benchmarks, evidenceOptions());
    state.benchSource = view.source;
    state.benchMetric = view.metric;
    state.benchPrice = view.price;
    state.benchGroup = view.group || "";
    evidenceControl(
      "Benchmark source",
      "benchSource",
      BENCHMARK_SOURCES,
      view.source,
    );
    evidenceControl("Score", "benchMetric", view.metrics, view.metric);
    evidenceControl("Price", "benchPrice", view.priceOptions, view.price);
    if (view.groups.length > 1)
      evidenceControl(
        "Evaluation group",
        "benchGroup",
        view.groups,
        view.group,
      );
  } else {
    state.changeRange = state.changeRange === "all" ? "all" : "year";
    if (!["all", "prices", "retirements"].includes(state.changeKind))
      state.changeKind = "all";
    evidenceControl(
      "Event type",
      "changeKind",
      [
        { id: "all", label: "All published events" },
        { id: "prices", label: "Price changes" },
        { id: "retirements", label: "Model retirements" },
      ],
      state.changeKind,
    );
    evidenceControl(
      "Date range",
      "changeRange",
      CHANGE_RANGES,
      state.changeRange,
    );
  }
}
function renderEvidenceView() {
  if (!evidence) {
    emptyChart(
      $("chart"),
      "A little more evidence.",
      "Loading published benchmark and lifecycle observations…",
    );
    $("inspector").innerHTML =
      '<p class="eyebrow">Source evidence</p><h3>Compare with context.</h3><p>Scores keep their original evaluation group, variant and source date.</p>';
    ensureEvidence();
    return;
  }
  drawEvidence();
}
function ensureEvidence() {
  if (!evidencePromise)
    evidencePromise = loadEvidence()
      .then((result) => {
        evidence = result;
        renderSources();
        for (const source of result.sources)
          $("sources").innerHTML += sourceCard(
            source.label,
            `Published ${dateLabel(source.sourceAsOf || source.fetchedAt)}. ${source.hasMore ? "Coverage is partial." : "All returned pages loaded."}`,
            source.url,
          );
        if (state.view === "overview") updateOverview();
        if (["benchmarks", "changes"].includes(state.view)) {
          renderEvidenceControls();
          renderEvidenceView();
          persist();
        }
      })
      .catch(() => {
        evidence = {
          benchmarks: null,
          changes: null,
          deprecations: null,
          sources: [],
          errors: [{ message: "Evidence sources unavailable" }],
        };
        if (state.view === "overview") updateOverview();
        if (["benchmarks", "changes"].includes(state.view)) {
          renderEvidenceControls();
          renderEvidenceView();
        }
      });
  return evidencePromise;
}
function drawEvidence() {
  if (state.view === "benchmarks") {
    const view = renderBenchmarks($("chart"), evidence.benchmarks, {
      ...evidenceOptions(),
      onInspect: inspectEvidence,
    });
    $("chart-title").textContent = "A benchmark is a clue. Keep the context.";
    $("chart-subtitle").textContent =
      `${view.sourceLabel} · ${view.groupLabel || "Published variants"}`;
    $("plot-summary").textContent =
      `${view.points.length} comparable observations · ${view.omitted} missing the selected price or score. Scores are meaningful within this evaluation group.`;
    if (view.points.length) inspectEvidence(view.points[0]);
    else
      $("inspector").innerHTML =
        '<p class="eyebrow">Benchmark evidence</p><h3>No comparable score and price in this view.</h3><p>Choose another metric or evaluation group. Missing scores are not zero.</p>';
  } else {
    const view = renderChanges($("chart"), evidence, {
      kind: state.changeKind,
      range: state.changeRange,
      onInspect: inspectEvidence,
    });
    $("chart-title").textContent = "Know what is changing.";
    $("chart-subtitle").textContent =
      "Observed price comparisons and published model lifecycle dates";
    $("plot-summary").textContent =
      `${view.points.length} dated events in view · ${view.outsideRange} later dates outside this range. These observations do not predict future billing.`;
    if (view.points.length) inspectEvidence(view.points[0]);
    else
      $("inspector").innerHTML =
        '<p class="eyebrow">Change evidence</p><h3>No dated events in this slice.</h3><p>The price source compares two published runs. It does not establish an all-time history of prices or guarantee that a model will stay free.</p>';
  }
}
function inspectEvidence(p) {
  const benchmark = p.kind === "benchmark";
  $("inspector").innerHTML =
    `<p class="eyebrow">${escape(benchmark ? p.sourceLabel : p.label)}</p><h3>${escape(p.name)}</h3><div class="model-id"><code>${escape(p.modelId || p.id)}</code></div>${
      benchmark
        ? `<div class="metric-pair"><div><span>${escape(p.yLabel)}</span><strong>${escape(p.py)}</strong></div><div><span>${escape(p.price === "task" ? "USD / task" : "USD / 1M tokens")}</span><strong>${money(p.px)}</strong></div></div>${detailsList(
            [
              ["Evaluation", p.groupLabel],
              ["Source matching", p.matchStatus],
              ["Observed", dateLabel(p.sourceAt)],
            ],
          )}<p>Price and score belong to this exact published variant. A benchmark result does not establish how it performs on every task.</p>`
        : `${detailsList([
            ["Published event", p.label],
            ["Date", dateLabel(p.date)],
            ["Evidence observed", dateLabel(p.sourceAt)],
          ])}<p>${escape(p.dateBasis)}</p>${p.kind === "price-change" ? `<div class="metric-pair"><div><span>Before input / 1M</span><strong>${money(p.beforeInput)}</strong></div><div><span>After input / 1M</span><strong>${money(p.afterInput)}</strong></div></div>` : ""}`
    }<a class="button primary" href="./mcp/?tools=${benchmark ? "dashboard_benchmarks" : "dashboard_whats_changed,dashboard_model_status"}">Explore with your agent ↗</a>${link(p.sourceUrl, "Read source evidence")}`;
}
