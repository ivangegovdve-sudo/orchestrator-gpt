import { API_BASE, DIRECT_PROVIDER_IDS } from './explorer-data.js';
export const LIVE_API_BASE = API_BASE.replace('/public/v2', '/live');
export const STATIC_MEDIA_CATALOGUE_URL = './media-catalogue.json';

async function readStaticMediaCatalogue({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(STATIC_MEDIA_CATALOGUE_URL, {
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!response.ok) throw new Error('Static media catalogue unavailable');
  const raw = await response.json();
  if (raw.schemaVersion !== 2 || !Array.isArray(raw.models) || !Array.isArray(raw.providers))
    throw new Error('Static media catalogue contract changed');
  return {
    models: raw.models,
    providers: raw.providers.map(row => ({
      ...row,
      freshness: row.status === 'unavailable' ? 'unavailable' : 'snapshot',
    })),
  };
}

const providerReadsInFlight = new Map();

// Share simultaneous browser reads with the coverage panel and explorer. These
// promises are removed as soon as they settle; a refresh performs a new read.
// Different timeout budgets stay independent so one consumer cannot shorten
// another consumer’s acquisition or keep it waiting past its own deadline.
export function readProviderCatalogue(provider, { fetchImpl = fetch, location = null, timeoutMs = 20000 } = {}) {
  const key = JSON.stringify([provider, location, timeoutMs]);
  const share = fetchImpl === globalThis.fetch;
  if (share && providerReadsInFlight.has(key)) return providerReadsInFlight.get(key);
  const work = fetchProviderCatalogue(provider, { fetchImpl, location, timeoutMs });
  if (share) {
    providerReadsInFlight.set(key, work);
    const forget = () => { if (providerReadsInFlight.get(key) === work) providerReadsInFlight.delete(key); };
    work.then(forget, forget);
  }
  return work;
}

async function fetchProviderCatalogue(provider, { fetchImpl, location, timeoutMs }) {
  const path = location ? `/regional-catalogue?location=${encodeURIComponent(location)}&provider=${encodeURIComponent(provider)}` : `/catalogue?provider=${encodeURIComponent(provider)}`;
  const response = await fetchImpl(`${LIVE_API_BASE}${path}`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error('Live catalogue unavailable');
  const raw = await response.json();
  if (raw.status === 'unconfigured' || raw.status === 'unavailable') throw new Error('Regional collector unavailable');
  if (raw.schemaVersion !== '1.0' || !Array.isArray(raw.models) || !Array.isArray(raw.providers) || raw.models.some(row => row.provider !== provider)) throw new Error('Live catalogue contract changed');
  // Never retain arbitrary router configuration from an upstream envelope.
  return { schemaVersion: '1.0', fetchedAt: raw.fetchedAt, models: raw.models, providers: raw.providers.map(row => ({ ...row, freshness: row.status === 'unavailable' ? 'unavailable' : 'live', catalogueModels: row.population?.retained })), inferenceSpendUsd: '0' };
}
export async function readAllCatalogues(options = {}) {
  const staticSnapshot = await readStaticMediaCatalogue(options).catch(() => ({ models: [], providers: [] }));
  const modelsByKey = new Map(staticSnapshot.models.map(row => [`${row.provider}:${row.id}`, row]));
  const providersById = new Map(staticSnapshot.providers.map(row => [row.provider, row]));
  const deadline = Date.now() + 60000;
  for (let index = 0; index < DIRECT_PROVIDER_IDS.length; index += 2) {
    const remaining = deadline - Date.now();
    const results = await Promise.allSettled(DIRECT_PROVIDER_IDS.slice(index, index + 2).map(provider => remaining > 0 ? readProviderCatalogue(provider, { ...options, timeoutMs: Math.min(20000, remaining) }) : Promise.reject(new Error('ACQUISITION_DEADLINE'))));
    results.forEach((result, offset) => {
      const provider = DIRECT_PROVIDER_IDS[index + offset];
      if (result.status === 'fulfilled') {
        result.value.models.forEach(row => modelsByKey.set(`${row.provider}:${row.id}`, row));
        result.value.providers.forEach(row => providersById.set(row.provider, row));
      } else if (!providersById.has(provider)) {
        providersById.set(provider, { provider, status: 'unavailable', freshness: 'unavailable', error: 'LIVE_SOURCE_UNAVAILABLE' });
      }
    });
  }
  return { fetchedAt: new Date().toISOString(), models: [...modelsByKey.values()], providers: [...providersById.values()] };
}
