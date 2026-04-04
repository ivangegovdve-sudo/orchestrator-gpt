# Project Memory

- Updated: 2026-04-05

## Project

- Forest HUB multi-tool dashboard repo at `D:\Ivan\orchestrator-gpt\orchestrator-gpt`.

## Current State

- The dashboard is a static-first product surface with mini-projects under `web/`, a FastAPI backend under `backend/`, and shared data/config under `data/` and `config/`.
- The repo now has a repo-local memory layer under `memory/` plus a consolidation skill under `skills/consolidate-memory/`.
- The repo now has a repo-local multimodal asset memory skill under `skills/media-memory/` with runtime storage in `media-memory/`.
- Forest HUB now links a deployed `Voice Project Dashboard` app whose source lives at `voice-project-dashboard/apps/mobile/`.
- There are older untracked research-scout memory artifacts under `docs/`, but `memory/` is now the canonical location for active repo memory.
- 2026-04-04 research scout staged new deployment guidance in `docs/long-term-memory.md` about Vercel external rewrites, CDN cache headers, and FastAPI static asset constraints; those findings are not promoted into canonical memory yet.
- 2026-04-05 the user supplied `SD Forest - Master Plan for Site Development`, which is now the roadmap source for phase tracking in `STATE.md`.

## Key Paths

- `index.html`
- `web/`
- `backend/`
- `memory/recent-memory.md`
- `memory/project-memory.md`
- `memory/long-term-memory.md`
- `skills/consolidate-memory/SKILL.md`
- `skills/media-memory/SKILL.md`
- `media-memory/`

## Runtime Assumptions

- Static server default: `http://127.0.0.1:8080`
- FastAPI default: `http://127.0.0.1:8000`
- `backend/app.py` CORS is intentionally scoped to the default local static origins.
- `docs/long-term-memory.md` is the staging area for externally sourced findings; `memory/` remains the canonical repo-memory layer.

## Known Gaps

- `web/llm-db/index.html` is same-origin only.
- `index.html` still contains placeholder cards.
- `frontend/index.html` is not surfaced in the main dashboard.
- `backend/jobs_api.py` still has no UI.
- The production hosting path is still ambiguous between split static/API deployment with rewrites and any Vercel `public/` reshuffle needed for FastAPI hosting.
- The master plan's Phase 1 issues are still open: auth barriers, broken or empty pages, weak back navigation, and undeclared public/private boundaries.

## Next Steps

- Review the staged Vercel and FastAPI deployment findings in `docs/long-term-memory.md` before changing hosted API wiring.
- Use the new master plan phases to track which cleanup and productization items are actually complete.
- Use the nightly consolidation workflow to keep this file aligned with active repo work.
- Use the media-memory workflow to ingest durable assets and search past media before recreating them.
- Update this file whenever project-wide runtime assumptions, known gaps, or near-term priorities change.
