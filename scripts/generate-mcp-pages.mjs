import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const publication = Object.freeze({ always: 'Published for all collected models', partial: 'Published for some collected models', never: 'Not published in this connector', unknown: 'Unknown — not established by this package' });
const billing = Object.freeze({ api: 'Billing API', no_billing_api: 'No billing API', unknown: 'Unknown — not established by this package' });
const providerKinds = Object.freeze({ aggregator: 'Multi-provider aggregator', media: 'Media generation platform', model_provider: 'Model provider' });

export async function loadInstalledPackageFacts({ packageRoot } = {}) {
  const sourceMode = Boolean(packageRoot);
  packageRoot ||= dirname(require.resolve('open-dashboard-mcp/package.json'));
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  if (manifest.name !== 'open-dashboard-mcp') throw Error('Expected the open-dashboard-mcp package.');
  const load = async name => sourceMode
    ? (await import('tsx/esm/api')).tsImport(pathToFileURL(resolve(packageRoot, `src/${name}.ts`)).href, import.meta.url)
    : import(pathToFileURL(resolve(packageRoot, `build/${name}.js`)).href);
  const { PROVIDER_REGISTRY, PROVIDER_IDS } = await load('providers/registry');
  if (!PROVIDER_IDS.length || PROVIDER_IDS.length !== new Set(PROVIDER_IDS).size || JSON.stringify([...PROVIDER_IDS].sort()) !== JSON.stringify(Object.keys(PROVIDER_REGISTRY).sort())) throw Error('Invalid package provider registry.');
  const providers = PROVIDER_IDS.map(id => {
    const p = PROVIDER_REGISTRY[id];
    if (p.id !== id || !p.displayName || !p.publishes || Object.values(p.publishes).some(state => !Object.hasOwn(publication, state)) || !Object.hasOwn(billing, p.spendVisibility)) throw Error('Unsupported package publication contract.');
    for (const field of ['pricing', 'contextLength', 'outputModalities', 'lifecycle']) if (!Object.hasOwn(p.publishes, field)) throw Error('Missing package publication field.');
    for (const field of ['catalogueUrl', 'citationUrl']) if (new URL(p[field]).protocol !== 'https:') throw Error('Expected public HTTPS provider source.');
    return p;
  });
  // The server registration graph, not a count of source files or regex matches.
  // Network is forbidden for this tools/list handshake; no tool is called.
  const { createServer } = await load('server');
  const packageRequire = createRequire(resolve(packageRoot, 'package.json'));
  const { Client, InMemoryTransport } = packageRequire('@modelcontextprotocol/client');
  const server = createServer({ fetchImpl: () => { throw Error('Page generation must not fetch dashboard data.'); } });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'mcp-page-generator', version: '1.0.0' });
  let tools;
  try {
    await server.connect(serverTransport); await client.connect(clientTransport);
    tools = (await client.listTools()).tools.map(({ name, title, description, annotations }) => ({ name, title, description, annotations })).sort((a, b) => a.name.localeCompare(b.name));
  } finally { await client.close(); await server.close(); }
  if (!tools.length || tools.length !== new Set(tools.map(t => t.name)).size || tools.some(t => t.annotations?.readOnlyHint !== true)) throw Error('Page read-only tool contract changed.');
  return { name: manifest.name, version: manifest.version, node: manifest.engines.node, providers, tools };
}

export const factsDigest = facts => createHash('sha256').update(JSON.stringify(facts)).digest('hex');
export function assertInstalledReleaseFacts(sourceFacts, installedFacts) {
  if (installedFacts.version === sourceFacts.version && factsDigest(installedFacts) !== factsDigest(sourceFacts)) throw Error('Installed npm artifact differs from the pinned source release despite matching versions.');
}
export function validateReleaseManifest(manifest) {
  if (manifest.schemaVersion !== 1 || !['release_candidate', 'published'].includes(manifest.channel) || manifest.source?.repository !== 'ivangegovdve-sudo/openrouter-dashboard-mcp' || !/^[a-f0-9]{40}$/.test(manifest.source?.commit || '') || !/^[a-f0-9]{64}$/.test(manifest.source?.factsSha256 || '') || manifest.facts?.name !== 'open-dashboard-mcp' || manifest.source.factsSha256 !== factsDigest(manifest.facts)) throw Error('Invalid or altered package source release manifest.');
  return manifest;
}
export async function readReleaseManifest({ siteRoot = root } = {}) {
  return validateReleaseManifest(JSON.parse(await readFile(resolve(siteRoot, 'web/open-dashboard/package-release.json'), 'utf8')));
}

export function publishedReleaseManifest(release, installedFacts) {
  validateReleaseManifest(release);
  if (installedFacts.version !== release.facts.version) throw Error('Published promotion requires the installed npm artifact to match the pinned source version.');
  assertInstalledReleaseFacts(release.facts, installedFacts);
  return { ...release, channel: 'published' };
}

/** Explicit promotion after publication; no source, dependency or registry substitution. */
export async function promotePublishedManifest() {
  const release = await assertSourceManifest();
  const installedFacts = await loadInstalledPackageFacts();
  const published = publishedReleaseManifest(release, installedFacts);
  await assertPublishedVersion(installedFacts.version);
  await writeFile(resolve(root, 'web/open-dashboard/package-release.json'), JSON.stringify(published, null, 2) + '\n');
  return published;
}

export async function loadPackageFacts({ packageRoot = process.env.MCP_PACKAGE_ROOT } = {}) {
  if (!packageRoot) return (await readReleaseManifest()).facts;
  const { exportPackageFacts } = await (await import('tsx/esm/api')).tsImport(pathToFileURL(resolve(packageRoot, 'scripts/generate-docs.ts')).href, import.meta.url);
  return exportPackageFacts();
}

export async function assertSourceManifest({ packageRoot = process.env.MCP_PACKAGE_ROOT, facts } = {}) {
  if (!packageRoot) throw Error('Source verification requires MCP_PACKAGE_ROOT pointing at the pinned package checkout.');
  const release = await readReleaseManifest();
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8', windowsHide: true }).trim();
  if (commit !== release.source.commit) throw Error('Package checkout commit differs from the immutable source release pin.');
  facts ||= await loadPackageFacts({ packageRoot });
  if (factsDigest(facts) !== release.source.factsSha256) throw Error('Package registry or tools/list differs from the pinned release facts.');
  return release;
}

export async function pinSourceManifest({ packageRoot = process.env.MCP_PACKAGE_ROOT } = {}) {
  if (!packageRoot) throw Error('Pinning requires MCP_PACKAGE_ROOT.');
  const status = execFileSync('git', ['status', '--porcelain', '--', 'src', 'scripts/generate-docs.ts', 'package.json', 'package-lock.json'], { cwd: packageRoot, encoding: 'utf8', windowsHide: true }).trim();
  if (status) throw Error('Commit package source changes before pinning a release.');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8', windowsHide: true }).trim();
  const facts = await loadPackageFacts({ packageRoot });
  const manifest = { schemaVersion: 1, channel: 'release_candidate', source: { repository: 'ivangegovdve-sudo/openrouter-dashboard-mcp', commit, factsSha256: factsDigest(facts) }, facts };
  await writeFile(resolve(root, 'web/open-dashboard/package-release.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function researchStatus(research) {
  if (!research || research.status === 'not_researched') return 'Not researched';
  if (research.status === 'not_found_in_checked_sources') return `Not found in checked sources (${escape(research.observedAt)})`;
  if (research.status === 'not_published') return `Not published — “${escape(research.providerStatement.text)}” (<a href="${escape(research.providerStatement.sourceUrl)}">${escape(research.providerStatement.attribution)}</a>)`;
  return 'Published evidence below';
}
export function providerEvidence(p) {
  const pitch = p.pitch ? `<blockquote data-provider-pitch>“${escape(p.pitch.text)}” <cite>— <a href="${escape(p.pitch.sourceUrl)}">${escape(p.pitch.attribution)}</a></cite></blockquote><small>Observed ${escape(p.pitch.observedAt)}</small>` : `<p data-pitch-status="${escape(p.pitchResearch?.status || 'not_researched')}">Pitch: ${researchStatus(p.pitchResearch)}</p>`;
  const caveats = p.caveats?.length ? `<ul data-provider-caveats>${p.caveats.map(c => `<li data-caveat-kind="${escape(c.kind)}"><strong>${escape(c.value)} ${escape(c.unit)}</strong> — ${escape(c.scope)} <a href="${escape(c.sourceUrl)}">Provider source</a>; observed ${escape(c.observedAt)}.</li>`).join('')}</ul>` : `<p data-caveat-status="${escape(p.caveatResearch?.status || 'not_researched')}">Caveats: ${researchStatus(p.caveatResearch)}</p>`;
  return pitch + caveats;
}

function providerRole(p) {
  if (p.providerKind === undefined) return '';
  if (!Object.hasOwn(providerKinds, p.providerKind)) throw Error('Unsupported package provider kind.');
  return `<br><small data-provider-kind="${p.providerKind}">${providerKinds[p.providerKind]}</small>`;
}

export function providerTable(facts, { published = false } = {}) {
  const rows = facts.providers.map(p => `<tr data-provider-id="${escape(p.id)}"><th scope="row">${escape(p.displayName)}${providerRole(p)}</th><td class="package-provider-evidence">${providerEvidence(p)}</td><td><a href="${escape(p.catalogueUrl)}">Catalogue source</a><br><a href="${escape(p.citationUrl)}">Documentation</a></td>${['pricing', 'contextLength', 'outputModalities', 'lifecycle'].map(field => `<td data-field="${field}" data-publication="${p.publishes[field]}">${publication[p.publishes[field]]}</td>`).join('')}<td data-field="spendVisibility" data-publication="${p.spendVisibility}">${billing[p.spendVisibility]}</td></tr>`).join('\n');
  return `<section class="package-coverage" id="package-coverage" aria-labelledby="package-coverage-heading">
<h2 id="package-coverage-heading">Package publication declarations</h2>
<p>Publication flags describe the registry's named catalogue connector. “Not published in this connector” does not establish provider-wide absence. “Unknown” means the package has not established it. Neither means zero or free.</p>
<div class="package-table-scroll" role="region" aria-label="Provider publication states" tabindex="0"><table class="package-provider-table">
<caption>Generated from ${escape(facts.name)} ${escape(facts.version)} ${published ? 'published release' : 'release candidate'}: <span data-package-provider-count>${facts.providers.length}</span> providers. These are package declarations, not a fresh provider probe. Pitches and measured caveats carry their own source and observation date; publication flags describe the connector.</caption>
<thead><tr><th scope="col">Provider</th><th scope="col">Provider's words and caveats</th><th scope="col">Sources</th><th scope="col">Pricing</th><th scope="col">Context</th><th scope="col">Modality</th><th scope="col">Lifecycle</th><th scope="col">Spend visibility</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<p class="package-coverage-note">Catalogue availability in the dashboard is measured separately below or in <a href="/web/open-dashboard/catalogues/index.html">Catalogues</a>. An unavailable source does not establish that a provider publishes nothing. Provider-specific documents and pricing windows can add evidence beyond these catalogue declarations.</p>
</section>`;
}
export function generatedBlocks(facts, page, { installedVersion, source, channel = 'release_candidate' } = {}) {
  const names = facts.providers.map(p => p.displayName).join(' · ');
  const label = `${escape(facts.name)} ${escape(facts.version)}`;
  if (!['release_candidate', 'published'].includes(channel)) throw Error('Unsupported release channel.');
  const published = channel === 'published';
  if (published && installedVersion !== facts.version) throw Error('Published page version differs from installed npm.');
  const releaseLabel = published ? 'Published release' : 'Release candidate';
  const blocks = {
    meta: `<meta name="description" content="${escape(page === 'mcp' ? `${facts.name} ${facts.version} ${releaseLabel.toLowerCase()}: ${facts.tools.length} read-only tools and ${facts.providers.length} registered providers. ${names}.` : `${releaseLabel} publication declarations and live catalogue evidence for ${names}. Unmeasured fields stay unknown.`)}">`,
    hero: page === 'mcp'
      ? `<header class="oo-header mcp-hero"><div><p class="forest-kicker">${releaseLabel} · ${label} · <span data-package-tool-count>${facts.tools.length}</span> read-only tools</p><h1>Open Dashboard MCP</h1></div><p>${facts.tools.length} read-only tools for model evidence, source health and GitHub movement. Provider coverage comes from the package registry.</p></header>`
      : `<header class="oo-header"><div><p class="forest-kicker">${escape(names)}</p><h1>Provider catalogues</h1></div><p>${label} ${releaseLabel.toLowerCase()} declarations and live dashboard measurements have different sources. Missing measurements stay unknown.</p></header>`,
    providers: providerTable(facts, { published }),
  };
  if (page === 'catalogues') blocks.banner = `<a class="oo-mcp-banner" href="/web/open-dashboard/mcp/index.html"><span class="oo-mcp-banner-tag">MCP server</span><span class="oo-mcp-banner-text">${releaseLabel} ${escape(facts.version)}: <span data-package-provider-count>${facts.providers.length}</span> providers · <span data-package-tool-count>${facts.tools.length}</span> tools. Published npm ${escape(installedVersion)}: <code>npx -y open-dashboard-mcp@${escape(installedVersion)}</code></span><span class="oo-mcp-banner-go" aria-hidden="true">Setup and tools &rarr;</span></a>`;
  if (source) blocks.release = `<aside class="package-release-note"><p><strong>Source release candidate: ${escape(facts.version)}.</strong> <span data-package-provider-count>${facts.providers.length}</span> registered providers and <span data-package-tool-count>${facts.tools.length}</span> read-only tools. Provider and tool facts below describe this candidate. <strong>Published npm package: <span data-installed-package-version>${escape(installedVersion)}</span>.</strong> Install commands use that published version.</p><p><a href="https://github.com/${escape(source.repository)}/commit/${escape(source.commit)}">Source commit (repository access required)</a> · <a href="/web/open-dashboard/package-release.json">Generated release manifest and integrity digest</a></p></aside>`;
  if (source && published) blocks.release = `<aside class="package-release-note"><p><strong>Published release: <span data-installed-package-version>${escape(installedVersion)}</span>.</strong> <span data-package-provider-count>${facts.providers.length}</span> registered providers and <span data-package-tool-count>${facts.tools.length}</span> read-only tools. Installed npm facts match the pinned source release.</p><p><a href="https://github.com/${escape(source.repository)}/commit/${escape(source.commit)}">Source commit (repository access required)</a> · <a href="/web/open-dashboard/package-release.json">Generated source manifest and integrity digest</a></p></aside>`;
  if (page === 'mcp') {
    blocks.facts = `<div class="mcp-signal-grid" aria-label="MCP release facts"><div class="mcp-signal"><strong data-package-tool-count>${facts.tools.length}</strong><span>read-only tools</span></div><div class="mcp-signal"><strong data-package-provider-count>${facts.providers.length}</strong><span>provider registry</span></div><div class="mcp-signal"><strong>${escape(facts.node)}</strong><span>required Node version</span></div><div class="mcp-signal"><strong>${escape(facts.version)}</strong><span>${releaseLabel.toLowerCase()}</span></div></div>`;
    if (installedVersion) blocks.install = `<div class="mcp-install-grid"><article class="mcp-card"><span class="mcp-badge">Claude Code</span><pre><code>claude mcp add open-dashboard -- npx -y open-dashboard-mcp@${escape(installedVersion)}</code></pre><p>Registers the published version for Claude Code.</p></article><article class="mcp-card"><span class="mcp-badge">Claude Desktop</span><pre><code>${escape(JSON.stringify({ mcpServers: { 'open-dashboard': { command: 'npx', args: ['-y', `open-dashboard-mcp@${installedVersion}`] } } }, null, 2))}</code></pre></article><article class="mcp-card"><span class="mcp-badge">Any MCP client</span><pre><code>npx -y open-dashboard-mcp@${escape(installedVersion)}</code></pre><p>${published ? 'Installs the published release documented here.' : 'Installs the published version, which may expose fewer tools and providers than the candidate documented here.'}</p></article></div>`;
    // Titles come from tool registrations. Several upstream descriptions still
    // enumerate an older provider subset, so they are not copied as fresh claims.
    blocks.tools = `<div class="mcp-tool-grid">${facts.tools.map(t => `<article class="mcp-card mcp-tool" data-package-tool="${escape(t.name)}"><h3><code>${escape(t.name)}</code></h3><p>${escape(t.title || t.name)}</p></article>`).join('\n')}</div>`;
  }
  return blocks;
}
export function replaceGenerated(html, blocks) {
  for (const [id, content] of Object.entries(blocks)) {
    const begin = `<!-- package:${id}:begin generated, do not edit -->`;
    const end = `<!-- package:${id}:end -->`;
    if (html.split(begin).length !== 2 || html.split(end).length !== 2 || html.indexOf(end) < html.indexOf(begin)) throw Error(`Missing or duplicate package:${id} markers.`);
    html = html.slice(0, html.indexOf(begin) + begin.length) + '\n' + content + '\n' + html.slice(html.indexOf(end));
  }
  return html;
}
export async function generate({ check = false, siteRoot = root, facts } = {}) {
  facts ||= await loadPackageFacts(); const changed = [];
  const release = await readReleaseManifest();
  if (factsDigest(facts) !== release.source.factsSha256) throw Error('Generated package facts disagree with the pinned source release; commit and repin before rendering.');
  if (process.env.MCP_PACKAGE_ROOT) await assertSourceManifest({ facts });
  const installedManifest = JSON.parse(await readFile(require.resolve('open-dashboard-mcp/package.json'), 'utf8'));
  if (release.channel === 'published') publishedReleaseManifest(release, await loadInstalledPackageFacts());
  else if (installedManifest.version === facts.version) assertInstalledReleaseFacts(facts, await loadInstalledPackageFacts());
  const presentation = { installedVersion: installedManifest.version, source: release.source, channel: release.channel };
  for (const page of ['mcp', 'catalogues']) {
    const path = resolve(siteRoot, `web/open-dashboard/${page}/index.html`);
    const actual = (await readFile(path, 'utf8')).replaceAll('\r\n', '\n');
    const expected = replaceGenerated(actual, generatedBlocks(facts, page, presentation));
    if (actual !== expected) { changed.push(`web/open-dashboard/${page}/index.html`); if (!check) await writeFile(path, expected); }
  }
  const modulePath = resolve(siteRoot, 'web/open-dashboard/package-facts.mjs');
  const moduleText = `// Generated from the pinned package release source; generated-do-not-edit.\nexport const PACKAGE_FACTS = ${JSON.stringify(facts, null, 2)};\n`;
  let actualModule = ''; try { actualModule = (await readFile(modulePath, 'utf8')).replaceAll('\r\n', '\n'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (actualModule !== moduleText) { changed.push('web/open-dashboard/package-facts.mjs'); if (!check) await writeFile(modulePath, moduleText); }
  if (check && changed.length) throw Error(`Generated package facts disagree with the package: ${changed.join(', ')}. Run npm run generate:mcp-pages.`);
  return { version: facts.version, providers: facts.providers.length, tools: facts.tools.length, changed };
}
export async function assertPublishedVersion(version, fetchImpl = fetch) {
  const response = await fetchImpl('https://registry.npmjs.org/open-dashboard-mcp/latest', { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw Error('Could not verify the current published MCP version.');
  const latest = await response.json();
  if (latest.name !== 'open-dashboard-mcp' || latest.version !== version) throw Error('The package pin differs from npm latest. Update the dependency and regenerate both pages.');
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--check', '--check-published', '--check-source', '--pin-source', '--promote-published'].includes(arg))) throw Error('Use --check, --check-published, --check-source, --pin-source or --promote-published.');
  if (args.includes('--promote-published') && (args.includes('--check') || args.includes('--pin-source'))) throw Error('Published promotion is an explicit write operation; do not combine it with --check or --pin-source.');
  if (args.includes('--pin-source')) await pinSourceManifest();
  if (args.includes('--promote-published')) await promotePublishedManifest();
  const facts = await loadPackageFacts();
  if (args.includes('--check-source') || (args.includes('--check-published') && process.env.MCP_PACKAGE_ROOT)) await assertSourceManifest({ facts });
  if (args.includes('--check-published')) await assertPublishedVersion((await loadInstalledPackageFacts()).version);
  console.log(JSON.stringify(await generate({ check: args.includes('--check'), facts })));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
