/**
 * Refresh the authenticated Nous Research catalogue supplement.
 *
 * The key is supplied only through NOUS_API_KEY at refresh time. The resulting
 * public snapshot contains catalogue rows and their published rates, never the
 * credential or the vault path. A successful catalogue read does not imply that
 * inference is funded or available; the snapshot records that distinction.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.NOUS_API_KEY?.trim();
if (!apiKey) throw new Error("NOUS_API_KEY is required for the Nous refresh.");

const sourceUrl = "https://inference-api.nousresearch.com/v1/models";
const observedAt = new Date().toISOString();
const response = await fetch(sourceUrl, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "User-Agent": "open-dashboard-site/1.1.4",
  },
  redirect: "error",
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`NOUS_SOURCE_HTTP_${response.status}`);
const payload = await response.json();
if (!Array.isArray(payload?.data) || payload.data.length < 300)
  throw new Error("NOUS_SOURCE_SHAPE_OR_POPULATION_CHANGED");

const decimal = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const cleanAmount = (value) => {
  const string =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : null;
  return string && decimal.test(string) ? string : null;
};
const stringList = (value, limit = 100) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim().toLowerCase())
        .slice(0, limit)
    : [];

const models = payload.data
  .filter((row) => typeof row?.id === "string" && row.id.trim())
  .map((row, index) => {
    const architecture =
      row.architecture && typeof row.architecture === "object"
        ? row.architecture
        : {};
    const outputModalities = stringList(architecture.output_modalities, 20);
    const knownOutput = outputModalities.find((value) =>
      ["text", "image", "video", "audio"].includes(value),
    );
    const mediaKind =
      knownOutput ?? (outputModalities.length ? "other" : "unknown");
    const pricing =
      row.pricing && typeof row.pricing === "object" ? row.pricing : {};
    const pricePoints = [];
    for (const [key, unit] of [
      ["prompt", "token_in"],
      ["completion", "token_out"],
    ]) {
      const amount = cleanAmount(pricing[key]);
      if (amount !== null)
        pricePoints.push({
          id: `nous:${row.id}:${unit}`,
          amount,
          unit,
          condition: null,
          source: { url: sourceUrl, readAt: observedAt },
          provenance: "published",
        });
    }
    const parameters = stringList(row.supported_parameters);
    return {
      provider: "nous",
      id: row.id,
      displayName:
        typeof row.name === "string" && row.name.trim() ? row.name : row.id,
      mediaKind,
      outputModalities,
      metadata: {
        contextLength:
          Number.isSafeInteger(row.context_length) ? row.context_length : null,
        tools: parameters.includes("tools"),
        capabilities: parameters,
        inputModalities: stringList(architecture.input_modalities, 20),
      },
      pricePoints,
      pricingState: pricePoints.length ? "published" : "unknown",
      pricingNote: `Catalogue read authenticated on ${new Date(observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}; no inference call has been exercised through Nous Research.`,
      sourceNotes: [
        "Nous Research /v1/models catalogue. Token rates are provider-published; inference remains unexercised in this snapshot.",
      ],
      sourceUrl,
      fetchedAt: observedAt,
      sourceIndex: index,
    };
  });

const freeTokenPairs = models.filter((model) => {
  const amounts = new Map(model.pricePoints.map((point) => [point.unit, point.amount]));
  return amounts.get("token_in") === "0" && amounts.get("token_out") === "0";
});
const snapshot = {
  schemaVersion: 1,
  collector: "open-dashboard-mcp@1.1.4 + Nous Research catalogue",
  provider: "nous",
  displayName: "Nous Research",
  sourceUrl,
  fetchedAt: observedAt,
  status: "catalogue_authenticated_inference_blocked",
  inference: {
    status: "blocked",
    reason:
      "The available account returned HTTP 401 for inference; no generation was attempted for this site snapshot.",
  },
  providers: [
    {
      provider: "nous",
      status: "partial",
      sourceUrl,
      observedAt,
      population: {
        listed: models.length,
        received: models.length,
        retained: models.length,
        excluded: 0,
        completeness: "full",
      },
      pricingStatus: "published_catalogue",
      pricingCoverage:
        "Token input/output rates are retained when the catalogue publishes them; no generation cost is inferred.",
      populationScope: "authenticated_model_catalogue",
      error: "Inference is blocked; catalogue access is read-only.",
    },
  ],
  population: {
    listed: models.length,
    received: models.length,
    retained: models.length,
    excluded: 0,
    completeness: "full",
    freeTokenPairs: freeTokenPairs.length,
    contextAtOrAboveOneMillion: models.filter(
      (model) => model.metadata.contextLength >= 1_000_000,
    ).length,
  },
  notes: [
    "Read-only model catalogue; authentication proves catalogue access, not inference access.",
    "No API key or secret name is included in this public snapshot.",
  ],
  models,
};

const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../nous-catalogue.json",
);
const previous = await readFile(outputPath, "utf8").catch(() => null);
if (previous && previous.includes(apiKey))
  throw new Error("NOUS_CREDENTIAL_REFLECTION");
await writeFile(outputPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
console.log(
  JSON.stringify({
    output: "web/open-dashboard/nous-catalogue.json",
    models: models.length,
    freeTokenPairs: freeTokenPairs.length,
    contextAtOrAboveOneMillion: snapshot.population.contextAtOrAboveOneMillion,
    fetchedAt: observedAt,
  }),
);
