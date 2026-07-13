# SUBPAGES.md — Forest HUB sdforest.site Subpage Index

**Purpose:** Concise per-subpage description of what each page currently is and its production state. Use this to decide what to improve next.
**Last updated:** 2026-06-25
**Production URL:** https://sdforest.site

---

## Forest HUB Landing Page

**Route:** `/`
**Files:** `index.html`
**What it is:** Project card grid / launch surface for the whole site. Each card links to a subpage or external project.
**State:** Live. Visually functional. Carries placeholder cards for projects that don't exist yet (Retail AI, Python Learning Orchestrated pointing to `href="#"`). Not all cards lead to real working pages.
**Next:** Remove or replace placeholder cards; keep every visible card pointing to something real.

---

## Kids Movie Library

**Route:** `/movies/`, `/web/kids-movie-library/`
**Files:** `web/kids-movie-library/index.html`, `app.js`, `styles.css`
**What it is:** Family movie browsing app. 15 curated film recommendations. Filters by theme, tag, Bulgarian audio, status. Watch/rating state stored in localStorage. Built from `D:\projects\ivan-websites\kidsMoviesReport.md`.
**State:** Live and working. Static. No server needed. Best-finished subpage in the repo.
**Next:** Richer filter facets, profiles, safer bulk import if more movies added.

---

## Mendeleev BG — Bulgarian Periodic Table

**Route:** `/web/mendeleev-bg/`
**Files:** `web/mendeleev-bg/index.html` (copied from `ivangegovdve-sudo/mendeleev-bg`)
**What it is:** Interactive periodic table of elements in Bulgarian. Clickable elements show details, compound highlighting.
**State:** Live and working. Static. Source of truth is the `mendeleev-bg` repo; this is a copy.
**Next:** Keep in sync with source repo on updates.

---

## Replicator Void

**Route:** `/web/replicator-void/`
**Files:** `web/replicator-void/index.html`
**What it is:** Native-canvas artificial-life experiment. Replicators seek food, mutate, divide, and die; pointer input bends their field and clicks add nutrients.
**State:** Publicly surfaced as an **Experimental** project with a working dependency-free runtime and accessible controls.
**Next:** Extend the selection and mutation model only after preserving the current lightweight fallback.

---

## Life in Time / Forest Math (Math Mania embed)

**Route:** `/web/math-mania/`
**Files:** `web/math-mania/index.html`
**What it is:** Static page embedding the live Lovable app `https://forest-math-plus.lovable.app` in an iframe. Labeled "Forest Math" / "Math Mania" in the hub.
**State:** Live. Works while the Lovable app at that URL is up. Iframe embed only — no local code for the game.
**Next:** If Lovable app goes down, this page breaks silently. Consider whether to rebuild locally (see Math Forest below).

---

## Math Forest (rebuild placeholder)

**Route:** `/web/math-forest/`
**What it is:** A reserved route intended for a local rebuild of the original Forest Math game. The original app is confirmed gone by Ivan.
**State:** Placeholder only. No working content. Hub card exists but leads to a stub.
**Next:** Ivan to decide: rebuild the game locally under this route, or permanently remove this card and route.

---

## AI Glossary / AI_INIT

**Route:** `/web/ai-init/`, embed at `/web/ai-init/embed/`
**Files:** `web/ai-init/index.html`, `app.js`, `glossary-search.js`, `glossary-data.js`; embed: `embed/index.html`, `embed/embed.js`
**What it is:** AI/IT abbreviation and terminology glossary. Static. Ranked search, library browse by category, click-to-copy `ABBR - Expansion`. Embeddable as a lightweight search widget.
**State:** Live and working. Static checks pass (`lint-glossary.js`). One of the stronger static pages.
**Restoration note:** Task lists this as "being restored" — if functionality or data was recently degraded, verify the search ranking and glossary data are current.
**Next:** Larger dataset, stronger ranking, verify embed works from external pages.

---

## LLM Platforms Map / LLM DB

**Route:** `/web/llm-db/`
**Files:** `web/llm-db/index.html`, `backend/llm_db/api.py`, `backend/llm_db/db.py`
**What it is:** Searchable database of LLM platform docs. Ingest remote documentation sources, search stored documents. SQLite via `data/movies.db` (migration `003_llm_docs.sql`). SSRF protections on fetch.
**State:** Working locally with FastAPI on same origin. NOT wired in production: hardcodes `const API_BASE = '/api/llm-db'` and only works same-origin. In split mode (static on `:8080`, API on `:8000`), this page does not function.
**Restoration note:** Task lists this as "being restored." The backend and UI exist but same-origin wiring is the blocker for production use.
**Next (critical):** Make API_BASE configurable via env or a config endpoint so this page works in production. Decide hosting shape (rewrites vs unified origin).

---

## LLM Council Page

**Route:** Not yet in repo
**What it is:** A new hub subpage for the LLM Council project. Not yet created.
**State:** Planned. To be added to this repo.
**Next:** Create `/web/llm-council/` subpage linking to or embedding the council workflow. Add hub card in `index.html`.

---

## Calendar Generator

**Route:** `/calendar/`, `/web/calendar/`
**Files:** `web/calendar/index.html`, `app.js`, `styles.css`, `assets/pics/`, `NOTICE.md`
**What it is:** Printable yearly calendar generator. Saves settings to localStorage. Local image upload or remote URLs. Public holiday lookup via `https://kayaposoft.com/enrico/json/v1.0/`. Attribution: adapted from CalendarGenerator by Franco Mossotto, Apache 2.0.
**State:** Live and working. Static. Degrades gracefully if holiday API is unavailable.
**Next:** Preset themes, export, save/load templates.

---

## Hyper Trophy OS

**Route:** `/web/hypertrophyos/`
**Files:** `web/hypertrophyos/index.html`
**What it is:** Forest HUB wrapper embedding the live Lovable app `https://hypertrophyos.lovable.app/`. Source has been synced from Lovable to the private GitHub repo `ivangegovdve-sudo/hypertrophyos-40f826ee`.
**State:** Live Lovable embed once deployed. The GitHub source repo is private and connected to Lovable sync on `main`.
**Next:** Decide whether this stays an iframe-backed Lovable app or moves to native SDForest/Vercel hosting after backend env variables are provisioned.

---

## VFX Portfolio

**Route:** Hub card only (external link)
**What it is:** Hub card linking to Ivan's VFX portfolio (`ivangegovdve-sudo/vfxportfolio-ee820969` repo, also at external URL). Not hosted in this repo.
**State:** External card. Whether the link is live depends on the external hosting of the portfolio.
**Next:** Verify the hub card URL is current and the portfolio site is live.

---

## Shared Calendar

**Route:** `/web/shared-calendar/`
**Files:** `web/shared-calendar/index.html`
**What it is:** Local family planning calendar with drag-and-drop activities by day. localStorage key `sharedCalendarActivities`. No backend.
**State:** Working locally. Lightweight utility.
**Next:** Recurring event blocks, print/export, mobile UX improvements.

---

## Dice

**Route:** `/web/dice/`
**Files:** `web/dice/index.html`
**What it is:** Static 3D dice roller. D6 and D12 with animated visuals.
**State:** Live and working. Static.
**Next:** Animation polish, mobile accessibility.

---

## Prompt Builder

**Route:** `/web/prompt-builder/`
**Files:** `web/prompt-builder/index.html`
**What it is:** Stable Diffusion prompt composition tool. Loads presets from `data/presets/newPresets.json`. Optional AUTOMATIC1111 integration for local generation (default `http://127.0.0.1:7860`). Prompt composition works without A1111.
**State:** Working. Static core. A1111 integration local-only.
**Next:** Prompt history, export/import, preset editing, clearer service-health messaging.

---

## Runware Item Icon Generator

**Route:** `/frontend/index.html`
**Files:** `frontend/index.html`, `backend/app.py`, `config/runware-item-icons.json`
**What it is:** Generates item icons via Runware API. Schema loaded from config. FastAPI backend handles key (RUNWARE_API_KEY server-side). POST /api/item-icon.
**State:** Working locally. NOT linked from hub `index.html`. Not in production UI.
**Next:** Add hub card and route, or document as internal-only tool.

---

## Voice Project Dashboard

**Route:** Hub card (external / separate Vercel deployment)
**Files:** `voice-project-dashboard/apps/mobile/` (Expo web app source)
**What it is:** Expo-based dashboard for tracking voice production workflow and deliverables. Source lives in this repo subtree. Deployed separately to Vercel.
**State:** Source present. Deployed separately. Hub card links to external Vercel URL.
**Next:** Confirm external link is current. Decide whether source moves to its own repo.

---

## A1111 Debug Pages

**Routes:** `/web/a1111-debug/`, `/web/debug-a1111/`
**What it is:** Local debug harnesses for AUTOMATIC1111 and ControlNet. Model listing, ControlNet detect, txt2img/img2img test requests.
**State:** Local-only utility. Requires local A1111 instance. Not intended as a public web product.
**Next:** Either keep as local-only (and remove from public hub), or replace with a web-compatible SD interface.
