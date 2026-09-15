import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { ROUTE_OWNERS } from '../web/shared/project-catalog.mjs';

const require = createRequire(import.meta.url);
const {
  STATIC_COPY_FILES,
  STATIC_COPY_DIRECTORIES,
} = require('./static-build-inputs.cjs');

const HTML_COPY_DIRECTORIES = new Set(['web', 'calendar', 'movies', 'frontend']);
const REDIRECT_DELIVERIES = new Set(['redirect', 'external-redirect']);

// Task 3 supplies the explicit deployment declarations. This module owns the
// validation boundary only and deliberately does not drive the static build.
export const ROUTE_REGISTRY = Object.freeze([]);

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

  for (const relativeFile of STATIC_COPY_FILES) {
    if (!relativeFile.toLowerCase().endsWith('.html')) continue;
    const source = normalizeSource(relativeFile);
    if (fs.existsSync(path.join(absoluteRoot, ...source.split('/')))) {
      discovered.push({ route: routeFromSource(source), source });
    }
  }

  for (const relativeDirectory of STATIC_COPY_DIRECTORIES) {
    if (!HTML_COPY_DIRECTORIES.has(relativeDirectory)) continue;
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
    expression += escapeRegularExpression(source.slice(cursor, match.index));
    expression += match[1] ? '.*' : '[^/]+';
    cursor = match.index + match[0].length;
  }
  expression += escapeRegularExpression(source.slice(cursor));
  return new RegExp(`^${expression}$`);
}

function redirectMatchesRoute(source, routePath) {
  if (!source.includes(':')) {
    return normalizeRoutePath(source) === routePath;
  }

  const expression = wildcardRedirectExpression(source);
  const candidates = routePath === '/'
    ? ['/']
    : [routePath, routePath.replace(/\/$/, '')];
  return candidates.some((candidate) => expression.test(candidate));
}

function redirectIsIntentional(entry, owner, routePath, redirect, discoveredHtmlRoutes) {
  const source = entry.source && normalizeSource(entry.source);
  const hasMatchingHtmlShell = Boolean(source) && discoveredHtmlRoutes.some((discovered) =>
    discovered.source === source && discovered.route === routePath,
  );

  return REDIRECT_DELIVERIES.has(entry.delivery) &&
    hasMatchingHtmlShell &&
    ownerOwnsRoute(owner, routePath) &&
    owner.redirectSources?.includes(redirect.source) &&
    entry.destination === redirect.destination &&
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

export function validateRouteRegistry(input = {}) {
  const routes = input.routes || ROUTE_REGISTRY;
  const routeOwners = input.routeOwners || ROUTE_OWNERS;
  const discoveredHtmlRoutes = (input.discoveredHtmlRoutes || []).map(discoveredRecord);
  const vercelRedirects = input.vercelRedirects || [];
  const issues = [];
  const paths = registryPaths(routes);
  const ownersById = new Map(routeOwners.map((owner) => [owner.id, owner]));

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

  const expectedRedirects = routes.flatMap((entry) => entry.expectedVercelRedirects || []);
  for (const redirect of vercelRedirects) {
    if (!expectedRedirects.some((expected) => redirectRulesEqual(expected, redirect))) {
      issues.push({
        code: 'VERCEL_REDIRECT_UNREGISTERED',
        message: `VERCEL_REDIRECT_UNREGISTERED: ${redirect.source} to ${redirect.destination} is not registered`,
        route: redirect.source,
      });
    }

    for (const { entry, route } of paths) {
      if (!redirectMatchesRoute(redirect.source, route)) continue;
      const owner = ownersById.get(entry.ownerId);
      if (redirectIsIntentional(entry, owner, route, redirect, discoveredHtmlRoutes)) continue;

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
