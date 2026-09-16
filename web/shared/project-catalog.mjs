// Factual catalog boundary, independent of homepage curation and Forest Trails.
// Authority: docs/superpowers/plans/2026-09-15-sdforest-catalog-registry.md
// and the settled decisions in SDFOREST-MASTER-PLAN.md (PR #569).
// Source observations establish page existence, not deployed flow/evidence quality.

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const POOL_NAMES = Object.freeze([
  'GrowingApp', 'AI-d kit', 'TinkerBox', 'Health',
  'Design Gallery', 'Artificial Self', 'My Story',
]);

export const PROJECT_STATUSES = Object.freeze([
  'Live', 'Research', 'Experimental', 'In development',
]);

const PLAN = 'docs/superpowers/plans/2026-09-15-sdforest-catalog-registry.md';
const MASTER = 'SDFOREST-MASTER-PLAN.md (PR #569)';
const SETTLED = '.superpowers/sdd/2026-09-16-sdforest-settled-structure/task-2-brief.md';
export const POOL_CATALOG = deepFreeze([
  ['growingapp', 'GrowingApp', 'Learning, family tools, and growing together.'],
  ['ai-d-kit', 'AI-d kit', 'Tools for finding, understanding, and working with AI.'],
  ['tinkerbox', 'TinkerBox', 'Playgrounds, practical experiments, and personal tools.'],
  ['health', 'Health', 'Health, reading, movement, and wellbeing projects.'],
  ['design-gallery', 'Design Gallery', 'Game design, web design, and website history.'],
  ['artificial-self', 'Artificial Self', 'AI research and conversation archives.'],
  ['my-story', 'My Story', 'Personal stories, reflections, and creative work.'],
].map(([id, publicName, summary]) => ({
  id, kind: 'pool', publicName, summary, state: 'Live', entryEnabled: true,
  route: `/web/pools/${id}/`, sources: [SETTLED],
})));
const publicShell = {
  navigation: 'manual', search: 'unreviewed', indexing: 'unspecified',
  access: 'public', publicSurface: 'project',
};
const internalDocumentation = {
  navigation: 'unlisted', search: 'excluded', indexing: 'noindex',
  access: 'internal', publicSurface: 'documentation-only',
};
const unpublishedDocumentation = { ...internalDocumentation, documentation: 'unpublished' };
const compatibility = {
  navigation: 'unlisted', search: 'excluded', indexing: 'noindex',
  access: 'public', publicSurface: 'compatibility',
};

export const DESIGN_GALLERY_SUBCATEGORIES = deepFreeze([
  { id: 'game-design', name: 'Game Design', material: [] },
  { id: 'web-design', name: 'Web Design', aliases: ['Web Design Gallery'], material: [] },
  { id: 'website-history', name: 'Website History', state: 'Live', material: ['Evolution'] },
].map((category) => ({
  ...category, kind: 'category', publicName: category.name, pool: 'Design Gallery',
  disposition: 'Design Gallery subcategory', visibility: publicShell, sources: [SETTLED],
})));

export const CATALOG_NON_PROJECTS = deepFreeze([
  ...DESIGN_GALLERY_SUBCATEGORIES,
  ...[
    ['open-design', 'Open Design', 'external-reference', 'External/non-Ivan work; outside pools.', null],
    ['repo-shelf', 'repo-shelf', 'browsing-mode', 'Explore Repos browsing mode.', 'explore'],
    ['voice-playground', 'Voice Playground', 'absorbed', 'Absorbed into Avatar Playground.', 'avatar-playground'],
    ['ai-init', 'AI_INIT Glossary', 'merged', 'Merged into Library; compatibility and embed routes retained.', 'library'],
    ['multiply-magic-studio', 'Multiply Magic', 'absorbed', 'Absorbed into Math Mania / Forest Math.', 'math-forest'],
    ['evolution', 'Evolution', 'historical-material', 'Website History material.', 'website-history'],
    ['web-design-gallery', 'Web Design Gallery', 'category-alias', 'Reconciled into the Web Design subcategory; not a project.', 'web-design'],
    ['gallery', 'Found Work', 'legacy-reference', 'Retired public destination; internal-reference legacy route.', null],
    ['kids', 'Kids Corner', 'retired-hub', 'Retired legacy hub.', null],
    ['forest-hub', 'Site Home', 'site-control', 'Site home control outside pools.', null],
    ['vfx-portfolio', 'Portfolio', 'site-control', 'Site-level Portfolio control outside pools.', null],
  ].map(([id, name, kind, disposition, catalogEntityId]) => ({
    id, name, publicName: name, kind, disposition, catalogEntityId, pool: null,
    visibility: kind === 'site-control'
      ? { ...publicShell, publicSurface: 'site-control' }
      : { ...compatibility, publicSurface: 'reference-only' },
    sources: [SETTLED],
  })),
]);

function project(id, publicName, facts) {
  const sources = [...new Set([...(facts.sources || [MASTER]), SETTLED])];
  return {
    id, kind: 'project', publicName, pool: null, classification: 'unresolved', outsidePoolRole: null,
    status: null, metrics: [], lastMeaningfullyUpdated: null, updateProvenance: null,
    provisional: true,
    readiness: {
      entryEnabled: false, presentation: 'pending-review', review: 'pending',
      reason: 'Core flow, accessibility, mobile usability and claim evidence need review.',
    },
    evidenceLevel: { level: 'source-observed', review: 'pending', sources },
    relationships: [],
    ...facts,
    sources,
  };
}

// Null pool + unresolved classification retains an unsettled project decision.
// Site controls and reconciled legacy references live outside this collection.
const projectRecords = [
  project('morning-news', 'The Drop', {
    pool: 'AI-d kit', classification: 'assigned', status: 'Live', visibility: publicShell,
    canonicalUrl: 'https://thedrop.sdforest.site', sources: ['web/morning-news/index.html', PLAN],
  }),
  project('mendeleev', 'Mendeleev', {
    pool: 'GrowingApp', classification: 'assigned', status: 'Live', visibility: publicShell,
    sources: ['web/mendeleev-bg/index.html', PLAN],
  }),
  project('math-forest', 'Math Mania / Forest Math', {
    pool: 'GrowingApp', classification: 'assigned', status: 'Live', visibility: publicShell,
    relationships: [
      { type: 'companion', name: 'Math Forest', route: '/web/math-forest/' },
      { type: 'companion', name: 'Math Mania', route: '/web/math-mania/' },
    ],
    sources: ['web/math-forest/index.html', 'web/math-mania/index.html', MASTER],
  }),
  project('replicator-void', 'Replicator Void', {
    pool: 'Design Gallery', classification: 'assigned', status: 'In development', visibility: publicShell,
    category: 'Game Design',
    readiness: { entryEnabled: false, presentation: 'coming-soon', review: 'pending', reason: 'Coming Soon placement is settled; runtime and evidence review remain open.' },
    sources: ['web/replicator-void/index.html', PLAN],
  }),
  project('c2c-dolphin', 'C2C Dolphin', {
    pool: 'Artificial Self', classification: 'assigned', status: 'Research', visibility: publicShell,
    aliases: ['AI Conversation'],
    displayDiscrepancy: { deployedName: 'AI Conversation', canonicalName: 'C2C Dolphin' },
    evidenceLevel: 'rederivation-required',
    evidence: { level: 'archive-unverified', review: 'rederivation-required', sources: ['web/c2c-dolphin/index.html', MASTER] },
    sources: ['web/c2c-dolphin/index.html', PLAN],
  }),
  project('c2c-self', 'C2C Self', {
    pool: 'Artificial Self', classification: 'assigned', status: 'Research', visibility: publicShell,
    relationship: { type: 'self-mirror-control', projectId: 'c2c-dolphin', modelConfiguration: 'identical-model', description: 'Identical-model self-mirror control of C2C Dolphin.' },
    evidenceLevel: 'rederivation-required',
    evidence: { level: 'archive-unverified', review: 'rederivation-required', sources: ['web/c2c-self/index.html', MASTER] },
    sources: ['web/c2c-self/index.html', PLAN],
  }),
  project('fleet-board', 'Fleet / Fleet Board', {
    pool: 'TinkerBox', classification: 'assigned', status: 'Live',
    documentation: { status: 'In development', publication: 'unpublished' },
    visibility: unpublishedDocumentation, sources: ['web/fleet/index.html', 'web/board/index.html', PLAN],
  }),
  project('ai-research', 'AI Research', {
    pool: 'Artificial Self', classification: 'assigned', visibility: publicShell,
    sources: ['web/ai-research/index.html', MASTER],
  }),
  project('library', 'Library', {
    pool: 'AI-d kit', classification: 'assigned', status: 'Live',
    visibility: { ...publicShell, access: 'mixed', publicSurface: 'public-reference-only' },
    relationships: [{ type: 'folds-into', pool: 'AI-d kit', role: 'search' }],
    sources: ['web/library/index.html', 'web/library/rag.html', MASTER],
  }),
  project('chair-or-ladder', 'Chair or a Ladder', {
    pool: 'My Story', classification: 'assigned', status: 'Live', visibility: publicShell,
    relationships: [{ type: 'optional-tree-context' }], sources: ['web/chair-or-ladder/index.html', MASTER],
  }),
  project('life-in-time', 'Life in Time', {
    pool: 'My Story', classification: 'assigned', status: 'Live', visibility: publicShell,
    relationships: [{ type: 'optional-tree-context' }], sources: ['web/life-in-time/index.html', MASTER],
  }),
  project('power-law-odyssey', 'Power Law Odyssey', {
    pool: 'My Story', classification: 'assigned', status: 'In development', visibility: publicShell,
    relationships: [{ type: 'optional-tree-context' }], sources: ['web/power-law-odyssey/index.html', MASTER],
  }),
  project('we-are-the-training-data', 'We Are The Training Data', {
    pool: 'My Story', classification: 'assigned', status: 'In development',
    visibility: { ...publicShell, navigation: 'unlisted', search: 'excluded', indexing: 'noindex' },
    relationships: [{ type: 'optional-tree-context', role: 'default-narrated-poem' }],
    sources: ['web/we-are-the-training-data/index.html', MASTER],
  }),
  project('manifesto-newborn', 'Manifesto for a Newborn', {
    pool: 'GrowingApp', classification: 'assigned', status: 'Live', visibility: publicShell,
    relationships: [{ type: 'optional-introduction', pool: 'GrowingApp' }, { type: 'reference', pool: 'My Story' }],
    sources: ['web/manifesto-newborn/index.html', MASTER],
  }),
  project('dyslexia', 'Dyslexia Reading Platform', {
    pool: 'Health', classification: 'assigned', status: 'Live', visibility: publicShell, sources: ['index.html', PLAN],
    implementationUrl: 'https://chloe.blumenkraft.cloud/dyslexia/',
  }),
  project('audiobook', 'Audiobook Studio', {
    pool: 'Health', classification: 'assigned', status: 'Live', visibility: publicShell, sources: ['index.html', PLAN],
    implementationUrl: 'https://chloe.blumenkraft.cloud/audiobook/',
  }),
  project('lobester-gym', 'Lobester Gym', { pool: 'GrowingApp', classification: 'assigned', status: 'In development', visibility: publicShell, sources: ['web/lobester-gym/index.html', SETTLED] }),
  project('womens-health-os', 'Women’s Health OS', { pool: 'Health', classification: 'assigned', status: 'In development', aliases: ['Women’s Health'], visibility: publicShell, sources: ['web/womens-health-os/index.html', SETTLED] }),
  project('hypertrophyos', 'Hyper Trophy OS', { visibility: publicShell, sources: ['web/hypertrophyos/index.html', PLAN] }),
  project('gym-scholar', 'Gym Scholar', {
    pool: 'Health', classification: 'assigned', status: 'Live', visibility: publicShell, sources: [MASTER],
  }),
  project('avatar-playground', 'Avatar Playground', { pool: 'TinkerBox', classification: 'assigned', status: 'Live', aliases: ['Voice Playground'], visibility: publicShell, sources: ['web/avatar-playground/index.html', MASTER] }),
  project('calendar', 'Calendar Generator', { pool: 'TinkerBox', classification: 'assigned', status: 'In development', visibility: publicShell, sources: ['web/calendar/index.html', MASTER] }),
  project('council', 'Public round-table council', { pool: 'AI-d kit', classification: 'assigned', status: 'Live', aliases: ['Councils'], visibility: publicShell, sources: ['web/council/index.html', MASTER] }),
  project('explore', 'Explore Repos', {
    pool: 'AI-d kit', classification: 'assigned', status: 'Live', visibility: publicShell,
    modes: ['solution', 'category', 'shelf', 'graphified', 'capability-cards', 'index-search'],
    relationships: [{ type: 'incorporates', route: '/web/code-search/' }, { type: 'incorporates', route: '/web/repos/' }],
    sources: ['web/explore/index.html', 'web/code-search/index.html', 'web/repos/index.html', MASTER],
  }),
  project('kids-movie-library', 'Kids Library', {
    pool: 'GrowingApp', classification: 'assigned', status: 'In development', visibility: publicShell,
    sections: [{ id: 'movies', name: 'Movies' }, { id: 'books', name: 'Books' }],
    sources: ['movies/index.html', 'web/kids-movie-library/index.html', PLAN],
  }),
  project('m-popova', 'Poetry Space', {
    pool: 'Design Gallery', classification: 'assigned', status: 'Live', visibility: publicShell, attribution: 'Poetry by Maria Popova.', sources: ['web/m-popova/index.html', MASTER],
  }),
  project('open-dashboard', 'Open Dashboard', { pool: 'AI-d kit', classification: 'assigned', status: 'Live', visibility: publicShell, sources: ['web/open-dashboard/index.html', MASTER] }),
  project('rubiks-teacher', 'Rubik’s Teacher', { pool: 'GrowingApp', classification: 'assigned', status: 'Live', visibility: publicShell, sources: ['web/rubiks-teacher/index.html', MASTER] }),
  project('chloe-pwa', 'Chloé PWA', { pool: 'TinkerBox', classification: 'assigned', status: 'In development', visibility: unpublishedDocumentation, sources: ['web/chloe-pwa/index.html', MASTER] }),
  project('chloe-desktop', 'Chloé desktop', { pool: 'TinkerBox', classification: 'assigned', status: 'In development', visibility: unpublishedDocumentation, sources: [MASTER] }),
  project('upload', 'Knowledge Ingest', {
    disposition: 'kept', repair: 'repair-needed',
    visibility: { ...internalDocumentation, access: 'private', accessGate: 'required', enforcement: 'unverified' },
    readiness: { entryEnabled: false, presentation: 'repair-needed', review: 'pending', reason: 'Kept; repair and access enforcement verification required.' },
    sources: ['web/upload/index.html', SETTLED],
  }),
  project('item-icon-generator', 'Item Icon Generator', { pool: 'TinkerBox', classification: 'assigned', status: 'In development', aliases: ['Runware Item Icon Generator'], visibility: publicShell, sources: ['frontend/index.html', MASTER] }),
  project('flowform', 'FlowForm', { pool: 'Health', classification: 'assigned', status: 'In development', visibility: publicShell, canonicalUrl: 'https://flowform.sdforest.site', sources: ['index.html', MASTER] }),
  project('velune', 'Velune', {
    pool: 'TinkerBox', classification: 'assigned', status: 'Live', visibility: publicShell,
    attribution: { type: 'fork', names: ['nikhilvishwakarma00'], changeDescription: 'Ivan’s audio-only YouTube path with no video.' },
  }),
  project('anycloudllm', 'AnyCloudLLM', { pool: 'AI-d kit', classification: 'assigned', status: 'In development', visibility: publicShell }),
];

function owner(id, routes, options = {}) {
  const { projectId, catalogEntityId, ...metadata } = options;
  const target = catalogEntityId || projectId || id;
  const record = [...projectRecords, ...CATALOG_NON_PROJECTS, ...POOL_CATALOG].find((entry) => entry.id === target);
  if (!record) throw new Error(`Unknown catalog entity for route owner ${id}: ${target}`);
  return {
    id, catalogEntityId: record.id, ...(record.kind === 'project' ? { projectId: record.id } : {}),
    publicName: record.publicName, status: record.status ?? null,
    role: record.kind, routes, redirectSources: [], visibility: record.visibility,
    ...metadata,
  };
}

// Owners preserve all copied HTML and configured redirect families. These are
// declarations for validation; route delivery/host rules live in the registry.
export const ROUTE_OWNERS = deepFreeze([
  owner('forest-hub', ['/'], { role: 'site' }),
  owner('pool-growingapp', ['/web/pools/growingapp/'], { catalogEntityId: 'growingapp', visibility: { ...publicShell, publicSurface: 'pool' } }),
  owner('pool-ai-d-kit', ['/web/pools/ai-d-kit/'], { catalogEntityId: 'ai-d-kit', visibility: { ...publicShell, publicSurface: 'pool' } }),
  owner('pool-tinkerbox', ['/web/pools/tinkerbox/'], { catalogEntityId: 'tinkerbox', visibility: { ...publicShell, publicSurface: 'pool' } }),
  owner('pool-health', ['/web/pools/health/'], { catalogEntityId: 'health', visibility: { ...publicShell, publicSurface: 'pool' } }),
  owner('pool-design-gallery', ['/web/pools/design-gallery/'], { catalogEntityId: 'design-gallery', visibility: { ...publicShell, publicSurface: 'pool' } }),
  owner('pool-artificial-self', ['/web/pools/artificial-self/'], { catalogEntityId: 'artificial-self', visibility: { ...publicShell, publicSurface: 'pool' } }),
  owner('pool-my-story', ['/web/pools/my-story/'], { catalogEntityId: 'my-story', visibility: { ...publicShell, publicSurface: 'pool' } }),
  owner('morning-news', ['/web/morning-news/', '/series/', '/series/dependency-map/'], {
    redirectSources: ['/web/morning-news', '/web/morning-news/', '/series', '/series/', '/series/dependency-map/', '/series/dependency-map'],
  }),
  owner('mendeleev', ['/web/mendeleev-bg/']),
  owner('math-forest', ['/web/math-forest/', '/web/math-mania/']),
  owner('replicator-void', ['/web/replicator-void/']),
  owner('c2c-dolphin', ['/web/c2c-dolphin/']),
  owner('c2c-self', ['/web/c2c-self/']),
  owner('fleet-board', ['/web/fleet/', '/web/board/'], { role: 'internal' }),
  owner('ai-research', ['/web/ai-research/']),
  owner('library', ['/web/library/', '/web/library/glossary/', '/web/library/platform/'], { visibility: { ...publicShell, publicSurface: 'public-reference-only' } }),
  owner('library-workspace', ['/web/library/rag.html'], { projectId: 'library', role: 'child' }),
  owner('library-repos', ['/web/library/repos/'], { projectId: 'library', role: 'child', visibility: { ...internalDocumentation, indexing: 'unspecified' } }),
  owner('library-memory', ['/web/library/general/', '/web/library/memory/'], { projectId: 'library', role: 'internal', visibility: { ...internalDocumentation, indexing: 'unspecified' } }),
  owner('library-chloe', ['/web/library/chloe/'], { projectId: 'library', role: 'internal', visibility: { ...internalDocumentation, indexing: 'unspecified' } }),
  owner('ai-init', ['/web/ai-init/'], { catalogEntityId: 'library', role: 'legacy', visibility: compatibility, redirectSources: ['/web/ai-init', '/web/ai-init/'] }),
  owner('ai-init-embed', ['/web/ai-init/embed/'], { catalogEntityId: 'library', role: 'embed', visibility: { ...publicShell, navigation: 'unlisted' } }),
  owner('llm-db', ['/web/llm-db/'], { projectId: 'library', role: 'legacy', visibility: compatibility, redirectSources: ['/web/llm-db/', '/web/llm-db/:path*/', '/web/llm-db/:path*'] }),
  owner('evolution', ['/web/evolution/'], { catalogEntityId: 'website-history', role: 'historical-material' }),
  owner('chair-or-ladder', ['/web/chair-or-ladder/'], { role: 'context' }),
  owner('life-in-time', ['/web/life-in-time/'], { role: 'context' }),
  owner('power-law-odyssey', ['/web/power-law-odyssey/'], { role: 'context' }),
  owner('we-are-the-training-data', ['/web/we-are-the-training-data/'], { role: 'context' }),
  owner('manifesto-newborn', [
    '/web/manifesto-newborn/', '/web/manifesto-newborn/bg/', '/web/manifesto-newborn/de/',
    '/web/manifesto-newborn/es/', '/web/manifesto-newborn/fr/', '/web/manifesto-newborn/it/',
    '/web/manifesto-newborn/mk/', '/web/manifesto-newborn/pt/', '/web/manifesto-newborn/ru/',
    '/web/manifesto-newborn/zh/',
  ], { role: 'context' }),
  owner('vfx-portfolio', ['/web/vfx-portfolio/'], { role: 'portfolio' }),
  owner('lobester-gym', ['/web/lobester-gym/']),
  owner('womens-health-os', ['/web/womens-health-os/']),
  owner('hypertrophyos', ['/web/hypertrophyos/']),
  owner('avatar-playground', ['/web/avatar-playground/']),
  owner('calendar', ['/web/calendar/', '/calendar/', '/calendar/calendario.html']),
  owner('council', ['/web/council/', '/web/council/byok/', '/web/council/inner/', '/web/council/tinylm/']),
  owner('tinylm', ['/web/tinylm/'], { projectId: 'council', role: 'legacy', visibility: compatibility, redirectSources: ['/web/tinylm', '/web/tinylm/'] }),
  owner('explore', ['/web/explore/']),
  owner('code-search', ['/web/code-search/'], { projectId: 'explore', role: 'legacy' }),
  owner('repos', ['/web/repos/'], { projectId: 'explore', role: 'legacy', visibility: { ...publicShell, navigation: 'unlisted', indexing: 'noindex' } }),
  owner('gallery', ['/web/gallery/']),
  owner('kids', ['/web/kids/']),
  owner('kids-movie-library', ['/web/kids-movie-library/', '/movies/']),
  owner('m-popova', ['/web/m-popova/']),
  owner('open-dashboard', ['/web/open-dashboard/', '/web/open-dashboard/github/', '/web/open-dashboard/mcp/']),
  owner('open-dashboard-notices', ['/web/open-dashboard/openrouter/', '/web/open-dashboard/catalogues/', '/web/open-dashboard/matrix/'], { projectId: 'open-dashboard', role: 'child', visibility: compatibility }),
  owner('open-overview', ['/web/open-overview/'], {
    projectId: 'open-dashboard', role: 'legacy', visibility: compatibility,
    redirectSources: [
      '/web/open-overview', '/web/open-overview/',
      '/web/open-overview/open-overview.js', '/web/open-overview/open-overview.css',
      '/web/open-overview/open-overview-api.js', '/web/open-overview/open-overview-charts.js',
      '/web/open-overview/open-overview-schema.js', '/web/open-overview/open-overview-three.js',
      '/web/open-overview/mcp/', '/web/open-overview/openrouter/', '/web/open-overview/github/',
      '/web/open-overview/catalogues/', '/web/open-overview/:path*/', '/web/open-overview/:path*',
    ],
  }),
  owner('rubiks-teacher', ['/web/rubiks-teacher/']),
  owner('voice-playground', ['/web/voice-playground/'], { catalogEntityId: 'avatar-playground', role: 'absorbed', visibility: { ...publicShell, access: 'mixed' } }),
  owner('chloe-pwa', ['/web/chloe-pwa/'], { role: 'internal' }),
  owner('upload', ['/web/upload/'], { role: 'internal' }),
  owner('item-icon-generator', ['/frontend/']),
]);

// Bind every project explicitly. Shared pool fragments are catalog entries, not
// claims that a standalone application route exists or has passed flow review.
export const PROJECT_CATALOG = deepFreeze(projectRecords.map((record) => {
  const routes = ROUTE_OWNERS.filter(({ catalogEntityId }) => catalogEntityId === record.id)
    .flatMap(({ routes }) => routes).map((route) => ({ type: 'local', route }));
  if (record.canonicalUrl) routes.unshift({ type: 'external', url: record.canonicalUrl });
  if (routes.length === 0) {
    const pool = POOL_CATALOG.find(({ publicName }) => publicName === record.pool);
    if (!pool) throw new Error(`Project ${record.id} has neither a route nor a settled pool binding.`);
    routes.push({ type: 'shared-pool-tab', route: `${pool.route}#${record.id}` });
  }
  // An observed implementation augments the pool entry without certifying its flow.
  if (record.implementationUrl) routes.push({ type: 'external', url: record.implementationUrl });
  return { ...record, routeBindings: routes };
}));

export const CATALOG_ENTITIES = deepFreeze([
  ...PROJECT_CATALOG, ...POOL_CATALOG, ...CATALOG_NON_PROJECTS,
]);

// Membership projection deliberately retains In development, internal/unlisted,
// and unverified-date records. Consumers must honor each record's visibility.
export const POOL_LISTING_PROJECTS = deepFreeze(PROJECT_CATALOG.filter(({ pool }) => POOL_NAMES.includes(pool)));

/** Detached immutable membership data; this does not certify public-card readiness. */
export function getPoolProjects(poolName) {
  return deepFreeze(JSON.parse(JSON.stringify(POOL_LISTING_PROJECTS.filter(({ pool }) => pool === poolName))));
}

function finding(projectId, field, question, options, reason, extra = {}) {
  const record = PROJECT_CATALOG.find(({ id }) => id === projectId);
  return {
    findingId: `${projectId}.${field}`, projectId, pool: record.pool, field, status: '[OPEN]',
    question, options, reason, costToReverse: 'medium', sources: record.sources,
    ...extra,
  };
}

const dateReasons = {
  mendeleev: 'The 2026-09-03 change renames navigation. Commit 5313801 changes hover behavior, with author date 2026-07-29 and rebased committer date 2026-08-09; update significance needs semantic review.',
  'c2c-dolphin': 'The 2026-07-20 badge dates the study, not its last meaningful update. Later navigation changes do not establish a research update.',
  'c2c-self': 'The 2026-07-20 badge dates the study, not its last meaningful update. Later navigation changes do not establish a research update.',
  'replicator-void': 'The 2026-09-03 Open Dashboard rename only changes navigation references; it is not verified evidence of a simulation update.',
};

export const CATALOG_FINDINGS = deepFreeze([
  finding('ai-research', 'displayNaming', 'Artificial Self / AI Research pool-vs-project naming',
    ['Keep Artificial Self as the pool and AI Research as its project', 'Rename the pool display label to AI Research and choose a distinct project display label'],
    'Canonical membership remains Artificial Self until the pool/project naming decision is settled.', { costToReverse: 'high' }),
  finding('council', 'crossover', 'Public round-table council crossover membership',
    ['Keep AI-d kit membership and add contextual cross-links from relevant pools', 'Introduce a reviewed crossover display model while retaining a single primary AI-d kit membership'],
    'Crossovers affect navigation, ownership, and future catalog consumers; no second membership is approved.', { costToReverse: 'high' }),
  finding('c2c-dolphin', 'publication', 'C2C research publication/rederivation',
    ['Publish the preserved archives with interpretations explicitly unverified', 'Rederive measurements and review claims before publishing research conclusions'],
    'The self-mirror control relationship is settled; archive conclusions still require rederivation.', { costToReverse: 'high' }),
  ...PROJECT_CATALOG.flatMap((record) => [
    ...(record.classification === 'unresolved' ? [finding(record.id, 'pool',
      `What approved pool or outside-pool role belongs to ${record.publicName}?`,
      ['Assign one canonical pool after review', 'Keep as a companion, reference or outside-pool item'],
      'Current directory groups, labels and subject matter do not approve canonical membership.',
      { costToReverse: 'high' })] : []),
    ...(record.status === null ? [finding(record.id, 'status',
      `Which lifecycle value is supported for ${record.publicName}?`,
      ['Verify a value from the four approved lifecycle statuses', 'Keep the lifecycle unassigned until evidence exists'],
      'A copied page, homepage badge or service link does not establish an approved lifecycle.')] : []),
    finding(record.id, 'lastMeaningfullyUpdated',
      `What is the last meaningful content, functional, evidence or design update to ${record.publicName}?`,
      ['Audit source history and record an actual meaningful change with provenance', 'Keep the date null and exclude the public card until verified'],
      dateReasons[record.id] || 'No reviewed meaningful-update provenance is established in this task; build time and automated refreshes are not project updates.',
      { semanticReviewRequired: true }),
  ]),
  finding('kids-movie-library', 'identity', 'Which movie implementation is canonical, and how will the other retain content and user state?',
    ['Keep both implementations as named companions', 'Reconcile content and state before selecting one canonical implementation'],
    'Both movies/index.html and web/kids-movie-library/index.html contain substantive catalogs; neither is merely a redirect.', { costToReverse: 'high' }),
  finding('hypertrophyos', 'identity', 'Is Hyper Trophy OS Gym Scholar, its predecessor, or a distinct companion?',
    ['Confirm one identity with migration evidence', 'Keep separate identities and explicit relationship'],
    'Gym Scholar leads Health, but that decision does not identify or classify the existing training route.', { costToReverse: 'high' }),
  finding('library', 'visibility', 'Which Library sources are public, and which personal surfaces require an internal boundary?',
    ['Integrate only verified public references into AI-d kit search', 'Keep personal memory and repository workspaces separately authorized'],
    'Library links public references and personal surfaces; password UI and noindex do not establish enforced access.', { costToReverse: 'high' }),
  finding('upload', 'accessEnforcement', 'Which verified access gate will protect the kept Knowledge Ingest tool?',
    ['Repair the existing private workflow behind verified authentication', 'Keep entry disabled until a verified internal access gate is available'],
    'Kept and repair-needed are settled; private/unlisted catalog metadata does not enforce access.', { costToReverse: 'high' }),
  ...['dyslexia', 'audiobook'].map((id) => finding(id, 'routeEvidence',
    `What verified public route and fallback support ${PROJECT_CATALOG.find((record) => record.id === id).publicName}?`,
    ['Verify the existing public handoff and independent fallback', 'Keep the candidate unpromoted until route and service evidence exist'],
    'Only a homepage handoff is observed here; no copied local application or verified end-to-end route is established.')),
  ...['c2c-dolphin', 'c2c-self'].map((id) => finding(id, 'evidenceLevel',
    'Which published C2C measurements and interpretations survive rederivation?',
    ['Rederive and review reproducible findings', 'Retain the transcript archive with unverified interpretations identified'],
    'Research status and preserved transcripts do not validate the published measurements.', { costToReverse: 'high' })),
  ...['lobester-gym', 'womens-health-os', 'dyslexia', 'hypertrophyos'].map((id) => finding(id, 'evidenceLevel',
    `What peer-reviewed evidence supports the precise claims made by ${PROJECT_CATALOG.find((record) => record.id === id).publicName}?`,
    ['Review ingested evidence against a defined claim scope', 'Narrow or withhold unsupported claims while review remains open'],
    'Page descriptions and paper-count badges are not claim-level evidence review.', { costToReverse: 'high' })),
]);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Pure card boundary, also usable with review fixtures before real data is ready. */
export function isPublicCardProject(record) {
  if (!isRecord(record)) return false;
  const { updateProvenance, readiness, evidenceLevel, visibility } = record;
  return record.provisional === false && hasText(record.id) && hasText(record.publicName) &&
    POOL_NAMES.includes(record.pool) && PROJECT_STATUSES.includes(record.status) &&
    Array.isArray(record.metrics) && isIsoDate(record.lastMeaningfullyUpdated) &&
    isRecord(updateProvenance) && hasText(updateProvenance.source) && updateProvenance.semanticReviewRequired === false &&
    isRecord(readiness) && readiness.review === 'verified' &&
    typeof readiness.entryEnabled === 'boolean' && hasText(readiness.presentation) &&
    isRecord(evidenceLevel) && hasText(evidenceLevel.level) && evidenceLevel.review === 'verified' &&
    Array.isArray(evidenceLevel.sources) && evidenceLevel.sources.length > 0 && evidenceLevel.sources.every(hasText) &&
    isRecord(visibility) && visibility.access === 'public' && visibility.publicSurface === 'project' &&
    hasText(visibility.navigation) && !['unlisted', 'excluded'].includes(visibility.navigation) &&
    hasText(visibility.search) && hasText(visibility.indexing);
}

// Real records remain excluded until their update, readiness and evidence are reviewed.
export const PUBLIC_CARD_PROJECTS = deepFreeze(PROJECT_CATALOG.filter(isPublicCardProject));

/** A detached, deeply frozen, JSON-safe value; never a presentation instruction. */
export function getCatalogSnapshot() {
  return deepFreeze(JSON.parse(JSON.stringify({
    pools: POOL_NAMES, poolCatalog: POOL_CATALOG, statuses: PROJECT_STATUSES, projects: PROJECT_CATALOG,
    entities: CATALOG_ENTITIES, nonProjects: CATALOG_NON_PROJECTS,
    designGallerySubcategories: DESIGN_GALLERY_SUBCATEGORIES, poolListingProjects: POOL_LISTING_PROJECTS,
    publicCardProjects: PUBLIC_CARD_PROJECTS, routeOwners: ROUTE_OWNERS, findings: CATALOG_FINDINGS,
  })));
}
