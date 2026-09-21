import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CATALOG_ENTITIES, ROUTE_OWNERS } from '../web/shared/project-catalog.mjs';
import { ROUTE_REGISTRY, normalizeRoutePath } from './static-route-registry.mjs';

// This check is deliberately narrow. It protects settled catalog facts without
// trying to infer whether ordinary editorial prose is persuasive or complete.
const RETIRED_DISPOSITIONS = new Set([
  'absorbed', 'category-alias', 'historical-material', 'legacy-reference',
  'merged', 'retired-hub',
]);

const RETIRED_ROLE_NAMES = new Set(['absorbed', 'historical-material', 'legacy', 'retired']);

const OLD_POOL_NAMES = Object.freeze([
  'Growing App',
  'Growing Up',
  'AId Kit',
  'AI Toolbox I Wish I Had',
  'Tiny Solutions',
  'Tinker Box',
  'Kids Corner',
  'Web Design Gallery',
]);

function decodeEntities(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };
  return value
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
      if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
      return named[lower] ?? whole;
    });
}

/** Return the text a visitor can read, plus title/description metadata. */
export function extractProse(html) {
  const metadata = [];
  const metaPattern = /<meta\b[^>]*>/gi;
  for (const match of html.matchAll(metaPattern)) {
    const tag = match[0];
    const name = tag.match(/\b(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!['description', 'og:title', 'og:description'].includes(name)) continue;
    const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1];
    if (content) metadata.push(content);
  }

  const visible = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities([...metadata, visible].join(' ').replace(/\s+/g, ' ').trim());
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nearbyIsNegated(text, index) {
  const before = text.slice(Math.max(0, index - 65), index);
  return /\b(?:not|no longer|never|isn't|isnt|outside|retired|legacy|absorbed|excluded|unlisted|internal|private)\b[^.!?]{0,42}$/i.test(before);
}

function findPositive(text, pattern, statusWords = false) {
  const globalPattern = pattern.flags.includes('g') ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
  for (const match of text.matchAll(globalPattern)) {
    const index = match.index ?? 0;
    const status = statusWords
      ? match[0].match(/\b(?:public|publicly available|live|current|active)\b/gi)?.[0]
      : null;
    const termIndex = status ? index + match[0].toLowerCase().indexOf(status.toLowerCase()) : index;
    if (!nearbyIsNegated(text, termIndex)) return match;
  }
  return null;
}

function visibilityFor(route, owner, entity) {
  return { ...(entity?.visibility || {}), ...(owner?.visibility || {}), ...(route.visibility || {}) };
}

function ownerFor(route, routeOwners) {
  const routePath = route.paths?.[0];
  return routeOwners.find(({ id }) => id === route.ownerId)
    || routeOwners.find(({ routes = [] }) => routes.some((candidate) => normalizeRoutePath(candidate) === normalizeRoutePath(routePath)));
}

function entityFor(owner, route, catalogEntities) {
  const id = owner?.catalogEntityId || owner?.projectId || route.ownerId;
  return catalogEntities.find(({ id: candidate }) => candidate === id);
}

function retiredEntityFor(owner, catalogEntities) {
  const direct = catalogEntities.find(({ id }) => id === owner?.id);
  const disposition = String(direct?.disposition || '').toLowerCase();
  if (RETIRED_DISPOSITIONS.has(direct?.kind)
    || RETIRED_DISPOSITIONS.has(direct?.disposition)
    || /(?:retired|absorbed|legacy|historical|merged|category.alias)/i.test(disposition)) return direct;
  if (RETIRED_ROLE_NAMES.has(owner?.role)) return direct;
  return null;
}

function issue(code, message, route, source, extra = {}) {
  return { code, message, route: route.paths?.[0], source, ...extra };
}

/** Audit one copied HTML page against the catalog/registry facts that own it. */
export function detectProseDrift({ route, owner, entity, html }) {
  const text = extractProse(html);
  const source = route.source || null;
  const issues = [];
  const visibility = visibilityFor(route, owner, entity);
  const excluded = visibility.publicSurface === 'excluded'
    || (visibility.search === 'excluded' && visibility.indexing === 'noindex')
    || visibility.access === 'internal'
    || visibility.access === 'private';

  if (excluded) {
    const label = entity?.publicName || owner?.id || route.ownerId;
    const labelPattern = escaped(label);
    const publicClaim = findPositive(text,
      new RegExp(`(${labelPattern})\\s+(?:is|remains|was|becomes|serves as)\\s+(?:a\\s+)?\\b(?:public|publicly available|live|current|active)\\b`, 'i'), true)
      || findPositive(text,
        /((?:this|the)\s+(?:page|route|surface|project|destination|product))\s+(?:is|remains|was|becomes)\s+(?:a\s+)?\b(?:public|publicly available|live|current|active)\b/i, true);
    if (publicClaim) {
      issues.push(issue(
        'PROSE_VISIBILITY_CONTRADICTION',
        `PROSE_VISIBILITY_CONTRADICTION: ${route.paths?.[0]} describes an excluded/internal surface as public or live`,
        route, source, { catalogEntityId: entity?.id || owner?.catalogEntityId || route.ownerId },
      ));
    }
  }

  return issues;
}

function detectRetiredAndNamingDrift({ route, owner, entity, html, catalogEntities }) {
  const text = extractProse(html);
  const source = route.source || null;
  const issues = [];
  const role = owner?.role;
  const directEntity = catalogEntities.find(({ id }) => id === owner?.id);
  const disposition = String(directEntity?.disposition || '').toLowerCase();
  const isHistoricalOrLegacy = RETIRED_ROLE_NAMES.has(role)
    || RETIRED_DISPOSITIONS.has(directEntity?.kind)
    || /(?:retired|absorbed|legacy|historical|merged|category.alias)/i.test(disposition);

  if (!isHistoricalOrLegacy) {
    for (const oldName of OLD_POOL_NAMES) {
      const match = findPositive(text, new RegExp(`(${escaped(oldName)})`, 'i'));
      if (match) {
        issues.push(issue(
          'PROSE_POOL_NAME_DRIFT',
          `PROSE_POOL_NAME_DRIFT: ${route.paths?.[0]} contains retired pool name “${oldName}”`,
          route, source, { oldName, catalogEntityId: entity?.id || owner?.catalogEntityId || route.ownerId },
        ));
      }
    }
  }

  const retired = retiredEntityFor(owner, catalogEntities);
  if (retired?.publicName) {
    const label = escaped(retired.publicName);
    const status = findPositive(text,
      new RegExp(`(${label})\\s+(?:is|remains|was|becomes|serves as)\\s+(?:a\\s+)?\\b(?:live|current|active|public)\\b`, 'i'), true)
      || findPositive(text,
        new RegExp(`\\b(?:live|current|active|public)\\s+(${label})\\b`, 'i'), true);
    if (status) {
      issues.push(issue(
        'PROSE_RETIRED_STATUS_DRIFT',
        `PROSE_RETIRED_STATUS_DRIFT: ${route.paths?.[0]} describes retired ${retired.publicName} as live/current/public`,
        route, source, { catalogEntityId: retired.id },
      ));
    }
  }
  return issues;
}

/** Discover and audit every copied HTML source declared by the route registry. */
export function auditProseDrift({
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  routes = ROUTE_REGISTRY,
  routeOwners = ROUTE_OWNERS,
  catalogEntities = CATALOG_ENTITIES,
  readFile = (file) => fs.readFileSync(file, 'utf8'),
} = {}) {
  const issues = [];
  for (const route of routes) {
    if (!route.source || !route.source.toLowerCase().endsWith('.html')) continue;
    const owner = ownerFor(route, routeOwners);
    const file = path.join(root, route.source);
    let html;
    try {
      html = readFile(file);
    } catch {
      continue; // Missing sources are the route registry's responsibility.
    }
    const entity = entityFor(owner, route, catalogEntities);
    issues.push(...detectProseDrift({ route, owner, entity, html }));
    issues.push(...detectRetiredAndNamingDrift({ route, owner, entity, html, catalogEntities }));
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const issues = auditProseDrift();
  if (issues.length > 0) {
    console.error(JSON.stringify(issues, null, 2));
    process.exitCode = 1;
  } else {
    console.log('Prose drift: no catalog contradictions found.');
  }
}
