# Supporting price examples — 6 Oct 2026

These examples support the capability/coverage pitch. They establish current listed-price differences for named offerings, rather than universal provider savings. No inference calls or inference spend.

The four dashboard catalogue endpoints were re-read during **2026-10-06T10:39:08.904160+00:00 – 2026-10-06T10:39:12.545802+00:00**. Official model pages and native public price sources were read afterward; the latest source retrieval completed at **2026-10-06T10:41:15.689415+00:00**. Exact timestamps, response hashes, source excerpts and price points are in [comparison-followup.json](./comparison-followup.json). Raw responses stay in `/tmp/open-dashboard-comparison-followup`.

| Example | First provider | Comparison provider | Listed-price difference |
| --- | --- | --- | --- |
| GPT-4o mini, uncached input/output per million tokens | Crazyrouter: **$0.0975 / $0.39** | OpenRouter: **$0.15 / $0.60** | **35% lower** on both legs |
| Seedream 4.5 text-to-image, per generated image | KIE: **$0.0325** (6.5 credits) | fal.ai: **$0.04** | **18.75% lower** |

## Crazyrouter / OpenRouter basis

[Crazyrouter’s native pricing source](https://crazyrouter.com/api/pricing) explicitly attributes `gpt-4o-mini` to OpenAI. The OpenRouter catalogue names `openai/gpt-4o-mini`; the join uses the exact model alias plus author namespace, not guessed similarity. The two catalogues share no literal full ids.

The dashboard price points are **derived**: model ratio 0.075 × 2 × default group ratio 1 × discount badge 0.65 = $0.0975/M input; completion ratio 4 gives $0.39/M output. Both compared token legs have `condition: null`. These are uncached token quotes; cache pricing, account routing, additional charges and immutable deployment/snapshot equivalence are outside this example. Settled bill savings are not measured.

[OpenRouter source](https://openrouter.ai/api/v1/models) and each provider’s live dashboard catalogue supplied the current quotes.

## KIE / fal.ai basis

KIE’s [public model pricing API](https://api.kie.ai/client/v1/model-pricing/page) lists **6.5 credits** and **$0.0325** per image for `seedream 4.5, text-to-image`, linking [the callable model](https://kie.ai/seedream-4-5?model=seedream%2F4.5-text-to-image). Its [published standard credit rate](https://kie.ai/pricing) is **$0.005/credit**, and 6.5 × $0.005 matches the USD column exactly. Top-up bonuses are excluded.

The independently fetched [official fal.ai Seedream 4.5 text-to-image page](https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image) visibly states **$0.04 per image**. Its `publicEndpointBilling` metadata independently agrees: `billing_unit: images`, `price: 0.04`. Comparable single-image 2K settings exist: KIE `quality=basic` (2K) and fal `image_size=auto_2K`/2048×2048 with `num_images=1`, `max_images=1`. This compares public price quotes, not quality or settled bills.

The dashboard’s fal catalogue returned **zero priced entries** in this read, so the fal price comes from that official page. KIE’s native `falPrice` field was not treated as an independently verified fal source. A Nano Banana alternative was excluded because fal’s displayed prose and billing metadata disagree on its exact price.

## Suggested supporting copy

- “For GPT-4o mini, Crazyrouter’s listed net token rates are 35% lower than OpenRouter’s: $0.0975/$0.39 versus $0.15/$0.60 per million input/output tokens (6 Oct 2026; Crazyrouter rates derived from published coefficients).”
- “For Seedream 4.5 text-to-image, KIE lists $0.0325 per image versus fal.ai’s $0.04 — 18.75% lower (6 Oct 2026; standard credit rate; fal’s official model page).”

Do not generalize either example to all models or unconditional savings.
