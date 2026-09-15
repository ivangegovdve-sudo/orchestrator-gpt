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
const publicShell = {
  navigation: 'manual', search: 'unreviewed', indexing: 'unspecified',
  access: 'public', publicSurface: 'project',
};
const internalDocumentation = {
  navigation: 'unlisted', search: 'excluded', indexing: 'noindex',
  access: 'internal', publicSurface: 'documentation-only',
};
const compatibility = {
  navigation: 'unlisted', search: 'excluded', indexing: 'noindex',
  access: 'public', publicSurface: 'compatibility',
};
const outside = { ...publicShell, publicSurface: 'portfolio' };

function project(id, publicName, facts) {
  const sources = facts.sources || [MASTER];
  return {
    id, publicName, pool: null, classification: 'unresolved', outsidePoolRole: null,
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

// Null pool + classification distinguishes a pending decision from a settled
// outside-pool role. Neither case adds a pool to the seven-value vocabulary.
export const PROJECT_CATALOG = deepFreeze([
  project('forest-hub', 'SD Forest', {
    classification: 'outside-pools', outsidePoolRole: 'site',
    visibility: { ...publicShell, publicSurface: 'site' }, sources: ['index.html', MASTER],
  }),
  project('morning-news', 'The Drop', {
    pool: 'AI-d kit', classification: 'assigned', visibility: publicShell,
    canonicalUrl: 'https://thedrop.sdforest.site', sources: ['web/morning-news/index.html', PLAN],
  }),
  project('mendeleev', 'Mendeleev', {
    pool: 'GrowingApp', classification: 'assigned', status: 'Live', visibility: publicShell,
    sources: ['web/mendeleev-bg/index.html', PLAN],
  }),
  project('math-forest', 'Math Forest / Math Mania', {
    pool: 'GrowingApp', classification: 'assigned', visibility: publicShell,
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
    evidenceLevel: { level: 'archive-unverified', review: 'rederivation-required', sources: ['web/c2c-dolphin/index.html', MASTER] },
    sources: ['web/c2c-dolphin/index.html', PLAN],
  }),
  project('c2c-self', 'C2C Self', {
    pool: 'Artificial Self', classification: 'assigned', status: 'Research', visibility: publicShell,
    evidenceLevel: { level: 'archive-unverified', review: 'rederivation-required', sources: ['web/c2c-self/index.html', MASTER] },
    sources: ['web/c2c-self/index.html', PLAN],
  }),
  project('fleet-board', 'Fleet / Fleet Board', {
    classification: 'outside-pools', outsidePoolRole: 'internal', status: 'Live',
    visibility: internalDocumentation, sources: ['web/fleet/index.html', 'web/board/index.html', PLAN],
  }),
  project('ai-research', 'AI Research', {
    pool: 'Artificial Self', classification: 'assigned', visibility: publicShell,
    sources: ['web/ai-research/index.html', MASTER],
  }),
  project('library', 'Library', {
    pool: 'AI-d kit', classification: 'assigned',
    visibility: { ...publicShell, access: 'mixed', publicSurface: 'public-reference-only' },
    relationships: [{ type: 'folds-into', pool: 'AI-d kit', role: 'search' }],
    sources: ['web/library/index.html', 'web/library/rag.html', MASTER],
  }),
  project('ai-init', 'AI_INIT Glossary', {
    pool: 'AI-d kit', classification: 'assigned', visibility: publicShell,
    relationships: [{ type: 'reference-companion', projectId: 'library' }],
    sources: ['web/ai-init/index.html', 'web/ai-init/embed/index.html', 'web/library/glossary/index.html', MASTER],
  }),
  project('evolution', 'Evolution', {
    pool: 'Design Gallery', classification: 'assigned', category: 'Web Design', visibility: publicShell,
    sources: ['web/evolution/index.html', MASTER],
  }),
  project('chair-or-ladder', 'Chair or a Ladder', {
    pool: 'My Story', classification: 'assigned', visibility: publicShell,
    relationships: [{ type: 'optional-tree-context' }], sources: ['web/chair-or-ladder/index.html', MASTER],
  }),
  project('life-in-time', 'Life in Time', {
    pool: 'My Story', classification: 'assigned', visibility: publicShell,
    relationships: [{ type: 'optional-tree-context' }], sources: ['web/life-in-time/index.html', MASTER],
  }),
  project('power-law-odyssey', 'Power Law Odyssey', {
    pool: 'My Story', classification: 'assigned', visibility: publicShell,
    relationships: [{ type: 'optional-tree-context' }], sources: ['web/power-law-odyssey/index.html', MASTER],
  }),
  project('we-are-the-training-data', 'We Are The Training Data', {
    pool: 'My Story', classification: 'assigned',
    visibility: { ...publicShell, navigation: 'unlisted', search: 'excluded', indexing: 'noindex' },
    relationships: [{ type: 'optional-tree-context', role: 'default-narrated-poem' }],
    sources: ['web/we-are-the-training-data/index.html', MASTER],
  }),
  project('manifesto-newborn', 'Manifesto for a Newborn', {
    pool: 'GrowingApp', classification: 'assigned', visibility: publicShell,
    relationships: [{ type: 'optional-introduction', pool: 'GrowingApp' }, { type: 'reference', pool: 'My Story' }],
    sources: ['web/manifesto-newborn/index.html', MASTER],
  }),
  project('vfx-portfolio', 'VFX Portfolio', {
    classification: 'outside-pools', outsidePoolRole: 'portfolio', visibility: outside,
    sources: ['web/vfx-portfolio/index.html', MASTER],
  }),
  project('dyslexia', 'Dyslexia Reading Platform', {
    pool: 'Health', classification: 'assigned', visibility: publicShell, sources: ['index.html', PLAN],
  }),
  project('audiobook', 'Audiobook Studio', {
    pool: 'Health', classification: 'assigned', visibility: publicShell, sources: ['index.html', PLAN],
  }),
  // The task authority explicitly leaves these pools open despite older matrix labels.
  project('lobester-gym', 'Lobester Gym', { visibility: publicShell, sources: ['web/lobester-gym/index.html', PLAN] }),
  project('womens-health-os', 'Women’s Health OS', { visibility: publicShell, sources: ['web/womens-health-os/index.html', PLAN] }),
  project('hypertrophyos', 'Hyper Trophy OS', { visibility: publicShell, sources: ['web/hypertrophyos/index.html', PLAN] }),
  project('gym-scholar', 'Gym Scholar', {
    pool: 'Health', classification: 'assigned', visibility: publicShell, sources: [MASTER],
  }),
  project('avatar-playground', 'Avatar Playground', { visibility: publicShell, sources: ['web/avatar-playground/index.html', MASTER] }),
  project('calendar', 'Calendar Generator', { visibility: publicShell, sources: ['web/calendar/index.html', MASTER] }),
  project('council', 'Councils', { visibility: publicShell, sources: ['web/council/index.html', MASTER] }),
  project('explore', 'Explore Repos', {
    visibility: publicShell,
    relationships: [{ type: 'incorporates', route: '/web/code-search/' }, { type: 'incorporates', route: '/web/repos/' }],
    sources: ['web/explore/index.html', 'web/code-search/index.html', 'web/repos/index.html', MASTER],
  }),
  project('gallery', 'Found Work', {
    visibility: publicShell, attribution: 'Third-party work credited to its authors; not an owned-work gallery.',
    sources: ['web/gallery/index.html', MASTER],
  }),
  project('kids', 'Kids Corner', { visibility: publicShell, sources: ['web/kids/index.html', MASTER] }),
  project('kids-movie-library', 'Kids Movie Library', {
    visibility: publicShell,
    sources: ['movies/index.html', 'web/kids-movie-library/index.html', PLAN],
  }),
  project('m-popova', 'Poetry Space', {
    visibility: publicShell, attribution: 'Poetry by Maria Popova.', sources: ['web/m-popova/index.html', MASTER],
  }),
  project('open-dashboard', 'Open Dashboard', { visibility: publicShell, sources: ['web/open-dashboard/index.html', MASTER] }),
  project('rubiks-teacher', 'Rubik’s Teacher', { visibility: publicShell, sources: ['web/rubiks-teacher/index.html', MASTER] }),
  project('voice-playground', 'Voice Playground', {
    visibility: { ...publicShell, access: 'mixed' }, sources: ['web/voice-playground/index.html', MASTER],
  }),
  project('chloe-pwa', 'Chloé PWA', { visibility: internalDocumentation, sources: ['web/chloe-pwa/index.html', MASTER] }),
  project('chloe-desktop', 'Chloé desktop', { visibility: internalDocumentation, sources: [MASTER] }),
  project('upload', 'Knowledge Ingest', {
    classification: 'outside-pools', outsidePoolRole: 'disposition-pending',
    visibility: { ...internalDocumentation, indexing: 'unspecified' }, sources: ['web/upload/index.html', PLAN],
  }),
  project('item-icon-generator', 'Runware Item Icon Generator', { visibility: publicShell, sources: ['frontend/index.html', MASTER] }),
  project('flowform', 'FlowForm', { visibility: publicShell, canonicalUrl: 'https://flowform.sdforest.site', sources: ['index.html', MASTER] }),
  project('multiply-magic-studio', 'Multiply Magic Studio', { visibility: publicShell, sources: ['index.html', MASTER] }),
  project('web-design-gallery', 'Web Design Gallery', {
    pool: 'Design Gallery', classification: 'assigned', visibility: publicShell,
    sources: ['index.html', MASTER],
  }),
  project('repo-shelf', 'repo-shelf', {
    visibility: { ...publicShell, publicSurface: 'companion' },
    relationships: [{ type: 'secondary-view', projectId: 'explore' }], sources: [MASTER],
  }),
  ...['Open Design', 'Velune', 'AnyCloudLLM'].map((publicName) => project(
    { 'Open Design': 'open-design', Velune: 'velune', AnyCloudLLM: 'anycloudllm' }[publicName],
    publicName,
    { classification: 'outside-pools', outsidePoolRole: 'excluded', visibility: { navigation: 'excluded', search: 'excluded', indexing: 'unspecified', access: null, publicSurface: 'none' }, sources: [MASTER] },
  )),
]);

function owner(id, routes, options = {}) {
  const record = PROJECT_CATALOG.find((entry) => entry.id === (options.projectId || id));
  return {
    id, projectId: record.id, publicName: record.publicName, status: record.status,
    role: 'project', routes, redirectSources: [], visibility: record.visibility,
    ...options,
  };
}

// Owners preserve all copied HTML and configured redirect families. These are
// declarations for validation; route delivery/host rules live in the registry.
export const ROUTE_OWNERS = deepFreeze([
  owner('forest-hub', ['/'], { role: 'site' }),
  owner('morning-news', ['/web/morning-news/', '/series/', '/series/dependency-map/'], {
    redirectSources: ['/series', '/series/', '/series/dependency-map/', '/series/dependency-map'],
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
  owner('ai-init', ['/web/ai-init/'], { role: 'legacy', visibility: compatibility, redirectSources: ['/web/ai-init', '/web/ai-init/'] }),
  owner('ai-init-embed', ['/web/ai-init/embed/'], { projectId: 'ai-init', role: 'embed', visibility: { ...publicShell, navigation: 'unlisted' } }),
  owner('llm-db', ['/web/llm-db/'], { projectId: 'library', role: 'legacy', visibility: compatibility, redirectSources: ['/web/llm-db/', '/web/llm-db/:path*/', '/web/llm-db/:path*'] }),
  owner('evolution', ['/web/evolution/']),
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
  owner('voice-playground', ['/web/voice-playground/']),
  owner('chloe-pwa', ['/web/chloe-pwa/'], { role: 'internal' }),
  owner('upload', ['/web/upload/'], { role: 'internal' }),
  owner('item-icon-generator', ['/frontend/']),
]);

function finding(projectId, field, question, options, reason, extra = {}) {
  const record = PROJECT_CATALOG.find(({ id }) => id === projectId);
  return {
    findingId: `${projectId}.${field}`, projectId, pool: record.pool, field,
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
  finding('upload', 'disposition', 'Should Knowledge Ingest retire its functionality or redirect, and to which authorized destination?',
    ['Retire functionality while preserving the compatibility route', 'Redirect after an authorized destination is chosen'],
    'The destination and compatibility behavior are open; no replacement pool or public runtime is approved.', { costToReverse: 'high' }),
  finding('ai-init', 'disposition', 'What final search/glossary experience should the AI_INIT compatibility path expose?',
    ['Retain the configured glossary destination as compatibility', 'Integrate with the future AI-d kit search after its contract is approved'],
    'The current HTML shim and Vercel destination disagree; embed ownership stays separate.', { sources: ['web/ai-init/index.html', 'vercel.json', PLAN] }),
  finding('gallery', 'attribution', 'How does Found Work relate to the planned owned-work Design Gallery?',
    ['Keep an explicitly credited reference shelf', 'Make a separate credited exhibit within the reviewed gallery'],
    'Found Work embeds third-party work; the earlier museum implementation and its ownership need verification.'),
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

// This projection is deliberately empty until at least one project has a reviewed
// update date and readiness. An empty result is preferable to fabricated facts.
export const PUBLIC_CARD_PROJECTS = deepFreeze(PROJECT_CATALOG.filter((record) =>
  !record.provisional && record.id && record.publicName &&
  POOL_NAMES.includes(record.pool) && PROJECT_STATUSES.includes(record.status) &&
  Array.isArray(record.metrics) &&
  /^\d{4}-\d{2}-\d{2}$/.test(record.lastMeaningfullyUpdated) &&
  record.updateProvenance?.source && record.updateProvenance.semanticReviewRequired === false &&
  record.readiness?.review === 'verified' && record.evidenceLevel &&
  record.visibility?.access === 'public' && record.visibility.publicSurface === 'project' &&
  !['unlisted', 'excluded'].includes(record.visibility.navigation),
));

/** A detached, deeply frozen, JSON-safe value; never a presentation instruction. */
export function getCatalogSnapshot() {
  return deepFreeze(JSON.parse(JSON.stringify({
    pools: POOL_NAMES, statuses: PROJECT_STATUSES, projects: PROJECT_CATALOG,
    publicCardProjects: PUBLIC_CARD_PROJECTS, routeOwners: ROUTE_OWNERS, findings: CATALOG_FINDINGS,
  })));
}
