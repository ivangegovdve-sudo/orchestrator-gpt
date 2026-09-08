import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const publication = Object.freeze({ always: 'Published for all models', partial: 'Published for some models', never: 'Not published', unknown: 'Unknown — not established by this package' });
const billing = Object.freeze({ api: 'Billing API', no_billing_api: 'No billing API', unknown: 'Unknown — not established by this package' });

export async function loadPackageFacts({ packageRoot = process.env.MCP_PACKAGE_ROOT } = {}) {
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

export function providerTable(facts) {
  const rows = facts.providers.map(p => `<tr data-provider-id="${escape(p.id)}"><th scope="row">${escape(p.displayName)}</th><td><a href="${escape(p.catalogueUrl)}">Catalogue source</a><br><a href="${escape(p.citationUrl)}">Documentation</a></td>${['pricing', 'contextLength', 'outputModalities', 'lifecycle'].map(field => `<td data-field="${field}" data-publication="${p.publishes[field]}">${publication[p.publishes[field]]}</td>`).join('')}<td data-field="spendVisibility" data-publication="${p.spendVisibility}">${billing[p.spendVisibility]}</td></tr>`).join('\n');
  return `<section class="package-coverage" id="package-coverage" aria-labelledby="package-coverage-heading">
<h2 id="package-coverage-heading">Package publication declarations</h2>
<p>“Not published” means the package registry declares that the provider does not publish this field. “Unknown” means the package has not established it. Neither means zero or free.</p>
<div class="package-table-scroll" role="region" aria-label="Provider publication states" tabindex="0"><table class="package-provider-table">
<caption>Generated from ${escape(facts.name)} ${escape(facts.version)}: <span data-package-provider-count>${facts.providers.length}</span> providers. These are package declarations, not a fresh provider probe. Field-level observation dates are not supplied by the registry.</caption>
<thead><tr><th scope="col">Provider</th><th scope="col">Sources</th><th scope="col">Pricing</th><th scope="col">Context</th><th scope="col">Modality</th><th scope="col">Lifecycle</th><th scope="col">Spend visibility</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<p class="package-coverage-note">Catalogue availability in the dashboard is measured separately below or in <a href="/web/open-dashboard/catalogues/index.html">Catalogues</a>. An unavailable source does not establish that a provider publishes nothing. Provider-specific documents and pricing windows can add evidence beyond these catalogue declarations.</p>
</section>`;
}
export function generatedBlocks(facts, page) {
  const names = facts.providers.map(p => p.displayName).join(' · ');
  const label = `${escape(facts.name)} ${escape(facts.version)}`;
  const blocks = {
    meta: `<meta name="description" content="${escape(page === 'mcp' ? `${facts.name} ${facts.version}: ${facts.tools.length} read-only tools and ${facts.providers.length} registered providers. ${names}.` : `Package publication declarations and live catalogue evidence for ${names}. Unmeasured fields stay unknown.`)}">`,
    hero: page === 'mcp'
      ? `<header class="oo-header mcp-hero"><div><p class="forest-kicker">npm package · ${label} · <span data-package-tool-count>${facts.tools.length}</span> read-only tools</p><h1>Open Dashboard MCP</h1></div><p>${facts.tools.length} read-only tools for model evidence, source health and GitHub movement. Provider coverage comes from the package registry.</p></header>`
      : `<header class="oo-header"><div><p class="forest-kicker">${escape(names)}</p><h1>Provider catalogues</h1></div><p>Package publication declarations and live dashboard measurements have different sources. Missing measurements stay unknown.</p></header>`,
    providers: providerTable(facts),
  };
  if (page === 'mcp') {
    blocks.facts = `<div class="mcp-signal-grid" aria-label="MCP package facts"><div class="mcp-signal"><strong data-package-tool-count>${facts.tools.length}</strong><span>read-only tools</span></div><div class="mcp-signal"><strong data-package-provider-count>${facts.providers.length}</strong><span>provider registry</span></div><div class="mcp-signal"><strong>${escape(facts.node)}</strong><span>required Node version</span></div><div class="mcp-signal"><strong>${escape(facts.version)}</strong><span>package version</span></div></div>`;
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
  for (const page of ['mcp', 'catalogues']) {
    const path = resolve(siteRoot, `web/open-dashboard/${page}/index.html`);
    const actual = (await readFile(path, 'utf8')).replaceAll('\r\n', '\n');
    const expected = replaceGenerated(actual, generatedBlocks(facts, page));
    if (actual !== expected) { changed.push(`web/open-dashboard/${page}/index.html`); if (!check) await writeFile(path, expected); }
  }
  const modulePath = resolve(siteRoot, 'web/open-dashboard/package-facts.mjs');
  const moduleText = `// Generated from the installed open-dashboard-mcp package; do not edit.\nexport const PACKAGE_FACTS = ${JSON.stringify(facts, null, 2)};\n`;
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
  if (args.some(arg => !['--check', '--check-published'].includes(arg))) throw Error('Use --check and/or --check-published.');
  if (args.includes('--check-published') && process.env.MCP_PACKAGE_ROOT) throw Error('Published-package checks require the lockfile-installed artifact; unset MCP_PACKAGE_ROOT.');
  const facts = await loadPackageFacts();
  if (args.includes('--check-published')) await assertPublishedVersion(facts.version);
  console.log(JSON.stringify(await generate({ check: args.includes('--check'), facts })));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
