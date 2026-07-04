# TinyLM Glass Box SD Forest Subpage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a preview-first SD Forest wrapper subpage for TinyLM Glass Box with config-driven target switching, safe embed fallback, and strict branch/deploy verification gates.

**Architecture:** Build a static route under `web/tinylm-glass-box/`, keep the first release route-only, verify on preview first, and promote only after reconciling with the latest `origin/main`.

**Tech Stack:** Static HTML/CSS/JS, existing `build-vercel-static.cjs` pipeline, Git, and Vercel deployment workflow.

---

## File Structure

- Create: `web/tinylm-glass-box/index.html`
- Create: `web/tinylm-glass-box/app.js`
- Create: `web/tinylm-glass-box/styles.css`
- Create: `web/tinylm-glass-box/config.json`
- Modify: `SUBPAGES.md`
- Create: `docs/superpowers/specs/2026-07-04-tinylm-glass-box-sdforest-subpage-design.md`
- Create: `docs/superpowers/plans/2026-07-04-tinylm-glass-box-sdforest-subpage.md`

## Execution Sequence

1. Verify branch, upstream, and dirty state.
2. Create isolated feature branch/worktree from verified `origin/main`.
3. Add the TinyLM wrapper route.
4. Add config-driven embed and fallback behavior.
5. Register the route in `SUBPAGES.md`.
6. Build and verify output under `vercel-public/web/tinylm-glass-box/`.
7. Preview deploy.
8. Reconcile with latest `origin/main`.
9. Promote through `main` only.

## Verification Gates

- build must pass before preview
- route files must appear in `vercel-public/web/tinylm-glass-box/`
- homepage must remain unchanged
- diff must remain narrow
- production deployment must come from reconciled `main`
