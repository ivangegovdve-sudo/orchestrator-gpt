# Project Memory

- Updated: 2026-03-19

## Project

- Forest HUB multi-tool dashboard repo at `D:\Ivan\orchestrator-gpt\orchestrator-gpt`.

## Current State

- The dashboard is a static-first product surface with mini-projects under `web/`, a FastAPI backend under `backend/`, and shared data/config under `data/` and `config/`.
- The repo now has a repo-local memory layer under `memory/` plus a consolidation skill under `skills/consolidate-memory/`.
- The repo now has a repo-local multimodal asset memory skill under `skills/media-memory/` with runtime storage in `media-memory/`.
- There are older untracked research-scout memory artifacts under `docs/`, but `memory/` is now the canonical location for active repo memory.

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

## Known Gaps

- `web/llm-db/index.html` is same-origin only.
- `index.html` still contains placeholder cards.
- `frontend/index.html` is not surfaced in the main dashboard.
- `backend/jobs_api.py` still has no UI.

## Next Steps

- Use the nightly consolidation workflow to keep this file aligned with active repo work.
- Use the media-memory workflow to ingest durable assets and search past media before recreating them.
- Update this file whenever project-wide runtime assumptions, known gaps, or near-term priorities change.
