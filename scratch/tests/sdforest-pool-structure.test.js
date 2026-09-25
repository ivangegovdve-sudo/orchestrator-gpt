const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const pools = [
  ['growingapp', 'GrowingApp'], ['ai-d-kit', 'AI-d kit'], ['tinkerbox', 'TinkerBox'],
  ['health', 'Health'], ['design-gallery', 'Design Gallery'],
  ['artificial-self', 'Artificial Self'], ['my-story', 'My Story'],
];
const presenter = import('../../web/shared/pool-page.mjs');
const catalog = import('../../web/shared/project-catalog.mjs');
const projectContext = import('../../web/shared/project-page-context.mjs');
const narrativeSpine = import('../../web/shared/narrative-spine.mjs');

test('one combined Math row exposes only its two named approved companions', async () => {
  const [{ renderProject }, { getPoolProjects }] = await Promise.all([presenter, catalog]);
  const project = getPoolProjects('GrowingApp').find((p) => p.id === 'math-forest');
  const html = renderProject({ ...project, routeBindings: [...project.routeBindings,
    { type: 'local', route: '/compatibility-only/' }] });
  assert.equal((html.match(/data-project-id="math-forest"/g) || []).length, 1);
  assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]), ['/web/math-forest/', '/web/math-mania/']);
  assert.match(html, />Math Forest —/);
  assert.match(html, />Math Mania —/);
  assert.match(html, /Math Forest[^<]*rebuild placeholder/i);
  assert.match(html, /Status: Live/);
  assert.doesNotMatch(html, /compatibility-only/);
});

test('exactly seven static shells have independent accessible descriptions and all-pools navigation', () => {
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'web/pools')).sort(), pools.map(([id]) => id).sort());
  for (const [id, name] of pools) {
    const html = read(`web/pools/${id}/index.html`);
    assert.ok(html.includes(`<title>${name}</title>`));
    assert.ok(html.includes(`<h1>${name}</h1>`));
    assert.match(html, new RegExp(`<main data-pool-id="${id}">`));
    assert.match(html, /<html lang="en" class="forest-skin forest-palette">/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /<a href="\/">Back to SD Forest<\/a>/);
    assert.match(html, /<section[^>]+data-pool-overview[^>]*>/);
    assert.match(html, /<div[^>]+data-pool-overview-content[^>]*>/);
    assert.match(html, /<noscript><p>This pool overview is catalog-backed/);
    assert.match(html, /<noscript><p>Project details load from the shared catalog/);
    assert.match(html, /<section aria-labelledby="projects-title">/);
    assert.match(html, /<div data-pool-projects>/);
    assert.match(html, /type="module" src="\/web\/shared\/pool-page.mjs"/);
    const nav = html.match(/<nav aria-label="All pools">([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav);
    assert.deepEqual([...nav.matchAll(/href="([^\"]+)"/g)].map((m) => m[1]), pools.map(([key]) => `/web/pools/${key}/`));
    assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
    assert.match(html, /forest-design\.css/);
    assert.match(html, /forest-shell\.css/);
    assert.match(html, /<body class="pool-page" data-forest-page="[^"]+">/);
    assert.match(html, /<canvas class="forest-scene" data-forest-scene data-mode="[^"]+"/);
    assert.match(html, /data-forest-runtime="motion"[^>]+forest-runtime-boot\.mjs\?v=20260807a/);
    assert.doesNotMatch(html, /forest-(?:trails|navigation)|reveal|ROUTE_REGISTRY/);
  }
});

test('home keeps seven live fallback links and loads the catalog-ranked directory', () => {
  const home = read('index.html');
  const directory = home.match(/<nav aria-label="Seven pools" data-pool-directory>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(directory);
  const links = [...directory.matchAll(/<a\b[^>]*data-pool-link="([^"]+)"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(links.map((m) => m[1]), pools.map(([id]) => id));
  links.forEach((link, index) => {
    assert.equal(link[2], `/web/pools/${pools[index][0]}/`);
    assert.ok(link[3].includes(`>${pools[index][1]}</span>`));
    assert.match(link[3], />Live pool</);
    assert.doesNotMatch(link[0], /disabled|tabindex|target=/);
  });
  assert.equal((home.match(/href="\/web\/pools\//g) || []).length, 7);
  assert.match(home, /pool-directory\.mjs/);
  assert.doesNotMatch(home, /project-catalog|ROUTE_REGISTRY|ROUTE_INVENTORY|static-route-registry/);
  assert.doesNotMatch(home, /data-(?:index-project|directory-section|index-section|project)="/);
  assert.doesNotMatch(home, /Kids Corner|Found Work|Voice Playground|Multiply Magic|Web Design Gallery|VFX Portfolio|Published research/);
  assert.doesNotMatch(directory, /AI Research|Evolution|Writing & Media|Projects & Play|Research & Experiments/);
  assert.match(home, /<nav[^>]*aria-label="Site controls">\s*<a data-site-control="portfolio" href="https:\/\/vfxportfolio.lovable.app" target="_blank" rel="noopener">Portfolio — opens in a new tab<\/a>/);
  assert.doesNotMatch(directory, /portfolio/i);
});

test('presenter consumes catalog membership and renders every assigned project including Coming Soon rows', async () => {
  const [{ renderPoolProjects }, { getPoolProjects }] = await Promise.all([presenter, catalog]);
  assert.match(read('web/shared/pool-page.mjs'), /POOL_CATALOG[\s\S]*getPoolProjects[\s\S]*from '\.\/project-catalog\.mjs'/);
  assert.doesNotMatch(read('web/shared/pool-page.mjs'), /PUBLIC_CARD_PROJECTS|ROUTE_REGISTRY|ROUTE_INVENTORY|forest-(?:trails|navigation|runtime|motion)/);
  for (const [id, name] of pools) {
    const projects = getPoolProjects(name);
    const html = renderPoolProjects(id);
    assert.deepEqual([...html.matchAll(/data-project-id="([^"]+)"/g)].map((m) => m[1]), projects.map((p) => p.id));
    for (const project of projects) {
      const row = html.match(new RegExp(`<div id="${project.id}"[\\s\\S]*?<\\/article>`))?.[0];
      assert.ok(row, `${project.id} has its stable fragment target`);
      assert.match(row, /Last meaningful update: awaiting verified date/);
      assert.match(row, /class="pool-metrics">Metrics: none published/);
      if (project.status === 'In development') {
        assert.match(row, /Status: In development — Coming Soon/);
        assert.match(row, /aria-disabled="true"/);
        assert.doesNotMatch(row, /<a\b|<button\b|tabindex=/);
      }
      if (project.visibility?.access === 'internal') {
        assert.match(row, /Internal project; documentation is unpublished/);
        assert.doesNotMatch(row, /href=|\/web\/fleet\/|\/web\/board\/|\/web\/chloe-pwa\//);
      }
      if (project.visibility?.navigation === 'unlisted') {
        for (const binding of project.routeBindings) assert.ok(!row.includes(binding.url || binding.route));
      } else if (project.status === 'Live' && project.routeBindings.some((b) => b.type !== 'shared-pool-tab')) {
        assert.match(row, /<a\b/, `${project.id} keeps its explicitly settled Live handoff`);
        if (project.readiness?.review !== 'verified') assert.match(row, /readiness review remains pending/);
      }
    }
  }
});

test('Health retains two separate progressively enhanced tabs and their distinct bound implementations', async () => {
  const [{ renderProject }, { getPoolProjects }] = await Promise.all([presenter, catalog]);
  const html = read('web/pools/health/index.html');
  assert.match(html, /role="tablist"[^>]*data-health-tabs hidden/);
  const tabs = [...html.matchAll(/<button type="button" role="tab" id="tab-([^"]+)" aria-controls="([^"]+)"[^>]*>([^<]+)<\/button>/g)];
  assert.deepEqual(tabs.map((m) => [m[1], m[2], m[3]]), [
    ['dyslexia', 'dyslexia', 'Dyslexia Reading Platform'], ['audiobook', 'audiobook', 'Audiobook Studio'],
  ]);
  for (const id of ['dyslexia', 'audiobook']) {
    assert.match(html, new RegExp(`<section id="${id}" data-health-project="${id}"[^>]*>`));
    assert.doesNotMatch(html.match(new RegExp(`<section id="${id}"[^>]*>`))[0], /hidden/);
    const project = getPoolProjects('Health').find((p) => p.id === id);
    const url = `https://chloe.blumenkraft.cloud/${id}/`;
    assert.ok(project.routeBindings.some((b) => b.type === 'external' && b.url === url));
    assert.ok(project.routeBindings.some((b) => b.route === `/web/pools/health/#${id}`));
    assert.ok(renderProject(project).includes(url));
    assert.ok(renderProject(project).includes(`href="${url}" target="_blank" rel="noopener"`));
  }
  assert.doesNotMatch(read('web/shared/pool-page.mjs'), /https:\/\/chloe\./, 'implementation URLs come from the catalog');
});

test('Health tabs support arrow, Home, End, click and catalog fragment selection', async () => {
  const { enhanceHealthTabs } = await presenter;
  const makeNode = (id, controls) => ({
    id, hidden: false, attributes: controls ? { 'aria-controls': controls } : {}, listeners: {},
    getAttribute(key) { return this.attributes[key]; },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, fn) { this.listeners[key] = fn; },
    focus() { this.focused = true; },
  });
  const tabs = [makeNode('tab-dyslexia', 'dyslexia'), makeNode('tab-audiobook', 'audiobook')];
  const panels = [makeNode('dyslexia'), makeNode('audiobook')];
  const tablist = { hidden: true, querySelectorAll: () => tabs };
  const root = { querySelector: (selector) => selector === '[data-health-tabs]' ? tablist : panels.find((p) => `#${p.id}` === selector) };
  enhanceHealthTabs(root, { hash: '#audiobook' });
  assert.equal(tablist.hidden, false);
  assert.deepEqual(panels.map((p) => p.hidden), [true, false]);
  const key = (index, value) => tabs[index].listeners.keydown({ key: value, preventDefault() {} });
  key(1, 'ArrowRight');
  assert.deepEqual(tabs.map((t) => t.attributes['aria-selected']), ['true', 'false']);
  assert.equal(tabs[0].focused, true);
  key(0, 'End');
  assert.deepEqual(tabs.map((t) => t.tabIndex), [-1, 0]);
  key(1, 'Home');
  key(0, 'ArrowLeft');
  assert.deepEqual(panels.map((p) => p.hidden), [true, false]);
  tabs[0].listeners.click();
  assert.deepEqual(panels.map((p) => p.hidden), [false, true]);
  panels.forEach((p, i) => {
    assert.equal(p.attributes.role, 'tabpanel');
    assert.equal(p.attributes['aria-labelledby'], tabs[i].id);
    assert.equal(p.tabIndex, 0);
  });
});

test('Design Gallery categories are not projects, and archive uncertainty remains explicit', async () => {
  const [{ renderPoolProjects }, { DESIGN_GALLERY_SUBCATEGORIES }] = await Promise.all([presenter, catalog]);
  const design = read('web/pools/design-gallery/index.html');
  assert.deepEqual([...design.matchAll(/data-category-id="([^"]+)"/g)].map((m) => m[1]), DESIGN_GALLERY_SUBCATEGORIES.map((c) => c.id));
  assert.match(design, /Website History<\/strong> — Live category\. Poetry Space is an example; Evolution is Website History material\. <a href="\/web\/evolution\/">View the history exhibit<\/a>/);
  assert.doesNotMatch(renderPoolProjects('design-gallery'), /data-project-id="(?:evolution|web-design-gallery|game-design|web-design|website-history)"/);
  const research = read('web/pools/artificial-self/index.html');
  assert.match(research, /AI Research is the research part of this pool/);
  assert.doesNotMatch(research, /naming question remains open/);
  assert.match(research, /Archive interpretations require rederivation/);
  assert.equal((renderPoolProjects('artificial-self').match(/Existing C2C outcome claims are not verified findings/g) || []).length, 2);
  assert.match(renderPoolProjects('ai-d-kit'), /data-project-id="council"/);
  assert.match(renderPoolProjects('tinkerbox'), /data-project-id="council"/);
  assert.match(renderPoolProjects('tinkerbox'), /Fork of work by nikhilvishwakarma00\. Ivan’s audio-only YouTube path with no video\./);
});

test('pool overview is rendered from the catalog for every pool', async () => {
  const [{ renderPoolOverview, renderPoolLedger }, { POOL_CATALOG, getPoolProjects }] = await Promise.all([presenter, catalog]);
  for (const pool of POOL_CATALOG) {
    const html = renderPoolOverview(pool.id);
    assert.match(html, new RegExp(`data-pool-state="Live"`));
    assert.match(html, new RegExp(`>${pool.publicName}<`));
    assert.match(html, new RegExp(pool.summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(renderPoolLedger(pool.id), new RegExp(`Catalog: ${getPoolProjects(pool.publicName).length} project`));
    assert.doesNotMatch(html, /Catalog: \d+ project/, 'the catalog ledger heads the listing, not the threshold');
  }
});

test('pool overview exposes catalog-derived readiness counts without changing lifecycle status', async () => {
  const [{ renderPoolLedger, projectReadiness }, { POOL_CATALOG, getPoolProjects }] = await Promise.all([presenter, catalog]);
  for (const pool of POOL_CATALOG) {
    const counts = getPoolProjects(pool.publicName).reduce((acc, project) => {
      acc[projectReadiness(project).state] += 1;
      return acc;
    }, { Shipped: 0, 'In progress': 0, UNKNOWN: 0 });
    const html = renderPoolLedger(pool.id);
    assert.match(html, /data-readiness-summary/);
    assert.match(html, new RegExp(`Shipped: ${counts.Shipped}`));
    assert.match(html, new RegExp(`In progress: ${counts['In progress']}`));
    assert.match(html, new RegExp(`UNKNOWN: ${counts.UNKNOWN}`));
  }
});

test('every pool overview carries a catalog-backed visitor guide and reality split', async () => {
  const [{ renderPoolOverview, renderPoolLedger }, { POOL_CATALOG, getPoolProjects }] = await Promise.all([presenter, catalog]);
  for (const pool of POOL_CATALOG) {
    const guide = pool.visitorGuide;
    assert.ok(guide, `${pool.publicName} has a visitor guide`);
    assert.match(guide.purpose, /\S/);
    assert.match(guide.why, /\S/);
    assert.ok(Array.isArray(guide.startHere) && guide.startHere.length > 0);
    const projects = getPoolProjects(pool.publicName);
    for (const entry of guide.startHere) {
      assert.ok(projects.some((project) => project.id === entry.projectId),
        `${pool.publicName} first look ${entry.projectId} belongs to the pool`);
      assert.match(entry.reason, /\S/);
    }
    const html = renderPoolOverview(pool.id);
    assert.match(html, /data-pool-guide/);
    assert.match(html, new RegExp(`data-pool-purpose="${guide.purpose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, /What this pool is for/);
    assert.match(html, /Why it exists/);
    assert.match(html, /Start here/);
    const ledger = renderPoolLedger(pool.id);
    assert.match(ledger, /What is real here/);
    assert.match(ledger, /Still forming/);
    for (const project of projects) {
      assert.match(ledger, new RegExp(`data-pool-reality-project="${project.id}"`));
    }
  }
});

test('Rubik’s Teacher mounts a catalog-backed project context before its app shell', async () => {
  const [{ renderProjectContext }, { PROJECT_CATALOG }] = await Promise.all([projectContext, catalog]);
  const project = PROJECT_CATALOG.find(({ id }) => id === 'rubiks-teacher');
  assert.ok(project?.projectPage);
  const html = read('web/rubiks-teacher/index.html');
  assert.match(html, /data-project-context-root/);
  assert.match(html, /data-project-id="rubiks-teacher"/);
  assert.match(html, /src="\/web\/shared\/project-page-context\.mjs"/);
  const context = renderProjectContext(project);
  assert.match(context, /data-project-context/);
  assert.match(context, /What problem it addresses/);
  assert.match(context, /What state it is in/);
  assert.match(context, /What comes next/);
  assert.match(context, new RegExp(project.projectPage.problem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(context, /Status: Live/);
  assert.match(context, /Readiness: UNKNOWN/);
  assert.match(context, /lazy lesson bundles/);
});

test('the narrative spine links My Story, Manifesto and Website History without inventing an order', async () => {
  const [{ renderNarrativeSpine }, { NARRATIVE_SPINE }] = await Promise.all([narrativeSpine, catalog]);
  assert.deepEqual(NARRATIVE_SPINE.map(({ id }) => id), ['my-story', 'manifesto-newborn', 'website-history']);
  for (const entry of NARRATIVE_SPINE) {
    const html = renderNarrativeSpine(entry.id);
    assert.match(html, /data-narrative-spine/);
    assert.match(html, /Walk the story/);
    for (const link of NARRATIVE_SPINE) {
      assert.match(html, new RegExp(link.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(html, new RegExp(link.publicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(html, new RegExp(`data-narrative-spine-current="${entry.id}"`));
  }
  for (const [file, id] of [
    ['web/pools/my-story/index.html', 'my-story'],
    ['web/manifesto-newborn/index.html', 'manifesto-newborn'],
    ['web/evolution/index.html', 'website-history'],
  ]) {
    const html = read(file);
    assert.match(html, new RegExp(`data-narrative-spine-root[^>]+data-narrative-spine-id="${id}"`));
    assert.match(html, /src="\/web\/shared\/narrative-spine\.mjs"/);
  }
});

test('Evolution carries the settled Website History arc without flattening unfinished work', () => {
  const evolution = read('web/evolution/index.html');
  assert.match(evolution, /data-history-arc/);
  assert.match(evolution, /fear/i);
  assert.match(evolution, /infatuation[\s\S]*finishing nothing/i);
  assert.match(evolution, /over-delegation[\s\S]*mess still being untangled/i);
  assert.match(evolution, /real inconvenience[\s\S]*not from an idea/i);
  assert.match(evolution, /unfinished[\s\S]*abandoned[\s\S]*point/i);
});

test('current route copy reflects settled naming while retained legacy labels stay scoped', () => {
  const c2cSelf = read('web/c2c-self/index.html');
  assert.match(c2cSelf, /Artificial Self is the pool/);
  assert.doesNotMatch(c2cSelf, /pool\/project naming decision remains under review/i);

  const math = read('web/math-mania/index.html');
  assert.doesNotMatch(math, /Kids Corner/);
  assert.equal((math.match(/href="\/web\/pools\/growingapp\//g) || []).length, 3);
  assert.match(math, /GrowingApp/);

  const kidsLibrary = read('web/kids-movie-library/index.html');
  assert.doesNotMatch(kidsLibrary, /Kids Corner/);
  assert.equal((kidsLibrary.match(/href="\/web\/pools\/growingapp\//g) || []).length, 2);

  const avatar = read('web/avatar-playground/index.html');
  assert.match(avatar, /Voice Playground \(legacy\)/i);
});

test('settled pool page contracts are explicit without choosing deferred visual treatments', () => {
  const growing = read('web/pools/growingapp/index.html');
  assert.match(growing, /Manifesto for a Newborn/);
  assert.match(growing, /optional entry|never a gate/i);
  assert.match(growing, /href="\/web\/manifesto-newborn\/"/);

  const aid = read('web/pools/ai-d-kit/index.html');
  assert.match(aid, /search-first/i);
  assert.match(aid, /unified search|glossary/i);
  assert.match(aid, /guided mode/i);

  const health = read('web/pools/health/index.html');
  assert.match(health, /project-first/i);
  assert.match(health, /evidence lives inside each project/i);
});

test('route bindings, readiness, metrics and verified dates remain independent in the presenter', async () => {
  const [{ renderProject }, { getPoolProjects }] = await Promise.all([presenter, catalog]);
  const project = getPoolProjects('Health').find((p) => p.id === 'dyslexia');
  assert.match(renderProject(project), /<a\b/, 'settled Live public implementations are usable despite pending generic readiness');
  const enabled = { ...project, readiness: { entryEnabled: true }, metrics: [{ name: 'Examples', value: 2, unit: 'examples' }] };
  const rendered = renderProject(enabled);
  assert.match(rendered, /Status: Live/);
  assert.match(rendered, /Metrics: Examples: 2 examples/);
  assert.match(rendered, /target="_blank" rel="noopener">[^<]+ — External; opens in a new tab/);
  assert.equal((rendered.match(/<a\b/g) || []).length, 1, 'shared pool fragments are not service URLs');
  assert.doesNotMatch(renderProject({ ...enabled, routeBindings: [] }), /<a\b/);
  assert.doesNotMatch(renderProject({ ...enabled, routeBindings: [{ type: 'external', url: 'javascript:alert(1)' }] }), /href=/);
  assert.match(renderProject({ ...enabled, publicName: '<script>unsafe</script>' }), /&lt;script&gt;unsafe&lt;\/script&gt;/);
  const dated = { ...enabled, lastMeaningfullyUpdated: '2026-09-15', updateProvenance: { source: 'review.md', semanticReviewRequired: false } };
  assert.match(renderProject(dated), /Last meaningful update: 2026-09-15/);
  assert.match(renderProject({ ...dated, updateProvenance: null }), /Last meaningful update: awaiting verified date/);
  assert.match(renderProject({ ...dated, lastMeaningfullyUpdated: '2026-02-30' }), /Last meaningful update: awaiting verified date/);
  assert.doesNotMatch(renderProject({ ...enabled, status: 'In development' }), /<a\b/);
  assert.doesNotMatch(renderProject({ ...enabled, visibility: { access: 'internal' } }), /<a\b|chloe.blumenkraft.cloud/);
  assert.doesNotMatch(renderProject({ ...enabled, visibility: { access: 'public', navigation: 'unlisted' } }), /<a\b|chloe.blumenkraft.cloud/);
  assert.doesNotMatch(renderProject({ ...enabled, routeBindings: [
    { type: 'local', route: '/public/' }, { type: 'local', route: '/internal-subroute/' },
  ] }), /internal-subroute/, 'owned subroutes do not automatically become public navigation');
});

test('readiness surface has explicit shipped, in-progress and UNKNOWN states', async () => {
  const { projectReadiness, renderProject } = await presenter;
  const shipped = {
    id: 'fixture', publicName: 'Fixture', pool: 'TinkerBox', pools: ['TinkerBox'], status: 'Live',
    readiness: { entryEnabled: true, presentation: 'active', review: 'verified' },
    evidenceLevel: { level: 'demonstration', review: 'verified', sources: ['review.md'] },
    visibility: { access: 'public', navigation: 'listed' }, routeBindings: [{ type: 'local', route: '/fixture/' }],
  };
  assert.deepEqual(projectReadiness(shipped), { state: 'Shipped', reason: 'Entry, readiness and evidence reviews are verified.' });
  assert.match(renderProject(shipped), /data-readiness-state="Shipped">Readiness: Shipped/);

  const inProgress = { ...shipped, status: 'In development', readiness: { entryEnabled: false, presentation: 'pending-review', review: 'pending', reason: 'Implementation work remains.' } };
  assert.deepEqual(projectReadiness(inProgress), { state: 'In progress', reason: 'Implementation work remains.' });
  assert.match(renderProject(inProgress), /data-readiness-state="In progress">Readiness: In progress/);

  const unknown = { ...shipped, readiness: { entryEnabled: true, presentation: 'active', review: 'pending' } };
  assert.deepEqual(projectReadiness(unknown), { state: 'UNKNOWN', reason: 'Completion evidence is not verified.' });
  assert.match(renderProject(unknown), /data-readiness-state="UNKNOWN">Readiness: UNKNOWN/);

  const rederivation = { ...shipped, status: 'Research', evidenceLevel: 'rederivation-required' };
  assert.deepEqual(projectReadiness(rederivation), { state: 'In progress', reason: 'Research rederivation remains required.' });
});

