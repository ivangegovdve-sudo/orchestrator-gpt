/**
 * Refresh public media metadata only: node web/open-dashboard/scripts/refresh-media.mjs
 * Requires the root's pinned open-dashboard-mcp devDependency. No API keys, inference,
 * install commands, or private account metadata are used. Sources have page/time bounds.
 */
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { collectMediaCatalogue } from '../../../node_modules/open-dashboard-mcp/build/catalogue/index.js';
import { collectCrazyrouterCatalogue } from '../../../node_modules/open-dashboard-mcp/build/catalogue/crazyrouter.js';
import { normalizeMediaCatalogue, mediaPricingStatus } from '../media-data.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(directory, '../media-catalogue.json');
const MAX_MODELS = 8000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const scalar = value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;
const text = (value, limit = 1200) => typeof value === 'string' ? value.slice(0, limit) : null;

export function isAllowedPublicSource(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  return (url.origin === 'https://api.deepinfra.com' && url.pathname === '/models/list')
    || (url.origin === 'https://wavespeed.ai' && url.pathname === '/api/models')
    || (url.origin === 'https://api.wavespeed.ai' && /^\/center\/default\/api\/v1\/model_product\/detail\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(url.pathname) && !url.pathname.includes('..'))
    || (url.origin === 'https://api.fal.ai' && url.pathname === '/v1/models')
    || (url.origin === 'https://fal.ai' && url.pathname === '/pricing')
    || (url.origin === 'https://crazyrouter.com' && url.pathname === '/api/pricing');
}

/** Do not pass through account credentials, even if future collector code changes. */
export function publicMetadataFetch(fetchImpl = fetch) {
  return async (url, options = {}) => {
    const headers = new Headers(options.headers);
    if (!isAllowedPublicSource(url) || (options.method ?? 'GET').toUpperCase() !== 'GET'
      || headers.has('authorization') || headers.has('cookie') || headers.has('x-api-key') || options.body != null) {
      throw new Error('PUBLIC_METADATA_ONLY');
    }
    return fetchImpl(url, { ...options, method: 'GET', credentials: 'omit', redirect: 'error' });
  };
}

function sourceNotes(model) {
  const notes = [];
  const native = model.nativePricing ?? {};
  if (model.provider === 'fal' && model.pricePoints.length) {
    if (model.mediaKind === 'image') notes.push('The public fal pricing table uses a 1-megapixel output reference. Image and megapixel billing units are kept separate.');
    if (model.mediaKind === 'video') notes.push('The public fal table describes an estimated average 5-second, 720p video. Per-video rates are kept separate from per-second rates; selected output parameters can affect cost.');
  }
  if (model.provider === 'deepinfra') {
    for (const field of ['short', 'full']) if (text(native[field])) notes.push(text(native[field]));
    if (native.type === 'image_units' && native.default_price_cents != null) notes.push('Published default image price; output size or other parameters may change the total.');
    if (native.type === 'time') notes.push('Native billing is compute time, which is not output-audio time or output-video time.');
  }
  if (model.provider === 'crazyrouter' && model.mediaKind !== 'text') notes.push('Public media pricing has parameter-specific rules. This snapshot does not convert the rules into a single comparable output price.');
  if (model.provider === 'wavespeed' && !model.pricePoints.length) notes.push('The public base price is a run price with unresolved output parameters; a per-image or per-second rate has not been established.');
  return [...new Set(notes)];
}

function nativeBilling(model) {
  const native = model.nativePricing;
  if (!native || typeof native !== 'object') return null;
  if (model.provider === 'deepinfra') return Object.fromEntries(['type', 'cents_per_input_token', 'cents_per_output_token', 'cents_per_output_sec', 'cents_per_image_unit', 'default_price_cents', 'default_width', 'default_height', 'default_iterations', 'usage_from_cost'].map(key => [key, scalar(native[key])]));
  if (model.provider === 'wavespeed') return { basePrice: scalar(native.base_price), currencyUnit: scalar(native.currencyUnit), formula: text(native.formula) };
  if (model.provider === 'fal') return { value: scalar(native.value), unit: scalar(native.unit) };
  return { type: model.nativeType, normalizedOutputRate: null };
}

export function projectSnapshot(collections, fetchedAt = new Date().toISOString()) {
  const allModels = collections.flatMap(collection => collection.models);
  if (allModels.length > 20000) throw new Error('SOURCE_MODEL_BOUND_EXCEEDED');
  const media = allModels.filter(model => ['image', 'video', 'audio'].includes(model.mediaKind));
  if (media.length > MAX_MODELS) throw new Error('MEDIA_MODEL_BOUND_EXCEEDED');
  const models = media.map(model => ({
    provider: model.provider, id: model.id, displayName: model.displayName,
    mediaKind: model.mediaKind, nativeType: model.nativeType,
    outputModalities: model.outputModalities ?? [model.mediaKind],
    pricePoints: model.pricePoints.map(point => ({ ...point, ...(point.sourceText ? { sourceText: text(point.sourceText) } : {}) })),
    pricingState: model.pricingState,
    // The MCP retains a generic parse note even for successfully normalized prices.
    // Keep it for diagnostics, but do not tell visitors a published rate is missing.
    pricingNote: model.pricePoints.length ? null : (model.pricingNote ?? null),
    collectorPricingNote: model.pricingNote ?? null,
    nativeBilling: nativeBilling(model), sourceNotes: sourceNotes(model),
    sourceUrl: model.provenance.sourceUrl, fetchedAt: model.provenance.observedAt,
  })).sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
  const reports = collections.flatMap(collection => collection.providers ?? [collection.provider]);
  const providers = reports.map(report => ({
    provider: report.provider, status: report.status, sourceUrl: report.sourceUrl, observedAt: report.observedAt,
    population: report.population,
    mediaModels: models.filter(model => model.provider === report.provider).length,
    modelsWithPricePoints: models.filter(model => model.provider === report.provider && model.pricePoints.length).length,
    pricingStatus: report.requestParameters.pricingAcquisitionStatus ?? report.status,
    pricingCoverage: report.requestParameters.priceCoverageRule ?? null,
    populationScope: report.requestParameters.populationScope ?? 'public_native_catalogue',
    error: report.error ?? report.requestParameters.pricingError ?? null,
  }));
  const snapshot = {
    schemaVersion: 1, collector: 'open-dashboard-mcp@1.0.2', fetchedAt,
    currency: 'USD', providers,
    population: {
      sourceModelsReceived: allModels.length, mediaModels: models.length,
      modelsWithPricePoints: models.filter(model => model.pricePoints.length).length,
      outputPricesByUnit: Object.fromEntries(['image', 'megapixel', 'video_second', 'video'].map(unit => [unit, models.filter(model => model.pricePoints.some(point => point.unit === unit)).length])),
      excludedByMediaFilter: allModels.length - media.length,
      rule: 'Exact native identities classified as image, video, or audio by the public MCP collector. Text, other, and unknown modalities are excluded. Unknown prices are retained.',
      completeness: providers.every(provider => provider.population.completeness === 'full') ? 'full' : 'partial_or_unknown',
    },
    notes: [
      'This is a dated public catalogue snapshot, not an inference service or account-specific quote.',
      'Different native billing units and output parameters are not interchangeable. No alias-based cross-provider model join is made.',
      'Zero token prices and missing prices do not establish free media generation.',
    ], models,
  };
  const normalized = normalizeMediaCatalogue(snapshot);
  if (normalized.length !== models.length) throw new Error('INVALID_OR_AMBIGUOUS_PROJECTED_IDENTITIES');
  if (!models.length || !models.some(model => mediaPricingStatus(model) === 'paid')) throw new Error('NO_USABLE_MEDIA_PRICE_OBSERVATIONS');
  return snapshot;
}

export async function refreshMediaCatalogue() {
  const pkg = JSON.parse(await readFile(new URL('../../../node_modules/open-dashboard-mcp/package.json', import.meta.url), 'utf8'));
  if (pkg.version !== '1.0.2') throw new Error('REVIEW_COLLECTOR_VERSION_BEFORE_REFRESH');
  const fetchImpl = publicMetadataFetch();
  // Explicit empty/null credentials override the collectors' optional environment lookups.
  const native = await collectMediaCatalogue({ providers: ['deepinfra', 'wavespeed', 'fal'], falApiKey: '', fetchImpl, timeoutMs: 12000, maxPages: 16 });
  const crazyrouter = await collectCrazyrouterCatalogue({ apiKey: null, fetchImpl, timeoutMs: 12000 });
  const snapshot = projectSnapshot([native, crazyrouter]);
  const serialized = JSON.stringify(snapshot, null, 2) + '\n';
  if (Buffer.byteLength(serialized) > MAX_OUTPUT_BYTES) throw new Error('SNAPSHOT_SIZE_BOUND_EXCEEDED');
  const temporaryPath = `${outputPath}.tmp`;
  try { await writeFile(temporaryPath, serialized, 'utf8'); await rename(temporaryPath, outputPath); }
  finally { await unlink(temporaryPath).catch(() => {}); }
  console.log(JSON.stringify({ output: outputPath, fetchedAt: snapshot.fetchedAt, population: snapshot.population, providers: snapshot.providers.map(p => ({ provider: p.provider, status: p.status, mediaModels: p.mediaModels, withPricePoints: p.modelsWithPricePoints })) }, null, 2));
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  refreshMediaCatalogue().catch(error => { console.error(error.message); process.exitCode = 1; });
}
