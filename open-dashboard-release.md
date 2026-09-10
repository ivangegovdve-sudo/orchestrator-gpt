# Open Dashboard release handoff

## Reviewable state

Frontend: `codex/open-dashboard-redesign` in `F:/butcher/voice/.worktrees/open-dashboard-redesign`, based on `orchestrator-gpt` main at `da86f2b`. Only Open Dashboard, its package facts/dependency, and supporting review files are changed. Other SD Forest products are unchanged.

Preview: `http://127.0.0.1:4174/web/open-dashboard/`. Restart with `python web/open-dashboard/scripts/preview.py` from this checkout if needed. Setup and GitHub are separate linked pages. The production static build is `vercel-public/`.

Backend: `agent/open-dashboard-api-redesign` in `F:/butcher/voice/.worktrees/open-dashboard-api-redesign`, commit `48a1c82b1cb0fdb24b5a32e19dd4418d1668c3ee`. It repairs price ordering, media free classification, shared-day matrix history and provenance.

## Applied database migration

Migration `0015_app_model_published_history.sql` adds a restricted published-history view and reader grant. It does not rewrite observations or change collection gates. Migration bookkeeping is included in the prepared transaction so the usual Drizzle runner remains consistent.

- Prepared ID: `84dd353d-fa7a-48c0-ae69-1777da7ebbb2`
- Project: `lingering-dawn-56631573`; database: `neondb`
- Temporary branch: `br-morning-band-axsye0aa`
- Production parent: `br-tiny-sky-axd0sh0g`
- Exact returned completion arguments: `F:/butcher/voice/.worktrees/open-dashboard-backend-evidence/migration-context.json`
- Evidence: `F:/butcher/voice/.worktrees/open-dashboard-backend-evidence/MIGRATION-REHEARSAL.md`

The rehearsal verifies the real 10-app September 9 shared day, 200 retained facts, 15 matrix relationships and 144 unmapped observations. All 620 exposed history rows satisfy publication eligibility, and reader privileges remain restricted. The temporary migration ledger matches the reviewed journal.

The user approved publication and the prepared migration on September 10, 2026. The Neon completion flow applied it successfully. Production verification confirmed 17 migration ledger entries, the published view, and the intended reader grants. Completion and verification evidence is retained beside the rehearsal files.

## Production release

The backend is deployed through [PR #51](https://github.com/ivangegovdve-sudo/openrouter-github-dashboard/pull/51), merge `7db3f6b8982158cc980c15aeb2b543ed942a0b08`, production deployment `dpl_Fn8qm8nPKi6Ba68odBXfq6jdopL5` (READY). Seven live assertions passed: the shared September 9 matrix resolves, exact-day drilldown agrees, zero-token video prices remain unknown, known Groq prices precede unknowns, legitimate free text remains available, and the site's CORS origin is allowed. Detailed results: `F:/butcher/voice/.worktrees/open-dashboard-backend-evidence/BACKEND-RELEASE.md`.

The frontend release includes the approved redesign, denser setup, Codex compatibility guidance, higher-contrast dark mode, expanded native catalogues, and current OpenRouter endpoint comparisons. Its normal GitHub/Vercel production release is being verified separately. A successful live matrix is preferred automatically over the explicitly dated fallback.

Vercel's build command refreshes native public catalogue metadata before copying the static site. It has a 90-second total bound; a failed refresh or unavailable previously populated source retains the checked-in snapshot and its original source dates. This refresh makes no authenticated account or inference calls. Local `npm run build` remains deterministic and offline.

Backend Vercel project: `prj_6fBCow4w8XQFnnLNFhc3cUSfwZW2`; API origin: `https://openrouter-github-dashboard.vercel.app`. Production site: `https://www.sdforest.site/web/open-dashboard/`.

The frontend's Open Dashboard workflow checks data normalization, setup and published-package agreement, then builds the static site on relevant pull requests and main-branch changes. Generated QA screenshots remain local rather than becoming production assets.
