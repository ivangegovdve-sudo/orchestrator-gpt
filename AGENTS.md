# AGENTS.md - Working Guide For Forest HUB

This repository is a multi-tool web dashboard. Agents should treat it as a real product surface, not a loose scratchpad. The goal is to keep the hub usable and to turn every visible mini-project into a genuinely working page.

## Mission

Build and maintain a fully functional Forest HUB:

- the landing page at `index.html`
- the in-repo mini-projects under `web/`
- the Python backend under `backend/`
- the shared data/config that makes those pages work

Do not optimize for mockups or placeholder polish. Optimize for working routes, working APIs, and honest status.

## Current repo shape

- `index.html`
  main dashboard / project grid
- `web/`
  mini-project entry points
- `movies/index.html`
  redirect route to `/web/movies/`
- `frontend/index.html`
  standalone Runware demo page
- `backend/`
  FastAPI app and API modules
- `data/`
  SQLite DB, migrations, presets, curated inventory
- `config/runware-item-icons.json`
  Runware schema/config for item-icon generation

This repo uses static HTML/CSS/JS by default. Do not add a frontend framework, bundler, or build pipeline unless the user explicitly asks for one.

## Primary rule

Never describe a project as functional unless you can actually run it in its required local mode and confirm its core user actions work.

That means:

- no dead dashboard links
- no `href="#"` for anything presented as a finished tool
- no UI that loads but cannot reach its API
- no claiming completion while the page still depends on a missing local service without documenting that dependency

## Allowed edit zones

Agents may freely work in:

- `index.html`
- `movies/`
- `web/**`
- `frontend/**`
- `backend/**`
- `data/**`
- `config/runware-item-icons.json`
- `README.md`
- `AGENTS.md`
- `docs/**`
- `scratch/**`

Use extra caution with:

- `data/sd_inventory.json`
  very large; do not rewrite wholesale unless the task specifically requires it
- `data/movies.db`
  binary SQLite DB; prefer API- or migration-driven changes over manual replacement

Avoid changing these unless the user asks:

- `scripts/**`
- `*.bat`
- `*.ps1`

## Runtime assumptions

### Static server

Default local static origin:

- `http://127.0.0.1:8080`

Recommended quick command from repo root:

```powershell
python -m http.server 8080
```

### FastAPI

Default API origin:

- `http://127.0.0.1:8000`

Recommended quick command:

```powershell
python -m uvicorn backend.app:app --reload --port 8000
```

### Important CORS note

`backend/app.py` currently allows browser CORS for:

- `http://localhost:8080`
- `http://127.0.0.1:8080`

If you change the static port or move to a different local origin, update CORS intentionally and keep it tight.

### Same-origin note

`web/llm-db/index.html` currently hardcodes:

```js
const API_BASE = '/api/llm-db';
```

So the dashboard is not fully unified in split mode. If the task is to make the whole site work end-to-end, solve one of these first:

1. serve static pages and FastAPI from the same origin
2. make the LLM DB UI configurable like Movies
3. place a local reverse proxy in front of both layers

Do not ignore this and then claim the whole dashboard is functional.

## Project map and definitions of done

### Forest HUB

- Path: `index.html`
- Type: static landing page
- Done when:
  - every visible card resolves to a working destination
  - internal routes use the correct paths
  - placeholder cards are either replaced or clearly marked as not functional
  - project status text reflects reality

### Prompt Builder

- Path: `web/prompt-builder/index.html`
- Type: static tool with optional external SD integration
- Inputs:
  - `data/presets/newPresets.json`
  - `data/sd_inventory_curated.json`
- External dependency:
  - AUTOMATIC1111 API, usually `http://127.0.0.1:7860`
- Done when:
  - prompt composition works without the backend
  - preset load failure degrades gracefully
  - A1111 actions work when the external service is available
  - missing A1111 service yields a clear error, not a broken UI

### A1111 Debug Harnesses

- Paths:
  - `web/a1111-debug/index.html`
  - `web/debug-a1111/index.html`
- Type: static debug tools for local SD APIs
- Done when:
  - model listing works
  - ControlNet test path works
  - txt2img or img2img smoke path works
  - debug output is readable

### Kids Movie Library

- Paths:
  - `web/movies/index.html`
  - `web/movies/app.js`
  - `movies/index.html`
  - `backend/movies_api.py`
  - `backend/movies_db.py`
- Type: static + FastAPI + SQLite
- Done when:
  - search works
  - facets load
  - add movie works
  - bulk import works
  - watched state persists
  - ratings persist by device
  - IMDb update works or fails safely without data loss

### LLM Platforms DB

- Paths:
  - `web/llm-db/index.html`
  - `backend/llm_db/api.py`
  - `backend/llm_db/db.py`
- Type: API-backed docs ingestion/search UI
- Done when:
  - sources list loads
  - ingestion starts and persists data
  - doc search works
  - doc detail loads
  - the SSRF protections in the backend remain intact
  - same-origin or configurable API wiring is solved

### AI_INIT Glossary

- Paths:
  - `web/ai-init/index.html`
  - `web/ai-init/app.js`
  - `web/ai-init/glossary-search.js`
  - `web/ai-init/glossary-data.js`
  - `web/ai-init/embed/index.html`
  - `web/ai-init/embed/embed.js`
- Type: static searchable reference app
- Done when:
  - home search is fast and ranked
  - library browsing works
  - copy-to-clipboard works
  - embed page works independently

### Shared Calendar

- Path: `web/shared-calendar/index.html`
- Type: static localStorage app
- Done when:
  - create/edit/delete works
  - drag/drop reorder works
  - state persists after reload

### Dice

- Path: `web/dice/index.html`
- Type: static visual toy/app
- Done when:
  - D6 and D12 controls respond
  - animations render properly
  - mobile layout still works

### Runware Item Icon Generator

- Paths:
  - `frontend/index.html`
  - `backend/app.py`
  - `config/runware-item-icons.json`
- Type: static page + FastAPI + external Runware service
- Required env:
  - `RUNWARE_API_KEY`
- Done when:
  - `POST /api/item-icon` succeeds
  - schema/config still matches UI expectations
  - the page renders the generated result

### Jobs API

- Path: `backend/jobs_api.py`
- Type: API only right now
- Rule:
  - if you expose this in the dashboard, add a real page under `web/<slug>/` and link it from the hub

## Placeholder and external cards

Current dashboard cards are not all equal:

- `VFX Portfolio`
  external site
- `Clip Mart`
  external GitHub repo
- `Retail AI`
  placeholder in `index.html`
- `Python Learning Orchestrated`
  placeholder in `index.html`

Agent rules for placeholder cards:

- do not leave `href="#"` on anything you are calling complete
- do not fabricate external project functionality that does not exist in this repo
- if the user wants these built here, create a real mini-project under `web/<slug>/` and wire it in
- if the source belongs in another repo, say so clearly and avoid pretending it is local

## Recommended implementation order for "make the whole website functional"

1. Fix serving and API wiring first.
   This usually means same-origin serving or configurable API bases.
2. Remove or replace dead dashboard links.
3. Verify every in-repo tool with its core user flow.
4. Add missing project pages only after the existing routes are truthful.
5. Improve visuals last, not first.

## Verification expectations

### Backend

Run:

```powershell
pytest backend/tests
```

These tests cover:

- movies DB and API
- IMDb parsing helpers
- jobs API scoring
- LLM DB SSRF/safe-fetch protections

### AI_INIT

Run:

```powershell
node scratch/tests/lint-glossary.js
node --test scratch/tests/glossary-search.test.js
```

Optional browser smoke test:

```powershell
cd scratch/tests
npm install
npx playwright install
cd ../..
node scratch/tests/glossary-e2e.mjs
```

### Manual smoke tests

Agents should manually verify the target page in a browser when changing UI or integration code.

At minimum, check:

- page loads without console errors
- main CTA or user flow works
- back-to-hub navigation works where appropriate
- reload behavior is sane for localStorage-backed tools

## Data rules

- Preserve migrations in `data/migrations/`.
- Prefer additive migrations over destructive DB surgery.
- Do not overwrite `data/movies.db` just to "fix" content unless the user explicitly wants a DB replacement.
- Keep JSON data human-readable and stable.

## UI rules

- Keep the repo static-first.
- Prefer one HTML entry file per mini-project at `web/<slug>/index.html`.
- Add sibling JS/CSS files only when they improve clarity.
- Preserve the established visual language unless the user asks for a redesign.
- Make desktop and mobile both work before considering the task complete.

## When adding a new mini-project

Use this structure:

- `web/<slug>/index.html`
- optional `web/<slug>/app.js`
- optional `web/<slug>/styles.css`
- optional `data/<slug>/...` if the page needs local data

Then:

1. add a real card to `index.html`
2. make the route reachable directly
3. document runtime needs in `README.md`
4. verify the page locally

## Known gaps to keep in mind

- `web/llm-db/index.html` is same-origin only
- `index.html` still contains placeholder cards
- `frontend/index.html` is not surfaced in the main dashboard
- `backend/jobs_api.py` has no UI yet
- there is no locked Python dependency manifest yet

Treat these as active product debt, not hidden assumptions.
