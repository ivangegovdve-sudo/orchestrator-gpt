# SD Forest: page → final frame → intro

The single source of truth is the [full brief on docs/sdforest-brief](https://github.com/ivangegovdve-sudo/orchestrator-gpt/blob/docs/sdforest-brief/SDFOREST-BRIEF.md). Option A remains locked. The existing valley, tree, painted pool frames and desktop anchors were retained. This work finishes their interaction and portrait composition.

## 1. Real page and pools

The seven windows keep fixed positions, idle gently, wake their inner instruments on hover and run their inner animation on phones. A first click or tap selects and enlarges a window. A separate round **Enter** link opens the pool. Repeated clicks and double-clicks do not bypass that step. Keyboard users can select, tab to Enter, or cancel with Escape.

All seven pool destinations are enterable. Their catalog membership, lifecycle labels, evidence and unavailable-project feedback remain intact. The six other entry gestures are documented in [sdforest-pool-entries.md](sdforest-pool-entries.md); Health is a procedural three.js eukaryotic cell with a quarter cutaway, organelles in continuous motion and a scroll camera entering it. Reduced motion, no JavaScript and unavailable WebGL retain usable content and navigation.

Five small promoted symbols grow together as the tree introduction finishes and the pool frames arrive. Hover, keyboard focus or a first phone tap discloses the name and short teaser. The following tap opens the destination. Portfolio remains a persistent link after arrival. Coffee is visible on the home page and pool pages, disabled until its URL is supplied. The feedback dialog is available per project; delivery still uses the existing unresolved Formspree placeholder and reports failure instead of claiming success.

## 2. Locked final frame

`scripts/freeze-sdforest-frame.cjs` captures the actual built page at 1920×1080 and 390×844. It requires seven visible windows, no horizontal overflow and no page errors. Instrument time is zero and animation is disabled for the capture. The capture helper first paints and restores the compositor to normalize Chromium's shadow antialias caches. It captures the restored live DOM, with no reference-image overlay. The resulting PNGs and source hashes are in `web/assets/sdforest-intro/final-frame-lock.json`:

- [Desktop final frame](../web/assets/sdforest-intro/final-frame-desktop.png)
- [Phone final frame](../web/assets/sdforest-intro/final-frame-phone.png)

Changing the composition invalidates the render prerequisite and requires a new freeze.

## 3. Intro derived from that page

`scripts/render-sdforest-intro.cjs` samples the same live DOM, using a continuous zoom out, monotonically growing tree and physically arriving machine parts and pool frames. No mist transition or replacement composition hides the handoff. Desktop and portrait videos use their own locked geometry. Other viewport sizes use the same native code compositor; resize preserves the current progress.

The default guide runs for 14 seconds. Wheel, touch, scrolling keys and native scrollbar input transfer control to native scrolling, fade narration over 350 ms and preserve the current growth position. Completion aligns the scroll runway with the final frame. Reduced motion and return navigation show the finished page directly; a reload replays the introduction. Hidden content cannot receive focus during the guide. **Listen** is available when browser autoplay policy requires a gesture.

The original working poem is: “One seed. A root finds its way. A branch reaches into light. Small worlds connect. A forest opens. A place to begin.” No approved poem text was supplied. This working copy uses local Windows speech synthesis, not paid generation or a subscription. WAT Training Data is not narrated.

When autoplay is blocked, a later **Listen** gesture aligns the poem to the current guide frame, including delayed audio metadata. Ordinary visibility resume retains its playback position. The [native-audio regression](sdforest-pipeline-evidence/late-listen/report.json) checks the alignment and confirms that the poem ends before arrival.

The MP4 containers carry RGB VP9 because ordinary H.264 chroma conversion changes the reference pixels. Moving frames are compressed; the final keyframe is lossless and stays exactly equal to the locked page. `scripts/verify-sdforest-video.cjs` checks the decoded last sample and Chromium's actual video display against the PNG with literal RGB equality. Unsupported video decoders fall back to the native compositor. The video metadata and hashes are in `video-render.json` alongside the assets.

## Reproduction and evidence

Build and serve `vercel-public`, then run these in order with resolvable `playwright-core` and installed Chrome:

```powershell
npm run build
node .agents/skills/scroll-craft/scripts/serve.mjs --root vercel-public --port 4580
# In a second terminal:
node scripts/freeze-sdforest-frame.cjs
node scripts/render-sdforest-intro.cjs
npm run build
node scripts/verify-sdforest-video.cjs
node scripts/verify-sdforest-intro-behavior.cjs
$env:SDFOREST_TEST_URL = 'http://127.0.0.1:4580'
node --test scratch/tests/sdforest-pipeline.test.cjs
node scripts/verify-sdforest-pool-entries.cjs
node scripts/run-contract-tests.mjs
```

`CHROME_PATH` overrides the browser path; `SDFOREST_BASE_URL` overrides the rendering server. Intermediate video samples are kept outside the repository. Screenshots and JSON results are in [sdforest-pipeline-evidence](sdforest-pipeline-evidence/). These phone checks use browser emulation; physical phone GPU performance remains unverified.

The source-contract suite has one pre-existing failure in `ai-kit-data-contract.test.js:354`: the catalog contains 113 entries while the test expects 108. It was reproduced on the clean base before this work. The pipeline does not change that catalog.

Final built-page verification on 2026-10-03:

| Check | Result |
|---|---|
| Front page, pointer/touch/keyboard, guide/scroll, audio fade and late Listen, return/reload, resize, inner idle/phone loops, codec | 20/20 passed |
| Six pool entries, desktop/phone/reduced motion | 18/18 passed |
| Intro behavior, reverse, focus, resize and reduced motion | Passed |
| Final video RGB against reference, decoder and Chrome | 0 different pixels, desktop and phone |
| Build-backed foundation | 6/6 passed |
| Full source contracts | 232/233; only the reproduced baseline failure above |

The final desktop movie is 47,299,450 bytes and the phone movie is 9,168,439 bytes, both 289 frames at 24 fps. Growth samples use CRF 24; final samples are lossless. Video contact sheets in the evidence directory show samples 0, 72, 144, 216, 287 and 288.

This work is on a feature branch and a draft PR. Cross-family review is required on the pinned PR head. Its free local Qwen2.5-Coder 14B route uses canonical qualification checks, complete file-boundary coverage and a comment-only GitHub App publisher. It does not use Claude subscriptions. Secret values are resolved in memory only by their GCP Secret Manager names. A draft and comment-only review keep production merging under human control.
