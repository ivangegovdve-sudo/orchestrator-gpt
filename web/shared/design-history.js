/* ==================================================================
   Design History — sdforest.site's design eras, previewable in place.

   Every page of the site reads its colours and type from the canonical
   properties and compatibility aliases declared on :root in forest-design.css.
   That makes the whole site re-tintable
   from one place: writing those same properties INLINE on <html> beats
   any stylesheet :root rule, so a historical palette washes over the
   live layout without a rebuild and without touching a line of the
   current design.

   Nothing is persisted — no storage, no URL state. Reloading the page,
   or hitting "Back to current", returns the site to today's dusk-forest.

   Palettes below were recovered from the real commit-era CSS; the
   commit hashes are the milestones each era began at. The long-form
   retrospective, with reconstructed screenshots, lives at /web/evolution/.
   ================================================================== */

(() => {
  "use strict";

  if (window.__forestDesignHistory) return;          // never mount twice
  if (/^\/web\/evolution\/?$/.test(location.pathname)) return;  // the archive itself

  /* ---------------------------------------------------------------- *
   * The eras. `tokens` is the exact set of overrides for that era —
   * an empty object means "this is today, override nothing".
   * ---------------------------------------------------------------- */
  const ERAS = [
    {
      id: "prompt-builder",
      numeral: "I",
      label: "The prompt builder",
      dates: "Dec 2025 — Feb 2026",
      commit: "2e9d036",
      note: "One static page wired to a local Automatic1111 — slate, cyan, and system sans.",
      swatches: ["#020617", "#38bdf8", "#22c55e", "#e5e7eb"],
      tokens: {
        "--forest-bg": "#020617",
        "--forest-bg-deep": "#010309",
        "--forest-surface": "#0b1220",
        "--forest-panel": "rgba(11, 18, 32, .86)",
        "--forest-ink": "#e5e7eb",
        "--forest-soft": "#cbd5e1",
        "--forest-muted": "#9ca3af",
        "--forest-line": "rgba(148, 163, 184, .18)",
        "--forest-amber": "#38bdf8",
        "--forest-moss": "#22c55e",
        "--forest-rose": "#f472b6",
        "--forest-accent": "#38bdf8",
        "--forest-accent-rgb": "56, 189, 248",
        "--forest-glow-amber": "rgba(56, 189, 248, .32)",
        "--forest-glow-moss": "rgba(34, 197, 94, .28)",
        "--forest-display": 'system-ui, "Segoe UI", Roboto, sans-serif',
        "--forest-body": 'system-ui, "Segoe UI", Roboto, sans-serif',
        "--forest-sans": 'system-ui, "Segoe UI", Roboto, sans-serif'
      }
    },
    {
      id: "forest-hub",
      numeral: "II",
      label: "Forest HUB",
      dates: "Mar 2026 — Jun 2026",
      commit: "704faae",
      note: "The rebrand: one tool became a dashboard, under a sky-to-violet gradient wordmark.",
      swatches: ["#09090b", "#0ea5e9", "#8b5cf6", "#f8fafc"],
      tokens: {
        "--forest-bg": "#09090b",
        "--forest-bg-deep": "#050506",
        "--forest-surface": "#131318",
        "--forest-panel": "rgba(19, 19, 24, .88)",
        "--forest-ink": "#f8fafc",
        "--forest-soft": "#e4e4e7",
        "--forest-muted": "#a1a1aa",
        "--forest-line": "rgba(255, 255, 255, .1)",
        "--forest-amber": "#0ea5e9",
        "--forest-moss": "#8b5cf6",
        "--forest-rose": "#f43f5e",
        "--forest-accent": "#0ea5e9",
        "--forest-accent-rgb": "14, 165, 233",
        "--forest-glow-amber": "rgba(14, 165, 233, .32)",
        "--forest-glow-moss": "rgba(139, 92, 246, .3)",
        "--forest-display": 'Inter, "Segoe UI", system-ui, sans-serif',
        "--forest-body": 'Inter, "Segoe UI", system-ui, sans-serif',
        "--forest-sans": 'Inter, "Segoe UI", system-ui, sans-serif'
      }
    },
    {
      id: "constellation",
      numeral: "III",
      label: "The constellation",
      dates: "21 Jun 2026 — 14 Jul 2026",
      commit: "e41b4c7",
      note: "A live plexus behind everything, Space Grotesk on black, per-colour portal cards.",
      swatches: ["#07070b", "#56c7ff", "#5eead4", "#b69bff"],
      tokens: {
        "--forest-bg": "#07070b",
        "--forest-bg-deep": "#030305",
        "--forest-surface": "#101018",
        "--forest-panel": "rgba(16, 16, 24, .88)",
        "--forest-ink": "#f4f5f7",
        "--forest-soft": "#c8cddb",
        "--forest-muted": "#8a90a0",
        "--forest-line": "rgba(255, 255, 255, .08)",
        "--forest-amber": "#56c7ff",
        "--forest-moss": "#5eead4",
        "--forest-rose": "#ff87b3",
        "--forest-accent": "#56c7ff",
        "--forest-accent-rgb": "86, 199, 255",
        "--forest-glow-amber": "rgba(86, 199, 255, .32)",
        "--forest-glow-moss": "rgba(94, 234, 212, .28)",
        "--forest-display": '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
        "--forest-body": 'Inter, "Segoe UI", system-ui, sans-serif',
        "--forest-sans": 'Inter, "Segoe UI", system-ui, sans-serif'
      }
    },
    {
      id: "forest-of-light",
      numeral: "IV",
      label: "Forest of light",
      dates: "14 Jul 2026 — 23 Jul 2026",
      commit: "29d9c8f",
      note: "Renamed SDForest. A WebGL forest of drifting light; projects became scattered portals.",
      swatches: ["#060a09", "#7ee2ff", "#a282ff", "#ffd15a"],
      tokens: {
        "--forest-bg": "#060a09",
        "--forest-bg-deep": "#030605",
        "--forest-surface": "#0c1310",
        "--forest-panel": "rgba(12, 19, 16, .88)",
        "--forest-ink": "#eaf3ea",
        "--forest-soft": "#c2d3c4",
        "--forest-muted": "#8ba392",
        "--forest-line": "rgba(226, 235, 209, .12)",
        "--forest-amber": "#7ee2ff",
        "--forest-moss": "#a282ff",
        "--forest-rose": "#ff745c",
        "--forest-accent": "#7ee2ff",
        "--forest-accent-rgb": "126, 226, 255",
        "--forest-glow-amber": "rgba(126, 226, 255, .32)",
        "--forest-glow-moss": "rgba(162, 130, 255, .28)",
        "--forest-display": '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
        "--forest-body": 'Inter, "Segoe UI", system-ui, sans-serif',
        "--forest-sans": 'Inter, "Segoe UI", system-ui, sans-serif'
      }
    },
    {
      id: "dusk-forest",
      numeral: "V",
      label: "The dusk-forest jewel",
      dates: "23 Jul 2026 — 25 Jul 2026",
      commit: "db3a5ee",
      note: "Editorial serif sitewide, dawn amber on near-black green, film grain over everything.",
      swatches: ["#070a08", "#e8b86b", "#8fe6ae", "#f2efe4"],
      tokens: {
        "--forest-bg": "#070a08",
        "--forest-bg-deep": "#04070a",
        "--forest-surface": "#0d120e",
        "--forest-panel": "rgba(9, 14, 10, .8)",
        "--forest-ink": "#f2efe4",
        "--forest-soft": "#bcc6b4",
        "--forest-muted": "#7d8877",
        "--forest-line": "rgba(226, 235, 209, .13)",
        "--forest-amber": "#e8b86b",
        "--forest-moss": "#8fe6ae",
        "--forest-rose": "#d98a7f",
        "--forest-accent": "#8fe6ae",
        "--forest-accent-rgb": "143, 230, 174",
        "--forest-glow-amber": "rgba(232, 184, 107, .32)",
        "--forest-glow-moss": "rgba(143, 230, 174, .28)",
        "--forest-display": '"Cormorant Garamond", "Iowan Old Style", Georgia, serif',
        "--forest-body": 'Alegreya, "Iowan Old Style", Georgia, serif',
        "--forest-sans": '"Alegreya Sans", "Gill Sans", "Segoe UI", system-ui, sans-serif'
      }
    },
    {
      id: "hub-foundation",
      numeral: "VI",
      label: "Forest HUB foundation",
      dates: "25 Jul 2026 — today",
      commit: "2f533e8",
      note: "The jewel's motion kept, its palette unified onto the shared indigo token set.",
      swatches: ["#07070b", "#4f46e5", "#22c55e", "#f3f4f6"],
      current: true,
      tokens: {}
    }
  ];

  const CURRENT = ERAS.find((era) => era.current) || ERAS[ERAS.length - 1];

  /* Every era writes canonical primitives plus the compatibility aliases.
     This keeps historical previews coherent while the stylesheets keep one
     source of truth in forest-design.css. */
  const ALIASES = {
    "--theme-shell-bg": "--forest-bg",
    "--theme-shell-bg-deep": "--forest-bg-deep",
    "--theme-shell-surface": "--forest-surface",
    "--theme-shell-panel": "--forest-panel",
    "--theme-shell-ink": "--forest-ink",
    "--theme-shell-soft": "--forest-soft",
    "--theme-shell-muted": "--forest-muted",
    "--theme-shell-line": "--forest-line",
    "--theme-shell-amber": "--forest-amber",
    "--theme-shell-moss": "--forest-moss",
    "--theme-shell-rose": "--forest-rose",
    "--theme-shell-accent": "--forest-accent",
    "--theme-shell-accent-rgb": "--forest-accent-rgb",
    "--theme-shell-glow-amber": "--forest-glow-amber",
    "--theme-shell-glow-moss": "--forest-glow-moss",
    "--theme-shell-display": "--forest-display",
    "--theme-shell-body": "--forest-body",
    "--theme-shell-sans": "--forest-sans",
    "--theme-ui-bg": "--forest-bg",
    "--theme-ui-surface": "--forest-surface",
    "--theme-ui-border": "--forest-line",
    "--theme-ui-text-primary": "--forest-ink",
    "--theme-ui-text-muted": "--forest-muted",
    "--theme-ui-accent": "--forest-amber",
    "--theme-ui-accent-green": "--forest-moss",
    "--theme-ui-font": "--forest-sans",
    "--theme-home-bg": "--forest-bg",
    "--theme-home-surface": "--forest-surface",
    "--theme-home-ink": "--forest-ink",
    "--theme-home-soft": "--forest-soft",
    "--theme-home-muted": "--forest-muted",
    "--theme-home-line": "--forest-line",
    "--theme-home-amber": "--forest-amber",
    "--theme-home-moss": "--forest-moss",
    "--theme-home-display": "--forest-display",
    "--theme-home-body": "--forest-body",
    "--theme-home-sans": "--forest-sans",
    "--home-bg": "--forest-bg",
    "--home-surface": "--forest-surface",
    "--home-ink": "--forest-ink",
    "--home-soft": "--forest-soft",
    "--home-muted": "--forest-muted",
    "--home-line": "--forest-line",
    "--home-amber": "--forest-amber",
    "--home-moss": "--forest-moss",
    "--bg": "--forest-bg",
    "--surface": "--forest-surface",
    "--border": "--forest-line",
    "--text-primary": "--forest-ink",
    "--text-muted": "--forest-muted",
    "--accent": "--forest-amber",
    "--accent-green": "--forest-moss",
    "--font": "--forest-sans"
  };

  function withAliases(tokens) {
    const out = { ...tokens };
    if (!Object.keys(tokens).length) return out;      // "current" overrides nothing
    Object.entries(ALIASES).forEach(([alias, source]) => {
      if (tokens[source]) out[alias] = tokens[source];
    });
    return out;
  }

  ERAS.forEach((era) => { era.applied = withAliases(era.tokens); });

  /* Union of every property any era touches — reset removes all of them,
     so switching era A → era B can never leave A's leftovers behind. */
  const ALL_PROPS = [...new Set(ERAS.flatMap((era) => Object.keys(era.applied)))];

  const root = document.documentElement;
  let activeId = CURRENT.id;

  /* ---------------------------------------------------------------- *
   * Markup
   * ---------------------------------------------------------------- */
  const host = document.createElement("div");
  host.className = "dh-root";

  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "dh-tab";
  tab.setAttribute("aria-expanded", "false");
  tab.setAttribute("aria-controls", "dh-drawer");
  tab.innerHTML =
    '<svg class="dh-rings" viewBox="0 0 12 12" aria-hidden="true">' +
    '<circle cx="6" cy="6" r="1.4"/><circle cx="6" cy="6" r="3.6"/><circle cx="6" cy="6" r="5.3"/>' +
    "</svg><span>Design history</span>";

  const drawer = document.createElement("div");
  drawer.className = "dh-drawer";
  drawer.id = "dh-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "false");
  drawer.setAttribute("aria-label", "Design history");

  drawer.innerHTML =
    '<div class="dh-head">' +
      "<div>" +
        '<h2 class="dh-title">Design <em>history</em></h2>' +
        '<p class="dh-sub">Six eras · since Dec 2025</p>' +
      "</div>" +
      '<button type="button" class="dh-close" aria-label="Close design history">&#10005;</button>' +
    "</div>" +
    '<ul class="dh-list"></ul>' +
    '<div class="dh-foot">' +
      '<button type="button" class="dh-reset" hidden>&#8592; Back to current</button>' +
      '<a class="dh-archive" href="/web/evolution/">Read the full retrospective &#8594;</a>' +
      '<p class="dh-hint">A preview only — colours and type, applied in memory. Reload to reset.</p>' +
    "</div>";

  const list = drawer.querySelector(".dh-list");
  const resetBtn = drawer.querySelector(".dh-reset");
  const closeBtn = drawer.querySelector(".dh-close");

  const buttons = new Map();
  ERAS.forEach((era) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dh-era";
    btn.style.setProperty("--dh-era-accent", era.swatches[1]);
    btn.setAttribute("aria-pressed", String(era.id === activeId));
    btn.innerHTML =
      '<span class="dh-era-top">' +
        '<span class="dh-era-numeral">' + era.numeral + "</span>" +
        '<span class="dh-era-name">' + era.label + "</span>" +
        (era.current ? '<span class="dh-current-pill">Live</span>' : "") +
      "</span>" +
      '<span class="dh-era-dates">' + era.dates +
        ' <code class="dh-era-commit">' + era.commit + "</code></span>" +
      '<span class="dh-era-note">' + era.note + "</span>" +
      '<span class="dh-swatches">' +
        era.swatches
          .map((c) => '<span class="dh-swatch" style="background:' + c + '"></span>')
          .join("") +
      "</span>";
    btn.addEventListener("click", () => apply(era.id));
    buttons.set(era.id, btn);
    li.appendChild(btn);
    list.appendChild(li);
  });

  const banner = document.createElement("div");
  banner.className = "dh-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML =
    '<span>Previewing <b class="dh-banner-name"></b></span>' +
    '<button type="button">Back to current</button>';
  const bannerName = banner.querySelector(".dh-banner-name");
  banner.querySelector("button").addEventListener("click", () => apply(CURRENT.id));

  host.append(tab, drawer, banner);

  /* ---------------------------------------------------------------- *
   * Behaviour
   * ---------------------------------------------------------------- */
  function apply(id) {
    const era = ERAS.find((e) => e.id === id) || CURRENT;
    activeId = era.id;

    ALL_PROPS.forEach((prop) => root.style.removeProperty(prop));
    Object.entries(era.applied).forEach(([prop, value]) => root.style.setProperty(prop, value));

    const previewing = !era.current;
    host.classList.toggle("is-previewing", previewing);
    resetBtn.hidden = !previewing;
    bannerName.textContent = era.label;
    buttons.forEach((btn, key) => btn.setAttribute("aria-pressed", String(key === activeId)));
  }

  function open() {
    host.classList.add("is-open");
    tab.setAttribute("aria-expanded", "true");
    closeBtn.focus();
  }

  function close() {
    host.classList.remove("is-open");
    tab.setAttribute("aria-expanded", "false");
    tab.focus();
  }

  tab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  resetBtn.addEventListener("click", () => apply(CURRENT.id));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && host.classList.contains("is-open")) close();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!host.classList.contains("is-open")) return;
    if (!drawer.contains(event.target) && event.target !== tab && !tab.contains(event.target)) close();
  });

  (document.body || document.documentElement).appendChild(host);

  window.__forestDesignHistory = { eras: ERAS, apply, open, close, reset: () => apply(CURRENT.id) };
})();
