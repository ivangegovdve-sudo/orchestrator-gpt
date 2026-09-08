import { compactIntegerString, safePublicUrl } from "./open-dashboard-schema.js";

const el = (document, tag, className = "", text = null) => {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== null && text !== undefined) value.textContent = String(text);
  return value;
};
const appendExactValue = (document, container, exact) => {
  if (exact === null || exact === undefined) return;
  const value = String(exact); container.dataset.exactValue = value;
  container.appendChild(el(document, "span", "sr-only", ` · exact value ${value}`));
};

export function renderRankTable({ document, title, rows, columns, sourceLabel, asOf, className = "", emphasizeTopThree = false }) {
  const region = el(document, "section", `oo-data-region ${className}`.trim());
  region.append(el(document, "h2", "oo-region-title", title), el(document, "p", "oo-region-meta", `${sourceLabel} · as of ${asOf || "unknown"}`));
  const scroll = el(document, "div", "oo-table-scroll");
  scroll.tabIndex = 0; scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", `${title} table; scroll horizontally for all columns`);
  const table = el(document, "table", "oo-table");
  table.appendChild(el(document, "caption", "sr-only", title));
  const thead = el(document, "thead"); const headRow = el(document, "tr");
  for (const column of columns) { const header = el(document, "th", "", column.label); header.scope = "col"; headRow.appendChild(header); }
  thead.appendChild(headRow); table.appendChild(thead);
  const tbody = el(document, "tbody");
  const identityLabels = new Set(["model", "concrete model", "app", "project", "repository", "task", "item", "provider"]);
  const rowHeaderIndex = columns.findIndex((column) => column.rowHeader === true || identityLabels.has(String(column.label).toLowerCase()));
  for (const row of rows) {
    const tr = el(document, "tr");
    const publishedRank = [row.rank, row.weeklyRank, row.sourceRank].find((value) => Number.isInteger(value) && value > 0) ?? null;
    if (publishedRank !== null) tr.dataset.rank = String(publishedRank);
    if (emphasizeTopThree && publishedRank !== null && publishedRank <= 3) { tr.dataset.rankTier = "top-three"; tr.classList.add("oo-rank-top", `oo-rank-${publishedRank}`); }
    columns.forEach((column, index) => {
      const cell = el(document, index === rowHeaderIndex ? "th" : "td"); if (index === rowHeaderIndex) cell.scope = "row";
      const value = column.value ? column.value(row) : null; const href = column.href ? safePublicUrl(column.href(row)) : null;
      if (column.render) cell.appendChild(column.render(row));
      else if (href) { const link = el(document, "a", "", value); link.href = href.href; link.target = "_blank"; link.rel = "noopener noreferrer"; cell.appendChild(link); }
      else cell.textContent = value === null || value === undefined ? "—" : String(value);
      if (emphasizeTopThree && publishedRank !== null && publishedRank <= 3 && String(column.label).toLowerCase() === "rank") cell.appendChild(el(document, "span", "sr-only", ` · top-three position ${publishedRank}`));
      if (column.exact) appendExactValue(document, cell, column.exact(row)); tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody); scroll.appendChild(table); region.appendChild(scroll);
  if (!rows.length) region.appendChild(el(document, "p", "oo-region-meta", "No published rows for this slice."));
  return region;
}

export function barWidthBasisPoints(value, maximum) { const max = BigInt(maximum); return max === 0n ? 0n : BigInt(value) * 10000n / max; }
export function matrixCellModel(cell) {
  if (cell.state === "observed") return Object.freeze({ state: "observed", label: compactIntegerString(cell.totalTokens), exact: cell.totalTokens, rank: cell.rankWithinPeriod, reason: null, evidenceUrl: cell.evidenceUrl });
  if (cell.reason === "not_observed") return Object.freeze({ state: "not_observed", label: "0", exact: null, rank: null, reason: cell.reason, evidenceUrl: null });
  return Object.freeze({ state: "unknown", variant: cell.reason === "not_published" ? "not_published" : "unknown", label: "?", exact: null, rank: null, reason: cell.reason, evidenceUrl: null });
}

const matrixCellKey = (appId, modelId) => `${appId}\0${modelId}`;

export function matrixStateCounts(response) {
  const cells = new Map((response?.cells || []).map((cell) => [matrixCellKey(cell.appId, cell.modelId), cell]));
  const counts = { observed: 0, notObserved: 0, unknown: 0, notPublished: 0, missing: 0 };
  for (const appId of response?.appIds || []) {
    for (const modelId of response?.modelIds || []) {
      const cell = cells.get(matrixCellKey(appId, modelId));
      if (!cell) counts.missing += 1;
      else if (cell.state === "observed") counts.observed += 1;
      else if (cell.reason === "not_observed") counts.notObserved += 1;
      else { counts.unknown += 1; if (cell.reason === "not_published") counts.notPublished += 1; }
    }
  }
  return Object.freeze(counts);
}

const compareExactDescending = (left, right) => right.totalTokens > left.totalTokens ? 1 : right.totalTokens < left.totalTokens ? -1 : left.label.localeCompare(right.label) || left.id.localeCompare(right.id);
const exactRatioBasisPoints = (value, total) => total === 0n ? 0n : value * 10000n / total;
const flowRowY = (index, top, rowHeight, rowGap) => top + index * (rowHeight + rowGap);

export function appModelFlowGeometry(response, { width = 980, rowHeight = 28, rowGap = 14 } = {}) {
  const appNames = new Map((response?.apps || []).map((row) => [row.appId, row.appName]));
  const modelNames = new Map((response?.models || []).map((row) => [row.modelId, row.modelName]));
  const observed = (response?.cells || []).filter((cell) => cell.state === "observed");
  const appTotals = new Map((response?.appIds || []).map((id) => [id, 0n]));
  const modelTotals = new Map((response?.modelIds || []).map((id) => [id, 0n]));
  let totalTokens = 0n;
  for (const cell of observed) {
    const value = BigInt(cell.totalTokens);
    appTotals.set(cell.appId, (appTotals.get(cell.appId) || 0n) + value);
    modelTotals.set(cell.modelId, (modelTotals.get(cell.modelId) || 0n) + value);
    totalTokens += value;
  }
  const toRow = (id, totals, names) => ({ id, label: names.get(id) || id, totalTokens: totals.get(id) || 0n });
  const apps = (response?.appIds || []).map((id) => toRow(id, appTotals, appNames)).sort(compareExactDescending);
  const models = (response?.modelIds || []).map((id) => toRow(id, modelTotals, modelNames)).sort(compareExactDescending);
  const top = 34;
  const height = Math.max(180, top * 2 + Math.max(apps.length, models.length) * rowHeight + Math.max(0, Math.max(apps.length, models.length) - 1) * rowGap);
  const leftNodeX = 248;
  const rightNodeX = width - 248;
  const nodeWidth = 14;
  const nodeByApp = new Map(apps.map((row, index) => [row.id, { ...row, index, y: flowRowY(index, top, rowHeight, rowGap) }]));
  const nodeByModel = new Map(models.map((row, index) => [row.id, { ...row, index, y: flowRowY(index, top, rowHeight, rowGap) }]));
  const appOffsets = new Map((response?.appIds || []).map((id) => [id, 0n]));
  const modelOffsets = new Map((response?.modelIds || []).map((id) => [id, 0n]));
  const orderedObserved = observed.slice().sort((left, right) => nodeByApp.get(left.appId).index - nodeByApp.get(right.appId).index || nodeByModel.get(left.modelId).index - nodeByModel.get(right.modelId).index);
  const links = orderedObserved.map((cell) => {
    const value = BigInt(cell.totalTokens);
    const app = nodeByApp.get(cell.appId); const model = nodeByModel.get(cell.modelId);
    const appTotal = appTotals.get(cell.appId) || 0n; const modelTotal = modelTotals.get(cell.modelId) || 0n;
    const sourceCenter = appTotal === 0n ? 0n : (appOffsets.get(cell.appId) * 10000n + value * 5000n) / appTotal;
    const targetCenter = modelTotal === 0n ? 0n : (modelOffsets.get(cell.modelId) * 10000n + value * 5000n) / modelTotal;
    const sourceY = app.y + rowHeight * Number(sourceCenter) / 10000;
    const targetY = model.y + rowHeight * Number(targetCenter) / 10000;
    const widthBasisPoints = exactRatioBasisPoints(value, totalTokens);
    const strokeWidth = Math.max(1.25, Math.min(32, 1.25 + Number(widthBasisPoints) / 10000 * 30));
    const startX = leftNodeX + nodeWidth; const endX = rightNodeX;
    const bend = (endX - startX) * 0.46;
    const path = `M${startX.toFixed(2)} ${sourceY.toFixed(2)} C${(startX + bend).toFixed(2)} ${sourceY.toFixed(2)} ${(endX - bend).toFixed(2)} ${targetY.toFixed(2)} ${endX.toFixed(2)} ${targetY.toFixed(2)}`;
    appOffsets.set(cell.appId, (appOffsets.get(cell.appId) || 0n) + value);
    modelOffsets.set(cell.modelId, (modelOffsets.get(cell.modelId) || 0n) + value);
    return Object.freeze({ appId: cell.appId, modelId: cell.modelId, totalTokens: cell.totalTokens, widthBasisPoints, strokeWidth, path, sourceY, targetY });
  });
  return Object.freeze({ width, height, rowHeight, rowGap, leftNodeX, rightNodeX, nodeWidth, apps: Object.freeze(apps.map((row) => Object.freeze({ ...row, totalTokens: String(row.totalTokens), y: nodeByApp.get(row.id).y }))), models: Object.freeze(models.map((row) => Object.freeze({ ...row, totalTokens: String(row.totalTokens), y: nodeByModel.get(row.id).y }))), links: Object.freeze(links), totalTokens: String(totalTokens) });
}

export function matrixNavigationTarget(index, rowCount, columnCount, key) {
  if (!Number.isInteger(index) || !Number.isInteger(rowCount) || !Number.isInteger(columnCount) || rowCount < 1 || columnCount < 1 || index < 0 || index >= rowCount * columnCount) return null;
  const row = Math.floor(index / columnCount); const column = index % columnCount;
  if (key === "ArrowLeft") return row * columnCount + Math.max(0, column - 1);
  if (key === "ArrowRight") return row * columnCount + Math.min(columnCount - 1, column + 1);
  if (key === "ArrowUp") return Math.max(0, row - 1) * columnCount + column;
  if (key === "ArrowDown") return Math.min(rowCount - 1, row + 1) * columnCount + column;
  if (key === "Home") return row * columnCount;
  if (key === "End") return row * columnCount + columnCount - 1;
  return null;
}

export function matrixAxisNameMaps(response, apps = [], models = []) {
  return Object.freeze({
    appNames: new Map([...apps.map((row) => [row.appId, row.appName]), ...(response.apps || []).map((row) => [row.appId, row.appName])]),
    modelNames: new Map([...models.map((row) => [row.id, row.name]), ...(response.models || []).map((row) => [row.modelId, row.modelName])])
  });
}

const svgElement = (document, tag, className = "", text = null) => {
  const value = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (className) value.setAttribute("class", className);
  if (text !== null) value.textContent = String(text);
  return value;
};

const flowLabel = (value, max = 27) => String(value).length > max ? `${String(value).slice(0, max - 1)}…` : String(value);

export function renderMatrixStateSummary({ document, response }) {
  const counts = matrixStateCounts(response);
  const summary = el(document, "div", "oo-matrix-state-summary");
  summary.setAttribute("aria-label", "Relationship state summary");
  const states = [
    ["observed", counts.observed, "Observed relationships", "solid"],
    ["not-observed", counts.notObserved, "Checked and absent", "dotted"],
    ["unknown", counts.unknown, "Not collected or not published", "hatched"],
  ];
  for (const [className, count, label, swatch] of states) {
    const item = el(document, "span", `oo-matrix-state-item is-${className}`);
    const reasonDetail = className === "unknown" && counts.notPublished ? `; ${counts.notPublished} not published` : "";
    item.setAttribute("aria-label", `${count} ${label}${reasonDetail}`);
    const marker = el(document, "b", `oo-matrix-state-marker is-${swatch}`, String(count));
    marker.setAttribute("aria-hidden", "true");
    item.append(marker, el(document, "span", "oo-matrix-state-label", label));
    if (reasonDetail) item.appendChild(el(document, "span", "oo-matrix-state-detail", `(${counts.notPublished} not published)`));
    summary.appendChild(item);
  }
  if (counts.missing) {
    const item = el(document, "span", "oo-matrix-state-item is-missing");
    item.append(el(document, "b", "oo-matrix-state-marker is-missing", String(counts.missing)), el(document, "span", "oo-matrix-state-label", "Not returned"));
    summary.appendChild(item);
  }
  return summary;
}

export function renderAppModelFlow({ document, response }) {
  const geometry = appModelFlowGeometry(response);
  const figure = el(document, "figure", "oo-app-model-flow");
  const caption = el(document, "figcaption", "oo-flow-caption");
  caption.append(el(document, "h3", "oo-flow-title", "Observed relationships only"), el(document, "p", "oo-flow-description", "Ribbon width is derived from exact observed token volume; the thinnest ribbons receive a legibility floor. Both sides are sorted by descending observed total; the flow does not show checked-absent or unknown relationships."));
  figure.appendChild(caption);
  figure.appendChild(renderMatrixStateSummary({ document, response }));
  const scroll = el(document, "div", "oo-flow-scroll");
  scroll.tabIndex = 0;
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", "Observed app to model flow; scroll horizontally for all labels");
  const svg = svgElement(document, "svg", "oo-flow-svg");
  svg.setAttribute("viewBox", `0 0 ${geometry.width} ${geometry.height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-hidden", "true");
  const linksGroup = svgElement(document, "g", "oo-flow-links");
  for (const link of geometry.links) {
    const path = svgElement(document, "path", "oo-flow-link");
    path.setAttribute("d", link.path);
    path.setAttribute("stroke-width", String(link.strokeWidth));
    const title = svgElement(document, "title", "", `${link.appId} → ${link.modelId}: ${link.totalTokens} observed tokens`);
    path.appendChild(title);
    linksGroup.appendChild(path);
  }
  svg.appendChild(linksGroup);
  const nodesGroup = svgElement(document, "g", "oo-flow-nodes");
  for (const [kind, rows, x, anchor] of [["app", geometry.apps, geometry.leftNodeX, "end"], ["model", geometry.models, geometry.rightNodeX, "start"]]) {
    for (const row of rows) {
      const node = svgElement(document, "rect", `oo-flow-node is-${kind}`);
      node.setAttribute("x", String(x)); node.setAttribute("y", String(row.y)); node.setAttribute("width", String(geometry.nodeWidth)); node.setAttribute("height", String(geometry.rowHeight));
      node.setAttribute("rx", "2");
      nodesGroup.appendChild(node);
      const label = svgElement(document, "text", "oo-flow-node-label", flowLabel(row.label));
      label.setAttribute("x", String(kind === "app" ? x - 10 : x + geometry.nodeWidth + 10)); label.setAttribute("y", String(row.y + 12)); label.setAttribute("text-anchor", anchor);
      nodesGroup.appendChild(label);
      const total = svgElement(document, "text", "oo-flow-node-total", compactIntegerString(row.totalTokens));
      total.setAttribute("x", String(kind === "app" ? x - 10 : x + geometry.nodeWidth + 10)); total.setAttribute("y", String(row.y + 23)); total.setAttribute("text-anchor", anchor);
      nodesGroup.appendChild(total);
    }
  }
  svg.appendChild(nodesGroup);
  scroll.appendChild(svg); figure.appendChild(scroll);
  const note = el(document, "p", "oo-flow-note", `${geometry.apps.length} apps · ${geometry.models.length} models · ${geometry.links.length} observed relationships · ${compactIntegerString(geometry.totalTokens)} total observed tokens`);
  figure.appendChild(note);
  return figure;
}

export function renderUnmappedModels({ document, response }) {
  const count = response?.coverage?.unmappedObservations ?? 0;
  const rows = Array.isArray(response?.unmappedModels) ? response.unmappedModels : [];
  if (!count && !rows.length) return null;
  const details = el(document, "details", "oo-unmapped-models");
  const summary = el(document, "summary", "oo-unmapped-summary", `${count} unresolved observations · largest ${rows.length} shown`);
  details.appendChild(summary);
  details.appendChild(el(document, "p", "oo-unmapped-note", "These model observations could not be resolved to the named model axis. The API publishes the largest observations, not an arbitrary first page."));
  const table = el(document, "table", "oo-table oo-unmapped-table");
  table.appendChild(el(document, "caption", "sr-only", "Largest unresolved model observations"));
  const head = el(document, "tr");
  for (const label of ["App", "Source model", "Tokens", "Reason"]) { const th = el(document, "th", "", label); th.scope = "col"; head.appendChild(th); }
  const thead = el(document, "thead"); thead.appendChild(head); table.appendChild(thead);
  const tbody = el(document, "tbody");
  for (const row of rows) {
    const tr = el(document, "tr");
    tr.append(el(document, "td", "", row.appId), el(document, "td", "", row.sourcePermaslug));
    const tokens = el(document, "td", "", compactIntegerString(row.totalTokens)); appendExactValue(document, tokens, row.totalTokens); tr.append(tokens, el(document, "td", "", row.reason)); tbody.appendChild(tr);
  }
  table.appendChild(tbody); details.appendChild(table); return details;
}

export function renderAppModelMatrix({ document, response, apps = [], models = [], onInspect = () => {}, onDismiss = () => {} }) {
  if (!response || response.status === "unavailable") return renderUnavailable({ document, title: "Observed app → model usage", reason: response ? `Enrichment unavailable: ${response.reason}${response.lastSuccessAt ? ` · last success ${response.lastSuccessAt}` : ""}` : "Relationship request failed; stable rankings remain available." });
  const { appNames, modelNames } = matrixAxisNameMaps(response, apps, models); const cells = new Map(response.cells.map((cell) => [`${cell.appId}\0${cell.modelId}`, cell]));
  const region = el(document, "section", "oo-data-region oo-matrix-region");
  const observed = `${response.coverage.observedCells}/${response.coverage.possibleCells} cells observed`;
  const period = response.resolvedPeriod.start === response.resolvedPeriod.end ? response.resolvedPeriod.start : `${response.resolvedPeriod.start} → ${response.resolvedPeriod.end}`;
  region.dataset.matrixStatus = response.status;
  region.append(el(document, "h2", "oo-region-title", "Observed app → model usage"), el(document, "p", "oo-region-meta", `${period} · daily tokens · ${observed} · population ${response.coverage.populationCompleteness}`));
  region.appendChild(renderAppModelFlow({ document, response }));
  region.appendChild(el(document, "h3", "oo-matrix-evidence-title", "Cell evidence grid"));
  const scroll = el(document, "div", "oo-matrix-scroll"); scroll.tabIndex = 0; scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Top app by model matrix; scroll horizontally for all models"); const table = el(document, "table", "oo-matrix"); table.appendChild(el(document, "caption", "sr-only", "Top app by model observed token matrix"));
  const thead = el(document, "thead"); const head = el(document, "tr"); const corner = el(document, "th", "", "App / model"); corner.scope = "col"; head.appendChild(corner);
  for (const modelId of response.modelIds) { const th = el(document, "th", "", modelNames.get(modelId) || modelId); th.scope = "col"; th.title = modelId; head.appendChild(th); }
  thead.appendChild(head); table.appendChild(thead); const tbody = el(document, "tbody"); const controls = [];
  for (const appId of response.appIds) {
    const tr = el(document, "tr"); const th = el(document, "th", "", appNames.get(appId) || appId); th.scope = "row"; th.title = appId; tr.appendChild(th);
    for (const modelId of response.modelIds) {
      const cell = cells.get(`${appId}\0${modelId}`); const model = cell ? matrixCellModel(cell) : null; const stateClass = !model ? "is-missing" : model.state === "observed" ? "is-observed" : model.state === "not_observed" ? "is-not-observed" : `is-unknown${model.variant === "not_published" ? " is-not-published" : ""}`; const td = el(document, "td", `oo-matrix-cell ${stateClass}`);
      if (!cell) { td.textContent = "·"; td.title = "Cell not returned by the API"; }
      else { const control = el(document, "button", "oo-matrix-control", model.label); const controlIndex = controls.length; control.type = "button"; control.tabIndex = controlIndex === 0 ? 0 : -1; control.dataset.matrixIndex = String(controlIndex); control.setAttribute("aria-controls", "oo-inspector"); const description = model.state === "observed" ? `${model.exact} observed tokens` : model.state === "not_observed" ? "checked and no observed usage" : `unknown, ${model.reason}`; control.setAttribute("aria-label", `${appNames.get(appId) || appId} and ${modelNames.get(modelId) || modelId}: ${description}`); control.addEventListener("click", () => onInspect({ appId, modelId, cell, model, trigger: control })); control.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); onDismiss({ restoreFocus: control }); return; } const targetIndex = matrixNavigationTarget(controlIndex, response.appIds.length, response.modelIds.length, event.key); if (targetIndex === null || targetIndex === controlIndex) return; event.preventDefault(); for (const item of controls) item.tabIndex = -1; const target = controls[targetIndex]; if (target) { target.tabIndex = 0; target.focus(); } }); controls.push(control); td.appendChild(control); }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody); scroll.appendChild(table); region.appendChild(scroll); const unmapped = renderUnmappedModels({ document, response }); if (unmapped) region.appendChild(unmapped); return region;
}

export function renderHorizontalBars({ document, title, rows, label, value }) {
  const region = el(document, "section", "oo-data-region oo-bars"); region.appendChild(el(document, "h2", "oo-region-title", title)); const list = el(document, "ol", "oo-bar-list");
  const maximum = rows.reduce((largest, row) => BigInt(value(row)) > largest ? BigInt(value(row)) : largest, 0n);
  for (const row of rows) { const item = el(document, "li", "oo-bar-row"); const exact = String(value(row)); const track = el(document, "span", "oo-bar-track"); const fill = el(document, "span", "oo-bar-fill"); const bp = barWidthBasisPoints(exact, maximum); fill.style.width = `${bp / 100n}.${String(bp % 100n).padStart(2, "0")}%`; track.appendChild(fill); const displayed = el(document, "span", "oo-bar-value", compactIntegerString(exact)); appendExactValue(document, displayed, exact); item.append(el(document, "span", "oo-bar-label", label(row)), track, displayed); list.appendChild(item); }
  region.appendChild(list); return region;
}

export function renderSparkline({ document, values, label }) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "oo-sparkline"); svg.setAttribute("viewBox", "0 0 100 24"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label);
  const parsed = values.map((raw) => { const match = String(raw).match(/^(-?)(\d+)(?:\.(\d+))?$/); if (!match) throw new TypeError("Sparkline values must be exact decimal strings"); return { negative: match[1] === "-", whole: match[2], fraction: match[3] || "" }; });
  const scale = parsed.reduce((largest, value) => Math.max(largest, value.fraction.length), 0); const numeric = parsed.map((value) => { const magnitude = BigInt(value.whole + value.fraction.padEnd(scale, "0")); return value.negative ? -magnitude : magnitude; }); const minimum = numeric.reduce((a, b) => b < a ? b : a, numeric[0]); const maximum = numeric.reduce((a, b) => b > a ? b : a, numeric[0]); const span = maximum - minimum;
  const points = numeric.map((value, index) => { const x = numeric.length === 1 ? 50 : index * 100 / (numeric.length - 1); const ybp = span === 0n ? 1000n : (value - minimum) * 2000n / span; return `${x.toFixed(2)},${(22 - Number(ybp) / 100).toFixed(2)}`; }).join(" ");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline"); line.setAttribute("points", points); svg.appendChild(line); return svg;
}

const parseExact = (raw) => {
  const match = String(raw).match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) throw new TypeError("Chart values must be non-negative exact decimals");
  return { whole: match[1], fraction: match[2] || "" };
};

const scaleExactMatrix = (matrix) => {
  const parsed = matrix.map((row) => row.map(parseExact));
  const scale = parsed.flat().reduce((largest, value) => Math.max(largest, value.fraction.length), 0);
  return parsed.map((row) => row.map((value) => BigInt(value.whole + value.fraction.padEnd(scale, "0"))));
};

const sumExact = (values) => {
  if (!values.length) return "0";
  const parsed = values.map(parseExact); const scale = parsed.reduce((largest, value) => Math.max(largest, value.fraction.length), 0);
  const total = parsed.reduce((sum, value) => sum + BigInt(value.whole + value.fraction.padEnd(scale, "0")), 0n);
  if (scale === 0) return String(total);
  const digits = String(total).padStart(scale + 1, "0"); const whole = digits.slice(0, -scale); const fraction = digits.slice(-scale).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
};

const xCoordinate = (index, count, width = 320) => count === 1 ? width / 2 : 4 + index * (width - 8) / (count - 1);
const yCoordinate = (value, maximum, height = 120) => maximum === 0n ? height - 4 : height - 4 - Number(value * 10_000n / maximum) / 10_000 * (height - 8);
const point = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`;

export function stackedAreaGeometry(buckets) {
  if (!Array.isArray(buckets) || buckets.length < 2) return null;
  const latest = buckets.at(-1); const targets = latest.rows.filter((row) => row.id !== "other").slice().sort((left, right) => (left.rank ?? 999) - (right.rank ?? 999) || left.id.localeCompare(right.id)).slice(0, 10).map((row) => ({ id: row.id, label: row.label }));
  if (!targets.length || new Set(targets.map((row) => row.id)).size !== targets.length) return null;
  const raw = [];
  for (const bucket of buckets) {
    const byId = new Map(bucket.rows.map((row) => [row.id, row])); const values = [];
    for (const target of targets) { const row = byId.get(target.id); if (row?.value === null) return null; values.push(row ? String(row.value) : "0"); }
    const explicitOther = byId.get("other")?.value;
    const sourceRemainder = explicitOther ?? bucket.rows.find((row) => row.remainder !== null)?.remainder ?? null;
    if (sourceRemainder === null) return null;
    const targetIds = new Set(targets.map((target) => target.id));
    const omitted = bucket.rows.filter((row) => row.id !== "other" && !targetIds.has(row.id)).map((row) => row.value);
    if (omitted.some((value) => value === null)) return null;
    values.push(sumExact([sourceRemainder, ...omitted]));
    raw.push(values);
  }
  let numeric; try { numeric = scaleExactMatrix(raw); } catch { return null; }
  const totals = numeric.map((values) => values.reduce((sum, value) => sum + value, 0n)); const maximum = totals.reduce((largest, value) => value > largest ? value : largest, 0n);
  const lower = Array.from({ length: buckets.length }, () => 0n); const definitions = [...targets, { id: "other", label: "Other" }];
  const series = definitions.map((definition, seriesIndex) => {
    const upper = lower.map((value, bucketIndex) => value + numeric[bucketIndex][seriesIndex]);
    const forward = upper.map((value, index) => point(xCoordinate(index, buckets.length), yCoordinate(value, maximum)));
    const reverse = lower.map((value, index) => point(xCoordinate(index, buckets.length), yCoordinate(value, maximum))).reverse();
    const path = `M${forward[0]}${forward.slice(1).map((value) => ` L${value}`).join("")}${reverse.map((value) => ` L${value}`).join("")} Z`;
    for (let index = 0; index < lower.length; index += 1) lower[index] = upper[index];
    return Object.freeze({ ...definition, path, values: Object.freeze(raw.map((row) => row[seriesIndex])) });
  });
  return Object.freeze({ viewBox: "0 0 320 120", dates: Object.freeze(buckets.map((bucket) => bucket.date)), series: Object.freeze(series) });
}

export function bumpChartGeometry(buckets) {
  if (!Array.isArray(buckets) || buckets.length < 2) return null;
  const targets = buckets.at(-1).rows.slice(0, 10).map((row) => ({ id: row.id, label: row.label }));
  if (!targets.length || new Set(targets.map((row) => row.id)).size !== targets.length) return null;
  const ranks = targets.map((target) => buckets.map((bucket) => bucket.rows.find((row) => row.id === target.id)?.rank));
  if (ranks.some((values) => values.some((rank) => !Number.isInteger(rank) || rank < 1))) return null;
  const maximum = Math.max(1, ...ranks.flat()); const y = (rank) => maximum === 1 ? 60 : 4 + (rank - 1) * 112 / (maximum - 1);
  const series = targets.map((target, targetIndex) => Object.freeze({ ...target, ranks: Object.freeze(ranks[targetIndex]), path: ranks[targetIndex].map((rank, index) => `${index ? "L" : "M"}${point(xCoordinate(index, buckets.length), y(rank))}`).join(" ") }));
  return Object.freeze({ viewBox: "0 0 320 120", dates: Object.freeze(buckets.map((bucket) => bucket.date)), series: Object.freeze(series) });
}

export function githubSmallMultiplesGeometry(buckets) {
  if (!Array.isArray(buckets) || buckets.length < 2) return null;
  const scopeOf = (row) => row.scope || "cross-category";
  const scopes = [...new Set(buckets.at(-1).rows.map(scopeOf))].sort();
  const multiples = scopes.map((scope) => {
    const scoped = buckets.map((bucket) => ({ ...bucket, rows: bucket.rows.filter((row) => scopeOf(row) === scope) }));
    const targets = scoped.at(-1).rows.slice().sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id)).slice(0, 3).map((row) => ({ id: row.id, label: row.label }));
    const selectedRows = targets.map((target) => scoped.map((bucket) => bucket.rows.find((row) => row.id === target.id)));
    const ranks = selectedRows.map((rows) => rows.map((row) => row?.rank));
    const valid = targets.length && selectedRows.every((rows) => rows.every((row) => row && Number.isInteger(row.rank) && row.rank > 0 && row.stars !== null && row.forks !== null));
    if (!valid) return null;
    const maximum = Math.max(1, ...ranks.flat()); const y = (rank) => maximum === 1 ? 30 : 3 + (rank - 1) * 54 / (maximum - 1);
    const exactPath = (rawValues) => {
      const parsed = rawValues.map(parseExact); const scale = parsed.reduce((largest, value) => Math.max(largest, value.fraction.length), 0);
      const values = parsed.map((value) => BigInt(value.whole + value.fraction.padEnd(scale, "0"))); const minimum = values.reduce((smallest, value) => value < smallest ? value : smallest, values[0]); const maximumValue = values.reduce((largest, value) => value > largest ? value : largest, values[0]); const span = maximumValue - minimum;
      return values.map((value, index) => { const x = xCoordinate(index, buckets.length, 160) / 2; const yValue = span === 0n ? 30 : 57 - Number((value - minimum) * 10_000n / span) / 10_000 * 54; return `${index ? "L" : "M"}${point(x, yValue)}`; }).join(" ");
    };
    const series = targets.map((target, targetIndex) => {
      const stars = selectedRows[targetIndex].map((row) => String(row.stars)); const forks = selectedRows[targetIndex].map((row) => String(row.forks));
      return Object.freeze({ ...target, ranks: Object.freeze(ranks[targetIndex]), path: ranks[targetIndex].map((rank, index) => `${index ? "L" : "M"}${point(xCoordinate(index, buckets.length, 160) / 2, y(rank))}`).join(" "), starsPath: exactPath(stars), forksPath: exactPath(forks), starDelta: String(BigInt(stars.at(-1)) - BigInt(stars[0])), forkDelta: String(BigInt(forks.at(-1)) - BigInt(forks[0])) });
    });
    return Object.freeze({ scope, viewBox: "0 0 160 60", series: Object.freeze(series) });
  }).filter(Boolean);
  return multiples.length ? Object.freeze({ dates: Object.freeze(buckets.map((bucket) => bucket.date)), multiples: Object.freeze(multiples) }) : null;
}

const svgPath = (document, series, index, className) => {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("class", className); path.setAttribute("d", series.path); path.dataset.seriesId = series.id; path.style.setProperty("--series-index", String(index));
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title"); title.textContent = series.label; path.appendChild(title); return path;
};

const chartSvg = (document, geometry, className, label) => { const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", className); svg.setAttribute("viewBox", geometry.viewBox); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label); return svg; };

export function renderHistoryVisualization({ document, type, buckets, title }) {
  if (type === "stacked-area") {
    const geometry = stackedAreaGeometry(buckets); if (!geometry) return null; const wrapper = el(document, "div", "oo-history-visual oo-stacked-area"); const svg = chartSvg(document, geometry, "oo-history-svg", `${title}: top ten plus Other exact usage area`);
    geometry.series.forEach((series, index) => svg.appendChild(svgPath(document, series, index, "oo-area-series")));
    const legend = el(document, "ul", "oo-chart-legend"); geometry.series.forEach((series) => legend.appendChild(el(document, "li", "", series.label))); wrapper.append(svg, legend); return wrapper;
  }
  if (type === "bump") {
    const geometry = bumpChartGeometry(buckets); if (!geometry) return null; const wrapper = el(document, "div", "oo-history-visual oo-bump-chart"); const svg = chartSvg(document, geometry, "oo-history-svg", `${title}: exact published rank movement`);
    geometry.series.forEach((series, index) => svg.appendChild(svgPath(document, series, index, "oo-bump-series"))); wrapper.appendChild(svg); return wrapper;
  }
  if (type === "small-multiples") {
    const geometry = githubSmallMultiplesGeometry(buckets); if (!geometry) return null; const wrapper = el(document, "div", "oo-history-visual oo-small-multiples");
    for (const multiple of geometry.multiples) { const panel = el(document, "section", "oo-small-multiple"); panel.appendChild(el(document, "h3", "", multiple.scope)); const svg = chartSvg(document, multiple, "oo-history-svg", `${title}: ${multiple.scope} published rank, stars, and forks`); multiple.series.forEach((series, index) => { svg.appendChild(svgPath(document, series, index, "oo-small-series oo-small-rank")); svg.appendChild(svgPath(document, { ...series, id: `${series.id}:stars`, path: series.starsPath, label: `${series.label} stars` }, index, "oo-small-series oo-small-stars")); svg.appendChild(svgPath(document, { ...series, id: `${series.id}:forks`, path: series.forksPath, label: `${series.label} forks` }, index, "oo-small-series oo-small-forks")); }); const deltas = el(document, "ul", "oo-small-deltas"); for (const series of multiple.series) deltas.appendChild(el(document, "li", "", `${series.label}: Δ stars ${series.starDelta} · Δ forks ${series.forkDelta}`)); panel.append(svg, deltas); wrapper.appendChild(panel); }
    return wrapper;
  }
  return null;
}

export function renderSourceStates({ document, datasets }) {
  const list = el(document, "ul", "oo-source-list");
  for (const dataset of datasets) {
    const item = el(document, "li", "oo-source-row"); item.dataset.mode = dataset.mode; item.dataset.freshness = dataset.freshness; item.dataset.completeness = dataset.completeness; if (dataset.state) item.dataset.status = dataset.state; if (dataset.sourceKind) item.dataset.sourceKind = dataset.sourceKind;
    const identity = el(document, "strong"); const sourceUrl = safePublicUrl(dataset.sourceUrl); if (sourceUrl) { const link = el(document, "a", "", dataset.sourceId); link.href = sourceUrl.href; link.target = "_blank"; link.rel = "noopener noreferrer"; identity.appendChild(link); } else identity.textContent = dataset.sourceId;
    const time = el(document, "time", "", dataset.asOf || "as-of unknown"); if (validIsoTime(dataset.asOf)) time.setAttribute("datetime", dataset.asOf);
    const status = dataset.state || dataset.freshness || "unknown";
    item.append(identity, el(document, "span", "oo-source-status-label", dataset.statusLabel || status.replaceAll("-", " ")), el(document, "span", "", `${dataset.mode} · ${dataset.freshness} · ${dataset.completeness}`), time);
    if (dataset.statusNote) item.appendChild(el(document, "span", "oo-source-note", dataset.statusNote));
    if (dataset.publicationIdentity) { const publication = el(document, "span", "oo-source-publication", `publication ${dataset.publicationIdentity}`); publication.title = dataset.publicationIdentity; item.appendChild(publication); }
    list.appendChild(item);
  }
  return list;
}

export const validIsoTime = (value) => {
  if (typeof value !== "string") return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { const parsed = new Date(`${value}T00:00:00.000Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const calendar = value.slice(0, 10); const midnight = new Date(`${calendar}T00:00:00.000Z`);
  return Number.isFinite(midnight.getTime()) && midnight.toISOString().slice(0, 10) === calendar && Number.isFinite(Date.parse(value));
};

// This route deliberately shows the exact machine reason a slice is missing —
// that auditability is the point of it, and the browser spec asserts the code
// stays on screen. But the code alone read as leaked internals to a visitor.
// So the sentence leads and the code stays underneath it as evidence; nothing
// is hidden, and nothing is inferred.
const REASON_TEXT = Object.freeze({
  collection_disabled: "This relationship data is not being collected at the moment.",
  approval_incomplete: "Collection is quiet while the required approvals are pending.",
  insufficient_history: "There is not yet enough history to draw this.",
  requires_8_consecutive_complete_days: "This needs eight consecutive complete days before it can be drawn.",
  not_published: "This slice has not been published.",
  no_observed_period: "No observed period covers this slice.",
  no_common_period: "These items share no common observed period.",
  period_mismatch: "The published period does not match the one requested.",
  unmapped_alias: "This app could not be tied to a known identity.",
  provenance_run_mismatch: "The evidence came from a different collection run.",
  provenance_not_in_manifest: "The evidence is not listed in the published manifest.",
  request_failed: "The request for this slice did not complete.",
});

const MACHINE_CODE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;

// Returns the sentence a visitor reads, plus the raw string to keep as evidence
// (null when the caller already passed prose and there is nothing to preserve).
export function describeUnavailable(reason, code = null) {
  const raw = typeof reason === "string" ? reason : "";
  if (code) return { text: raw || "This slice could not be loaded.", code };
  const found = raw.match(MACHINE_CODE) || [];
  const known = found.find((entry) => REASON_TEXT[entry]);
  if (known) return { text: REASON_TEXT[known], code: raw };
  if (found.length) return { text: "This slice is unavailable. Nothing is inferred in its place.", code: raw };
  return { text: raw || "This slice is unavailable.", code: null };
}

// A panel whose request has not been made yet is NOT a failed panel. Saying
// "request failed" for work that was never attempted points every reader at the
// publisher for a decision this page made, which is how three dark history
// panels read as an upstream outage for weeks.
export function renderPending({ document, title, note }) {
  const region = el(document, "section", "oo-data-region oo-pending");
  region.setAttribute("role", "status");
  region.setAttribute("aria-busy", "true");
  region.append(el(document, "h2", "oo-region-title", title), el(document, "p", "", note));
  return region;
}

export function renderUnavailable({ document, title, reason, code = null }) {
  const region = el(document, "section", "oo-data-region oo-unavailable");
  region.setAttribute("role", "status");
  const described = describeUnavailable(reason, code);
  region.append(el(document, "h2", "oo-region-title", title), el(document, "p", "", described.text));
  if (described.code) region.appendChild(el(document, "p", "oo-reason-code", described.code));
  return region;
}
