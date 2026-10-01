import { finite, tokenPoints, PROVIDERS } from "./explorer-data.js";

const instances = new WeakMap();
const palette = {
  plum: "#3b244c",
  mint: "#a8e5c9",
  paper: "#f4f0f6",
  ink: "#352c40",
};
const number = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 8 });
const count = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
let sequence = 0;

/** Only explicitly token-comparable rows with known, positive context get coordinates. */
export function prepareAtlas(models) {
  const candidates = tokenPoints(models, { x: "input", y: "context" });
  const points = candidates
    .filter((m) => m.px >= 0 && m.py > 0)
    .sort((a, b) => a.px - b.px || a.py - b.py || a.key.localeCompare(b.key));
  return {
    points,
    total: models.length,
    plotted: points.length,
    zeroInput: points.filter((p) => p.px === 0).length,
    excluded: models.length - points.length,
    nativeMedia: models.filter((m) => m.kind === "media").length,
  };
}

function logDomain(values) {
  if (!values.length) return [0, 1];
  const logs = values.map(Math.log10);
  const min = Math.floor(logs.reduce((a, b) => Math.min(a, b), Infinity)),
    max = Math.ceil(logs.reduce((a, b) => Math.max(a, b), -Infinity));
  return min === max ? [min - 1, max + 1] : [min, max];
}

function logTicks(domain, maximum) {
  const [min, max] = domain;
  const step = Math.max(1, Math.ceil((max - min) / Math.max(1, maximum - 1)));
  const exponents = [];
  for (let exponent = min; exponent <= max; exponent += step)
    exponents.push(exponent);
  if (exponents.at(-1) !== max) exponents.push(max);
  return exponents.map((exponent) => 10 ** exponent);
}

export function atlasPriceLabel(value) {
  if (finite(value) === null) return "Unknown";
  const n = Number(value);
  for (const [threshold, suffix] of [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ]) {
    if (n >= threshold) return `$${number.format(n / threshold)}${suffix}`;
  }
  return `$${n !== 0 && n < 0.0001 ? n.toExponential(1).replace(".0e", "e") : number.format(n)}`;
}

/** CSS-pixel scene geometry. The zero-input lane is separate from the positive log axis. */
export function buildAtlasLayout(data, width, height) {
  const mobile = width < 480;
  const plot = {
    left: mobile ? 49 : 59,
    right: width - 20,
    top: 27,
    bottom: height - 58,
  };
  const zeroX = plot.left + (mobile ? 15 : 21);
  const paidLeft = plot.left + (mobile ? 58 : 75);
  const xDomain = logDomain(
    data.points.filter((p) => p.px > 0).map((p) => p.px),
  );
  const yDomain = logDomain(data.points.map((p) => p.py));
  const x = (value) =>
    value === 0
      ? zeroX
      : paidLeft +
        ((Math.log10(value) - xDomain[0]) / (xDomain[1] - xDomain[0])) *
          (plot.right - paidLeft);
  const y = (value) =>
    plot.bottom -
    ((Math.log10(value) - yDomain[0]) / (yDomain[1] - yDomain[0])) *
      (plot.bottom - plot.top);
  const points = data.points.map((model) => ({
    model,
    x: x(model.px),
    y: y(model.py),
  }));
  const grid = new Map();
  points.forEach((point, index) => {
    const key = `${Math.floor(point.x / 32)},${Math.floor(point.y / 32)}`;
    const bucket = grid.get(key) || [];
    bucket.push(index);
    grid.set(key, bucket);
  });
  return {
    width,
    height,
    plot,
    zeroX,
    paidLeft,
    xDomain,
    yDomain,
    points,
    grid,
    xTicks: logTicks(xDomain, mobile ? 3 : 5).map((value) => ({
      value,
      position: x(value),
    })),
    yTicks: logTicks(yDomain, mobile ? 4 : 5).map((value) => ({
      value,
      position: y(value),
    })),
  };
}

/** Spatial-bucket picking; ties retain stable source order instead of inventing jitter. */
export function nearestAtlasPoint(scene, x, y, radius = 22) {
  let chosen = -1,
    distance = radius * radius;
  for (
    let gx = Math.floor((x - radius) / 32);
    gx <= Math.floor((x + radius) / 32);
    gx++
  ) {
    for (
      let gy = Math.floor((y - radius) / 32);
      gy <= Math.floor((y + radius) / 32);
      gy++
    ) {
      for (const index of scene.grid.get(`${gx},${gy}`) || []) {
        const point = scene.points[index],
          delta = (point.x - x) ** 2 + (point.y - y) ** 2;
        if (delta < distance || (delta === distance && chosen < 0)) {
          chosen = index;
          distance = delta;
        }
      }
    }
  }
  return chosen;
}

/** Enter a plotted sequence at its first/last entry when selection is outside it. */
export function atlasStepIndex(current, delta, length) {
  if (length < 1) return -1;
  if (current < 0 || current >= length) return delta < 0 ? length - 1 : 0;
  return Math.max(0, Math.min(length - 1, current + delta));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
const rate = (value) =>
  finite(value) === null ? "Unknown" : `$${number.format(Number(value))}`;
const context = (value) =>
  finite(value) === null || Number(value) <= 0
    ? "Unknown"
    : `${count.format(Number(value))} tokens`;
const describe = (model) =>
  `${model.name} · ${PROVIDERS[model.provider] || model.provider} · ${rate(model.input)} input / 1M tokens · ${context(model.context)}`;

function createAtlas(node) {
  const id = `model-atlas-${++sequence}`;
  const root = element("section", "model-atlas");
  const summary = element("p", "atlas-summary");
  const chart = element("div", "atlas-plot");
  const canvas = element("canvas", "atlas-canvas");
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Model atlas: input token price against context window. Arrow keys explore points, Enter inspects. A complete table follows.",
  );
  canvas.setAttribute("aria-describedby", `${id}-help ${id}-summary`);
  summary.id = `${id}-summary`;
  const axis = element("div", "atlas-axis-labels");
  axis.setAttribute("aria-hidden", "true");
  const tooltip = element("div", "atlas-tooltip");
  tooltip.hidden = true;
  chart.append(canvas, axis, tooltip);
  const readout = element(
    "p",
    "atlas-readout",
    "Select a point to inspect its exact source.",
  );
  const toolbar = element("div", "atlas-toolbar");
  const help = element(
    "p",
    "atlas-help",
    "Tap a point. Or use arrow keys, then Enter. Overlapping entries remain separate in the table.",
  );
  help.id = `${id}-help`;
  const previous = element("button", "atlas-step", "Previous");
  previous.type = "button";
  previous.setAttribute("aria-label", "Inspect previous plotted model");
  const next = element("button", "atlas-step", "Next");
  next.type = "button";
  next.setAttribute("aria-label", "Inspect next plotted model");
  toolbar.append(help, previous, next);
  const live = element("span", "atlas-sr-only");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  const fallback = element("details", "atlas-table-fallback");
  const tableToggle = element(
    "summary",
    "",
    "Read all matching entries as a table",
  );
  const tableWrap = element("div", "atlas-table-wrap");
  tableWrap.tabIndex = 0;
  tableWrap.setAttribute("aria-label", "Scrollable model table");
  const table = element("table");
  const caption = element(
    "caption",
    "atlas-sr-only",
    "Matching catalogue entries. Missing prices and context stay unknown. Native media prices are available in the model inspector.",
  );
  const thead = element("thead"),
    headRow = element("tr");
  ["Model", "Provider", "Input / 1M tokens", "Context"].forEach((label) => {
    const th = element("th", "", label);
    th.scope = "col";
    headRow.append(th);
  });
  thead.append(headRow);
  const tbody = element("tbody");
  table.append(caption, thead, tbody);
  tableWrap.append(table);
  const pager = element("div", "atlas-table-pager");
  const before = element("button", "atlas-step", "Previous rows"),
    after = element("button", "atlas-step", "Next rows"),
    pageLabel = element("span");
  before.type = after.type = "button";
  pager.append(before, pageLabel, after);
  fallback.append(tableToggle, tableWrap, pager);
  root.append(summary, chart, readout, toolbar, live, fallback);
  node.replaceChildren(root);
  node.classList.add("has-model-atlas");

  const base = document.createElement("canvas");
  const ctx = canvas.getContext("2d"),
    baseContext = base.getContext("2d");
  let models = [],
    data = prepareAtlas([]),
    scene = null,
    selected = "",
    focused = -1,
    hover = -1,
    page = 0,
    onSelect = () => {},
    disposed = false;
  let width = 0,
    height = 0,
    ratio = 1;
  const listeners = [];
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  };

  function renderTable() {
    if (!fallback.open) return;
    page = Math.max(0, Math.min(page, Math.ceil(models.length / 25) - 1));
    tbody.replaceChildren();
    for (const model of models.slice(page * 25, page * 25 + 25)) {
      const tr = element("tr"),
        name = element("td"),
        button = element("button", "atlas-model-link", model.name || model.id);
      button.type = "button";
      button.addEventListener("click", () => onSelect(model));
      name.append(button);
      const media =
        model.kind === "media" || model.modalities?.some((m) => m !== "text");
      tr.append(
        name,
        element("td", "", PROVIDERS[model.provider] || model.provider),
        element(
          "td",
          "atlas-value",
          media ? "Native unit · inspect" : rate(model.input),
        ),
        element("td", "atlas-value", context(model.context)),
      );
      tbody.append(tr);
    }
    pageLabel.textContent = models.length
      ? `${page * 25 + 1}–${Math.min(models.length, page * 25 + 25)} of ${count.format(models.length)}`
      : "No matching entries";
    before.disabled = page === 0;
    after.disabled = (page + 1) * 25 >= models.length;
  }

  function drawBase() {
    const c = baseContext,
      { plot } = scene;
    c.clearRect(0, 0, width, height);
    c.fillStyle = palette.plum;
    c.fillRect(0, 0, width, height);
    c.fillStyle = "rgba(168,229,201,.09)";
    c.fillRect(
      plot.left,
      plot.top,
      scene.paidLeft - plot.left - 13,
      plot.bottom - plot.top,
    );
    c.strokeStyle = "rgba(244,240,246,.12)";
    c.lineWidth = 1;
    c.beginPath();
    for (const tick of scene.yTicks) {
      c.moveTo(plot.left, tick.position);
      c.lineTo(plot.right, tick.position);
    }
    for (const tick of scene.xTicks) {
      c.moveTo(tick.position, plot.top);
      c.lineTo(tick.position, plot.bottom);
    }
    c.stroke();
    c.strokeStyle = "rgba(168,229,201,.4)";
    c.setLineDash([2, 4]);
    c.beginPath();
    c.moveTo(scene.paidLeft - 13, plot.top);
    c.lineTo(scene.paidLeft - 13, plot.bottom);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = palette.mint;
    c.globalAlpha = 0.64;
    c.beginPath();
    for (const point of scene.points) {
      if (point.model.px === 0) continue;
      c.moveTo(point.x + 2.7, point.y);
      c.arc(point.x, point.y, 2.7, 0, Math.PI * 2);
    }
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = palette.plum;
    c.strokeStyle = palette.paper;
    c.lineWidth = 1.2;
    c.beginPath();
    for (const point of scene.points) {
      if (point.model.px !== 0) continue;
      c.moveTo(point.x + 3, point.y);
      c.arc(point.x, point.y, 3, 0, Math.PI * 2);
    }
    c.fill();
    c.stroke();
  }

  function renderAxes() {
    axis.replaceChildren();
    const yTitle = element(
      "span",
      "atlas-axis-title atlas-axis-title-y",
      "Context window · log",
    );
    axis.append(yTitle);
    for (const tick of scene.yTicks) {
      const label = element("span", "atlas-y-tick", compact.format(tick.value));
      label.style.top = `${tick.position}px`;
      label.style.width = `${scene.plot.left - 9}px`;
      axis.append(label);
    }
    for (const [index, tick] of scene.xTicks.entries()) {
      const label = element(
        "span",
        "atlas-x-tick",
        atlasPriceLabel(tick.value),
      );
      label.style.left = `${tick.position}px`;
      label.style.top = `${scene.plot.bottom + 10}px`;
      if (index === scene.xTicks.length - 1)
        label.style.transform = "translateX(-100%)";
      axis.append(label);
    }
    const zero = element("span", "atlas-x-tick atlas-zero-label", "$0 input");
    zero.style.left = `${scene.zeroX}px`;
    zero.style.top = `${scene.plot.bottom + 10}px`;
    axis.append(zero);
    axis.append(
      element(
        "span",
        "atlas-axis-title atlas-axis-title-x",
        width < 480
          ? "Input USD / 1M tokens · log"
          : "Input USD / 1M tokens · positive values on log scale",
      ),
    );
    if (!data.points.length)
      axis.append(
        element(
          "p",
          "atlas-empty",
          "No matching entries have both a comparable input token price and a known context window. Use the table or choose another chart.",
        ),
      );
  }

  function drawHighlight() {
    if (!ctx || !scene) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(base, 0, 0, width, height);
    const indexes = new Set([
      scene.points.findIndex((p) => p.model.key === selected),
      focused,
      hover,
    ]);
    for (const index of indexes) {
      const point = scene.points[index];
      if (!point) continue;
      const isSelected = point.model.key === selected;
      ctx.beginPath();
      ctx.arc(point.x, point.y, isSelected ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.paper;
      ctx.fill();
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.strokeStyle = palette.mint;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = palette.plum;
      ctx.fill();
    }
  }

  function resize(force = false) {
    if (disposed || !ctx || !baseContext) return;
    const box = chart.getBoundingClientRect();
    if (box.width < 1) return;
    const w = Math.round(box.width),
      h = Math.round(box.height),
      dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
    if (!force && width === w && height === h && ratio === dpr) return;
    width = w;
    height = h;
    ratio = dpr;
    for (const surface of [canvas, base]) {
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    baseContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    scene = buildAtlasLayout(data, width, height);
    renderAxes();
    drawBase();
    drawHighlight();
    node.dataset.atlasReady = "true";
  }

  function preview(index, announce = false) {
    if (!scene?.points[index]) return;
    focused = index;
    readout.textContent = describe(scene.points[index].model);
    if (announce) live.textContent = readout.textContent;
    drawHighlight();
  }

  function step(delta, inspect = false) {
    if (!scene?.points.length) return;
    const current =
      focused >= 0
        ? focused
        : scene.points.findIndex((p) => p.model.key === selected);
    const index = atlasStepIndex(current, delta, scene.points.length);
    preview(index, true);
    if (inspect) onSelect(scene.points[index].model);
  }

  listen(canvas, "pointermove", (event) => {
    if (!scene || event.pointerType === "touch") return;
    const box = canvas.getBoundingClientRect(),
      index = nearestAtlasPoint(
        scene,
        ((event.clientX - box.left) * width) / box.width,
        ((event.clientY - box.top) * height) / box.height,
        18,
      );
    if (index === hover) return;
    hover = index;
    tooltip.hidden = index < 0;
    if (index >= 0) {
      const point = scene.points[index];
      tooltip.textContent = describe(point.model);
      tooltip.style.left = `${Math.max(8, Math.min(width - Math.min(288, width - 16), point.x + 13))}px`;
      tooltip.style.top = `${Math.max(4, Math.min(height - 80, point.y - 66))}px`;
    }
    drawHighlight();
  });
  listen(canvas, "pointerleave", () => {
    hover = -1;
    tooltip.hidden = true;
    drawHighlight();
  });
  listen(canvas, "click", (event) => {
    if (!scene) return;
    const box = canvas.getBoundingClientRect(),
      index = nearestAtlasPoint(
        scene,
        ((event.clientX - box.left) * width) / box.width,
        ((event.clientY - box.top) * height) / box.height,
        28,
      );
    if (index >= 0) {
      preview(index, true);
      onSelect(scene.points[index].model);
    }
  });
  listen(canvas, "focus", () => {
    const index =
      scene?.points.findIndex((p) => p.model.key === selected) ?? -1;
    preview(index < 0 ? 0 : index);
  });
  listen(canvas, "keydown", (event) => {
    if (!scene?.points.length) return;
    if (
      [
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
        "ArrowUp",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Enter",
        " ",
      ].includes(event.key)
    )
      event.preventDefault();
    else return;
    if (event.key === "Enter" || event.key === " ") {
      const point = scene.points[focused];
      if (point) onSelect(point.model);
    } else if (event.key === "Home") preview(0, true);
    else if (event.key === "End") preview(scene.points.length - 1, true);
    else
      step(
        ["ArrowLeft", "ArrowDown", "PageUp"].includes(event.key)
          ? event.key === "PageUp"
            ? -25
            : -1
          : event.key === "PageDown"
            ? 25
            : 1,
      );
  });
  listen(previous, "click", () => step(-1, true));
  listen(next, "click", () => step(1, true));
  listen(fallback, "toggle", renderTable);
  listen(before, "click", () => {
    page--;
    renderTable();
  });
  listen(after, "click", () => {
    page++;
    renderTable();
  });
  const observer =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => resize())
      : null;
  observer?.observe(chart);
  listen(window, "resize", () => resize());
  if (!ctx || !baseContext) {
    canvas.hidden = true;
    chart.hidden = true;
    fallback.open = true;
  }

  return {
    root,
    update(nextModels, options) {
      const changed = models !== nextModels;
      models = nextModels;
      if (selected !== (options.selected || "")) focused = -1;
      selected = options.selected || "";
      onSelect = options.onSelect || (() => {});
      if (changed) {
        data = prepareAtlas(models);
        page = 0;
        hover = -1;
        focused = -1;
        tooltip.hidden = true;
      }
      summary.textContent = `${count.format(data.plotted)} plotted · ${count.format(data.zeroInput)} with $0 input · ${count.format(data.excluded)} outside these dimensions`;
      previous.disabled = next.disabled = !data.points.length;
      const current = models.find((m) => m.key === selected);
      readout.textContent = current
        ? data.points.some((p) => p.key === current.key)
          ? describe(current)
          : `${current.name} is not plotted: inspect its native units or missing fields beside the chart.`
        : "Select a point to inspect its exact source.";
      renderTable();
      resize(changed);
      if (!changed) drawHighlight();
      return data;
    },
    dispose() {
      disposed = true;
      observer?.disconnect();
      listeners.forEach((remove) => remove());
      canvas.width = base.width = 0;
      canvas.height = base.height = 0;
      node.classList.remove("has-model-atlas");
      delete node.dataset.atlasReady;
    },
  };
}

export function renderAtlas(node, models, options = {}) {
  let instance = instances.get(node);
  if (!instance || !node.contains(instance.root)) {
    instance?.dispose();
    instance = createAtlas(node);
    instances.set(node, instance);
  }
  return instance.update(models, options);
}

export function disposeAtlas(node) {
  const instance = instances.get(node);
  instance?.dispose();
  instances.delete(node);
}
