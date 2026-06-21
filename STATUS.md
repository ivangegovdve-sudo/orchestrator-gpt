# STATUS.md — Forest HUB / orchestrator-gpt

**Last updated:** 2026-06-21 (afternoon session — Claude Code, feat/june21-polish)
**Production URL:** https://sdforest.site (Vercel)
**Phase:** Phase 1 Foundation / Cleanup (in progress)
**Canonical source:** This file is the single source of truth for what is done, in progress, and blocked.

---

## Overall

The repo is a static web dashboard + FastAPI backend hosting 11 mini-projects ("pages") under `web/`.
Most static pages work locally and in production. Key remaining gaps: production serving shape for API-backed pages, and Math Forest rebuild decision.

---

## Page Status

| Page | Route | Backend? | Local works? | Production (sdforest.site) | Notes |
|------|-------|----------|--------------|----------------------------|-------|
| Forest HUB | `/` | No | Yes | Yes | Upgraded: 3D nebula hero, perspective-tilt cards, emoji icons (`feature/3d-hub-nav` — PR open) |
| Kids Movie Library | `/movies/`, `/web/kids-movie-library/` | No (localStorage) | Yes | Yes | Static. 15 curated movie entries. Watch/rating state in localStorage. |
| Mendeleev BG | `/web/mendeleev-bg/` | No | Yes | Yes | Interactive Bulgarian periodic table. |
| AI_INIT Glossary | `/web/ai-init/` | No | Yes | Yes | AI/IT abbreviation glossary. Static. Embeddable at `/web/ai-init/embed/`. |
| Calendar Generator | `/calendar/`, `/web/calendar/` | No | Yes | Yes | Printable calendar. External holiday API (kayaposoft.com). Attribution: Apache 2.0. |
| Math Mania | `/web/math-mania/` | No | Yes | Yes | Static iframe → `https://forest-math-plus.lovable.app`. |
| Math Forest | `/web/math-forest/` | No | Placeholder | Placeholder | Rebuild route. Original app gone. Placeholder only. |
| LLM Platforms DB | `/web/llm-db/` | No (static) | Yes | Yes | All data embedded in JS — no backend dependency. STATUS was stale. ✅ Works in prod. |
| A1111 Debug | `/web/a1111-debug/`, `/web/debug-a1111/` | No (external A1111) | Local only | Not viable | Requires local AUTOMATIC1111. Not a production product. |
| Runware Icon Gen | `/frontend/index.html` | Yes (`RUNWARE_API_KEY`) | Yes | Not linked | FastAPI backend present. Not linked from hub — needs Ivan decision. |
| Jobs API | — | Yes | Yes | Not wired | Backend API only (`/jobs/intake`, `/jobs`, etc.). No UI. |
| Voice Project Dashboard | External / `voice-project-dashboard/` | No (separate) | Yes (Expo) | Separate Vercel | Deployed separately. Hub card links externally. |

---

## Backend Status

| API route | File | Status | Notes |
|-----------|------|--------|-------|
| `/api/movies` | `backend/movies_api.py` | Working | SQLite via `data/movies.db` |
| `/api/llm-db` | `backend/llm_db/api.py` | Working locally | Backup API — frontend now uses embedded static data |
| `/jobs/*` | `backend/jobs_api.py` | Working | No UI yet |
| `/api/item-icon` | `backend/app.py` | Working | Runware key required |
| `/api/schema` | `backend/app.py` | Working | Loads `config/runware-item-icons.json` |
| `/health` | `backend/app.py` | Working | Basic health check |

Run backend: `pip install -r requirements.txt && python -m uvicorn backend.app:app --reload --port 8000`

---

## Done

- Repo structure with `web/` subpages and FastAPI under `backend/`
- `data/migrations/` applied on startup
- Backend tests: `pytest backend/tests` passes
- AI_INIT static checks pass: `node scratch/tests/lint-glossary.js`
- Vercel deployment running at `https://sdforest.site`
- README.md, AGENTS.md, SUBPAGES.md documentation
- `requirements.txt` added (fastapi, uvicorn, pydantic, httpx, pytest, python-dotenv)
- Hub placeholder cards (Retail AI, Python Learning) removed
- LLM Platforms DB confirmed fully static — no API dependency
- **`feature/3d-hub-nav`** branch: 3D nebula hero canvas, perspective-tilt cards, emoji icons, staggered entrance animations (PR open — needs Ivan review/merge)

---

## In Progress

1. Review and merge `feature/3d-hub-nav` → main (Ivan's call)
2. Math Forest rebuild vs permanent placeholder (Ivan's call)
3. Wire `frontend/index.html` (Runware Icon Gen) into hub or mark out-of-scope (Ivan's call)

---

## Blocked / Needs Ivan

- Production serving shape: Vercel static + separate FastAPI host vs unified origin
- Math Forest rebuild scope
- Runware Icon Gen: link from hub or remove
- Jobs API UI: build or keep internal-only
