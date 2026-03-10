# Glossary Redesign Notes

## Iteration 1

### What changed
- Refactored `web/ai-init` from one monolithic HTML into a modular static setup:
  - `web/ai-init/index.html`
  - `web/ai-init/glossary-data.js`
  - `web/ai-init/glossary-search.js`
  - `web/ai-init/app.js`
  - `web/ai-init/embed/index.html`
  - `web/ai-init/embed/embed.js`
- Implemented Home Search as the default entry experience with a large embedded search bar.
- Added books icon on the left with hover loop animation (`bookHoverLoop`) and click-to-enter Library view.
- Added right-side search button and keyboard navigation for home dropdown results.
- Added compact results dropdown (max 10 entries) with click-to-copy (`ABBR — Expansion`) and toast feedback.
- Added Library view with collapsed-by-default categories and subcategories plus smooth accordion animation.
- Removed all Orchestrator transfer UI and logic.
- Confirmed no A–Z / first-letter filter UI exists.

### What was fixed
- Decoupled data from markup to support both full and embeddable experiences.
- Added ranking logic with explicit priority: exact abbr > prefix > contains > expansion > description.

### What was simplified
- Reduced visual density by splitting into two clear modes (Home Search vs Library).
- Removed non-essential modal workflows that interrupted glossary usage.

### Remaining risks
- Clipboard behavior can vary by browser security context; fallback path is implemented, but real clipboard permissions still depend on runtime environment.
- E2E checks rely on Playwright runtime availability in the execution environment.

## Iteration 2

### What changed
- Added automated checks under `scratch/tests/`:
  - `glossary-search.test.js` (unit ranking + copy-format tests)
  - `lint-glossary.js` (forbidden/required UI token checks)
  - `glossary-e2e.mjs` (Playwright end-to-end acceptance checks)
- Verified keyboard interactions, copy behavior, view switching, collapsed-by-default library accordions, and removal of legacy Orchestrator/A-Z UI through E2E checks.

### What was fixed
- Addressed runtime dependency gap for E2E by running tests with a local Playwright runtime in `scratch/tests`.
- Removed unintended root `package.json` artifact created during test runtime setup.

### What was simplified
- Kept production feature implementation free of build tooling and framework dependencies.
- Confined test runtime tooling to `scratch/tests` so deployment behavior remains static.

### Remaining risks
- If `scratch/tests/node_modules` is absent, E2E requires local Playwright install before execution.
- Clipboard behavior still depends on browser permissions in non-test contexts, though fallback copy flow is implemented.

## Iteration 3

### What changed
- Re-ran full check sequence after cleanup:
  - `node --test scratch/tests/glossary-search.test.js`
  - `node scratch/tests/lint-glossary.js`
  - `node scratch/tests/glossary-e2e.mjs`
- Added explicit `scratch/tests/package.json` + lockfile usage for reproducible Playwright E2E runtime installation in the test folder.

### What was fixed
- Adjusted E2E setup command to run `npm install` from `scratch/tests` (instead of root-prefix mode) to avoid root-package lookup errors.

### What was simplified
- Kept production route (`web/ai-init`) free of runtime dependencies; only test folder needs Playwright install.

### Remaining risks
- Test bootstrap requires one install step in `scratch/tests` before running E2E on a clean machine.

## Iteration 4

### What changed
- Normalized edited files to UTF-8 without BOM.
- Re-ran full check sequence after encoding cleanup.

### What was fixed
- Removed BOM side effects from edited HTML/JS/MD files to keep file encoding consistent.

### What was simplified
- Finalized check flow as repeatable commands with deterministic outputs.

### Remaining risks
- None beyond the previously noted Playwright install prerequisite in `scratch/tests`.
