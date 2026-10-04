import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { CATALOG_ENTITIES, ROUTE_OWNERS } from '../web/shared/project-catalog.mjs';

const require = createRequire(import.meta.url);
const {
  STATIC_COPY_FILES,
  STATIC_COPY_DIRECTORIES,
  STATIC_DATA_COPIES,
} = require('./static-build-inputs.cjs');

const REDIRECT_DELIVERIES = new Set(['redirect', 'external-redirect']);

const PUBLIC = { navigation: 'manual', search: 'unreviewed', indexing: 'unspecified', access: 'public' };
const UNLISTED = { navigation: 'unlisted', search: 'excluded', indexing: 'unspecified', access: 'public' };
const NOINDEX = { ...UNLISTED, indexing: 'noindex' };
const INTERNAL = { ...UNLISTED, access: 'internal' };
const INTERNAL_NOINDEX = { ...INTERNAL, indexing: 'noindex' };
const PRIVATE_NOINDEX = { ...INTERNAL_NOINDEX, access: 'private' };
const MIXED = { ...PUBLIC, access: 'mixed' };

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function route(id, ownerId, routePath, delivery, source, visibility, options = {}) {
  return { id, ownerId, paths: [routePath], delivery, source, visibility, ...options };
}

function redirect(source, destination, permanent = true) {
  return { source, destination, permanent };
}

// Explicit deployment declarations: validation only. Neither the build nor the
// manually curated homepage/Forest Trails consumes this registry. Visibility is
// descriptive metadata, not an access-control mechanism or a readiness claim.
export const ROUTE_REGISTRY = deepFreeze([
  route('forest-hub', 'forest-hub', '/', 'page', 'index.html', PUBLIC),
  route('pool-growingapp', 'pool-growingapp', '/web/pools/growingapp/', 'page', 'web/pools/growingapp/index.html', PUBLIC),
  route('pool-ai-d-kit', 'pool-ai-d-kit', '/web/pools/ai-d-kit/', 'page', 'web/pools/ai-d-kit/index.html', PUBLIC),
  route('ai-kit-troubleshooting', 'ai-kit-troubleshooting', '/web/pools/ai-d-kit/troubleshooting/', 'child', 'web/pools/ai-d-kit/troubleshooting/index.html', PUBLIC),
  route('ai-kit-free-stuff-in-promotions', 'ai-kit-free-stuff-in-promotions', '/web/pools/ai-d-kit/free-stuff-in-promotions/', 'child', 'web/pools/ai-d-kit/free-stuff-in-promotions/index.html', PUBLIC),
  route('pool-tinkerbox', 'pool-tinkerbox', '/web/pools/tinkerbox/', 'page', 'web/pools/tinkerbox/index.html', PUBLIC),
  route('pool-health', 'pool-health', '/web/pools/health/', 'page', 'web/pools/health/index.html', PUBLIC),
  route('pool-design-gallery', 'pool-design-gallery', '/web/pools/design-gallery/', 'page', 'web/pools/design-gallery/index.html', PUBLIC),
  route('pool-artificial-self', 'pool-artificial-self', '/web/pools/artificial-self/', 'page', 'web/pools/artificial-self/index.html', PUBLIC),
  route('pool-my-story', 'pool-my-story', '/web/pools/my-story/', 'page', 'web/pools/my-story/index.html', PUBLIC),
  route('ai-init-embed', 'ai-init-embed', '/web/ai-init/embed/', 'embed', 'web/ai-init/embed/index.html', { ...PUBLIC, navigation: 'unlisted' }),
  route('ai-init', 'ai-init', '/web/ai-init/', 'redirect', 'web/ai-init/index.html', NOINDEX, {
    destination: '/web/library/glossary/',
    expectedVercelRedirects: [
      redirect('/web/ai-init', '/web/library/glossary/'),
      redirect('/web/ai-init/', '/web/library/glossary/'),
    ],
  }),
  route('ai-research', 'ai-research', '/web/ai-research/', 'page', 'web/ai-research/index.html', PUBLIC),
  route('avatar-playground', 'avatar-playground', '/web/avatar-playground/', 'page', 'web/avatar-playground/index.html', PUBLIC),
  route('fleet-board-board', 'fleet-board', '/web/board/', 'page', 'web/board/index.html', INTERNAL_NOINDEX),
  route('c2c-dolphin', 'c2c-dolphin', '/web/c2c-dolphin/', 'page', 'web/c2c-dolphin/index.html', PUBLIC),
  route('c2c-self', 'c2c-self', '/web/c2c-self/', 'page', 'web/c2c-self/index.html', PUBLIC),
  route('calendar', 'calendar', '/web/calendar/', 'page', 'web/calendar/index.html', PUBLIC),
  route('chair-or-ladder', 'chair-or-ladder', '/web/chair-or-ladder/', 'page', 'web/chair-or-ladder/index.html', PUBLIC),
  route('chloe-pwa', 'chloe-pwa', '/web/chloe-pwa/', 'page', 'web/chloe-pwa/index.html', INTERNAL_NOINDEX),
  route('code-search', 'code-search', '/web/code-search/', 'page', 'web/code-search/index.html', PUBLIC),
  route('council-byok', 'council', '/web/council/byok/', 'html-shim', 'web/council/byok/index.html', UNLISTED, { destination: '/web/council/index.html#openrouter-free' }),
  route('council', 'council', '/web/council/', 'page', 'web/council/index.html', PUBLIC),
  route('council-inner', 'council', '/web/council/inner/', 'html-shim', 'web/council/inner/index.html', UNLISTED, { destination: '/web/council/index.html#openrouter-free' }),
  route('council-tinylm', 'council', '/web/council/tinylm/', 'html-shim', 'web/council/tinylm/index.html', NOINDEX, { destination: '/web/council/index.html#tinylm' }),
  route('evolution', 'evolution', '/web/evolution/', 'page', 'web/evolution/index.html', PUBLIC),
  route('explore', 'explore', '/web/explore/', 'page', 'web/explore/index.html', PUBLIC),
  route('fleet-board-fleet', 'fleet-board', '/web/fleet/', 'page', 'web/fleet/index.html', INTERNAL_NOINDEX),
  route('gallery', 'gallery', '/web/gallery/', 'page', 'web/gallery/index.html', NOINDEX),
  route('hypertrophyos', 'hypertrophyos', '/web/hypertrophyos/', 'page', 'web/hypertrophyos/index.html', PUBLIC),
  route('kids', 'kids', '/web/kids/', 'page', 'web/kids/index.html', PUBLIC),
  route('kids-movie-library', 'kids-movie-library', '/web/kids-movie-library/', 'page', 'web/kids-movie-library/index.html', PUBLIC),
  route('library-chloe', 'library-chloe', '/web/library/chloe/', 'child', 'web/library/chloe/index.html', INTERNAL_NOINDEX),
  route('library-general', 'library-memory', '/web/library/general/', 'child', 'web/library/general/index.html', INTERNAL_NOINDEX),
  route('library-glossary', 'library', '/web/library/glossary/', 'child', 'web/library/glossary/index.html', PUBLIC),
  route('library', 'library', '/web/library/', 'page', 'web/library/index.html', PUBLIC),
  route('library-memory', 'library-memory', '/web/library/memory/', 'child', 'web/library/memory/index.html', INTERNAL_NOINDEX),
  route('memory-systems', 'library', '/web/memory-systems/', 'child', 'web/memory-systems/index.html', { ...PUBLIC, navigation: 'unlisted' }),
  route('library-platform', 'library', '/web/library/platform/', 'child', 'web/library/platform/index.html', PUBLIC),
  route('library-workspace', 'library-workspace', '/web/library/rag.html', 'child', 'web/library/rag.html', MIXED),
  route('library-repos', 'library-repos', '/web/library/repos/', 'child', 'web/library/repos/index.html', INTERNAL_NOINDEX),
  route('life-in-time', 'life-in-time', '/web/life-in-time/', 'page', 'web/life-in-time/index.html', PUBLIC),
  route('llm-db', 'llm-db', '/web/llm-db/', 'redirect', 'web/llm-db/index.html', NOINDEX, {
    destination: '/web/library/',
    expectedVercelRedirects: [
      redirect('/web/llm-db/', '/web/library/'),
      redirect('/web/llm-db/:path*/', '/web/library/'),
      redirect('/web/llm-db/:path*', '/web/library/'),
    ],
  }),
  route('lobester-gym', 'lobester-gym', '/web/lobester-gym/', 'page', 'web/lobester-gym/index.html', PUBLIC),
  route('m-popova', 'm-popova', '/web/m-popova/', 'page', 'web/m-popova/index.html', PUBLIC),
  route('manifesto-newborn-bg', 'manifesto-newborn', '/web/manifesto-newborn/bg/', 'child', 'web/manifesto-newborn/bg/index.html', PUBLIC),
  route('manifesto-newborn-de', 'manifesto-newborn', '/web/manifesto-newborn/de/', 'child', 'web/manifesto-newborn/de/index.html', PUBLIC),
  route('manifesto-newborn-es', 'manifesto-newborn', '/web/manifesto-newborn/es/', 'child', 'web/manifesto-newborn/es/index.html', PUBLIC),
  route('manifesto-newborn-fr', 'manifesto-newborn', '/web/manifesto-newborn/fr/', 'child', 'web/manifesto-newborn/fr/index.html', PUBLIC),
  route('manifesto-newborn', 'manifesto-newborn', '/web/manifesto-newborn/', 'page', 'web/manifesto-newborn/index.html', PUBLIC),
  route('manifesto-newborn-it', 'manifesto-newborn', '/web/manifesto-newborn/it/', 'child', 'web/manifesto-newborn/it/index.html', PUBLIC),
  route('manifesto-newborn-mk', 'manifesto-newborn', '/web/manifesto-newborn/mk/', 'child', 'web/manifesto-newborn/mk/index.html', PUBLIC),
  route('manifesto-newborn-pt', 'manifesto-newborn', '/web/manifesto-newborn/pt/', 'child', 'web/manifesto-newborn/pt/index.html', PUBLIC),
  route('manifesto-newborn-ru', 'manifesto-newborn', '/web/manifesto-newborn/ru/', 'child', 'web/manifesto-newborn/ru/index.html', PUBLIC),
  route('manifesto-newborn-zh', 'manifesto-newborn', '/web/manifesto-newborn/zh/', 'child', 'web/manifesto-newborn/zh/index.html', PUBLIC),
  route('math-forest', 'math-forest', '/web/math-forest/', 'page', 'web/math-forest/index.html', PUBLIC),
  route('math-mania', 'math-forest', '/web/math-mania/', 'page', 'web/math-mania/index.html', PUBLIC),
  route('mendeleev', 'mendeleev', '/web/mendeleev-bg/', 'page', 'web/mendeleev-bg/index.html', PUBLIC),
  route('morning-news', 'morning-news', '/web/morning-news/', 'external-redirect', 'web/morning-news/index.html', UNLISTED, {
    destination: 'https://thedrop.sdforest.site',
    expectedVercelRedirects: [
      redirect('/web/morning-news', 'https://thedrop.sdforest.site'),
      redirect('/web/morning-news/', 'https://thedrop.sdforest.site'),
    ],
  }),
  route('open-dashboard-catalogues', 'open-dashboard-notices', '/web/open-dashboard/catalogues/', 'html-shim', 'web/open-dashboard/catalogues/index.html', NOINDEX, { destination: '/web/open-dashboard/#explore', preservesQuery: true }),
  route('open-dashboard-github', 'open-dashboard', '/web/open-dashboard/github/', 'child', 'web/open-dashboard/github/index.html', PUBLIC),
  route('open-dashboard', 'open-dashboard', '/web/open-dashboard/', 'page', 'web/open-dashboard/index.html', PUBLIC),
  route('open-dashboard-matrix', 'open-dashboard-notices', '/web/open-dashboard/matrix/', 'html-shim', 'web/open-dashboard/matrix/index.html', NOINDEX, { destination: '/web/open-dashboard/#connections', preservesQuery: true }),
  route('open-dashboard-mcp', 'open-dashboard', '/web/open-dashboard/mcp/', 'child', 'web/open-dashboard/mcp/index.html', PUBLIC),
  route('open-dashboard-openrouter', 'open-dashboard-notices', '/web/open-dashboard/openrouter/', 'html-shim', 'web/open-dashboard/openrouter/index.html', NOINDEX, { destination: '/web/open-dashboard/?view=apps#explore', preservesQuery: true }),
  route('power-law-odyssey', 'power-law-odyssey', '/web/power-law-odyssey/', 'page', 'web/power-law-odyssey/index.html', PUBLIC),
  route('replicator-void', 'replicator-void', '/web/replicator-void/', 'page', 'web/replicator-void/index.html', PUBLIC),
  route('repos', 'repos', '/web/repos/', 'page', 'web/repos/index.html', { ...PUBLIC, navigation: 'unlisted', indexing: 'noindex' }),
  route('rubiks-teacher', 'rubiks-teacher', '/web/rubiks-teacher/', 'page', 'web/rubiks-teacher/index.html', PUBLIC),
  route('upload', 'upload', '/web/upload/', 'page', 'web/upload/index.html', PRIVATE_NOINDEX),
  route('vfx-portfolio', 'vfx-portfolio', '/web/vfx-portfolio/', 'page', 'web/vfx-portfolio/index.html', PUBLIC),
  route('voice-playground', 'voice-playground', '/web/voice-playground/', 'page', 'web/voice-playground/index.html', NOINDEX),
  route('we-are-the-training-data', 'we-are-the-training-data', '/web/we-are-the-training-data/', 'page', 'web/we-are-the-training-data/index.html', NOINDEX),
  route('womens-health-os', 'womens-health-os', '/web/womens-health-os/', 'page', 'web/womens-health-os/index.html', PUBLIC),
  route('calendar-calendario', 'calendar', '/calendar/calendario.html', 'html-shim', 'calendar/calendario.html', UNLISTED, { destination: '/web/calendar/' }),
  route('calendar-legacy', 'calendar', '/calendar/', 'html-shim', 'calendar/index.html', UNLISTED, { destination: '/web/calendar/' }),
  route('movies', 'kids-movie-library', '/movies/', 'page', 'movies/index.html', PUBLIC),
  route('item-icon-generator', 'item-icon-generator', '/frontend/', 'page', 'frontend/index.html', PUBLIC),

  // Host-only compatibility families have no copied HTML. Every configured
  // source is explicit here, including asset renames and wildcard rules.
  route('tinylm', 'tinylm', '/web/tinylm/', 'redirect', null, NOINDEX, {
    destination: '/web/council/index.html#tinylm',
    expectedVercelRedirects: [
      redirect('/web/tinylm', '/web/council/index.html#tinylm'),
      redirect('/web/tinylm/', '/web/council/index.html#tinylm'),
    ],
  }),
  route('open-overview', 'open-overview', '/web/open-overview/', 'redirect', null, NOINDEX, {
    destination: '/web/open-dashboard/',
    expectedVercelRedirects: [
      redirect('/web/open-overview', '/web/open-dashboard/'),
      redirect('/web/open-overview/', '/web/open-dashboard/'),
      redirect('/web/open-overview/open-overview.js', '/web/open-dashboard/open-dashboard.js'),
      redirect('/web/open-overview/open-overview.css', '/web/open-dashboard/open-dashboard.css'),
      redirect('/web/open-overview/open-overview-api.js', '/web/open-dashboard/open-dashboard-api.js'),
      redirect('/web/open-overview/open-overview-charts.js', '/web/open-dashboard/open-dashboard-charts.js'),
      redirect('/web/open-overview/open-overview-schema.js', '/web/open-dashboard/open-dashboard-schema.js'),
      redirect('/web/open-overview/open-overview-three.js', '/web/open-dashboard/open-dashboard-three.js'),
      redirect('/web/open-overview/mcp/', '/web/open-dashboard/mcp/'),
      redirect('/web/open-overview/openrouter/', '/web/open-dashboard/openrouter/'),
      redirect('/web/open-overview/github/', '/web/open-dashboard/github/'),
      redirect('/web/open-overview/catalogues/', '/web/open-dashboard/catalogues/'),
      redirect('/web/open-overview/:path*/', '/web/open-dashboard/:path*/'),
      redirect('/web/open-overview/:path*', '/web/open-dashboard/:path*'),
    ],
  }),
  route('drop-series', 'morning-news', '/series/', 'external-redirect', null, UNLISTED, {
    destination: 'https://thedrop.sdforest.site/series',
    expectedVercelRedirects: [
      redirect('/series', 'https://thedrop.sdforest.site/series', false),
      redirect('/series/', 'https://thedrop.sdforest.site/series', false),
    ],
  }),
  route('drop-series-dependency-map', 'morning-news', '/series/dependency-map/', 'external-redirect', null, UNLISTED, {
    destination: 'https://thedrop.sdforest.site/series/dependency-map',
    expectedVercelRedirects: [
      redirect('/series/dependency-map/', 'https://thedrop.sdforest.site/series/dependency-map', false),
      redirect('/series/dependency-map', 'https://thedrop.sdforest.site/series/dependency-map', false),
    ],
  }),
]);

export function normalizeRoutePath(routePath) {
  let normalized = String(routePath ?? '').trim().replaceAll('\\', '/');
  normalized = normalized.split(/[?#]/, 1)[0];
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/{2,}/g, '/');

  if (normalized === '/index.html') return '/';
  if (normalized.endsWith('/index.html')) {
    normalized = normalized.slice(0, -'index.html'.length);
  }
  if (normalized.endsWith('/')) return normalized;

  const lastSegment = normalized.slice(normalized.lastIndexOf('/') + 1);
  return lastSegment.includes('.') ? normalized : `${normalized}/`;
}

function normalizeSource(source) {
  return String(source).replaceAll('\\', '/').replace(/^\.\//, '');
}

function routeFromSource(source) {
  return normalizeRoutePath(`/${normalizeSource(source)}`);
}

function walkHtmlFiles(directory, root, discovered) {
  if (!fs.existsSync(directory)) return;

  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(absolutePath, root, discovered);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      const source = normalizeSource(path.relative(root, absolutePath));
      discovered.push({ route: routeFromSource(source), source });
    }
  }
}

export function discoverCopiedHtmlRoutes(root) {
  const absoluteRoot = path.resolve(root);
  const discovered = [];

  const files = [...STATIC_COPY_FILES, ...STATIC_DATA_COPIES.files.map((file) => path.join('data', file))];
  for (const relativeFile of files) {
    if (!relativeFile.toLowerCase().endsWith('.html')) continue;
    const source = normalizeSource(relativeFile);
    if (fs.existsSync(path.join(absoluteRoot, ...source.split('/')))) {
      discovered.push({ route: routeFromSource(source), source });
    }
  }

  const directories = [...STATIC_COPY_DIRECTORIES, ...STATIC_DATA_COPIES.directories.map((dir) => path.join('data', dir))];
  for (const relativeDirectory of directories) {
    walkHtmlFiles(path.join(absoluteRoot, relativeDirectory), absoluteRoot, discovered);
  }

  return discovered;
}

function registryPaths(routes) {
  return routes.flatMap((entry) => (entry.paths || []).map((routePath) => ({
    entry,
    route: normalizeRoutePath(routePath),
  })));
}

function ownerOwnsRoute(owner, routePath) {
  return Boolean(owner?.routes?.some((candidate) => normalizeRoutePath(candidate) === routePath));
}

function redirectRulesEqual(left, right) {
  return left?.source === right?.source &&
    left?.destination === right?.destination &&
    left?.permanent === right?.permanent;
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardRedirectExpression(source) {
  const tokenPattern = /(:[A-Za-z0-9_]+\*)|(:[A-Za-z0-9_]+)/g;
  let expression = '';
  let cursor = 0;

  for (const match of source.matchAll(tokenPattern)) {
    const optionalSlash = Boolean(match[1]) && source[match.index - 1] === '/';
    expression += escapeRegularExpression(source.slice(cursor, match.index - (optionalSlash ? 1 : 0)));
    const name = match[0].replace(/^:/, '').replace(/\*$/, '');
    // A repeated path parameter owns its preceding delimiter. With zero
    // segments, /legacy/:path*/ matches /legacy/ without requiring two slashes.
    expression += optionalSlash
      ? `(?:/(?<${name}>[^/]+(?:/[^/]+)*))?`
      : `(?<${name}>${match[1] ? '.*' : '[^/]+'})`;
    cursor = match.index + match[0].length;
  }
  expression += escapeRegularExpression(source.slice(cursor));
  return new RegExp(`^${expression}$`);
}

function routeAliases(routePath, discoveredHtmlRoutes) {
  const aliases = new Set(routePath === '/' ? ['/'] : [routePath, routePath.replace(/\/$/, '')]);
  // Ownership normalizes directory index URLs, but host rules see the concrete
  // request URL. Keep every copied source URL alongside its directory aliases.
  for (const discovered of discoveredHtmlRoutes) {
    if (discovered.route === routePath && discovered.source) aliases.add(`/${discovered.source}`);
  }
  return [...aliases];
}

function matchRedirectRoutes(source, routePath, aliases) {
  if (!source.includes(':')) {
    return normalizeRoutePath(source) === routePath ? [{}] : [];
  }

  const expression = wildcardRedirectExpression(source);
  const matches = [];
  for (const candidate of aliases) {
    const match = expression.exec(candidate);
    if (match) matches.push(match.groups);
  }
  return matches;
}

function expandRedirectDestination(destination, parameters) {
  return destination.replace(/(\/?):([A-Za-z0-9_]+)(\*)?/g, (token, prefix, name, repeated) => {
    if (!Object.hasOwn(parameters, name)) return token;
    const value = parameters[name];
    // Omitted repeated parameters also omit their delimiter in the destination.
    if (value === undefined) return repeated ? '' : token;
    return `${prefix}${value}`;
  });
}

function normalizeLocalDestination(destination) {
  // URL backslashes can introduce a network authority just like literal //.
  // Only normalize unambiguous local URLs; never treat URL text as a file path.
  if (typeof destination !== 'string' || !destination.startsWith('/') ||
    destination.startsWith('//') || destination.includes('\\')) return destination;
  const suffixIndex = destination.search(/[?#]/);
  const pathname = suffixIndex === -1 ? destination : destination.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : destination.slice(suffixIndex);
  return `${normalizeRoutePath(pathname)}${suffix}`;
}

function redirectIsIntentional(entry, owner, routePath, redirect, discoveredHtmlRoutes, parameters) {
  const source = entry.source && normalizeSource(entry.source);
  const hasMatchingHtmlShell = Boolean(source) && discoveredHtmlRoutes.some((discovered) =>
    discovered.source === source && discovered.route === routePath,
  );
  // A host-only redirect is valid only while no copied HTML occupies its route.
  // Missing, mismatched, or omitted sources for actual HTML shells still fail.
  const isRedirectOnly = !source && !discoveredHtmlRoutes.some(({ route }) => route === routePath);

  const destination = expandRedirectDestination(redirect.destination, parameters);
  // Registry paths represent both directory URL variants. Apply the same
  // normalization to expanded local targets, retaining query/fragment identity.
  const destinationAgrees = redirect.source.includes(':')
    ? normalizeLocalDestination(entry.destination) === normalizeLocalDestination(destination)
    : entry.destination === destination;

  return REDIRECT_DELIVERIES.has(entry.delivery) &&
    (hasMatchingHtmlShell || isRedirectOnly) &&
    ownerOwnsRoute(owner, routePath) &&
    owner.redirectSources?.includes(redirect.source) &&
    destinationAgrees &&
    entry.expectedVercelRedirects?.some((expected) => redirectRulesEqual(expected, redirect));
}

function discoveredRecord(value) {
  if (typeof value === 'string') {
    return { route: normalizeRoutePath(value), source: null };
  }
  return {
    route: normalizeRoutePath(value.route),
    source: value.source ? normalizeSource(value.source) : null,
  };
}

function sortIssues(issues) {
  return issues.sort((left, right) =>
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message) ||
    String(left.route || '').localeCompare(String(right.route || '')) ||
    String(left.ownerId || '').localeCompare(String(right.ownerId || '')),
  );
}

function routeHasDeploymentEvidence(entry, owner, route, discoveredHtmlRoutes, vercelRedirects) {
  if (entry.source) {
    return discoveredHtmlRoutes.some((discovered) =>
      discovered.route === route && discovered.source === normalizeSource(entry.source),
    );
  }
  if (!REDIRECT_DELIVERIES.has(entry.delivery)) return false;
  return vercelRedirects.some((redirect) => {
    const matches = matchRedirectRoutes(redirect.source, route, routeAliases(route, discoveredHtmlRoutes));
    return matches.length > 0 && matches.every((parameters) =>
      redirectIsIntentional(entry, owner, route, redirect, discoveredHtmlRoutes, parameters),
    );
  });
}

function projectBindingProblem(binding, project, catalogTargetsByPath) {
  if (!['local', 'external', 'shared-pool-tab'].includes(binding?.type)) {
    return 'type must be local, external, or shared-pool-tab';
  }
  if (binding.type === 'external') {
    const problem = 'external URL must be well-formed HTTPS without credentials';
    // Reject malformed authority/control text before URL can silently repair it.
    if (typeof binding.url !== 'string' || !/^https:\/\/[^/?#]/i.test(binding.url) ||
      /[\s\u0000-\u001f\u007f\\]/.test(binding.url)) return problem;
    try {
      const url = new URL(binding.url);
      return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? null : problem;
    } catch {
      return problem;
    }
  }
  if (typeof binding.route !== 'string' || !binding.route.startsWith('/') ||
    binding.route.startsWith('//') || /[\s\\]/.test(binding.route)) {
    return `${binding.type} route must be an absolute local path`;
  }
  // A fragment identifies a project within a deployed page, never a new route.
  const route = normalizeRoutePath(binding.route);
  const targets = catalogTargetsByPath.get(route) || [];
  if (targets.length === 0) {
    return `${binding.type} route ${route} is not registered with a valid catalog owner`;
  }
  const deployedTargets = targets.filter(({ deployed }) => deployed);
  if (deployedTargets.length === 0) {
    return `${binding.type} route ${route} has no copied HTML or configured host redirect evidence`;
  }
  if (binding.type === 'local') {
    // Companion and absorbed routes already declare their canonical project via
    // catalogEntityId. A display relationship alone cannot claim another owner.
    return deployedTargets.some(({ entity }) => entity.kind === 'project' && entity.id === project.id)
      ? null : `local route ${route} does not belong to catalog project ${project.id}`;
  }
  const pools = deployedTargets.filter(({ entity }) => entity.kind === 'pool'
    && typeof entity.route === 'string' && normalizeRoutePath(entity.route) === route);
  if (pools.length === 0) return `shared-pool-tab route ${route} is not a pool route`;
  if (typeof project.pool !== 'string' || !pools.some(({ entity }) => entity.publicName === project.pool)) {
    return `shared-pool-tab route ${route} does not match project pool ${project.pool}`;
  }
  // Pool renderers declare project.id as the actual row/tab fragment.
  return new URL(binding.route, 'https://catalog.invalid').hash === `#${project.id}` ? null
    : `shared-pool-tab route ${route} must use project fragment #${project.id}`;
}

export function validateRouteRegistry(input = {}) {
  const routes = input.routes || ROUTE_REGISTRY;
  const routeOwners = input.routeOwners || ROUTE_OWNERS;
  const catalogEntities = input.catalogEntities || CATALOG_ENTITIES;
  const discoveredHtmlRoutes = (input.discoveredHtmlRoutes || []).map(discoveredRecord);
  const vercelRedirects = input.vercelRedirects || [];
  const issues = [];
  const paths = registryPaths(routes);
  const ownersById = new Map(routeOwners.map((owner) => [owner.id, owner]));
  const entitiesById = new Map(catalogEntities.map((entity) => [entity.id, entity]));

  for (const { entry, route } of paths) {
    const owner = ownersById.get(entry.ownerId);
    if (!ownerOwnsRoute(owner, route)) {
      issues.push({
        code: 'ROUTE_OWNER_MISSING',
        message: `ROUTE_OWNER_MISSING: ${route} has no catalog owner`,
        route,
        ownerId: entry.ownerId,
      });
    }
  }

  for (const owner of routeOwners) {
    if (!entitiesById.has(owner.catalogEntityId)) {
      issues.push({
        code: 'ROUTE_CATALOG_ENTITY_MISSING',
        message: `ROUTE_CATALOG_ENTITY_MISSING: catalog owner ${owner.id} references missing catalog entity ${owner.catalogEntityId}`,
        ownerId: owner.id,
        catalogEntityId: owner.catalogEntityId,
      });
    }
    for (const declaredRoute of owner.routes || []) {
      const route = normalizeRoutePath(declaredRoute);
      const isRegistered = paths.some(({ entry, route: candidate }) =>
        entry.ownerId === owner.id && candidate === route,
      );
      if (!isRegistered) {
        issues.push({
          code: 'CATALOG_ROUTE_MISSING',
          message: `CATALOG_ROUTE_MISSING: catalog owner ${owner.id} has no route`,
          route,
          ownerId: owner.id,
        });
      }
    }
  }

  const catalogTargetsByPath = new Map();
  for (const { entry, route } of paths) {
    const owner = ownersById.get(entry.ownerId);
    if (!ownerOwnsRoute(owner, route) || !entitiesById.has(owner.catalogEntityId)) continue;
    const targets = catalogTargetsByPath.get(route) || [];
    targets.push({
      entity: entitiesById.get(owner.catalogEntityId),
      deployed: routeHasDeploymentEvidence(entry, owner, route, discoveredHtmlRoutes, vercelRedirects),
    });
    catalogTargetsByPath.set(route, targets);
  }
  for (const project of catalogEntities.filter(({ kind }) => kind === 'project')) {
    const bindings = Array.isArray(project.routeBindings) ? project.routeBindings : [];
    let validBindings = 0;
    bindings.forEach((binding, bindingIndex) => {
      const problem = projectBindingProblem(binding, project, catalogTargetsByPath);
      if (!problem) {
        validBindings += 1;
        return;
      }
      issues.push({
        code: 'PROJECT_ROUTE_BINDING_INVALID',
        message: `PROJECT_ROUTE_BINDING_INVALID: catalog project ${project.id} binding ${bindingIndex}: ${problem}`,
        catalogEntityId: project.id,
        bindingIndex,
      });
    });
    if (validBindings === 0) {
      issues.push({
        code: 'CATALOG_PROJECT_ROUTE_MISSING',
        message: `CATALOG_PROJECT_ROUTE_MISSING: catalog project ${project.id} has no explicit valid route binding`,
        catalogEntityId: project.id,
      });
    }
  }

  const firstPath = new Map();
  for (const { entry, route } of paths) {
    const first = firstPath.get(route);
    if (first) {
      issues.push({
        code: 'ROUTE_DUPLICATE',
        message: `ROUTE_DUPLICATE: ${route} is owned by ${first.ownerId} and ${entry.ownerId}`,
        route,
      });
    } else {
      firstPath.set(route, entry);
    }
  }

  const registeredPathSet = new Set(paths.map(({ route }) => route));
  for (const discovered of discoveredHtmlRoutes) {
    if (!registeredPathSet.has(discovered.route)) {
      issues.push({
        code: 'COPIED_HTML_UNREGISTERED',
        message: `COPIED_HTML_UNREGISTERED: ${discovered.route} copied from ${discovered.source || 'unknown source'} is not registered`,
        route: discovered.route,
      });
    }
  }

  const discoveredSources = new Set(
    discoveredHtmlRoutes.map(({ source }) => source).filter(Boolean),
  );
  for (const { entry, route } of paths) {
    if (entry.source && !discoveredSources.has(normalizeSource(entry.source))) {
      issues.push({
        code: 'SOURCE_FILE_MISSING',
        message: `SOURCE_FILE_MISSING: ${normalizeSource(entry.source)} for ${route} is absent from copied HTML inputs`,
        route,
        ownerId: entry.ownerId,
      });
    }
  }

  const expectedRedirects = routes.flatMap((entry) =>
    (entry.expectedVercelRedirects || []).map((rule) => ({ entry, rule })),
  );
  for (const { entry, rule } of expectedRedirects) {
    if (!vercelRedirects.some((redirect) => redirectRulesEqual(rule, redirect))) {
      issues.push({
        code: 'VERCEL_REDIRECT_MISSING',
        message: `VERCEL_REDIRECT_MISSING: ${rule.source} to ${rule.destination} is not configured`,
        route: rule.source,
        ownerId: entry.ownerId,
      });
    }
  }
  for (const redirect of vercelRedirects) {
    if (!expectedRedirects.some(({ rule }) => redirectRulesEqual(rule, redirect))) {
      issues.push({
        code: 'VERCEL_REDIRECT_UNREGISTERED',
        message: `VERCEL_REDIRECT_UNREGISTERED: ${redirect.source} to ${redirect.destination} is not registered`,
        route: redirect.source,
      });
    }

    for (const { entry, route } of paths) {
      const matches = matchRedirectRoutes(redirect.source, route, routeAliases(route, discoveredHtmlRoutes));
      if (!matches.length) continue;
      const owner = ownersById.get(entry.ownerId);
      if (matches.every((parameters) =>
        redirectIsIntentional(entry, owner, route, redirect, discoveredHtmlRoutes, parameters),
      )) continue;

      issues.push({
        code: 'REDIRECT_CONFLICT',
        message: `REDIRECT_CONFLICT: redirect ${redirect.source} shadows page route owned by ${entry.ownerId}`,
        route,
        ownerId: entry.ownerId,
      });
    }
  }

  return sortIssues(issues);
}
