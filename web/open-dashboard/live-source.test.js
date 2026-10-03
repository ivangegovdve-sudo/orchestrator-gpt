import test from 'node:test';
import assert from 'node:assert/strict';
import { readProviderCatalogue } from './live-source.js';
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
