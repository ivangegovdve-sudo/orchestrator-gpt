# Long-Term Memory

- Updated: 2026-03-19

## Stable Preferences

- Load `memory/recent-memory.md` inline at startup for this repo.
- Reference `memory/long-term-memory.md` by path instead of inlining it by default.
- Promote only durable facts, preferences, and repeated patterns into long-term memory; leave one-off items in recent memory.

## Durable Project Facts

- Primary workspace: `D:\Ivan\orchestrator-gpt\orchestrator-gpt`.
- Codex session logs live under `C:\Users\Groot\.codex`, with detailed session rollouts under `sessions\YYYY\MM\DD\`.
- This repo is static-first and should not gain a frontend framework or build pipeline unless explicitly requested.

## Recurring Patterns

- Filter memory consolidation to the current repo's `cwd` so cross-project Codex work does not leak into this memory layer.
- Use repo-local Markdown files as the durable memory store and treat raw Codex logs as source material rather than permanent storage.
