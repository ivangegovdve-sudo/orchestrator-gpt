// Generated from the pinned package release source; generated-do-not-edit.
export const PACKAGE_FACTS = {
  "name": "open-dashboard-mcp",
  "version": "0.9.0",
  "node": ">=20",
  "providers": [
    {
      "id": "openrouter",
      "caveats": [
        {
          "kind": "rate_limit",
          "value": "20",
          "unit": "requests/minute",
          "scope": "Free model variants (IDs ending in :free), regardless of account status; paid variants are outside this limit. This is the published platform quota, not the caller's remaining allowance.",
          "sourceUrl": "https://openrouter.ai/docs/api_reference/limits",
          "observedAt": "2026-09-08",
          "basis": "provider_published"
        }
      ],
      "caveatResearch": {
        "status": "published",
        "checkedSources": [
          "https://openrouter.ai/docs/api_reference/limits"
        ],
        "observedAt": "2026-09-08",
        "scope": "Only the numeric policies listed in caveats were checked. No inference benchmark or account-specific limit was measured."
      },
      "pitch": {
        "text": "The Unified Interface For Every Model",
        "attribution": "OpenRouter",
        "sourceUrl": "https://openrouter.ai/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://openrouter.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
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
      "caveats": [
        {
          "kind": "rate_limit",
          "value": "8000",
          "unit": "tokens/minute",
          "scope": "Free Plan summary, openai/gpt-oss-120b, organization-level combined token quota. Cached tokens are excluded. Exact organization limits can differ; this is not tokens per second or an inference-speed ceiling.",
          "sourceUrl": "https://console.groq.com/docs/rate-limits",
          "observedAt": "2026-09-08",
          "basis": "provider_published"
        }
      ],
      "caveatResearch": {
        "status": "published",
        "checkedSources": [
          "https://console.groq.com/docs/rate-limits"
        ],
        "observedAt": "2026-09-08",
        "scope": "Only the numeric policies listed in caveats were checked. No inference benchmark or account-specific limit was measured."
      },
      "pitch": {
        "text": "Groq makes inference work at scale.",
        "attribution": "Groq",
        "sourceUrl": "https://groq.com/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://groq.com/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
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
      "caveats": [
        {
          "kind": "trial_expiry",
          "value": "30",
          "unit": "days",
          "scope": "Free Trial credits expire 30 days after they are granted. This is the published trial policy, not this caller's credit balance or expiry date.",
          "sourceUrl": "https://inference-docs.cerebras.ai/support/rate-limits",
          "observedAt": "2026-09-08",
          "basis": "provider_published"
        }
      ],
      "caveatResearch": {
        "status": "published",
        "checkedSources": [
          "https://inference-docs.cerebras.ai/support/rate-limits"
        ],
        "observedAt": "2026-09-08",
        "scope": "Only the numeric policies listed in caveats were checked. No inference benchmark or account-specific limit was measured."
      },
      "pitch": {
        "text": "Build Products that Others Can't",
        "attribution": "Cerebras",
        "sourceUrl": "https://www.cerebras.ai/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://www.cerebras.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
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
      "comparabilityNote": "Cerebras's current /v1/models connector supplies only a model id and owner, so those collected rows cannot be ranked on cost or filtered on capability. This is a connector limitation: a separate public native source returned richer metadata for 3 of 3 models on 2026-09-08. Its collector integration is pending; those values are not yet available here."
    },
    {
      "id": "sail",
      "caveatResearch": {
        "status": "not_found_in_checked_sources",
        "checkedSources": [
          "https://www.sailresearch.com/"
        ],
        "observedAt": "2026-09-08",
        "scope": "No numeric operating limit was established from this checked platform page. This limited check does not establish that the provider publishes none elsewhere."
      },
      "pitch": {
        "text": "Sail is the most cost-efficient API for the best open-source models.",
        "attribution": "Sail Research",
        "sourceUrl": "https://www.sailresearch.com/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://www.sailresearch.com/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
      "displayName": "Sail",
      "catalogueUrl": "https://api.sailresearch.com/v1/models",
      "citationUrl": "https://docs.sailresearch.com/pricing.md",
      "publishes": {
        "pricing": "partial",
        "contextLength": "partial",
        "outputModalities": "never",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "unknown",
      "comparabilityNote": "Sail publishes prices and context information in public documents. This MCP quotes prices only after checking its pinned pricing document and carries the chosen completion window; it does not yet collect the documented context values. The billing routes at https://docs.sailresearch.com/usage-endpoints.md are documented but not probed or read by this integration, so spend visibility is unknown here."
    },
    {
      "id": "qwencloud",
      "caveatResearch": {
        "status": "not_found_in_checked_sources",
        "checkedSources": [
          "https://modelstudio.alibabacloud.com/"
        ],
        "observedAt": "2026-09-08",
        "scope": "No numeric operating limit was established from this checked platform page. This limited check does not establish that the provider publishes none elsewhere."
      },
      "pitch": {
        "text": "Foundation for AI Innovation",
        "attribution": "Alibaba Cloud Model Studio",
        "sourceUrl": "https://modelstudio.alibabacloud.com/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://modelstudio.alibabacloud.com/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
      "displayName": "QwenCloud",
      "catalogueUrl": "https://dashscope-intl.aliyuncs.com/api/v1/models",
      "citationUrl": "https://dashscope-intl.aliyuncs.com/api/v1/models",
      "publishes": {
        "pricing": "partial",
        "contextLength": "partial",
        "outputModalities": "partial",
        "reasoningEfforts": "partial",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "no_billing_api",
      "comparabilityNote": "QwenCloud has price blocks on 242 of 249 native models: 306 outer price blocks contain 893 price entries (measured 2026-09-08). The archive retains 255 identities: 249 native plus 6 compatibility-only ids, preventing false disappearance when changing endpoints (159 of 165 compatibility ids overlap). Native metadata supplies 59 comparable prompt/completion pairs, 134 usable context values and 247 nonempty response-modality lists. The 893 entries include 738 token entries and 155 non-token price entries excluded from token comparisons: 94 per second, 38 per image, 20 per 10,000 characters and 3 per voice. All native prices, ranges and time bands remain in the raw archive; the current API does not publish bands. Flat rates requiring a selection are withheld on 39 models: 37 with multiple ranges and 2 with distinct peak/offpeak bands. Only unambiguous default general input/output rates are quoted. The 72 explicit Reasoning capabilities become empty effort lists without invented effort levels; numeric reasoning limits stay raw. Media-only models, the 7 native models without price blocks and the 6 identity-only supplements remain paid or unknown."
    },
    {
      "id": "deepinfra",
      "caveats": [
        {
          "kind": "concurrency_limit",
          "value": "200",
          "unit": "concurrent_requests",
          "scope": "Default account limit per model; not requests per minute. An account can request a higher limit, and a busy model can still return 429 below the default.",
          "sourceUrl": "https://docs.deepinfra.com/account/rate-limits",
          "observedAt": "2026-09-08",
          "basis": "provider_published"
        }
      ],
      "caveatResearch": {
        "status": "published",
        "checkedSources": [
          "https://docs.deepinfra.com/account/rate-limits"
        ],
        "observedAt": "2026-09-08",
        "scope": "Only the numeric policies listed in caveats were checked. No inference benchmark or account-specific limit was measured."
      },
      "pitch": {
        "text": "Accelerate your AI with developer-friendly APIs designed for performance and cost-efficiency.",
        "attribution": "DeepInfra",
        "sourceUrl": "https://deepinfra.com/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://deepinfra.com/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
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
      "comparabilityNote": "DeepInfra's legacy token connector observed 218 token-priced models out of 371 on 2026-09-08, with 114 carrying a retirement date and 153 further models using second, image, character or frame billing. Its publication flags describe that token connector. The media catalogue separately reads the public model list, retains other billing axes and reports its own acquired population and price coverage. Native prices and conversion conditions accompany comparable rates; catalogue presence alone does not establish that a model is current or its price comparable."
    },
    {
      "id": "novita",
      "caveatResearch": {
        "status": "not_found_in_checked_sources",
        "checkedSources": [
          "https://novita.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "No numeric operating limit was established from this checked platform page. This limited check does not establish that the provider publishes none elsewhere."
      },
      "pitch": {
        "text": "Run models, scale GPUs, and build AI agents, all on one platform.",
        "attribution": "Novita AI",
        "sourceUrl": "https://novita.ai/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://novita.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
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
      "caveatResearch": {
        "status": "not_found_in_checked_sources",
        "checkedSources": [
          "https://sambanova.ai/products/sambacloud"
        ],
        "observedAt": "2026-09-08",
        "scope": "No numeric operating limit was established from this checked platform page. This limited check does not establish that the provider publishes none elsewhere."
      },
      "pitch": {
        "text": "The fastest AI inference on the largest models",
        "attribution": "SambaNova, SambaCloud",
        "sourceUrl": "https://sambanova.ai/products/sambacloud",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://sambanova.ai/products/sambacloud"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
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
      "caveatResearch": {
        "status": "not_found_in_checked_sources",
        "checkedSources": [
          "https://chutes.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "No numeric operating limit was established from this checked platform page. This limited check does not establish that the provider publishes none elsewhere."
      },
      "pitch": {
        "text": "Breakthrough Serverless Compute for AI, at Scale.",
        "attribution": "Chutes",
        "sourceUrl": "https://chutes.ai/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://chutes.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
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
      "comparabilityNote": "Chutes's legacy LLM connector observed 14 models on 2026-09-08 and rescales USD-per-million-token prices once at ingest. Its publication flags describe those LLM rows. The media catalogue separately reads the broader public chute inventory, retains other model types and reports its own denominator. USD prices are used only where their output unit is established; TAO values and GPU-time prices are not converted into a guessed USD price per image or second of generated video."
    },
    {
      "id": "wavespeed",
      "caveatResearch": {
        "status": "not_found_in_checked_sources",
        "checkedSources": [
          "https://wavespeed.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "No numeric operating limit was established from this checked platform page. This limited check does not establish that the provider publishes none elsewhere."
      },
      "pitch": {
        "text": "WaveSpeedAI is the ultimate AI media generation platform — easy to use, affordable, scalable, and fast.",
        "attribution": "WaveSpeedAI",
        "sourceUrl": "https://wavespeed.ai/",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://wavespeed.ai/"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
      "displayName": "WaveSpeedAI",
      "catalogueUrl": "https://wavespeed.ai/api/models",
      "citationUrl": "https://wavespeed.ai/",
      "publishes": {
        "pricing": "partial",
        "contextLength": "never",
        "outputModalities": "partial",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "unknown",
      "comparabilityNote": "WaveSpeedAI's public catalogue includes media models and native prices. The media collector retains every listed model, converts only prices with explicit supported units and required parameters, and records native values and arithmetic. Other rates are reported as unavailable for comparison; missing prices are not evidence that a model is free. Account spend is not read by this integration."
    },
    {
      "id": "fal",
      "caveatResearch": {
        "status": "not_found_in_checked_sources",
        "checkedSources": [
          "https://fal.ai/docs/documentation"
        ],
        "observedAt": "2026-09-08",
        "scope": "No numeric operating limit was established from this checked platform page. This limited check does not establish that the provider publishes none elsewhere."
      },
      "pitch": {
        "text": "The generative media platform powering the world’s top AI apps.",
        "attribution": "fal",
        "sourceUrl": "https://fal.ai/docs/documentation",
        "observedAt": "2026-09-08"
      },
      "pitchResearch": {
        "status": "published",
        "checkedSources": [
          "https://fal.ai/docs/documentation"
        ],
        "observedAt": "2026-09-08",
        "scope": "Provider-owned platform marketing copy; quoted as a provider claim, not endorsed as a comparison result."
      },
      "displayName": "fal",
      "catalogueUrl": "https://api.fal.ai/v1/models",
      "citationUrl": "https://fal.ai/docs/documentation",
      "publishes": {
        "pricing": "partial",
        "contextLength": "never",
        "outputModalities": "partial",
        "reasoningEfforts": "never",
        "activeFlag": "never",
        "discounts": "never",
        "discountExpiry": "never",
        "lifecycle": "never"
      },
      "spendVisibility": "unknown",
      "comparabilityNote": "fal's public model catalogue supplies media identities and categories. Its pricing API requires authentication; the media collector quotes only prices verified from supported public source shapes, retains unpriced models and identifies price coverage separately from catalogue coverage. Missing comparable rates are not evidence of free access. Account spend is not read by this integration."
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
      "name": "dashboard_catalogue",
      "title": "Provider model catalogue and comparable media prices",
      "description": "List model identities including price_not_available rows, provider pitches and structured caveats. Image prices are USD/image; video prices USD/second, with native values, exact conversions and configuration conditions. Each source reports its population, exclusions and acquisition limits. Other prices retain their native billing axis. Paginate with offset/limit; filter providers, mediaKind or modelIds. modelIds also requests WaveSpeed price detail (20 IDs maximum). This never generates media or makes a paid inference call.",
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
