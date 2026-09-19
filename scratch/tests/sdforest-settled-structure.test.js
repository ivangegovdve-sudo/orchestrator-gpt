'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
// Keep an isolated ESM import, matching the existing catalog contract test.
const catalog = () => import(pathToFileURL(path.join(ROOT, 'web/shared/project-catalog.mjs')).href);

const POOL_EXPECTATIONS = [
  ['growingapp', 'GrowingApp', '/web/pools/growingapp/'],
  ['ai-d-kit', 'AI-d kit', '/web/pools/ai-d-kit/'],
  ['tinkerbox', 'TinkerBox', '/web/pools/tinkerbox/'],
  ['health', 'Health', '/web/pools/health/'],
  ['design-gallery', 'Design Gallery', '/web/pools/design-gallery/'],
  ['artificial-self', 'Artificial Self', '/web/pools/artificial-self/'],
  ['my-story', 'My Story', '/web/pools/my-story/'],
];

const PROJECT_EXPECTATIONS = [
  ['rubiks-teacher', 'Rubik’s Teacher', 'GrowingApp', 'Live'],
  ['mendeleev', 'Mendeleev', 'GrowingApp', 'Live'],
  ['manifesto-newborn', 'Manifesto for a Newborn', 'GrowingApp', 'Live'],
  ['math-forest', 'Math Mania / Forest Math', 'GrowingApp', 'Live'],
  ['lobester-gym', 'Lobester Gym', 'GrowingApp', 'In development'],
  ['kids-movie-library', 'Kids Library', 'GrowingApp', 'In development'],
  ['morning-news', 'The Drop', 'AI-d kit', 'Live'],
  ['open-dashboard', 'Open Dashboard', 'AI-d kit', 'Live'],
  ['council', 'Public round-table council', 'AI-d kit', 'Live'],
  ['library', 'Library', 'AI-d kit', 'Live'],
  ['explore', 'Explore Repos', 'AI-d kit', 'Live'],
  ['anycloudllm', 'AnyCloudLLM', 'AI-d kit', 'In development'],
  ['gym-scholar', 'Gym Scholar', 'Health', 'Live'],
  ['dyslexia', 'Dyslexia Reading Platform', 'Health', 'Live'],
  ['audiobook', 'Audiobook Studio', 'Health', 'Live'],
  ['flowform', 'FlowForm', 'Health', 'In development'],
  ['womens-health-os', 'Women’s Health OS', 'Health', 'In development'],
  ['avatar-playground', 'Avatar Playground', 'TinkerBox', 'Live'],
  ['velune', 'Velune', 'TinkerBox', 'Live'],
  ['item-icon-generator', 'Item Icon Generator', 'TinkerBox', 'In development'],
  ['calendar', 'Calendar Generator', 'TinkerBox', 'In development'],
  ['chloe-pwa', null, 'TinkerBox', 'In development'],
  ['chloe-desktop', null, 'TinkerBox', 'In development'],
  ['fleet-board', 'Fleet / Fleet Board', 'TinkerBox', 'Live'],
  ['m-popova', 'Poetry Space', 'Design Gallery', 'Live'],
  ['replicator-void', 'Replicator Void', 'Design Gallery', 'In development'],
  ['chair-or-ladder', null, 'My Story', 'Live'],
  ['life-in-time', null, 'My Story', 'Live'],
  ['power-law-odyssey', null, 'My Story', 'In development'],
  ['we-are-the-training-data', null, 'My Story', 'In development'],
];

function byId(records, id) {
  const record = records.find((entry) => entry.id === id);
  assert.ok(record, id);
  return record;
}

function exportedCollection(module, matches, label) {
  const collection = Object.values(module).find((value) => Array.isArray(value) && matches(value));
  assert.ok(collection, label);
  return collection;
}

function hasAliasOrDisplayDiscrepancy(record, expected) {
  const values = Object.entries(record)
    .filter(([key]) => /alias|short|display|discrepancy/i.test(key))
    .flatMap(([, value]) => Array.isArray(value) ? value : [value]);
  return values.some((value) => value === expected || (value && typeof value === 'object'
    && Object.values(value).includes(expected)));
}

function routeValue(binding) {
  return typeof binding === 'string' ? binding : binding?.route ?? binding?.path ?? binding?.href ?? binding?.url;
}

function isPermittedRoute(binding) {
  const value = routeValue(binding);
  if (typeof value !== 'string' || !value.trim()) return false;
  return value.startsWith('/') || /^https?:\/\//.test(value)
    || ['local', 'shared-pool-tab', 'external'].includes(binding?.type ?? binding?.kind);
}

function routeBindingsFrom(record) {
  return Object.entries(record)
    .filter(([key]) => /route|link|url/i.test(key))
    .flatMap(([, value]) => Array.isArray(value) ? value : [value]);
}

function ownerResolvesToEntity(owner, entityIds) {
  return entityIds.has(owner.id) || Object.entries(owner).some(([key, value]) =>
    /project|entity|catalog/i.test(key) && typeof value === 'string' && entityIds.has(value));
}

test('settled pool catalog is frozen, complete, entry-enabled, and routed', async () => {
  const { POOL_CATALOG } = await catalog();
  assert.equal(Object.isFrozen(POOL_CATALOG), true);
  assert.equal(POOL_CATALOG.length, 7);
  assert.deepEqual(POOL_CATALOG.map(({ id, publicName, route }) => [id, publicName, route]), POOL_EXPECTATIONS);
  for (const pool of POOL_CATALOG) {
    assert.match(pool.id, /^[a-z0-9-]+$/);
    assert.equal(pool.state, 'Live');
    assert.equal(pool.entryEnabled, true);
    assert.equal(typeof pool.summary, 'string');
    assert.ok(pool.summary.trim());
    assert.equal(Object.isFrozen(pool), true);
  }
});

test('settled projects retain canonical primary pools and lifecycle facts', async () => {
  const { PROJECT_CATALOG } = await catalog();
  for (const [id, publicName, pool, status] of PROJECT_EXPECTATIONS) {
    const project = byId(PROJECT_CATALOG, id);
    if (publicName !== null) assert.equal(project.publicName, publicName, id);
    assert.equal(project.pool, pool, id);
    assert.equal(project.status, status, id);
    assert.equal(Array.isArray(project.pool), false, `${id} has scalar pool`);
  }
  const kids = byId(PROJECT_CATALOG, 'kids-movie-library');
  assert.deepEqual(kids.sections.map(({ id }) => id), ['movies', 'books']);
  assert.equal(kids.sections.some(({ id }) => id === 'games'), false);
  assert.deepEqual(byId(PROJECT_CATALOG, 'explore').modes, [
    'solution', 'category', 'shelf', 'graphified', 'capability-cards', 'index-search',
  ]);
  const womensHealth = byId(PROJECT_CATALOG, 'womens-health-os');
  assert.ok(hasAliasOrDisplayDiscrepancy(womensHealth, 'Women’s Health'));
  const velune = byId(PROJECT_CATALOG, 'velune');
  assert.ok(velune.attribution.names.includes('nikhilvishwakarma00'));
  assert.match(velune.attribution.changeDescription, /audio-only.*YouTube.*no video/i);
  for (const id of ['chloe-pwa', 'chloe-desktop']) {
    const project = byId(PROJECT_CATALOG, id);
    assert.equal(typeof project.publicName, 'string', `${id} public name`);
    assert.ok(project.publicName.trim(), `${id} public name`);
    assert.equal(project.visibility.documentation, 'unpublished');
  }
  for (const id of ['chair-or-ladder', 'life-in-time', 'power-law-odyssey', 'we-are-the-training-data']) {
    const project = byId(PROJECT_CATALOG, id);
    assert.equal(typeof project.publicName, 'string', `${id} public name`);
    assert.ok(project.publicName.trim(), `${id} public name`);
  }
  const fleet = byId(PROJECT_CATALOG, 'fleet-board');
  assert.equal(fleet.visibility.access, 'internal');
  assert.equal(fleet.visibility.navigation, 'unlisted');
});

test('design-gallery categories and reconciled non-projects do not inflate projects or pools', async () => {
  const module = await catalog();
  const { PROJECT_CATALOG, POOL_CATALOG } = module;
  const designGalleryCategories = exportedCollection(module,
    (records) => records.map(({ name }) => name).join('|') === 'Game Design|Web Design|Website History',
    'dedicated Design Gallery category collection');
  const nonProjects = exportedCollection(module,
    (records) => records.some(({ name }) => name === 'Open Design') && records.some(({ name }) => name === 'Portfolio'),
    'non-project reconciliation collection');
  const history = designGalleryCategories.find(({ name }) => name === 'Website History');
  assert.equal(history.state, 'Live');
  assert.ok(history.material.includes('Evolution'));
  assert.equal(PROJECT_CATALOG.some(({ publicName }) => ['Game Design', 'Web Design', 'Website History', 'Evolution'].includes(publicName)), false);
  const expected = ['Open Design', 'repo-shelf', 'Voice Playground', 'AI_INIT Glossary', 'Multiply Magic', 'Evolution', 'Found Work', 'Kids Corner', 'Site Home', 'Portfolio'];
  for (const name of expected) {
    const record = nonProjects.find((entry) => entry.name === name);
    assert.ok(record, name);
    assert.ok(record.disposition);
    assert.equal(PROJECT_CATALOG.some((project) => project.publicName === name), false, name);
  }
  assert.equal(POOL_CATALOG.some(({ publicName }) => ['AI Research', 'Kids Corner'].includes(publicName)), false);
});

test('open catalog findings remain explicit and do not resolve product questions', async () => {
  const { CATALOG_FINDINGS, PROJECT_CATALOG, POOL_CATALOG } = await catalog();
  const required = [
    'Artificial Self / AI Research pool-vs-project naming',
    'Public round-table council crossover membership',
  ];
  for (const question of required) {
    const finding = CATALOG_FINDINGS.find((entry) => entry.question === question);
    assert.ok(finding, question);
    assert.match(finding.status, /^\[OPEN\]/);
    assert.ok(Array.isArray(finding.options) && finding.options.length >= 2);
    assert.ok(finding.costToReverse);
  }
  assert.equal(CATALOG_FINDINGS.filter(({ status }) => status === '[OPEN]').length, 2);
  assert.equal(byId(PROJECT_CATALOG, 'council').pool, 'AI-d kit');
  assert.equal(Object.hasOwn(byId(PROJECT_CATALOG, 'council'), 'pools'), false);
  assert.equal(POOL_CATALOG.length, 7);
});

test('catalog authority is portable and required evidence work is distinct from product decisions', async () => {
  const fs = require('node:fs');
  const { execFileSync } = require('node:child_process');
  const module = await catalog();
  const authority = 'docs/sdforest-settled-structure.md';
  assert.ok(fs.existsSync(path.join(ROOT, authority)));
  for (const entity of module.CATALOG_ENTITIES) {
    assert.ok(entity.sources.includes(authority), entity.id);
    for (const source of entity.sources) {
      assert.ok(fs.existsSync(path.join(ROOT, source)), `${entity.id}: ${source}`);
      assert.ok(execFileSync('git', ['ls-files', '--', source], { cwd: ROOT, encoding: 'utf8' }).trim(), source);
    }
  }
  assert.equal(module.CATALOG_OPEN_QUESTIONS.length, 2);
  assert.ok(module.CATALOG_REQUIREMENTS.length > 0);
  assert.ok(module.CATALOG_REQUIREMENTS.every(({ status, kind }) => status !== '[OPEN]' && ['evidence-required', 'reconciliation-required'].includes(kind)));
  const resolution = module.CATALOG_RESOLUTIONS.find(({ projectId }) => projectId === 'c2c-self');
  assert.equal(resolution.status, 'resolved');
  assert.match(resolution.outcome, /identical-model.*distinct.*cross-model/i);
  assert.match(resolution.limit, /no research outcomes.*validated/i);
  assert.ok(resolution.sources.includes('web/c2c-self/index.html'));
  assert.ok(resolution.sources.includes('web/c2c-dolphin/index.html'));
  assert.equal(resolution.history.commit, 'edef7874d4e2a84f32bc2abc0fbc43a06c66f83b');
});

test('catalog preserves settled unfinished work, shared Health direction, and history material', async () => {
  const module = await catalog();
  const by = (id) => byId(module.PROJECT_CATALOG, id);
  assert.equal(by('lobester-gym').identity.purpose, 'ADHD brain-exercise app');
  assert.equal(by('lobester-gym').identity.distinctFrom, 'gym-scholar');
  assert.match(JSON.stringify(by('chair-or-ladder').requiredWork), /Ivan.*recording.*speech-to-speech.*Chloé/);
  assert.match(JSON.stringify(by('life-in-time').requiredWork), /complete redesign/i);
  for (const id of ['dyslexia', 'audiobook']) {
    assert.equal(by(id).unification.direction, 'one-platform');
    assert.equal(by(id).unification.currentPresentation, 'separate-tabs-and-implementations');
    assert.deepEqual(by(id).unification.projectIds, ['dyslexia', 'audiobook']);
  }
  assert.deepEqual(module.DESIGN_GALLERY_SUBCATEGORIES.find(({ id }) => id === 'website-history').material, ['Evolution', 'Poetry Space']);
});

test('My Story preserves narrative intent and Ivan-authored Manifesto in static and rendered context', async () => {
  const fs = require('node:fs');
  const { POOL_CATALOG, PROJECT_CATALOG } = await catalog();
  const presenter = await import(pathToFileURL(path.join(ROOT, 'web/shared/pool-page.mjs')).href);
  const pool = byId(POOL_CATALOG, 'my-story');
  assert.equal(pool.pageMode, 'narrative-first');
  assert.equal(pool.relatedLinks[0].projectId, 'manifesto-newborn');
  for (const content of [fs.readFileSync(path.join(ROOT, 'web/pools/my-story/index.html'), 'utf8'), presenter.renderPoolContext(pool)]) {
    assert.match(content, /short personal narrative/i);
    assert.match(content, /timeline fragments.*project.*evidence/i);
    assert.match(content, /href="\/web\/manifesto-newborn\/"/);
    assert.match(content, /Ivan-authored/);
    assert.match(content, /not yet.*provided/i);
  }
  const dolphin = presenter.renderProject(byId(PROJECT_CATALOG, 'c2c-dolphin'));
  assert.match(dolphin, /Observed deployed title: AI Conversation/);
  assert.match(dolphin, /Catalog\/archive label: C2C Dolphin/);
});

test('C2C topology preserves the self mirror relationship and evidence limits', async () => {
  const { PROJECT_CATALOG } = await catalog();
  const self = byId(PROJECT_CATALOG, 'c2c-self');
  const dolphin = byId(PROJECT_CATALOG, 'c2c-dolphin');
  assert.notEqual(self.id, dolphin.id);
  assert.equal(self.relationship.type, 'self-mirror-control');
  assert.equal(self.relationship.projectId, 'c2c-dolphin');
  assert.ok(hasAliasOrDisplayDiscrepancy(dolphin, 'AI Conversation'));
  assert.equal(dolphin.evidenceLevel, 'rederivation-required');
  assert.equal(self.evidenceLevel, 'rederivation-required');
});

test('projects have permitted route bindings and route owners resolve to catalog entities', async () => {
  const module = await catalog();
  const { PROJECT_CATALOG, ROUTE_OWNERS, POOL_CATALOG } = module;
  const nonProjects = exportedCollection(module,
    (records) => records.some(({ name }) => name === 'Open Design') && records.some(({ name }) => name === 'Portfolio'),
    'non-project reconciliation collection');
  const entities = new Set([
    ...PROJECT_CATALOG.map(({ id }) => id),
    ...POOL_CATALOG.map(({ id }) => id),
    ...nonProjects.map(({ id }) => id),
  ]);
  for (const project of PROJECT_CATALOG) {
    const bindings = [
      ...routeBindingsFrom(project),
      ...ROUTE_OWNERS.filter((owner) => ownerResolvesToEntity(owner, new Set([project.id])))
        .flatMap(routeBindingsFrom),
    ];
    assert.ok(bindings.some(isPermittedRoute), `${project.id} needs local, shared pool-tab, or external route binding`);
  }
  for (const owner of ROUTE_OWNERS) {
    assert.ok(ownerResolvesToEntity(owner, entities), owner.id);
  }
});

test('settled records keep metrics, update, readiness, and evidence separate from lifecycle', async () => {
  const { PROJECT_CATALOG } = await catalog();
  for (const project of PROJECT_CATALOG) {
    assert.equal(Array.isArray(project.metrics), true, `${project.id} has explicit metrics array`);
    assert.notEqual(project.metrics, project.status, project.id);
    for (const metric of project.metrics) {
      assert.equal(typeof metric, 'object', `${project.id} metric is structured`);
      assert.notEqual(metric, null, `${project.id} metric is non-null`);
    }
    assert.ok(Object.hasOwn(project, 'lastMeaningfullyUpdated'), project.id);
    assert.ok(Object.hasOwn(project, 'readiness'), project.id);
    assert.ok(Object.hasOwn(project, 'evidenceLevel'), project.id);
  }
  assert.equal(byId(PROJECT_CATALOG, 'dyslexia').lastMeaningfullyUpdated, null);
  assert.equal(byId(PROJECT_CATALOG, 'audiobook').lastMeaningfullyUpdated, null);
});
