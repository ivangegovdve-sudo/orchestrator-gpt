# Forest HUB — sdforest.site

## Purpose
Ivan's public site + fleet dashboard (councils, library, kids apps, OS embeds), deployed on Vercel from GitHub `ivangegovdve-sudo/orchestrator-gpt`.

## Stack
Plain static HTML/CSS/JS, no framework. Source of truth: `web/<subpage>/index.html`. `npm run build` (`build-vercel-static.cjs`) copies into gitignored `vercel-public/` (Vercel outputDirectory). Push to `main` = production deploy; feature branches get preview URLs. Serverless functions under `api/` (`api/graphify.js` code-search index, `api/voice.js`, `api/library/`). Local preview server: `forest-hub-static`.

**The councils are not Vercel functions.** `api/council.js` no longer exists and no site code reads `OPENROUTER_API_KEY`; both councils stream straight from Oracle relays (`chloe.blumenkraft.cloud/council/relay` and `.../tinylm-api`) via `web/council/council.js`.

Global rules: `D:\projects\CODING_PRINCIPLES.md`. Detailed subpage briefs: `D:\output\misc\SDFOREST_SUBPAGE_SPECIFICS.md`.

## Non-obvious rules
- **Edit `web/`, never `vercel-public/`** — the latter is build output and gitignored.
- **Council structure (Ivan's ruling 2026-08-03 — supersedes the old 2-public/2-private split)**: there are **two councils, both public and ungated**, as modes inside the single page `web/council/index.html` — **TinyLLM Local Oracle** (`#tinylm`) and **OpenRouter Free** (`#openrouter-free`). The private councils were **deliberately removed, not gated**: Round Table and Chloé are gone, `/web/council/roundtable/` and `/web/council/chloe/` are 404, and the `COUNCIL_ACCESS_CODE` gate no longer exists anywhere in the repo. Do **not** rebuild those pages or reintroduce the gate. `web/council/{byok,inner}/` are legacy meta-refresh stubs → `#openrouter-free`; `web/council/tinylm/` → `#tinylm`.
- **Council privacy invariant (still binding)**: both councils are public surfaces, so neither may inject fleet memory, delegation context, or saved conversation state into output. Every TinyLM system prompt carries *"Do not claim access to user history, memory, tools, or other agents."* Keep that true for anything added to either mode.
- **Unified design tokens** (apply to every internal subpage): `--bg:#07070b --surface:#0f0f15 --border:rgba(255,255,255,0.08) --text-primary:#f3f4f6 --text-muted:#9ca3af --accent:#4f46e5 --accent-green:#22c55e --radius:8px`.
- Glossary data (`web/ai-init/glossary-data.js`) is a giant JS literal — a single premature `];` silently killed the live glossary once (repaired via `scripts/repair-glossary.cjs`). Data `<script>` tags carry `?v=` cache-busting; bump on data change.
- Preview screenshots time out on large pages — verify via a11y snapshot + eval instead.
- TinyLM council backend stays on Oracle (local Ollama models can't run on Railway/Vercel); frontends stream from Oracle's SSE endpoint.

## Active issues
- Phase 11 (subpage enhancement + style consolidation) is **substantially built and live**, not approval-gated — audit `D:\output\sdforest-subpages-audit-2026-08-03.md`; scope at `D:\output\misc\FABLE_SDFOREST_SCOPE.md`. §G/§H superseded by the council ruling above; §A/§I/§M/§N closed 2026-08-03; **§F closed 2026-08-07** — Life in Time does have the year-progress bar (`web/life-in-time/index.html:266`, a live `role="progressbar"` with computed `aria-valuenow`) plus the full late-achiever section, so no call is needed. Still open: **§L** per-agent SOUL.md installs, Oracle-side and not observable from the site; and **back-link labels are still mixed sitewide** — 9 pages say "Back to Forest HUB", most others "← Forest HUB", a few "Forest HUB"/"← SDForest". Closing §N properly means picking one and applying it everywhere.
- OS embeds run through `chloe.blumenkraft.cloud` on Oracle (nginx → FastAPI), **not** local Windows APIs — there is no Task Scheduler / PC-uptime dependency, and no `:8090`/`:8091` anywhere in `web/`. Verified 2026-08-03: `POST /hypertrophy/query` and `POST /womens-health/query` both return real cited answers. HypertrophyOS hardcodes the Oracle URL; Women's Health defaults to it but honours a `?api=` param or `wh_api` localStorage override.
- ~~`web/avatar-playground/` relative `./assets/` paths~~ — **fixed 2026-08-07**: all five bundle references plus the stylesheet are now absolute `/web/avatar-playground/assets/…`, matching `web/rubiks-teacher/`. A no-trailing-slash URL no longer 404s the scripts. Keep new build output absolute if the bundle is ever regenerated.
