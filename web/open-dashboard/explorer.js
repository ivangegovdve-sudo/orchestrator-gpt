import { initShell, copyText } from "./shell.js";
import {
  API_BASE,
  PROVIDERS,
  DEFAULT_STATE,
  AXES,
  compact,
  money,
  dateLabel,
  safeUrl,
  request,
  loadCollection,
  normalizeModels,
  mergeMedia,
  filterModels,
  tokenPoints,
  exactComparisons,
  readState,
  stateQuery,
  keyOf,
} from "./explorer-data.js";
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
let state = readState(location.search),
  models = [],
  filtered = [],
  matrix = null,
  matrixArchive = null,
  apps = [],
  history = null,
  metadata = {},
  failures = [],
  loaded = false,
  resizeTimer,
  toastTimer;
const mediaMode = () => ["video", "image", "audio"].includes(state.modality);
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3200);
}
function persist() {
  const query = stateQuery(state);
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
    !(m.modalities.length === 1 && m.modalities[0] === "text");
  const nativePrices = m.pricePoints || [];
  let prices = media
    ? `<div class="native-prices">${nativePrices.length ? nativePrices.map((p) => `<div class="native-price"><strong>${money(Number(p.amount))}</strong><span> / ${escape(p.unit.replaceAll("_", " "))}</span><small>${escape(formatCondition(p.condition))}</small></div>`).join("") : "<p>Native output price not established. Zero or missing token fields do not price media generation.</p>"}</div>`
    : `<div class="metric-pair"><div><span>Input / 1M tokens</span><strong>${money(m.input)}</strong></div><div><span>Output / 1M tokens</span><strong>${money(m.output)}</strong></div></div>`;
  let quotaText = "";
  if (quota?.kind === "free_variant_quota")
    quotaText =
      "<strong>OpenRouter free limits</strong>20 requests/minute. 50/day below $10 in lifetime purchases; 1,000/day at $10 or more. Quota exhaustion does not switch this model to paid inference.";
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
    `<p class="eyebrow">${escape(PROVIDERS[m.provider] || m.provider)} · ${media ? "Model evidence" : "Find your fit"}</p><h3>${escape(m.name)}</h3><div class="model-id"><code>${escape(m.id)}</code><button type="button" id="copy-model-id" aria-label="Copy exact model ID">Copy</button></div>${prices}${detailsList(
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
  if (!media) {
    const comparison = exactComparisons(m, models);
    if (comparison.length > 1) {
      const max = Math.max(...comparison.map((c) => c.input + c.output));
      $("model-comparison").innerHTML =
        `<div class="provider-compare"><h4>The same exact model ID</h4><p class="filter-note">Input + output price for 1M tokens each</p>${comparison.map((c) => `<div class="compare-row"><span>${escape(PROVIDERS[c.provider] || c.provider)}</span><span>${money(c.input + c.output)}</span><div class="compare-bar"><i style="width:${max ? (100 * (c.input + c.output)) / max : 0}%"></i></div></div>`).join("")}<small>Exact provider IDs only. Endpoint conditions can differ; matching names alone are not treated as equivalent.</small></div>`;
    }
  }
}
function syncControls() {
  for (const id of ["provider", "modality", "x", "y", "scale", "context"])
    $(id).value = state[id];
  for (const id of ["free", "tools", "inactive"]) $(id).checked = state[id];
  $("search").value = state.q;
  $("input-tokens").value = state.inputTokens;
  $("output-tokens").value = state.outputTokens;
  $("flow-app").value = state.app;
  $("flow-model").value = state.flowModel;
  $("flow-weight").value = state.weight;
}
function render() {
  if (!loaded) return;
  filtered = filterModels(models, state);
  $("model-controls").hidden = state.view !== "models";
  $("alternate-controls").hidden = state.view === "models";
  for (const b of document.querySelectorAll("[data-view]")) {
    b.setAttribute("aria-selected", String(b.dataset.view === state.view));
    b.tabIndex = b.dataset.view === state.view ? 0 : -1;
  }
  $("model-panel").setAttribute(
    "aria-labelledby",
    ["benchmarks", "changes"].includes(state.view)
      ? "chart-title"
      : `tab-${state.view}`,
  );
  $("evidence-view").value = ["benchmarks", "changes"].includes(state.view)
    ? state.view
    : "";
  $("inspect-model").closest("label").hidden = state.view !== "models";
  if (state.view === "models") {
    $("text-axes").hidden = mediaMode();
    $("media-axes").hidden = !mediaMode();
    $("workload-controls").hidden =
      mediaMode() || !(state.x === "workload" || state.y === "workload");
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
      $("clear-empty").onclick = reset;
    }
  } else renderAlternateControls();
  renderMainChart();
  persist();
}
function renderMainChart() {
  if (!loaded) return;
  $("chart-legend").replaceChildren();
  if (state.view === "models") {
    let rows = [];
    if (mediaMode()) {
      if (state.unit === "catalogue") {
        catalogueMap($("chart"), filtered, {
          onSelect: selectModel,
          selected: state.selected,
        });
        $("chart-title").textContent = `The ${state.modality} model landscape`;
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
        `${rows.length.toLocaleString()} comparable text entries plotted · ${filtered.length.toLocaleString()} entries match. ${filtered.length - rows.length} lack these dimensions or use other output units. ${state.scale === "symlog" ? "Log + zero keeps free prices visible." : "Linear axes start at zero."}`;
    }
    const providers = [
      ...new Set((rows.length ? rows : filtered).map((m) => m.provider)),
    ];
    for (const p of providers) {
      const item = document.createElement("span");
      item.className = "legend-item";
      const count = state.unit === "catalogue" && mediaMode()
        ? ` · ${filtered.filter((model) => model.provider === p).length}`
        : "";
      item.innerHTML = `<span class="legend-dot" style="--dot:${colorFor(p)}"></span>${escape(PROVIDERS[p] || p)}${count}`;
      $("chart-legend").append(item);
    }
  } else if (state.view === "apps") {
    appBars($("chart"), apps, { onSelect: inspectApp });
    $("chart-title").textContent = "Where people put their models to work";
    $("chart-subtitle").textContent =
      "OpenRouter public apps · rolling 30-day token totals";
    $("plot-summary").textContent =
      `Top ${apps.length} published apps. These rolling totals have their own window; the connection chart below uses one shared day.`;
    if (apps.length)
      inspectApp(
        apps.find((a) => a.appId === $("usage-app")?.value) || apps[0],
      );
    else
      $("inspector").innerHTML =
        '<p class="eyebrow">App usage</p><h3>No published app totals available.</h3><p>Other explorer views and the setup guide remain available.</p>';
  } else if (state.view === "history") {
    const days = history?.data?.modelUsage || [];
    const legends = historyChart($("chart"), days, {
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
      `${days.length} published daily observations. The overview shows the five most consistently observed series; use the selector for any collected model. Missing days stay gaps.`;
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
    const label = document.createElement("label");
    label.className = "control";
    label.textContent = "Inspect app ";
    const s = document.createElement("select");
    s.id = "usage-app";
    s.append(...apps.map((a) => option(a.appId, a.appName)));
    s.onchange = () => inspectApp(apps.find((a) => a.appId === s.value));
    label.append(s);
    box.append(label);
    const a = document.createElement("a");
    a.className = "text-link";
    a.href = "#connections";
    a.textContent = "Trace app–model connections below ↓";
    box.append(a);
  } else if (state.view === "history") {
    const label = document.createElement("label");
    label.className = "control";
    label.textContent = "Model ";
    const select = document.createElement("select");
    const map = new Map(
      (history?.data?.modelUsage || [])
        .flatMap((d) => d.rows)
        .filter((r) => !r.remainder)
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
    note.textContent = "Published 30-day history · exact source IDs";
    box.append(note);
  } else renderEvidenceControls();
}
function inspectApp(app) {
  if (!app) return;
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
  $("inspector").innerHTML =
    `<p class="eyebrow">One day in the landscape</p><h3>${escape(p.label)}</h3><p class="model-id"><code>${escape(p.id)}</code></p><div class="metric-pair"><div><span>Daily tokens</span><strong>${compact(Number(p.value))}</strong></div></div>${detailsList(
      [
        ["Date (UTC)", dateLabel(p.date.toISOString())],
        ["Exact token count", BigInt(p.value).toLocaleString()],
        ["Observation", "Complete published day"],
      ],
    )}<small>Source series identities are preserved. A date suffix or variant is not silently joined to a different catalogue ID.</small>`;
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
    el.textContent = `Showing observed connections for ${isApp ? cell.appName : cell.modelName}. Use “All” in the filters to restore the full view.`;
    persist();
    return;
  }
  const app = matrix.apps.find((a) => a.appId === cell.appId),
    model = matrix.models.find((m) => m.modelId === cell.modelId);
  el.innerHTML = `<strong>${escape(app?.appName)} → ${escape(model?.modelName)}</strong> · ${BigInt(cell.totalTokens).toLocaleString()} tokens on ${dateLabel(cell.period.start)}. ${link(cell.evidenceUrl, "Source evidence", "text-link")}`;
}
function sourceCard(title, description, url) {
  return `<div class="source-item"><strong>${escape(title)}</strong><p>${escape(description)}</p>${link(url, "Source", "text-link")}</div>`;
}
function renderSources() {
  const live = metadata.live;
  const dates = [
    ...new Set(
      (live?.pages || [])
        .flatMap((p) => p.provenance || [])
        .map((p) => dateLabel(p.sourceAsOf || p.fetchedAt)),
    ),
  ];
  $("source-summary").textContent =
    `Published catalogues + dated media snapshot · ${failures.length ? "some sources unavailable" : "view source coverage"}`;
  $("sources").innerHTML =
    sourceCard(
      "Model catalogues",
      `${live ? live.data.length.toLocaleString() + " archived entries. " + (live.hasMore ? "Page limit reached; coverage is partial." : "All returned pages loaded.") : "Catalogue unavailable; count and coverage unknown."} Source dates: ${dates.join(", ")}. Listing is not a live inference check.`,
      `${API_BASE}/live-models?limit=500`,
    ) +
    sourceCard(
      "Native media catalogues",
      `${metadata.media ? metadata.media.models.length.toLocaleString() + " media entries" : "Media source unavailable; entry count unknown"} · snapshot ${dateLabel(metadata.media?.fetchedAt)}. Price coverage is partial. IDs remain provider-specific; quotes retain units and conditions.`,
      metadata.media?.providers?.[0]?.sourceUrl,
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
      "open-dashboard-mcp 1.0.2 · 16 selectable tools, 12 provider adapters. Adapter coverage differs from public website snapshot coverage.",
      "https://www.npmjs.com/package/open-dashboard-mcp",
    );
  for (const error of failures)
    $("sources").innerHTML += sourceCard(error.name, error.message, null);
}
function openLimits() {
  $("limits-dialog").showModal();
}
function prepareLimits() {
  $("limits-content").innerHTML =
    `<h3>OpenRouter free variants</h3><p>Both tiers allow up to <strong>20 requests per minute</strong>, shared across the account’s free-model requests.</p><div class="quota-bars"><div><span>Under $10 purchased</span><i style="width:5%"></i><strong>50 / day</strong></div><div><span>$10 or more purchased</span><i style="width:100%"></i><strong>1,000 / day</strong></div></div><p>${escape(OR.qualification)}</p><p>${escape(OR.note)}</p>${link(OR.sourceUrl, "Read OpenRouter limits", "text-link")}<h3>Groq Free Plan</h3><p>${escape(GROQ.note)}</p><label class="control">Check a model <select id="groq-limit-model"></select></label><div id="groq-quota-detail" class="quota-note"></div><p>${link(GROQ.sourceUrl, "Published Groq limits", "text-link")} · ${link(GROQ.accountUrl, "Your organization limits", "text-link")}</p><small>Policies checked ${OR.checkedAt}. This explorer cannot see your balance or remaining quota, and does not forecast when a provider will change pricing.</small>`;
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
  state = { ...DEFAULT_STATE };
  syncControls();
  render();
  renderFlow();
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
    state[id] = ["free", "tools", "inactive"].includes(id)
      ? $(id).checked
      : id === "context"
        ? Number($(id).value)
        : $(id).value;
    render();
  });
$("evidence-view").onchange = () => {
  if ($("evidence-view").value) {
    state.view = $("evidence-view").value;
    render();
  }
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
  $("more-filters").textContent = open ? "Fewer filters −" : "More filters +";
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
    persist();
  };
window.addEventListener("popstate", () => {
  state = readState(location.search);
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

async function boot() {
  const jobs = {
    live: () => loadCollection("/live-models?limit=500", 12),
    details: () => loadCollection("/models?limit=100&rank_source=none", 15),
    media: async () => {
      const r = await fetch("./media-catalogue.json", {
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error("Media snapshot unavailable");
      return r.json();
    },
    matrix: async () =>
      validateAppModelMatrix(
        await request(
          "/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete",
        ),
      ),
    apps: () => request("/apps?limit=10&period=30d&sort=popular"),
    history: () => request("/history?window=30d&limit=10"),
  };
  const keys = Object.keys(jobs);
  const results = await Promise.allSettled(keys.map((k) => jobs[k]()));
  results.forEach((r, i) =>
    r.status === "fulfilled"
      ? (metadata[keys[i]] = r.value)
      : failures.push({ name: keys[i], message: r.reason.message }),
  );
  models = mergeMedia(
    normalizeModels(
      metadata.live || { data: [] },
      metadata.details || { data: [] },
    ),
    normalizeMediaCatalogue(metadata.media),
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
  const providers = [...new Set(models.map((m) => m.provider))].sort();
  $("provider").append(...providers.map((p) => option(p, PROVIDERS[p] || p)));
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
  $("provider-count").textContent = providers.length;
  $("coverage-note").textContent =
    "Provider-specific entries · coverage varies by source";
  $("data-status").textContent = failures.length
    ? "Some sources unavailable"
    : "Published data · sources below";
  loaded = true;
  syncControls();
  render();
  renderFlow();
  renderSources();
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
          if (["benchmarks", "changes"].includes(state.view)) {
            renderEvidenceControls();
            renderEvidenceView();
          }
        });
    return;
  }
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
