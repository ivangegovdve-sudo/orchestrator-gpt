const assert = require('node:assert/strict');
const test = require('node:test');

const prose = import('../../scripts/prose-drift.mjs');

const excluded = {
  navigation: 'unlisted', search: 'excluded', indexing: 'noindex',
  access: 'public', publicSurface: 'excluded',
};

function route(overrides = {}) {
  return {
    id: 'fixture', ownerId: 'fixture', paths: ['/fixture/'], source: 'fixture/index.html',
    visibility: excluded, ...overrides,
  };
}

test('the real copied pages have no catalog/prose contradictions', async () => {
  const { auditProseDrift } = await prose;
  assert.deepEqual(auditProseDrift(), []);
});

test('visibility guard rejects a positive public claim for an excluded surface', async () => {
  const { detectProseDrift } = await prose;
  const issues = detectProseDrift({
    route: route(),
    owner: { id: 'fixture' },
    entity: { id: 'fixture', publicName: 'Hidden Tool', visibility: excluded },
    html: '<title>Hidden Tool</title><main><h1>Hidden Tool is a public project</h1></main>',
  });
  assert.deepEqual(issues.map(({ code }) => code), ['PROSE_VISIBILITY_CONTRADICTION']);
});

test('visibility guard accepts an explicit negative public claim', async () => {
  const { detectProseDrift } = await prose;
  const issues = detectProseDrift({
    route: route(),
    owner: { id: 'fixture' },
    entity: { id: 'fixture', publicName: 'Hidden Tool', visibility: excluded },
    html: '<main><h1>Hidden Tool</h1><p>This retained route is not a public product.</p></main>',
  });
  assert.deepEqual(issues, []);
});

test('naming and retired-status guards distinguish current pages from legacy copy', async () => {
  const { detectProseDrift, auditProseDrift } = await prose;
  const current = detectProseDrift({
    route: { id: 'current', ownerId: 'current', paths: ['/current/'], source: 'current/index.html', visibility: { access: 'public' } },
    owner: { id: 'current' },
    entity: { id: 'current', publicName: 'Current Project', visibility: { access: 'public' } },
    html: '<main><h1>Growing Up</h1><p>A current project.</p></main>',
  });
  const naming = (await prose).auditProseDrift({
    routes: [{ id: 'current', ownerId: 'current', paths: ['/current/'], source: 'current/index.html', visibility: { access: 'public' } }],
    routeOwners: [{ id: 'current' }],
    catalogEntities: [{ id: 'current', publicName: 'Current Project', visibility: { access: 'public' } }],
    readFile: () => '<main><h1>Growing Up</h1></main>',
  });
  assert.deepEqual([...current.map(({ code }) => code), ...naming.map(({ code }) => code)], ['PROSE_POOL_NAME_DRIFT']);

  const retired = (await prose).auditProseDrift({
    routes: [{ id: 'kids', ownerId: 'kids', paths: ['/web/kids/'], source: 'web/kids/index.html', visibility: excluded }],
    routeOwners: [{ id: 'kids', role: 'retired-hub' }],
    catalogEntities: [{ id: 'kids', publicName: 'Kids Corner', disposition: 'retired-hub', visibility: excluded }],
    readFile: () => '<main><h1>Kids Corner is a live hub</h1></main>',
  });
  assert.deepEqual(retired.map(({ code }) => code), ['PROSE_VISIBILITY_CONTRADICTION', 'PROSE_RETIRED_STATUS_DRIFT']);
});
