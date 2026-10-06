# Public catalogue coverage measurement

Request window: **2026-10-06T06:04:27.273Z – 2026-10-06T06:04:34.673Z**.

Source: https://openrouter-github-dashboard.vercel.app/api/live/catalogue?provider={provider}, one request for every registered provider. No inference calls or inference spend.

- **5,222 model entries**, deduplicated by (provider,id), across **16 registered providers**; **15** returned entries in this read.
- **2,443 entries with published numeric prices**, from **13 providers**. Of these, **2,399** have direct/prose quotes and **44** have derived quotes only.
- **1,104 image entries**, **159** with native output prices.
- **1,317 video entries**, **274** with native output prices.
- **16 OpenRouter :free entries**.

| Provider | Entries | Priced | Image / output-priced | Video / output-priced | Source status / population |
| --- | ---: | ---: | ---: | ---: | --- |
| openrouter | 464 | 457 | 0 / 0 | 0 / 0 | available; full |
| groq | 11 | 8 | 0 / 0 | 0 / 0 | available; full |
| cerebras | 2 | 2 | 0 / 0 | 0 / 0 | available; full |
| sail | 12 | 0 | 0 / 0 | 0 / 0 | partial; full |
| nous | 425 | 425 | 0 / 0 | 0 / 0 | available; full |
| qwencloud | 0 | 0 | 0 / 0 | 0 / 0 | unavailable; unavailable |
| deepinfra | 386 | 336 | 55 / 47 | 29 / 22 | available; full |
| novita | 121 | 117 | 0 / 0 | 0 / 0 | available; full |
| sambanova | 6 | 6 | 0 / 0 | 0 / 0 | available; full |
| chutes | 491 | 476 | 0 / 0 | 0 / 0 | available; full |
| wavespeed | 1054 | 4 | 316 / 0 | 425 / 4 | available; full |
| fal | 1505 | 0 | 603 / 0 | 559 / 0 | partial; full |
| kie | 524 | 468 | 119 / 112 | 269 / 248 | available; full |
| crazyrouter | 175 | 98 | 11 / 0 | 35 / 0 | available; unknown |
| akashml | 7 | 7 | 0 / 0 | 0 / 0 | available; full |
| ionet | 39 | 39 | 0 / 0 | 0 / 0 | available; full |

## Definitions and limits

- **modelEntries:** Distinct (provider,id) pairs returned by the 16 live endpoint reads. Variants and pricing configurations count separately; these are not unique underlying models or verified callable models.
- **pricedEntries:** At least one finite nonnegative numeric pricePoints.amount. This includes zero prices, native credit quotes, conditional/account-scoped quotes and values derived from published pricing coefficients. The directOrProsePricedEntries and derivedOnlyPricedEntries breakdowns preserve provenance. A quote is not a settled charge, a common currency across providers or proof of API readiness.
- **providersWithPrices:** Registered providers with at least one priced entry in this read.
- **imageEntries:** Distinct entries where mediaKind=image; native output-priced subset uses image, megapixel or credit_image price units.
- **videoEntries:** Distinct entries where mediaKind=video; native output-priced subset uses video, video_second or credit_video price units. Generic request/GPU-time/token prices are excluded from both output-priced subsets.
- **openRouterFreeEntries:** Distinct OpenRouter entries whose id ends with :free; this is a catalogue label, not a guarantee of availability or unlimited free use.
- **freshness:** Fresh endpoint reads within the measuredFrom/measuredAt request window; individual source observedAt and price readAt can be older. Partial or unavailable sources remain explicit.

## Source warnings

- sail: partial; population full; PRICING_STALE.
- qwencloud: unavailable; population unavailable; SOURCE_FETCH_FAILED.
- fal: partial; population full.
- crazyrouter: available; population unknown.

The response SHA-256 hashes, source timestamps, retained populations, price-coverage states and per-provider counts are in [measurement.json](./measurement.json). Raw public API responses were retained locally in /tmp/open-dashboard-coverage-20261006; they are not committed.

Re-run from the repository root with Node.js and curl available:

```sh
node docs/coverage-pitch-20261006/measure-catalogue.mjs
```

Optional overrides: CATALOGUE_BASE_URL, CATALOGUE_OUTPUT_DIR and CATALOGUE_RAW_DIR. This script discovers providers from the same vendored registry the live API route imports.
