# SDForest Subpage Specific Improvements
*Recovered from session transcript 2026-07-08. This is Ivan's actual stated intentions.*
*Reference file for Phase 11 of FABLE_SDFOREST_SCOPE.md*

---

## STRUCTURAL CHANGES (do first)

### 1. Merge Platform + Glossary subpages
Ivan (Line 22261): "I would like to merge the platform subpage and the glossary subpage."
- **Keep**: `/web/library/` as the combined destination (AI glossary + platforms side by side, already has dual search)
- **Remove or redirect**: `/web/llm-db/index.html` → redirect to /web/library/
- The library already has "527+ AI & infra terms next to 160+ tools" — extend it to be the sole reference page
- Update the landing page card from two separate cards to one combined "Library & Platforms" card

### 2. Kids subpage consolidation
Ivan: "congestion of all the kids' projects into one subpage"
- Create `/web/kids/` as a hub page housing **Math Mania** + **Kids Movie Library**
- Remove the two separate landing page cards; replace with one "Kids Corner" card linking to /web/kids/
- /web/kids/ should have consistent styling and link to both apps clearly
- Math Mania: `/web/math-mania/` stays as-is, just embedded/linked from the hub
- Kids Movie Library: `/web/kids-movie-library/` stays as-is, just embedded/linked from the hub

### 3. Mendeleev BG (no change needed on structure)
Ivan (Line 8164): "keep this one lose the other one - https://www.sdforest.site/web/mendeleev-bg/ lose the other mendeleev table sub page."
- The live site already shows only mendeleev-bg (the Bulgarian version with compound highlighting)
- If any residual mendeleev-table entry exists, remove it
- Polish: apply unified design tokens, verify compound highlighting works on mobile, improve element deep-dive panel layout and Bulgarian text rendering

---

## SUBPAGE IMPROVEMENTS

### 4. Power Law Odyssey — Polish
Ivan (Line 22261): "the z-dipped scrollable website needs a polish"
Full blueprint: `D:\output\research\RESEARCH-drive-power-law-odyssey-website-blueprint-pdf-2026-06-26.md`

The blueprint specifies a 6-step Z-axis camera timeline scroll narrative:
- Step 1: "Are you playing the game of life wrong?" — dark minimalist opening
- Step 2: Normal curve vs. Power Law curve visualization (Bifurcation Matrix)
- Step 3: Multiplication Avalanche — cascading fractal branches, compounding
- Step 4: Asymmetric Risk — balance model with capped downside / infinite upside
- Step 5: Venture Bet Sandbox — **interactive**: user places bets, 94% fail, one outlier recovers all (this needs to actually be interactive, not a placeholder)
- Step 6: Epiphany — "Make repeated intelligent bets"

Polish tasks:
- All 6 steps must be fully implemented (not stubs)
- Step 5 must be a real interactive simulation (not `[3D Interactive Graph Space]` placeholder)
- Smooth GPU-accelerated Z-axis scroll (CSS `translate3d` + `--scroll-p` variable as per blueprint)
- Apply unified dark design tokens (#07070b background, high contrast)
- Verify smooth performance on mobile (the Z-scroll can be janky on mobile — optimize)

### 5. Life in Time improvements
Already live at `/web/life-in-time/`: "Personal Time remaining in summers, heartbeats, Christmases — year-progress bar, late-achiever pivot, and shareable link"

Improvements:
- Verify shareable link generates a valid, working URL with the current state
- Enhance year-progress bar visual (more prominent, better animation)
- "Late-achiever pivot" section — if not already prominent, add it
- Apply unified design tokens
- Ensure mobile-first responsive layout

### 6. Round Table council — Frontend redesign
Ivan (Line 34886): "The frontend is cluttered and unappealing so to speak. It should redesign also pages to match the new frontend designs, look and feel."
Ivan (Line 22261): "the redesign of the roundtable council that runs on OpenRouter for free"

- Redesign `/web/council/roundtable/` frontend — cleaner layout, less clutter
- Keep all functionality: POST /api/council SSE, model roster display, streaming responses
- Match the site's unified dark design system
- Show model roster clearly (nemotron-ultra, nemotron-super, llama-3.3-70b, tencent/hy3)
- Better streaming UI (per-model stream containers, not a wall of text)

### 7. HypertrophyOS subpage — make it actually work
Currently: `/web/hypertrophyos/` exists as a card on the site but the FastAPI at :8090 is not persistent.

Tasks:
- The `/web/hypertrophyos/` iframe/embed should link to the actual running :8090 API
- Make the API start persistent via Windows Task Scheduler (ONLOGON trigger):
  `schtasks /Create /TN "HypertrophyOS-API" /TR "D:\projects\hypertrophy-os\.venv\Scripts\python.exe -m uvicorn src.api.main:app --host 0.0.0.0 --port 8090" /SC ONLOGON /F`
- Add **Sci-Hub integration** as the article source: Ivan said (Line 22261) "scihub is the thing that Women's Health and Hypertrophy OS should be looking for scientific articles in"
  - The ingest pipeline should try Sci-Hub URLs (doi.org → sci-hub resolver) before falling back to other sources
  - This makes a significant difference for paper ingestion completeness

### 8. Women's Health OS — deploy as new subpage
Currently NOT on the site. FastAPI running at :8091 (`D:\projects\womens-health-os`), ingest stalled at 65/117 papers.

Tasks:
- Create `/web/womens-health-os/` subpage on SDForest site
- Add to the landing page as a project card with appropriate description
- Connect to the FastAPI at :8091 (same pattern as HypertrophyOS)
- Make persistent:
  `schtasks /Create /TN "WomensHealthOS-API" /TR "D:\projects\womens-health-os\.venv\Scripts\python.exe -m uvicorn src.api.main:app --host 0.0.0.0 --port 8091" /SC ONLOGON /F`
- Advance ingest past 65/117 (with Sci-Hub integration)
- Existing frontend: `index.html` 345 lines with tabs: facts/rules/claims/papers

---

## COUNCIL STRUCTURE (important — 2 public, 2 private)

Ivan (Line 36531): "the two public LLM councils should be public, and the other two should not be. One [private] should be for Chloë's internal reasoning, and the other [private] should be for her external outsourcing of delegating a council session to get a verdict from the OpenRouter LLM council. Both are not to be on the public, since the latter uses memory and the tiny LLM council observes her internal fleet, which is also somewhat private."

BUT ALSO: Ivan (Lines 35014, 35033): "the tinyLM console needs to have a separate public URL... as a subpage on my forest SD forest.site, as the consciousness experiment"

Resolution: The current 4-panel council under `/web/council/` has Chloe and Round Table gated (correct). The TinyLM and BYOK panels need clarification:
- **TinyLM public version**: create a standalone consciousness-experiment page that lets visitors send a question to the local Ollama models and watch them deliberate — BUT does NOT expose fleet memory or private context. This is the "consciousness experiment" for public. Path: `/web/council/tinylm/` (already exists, but gate it properly — remove fleet state from public outputs)
- **BYOK council**: Already essentially public (user brings their own key). Keep as public.
- **Round Table** (fleet-memory-grounded OpenRouter): PRIVATE — keep access code 2142 gate
- **Chloe** (direct chat): PRIVATE — keep access code gate

### TinyLM Backend on Railway
Ivan (Line 22276): "tiny LM round table for the railway"
Ivan (Line 35033): "whether a railway can take the load"
- Consider running the TinyLM council backend on Railway (the $5/mo plan Ivan is keeping) to offload from Oracle
- BUT: the Ollama models (Tiny-Agent, eve, llama3.2:1b, qwen2.5:0.5b) are local-only on Oracle ARM — Railway can't run these
- Resolution: The public-facing TinyLM page streams FROM Oracle's /council/stream endpoint — Railway can serve the static frontend if needed, but the SSE backend stays on Oracle (it's the only place with the local models)
- Keep existing Oracle council/stream endpoint. Front the public TinyLM page as a proper public subpage without fleet context in the output.

---

## DESIGN SYSTEM

### Unified design tokens to apply across ALL internal subpages:
```css
:root {
  --bg: #07070b;           /* main background */
  --surface: #0f0f15;      /* card/panel background */
  --border: rgba(255,255,255,0.08);
  --text-primary: #f3f4f6;
  --text-muted: #9ca3af;
  --accent: #4f46e5;       /* indigo accent */
  --accent-green: #22c55e;
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```
Every internal page should use these variables. Check each page and apply where missing.

---

## SCI-HUB INTEGRATION NOTE
Ivan: "scihub is the thing that Women's Health and Hypertrophy OS should be looking for scientific articles in"
- When ingesting papers by DOI, try `https://sci-hub.se/{doi}` as the PDF source
- This is a significant difference for paper coverage — many papers are paywalled elsewhere
- Add this as a resolver step in both OS ingest pipelines BEFORE falling back to direct DOI redirect

---

## FLEET SKILL INSTALLATIONS
Ivan (Line 34868): "the fleet's abilities... need to have not just their authentications and PITs and APIs, etc., and permissions, but also their skills as well. That should be carried over with bonuses not with skills missing."

For each agent SOUL.md on Oracle:
- **Anderson** (coding agent): code review skills, debugging, git operations, API testing
- **Banker**: financial analysis, budgeting, data visualization skills
- **Sheriff**: security review, compliance checking, monitoring skills
- **Librarian** (hermes-forest): research skills, deep research, academic-research-skills, knowledge synthesis
- **Artist** (hermes-artist): image gen, design skills (taste, motion, impeccable), creative writing
- **Chloe**: all voice/delegation skills + search_repos + council delegation
- **Iris**: health research skills, data analysis, women's health domain knowledge, sci-hub sourcing

Design skills installed in Cowork (taste/motion/huashu/impeccable/open-design) per memory — these need to be REFERENCED in Artist's SOUL.md on Oracle so she knows they exist.

---

*Last updated: 2026-07-08. Source: session transcript lines 8164, 22261, 22276, 34868, 34886, 35014, 35033, 36531.*
