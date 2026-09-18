/**
 * Refresh the Nous Research catalogue supplement.
 *
 * A Nous Portal key is optional and, when supplied, is read only through
 * NOUS_PORTAL_API_KEY. The endpoint is readable without it, so a catalogue
 * response is never treated as proof of inference access. The resulting public
 * snapshot contains catalogue rows and their published rates, never the
 * credential or the vault path.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.NOUS_PORTAL_API_KEY?.trim() || "";
if (apiKey && !apiKey.startsWith("sk-nous-"))
  throw new Error("NOUS_PORTAL_API_KEY must be a Nous Portal key.");

const sourceUrl = "https://inference-api.nousresearch.com/v1/models";
const observedAt = new Date().toISOString();
const headers = {
  Accept: "application/json",
  "User-Agent": "open-dashboard-site/1.1.4",
};
if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
const response = await fetch(sourceUrl, {
  method: "GET",
  headers,
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
      pricingNote: `Catalogue rows observed on ${new Date(observedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}; rates are provider-published and no generation cost is inferred.`,
      sourceNotes: [
        "Nous Research /v1/models catalogue. Token rates are provider-published; inference status is recorded separately.",
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
const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../nous-catalogue.json",
);
const previous = await readFile(outputPath, "utf8").catch(() => null);
let previousSnapshot = null;
if (previous) {
  try {
    previousSnapshot = JSON.parse(previous);
  } catch {}
}
const inference = previousSnapshot?.inference?.status
  ? previousSnapshot.inference
  : {
      status: "unverified",
      reason:
        "No Nous inference result is included in this catalogue refresh. The Hermes API server key is a separate credential from a Nous Portal API key.",
    };
const snapshot = {
  schemaVersion: 1,
  collector: "open-dashboard-mcp@1.1.4 + Nous Research catalogue",
  provider: "nous",
  displayName: "Nous Research",
  sourceUrl,
  fetchedAt: observedAt,
  status: `catalogue_observed_inference_${inference.status}`,
  inference,
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
      populationScope: apiKey ? "portal_key_request" : "public_model_catalogue",
      error: "Inference status is tracked separately; catalogue access is read-only.",
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
    "Read-only model catalogue; the /v1/models response is not evidence of inference access.",
    apiKey
      ? "A Nous Portal key was supplied for this read; it is not the Hermes API server key."
      : "No Nous Portal key was supplied for this read; the catalogue endpoint is publicly readable.",
    "No API key or secret name is included in this public snapshot.",
  ],
  models,
};
if (apiKey && previous && previous.includes(apiKey))
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
