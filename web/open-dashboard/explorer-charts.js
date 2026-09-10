import {
  compact,
  money,
  AXES,
  PROVIDERS,
  observedCells,
  consecutiveHistoryDays,
} from "./explorer-data.js";
const palette = [
  "#397e72",
  "#c48460",
  "#7ca198",
  "#a79b62",
  "#718bae",
  "#b091aa",
  "#678548",
  "#ceab6b",
  "#8d779d",
  "#8baba7",
  "#d49b89",
  "#647c75",
];
const providerKeys = Object.keys(PROVIDERS);
export const colorFor = (id) =>
  palette[Math.max(0, providerKeys.indexOf(id)) % palette.length];
export function clearChartZoom(node) {
  delete node._viewZoom;
}
export function emptyChart(node, title, description) {
  node.replaceChildren();
  const div = document.createElement("div");
  div.className = "empty-chart";
  const h = document.createElement("h4"),
    p = document.createElement("p");
  h.textContent = title;
  p.textContent = description;
  div.append(h, p);
  node.append(div);
}
export function catalogueMap(node, models, { onSelect, selected = null }) {
  if (!models.length) {
    emptyChart(
      node,
      "No entries match these filters.",
      "Try widening the provider or search filter.",
    );
    return;
  }
  if (models.length > 1500) {
    emptyChart(
      node,
      "Choose a smaller part of the catalogue.",
      `${models.length} entries match. Select a provider to explore up to 1,500 individual entries.`,
    );
    return;
  }
  const { d3, w, h, svg, focusKey } = base(
      node,
      350,
      "Model catalogue grouped by provider",
    ),
    groups = d3.group(models, (m) => m.provider),
    root = d3
      .hierarchy({
        children: [...groups].map(([provider, items]) => ({
          provider,
          children: items,
        })),
      })
      .sum((d) => (d.children ? 0 : 1));
  svg
    .append("desc")
    .text(
      "One circle per catalogue entry. Use arrow keys to move between entries, then Enter to inspect.",
    );
  d3
    .pack()
    .size([w - 20, h - 25])
    .padding((d) => (d.depth === 0 ? 18 : d.depth === 1 ? 2 : 1))(root);
  svg
    .append("g")
    .selectAll("circle")
    .data(root.children)
    .join("circle")
    .attr("cx", (d) => d.x + 10)
    .attr("cy", (d) => d.y + 15)
    .attr("r", (d) => d.r)
    .attr("fill", "var(--surface-soft)")
    .attr("stroke", "var(--line)");
  const leaves = root.leaves(),
    isSelected = (d) => d.data.key === (selected || node._chartFocusKey);
  const points = svg
    .append("g")
    .selectAll("circle")
    .data(leaves)
    .join("circle")
    .attr("cx", (d) => d.x + 10)
    .attr("cy", (d) => d.y + 15)
    .attr("r", (d) => d.r)
    .attr("class", (d) => `data-point${isSelected(d) ? " selected" : ""}`)
    .attr("fill", (d) => colorFor(d.data.provider))
    .attr("opacity", 0.72)
    .attr(
      "aria-label",
      (d) => `${d.data.name}, ${PROVIDERS[d.data.provider] || d.data.provider}`,
    );
  points
    .append("title")
    .text(
      (d) =>
        `${d.data.name} · ${PROVIDERS[d.data.provider] || d.data.provider}`,
    );
  const positions = () => leaves.map((d) => [d.x + 10, d.y + 15]);
  const navigation = rovingMarks(points, {
    node,
    key: (d) => d.data.key,
    positions,
    isSelected,
    onSelect: (d) => onSelect(d.data),
    focusKey,
  });
  nearestTargets(svg, { positions, choose: navigation.choose, w });
  svg
    .append("g")
    .selectAll("text")
    .data(root.children.filter((group) => group.r >= (w < 500 ? 42 : 30)))
    .join("text")
    .attr("class", "pack-group-label")
    .attr("text-anchor", "middle")
    .attr("x", (d) => d.x + 10)
    .attr("y", (d) => d.y - d.r + 10)
    .text(
      (d) =>
        `${PROVIDERS[d.data.provider] || d.data.provider} · ${d.leaves().length}`,
    );
}
function base(node, height, label = "Interactive data chart") {
  const focused = document.activeElement,
    focusKey = node.contains(focused)
      ? focused?.getAttribute("data-point-key")
      : null;
  node.replaceChildren();
  const d3 = globalThis.d3,
    w = Math.max(260, node.clientWidth),
    svg = d3
      .select(node)
      .append("svg")
      .attr("viewBox", `0 0 ${w} ${height}`)
      .attr("width", w)
      .attr("height", height)
      .attr("role", "group")
      .attr("aria-label", label);
  return { d3, w, h: height, svg, focusKey };
}
function makeScale(d3, max, range, kind) {
  return (
    kind === "linear"
      ? d3.scaleLinear()
      : d3.scaleSymlog().constant(max > 10000 ? 1000 : 0.1)
  )
    .domain([0, Math.max(max * 1.08, 1)])
    .range(range);
}
function ticks(max, kind, d3) {
  if (kind === "linear") return null;
  const candidates = [
    0, 0.01, 0.1, 1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 1e8, 1e9,
    1e10, 1e11, 1e12, 1e13, 1e14,
  ];
  const result = candidates.filter(
    (v) => v <= max && (v === 0 || v >= max / 5000),
  );
  return result.length > 7 ? result.filter((v, i) => i % 2 === 0) : result;
}
function activate(selection, fn) {
  selection
    .on("click", (event, d) => fn(d, event))
    .on("keydown", (event, d) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fn(d, event);
      }
    });
}
const inside = (point, bounds) =>
  Number.isFinite(point?.[0]) &&
  Number.isFinite(point?.[1]) &&
  (!bounds ||
    (point[0] >= bounds[0] &&
      point[0] <= bounds[2] &&
      point[1] >= bounds[1] &&
      point[1] <= bounds[3]));

/** Hit-test rendered coordinates, never data distances (which change under zoom). */
export function nearestPointIndex(points, target, radius = 14, bounds = null) {
  if (!inside(target, null) || !Number.isFinite(radius) || radius < 0)
    return -1;
  let index = -1,
    distance = radius * radius;
  points.forEach((point, i) => {
    if (!inside(point, bounds)) return;
    const d = (point[0] - target[0]) ** 2 + (point[1] - target[1]) ** 2;
    if (d <= distance && (d < distance || index < 0)) {
      distance = d;
      index = i;
    }
  });
  return index;
}

/** Preserve the visible data interval when the plot changes size. */
export function normalizedZoom(transform, bounds) {
  const [left, top, right, bottom] = bounds;
  return {
    k: transform.k,
    x: (transform.x + (transform.k - 1) * left) / (right - left),
    y: (transform.y + (transform.k - 1) * top) / (bottom - top),
  };
}
export function zoomForBounds(saved, bounds) {
  const [left, top, right, bottom] = bounds;
  return {
    k: saved.k,
    x: saved.x * (right - left) - (saved.k - 1) * left,
    y: saved.y * (bottom - top) - (saved.k - 1) * top,
  };
}

function rovingMarks(
  selection,
  {
    node,
    key,
    positions,
    bounds = null,
    isSelected = () => false,
    onSelect,
    focusKey = null,
  },
) {
  const elements = selection.nodes();
  let current = elements.findIndex((el) => key(el.__data__) === focusKey);
  if (current < 0)
    current = elements.findIndex(
      (el) => key(el.__data__) === node._chartFocusKey,
    );
  if (current < 0)
    current = elements.findIndex((el) => isSelected(el.__data__));
  const visible = () =>
    positions()
      .map((p, i) => (inside(p, bounds) ? i : -1))
      .filter((i) => i >= 0);
  const update = () => {
    const allowed = visible();
    if (!allowed.includes(current)) current = allowed[0] ?? -1;
    const allowedSet = new Set(allowed);
    selection
      .attr("tabindex", (d, i) => (i === current ? 0 : -1))
      .attr("aria-hidden", (d, i) => (allowedSet.has(i) ? null : "true"));
  };
  const focus = (index) => {
    current = index;
    node._chartFocusKey = key(elements[index].__data__);
    update();
    elements[index].focus({ preventScroll: true });
  };
  const choose = (index, event) => {
    if (index < 0) return;
    focus(index);
    onSelect(elements[index].__data__, event);
  };
  selection
    .attr("role", "button")
    .attr("data-point-key", key)
    .attr("aria-pressed", (d) => String(isSelected(d)))
    .on("focus.roving", function (event, d) {
      current = elements.indexOf(this);
      node._chartFocusKey = key(d);
      update();
    })
    .on("click", function (event) {
      event.stopPropagation();
      choose(elements.indexOf(this), event);
    })
    .on("keydown", function (event) {
      const index = elements.indexOf(this);
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(index, event);
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
      const coords = positions(),
        axis = ["ArrowUp", "ArrowDown"].includes(event.key) ? 1 : 0;
      // Stable screen order keeps coincident marks reachable as separate entries.
      const order = visible().sort(
        (a, b) =>
          coords[a][axis] - coords[b][axis] ||
          coords[a][1 - axis] - coords[b][1 - axis] ||
          a - b,
      );
      if (!order.length) return;
      const offset = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1,
        at = order.indexOf(index);
      focus(
        event.key === "Home"
          ? order[0]
          : event.key === "End"
            ? order.at(-1)
            : order[(at + offset + order.length) % order.length],
      );
    });
  update();
  if (focusKey && current >= 0)
    elements[current].focus({ preventScroll: true });
  return { choose, update };
}

function nearestTargets(svg, { positions, bounds = null, choose, w }) {
  svg.on("click.nearest", (event) => {
    if (event.defaultPrevented || event.target.closest?.('[role="button"]'))
      return;
    const rect = svg.node().getBoundingClientRect(),
      radius = (14 * w) / (rect.width || w);
    const index = nearestPointIndex(
      positions(),
      globalThis.d3.pointer(event, svg.node()),
      radius,
      bounds,
    );
    if (index >= 0) {
      event.preventDefault();
      choose(index, event);
    }
  });
}
export function scatter(
  node,
  rows,
  { state, onSelect, selected, media = false, unit = "", providerOrder = [] },
) {
  const signature = JSON.stringify([
    media,
    unit,
    providerOrder,
    ...[
      "provider",
      "modality",
      "free",
      "tools",
      "inactive",
      "context",
      "q",
      "x",
      "y",
      "scale",
      "inputTokens",
      "outputTokens",
    ].map((k) => state[k]),
    rows.map((d) => [d.key, d.px, d.py, d.provider]),
  ]);
  if (node._viewZoom?.signature !== signature) clearChartZoom(node);
  if (!rows.length) {
    emptyChart(
      node,
      "A little more room to explore.",
      "No published comparable prices match these filters. Try another provider, output type or price unit. Models with unknown prices remain available in the model selector.",
    );
    return;
  }
  if (rows.length > 1500) {
    emptyChart(
      node,
      "Bring a part of the landscape into focus.",
      `${rows.length.toLocaleString()} price points match. Choose a provider or refine your search to draw at most 1,500 points clearly.`,
    );
    return;
  }
  const { d3, w, h, svg, focusKey } = base(
    node,
    Math.max(310, Math.min(365, node.clientWidth * 0.43)),
    media
      ? "Published native media prices by provider"
      : "Model price and capability comparison",
  );
  svg
    .append("desc")
    .text(
      media
        ? "Use arrow keys to move between visible prices and Enter to inspect."
        : "Use arrow keys to move between visible models and Enter to inspect. Zoom controls enlarge the plot; Control and scroll also zoom.",
    );
  const m = { l: media ? 78 : 52, r: 19, t: 28, b: 51 },
    bounds = [m.l, m.t, w - m.r, h - m.b],
    maxX = d3.max(rows, (d) => d.px),
    maxY = d3.max(rows, (d) => d.py);
  const x = makeScale(d3, maxX, [m.l, w - m.r], state.scale),
    y = media
      ? d3
          .scalePoint()
          .domain(providerOrder)
          .range([m.t + 25, h - m.b - 20])
          .padding(0.3)
      : makeScale(d3, maxY, [h - m.b, m.t], state.scale);
  const grid = svg.append("g").attr("class", "chart-grid"),
    gx = svg
      .append("g")
      .attr("class", "chart-axis")
      .attr("transform", `translate(0,${h - m.b})`),
    gy = svg
      .append("g")
      .attr("class", "chart-axis")
      .attr("transform", `translate(${m.l},0)`);
  const clipId = `plot-${Math.random().toString(36).slice(2)}`;
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("x", m.l - 7)
    .attr("y", m.t - 10)
    .attr("width", w - m.l - m.r + 15)
    .attr("height", h - m.t - m.b + 20);
  const isSelected = (d) => d.key === selected || d.modelKey === selected;
  const area = svg.append("g").attr("clip-path", `url(#${clipId})`),
    marks = area
      .selectAll("circle")
      .data(rows, (d) => d.key)
      .join("circle")
      .attr("class", (d) => `data-point${isSelected(d) ? " selected" : ""}`)
      .attr("r", (d) => (isSelected(d) ? 7 : 4.7))
      .attr("fill", (d) => colorFor(d.provider))
      .attr("opacity", 0.7)
      .attr(
        "aria-label",
        (d) =>
          `${d.name}: ${media ? money(d.px) + " per " + unit : AXES[state.x] + ": " + (state.x === "context" ? compact(d.px) : money(d.px)) + ", " + AXES[state.y] + ": " + (state.y === "context" ? compact(d.py) : money(d.py))}`,
      );
  marks
    .append("title")
    .text(
      (d) =>
        `${d.name}\n${PROVIDERS[d.provider] || d.provider}\n${media ? money(d.px) + " / " + unit : AXES[state.x] + ": " + (state.x === "context" ? compact(d.px) : money(d.px)) + "\n" + AXES[state.y] + ": " + (state.y === "context" ? compact(d.py) : money(d.py))}`,
    );
  const labels = area.append("g");
  let coordinates = [],
    navigation;
  function draw(sx = x, sy = y, initial = false) {
    const xAxis = d3
      .axisBottom(sx)
      .ticks(w < 450 ? 4 : 6)
      .tickSizeOuter(0)
      .tickPadding(9)
      .tickFormat(state.x === "context" && !media ? compact : money);
    if (initial) {
      const values = ticks(maxX, state.scale);
      if (values) xAxis.tickValues(values);
    }
    gx.call(xAxis);
    const yAxis = d3
      .axisLeft(sy)
      .ticks(5)
      .tickSizeOuter(0)
      .tickPadding(8)
      .tickFormat(
        media
          ? (v) => PROVIDERS[v] || v
          : state.y === "context"
            ? compact
            : money,
      );
    if (initial && !media) {
      const values = ticks(maxY, state.scale);
      if (values) yAxis.tickValues(values);
    }
    gy.call(yAxis);
    if (media) gy.selectAll("text").attr("font-size", 8);
    grid
      .call(
        d3
          .axisLeft(sy)
          .ticks(5)
          .tickValues(yAxis.tickValues())
          .tickSize(-(w - m.l - m.r))
          .tickFormat(""),
      )
      .attr("transform", `translate(${m.l},0)`);
    coordinates = rows.map((d, i) => [
      sx(d.px),
      media ? sy(d.provider) + ((i % 7) - 3) * 4 : sy(d.py),
    ]);
    marks
      .attr("cx", (d, i) => coordinates[i][0])
      .attr("cy", (d, i) => coordinates[i][1]);
    labels.selectAll("*").remove();
    const chosen = rows.findIndex(isSelected);
    if (chosen >= 0) {
      const [px, py] = coordinates[chosen];
      if (inside([px, py], bounds))
        labels
          .append("text")
          .attr("class", "plot-callout")
          .attr("x", Math.min(w - 155, Math.max(m.l + 8, px + 11)))
          .attr("y", py - 12)
          .text(
            rows[chosen].name.length > 28
              ? rows[chosen].name.slice(0, 26) + "…"
              : rows[chosen].name,
          );
    }
    navigation?.update();
  }
  draw(x, y, true);
  svg
    .append("text")
    .attr("class", "axis-title")
    .attr("x", (m.l + w - m.r) / 2)
    .attr("y", h - 10)
    .attr("text-anchor", "middle")
    .text(
      media
        ? `Published price · USD / ${unit.replaceAll("_", " ")}`
        : AXES[state.x],
    );
  if (!media)
    svg
      .append("text")
      .attr("class", "axis-title")
      .attr("transform", "rotate(-90)")
      .attr("x", -(m.t + h - m.b) / 2)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .text(AXES[state.y]);
  if (!media) {
    const zoom = d3
      .zoom()
      .scaleExtent([1, 30])
      .extent([
        [m.l, m.t],
        [w - m.r, h - m.b],
      ])
      .translateExtent([
        [m.l, m.t],
        [w - m.r, h - m.b],
      ])
      .filter((e) =>
        e.type === "wheel"
          ? e.ctrlKey
          : !e.button && !e.target.closest?.(".data-point"),
      )
      .on("zoom", (e) => {
        node._viewZoom = { signature, ...normalizedZoom(e.transform, bounds) };
        draw(e.transform.rescaleX(x), e.transform.rescaleY(y));
      });
    svg.call(zoom).on("dblclick.zoom", null);
    if (node._viewZoom) {
      const transform = zoomForBounds(node._viewZoom, bounds);
      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k),
      );
    }
    const controls = document.createElement("div");
    controls.className = "plot-zoom";
    for (const [label, factor] of [
      ["Zoom in", 1.7],
      ["Zoom out", 1 / 1.7],
      ["Reset zoom", 0],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", label);
      b.title = label;
      b.textContent = factor === 0 ? "↺" : factor > 1 ? "+" : "−";
      b.addEventListener("click", () =>
        factor === 0
          ? svg.call(zoom.transform, d3.zoomIdentity)
          : svg.call(zoom.scaleBy, factor),
      );
      controls.append(b);
    }
    node.append(controls);
  }
  navigation = rovingMarks(marks, {
    node,
    key: (d) => d.key,
    positions: () => coordinates,
    bounds,
    isSelected,
    onSelect,
    focusKey,
  });
  nearestTargets(svg, {
    positions: () => coordinates,
    bounds,
    choose: navigation.choose,
    w,
  });
}
export function flow(
  node,
  matrix,
  { app = "all", model = "all", weight = "tokens", onInspect },
) {
  if (matrix?.status !== "available") {
    emptyChart(
      node,
      "The connections need a shared date.",
      "The source has not published an aligned app–model view yet. Separate app totals are available in “Apps & models” above; they are not evidence of individual connections.",
    );
    return;
  }
  const cells = observedCells(matrix).filter(
    (c) =>
      (app === "all" || c.appId === app) &&
      (model === "all" || c.modelId === model),
  );
  if (!cells.length) {
    emptyChart(
      node,
      "No relationship observed in this slice.",
      "Try another app or model. An unobserved connection does not mean zero usage.",
    );
    return;
  }
  const apps = matrix.apps.filter((a) =>
      cells.some((c) => c.appId === a.appId),
    ),
    models = matrix.models.filter((m) =>
      cells.some((c) => c.modelId === m.modelId),
    );
  const { d3, w, h, svg } = base(
      node,
      Math.max(310, Math.max(apps.length, models.length) * 36 + 60),
    ),
    mobile = w < 600,
    l = mobile ? 95 : 190,
    r = w - (mobile ? 120 : 230),
    ys = (items) =>
      d3
        .scalePoint()
        .domain(items)
        .range([47, h - 30]);
  const ay = ys(apps.map((a) => a.appId)),
    my = ys(models.map((m) => m.modelId)),
    thick = d3
      .scaleSqrt()
      .domain([0, d3.max(cells, (c) => Number(c.totalTokens))])
      .range([1.5, 23]);
  const links = svg
    .append("g")
    .selectAll("path")
    .data(cells)
    .join("path")
    .attr("class", "flow-link")
    .attr(
      "d",
      (c) =>
        `M${l},${ay(c.appId)} C${l + (r - l) * 0.46},${ay(c.appId)} ${r - (r - l) * 0.46},${my(c.modelId)} ${r},${my(c.modelId)}`,
    )
    .attr(
      "stroke",
      (c) =>
        palette[apps.findIndex((a) => a.appId === c.appId) % palette.length],
    )
    .attr("stroke-width", (c) =>
      weight === "equal" ? 3 : thick(Number(c.totalTokens)),
    )
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr(
      "aria-label",
      (c) =>
        `${apps.find((a) => a.appId === c.appId)?.appName} uses ${models.find((m) => m.modelId === c.modelId)?.modelName}: ${BigInt(c.totalTokens).toLocaleString()} observed tokens`,
    );
  links
    .append("title")
    .text((c) => `${c.totalTokens} daily tokens · ${c.period.start}`);
  activate(links, (c) => onInspect(c));
  function drawNodes(rows, side) {
    const isApp = side === "app",
      x = isApp ? l : r,
      y = isApp ? ay : my,
      groups = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("class", "flow-node")
        .attr(
          "transform",
          (d) => `translate(${x},${y(isApp ? d.appId : d.modelId)})`,
        )
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr(
          "aria-label",
          (d) => `Inspect ${isApp ? d.appName : d.modelName}`,
        );
    groups.append("circle").attr("r", 14).attr("fill", "transparent");
    groups
      .append("circle")
      .attr("r", 5)
      .attr("fill", (d, i) =>
        isApp ? palette[i % palette.length] : "var(--accent)",
      )
      .attr("stroke", "var(--surface)")
      .attr("stroke-width", 2);
    groups
      .append("text")
      .attr("x", isApp ? -13 : 13)
      .attr("y", 4)
      .attr("text-anchor", isApp ? "end" : "start")
      .style("font-size", mobile ? "9px" : "11px")
      .text((d) => {
        const name = isApp ? d.appName : d.modelName,
          max = mobile ? (isApp ? 15 : 19) : 29;
        return name.length > max ? name.slice(0, max - 1) + "…" : name;
      });
    groups.append("title").text((d) => (isApp ? d.appName : d.modelName));
    const highlight = (d) =>
        links.style("opacity", (c) =>
          (isApp ? c.appId === d.appId : c.modelId === d.modelId) ? 0.7 : 0.05,
        ),
      restore = () => links.style("opacity", null);
    groups
      .on("mouseenter", (e, d) => highlight(d))
      .on("mouseleave", restore)
      .on("focus", (e, d) => highlight(d))
      .on("blur", restore);
    activate(groups, (d) => onInspect({ ...d, nodeKind: side }));
  }
  drawNodes(apps, "app");
  drawNodes(models, "model");
  svg
    .append("text")
    .attr("class", "flow-label-small")
    .attr("x", l - 13)
    .attr("y", 15)
    .attr("text-anchor", "end")
    .text("APPS");
  svg
    .append("text")
    .attr("class", "flow-label-small")
    .attr("x", r + 13)
    .attr("y", 15)
    .text("MODELS");
}
export function appBars(node, apps, { onSelect }) {
  if (!apps.length) {
    emptyChart(
      node,
      "App usage is unavailable.",
      "The public source has no published app totals in this view.",
    );
    return;
  }
  const { d3, w, h, svg } = base(node, Math.max(310, apps.length * 29 + 40)),
    l = Math.min(120, w * 0.32),
    x = d3
      .scaleLinear()
      .domain([0, d3.max(apps, (a) => Number(a.totalTokens))])
      .range([l, w - 65]),
    y = d3
      .scaleBand()
      .domain(apps.map((a) => a.appId))
      .range([20, h - 27])
      .padding(0.45);
  const rows = svg
    .selectAll("g")
    .data(apps)
    .join("g")
    .attr("transform", (a) => `translate(0,${y(a.appId)})`)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr(
      "aria-label",
      (a) => `${a.appName}: ${a.totalTokens} tokens over 30 days`,
    );
  rows
    .append("rect")
    .attr("x", l)
    .attr("width", (a) => x(Number(a.totalTokens)) - l)
    .attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("fill", (a, i) => palette[i % palette.length]);
  rows
    .append("text")
    .attr("x", l - 9)
    .attr("y", y.bandwidth() / 2 + 3)
    .attr("text-anchor", "end")
    .attr("class", "axis-title")
    .text((a) => a.appName);
  rows
    .append("text")
    .attr("x", (a) => x(Number(a.totalTokens)) + 7)
    .attr("y", y.bandwidth() / 2 + 3)
    .attr("class", "axis-title")
    .text((a) => compact(Number(a.totalTokens)));
  activate(rows, onSelect);
}
export function historyChart(node, days, { chosen = "all", onSelect }) {
  const buckets = consecutiveHistoryDays(days),
    counts = new Map();
  for (const day of buckets)
    if (day.complete === true)
      for (const row of day.rows)
        if (!row.remainder && row.id)
          counts.set(row.id, (counts.get(row.id) || 0) + 1);
  const ids =
    chosen === "all"
      ? [...counts]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id)
      : [chosen];
  const series = ids.map((id) => ({
    id,
    label: buckets.flatMap((d) => d.rows).find((r) => r.id === id)?.label || id,
    points: buckets.map((day) => ({
      date: new Date(day.date),
      value: day.rows.find((r) => r.id === id)?.value ?? null,
      complete: day.complete === true,
    })),
  }));
  if (!series.length || !buckets.length) {
    emptyChart(
      node,
      "No daily history is published yet.",
      "Try again when the source has a complete history window.",
    );
    return [];
  }
  const { d3, w, h, svg, focusKey } = base(
    node,
    335,
    "Observed daily OpenRouter model tokens",
  );
  svg
    .append("desc")
    .text(
      "Missing and incomplete UTC days break the lines. Use arrow keys to move between observed points and Enter to inspect.",
    );
  const m = { l: 53, r: 20, t: 23, b: 44 },
    x = d3
      .scaleUtc()
      .domain(d3.extent(buckets, (d) => new Date(d.date)))
      .range([m.l, w - m.r]);
  const defined = (p) =>
    p.value !== null && p.complete === true && Number.isFinite(Number(p.value));
  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(series, (s) =>
        d3.max(s.points.filter(defined), (p) => Number(p.value)),
      ) || 1,
    ])
    .nice()
    .range([h - m.b, m.t]);
  svg
    .append("g")
    .attr("class", "chart-grid")
    .attr("transform", `translate(${m.l},0)`)
    .call(
      d3
        .axisLeft(y)
        .ticks(5)
        .tickSize(-(w - m.l - m.r))
        .tickFormat(""),
    );
  svg
    .append("g")
    .attr("class", "chart-axis")
    .attr("transform", `translate(0,${h - m.b})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(w < 450 ? 3 : 5)
        .tickFormat(d3.utcFormat("%d %b"))
        .tickSizeOuter(0),
    );
  svg
    .append("g")
    .attr("class", "chart-axis")
    .attr("transform", `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(compact).tickSizeOuter(0));
  const line = d3
    .line()
    .defined(defined)
    .x((p) => x(p.date))
    .y((p) => y(Number(p.value)));
  series.forEach((s, i) =>
    svg
      .append("path")
      .datum(s.points)
      .attr("fill", "none")
      .attr("stroke", palette[i])
      .attr("stroke-width", 2)
      .attr("d", line),
  );
  const observed = series.flatMap((s, i) =>
    s.points
      .filter(defined)
      .map((p) => ({
        ...p,
        label: s.label,
        id: s.id,
        key: JSON.stringify([s.id, p.date.toISOString()]),
        color: palette[i],
      })),
  );
  const points = svg
    .append("g")
    .selectAll("circle")
    .data(observed, (d) => d.key)
    .join("circle")
    .attr("class", "data-point")
    .attr("cx", (p) => x(p.date))
    .attr("cy", (p) => y(Number(p.value)))
    .attr("r", 3)
    .attr("fill", (p) => p.color)
    .attr(
      "aria-label",
      (p) =>
        `${p.label}, ${p.date.toISOString().slice(0, 10)}: ${p.value} tokens`,
    );
  const positions = () => observed.map((p) => [x(p.date), y(Number(p.value))]);
  const navigation = rovingMarks(points, {
    node,
    key: (p) => p.key,
    positions,
    onSelect,
    focusKey,
  });
  nearestTargets(svg, { positions, choose: navigation.choose, w });
  svg
    .append("text")
    .attr("class", "axis-title")
    .attr("x", m.l)
    .attr("y", 12)
    .text("Observed daily tokens");
  return series.map((s, i) => ({ label: s.label, color: palette[i] }));
}
