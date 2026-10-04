import test from 'node:test';
import assert from 'node:assert/strict';
import { readAllCatalogues, readProviderCatalogue, STATIC_MEDIA_CATALOGUE_URL } from './live-source.js';
test('source failure cannot substitute historical catalogue prices', async () => {
  await assert.rejects(readProviderCatalogue('kie', { fetchImpl: async () => new Response('{}', { status: 503 }) }));
});
test('regional reads retain location and source units, discard envelope policies', async () => {
  let requested;
  const result = await readProviderCatalogue('kie', { location: 'oracle-us', fetchImpl: async (url, init) => {
    requested = url; assert.equal(init.cache, 'no-store');
    return Response.json({ schemaVersion: '1.0', fetchedAt: '2026-10-03T00:00:00Z', models: [{ provider: 'kie', id: 'source-model', pricePoints: [{ amount: '0.07', unit: 'image' }] }], providers: [], routingPolicy: 'private-policy' });
  }});
  assert.match(requested, /regional-catalogue\?location=oracle-us&provider=kie/);
  assert.equal(result.models[0].pricePoints[0].amount, '0.07');
  assert.equal(result.routingPolicy, undefined);
});
test('wrong-provider responses are rejected', async () => {
  await assert.rejects(readProviderCatalogue('kie', { fetchImpl: async () => Response.json({ schemaVersion: '1.0', providers: [], models: [{ provider: 'openrouter' }] }) }));
});

test('the checked-in media snapshot supplements live reads with Higgsfield web plans', async () => {
  const requested = [];
  const fetchImpl = async url => {
    requested.push(url);
    if (url === STATIC_MEDIA_CATALOGUE_URL)
      return Response.json({
        schemaVersion: 2,
        models: [{ provider: 'higgsfield', id: 'web-model', pricePoints: [{ amount: 12, unit: 'credit_video' }] }],
        providers: [{ provider: 'higgsfield', status: 'available', plans: [{ name: 'Starter', priceMinor: 1900 }] }],
      });
    const provider = new URL(url).searchParams.get('provider');
    return Response.json({
      schemaVersion: '1.0',
      fetchedAt: '2026-10-04T00:00:00Z',
      models: [{ provider, id: `${provider}-live` }],
      providers: [{ provider, status: 'available', population: { retained: 1 } }],
    });
  };
  const result = await readAllCatalogues({ fetchImpl });
  assert.ok(result.models.some(row => row.provider === 'higgsfield' && row.id === 'web-model'));
  assert.equal(result.providers.find(row => row.provider === 'higgsfield').plans[0].name, 'Starter');
  assert.ok(requested.includes(STATIC_MEDIA_CATALOGUE_URL));
});
