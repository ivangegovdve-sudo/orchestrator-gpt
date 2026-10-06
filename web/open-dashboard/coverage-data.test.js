import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aggregateCoverage, COVERAGE_PROVIDER_IDS, isReportedPrice, readLiveCoverage } from './coverage-data.js';
import { readProviderCatalogue } from './live-source.js';
import { renderCoverage } from './coverage.js';

const price = (amount, unit, provenance = 'published') => ({ amount, unit, provenance });
const model = (provider, id, mediaKind = 'other', pricePoints = []) => ({ provider, id, mediaKind, pricePoints });
const catalogue = (provider, models, report = {}) => ({
  schemaVersion: '1.0', fetchedAt: '2026-10-06T05:00:00Z', models,
  providers: [{ provider, status: 'available', observedAt: '2026-10-06T04:59:00Z', population: { completeness: 'full' }, ...report }],
});
const read = (provider, models, report) => ({ provider, catalogue: catalogue(provider, models, report) });

test('coverage uses the shipped direct-adapter registry, excluding web-plan references', async () => {
  const facts = JSON.parse(await readFile(new URL('./package-facts.json', import.meta.url), 'utf8'));
  assert.equal(COVERAGE_PROVIDER_IDS.length, 16);
  assert.deepEqual(COVERAGE_PROVIDER_IDS, facts.providers.map(provider => provider.id));
  assert.equal(COVERAGE_PROVIDER_IDS.includes('higgsfield'), false);
});

test('priced means an explicit finite nonnegative amount, including zero and derived quotes', () => {
  for (const amount of [0, '0', 1.25, '0.000001', '1e-7']) assert.equal(isReportedPrice(price(amount, 'token_in', 'derived')), true);
  for (const amount of [undefined, null, '', ' ', -1, '-1', NaN, Infinity, 'NaN', 'Infinity', '1e999', {}, true])
    assert.equal(isReportedPrice(price(amount, 'image')), false, String(amount));
});

test('counts exact provider,id pairs once, retains variants, and recognizes only OpenRouter :free suffixes', () => {
  const snapshot = aggregateCoverage([
    read('openrouter', [
      model('openrouter', 'shared', 'text'),
      model('openrouter', 'shared', 'text', [price('0.2', 'token_in')]),
      model('openrouter', 'shared:free', 'text', [price('0', 'token_out')]),
      model('openrouter', 'free-in-the-name', 'text'),
      model('openrouter', 'shared:free:extended', 'text'),
    ]),
    read('groq', [model('groq', 'shared', 'text', [price(0, 'token_in')]), model('groq', 'shared:free', 'text')]),
  ], { providerIds: ['openrouter', 'groq'], measuredAt: '2026-10-06T06:00:00Z' });
  assert.equal(snapshot.state, 'complete');
  assert.equal(snapshot.counts.total, 6);
  assert.equal(snapshot.counts.priced, 3);
  assert.equal(snapshot.counts.pricedProviders, 2);
  assert.equal(snapshot.counts.free, 1);
  assert.equal(snapshot.measuredAt, '2026-10-06T06:00:00Z');
});

test('native output prices use the matching media units and preserve credits without currency conversion', () => {
  const snapshot = aggregateCoverage([read('fal', [
    model('fal', 'image', 'image', [price('0.05', 'image')]),
    model('fal', 'mp', 'image', [price('0.05', 'megapixel')]),
    model('fal', 'image-credit', 'image', [price('2', 'credit_image')]),
    model('fal', 'token-priced-image', 'image', [price('0.01', 'token_out')]),
    model('fal', 'video', 'video', [price('2', 'video')]),
    model('fal', 'second', 'video', [price('0.5', 'video_second')]),
    model('fal', 'video-credit', 'video', [price('4', 'credit_video')]),
    model('fal', 'invalid-video', 'video', [price(null, 'video_second')]),
    model('fal', 'wrong-unit', 'video', [price('2', 'image')]),
    model('fal', 'input-vision', 'text', [price('0.1', 'image')]),
  ])], { providerIds: ['fal'] });
  assert.deepEqual(snapshot.counts, { total: 10, priced: 9, pricedProviders: 1, image: 4, imagePriced: 3, video: 5, videoPriced: 3, free: null });
});

test('failed providers and partial source reports remain distinct and never become reassuring zero totals', () => {
  const partial = aggregateCoverage([
    { provider: 'openrouter', error: 'Network failed' },
    read('sail', [model('sail', 'listed')], { status: 'partial', error: 'PRICING_STALE' }),
    read('crazyrouter', [model('crazyrouter', 'listed')], { population: { completeness: 'unknown' } }),
  ], { providerIds: ['openrouter', 'sail', 'crazyrouter'] });
  assert.equal(partial.state, 'partial');
  assert.equal(partial.readProviders, 2);
  assert.equal(partial.requestedProviders, 3);
  assert.equal(partial.counts.total, 2);
  assert.equal(partial.counts.free, null);
  assert.equal(partial.providers[0].counts, null);
  assert.equal(partial.providers[1].status, 'partial');
  assert.equal(partial.providers[1].error, 'PRICING_STALE');
  assert.equal(partial.providers[2].completeness, 'unknown');
  assert.deepEqual(partial.warnings, ['Sail: pricing stale', 'Crazyrouter: source completeness not established']);
  assert.equal(aggregateCoverage([read('sail', [])], { providerIds: ['sail'] }).counts.total, 0);
  const unavailable = aggregateCoverage([], { providerIds: ['openrouter', 'groq'] });
  assert.equal(unavailable.state, 'unavailable');
  assert.ok(Object.values(unavailable.counts).every(value => value === null));
});

test('a partial source cannot produce a complete headline even if every endpoint returned', () => {
  const snapshot = aggregateCoverage([read('fal', [model('fal', 'listed')], { status: 'partial' })], { providerIds: ['fal'] });
  assert.equal(snapshot.state, 'partial');
  assert.equal(snapshot.readProviders, 1);
  assert.match(snapshot.warnings[0], /partial source or pricing/);
});

test('partial rendering keeps registered providers separate, gives a bounded pitch, and scopes free-model uncertainty', () => {
  const nodes = new Map();
  const root = {
    getElementById: id => {
      if (id === 'coverage-details') return null;
      if (!nodes.has(id)) nodes.set(id, { textContent: '' });
      return nodes.get(id);
    },
    querySelector: () => root.getElementById('headline'),
  };
  const snapshot = aggregateCoverage([
    read('openrouter', [model('openrouter', 'slug:free', 'text', [price(0, 'token_out')])]),
    { provider: 'groq', error: 'Unavailable' },
  ], { providerIds: ['openrouter', 'groq'] });
  renderCoverage(root, snapshot);
  assert.equal(nodes.get('headline').textContent, 'Give your agent at least 1 model entries.');
  assert.equal(nodes.get('coverage-providers').textContent, '2');
  assert.equal(nodes.get('coverage-total').textContent, '≥ 1');
  assert.equal(nodes.get('coverage-free').textContent, '1');
  assert.equal(nodes.get('coverage-status').textContent, 'Partial live read · 1 / 2 providers returned');
  assert.match(nodes.get('coverage-read-note').textContent, /Unavailable: Groq/);
  snapshot.providers[0].completeness = 'unknown';
  renderCoverage(root, snapshot);
  assert.equal(nodes.get('coverage-free').textContent, '≥ 1');
  snapshot.counts.free = null;
  renderCoverage(root, snapshot);
  assert.equal(nodes.get('coverage-free').textContent, 'Unavailable');
});

test('fresh coverage reads every registered live endpoint concurrently, without any snapshot requests', async () => {
  const requested = [];
  const releases = [];
  const progress = [];
  const work = readLiveCoverage({
    fetchImpl: (url, init) => {
      const provider = new URL(url).searchParams.get('provider');
      requested.push(provider);
      assert.match(url, /\/api\/live\/catalogue\?provider=/);
      assert.equal(init.cache, 'no-store');
      assert.equal(init.credentials, 'omit');
      assert.ok(init.signal instanceof AbortSignal);
      return new Promise(resolve => releases.push(() => resolve(Response.json(catalogue(provider, [model(provider, 'entry')])))));
    },
    onProgress: value => progress.push(value),
    now: () => '2026-10-06T06:00:00Z',
  });
  assert.deepEqual(requested, COVERAGE_PROVIDER_IDS);
  releases.forEach(release => release());
  const snapshot = await work;
  assert.equal(snapshot.state, 'complete');
  assert.equal(snapshot.counts.total, 16);
  assert.equal(snapshot.measuredAt, '2026-10-06T06:00:00Z');
  assert.deepEqual(progress.at(-1), { settled: 16, requested: 16 });
});

test('HTTP failures, upstream unavailable states, and malformed identities remain excluded', async () => {
  const snapshot = await readLiveCoverage({
    providerIds: ['openrouter', 'groq', 'sail', 'fal'],
    fetchImpl: async url => {
      const provider = new URL(url).searchParams.get('provider');
      if (provider === 'openrouter') return new Response('{}', { status: 503 });
      if (provider === 'groq') return Response.json(catalogue(provider, [model(provider, 'good')]));
      if (provider === 'sail') return Response.json(catalogue(provider, [model(provider, 'stale')], { status: 'unavailable', error: 'UPSTREAM_UNAVAILABLE' }));
      return Response.json(catalogue(provider, [{ provider, id: null }]));
    },
  });
  assert.equal(snapshot.state, 'partial');
  assert.equal(snapshot.readProviders, 1);
  assert.equal(snapshot.counts.total, 1);
  assert.equal(snapshot.counts.free, null);
  assert.deepEqual(snapshot.providers.filter(provider => !provider.counts).map(provider => provider.provider), ['openrouter', 'sail', 'fal']);
  assert.equal(snapshot.providers.find(provider => provider.provider === 'sail').error, 'UPSTREAM_UNAVAILABLE');
  assert.equal(snapshot.providers.find(provider => provider.provider === 'sail').observedAt, '2026-10-06T04:59:00Z');
});

test('identical concurrent reads share only the active request; refresh fetches again', async () => {
  const originalFetch = globalThis.fetch;
  let requested = 0;
  let release;
  globalThis.fetch = async () => {
    requested += 1;
    if (requested === 1) await new Promise(resolve => { release = resolve; });
    return Response.json(catalogue('groq', [model('groq', 'entry')]));
  };
  try {
    const coverage = readProviderCatalogue('groq', { timeoutMs: 125000 });
    const explorer = readProviderCatalogue('groq', { timeoutMs: 125000 });
    assert.equal(coverage, explorer);
    assert.equal(requested, 1);
    const shorterRead = readProviderCatalogue('groq', { timeoutMs: 20000 });
    assert.notEqual(coverage, shorterRead);
    assert.equal(requested, 2);
    release();
    await Promise.all([coverage, explorer, shorterRead]);
    await readProviderCatalogue('groq', { timeoutMs: 125000 });
    assert.equal(requested, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
