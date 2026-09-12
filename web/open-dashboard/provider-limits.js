// Published provider policies, checked 2026-09-10. These are not account balances,
// remaining allowances, observed inference speeds, or guarantees of availability.
export const LIMITS_CHECKED_AT = "2026-09-10";

export const OPENROUTER_FREE_LIMITS = Object.freeze({
  provider: "openrouter",
  title: "OpenRouter free variants",
  checkedAt: LIMITS_CHECKED_AT,
  scope: "Account-wide free-model requests",
  modelScope:
    "IDs ending in :free; OpenRouter also offers its free-model router",
  requestsPerMinute: 20,
  tiers: [
    {
      id: "standard",
      label: "Less than $10 purchased",
      minimumPurchasedUsd: 0,
      requestsPerDay: 50,
    },
    {
      id: "purchased",
      label: "$10 or more purchased",
      minimumPurchasedUsd: 10,
      requestsPerDay: 1000,
    },
  ],
  qualification:
    "The threshold is credits purchased over the account’s lifetime, not its current balance or a monthly subscription.",
  note: "Provider capacity can impose additional limits. Exceeding a request quota is a rate-limit event, not a switch to paid inference; paid models or paid fallbacks have their own charges. A negative account balance can prevent even free requests.",
  sourceUrl: "https://openrouter.ai/docs/api_reference/limits",
  numberSourceUrl:
    "https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/",
  accountUrl: "https://openrouter.ai/settings/credits",
});

const textQuota = {
  requestsPerMinute: 30,
  requestsPerDay: 1000,
  tokensPerMinute: 8000,
  tokensPerDay: 200000,
};
const guardQuota = {
  requestsPerMinute: 30,
  requestsPerDay: 14400,
  tokensPerMinute: 15000,
  tokensPerDay: 500000,
};
const speechQuota = {
  requestsPerMinute: 10,
  requestsPerDay: 100,
  tokensPerMinute: 1200,
  tokensPerDay: 3600,
};
const transcriptionQuota = {
  requestsPerMinute: 20,
  requestsPerDay: 2000,
  audioSecondsPerHour: 7200,
  audioSecondsPerDay: 28800,
};

export const GROQ_FREE_LIMITS = Object.freeze({
  provider: "groq",
  title: "Groq Free Plan",
  checkedAt: LIMITS_CHECKED_AT,
  scope: "Organization-wide; model-specific limits",
  sourceUrl: "https://console.groq.com/docs/rate-limits",
  accountUrl: "https://console.groq.com/dashboard/limits",
  note: "Published Free Plan limits vary by model. The first request, token, or audio limit reached applies. Your organization may have different limits; its Limits page is authoritative. These are usage quotas, not tokens-per-second benchmarks or a claim that the catalog’s paid rate is zero.",
  models: {
    "openai/gpt-oss-120b": { ...textQuota },
    "openai/gpt-oss-20b": { ...textQuota },
    "openai/gpt-oss-safeguard-20b": { ...textQuota },
    "qwen/qwen3.6-27b": { ...textQuota },
    "qwen/qwen3.8-27b": { ...textQuota },
    "groq/compound": {
      requestsPerMinute: 30,
      requestsPerDay: 250,
      tokensPerMinute: 70000,
    },
    "groq/compound-mini": {
      requestsPerMinute: 30,
      requestsPerDay: 250,
      tokensPerMinute: 70000,
    },
    "meta-llama/llama-prompt-guard-2-22m": { ...guardQuota },
    "meta-llama/llama-prompt-guard-2-86m": { ...guardQuota },
    "canopylabs/orpheus-arabic-saudi": { ...speechQuota },
    "canopylabs/orpheus-v1-english": { ...speechQuota },
    "whisper-large-v3": { ...transcriptionQuota },
    "whisper-large-v3-turbo": { ...transcriptionQuota },
  },
});

export const PROVIDER_FREE_LIMITS = Object.freeze({
  openrouter: OPENROUTER_FREE_LIMITS,
  groq: GROQ_FREE_LIMITS,
});

export function getFreeTierOffer(provider, modelId) {
  if (provider === "groq" && Object.hasOwn(GROQ_FREE_LIMITS.models, modelId)) {
    return {
      kind: "free_plan_quota",
      ...GROQ_FREE_LIMITS.models[modelId],
      scope: GROQ_FREE_LIMITS.scope,
      checkedAt: LIMITS_CHECKED_AT,
      sourceUrl: GROQ_FREE_LIMITS.sourceUrl,
      accountUrl: GROQ_FREE_LIMITS.accountUrl,
    };
  }
  if (
    provider === "openrouter" &&
    typeof modelId === "string" &&
    (modelId.endsWith(":free") || modelId === "openrouter/free")
  ) {
    return {
      kind: "free_variant_quota",
      requestsPerMinute: OPENROUTER_FREE_LIMITS.requestsPerMinute,
      dailyTiers: OPENROUTER_FREE_LIMITS.tiers,
      scope: OPENROUTER_FREE_LIMITS.scope,
      checkedAt: LIMITS_CHECKED_AT,
      sourceUrl: OPENROUTER_FREE_LIMITS.sourceUrl,
      accountUrl: OPENROUTER_FREE_LIMITS.accountUrl,
    };
  }
  return null;
}
