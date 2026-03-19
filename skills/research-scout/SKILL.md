---
name: research-scout
description: Find net-new external information that updates, challenges, or materially extends the current workspace knowledge. Use when Codex needs to scan the web plus community sources such as Reddit, Hacker News, and Quora for new strategies, tools, announcements, or workflow changes, compare those findings against local docs and project context, stage validated deltas in long-term memory, or run a weekly promotion pass that turns repeated findings into stable project memory.
---

# Research Scout

## Overview

Use this skill to keep workspace knowledge fresh without turning memory files into a noisy bookmark list. Read the current project context first, search for genuinely new information, discard redundant items, then stage only validated deltas in `docs/long-term-memory.md` and promote confirmed patterns into `docs/memory.md`.

## Quick Start

Use one of these two flows:

1. Nightly scout:
   - Build a short summary of the current workspace beliefs from local docs and recent project context.
   - Search official sources plus `reddit.com`, `news.ycombinator.com`, and `quora.com`.
   - Keep only findings that are new, contradictory, or materially more current than local docs.
   - Stage each validated finding with:

```powershell
python skills/research-scout/scripts/manage_memory.py stage --repo-root <workspace> --timestamp <ISO-8601> --source <url> --note "<one-line delta>"
```

2. Weekly promotion:
   - Review staged items in `docs/long-term-memory.md`.
   - Remove weak, stale, or no-longer-relevant entries.
   - Keep only durable patterns worth remembering.
   - Promote the remaining entries with:

```powershell
python skills/research-scout/scripts/manage_memory.py promote --repo-root <workspace> --promotion-timestamp <ISO-8601>
```

## Build Context First

Read only enough local context to understand what counts as new.

Prioritize these files when they exist:

- `AGENTS.md`
- `README.md` and nearby docs
- `docs/**/*.md`
- `docs/memory.md`
- `docs/long-term-memory.md`
- Stack manifests such as `package.json`, `pyproject.toml`, `requirements*.txt`, `Dockerfile`
- Recent git history when the active toolchain or workflows are unclear

Before searching, write down the current beliefs you are testing. Keep this as a compact working summary, not a permanent artifact.

## Nightly Scout Workflow

1. Identify the active topics.
   - Pull them from the current docs, codebase shape, and recent work.
   - Favor tools, APIs, workflows, and product surfaces the workspace actually uses.

2. Search for updates.
   - Use broad web search for official announcements, docs, release notes, and product pages.
   - Use domain-filtered searches on `reddit.com`, `news.ycombinator.com`, and `quora.com` to surface practitioner tactics, sharp edges, and adoption signals.
   - Prefer recent sources when the topic is fast-moving.

3. Validate each candidate finding.
   - Cross-check the candidate against local docs and memory files.
   - Keep it only if it changes a recommendation, reveals a contradiction, or adds a meaningful tactic missing from current docs.
   - Discard hype, duplicates, vague opinions, and unsupported claims.

4. Stage the validated delta.
   - Use a single ISO-8601 timestamp.
   - Keep the note to one line.
   - Include the source URL.
   - Use `scripts/manage_memory.py` instead of editing the marker blocks by hand.

5. Stop when there is no more signal.
   - A short list of high-value findings is better than a long list of repeats.

## Weekly Promotion Workflow

1. Read `docs/long-term-memory.md` and focus on the `new_learnings` block.
2. Re-check each staged item against current docs and current external reality.
3. Remove anything that turned out to be redundant, weak, or obsolete.
4. Keep only patterns that still look durable and useful to future runs.
5. Run `scripts/manage_memory.py promote ...` to move the surviving entries into `docs/memory.md`, log the promotion, and clear the staging block.

## Acceptance Rules

Accept a finding only when all of these are true:

- It is relevant to the current workspace or its documented workflows.
- It is newer than, contradictory to, or materially absent from local docs.
- It has a URL you can point to.
- It changes what Codex should do, recommend, or watch for.

Reject a finding when any of these are true:

- It repeats what the docs already say.
- It is pure opinion with no actionable delta.
- It is older than the current documented practice and does not challenge it.
- It is interesting but unrelated to the workspace.

## Resource

Use `scripts/manage_memory.py` to create the memory files if missing, append staged findings, and promote confirmed patterns without breaking the marker blocks inside the markdown files.
