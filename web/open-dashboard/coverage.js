import { COVERAGE_PROVIDER_IDS, readLiveCoverage } from './coverage-data.js';

const number = new Intl.NumberFormat('en-US');
const metricIds = {
  total: 'coverage-total', priced: 'coverage-priced', pricedProviders: 'coverage-priced-providers',
  image: 'coverage-image', imagePriced: 'coverage-image-priced', video: 'coverage-video',
  videoPriced: 'coverage-video-priced', free: 'coverage-free',
};
const setText = (root, id, text) => { const node = root.getElementById(id); if (node) node.textContent = text; };
const setMetricLoading = (root, loading) => {
  const metrics = root.querySelector('.coverage-metrics');
  if (metrics?.classList) metrics.classList.toggle('is-loading', loading);
  if (metrics?.setAttribute) metrics.setAttribute('aria-busy', String(loading));
};
const formatDate = value => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Date not reported';
};

export function catalogueScopeText(snapshot) {
  const source = snapshot.providers.find(provider => provider.provider === 'openrouter');
  const denominator = source?.counts?.total;
  if (source?.status !== 'available' || source.completeness !== 'full' || source.error || !denominator || !snapshot.counts.total)
    return 'A current catalogue comparison with OpenRouter alone is unavailable.';
  return `This read returned ${number.format(snapshot.counts.total)} provider/ID entries across catalogues, versus ${number.format(denominator)} from OpenRouter alone — about ${(snapshot.counts.total / denominator).toFixed(2)}× as many catalogue entries.`;
}

export function renderCoverage(root, snapshot) {
  setMetricLoading(root, false);
  const headline = root.querySelector('[data-coverage-headline]');
  if (headline) headline.textContent = snapshot.state === 'complete'
    ? `Give your agent ${number.format(snapshot.counts.total)} model entries across ${number.format(snapshot.readProviders)} providers.`
    : snapshot.state === 'partial'
      ? `Give your agent at least ${number.format(snapshot.counts.total)} model entries.`
      : 'Explore model entries across providers.';
  const openrouter = snapshot.providers.find(provider => provider.provider === 'openrouter');
  const freePartial = openrouter?.status !== 'available' || openrouter?.completeness !== 'full' || Boolean(openrouter?.error);
  for (const [key, id] of Object.entries(metricIds)) {
    const value = snapshot.counts[key];
    setText(root, id, value == null ? 'Unavailable' : `${snapshot.state === 'partial' && (key !== 'free' || freePartial) ? '≥ ' : ''}${number.format(value)}`);
  }
  setText(root, 'coverage-providers', number.format(snapshot.requestedProviders));
  setText(root, 'coverage-openrouter-scope', catalogueScopeText(snapshot));
  const missing = snapshot.providers.filter(provider => !provider.counts).map(provider => provider.label);
  const status = snapshot.state === 'complete'
    ? `Live read complete · ${snapshot.readProviders} / ${snapshot.requestedProviders} providers returned`
    : snapshot.state === 'partial'
      ? `Partial live read · ${snapshot.readProviders} / ${snapshot.requestedProviders} providers returned`
      : 'Live coverage unavailable';
  const note = snapshot.state === 'complete'
    ? 'Counts describe the entries these catalogue endpoints returned.'
    : snapshot.state === 'partial'
      ? `Counts marked ≥ cover returned entries; partial sources may omit entries or prices.${missing.length ? ` Unavailable: ${missing.join(', ')}.` : ''}`
      : 'No current total was established. Refresh to try again.';
  setText(root, 'coverage-status', status);
  setText(root, 'coverage-read-note', `${note}${snapshot.warnings?.length ? ` Source notes: ${snapshot.warnings.join('; ')}.` : ''}`);
  setText(root, 'coverage-timestamp', `Measured ${formatDate(snapshot.measuredAt)}`);
  const timestamp = root.getElementById('coverage-timestamp');
  if (timestamp?.tagName === 'TIME') timestamp.dateTime = snapshot.measuredAt;
  const details = root.getElementById('coverage-details');
  if (details) {
    details.replaceChildren();
    for (const provider of snapshot.providers) {
      const row = root.createElement('tr');
      for (const value of [provider.label, provider.counts ? number.format(provider.counts.total) : 'Unavailable',
        provider.counts ? number.format(provider.counts.priced) : 'Unavailable',
        provider.counts ? `Returned (${provider.status}) · ${provider.completeness} source · ${formatDate(provider.observedAt)}${provider.warning ? ` · ${provider.warning}${provider.error ? ` (${provider.error})` : ''}` : ''}`
          : `${provider.status === 'unconfigured' ? 'Unconfigured' : 'Unavailable'}${provider.observedAt ? ` · ${formatDate(provider.observedAt)}` : ''}${provider.error ? ` · ${provider.error}` : ''}`]) {
        const cell = root.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      details.append(row);
    }
  }
}

export function initializeCoverage(root = document) {
  const refresh = root.getElementById('coverage-refresh');
  if (!root.getElementById('coverage-total')) return;
  let reading = false;
  async function refreshCoverage() {
    if (reading) return;
    reading = true;
    if (refresh) refresh.disabled = true;
    setMetricLoading(root, true);
    for (const id of Object.values(metricIds)) setText(root, id, '…');
    setText(root, 'coverage-providers', number.format(COVERAGE_PROVIDER_IDS.length));
    const headline = root.querySelector('[data-coverage-headline]');
    if (headline) headline.textContent = 'Explore model entries across providers.';
    setText(root, 'coverage-timestamp', `Read started ${formatDate(new Date().toISOString())}`);
    setText(root, 'coverage-status', `Reading all ${COVERAGE_PROVIDER_IDS.length} provider catalogues…`);
    setText(root, 'coverage-read-note', 'Fetching current catalogue responses. These counts use no dated fallback.');
    setText(root, 'coverage-openrouter-scope', 'Reading current catalogue breadth across providers, including OpenRouter…');
    root.getElementById('coverage-details')?.replaceChildren();
    try {
      const snapshot = await readLiveCoverage({
        onProgress: ({ settled, requested }) => setText(root, 'coverage-status', `Reading provider catalogues · ${settled} / ${requested} reads finished…`),
      });
      renderCoverage(root, snapshot);
    } finally {
      setMetricLoading(root, false);
      reading = false;
      if (refresh) refresh.disabled = false;
    }
  }
  refresh?.addEventListener('click', refreshCoverage);
  refreshCoverage();
}

if (typeof document !== 'undefined') initializeCoverage();
