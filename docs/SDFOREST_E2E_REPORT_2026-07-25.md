# SDForest Redesign E2E Report — 2026-07-25

## Release identity

- Branch: `feat/sdforest-redesign`
- Safety: feature branch only; `main` was not modified.
- Upstream base: `origin/main` at `cd39326`
- Implementation checkpoint: `fe4e2d2`
- Final preview (stable branch alias): `https://orchestrator-gpt-git-feat-sdfore-35eb5a-ivans-projects-1a79b2cd.vercel.app`
- Verified implementation deployment: `dpl_CXm4m9UtczYpPh8mCwHnpoeoTF1Q`
- Verified implementation commit: `98934c613f9b5ccf0a99e2db314705e41225f1e7`
- Verified implementation URL: `https://orchestrator-ccllxn8tc-ivans-projects-1a79b2cd.vercel.app`
- Authority reviewed before implementation:
  - `D:\projects\ivan-workspace\SDFOREST_REDESIGN_BRIEF.md`
  - `D:\projects\orchestrator-gpt\docs\SDFOREST_SUBPAGE_STATUS.md`
  - `D:\projects\orchestrator-gpt\docs\SDFOREST_SUBPAGE_SPECIFICS.md`
- `docs/SDFOREST_ANIMATION_SPEC.md` is absent across `D:\projects`; requirements unique to that missing file remain `UNVERIFIABLE`.

## Verification summary

| Check | Result | Evidence |
|---|---:|---|
| Integrated route and behavior contracts | PASS | 150/150 after the implementation rebase; final browser-free regression suite 111/111 |
| Independent final static authority audit | PASS | 110/110 |
| Static Vercel build | PASS | `npm run build` |
| Patch hygiene | PASS | `git diff --check` |
| Public route HTTP pass | PASS | 43/43 reviewed routes returned HTTP 200 on the verified preview |
| Library Memory deployment regression | PASS | Directory and explicit-index URLs both returned HTTP 200 |
| Legacy Library redirect | PASS | Exact, no-slash, index, and child forms returned HTTP 308 with `Location: /web/library/` |
| Scroll-speed-linked landing motion | PASS | Preserved velocity-amplified slam behavior |
| Power Law six-step simulation | PASS | 47 failures, 2 neutral bets, 1 recovering outlier |
| Public Council boundary | PASS | Exactly TinyLLM Local Oracle and OpenRouter Free; no public gate/key/private council code |
| Hypertrophy OS live corpus | PASS | 67 papers, 860 facts, 82 rules; HTTP 200 |
| Women’s Health OS live corpus | PASS | 103 papers, 2,447 facts, 89 rules; HTTP 200 |
| Health database integrity | PASS | `quick_check=ok`, zero FK errors, zero new zero-fact papers, zero PMCID/DOI/hash duplicate groups |
| Service continuity | PASS | Both Oracle services retained their original process IDs with zero restarts |

## Public subpage results

| Route | Result |
|---|---:|
| `/` | PASS |
| `/web/kids/` | PASS |
| `/web/math-mania/` | PASS |
| `/web/kids-movie-library/` | PASS |
| `/web/library/` | PASS |
| `/web/library/glossary/` | PASS |
| `/web/library/platform/` | PASS |
| `/web/library/rag.html` | PASS |
| `/web/library/repos/` | PASS |
| `/web/library/general/` | PASS |
| `/web/library/chloe/` | PASS |
| `/web/library/memory/` | PASS |
| `/web/ai-init/` | PASS — Library child/alias; the master brief does not require redirecting it |
| `/web/council/` | PASS |
| `/web/ai-research/` | PASS |
| `/web/c2c-dolphin/` | PASS |
| `/web/c2c-self/` | PASS |
| `/web/power-law-odyssey/` | PASS |
| `/web/life-in-time/` | PASS |
| `/web/mendeleev-bg/` | PASS |
| `/web/hypertrophyos/` | PASS |
| `/web/womens-health-os/` | PASS |
| `/web/calendar/` | PASS |
| `/web/manifesto-newborn/` | PASS |
| `/web/manifesto-newborn/bg/` | PASS |
| `/web/manifesto-newborn/de/` | PASS |
| `/web/manifesto-newborn/es/` | PASS |
| `/web/manifesto-newborn/fr/` | PASS |
| `/web/manifesto-newborn/it/` | PASS |
| `/web/manifesto-newborn/mk/` | PASS |
| `/web/manifesto-newborn/pt/` | PASS |
| `/web/manifesto-newborn/ru/` | PASS |
| `/web/manifesto-newborn/zh/` | PASS |
| `/web/m-popova/` | PASS |
| `/web/morning-news/` | PASS |
| `/web/open-overview/` | PASS |
| `/web/open-overview/openrouter/` | PASS |
| `/web/open-overview/github/` | PASS |
| `/web/vfx-portfolio/` | PASS |
| `/web/replicator-void/` | PASS |
| `/web/math-forest/` | PASS |
| `/web/avatar-playground/` | PASS |
| `/web/upload/` | PASS |

## Redirect and route-boundary results

| Route | Result |
|---|---:|
| `/web/llm-db/` | PASS — permanent redirect to `/web/library/` plus static fallback |
| `/web/council/tinylm/` | PASS — redirects to the integrated TinyLLM public mode |
| `/web/council/byok/` | PASS — redirects to the keyless OpenRouter Free public mode |

## Final deployment regressions closed

- The first complete preview exposed one real 404 at `/web/library/memory/`. Root cause was the unanchored `.vercelignore` pattern `memory`, which removed `web/library/memory/index.html` before the Vercel build. A regression test reproduced the exclusion, then the rule was narrowed to `/memory/`; both Memory URL forms now return the same HTTP 200 page.
- The raw redirect audit found that the wildcard Library redirect did not cover the exact directory URL. An exact permanent rule for `/web/llm-db/` now precedes the wildcard. `/web/llm-db/`, `/web/llm-db`, `/web/llm-db/index.html`, and an arbitrary child path all return HTTP 308 with the exact destination `/web/library/`.
- The two legacy Council URLs intentionally retain static client fallbacks to the two public Council anchors. They expose no gate, private route, or key-entry target.

## Authority-specific acceptance

- Forest HUB has no Voice2Voice/v2v surface, contains Morning News, one Kids Corner card, one Library & Platforms card, exact core color tokens, and exactly one title crown SVG.
- Kids Corner links exactly Math Mania and Kids Movie Library at their existing routes.
- Forest Trails connects 24 canonical destinations across six thematic trails. Knowledge Ingest now participates in Signals & Systems and links to Library, AI Research, and Councils.
- Shared Three.js motion exposes continuous `uMouse`, click-pulse `uClick`, reduced-motion/static fallbacks, context-loss recovery, bounded DPR, and page-specific theme identities.
- Cards and Council modes are pre-sized; hover does not enlarge their footprints.
- Power Law Odyssey contains six substantive chapters, a real user-controlled 50-bet simulation, and GPU-backed `translate3d` Z-scroll driven by `--scroll-p`.
- Mendeleev, Life in Time, Women’s Health, and Kids Corner include the final keyboard, labeling, dialog, and decorative-image accessibility fixes.
- Health ingestion used only explicitly licensed, non-retracted open-access artifacts resolved through Europe PMC/PMC OA/Unpaywall workflows. No public gate code or secret was added.

## Health ingestion and backup evidence

- Hypertrophy OS feature branch: `feat/lawful-oa-ingest` at `bcae0d36374c82c8d0bfca7ac3034c710fb0f40d`; live corpus 57 → 67 papers, 679 → 860 facts, 52 → 82 rules.
- Women’s Health OS feature branch: `feat/lawful-oa-ingest` at `bb61fc89f0e323a59e6b1d25766390f75e3d9728`; live corpus 82 → 103 papers, 1,897 → 2,447 facts, 136 → 89 rebuilt rules.
- Final verified SQLite backups: `D:\backup-logs\sdforest-health\20260725T223901Z-final\`
  - `hypertrophy.db`: 593,920 bytes; SHA-256 `6e6f346c5a6a523c9ae88754c049cca5f74796820a96cdd40755313fe65b6a95`
  - `womens_health.db`: 2,281,472 bytes; SHA-256 `4888e1a78723fd61b90ef7122318298179eba2831cac17673f14328b5ee19096`
- Both backups report `quick_check=ok`, zero foreign-key errors, and were created through SQLite’s online backup API.
- Final public health checks returned HTTP 200, and neither Oracle service was restarted.

## Deliberate non-actions

- No commit or merge was made to `main`.
- Neither Oracle health service was restarted.
- Private Council surfaces were not exposed or linked.
- The missing animation specification was not guessed or fabricated.
