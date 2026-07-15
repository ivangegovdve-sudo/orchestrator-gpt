import { compactIntegerString, safePublicUrl } from "./open-overview-schema.js";

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

export function renderRankTable({ document, title, rows, columns, sourceLabel, asOf, className = "" }) {
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
    columns.forEach((column, index) => {
      const cell = el(document, index === rowHeaderIndex ? "th" : "td"); if (index === rowHeaderIndex) cell.scope = "row";
      const value = column.value ? column.value(row) : null; const href = column.href ? safePublicUrl(column.href(row)) : null;
      if (column.render) cell.appendChild(column.render(row));
      else if (href) { const link = el(document, "a", "", value); link.href = href.href; link.target = "_blank"; link.rel = "noopener noreferrer"; cell.appendChild(link); }
      else cell.textContent = value === null || value === undefined ? "—" : String(value);
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
  return Object.freeze({ state: "unknown", label: "?", exact: null, rank: null, reason: cell.reason, evidenceUrl: null });
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

export function renderAppModelMatrix({ document, response, apps = [], models = [], onInspect = () => {}, onDismiss = () => {} }) {
  if (!response || response.status === "unavailable") return renderUnavailable({ document, title: "Observed app/model relationships", reason: response ? `Enrichment unavailable: ${response.reason}${response.lastSuccessAt ? ` · last success ${response.lastSuccessAt}` : ""}` : "Relationship request failed; stable rankings remain available." });
  const { appNames, modelNames } = matrixAxisNameMaps(response, apps, models); const cells = new Map(response.cells.map((cell) => [`${cell.appId}\0${cell.modelId}`, cell]));
  const region = el(document, "section", "oo-data-region oo-matrix-region");
  region.append(el(document, "h2", "oo-region-title", "Observed app/model relationships"), el(document, "p", "oo-region-meta", `${response.resolvedPeriod.start} · daily tokens · ${response.coverage.observedCells}/${response.coverage.possibleCells} observed`));
  const scroll = el(document, "div", "oo-matrix-scroll"); scroll.tabIndex = 0; scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Top app by model matrix; scroll horizontally for all models"); const table = el(document, "table", "oo-matrix"); table.appendChild(el(document, "caption", "sr-only", "Top app by model observed token matrix"));
  const thead = el(document, "thead"); const head = el(document, "tr"); const corner = el(document, "th", "", "App / model"); corner.scope = "col"; head.appendChild(corner);
  for (const modelId of response.modelIds) { const th = el(document, "th", "", modelNames.get(modelId) || modelId); th.scope = "col"; th.title = modelId; head.appendChild(th); }
  thead.appendChild(head); table.appendChild(thead); const tbody = el(document, "tbody"); const controls = [];
  for (const appId of response.appIds) {
    const tr = el(document, "tr"); const th = el(document, "th", "", appNames.get(appId) || appId); th.scope = "row"; th.title = appId; tr.appendChild(th);
    for (const modelId of response.modelIds) {
      const cell = cells.get(`${appId}\0${modelId}`); const td = el(document, "td", `oo-matrix-cell ${!cell ? "is-missing" : cell.state === "unknown" ? "is-unknown" : cell.totalTokens === "0" ? "is-zero" : "is-observed"}`);
      if (!cell) { td.textContent = "—"; td.title = "Cell not returned by the API"; }
      else { const model = matrixCellModel(cell); const control = el(document, "button", "oo-matrix-control", model.label); const controlIndex = controls.length; control.type = "button"; control.tabIndex = controlIndex === 0 ? 0 : -1; control.dataset.matrixIndex = String(controlIndex); control.setAttribute("aria-controls", "oo-inspector"); control.setAttribute("aria-label", `${appNames.get(appId) || appId} and ${modelNames.get(modelId) || modelId}: ${model.state === "observed" ? `${model.exact} observed tokens` : `unknown, ${model.reason}`}`); control.addEventListener("click", () => onInspect({ appId, modelId, cell, model, trigger: control })); control.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); onDismiss({ restoreFocus: control }); return; } const targetIndex = matrixNavigationTarget(controlIndex, response.appIds.length, response.modelIds.length, event.key); if (targetIndex === null || targetIndex === controlIndex) return; event.preventDefault(); for (const item of controls) item.tabIndex = -1; const target = controls[targetIndex]; if (target) { target.tabIndex = 0; target.focus(); } }); controls.push(control); td.appendChild(control); }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody); scroll.appendChild(table); region.appendChild(scroll); return region;
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

export function renderSourceStates({ document, datasets }) {
  const list = el(document, "ul", "oo-source-list");
  for (const dataset of datasets) {
    const item = el(document, "li", "oo-source-row"); item.dataset.mode = dataset.mode; item.dataset.freshness = dataset.freshness; item.dataset.completeness = dataset.completeness; if (dataset.sourceKind) item.dataset.sourceKind = dataset.sourceKind;
    const identity = el(document, "strong"); const sourceUrl = safePublicUrl(dataset.sourceUrl); if (sourceUrl) { const link = el(document, "a", "", dataset.sourceId); link.href = sourceUrl.href; link.target = "_blank"; link.rel = "noopener noreferrer"; identity.appendChild(link); } else identity.textContent = dataset.sourceId;
    const time = el(document, "time", "", dataset.asOf || "as-of unknown"); if (validIsoTime(dataset.asOf)) time.setAttribute("datetime", dataset.asOf);
    item.append(identity, el(document, "span", "", `${dataset.mode} · ${dataset.freshness} · ${dataset.completeness}`), time);
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

export function renderUnavailable({ document, title, reason }) { const region = el(document, "section", "oo-data-region oo-unavailable"); region.setAttribute("role", "status"); region.append(el(document, "h2", "oo-region-title", title), el(document, "p", "", reason)); return region; }
