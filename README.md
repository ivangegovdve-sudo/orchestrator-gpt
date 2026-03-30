# Forest HUB / orchestrator-gpt

This repository is a static web dashboard plus a small FastAPI backend. It hosts the Forest HUB landing page, several self-contained mini-projects under `web/`, and API-backed tools such as the movie library and the LLM docs database.

The repo is not a packaged frontend app with a build step. Most pages are plain HTML, CSS, and JavaScript. The backend is Python + FastAPI + SQLite.

## What lives here

- `index.html`
  Forest HUB landing page and project card grid.
- `web/prompt-builder/`
  Stable Diffusion prompt builder with optional AUTOMATIC1111 integration.
- `web/a1111-debug/` and `web/debug-a1111/`
  Local debug harnesses for AUTOMATIC1111 + ControlNet.
- `web/movies/`
  Kids Movie Library UI.
- `movies/index.html`
  Redirect shim to `/web/movies/`.
- `web/llm-db/`
  LLM Platforms DB UI.
- `web/ai-init/`
  AI/IT glossary app plus embeddable search.
- `web/calendar/`
  Printable calendar generator adapted from CalendarGenerator, with local saved settings and holiday lookup.
- `calendar/index.html`
  Redirect shim to `/web/calendar/`.
- `web/shared-calendar/`
  Local-only shared calendar.
- `web/dice/`
  Static 3D dice roller.
- `frontend/index.html`
  Standalone Runware item-icon generator demo.
- `voice-project-dashboard/apps/mobile/`
  Expo-based Voice Project Dashboard source deployed separately to Vercel.
- `backend/`
  FastAPI app, movies API, jobs API, LLM DB API, SQLite helpers, and tests.
- `data/`
  SQLite database, migrations, preset JSON, and curated inventory data.

## Current architecture

There are two runtime layers:

1. Static pages
   Served from the repo root with any static file server.
2. FastAPI
   Serves `/api/movies`, `/api/llm-db`, `/jobs`, `/health`, `/api/schema`, and `/api/item-icon`.

Important local-dev detail:

- `web/movies/` can talk to a separate backend because it has a configurable API base.
- `web/llm-db/` currently assumes same-origin requests to `/api/llm-db`.
- `backend/app.py` only allows browser CORS from `http://localhost:8080` and `http://127.0.0.1:8080`.

Because of that, split-server mode works for most pages, but a truly "everything works" local setup needs either:

- same-origin serving for static files and FastAPI, or
- a code change to make `web/llm-db/` use a configurable API base like Movies.

## Quick start

### 1. Create a Python environment

PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn pydantic pytest httpx
```

Notes:

- This repo does not currently ship a locked `requirements.txt` or `pyproject.toml`.
- The backend uses the standard library for SQLite and URL fetching.
- `pytest` and `httpx` are needed for the existing backend tests.

### 2. Start the backend

```powershell
python -m uvicorn backend.app:app --reload --port 8000
```

The backend auto-applies migrations in `data/migrations/` and initializes `data/movies.db`.

### 3. Start a static server

In a second terminal from the repo root:

```powershell
python -m http.server 8080
```

Open:

- Hub: `http://127.0.0.1:8080/index.html`
- Calendar Generator: `http://127.0.0.1:8080/calendar/`
- Movies: `http://127.0.0.1:8080/movies/`
- Prompt Builder: `http://127.0.0.1:8080/web/prompt-builder/`
- AI_INIT: `http://127.0.0.1:8080/web/ai-init/`

Do not use `file://` for these pages. Several tools rely on fetch, clipboard, localStorage, or CORS and need a real local server.

## Local development modes

### Split mode

Use this when you want quick local iteration:

- static files on `http://127.0.0.1:8080`
- FastAPI on `http://127.0.0.1:8000`

This is the expected mode for:

- hub
- AI_INIT
- shared calendar
- dice
- prompt builder static features
- A1111 debug pages
- movies
- frontend item-icon demo
- voice-project-dashboard source app

### Same-origin mode

Use this when you want the entire dashboard to be fully functional behind one origin.

Recommended approach for future work:

- serve `index.html`, `movies/`, `web/**`, `frontend/**`, `data/**`, and `/api/**` from the same origin, preferably `http://127.0.0.1:8000`

This is the cleanest path for:

- `web/llm-db/`, which currently hardcodes `const API_BASE = '/api/llm-db'`

If you keep split mode, make `web/llm-db/` configurable before calling the dashboard fully functional.

## Mini-project run instructions

### Forest HUB

- Route: `/index.html`
- Files: `index.html`
- Runtime: static only
- Done when:
  - every visible in-repo tile opens a working destination
  - no dead production links remain as `href="#"`
  - titles, status text, and routes match the real project state

### Prompt Builder

- Route: `/web/prompt-builder/`
- Files: `web/prompt-builder/index.html`
- Runtime: static only for prompt composition, optional A1111 for generation
- Reads:
  - `data/presets/newPresets.json`
  - `data/sd_inventory_curated.json` (optional enhancement)
- External dependency for generation:
  - AUTOMATIC1111 WebUI with API enabled, usually `http://127.0.0.1:7860`
- Expected A1111 startup flags:
  - `--api`
  - CORS enabled for your local page origin if needed
- Done when:
  - presets load if the JSON file exists
  - manual mode still works if preset files fail to load
  - A1111 health/model checks work when the local SD server is available
  - txt2img or img2img requests succeed when configured

### A1111 Debug pages

- Routes:
  - `/web/a1111-debug/index.html`
  - `/web/debug-a1111/index.html`
- Runtime: static only, requires external A1111 API to do useful work
- Default external API base:
  - `http://127.0.0.1:7860`
- Done when:
  - model listing works
  - ControlNet detect works with an uploaded image
  - txt2img or img2img test requests return an image
  - failures show useful debug output instead of silent breakage

### Kids Movie Library

- Routes:
  - `/movies/`
  - `/web/movies/`
- Files:
  - `web/movies/index.html`
  - `web/movies/app.js`
  - `web/movies/styles.css`
  - `backend/movies_api.py`
  - `backend/movies_db.py`
- Runtime:
  - static page on `8080`
  - FastAPI on `8000`
- API base:
  - configurable in the UI and stored in localStorage
- Database:
  - `data/movies.db`
- Migrations:
  - `data/migrations/001_movies.sql`
  - `data/migrations/002_movies_imdb_fields.sql`
  - `data/migrations/003_llm_docs.sql`
- Seed helper:
  - `python backend/seed_movies.py`
- Done when:
  - search works
  - add movie works
  - bulk import works
  - watched toggle persists
  - per-device ratings persist
  - IMDb refresh works without breaking existing data on failures

### LLM Platforms DB

- Route: `/web/llm-db/index.html`
- Files:
  - `web/llm-db/index.html`
  - `backend/llm_db/api.py`
  - `backend/llm_db/db.py`
- Runtime:
  - FastAPI required
  - currently expects same-origin `/api/llm-db`
- Database tables:
  - stored in `data/movies.db` via migration `003_llm_docs.sql`
- Ingestion behavior:
  - fetches remote `http` and `https` content only
  - blocks local/private IP targets and unsafe redirects
- Done when:
  - source ingest works
  - source list loads
  - document search works
  - document detail expansion works
  - unsafe URLs remain blocked
- Important:
  - if served from `8080` while API stays on `8000`, this page is not fully wired yet

### AI_INIT Glossary

- Routes:
  - `/web/ai-init/`
  - `/web/ai-init/embed/`
- Files:
  - `web/ai-init/index.html`
  - `web/ai-init/app.js`
  - `web/ai-init/glossary-search.js`
  - `web/ai-init/glossary-data.js`
  - `web/ai-init/embed/index.html`
  - `web/ai-init/embed/embed.js`
- Runtime: static only
- Done when:
  - home search returns ranked results
  - library view opens and browses categories
  - clicking entries copies `ABBR - Expansion`
  - embed view works as a lightweight search surface

### Calendar Generator

- Routes:
  - `/calendar/`
  - `/web/calendar/`
- Files:
  - `web/calendar/index.html`
  - `web/calendar/app.js`
  - `web/calendar/styles.css`
  - `web/calendar/assets/pics/`
  - `web/calendar/NOTICE.md`
- Runtime: static only
- External dependency:
  - public holiday lookup from `https://kayaposoft.com/enrico/json/v1.0/`
- Behavior:
  - stores settings in localStorage
  - supports local sample images or remote image URLs
  - remains printable even if the holiday API is unavailable
- Attribution:
  - adapted from `CalendarGenerator` by Franco Mossotto under Apache 2.0

### Shared Calendar

- Route: `/web/shared-calendar/`
- Files: `web/shared-calendar/index.html`
- Runtime: static only
- Storage:
  - localStorage key `sharedCalendarActivities`
- Done when:
  - add/edit/delete works
  - drag and drop between days works
  - data persists across reloads

### Dice

- Route: `/web/dice/`
- Files: `web/dice/index.html`
- Runtime: static only
- Done when:
  - roll controls work
  - D6 and D12 visuals animate correctly
  - layout works on desktop and mobile

### Voice Project Dashboard

- Hub entry:
  - external card in `index.html`
- Source:
  - `voice-project-dashboard/apps/mobile/`
- Runtime:
  - Expo web app, deployed separately to Vercel
  - local edits persist in browser storage
- Local commands:

```powershell
cd voice-project-dashboard/apps/mobile
npm ci
npm run web
```

- Build command:

```powershell
cd voice-project-dashboard/apps/mobile
npm run build:web
```

- Done when:
  - search and stage filters work
  - task and deliverable toggles update project progress
  - producer notes persist after reload
  - the live Vercel deployment opens from the Forest HUB card

### Runware Item Icon Generator

- Route:
  - standalone page at `frontend/index.html`
- Files:
  - `frontend/index.html`
  - `backend/app.py`
  - `config/runware-item-icons.json`
- Runtime:
  - static page
  - FastAPI on `8000`
  - `RUNWARE_API_KEY` must be set
- Env:

```powershell
$env:RUNWARE_API_KEY="your-key"
python -m uvicorn backend.app:app --reload --port 8000
```

- API endpoint:
  - `POST /api/item-icon`
- Done when:
  - schema loads from config
  - request validates
  - Runware preprocess + inference return an image URL
  - the UI shows the returned image

### Jobs API

- API only right now, no dashboard page yet
- Files:
  - `backend/jobs_api.py`
- Routes:
  - `POST /jobs/intake`
  - `GET /jobs`
  - `GET /jobs/top`
  - `GET /jobs/{job_id}`
  - `POST /jobs/{job_id}/status`
  - `DELETE /jobs/{job_id}`
- If you build a UI for this, add it as a real mini-project under `web/<slug>/` and link it from the hub

## External links and placeholders

The current hub also contains:

- `VFX Portfolio`
  external link
- `Clip Mart`
  external GitHub link
- `Retail AI`
  placeholder card right now
- `Python Learning Orchestrated`
  placeholder card right now

Do not call the hub complete while placeholder cards still point to `#`. Either:

- replace them with real working pages in this repo, or
- keep them explicitly labeled as placeholders and do not represent them as functional

## Useful files

- Backend app: `backend/app.py`
- Movies API: `backend/movies_api.py`
- LLM DB API: `backend/llm_db/api.py`
- Movie DB helpers: `backend/movies_db.py`
- Prompt Builder presets: `data/presets/newPresets.json`
- Curated SD inventory: `data/sd_inventory_curated.json`
- Runware config: `config/runware-item-icons.json`

## Verification

### Python backend tests

```powershell
pytest backend/tests
```

### AI_INIT lightweight checks

Static checks:

```powershell
node scratch/tests/lint-glossary.js
node --test scratch/tests/glossary-search.test.js
```

Optional Playwright smoke test:

```powershell
cd scratch/tests
npm install
npx playwright install
cd ../..
node scratch/tests/glossary-e2e.mjs
```

## Current gaps agents should know about

- `web/llm-db/` is same-origin only right now.
- `index.html` still contains placeholder cards.
- `frontend/index.html` is functional as a standalone page but is not linked from the main hub.
- There is no locked Python dependency file yet.

If the goal is "make the whole site functional," the first high-value task is to unify static + API serving or make every API-backed page configurable enough to work in split mode.

## Composio Gmail agent example

A sanitized example script is available at `scratch/composio_email_manager_example.py`.

Set these environment variables before running it:

- `COMPOSIO_API_KEY`
- `COMPOSIO_EXTERNAL_USER_ID`
- `COMPOSIO_TEST_RECIPIENT`

Run:

```bash
python scratch/composio_email_manager_example.py
```

Optional overrides:

```bash
python scratch/composio_email_manager_example.py \
  --recipient "someone@example.com" \
  --subject "Hello from Composio" \
  --body "This is a test email!"
```

### OpenRouter realism notes

Using OpenRouter models for strict tool-heavy agent flows is possible in some setups, but reliability depends on model support for structured tool calling and schema fidelity. For trusted automation (like sending email), keep a model/provider path that is proven to follow tool schemas deterministically, and use OpenRouter models only after validating behavior under your exact tool contract.
