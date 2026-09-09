/**
 * Renders the 1.0 contract sections from mcp-1.0-content.json.
 *
 * THE DATA IS READ, NOT RESTATED. Nothing below hard-codes a price, a condition kind, a
 * provenance value or a state name; every one comes out of the JSON, which is itself
 * checked against the package's generated package-facts.json by
 * mcp-package-agreement.test.js. So a later interactive pass consumes the same file
 * instead of scraping this markup, and a contract change fails a test rather than quietly
 * leaving the page wrong — which is exactly how this page came to advertise twelve tools
 * and four providers while the package shipped sixteen and twelve.
 */
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};
const code = (text) => el("code", null, text);

function card(badge, heading) {
  const article = el("article", "mcp-card");
  article.append(el("span", "mcp-badge", badge), el("h3", null, heading));
  return article;
}

function section(id, title, lede) {
  const s = el("section", "mcp-section");
  s.id = id;
  s.append(el("h2", null, title));
  if (lede) s.append(el("p", "mcp-section-lede", lede));
  return s;
}

function grid(...children) {
  const g = el("div", "mcp-freshness-grid");
  g.append(...children);
  return g;
}

function priceSetSection(d) {
  const s = section("price-sets", "A model has a set of prices, not a price", d.priceSet.claim);
  s.append(el("p", null, d.priceSet.why));
  const ex = d.priceSet.example;
  const cards = ex.points.map((point) => {
    const c = card(point.condition, "$" + point.amountPerMillion);
    const p = el("p");
    p.append("per million ", code(ex.unit), " on " + ex.model + ".");
    c.append(p);
    return c;
  });
  s.append(grid(...cards));
  const note = el("p", "mcp-inline-note");
  note.append(ex.reading + " Spread " + ex.spread + ". Source: ", code(ex.sourceUrl));
  s.append(note);
  return s;
}

function conditionSection(d) {
  const emitted = d.conditionKinds.filter((k) => k.emitted).length;
  const s = section(
    "condition-kinds",
    d.conditionKinds.length + " condition kinds",
    "Every price carries at most one condition. " + emitted + " of " + d.conditionKinds.length +
      " are emitted by a connector today.",
  );
  const cards = d.conditionKinds.map((k) => {
    const c = card(k.emitted ? "emitted" : "declared only", k.kind);
    const meaning = el("p");
    meaning.append(code(k.kind), " — ", k.meaning);
    c.append(meaning);
    if (k.instance) {
      const inst = el("p");
      inst.append(el("strong", null, k.instance.provider), ": ", k.instance.detail);
      c.append(inst);
    }
    if (k.note) c.append(el("p", "mcp-inline-note", k.note));
    return c;
  });
  s.append(grid(...cards));
  return s;
}

function provenanceSection(d) {
  const s = section("provenance", "Every price says where it came from", d.provenance.rule);
  const values = el("p");
  values.append("Provenance is one of ");
  d.provenance.values.forEach((v, i) => values.append(i ? ", " : "", code(v)));
  values.append(".");
  s.append(values);

  const ex = d.provenance.derivedExample;
  const c = card(ex.provenance, ex.provider + ": a price derived from another card");
  c.append(el("p", null, ex.detail));
  const detail = el("p");
  detail.append("Factor ", code(ex.factor), ", derived from ", code(ex.derivedFrom), ", recorded as ", code(ex.sourceText), ".");
  c.append(detail, el("p", "mcp-inline-note", ex.consequence));
  s.append(grid(c));
  return s;
}

function comparisonSection(d) {
  const s = section("comparison-refusal", "A comparison refuses rather than guesses", d.comparison.rule);
  const ex = d.comparison.refusedExample;
  const c = card(ex.outcome, "Same number, same unit, refused");
  const left = el("p");
  left.append(code(ex.left.id), " " + ex.left.amount + " per ", code(ex.left.unit), " · " + ex.left.condition);
  const right = el("p");
  right.append(code(ex.right.id), " " + ex.right.amount + " per ", code(ex.right.unit), " · " + ex.right.condition);
  c.append(left, right, el("p", null, ex.reason), el("p", "mcp-inline-note", ex.reading));
  s.append(grid(c));

  const layers = el("p", "mcp-inline-note");
  layers.append(
    "The refusal surfaces under two names: the price-set primitive returns ",
    code(d.comparison.statusesByLayer.primitive),
    ", and a tool response carries it through as ",
    code(d.comparison.statusesByLayer.toolResponse),
    " with the same reason. " + d.comparison.zeroBaseline,
  );
  s.append(layers);
  return s;
}

function speedSection(d) {
  const s = section("speed", "Speed figures carry their conditions", d.speed.rule);

  const v = d.speed.vantagePoint;
  const vc = card("vantagePoint", "Where it was measured from");
  const vp = el("p");
  vp.append(
    code("vantagePoint"), " — " + v.why + " Measured " + v.measurement.observedOn + " on ",
    code(v.measurement.endpoint),
    ": " + v.measurement.insideProviderNetworkMs + " ms inside the provider network against " +
      v.measurement.fromSofiaMs + " ms from Sofia, " + v.measurement.ratio + ".",
  );
  vc.append(vp, el("p", "mcp-inline-note", v.reading));

  const t = d.speed.tokenBasis;
  const tc = card("token_basis", "Which tokens were counted");
  const tp = el("p");
  tp.append(code("token_basis"), " is one of ");
  t.values.forEach((val, i) => tp.append(i ? ", " : "", code(val)));
  tp.append(". " + t.why);
  tc.append(tp);

  const m = d.speed.measuredParity;
  const mc = card(m.metric, "Parity is reportable: " + m.model);
  const mp = el("p");
  m.observations.forEach((o, i) => mp.append(i ? " · " : "", el("strong", null, o.provider), " " + o.seconds + " s"));
  const basis = el("p");
  basis.append(code("token_basis"), " ", code(m.tokenBasis), " · ", code("vantagePoint"), " " + m.vantagePoint);
  mc.append(mp, basis, el("p", "mcp-inline-note", m.reading));

  s.append(grid(vc, tc, mc));

  for (const w of d.speed.withheldClaims) {
    const line = el("p", "mcp-inline-note");
    line.append(
      el("strong", null, w.provider + " " + w.model + ": "),
      "reports ", code(w.state),
      ". It was published as " + w.wasPublishedAs + "; it is " + w.actually + ". " + w.detail,
    );
    s.append(line);
  }
  return s;
}

function statesSection(d) {
  const s = section(
    "three-states",
    "Three states, told apart without reading prose",
    "Published, not published and unknown are different answers. A surface that renders two of them the same has merged them.",
  );
  const cards = d.threeStates.map((state) => {
    const c = card(state.glyph, state.state);
    const p = el("p");
    p.append(code(state.state), " — ", state.means);
    c.append(p, el("p", "mcp-inline-note", "Carries " + state.carries + "."));
    return c;
  });
  s.append(grid(...cards));
  s.append(el("p", "mcp-inline-note", d.threeStatesNote));
  return s;
}

async function render() {
  const mount = document.getElementById("mcp-1-0-contract");
  if (!mount) return;
  let data;
  try {
    const response = await fetch("/web/open-dashboard/mcp-1.0-content.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    data = await response.json();
  } catch {
    // Say what could not be loaded rather than rendering an empty shell, which would read
    // as "1.0 has no contract" instead of "this page failed to fetch it".
    mount.append(el("p", "mcp-inline-note",
      "The 1.0 contract detail could not be loaded, so it is not shown. That is a failure to read the data, not an absence of the contract."));
    return;
  }
  mount.append(
    priceSetSection(data),
    conditionSection(data),
    provenanceSection(data),
    comparisonSection(data),
    speedSection(data),
    statesSection(data),
  );
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
else render();
