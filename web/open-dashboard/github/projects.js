import { initShell } from "../shell.js";

export const CATEGORIES = Object.freeze([
  ["ai-harnesses", "Coding agents", "#38917c"],
  ["inference", "Inference", "#cf8a60"],
  ["ai-skills", "AI skills", "#7e91bc"],
  ["mcp", "MCP servers", "#537e60"],
  ["connectors", "Connectors", "#af8865"],
  ["a2a", "Agent to agent", "#af7c95"],
  ["agent-frameworks", "Agent frameworks", "#8e94bc"],
  ["ai-orchestration", "Orchestration", "#64a4a7"],
]);
const categoryName = (id) =>
  CATEGORIES.find((category) => category[0] === id)?.[1] ?? id;
const categoryColor = (id) =>
  CATEGORIES.find((category) => category[0] === id)?.[2] ?? "#71827a";
const API = "https://openrouter-github-dashboard.vercel.app/api/public/v2";
const REQUEST_BASE =
  typeof location !== "undefined" &&
  ["127.0.0.1", "localhost"].includes(location.hostname) &&
  location.port === "4174"
    ? "/__open_dashboard_api"
    : API;
const format = (value) =>
  value === null || value === undefined
    ? "Not observed"
    : new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
const compact = (value) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export function countValue(value, signed = false) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (!(signed ? /^-?(0|[1-9]\d*)$/ : /^(0|[1-9]\d*)$/).test(String(value)))
    return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}
export function projectUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      /^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)
      ? `https://github.com${url.pathname.replace(/\/$/, "")}`
      : null;
  } catch {
    return null;
  }
}
/** IDs, not similar names, join observations; newest source date owns each metric. */
export function normalizeRepositories(collections) {
  const byId = new Map();
  for (const collection of collections)
    for (const raw of collection.data ?? []) {
      const id = String(raw.repositoryId ?? "");
      const url = projectUrl(raw.url);
      if (
        !/^[1-9]\d*$/.test(id) ||
        !url ||
        typeof raw.fullName !== "string" ||
        !CATEGORIES.some((category) => category[0] === raw.primaryCategory)
      )
        continue;
      const observedAt = collection.coverage?.resolvedAsOf ?? null;
      const previous = byId.get(id);
      const categories = [
        ...new Set([
          ...(previous?.categories ?? []),
          collection.category ?? raw.primaryCategory,
        ]),
      ];
      if (previous && (previous.observedAt ?? "") > (observedAt ?? "")) {
        previous.categories = categories;
        continue;
      }
      byId.set(id, {
        repositoryId: id,
        fullName: raw.fullName,
        url,
        primaryCategory: raw.primaryCategory,
        categories,
        stars: countValue(raw.stars),
        forks: countValue(raw.forks),
        language: typeof raw.language === "string" ? raw.language : null,
        lifecycle: typeof raw.lifecycle === "string" ? raw.lifecycle : null,
        license: typeof raw.license === "string" ? raw.license : null,
        roles: Array.isArray(raw.roles)
          ? raw.roles.filter((role) => typeof role === "string")
          : [],
        observedAt,
        sourceUrl: collection.sourceUrl ?? null,
      });
    }
  return [...byId.values()].sort(
    (a, b) =>
      (b.stars ?? -1) - (a.stars ?? -1) || a.fullName.localeCompare(b.fullName),
  );
}
export function filterProjects(
  projects,
  { category = "all", language = "all", query = "" } = {},
) {
  const needle = query.trim().toLowerCase();
  return projects.filter(
    (project) =>
      (category === "all" || project.categories.includes(category)) &&
      (language === "all" || (project.language ?? "Unknown") === language) &&
      (!needle ||
        [project.fullName, ...project.roles]
          .join(" ")
          .toLowerCase()
          .includes(needle)),
  );
}
/** Momentum comes from an observed delta, never a null ranking score coerced to zero. */
export function rankingRows(response) {
  const evidence = new Map(
    (response.metricEvidence ?? []).map((row) => [
      String(row.repositoryId),
      row,
    ]),
  );
  const momentum = response.ranking?.metric === "momentum";
  return (response.data ?? []).map((row) => {
    const observation = evidence.get(String(row.repositoryId));
    const score =
      typeof row.score === "string" &&
      /^(0(?:\.\d+)?|1(?:\.0+)?)$/.test(row.score)
        ? Number(row.score)
        : null;
    return {
      ...row,
      repositoryId: String(row.repositoryId),
      value: momentum ? countValue(observation?.starDelta, true) : score,
      starDelta: countValue(observation?.starDelta, true),
      forkDelta: countValue(observation?.forkDelta, true),
    };
  });
}
export async function requestProjects(path, fetchImpl = fetch) {
  if (!/^\/github\/(repositories|rankings)\?/.test(path))
    throw new Error("Invalid catalogue request");
  const response = await fetchImpl(REQUEST_BASE + path, {
    headers: { Accept: "application/json" },
    credentials: "omit",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(`Public catalogue returned ${response.status}`);
  const body = await response.json();
  if (
    !Array.isArray(body.data) ||
    body.data.length > 100 ||
    !String(body.schemaVersion ?? "").startsWith("2.")
  )
    throw new Error("Public catalogue format changed");
  return body;
}
export async function loadProjectCategory(category, fetchImpl = fetch) {
  const data = [],
    cursors = new Set();
  let cursor = null,
    first = null,
    complete = false;
  for (let page = 0; page < 5; page++) {
    const query = new URLSearchParams({ category, limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const response = await requestProjects(
      `/github/repositories?${query}`,
      fetchImpl,
    );
    if (first && response.watermark !== first.watermark)
      throw new Error("Catalogue changed during pagination");
    first ??= response;
    data.push(...response.data);
    cursor = response.page?.nextCursor ?? null;
    if (!cursor) {
      complete = true;
      break;
    }
    if (cursors.has(cursor)) break;
    cursors.add(cursor);
  }
  return {
    ...first,
    data,
    category,
    complete,
    sourceUrl: `${API}/github/repositories?category=${encodeURIComponent(category)}&limit=100`,
  };
}

function readState() {
  const query = new URLSearchParams(location.search);
  return {
    category: CATEGORIES.some((row) => row[0] === query.get("category"))
      ? query.get("category")
      : "all",
    language: (query.get("language") ?? "all").slice(0, 100),
    query: (query.get("q") ?? "").slice(0, 100),
    scale: query.get("scale") === "linear" ? "linear" : "log",
    repo: query.get("repo") ?? "",
    metric: query.get("metric") === "momentum" ? "momentum" : "adoption",
    window: ["7", "30", "90"].includes(query.get("window"))
      ? query.get("window")
      : "7",
  };
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function outbound(label, url, className) {
  const anchor = el("a", className, label);
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}

async function initializeProjects() {
  initShell();
  const $ = (id) => document.getElementById(id);
  let state = readState(),
    projects = [],
    filtered = [],
    collections = [],
    failed = [],
    rankingEpoch = 0;
  const rankingCache = new Map();
  const syncUrl = () => {
    const url = new URL(location.href);
    url.search = "";
    for (const [key, value] of Object.entries({
      category: state.category,
      language: state.language,
      q: state.query,
      scale: state.scale,
      repo: state.repo,
      metric: state.metric,
      window: state.window,
    })) {
      if (
        value &&
        !["all", "log", "adoption"].includes(value) &&
        !(key === "window" && state.metric !== "momentum")
      )
        url.searchParams.set(key, value);
    }
    history.replaceState(null, "", url);
  };
  const controls = () => {
    $("project-search").value = state.query;
    $("project-category").value = state.category;
    $("project-language").value = state.language;
    $("project-scale").value = state.scale;
    $("project-window").value = state.window;
  };
  for (const [id, name] of CATEGORIES) {
    const option = el("option", "", name);
    option.value = id;
    $("project-category").append(option);
  }

  function selectProject(id, focus = false) {
    state.repo = id;
    syncUrl();
    $("project-picker").value = id;
    renderInspector();
    renderChart();
    updateRanking();
    if (focus)
      document
        .querySelector(`.projects-point[data-repository-id="${id}"]`)
        ?.focus();
  }
  function renderInspector() {
    const container = $("project-inspector");
    container.replaceChildren();
    const project = projects.find((row) => row.repositoryId === state.repo);
    if (!project) {
      container.append(
        el(
          "p",
          "projects-muted",
          collections.length
            ? "No projects match these filters. Try another category or search."
            : "Project details will appear when the public catalogue is available.",
        ),
      );
      return;
    }
    const [owner, ...name] = project.fullName.split("/");
    container.append(
      el("p", "projects-repo-category", categoryName(project.primaryCategory)),
      el("h3", "projects-repo-name", name.join("/")),
      el("p", "projects-repo-owner", `by ${owner}`),
    );
    const metrics = el("dl", "projects-repo-stats");
    for (const [label, value] of [
      ["Stars", project.stars],
      ["Forks", project.forks],
    ]) {
      const entry = el("div");
      entry.append(el("dt", "", label), el("dd", "", format(value)));
      metrics.append(entry);
    }
    container.append(metrics);
    const metadata = el("dl", "projects-repo-meta");
    const licenseLabels = {
      verified_osi: "Open-source license verified",
      unknown: "Not verified",
      source_available: "Source available",
    };
    for (const [label, value] of [
      ["Language", project.language],
      ["Role", project.roles.join(", ") || null],
      ["Lifecycle", project.lifecycle],
      ["License", licenseLabels[project.license] ?? project.license],
      ["Observed", project.observedAt],
    ])
      metadata.append(
        el("dt", "", label),
        el("dd", "", value ?? "Not observed"),
      );
    container.append(
      metadata,
      outbound(
        "Read project README ↗",
        `${project.url}#readme`,
        "projects-readme",
      ),
      outbound(
        "View repository on GitHub ↗",
        project.url,
        "projects-repo-source",
      ),
    );
  }
  function renderChart() {
    const chart = $("project-chart"),
      svgNode = $("project-scatter"),
      message = $("project-chart-message");
    const plotData = filtered.filter(
      (row) => row.stars !== null && row.forks !== null,
    );
    const d3 = window.d3;
    message.hidden = Boolean(plotData.length && d3);
    message.textContent = !collections.length
      ? "The public catalogue could not be read right now. Reload this page to try again."
      : !d3
        ? "The chart could not load. You can still explore every project with the project selector."
        : filtered.length
          ? "These projects do not have both metrics observed. Their details remain available in the project selector."
          : "No projects match this view. Try a different filter.";
    if (!d3) return;
    const width = Math.max(280, Math.floor(chart.clientWidth)),
      narrow = width < 460;
    const height = narrow ? 335 : 415,
      margin = { top: 28, right: 30, bottom: 50, left: narrow ? 46 : 55 };
    const svg = d3
      .select(svgNode)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("height", height);
    svg.selectAll(".projects-drawing").remove();
    const root = svg.append("g").attr("class", "projects-drawing");
    const xMax = Math.max(1, d3.max(plotData, (row) => row.stars) ?? 1),
      yMax = Math.max(1, d3.max(plotData, (row) => row.forks) ?? 1);
    const scale = state.scale === "linear" ? d3.scaleLinear : d3.scaleSymlog;
    const x = scale()
      .domain([0, xMax * 1.2])
      .range([margin.left, width - margin.right]);
    const y = scale()
      .domain([0, yMax * 1.4])
      .range([height - margin.bottom, margin.top]);
    if (state.scale === "linear") {
      x.nice(narrow ? 3 : 5);
      y.nice(5);
    }
    const ticks = (max) =>
      [0, 10, 100, 1000, 10000, 100000, 1000000].filter(
        (value) => value <= max,
      );
    let xAxis = d3
      .axisBottom(x)
      .ticks(narrow ? 3 : 5)
      .tickFormat(compact)
      .tickSize(-(height - margin.top - margin.bottom))
      .tickSizeOuter(0)
      .tickPadding(10);
    let yAxis = d3
      .axisLeft(y)
      .ticks(5)
      .tickFormat(compact)
      .tickSize(-(width - margin.left - margin.right))
      .tickSizeOuter(0)
      .tickPadding(9);
    if (state.scale === "log") {
      xAxis = xAxis.tickValues(ticks(xMax * 1.2));
      yAxis = yAxis.tickValues(ticks(yMax * 1.4));
    }
    root
      .append("g")
      .attr("class", "projects-grid")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis);
    root
      .append("g")
      .attr("class", "projects-grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis);
    root
      .append("text")
      .attr("class", "projects-axis-label")
      .attr("x", (width + margin.left - margin.right) / 2)
      .attr("y", height - 7)
      .attr("text-anchor", "middle")
      .text("GitHub stars");
    root
      .append("text")
      .attr("class", "projects-axis-label")
      .attr("x", margin.left)
      .attr("y", 12)
      .text("GitHub forks");
    const nodes = root
      .append("g")
      .selectAll("g")
      .data(plotData, (row) => row.repositoryId)
      .join("g")
      .attr(
        "class",
        (row) =>
          `projects-point${row.repositoryId === state.repo ? " is-selected" : ""}`,
      )
      .attr("data-repository-id", (row) => row.repositoryId)
      .attr("role", "button")
      .attr("tabindex", (row) => (row.repositoryId === state.repo ? 0 : -1))
      .attr(
        "aria-label",
        (row) =>
          `${row.fullName}, ${format(row.stars)} stars, ${format(row.forks)} forks. Select for details.`,
      )
      .attr("aria-pressed", (row) => String(row.repositoryId === state.repo))
      .attr("transform", (row) => `translate(${x(row.stars)},${y(row.forks)})`)
      .on("click", (_event, row) => selectProject(row.repositoryId))
      .on("keydown", (event, row) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          selectProject(row.repositoryId, true);
        }
        if (
          ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          const current = plotData.indexOf(row),
            direction = ["ArrowRight", "ArrowDown"].includes(event.key)
              ? 1
              : -1;
          selectProject(
            plotData[(current + direction + plotData.length) % plotData.length]
              .repositoryId,
            true,
          );
        }
      });
    nodes.append("circle").attr("class", "project-hit").attr("r", 14);
    nodes.append("circle").attr("class", "project-halo").attr("r", 11);
    nodes
      .append("circle")
      .attr("class", "project-mark")
      .attr("r", (row) => (row.repositoryId === state.repo ? 6.5 : 5))
      .attr("fill", (row) => categoryColor(row.primaryCategory));
    nodes
      .append("title")
      .text(
        (row) =>
          `${row.fullName}\n${format(row.stars)} stars · ${format(row.forks)} forks`,
      );
    const labelData = [
      ...plotData.filter((row) => row.repositoryId === state.repo),
      ...plotData
        .filter((row) => row.repositoryId !== state.repo)
        .slice(0, narrow ? 1 : 3),
    ];
    const boxes = [];
    for (const row of labelData) {
      const label = row.fullName
          .split("/")
          .slice(1)
          .join("/")
          .slice(0, narrow ? 20 : 28),
        estimatedWidth = label.length * 6.2;
      const right = x(row.stars) + estimatedWidth + 12 > width - 8;
      const left = right
          ? x(row.stars) - estimatedWidth - 10
          : x(row.stars) + 10,
        top = y(row.forks) - 17;
      if (
        boxes.some(
          (box) =>
            left < box.right &&
            left + estimatedWidth > box.left &&
            top < box.bottom &&
            top + 15 > box.top,
        )
      )
        continue;
      boxes.push({ left, right: left + estimatedWidth, top, bottom: top + 15 });
      root
        .append("text")
        .attr("class", "projects-direct-label")
        .attr("x", right ? x(row.stars) - 10 : x(row.stars) + 10)
        .attr("y", top + 10)
        .attr("text-anchor", right ? "end" : "start")
        .text(label);
    }
    const missing = filtered.length - plotData.length;
    $("project-chart-note").textContent =
      `${state.scale === "log" ? "Logarithmic spacing keeps projects of different sizes visible. Zero is preserved." : "Linear axes compare absolute counts."} Select a point to inspect it.${missing ? ` ${missing} project${missing === 1 ? "" : "s"} with missing metrics remain in the selector.` : ""}`;
    svgNode.dataset.ready = "true";
  }
  async function updateRanking() {
    const project = projects.find((row) => row.repositoryId === state.repo);
    const category =
      state.category !== "all" ? state.category : project?.primaryCategory;
    const epoch = ++rankingEpoch,
      metric = state.metric,
      days = state.window;
    document
      .querySelectorAll("[data-ranking-metric]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.rankingMetric === metric),
        ),
      );
    $("project-window-label").hidden = metric !== "momentum";
    $("project-ranking-list").replaceChildren();
    if (!category) {
      $("project-ranking-status").textContent =
        "Choose a project to see its category ranking.";
      return;
    }
    $("project-rank-scope").textContent =
      `${categoryName(category)} · ${metric === "momentum" ? `${days}-day star growth` : "adoption from stars and forks"}`;
    $("project-ranking-status").textContent = "Reading the published ranking…";
    const query = new URLSearchParams({
      category,
      metric,
      entity_level: "project-family",
      limit: "5",
    });
    if (metric === "momentum") query.set("window", days);
    const key = query.toString();
    try {
      if (!rankingCache.has(key))
        rankingCache.set(
          key,
          requestProjects(`/github/rankings?${query}`).catch((error) => {
            rankingCache.delete(key);
            throw error;
          }),
        );
      const response = await rankingCache.get(key);
      if (epoch !== rankingEpoch) return;
      const rows = rankingRows(response),
        max = Math.max(...rows.map((row) => Math.abs(row.value ?? 0)), 1);
      for (const row of rows) {
        const item = el("li"),
          button = el("button");
        button.type = "button";
        const name = el("span", "projects-rank-name", row.fullName),
          bar = el("span", "projects-rank-bar");
        if (row.value !== null) {
          bar.style.setProperty(
            "--bar-width",
            `${Math.max(0, Math.min(100, (Math.abs(row.value) / (metric === "adoption" ? 1 : max)) * 100))}%`,
          );
          name.append(bar);
        }
        const value =
          row.value === null
            ? "Not observed"
            : metric === "momentum"
              ? `${row.value > 0 ? "+" : ""}${format(row.value)} stars`
              : `${Math.round(row.value * 100)} / 100`;
        button.append(
          el("span", "projects-rank-number", String(row.rank)),
          name,
          el("span", "projects-rank-value", value),
        );
        button.addEventListener("click", () => {
          const target = projects.find(
            (candidate) => candidate.repositoryId === row.repositoryId,
          );
          if (target) {
            state.query = "";
            state.language = "all";
            render();
            selectProject(target.repositoryId);
            $("project-picker").focus();
          } else
            window.open(
              `https://github.com/${row.fullName.split("/").map(encodeURIComponent).join("/")}`,
              "_blank",
              "noopener,noreferrer",
            );
        });
        item.append(button);
        $("project-ranking-list").append(item);
      }
      const coverage = response.coverage,
        rank = response.ranking;
      $("project-ranking-status").textContent =
        `${rows.length ? `Top ${rows.length} of ${rank.eligiblePopulation} eligible project families` : "No eligible project families in this window"} · ${coverage.resolvedAsOf}${coverage.stale ? " · Source marked stale" : ""}${rank.coverageExcluded ? ` · ${rank.coverageExcluded} excluded for coverage` : ""}.`;
      $("project-ranking-method").textContent =
        `${rank.definition}. ${metric === "adoption" ? "The published 0–1 score is displayed on a 0–100 scale; it is not a quality or safety score." : `Growth compares the published baseline ${rank.baselineDate ?? "(unavailable)"} to ${coverage.resolvedAsOf}. A missing delta is unknown.`} Source: GitHub observations collected by Open Dashboard. ${coverage.populationCompleteness === "full" ? "Coverage is complete within the stated eligible population." : "Source population coverage is partial or unknown."}`;
    } catch {
      if (epoch !== rankingEpoch) return;
      $("project-ranking-status").textContent =
        metric === "momentum"
          ? `A fully covered ${days}-day momentum ranking is not available right now. Try a different window or Adoption.`
          : "The adoption ranking could not be read right now. Repository metrics above remain available.";
      $("project-ranking-method").textContent =
        "Unavailable ranking data is not shown as a zero score.";
    }
  }
  function render() {
    filtered = filterProjects(projects, state);
    if (!filtered.some((project) => project.repositoryId === state.repo))
      state.repo = filtered[0]?.repositoryId ?? "";
    controls();
    syncUrl();
    $("projects-count").textContent = collections.length
      ? String(filtered.length)
      : "—";
    const picker = $("project-picker");
    picker.replaceChildren();
    for (const project of filtered) {
      const option = el("option", "", project.fullName);
      option.value = project.repositoryId;
      picker.append(option);
    }
    if (!filtered.length)
      picker.append(
        el(
          "option",
          "",
          collections.length ? "No matching projects" : "Catalogue unavailable",
        ),
      );
    picker.value = state.repo;
    const dates = [
      ...new Set(
        collections
          .map((collection) => collection.coverage?.resolvedAsOf)
          .filter(Boolean),
      ),
    ].sort();
    const stamp =
      dates.length > 1
        ? `${dates[0]}–${dates.at(-1)}`
        : (dates[0] ?? "date unavailable");
    const partial = collections.some(
      (collection) =>
        !collection.complete ||
        !collection.coverage?.acquisitionComplete ||
        collection.coverage?.populationCompleteness !== "full",
    );
    $("project-status").textContent =
      `${projects.length} curated repositories · ${collections.length} of 8 categories loaded · Observed ${stamp}${partial ? " · Some source metadata is incomplete" : ""}${failed.length ? ` · Could not load ${failed.map(categoryName).join(", ")}` : ""}.`;
    if (!collections.length)
      $("project-status").textContent =
        "The public project catalogue is temporarily unavailable. Repository counts and activity are unknown until a source can be read.";
    const legend = $("project-legend");
    legend.replaceChildren();
    for (const [category, name, color] of CATEGORIES.filter(([id]) =>
      filtered.some((project) => project.primaryCategory === id),
    )) {
      const button = el("button"),
        dot = el("i");
      dot.style.setProperty("--category-color", color);
      button.type = "button";
      button.append(dot, document.createTextNode(name));
      button.title = `Filter to ${name}`;
      button.addEventListener("click", () => {
        state.category = category;
        render();
      });
      legend.append(button);
    }
    renderInspector();
    renderChart();
    updateRanking();
  }
  $("project-search").addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
  for (const [id, key] of [
    ["project-category", "category"],
    ["project-language", "language"],
    ["project-scale", "scale"],
  ])
    $(id).addEventListener("change", (event) => {
      state[key] = event.target.value;
      render();
    });
  $("project-picker").addEventListener("change", (event) =>
    selectProject(event.target.value),
  );
  $("project-reset").addEventListener("click", () => {
    state = {
      ...state,
      category: "all",
      language: "all",
      query: "",
      scale: "log",
      repo: "",
    };
    render();
  });
  document.querySelectorAll("[data-ranking-metric]").forEach((button) =>
    button.addEventListener("click", () => {
      state.metric = button.dataset.rankingMetric;
      syncUrl();
      updateRanking();
    }),
  );
  $("project-window").addEventListener("change", (event) => {
    state.window = event.target.value;
    syncUrl();
    updateRanking();
  });
  window.addEventListener("popstate", () => {
    state = readState();
    render();
  });
  new ResizeObserver(() => {
    if (projects.length) renderChart();
  }).observe($("project-chart"));
  controls();
  // Four in-flight reads at most; each category is bounded to five 100-row pages.
  for (let offset = 0; offset < CATEGORIES.length; offset += 4) {
    const batch = CATEGORIES.slice(offset, offset + 4);
    const results = await Promise.allSettled(
      batch.map(([category]) => loadProjectCategory(category)),
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") collections.push(result.value);
      else {
        failed.push(batch[index][0]);
        console.warn(
          "Project catalogue could not be read",
          batch[index][0],
          result.reason?.message,
        );
      }
    });
  }
  projects = normalizeRepositories(collections);
  const languages = [
    ...new Set(projects.map((project) => project.language ?? "Unknown")),
  ].sort();
  for (const language of languages) {
    const option = el("option", "", language);
    option.value = language;
    $("project-language").append(option);
  }
  if (state.language !== "all" && !languages.includes(state.language))
    state.language = "all";
  render();
  document.body.dataset.projectsReady = "true";
}

if (
  typeof document !== "undefined" &&
  document.getElementById("project-scatter")
)
  initializeProjects();
