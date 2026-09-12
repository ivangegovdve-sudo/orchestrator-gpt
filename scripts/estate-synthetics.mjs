import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { writeFile, appendFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const URLS = Object.freeze({
  edition: 'https://thedrop.sdforest.site/api/public/edition/latest',
  models: 'https://openrouter-github-dashboard.vercel.app/api/public/v2/live-models',
  sources: 'https://openrouter-github-dashboard.vercel.app/api/public/v2/source-status',
  matrix: 'https://openrouter-github-dashboard.vercel.app/api/public/v2/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete',
  home: 'https://www.sdforest.site/',
  mcp: 'https://sdforest.site/web/open-dashboard/mcp/',
});
const sensitive = /authorization|cookie|password|secret|token|api[_-]?key|connection[_-]?string/i;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const textValue = value => typeof value === 'string' && value.trim().length > 0;
const result = (outcome, assertion, observed, action = 'No action required for this assertion.') => ({ outcome, assertion, observed, action });
const broken = (assertion, observed) => result('BROKEN', assertion, observed, 'Inspect the named content contract and the serving deployment.');
const unknown = (observed) => result('COULD_NOT_CHECK', 'A complete response is required before judging the target.', observed, 'Check runner connectivity or the named evidence dependency, then rerun.');

// All reports (stdout, JSON, Markdown, Actions summary) cross this single boundary.
// Body/exception text is never included in an observation, even before redaction.
export function sanitize(value, knownSecrets = Object.entries(process.env).filter(([k, v]) => sensitive.test(k) && v?.length >= 8).map(([, v]) => v)) {
  if (Array.isArray(value)) return value.map(v => sanitize(v, knownSecrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sensitive.test(k) ? '[REDACTED]' : sanitize(v, knownSecrets)]));
  if (typeof value !== 'string') return value;
  let text = value;
  for (const secret of knownSecrets) text = text.split(secret).join('[REDACTED]');
  return text.replace(/(?:authorization|proxy-authorization)\s*[:=]\s*[^\r\n]+/gi, '[REDACTED HEADER]')
    .replace(/\b(?:Bearer|Basic)\s+[^\s"'<>]+/gi, '[REDACTED AUTH]')
    .replace(/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi, '[REDACTED CONNECTION]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(/([?&](?:token|key|api_key|secret|password|signature|access_token)=)[^&\s"'<>]+/gi, '$1[REDACTED]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{15,}|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,})\b/g, '[REDACTED]');
}

export async function request(url, { fetchImpl = fetch, accept = 'application/json', timeoutMs = 20000, maxBytes = 8 * 1024 * 1024 } = {}) {
  let status;
  try {
    const response = await fetchImpl(url, { headers: { Accept: accept, 'User-Agent': 'SDForest-content-synthetics/1.0' }, signal: AbortSignal.timeout(timeoutMs) });
    status = response.status;
    const chunks = []; let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.length;
      if (size > maxBytes) return unknown({ reason: 'response_exceeds_check_budget', status, maxBytes });
      chunks.push(Buffer.from(chunk));
    }
    const bytes = Buffer.concat(chunks);
    return { status, type: response.headers.get('content-type') ?? '', text: bytes.toString('utf8'), bytes, finalUrl: response.url || url, sha256: createHash('sha256').update(bytes).digest('hex') };
  } catch {
    // A server status is evidence even if its error body cannot be read.
    if (status >= 400) return broken('Successful HTTP response.', { status, reason: 'http_error_body_unreadable' });
    return unknown({ reason: 'network_timeout_dns_tls_or_incomplete_body', ...(status ? { status } : {}) });
  }
}

export function inspectJson(response, kind, now = Date.now()) {
  if (response.outcome) return response;
  if (response.status < 200 || response.status >= 300) return broken('Successful JSON data endpoint.', { status: response.status });
  if (!/^application\/(?:[\w.-]+\+)?json\b/i.test(response.type)) return broken('JSON data rather than an HTML/SPA shell.', { status: response.status, reason: 'not_json_content_type' });
  let data;
  try { data = JSON.parse(response.text); } catch { return broken('Response parses as JSON.', { reason: 'invalid_json' }); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return broken('JSON object data contract.', { reason: 'invalid_object' });
  if (kind === 'edition') {
    if (!Array.isArray(data.mind_blowers) || !data.mind_blowers.every(object) || (data.sections !== undefined && (!Array.isArray(data.sections) || !data.sections.every(s => object(s) && Array.isArray(s.items) && s.items.every(object))))) return broken('Edition item and section objects are well formed.', { reason: 'invalid_edition_children' });
    const items = [...data.mind_blowers, ...(data.sections ?? []).flatMap(s => s.items)];
    const valid = data.status === 'published' && typeof data.headline === 'string' && data.headline.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(data.edition_date) && Number.isFinite(Date.parse(data.generated_at)) && items.some(item => typeof item.title === 'string' && item.title.trim() && typeof item.url === 'string' && /^https:\/\//.test(item.url));
    const ageHours = valid ? Math.round((now - Date.parse(data.generated_at)) / 3600000) : null;
    const observed = { published: data.status === 'published', items: items.length, editionDate: valid ? data.edition_date : null, ageHours, maxAgeHours: 48 };
    return valid && ageHours >= -1 && ageHours <= 48 ? result('HEALTHY', 'Published edition with real items generated within 48 hours.', observed) : broken('Published edition with real items generated within 48 hours.', observed);
  }
  return { outcome: 'HEALTHY', data };
}

function contentHtml(html) {
  return html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|template|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
}
function htmlText(html) {
  return contentHtml(html).replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => { const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return code <= 0x10ffff ? String.fromCodePoint(code) : ' '; }).replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi, ' ').replace(/\s+/g, ' ').trim();
}
function htmlProblem(response) {
  if (response.outcome) return response;
  if (response.status !== 200 || !/^text\/html\b/i.test(response.type)) return broken('Successful HTML content response.', { status: response.status });
}
export function inspectHome(response) {
  const problem = htmlProblem(response); if (problem) return problem;
  const visible = htmlText(response.text);
  const links = [...contentHtml(response.text).matchAll(/<a\b[^>]*href=["'](\/web\/[^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].filter(m => htmlText(m[2]).length > 0);
  const projectLinks = new Set(links.map(m => m[1])).size;
  const identity = /Forest\s*HUB|SDForest/i.test(visible);
  return identity && projectLinks >= 3 ? result('HEALTHY', 'Forest identity and at least three named project links in served HTML.', { identity, projectLinks }) : broken('Forest identity and at least three named project links in served HTML.', { identity, projectLinks });
}
export function inspectHomepage(response, providers) {
  const problem = htmlProblem(response); if (problem) return problem;
  if (!providers?.length) return unknown({ reason: 'published_registry_unavailable' });
  const visible = htmlText(response.text);
  const missing = providers.filter(p => !new RegExp(`\\b${p.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(visible)).map(p => p.id);
  const observed = { named: providers.length - missing.length, expected: providers.length, missing, pageSha256: response.sha256, servedUrl: response.finalUrl };
  return missing.length ? broken('Served homepage names every provider in the published npm registry.', observed) : result('HEALTHY', 'Served homepage names every provider in the published npm registry.', observed);
}

// Small static-literal parser: no eval, import, vm or package installation.
// Unknown syntax fails the dependency instead of silently shrinking the denominator.
export function parseRegistry(source) {
  const marker = 'export const PROVIDER_REGISTRY =';
  const start = source.indexOf(marker); if (start < 0) throw Error('registry_declaration_missing');
  let pos = start + marker.length;
  const skip = () => { for (;;) { const m = /^(?:\s+|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)/.exec(source.slice(pos)); if (!m) break; pos += m[0].length; } };
  const take = c => { skip(); if (source[pos] !== c) throw Error('unsupported_registry_syntax'); pos++; };
  const string = () => { skip(); const m = /^"(?:[^"\\]|\\.)*"/.exec(source.slice(pos)); if (!m) throw Error('unsupported_registry_string'); pos += m[0].length; return JSON.parse(m[0]); };
  const value = (depth = 0) => {
    if (depth > 12) throw Error('registry_depth'); skip();
    if (source[pos] === '"') return string();
    if (source[pos] !== '{') throw Error('unsupported_registry_value');
    take('{'); const object = Object.create(null);
    for (;;) {
      skip(); if (source[pos] === '}') { pos++; return object; }
      let key;
      if (source[pos] === '"') key = string();
      else { const match = /^[A-Za-z_$][\w$]*/.exec(source.slice(pos)); if (!match) throw Error('unsupported_registry_key'); key = match[0]; pos += key.length; }
      if (Object.hasOwn(object, key)) throw Error('duplicate_registry_key');
      take(':'); object[key] = value(depth + 1); skip();
      if (source[pos] === ',') pos++; else if (source[pos] !== '}') throw Error('unsupported_registry_separator');
    }
  };
  const registry = value(); take(';');
  // Only the published module's read-only reference forms are understood.
  // Aliases, mutation, or new construction require an explicit parser update.
  const outside = (source.slice(0, start) + source.slice(pos)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    .replace(/export\s+const\s+PROVIDER_IDS\s*=\s*Object\.keys\(PROVIDER_REGISTRY\);/g, '')
    .replace(/return\s+PROVIDER_REGISTRY\[id\];/g, '')
    .replace(/return\s+Object\.hasOwn\(PROVIDER_REGISTRY,\s*id\);/g, '');
  if (/\bPROVIDER_REGISTRY\b/.test(outside)) throw Error('unsupported_registry_reference');
  const providers = Object.entries(registry).map(([id, p]) => {
    if (!/^[a-z][a-z0-9_-]{0,49}$/.test(id) || p.id !== id || typeof p.displayName !== 'string' || !/^[A-Za-z][A-Za-z0-9 ._-]{0,70}$/.test(p.displayName)) throw Error('invalid_provider_descriptor');
    return { id, displayName: p.displayName };
  });
  if (!providers.length || new Set(providers.map(p => p.displayName)).size !== providers.length) throw Error('invalid_registry_population');
  return providers;
}

export function tarFiles(bytes) {
  const tar = gunzipSync(bytes, { maxOutputLength: 32 * 1024 * 1024 }); const files = new Map();
  for (let pos = 0; pos + 512 <= tar.length;) {
    const header = tar.subarray(pos, pos + 512); if (header.every(b => b === 0)) break;
    const field = (a, b) => header.subarray(a, b).toString().replace(/\0.*$/s, '').trim();
    const sizeText = field(124, 136); if (!/^[0-7]+$/.test(sizeText)) throw Error('invalid_tar_size');
    const size = parseInt(sizeText, 8); const name = field(0, 100);
    if (pos + 512 + size > tar.length) throw Error('truncated_tar');
    if (['package/build/providers/registry.js', 'package/package.json'].includes(name)) {
      if (files.has(name) || !['', '0'].includes(field(156, 157))) throw Error('invalid_tar_entry');
      files.set(name, tar.subarray(pos + 512, pos + 512 + size).toString('utf8'));
    }
    pos += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

export async function publishedRegistry(version = 'latest', fetchImpl = fetch) {
  if (!/^(latest|\d+\.\d+\.\d+(?:-[\w.-]+)?)$/.test(version)) return unknown({ reason: 'invalid_package_version' });
  const metadataUrl = `https://registry.npmjs.org/open-dashboard-mcp/${version}`;
  const metadata = inspectJson(await request(metadataUrl, { fetchImpl }));
  if (!metadata.data) return unknown({ reason: 'npm_metadata_unavailable', dependencyOutcome: metadata.outcome });
  const m = metadata.data;
  if (m.name !== 'open-dashboard-mcp' || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(m.version ?? '') || !/^https:\/\/registry\.npmjs\.org\/open-dashboard-mcp\/-\/open-dashboard-mcp-[\w.-]+\.tgz$/.test(m.dist?.tarball ?? '') || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(m.dist?.integrity ?? '')) return unknown({ reason: 'npm_metadata_contract_changed' });
  const archive = await request(m.dist.tarball, { fetchImpl, accept: 'application/octet-stream' });
  if (archive.outcome || archive.status !== 200) return unknown({ reason: 'npm_artifact_unavailable' });
  try {
    const integrity = `sha512-${createHash('sha512').update(archive.bytes).digest('base64')}`;
    if (integrity !== m.dist.integrity) throw Error('integrity_mismatch');
    const files = tarFiles(archive.bytes);
    const manifest = JSON.parse(files.get('package/package.json'));
    if (manifest.name !== m.name || manifest.version !== m.version) throw Error('artifact_identity_mismatch');
    const source = files.get('package/build/providers/registry.js');
    const providers = parseRegistry(source);
    return { providers, evidence: { package: m.name, version: m.version, metadataUrl, tarballUrl: m.dist.tarball, integrity, registryPath: 'package/build/providers/registry.js', registrySha256: createHash('sha256').update(source).digest('hex'), providers } };
  } catch { return unknown({ reason: 'published_artifact_integrity_or_registry_contract_failed', version: m.version }); }
}

export function expectedProviders(data) {
  if (!Array.isArray(data?.data) || !data.data.every(object) || data.cursor !== null) throw Error('source_registry_not_complete');
  const sources = data.data.filter(s => typeof s.sourceId === 'string' && (s.sourceId === 'models_current' || /^[a-z0-9]+_models_current$/.test(s.sourceId)));
  const providers = sources.map(s => s.sourceId === 'models_current' ? 'openrouter' : s.sourceId.replace(/_models_current$/, ''));
  if (!providers.length || new Set(providers).size !== providers.length) throw Error('invalid_provider_sources');
  return { providers, sources };
}
export async function checkModels({ fetchImpl = fetch, url = URLS.models } = {}) {
  const declared = inspectJson(await request(URLS.sources, { fetchImpl }));
  let expected;
  try { expected = expectedProviders(declared.data); } catch { return unknown({ reason: 'declared_source_registry_unavailable', dependencyOutcome: declared.outcome }); }
  const counts = Object.fromEntries(expected.providers.map(p => [p, 0]));
  const rows = new Set(); const cursors = new Set(); let cursor = null; let pages = 0; const badPages = []; const extras = new Set(); let invalidRows = 0;
  do {
    if (++pages > 30) return unknown({ reason: 'pagination_budget_exceeded', pages: pages - 1 });
    const endpoint = new URL(url); endpoint.searchParams.set('limit', '500'); if (cursor) endpoint.searchParams.set('cursor', cursor);
    const page = inspectJson(await request(endpoint.href, { fetchImpl }));
    if (!page.data) return { ...page, observed: { ...page.observed, pages, completeTraversal: false } };
    const data = page.data;
    if (!Array.isArray(data.data) || !(data.cursor === null || (typeof data.cursor === 'string' && data.cursor.length > 0))) return broken('Complete, valid live-models pagination.', { pages, reason: 'invalid_collection' });
    if (data.stale !== false || data.completeness?.acquisitionComplete !== true || data.completeness?.populationCompleteness !== 'full') badPages.push(pages);
    for (const row of data.data) {
      if (!object(row) || typeof row.id !== 'string' || !row.id || typeof row.provider !== 'string') { invalidRows++; continue; }
      const key = `${row.provider}:${row.id}`;
      if (rows.has(key)) return broken('Each provider/model appears once across the full traversal.', { pages, reason: 'duplicate_row' });
      rows.add(key);
      if (Object.hasOwn(counts, row.provider)) counts[row.provider]++; else extras.add(/^[a-z0-9_-]{1,50}$/.test(row.provider) ? row.provider : 'invalid_provider_identifier');
    }
    cursor = data.cursor;
    if (cursor && cursors.has(cursor)) return broken('Pagination terminates without repeating cursors.', { pages, reason: 'repeated_cursor' });
    if (cursor) cursors.add(cursor);
  } while (cursor);
  const missing = expected.providers.filter(p => counts[p] === 0);
  const unhealthySources = expected.sources.filter(s => s.stale !== false || s.lastAttemptStatus !== 'published' || s.lastAttemptAcquisitionComplete !== true || s.lastAttemptPopulationCompleteness !== 'full' || s.failureEscalated !== false).map(s => s.sourceId);
  const observed = { rows: rows.size, pages, completeTraversal: true, present: expected.providers.length - missing.length, expected: expected.providers.length, counts, missing, unexpected: [...extras], invalidRows, badPages, unhealthySources, denominatorSource: URLS.sources };
  const assertion = 'All declared model providers have rows in a complete, fresh catalogue traversal.';
  return missing.length || extras.size || invalidRows || badPages.length || unhealthySources.length ? broken(assertion, observed) : result('HEALTHY', assertion, observed);
}

export function inspectMatrix(response) {
  const parsed = inspectJson(response); if (!parsed.data) return parsed;
  const d = parsed.data; const assertion = 'Available, fresh matrix with a consistent app/model grid and real observed cells; unknown cells remain explicit.';
  if (d.status !== 'available' || !Array.isArray(d.apps) || !Array.isArray(d.models) || !Array.isArray(d.cells)) return broken(assertion, { available: d.status === 'available' });
  const validPeriod = p => object(p) && /^\d{4}-\d{2}-\d{2}$/.test(p.start) && /^\d{4}-\d{2}-\d{2}$/.test(p.end) && Number.isFinite(Date.parse(p.start)) && Number.isFinite(Date.parse(p.end)) && p.start <= p.end && ['day', 'week', 'month'].includes(p.unit) && p.inclusive === true;
  if (!d.apps.every(a => object(a) && textValue(a.appId) && textValue(a.appName)) || !d.models.every(m => object(m) && textValue(m.modelId) && textValue(m.modelName)) || !d.cells.every(object) || !validPeriod(d.resolvedPeriod)) return broken(assertion, { reason: 'invalid_matrix_dimensions_or_period' });
  const apps = new Set(d.apps.map(a => a.appId)); const models = new Set(d.models.map(m => m.modelId)); const pairs = new Set(); let observedCells = 0; let unknownCells = 0; let invalidCells = 0;
  for (const c of d.cells) {
    const key = `${c.appId}\0${c.modelId}`;
    if (!apps.has(c.appId) || !models.has(c.modelId) || pairs.has(key)) invalidCells++;
    pairs.add(key);
    if (c.state === 'observed') {
      observedCells++;
      if (typeof c.totalTokens !== 'string' || !/^\d+$/.test(c.totalTokens) || !Number.isInteger(c.rankWithinPeriod) || c.rankWithinPeriod < 1 || !/^https:\/\//.test(c.evidenceUrl ?? '') || !validPeriod(c.period) || ['start', 'end', 'unit', 'inclusive'].some(k => c.period[k] !== d.resolvedPeriod[k])) invalidCells++;
    } else if (c.state === 'unknown') {
      unknownCells++;
      if (!['not_observed', 'unmapped_alias', 'not_published'].includes(c.reason) || c.totalTokens != null) invalidCells++;
    } else invalidCells++;
  }
  const possibleCells = apps.size * models.size;
  const observation = { apps: apps.size, models: models.size, observedCells, unknownCells, possibleCells, invalidCells, stale: d.stale, populationCompleteness: d.coverage?.populationCompleteness, unmappedObservations: d.coverage?.unmappedObservations, acquisitionComplete: d.completeness?.acquisitionComplete };
  const valid = apps.size > 0 && models.size > 0 && apps.size === d.apps.length && models.size === d.models.length && d.stale === false && invalidCells === 0 && observedCells > 0 && pairs.size === possibleCells && observedCells === d.coverage?.observedCells && possibleCells === d.coverage?.possibleCells;
  return valid ? result('HEALTHY', assertion, observation) : broken(assertion, observation);
}

export async function runSuite({ only, version = 'latest', overrideUrl } = {}) {
  const checks = []; let registry;
  for (const id of ['edition', 'models', 'matrix', 'home', 'mcp']) {
    if (only && only !== id) continue;
    const url = overrideUrl || URLS[id]; let check;
    try {
    if (id === 'models') check = await checkModels({ url });
    else {
      const response = await request(url, { accept: ['home', 'mcp'].includes(id) ? 'text/html' : 'application/json' });
      if (id === 'edition') check = inspectJson(response, 'edition');
      if (id === 'matrix') check = inspectMatrix(response);
      if (id === 'home') check = inspectHome(response);
      if (id === 'mcp') { registry = await publishedRegistry(version); check = registry.providers ? inspectHomepage(response, registry.providers) : registry; }
    }
    } catch { check = unknown({ reason: 'checker_contract_error', check: id }); }
    if (check.outcome === 'BROKEN') check.action = ({ edition: 'Check the edition publisher and generation timestamp; restore a current published edition.', models: 'Inspect the listed missing or unhealthy provider collectors and the public API publication.', matrix: 'Inspect matrix publication, app/model alias mapping and the reported coverage inconsistency.', home: 'Inspect the production static build and the served project directory.', mcp: 'Deploy the corrected web/open-dashboard/mcp/index.html from orchestrator-gpt before the next npm release; preserve the URL.' })[id];
    checks.push({ id, url, ...check });
  }
  return { schemaVersion: 1, measuredAt: new Date().toISOString(), noLiveWrites: true, databaseAccess: 'none', publishedArtifact: registry?.evidence ?? null, checks };
}
export function reportText(report) {
  const safe = sanitize(report);
  const lines = [`Measured ${safe.measuredAt}. No live database access or writes.`, ''];
  if (safe.publishedArtifact) lines.push(`Published artifact: ${safe.publishedArtifact.package}@${safe.publishedArtifact.version}; ${safe.publishedArtifact.providers.length} providers.`, '');
  for (const c of safe.checks) lines.push(`${c.outcome} ${c.id} — ${c.url}`, `Asserted: ${c.assertion}`, `Observed: ${JSON.stringify(c.observed)}`, `Action: ${c.action}`, '');
  return lines.join('\n');
}
async function main() {
  const args = process.argv.slice(2); const options = {}; let output;
  for (let i = 0; i < args.length; i += 2) {
    const value = args[i + 1]; if (!value) throw Error('invalid_arguments');
    if (args[i] === '--only' && ['edition', 'models', 'matrix', 'home', 'mcp'].includes(value)) options.only = value;
    else if (args[i] === '--url') options.overrideUrl = value;
    else if (args[i] === '--package-version') options.version = value;
    else if (args[i] === '--output') output = value;
    else throw Error('invalid_arguments');
  }
  if (options.overrideUrl) { if (!options.only) throw Error('url_requires_only'); const u = new URL(options.overrideUrl); if (u.protocol !== 'https:' || u.username || u.password) throw Error('public_https_required'); }
  const report = sanitize(await runSuite(options));
  const text = reportText(report);
  if (output) { await mkdir(dirname(resolve(output)), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); await writeFile(`${output}.md`, text); }
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text);
  console.log(text);
  process.exitCode = report.checks.some(c => c.outcome === 'BROKEN') ? 1 : report.checks.some(c => c.outcome === 'COULD_NOT_CHECK') ? 2 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.log('COULD_NOT_CHECK runner — invalid configuration or report output failure; no exception/body text emitted.'); process.exitCode = 2; });
