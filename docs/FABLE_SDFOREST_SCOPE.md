# FABLE TASK BRIEF: SDForest + Fleet Integration (Phased)
**Target session:** claude-fable-5
**Status:** PRE-FABLE — ready to execute Phase 0
**Date written:** 2026-07-07
**This file:** D:\output\FABLE_SDFOREST_SCOPE.md

---

## ⚠️ READ THIS FIRST — HOW THIS TASK RUNS

**THIS TASK RUNS IN PHASES. Phase 0 is a reality check. After each phase, post findings to Ivan and WAIT for explicit approval before the next phase.**

Rules that govern every phase:

1. **Do not front-load context.** Read only the section for the phase you are executing. Do not read all 11 phases into working memory at once. Each phase section below is self-contained — it names its own inputs, steps, and success test.
2. **Verify, don't assume.** Never claim a service exists, a file is deployed, or a step "worked" without observing real output (health response body, `cat` of the actual file, a query that returns data). Exit code 0 is not verification.
3. **One phase = one coherent unit of work.** Finish it, verify it worked with real output, then stop.
4. **Approval gates are hard stops.** At the end of each phase, post the CHECKPOINT message to Ivan: what you did (with evidence), and a one-line preview of the next phase. Then **STOP and WAIT** for Ivan's explicit "go" / "approved" / "proceed". Do not start the next phase on your own initiative.
5. **Phase 0 has no predecessor** — start it immediately on session start. Phases 1–10 each begin with: *"Wait for Ivan's approval from the previous phase before starting this one."*

If you run low on context mid-phase: write `D:\output\FABLE_SDFOREST_CHECKPOINT_PHASE_N.md` (what's done + what's pending + verdict), then tell Ivan. The next session resumes from that checkpoint. Never re-do a verified-complete phase.

---

## SHARED INFRA REFERENCE (small — safe to keep in context)

| Resource | Value |
|---|---|
| Oracle SSH target | **opc@100.109.5.44** (Tailscale — verified reachable). Public IP = 144.24.59.30 (use for DNS only). |
| Oracle specs | 4 OCPU, 22 GB RAM, aarch64 |
| Oracle SSH key | forest-a1 |
| SSH method | **paramiko ONLY** — Windows ssh.exe is broken since profile reset (~2026-06-26) |
| KVM2 | 187.127.86.176 (Tailscale 100.77.50.41), user ubuntu/kvm2, key kvm2_ed25519 — **SSH auth currently FAILING, Ivan must fix** |
| Soul-server | Oracle 127.0.0.1:8654 (soul-server.service). Endpoints: /health /chat /delegate /voice-token |
| Iris service | `iris-hermes.service` — port unconfirmed (:8644 vs :8648 discrepancy — verify with `ss -tlnp \| grep 864`) |
| Secrets | GCP SM project `forest-family-cloud`. Oracle has gcloud + ADC (read). **Never print secret values.** |
| sdforest.site repo | GitHub `orchestrator-gpt`, Vercel project prj_yCclktkxHWLTj7By9XraAi1QinRA, auto-deploys on push to main |
| chloe-memory repo | https://github.com/ivangegovdve-sudo/chloe-memory.git — local D:\Ivan\chloe-memory\ (5-min sync) |
| Agent SOUL.md sources | D:\agents\{agent}\SOUL.md (artist = D:\agents\artist-agent\SOUL.md) |
| Repos pipeline source | D:\repomix-output\ (592 XML files, one per repo) |
| Research corpus | gdrive:Research/ (108 files, top-level, dedup needed) |
| Phone Ollama | Galaxy A26 gemma3:4b — **OFFLINE as of 2026-07-07**, do not depend on |
| ZeroClaw | KVM2 :8002, /opt/zeroclaw/zeroclaw.py |

**Global constraints:** `git fetch origin && git rebase origin/main` on all git ops — never plain pull/merge · skip any TinyLM model with "sex" in the name (Tokyo-only) · R2/file deletes are approval-gated · do not start sub-Fable sessions without Ivan's explicit confirmation.

---

## PHASE 0 — REALITY CHECK + PLAN PRESENTATION  *(start immediately)*

**This is always the first action. Verify actual fleet state, then present a prioritized plan and WAIT for approval before doing anything else.**

**Goal:** Produce a truthful ✅/❌/⚠️ map of what is actually live right now, catch drift between D:\agents\ SOUL.md files and what's deployed on Oracle, and hand Ivan a prioritized execution plan he approves before any change is made.

**Inputs:**
- SSH: opc@100.109.5.44 (paramiko, key forest-a1)
- Agent SOUL.md sources: D:\agents\{anderson,banker,sheriff,librarian}\SOUL.md and D:\agents\artist-agent\SOUL.md
- Prior verification notes in `D:\output\ORACLE_PREFABLE_CHECK.md` and `D:\output\ORACLE_PREP_RESULTS.md` (read for context, but re-verify live — they may be stale)

**Steps:**
1. **Agent health.** For each of the 5 agents (anderson, banker, sheriff, librarian, artist) plus Chloe/Iris: hit each `/health` endpoint. Record status + response body.
2. **SOUL.md drift.** For each of the 5 agents: `sudo cat /opt/hermes-{agent}/hermes-home/SOUL.md` on Oracle and diff against the local D:\agents\ source. Note match / mismatch / missing-on-Oracle.
3. **Oracle core services.** `systemctl status soul-server iris-hermes chloe-avatar chloe-ws-bridge voice_loop_v2 inner_observer` (adjust names as found). Also confirm STT + avatar running.
4. **Oracle Ollama models.** `ollama list` — confirm all 8 expected models present (llama3.2:1b, smollm2:135m, qwen2.5:0.5b, qwen2.5:3b, llama3.2:3b, birch-librarian, + Tiny-Agent, + eve/consciousness). Flag any missing.
5. **KVM2.** Attempt SSH; if it connects, check Pocket-TTS :8660, fleet-watchdog, ZeroClaw :8002. If SSH still fails, record "KVM2 unreachable — Ivan must fix kvm2_ed25519" and move on (non-blocking for most phases).
6. **Iris port.** `ss -tlnp | grep 864` on Oracle — resolve the :8644 vs :8648 discrepancy; record the real listener.
7. **GitHub token.** Check `/etc/oracle.env` for GITHUB_TOKEN presence (do NOT print it) — needed for Phase 2/4 PR flow.

**Verification (real output, not assumptions):**
- A single table with a row per component: name | expected | observed | ✅ live / ❌ down / ⚠️ stale-or-drifted.
- Every ❌/⚠️ has a one-line note on cause and which phase it blocks.

**CHECKPOINT message to Ivan:**
- Post the full ✅/❌/⚠️ table.
- State any surprises (SOUL.md drift, missing models, dead services, missing token, KVM2/phone offline).
- Present a **prioritized execution plan**: proposed phase order given what's actually broken vs. working, and which phases are blocked pending an Ivan action (GitHub token, KVM2 SSH, phone Ollama, DNS).
- **Ask:** "Do you approve this plan and phase order? Which phase should I start with?"
- **STOP. Do not touch anything until Ivan approves.**

---

## PHASE 1 — AGENT SOUL.md DEPLOY + VERIFY

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Deploy the 5 agents' local SOUL.md files to Oracle, verify byte-for-byte that they landed, and reload the services that need it.

**Inputs:**
- Sources: D:\agents\anderson\SOUL.md, D:\agents\banker\SOUL.md, D:\agents\sheriff\SOUL.md, D:\agents\librarian\SOUL.md, **D:\agents\artist-agent\SOUL.md**
- Targets: `/opt/hermes-{agent}/hermes-home/SOUL.md` on Oracle
- Phase 0 drift table (tells you which actually need deploying)

**Steps:**
1. For each agent, SFTP/scp (paramiko) the local SOUL.md → `/opt/hermes-{agent}/hermes-home/SOUL.md`. (Oracle SFTP may be chrooted — if so, upload to home then `sudo mv`, or base64-over-exec as previously done.)
2. After each upload: `sudo cat /opt/hermes-{agent}/hermes-home/SOUL.md` and compare content/hash to the local source. Must match exactly.
3. Restart/reload each agent service that requires a reload to pick up the new SOUL.md (e.g. `sudo systemctl restart hermes-{agent}`). Confirm it comes back healthy via `/health`.

**Verification:**
- Per agent: hash-match confirmed between local and deployed file (show the comparison), and `/health` green after restart.

**CHECKPOINT message to Ivan:**
- Table: each agent → ✅ deployed+verified+healthy / ❌ (with reason).
- Next: "Phase 2 builds the GitHub repos knowledge pipeline (592 repomix XMLs → repos.db on Oracle → /repos search endpoint)."
- Ask for approval to proceed. **STOP.**

---

## PHASE 2 — GITHUB REPOS KNOWLEDGE PIPELINE  (was "Part M")

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Turn the 592 repomix XML dumps into a searchable repo knowledge base Chloe can query, kept current by a nightly Oracle cron.

**Inputs:**
- Source: D:\repomix-output\ (592 XML files, repomix format, one per repo)
- Oracle target: /opt/sdforest-data/repos.db
- Soul-server (127.0.0.1:8654) to extend with a /repos endpoint
- GITHUB_TOKEN (from Phase 0 — required for the GitHub-API refresh path)

**Steps:**
1. Build `repos.db` (SQLite). Schema: `repo_name, url, scope, purpose, readme_summary, language, stars`.
2. Parse each repomix XML: extract repo metadata (name, README summary, language, etc.). Populate rows.
3. SCP repos.db → Oracle /opt/sdforest-data/repos.db (paramiko).
4. Add a **/repos** endpoint to soul-server: `search_repos(query) → top-N matching rows`. (Simple LIKE/FTS over repo_name+purpose+readme_summary is fine.)
5. Add a `search_repos` tool entry to Chloe's SOUL.md on Oracle so she can call it.
6. Wire a **nightly Oracle cron** to re-sync: either re-pull from D:\repomix-output\ (needs a push path) or refresh directly via GitHub API using GITHUB_TOKEN. Pick the API path if the token is present.

**Verification:**
- Query soul-server `/repos?q=<test term>` and show it returns real, relevant rows (not empty, not an error).
- Confirm the cron entry exists (`crontab -l` / systemd timer) and record its schedule.

**CHECKPOINT message to Ivan:**
- Report row count in repos.db, a sample query + its results, and the cron schedule.
- Next: "Phase 3 dedups and ingests the 108-file gdrive:Research corpus into Iris's knowledge base."
- Ask for approval. **STOP.**

---

## PHASE 3 — GDRIVE RESEARCH INGEST FOR IRIS

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Deduplicate the Google Drive research corpus and make it retrievable by Iris; update her SOUL.md to reference it.

**Inputs:**
- Source: gdrive:Research/ (108 files — 95 .docx, 8 .pdf, 2 .md per prior audit; top-level, NOT under Ivan/)
- Iris service on Oracle (iris-hermes.service; port confirmed in Phase 0)
- Iris knowledge path (librarian-query AnythingLLM, or a docs folder Iris can read)

**Steps:**
1. Download the corpus to a temp folder. **Deduplicate first** (by content hash / normalized filename) — the 108 count includes duplicates.
2. Ingest the unique set into Iris's knowledge base: either via the librarian AnythingLLM ingest path, or drop into a docs folder Iris indexes. Convert .docx/.pdf to text as needed.
3. Update Iris's SOUL.md on Oracle to reference the research corpus (so she knows it exists and to draw on it).

**Verification:**
- Query Iris for a specific fact that only lives in the corpus and confirm she retrieves it (show the query + her answer). Not a generic "yes I have research" — a concrete retrieval.

**CHECKPOINT message to Ivan:**
- Report: unique files ingested (vs. duplicates dropped), and the successful retrieval test transcript.
- Next: "Phase 4 is the big one — the SDForest site build (4 council pages, upload page, watch folder, fleet→PR pipeline, avatar embed)."
- Ask for approval. **STOP.**

---

## PHASE 4 — SDFOREST SITE: COUNCILS + UPLOAD + FLEET PIPELINE

*Wait for Ivan's approval from the previous phase before starting this one.*

> **This is the largest phase.** Consider proposing to Ivan at the checkpoint that it be split across multiple Fable sessions (one per sub-part A–L). Do NOT read all sub-parts at once — work one sub-part, verify, move on.

**Goal:** sdforest.site becomes a live fleet dashboard: 4 separated council panels, a web upload page, a rewired watch folder, avatar+voice embed, and an automated fleet→PR→Vercel improvement loop.

**Inputs:**
- Repo: GitHub `orchestrator-gpt` (Vercel prj_yCclktkxHWLTj7By9XraAi1QinRA, auto-deploy on main)
- Soul-server on Oracle (/chat /delegate /voice-token; add /ingest, /repos already added in Phase 2)
- Avatar: chloe-avatar.service :8710, chloe-ws-bridge.service :8765 on Oracle
- Watch folder: D:\output\chloe-uploads\inbox\ (stale since ~July 2)
- GITHUB_TOKEN on Oracle for the PR flow

**Sub-parts (each is its own verify-then-continue unit):**
- **A — Pre-flight:** confirm orchestrator-gpt is cloned/reachable on Oracle, Vercel auto-deploy wired, chloe-memory current, inbox contents catalogued. Gate: repo reachable + deploy confirmed.
- **B — Fix + split council page:** replace Chloe's old KVM2 endpoint with Oracle soul-server (find the public/Tailscale-exposed path via nginx); restructure into 4 separated panels. Gate: page loads, endpoint returns valid response.
- **C — TinyLM interactive council (Council #1):** stream Oracle Ollama models' deliberation to the browser (SSE/WS), role-labelled. (Model wiring itself is Phase 6 — here build the panel + streaming endpoint.) Gate: post a question, watch real-time streamed responses.
- **D — Personal Round Table (Council #3):** OpenRouter free models + chloe-memory RAG context injector so the council knows current fleet state. Gate: an answer that reflects real memory (knows Oracle IP, Chloe-on-Oracle, current projects).
- **E — Watch folder rewiring:** new paramiko watcher: D:\output\chloe-uploads\inbox\ → soul-server /ingest → move to processed/. Wire as Task Scheduler job. Gate: drop file → ingest logged → moved.
- **F — Upload page:** /upload page with auth gate → POST to soul-server /ingest → status UI. Gate: upload from mobile browser → received → confirmation shown.
- **G — Ingestion DB discovery + fleet write wiring:** discover how Hypertrophy/Women's Health OS store data and whether Iris writes to them; wire REST /ingest write path if not. Gate: Iris digest write verified via GET query. (Frontend enhancement is Phase 8.)
- **H — Difficulty ≥5 auto-escalation:** soul-server rates task complexity; if ≥5, escalate to OpenRouter council (from B) before Chloe acts, log verdict. Gate: a ≥5 request fires the council, verdict appears in response.
- **I — Fleet GitHub PR workflow:** pr_helper.py on Oracle; Iris 6h cron opens PRs from digests (auto-merge data updates, flag structural); soul-server /delegate supports site_update. Gate: an Oracle-originated PR appears on GitHub, Vercel deploys, <5 min end-to-end.
- **J — Avatar + voice embed:** expose avatar (nginx proxy if needed), embed on landing page pointing WS at Oracle bridge; voice selector (Pocket-TTS default, Cartesia staged) → /voice-token. Gate: avatar animated on site, voice round-trip <3s.
- **K–L — see Phases 5/7 and final E2E:** phone delegation is Phase 7; full end-to-end verification is folded into each sub-part's gate here plus the later phases.

**Verification:** Each sub-part passes its own gate with observed browser/endpoint output. A Vercel deploy succeeds after each PR. Test each of the 4 council panels live.

**CHECKPOINT message to Ivan:**
- Report per sub-part ✅/❌ with the evidence (screenshots/response bodies/PR links).
- Explicitly recommend whether to split remaining sub-parts into separate Fable sessions.
- Next: "Phase 5 verifies the voice stack end-to-end and activates Cartesia TTS."
- Ask for approval. **STOP.**

---

## PHASE 5 — VOICE STACK VERIFY + CARTESIA ACTIVATION

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Confirm voice_loop_v2 works end-to-end, switch TTS to Cartesia, and confirm the wake word is still hot.

**Inputs:**
- Oracle voice_loop_v2 service
- /etc/voice-loop.env (TTS_PROVIDER)
- Cartesia config: Skylar voice, model sonic-2 (key in GCP SM — do not print)
- Wake word model: hey_chloe_oww.onnx

**Steps:**
1. Verify voice_loop_v2 is running and working end-to-end (STT → Chloe → TTS → audio) on the current provider first.
2. Set `TTS_PROVIDER=cartesia` in /etc/voice-loop.env; restart the service.
3. Trigger a test utterance; confirm a Cartesia clip returns (Skylar / sonic-2).
4. Confirm wake word (hey_chloe_oww.onnx) is still loaded/hot after restart.

**Verification:**
- A voice round-trip test producing actual audio out via Cartesia (describe the returned clip / log evidence), and wake-word detection confirmed.

**CHECKPOINT message to Ivan:**
- Report round-trip result + confirm Cartesia is the active provider + wake word status.
- Next: "Phase 6 wires Tiny-Agent + eve into the inner council and tests deliberation."
- Ask for approval. **STOP.**

---

## PHASE 6 — TINYLM COUNCIL WIRING

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Wire the new tiny models into the inner council and confirm a full deliberation returns a structured response.

**Inputs:**
- Oracle Ollama: Tiny-Agent-a-0.5B (Fast Proposer), eve (consciousness observer), plus existing council models
- Featherless AI (fallback for model testing)
- Inner council wiring in soul-server / inner_observer

**Steps:**
1. Confirm Tiny-Agent-a-0.5B and eve are present in `ollama list` (pull if Phase 0 flagged missing; skip any model with "sex" in the name).
2. Wire Tiny-Agent (Fast Proposer) and eve (consciousness observer) into the inner council roster.
3. Add Featherless AI as a fallback provider for council model testing.
4. Fire a test council query; confirm every model in the roster responds.
5. Keep the deterministic hard-veto backstop noted in prior work (tiny models rarely emit valid JSON — pre_filter must fail-open).

**Verification:**
- A council query that returns a structured response with a contribution from each roster member (show the output).

**CHECKPOINT message to Ivan:**
- Report roster + the structured deliberation output.
- Next: "Phase 7 verifies phone delegation (phone Ollama → ZeroClaw → soul-server)."
- Ask for approval. **STOP.**

---

## PHASE 7 — PHONE DELEGATION VERIFY

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Confirm the phone→ZeroClaw→Chloe delegation path works round-trip.

**Blocking dependency:** Phone Ollama (Galaxy A26, gemma3:4b) is OFFLINE as of 2026-07-07, and KVM2 SSH is currently failing. **Both are Ivan actions.** If either is still down at this phase, report that and skip to the checkpoint — do not fake a pass.

**Inputs:**
- Galaxy A26 Ollama (gemma3:4b) over Tailscale
- ZeroClaw :8002 on KVM2 (/opt/zeroclaw/zeroclaw.py)
- soul-server /delegate on Oracle

**Steps:**
1. Confirm phone Ollama is online via Tailscale.
2. Confirm ZeroClaw :8002 on KVM2 is running and can reach the phone.
3. Check ZeroClaw's delegation target — it may still point at the old KVM2 Chloe endpoint; update to Oracle soul-server /delegate if so.
4. Test: Chloe → soul-server /delegate → ZeroClaw → phone Ollama, and back.

**Verification:**
- A round-trip that produces a verifiable phone-side action or response (show it). If blocked by offline phone/KVM2, report the block explicitly.

**CHECKPOINT message to Ivan:**
- Report round-trip result OR the blocking dependency.
- Next: "Phase 8 enhances the Hypertrophy OS and Women's Health OS frontends."
- Ask for approval. **STOP.**

---

## PHASE 8 — OS FRONTENDS

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Enhance the two OS frontends and confirm both are functional.

**Inputs:**
- Hypertrophy OS: FastAPI :8090, D:\projects\hypertrophy-os
- Women's Health OS: FastAPI :8091 (verify exact path)
- Women's Health ingest: 65/117 papers stalled

**Steps:**
1. Hypertrophy OS (:8090): enhance the frontend.
2. Women's Health OS (:8091): enhance the cycle-phase visualization and add an ingest trigger to resume the stalled 65/117-paper ingestion.
3. Confirm both apps serve and render.

**Verification:**
- Both frontends load and are functional (show rendered output / a working request). For Women's Health, confirm the ingest trigger advances past 65/117.

**CHECKPOINT message to Ivan:**
- Report both apps' status + ingest progress.
- Next: "Phase 9 sets up chloe.blumenkraft.cloud DNS + SSL (needs an Ivan DNS action)."
- Ask for approval. **STOP.**

---

## PHASE 9 — BLUMENKRAFT DNS + CERTS

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Bring chloe.blumenkraft.cloud online over HTTPS and point Hume EVI at it.

**Blocking dependency:** The DNS A record is an **Ivan action** in Hostinger hPanel. Do not proceed to certs until propagation is confirmed.

**Inputs:**
- DNS: chloe.blumenkraft.cloud A record → **144.24.59.30** (Oracle public IP)
- certbot on Oracle
- Hume EVI config

**Steps:**
1. Ask Ivan to add the A record (chloe.blumenkraft.cloud → 144.24.59.30) in hPanel. Wait for propagation (confirm with a DNS lookup).
2. Once propagated: run certbot on Oracle to issue the SSL cert.
3. Update the Hume EVI config with the new HTTPS URL.

**Verification:**
- `https://chloe.blumenkraft.cloud` returns 200 (show the response), valid cert.

**CHECKPOINT message to Ivan:**
- Report the 200 + cert status, or that you're waiting on the DNS A record.
- Next: "Phase 10 re-mints dead Telegram bot tokens and confirms all 7 bots respond."
- Ask for approval. **STOP.**

---

## PHASE 10 — TELEGRAM TOKEN RE-MINT

*Wait for Ivan's approval from the previous phase before starting this one.*

**Goal:** Restore all 7 Telegram bots to working order.

**Blocking dependency:** Re-minting via BotFather is an **Ivan action** (interactive). Prepare the exact list of which tokens are dead and hand it to him; wire the new tokens once he provides them.

**Inputs:**
- Bot roster: Chloe, Iris, Librarian, Banker, Anderson, Sheriff, Artist
- Suspected dead: Sheriff, Artist, Anderson
- Oracle /etc/*.env token files (do not print values)

**Steps:**
1. Determine which bot tokens are actually dead (test each; confirm the 3 suspected: Sheriff, Artist, Anderson).
2. Ivan re-mints the dead tokens via BotFather; you receive them.
3. Update the tokens in the relevant Oracle /etc/*.env files (never echo the values).
4. Restart the affected services.

**Verification:**
- All 7 bots respond to `/start` (show which responded).

**CHECKPOINT message to Ivan:**
- Report each bot → ✅/❌.
- State that this is the final phase; summarize the whole task's outcome and any items still blocked on Ivan (KVM2 SSH, phone Ollama, GitHub token, DNS, BotFather).
- **STOP.** Task complete.

---

## APPENDIX — ITEMS THAT NEED AN IVAN ACTION (surface these in Phase 0)

| Blocker | Blocks | Ivan action |
|---|---|---|
| GITHUB_TOKEN missing on Oracle | Phase 2 cron (API path), Phase 4 PR flow | Add PAT with `repo` scope to /etc/oracle.env or GCP SM |
| KVM2 SSH auth failing | Phase 7 (ZeroClaw) | Fix kvm2_ed25519 vs authorized_keys |
| Phone Ollama offline | Phase 7 | Bring Galaxy A26 Ollama back online (Termux) |
| chloe.blumenkraft.cloud DNS | Phase 9 | Add A record → 144.24.59.30 in hPanel |
| Dead Telegram tokens | Phase 10 | Re-mint via BotFather |

*Written 2026-07-07 for claude-fable-5. Phased, checkpointed, approval-gated. Phase 0 first; every later phase waits for explicit Ivan approval.*


---

## PHASE 11 — SUBPAGE ENHANCEMENT + STYLE CONSOLIDATION

*Wait for Ivan's approval from the previous phase before starting this one.*

**Authoritative detail file:** D:\output\misc\SDFOREST_SUBPAGE_SPECIFICS.md — read it at session start. This section is a structured brief; the specifics file has the verbatim source requirements per sub-part.

**Goal:** Improve every live sdforest.site subpage with a unified design system. Apply specific improvements Ivan has specified per subpage. Restructure kids projects into one hub, merge the two reference pages, deploy Women's Health OS as a new subpage, and redesign the Round Table council frontend.

**Repo:** GitHub orchestrator-gpt → Vercel auto-deploy on push to main.

---

### A — Design system audit + token definition

Read all internal subpages. Identify divergent CSS (color, typography, spacing, card style). Produce a gap table. Define unified tokens:

`css
:root {
  --bg: #07070b; --surface: #0f0f15;
  --border: rgba(255,255,255,0.08);
  --text-primary: #f3f4f6; --text-muted: #9ca3af;
  --accent: #4f46e5; --accent-green: #22c55e;
  --radius: 8px;
}
`

Apply to landing page first. Gate: landing page renders with unified tokens, no visual regressions.

---

### B — Kids hub consolidation

Ivan: "congestion of all the kids' projects into one subpage."

- Create /web/kids/ as a hub page that houses **Math Mania** and **Kids Movie Library**
- Replace the two separate landing page cards with one "Kids Corner" card linking to /web/kids/
- Each sub-app stays at its original path; the hub is just a stylized portal with clear links and short descriptions
- Apply unified design tokens to both sub-apps

Gate: /web/kids/ loads with both sub-apps reachable from it; landing page shows one card.

---

### C — Merge Library + AI Platforms Map

Ivan: "I would like to merge the platform subpage and the glossary subpage."

- /web/library/ is the combined destination (already has dual content: 527+ terms + 160+ tools)
- Remove /web/llm-db/index.html OR redirect it → /web/library/
- Update landing page: replace two separate cards with one "Library & Platforms" card
- Apply design tokens to the combined page

Gate: /web/library/ serves both AI glossary and platform map content; old /web/llm-db/ either redirects or is removed; landing page card is unified.

---

### D — Power Law Odyssey: polish

Ivan: "the z-dipped scrollable website needs a polish"
Blueprint: D:\output\research\RESEARCH-drive-power-law-odyssey-website-blueprint-pdf-2026-06-26.md — READ it.

Key requirements from blueprint:
- 6 narrative steps must ALL be fully implemented (not stubs). In order: Disruption → Bifurcation Matrix → Multiplication Avalanche → Asymmetric Risk → Venture Bet Sandbox → Epiphany
- **Step 5 (Venture Bet Sandbox)** MUST be a real interactive simulation — user places bets, 94% fail, one outlier recovers all. This is the critical missing piece. Not a placeholder.
- Z-axis scroll: CSS height: 600vh scroll container, sticky viewport, 	ranslate3d on camera rig driven by --scroll-p (0.0–1.0 normalized). GPU-composited.
- Smooth mobile performance (the Z-scroll can be janky — test and optimize)
- Apply unified design tokens to non-3D UI chrome

Gate: All 6 steps render. Step 5 sandbox is interactive (place a bet → see outcome animation). Smooth scroll on desktop + mobile.

---

### E — Mendeleev BG: polish

Ivan: "keep this one, lose the mendeleev table sub page" (the BG version is the keeper).

- If any residual /web/mendeleev-table/ route or landing page card exists, remove it
- /web/mendeleev-bg/ stays — it is the Bulgarian interactive periodic table with compound highlighting
- Polish: apply design tokens, verify compound highlighting on mobile, improve element deep-dive panel layout, ensure Bulgarian text renders correctly
- The live site already shows only mendeleev-bg — verify there is no duplicate card

Gate: Only one mendeleev entry on site. Compound highlighting works on mobile. Deep-dive panel is readable.

---

### F — Life in Time: polish

- Verify shareable link generates a working URL with current user state
- Enhance year-progress bar visual (more prominent animation)
- "Late-achiever pivot" section — if not yet prominent, add it
- Apply design tokens, verify mobile layout

Gate: page loads, shareable link works, design consistent.

---

### G — Round Table council: frontend redesign

Ivan: "The frontend is cluttered and unappealing." "redesign of the roundtable council that runs on OpenRouter for free"

- Redesign /web/council/roundtable/ — cleaner layout, less clutter, better streaming UX
- Keep all functionality: POST → SSE stream, 4-model roster (nemotron-ultra-550b, nemotron-super-120b, llama-3.3-70b:free, tencent/hy3)
- Show the model roster clearly with role labels
- Per-model stream containers (not a wall of undifferentiated text)
- Match site's unified dark design system

Gate: A council question fires, 4 models stream, layout is clean and readable.

---

### H — Council privacy: 2 public / 2 private

Ivan: "the two public LLM councils should be public, and the other two should not be."

Current 4 panels:
- **TinyLM** (/web/council/tinylm/) — Ivan said it observes internal fleet → technically private info, BUT also said it should be a public consciousness experiment on sdforest.site. Resolution: make TinyLM public but strip any fleet-state context from the public output. The models deliberate on the user's question only — no fleet memory injected.
- **BYOK** (/web/council/byok/) — user brings own OpenRouter key → naturally PUBLIC (no fleet data touched)
- **Round Table** (/web/council/roundtable/) — uses fleet memory/delegation context → PRIVATE, keep access code 2142 gate
- **Chloé** (/web/council/chloe/) — internal fleet-aware → PRIVATE, keep gate

Implementation:
- TinyLM: confirm the SSE stream does NOT inject fleet context; if it does, add a public_mode=true param that skips context injection
- BYOK: confirm it's ungated (remove any access code if one was added)
- Round Table + Chloé: confirm access code gates are in place
- Landing page council section: show TinyLM and BYOK as "Public" tabs, Round Table + Chloé as "Private" with a gate description

Gate: TinyLM and BYOK are accessible without auth. Round Table and Chloé require the access code.

---

### I — TinyLM: standalone public subpage (consider Railway)

Ivan: "the tinyLM console needs to have a separate public URL... as a subpage on my forest SD forest.site, as the consciousness experiment"
Ivan: "tiny LM round table for the railway"

- The TinyLM council should be accessible as its own prominent subpage at sdforest.site (e.g., /web/council/tinylm/ or /web/tinylm/) — not hidden inside a 4-panel council toggle
- Landing page: add a dedicated card for the "TinyLM Consciousness Experiment" — what it is, how many models deliberate, invite visitors to send a question
- Backend stays on Oracle (local Ollama models can't run on Railway); Railway can optionally serve a static front-end if Oracle SSE is already public-accessible via nginx
- The page should explain the consciousness experiment context (Tiny-Agent proposer, llama3.2:1b analyst, qwen2.5:0.5b critic, eve consciousness observer, qwen synthesizer)

Gate: /web/tinylm/ (or equivalent) loads as a standalone public subpage. A visitor can send a question and watch the 5 models deliberate in real-time. No fleet context exposed in output.

---

### J — Women's Health OS: deploy as new subpage

Currently NOT on the site. FastAPI at :8091 (D:\projects\womens-health-os). Existing frontend: index.html 345 lines, tabs: facts/rules/claims/papers.

Tasks:
- Create /web/womens-health-os/ subpage on SDForest site
- Add landing page card with description
- Connect to the FastAPI :8091 (same iframe/embed pattern as HypertrophyOS)
- Make API persistent (schtasks ONLOGON trigger):
  schtasks /Create /TN "WomensHealthOS-API" /TR "<python> -m uvicorn src.api.main:app --host 0.0.0.0 --port 8091" /SC ONLOGON /F
- Wire **Sci-Hub integration** into the ingest pipeline: for paper DOIs, try https://sci-hub.se/{doi} as PDF source before falling back. This unblocks the stalled 65/117 paper ingest.
- Advance ingest past 65/117

Gate: /web/womens-health-os/ loads and shows facts/rules content from the live API. Ingest has advanced past 65 papers.

---

### K — HypertrophyOS: make the subpage actually work + Sci-Hub

- /web/hypertrophyos/ embed must connect to the real running :8090 API
- Make API persistent:
  schtasks /Create /TN "HypertrophyOS-API" /TR "<python> -m uvicorn src.api.main:app --host 0.0.0.0 --port 8090" /SC ONLOGON /F
- Add Sci-Hub to the ingest pipeline (same pattern as Women's Health above)
- Verify the embed/frontend actually loads and queries the API

Gate: /web/hypertrophyos/ shows real data from the running :8090 API.

---

### L — Fleet skill installations per agent SOUL.md

Ivan: "the fleet's abilities need to have not just their authentications... but also their skills as well."

For each agent SOUL.md on Oracle:
- **Anderson**: code review, debugging, git operations, API testing skills
- **Banker**: financial analysis, budgeting, data visualization
- **Sheriff**: security review, compliance, monitoring
- **Librarian**: research, deep research, knowledge synthesis, academic sourcing
- **Artist**: image gen, design skills (taste/motion/impeccable/open-design/huashu), creative writing
- **Chloe**: voice/delegation, search_repos, council delegation tool
- **Iris**: health research, data analysis, women's health domain knowledge, sci-hub sourcing (she's the ingest agent)

Deploy updated SOUL.md to each agent on Oracle. Restart services. Gate: each agent's /health returns OK; a test delegate call succeeds.

---

### M — Calendar, Manifesto, Poetry: design pass

Apply design tokens. Verify each renders correctly on mobile and desktop. These are lower priority — if Phase 11 is running long, defer to a separate session.

---

### N — Navigation + final E2E

- Add/improve a consistent header or "← Back to Forest HUB" breadcrumb on every internal subpage
- Hit all live subpages from the public internet
- Per-subpage ✅/❌ table

**CHECKPOINT message to Ivan:**
- Per-subpage ✅/❌ table with evidence
- Council privacy status (2 public / 2 private confirmed)
- Women's Health + HypertrophyOS API persistence confirmed
- Fleet skill installations per agent
- State whether any sub-part should be a separate Fable session
- Ask for approval. **STOP.**
## APPENDIX — SSH KEY CORRECTION (2026-07-08)

The Shared Infra Reference table at the top of this file incorrectly lists `Oracle SSH key | forest-a1`. The correct GCP SM secret name is **`oracle-ssh-private-key`**. Use this name when fetching the key from GCP SM `forest-family-cloud`. The `forest-a1` name does not exist.
