import { dateLabel } from "./explorer-data.js";
import { OPENROUTER_FREE_LIMITS as OR } from "./provider-limits.js";
import {
  FRONTIER_VIEWS,
  MCP_COVERAGE,
  PACKAGE_EVIDENCE,
  overviewHistorySeries,
  summarizeOverview,
} from "./overview-data.js";

const format = (value) =>
  value == null ? "Unknown" : new Intl.NumberFormat("en").format(value);
const compact = (value) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const names = {
  text: "Text",
  image: "Image",
  video: "Video",
  audio: "Audio",
  mixed: "Multiple outputs",
  other: "Other output",
  unknown: "Unclassified",
};
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const note = (text) => el("p", "overview-note", text);
const urlLink = (href, text, className = "text-link") => {
  const link = el("a", className, text);
  link.href = href;
  if (/^https:\/\//.test(href)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  return link;
};
const navButton = (label, patch, onNavigate, className = "button") => {
  const button = el("button", className, label);
  button.type = "button";
  button.addEventListener("click", () => onNavigate?.(patch));
  return button;
};
const actionRow = (...nodes) => {
  const row = el("div", "overview-actions");
  row.append(...nodes);
  return row;
};
const unknown = (loaded, subject) =>
  note(
    loaded
      ? `${subject} could not be read. Its count and coverage are unknown.`
      : `Reading ${subject.toLowerCase()}…`,
  );
function section(title, kicker, id) {
  const box = el("section", "overview-section");
  if (id) box.id = id;
  const head = el("div", "overview-section-head");
  head.append(el("p", "overview-kicker", kicker), el("h2", "", title));
  box.append(head);
  return box;
}
function card(title) {
  const box = el("article", "overview-card");
  box.append(el("h3", "", title));
  return box;
}
function stat(number, label) {
  const line = el("p", "overview-stat-line");
  line.append(
    el("strong", "overview-stat", format(number)),
    document.createTextNode(` ${label}`),
  );
  return line;
}
function sourceNote(source, prefix = "Source") {
  const first = dateLabel(source?.collectedFrom),
    last = dateLabel(source?.collectedTo);
  const date = source?.sourceAt
    ? `${prefix} as of ${dateLabel(source.sourceAt)}`
    : source?.fetchedAt
      ? `${prefix} collected ${first === last ? last : `${first}–${last}`}`
      : `${prefix} date not reported`;
  return `${date}${source?.stale ? " · Stale snapshot" : ""}${source?.hasMore ? " · More source rows exist" : ""}${source?.available && !source.acquisitionComplete ? " · Acquisition coverage incomplete or unknown" : ""}.`;
}
function choice(label, value, share, action) {
  const button = el("button", "overview-choice");
  button.type = "button";
  button.append(
    el("span", "overview-choice-label", label),
    el("strong", "overview-choice-value", format(value)),
  );
  button.style.setProperty(
    "--overview-share",
    `${Math.max(0, Math.min(100, share * 100))}%`,
  );
  button.addEventListener("click", action);
  return button;
}
function safeSource(parent, url, label = "Source evidence ↗") {
  if (typeof url === "string" && /^https:\/\//.test(url))
    parent.append(urlLink(url, label));
}

function renderFrontier(
  cardNode,
  supplemental,
  models,
  onNavigate,
  parentNode,
) {
  const controls = el("label", "control"),
    picker = el("select");
  controls.append(el("span", "", "Free-model trade-off"), picker);
  for (const view of FRONTIER_VIEWS) {
    const option = el("option", "", view.label);
    option.value = view.id;
    picker.append(option);
  }
  picker.value = FRONTIER_VIEWS.some(
    (view) => view.id === parentNode.dataset.overviewFrontier,
  )
    ? parentNode.dataset.overviewFrontier
    : FRONTIER_VIEWS[0].id;
  const body = el("div", "overview-frontier-body");
  cardNode.append(controls, body);
  let drawnWidth = 0;
  function draw() {
    drawnWidth = body.clientWidth;
    parentNode.dataset.overviewFrontier = picker.value;
    body.replaceChildren();
    const view = supplemental.frontiers.find(
      (item) => item.id === picker.value,
    );
    if (!view || view.status !== "available") {
      body.append(unknown(supplemental.loaded, "The free-model frontier"));
      return;
    }
    body.append(
      note(
        `${view.members.length} published frontier ${view.members.length === 1 ? "member" : "members"} · ${view.excluded.length} source exclusions${view.rejected.length ? ` · ${view.rejected.length} unreadable or ambiguous members` : ""}. A frontier shows the published trade-offs among compared free-model observations; it is not the full free catalogue.`,
      ),
    );
    const inspection = el("div", "overview-inspection");
    inspection.setAttribute("aria-live", "polite");
    const show = (point) => {
      inspection.replaceChildren(
        el("strong", "", point.modelId),
        note(
          `${view.xLabel}: ${format(point.x)} · ${view.yLabel}: ${format(point.y)}.`,
        ),
      );
      const match = models.find(
        (model) =>
          model.provider === "openrouter" && model.id === point.modelId,
      );
      if (match)
        inspection.append(
          navButton(
            "Inspect this exact model →",
            {
              view: "models",
              modelChart: "prices",
              provider: "openrouter",
              modality: "all",
              free: false,
              q: point.modelId,
              selected: match.key,
            },
            onNavigate,
          ),
        );
      else
        inspection.append(
          note(
            "This exact source ID is not in the loaded current catalogue. No similar name is substituted.",
          ),
        );
    };
    if (view.members.length && globalThis.d3) {
      const d3 = globalThis.d3,
        width = Math.max(220, body.clientWidth || 320),
        height = width < 360 ? 235 : 250,
        margin = {
          top: 42,
          right: 15,
          bottom: 48,
          left: width < 360 ? 51 : 68,
        };
      const svg = d3
        .select(body)
        .append("svg")
        .attr("class", "overview-mini-chart overview-frontier-chart")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr(
          "aria-label",
          `${view.label}. ${view.members.length} frontier models. Select a point or use the model picker below.`,
        );
      function domain(values) {
        const [low, high] = d3.extent(values);
        return low === high
          ? [Math.max(0, low * 0.9 - 1), high * 1.1 + 1]
          : [
              Math.max(0, low - (high - low) * 0.12),
              high + (high - low) * 0.12,
            ];
      }
      const x = d3
        .scaleLinear()
        .domain(domain(view.members.map((point) => point.x)))
        .range([margin.left, width - margin.right]);
      const y = d3
        .scaleLinear()
        .domain(domain(view.members.map((point) => point.y)))
        .range(
          view.yDirection === "min"
            ? [margin.top, height - margin.bottom]
            : [height - margin.bottom, margin.top],
        );
      svg
        .append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(width < 360 ? 3 : 4)
            .tickFormat(d3.format("~s")),
        );
      svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format("~s")));
      svg.selectAll(".domain,.tick line").attr("stroke", "var(--line)");
      svg
        .selectAll(".tick text")
        .attr("fill", "var(--muted)")
        .attr("font-size", 12);
      svg
        .append("text")
        .attr("x", (margin.left + width - margin.right) / 2)
        .attr("y", height - 7)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--muted)")
        .attr("font-size", 12)
        .text(view.xLabel);
      const yTitle = svg
        .append("text")
        .attr("x", margin.left)
        .attr("y", 13)
        .attr("fill", "var(--muted)")
        .attr("font-size", 12);
      yTitle.append("tspan").attr("x", margin.left).text(view.yLabel);
      if (view.yDirection === "min")
        yTitle
          .append("tspan")
          .attr("x", margin.left)
          .attr("dy", 15)
          .text("Lower is better");
      if (view.members.length > 1)
        svg
          .append("path")
          .datum([...view.members].sort((a, b) => a.x - b.x))
          .attr(
            "d",
            d3
              .line()
              .x((point) => x(point.x))
              .y((point) => y(point.y)),
          )
          .attr("fill", "none")
          .attr("stroke", "var(--accent)")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4 5")
          .attr("opacity", 0.45);
      const dots = svg
        .append("g")
        .selectAll("g")
        .data(view.members)
        .join("g")
        .attr("transform", (point) => `translate(${x(point.x)},${y(point.y)})`)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr(
          "aria-label",
          (point) =>
            `${point.modelId}. ${view.xLabel}: ${point.xExact}. ${view.yLabel}: ${point.yExact}.`,
        )
        .style("cursor", "pointer");
      dots.append("circle").attr("r", 14).attr("fill", "transparent");
      dots
        .append("circle")
        .attr("r", 6)
        .attr("fill", "var(--accent)")
        .attr("stroke", "var(--paper)")
        .attr("stroke-width", 2);
      dots
        .on("click", (event, point) => show(point))
        .on("focus", (event, point) => show(point))
        .on("keydown", (event, point) => {
          if (["Enter", " "].includes(event.key)) {
            event.preventDefault();
            show(point);
          }
        });
    } else if (!view.members.length) {
      body.append(
        el(
          "p",
          "overview-empty",
          "The source has no comparable members for these axes.",
        ),
      );
      const reasons = new Map();
      for (const entry of view.excluded)
        reasons.set(entry.reason, (reasons.get(entry.reason) ?? 0) + 1);
      for (const [reason, count] of reasons)
        body.append(
          note(`${format(count)} exclusions: ${reason.replaceAll("_", " ")}.`),
        );
    }
    if (view.members.length) {
      const label = el("label", "control"),
        select = el("select");
      label.append(el("span", "", "Inspect frontier model"), select);
      for (const point of view.members) {
        const option = el("option", "", point.modelId);
        option.value = point.modelId;
        select.append(option);
      }
      select.onchange = () =>
        show(view.members.find((point) => point.modelId === select.value));
      body.append(label, inspection);
      show(view.members[0]);
    }
    body.append(note(sourceNote(view.source)));
    safeSource(body, view.sourceUrl);
  }
  picker.onchange = draw;
  draw();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      if (body.clientWidth > 0 && Math.abs(body.clientWidth - drawnWidth) > 1)
        draw();
    });
    observer.observe(body);
    parentNode._overviewObservers.push(observer);
  }
}

function drawHistoryMini(parent, history, onNavigate) {
  const label = {
    modelUsage: "Model usage",
    appRanks: "App ranks",
    githubRanks: "Project ranks",
  }[history.key];
  const row = el("div", "overview-history-item");
  row.append(
    navButton(
      label,
      { view: "history", historyDataset: history.key },
      onNavigate,
      "overview-history-link",
    ),
  );
  if (!history.available) {
    row.append(note("Source unavailable; history coverage unknown."));
    parent.append(row);
    return;
  }
  row.append(
    note(
      `${format(history.entities)} exact source identities · ${history.completeDays}/${history.days} returned days marked complete.`,
    ),
  );
  const trace = overviewHistorySeries(history);
  if (trace && globalThis.d3) {
    const d3 = globalThis.d3,
      width = 350,
      height = 72,
      valid = trace.points.filter((point) => point.value !== null);
    if (valid.length) {
      const svg = d3
        .select(row)
        .append("svg")
        .attr("class", "overview-mini-chart overview-history-chart")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr(
          "aria-label",
          `${trace.label}${trace.scope ? `, ${trace.scope}` : ""}: ${trace.metric} from ${history.start} to ${history.end}. Missing and incomplete days break the line.`,
        );
      const x = d3
        .scaleUtc()
        .domain(d3.extent(trace.points, (point) => new Date(point.date)))
        .range([5, width - 5]);
      const extent = d3.extent(valid, (point) => point.value);
      if (extent[0] === extent[1]) {
        extent[0] = Math.max(0, extent[0] - 1);
        extent[1] += 1;
      }
      const y = d3
        .scaleLinear()
        .domain(extent)
        .range(
          history.key === "modelUsage" ? [height - 8, 8] : [8, height - 8],
        );
      svg
        .append("path")
        .datum(trace.points)
        .attr(
          "d",
          d3
            .line()
            .defined((point) => point.value !== null)
            .x((point) => x(new Date(point.date)))
            .y((point) => y(point.value)),
        )
        .attr("fill", "none")
        .attr("stroke", "var(--accent)")
        .attr("stroke-width", 2.5);
      svg
        .selectAll("circle")
        .data(valid)
        .join("circle")
        .attr("cx", (point) => x(new Date(point.date)))
        .attr("cy", (point) => y(point.value))
        .attr("r", 2)
        .attr("fill", "var(--accent)");
      row.append(
        note(
          `Preview: ${trace.label}${trace.scope ? ` · ${trace.scope}` : ""}. ${trace.metric === "published rank" ? "Rank 1 is highest." : "Daily tokens."} Open the chart for dates and values.`,
        ),
      );
    }
  }
  parent.append(row);
}

function renderProjects(sectionNode, supplemental, parentNode) {
  const grid = el("div", "overview-grid"),
    trending = card("Trending on GitHub"),
    momentum = card("Momentum in AI projects");
  const board = supplemental.trending;
  if (board?.status === "available") {
    trending.append(
      stat(board.reportedCount, "repositories on this daily board"),
    );
    const list = el("ol", "overview-project-list");
    for (const project of board.repositories.slice(0, 4)) {
      const item = el("li", "");
      item.append(
        urlLink(project.url, project.fullName),
        el(
          "span",
          "overview-project-metric",
          project.starsGained === null
            ? "Daily star gain not observed"
            : `${project.starsGained > 0 ? "+" : ""}${format(project.starsGained)} stars today`,
        ),
      );
      list.append(item);
    }
    trending.append(
      list,
      note(
        `All languages on GitHub's public board, not an AI-only ranking. Collected ${dateLabel(board.collectedAt)}${board.stale ? " · Stale: more than six hours old" : board.stale === null ? " · Freshness unknown" : ""} · ${board.acquisitionPath === "firecrawl" ? "Fallback collection" : "Direct collection"}.`,
      ),
    );
    if (board.fallbackReason) trending.append(note(board.fallbackReason));
    const all = el("details", "overview-details");
    all.append(
      el(
        "summary",
        "",
        `All ${board.repositories.length} returned repositories`,
      ),
    );
    const full = el("ul", "overview-project-list");
    for (const project of board.repositories) {
      const item = el("li", "");
      item.append(
        urlLink(project.url, project.fullName),
        el(
          "span",
          "overview-project-metric",
          `${format(project.stars)} stars · ${format(project.forks)} forks${project.language ? ` · ${project.language}` : ""}`,
        ),
      );
      full.append(item);
    }
    all.append(full);
    trending.append(all);
    safeSource(trending, board.sourceUrl, "Open the source board ↗");
  } else trending.append(unknown(supplemental.loaded, "GitHub trending"));
  const categories = supplemental.momentum?.categories ?? [];
  const control = el("label", "control"),
    picker = el("select");
  control.append(el("span", "", "Project category"), picker);
  for (const category of categories) {
    const option = el("option", "", category.label || category.category);
    option.value = category.category;
    picker.append(option);
  }
  const selected = categories.some(
    (row) => row.category === parentNode.dataset.overviewCategory,
  )
    ? parentNode.dataset.overviewCategory
    : (categories.find((row) => row.category === "mcp")?.category ??
      categories[0]?.category);
  if (selected) picker.value = selected;
  const body = el("div", "overview-momentum-body");
  momentum.append(control, body);
  function draw() {
    parentNode.dataset.overviewCategory = picker.value;
    body.replaceChildren();
    const category = categories.find((row) => row.category === picker.value);
    if (category?.status !== "available") {
      body.append(unknown(supplemental.loaded, "Project momentum"));
      return;
    }
    body.append(
      note(
        `${category.rows.length} returned project families · ${format(category.eligiblePopulation)} eligible in this category · ${format(category.coverageExcluded)} excluded for insufficient coverage.`,
      ),
    );
    const max = Math.max(
        ...category.rows.map((row) => Math.abs(row.starDelta ?? 0)),
        1,
      ),
      list = el("ol", "overview-project-list");
    for (const project of category.rows) {
      const item = el("li", "overview-project-rank");
      item.style.setProperty(
        "--overview-share",
        `${project.starDelta === null ? 0 : Math.min(100, (Math.abs(project.starDelta) * 100) / max)}%`,
      );
      if (project.url) item.append(urlLink(project.url, project.fullName));
      else item.append(el("span", "", project.fullName));
      item.append(
        el(
          "span",
          "overview-project-metric",
          project.starDelta === null
            ? "Star change not observed"
            : `${project.starDelta > 0 ? "+" : ""}${format(project.starDelta)} stars`,
        ),
      );
      list.append(item);
    }
    body.append(
      list,
      note(
        `Seven-day observed star changes: ${dateLabel(category.baseline)}–${dateLabel(category.asOf)}${category.stale ? " · Stale snapshot" : ""}${category.hasMore ? " · More ranked rows exist" : ""}. Ranks stay inside their category. Repository metadata describes the canonical repository, not the whole project family.`,
      ),
    );
    safeSource(body, category.sourceUrl);
  }
  picker.onchange = draw;
  draw();
  grid.append(trending, momentum);
  sectionNode.append(
    grid,
    actionRow(
      urlLink(
        "./github/",
        "Explore projects and choose what to install →",
        "button",
      ),
      urlLink("./mcp/?preset=projects", "Connect project tools", "button"),
    ),
  );
}

function renderHealth(sectionNode, health) {
  if (!health.available) {
    sectionNode.append(unknown(true, "Collector health"));
    return;
  }
  sectionNode.append(
    note(
      `${health.total} published collector records · ${health.failed} latest attempts failed · ${health.stale} marked stale · ${health.delayed} past the published next schedule. These are collector datasets, not a provider count.`,
    ),
  );
  const grid = el("div", "overview-source-grid"),
    inspection = el("div", "overview-inspection");
  inspection.setAttribute("aria-live", "polite");
  function inspect(source) {
    inspection.replaceChildren(
      el("strong", "", source.id),
      note(
        `Published ${dateLabel(source.publishedAt)} · latest attempt ${source.lastAttemptStatus} on ${dateLabel(source.lastAttemptAt)} · next scheduled ${dateLabel(source.nextScheduledAt)}.`,
      ),
      note(
        `Displayed publication coverage: ${source.population.replaceAll("_", " ")} · ${source.acquisitionComplete ? "acquisition confirmed complete for this publication" : "acquisition completeness not established for this publication"}. Consecutive failures: ${format(source.failureCount)}${source.errorCode ? ` · ${source.errorCode}` : ""}.`,
      ),
    );
    if (source.publishedRunId)
      inspection.append(
        el("small", "overview-run-id", `Publication ${source.publishedRunId}`),
      );
    safeSource(inspection, source.sourceUrl);
  }
  for (const source of health.sources) {
    const state = source.failed
      ? "failed"
      : source.stale
        ? "stale"
        : source.missedSchedule
          ? "delayed"
          : source.stale === null || !source.publishedAt
            ? "unknown"
            : "fresh";
    const button = el("button", "overview-source-button");
    button.type = "button";
    button.dataset.state = state;
    button.append(
      el("span", "overview-source-dot"),
      el("span", "", source.id.replaceAll("_", " ")),
      el(
        "small",
        "",
        state === "fresh"
          ? "Within source freshness window"
          : state === "delayed"
            ? "Past next schedule"
            : state,
      ),
    );
    button.onclick = () => inspect(source);
    grid.append(button);
  }
  sectionNode.append(grid, inspection);
  if (health.sources.length)
    inspect(
      health.sources.find(
        (row) => row.failed || row.stale || row.missedSchedule,
      ) ?? health.sources[0],
    );
}

function renderMethods(node, onNavigate) {
  const tools = section(
    "Explore here. Let your agent do the follow-through.",
    "17 tools · enable only what you need",
    "overview-tools",
  );
  const groups = el("div", "overview-tool-groups");
  for (const group of [...new Set(MCP_COVERAGE.map((tool) => tool.group))]) {
    const block = el("div", "overview-tool-group"),
      list = el("ul", "");
    block.append(el("h3", "", group));
    for (const tool of MCP_COVERAGE.filter((item) => item.group === group)) {
      const item = el("li", ""),
        link =
          typeof tool.target === "string"
            ? urlLink(
                tool.target,
                `${tool.name}${tool.agentWorkflow ? " · with your agent" : ""}`,
                "overview-tool-link",
              )
            : navButton(
                tool.name,
                tool.target,
                onNavigate,
                "overview-tool-link",
              );
      link.title = tool.description;
      item.append(link);
      list.append(item);
    }
    block.append(list);
    groups.append(block);
  }
  tools.append(
    groups,
    note(
      "Your agent can resolve a model against detailed requirements, compare evidenced provider aliases, or inspect explicitly configured provider keys locally. The public site does not read your keys, balance, spend or remaining quota. You choose projects separately and enable only the MCP tools you need.",
    ),
    actionRow(urlLink("./mcp/", "Connect Open Dashboard →", "button primary")),
  );
  node.append(tools);
  const methods = section(
    "Know what the evidence means.",
    `Published package ${PACKAGE_EVIDENCE.version}`,
    "overview-methods",
  );
  const grid = el("div", "overview-grid"),
    prices = card("Price units and conditions"),
    speed = card("Speed evidence, with its limits");
  prices.append(
    note(
      "A token quote, a generated image and a second of video are different purchases. Prices retain their native unit, conditions and source; the charts compare compatible units.",
    ),
  );
  const unitList = el("div", "overview-unit-list");
  for (const unit of PACKAGE_EVIDENCE.priceUnits)
    unitList.append(el("span", "tag", unit.replaceAll("_", " ")));
  prices.append(
    unitList,
    note(
      `Conditions: ${PACKAGE_EVIDENCE.conditionKinds.map((item) => item.replaceAll("_", " ")).join(", ")}. Evidence can be published, derived, parsed from prose or unknown.`,
    ),
  );
  speed.append(
    stat(
      PACKAGE_EVIDENCE.speed.numericRates,
      "verified speed rates published by this package",
    ),
    note(
      "Existing speed evidence is incomplete or its claims were withdrawn. The MCP exposes those limits and its probe protocol. Free-tier quotas are not inference speed.",
    ),
  );
  const speedDetails = el("details", "overview-details");
  speedDetails.append(el("summary", "", "Evidence and measurement protocol"));
  for (const observation of PACKAGE_EVIDENCE.speed.observations) {
    const item = el("div", "overview-speed-note");
    item.append(
      el(
        "strong",
        "",
        `${observation.provider} · ${observation.model} · ${observation.state}`,
      ),
      note(observation.note),
    );
    speedDetails.append(item);
  }
  speedDetails.append(
    note(
      "Protocol: fixed prompt, streaming, up to 700 tokens; four runs with the first discarded; median and range of the remaining three. A valid measurement also needs its token basis, timestamp, vantage point and prompt hash. This page does not run a speed probe.",
    ),
  );
  speed.append(speedDetails);
  grid.append(prices, speed);
  methods.append(grid);
  const contract = el("details", "overview-details");
  contract.append(
    el(
      "summary",
      "",
      `Schema ${PACKAGE_EVIDENCE.schemaVersion} · ${PACKAGE_EVIDENCE.deprecations.length} published field-removal notices`,
    ),
    note(
      "These 1.0.0 notices are retrospective: earlier published releases did not have this notice mechanism. Future removals are announced before the removal release.",
    ),
  );
  const list = el("ul", "overview-contract-list");
  for (const item of PACKAGE_EVIDENCE.deprecations) {
    const row = el("li", "");
    row.append(
      el("code", "", item.field),
      document.createTextNode(
        ` · removed in ${item.removed_in} · ${item.replaced_by ? `use ${item.replaced_by}` : item.reason}`,
      ),
    );
    list.append(row);
  }
  contract.append(list);
  methods.append(
    contract,
    note(
      `Package evidence checked ${dateLabel(PACKAGE_EVIDENCE.checkedAt)}; this is distinct from the dataset collection dates above.`,
    ),
  );
  node.append(methods);
}

/** Render only: the controller owns loading, view state, navigation and chart filters. */
export function renderOverview(
  node,
  {
    models = [],
    apps = [],
    matrix,
    history,
    metadata = {},
    evidence,
    supplemental,
    onNavigate,
  } = {},
) {
  const summary = summarizeOverview({
    models,
    apps,
    matrix,
    history,
    metadata,
    evidence,
    supplemental,
  });
  for (const observer of node._overviewObservers ?? []) observer.disconnect();
  node._overviewObservers = [];
  node.replaceChildren();
  node.classList.add("overview");
  const landscape = section(
      "Start with the whole landscape.",
      "Models & prices",
      "overview-catalogue",
    ),
    modelGrid = el("div", "overview-grid"),
    catalogue = card("Every acquired model identity"),
    free = card("What can you get for free?");
  modelGrid.append(catalogue, free);
  landscape.append(modelGrid);
  node.append(landscape);
  if (summary.catalogue.available) {
    catalogue.append(
      stat(
        summary.catalogue.entries,
        `entries across ${summary.catalogue.providers} direct catalogues`,
      ),
    );
    const distribution = el("div", "overview-choice-list");
    for (const part of summary.catalogue.partitions)
      distribution.append(
        choice(
          `${names[part.id]}${["mixed", "other"].includes(part.id) ? " · view all" : ""}`,
          part.count,
          part.count / Math.max(summary.catalogue.entries, 1),
          () =>
            onNavigate?.({
              view: "models",
              modelChart: "catalogue",
              modality: ["mixed", "other"].includes(part.id) ? "all" : part.id,
              provider: "all",
              free: false,
              q: "",
            }),
        ),
      );
    catalogue.append(
      distribution,
      note(
        "Each entry is one exact provider + model ID. These output groups partition the acquired entries; they are not counts of interchangeable base models.",
      ),
      note(
        `${format(summary.catalogue.tokenQuotes)} entries have comparable input/output token quotes. ${format(summary.catalogue.nativePrices)} have native price points; this can overlap token pricing. Unpriced entries stay in the catalogue.`,
      ),
      note(
        `${sourceNote(summary.catalogue.source, "Archive source")} Native snapshot built ${dateLabel(summary.catalogue.nativeAt)}.`,
      ),
      actionRow(
        navButton(
          "Explore all models →",
          {
            view: "models",
            modelChart: "catalogue",
            modality: "all",
            provider: "all",
            free: false,
          },
          onNavigate,
          "button primary",
        ),
      ),
    );
    free.append(
      note(
        `${format(summary.catalogue.freePrices)} entries have confirmed zero token prices. ${format(summary.catalogue.freePlans)} have a separate free-plan quota. Account conditions and model listing dates still matter.`,
      ),
    );
  } else catalogue.append(unknown(true, "Model catalogues"));
  const quotas = el("div", "overview-quota-note");
  quotas.innerHTML = `<p><strong>OpenRouter:</strong> <b>${OR.requestsPerMinute} requests/minute</b>; <b>${OR.tiers[0].requestsPerDay}/day</b>, or <b>${format(OR.tiers[1].requestsPerDay)}/day</b> after $10 in lifetime credit purchases.</p><p><strong>Groq:</strong> model-specific request, token and audio limits.</p>`;
  quotas.append(
    actionRow(
      navButton("Understand limits →", { openLimits: true }, onNavigate),
    ),
  );
  free.append(
    quotas,
    note(
      `The $10 threshold is lifetime purchases, not your balance. Hitting a quota does not automatically turn free inference into paid use. Policies checked ${dateLabel(OR.checkedAt)}.`,
    ),
  );
  renderFrontier(free, summary.supplemental, models, onNavigate, node);
  free.append(
    actionRow(
      navButton(
        "Explore free offers →",
        {
          view: "models",
          modelChart: "catalogue",
          modality: "all",
          free: true,
          provider: "all",
        },
        onNavigate,
      ),
    ),
  );

  const usage = section(
      "See what people actually use.",
      "Apps, models & public usage",
      "overview-usage",
    ),
    usageGrid = el("div", "overview-grid"),
    appCard = card("Apps using OpenRouter"),
    historyCard = card("Follow the changes over time");
  if (summary.apps.available) {
    appCard.append(
      stat(summary.apps.count, "app records in this published slice"),
    );
    const max = Math.max(
        ...summary.apps.rows.map((row) => Number(row.totalTokens ?? 0)),
        1,
      ),
      list = el("div", "overview-choice-list");
    for (const app of summary.apps.rows.slice(0, 5)) {
      const button = choice(
        app.appName,
        null,
        Number(app.totalTokens ?? 0) / max,
        () =>
          onNavigate?.({
            view: "apps",
            appChart: "bars",
            usageApp: app.appId,
            app: "all",
            flowModel: "all",
          }),
      );
      button.querySelector(".overview-choice-value").textContent =
        app.totalTokens === null
          ? "Not observed"
          : compact(Number(app.totalTokens));
      button.title =
        app.totalTokens === null
          ? "Token count not observed"
          : `${BigInt(app.totalTokens).toLocaleString()} observed tokens`;
      list.append(button);
    }
    appCard.append(
      list,
      note(
        `Preview shows up to five apps by published order. Values are rolling ${summary.apps.period ?? "30d"} public token totals, not all-provider usage or your account spend. ${sourceNote(summary.apps.source)}`,
      ),
    );
  } else appCard.append(unknown(true, "App usage"));
  appCard.append(
    note(
      summary.matrix.available
        ? `The aligned matrix separately shows ${summary.matrix.cells}/${format(summary.matrix.possibleCells)} observed app–model relationships on ${dateLabel(summary.matrix.sourceAt)} · ${format(summary.matrix.unmapped)} unmapped observations. Missing relationships are not zero use.`
        : "No aligned app–model matrix is available. Separate app totals do not establish connections.",
    ),
    actionRow(
      navButton(
        "Compare app usage →",
        {
          view: "apps",
          appChart: "bars",
          app: "all",
          flowModel: "all",
          usageApp: "",
        },
        onNavigate,
      ),
      urlLink("#connections", "Explore app–model connections ↓", "button"),
    ),
  );
  for (const series of summary.histories)
    drawHistoryMini(historyCard, series, onNavigate);
  historyCard.append(
    note(
      "Model usage, app ranks and category-scoped project ranks keep their own source identities and periods. Gaps are not filled with zeros.",
    ),
  );
  usageGrid.append(appCard, historyCard);
  usage.append(usageGrid);
  node.append(usage);

  const evidenceSection = section(
      "Compare the evidence. Notice what changed.",
      "Benchmarks & lifecycle",
      "overview-evidence",
    ),
    evidenceGrid = el("div", "overview-grid"),
    benchmarks = card("Published benchmark observations"),
    changes = card("Prices and model availability");
  if (summary.benchmarks.available) {
    benchmarks.append(stat(summary.benchmarks.count, "benchmark observations"));
    const list = el("div", "overview-choice-list");
    for (const group of summary.benchmarks.groups)
      list.append(
        choice(
          group.id.replaceAll("-", " "),
          group.count,
          group.count / Math.max(summary.benchmarks.count, 1),
          () => onNavigate?.({ view: "benchmarks", benchSource: group.id }),
        ),
      );
    benchmarks.append(
      list,
      note(
        `Different benchmarks retain their own score axes and dated prices. No universal quality score is invented. ${sourceNote(summary.benchmarks.source)}`,
      ),
    );
  } else benchmarks.append(unknown(!!evidence, "Benchmark evidence"));
  benchmarks.append(
    navButton("Explore benchmark charts →", { view: "benchmarks" }, onNavigate),
  );
  if (summary.changes.available)
    changes.append(
      stat(
        summary.changes.count,
        "observed price changes in the latest comparison",
      ),
      note(
        `${summary.changes.becamePaid} left free pricing. The exact change time and full requested calendar-period coverage are not established by two catalogue snapshots.`,
      ),
    );
  else changes.append(unknown(!!evidence, "Price changes"));
  if (summary.lifecycle.available) {
    changes.append(
      note(
        `${summary.lifecycle.count} lifecycle records; ${summary.lifecycle.events} have a retirement or absence state. A scheduled retirement is not confirmation a model has stopped serving.`,
      ),
    );
    for (const state of summary.lifecycle.states.filter((item) => item.count))
      changes.append(
        note(`${format(state.count)} · ${state.id.replaceAll("_", " ")}`),
      );
    changes.append(note(sourceNote(summary.lifecycle.source)));
  } else changes.append(unknown(!!evidence, "Lifecycle evidence"));
  changes.append(
    navButton(
      "Explore price and lifecycle changes →",
      { view: "changes", changeRange: "all" },
      onNavigate,
    ),
  );
  evidenceGrid.append(benchmarks, changes);
  evidenceSection.append(evidenceGrid);
  node.append(evidenceSection);

  const projects = section(
    "Find the tools around the models.",
    "GitHub ecosystem",
    "overview-projects",
  );
  renderProjects(projects, summary.supplemental, node);
  node.append(projects);
  const health = section(
    "See where the data stands.",
    "Collection & freshness",
    "overview-health",
  );
  renderHealth(health, summary.health);
  node.append(health);
  renderMethods(node, onNavigate);
  return summary;
}
