# TinyLM Glass Box SD Forest Subpage Design

**Date:** 2026-07-04
**Repo:** `D:\projects\orchestrator-gpt`
**Primary target route:** `/web/tinylm-glass-box/`

## Goal

Publish a safe first SD Forest subpage for TinyLM Glass Box without risking the live `sdforest.site` homepage or deploying from stale or unrelated branch state.

## Locked Decisions

- Hosting shape: static wrapper subpage
- First-release behavior: inline embed if available, fallback to launch
- Target strategy: configurable target URL
- Exposure strategy: preview-first direct route, no homepage card yet
- Deployment discipline: production only after reconciling with latest `origin/main`

## Skill Stack

### Required superpowers skills

- `superpowers:brainstorming`
- `superpowers:writing-plans`
- `superpowers:verification-before-completion`
- `superpowers:requesting-code-review`

### Relevant build / design / deploy skills

- `build-web-apps:frontend-app-builder`
- `product-design:get-context`
- `product-design:audit`
- `github:github`
- `vercel:deployments-cicd`
- `vercel:vercel-cli`

## Architecture

Add a static wrapper route under `web/tinylm-glass-box/` with:

- `index.html`
- `app.js`
- `styles.css`
- `config.json`

The page explains the project, attempts iframe embed of the live TinyLM console, and degrades cleanly to a launch button if embedding is blocked or disabled.

## Branch And Deployment Safety

Before touching production-facing files:

1. verify current branch
2. verify `main` versus `origin/main`
3. isolate work on a dedicated feature branch
4. keep changes limited to the route and supporting docs
5. preview deploy first
6. reconcile again with `origin/main` before production
7. deploy production from reconciled `main` only

Never deploy production from:

- stale local `main`
- a dirty mixed-purpose worktree
- an unreconciled feature branch

## Files

### New

- `web/tinylm-glass-box/index.html`
- `web/tinylm-glass-box/app.js`
- `web/tinylm-glass-box/styles.css`
- `web/tinylm-glass-box/config.json`
- `docs/superpowers/specs/2026-07-04-tinylm-glass-box-sdforest-subpage-design.md`
- `docs/superpowers/plans/2026-07-04-tinylm-glass-box-sdforest-subpage.md`

### Modified

- `SUBPAGES.md`

### Deferred

- `index.html` homepage card

## Success Criteria

- `/web/tinylm-glass-box/` exists in the Vercel build output
- target URL can be switched via config
- embed failure degrades to launch-only behavior cleanly
- homepage remains untouched in this release
- preview and promotion path do not rely on stale branch state
