# Open Dashboard design QA

Result: **passed for the working redesign preview**. Production publication and the prepared database migration remain pending user approval.

## Reference and composition

The selected first design is `exec-785c6051-47da-42ea-a3d6-2fe446d8b2d8.png` (1402 × 1122); the subsequent filter/flow refinement is `exec-1176df8f-1c76-4424-9746-3daaa046d54c.png` (1057 × 1488), both in the conversation's generated image directory. They were inspected alongside the rendered page. The build retains the warm forest palette, two-column introduction, sans typography, substantial quantitative plot, adjacent model inspector and forest connection section. Additional working view controls and truthful source disclosures increase the page length relative to the illustrative image.

Reference numbers and sample app relationships were replaced with actual observations. The plot's distribution and sparse app links therefore deliberately differ from the image; no illustrative values became production data.

## Visual checks

- Desktop light/dark at 1402 × 1122; compact hero and useful explorer composition.
- Phone layout at 390 × 844; no horizontal document overflow. Filters wrap, the inspector stacks, and controls remain usable.
- Local generated forest assets, local Manrope font, licensed tree icon and theme-specific color values render correctly.
- Dark chart marks were brightened after inspection. Small catalogue-group labels were removed where they collided; all provider counts remain in the legend.
- Inspector scrolling prevents a long source record from creating a large blank chart area.
- Reduced motion is respected. Each dense chart has a keyboard entry point and native selection alternative; controls have visible focus states.

Captures are in `F:/butcher/voice/tmp/open-dashboard-discovery/qa/`:

- `landing-light-1402.png`, `landing-light-full.png`
- `landing-dark-1402.png`
- `mobile-dark-video.png`
- `setup-hermes.png`

## Functional browser evidence

- Loaded 3,473 provider-specific model entries from 11 catalogue sources; text view plotted 576 comparable entries at the checked snapshot.
- Provider, output modality, free offers, search, minimum context, confirmed tools, axes, scales, workload and URL state are implemented.
- Video view displayed 28 native per-second quotes. The catalogue map displayed 1,049 matching video entries. Free-only video returned an honest empty result.
- OpenRouter HappyHorse detail no longer displayed token zeros as generation prices.
- Zoom followed by point selection preserved the visible axis domain. Arrow/Enter navigation selected a new model and retained a single roving tab stop.
- Daily history showed gaps in the actual 14 published buckets; missing days were not connected or turned into zero.
- Matrix archive shows 15 observed relationships / 100 pairs and 144 unmapped observations. Filtering Hermes displayed its two observed links.
- Benchmark view plotted 125 Artificial Analysis observations and 133 observations in the tested Design Arena group. Evaluation groups remain separate. Lifecycle view showed two in-range events and disclosed three later dates.
- OpenRouter quota dialog distinguished 50/day versus 1,000/day based on lifetime purchases, plus 20/min; Groq model-specific quotas were inspectable.
- Hermes setup deep link enabled exactly `dashboard_benchmarks`; copy succeeded and the browser saved the actual 154-byte `open-dashboard-hermes.yaml` file. Client configurations and actual MCP tool advertisement are regression-tested.
- GitHub explorer loaded 87 repositories across eight categories; category/language/search filters, exact metrics, momentum, reset, keyboard navigation and mobile layout were checked by the delegated reviewer.

## Verification and scope

60 frontend tests pass, package-facts verification passes, and the static production build passes. The companion backend has 1,010 passing tests and a successful build. The exact migration was also rehearsed on a temporary copy of the production database; publication and reader boundaries were checked there.

There are no remaining known P0/P1/P2 visual defects from this review. Data limitations are intentional and visible: media quote coverage is partial, app connections use a dated archive until the live repair is published, benchmark variants are not fuzzy-matched, and the site cannot read personal quotas or forecast future billing.
