/**
 * Static glossary search.
 *
 * Replaces the old `apiGet('search/glossary')` call, which pointed at library-api on
 * KVM2 (:8765). That service is retired, and the call had been failing anyway: the page
 * requested a two-segment path that Vercel's routing never matched, so this page has
 * shown nothing since it was migrated off the old static build.
 *
 * The bundle is generated at build time by scripts/build-glossary-bundle.cjs, so terms
 * added to glossary/*.md publish on the next deploy with no re-indexing step.
 */
(function () {
  "use strict";

  const BUNDLE = "/web/library/glossary/glossary-bundle.json";
  const MAX = 40;

  let TERMS = [];
  let READY = false;

  const el = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Rank a term against the query. Higher is better; 0 means "no match". */
  function score(t, q) {
    const term = t.term.toLowerCase();
    const desc = (t.desc || "").toLowerCase();
    const exp = (t.expansion || "").toLowerCase();
    if (term === q) return 1;
    if (term.startsWith(q)) return 0.9;
    if (exp && exp.startsWith(q)) return 0.85;
    if (term.includes(q)) return 0.75;
    if (exp.includes(q)) return 0.6;
    if (desc.includes(q)) return 0.45;
    // all query words present somewhere
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every((w) => (term + " " + exp + " " + desc).includes(w))) {
      return 0.35;
    }
    return 0;
  }

  function card(t, sc) {
    const title = t.expansion ? `${t.term} — ${t.expansion}` : t.term;
    const badge =
      t.kind === "usage"
        ? '<span class="card-source">usage example</span>'
        : `<span class="card-source">${esc(t.category)}</span>`;
    const colour = sc > 0.7 ? "#22c55e" : sc > 0.4 ? "#0ea5e9" : "#a1a1aa";
    return `<div class="card">
      <div class="card-header">
        <span class="card-title">${esc(title)}</span>
        <span class="card-score" style="color:${colour}">${(sc * 100).toFixed(0)}%</span>
      </div>
      <p class="card-snippet">${esc(t.desc)}</p>
      <div class="card-footer">${badge}</div>
    </div>`;
  }

  function render(list, label) {
    const res = el("results");
    const count = el("count");
    if (!list.length) {
      count.textContent = "";
      res.innerHTML = '<div class="empty">No results found</div>';
      return;
    }
    count.textContent = `${list.length} ${label}${list.length === MAX ? " (showing first " + MAX + ")" : ""}`;
    res.innerHTML = list.map((r) => card(r.t, r.sc)).join("");
  }

  function doSearch() {
    if (!READY) return;
    const q = el("q").value.trim().toLowerCase();
    if (!q) return browse();
    const hits = [];
    for (const t of TERMS) {
      const sc = score(t, q);
      if (sc > 0) hits.push({ t, sc });
    }
    hits.sort((a, b) => b.sc - a.sc || a.t.term.localeCompare(b.t.term));
    render(hits.slice(0, MAX), "results");
  }

  /** With no query, show defined terms alphabetically rather than an empty page. */
  function browse() {
    const defined = TERMS.filter((t) => t.kind === "definition" && t.desc);
    render(
      defined.slice(0, MAX).map((t) => ({ t, sc: 1 })),
      `of ${defined.length} defined terms`
    );
  }

  async function init() {
    const res = el("results");
    try {
      const r = await fetch(BUNDLE, { cache: "no-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const bundle = await r.json();
      // Entries flagged `review` are unreviewed machine output with known fabrications;
      // they stay out of the public list until a human clears them.
      TERMS = (bundle.terms || []).filter((t) => !t.review);
      READY = true;
      const sub = document.querySelector(".sub");
      if (sub) {
        sub.textContent =
          `AI Engineering Knowledge Map · ${TERMS.length} terms · instant search`;
      }
      browse();
    } catch (e) {
      res.innerHTML = `<div class="empty">Could not load the glossary (${esc(e.message)})</div>`;
    }
  }

  window.doSearch = doSearch;
  document.addEventListener("DOMContentLoaded", () => {
    const q = el("q");
    if (q) {
      q.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doSearch();
      });
      // instant filtering — the whole corpus is already in memory
      q.addEventListener("input", doSearch);
    }
    init();
  });
})();
