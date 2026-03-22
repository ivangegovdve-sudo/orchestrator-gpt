# AGENTS.md - Forest HUB Product And Development Guide

Forest HUB is the local command center for your working tools. Treat this repository as a real multi-product surface with a shared product roadmap, not as a scratchpad of disconnected experiments.

## Core Mission

- keep Forest HUB honest, deployed, and useful on `https://sdforest.site`
- make every visible page or card reflect reality
- use this repo as the integration layer for tools that belong together
- extract products into dedicated repos only when they have earned separate ownership
- make web functionality the default target, not local-only success

## Current Product Direction

- Front door:
  `index.html` is the truth surface for what exists and what is still in progress
- Primary production target:
  Vercel deployment at `https://sdforest.site`
- Primary frontend shape:
  static-first pages under `web/`, plus `frontend/index.html`
- Primary backend shape:
  one FastAPI backend under `backend/`
- Primary persistence:
  SQLite and JSON under `data/`
- Product maturity:
  partially mature hub with several working tools, several useful experiments, and a few pages that still need stronger ownership or extraction

## Initial Setup Requirements

- local static server:
  `python -m http.server 8080`
- local API server:
  `python -m uvicorn backend.app:app --reload --port 8000`
- local setup purpose:
  development and validation only; local success is not the end goal
- backend test suite:
  `pytest backend/tests`
- AI_INIT checks:
  `node scratch/tests/lint-glossary.js`
  `node --test scratch/tests/glossary-search.test.js`

## Environments

- local split mode:
  static pages on `http://127.0.0.1:8080`
  FastAPI on `http://127.0.0.1:8000`
- preview / deployment target:
  Vercel previews and production deployment on `https://sdforest.site`
- preferred production shape:
  same-origin or correctly proxied web deployment so all API-backed pages work consistently in production
- external local-service dependencies:
  AUTOMATIC1111, Runware, and any other service-specific APIs should be treated as optional external systems, not assumed always-on

## Shared Dependencies

- Python + FastAPI backend
- SQLite database in `data/movies.db`
- static HTML/CSS/JS for most pages
- JSON data sets under `data/`
- optional external services:
  AUTOMATIC1111
  Runware
  public docs sources
  external portfolio or deployed companion apps

## Backend Stance

- backend required for the repo overall:
  yes
- backend style:
  one pragmatic FastAPI backend with multiple domain APIs, all reachable from the deployed web product
- keep this shape until there is a strong reason to extract a domain
- likely first extraction candidate:
  docs search / LLM database / glossary work into `docsAI`

## Backend Development Plan

1. Keep one trustworthy FastAPI app while the hub is still integration-heavy.
2. Fix cross-origin and same-origin wiring before adding more API-backed pages.
3. Harden and document each existing API before inventing new ones.
4. Add missing UI surfaces for APIs that are useful enough to deserve a card.
5. Extract domains only when they have stable scope, real runtime needs, and a dedicated repo owner.

## Page And Subpage Product Map

### Forest HUB Landing Page

- Paths:
  `index.html`
- Goal:
  the truthful launch surface for the whole local ecosystem
- Current progress:
  visually strong and mostly useful, but still carries some placeholder or cross-repo debt
- Backend need:
  no direct backend
- Next steps:
  remove or replace dead placeholders, surface real tools, keep status copy honest, and prefer real routes over vague cards
- End goal:
  a reliable deployed dashboard on `sdforest.site` where every card leads to a real, web-functioning product

### Prompt Builder

- Paths:
  `web/prompt-builder/index.html`
- Goal:
  compose usable Stable Diffusion prompts from curated data and presets
- Current progress:
  useful static tool with optional A1111 integration
- Dependencies:
  `data/presets/newPresets.json`
  `data/sd_inventory_curated.json`
  optional A1111 API
- Backend need:
  no mandatory backend for core use
- Future plan:
  prompt history, export/import, preset editing, inventory validation, and clearer service-health messaging
- End goal:
  a durable web-usable prompt tool, with any local-only image backend dependency either replaced, proxied, or made explicit

### A1111 Debug Pages

- Paths:
  `web/a1111-debug/index.html`
  `web/debug-a1111/index.html`
- Goal:
  debug and validate local Stable Diffusion / ControlNet flows
- Current progress:
  utility pages, useful but tooling-oriented rather than polished products
- Dependencies:
  local A1111 instance
- Backend need:
  no hub backend, but yes external local SD API
- Future plan:
  standardize output formatting, reduce duplication between the two pages, and keep one honest smoke path for txt2img / img2img / ControlNet
- End goal:
  a clearly owned web-facing diagnostics or admin surface, or else removal from the public hub if it cannot function meaningfully on the web

### Kids Movie Library

- Paths:
  `web/movies/index.html`
  `movies/index.html`
  `backend/movies_api.py`
  `backend/movies_db.py`
- Goal:
  family movie browsing, search, watch tracking, and rating management
- Current progress:
  one of the strongest full-stack tools in the repo
- Backend need:
  yes, FastAPI + SQLite
- Future backend plan:
  keep SQLite for now, improve import resilience, IMDb update safety, and device-aware state rules
- Future product plan:
  stronger facets, profiles, better bulk import UX, safer metadata refresh, and clearer admin flows
- End goal:
  a trustworthy web-accessible family media library with deployed persistence, working search, and safe hosted data updates

### LLM Platforms DB

- Paths:
  `web/llm-db/index.html`
  `backend/llm_db/api.py`
  `backend/llm_db/db.py`
- Goal:
  searchable docs intelligence for LLM platforms and integrations
- Current progress:
  meaningful functionality exists, but long-term ownership probably belongs in `docsAI`
- Backend need:
  yes
- Critical current issue:
  same-origin or configurable API wiring must stay solved before calling it fully reliable
- Future backend plan:
  preserve SSRF protections, improve ingestion jobs, source management, persistence, and document detail quality
- Future product plan:
  migrate long-term ownership into `docsAI` while keeping Forest HUB as the launch surface
- End goal:
  robust hosted docs ingestion and search with safe fetching, structured results, deployed persistence, and clean separation from the hub when mature

### AI_INIT Glossary

- Paths:
  `web/ai-init/index.html`
  `web/ai-init/app.js`
  `web/ai-init/glossary-search.js`
  `web/ai-init/glossary-data.js`
- Subpage:
  `web/ai-init/embed/index.html`
- Goal:
  fast glossary and abbreviation lookup for AI and IT terminology
- Current progress:
  strong static reference tool
- Backend need:
  no today
- Future plan:
  stronger ranking, larger datasets, optional docsAI migration, and better embed customization
- End goal:
  a reusable deployed glossary product with both full-page and embeddable forms that work on the public web

### AI_INIT Embed

- Path:
  `web/ai-init/embed/index.html`
- Goal:
  lightweight embeddable lookup experience independent of the full glossary app
- Current progress:
  working companion surface
- Backend need:
  no today
- Future plan:
  configurable themes, size modes, and cleaner integration docs
- End goal:
  a drop-in widget that can be embedded into other pages or repos and function correctly in deployed environments

### Shared Calendar

- Path:
  `web/shared-calendar/index.html`
- Goal:
  simple local family planning calendar with drag-and-drop activities
- Current progress:
  good local-storage utility
- Backend need:
  no
- Future plan:
  improve reorder UX, recurring blocks, templates, print/export, and better mobile ergonomics
- End goal:
  a small but polished family planning tool that works as a deployed web app, with persistence that survives beyond one browser session if needed

### Calendar Generator

- Paths:
  `web/calendar/index.html`
  `calendar/index.html`
  `calendar/calendario.html`
- Goal:
  printable yearly calendar generation inside Forest HUB
- Current progress:
  integrated and working as a static product
- Dependencies:
  local image assets
  external public holiday service
- Backend need:
  no
- Future plan:
  preset themes, exports, save/load templates, and possibly eventual extraction if it grows beyond a single static tool
- End goal:
  a stable deployed print-ready calendar tool that feels native to the hub and works directly from the web

### Dice

- Path:
  `web/dice/index.html`
- Goal:
  a small polished interactive toy / utility for rolling dice
- Current progress:
  static page with visual interest
- Backend need:
  no
- Future plan:
  refine animations, mobile feel, and accessibility
- End goal:
  a delightful lightweight deployed utility page, not a broken novelty or local-only toy

### Runware Item Icon Generator

- Paths:
  `frontend/index.html`
  `backend/app.py`
  `config/runware-item-icons.json`
- Goal:
  generate item icons through Runware using a hub-managed schema
- Current progress:
  useful but not yet surfaced strongly enough in the hub
- Backend need:
  yes, because the Runware API key must stay server-side
- Future backend plan:
  keep request validation, schema alignment, and provider abstraction clean
- Future product plan:
  expose it from the hub, improve result management, and keep provider failures explicit
- End goal:
  a safe and usable web-facing icon-generation tool with server-side key handling and a working deployed request path

### Voice Project Dashboard Source

- Path:
  `voice-project-dashboard/apps/mobile/`
- Goal:
  track voice-production workflow and deliverables
- Current progress:
  source lives in this repo subtree, deployed separately
- Backend need:
  not necessarily in this repo today
- Future plan:
  either keep it as a clearly separate app with honest external linking, or move it into its own dedicated repo if ownership grows
- End goal:
  a clearly owned companion product, not a mystery subtree

### Jobs API

- Path:
  `backend/jobs_api.py`
- Goal:
  support structured job intake and ranking
- Current progress:
  backend exists without a first-class UI
- Backend need:
  yes, already present
- Future plan:
  either add a real page under `web/` or keep it unlinked from the hub until the user flow exists
- End goal:
  no orphan APIs; every meaningful backend feature should have an honest deployed UI plan and production-ready route

### Placeholder And Cross-Repo Surfaces

- Retail AI:
  do not pretend it is local here if the real ownership belongs in `retailAI`
- Python Learning Orchestrated:
  either link to the dedicated repo honestly or build a real local page
- Clip Mart / VFX Portfolio / Voice Project Dashboard:
  keep cross-repo or external cards explicit and truthful

## How Forest HUB Should Progress

1. Make every current page work as a deployed web experience on `sdforest.site`.
2. Fix serving, API routing, and hosted database truth before adding more cards.
3. Make every existing in-repo page production-usable, not just locally usable.
4. Surface hidden but real tools before inventing new placeholders.
5. Move docs-intelligence ownership to `docsAI` when the extraction is justified.
6. Only then expand the hub with new first-class mini-projects.

## Data And Infrastructure Guardrails

- preserve migrations in `data/migrations/`
- do not replace `data/movies.db` casually
- keep JSON readable and stable
- do not silently weaken LLM DB fetch protections
- do not widen CORS thoughtlessly

## Truthfulness Rules

- no `href="#"` for anything described as functional
- no status text that outruns reality
- no hidden backend dependency without documenting it
- no claiming a page is complete unless its core user flow works locally

## End Goal

Forest HUB should become a dependable deployed web platform on `sdforest.site`, with clearly owned pages, honest cross-repo boundaries, pragmatic hosted backend services, working databases and search where needed, and a roadmap that turns each mini-project into either a real web product or a consciously externalized link.
