# STATUS.md — Forest HUB / orchestrator-gpt

**Last updated:** 2026-06-20
**Production URL:** https://sdforest.site (Vercel)
**Phase:** Phase 1 Foundation / Cleanup (in progress)
**Canonical source:** This file is the single source of truth for what is done, in progress, and blocked.

---

## Overall

The repo is a static web dashboard + FastAPI backend hosting ~14 mini-projects ("pages") under `web/`.
Most static pages work locally. Key gaps: same-origin API wiring for API-backed pages in production, placeholder cards in hub, missing Python lock file, and undecided production serving shape (split static + FastAPI vs unified).

---

## Page Status

| Page | Route | Backend? | Local works? | Production (sdforest.site) | Notes |
|------|-------|----------|--------------|----------------------------|-------|
| Forest HUB | `/` | No | Yes | Yes | Hub landing page. Has placeholder cards (`href="#"`). Cards for Retail AI, Python Learning are stubs. |
| Kids Movie Library | `/movies/`, `/web/kids-movie-library/` | No (localStorage) | Yes | Yes | Static. 15 curated movie entries. Watch/rating state in localStorage. Strong tool. |
| Mendeleev BG | `/web/mendeleev-bg/` | No | Yes | Yes | Copied from `ivangegovdve-sudo/mendeleev-bg`. Interactive Bulgarian periodic table. |
| AI_INIT Glossary | `/web/ai-init/` | No | Yes | Yes | AI/IT abbreviation glossary. Static. Embeddable at `/web/ai-init/embed/`. |
| Calendar Generator | `/calendar/`, `/web/calendar/` | No | Yes | Yes | Printable calendar. Static. External holiday API (kayaposoft.com). Attribution: Apache 2.0. |
| Math Mania | `/web/math-mania/` | No | Yes | Yes | Static iframe embedding live Lovable app at `https://forest-math-plus.lovable.app`. |
| Math Forest | `/web/math-forest/` | No | Placeholder | Placeholder | Rebuild route. Original app confirmed gone by user. Placeholder only. |
| LLM Platforms DB | `/web/llm-db/` | Yes | Split-limited | No | Requires FastAPI. Hardcodes `const API_BASE = '/api/llm-db'` — only works same-origin. Not wired in production. |
| Prompt Builder | `/web/prompt-builder/` | No (optional A1111) | Yes | Yes | SD prompt builder. Optional AUTOMATIC1111 integration for generation. Core feature works without it. |
| Shared Calendar | `/web/shared-calendar/` | No (localStorage) | Yes | Yes | Family planning calendar. Drag-and-drop. localStorage persistence. |
| Dice | `/web/dice/` | No | Yes | Yes | 3D D6/D12 dice roller. Static. |
| A1111 Debug | `/web/a1111-debug/`, `/web/debug-a1111/` | No (external A1111) | Local only | Not viable | Requires local AUTOMATIC1111 instance. Not a production product. |
| Runware Icon Gen | `/frontend/index.html` | Yes (`RUNWARE_API_KEY`) | Yes | Not linked | FastAPI backend present. Not linked from hub `index.html`. |
| Jobs API | — | Yes | Yes | Not wired | Backend API only (`/jobs/intake`, `/jobs`, etc.). No UI. Not exposed in hub. |
| Voice Project Dashboard | External / `voice-project-dashboard/` | No (separate) | Yes (Expo) | Separate Vercel | Source in repo subtree. Deployed separately. Hub card links externally. |

---

## Backend Status

| API route | File | Status | Notes |
|-----------|------|--------|-------|
| `/api/movies` | `backend/movies_api.py` | Working | SQLite via `data/movies.db` |
| `/api/llm-db` | `backend/llm_db/api.py` | Working locally | Same-origin only — blocked in prod |
| `/jobs/*` | `backend/jobs_api.py` | Working | No UI yet |
| `/api/item-icon` | `backend/app.py` | Working | Runware key required |
| `/api/schema` | `backend/app.py` | Working | Loads `config/runware-item-icons.json` |
| `/health` | `backend/app.py` | Working | Basic health check |

Python backend requires: `fastapi`, `uvicorn`, `pydantic`, `pytest`, `httpx`. No locked requirements.txt exists.

Run backend: `python -m uvicorn backend.app:app --reload --port 8000`

---

## Done

- Repo structure established with `web/` subpages and FastAPI under `backend/`
- `data/migrations/` applied on startup (movies.db, LLM DB tables via `003_llm_docs.sql`)
- Backend tests: `pytest backend/tests` passes
- AI_INIT static checks pass: `node scratch/tests/lint-glossary.js`
- Vercel deployment running at `https://sdforest.site`
- README.md documents all mini-projects, local setup, and architecture
- AGENTS.md documents product direction, truthfulness rules, and per-page goals
- STATE.md records phase history (last updated 2026-04-05)

---

## In Progress (Phase 1 Priorities)

1. Fix `web/llm-db/` to use a configurable API base URL so it works in production (currently hardcodes `/api/llm-db`)
2. Remove or replace placeholder `href="#"` cards in `index.html` (Retail AI, Python Learning Orchestrated)
3. Clarify production serving shape: split static + FastAPI rewrites vs unified origin
4. Add Python requirements lock file (`requirements.txt` or `pyproject.toml`)
5. Wire `frontend/index.html` (Runware Icon Gen) into hub or document it as out-of-scope
6. Build UI page for Jobs API or keep it explicitly unlinked
7. Decide on Math Forest rebuild vs permanent placeholder labeling

---

## Blocked / Needs Ivan

- Production serving shape decision: Vercel static + separate FastAPI host with rewrites vs unified origin (impacts LLM DB and any future API-backed pages)
- Math Forest rebuild scope: this is Ivan's call on effort vs value
- VFX Portfolio and Clip Mart cards: confirm whether external links are current and correct

---

## Subpages Index

For a concise per-subpage description of what each page currently is and its state, see [SUBPAGES.md](SUBPAGES.md).
