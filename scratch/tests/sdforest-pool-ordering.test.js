const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const catalog = import('../../web/shared/project-catalog.mjs');

test('pool and project ranks are explicit data with a deterministic tier boundary', async () => {
  const { FEATURED_RANK_MIN, POOL_CATALOG, PROJECT_CATALOG, getOrderedPools, getPoolProjects } = await catalog;
  const { renderPoolProjects } = await import('../../web/shared/pool-page.mjs');
  assert.equal(POOL_CATALOG.length, 7);
  assert.deepEqual(getOrderedPools().map(({ publicName }) => publicName), [
    'Health', 'AI-d kit', 'GrowingApp', 'TinkerBox', 'Design Gallery', 'Artificial Self', 'My Story',
  ]);
  assert.deepEqual(getOrderedPools().map(({ rank }) => rank), [7, 6, 5, 4, 3, 2, 1]);
  for (const project of PROJECT_CATALOG) assert.ok(Object.hasOwn(project, 'rank'), `${project.id} lacks rank field`);
  for (const pool of POOL_CATALOG) {
    const projects = getPoolProjects(pool.publicName);
    const eligible = PROJECT_CATALOG.filter(({ pools, visibility }) =>
      visibility?.publicSurface !== 'excluded' && pools.includes(pool.publicName));
    assert.deepEqual(projects.map(({ id }) => id).sort(), eligible.map(({ id }) => id).sort(), `${pool.publicName} lost a project`);
    for (let index = 1; index < projects.length; index += 1) {
      const previous = projects[index - 1];
      const current = projects[index];
      assert.ok(previous.poolRank !== null || current.poolRank === null, `${pool.publicName} placed unranked before ranked`);
      if (previous.poolRank !== null && current.poolRank !== null) {
        assert.ok(previous.poolRank >= current.poolRank, `${pool.publicName} ranks are not descending`);
      }
    }
    for (const project of projects) {
      const expectedTier = project.poolRank === null
        ? 'unranked' : project.poolRank >= FEATURED_RANK_MIN ? 'featured' : 'ranked';
      assert.equal(project.poolTier, expectedTier, `${pool.publicName}/${project.id} tier drift`);
    }
    const html = renderPoolProjects(pool.id);
    for (const tier of ['featured', 'ranked', 'unranked']) {
      if (projects.some((project) => project.poolTier === tier)) {
        assert.match(html, new RegExp(`data-pool-tier-group="${tier}"`));
      }
    }
    assert.equal((html.match(/data-project-id="/g) || []).length, projects.length);
  }
  assert.ok(getPoolProjects('TinkerBox').some(({ poolTier }) => poolTier === 'unranked'));
});

test('ordering validation rejects rank references that would silently disappear', async () => {
  const { PROJECT_CATALOG, POOL_CATALOG, validatePoolOrdering } = await catalog;
  const source = PROJECT_CATALOG.find(({ pools }) => pools.includes('GrowingApp'));
  assert.throws(() => validatePoolOrdering({
    pools: POOL_CATALOG,
    projects: [...PROJECT_CATALOG, {
      ...source,
      id: 'ordering-invalid-unknown-pool',
      rank: { 'Not a pool': 1 },
    }],
  }), /rank references unknown pool Not a pool/);
  assert.throws(() => validatePoolOrdering({
    pools: POOL_CATALOG,
    projects: [...PROJECT_CATALOG, {
      ...source,
      id: 'ordering-invalid-membership',
      rank: { Health: 1 },
    }],
  }), /rank references Health but is not a member/);
  const missingRank = { ...source };
  delete missingRank.rank;
  assert.throws(() => validatePoolOrdering({
    pools: POOL_CATALOG,
    projects: [...PROJECT_CATALOG, { ...missingRank, id: 'ordering-invalid-missing-rank' }],
  }), /missing its explicit rank field/);
});

test('ordering rule is documented and the home directory keeps a complete fallback', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs/sdforest-pool-ordering.md'), 'utf8');
  assert.match(doc, /completeness and interest/);
  assert.match(doc, /UNRANKED/);
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.equal((home.match(/data-pool-link="/g) || []).length, 7);
  assert.match(home, /pool-directory\.mjs/);
});
