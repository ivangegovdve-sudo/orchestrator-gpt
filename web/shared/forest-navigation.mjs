import {
  FOREST_TRAIL_ROUTE_IDS,
  ROUTE_INVENTORY,
} from './route-inventory.mjs?v=20260729e';

const ROUTE_BY_ID = new Map(ROUTE_INVENTORY.map((route) => [route.id, route]));
const REDIRECT_PATHS = new Set([
  '/calendar/',
  '/calendar/calendario.html',
  '/movies/',
  '/web/ai-init/',
  '/web/council/byok/',
  '/web/council/inner/',
  '/web/council/tinylm/',
  '/web/llm-db/',
  '/web/tinylm/',
]);
const UNOWNED_PATHS = new Set([
  '/frontend/',
  '/web/ai-init/embed/',
]);
const LANDING_PREFETCHES = Object.freeze([
  '/web/life-in-time/',
  '/web/vfx-portfolio/',
]);
const installedDocuments = new WeakSet();

export const CANONICAL_ROUTE_IDS = Object.freeze([...FOREST_TRAIL_ROUTE_IDS]);

export function normalizePathname(input = '/') {
  let pathname;
  try {
    pathname = new URL(String(input || '/'), 'https://sdforest.local').pathname;
  } catch {
    pathname = '/';
  }

  pathname = pathname.replace(/\/{2,}/g, '/');
  pathname = pathname.replace(/\/index\.html$/i, '/');
  if (pathname === '/index.html') pathname = '/';
  if (/\.html\/$/i.test(pathname)) pathname = pathname.slice(0, -1);
  if (pathname !== '/' && !pathname.endsWith('/') && !/\/[^/]+\.[^/]+$/i.test(pathname)) {
    pathname += '/';
  }
  return pathname;
}

const routeByPath = new Map();
for (const route of ROUTE_INVENTORY) {
  routeByPath.set(normalizePathname(route.href), route);
  for (const alias of route.aliasPaths || []) {
    routeByPath.set(normalizePathname(alias), route);
  }
}

function isEligible(route) {
  return Boolean(route && route.state !== 'redirect' && route.prefetch !== false);
}

function uniqueEligibleHrefs(routes, currentPath) {
  const hrefs = [];
  for (const route of routes) {
    if (!isEligible(route)) continue;
    const href = normalizePathname(route.href);
    if (href === currentPath || !href.startsWith('/') || hrefs.includes(href)) continue;
    hrefs.push(href);
    if (hrefs.length === 2) break;
  }
  return hrefs;
}

function canonicalNeighbors(route, currentPath) {
  const index = CANONICAL_ROUTE_IDS.indexOf(route.id);
  if (index < 0) return [];
  const neighbors = [];

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = ROUTE_BY_ID.get(CANONICAL_ROUTE_IDS[cursor]);
    if (!isEligible(candidate)) continue;
    neighbors.push(candidate);
    break;
  }
  for (let cursor = index + 1; cursor < CANONICAL_ROUTE_IDS.length; cursor += 1) {
    const candidate = ROUTE_BY_ID.get(CANONICAL_ROUTE_IDS[cursor]);
    if (!isEligible(candidate)) continue;
    neighbors.push(candidate);
    break;
  }
  return uniqueEligibleHrefs(neighbors, currentPath);
}

export function isRedirectPath(input) {
  const pathname = normalizePathname(input);
  return REDIRECT_PATHS.has(pathname) || routeByPath.get(pathname)?.state === 'redirect';
}

export function getDocumentPrefetches(input = '/') {
  const pathname = normalizePathname(input);
  if (pathname === '/') {
    return uniqueEligibleHrefs(
      LANDING_PREFETCHES.map((href) => routeByPath.get(href)),
      pathname,
    );
  }
  if (isRedirectPath(pathname) || UNOWNED_PATHS.has(pathname)) return [];

  const route = routeByPath.get(pathname);
  if (!route || route.state === 'redirect') return [];

  const children = ROUTE_INVENTORY.filter((candidate) => candidate.parent === route.id);
  const eligibleChildren = uniqueEligibleHrefs(children, pathname);
  if (eligibleChildren.length) return eligibleChildren;

  return canonicalNeighbors(route, pathname);
}

export function installDocumentPrefetches({
  targetDocument = globalThis.document,
  pathname = globalThis.location?.pathname || '/',
} = {}) {
  const hrefs = getDocumentPrefetches(pathname);
  if (!targetDocument?.head || installedDocuments.has(targetDocument)) return hrefs;
  installedDocuments.add(targetDocument);

  const existing = new Set(
    [...(targetDocument.querySelectorAll?.('link[rel="prefetch"][href]') || [])]
      .map((link) => normalizePathname(link.getAttribute('href'))),
  );
  const links = [];
  for (const href of hrefs) {
    if (existing.has(href)) continue;
    const link = targetDocument.createElement('link');
    link.setAttribute('rel', 'prefetch');
    link.setAttribute('as', 'document');
    link.setAttribute('href', href);
    links.push(link);
  }
  if (links.length) targetDocument.head.append(...links);
  return hrefs;
}

if (typeof document !== 'undefined') {
  installDocumentPrefetches();
}
