'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const { STATIC_COPY_FILES, STATIC_COPY_DIRECTORIES, STATIC_DATA_COPIES } = require('../../scripts/static-build-inputs.cjs');

const ROOT = path.resolve(__dirname, '../..');
const catalog = () => import(pathToFileURL(path.join(ROOT, 'web/shared/project-catalog.mjs')).href);
const readers = () => import(pathToFileURL(path.join(ROOT, 'web/shared/project-catalog-source.mjs')).href);

function assertDeepFrozen(value) {
  if (value && typeof value === 'object') {
    assert.equal(Object.isFrozen(value), true);
    Object.values(value).forEach(assertDeepFrozen);
  }
}

test('catalog uses the approved closed vocabularies and freezes nested data', async () => {
  const { POOL_NAMES, PROJECT_STATUSES, PROJECT_CATALOG, ROUTE_OWNERS, CATALOG_FINDINGS,
    POOL_CATALOG, CATALOG_ENTITIES, CATALOG_NON_PROJECTS, DESIGN_GALLERY_SUBCATEGORIES } = await catalog();
  assert.deepEqual(POOL_NAMES, [
    'GrowingApp', 'AI-d kit', 'TinkerBox', 'Health',
    'Design Gallery', 'Artificial Self', 'My Story',
  ]);
  assert.deepEqual(PROJECT_STATUSES, ['Live', 'Research', 'Experimental', 'In development']);
  [POOL_NAMES, PROJECT_STATUSES, PROJECT_CATALOG, ROUTE_OWNERS, CATALOG_FINDINGS,
    POOL_CATALOG, CATALOG_ENTITIES, CATALOG_NON_PROJECTS, DESIGN_GALLERY_SUBCATEGORIES].forEach(assertDeepFrozen);
  assert.equal(new Set(CATALOG_ENTITIES.map(({ id }) => id)).size, CATALOG_ENTITIES.length);
  assert.deepEqual(CATALOG_ENTITIES.filter(({ kind }) => kind === 'project'), PROJECT_CATALOG);
  assert.equal(CATALOG_NON_PROJECTS.some(({ kind }) => kind === 'project'), false);
  assert.equal(PROJECT_CATALOG.some(({ id }) => id === 'web-design-gallery'), false);
  assert.equal(CATALOG_NON_PROJECTS.find(({ id }) => id === 'web-design-gallery').catalogEntityId, 'web-design');
  assert.equal(new Set(PROJECT_CATALOG.map(({ id }) => id)).size, PROJECT_CATALOG.length);
  for (const project of PROJECT_CATALOG) {
    assert.ok(project.pool === null || POOL_NAMES.includes(project.pool), project.id);
    assert.ok(project.status === null || PROJECT_STATUSES.includes(project.status), project.id);
  }
});

test('settled project identities survive conflicting legacy labels', async () => {
  const { PROJECT_CATALOG } = await catalog();
  const expected = [
    ['morning-news', 'The Drop', 'AI-d kit', 'Live'],
    ['mendeleev', 'Mendeleev', 'GrowingApp', 'Live'],
    ['replicator-void', 'Replicator Void', 'Design Gallery', 'In development'],
    ['c2c-dolphin', 'C2C Dolphin', 'Artificial Self', 'Research'],
    ['c2c-self', 'C2C Self', 'Artificial Self', 'Research'],
    ['lobester-gym', 'Lobester Gym', 'GrowingApp', 'In development'],
    ['womens-health-os', 'Women’s Health OS', 'Health', 'In development'],
  ];
  for (const [id, publicName, pool, status] of expected) {
    const record = PROJECT_CATALOG.find((project) => project.id === id);
    assert.ok(record, id);
    assert.deepEqual([record.publicName, record.pool, record.status], [publicName, pool, status]);
  }
});

test('Fleet and the Math companions each retain one owner with both experiences', async () => {
  const { PROJECT_CATALOG, ROUTE_OWNERS, PUBLIC_CARD_PROJECTS } = await catalog();
  assert.equal(ROUTE_OWNERS.filter((record) => record.id === 'fleet-board').length, 1);
  assert.equal(ROUTE_OWNERS.some((record) => record.id === 'fleet'), false);
  assert.equal(ROUTE_OWNERS.some((record) => record.id === 'board'), false);
  const fleet = ROUTE_OWNERS.find((record) => record.id === 'fleet-board');
  assert.deepEqual(fleet.routes, ['/web/fleet/', '/web/board/']);
  assert.equal(fleet.publicName, 'Fleet / Fleet Board');
  assert.equal(fleet.status, 'Live');
  assert.equal(fleet.visibility.navigation, 'unlisted');
  assert.equal(fleet.visibility.access, 'internal');
  assert.equal(PUBLIC_CARD_PROJECTS.some(({ id }) => id === 'fleet-board'), false);
  const math = ROUTE_OWNERS.filter(({ routes }) => routes.includes('/web/math-forest/') || routes.includes('/web/math-mania/'));
  assert.equal(math.length, 1);
  assert.deepEqual(math[0].routes, ['/web/math-forest/', '/web/math-mania/']);
  assert.equal(math[0].publicName, 'Math Mania / Forest Math');
  assert.equal(PROJECT_CATALOG.find(({ id }) => id === math[0].projectId).pool, 'GrowingApp');
});

test('owners account for every copied HTML page independently of navigation', async () => {
  const { CATALOG_ENTITIES, PROJECT_CATALOG, ROUTE_OWNERS } = await catalog();
  const files = [...STATIC_COPY_FILES, ...STATIC_DATA_COPIES.files.map((file) => `data/${file}`)]
    .filter((file) => file.toLowerCase().endsWith('.html') && fs.existsSync(path.join(ROOT, file)));
  for (const directory of [...STATIC_COPY_DIRECTORIES, ...STATIC_DATA_COPIES.directories.map((dir) => `data/${dir}`)]) {
    if (!fs.existsSync(path.join(ROOT, directory))) continue;
    for (const relative of fs.readdirSync(path.join(ROOT, directory), { recursive: true })) {
      if (relative.toLowerCase().endsWith('.html') && fs.statSync(path.join(ROOT, directory, relative)).isFile()) {
        files.push(`${directory}/${relative.replaceAll('\\', '/')}`);
      }
    }
  }
  assert.equal(files.length, 75, 'the inspected static HTML boundary includes seven canonical pool pages');
  assert.equal(new Set(ROUTE_OWNERS.map(({ id }) => id)).size, ROUTE_OWNERS.length);
  for (const file of files) {
    const route = `/${file}`.replace(/index\.html$/, '');
    assert.equal(ROUTE_OWNERS.filter(({ routes }) => routes.includes(route)).length, 1, route);
  }
  for (const owner of ROUTE_OWNERS) {
    const entity = CATALOG_ENTITIES.find(({ id }) => id === owner.catalogEntityId);
    assert.ok(entity, owner.id);
    if (entity.kind === 'project') {
      assert.ok(PROJECT_CATALOG.some(({ id }) => id === owner.projectId), owner.id);
    } else {
      assert.equal(Object.hasOwn(owner, 'projectId'), false, `${owner.id} is not a project`);
    }
    for (const field of ['navigation', 'search', 'indexing', 'access']) {
      assert.ok(Object.hasOwn(owner.visibility, field), `${owner.id}: ${field}`);
    }
  }
});

test('legacy redirect owners cover every configured source without merging the AI_INIT embed', async () => {
  const { ROUTE_OWNERS } = await catalog();
  const { redirects } = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  for (const { source } of redirects) {
    assert.equal(ROUTE_OWNERS.filter(({ redirectSources }) => redirectSources.includes(source)).length, 1, source);
  }
  const embed = ROUTE_OWNERS.find(({ routes }) => routes.includes('/web/ai-init/embed/'));
  const parent = ROUTE_OWNERS.find(({ routes }) => routes.includes('/web/ai-init/'));
  assert.notEqual(embed.id, parent.id);
  assert.equal(embed.role, 'embed');
  assert.equal(parent.role, 'legacy');
});

test('public cards require complete approved facts and never promote provisional records', async () => {
  const { POOL_NAMES, PROJECT_STATUSES, PROJECT_CATALOG, PUBLIC_CARD_PROJECTS } = await catalog();
  for (const project of PUBLIC_CARD_PROJECTS) {
    assert.equal(typeof project.id, 'string');
    assert.ok(project.publicName);
    assert.ok(POOL_NAMES.includes(project.pool));
    assert.ok(PROJECT_STATUSES.includes(project.status));
    assert.ok(Array.isArray(project.metrics));
    assert.notEqual(project.metrics, project.status);
    assert.match(project.lastMeaningfullyUpdated, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(project.lastMeaningfullyUpdated)));
    assert.ok(project.updateProvenance.source);
    assert.equal(project.updateProvenance.semanticReviewRequired, false);
    for (const field of ['readiness', 'evidenceLevel', 'visibility']) {
      assert.equal(typeof project[field], 'object');
      assert.notEqual(project[field], null);
    }
    assert.equal(project.provisional, false);
    assert.equal(project.readiness.review, 'verified');
    assert.equal(project.visibility.access, 'public');
    assert.equal(project.visibility.publicSurface, 'project');
  }
  for (const project of PROJECT_CATALOG.filter(({ provisional }) => provisional)) {
    assert.equal(PUBLIC_CARD_PROJECTS.some(({ id }) => id === project.id), false, project.id);
  }
  assertDeepFrozen(PUBLIC_CARD_PROJECTS);
});

// Synthetic contract data, deliberately unrelated to the factual catalog.
function approvedCard() {
  return {
    id: 'fixture-project', publicName: 'Fixture project', pool: 'TinkerBox', pools: ['TinkerBox'], status: 'Experimental',
    provisional: false, metrics: [{ name: 'Examples', value: 2, unit: 'examples' }],
    lastMeaningfullyUpdated: '2024-02-29',
    updateProvenance: { source: 'fixtures/reviewed-change.md', semanticReviewRequired: false },
    readiness: { entryEnabled: true, presentation: 'active', review: 'verified' },
    evidenceLevel: { level: 'demonstration', review: 'verified', sources: ['fixtures/evidence.md'] },
    visibility: { navigation: 'manual', search: 'included', indexing: 'index', access: 'public', publicSurface: 'project' },
  };
}

test('card eligibility admits a complete reviewed fixture without changing its data', async () => {
  const { isPublicCardProject } = await catalog();
  const record = approvedCard();
  const original = structuredClone(record);
  assert.equal(isPublicCardProject(record), true);
  assert.deepEqual([record].filter(isPublicCardProject), [original]);
  assert.deepEqual(record, original);
  assert.equal(Object.isFrozen(record), false, 'eligibility is a pure check');
  assert.equal(isPublicCardProject({ ...record, metrics: [] }), true, 'metrics may honestly be absent');
  assert.equal(isPublicCardProject({ ...record, readiness: { ...record.readiness, entryEnabled: false, presentation: 'coming-soon' } }), true,
    'a reviewed disabled entry is still a complete card');
});

test('card eligibility rejects each independently missing required field', async () => {
  const { isPublicCardProject } = await catalog();
  const requiredPaths = [
    ['id'], ['publicName'], ['pool'], ['pools'], ['status'], ['provisional'], ['metrics'],
    ['lastMeaningfullyUpdated'], ['updateProvenance'], ['updateProvenance', 'source'],
    ['updateProvenance', 'semanticReviewRequired'], ['readiness'], ['readiness', 'review'],
    ['readiness', 'entryEnabled'], ['readiness', 'presentation'], ['evidenceLevel'],
    ['evidenceLevel', 'level'], ['evidenceLevel', 'review'], ['evidenceLevel', 'sources'],
    ['visibility'], ['visibility', 'navigation'], ['visibility', 'search'],
    ['visibility', 'indexing'], ['visibility', 'access'], ['visibility', 'publicSurface'],
  ];
  for (const keys of requiredPaths) {
    const record = approvedCard();
    const container = keys.length === 1 ? record : record[keys[0]];
    delete container[keys.at(-1)];
    assert.equal(isPublicCardProject(record), false, `missing ${keys.join('.')}`);
    assert.deepEqual([record].filter(isPublicCardProject), [], `excluded ${keys.join('.')}`);
  }
});

test('card eligibility rejects malformed or unapproved dates, evidence, readiness and visibility', async () => {
  const { isPublicCardProject } = await catalog();
  const nearMisses = [
    ['id', ''], ['id', 1], ['publicName', ' '], ['pool', 'Eighth Pool'], ['status', 'Coming Soon'],
    ['provisional', true], ['provisional', null], ['metrics', 'Live'],
    ['lastMeaningfullyUpdated', null], ['lastMeaningfullyUpdated', '2026-9-15'],
    ['lastMeaningfullyUpdated', '2026-02-29'], ['lastMeaningfullyUpdated', '2026-04-31'],
    ['lastMeaningfullyUpdated', '2026-13-01'], ['lastMeaningfullyUpdated', '2026-09-15T00:00:00Z'],
    ['updateProvenance', null], ['updateProvenance', []], ['updateProvenance', {}],
    ['updateProvenance.source', ' '], ['updateProvenance.semanticReviewRequired', true],
    ['readiness', null], ['readiness', []], ['readiness', 'verified'],
    ['readiness.review', 'pending'], ['readiness.entryEnabled', 'yes'], ['readiness.presentation', ''],
    ['evidenceLevel', null], ['evidenceLevel', []], ['evidenceLevel', 'verified'],
    ['evidenceLevel', {}], ['evidenceLevel.level', ''], ['evidenceLevel.review', 'pending'],
    ['evidenceLevel.sources', []], ['evidenceLevel.sources', ['']], ['evidenceLevel.sources', 'source.md'],
    ['visibility', null], ['visibility', []], ['visibility', 'public'],
    ['visibility.navigation', 'unlisted'], ['visibility.navigation', 'excluded'], ['visibility.navigation', ''],
    ['visibility.search', null], ['visibility.indexing', ''],
    ['visibility.access', 'internal'], ['visibility.publicSurface', 'documentation-only'],
  ];
  for (const [key, value] of nearMisses) {
    const record = approvedCard();
    const keys = key.split('.');
    const container = keys.length === 1 ? record : record[keys[0]];
    container[keys.at(-1)] = value;
    assert.equal(isPublicCardProject(record), false, `${key} = ${JSON.stringify(value)}`);
  }
  for (const record of [null, undefined, [], 'project']) {
    assert.equal(isPublicCardProject(record), false, 'malformed record');
  }
});

test('the factual public-card projection uses the tested eligibility boundary', async () => {
  const { PROJECT_CATALOG, PUBLIC_CARD_PROJECTS, isPublicCardProject } = await catalog();
  assert.deepEqual(PUBLIC_CARD_PROJECTS, PROJECT_CATALOG.filter(isPublicCardProject));
  assert.equal(PUBLIC_CARD_PROJECTS.length, 0, 'fixtures do not fabricate factual readiness');
});

test('missing classifications, lifecycle and dates stay discoverable as actionable findings', async () => {
  const { PROJECT_CATALOG, CATALOG_FINDINGS, PUBLIC_CARD_PROJECTS } = await catalog();
  assert.ok(CATALOG_FINDINGS.length > 0);
  assert.equal(new Set(CATALOG_FINDINGS.map(({ findingId }) => findingId)).size, CATALOG_FINDINGS.length);
  for (const finding of CATALOG_FINDINGS) {
    assert.ok(finding.findingId);
    assert.ok(finding.field);
    assert.ok(finding.question);
    assert.ok(Array.isArray(finding.options) && finding.options.length >= 2);
    assert.ok(finding.costToReverse);
    assert.ok(finding.sources.length > 0);
  }
  for (const project of PROJECT_CATALOG) {
    for (const field of ['status', 'lastMeaningfullyUpdated']) {
      if (project[field] === null) {
        assert.ok(CATALOG_FINDINGS.some((finding) => finding.projectId === project.id && finding.field === field), `${project.id}: ${field}`);
      }
    }
    if (project.pool === null && project.classification === 'unresolved') {
      assert.ok(CATALOG_FINDINGS.some((finding) => finding.projectId === project.id && finding.field === 'pool'), project.id);
    }
  }
  for (const id of ['dyslexia', 'audiobook']) {
    const project = PROJECT_CATALOG.find((record) => record.id === id);
    assert.equal(project.pool, 'Health');
    assert.equal(project.status, 'Live');
    assert.equal(project.lastMeaningfullyUpdated, null);
    assert.equal(PUBLIC_CARD_PROJECTS.some((record) => record.id === id), false);
    assert.ok(CATALOG_FINDINGS.some((finding) => finding.projectId === id && finding.field === 'routeEvidence' && finding.pool === 'Health'));
  }
  const requiredFindings = [
    ['kids-movie-library', 'identity'], ['hypertrophyos', 'identity'],
    ['library', 'visibility'], ['upload', 'accessEnforcement'],
    ['upload', 'pool'], ['upload', 'status'], ['hypertrophyos', 'pool'], ['hypertrophyos', 'status'],
    ['c2c-dolphin', 'evidenceLevel'], ['c2c-self', 'evidenceLevel'],
  ];
  for (const [projectId, field] of requiredFindings) {
    assert.ok(CATALOG_FINDINGS.some((finding) => finding.projectId === projectId && finding.field === field), `${projectId}: ${field}`);
  }
});

test('absorbed and non-project routes resolve to their surviving catalog entities', async () => {
  const { ROUTE_OWNERS, CATALOG_ENTITIES } = await catalog();
  const expected = [
    ['forest-hub', 'forest-hub', 'site-control'], ['vfx-portfolio', 'vfx-portfolio', 'site-control'],
    ['ai-init', 'library', 'project'], ['ai-init-embed', 'library', 'project'], ['llm-db', 'library', 'project'],
    ['voice-playground', 'avatar-playground', 'project'], ['evolution', 'website-history', 'category'],
    ['kids', 'kids', 'retired-hub'], ['gallery', 'gallery', 'legacy-reference'],
  ];
  for (const [ownerId, entityId, kind] of expected) {
    const owner = ROUTE_OWNERS.find(({ id }) => id === ownerId);
    assert.equal(owner.catalogEntityId, entityId, ownerId);
    assert.equal(CATALOG_ENTITIES.find(({ id }) => id === entityId).kind, kind, ownerId);
  }
});

test('pool listings retain assigned projects independently of card readiness and isolate returned state', async () => {
  const { PROJECT_CATALOG, POOL_LISTING_PROJECTS, PUBLIC_CARD_PROJECTS, getPoolProjects } = await catalog();
  assert.deepEqual(POOL_LISTING_PROJECTS, PROJECT_CATALOG.filter(({ classification }) => classification === 'assigned'));
  const growing = getPoolProjects('GrowingApp');
  assert.ok(growing.some(({ id, status }) => id === 'lobester-gym' && status === 'In development'));
  assert.ok(growing.some(({ lastMeaningfullyUpdated }) => lastMeaningfullyUpdated === null));
  assert.ok(getPoolProjects('TinkerBox').some(({ id, visibility }) => id === 'fleet-board' && visibility.access === 'internal'));
  assert.equal(PUBLIC_CARD_PROJECTS.length, 0);
  assert.notEqual(growing[0], PROJECT_CATALOG.find(({ id }) => id === growing[0].id));
  assertDeepFrozen(POOL_LISTING_PROJECTS);
  assertDeepFrozen(growing);
  assert.throws(() => { growing[0].routeBindings[0].route = '/invented/'; }, TypeError);
  assert.deepEqual(getPoolProjects('Eighth Pool'), []);
});

test('Health reading projects retain distinct observed implementations and their shared pool tabs', async () => {
  const { PROJECT_CATALOG, PUBLIC_CARD_PROJECTS, getPoolProjects } = await catalog();
  const expected = [
    ['dyslexia', 'https://chloe.blumenkraft.cloud/dyslexia/'],
    ['audiobook', 'https://chloe.blumenkraft.cloud/audiobook/'],
  ];
  for (const [id, url] of expected) {
    const project = PROJECT_CATALOG.find((record) => record.id === id);
    assert.deepEqual(project.routeBindings.filter(({ type }) => type === 'external').map((binding) => binding.url), [url]);
    assert.ok(project.routeBindings.some((binding) => binding.type === 'shared-pool-tab'
      && binding.route === `/web/pools/health/#${id}`), `${id} keeps its pool-tab entry`);
    assert.deepEqual(getPoolProjects('Health').find((record) => record.id === id).routeBindings, project.routeBindings);
    assert.equal(project.lastMeaningfullyUpdated, null);
    assert.equal(project.readiness.review, 'pending');
    assert.equal(PUBLIC_CARD_PROJECTS.some((record) => record.id === id), false);
  }
});

test('resolved naming and crossover decisions stay out of open findings', async () => {
  const { PROJECT_CATALOG, CATALOG_FINDINGS } = await catalog();
  const open = CATALOG_FINDINGS.filter(({ status }) => status === '[OPEN]');
  assert.equal(open.some(({ question }) => /Artificial Self \/ AI Research pool-vs-project naming/i.test(question)), false);
  assert.equal(open.some(({ question }) => /Public round-table council crossover membership/i.test(question)), false);
  assert.equal(open.length, 0, 'the catalog has no unresolved product decisions after the settled amendment');
  const research = PROJECT_CATALOG.find(({ id }) => id === 'ai-research');
  assert.deepEqual(research.pools, ['Artificial Self']);
  assert.deepEqual(PROJECT_CATALOG.find(({ id }) => id === 'council').pools, ['AI-d kit', 'TinkerBox']);
  for (const id of ['hypertrophyos', 'upload']) {
    const project = PROJECT_CATALOG.find((record) => record.id === id);
    assert.equal(project.pool, null);
    assert.equal(project.status, null);
  }
  const upload = PROJECT_CATALOG.find(({ id }) => id === 'upload');
  assert.equal(upload.disposition, 'kept');
  assert.equal(upload.repair, 'repair-needed');
  assert.equal(upload.visibility.navigation, 'unlisted');
  assert.equal(upload.visibility.access, 'private');
  assert.equal(upload.visibility.accessGate, 'required');
  assert.equal(upload.visibility.enforcement, 'unverified');
  assert.equal(upload.readiness.entryEnabled, false);
  for (const id of ['c2c-dolphin', 'c2c-self']) {
    const project = PROJECT_CATALOG.find((record) => record.id === id);
    assert.equal(project.evidenceLevel, 'rederivation-required');
    assert.equal(project.evidence.review, 'rederivation-required');
  }
});

test('study badges and bulk navigation history cannot masquerade as meaningful updates', async () => {
  const { PROJECT_CATALOG, CATALOG_FINDINGS } = await catalog();
  for (const id of ['c2c-dolphin', 'c2c-self', 'mendeleev', 'replicator-void']) {
    const record = PROJECT_CATALOG.find((project) => project.id === id);
    assert.equal(record.lastMeaningfullyUpdated, null, id);
    const finding = CATALOG_FINDINGS.find((entry) => entry.projectId === id && entry.field === 'lastMeaningfullyUpdated');
    assert.equal(finding.semanticReviewRequired, true);
    assert.ok(finding.reason);
  }
});

test('snapshots are JSON-safe independent immutable values', async () => {
  const { PROJECT_CATALOG, getCatalogSnapshot } = await catalog();
  const first = getCatalogSnapshot();
  const second = getCatalogSnapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.notEqual(first.projects, PROJECT_CATALOG);
  assert.notEqual(first.projects[0], PROJECT_CATALOG[0]);
  assertDeepFrozen(first);
  assert.throws(() => { first.projects[0].visibility.access = 'changed'; }, TypeError);
  assert.deepEqual(second.projects, PROJECT_CATALOG);
});

test('reader accepts a sync static source and isolates all nested returned state', async () => {
  const { PROJECT_CATALOG } = await catalog();
  const { createCatalogReader, moduleCatalogReader } = await readers();
  const reader = createCatalogReader({ readAll: () => PROJECT_CATALOG });
  const pending = reader.list();
  assert.ok(pending instanceof Promise);
  const all = await pending;
  assert.deepEqual(all, PROJECT_CATALOG);
  assert.notEqual(all, PROJECT_CATALOG);
  const getPending = reader.get('morning-news');
  assert.ok(getPending instanceof Promise);
  const project = await getPending;
  assert.equal(project.publicName, 'The Drop');
  assert.notEqual(project, PROJECT_CATALOG.find(({ id }) => id === 'morning-news'));
  assertDeepFrozen(all);
  assertDeepFrozen(project);
  assert.throws(() => project.metrics.push({ value: 999 }), TypeError);
  assert.equal(await reader.get('does-not-exist'), null);
  assert.deepEqual(await moduleCatalogReader.list(), PROJECT_CATALOG);
  assert.deepEqual(await moduleCatalogReader.get('morning-news'), project);
});

test('reader awaits async sources and never freezes or aliases their mutable state', async () => {
  const { createCatalogReader } = await readers();
  const source = {
    records: [{ id: 'sample', metrics: [{ name: 'count', value: 2 }], visibility: { access: 'public' } }],
    async readAll() { return this.records; },
  };
  const reader = createCatalogReader(source);
  const first = await reader.list();
  const one = await reader.get('sample');
  assert.equal(Object.isFrozen(source.records), false);
  assert.equal(Object.isFrozen(source.records[0].metrics[0]), false);
  source.records[0].metrics[0].value = 3;
  assert.equal(first[0].metrics[0].value, 2);
  assert.equal(one.metrics[0].value, 2);
  assert.equal((await reader.get('sample')).metrics[0].value, 3);
  assert.notEqual(first[0].metrics, one.metrics);
  assertDeepFrozen(first);
  assertDeepFrozen(one);
});

test('reader rejects invalid source contracts and propagates source failures', async () => {
  const { createCatalogReader } = await readers();
  for (const source of [undefined, null, [], {}, { readAll: 1 }, () => []]) {
    assert.throws(() => createCatalogReader(source), TypeError);
  }
  for (const readAll of [() => null, async () => ({ projects: [] })]) {
    const reader = createCatalogReader({ readAll });
    await assert.rejects(reader.list(), TypeError);
    await assert.rejects(reader.get('sample'), TypeError);
  }
  const failure = new Error('source unavailable');
  const reader = createCatalogReader({ readAll: () => { throw failure; } });
  await assert.rejects(reader.list(), (error) => error === failure);
  await assert.rejects(reader.get('sample'), (error) => error === failure);
});
