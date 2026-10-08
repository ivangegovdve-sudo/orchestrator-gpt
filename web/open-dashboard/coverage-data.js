import { DIRECT_PROVIDER_IDS, PROVIDERS } from './explorer-data.js';
import { readProviderCatalogue } from './live-source.js';

// This is the direct-adapter registry. Web-plan references such as Higgsfield
// remain useful in the explorer, but do not inflate these live API counts.
export const COVERAGE_PROVIDER_IDS = DIRECT_PROVIDER_IDS;
const IMAGE_UNITS = new Set(['image', 'megapixel', 'credit_image']);
const VIDEO_UNITS = new Set(['video', 'video_second', 'credit_video']);

export function isReportedPrice(point) {
  const amount = point?.amount;
  if (typeof amount !== 'number' &&
      (typeof amount !== 'string' || !/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(amount))) return false;
  return Number.isFinite(Number(amount)) && Number(amount) >= 0;
}

function countEntries(models, provider) {
  const entries = new Map();
  for (const model of models) {
    if (model.provider !== provider || typeof model.id !== 'string' || !model.id) continue;
    const key = JSON.stringify([provider, model.id]);
    const entry = entries.get(key) ?? { priced: false, image: false, imagePriced: false, video: false, videoPriced: false, free: false };
    const points = Array.isArray(model.pricePoints) ? model.pricePoints.filter(isReportedPrice) : [];
    entry.priced ||= points.length > 0;
    entry.image ||= model.mediaKind === 'image';
    entry.imagePriced ||= model.mediaKind === 'image' && points.some(point => IMAGE_UNITS.has(point.unit));
    entry.video ||= model.mediaKind === 'video';
    entry.videoPriced ||= model.mediaKind === 'video' && points.some(point => VIDEO_UNITS.has(point.unit));
    entry.free ||= provider === 'openrouter' && model.id.endsWith(':free');
    entries.set(key, entry);
  }
  const counts = { total: entries.size, priced: 0, image: 0, imagePriced: 0, video: 0, videoPriced: 0, free: 0 };
  for (const entry of entries.values()) {
    for (const key of ['priced', 'image', 'imagePriced', 'video', 'videoPriced', 'free']) counts[key] += Number(entry[key]);
  }
  return counts;
}

/** Count only records returned by this read; never merge a dated fallback. */
export function aggregateCoverage(reads, { providerIds = COVERAGE_PROVIDER_IDS, measuredAt = new Date().toISOString() } = {}) {
  const byProvider = new Map(reads.map(read => [read.provider, read]));
  const providers = providerIds.map(provider => {
    const read = byProvider.get(provider);
    const readError = read?.error ?? null;
    const report = read?.catalogue?.providers?.find(row => row.provider === provider);
    // A read-level failure is authoritative even when an adapter returned a catalogue
    // shell. Keep it separate from a structured report error so partial source states
    // remain visible instead of being flattened into unavailable.
    if (!read?.catalogue || readError) return { provider, label: PROVIDERS[provider] ?? provider, status: 'unavailable', error: readError, observedAt: null, completeness: 'unknown', counts: null };
    const error = readError ?? report?.error ?? null;
    if (report?.status === 'unavailable' || report?.status === 'unconfigured')
      return { provider, label: PROVIDERS[provider] ?? provider, status: report.status, error, observedAt: report.observedAt ?? read.catalogue.fetchedAt ?? null, completeness: report.population?.completeness ?? 'unknown', counts: null };
    return {
      provider,
      label: PROVIDERS[provider] ?? provider,
      status: report?.status ?? 'available',
      error,
      observedAt: report?.observedAt ?? read.catalogue.fetchedAt ?? null,
      completeness: report?.population?.completeness ?? 'unknown',
      warning: error === 'PRICING_STALE' ? 'Pricing stale'
        : error ? 'Source reported an error'
          : report?.status === 'partial' ? 'Partial source or pricing read'
          : report?.population?.completeness !== 'full' ? 'Source completeness not established' : null,
      counts: countEntries(read.catalogue.models, provider),
    };
  });
  const available = providers.filter(provider => provider.counts);
  const counts = { total: 0, priced: 0, pricedProviders: 0, image: 0, imagePriced: 0, video: 0, videoPriced: 0, free: null };
  for (const provider of available) {
    for (const key of ['total', 'priced', 'image', 'imagePriced', 'video', 'videoPriced']) counts[key] += provider.counts[key];
    counts.pricedProviders += Number(provider.counts.priced > 0);
    if (provider.provider === 'openrouter') counts.free = provider.counts.free;
  }
  if (!available.length) for (const key of Object.keys(counts)) counts[key] = null;
  return {
    state: available.length && available.length === providerIds.length && providers.every(provider => provider.status === 'available' && provider.completeness === 'full' && !provider.error)
      ? 'complete' : available.length ? 'partial' : 'unavailable',
    measuredAt,
    requestedProviders: providerIds.length,
    readProviders: available.length,
    counts,
    providers,
    warnings: providers.filter(provider => provider.warning).map(provider => `${provider.label}: ${provider.warning.toLowerCase()}`),
  };
}

export async function readLiveCoverage({
  providerIds = COVERAGE_PROVIDER_IDS,
  fetchImpl = globalThis.fetch,
  timeoutMs = 125000,
  onProgress = () => {},
  now = () => new Date().toISOString(),
} = {}) {
  let settled = 0;
  const reads = await Promise.all(providerIds.map(async provider => {
    let read;
    try {
      const catalogue = await readProviderCatalogue(provider, { fetchImpl, timeoutMs });
      const report = catalogue.providers.find(row => row.provider === provider);
      if (!report || catalogue.models.some(row => typeof row.id !== 'string' || !row.id)) throw new Error('Provider catalogue unavailable');
      read = { provider, catalogue };
    } catch {
      read = { provider, error: 'Live catalogue unavailable' };
    }
    settled += 1;
    onProgress({ settled, requested: providerIds.length });
    return read;
  }));
  return aggregateCoverage(reads, { providerIds, measuredAt: now() });
}
