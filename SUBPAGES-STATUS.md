# SUBPAGES-STATUS.md — Forest HUB Progress Tracker

**Branch:** `feat/june21-polish`
**Session:** 2026-06-21 afternoon (Claude Code continuous improvement loop)
**Production:** https://sdforest.site (Vercel)

---

## Session Summary

Ran a continuous improvement pass across all active subpages. Below is the per-page status after this session.

---

## Hub Landing Page (`/`)

**Files:** `index.html`
**Status:** ✅ Polished
**Changes this session:**
- Added meta description for SEO
- Added footer with site stats (9 projects · 126 platforms · 522 terms · 24 movies)
- Updated hub card counts to match session output
- **Added Calendar Generator card** (was missing from hub grid despite page existing)
- Updated LLM Council card description to reflect 4-stage flow
- Updated Life in Time card description
- Updated hero tagline: "9 projects — 126 AI platforms — 522 glossary terms."
- Hub already has: 3D nebula hero canvas, perspective-tilt cards, emoji icons, staggered entrance animations

---

## LLM Platforms Map (`/web/llm-db/`)

**Files:** `web/llm-db/index.html`
**Status:** ✅ Polished
**Changes this session:**
- Expanded from 102 → 126 platforms (+24 new entries)
  - Original 20: Qwen, Reka AI, Minimax, Phind, Tabnine, OpenHands, Cursor Background Agent, Glide, Luma Dream Machine, Haiper AI, Hedra, Krea.ai, Udio, LiveKit, Speechify, Agno, Smolagents, Mem0, Fal.ai, Unstructured.io
  - Additional 4: Langfuse (observability), Helicone (proxy/observability), Scale AI (data labeling), Baseten (model deployment)
  - Session 3 additions (4): Writer (enterprise AI), OpenPipe (fine-tuning), SambaNova (fast inference chips), DeepInfra (cost-optimized API)
- Added green "NEW" badge on recently added platforms
- Added `/` keyboard shortcut to focus search input
- Clear-filters button already wired (shows when filters active)

---

## AI & Tech Glossary (`/web/ai-init/`)

**Files:** `web/ai-init/index.html`, `glossary-data.js`, `app.js`
**Status:** ✅ Polished
**Changes this session:**
- Expanded from 492 → 522 terms (+30 new entries)
  - Batch 1 (16): SFT, TTFT, TPS, CAI, VLM, ASR, TTS, FIM, ToT, Hallucination, Alignment, Jailbreak, Grounding, Watermarking, Context Window, System Prompt
  - Batch 2 (5): Temperature, Top-p, Tokenization, Prefix Caching, Pre-training
  - Batch 3 (4): Multimodal, Tool Use, Vector Store, Inference
  - Batch 4 (5): Agent, Few-shot, Zero-shot, Prompt Engineering, Fine-tuning
- Added gotchas to 10 key terms that were missing them
- Added back-to-hub link
- Added `/` keyboard shortcut to focus search
- Updated hero description: "Search 522+ AI, compute, cloud, and infra abbreviations instantly"

---

## Life in Time (`/web/life-in-time/`)

**Files:** `web/life-in-time/index.html`
**Status:** ✅ Polished
**Changes this session:**
- Expanded ACHIEVERS from 14 → 24 entries (replaced bad duplicate with Harry Bernstein, age 96)
- Added age-based achiever filtering (shows achievers at user's age or later)
- Added 2 new stat cards: Minutes and Books remaining
- Added animated year-progress bar in header (shows "2026 is X% gone + days left")
- **Added URL sharing**: page now reads `?by=&py=&cy=&le=` params and auto-calculates
  - "🔗 Share link" button copies shareable URL to clipboard
- Back-to-hub link already present
- CSS animations: `statIn`, `hbPulse` on stat cards

---

## Mendeleev BG (`/web/mendeleev-bg/`)

**Files:** `web/mendeleev-bg/index.html`
**Status:** ✅ Polished
**Changes this session:**
- Added back-to-hub link
- **Expanded chemistry RECIPES from ~27 → 32 elements covered**
  - Added F(9): HF (etches glass), NaF (toothpaste), PTFE (Teflon), SF₆, CaF₂
  - Added Cr(24): Cr₂O₃ (green pigment), CrO₃ (chrome plating), K₂Cr₂O₇, FeCr₂O₄, CrCl₃
  - Added Co(27): CoO (blue ceramics), LiCoO₂ (Li-ion batteries), CoCl₂ (humidity indicator), Co₃O₄, Co(CH₃COO)₂
  - Added Sn(50): SnO₂ (ITO coating), SnCl₂ (reducing agent), Bronze alloy, SnF₂, Tetramethyltin
  - Added Ba(56): BaSO₄ (X-ray contrast), BaCO₃ (ceramics), BaCl₂ (pyrotechnics green), Ba(OH)₂, BaTiO₃ (piezo)
- Bulgarian periodic table with clickable element modals

---

## Kids Movie Library (`/web/kids-movie-library/`)

**Files:** `web/kids-movie-library/index.html`, `app.js`, `styles.css`
**Status:** ✅ Polished
**Changes this session:**
- Expanded from 15 → 24 curated films
  - Session 1 additions (5): Song of the Sea, Kubo and the Two Strings, Nausicaä, Arrietty, Ernest & Celestine
  - Session 2 additions (4): Moana (2016), Encanto (2021), How to Train Your Dragon (2010), Paddington (2014)
- Updated hub footer count: 20 → 24 curated movies
- Existing features: tag filtering, watched/rated state in localStorage, BG audio filter, stagger animation

---

## LLM Council (`/web/council/`)

**Files:** `web/council/index.html`, `api/council.js`, `vercel.json`
**Status:** ✅ Upgraded
**Changes this session:**
- Added markdown renderer (bold/italic/headings/bullets)
- Added auto-scroll to bottom
- Added copy-all button with CSS
- Added 2 new example questions (longevity diet, AI alignment for founders)
- **4th Judge stage added** (hook-generated): Proposer → Critic → Synthesizer → Judge
- Added `vercel.json` config: `maxDuration: 60` for council function
- Diverse model roster: 5 families (GPT-oss, Nemotron, Qwen, Hermes, GLM)

---

## Calendar Generator (`/web/calendar/`)

**Files:** `web/calendar/index.html`, `styles.css`, `app.js`
**Status:** ✅ Already complete
**Changes this session:** None needed — page has back link, mobile responsive, print styles

---

## Math Mania (`/web/math-mania/`)

**Status:** ✅ Working (static iframe → `https://forest-math-plus.lovable.app`)
**Changes this session:** None — external app, no edits possible

---

## Math Forest (`/web/math-forest/`)

**Status:** ⚠️ Placeholder only
**Decision needed:** Rebuild or permanent placeholder?

---

## Not Accessible from Hub

| Page | Notes |
|------|-------|
| A1111 Debug | Local-only, requires AUTOMATIC1111 |
| Runware Icon Gen | Not linked from hub — Ivan's decision |

---

## Site-wide Changes

- Dark interactive landing and scroll-assembled portal dashboard
- Truthful project status labels and route map
- Back-to-hub links: all active subpages have them
- `/` keyboard shortcut: LLM Platforms + AI Glossary
- Calendar Generator card added to hub grid (was missing)
- Hub card counts updated: 130 platforms · 522 glossary terms · 24 movies
- Meta description + OG tags added to: Life in Time, Mendeleev, Kids Movie Library, LLM Council

---

## Commit Log Summary

| Commit | Change |
|--------|--------|
| `07fe0b3` | LLM platforms 102→122, Life in Time 14→24 achievers + age filter + 2 stat cards |
| `cefa748` | Glossary 492→508, council markdown/scroll/copy-all, hub counts |
| `673a253` | Mendeleev back-link, kids movies 15→20, council copy CSS |
| `598afe5` | AI Glossary back-link + 508 count, council 4-stage Judge upgrade |
| `722a50f` | `/` search shortcuts + vercel council config + hub meta desc |
| `e971cd2` | Hub footer, NEW badges on 16 platforms |
| `22d25dc` | Life in Time year-progress bar + fix bad achiever + SUBPAGES-STATUS |
| `530d878` | Glossary gotchas for 5 key terms + council hub card update |
| `3463fa2` | Hub: Calendar Generator card added to grid |
| `3578016` | LLM Platforms 122→126 (Langfuse, Helicone, Scale AI, Baseten) |
| `82e1e9d` | Life in Time URL sharing + 🔗 Share link button |
| `a7880b1` | Glossary +5 terms (Temperature, Top-p, Tokenization, Prefix Caching, Pre-training) |
| `a356fa7` | Glossary +4 core terms (Multimodal, Tool Use, Vector Store, Inference) |
| `c52d1d7` | Glossary +5 foundational terms (Agent, Few-shot, Zero-shot, Prompt Engineering, Fine-tuning) + hub hero tagline + 2 council example questions |
| `4743cd3` | Mendeleev: recipes for F(9), Cr(24), Co(27), Sn(50), Ba(56) — 5 new elements |
| `a27b4c9` | Kids movies 20→24 (Moana, Encanto, HTTYD, Paddington) + hub footer 24 movies |
| `19f09f7` | SEO: meta description + OG tags for Life in Time, Mendeleev, Kids Movies, Council |
| `6924a58` | LLM Platforms 126→130 (Writer, OpenPipe, SambaNova, DeepInfra) + hub counts |

---

*Auto-updated by Claude Code on 2026-06-21. Branch: feat/june21-polish.*
