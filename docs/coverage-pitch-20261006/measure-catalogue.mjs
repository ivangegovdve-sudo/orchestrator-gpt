#!/usr/bin/env node
/** Re-read the public catalogue through the dashboard's own live API. */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { PROVIDER_IDS, publicCatalogueSchema } from "open-dashboard-mcp/public-catalogue";

const baseUrl = (process.env.CATALOGUE_BASE_URL ?? "https://openrouter-github-dashboard.vercel.app").replace(/\/$/, "");
const outputDirectory = resolve(process.env.CATALOGUE_OUTPUT_DIR ?? fileURLToPath(new URL(".", import.meta.url)));
const rawDirectory = resolve(process.env.CATALOGUE_RAW_DIR ?? "/tmp/open-dashboard-coverage-20261006");
const measuredFrom = new Date().toISOString();
const run = promisify(execFile);
await Promise.all([mkdir(outputDirectory, { recursive: true }), mkdir(rawDirectory, { recursive: true })]);

// Preserve all numeric quotes, including quotes derived from published coefficients.
// Keep direct/prose and derived-only coverage visible separately below.
const hasNumericQuote = point => /^(0|[1-9]\d*)(?:\.\d+)?$/.test(point.amount)
  && Number.isFinite(Number(point.amount));
const hasDirectPublishedQuote = point => hasNumericQuote(point)
  && ["published", "parsed_from_prose"].includes(point.provenance);
const imageOutputUnits = new Set(["image", "megapixel", "credit_image"]);
const videoOutputUnits = new Set(["video", "video_second", "credit_video"]);

const responses = new Map();
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < PROVIDER_IDS.length) {
    const provider = PROVIDER_IDS[next++];
    const url = `${baseUrl}/api/live/catalogue?provider=${encodeURIComponent(provider)}`;
    const requestedAt = new Date().toISOString();
    try {
      // curl honors the execution environment's HTTPS proxy configuration.
      const { stdout: body } = await run("curl", ["--silent", "--show-error", "--fail-with-body",
        "--max-time", "150", "--header", "Cache-Control: no-cache", url], { maxBuffer: 64 * 1024 * 1024 });
      const receivedAt = new Date().toISOString();
      await writeFile(join(rawDirectory, `${provider}.json`), body);
      const catalogue = publicCatalogueSchema.parse(JSON.parse(body));
      if (catalogue.providers.length !== 1 || catalogue.providers[0].provider !== provider
        || catalogue.models.some(model => model.provider !== provider)) {
        throw new Error("Unexpected provider in the response");
      }
      responses.set(provider, { catalogue, requestedAt, receivedAt,
        responseSha256: createHash("sha256").update(body).digest("hex") });
      console.log(`${provider}: ${catalogue.models.length} rows, ${catalogue.providers[0].status}`);
    } catch (error) {
      responses.set(provider, { requestedAt, receivedAt: new Date().toISOString(), error: String(error) });
      console.log(`${provider}: ${error}`);
    }
  }
}));

const summary = models => ({
  modelEntries: models.length,
  pricedEntries: models.filter(model => model.pricePoints.some(hasNumericQuote)).length,
  directOrProsePricedEntries: models.filter(model => model.pricePoints.some(hasDirectPublishedQuote)).length,
  derivedOnlyPricedEntries: models.filter(model => model.pricePoints.some(hasNumericQuote)
    && !model.pricePoints.some(hasDirectPublishedQuote)
    && model.pricePoints.some(point => hasNumericQuote(point) && point.provenance === "derived")).length,
  imageEntries: models.filter(model => model.mediaKind === "image").length,
  imageEntriesWithNativeOutputPrices: models.filter(model => model.mediaKind === "image"
    && model.pricePoints.some(point => hasNumericQuote(point) && imageOutputUnits.has(point.unit))).length,
  videoEntries: models.filter(model => model.mediaKind === "video").length,
  videoEntriesWithNativeOutputPrices: models.filter(model => model.mediaKind === "video"
    && model.pricePoints.some(point => hasNumericQuote(point) && videoOutputUnits.has(point.unit))).length,
  openRouterFreeEntries: models.filter(model => model.provider === "openrouter" && model.id.endsWith(":free")).length,
});
const modelsByIdentity = new Map();
const providers = PROVIDER_IDS.map(provider => {
  const response = responses.get(provider);
  const metadata = { provider, requestedAt: response.requestedAt, receivedAt: response.receivedAt };
  if (!response.catalogue) return { ...metadata, status: "request_failed", error: response.error,
    ...summary([]) };
  const unique = new Map();
  for (const model of response.catalogue.models) {
    const key = JSON.stringify([model.provider, model.id]);
    // A repeated identity is one entry; union price points without inventing a quote.
    const current = unique.get(key);
    unique.set(key, current ? { ...current, pricePoints: [...current.pricePoints, ...model.pricePoints] } : model);
  }
  for (const [key, model] of unique) modelsByIdentity.set(key, model);
  const state = response.catalogue.providers[0];
  return { ...metadata, fetchedAt: response.catalogue.fetchedAt, ...state,
    returnedRows: response.catalogue.models.length,
    duplicateIdentityRows: response.catalogue.models.length - unique.size,
    responseSha256: response.responseSha256,
    ...summary([...unique.values()]) };
});
const warnings = providers.filter(provider => provider.status !== "available"
  || provider.population?.completeness !== "full").map(provider => ({
    provider: provider.provider, status: provider.status,
    completeness: provider.population?.completeness ?? "unavailable", error: provider.error ?? null,
  }));
const measurement = {
  measuredFrom, measuredAt: new Date().toISOString(), baseUrl,
  endpoint: "/api/live/catalogue?provider={provider}",
  providerRegistrySource: "open-dashboard-mcp/public-catalogue PROVIDER_IDS (vendored 1.5.0)",
  registeredProviders: PROVIDER_IDS.length,
  respondingProviders: providers.filter(provider => provider.status !== "request_failed").length,
  populatedProviders: providers.filter(provider => provider.modelEntries > 0).length,
  providersWithPrices: providers.filter(provider => provider.pricedEntries > 0).length,
  ...summary([...modelsByIdentity.values()]),
  definitions: {
    modelEntries: "Distinct (provider,id) pairs returned by the 16 live endpoint reads. Variants and pricing configurations count separately; these are not unique underlying models or verified callable models.",
    pricedEntries: "At least one finite nonnegative numeric pricePoints.amount. This includes zero prices, native credit quotes, conditional/account-scoped quotes and values derived from published pricing coefficients. The directOrProsePricedEntries and derivedOnlyPricedEntries breakdowns preserve provenance. A quote is not a settled charge, a common currency across providers or proof of API readiness.",
    providersWithPrices: "Registered providers with at least one priced entry in this read.",
    imageEntries: "Distinct entries where mediaKind=image; native output-priced subset uses image, megapixel or credit_image price units.",
    videoEntries: "Distinct entries where mediaKind=video; native output-priced subset uses video, video_second or credit_video price units. Generic request/GPU-time/token prices are excluded from both output-priced subsets.",
    openRouterFreeEntries: "Distinct OpenRouter entries whose id ends with :free; this is a catalogue label, not a guarantee of availability or unlimited free use.",
    freshness: "Fresh endpoint reads within the measuredFrom/measuredAt request window; individual source observedAt and price readAt can be older. Partial or unavailable sources remain explicit.",
  },
  warnings, providers,
};
await writeFile(join(outputDirectory, "measurement.json"), `${JSON.stringify(measurement, null, 2)}\n`);
const rows = providers.map(provider => `| ${provider.provider} | ${provider.modelEntries} | ${provider.pricedEntries} | ${provider.imageEntries} / ${provider.imageEntriesWithNativeOutputPrices} | ${provider.videoEntries} / ${provider.videoEntriesWithNativeOutputPrices} | ${provider.status}; ${provider.population?.completeness ?? "unavailable"} |`).join("\n");
const report = `# Public catalogue coverage measurement\n\nRequest window: **${measurement.measuredFrom} – ${measurement.measuredAt}**.\n\nSource: ${baseUrl}${measurement.endpoint}, one request for every registered provider. No inference calls or inference spend.\n\n- **${measurement.modelEntries.toLocaleString("en-US")} model entries**, deduplicated by (provider,id), across **${measurement.registeredProviders} registered providers**; **${measurement.populatedProviders}** returned entries in this read.\n- **${measurement.pricedEntries.toLocaleString("en-US")} entries with published numeric prices**, from **${measurement.providersWithPrices} providers**. Of these, **${measurement.directOrProsePricedEntries.toLocaleString("en-US")}** have direct/prose quotes and **${measurement.derivedOnlyPricedEntries.toLocaleString("en-US")}** have derived quotes only.\n- **${measurement.imageEntries.toLocaleString("en-US")} image entries**, **${measurement.imageEntriesWithNativeOutputPrices.toLocaleString("en-US")}** with native output prices.\n- **${measurement.videoEntries.toLocaleString("en-US")} video entries**, **${measurement.videoEntriesWithNativeOutputPrices.toLocaleString("en-US")}** with native output prices.\n- **${measurement.openRouterFreeEntries} OpenRouter :free entries**.\n\n| Provider | Entries | Priced | Image / output-priced | Video / output-priced | Source status / population |\n| --- | ---: | ---: | ---: | ---: | --- |\n${rows}\n\n## Definitions and limits\n\n${Object.entries(measurement.definitions).map(([key, value]) => `- **${key}:** ${value}`).join("\n")}\n\n## Source warnings\n\n${warnings.length ? warnings.map(warning => `- ${warning.provider}: ${warning.status}; population ${warning.completeness}${warning.error ? `; ${warning.error}` : ""}.`).join("\n") : "All providers were available and reported full population coverage."}\n\nThe response SHA-256 hashes, source timestamps, retained populations, price-coverage states and per-provider counts are in [measurement.json](./measurement.json). Raw public API responses were retained locally in ${rawDirectory}; they are not committed.\n\nRe-run from the repository root with Node.js and curl available:\n\n\`\`\`sh\nnode docs/coverage-pitch-20261006/measure-catalogue.mjs\n\`\`\`\n\nOptional overrides: CATALOGUE_BASE_URL, CATALOGUE_OUTPUT_DIR and CATALOGUE_RAW_DIR. This script discovers providers from the same vendored registry the live API route imports.\n`;
await writeFile(join(outputDirectory, "README.md"), report);
console.log(JSON.stringify({ ...summary([...modelsByIdentity.values()]), providersWithPrices: measurement.providersWithPrices,
  measuredFrom, measuredAt: measurement.measuredAt, warnings }, null, 2));
