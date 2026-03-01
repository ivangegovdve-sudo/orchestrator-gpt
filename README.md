# SD Orchestrator (FastAPI + Static Tools)

This repo hosts a static tool hub (`index.html`) plus a FastAPI backend (`backend/app.py`).

## Run locally
1. Create/activate a Python virtual environment.
2. Install dependencies used by FastAPI and existing backend integrations.
3. Optional: set `RUNWARE_API_KEY` if you need the item-icon endpoints.
4. Start backend API:
   - `uvicorn backend.app:app --reload --port 8000`
5. Serve static pages from repo root (example):
   - `python -m http.server 8080`
6. Open:
   - Hub: `http://127.0.0.1:8080/index.html`
   - Kids Movie Library: `http://127.0.0.1:8080/web/movies/`

## Kids Movie Library

### What was added
- UI page: `web/movies/index.html`
- Frontend logic/styles: `web/movies/app.js`, `web/movies/styles.css`
- API router: `backend/movies_api.py`
- SQLite data layer: `backend/movies_db.py`
- Import parsing helpers: `backend/movies_import.py`
- DB migration SQL: `data/migrations/001_movies.sql`
- Starter seed list: `data/movies_seed_starter.txt`
- Seed script: `backend/seed_movies.py`

### Database location
- SQLite file: `data/movies.db`
- Auto-creation: schema is applied automatically when FastAPI starts (or first API use).

### Seed the database
Run:
- `python backend/seed_movies.py`

Optional flags:
- `python backend/seed_movies.py --file data/movies_seed_starter.txt --age-band Family --tags animated,adventure`

Seed format rules:
- One movie per line.
- Prefix line with `--` to set `watched=true`.
- Year can be `(YYYY)` or trailing `YYYY`.
- `Title / Localized Title (YYYY)` stores localized part in `localized_title` and notes.

### How to add movies after setup
1. Open `web/movies/`.
2. Use **Add one movie** form for single entries.
3. Use **Bulk add** textarea for newline imports.
4. Toggle watched/unwatched per movie.
5. Rate 1-5 stars (stored in DB by local `device_id` from browser localStorage).

### API overview
- `GET /api/movies` (search/filter/sort)
- `POST /api/movies` (add/upsert one movie)
- `POST /api/movies/import` (bulk parse/import)
- `PATCH /api/movies/{id}` (update fields like IMDb)
- `PUT /api/movies/{id}/watched` (toggle watched)
- `POST /api/movies/{id}/ratings` (set per-device rating)
- `GET /api/movies/facets` (age bands + tags)

## Existing Item Icon Generator notes
- Existing Runware endpoints and config remain in `backend/app.py` and `config/runware-item-icons.json`.
- Existing static tool pages under `web/` remain available from the hub.
