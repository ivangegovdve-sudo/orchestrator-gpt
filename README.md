# Forest HUB — sdforest.site

Forest HUB is a static web dashboard plus a small FastAPI backend. It hosts the landing page at [sdforest.site](https://sdforest.site) and a collection of self-contained mini-projects under `web/` — reference tools, kids' games, poetry pages, and scroll-driven stories.

Most pages are plain HTML, CSS, and JavaScript with no build step. The backend is Python + FastAPI + SQLite.

## Live deployment

| Layer | Where | Notes |
|---|---|---|
| Static site | Vercel → [sdforest.site](https://sdforest.site) | `npm run vercel-build` runs `build-vercel-static.cjs`, which assembles `vercel-public/` |
| Backend API | VPS — `http://187.127.86.176:8001` | systemd unit `forest-hub.service`; health check at `/health` |
| API domain | `api.sdforest.site` | DNS lives at Vercel; pending A-record update + TLS before HTTPS works |

The landing page footer shows a live API status dot. It probes `https://api.sdforest.site/health` on the production (HTTPS) site and `http://187.127.86.176:8001/health` when served over plain HTTP locally — browsers block mixed content, so the raw-IP endpoint can't be probed from HTTPS.

## What lives here

- `index.html` — Forest HUB landing page: hero, project card grid, about section, API status footer.
- `web/ai-init/` — AI/IT glossary (527+ terms) plus embeddable search.
- `web/calendar/` — printable calendar generator with holiday lookup (redirect shim at `calendar/`).
- `web/chloe-pwa/` — Chloé assistant PWA shell (not linked from the hub yet).
- `web/council/` — LLM Council: 4-stage free-tier deliberation UI.
- `web/hypertrophyos/` — Hyper Trophy OS exercise-intelligence dashboard.
- `web/kids-movie-library/` — curated family movie catalog with localStorage watch/rating state (redirect shim at `movies/`).
- `web/library/` — sdforest library page (not linked from the hub yet).
- `web/life-in-time/` — time-remaining calculator with shareable links.
- `web/llm-db/` — LLM Platforms DB UI (166 platforms); expects same-origin `/api/llm-db`.
- `web/m-popova/` — M.Popova poetry space.
- `web/manifesto-newborn/` — Manifesto for a Newborn, a letter page.
- `web/math-forest/` — reserved route for the Math Forest rebuild (placeholder).
- `web/math-mania/` — kids' math game, embedding the live Lovable app (`forest-math-plus.lovable.app`).
- `web/mendeleev-bg/` — interactive Bulgarian periodic table.
- `web/power-law-odyssey/` — 3D scrollytelling piece on power laws.
- `web/replicator-void/` — Replicator Void experiment (not linked from the hub yet).
- `frontend/index.html` — standalone Runware item-icon generator demo.
- `backend/` — FastAPI app: movies API, jobs API, LLM DB API, IMDb service, SQLite helpers, and tests.
- `data/` — SQLite database, migrations, preset JSON, and curated inventory data.
- `build-vercel-static.cjs` — copies the static site into `vercel-public/` for Vercel.

## API surface

FastAPI serves `/api/movies`, `/api/llm-db`, `/jobs`, `/health`, `/api/schema`, and `/api/item-icon`. See `backend/app.py` for the app wiring.

## Quick start

### 1. Python environment

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 2. Start the backend

```powershell
python -m uvicorn backend.app:app --reload --port 8000
```

Migrations in `data/migrations/` are auto-applied and `data/movies.db` is initialized on startup.

### 3. Start a static server

From the repo root in a second terminal:

```powershell
python -m http.server 8080
```

Open `http://127.0.0.1:8080/` for the hub. Don't use `file://` — several pages rely on fetch, clipboard, or localStorage and need a real server.

## Local development modes

- **Split mode** (static on `8080`, API on `8000`) — fine for the hub and all static pages. Note `backend/app.py` only allows browser CORS from `http://localhost:8080` and `http://127.0.0.1:8080`.
- **Same-origin mode** — required for `web/llm-db/`, which hardcodes `const API_BASE = '/api/llm-db'`. Serve static files and the API from one origin (e.g. all from FastAPI on `8000`) for a fully working dashboard.

## Verification

Backend tests:

```powershell
pytest backend/tests
```

AI_INIT glossary checks:

```powershell
node scratch/tests/lint-glossary.js
node --test scratch/tests/glossary-search.test.js
```

## Known gaps

- `web/llm-db/` works same-origin only; make its API base configurable to support split mode.
- `web/chloe-pwa/`, `web/library/`, `web/replicator-void/`, and `frontend/index.html` exist but aren't linked from the hub grid.
- `web/math-forest/` is a placeholder awaiting the rebuild.
- `api.sdforest.site` needs its DNS A record pointed at the VPS and TLS termination before the production API status dot can go green.
- Jobs API has no dashboard page yet (`backend/jobs_api.py`) — if you build one, add it under `web/<slug>/` and link it from the hub.
