// Generated from the installed open-dashboard-mcp package; do not edit.
export const PACKAGE_FACTS = {
  "name": "open-dashboard-mcp",
  "version": "0.8.0",
  "node": ">=20",
  "providers": [
    {
      "id": "openrouter",
      "displayName": "OpenRouter",
      "catalogueUrl": "https://openrouter.ai/api/v1/models",
      "citationUrl": "https://openrouter.ai/docs/api/api-reference/models/get-models",
      "publishes": {
        "pricing": "partial",
        "contextLength": "always",
        "outputModalities": "always",
        "reasoningEfforts": "partial",
        "activeFlag": "never",
        "discounts": "partial",
        "discountExpiry": "never",
        "lifecycle": "always"
      },
      "spendVisibility": "api",
      "comparabilityNote": "OpenRouter publishes prices for nearly every model, plus lifecycle and deprecation state. Discounts are a provider-endpoint fact rather than a model fact and are collected under a daily request budget, so most of the catalogue is unobserved for discounts at any moment. No discount expiry is published anywhere."
    },
    {
      "id": "groq",
      "displayName": "Groq",
      "catalogueUrl": "https://api.groq.com/openai/v1/models",
      "citationUrl": "https://console.groq.com/docs/api-reference#models-list",
      "publishes": {
        "pricing": "partial",
        "contextLength": "always",
        "outputModalities": "always",
        "reasoningEfforts": "never",
        "activeFlag": "always",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "Groq lists a small catalogue with context length, modality and an active flag, and publishes prices for only some of it. It exposes no deprecation signal, so a Groq model disappearing from the list is the only retirement notice there is. It exposes no billing API, so per-key spend cannot be read."
    },
    {
      "id": "cerebras",
      "displayName": "Cerebras",
      "catalogueUrl": "https://api.cerebras.ai/v1/models",
      "citationUrl": "https://inference-docs.cerebras.ai/api-reference/models",
      "publishes": {
        "pricing": "never",
        "contextLength": "never",
        "outputModalities": "never",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "Cerebras publishes only a model id and owner — no price, no context length, no modality. Its models therefore cannot be ranked on cost or filtered on capability from catalogue data alone, and are reported as unrankable rather than dropped. It exposes no billing API, so per-key spend cannot be read."
    },
    {
      "id": "sail",
      "displayName": "Sail",
      "catalogueUrl": "https://api.sailresearch.com/v1/models",
      "citationUrl": "https://docs.sailresearch.com/pricing.md",
      "publishes": {
        "pricing": "never",
        "contextLength": "never",
        "outputModalities": "never",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "Sail models expose no programmatic price endpoint and are parsed periodically from a markdown document. Prices are strictly per-completion window; an optional availability source is absent."
    },
    {
      "id": "qwencloud",
      "displayName": "QwenCloud",
      "catalogueUrl": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
      "citationUrl": "https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope",
      "publishes": {
        "pricing": "never",
        "contextLength": "never",
        "outputModalities": "never",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "QwenCloud is a front end onto Alibaba Model Studio's DashScope international plane, and its catalogue lists 165 models with nothing but an id and an owner — no price, no context length, no modality. Cheap Qwen figures quoted elsewhere come from OpenRouter's catalogue, and a relayed price is a fact about the relay, so they are not reported here as QwenCloud prices. Its value is that it lists models OpenRouter does not relay at all."
    },
    {
      "id": "deepinfra",
      "displayName": "DeepInfra",
      "catalogueUrl": "https://api.deepinfra.com/models/list",
      "citationUrl": "https://deepinfra.com/models",
      "publishes": {
        "pricing": "always",
        "contextLength": "partial",
        "outputModalities": "never",
        "reasoningEfforts": "never",
        "activeFlag": "partial",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "partial"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "DeepInfra publishes prices with no credential, in cents per token, and is the only provider here that says when a model retires and what replaces it. Two cautions: more than half its token-priced catalogue (114 of 218) already carries a retirement date, so a cheap price is often a price on a model being withdrawn; and 153 further models are billed per second, image, character or frame and are deliberately absent from per-token comparisons rather than converted."
    },
    {
      "id": "novita",
      "displayName": "Novita",
      "catalogueUrl": "https://api.novita.ai/v3/openai/models",
      "citationUrl": "https://novita.ai/docs/api-reference/model-apis-llm-list-models",
      "publishes": {
        "pricing": "partial",
        "contextLength": "always",
        "outputModalities": "always",
        "reasoningEfforts": "never",
        "activeFlag": "partial",
        "discounts": "partial",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "Novita publishes prices, context length and modalities with no credential. Its flat price field is NOT a reliable single rate: five models are tiered, and the flat value is the cheapest band on one model and the dearest on another, while two tiered models publish no flat price at all. Prices reported here are the first tier — what a normal-length call costs — with the full bands retained, so a long-context call can be priced honestly rather than understated."
    },
    {
      "id": "sambanova",
      "displayName": "SambaNova",
      "catalogueUrl": "https://api.sambanova.ai/v1/models",
      "citationUrl": "https://docs.sambanova.ai/cloud/api-reference/endpoints/models",
      "publishes": {
        "pricing": "always",
        "contextLength": "always",
        "outputModalities": "never",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "SambaNova lists a very small catalogue — 7 models — and publishes USD-per-token prices in exactly the encoding this server already uses, so nothing is rescaled or inferred. It publishes no modality, no active flag and no retirement signal, so a model vanishing from the list is the only notice there is."
    },
    {
      "id": "chutes",
      "displayName": "Chutes",
      "catalogueUrl": "https://llm.chutes.ai/v1/models",
      "citationUrl": "https://chutes.ai/app/api",
      "publishes": {
        "pricing": "always",
        "contextLength": "always",
        "outputModalities": "always",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "Chutes publishes prices in USD per MILLION tokens as bare numbers, which look identical in shape to this server's per-token strings and are a million times larger; they are rescaled once at ingest. It also quotes every price in Bittensor's TAO alongside USD — that figure is deliberately ignored here, because it floats against the dollar and would turn a price comparison into a currency bet. Its broader catalogue reports 495 entries including image and video models; only the 14 chat models are collected today."
    }
  ],
  "tools": [
    {
      "name": "dashboard_benchmarks",
      "title": "Dashboard benchmark observations",
      "description": "Read the published OpenRouter benchmark observations, including Artificial Analysis, Design Arena and OpenRouter's own benchmark variant. Upstream unavailability remains an explicit structured error.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_free_models",
      "title": "Dashboard usable free models",
      "description": "Find free models that are currently listed across providers and emit the requested modality (text by default). Freeness comes only from the dashboard's full price classification, so unknown prices and zero-token-price models with other charges are never treated as free.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_github_movers",
      "title": "Dashboard public GitHub momentum movers",
      "description": "Return bounded public GitHub momentum leaders as separate category-scoped project-family slices for 7, 30, or 90 days. Rank movement uses only an exact matching baseline publication; canonical repository metadata, history, and enrichment remain explicitly repository-scoped auxiliary evidence.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_github_trending",
      "title": "GitHub trending repositories",
      "description": "List GitHub trending repositories with the timestamp they were collected at, which path served them, and whether the list is stale.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_key_inventory",
      "title": "Open Dashboard key inventory",
      "description": "Report configured OpenRouter, Groq and Cerebras keys by Secret Manager name: whether each key is alive, and for OpenRouter its spend, ceiling, remaining balance, free-tier flag and rate limit. Names the keys with no ceiling at all. Groq and Cerebras expose no billing API, so their spend is reported as unreadable rather than left blank. Distinguishes a Cloudflare edge block from a genuine credential rejection, because the two look alike and only one warrants rotating a key. Read-only: it cannot mint, modify, or revoke, and never returns or logs a key value.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_matrix",
      "title": "Dashboard app-model matrix",
      "description": "Read the published app-to-model usage matrix. Approval-pending and collection-disabled states remain distinct and no consent gate is bypassed.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_model_economics",
      "title": "Open Dashboard model economics",
      "description": "Compare live models across OpenRouter, Groq and Cerebras on the facts a router decides with: input and output price per token and per million tokens, published discounts, context length, output modality, tool and reasoning support, measured throughput and latency, availability, and retirement risk. Cheapest priced first. Models whose provider publishes no price are reported as cost-unknown and listed after the ranked rows rather than dropped, and every null is explained as a fact about the provider that withheld it.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_model_status",
      "title": "Dashboard model status",
      "description": "Diagnose an exact model id across providers. lastSeenAt is the last complete provider listing that contained the model; lastConfirmedAt is the latest complete provider listing whether or not it contained the model. A later lastConfirmedAt is positive evidence of absence.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_resolve_model",
      "title": "Dashboard resolve model",
      "description": "Resolve a durable model-selection intent into a bounded ranked fallback list. Every result satisfies every explicit constraint in both required catalogue snapshots; unknown values never count favourably and no near miss is returned.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_source_health",
      "title": "Dashboard source health",
      "description": "Report dashboard source freshness, collector failures, and available public routes.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_usage_leaders",
      "title": "Dashboard public ecosystem usage leaders",
      "description": "Rank named models observed in the published daily top-25 slice by exact public OpenRouter-wide ecosystem token volume for a caller-selected calendar window. Rolling-30-day app totals, latest-observed-day app-model rows, and the producer-selected top-axis matrix remain separate labelled evidence sections.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    },
    {
      "name": "dashboard_whats_changed",
      "title": "Dashboard changes",
      "description": "Report what changed for a set of models: which stopped being free and now bill against the same id, other price movement, appearances, disappearances, deprecations, and public ecosystem token-usage rank changes. Free-to-paid transitions are reported in their own bucket. The upstream route compares its own two most recent archived runs and publishes no date for the base run, so how much of the requested window it covered cannot be established: the report says so, a successful report is always partial rather than ok, and an empty result is never an all-clear on models that started charging. A read that fails outright returns status error instead, so handle three statuses: partial, error, and ok, which is currently unreachable. Model, deprecation and rank sections are bounded and scoped to the requested window.",
      "annotations": {
        "readOnlyHint": true,
        "destructiveHint": false,
        "openWorldHint": true
      }
    }
  ]
};
