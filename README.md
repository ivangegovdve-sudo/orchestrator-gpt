# SD Orchestrator - Kids Movie Library

This repo now includes a Kids Movie Library feature with a SQLite database, FastAPI endpoints, and a minimal text-first UI.

## Run locally
1. Start API:
   - `uvicorn backend.app:app --reload --port 8000`
2. Start static site server from repo root:
   - `python -m http.server 8080`
3. Open:
   - Hub: `http://127.0.0.1:8080/index.html`
   - Movies route: `http://127.0.0.1:8080/movies/`

## Database
- SQLite file: `data/movies.db`
- Migrations:
  - `data/migrations/001_movies.sql`
  - `data/migrations/002_movies_imdb_fields.sql`
- Migrations are applied automatically on API startup/first DB access.

## Seed data
- Starter file: `data/movies_seed_starter.txt`
- Seed command:
  - `python backend/seed_movies.py`

Import rules:
- Lines starting with `--` become `watched=true`.
- `Title / Localized Title (Year)` stores localized title in `localized_title` and notes.
- IMDb fields are seeded empty by default.

## API endpoints
- `GET /api/movies`
  - Query params: `search`, `age_band`, `status` (`all|unwatched|watched`), `tags`, `tags_mode`, `sort`, `order`, `device_id`.
- `POST /api/movies`
- `PATCH /api/movies/:id`
- `POST /api/movies/:id/rate`
- `POST /api/movies/:id/imdb/update`
- `POST /api/movies/import`
- `GET /api/movies/facets`

## IMDb update behavior
The server does IMDb lookups without API keys:
1. If `imdb_id` exists: fetch `https://www.imdb.com/title/{imdb_id}/` and parse rating.
2. If `imdb_id` is missing: fetch IMDb find page for `Title Year`, pick best `tt...` match, then fetch title page.

Safety controls:
- Cache TTL: 7 days (skip refetch unless `force=true`).
- Global rate limit: one IMDb request per second.
- Request timeout enabled.
- On parse/fetch failure: existing `imdb_score` is preserved, `imdb_last_checked_at` is updated, and endpoint returns a failure message.

## UI behavior
- `/movies/` opens the movies page (redirects to `/web/movies/`).
- Minimal list UI (no dashboard/cards).
- Named sections per movie row: Title, Year, Status, Age band, Style/Tags, IMDb score, User rating, Notes.
- Results are hidden until Search is clicked.
- After first search, filter changes refresh results immediately.
- Watched movies are greyed out.
- Ratings use per-device `device_id` in localStorage and are persisted in DB.
- IMDb has a per-row update button (`↑`) to force refresh.

## Notes for extension
Current schema and code are prepared to extend with posters, runtime, language, external links, cast, and user profiles.
