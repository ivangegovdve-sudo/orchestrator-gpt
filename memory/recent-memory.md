# Recent Memory

- Updated: 2026-03-19
- Window: Bootstrap snapshot for the rolling 48-hour context. The nightly consolidation should replace this with a true rolling window.

## Current Focus

- Build a repo-local memory layer with `memory/recent-memory.md`, `memory/long-term-memory.md`, and `memory/project-memory.md`.
- Create `skills/consolidate-memory/` so future Codex sessions can refresh memory from `~/.codex` logs instead of starting cold.
- Add `CODEX.md` startup guidance that always loads recent memory inline and references long-term memory by path.

## Recent Decisions

- Earlier today, `main` was committed, rebased, and pushed with commit `01224d2` (`chore: add Life in Time deploy helpers`).
- An open GitHub PR was observed for this repo: `#100` `Sentinel: [security improvement] Add secure HTTP response headers`; it looked mergeable at the time but was not merged in that pass.
- Store persistent memory in the repo under `memory/` instead of only relying on `C:\Users\Groot\.codex\memories`.
- Keep the memory workflow repo-scoped by filtering `~/.codex/sessions` to sessions whose `cwd` matches `D:\Ivan\orchestrator-gpt\orchestrator-gpt`.
- Use `~/.codex/sessions` as the primary source and `~/.codex/history.jsonl` only as a fallback when recent session logs are unavailable.
- Treat promotion into long-term memory as a judgment call: only durable facts, preferences, and repeated patterns should move there.

## Temporary Constraints

- This memory layer is being bootstrapped from the current repo session, so some sections are seed content until the first nightly consolidation runs.
- The repo uses static HTML/CSS/JS by default; avoid adding a frontend framework or build pipeline unless explicitly requested.
- AGENTS guidance prioritizes truthful, working routes and APIs over placeholder polish.
- Older untracked research-scout memory files exist under `docs/`; treat `memory/` as the active source of truth unless the user asks to migrate those files.

## Open Loops

- Run the consolidate-memory workflow after major workdays so the rolling window and long-term memory stay current.
- Revisit long-term entries after a few days of usage to remove anything that proves too transient.
