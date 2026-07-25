# SDForest Subpage Projects — Intent, Goal, Status, Next Tasks
_Generated 2026-07-25 from SDFOREST_SUBPAGE_SPECIFICS.md + FABLE_SDFOREST_SCOPE.md + session memory_

---

## 1. Landing Page (Forest HUB)

**Intent:** Central entry point that communicates what sdforest.site is and links all projects cleanly.

**Goal:** One tree crown graphic behind the "Forest HUB" title. Unified dark design tokens applied. Cards reorganized to reflect merged sections (Kids hub = 1 card, Library+Platforms = 1 card). Morning news section added. v2v (voice-to-voice buddy) reference removed.

**Status:** PENDING. Cards not yet reorganized. v2v reference still present. Morning news not added. Tree crown rule confirmed by Ivan 3× but not implemented.

**Next tasks:**
- Remove v2v reference from landing page
- Add morning news card/section
- Collapse Kids Mania + Kids Movie Library into one "Kids Corner" card
- Collapse Library + AI Platforms into one "Library & Platforms" card
- Apply ONE tree crown SVG/image behind the Forest HUB title (not zero, not two)
- Apply unified design tokens (--bg: #07070b, --surface: #0f0f15, etc.)

---

## 2. Kids Hub (`/web/kids/`)

**Intent:** Reduce landing page clutter by consolidating Math Mania and Kids Movie Library into a single hub page.

**Goal:** `/web/kids/` exists as a portal with both apps linked clearly. Landing page has one "Kids Corner" card instead of two. Both sub-apps get design token pass.

**Status:** NOT CREATED. Math Mania and Kids Movie Library currently have separate landing page cards. Hub page `/web/kids/` does not exist.

**Next tasks:**
- Create `/web/kids/index.html` as a hub linking to both sub-apps
- Replace two landing page cards with one "Kids Corner" card → `/web/kids/`
- Apply unified design tokens to Math Mania and Kids Movie Library
- Verify both sub-apps are still reachable at their original paths

---

## 3. Library & Platforms (merged) — `/web/library/`

**Intent:** Ivan wants the AI Glossary and AI Platforms Map combined into one reference page instead of two separate subpages.

**Goal:** `/web/library/` serves both 527+ term glossary AND 160+ tool/platform map in one page with dual search. `/web/llm-db/` either removed or 301-redirected to `/web/library/`. One landing page card replaces two.

**Status:** `/web/library/` already has dual content (glossary + platforms). `/web/llm-db/` may still have its own card. Redirect not set up.

**Next tasks:**
- Confirm whether `/web/llm-db/index.html` still exists
- Add redirect: `/web/llm-db/` → `/web/library/`
- Replace two landing page cards with one "Library & Platforms" card
- Apply design tokens to `/web/library/`

---

## 4. Power Law Odyssey — `/web/power-law-odyssey/`

**Intent:** A 6-step Z-axis scroll narrative about power laws, culminating in an interactive venture bet simulation.

**Goal:** All 6 steps fully implemented (not stubs). Step 5 is a real interactive simulation where the user places bets, 94% fail, one outlier recovers all. Smooth GPU-accelerated Z-scroll on desktop and mobile.

**Status:** EXISTS but incomplete. Step 5 "Venture Bet Sandbox" is a placeholder, not interactive. Z-scroll may be janky on mobile. Polish not applied.

**Blueprint:** `D:\output\research\RESEARCH-drive-power-law-odyssey-website-blueprint-pdf-2026-06-26.md`

**Next tasks:**
- Read the blueprint fully before touching code
- Implement Step 5 as a real interactive simulation (JS: user clicks "place bet", 94% scenarios fail, one recovers all — animated)
- Verify all 6 steps render with real content (not `[placeholder]` text)
- Optimize Z-scroll for mobile (CSS `translate3d` + `--scroll-p` variable, GPU-composited)
- Apply unified design tokens to non-3D UI chrome

---

## 5. Life in Time — `/web/life-in-time/`

**Intent:** Personal time visualization: remaining summers, heartbeats, Christmases, year-progress bar, late-achiever framing, shareable link.

**Goal:** Shareable link generates a valid URL with current state. Year-progress bar is prominent and animated. "Late-achiever pivot" section is visible. Design tokens applied. Mobile-responsive.

**Status:** LIVE but needs polish. Shareable link status unverified. Design consistency uncertain.

**Next tasks:**
- Verify shareable link generates a working URL and restores state on reload
- Enhance year-progress bar animation (more prominent)
- Confirm "late-achiever pivot" section is present and prominent; add if not
- Apply design tokens, verify mobile layout

---

## 6. Mendeleev BG — `/web/mendeleev-bg/`

**Intent:** Bulgarian interactive periodic table with compound highlighting. Keep this one; remove any duplicate.

**Goal:** Only one mendeleev entry on the site (the BG version). Compound highlighting works on mobile. Element deep-dive panel is readable. No residual `/web/mendeleev-table/` card.

**Status:** LIVE. Reportedly already the only mendeleev page shown. Polish not applied.

**Next tasks:**
- Confirm no duplicate mendeleev-table card exists on landing page; remove if found
- Verify compound highlighting works on mobile
- Improve element deep-dive panel layout
- Fix Bulgarian text rendering if issues present
- Apply design tokens

---

## 7. Round Table Council — `/web/council/roundtable/`

**Intent:** 4-model OpenRouter free-tier council for public use. Currently cluttered.

**Goal:** Clean, redesigned UI. Per-model stream containers instead of a wall of text. Model roster clearly labeled. Matches dark design system. Access code 2142 gate retained (this is a PRIVATE council per Ivan's ruling — fleet-memory-grounded).

**Status:** LIVE but UI is cluttered. Frontend redesign not done.

**Model roster:** nemotron-ultra-550b, nemotron-super-120b, llama-3.3-70b:free, tencent/hy3

**Next tasks:**
- Redesign the frontend: clean dark layout, per-model streaming containers with role labels
- Keep SSE streaming backend unchanged
- Keep access code 2142 gate (private)
- Apply unified design tokens

---

## 8. Council Privacy — 4 panels, 2 public / 2 private

**Intent:** Two councils are fleet-aware (private), two are public. Landing page should reflect this clearly.

**Goal:**
- TinyLM → PUBLIC (fleet context stripped from output)
- BYOK (bring your own key) → PUBLIC (ungated)
- Round Table → PRIVATE (access code 2142)
- Chloé → PRIVATE (access code gate)

**Status:** PARTIALLY IMPLEMENTED. Round Table and Chloé have gates. TinyLM and BYOK status unclear — TinyLM may still inject fleet context in the public stream.

**Next tasks:**
- Audit TinyLM SSE stream: if fleet state is injected, add `public_mode=true` param that skips context injection
- Confirm BYOK is ungated (no access code required)
- Add a visual "Public / Private" indicator on the landing page council section
- Confirm Round Table and Chloé gates are working

---

## 9. TinyLM Consciousness Experiment — standalone public subpage

**Intent:** Give the TinyLM council its own prominent public presence on SDForest as a "consciousness experiment" — visitors send a question and watch 5 tiny local models deliberate in real-time.

**Goal:** `/web/tinylm/` (or `/web/council/tinylm/`) is a standalone page with its own landing page card. The 5-model roster is explained (Tiny-Agent proposer, llama3.2:1b analyst, qwen2.5:0.5b critic, eve consciousness observer, qwen synthesizer). No fleet context in the public output.

**Status:** Panel exists inside the 4-panel council layout but is NOT a standalone page with its own landing page card.

**Backend note:** Local Ollama models run on Oracle only. Railway could serve the static frontend, but the SSE backend stays on Oracle.

**Next tasks:**
- Create `/web/tinylm/` as a standalone public subpage
- Add a dedicated "TinyLM Consciousness Experiment" landing page card with description
- Explain the experiment context on the page (who the models are, what they do)
- Ensure fleet context is NOT present in the public output stream
- Wire to Oracle's existing `/council/stream` SSE endpoint

---

## 10. HypertrophyOS — `/web/hypertrophyos/`

**Intent:** SDForest subpage for the hypertrophy research OS. FastAPI at :8090.

**Goal:** The subpage embed/iframe actually connects to the live :8090 API. API is persistent (starts on login, not just when manually run). Sci-Hub integrated into paper ingest pipeline.

**Status:** Card exists on site but API persistence is NOT set up (manual start). Sci-Hub ingest not wired. Current DB: Oracle 60 papers / 701 facts / 22 rules. Windows DB older (43/258/45).

**Next tasks:**
- Create Windows Task Scheduler ONLOGON trigger for :8090
- Add Sci-Hub resolver step to ingest pipeline: for each DOI, try `https://sci-hub.se/{doi}` before fallback
- Verify `/web/hypertrophyos/` embed actually queries the live API
- Advance paper count past 60

---

## 11. Women's Health OS — `/web/womens-health-os/` (NOT YET ON SITE)

**Intent:** Deploy Women's Health OS as a new SDForest subpage. FastAPI at :8091. Iris is wired to it.

**Goal:** `/web/womens-health-os/` exists with a landing page card. API persistent. Sci-Hub ingest unblocks the stalled 65/117 paper count. Existing frontend (tabs: facts/rules/claims/papers) is connected.

**Status:** NOT ON SITE. FastAPI exists at :8091. Ingest stalled at 65/117 papers. Frontend exists (`index.html`, 345 lines, 4 tabs). Oracle: 83 papers / 1,897 facts / 136 rules.

**Next tasks:**
- Create `/web/womens-health-os/` subpage in orchestrator-gpt repo
- Add landing page card with description
- Make :8091 API persistent (schtasks ONLOGON trigger)
- Wire Sci-Hub: `https://sci-hub.se/{doi}` as resolver step before fallback (this unblocks ingestion)
- Advance ingest from 65/117 → target 100+

---

## 12. Fleet Agent Skill Installations (per SOUL.md)

**Intent:** Each fleet agent's SOUL.md should reference not just their credentials but also their skills — so they know what they can do.

**Goal:** Each Oracle SOUL.md lists the agent's available skills explicitly.

**Planned skill additions per agent:**
- Anderson: code review, debugging, git ops, API testing
- Banker: financial analysis, budgeting, data viz
- Sheriff: security review, compliance, monitoring
- Librarian: research, deep research, knowledge synthesis
- Artist: image gen, taste/motion/impeccable/open-design/huashu design skills, creative writing
- Chloe: voice/delegation, search_repos, council delegation
- Iris: health research, data analysis, women's health domain, sci-hub sourcing

**Status:** NOT DONE. Phase 11L in scope doc. Partially blocked on Phase 1 (SOUL.md deploy) which is pre-Fable.

**Next tasks:**
- Update each local D:\agents\{agent}\SOUL.md with skill references
- Deploy updated SOUL.mds to Oracle
- Restart agent services, verify /health

---

## 13. Calendar, Manifesto, Poetry

**Intent:** Apply design token pass. Lower priority.

**Goal:** Each renders correctly on mobile and desktop with unified tokens.

**Status:** LIVE, no token pass done.

**Next tasks:** Design token application pass. Defer if Phase 11 is running long.

---

## Execution Preconditions (Ivan-gated)

Before any of the above Phase 11 work can be done via Fable, the approved sequence requires:
1. **Harness push** — `feat/health-check` branch ready to push, 2 clean runs done 2026-07-20. ⬅ PENDING push approval.
2. **Chloe pass** — wake word on desktop, duplex voice confirmed, GitHub/PGP/SM skills, working delegation, Telegram backup. Voice delegation is working (fixed this session). Wake word on desktop and Telegram backup still pending.
3. **Push repos** — all project repos pushed to GitHub (the current "push all projects" task).
4. **SDForest redesign** — Phase 11 Fable task.

Phases 0–10 of the Fable scope (fleet health, SOUL.md deploy, repos pipeline, research ingest, site councils, voice stack, TinyLM, phone delegation, OS frontends, DNS, Telegram tokens) are all also PENDING — Phase 11 subpages are technically the last phase.
