# SD Forest brief

Compiled 2026-10-03 from the sources listed at the end. One document covering the rebuild, the work order, the locked style decision, the front-page interaction model, every pool and its animation, what is in flight, and what is still open. Nothing here starts work; it describes the state.

Site: https://www.sdforest.site · Repo: `ivangegovdve-sudo/orchestrator-gpt` (static HTML/CSS/JS on Vercel; `web/` is the source).

## 1. Rebuild scope

**What SD Forest is.** Ivan's public site: a front page (a tree in a forest) whose pools lead to his projects.

**What is being rebuilt, and why.**

| Area | State today | What the rebuild does |
|---|---|---|
| Front page | Liked. The tree and the 2019 Make Me Pulse-style look stay. | Polish and finish only. No redesign. |
| Pools and pool entries | All seven pool pages share one template (dark forest backdrop, serif title, a plaque, cards). Ivan: the entries are "very, very inadequate". | The real redesign target. Each pool becomes its own designed world with a finished entry animation, set in higher-quality imagery, optionally framed by a subtle tree trunk at the side. |
| Health entry (the eukaryotic cell) | A code-rendered cell exists in PR #679. Ivan: "glossy and basic". | A proper render pass: accurate organelles, quality light and motion. |
| Content and wiring | Counts, links and several tools are stale or broken (section 7). | Fix as separate small jobs. |

**Pace.** Ivan wants to take time and make it nice. Heavy new work waits for his explicit go.

**Rules that hold everywhere.**
- Project statuses are only: Live, Research, Experimental, In development. No status is invented; unknown is recorded as UNKNOWN.
- All pools are Live: each must be enterable and explain itself even with no live project. Live does not mean finished.
- In development does not mean locked: a reachable project opens and keeps its label.
- Every project keeps a feedback option, whatever its status.
- Health, development and science claims need peer-reviewed evidence. Nothing is fabricated.
- The site stays live during the redesign, with a small, funny redesign notice.
- Code-rendered animation only on the free path: no generated media and no paid APIs unless Ivan approves spend.

## 2. Work order: the page first, then the intro video

This is the order Ivan works in. It is a pipeline with one hard dependency.

**The dependency.** The intro video's final frame is the shipped tree-and-pools front end. The intro resolves into the real, live page, so its last frame must match that page exactly. The front end therefore has to be locked before the video can be finalized. Any later change to the tree, the pool positions or the framing reopens the video.

| Step | What | Done when | Blocks |
|---|---|---|---|
| 1 | **Build the front end: the tree plus the pools integrated into it.** This is the real page (section 4): the central tree, its roots, the pool windows in fixed positions, the foreground. | The page is finished and frozen: final tree art, final pool positions and sizes, final framing at desktop and phone. | Step 2 |
| 2 | **Freeze that page as the intro's final frame.** Capture the finished front end as the reference frame the video must end on. | A reference still of the locked page exists for each aspect ratio the video ships in. | Step 3 |
| 3 | **Fix the intro video** so it lands on that final frame. | The last frame of the video and the live page are the same picture; the hand-off needs no crossfade to hide a mismatch. | Nothing; this is the end of the pipeline. |

**Step 3: current state of the intro video (verified 2026-10-03).**

- *Where it lives.* `web/assets/sdforest-intro/growth-scroll.mp4` (1920x1080, H.264, 24 fps, 25.2 s, 21.6 MB, no audio), with `seed-poster.webp` as its first frame. It is a browser-seeking re-encode of Ivan's master `06-sdforest-growth-master.mp4` in the Drive folder "sdforest tree animation / Make pulse images". Provenance and the re-encode command are in `web/assets/sdforest-intro/README.md`.
- *How the page uses it.* `index.html` holds the film in `.resolve-growth-intro`; `web/shared/frontpage-resolve.mjs` scrubs it with the scroll position (seed at the start, mature tree at the end, reversible), over a 450vh scroll runway; `frontpage-intro-reveal.css` adds the opening reveal. The timing contract is `docs/frontpage-resolve.md`. The intro sample (PR #663) is merged, so this is what is live.
- *What is wrong.*
  1. **The last frame does not match the page.** The filmed tree and the page tree are related art, not the same pixels. The page hides this by reframing the film, darkening it through a mist layer and crossfading to the page tree in the final half-second. This is the defect the pipeline exists to remove.
  2. The tree's growth retracts its branches, goes bare, then regrows. It should grow naturally.
  3. There is no continuous zoom-out across the whole growth that lands precisely on the final composition.
  4. The foreground is still the bulky roots. It should be sleeker technical structures (machinery, gears, mossy and weathered) that physically animate into place during the zoom-out, never fading in.
  5. The central tree and its root connections are not finished, which is why step 1 comes first.
  6. One 16:9 file serves every screen; there is no phone framing.
  7. The narrated word poem and its "scroll down to skip" hand-off are specified but not built. "We Are The Training Data" will not be narrated.
- *Not decided.* How the corrected video is produced (re-edit of the master, new footage, or generated) is Ivan's call; no generation or spend is approved.

## 3. Style decision (locked: Option A, the UI-first "forest skin")

Decided by Ivan on 2026-09-12 and confirmed since. Not to be re-litigated.

- **Option A: UI first, forest skin.** A clean, stable layout. Pools are clear windows in fixed positions. The forest lives in the edges, textures, moss and motion, and can be re-skinned without moving anything.
- **Option B: world first, UI hidden inside the scenery.** Rejected. Ivan's earlier attempts at it go into Design Gallery (Web Design) as history.
- His reason: the site must stay "visible, clear and easy to work with"; with A he never has to hunt for a pool that moved into a bush or a cave.
- 2026-10-01 addition: the scenery must recede behind the UI. Imagery supports the UI and never crowds it.

## 4. Front-page interaction model

**The tree intro.**
- A seed bursts through the ground of a lush boreal forest and grows into the central tree. When the tree is grown, you are on the front page.
- The visitor drives the growth by scrolling (the feeling of 2019 by Make Me Pulse and of a scroll world).
- A narrated word poem is the default, guided version. A visible "scroll down to skip" cue is shown. The moment the visitor scrolls, narration fades and scroll takes over from the exact frame reached: no snap back, no restart.
- Corrections still owed (2026-09-28): the tree must grow naturally with no branch collapse and regrow; the camera zooms out continuously and lands exactly on the final composition; the bulky foreground roots give way to sleeker technical structures (machinery, gears), mossy and weathered, that physically animate into place and never fade in. The central tree and its roots are not finished.
- Replay: the intro plays on a fresh open or reload, and does not replay when the visitor returns to the home page within the same visit.

**Pool windows (hover and two-step entry).**
- Every active pool's frame runs a subtle continuous loop without hover.
- Hover wakes the animation inside the window.
- First click enlarges the window and shows a small round **Enter** button. A second, explicit click on Enter opens the pool. This is two steps, not a double-click; it prevents accidental navigation while someone is playing with the animation.
- Phones: first tap selects and enlarges, second tap on Enter opens. Inner animations loop by default, because there is no hover.
- No first-visit tutorial or hint.
- Unready pools stay in their normal place, frozen on a strong still, disabled, with a playful one-liner on hover or tap (for example about having too many projects).

**Promoted projects (the dots).**
- Projects Ivan declares "ready enough" appear on the front page as small animated symbols, connected subtly to their pool, not as large tiles.
- Hover or tap shows the project name and a very short teaser. No long description.
- After the intro finishes, all promoted symbols grow out of their pools at the same time, then stay.
- Promotion is manual. Currently declared: Gym Scholar, Math Mania / Forest Math, The Drop, Explore Repos, Open Dashboard MCP. AI Architect Academy is intended later.

**Site-level controls.**
- Portfolio: outside the pools, a persistent "Portfolio" button with an icon on the side, appearing only once the main page is shown. It opens the Lovable-hosted portfolio. Design variants are skins switched in place; Ivan alone picks the default.
- Support: a small, persistent Buy Me a Coffee control in a lower corner, visible but secondary, on every page.
- Ordering inside a pool is by how finished a project is. Unfinished ones sit lower, greyed and tilted, marked Coming Soon.

## 5. Pools, projects and animations

**Pool count.** The 2026-09-16 handoff lists eight pools, with AI Research separate from Artificial Self. The repo's later settled decision (2026-09-20) makes AI Research the research part of Artificial Self, and the live site has seven pool pages. Both are recorded here; see open question 1.

Each pool has two animations: its front-page window (live today) and its entry animation (the redesign).

| Pool | Front-page window (live) | Entry animation | Entry status |
|---|---|---|---|
| Health | ECG trace on a monitor | **A living eukaryotic cell**: mostly intact, about a quarter cut away, nucleus, mitochondria and other organelles visible and in continuous motion. Code-rendered (three.js), no labels. Scroll moves the camera into the cutaway. | Settled concept. Built in PR #679; render pass in review. |
| Artificial Self | Three neurons firing in sequence | A biological neuron on one side, a computational counterpart (transistor, logic element) on the other. They approach, meet in the middle and become a hybrid; signals travel both ways. | Settled concept. Built in draft PR #694. |
| My Story | A timeline of dots | A line-drawn chair nearly completes itself, the last stroke goes slightly wrong, it pauses, a tiny scribbled correction fixes it, and the loop continues. Playful and self-ironic. | Settled concept. Built in draft PR #694. |
| GrowingApp | Seed, sprout, tree plaque | "Height marks on the doorframe": window light, a pencil marking heights up a door casing, a seedling growing to meet each. | Proposed, pending Ivan. Built in draft PR #694. |
| AI-d kit | First-aid kit box | "The patch bay": a request pulse, a cable drawn and seated, a readout resolving; unknown prices shown as unknown. | Proposed, pending Ivan. Built in draft PR #694. |
| TinkerBox | Workbench drawer | "Exploded view, then it runs": a gear train floats apart, assembles, then runs; one spare screw left over. Visually a smaller pool on the front page. | Proposed, pending Ivan. Built in draft PR #694. |
| Design Gallery | Shuttered exhibit window | "Three doorways": a white gallery lights wall by wall; three doorways match its three rooms. | Proposed, pending Ivan. Built in draft PR #694. |
| AI Research | none of its own | none specified | See open question 1. |

**Projects and statuses.**

| Pool | Live | In development | Notes |
|---|---|---|---|
| GrowingApp | Rubik's Teacher; Mendeleev; Manifesto for a Newborn; Math Mania / Forest Math | Lobester Gym; Kids Library | Kids Library is one project with two separate tabs, Books and Movies. Lobester Gym is the ADHD brain-exercise app, distinct from Gym Scholar. |
| AI-d kit | Open Dashboard; Public round-table council; The Drop; Library (unfinished); Explore Repos (incomplete) | AnyCloudLLM | Explore Repos gets an embedded 3D shelf, a search/filter, and an "Ask a question" mode. Troubleshooting stories live here and in My Story. Platform Guide is pending in PR #635. |
| TinkerBox | Avatar Playground; Velune; Alternate Self; Public round-table council (shared) | Item Icon Generator; Calendar Generator; Chloé PWA; Chloé Desktop | Velune is a credited fork ("Velune no video"). Fleet / Fleet Board is internal and unlisted. Alternate Self was added on 2026-10-01. |
| Health | Gym Scholar; Dyslexia Reading Platform; Audiobook Studio | FlowForm; Women's Health OS | Gym Scholar and Hypertrophy OS are one project; Gym Scholar is the public name. Dyslexia and Audiobook stay as two entries until unified. |
| Design Gallery | Poetry Space; Website History | Replicator Void | Three rooms: Game Design, Web Design, Website History. |
| Artificial Self | AI Conversation (legacy name C2C Dolphin) | | C2C Self status is UNKNOWN. The catalog currently marks these as Research. Conclusions must be re-derived before publishing. |
| My Story | Chair or a Ladder (unfinished); Life in Time (needs a full redesign) | Power Law Odyssey; We Are The Training Data | The narrative is "A Chair or a Ladder". Portfolio also appears here. |

Not projects: Site Home (the home page), Portfolio (site-level control), Open Design (external, not Ivan's), Knowledge Ingest (private Fleet utility), Found Work (removed), Kids Corner (retired name).

## 6. Current changes in flight (2026-10-03)

| Item | Where | State |
|---|---|---|
| Health pool world and eukaryotic cell | PR #679, `feat/sdm-61-health-world` | Open. Render pass pushed 2026-10-01; reviewer requested changes. Not merged, so not live. |
| Pool entries for the six other pools | Draft PR #694, `feat/pool-entries` | Open draft. Built by a cloud run; not yet reviewed by a person. |
| Design review of both | Scheduled cloud run, 2026-10-04 17:30 Sofia | Critique and targeted refinement only; any broad imagery change is written as a proposal for Ivan. |
| Platform Guide | PR #635 | Open; reviewer requested changes on the latest head. |
| Asset-generation providers (fal, ComfyUI) | PR #678 | Open; reviewer requested changes. For later photoreal work only. |
| Older pool-skin sample | Draft PR #670 | Superseded by the direction above. |
| Repo index and shelf | Paperclip SDM-1096 to SDM-1101 | SDM-1096 (catalog sync to 1,336 repos) done. Cards, upstream-first forks, shelf refresh and site counts queued. Graphify continuation held for Ivan's go. |
| Merged this week | #674, #677, #692, #693 | Health card links; scroll-craft skill; Alternate Self in TinkerBox; the `.mjs` content-type fix. |

## 7. Open questions

1. **Seven pools or eight?** Is AI Research its own pool (2026-09-16) or the research part of Artificial Self (2026-09-20, and how the site is built today)?
2. **Entry concepts** for GrowingApp, AI-d kit, TinkerBox and Design Gallery are proposals. Approve or replace each.
3. **The cell:** does the render pass in #679 meet "polished and properly rendered", once reviewed?
4. **Imagery direction** for the pools: what "higher-quality imagery with a subtle trunk frame" should look like, before any broad build.
5. **The design-style list** from the screenshot Ivan supplied was never transcribed. The original image is needed.
6. **The Drop** returns a server error (500) on its `/drop` page. Who fixes its server?
7. **Feedback** posts to a placeholder address, so submissions go nowhere. Which endpoint?
8. **Sign-in:** one site-wide session (Google preferred, email link as alternative) is specified but not built; it needs credentials.
9. **Buy Me a Coffee** link is needed for the support control.
10. **Library:** where the line sits between public and personal sources.
11. **C2C Self:** its public title and status.
12. **The combined open-source path** (capability cards, repo shelf, Graphify, platforms, tools, free stuff): no written spec was found.
13. **Explore Repos** still lacks the embedded shelf, "Ask a question", graph search and capability cards.
14. **Portfolio default skin** waits for Ivan, once variants exist.
15. **The corrected intro video:** how it is produced (re-edit of the master, new footage, or generated), and when the front end counts as locked.

## 8. How to run and build

```bash
git clone https://github.com/ivangegovdve-sudo/orchestrator-gpt
cd orchestrator-gpt
npm run build                      # writes vercel-public/ (build output; never edit it)
node scripts/run-contract-tests.mjs  # contract tests
node .agents/skills/scroll-craft/scripts/serve.mjs --root vercel-public --port 4580
# then open http://127.0.0.1:4580/  and  http://127.0.0.1:4580/web/pools/health/
```

- Edit `web/`, never `vercel-public/`. Pushing to `main` deploys to production; branches get preview URLs.
- Pool pages render from `web/shared/project-catalog.mjs` through `web/shared/pool-page.mjs`.
- Scroll verification: `.agents/skills/scroll-craft/scripts/shoot.mjs --url <page> --out <dir>` (add `--width 390 --height 844` or `--reduced-motion`). It needs `playwright-core` and Chrome.
- Work rules: branches and pull requests only, `git fetch && git rebase`, no direct commits to `main`, review by a different model family.

## Canonical sources

The single "SPEC object" (pools, projects, statuses, interaction model, open questions) referred to in the request was not found in the repo, its branches, or the local output folders on 2026-10-03, so this brief does not link it. The canonical machine-readable sources that do exist:

- `web/shared/project-catalog.mjs`: pools, projects, statuses, routes (what the site renders).
- `docs/sdforest-settled-structure.md`: settled structure and identities.
- `SDFOREST-MASTER-PLAN.md`: decided items D01 to D30 and open items O01 to O18.

Drive documents consolidated here (Ivan's Drive): `SDFOREST-VISUAL-DESIGN-VERBATIM-2026-09-12`, `SDFOREST-VOICE-INTERVIEW-FINAL-HANDOFF-2026-09-16`, `SDFOREST-PLAN-CLARITY-INTERVIEW-HANDOFF-2026-09-28`. Where they disagree, the later one wins, plus Ivan's direction of 2026-10-01.

```json
{
  "brief": "sdforest",
  "compiled": "2026-10-03",
  "style_decision": { "locked": "A", "name": "UI-first forest skin", "decided": "2026-09-12", "rejected": "B world-first" },
  "front_page": { "redesign": false, "work": "polish only", "entry": "two-step: hover preview, click to enlarge, click Enter", "intro": "scroll-driven seed-to-tree, optional narrated word poem, scroll to skip" },
  "pools": [
    { "id": "health", "entry": "eukaryotic cell, quarter cutaway", "entry_status": "settled", "pr": 679 },
    { "id": "artificial-self", "entry": "neuron meets transistor, hybrid, signals both ways", "entry_status": "settled", "pr": 694 },
    { "id": "my-story", "entry": "line-drawn chair corrects its own mistake", "entry_status": "settled", "pr": 694 },
    { "id": "growingapp", "entry": "height marks on the doorframe", "entry_status": "proposed", "pr": 694 },
    { "id": "ai-d-kit", "entry": "the patch bay", "entry_status": "proposed", "pr": 694 },
    { "id": "tinkerbox", "entry": "exploded view, then it runs", "entry_status": "proposed", "pr": 694 },
    { "id": "design-gallery", "entry": "three doorways", "entry_status": "proposed", "pr": 694 },
    { "id": "ai-research", "entry": null, "entry_status": "open question: separate pool or part of artificial-self" }
  ],
  "statuses": ["Live", "Research", "Experimental", "In development"],
  "pipeline": [
    { "step": 1, "do": "build the tree + pools front end (the real page)", "blocks": 2 },
    { "step": 2, "do": "freeze the finished page as the intro video's final frame", "blocks": 3 },
    { "step": 3, "do": "fix the intro video so it lands on that frame", "asset": "web/assets/sdforest-intro/growth-scroll.mp4" }
  ],
  "hard_dependency": "intro final frame = shipped tree+pools front end; lock the front end before finalizing the video",
  "open_questions": 15,
  "catalog": "web/shared/project-catalog.mjs"
}
```
