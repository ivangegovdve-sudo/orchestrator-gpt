// Factual catalog boundary, independent of homepage curation and Forest Trails.
// Current interview authority: docs/sdforest-settled-structure.md.
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

const SETTLED = 'docs/sdforest-settled-structure.md';
// Compatibility names for source references now all resolve to tracked authority.
const PLAN = SETTLED;
const MASTER = SETTLED;
export const POOL_CATALOG = deepFreeze([
  ['growingapp', 'GrowingApp', 'Learning, family tools, and growing together.', {
    purpose: 'A playful family-and-learning workspace for practice, curiosity, and growing together.',
    why: 'It gathers tools that turn everyday learning and family questions into something people can try.',
    startHere: [
      { projectId: 'rubiks-teacher', reason: 'A live practice tool for a focused first step.' },
      { projectId: 'mendeleev', reason: 'A live science-learning entry.' },
      { projectId: 'math-forest', reason: 'The two maths companions share one catalog entry.' },
    ],
  }],
  ['ai-d-kit', 'AI-d kit', 'Tools for finding, understanding, and working with AI.', {
    purpose: 'A search-first workbench for finding, understanding, and working with AI.',
    why: 'It puts glossary, repositories, tools, and a live publication in one place so a visitor can begin with a blocker.',
    startHere: [
      { projectId: 'open-dashboard', reason: 'A live tool-oriented entry into the workbench.' },
      { projectId: 'explore', reason: 'The repository search modes start with a solution.' },
      { projectId: 'morning-news', reason: 'The Drop is the headline publication and remains a standalone platform.' },
    ],
  }],
  ['tinkerbox', 'TinkerBox', 'Playgrounds, practical experiments, and personal tools.', {
    purpose: 'A quiet workbench for useful personal tools, playgrounds, and experiments.',
    why: 'It gives hands-on tools a home, including the public round-table council shared with AI-d kit.',
    startHere: [
      { projectId: 'avatar-playground', reason: 'A live playground for an immediate hands-on start.' },
      { projectId: 'velune', reason: 'A live fork with its upstream credit and Ivan’s audio-only change.' },
      { projectId: 'council', reason: 'The shared council is available here as a practical tool.' },
    ],
  }],
  ['health', 'Health', 'Health, reading, movement, and wellbeing projects.', {
    purpose: 'A precise clinic for movement, reading, listening, and wellbeing tools.',
    why: 'It keeps projects first while evidence and scrutiny stay proportional to each project’s claims.',
    startHere: [
      { projectId: 'gym-scholar', reason: 'The most finished health entry leads the pool.' },
      { projectId: 'dyslexia', reason: 'A live reading-accessibility implementation; its evidence belongs with the project.' },
      { projectId: 'audiobook', reason: 'The companion live listening implementation remains visible beside reading.' },
    ],
  }],
  ['design-gallery', 'Design Gallery', 'Game design, web design, and website history.', {
    purpose: 'A museum-like gallery for game design, web design, and website history.',
    why: 'It preserves finished exhibits and unfinished experiments as part of the work’s history, while animation and VFX remain in Portfolio.',
    startHere: [
      { projectId: 'm-popova', reason: 'A live exhibit gives the gallery an immediate first room.' },
      { projectId: 'replicator-void', reason: 'A Coming Soon game-design piece shows where the gallery is still forming.' },
    ],
  }],
  ['artificial-self', 'Artificial Self', 'AI research and conversation archives.', {
    purpose: 'A speculative lab for AI research and model-conversation archives.',
    why: 'It separates observed transcripts from claims that still require rederivation.',
    startHere: [
      { projectId: 'ai-research', reason: 'The research component names the pool’s scientific work.' },
      { projectId: 'c2c-dolphin', reason: 'The cross-model archive is a research record, not a verified conclusion.' },
      { projectId: 'c2c-self', reason: 'The distinct identical-model self-mirror archive keeps its evidence boundary visible.' },
    ],
  }],
  ['my-story', 'My Story', 'Personal stories, reflections, and creative work.', {
    purpose: 'A narrative-first path through personal work, its unfinished states, and the choices that produced it.',
    why: 'It connects personal context and selected work without turning the story into a catalogue of successes.',
    startHere: [
      { projectId: 'chair-or-ladder', reason: 'A live but unfinished piece opens the personal arc.' },
      { projectId: 'life-in-time', reason: 'A live piece whose complete redesign is part of the story.' },
      { projectId: 'we-are-the-training-data', reason: 'The narrated word poem is the default introductory context entry.' },
    ],
  }],
].map(([id, publicName, summary, visitorGuide]) => ({
  id, kind: 'pool', publicName, summary, state: 'Live', entryEnabled: true,
  visitorGuide,
  route: `/web/pools/${id}/`, sources: [SETTLED],
  ...(id === 'my-story' ? {
    pageMode: 'narrative-first',
    narrative: {
      state: 'content-required',
      intent: 'A short personal narrative carries this page, with timeline fragments and selected project or evidence windows.',
      availability: 'The personal narrative has not yet been provided for this page.',
    },
    relatedLinks: [{ projectId: 'manifesto-newborn', publicName: 'Manifesto for a Newborn', route: '/web/manifesto-newborn/', attribution: 'Ivan-authored content' }],
  } : {}),
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
  access: 'public', publicSurface: 'excluded',
};

export const DESIGN_GALLERY_SUBCATEGORIES = deepFreeze([
  { id: 'game-design', name: 'Game Design', material: [] },
  { id: 'web-design', name: 'Web Design', aliases: ['Web Design Gallery'], material: [] },
  { id: 'website-history', name: 'Website History', state: 'Live', material: ['Evolution', 'Poetry Space'] },
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
      : { ...compatibility, publicSurface: 'excluded' },
    sources: [SETTLED],
  })),
]);

function project(id, publicName, facts) {
  const sources = [...new Set([...(facts.sources || [MASTER]), SETTLED])];
  const pools = facts.pools ?? (facts.pool ? [facts.pool] : []);
  return {
    id, kind: 'project', publicName, pool: null, classification: 'unresolved', outsidePoolRole: null,
    pools,
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

// Null pool + unresolved classification retains a required reconciliation gap.
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
      { type: 'companion', name: 'Math Forest', route: '/web/math-forest/', presentationNote: 'Math Forest currently shows a rebuild placeholder.' },
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
    relationship: { type: 'self-mirror-control', projectId: 'c2c-dolphin', modelConfiguration: 'identical-model', controlRole: 'structural-interpretation', description: 'A distinct identical-model self-mirror experiment; its control role relative to C2C Dolphin is a structural interpretation.' },
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
    pool: 'Artificial Self', pools: ['Artificial Self'], classification: 'assigned', contentRole: 'research', status: 'Research', visibility: publicShell,
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
    requiredWork: [{ type: 'recording', description: 'Ivan must make a proper recording for speech-to-speech with Chloé’s voice.' }],
    relationships: [{ type: 'optional-tree-context' }], sources: ['web/chair-or-ladder/index.html', MASTER],
  }),
  project('life-in-time', 'Life in Time', {
    pool: 'My Story', classification: 'assigned', status: 'Live', visibility: publicShell,
    requiredWork: [{ type: 'redesign', description: 'Needs a complete redesign.' }],
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
    unification: { direction: 'one-platform', projectIds: ['dyslexia', 'audiobook'], currentPresentation: 'separate-tabs-and-implementations', state: 'not-yet-merged' },
  }),
  project('audiobook', 'Audiobook Studio', {
    pool: 'Health', classification: 'assigned', status: 'Live', visibility: publicShell, sources: ['index.html', PLAN],
    implementationUrl: 'https://chloe.blumenkraft.cloud/audiobook/',
    unification: { direction: 'one-platform', projectIds: ['dyslexia', 'audiobook'], currentPresentation: 'separate-tabs-and-implementations', state: 'not-yet-merged' },
  }),
  project('lobester-gym', 'Lobester Gym', { pool: 'GrowingApp', classification: 'assigned', status: 'In development', identity: { purpose: 'ADHD brain-exercise app', distinctFrom: 'gym-scholar' }, visibility: publicShell, sources: ['web/lobester-gym/index.html', SETTLED] }),
  project('womens-health-os', 'Women’s Health OS', { pool: 'Health', classification: 'assigned', status: 'In development', aliases: ['Women’s Health'], visibility: publicShell, sources: ['web/womens-health-os/index.html', SETTLED] }),
  project('hypertrophyos', 'Hyper Trophy OS', { visibility: publicShell, sources: ['web/hypertrophyos/index.html', PLAN] }),
  project('gym-scholar', 'Gym Scholar', {
    pool: 'Health', classification: 'assigned', status: 'Live', visibility: publicShell, sources: [MASTER],
  }),
  project('avatar-playground', 'Avatar Playground', { pool: 'TinkerBox', classification: 'assigned', status: 'Live', aliases: ['Voice Playground'], visibility: publicShell, sources: ['web/avatar-playground/index.html', MASTER] }),
  project('calendar', 'Calendar Generator', { pool: 'TinkerBox', classification: 'assigned', status: 'In development', visibility: publicShell, sources: ['web/calendar/index.html', MASTER] }),
  project('council', 'Public round-table council', {
    pool: 'AI-d kit', pools: ['AI-d kit', 'TinkerBox'], classification: 'assigned', status: 'Live',
    aliases: ['Councils'], contentRole: 'council', visibility: publicShell,
    membershipNote: 'Shared member of AI-d kit and TinkerBox by settled decision on 2026-09-20.',
    sources: ['web/council/index.html', MASTER],
  }),
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
  project('rubiks-teacher', 'Rubik’s Teacher', {
    pool: 'GrowingApp', classification: 'assigned', status: 'Live', visibility: publicShell,
    projectPage: {
      problem: 'Cubeflow scans, validates, solves, and teaches every Rubik’s Cube turn.',
      nextOrStopped: 'Independent review must settle PWA installability without breaking Chloé’s offline shell; the lazy lesson bundles still need to be included in the first offline path.',
    },
    sources: ['web/rubiks-teacher/index.html', MASTER],
  }),
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
  // Settled exclusion: retain the catalog record and pool relationship for
  // reconciliation, but publish it on no public surface until ready.
  project('anycloudllm', 'AnyCloudLLM', { pool: 'AI-d kit', classification: 'assigned', status: 'In development', visibility: compatibility }),
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
  owner('library-repos', ['/web/library/repos/'], { projectId: 'library', role: 'child', visibility: internalDocumentation }),
  owner('library-memory', ['/web/library/general/', '/web/library/memory/'], { projectId: 'library', role: 'internal', visibility: internalDocumentation }),
  owner('library-chloe', ['/web/library/chloe/'], { projectId: 'library', role: 'internal', visibility: internalDocumentation }),
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
  owner('voice-playground', ['/web/voice-playground/'], { catalogEntityId: 'avatar-playground', role: 'absorbed', visibility: compatibility }),
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

// The story surfaces are deliberately a set of traversable peers, not a
// newly-decided linear sequence. Each entry resolves to a catalog entity while
// the shared presenter supplies the links on all three pages.
export const NARRATIVE_SPINE = deepFreeze([
  { id: 'my-story', catalogEntityId: 'my-story', publicName: 'My Story', route: '/web/pools/my-story/' },
  { id: 'manifesto-newborn', catalogEntityId: 'manifesto-newborn', publicName: 'Manifesto for a Newborn', route: '/web/manifesto-newborn/' },
  { id: 'website-history', catalogEntityId: 'evolution', publicName: 'Website History', route: '/web/evolution/' },
]);

// Membership projection deliberately retains In development, internal/unlisted,
// and unverified-date records, but excludes records explicitly removed from all
// public surfaces. Their catalog records and route bindings remain authoritative.
export const POOL_LISTING_PROJECTS = deepFreeze(PROJECT_CATALOG.filter(({ pools, visibility }) =>
  visibility?.publicSurface !== 'excluded'
    && Array.isArray(pools) && pools.some((pool) => POOL_NAMES.includes(pool))));

/** Detached immutable membership data; this does not certify public-card readiness. */
export function getPoolProjects(poolName) {
  return deepFreeze(JSON.parse(JSON.stringify(POOL_LISTING_PROJECTS.filter(({ pools }) => pools.includes(poolName)))));
}

function finding(projectId, field, question, options, reason, extra = {}) {
  const record = PROJECT_CATALOG.find(({ id }) => id === projectId);
  return {
    findingId: `${projectId}.${field}`, projectId, pool: record.pool, field, status: 'required',
    kind: ['lastMeaningfullyUpdated', 'evidenceLevel', 'routeEvidence', 'accessEnforcement'].includes(field) ? 'evidence-required' : 'reconciliation-required',
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

export const CATALOG_OPEN_QUESTIONS = deepFreeze([]);

export const CATALOG_RESOLUTIONS = deepFreeze([
  {
    resolutionId: 'ai-research.naming', projectId: 'ai-research', status: 'resolved',
    question: 'Which name belongs to the pool and which belongs to its research section?',
    outcome: 'Artificial Self is the pool. AI Research is the research part of that pool, separate from its experiment/archive material.',
    evidence: 'Settled decision recorded on 2026-09-20.',
    history: { date: '2026-09-20' },
    sources: [SETTLED],
  },
  {
    resolutionId: 'council.crossover', projectId: 'council', status: 'resolved',
    question: 'Should the public round-table council appear in more than one pool?',
    outcome: 'Yes. The public round-table council appears in both AI-d kit and TinkerBox.',
    evidence: 'Settled decision recorded on 2026-09-20.',
    history: { date: '2026-09-20' },
    sources: [SETTLED, 'web/council/index.html'],
  },
  {
    resolutionId: 'c2c-self.identity', projectId: 'c2c-self', status: 'resolved',
    question: 'Is C2C Self another name for C2C Dolphin or a different experiment?',
    outcome: 'C2C Self is an identical-model self-mirror experiment, distinct from cross-model C2C Dolphin.',
    evidence: 'Separate pages identify identical model A/B mirror instances versus two different models, respectively. Both routes were added in the same historical commit.',
    history: { commit: 'edef7874d4e2a84f32bc2abc0fbc43a06c66f83b', date: '2026-08-03' },
    interpretation: 'Calling the self-mirror experiment a control is a structural interpretation, not a verified experimental outcome.',
    limit: 'No research outcomes are validated by this identity resolution. Profiles, partner effects, archetype convergence and any Qwen initiator effect require artifact-backed rederivation.',
    sources: [SETTLED, 'web/c2c-self/index.html', 'web/c2c-dolphin/index.html'],
  },
]);

export const CATALOG_REQUIREMENTS = deepFreeze([
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
    ['Recover experiment artifacts and rederive the measurements', 'Keep conclusions withheld while the required rederivation is incomplete'],
    'Rederivation is mandatory before publishing research findings; preserved transcripts and identity evidence do not validate measurements.', { costToReverse: 'high' })),
  ...['lobester-gym', 'womens-health-os', 'dyslexia', 'hypertrophyos'].map((id) => finding(id, 'evidenceLevel',
    `What peer-reviewed evidence supports the precise claims made by ${PROJECT_CATALOG.find((record) => record.id === id).publicName}?`,
    ['Review ingested evidence against a defined claim scope', 'Narrow or withhold unsupported claims while review remains open'],
    'Page descriptions and paper-count badges are not claim-level evidence review.', { costToReverse: 'high' })),
]);

// Compatibility aggregate; kind/status distinguish decisions from required work.
export const CATALOG_FINDINGS = deepFreeze([...CATALOG_OPEN_QUESTIONS, ...CATALOG_REQUIREMENTS]);

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
    POOL_NAMES.includes(record.pool) && Array.isArray(record.pools) && record.pools.length > 0 &&
    record.pools.every((pool) => POOL_NAMES.includes(pool)) && PROJECT_STATUSES.includes(record.status) &&
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
    openQuestions: CATALOG_OPEN_QUESTIONS, requirements: CATALOG_REQUIREMENTS, resolutions: CATALOG_RESOLUTIONS,
  })));
}
