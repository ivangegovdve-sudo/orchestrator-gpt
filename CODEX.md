# CODEX.md

## Startup Memory Load

- At the start of every session in this repo, read `memory/recent-memory.md` inline before planning or editing.
- Keep `memory/long-term-memory.md` as a path-referenced durable memory source; open it when the task may touch stable preferences, repeated patterns, or long-lived project facts.
- Read `memory/project-memory.md` before making repo-wide changes or when you need the current project state quickly.
- Treat `memory/` as the canonical memory location for this repo. Do not split active memory across older experimental files such as `docs/memory.md` or `docs/long-term-memory.md` unless the user explicitly asks for a migration.

## Memory Maintenance

- Use `skills/consolidate-memory/SKILL.md` whenever you are asked to refresh memory or when a major work session ends.
- Update `memory/project-memory.md` when the repo's active state, runtime assumptions, or known gaps materially change.
- Promote items into `memory/long-term-memory.md` only when they are durable beyond the current workday.

## Media Memory

- Use `skills/media-memory/SKILL.md` whenever the user sends or Codex generates a durable media asset or file that may matter later: images, video, audio, PDFs, documents, spreadsheets, archives, and other generated outputs.
- Store runtime data in `media-memory/` at the repo root. Do not scatter media-memory records across `docs/`, `memory/`, `tmp/`, or ad hoc folders.
- Before generating a new media asset, asking the user to resend a prior asset, or recreating a file from scratch, query the media-memory system if a past asset seems relevant.
- Prefer these commands:
  - `python skills/media-memory/scripts/media_memory.py bootstrap`
  - `skills/media-memory/.venv/Scripts/python.exe skills/media-memory/scripts/media_memory.py ingest --path "<file>" --source "<label>"`
  - `skills/media-memory/.venv/Scripts/python.exe skills/media-memory/scripts/media_memory.py search --query "<need>" --type <type>`
- If Gemini credentials are missing, still ingest the asset so metadata is preserved and leave embeddings pending for a later `reindex`.
