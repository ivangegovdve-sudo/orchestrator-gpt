# SD Forest embedded-forest QA — 2026-09-23

Scope: the explicitly approved connected-bark mock and its two inset-title
corrections, existing PR #619. The older reports below remain historical.

## Matched comparison

- Source: `docs/frontpage-proof/embedded-approved.png`, 1672×941.
- Actual HTML: `embedded-target.png`, same viewport and opened state, DPR1.
- Compared together in `embedded-comparison.png` at native scale, then both
  inset titles in `embedded-title-comparison.png` (reference left, render right).
- Checked desktop 1920×1080, 1672×941, 1366×768 and 1920×720; mobile 390×844,
  320×568, 780×390, normal-flow continuation, selection, resolve and reduced motion.

## Findings and corrections

1. [P2, fixed] Opaque source margins made control frames look pasted on. The
   artwork-only clipping now blends them into the continuous bark; native text
   is outside that clip. New original bark, woodland, mist and ground layers
   match the selected organic/electric direction without redrawing the tree.
2. [P2, fixed] The two requested titles fell outside the lower insets. Native
   nameplates and container-scaled type keep full text ranges inside. Enlarged
   plate treatment preserves legibility rather than shrinking names excessively.
3. [P2, fixed] Bright bark behind mobile rows hurt contrast, and an initial
   permanent nav background leaked into resolve. A darker independent backing
   follows the existing field arrival and reverse scrub; it is absent at t=0.
4. [P2, fixed] Selected summaries and entry instructions overlapped on desktop.
   A measured failing regression now passes for all seven at four wide sizes;
   instructions and summaries have separate lines, with no idle-layout change.

## Design and interaction gate

Existing fonts, seven distinct readable name colours, main title, subtitle,
copy and control mechanisms remain. The supplied reference is not flattened
into a clickable picture: controls respond independently while bark connects
them. The actual fixed tree is softer than the mock; its source-resolution
limit and exact video framing take precedence over generated mock imagery.
Lower controls keep their approved compact deployed dimensions/positions,
so they sit slightly lower than in the concept. No second ordering system.

Actual browser interaction selected AI-d kit on first press, visibly depressed
the lever, and navigated only on the next press. Mobile scrolling reached
Artificial Self, My Story and all footer controls. Reduced motion is still;
failure states keep routes usable. Source and built browser checks 34/34 each,
foundation 6/6. Full npm source contracts 191/192, only the untouched known
Windows CRLF hash artifact. See `docs/frontpage-embedded.md` for measured costs,
protected-diff audit and Sail feedback disposition, not an approval claim.

P3 follow-up only: Ivan's higher-resolution tree render will improve central
sharpness; physical-phone GPU/thermal testing remains unmeasured. No outstanding
P0/P1/P2 visual finding in the tested viewports.

final result: passed

---

# Historical SD Forest front-page workbench QA — 2026-09-23

Scope: approved direction 2 and its approved visual/interaction revisions, PR
#619. The earlier Open Dashboard report below is preserved unchanged.

## Source and rendered comparison

- Source visual truth: `docs/frontpage-proof/workbench-approved.png`, 1672×941.
- Implementation: `docs/frontpage-proof/workbench-target.png`, 1672×941 CSS px,
  DPR 1, opened state on the existing homepage. No image scaling for the main
  comparison; both images are placed together at native size in
  `docs/frontpage-proof/workbench-comparison.png` (3344×941).
- Focused comparison: `docs/frontpage-proof/workbench-control-comparison.png`,
  approved first-aid control left, rendered control right. Crops retain aspect
  ratio and are fitted into equal 490×270 panels. It makes text, flag and lever
  fidelity readable rather than judging from a tiny full-page view.
- Other actual renders: desktop 1920×1080; mobile 390×844 landing and full
  continuation; narrow 320×568; landscape 780×390; selected AI-d kit; reduced
  motion; resolve-only frames. All are linked in `docs/frontpage-workbench.md`.
- The source deliberately omits the tree and marks a shorter placeholder. The
  accepted numbered tree contract overrides that placeholder; the real bitmap
  is larger and must remain unchanged. This is not a pixel-identical redraw.

## Comparison history and fixes

1. [P2, corrected] The first render put leading controls at 23vh and the next
   pair at 51vh, too low versus the source. Moved to 13vh / 40vh. Protected
   central tree geometry did not move. Repeated combined comparison now shows
   Health/AI-d kit leading, GrowingApp immediately below Health and Artificial
   Self opposite it; three compact controls below the roots.
2. [P2, corrected] Full-image black canvases looked pasted over the horizon.
   Fixed the edge masks on the base art; small region textures animate only the
   actual mechanism. Reopened combined and control comparisons: no hard black
   rectangle around the frames. Wood and moss remain original raster artwork,
   not handcrafted SVG/CSS substitutes.
3. [P2, corrected] Health's name sat on the lower rim rather than inside the
   glass. Moved the live label into the left glass with a dark readability
   backing, leaving the ECG readable across the remaining glass. Latest
   comparison contains the corrected placement.
4. [P2, corrected] The initial phone capture had scrolled to Pause motion while
   preparing the still frame. Corrected the capture procedure and recaptured
   at scrollY=0; the landing now honestly shows 5/7 rows, not the footer.
5. [P2, corrected] Input transitions initially referenced the last idle visual
   sample, risking a snapped lever if that sample was stale. They now read the
   sole controller clock; the regression requires >8 intermediate lever poses.
6. [P2, corrected] At 1366×768 the lower flank hit areas overlapped footer
   utilities by a few pixels. A failing geometry test exposed both entries.
   Short-wide-desktop width/type caps now reserve the footer strip; instructions
   for those flanks sit above, not over it. The 1366×768 and 1920×720 regression
   passes, and dedicated short-desktop screenshots accompany the full evidence.

## Required fidelity surfaces

- **Fonts/typography:** existing self-hosted Cormorant Garamond and Alegreya are
  reused; no new font dependency. Aqua Health, lavender AI-d kit, pale lime
  GrowingApp, amber TinkerBox, violet gallery, violet/teal neurons and warm
  italic My Story keep distinct readable names. Artificial Self uses lighter
  tracking, TinkerBox a firmer Alegreya weight. No screenshot-baked labels.
  Seven distinct foreground colours meet at least 7:1 against #0f0f15.
- **Spacing/layout:** same 1672×941 comparison inspected, then 1920×1080 and
  phone renders. The original wide wooded rails were cut rather than expanded
  into foreground decoration. The larger fixed tree and compact lower controls
  are deliberate contract constraints. All 7 entries fit on wide desktop;
  mobile uses flexible text rows beside mechanism thumbnails, not unreadable
  miniature desktop labels. The mock supplied no mobile design.
- **Colours/tokens:** near-black field, indigo distance, green light and warm
  bark preserve the selected dark-electric/warm-organic contrast. White on green
  aid emblem follows the approved correction. No saturation change to the tree.
- **Image quality:** original generated controls match each approved mechanism;
  seven base images, 13 cropped regions and one horizon total 631,486 bytes.
  Side-by-side detail confirms the lever and aid flag are recognizable at actual
  desktop scale. The tree's ~226×214 meaningful pixels remain visibly soft at
  desktop size; that protected source limitation is not disguised as new detail.
- **Copy/content:** 7/7 existing pool names, 7/7 summaries and both existing
  homepage paragraphs compare unchanged against a08512b. No narrative,
  biography, personal-story or about copy added, changed or used as filler.
  Only functional selected-state/accessibility instructions were introduced.

## Interaction, responsive and failure QA

Actual browser use: first AI-d kit press selected and depressed the purple
lever without navigation; the second press opened `/web/pools/ai-d-kit/`.
Automated browser checks cover every native link, keyboard focus/Enter/Escape,
double-click and held-key protection, reduced-motion mid-scrub, back navigation,
failed art, stalled/failed warm planes, long labels at 320px, enlarged text,
landscape reachability, tree clearance during arrival/selection and zero
per-frame geometry reads at rest. The loaded-page error/asset check found no
runtime errors or failed responses. Reduced motion has no running animations;
paused/offscreen documents stop their scheduler. No hidden control receives Tab.

**Follow-up polish (P3, not a blocker):** Ivan's future higher-resolution tree
render will improve central sharpness; do not fabricate detail or change its
framing. Keep the mobile mechanism thumbnails subordinate to the readable text.

Implementation checklist: source comparison complete; focused comparison
complete; functional and narrow-layout checks complete; protected diff audited;
rendered evidence committed with the same PR. No outstanding P0/P1/P2 finding.

final result: passed

---

# Open Dashboard design QA

Result: **passed for the approved redesign and requested refinements**. The user approved publication on September 10, 2026; the database repair and backend are now live. Frontend deployment evidence is recorded on its release pull request.

## Reference and composition

The selected first design is `exec-785c6051-47da-42ea-a3d6-2fe446d8b2d8.png` (1402 × 1122); the subsequent filter/flow refinement is `exec-1176df8f-1c76-4424-9746-3daaa046d54c.png` (1057 × 1488), both in the conversation's generated image directory. They were inspected alongside the rendered page. The build retains the warm forest palette, two-column introduction, sans typography, substantial quantitative plot, adjacent model inspector and forest connection section. Additional working view controls and truthful source disclosures increase the page length relative to the illustrative image.

Reference numbers and sample app relationships were replaced with actual observations. The plot's distribution and sparse app links therefore deliberately differ from the image; no illustrative values became production data.

## Visual checks

- Desktop light/dark at 1402 × 1122; compact hero and useful explorer composition.
- Phone layout at 390 × 844; no horizontal document overflow. Filters wrap, the inspector stacks, and controls remain usable.
- Local generated forest assets, local Manrope font, licensed tree icon and theme-specific color values render correctly.
- Dark chart marks were brightened after inspection. Small catalogue-group labels were removed where they collided; all provider counts remain in the legend.
- Inspector scrolling prevents a long source record from creating a large blank chart area.
- Dark mode now separates a near-black forest background from brighter panels, borders, text and plot marks. Foreground/background contrast is 17.09:1 for body text; muted text on the soft panel remains 6.89:1. Raster boundaries fade into the page at both forest sections.
- Compact setup fits all six agent choices, platform choices and the next action at 1280 × 800 and 1366 × 768 (action bottom: 714px). At 375 × 667, steps one and two retain a sticky next action. Codex and Claude compatibility disclosures follow the action; native Windows Codex output and copy were verified.
- Reduced motion is respected. Each dense chart has a keyboard entry point and native selection alternative; controls have visible focus states.

Captures are in `F:/butcher/voice/tmp/open-dashboard-discovery/qa/`:

- `landing-light-1402.png`, `landing-light-full.png`
- `landing-dark-1402.png`
- `mobile-dark-video.png`
- `setup-hermes.png`

Refinement captures are also in the worktree's local `.artifacts/` directory: `setup-compact-1366-dark.png`, `setup-compact-1366-light.png`, and `setup-compact-mobile-config.png`.

## Functional browser evidence

- Expanded coverage loads 4,617 provider-specific entries across all 12 direct catalogue adapters. The original 11-source preview omitted Sail and discarded non-media native entries. The dated native supplement now retains 3,548 records; 1,158 comparable text entries plot in the checked combined view.
- OpenRouter's separately fetched provider directory lists 105 routing providers. Selecting its exact gpt-oss-120b model loaded 20 current routes across 17 providers. The route selector and visual bars update the route-specific token prices, context, quantization and supported parameters. The displayed directory and route counts are fetched rather than hard-coded.
- Provider, output modality, free offers, search, minimum context, confirmed tools, axes, scales, workload and URL state are implemented.
- Video view displayed 28 native per-second quotes. The catalogue map displayed 1,049 matching video entries. Free-only video returned an honest empty result.
- OpenRouter HappyHorse detail no longer displayed token zeros as generation prices.
- Zoom followed by point selection preserved the visible axis domain. Arrow/Enter navigation selected a new model and retained a single roving tab stop.
- Daily history showed gaps in the actual 14 published buckets; missing days were not connected or turned into zero.
- The live repaired matrix now supplies 15 observed relationships / 100 pairs and 144 unmapped observations for September 9. The dated archive remains a disclosed fallback. Filtering Hermes displays its two observed links.
- Benchmark view plotted 125 Artificial Analysis observations and 133 observations in the tested Design Arena group. Evaluation groups remain separate. Lifecycle view showed two in-range events and disclosed three later dates.
- OpenRouter quota dialog distinguished 50/day versus 1,000/day based on lifetime purchases, plus 20/min; Groq model-specific quotas were inspectable.
- Hermes setup deep link enabled exactly `dashboard_benchmarks`; copy succeeded and the browser saved the actual 154-byte `open-dashboard-hermes.yaml` file. Client configurations and actual MCP tool advertisement are regression-tested.
- GitHub explorer loaded 87 repositories across eight categories; category/language/search filters, exact metrics, momentum, reset, keyboard navigation and mobile layout were checked by the delegated reviewer.

## Verification and scope

68 frontend tests pass, package-facts verification passes, and the static production build passes. The companion backend has 1,010 passing tests and a successful build. The exact migration was also rehearsed on a temporary copy of the production database; publication and reader boundaries were checked there, then verified again after applying it in production.

There are no remaining known P0/P1/P2 visual defects from this review. Data limitations remain visible: native price coverage is partial; Crazyrouter's complete account catalogue is not publicly established; Sail's documented IDs are retained while its changed pricing document awaits MCP verification. Benchmark variants are not fuzzy-matched, and the site cannot read personal quotas or forecast future billing.

The deployment refresh succeeded with all six native/document sources. A simulated timeout preserved the exact prior snapshot bytes and source date, verifying the outage fallback. The existing unrelated `scratch/tests/lint-glossary.js` fails because `web/ai-init/index.html` no longer contains `id="home-view"`; those files are identical to the main-branch baseline. Its separate glossary-search tests pass. Open Dashboard's regression checks and static build are recorded independently.

## 11 September 2026 — legibility, discoverability and chart choices

The follow-up audit found 9–11px quota, control and chart labels, hidden benchmark/lifecycle navigation, and a token-price view that did not represent all matched media entries. The implementation raises captions to at least 12px, controls to 13px, and quota explanations to 14px with primary text contrast. The six data tabs now remain visible; filters show exact matching totals, removable chips and provider counts, while clearing model filters preserves chart settings.

A fresh visit opens a source-backed overview. Existing filtered links still open their model view. The overview accounts for all 4,617 acquired provider-specific entries, including unknown prices and output classifications; its “Explore all models” action includes inactive records explicitly. Default current-model exploration continues to label its narrower scope. All 16 MCP tools are discoverable, with model resolution, evidenced alias comparison and private key inventory clearly identified as agent workflows rather than public account data.

New charts include catalogue/provider and output-combination bars or donuts, app-token bars or donuts with an explicit returned-app denominator, daily token stacks, and separate app/GitHub rank histories. GitHub rank categories are never combined into one ranking. The 90-day request returned 17 daily token observations across 49 calendar buckets: 32 missing days remain gaps. The 25 published app totals summed to exactly 135,504,110,526,134 tokens during QA; the daily 10×10 app–model matrix remains a separate population and period. Free-model frontier snapshots retain stale/source-exclusion labels. Collector health, project momentum, trending projects, benchmark/lifecycle coverage and package evidence are visible on the overview.

Browser checks used the in-app browser at desktop, the original 783px width, and 375px mobile width. The 783px layout now stacks the inspector below a full-width chart and prevents relationship-control overflow. The quota disclosure measured 14px in the primary text color in both themes; charts use at least 12px labels and remove colliding logarithmic ticks. Charts expose exact values through visible legends/inspectors, native selectors and keyboard interaction. Setup still showed all six agent choices with “Choose your tools” above the fold (button bottom 714px in a 720px-high viewport); the Codex selection advanced correctly.

Regression coverage includes exact chart denominators, distinct provider/model identities, Other membership, single-counted source remainders, ambiguous and incomplete history gaps, separate rank scopes, bounded public overview requests and source-date/failure semantics. The public package remains open-dashboard-mcp 1.0.2; this pass does not add an account API, inference calls or an npm release.

Local follow-up screenshots and the 16-tool field audit are in `F:/butcher/voice/tmp/open-dashboard-legibility/`. Production deployment verification is recorded after publishing.
