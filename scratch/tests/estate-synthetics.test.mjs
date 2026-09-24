import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectJson, inspectHome, inspectHomepage, parseRegistry, sanitize, request, checkModels, inspectMatrix, URLS, publishedRegistry } from '../../scripts/estate-synthetics.mjs';

test('an HTTP 200 SPA shell fails the JSON body assertion', () => {
  assert.equal(inspectJson({ status: 200, type: 'text/html', text: '<html><div id="root"></div></html>' }).outcome, 'BROKEN');
});
test('HTTP 503 is broken even when its body is valid JSON', () => {
  assert.equal(inspectJson({ status: 503, type: 'application/json', text: '{}' }).outcome, 'BROKEN');
});
test('a JSON error body cannot pass as an edition', () => {
  assert.equal(inspectJson({ status: 200, type: 'application/json', text: '{"error":"unavailable"}' }, 'edition').outcome, 'BROKEN');
});
test('static homepage requires the visible identity and real project links', () => {
  assert.equal(inspectHome({ status: 200, type: 'text/html', text: '<title>SDForest</title><div id="root"></div>' }).outcome, 'BROKEN');
});
test('a new registry provider makes the served MCP homepage fail', () => {
  const page = { status: 200, type: 'text/html', text: '<main>OpenRouter Groq</main>' };
  assert.equal(inspectHomepage(page, [{ id: 'openrouter', displayName: 'OpenRouter' }, { id: 'novita', displayName: 'Novita' }]).outcome, 'BROKEN');
});
test('provider names in script, styles and comments do not satisfy visible page copy', () => {
  const page = { status: 200, type: 'text/html', text: '<main>OpenRouter</main><!-- Novita --><script>"Novita"</script><style>.Novita{}</style>' };
  assert.equal(inspectHomepage(page, [{ id: 'novita', displayName: 'Novita' }]).outcome, 'BROKEN');
});
test('registry is parsed as static data without executing package code', () => {
  const source = 'throw Error("must not execute"); export const PROVIDER_REGISTRY = { first: {id: "first", displayName: "First", publishes: {pricing: "never"}}, next: {id:"next",displayName:"Next"} };';
  assert.deepEqual(parseRegistry(source), [{ id: 'first', displayName: 'First' }, { id: 'next', displayName: 'Next' }]);
  assert.throws(() => parseRegistry('export const PROVIDER_REGISTRY = { a: loadProvider() };'));
});
test('output redaction removes auth headers, URLs with credentials, sensitive query values and known secrets', () => {
  const serialized = JSON.stringify(sanitize({ message: 'Authorization: Bearer synthetic-example-only', url: 'postgres://demo:example-only@db.invalid/db?token=example-only', nested: { token: 'test-value-only', other: 'env-value-for-test-only' } }, ['env-value-for-test-only']));
  for (const secret of ['synthetic-example-only', 'demo:example-only', 'test-value-only', 'env-value-for-test-only']) assert.ok(!serialized.includes(secret));
});
test('network refusal is could-not-check and never serializes the exception', async () => {
  const result = await request('https://example.invalid/', { fetchImpl: async () => { throw new Error('Authorization: Bearer fake-test-only'); } });
  assert.equal(result.outcome, 'COULD_NOT_CHECK');
  assert.ok(!JSON.stringify(result).includes('fake-test-only'));
});

const json = data => ({ status: 200, type: 'application/json', text: JSON.stringify(data) });
const source = sourceId => ({ sourceId, stale: false, lastAttemptStatus: 'published', lastAttemptAcquisitionComplete: true, lastAttemptPopulationCompleteness: 'full', failureEscalated: false });
const collection = (data, cursor = null) => ({ data, cursor, stale: false, completeness: { acquisitionComplete: true, populationCompleteness: 'full' } });
function catalogFetch(pages, sources = [source('models_current'), source('groq_models_current')]) {
  let index = 0;
  return async input => {
    const url = new URL(input);
    if (url.href === URLS.sources) return Response.json(collection(sources));
    assert.equal(url.searchParams.get('limit'), '500');
    assert.deepEqual([...url.searchParams.keys()].sort(), index === 0 ? ['limit'] : ['cursor', 'limit']);
    if (index > 0) assert.equal(url.searchParams.get('cursor'), pages[index - 1].cursor);
    return Response.json(pages[index++]);
  };
}
test('full provider coverage follows the cursor and reads the API id field', async () => {
  const actual = await checkModels({ fetchImpl: catalogFetch([collection([{ provider: 'openrouter', id: 'first' }], 'page-two'), collection([{ provider: 'groq', id: 'second' }])]) });
  assert.equal(actual.outcome, 'HEALTHY');
  assert.deepEqual(actual.observed.counts, { openrouter: 1, groq: 1 });
  assert.equal(actual.observed.pages, 2);
  assert.equal(actual.observed.completeTraversal, true);
});
test('nonempty rows from only one provider fail against the independent declared denominator', async () => {
  const actual = await checkModels({ fetchImpl: catalogFetch([collection([{ provider: 'openrouter', id: 'first' }])]) });
  assert.equal(actual.outcome, 'BROKEN');
  assert.deepEqual(actual.observed.missing, ['groq']);
});
test('a registry provider without a successful collection is still expected', async () => {
  const actual = await checkModels({ fetchImpl: catalogFetch([collection([{ provider: 'openrouter', id: 'first' }])], [source('models_current'), { sourceId: 'newprovider_models_current', stale: true, lastAttemptStatus: null }]) });
  assert.equal(actual.outcome, 'BROKEN');
  assert.equal(actual.observed.expected, 2);
  assert.deepEqual(actual.observed.missing, ['newprovider']);
});
test('repeated cursors cannot masquerade as a complete model traversal', async () => {
  const actual = await checkModels({ fetchImpl: catalogFetch([collection([{ provider: 'openrouter', id: 'first' }], 'same'), collection([{ provider: 'groq', id: 'second' }], 'same')]) });
  assert.equal(actual.outcome, 'BROKEN');
  assert.equal(actual.observed.reason, 'repeated_cursor');
});
test('stale full data remains broken', async () => {
  const page = collection([{ provider: 'openrouter', id: 'first' }, { provider: 'groq', id: 'second' }]); page.stale = true;
  assert.equal((await checkModels({ fetchImpl: catalogFetch([page]) })).outcome, 'BROKEN');
});
test('failure to obtain the source registry does not shrink the expected set to zero', async () => {
  assert.equal((await checkModels({ fetchImpl: async () => { throw Error('network'); } })).outcome, 'COULD_NOT_CHECK');
});
test('a complete fresh edition passes while old published content fails freshness', () => {
  const data = { status: 'published', headline: 'A real edition', edition_date: '2026-09-08', generated_at: '2026-09-08T05:00:00Z', mind_blowers: [{ title: 'A story', url: 'https://example.com/story' }], sections: [] };
  assert.equal(inspectJson(json(data), 'edition', Date.parse('2026-09-08T08:00:00Z')).outcome, 'HEALTHY');
  assert.equal(inspectJson(json(data), 'edition', Date.parse('2026-09-11T08:00:00Z')).outcome, 'BROKEN');
});
const period = { start: '2026-09-08', end: '2026-09-08', unit: 'day', inclusive: true };
const matrix = () => ({ status: 'available', stale: false, resolvedPeriod: period, apps: [{ appId: 'app', appName: 'App' }], models: [{ modelId: 'm1', modelName: 'First' }, { modelId: 'm2', modelName: 'Second' }], cells: [{ state: 'observed', appId: 'app', modelId: 'm1', totalTokens: '5', rankWithinPeriod: 1, period, evidenceUrl: 'https://example.com/evidence' }, { state: 'unknown', appId: 'app', modelId: 'm2', reason: 'not_observed' }], coverage: { observedCells: 1, possibleCells: 2, unmappedObservations: 3, populationCompleteness: 'partial_or_unknown' }, completeness: { acquisitionComplete: false } });
test('partial matrix stays measurable and exposes its unknown denominator', () => {
  const actual = inspectMatrix(json(matrix()));
  assert.equal(actual.outcome, 'HEALTHY');
  assert.equal(actual.observed.unknownCells, 1);
  assert.equal(actual.observed.acquisitionComplete, false);
});
test('matrix duplicate cells, fake unknown zeroes, and mismatched observed counts fail', () => {
  const duplicate = matrix(); duplicate.cells[1] = duplicate.cells[0];
  assert.equal(inspectMatrix(json(duplicate)).outcome, 'BROKEN');
  const fakeZero = matrix(); fakeZero.cells[1].totalTokens = '0';
  assert.equal(inspectMatrix(json(fakeZero)).outcome, 'BROKEN');
  const wrongCount = matrix(); wrongCount.coverage.observedCells = 2;
  assert.equal(inspectMatrix(json(wrongCount)).outcome, 'BROKEN');
});
test('artifact metadata failure returns could-not-check rather than trusting a cached local provider list', async () => {
  assert.equal((await publishedRegistry('latest', async () => Response.json({ error: 'unavailable' }, { status: 503 }))).outcome, 'COULD_NOT_CHECK');
});
test('null children in completed JSON responses are broken data, not thrown runner failures', async () => {
  assert.equal(inspectJson(json({ status: 'published', headline: 'News', edition_date: '2026-09-08', generated_at: '2026-09-08T05:00:00Z', mind_blowers: [null] }), 'edition').outcome, 'BROKEN');
  const d = matrix(); d.apps = [null]; assert.equal(inspectMatrix(json(d)).outcome, 'BROKEN');
  assert.equal((await checkModels({ fetchImpl: catalogFetch([collection([null])]) })).outcome, 'BROKEN');
});
test('matrix missing identifiers and missing periods cannot compare equal through undefined', () => {
  assert.equal(inspectMatrix(json({ status: 'available', stale: false, apps: [{}], models: [{}], cells: [{ state: 'observed', totalTokens: '1', rankWithinPeriod: 1, evidenceUrl: 'https://example.com' }], coverage: { observedCells: 1, possibleCells: 1 } })).outcome, 'BROKEN');
});
test('project anchors in comments cannot make a shell a healthy homepage', () => {
  assert.equal(inspectHome({ status: 200, type: 'text/html', text: '<title>SDForest</title><div id="root"></div><!-- <a href="/web/a/">A</a><a href="/web/b/">B</a><a href="/web/c/">C</a> -->' }).outcome, 'BROKEN');
});
test('post-declaration provider mutations and aliasing fail instead of undercounting the registry', () => {
  for (const tail of ['PROVIDER_REGISTRY.b={id:"b",displayName:"Beta"};', 'const alias = PROVIDER_REGISTRY; alias.b = {};', 'Object.assign(PROVIDER_REGISTRY, additional);']) assert.throws(() => parseRegistry('export const PROVIDER_REGISTRY = { a: { id: "a", displayName: "Alpha" } }; ' + tail));
});
