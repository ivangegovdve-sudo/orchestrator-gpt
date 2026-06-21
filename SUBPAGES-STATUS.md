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
- Added footer with site stats (9 projects · 122 platforms · 508 terms · 20 movies)
- Updated hub card counts to match session output
- Hub already has: 3D nebula hero canvas, perspective-tilt cards, emoji icons, staggered entrance animations

---

## LLM Platforms Map (`/web/llm-db/`)

**Files:** `web/llm-db/index.html`
**Status:** ✅ Polished
**Changes this session:**
- Expanded from 102 → 122 platforms (+20 new entries)
  - Qwen, Reka AI, Minimax, Phind, Tabnine, OpenHands, Cursor Background Agent, Glide, Luma Dream Machine, Haiper AI, Hedra, Krea.ai, Udio, LiveKit, Speechify, Agno, Smolagents, Mem0, Fal.ai, Unstructured.io
- Added green "NEW" badge on 16 recently added platforms
- Added `/` keyboard shortcut to focus search input
- Clear-filters button already wired (shows when filters active)

---

## AI & Tech Glossary (`/web/ai-init/`)

**Files:** `web/ai-init/index.html`, `glossary-data.js`, `app.js`
**Status:** ✅ Polished
**Changes this session:**
- Expanded from 492 → 508 terms (+16 new entries)
  - SFT, TTFT, TPS, CAI, VLM, ASR, TTS, FIM, ToT, Hallucination, Alignment, Jailbreak, Grounding, Watermarking, Context Window, System Prompt
- Added back-to-hub link
- Added `/` keyboard shortcut to focus search
- Updated hero description to mention new terms
- Added `<kbd>/</kbd>` hint in search bar

---

## Life in Time (`/web/life-in-time/`)

**Files:** `web/life-in-time/index.html`
**Status:** ✅ Polished
**Changes this session:**
- Expanded ACHIEVERS from 14 → 24 entries (replaced bad duplicate with Harry Bernstein, age 96)
- Added age-based achiever filtering (shows achievers at user's age or later)
- Added 2 new stat cards: Minutes and Books remaining
- Added animated year-progress bar in header (shows "2026 is X% gone + days left")
- Back-to-hub link already present
- CSS animations: `statIn`, `hbPulse` on stat cards

---

## Mendeleev BG (`/web/mendeleev-bg/`)

**Files:** `web/mendeleev-bg/index.html`
**Status:** ✅ Polished
**Changes this session:**
- Added back-to-hub link
- Chemistry Recipes panel already present (19+ elements with DIY experiments)
- Bulgarian periodic table with clickable element modals

---

## Kids Movie Library (`/web/kids-movie-library/`)

**Files:** `web/kids-movie-library/index.html`, `app.js`, `styles.css`
**Status:** ✅ Polished
**Changes this session:**
- Expanded from 15 → 20 curated films (+5)
  - Song of the Sea (8.0), Kubo and the Two Strings (7.8), Nausicaä of the Valley of the Wind (8.1), The Secret World of Arrietty (7.5), Ernest & Celestine (8.0)
- Updated summary count in header
- Existing features: tag filtering, watched/rated state in localStorage, BG audio filter, stagger animation

---

## LLM Council (`/web/council/`)

**Files:** `web/council/index.html`, `api/council.js`, `vercel.json`
**Status:** ✅ Upgraded
**Changes this session:**
- Added markdown renderer (bold/italic/headings/bullets)
- Added auto-scroll to bottom
- Added copy-all button with CSS
- Added new example questions
- **4th Judge stage added** (hook-generated): Proposer → Critic → Synthesizer → Judge
- Added `vercel.json` config: `maxDuration: 60` for council function
- Model label: "Llama 3.3 70B · free · 2 rounds + judge · $0"

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
| Voice2Voice Buddy | External, separate Vercel deploy |

---

## Site-wide Changes

- Hub footer added
- Hub meta description added
- Back-to-hub links: all active subpages now have them
- `/` keyboard shortcut: LLM Platforms + AI Glossary
- All hub card counts updated to match actual content

---

*Auto-updated by Claude Code on 2026-06-21. Branch: feat/june21-polish.*
