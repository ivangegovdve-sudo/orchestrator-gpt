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
