/**
 * The landing-page numbers are deliberately derived from the same browser
 * catalogue read that drives the explorer. They are not build-time claims:
 * if a provider is unavailable, the count and source line change with it.
 */

const validModel = (model) =>
  model && typeof model.provider === "string" && model.provider &&
  typeof model.id === "string" && model.id;

const whole = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;

const number = (value) => new Intl.NumberFormat("en").format(value);

export function liveCatalogueFacts(catalogue) {
  const available = Array.isArray(catalogue?.models);
  const unique = new Map();
  for (const model of available ? catalogue.models : []) {
    if (!validModel(model)) continue;
    unique.set(`${model.provider}:${model.id}`, model);
  }
  const models = [...unique.values()];
  return Object.freeze({
    available,
    modelCount: models.length,
    priceCount: models.filter(
      (model) => Array.isArray(model.pricePoints) && model.pricePoints.length > 0,
    ).length,
  });
}

/** Never pin "5,000+" when the live catalogue falls below that threshold. */
export function modelHeadlineCount(count, available = false) {
  const resolved = whole(count);
  if (!available || resolved === null) return "unavailable";
  return resolved >= 5_000 ? "5,000+" : number(resolved);
}

export function priceHeadlineCount(count, available = false) {
  const resolved = whole(count);
  return !available || resolved === null ? "unavailable" : number(resolved);
}

function sourceReports(catalogue) {
  const reports = new Map();
  for (const report of Array.isArray(catalogue?.providers)
    ? catalogue.providers
    : []) {
    if (!report || typeof report.provider !== "string" || !report.provider)
      continue;
    reports.set(report.provider, report);
  }
  return [...reports.values()];
}

const dateLabel = (value) => {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
};

/**
 * A partial result is a live source read with a stated limitation. Failed and
 * unavailable reads are not counted as live. The labels stay explicit rather
 * than folding stale pricing into a green status.
 */
export function sourceHealth(catalogue, labelFor = (id) => id) {
  const reports = sourceReports(catalogue);
  const notes = [];
  let live = 0;
  for (const report of reports) {
    const name = labelFor(report.provider) || report.provider;
    const status = String(report.status || "unavailable").toLowerCase();
    const stale = /stale/i.test(String(report.error || ""));
    if (["available", "partial"].includes(status)) live += 1;
    if (stale) notes.push(`${name} stale`);
    else if (status === "partial") notes.push(`${name} partial`);
    else if (!["available", "partial"].includes(status))
      notes.push(`${name} unavailable`);
  }
  return Object.freeze({ total: reports.length, live, notes: Object.freeze(notes) });
}

export function sourceHealthLine(catalogue, labelFor) {
  const health = sourceHealth(catalogue, labelFor);
  if (!health.total) return "Live source status unavailable.";
  const parts = [`${health.live} of ${health.total} sources live`];
  if (health.notes.length) parts.push(health.notes.join(", "));
  return parts.join(" — ");
}

export function hostObservationLine(hostObservation) {
  const hosts = Array.isArray(hostObservation?.hosts)
    ? hostObservation.hosts.length
    : 0;
  const observed = dateLabel(hostObservation?.observedAt);
  return hosts && observed
    ? `Prior ${hosts}-host observation: ${observed}.`
    : "";
}

export function higgsfieldProvider(snapshot) {
  return (Array.isArray(snapshot?.providers) ? snapshot.providers : []).find(
    (provider) => provider?.provider === "higgsfield",
  ) ?? null;
}

function currency(value, currencyCode) {
  if (value === null || value === undefined || value === "") return "Not reported";
  const minor = Number(value);
  if (!Number.isFinite(minor) || typeof currencyCode !== "string") return "Not reported";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return "Not reported";
  }
}

function appendCell(documentRef, row, value, tagName = "td") {
  const cell = documentRef.createElement(tagName);
  cell.textContent = value;
  row.append(cell);
}

/** Render plan data with text nodes, never source strings as HTML. */
export function renderHiggsfieldPlans(root, provider) {
  const documentRef = root?.ownerDocument ?? globalThis.document;
  if (!root || !documentRef) return;
  root.replaceChildren();
  const plans = Array.isArray(provider?.plans) ? provider.plans : [];
  const heading = documentRef.createElement("h2");
  heading.textContent = "Higgsfield web plans";
  root.append(heading);
  if (!plans.length) {
    const unavailable = documentRef.createElement("p");
    unavailable.textContent = "Higgsfield web-plan data is unavailable; no plan price is shown.";
    root.append(unavailable);
    return;
  }
  const detail = documentRef.createElement("p");
  detail.textContent = `${plans.length.toLocaleString("en")} published plan options · observed ${dateLabel(provider.observedAt) || "date unavailable"}. Credits remain Higgsfield’s native unit.`;
  root.append(detail);

  const wrap = documentRef.createElement("div");
  wrap.className = "higgsfield-table-wrap";
  const table = documentRef.createElement("table");
  table.className = "higgsfield-plan-table";
  const caption = documentRef.createElement("caption");
  caption.textContent = "Higgsfield plan prices";
  table.append(caption);
  const head = documentRef.createElement("thead");
  const headRow = documentRef.createElement("tr");
  for (const label of ["Plan", "Billing", "Credits", "Price", "Monthly equivalent"]) {
    const cell = documentRef.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    headRow.append(cell);
  }
  head.append(headRow);
  table.append(head);
  const body = documentRef.createElement("tbody");
  for (const plan of plans) {
    const row = documentRef.createElement("tr");
    appendCell(documentRef, row, String(plan?.name || "Unknown"), "th");
    row.lastElementChild.scope = "row";
    appendCell(documentRef, row, String(plan?.billingPeriod || "Unknown"));
    appendCell(
      documentRef,
      row,
      plan?.credits !== null &&
      plan?.credits !== undefined &&
      plan?.credits !== "" &&
      Number.isFinite(Number(plan?.credits))
        ? number(Number(plan.credits))
        : "Not reported",
    );
    appendCell(documentRef, row, currency(plan?.priceMinor, plan?.currency));
    appendCell(documentRef, row, currency(plan?.monthlyPriceMinor, plan?.currency));
    body.append(row);
  }
  table.append(body);
  wrap.append(table);
  root.append(wrap);
  try {
    const url = new URL(provider.sourceUrl || "https://higgsfield.ai/pricing");
    if (url.protocol === "https:" && !url.username && !url.password) {
      const link = documentRef.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Open Higgsfield pricing ↗";
      root.append(link);
    }
  } catch {
    // A source URL is supplementary; a malformed one must not blank the plans.
  }
}

export function renderFrontPageFacts({
  root = globalThis.document,
  catalogue,
  higgsfield = null,
  hostObservation = null,
  labelFor,
} = {}) {
  const facts = liveCatalogueFacts(catalogue);
  const model = modelHeadlineCount(facts.modelCount, facts.available);
  const price = priceHeadlineCount(facts.priceCount, facts.available);
  root?.querySelectorAll?.("[data-live-model-count]").forEach((element) => {
    element.textContent = model;
  });
  root?.querySelectorAll?.("[data-live-price-count]").forEach((element) => {
    element.textContent = price;
  });
  const health = sourceHealthLine(catalogue, labelFor);
  root?.querySelectorAll?.("[data-source-health]").forEach((element) => {
    element.textContent = health;
  });
  const hostLine = hostObservationLine(hostObservation);
  root?.querySelectorAll?.("[data-host-observation]").forEach((element) => {
    element.textContent = hostLine;
    element.hidden = !hostLine;
  });
  renderHiggsfieldPlans(
    root?.querySelector?.("[data-higgsfield-plans]"),
    higgsfield,
  );
  return Object.freeze({ ...facts, modelHeadline: model, priceHeadline: price, health });
}
