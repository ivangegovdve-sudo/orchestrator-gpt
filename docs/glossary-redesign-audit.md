# Glossary Redesign Audit

Date: 2026-02-27
Branch: codex/glossary-minimal-redesign

## Source-of-Truth Check

- GitHub default branch (`main`) is current locally and remotely:
  - local `main`: `fc7ade8`
  - `origin/main`: `fc7ade8`
- Deployed URL inspected: `https://www.sdforest.site/web/ai-init/`
  - HTTP status: `200`
  - server header: `Vercel`
  - deployed markup still contains `Send to Orchestrator GPT` and `orchText` modal content.

## Where Glossary Lives

- Route entry from hub:
  - `index.html` links to `/web/ai-init/`
- Glossary implementation:
  - `web/ai-init/index.html`
- Current implementation style:
  - single static HTML file
  - inline CSS + inline JS
  - glossary data embedded directly in `const DATA = [...]` in-page

## Stack / Framework / Styling Reality

- No Next.js/React/Vue/Vite config found in repo root for this feature.
- No `package.json`/frontend build config used by `web/ai-init`.
- Glossary is a static route served as plain HTML/JS.
- Styling system for this feature is inline CSS (custom properties + plain selectors).
- Existing site visual language (from `index.html`, `web/prompt-builder/index.html`) uses dark theme, subtle gradients, rounded cards, and cyan/blue accents.

## Current Behavior Summary (Local vs Deployed)

Local `main` and deployed page are functionally equivalent:

- Header with title `AI Engineering Knowledge Map — V9`
- Right-side `Send to Orchestrator GPT` button opens overlay panel
- Left sidebar category links + right content list
- No prominent global search bar
- No Home Search vs Library view split
- No copy-on-click for glossary entries
- No toast feedback

## Current UX Issues

- Primary interaction is browse-only; search is missing.
- Sidebar + long content columns produce visual density/clutter.
- Orchestrator transfer modal is unrelated to glossary usage.
- Very large inline data + UI logic in one file reduces maintainability.
- No compact, keyboard-friendly result flow.

## Explicit Removals Planned

- Remove `Send to Orchestrator GPT` button.
- Remove front modal/overlay + `orchText` + copy prompt behavior.
- Remove any first-letter/A–Z filtering UI if present (none currently visible, but will be explicitly excluded).

## Proposed IA

1. Home Search (default)
- Centered prominent search bar
- Left books/library icon (hover loop animation)
- Right search icon/button
- Compact dropdown results (`8-12` max)
- Click or Enter on result copies `ABBR — Expansion`
- Toast feedback on copy

2. Library View
- Top compact pinned search bar
- Categories collapsed by default
- Subcategories collapsed by default
- Smooth expand/collapse animation
- Dense but clean item rows/cards
- Click item copies `ABBR — Expansion` + toast
- Clear, minimal switch back to Home Search

## Design Input / Tokens / Assets

- No Figma URL provided in this thread for direct implementation.
- No existing design-token pipeline found for this feature.
- No local SVG icon set discovered under `web/` for glossary.
- Plan: derive minimal tokens from existing site palette:
  - dark background layers
  - muted text + cyan/blue accent
  - medium-large radius
  - low-contrast borders

## Search / Data Notes

- Current data source is embedded in page script (`const DATA = [...]`).
- Search logic will be introduced with ranking priority:
  1. exact abbreviation
  2. abbreviation prefix
  3. abbreviation contains
  4. expansion contains
  5. description contains

## Expected File Changes

Core feature files:
- `web/ai-init/index.html` (new structure: Home Search + Library views)
- `web/ai-init/glossary-data.js` (extracted shared dataset)
- `web/ai-init/glossary-search.js` (search/ranking utilities)
- `web/ai-init/app.js` (view state, copy interactions, keyboard UX, toasts)

Embeddable search experience:
- `web/ai-init/embed/index.html`
- `web/ai-init/embed/embed.js`

Testing and verification artifacts (to be added):
- `scratch/tests/glossary-search.test.js` (unit ranking checks)
- `scratch/tests/glossary-e2e.js` (browser-level acceptance checks)
- `scratch/tests/lint-glossary.js` (basic static quality checks)

Progress notes:
- `docs/glossary-redesign-notes.md` (iteration-by-iteration self-critique updates)
