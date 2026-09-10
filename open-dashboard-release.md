# Open Dashboard release handoff

## Reviewable state

Frontend: `codex/open-dashboard-redesign` in `F:/butcher/voice/.worktrees/open-dashboard-redesign`, based on `orchestrator-gpt` main at `da86f2b`. Only Open Dashboard, its package facts/dependency, and supporting review files are changed. Other SD Forest products are unchanged.

Preview: `http://127.0.0.1:4174/web/open-dashboard/`. Restart with `python web/open-dashboard/scripts/preview.py` from this checkout if needed. Setup and GitHub are separate linked pages. The production static build is `vercel-public/`.

Backend: `agent/open-dashboard-api-redesign` in `F:/butcher/voice/.worktrees/open-dashboard-api-redesign`, commit `48a1c82b1cb0fdb24b5a32e19dd4418d1668c3ee`. It repairs price ordering, media free classification, shared-day matrix history and provenance.

## Prepared database migration

Migration `0015_app_model_published_history.sql` adds a restricted published-history view and reader grant. It does not rewrite observations or change collection gates. Migration bookkeeping is included in the prepared transaction so the usual Drizzle runner remains consistent.

- Prepared ID: `84dd353d-fa7a-48c0-ae69-1777da7ebbb2`
- Project: `lingering-dawn-56631573`; database: `neondb`
- Temporary branch: `br-morning-band-axsye0aa`
- Production parent: `br-tiny-sky-axd0sh0g`
- Exact returned completion arguments: `F:/butcher/voice/.worktrees/open-dashboard-backend-evidence/migration-context.json`
- Evidence: `F:/butcher/voice/.worktrees/open-dashboard-backend-evidence/MIGRATION-REHEARSAL.md`

The rehearsal verifies the real 10-app September 9 shared day, 200 retained facts, 15 matrix relationships and 144 unmapped observations. All 620 exposed history rows satisfy publication eligibility, and reader privileges remain restricted. The temporary migration ledger matches the reviewed journal.

The Neon `complete_database_migration` tool explicitly requires user confirmation before applying **or discarding** this prepared migration. Neither completion action has happened. Use the exact fields saved by preparation; do not reconstruct its SQL from a different source. A changed production migration baseline fails the transaction's guard.

## Publication sequence after approval

1. Apply the prepared migration through the Neon completion flow, using the saved arguments. Confirm the production ledger and view.
2. Publish the reviewed backend patch through its normal GitHub/Vercel workflow; verify the live matrix resolves a shared day and zero-token media stays unknown.
3. Publish the frontend through the existing `orchestrator-gpt` Vercel project (`prj_yCclktkxHWLTj7By9XraAi1QinRA`) on SD Forest. Check the public subsite, all legacy entry routes, setup and GitHub.
4. Confirm the frontend prefers the working live matrix over its explicitly dated archived fallback. Confirm source dates and quotas remain visible.

Backend Vercel project: `prj_6fBCow4w8XQFnnLNFhc3cUSfwZW2`; API origin: `https://openrouter-github-dashboard.vercel.app`. Production site: `https://www.sdforest.site/web/open-dashboard/`.

No branch push, production deployment or production database mutation was performed during implementation. If approval is declined, ask whether to discard the prepared migration, then use the completion tool with `apply_changes: false` so the temporary branch is cleaned up.
