# Groq and router copy evidence — 6 Oct 2026

Read-only source review at **2026-10-06 10:39–10:40 UTC**. No inference calls or inference spend.

## Groq Free and Developer plans

- [Official overview](https://console.groq.com/docs/overview): “Fast LLM inference, OpenAI-compatible.”
- [Official billing FAQs](https://console.groq.com/docs/billing-faqs): “The Developer tier is designed for developers and companies who want increased capacity and more features with pay-as-you-go pricing.” Upgrading requires a valid payment method. “There's no immediate charge” on upgrade; tokens are billed at month-end or progressive billing thresholds. A monthly billing cycle is not a monthly subscription.
- [Official rate limits](https://console.groq.com/docs/rate-limits): the active HTML table is labelled **Free Plan Limits**; its embedded data identifies `freeRows`. Limits apply per organization, and account limits can differ. GPT-OSS 20B and 120B each list 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day in this read. These examples are dated, not permanent guarantees.
- [Official model list](https://console.groq.com/docs/models) also includes enterprise offerings. Do not describe every Groq model entry as free.

Supported copy: **“Groq offers fast inference on a rate-limited Free tier, with higher limits on its pay-as-you-go Developer plan.”** Source copies remain in `/tmp/groq-plan-research/`.

## OpenRouter's separate routers

- [Auto Router](https://openrouter.ai/docs/guides/routing/routers/auto-router): “It is powered by the market: the aggregate spend of millions of people using OpenRouter, measured over a trailing 7-day window for each task type.” Its classifier and market rankings differ from the Jev router. With no restrictions it “considers every ranked candidate for your prompt's task type.”
- [Jev Router](https://openrouter.ai/docs/guides/routing/routers/jev-router), slug `typesafe/jev-router`: “Jev, TypeSafe's decision model, reads the conversation and judges the task type, difficulty, and how much a stronger model would help.” It chooses “the cheapest candidate that meets that bar from a curated pool of models.” Include lists “only narrow the router's pool. They do not add models.”
- [Jev documentation](https://openrouter.ai/docs/guides/community/jev) identifies Jev as TypeSafe's structured decision model and links that separate Jev Router.

Neither current router guide establishes a numerical candidate-pool denominator. Do not say Auto Router is Jev-powered or infer its pool size from the whole OpenRouter catalogue.

## The linked model-router project

Verified public branch **`ivangegovdve-sudo/model-router:main`**, commit **`3e2aa2649bd8cf1477d113b150ac1a616609ae6b`** (29 Sept 2026). The read-only checkout is `/tmp/model-router-pitch-review/`.

- [README, pinned revision](https://github.com/ivangegovdve-sudo/model-router/blob/3e2aa2649bd8cf1477d113b150ac1a616609ae6b/README.md#L57): the decision is “a lookup plus a comparison — measured 17–24 ms over ~1,000 seats, no network, no model.” Those are repository-reported historical measurements, not newly verified performance or a current roster count.
- [Supported providers and qualification](https://github.com/ivangegovdve-sudo/model-router/blob/3e2aa2649bd8cf1477d113b150ac1a616609ae6b/README.md#L114): OpenRouter, AkashML, Venice, Nous, Sail, io.net and Groq. “Until something is measured, every request abstains — by design.” Catalogue entries therefore do not all become usable routing candidates.
- [Decision source](https://github.com/ivangegovdve-sudo/model-router/blob/3e2aa2649bd8cf1477d113b150ac1a616609ae6b/engine/modelrouter/decision.py#L27): “Stdlib only. No I/O. Deterministic: the same facts always give the same Choice.” No Jev integration or OpenRouter implementation ancestry was established by this source review.
- [Dashboard integration](https://github.com/ivangegovdve-sudo/model-router/blob/3e2aa2649bd8cf1477d113b150ac1a616609ae6b/engine/modelrouter/gather.py#L142) reads the dashboard's `/api/public/v2/live-models` endpoint as a price source; provider catalogues and this router's own measured behaviour supply other facts.

Supported copy: **“Model Router is a separate OpenAI-compatible proxy that uses live provider catalogues, dashboard price evidence and measured behaviour to choose a qualifying model, record its reasons, or abstain.”** The dashboard itself remains read-only catalogue intelligence.

## Scope of an over-10× comparison

The [live coverage measurement](./measurement.json) read **5,222 distinct `(provider,id)` catalogue entries**, including **464 OpenRouter entries**, during **2026-10-06 10:44:21–10:44:30 UTC**: **5,222 / 464 = 11.25×**. This is an observed catalogue-entry comparison across providers against the OpenRouter catalogue portion of the same read. It includes variants and pricing configurations and says nothing about unique underlying models or either router's verified inference candidates.

A live comparison must recompute the numerator and denominator from the same read, and use the OpenRouter denominator only when its source reports `available`, full population coverage and no error. If it is partial, unavailable, unknown or zero, omit the ratio. Never label this ratio “10× more models the router can use.”
