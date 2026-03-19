---
name: consolidate-memory
description: Consolidate Codex conversation history into repo-local memory files. Use when Codex needs to refresh `memory/recent-memory.md`, `memory/project-memory.md`, or `memory/long-term-memory.md`, recover context from the last 24 hours of `~/.codex` logs, promote durable facts/preferences/patterns, or maintain this repo's persistent memory layer.
---

# Consolidate Memory

## Overview

Use this skill to turn recent Codex work into durable repo memory without polluting the long-term file with one-off details. The collector script gathers relevant session excerpts from `~/.codex`; Codex then updates the three memory files with judgement about what is recent, project-specific, or durable.

## Workflow

1. Run the collector from the repo root:

   ```powershell
   python skills/consolidate-memory/scripts/collect_codex_context.py --repo-root "<repo-root>" --hours 24 --format markdown
   ```

   Use `--hours 48` only when you need to rebuild `memory/recent-memory.md` from source instead of carrying forward the prior file.

2. Read these files before editing memory:
   - `memory/recent-memory.md`
   - `memory/project-memory.md`
   - `memory/long-term-memory.md`
   - the collector output from step 1

3. Update `memory/recent-memory.md`.
   - Keep it scoped to the rolling last 48 hours.
   - Preserve only active context: current focus, recent decisions, temporary constraints, pending follow-ups.
   - Drop items older than 48 hours unless they were promoted into long-term memory.

4. Update `memory/project-memory.md`.
   - Capture the current project state, important paths, runtime assumptions, known gaps, and near-term next steps.
   - Prefer facts that help the next session resume quickly.
   - If older experimental memory files exist elsewhere in the repo, mark `memory/` as canonical instead of silently splitting state across multiple locations.

5. Update `memory/long-term-memory.md`.
   - Promote only durable items:
     - explicit user preferences or standing instructions
     - repeated workflows or patterns seen across sessions
     - stable repo facts, paths, or operating constraints
   - Do not promote:
     - one-off tasks
     - transient errors
     - temporary experiments
     - status items likely to expire within a day or two

## Promotion Rules

- Promote when an item is explicitly stated as a preference or policy, repeated across sessions, or likely to matter weeks later.
- Keep long-term memory concise and deduplicated.
- If uncertain, leave the item in recent memory instead of promoting it.

## File Expectations

### `memory/recent-memory.md`

- Include `Updated`, `Window`, `Current focus`, `Recent decisions`, `Temporary constraints`, and `Open loops`.
- Prefer bullet lists with concrete file paths and dates.

### `memory/project-memory.md`

- Include `Project`, `Current state`, `Key paths`, `Runtime assumptions`, `Known gaps`, and `Next steps`.
- Treat this file as the fast resume document for the current repo.

### `memory/long-term-memory.md`

- Include `Stable preferences`, `Durable project facts`, and `Recurring patterns`.
- Use durable wording, not day-by-day narrative.

## Validation

- Re-read all three memory files after editing.
- Ensure `memory/recent-memory.md` contains only the last 48 hours of context.
- Ensure `memory/long-term-memory.md` contains no obviously stale or one-off notes.
- If the collector returned no relevant sessions, note that briefly and avoid destructive rewrites.

## Script

- `scripts/collect_codex_context.py` reads recent Codex session logs from `~/.codex/sessions`, filters them to the current repo via `--repo-root`, and falls back to `history.jsonl` only if no matching session logs are available.
- Keep the collector output as working context, not as permanent storage. The durable store is the three Markdown files under `memory/`.
