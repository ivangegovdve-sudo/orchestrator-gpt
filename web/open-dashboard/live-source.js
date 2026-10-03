import { API_BASE, DIRECT_PROVIDER_IDS } from './explorer-data.js';
export const LIVE_API_BASE = API_BASE.replace('/public/v2', '/live');
export async function readProviderCatalogue(provider, { fetchImpl = fetch, location = null, timeoutMs = 20000 } = {}) {
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
  const models = [], providers = [];
  const deadline = Date.now() + 60000;
  for (let index = 0; index < DIRECT_PROVIDER_IDS.length; index += 2) {
    const remaining = deadline - Date.now();
    const results = await Promise.allSettled(DIRECT_PROVIDER_IDS.slice(index, index + 2).map(provider => remaining > 0 ? readProviderCatalogue(provider, { ...options, timeoutMs: Math.min(20000, remaining) }) : Promise.reject(new Error('ACQUISITION_DEADLINE'))));
    results.forEach((result, offset) => {
      if (result.status === 'fulfilled') { models.push(...result.value.models); providers.push(...result.value.providers); }
      else providers.push({ provider: DIRECT_PROVIDER_IDS[index + offset], status: 'unavailable', freshness: 'unavailable', error: 'LIVE_SOURCE_UNAVAILABLE' });
    });
  }
  return { fetchedAt: new Date().toISOString(), models, providers };
}
