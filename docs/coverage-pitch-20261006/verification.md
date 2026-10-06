# Coverage pitch verification

The requested public URL, `https://www.sdforest.site/web/open-dashboard/`, is owned by `ivangegovdve-sudo/orchestrator-gpt`. This Next repository owns the catalogue API at `https://openrouter-github-dashboard.vercel.app` and the companion Next landing page. Both changes are on `codex/open-dashboard-coverage-pitch` branches and delivered as draft PRs. The Next repository has `master` as its default branch and no `main`; Forest uses `main`. No production branch or deployment was changed.

## Live evidence

The reproducible API read in [measurement.json](./measurement.json) ran 2026-10-06 06:04:27–06:04:34 UTC: 5,222 distinct provider/ID entries, 2,443 priced entries across 13 providers, 1,104 image entries (159 native output-priced), 1,317 video entries (274 native output-priced), and 16 OpenRouter `:free` entries. All 16 registry endpoints answered; QwenCloud reported source unavailable, so 15 returned entries. Sail reported stale pricing, fal partial pricing, and Crazyrouter unknown population completeness. These observations produce a partial, lower-bound pitch, not a claim about unique underlying models or inference readiness.

The public-page browser read used the actual production API, with no response replay, fixture or snapshot fallback for hero counts. It independently matched every count above. [static-qa.json](./static-qa.json) records all 16 requested providers, counts, feedback destination, zero runtime/network errors and no horizontal overflow. Its timestamp is the browser read completion; source timestamps remain available in the expanded provider table.

## Checks

- Next production build, full ESLint and TypeScript: pass.
- Next tests: 1,162 pass, 3 intentionally skipped.
- Static dashboard existing suite: 137 pass. New coverage/read-boundary suite: 14 pass.
- Forest static build and build-backed foundation: pass (6 foundation tests).
- Wider Forest source contracts: 227 pass, 1 pre-existing unrelated AI-kit failure (`scratch/tests/ai-kit-data-contract.test.js:354`, 113 fallback rows versus expected 108). The task does not alter those files; the same failure is recorded in the prior live-refresh report.
- Independent review confirmed both count implementations match the retained public responses. Source warnings remain explicit and native credits are never labeled dollars.

## Browser and interaction checks

Browser/IAB tools were unavailable, so Playwright Core used the installed `/usr/bin/chromium`. The public page was checked at 1440×1120, 390×1000 and 320×900 with live production reads. The Next production build was checked at 1440×1400 and 390×844 using replay of the exact fresh production response bodies; an all-provider failure separately verified unknown counts and generic copy.

The feedback form opens `https://github.com/ivangegovdve-sudo/orchestrator-gpt/issues/new`, a real form in the public SD Forest repository. The Next repository is private and cannot serve public suggestions. Submission instructions explicitly require GitHub sign-in and final submission there. Special characters and multiline suggestions survive URL encoding; both forms work without JavaScript. Tests intercepted the draft navigation and created no issues.

The public mobile navigation opens and closes with Escape, and neither desktop nor mobile overflows. Final desktop, mobile and feedback screenshots were captured and inspected with `view_image`.

## Existing-design fidelity ledger

This is a copy and small UI change inside the existing design system, so the reference is the existing public studio and its `studio.css`, rather than a new generated concept. The baseline page and final browser captures were inspected directly.

| Point inspected | Result |
| --- | --- |
| Above-the-fold copy | Old provider claims, Crazyrouter/OpenRouter pitch and comparison-studio labels removed. The allowed replacement copy expresses catalogue coverage, pricing, free options, image/video entries and entry/readiness caveats. |
| Layout | Existing sidebar, two-column editorial opening and paper evidence sheet retained; metrics replace claim comparisons. Long source explanations moved below metrics to keep the receipt header compact. |
| Typography | Existing Manrope retained; heading tuned to its longer measured sentence, native units and timestamp remain readable. |
| Palette and containers | Existing plum, paper and mint variables retained; no new palette or generated imagery. |
| Assets and controls | Existing brand assets load; new action arrows use SVG, avoiding missing glyphs. Feedback is a compact native details/form affordance. |
| Responsive behavior | Opening stacks below 800px; metrics and controls fit at 390px and 320px, with no page overflow. |

The final implementation was faithfully verified against the existing design. The intentional changes are the requested pitch, measured coverage sheet and suggestion window. No material visual mismatches remain in the changed surface.

## Screenshots

- [Public landing, desktop](./open-dashboard-desktop.png)
- [Public landing, mobile](./open-dashboard-mobile.png)
- [Public feedback window](./open-dashboard-feedback.png)
- [Next landing, desktop](./next-pitch-desktop.png)
- [Next landing, mobile](./next-pitch-mobile.png)
