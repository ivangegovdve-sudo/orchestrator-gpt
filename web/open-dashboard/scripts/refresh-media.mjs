/**
 * Refresh public media metadata only: node web/open-dashboard/scripts/refresh-media.mjs
 * Requires the root's pinned open-dashboard-mcp devDependency. No API keys, inference,
 * install commands, or private account metadata are used. Sources have page/time bounds.
 */
import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { collectMediaCatalogue } from "../../../node_modules/open-dashboard-mcp/build/catalogue/index.js";
import { collectCrazyrouterCatalogue } from "../../../node_modules/open-dashboard-mcp/build/catalogue/crazyrouter.js";
import { PROVIDER_REGISTRY } from "../../../node_modules/open-dashboard-mcp/build/providers/registry.js";
import { normalizeMediaCatalogue, mediaPricingStatus } from "../media-data.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(directory, "../media-catalogue.json");
const MAX_MODELS = 20000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const scalar = (value) =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? value
    : null;
const text = (value, limit = 1200) =>
  typeof value === "string" ? value.slice(0, limit) : null;

export function isAllowedPublicSource(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) return false;
  return (
    (url.origin === "https://api.deepinfra.com" &&
      url.pathname === "/models/list") ||
    (url.origin === "https://wavespeed.ai" && url.pathname === "/api/models") ||
    (url.origin === "https://api.wavespeed.ai" &&
      /^\/center\/default\/api\/v1\/model_product\/detail\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(
        url.pathname,
      ) &&
      !url.pathname.includes("..")) ||
    (url.origin === "https://api.fal.ai" && url.pathname === "/v1/models") ||
    (url.origin === "https://fal.ai" && url.pathname === "/pricing") ||
    (url.origin === "https://crazyrouter.com" &&
      url.pathname === "/api/pricing") ||
    (url.origin === "https://api.chutes.ai" && url.pathname === "/chutes/") ||
    (url.origin === "https://docs.sailresearch.com" &&
      url.pathname === "/pricing.md")
  );
}

export const SAIL_PINNED_DIGEST =
  "32447697c3305a5bc8c5c40c9923e1b81aaefbc5ab8092ee59fb94dfdfd017e6";
/** Preserve documented identities when the release's pricing verification fails. */
export function sailDocumentCatalogue(document, observedAt) {
  const sourceUrl = "https://docs.sailresearch.com/pricing.md";
  const digest = createHash("sha256").update(document).digest("hex");
  const verified = digest === SAIL_PINNED_DIGEST;
  const ids = [
    ...new Set(
      [
        ...document.matchAll(
          /data-model="([a-zA-Z0-9][a-zA-Z0-9._/-]{0,239})"/g,
        ),
      ].map((match) => match[1]),
    ),
  ];
  if (!ids.length || ids.length > 1000)
    throw new Error("SAIL_DOCUMENT_IDENTITY_SHAPE_CHANGED");
  // This companion records the verification outcome. It does not independently
  // approve new prices or update the published MCP's pinned contract.
  const note = verified
    ? "Document identity verified; select a completion window in the MCP for a price."
    : "Pricing document changed since this site's pinned verification. Exact documented IDs are retained; prices are withheld until its pinned document is reviewed.";
  const models = ids.map((id, index) => ({
    provider: "sail",
    id,
    displayName: id,
    mediaKind: "unknown",
    nativeType: "documented-model",
    outputModalities: [],
    pricePoints: [],
    pricingState: "unknown",
    pricingNote: note,
    provenance: { sourceUrl, observedAt, sourceIndex: index },
  }));
  return {
    models,
    provider: {
      provider: "sail",
      status: "partial",
      sourceUrl,
      observedAt,
      population: {
        listed: ids.length,
        received: ids.length,
        retained: ids.length,
        excluded: 0,
        exclusionRules: [],
        completeness: "unknown",
      },
      requestParameters: {
        populationScope: "public_documented_models",
        pricingAcquisitionStatus: verified
          ? "window_selection_required"
          : "document_verification_failed",
        documentDigest: digest,
        expectedDocumentDigest: SAIL_PINNED_DIGEST,
        priceCoverageRule: note,
      },
    },
  };
}

async function collectSail(fetchImpl) {
  const sourceUrl = "https://docs.sailresearch.com/pricing.md",
    observedAt = new Date().toISOString();
  try {
    const response = await fetchImpl(sourceUrl, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("SAIL_DOCUMENT_UNAVAILABLE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 256 * 1024) throw new Error("SAIL_DOCUMENT_SIZE_LIMIT");
    return sailDocumentCatalogue(new TextDecoder().decode(bytes), observedAt);
  } catch {
    return {
      models: [],
      provider: {
        provider: "sail",
        status: "unavailable",
        sourceUrl,
        observedAt,
        population: {
          listed: null,
          received: null,
          retained: null,
          excluded: null,
          exclusionRules: [],
          completeness: "unavailable",
        },
        requestParameters: { populationScope: "public_documented_models" },
        error: "SAIL_DOCUMENT_UNAVAILABLE",
      },
    };
  }
}

/** Do not pass through account credentials, even if future collector code changes. */
export function publicMetadataFetch(fetchImpl = fetch) {
  return async (url, options = {}) => {
    const headers = new Headers(options.headers);
    if (
      !isAllowedPublicSource(url) ||
      (options.method ?? "GET").toUpperCase() !== "GET" ||
      headers.has("authorization") ||
      headers.has("cookie") ||
      headers.has("x-api-key") ||
      options.body != null
    ) {
      throw new Error("PUBLIC_METADATA_ONLY");
    }
    return fetchImpl(url, {
      ...options,
      method: "GET",
      credentials: "omit",
      redirect: "error",
    });
  };
}

function sourceNotes(model) {
  const notes = [];
  const native = model.nativePricing ?? {};
  if (model.provider === "fal" && model.pricePoints.length) {
    if (model.mediaKind === "image")
      notes.push(
        "The public fal pricing table uses a 1-megapixel output reference. Image and megapixel billing units are kept separate.",
      );
    if (model.mediaKind === "video")
      notes.push(
        "The public fal table describes an estimated average 5-second, 720p video. Per-video rates are kept separate from per-second rates; selected output parameters can affect cost.",
      );
  }
  if (model.provider === "deepinfra") {
    for (const field of ["short", "full"])
      if (text(native[field])) notes.push(text(native[field]));
    if (native.type === "image_units" && native.default_price_cents != null)
      notes.push(
        "Published default image price; output size or other parameters may change the total.",
      );
    if (native.type === "time")
      notes.push(
        "Native billing is compute time, which is not output-audio time or output-video time.",
      );
  }
  if (
    model.provider === "crazyrouter" &&
    ["image", "video", "audio"].includes(model.mediaKind)
  )
    notes.push(
      "Public media pricing has parameter-specific rules. This snapshot does not convert the rules into a single comparable output price.",
    );
  if (model.provider === "wavespeed" && !model.pricePoints.length)
    notes.push(
      "The public base price is a run price with unresolved output parameters; a per-image or per-second rate has not been established.",
    );
  if (model.provider === "chutes")
    notes.push(
      "Chutes deployments retain their exact chute_id. A deployment name is not silently merged with a model ID from the separate LLM catalogue. Compute-time prices are not output-media prices.",
    );
  if (model.provider === "sail") notes.push(model.pricingNote);
  return [...new Set(notes)];
}

function nativeBilling(model) {
  const native = model.nativePricing;
  if (!native || typeof native !== "object") return null;
  if (model.provider === "deepinfra")
    return Object.fromEntries(
      [
        "type",
        "cents_per_input_token",
        "cents_per_output_token",
        "cents_per_output_sec",
        "cents_per_image_unit",
        "default_price_cents",
        "default_width",
        "default_height",
        "default_iterations",
        "usage_from_cost",
      ].map((key) => [key, scalar(native[key])]),
    );
  if (model.provider === "wavespeed")
    return {
      basePrice: scalar(native.base_price),
      currencyUnit: scalar(native.currencyUnit),
      formula: text(native.formula),
    };
  if (model.provider === "fal")
    return { value: scalar(native.value), unit: scalar(native.unit) };
  return { type: model.nativeType, normalizedOutputRate: null };
}

export function projectSnapshot(
  collections,
  fetchedAt = new Date().toISOString(),
  nativeMetadata = new Map(),
) {
  const allModels = collections.flatMap((collection) => collection.models);
  if (allModels.length > 20000) throw new Error("SOURCE_MODEL_BOUND_EXCEEDED");
  if (allModels.length > MAX_MODELS)
    throw new Error("CATALOGUE_MODEL_BOUND_EXCEEDED");
  const models = allModels
    .map((model) => ({
      provider: model.provider,
      id: model.id,
      displayName: model.displayName,
      mediaKind: model.mediaKind,
      nativeType: model.nativeType,
      outputModalities:
        model.outputModalities ??
        (["other", "unknown"].includes(model.mediaKind)
          ? []
          : [model.mediaKind]),
      metadata: nativeMetadata.get(`${model.provider}:${model.id}`) ?? null,
      pricePoints: model.pricePoints.map((point) => ({
        ...point,
        ...(point.sourceText ? { sourceText: text(point.sourceText) } : {}),
      })),
      pricingState: model.pricingState,
      // The MCP retains a generic parse note even for successfully normalized prices.
      // Keep it for diagnostics, but do not tell visitors a published rate is missing.
      pricingNote: model.pricePoints.length
        ? null
        : (model.pricingNote ?? null),
      collectorPricingNote: model.pricingNote ?? null,
      nativeBilling: nativeBilling(model),
      sourceNotes: sourceNotes(model),
      sourceUrl: model.provenance.sourceUrl,
      fetchedAt: model.provenance.observedAt,
    }))
    .sort(
      (a, b) =>
        a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id),
    );
  const reports = collections.flatMap(
    (collection) => collection.providers ?? [collection.provider],
  );
  const providers = reports.map((report) => ({
    provider: report.provider,
    status: report.status,
    sourceUrl: report.sourceUrl,
    observedAt: report.observedAt,
    population: report.population,
    mediaModels: models.filter(
      (model) =>
        model.provider === report.provider &&
        ["image", "video", "audio"].includes(model.mediaKind),
    ).length,
    catalogueModels: models.filter(
      (model) => model.provider === report.provider,
    ).length,
    outputMediaModels: models.filter(
      (model) =>
        model.provider === report.provider &&
        ["image", "video", "audio"].includes(model.mediaKind),
    ).length,
    modelsWithPricePoints: models.filter(
      (model) => model.provider === report.provider && model.pricePoints.length,
    ).length,
    pricingStatus:
      report.requestParameters.pricingAcquisitionStatus ?? report.status,
    pricingCoverage: report.requestParameters.priceCoverageRule ?? null,
    populationScope:
      report.requestParameters.populationScope ?? "public_native_catalogue",
    error: report.error ?? report.requestParameters.pricingError ?? null,
    pagesFetched: report.requestParameters.pagesFetched ?? null,
    documentDigest: report.requestParameters.documentDigest ?? null,
    expectedDocumentDigest:
      report.requestParameters.expectedDocumentDigest ?? null,
  }));
  const snapshot = {
    schemaVersion: 2,
    collector: "open-dashboard-mcp@1.1.0",
    fetchedAt,
    registry: {
      package: "open-dashboard-mcp",
      version: "1.1.0",
      providers: Object.values(PROVIDER_REGISTRY).map((provider) => ({
        id: provider.id,
        displayName: provider.displayName,
        catalogueUrl: provider.catalogueUrl,
        citationUrl: provider.citationUrl,
        comparabilityNote: provider.comparabilityNote,
        publishes: provider.publishes,
      })),
    },
    currency: "USD",
    providers,
    population: {
      sourceModelsReceived: allModels.length,
      catalogueModels: models.length,
      mediaModels: models.filter((model) =>
        ["image", "video", "audio"].includes(model.mediaKind),
      ).length,
      modelsWithPricePoints: models.filter((model) => model.pricePoints.length)
        .length,
      outputPricesByUnit: Object.fromEntries(
        ["image", "megapixel", "video_second", "video"].map((unit) => [
          unit,
          models.filter((model) =>
            model.pricePoints.some((point) => point.unit === unit),
          ).length,
        ]),
      ),
      excludedByMediaFilter: 0,
      modelsByKind: Object.fromEntries(
        ["text", "image", "video", "audio", "other", "unknown"].map((kind) => [
          kind,
          models.filter((model) => model.mediaKind === kind).length,
        ]),
      ),
      rule: "All acquired native identities are retained, including text, image, video, audio, other and unclassified models. Unknown prices remain unknown. Separate deployments are not silently merged with model names.",
      completeness: providers.every(
        (provider) => provider.population.completeness === "full",
      )
        ? "full"
        : "partial_or_unknown",
    },
    notes: [
      "This is a dated public catalogue snapshot, not an inference service or account-specific quote.",
      "Different native billing units and output parameters are not interchangeable. No alias-based cross-provider model join is made.",
      "Zero token prices and missing prices do not establish free media generation.",
    ],
    models,
  };
  const normalized = normalizeMediaCatalogue(snapshot);
  if (normalized.length !== models.length)
    throw new Error("INVALID_OR_AMBIGUOUS_PROJECTED_IDENTITIES");
  if (
    !models.length ||
    !models.some((model) => mediaPricingStatus(model) === "paid")
  )
    throw new Error("NO_USABLE_MEDIA_PRICE_OBSERVATIONS");
  return snapshot;
}

export async function refreshMediaCatalogue() {
  const pkg = JSON.parse(
    await readFile(
      new URL(
        "../../../node_modules/open-dashboard-mcp/package.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (pkg.version !== "1.1.0")
    throw new Error("REVIEW_COLLECTOR_VERSION_BEFORE_REFRESH");
  const safeFetch = publicMetadataFetch(),
    nativeMetadata = new Map();
  const fetchImpl = async (url, options) => {
    const response = await safeFetch(url, options);
    if (new URL(url).origin === "https://api.deepinfra.com" && response.ok) {
      const rows = await response.clone().json();
      if (Array.isArray(rows))
        for (const row of rows) {
          if (typeof row.model_name !== "string") continue;
          nativeMetadata.set(`deepinfra:${row.model_name}`, {
            contextLength: scalar(row.max_tokens),
            tools:
              Array.isArray(row.tags) && row.tags.includes("tools")
                ? true
                : null,
            capabilities: Array.isArray(row.tags)
              ? row.tags.filter((v) => typeof v === "string").slice(0, 30)
              : [],
            retirementAt:
              typeof row.deprecated === "number"
                ? new Date(row.deprecated * 1000).toISOString()
                : null,
            replacementModel:
              typeof row.replaced_by === "string" ? row.replaced_by : null,
          });
        }
    }
    return response;
  };
  // Explicit empty/null credentials override the collectors' optional environment lookups.
  const native = await collectMediaCatalogue({
    providers: ["deepinfra", "wavespeed", "fal", "chutes"],
    falApiKey: "",
    fetchImpl,
    timeoutMs: 12000,
    maxPages: 64,
  });
  const crazyrouter = await collectCrazyrouterCatalogue({
    apiKey: null,
    fetchImpl,
    timeoutMs: 12000,
  });
  const sail = await collectSail(fetchImpl);
  const snapshot = projectSnapshot(
    [native, crazyrouter, sail],
    new Date().toISOString(),
    nativeMetadata,
  );
  const serialized = JSON.stringify(snapshot, null, 2) + "\n";
  if (Buffer.byteLength(serialized) > MAX_OUTPUT_BYTES)
    throw new Error("SNAPSHOT_SIZE_BOUND_EXCEEDED");
  const temporaryPath = `${outputPath}.tmp`;
  try {
    await writeFile(temporaryPath, serialized, "utf8");
    await rename(temporaryPath, outputPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  console.log(
    JSON.stringify(
      {
        output: outputPath,
        fetchedAt: snapshot.fetchedAt,
        population: snapshot.population,
        providers: snapshot.providers.map((p) => ({
          provider: p.provider,
          status: p.status,
          mediaModels: p.mediaModels,
          withPricePoints: p.modelsWithPricePoints,
        })),
      },
      null,
      2,
    ),
  );
  return snapshot;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  refreshMediaCatalogue().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
