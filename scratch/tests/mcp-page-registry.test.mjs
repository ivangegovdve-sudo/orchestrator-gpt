import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const packageRoot = process.env.MCP_PACKAGE_ROOT;
if (!packageRoot) throw Error('Set MCP_PACKAGE_ROOT to the pinned package source checkout; this guard must compare against the actual source registry and tools/list.');
const load = async name => (await import('tsx/esm/api')).tsImport(pathToFileURL(resolve(packageRoot, `src/${name}.ts`)).href, import.meta.url);
const { PROVIDER_IDS, PROVIDER_REGISTRY } = await load('providers/registry');
const pages = ['mcp', 'catalogues'];

for (const page of pages) {
  test(`${page} rendered provider-row declarations equal PROVIDER_IDS in count and content`, async () => {
    const html = await readFile(resolve(root, `web/open-dashboard/${page}/index.html`), 'utf8');
    const rows = [...html.matchAll(/<tr\b[^>]*data-provider-id="([^"]+)"/g)].map(m => m[1]);
    assert.equal(rows.length, PROVIDER_IDS.length, 'generated provider table must have one row per source registry provider');
    assert.deepEqual(rows.toSorted(), [...PROVIDER_IDS].toSorted());
    const counts = [...html.matchAll(/data-package-provider-count>(\d+)</g)].map(m => Number(m[1]));
    assert.ok(counts.length > 0);
    assert.ok(counts.every(count => count === PROVIDER_IDS.length));
  });
  test(`${page} carries each source publication state without turning unknown into never`, async () => {
    const html = await readFile(resolve(root, `web/open-dashboard/${page}/index.html`), 'utf8');
    for (const id of PROVIDER_IDS) {
      const row = html.match(new RegExp(`<tr\\b[^>]*data-provider-id="${id}"[^>]*>([\\s\\S]*?)<\\/tr>`))?.[1];
      assert.ok(row, `missing ${id}`);
      for (const field of ['pricing', 'contextLength', 'outputModalities', 'lifecycle']) {
        assert.ok(row.includes(`data-field="${field}" data-publication="${PROVIDER_REGISTRY[id].publishes[field]}"`), `${id}.${field} must preserve its registry state`);
      }
    }
  });
}

test('MCP tool names and every displayed count match the real tools/list registration graph', async () => {
  const { createServer } = await load('server');
  const packageRequire = createRequire(resolve(packageRoot, 'package.json'));
  const { Client, InMemoryTransport } = packageRequire('@modelcontextprotocol/client');
  const server = createServer({ fetchImpl: () => { throw Error('tools/list must never fetch'); } });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'page-truth-guard', version: '1.0.0' });
  try {
    await server.connect(serverTransport); await client.connect(clientTransport);
    const expected = (await client.listTools()).tools.map(t => t.name).sort();
    const html = await readFile(resolve(root, 'web/open-dashboard/mcp/index.html'), 'utf8');
    const actual = [...html.matchAll(/data-package-tool="([^"]+)"/g)].map(m => m[1]).sort();
    assert.deepEqual(actual, expected);
    for (const page of pages) {
      const pageHtml = await readFile(resolve(root, `web/open-dashboard/${page}/index.html`), 'utf8');
      const counts = [...pageHtml.matchAll(/data-package-tool-count>(\d+)</g)].map(m => Number(m[1]));
      assert.ok(counts.length > 0); assert.ok(counts.every(count => count === expected.length));
    }
  } finally { await client.close(); await server.close(); }
});

test('committed blocks and runtime facts match the package, including edits to counts or labels', async () => {
  const { generate, loadPackageFacts } = await import('../../scripts/generate-mcp-pages.mjs');
  await generate({ check: true });
  const temporary = await mkdtemp(resolve(tmpdir(), 'mcp-page-drift-'));
  try {
    for (const page of pages) {
      const directory = resolve(temporary, `web/open-dashboard/${page}`); await mkdir(directory, { recursive: true });
      let html = await readFile(resolve(root, `web/open-dashboard/${page}/index.html`), 'utf8');
      if (page === 'mcp') html = html.replace(/data-package-tool-count>\d+</, 'data-package-tool-count>999<');
      await writeFile(resolve(directory, 'index.html'), html);
    }
    await writeFile(resolve(temporary, 'web/open-dashboard/package-facts.mjs'), await readFile(resolve(root, 'web/open-dashboard/package-facts.mjs')));
    await assert.rejects(generate({ check: true, siteRoot: temporary, facts: await loadPackageFacts() }), /disagree/);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('unknown publication data renders as unknown while never remains Not published', async () => {
  const { providerTable, loadPackageFacts } = await import('../../scripts/generate-mcp-pages.mjs');
  const facts = structuredClone(await loadPackageFacts());
  facts.providers[0].publishes.pricing = 'unknown';
  facts.providers[0].publishes.contextLength = 'never';
  const html = providerTable(facts);
  assert.match(html, /data-field="pricing" data-publication="unknown">Unknown — not established/);
  assert.match(html, /data-field="contextLength" data-publication="never">Not published in this connector</);
});

test('a new npm release fails the pin guard instead of silently retaining old generated facts', async () => {
  const { assertPublishedVersion } = await import('../../scripts/generate-mcp-pages.mjs');
  await assert.rejects(assertPublishedVersion('0.8.0', async () => Response.json({ name: 'open-dashboard-mcp', version: '0.9.0' })), /differs from npm latest/);
});

test('candidate manifest matches an immutable package commit and independently regenerated facts', async () => {
  const { assertSourceManifest } = await import('../../scripts/generate-mcp-pages.mjs');
  await assertSourceManifest();
});

test('candidate labels are separate from the installed npm version and installation pins', async () => {
  const { readReleaseManifest } = await import('../../scripts/generate-mcp-pages.mjs');
  const release = await readReleaseManifest();
  const installed = JSON.parse(await readFile(require.resolve('open-dashboard-mcp/package.json'), 'utf8'));
  const html = await readFile(resolve(root, 'web/open-dashboard/mcp/index.html'), 'utf8');
  assert.ok(html.includes(release.channel === 'published' ? 'Published release:' : 'Source release candidate:'));
  assert.ok(html.includes('Source commit (repository access required)'));
  assert.ok(html.includes(`data-installed-package-version>${installed.version}</span>`));
  assert.ok(html.includes(`open-dashboard-mcp@${installed.version}`));
  const catalogue = await readFile(resolve(root, 'web/open-dashboard/catalogues/index.html'), 'utf8');
  assert.ok(catalogue.includes('<!-- package:banner:begin generated, do not edit -->'));
  const banner = catalogue.match(/<a class="oo-mcp-banner"[\s\S]*?<\/a>/)?.[0];
  assert.ok(banner?.includes(`open-dashboard-mcp@${installed.version}`));
  assert.doesNotMatch(banner, /same published data/i);
});

test('matching a version string cannot promote different package facts as published', async () => {
  const { loadInstalledPackageFacts, assertInstalledReleaseFacts } = await import('../../scripts/generate-mcp-pages.mjs');
  const installed = await loadInstalledPackageFacts();
  const facts = structuredClone(installed);
  assert.doesNotThrow(() => assertInstalledReleaseFacts(facts, installed));
  facts.providers[0].displayName = 'Changed package fact';
  assert.throws(() => assertInstalledReleaseFacts(facts, installed), /Installed npm artifact differs/);
});

test('manifest integrity catches altered facts before generation', async () => {
  const { readReleaseManifest } = await import('../../scripts/generate-mcp-pages.mjs');
  const temporary = await mkdtemp(resolve(tmpdir(), 'mcp-release-integrity-'));
  try {
    await mkdir(resolve(temporary, 'web/open-dashboard'), { recursive: true });
    const release = await readReleaseManifest();
    release.facts.providers.pop();
    await writeFile(resolve(temporary, 'web/open-dashboard/package-release.json'), JSON.stringify(release));
    await assert.rejects(readReleaseManifest({ siteRoot: temporary }), /Invalid or altered/);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('write-mode generation rejects altered source facts instead of labelling them with an older immutable pin', async () => {
  const { generate, loadPackageFacts } = await import('../../scripts/generate-mcp-pages.mjs');
  const temporary = await mkdtemp(resolve(tmpdir(), 'mcp-source-substitution-'));
  try {
    for (const page of pages) {
      await mkdir(resolve(temporary, `web/open-dashboard/${page}`), { recursive: true });
      await writeFile(resolve(temporary, `web/open-dashboard/${page}/index.html`), await readFile(resolve(root, `web/open-dashboard/${page}/index.html`)));
    }
    await writeFile(resolve(temporary, 'web/open-dashboard/package-facts.mjs'), await readFile(resolve(root, 'web/open-dashboard/package-facts.mjs')));
    const facts = structuredClone(await loadPackageFacts());
    facts.providers[0].displayName = 'Altered candidate source';
    await assert.rejects(generate({ siteRoot: temporary, facts }), /pinned source release/);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('provider quotes, caveat units and their absence states retain their source meaning', async () => {
  const { loadPackageFacts, providerEvidence } = await import('../../scripts/generate-mcp-pages.mjs');
  const facts = await loadPackageFacts();
  const groq = facts.providers.find(p => p.id === 'groq');
  assert.ok(groq.caveats.some(c => c.value === '8000' && c.unit === 'tokens/minute'));
  const html = providerEvidence(groq);
  assert.ok(html.includes(groq.pitch.sourceUrl));
  assert.ok(html.includes('tokens/minute'));
  const none = providerEvidence({ pitchResearch: { status: 'not_researched' }, caveatResearch: { status: 'not_found_in_checked_sources', observedAt: '2026-09-08' } });
  assert.match(none, /Pitch: Not researched/);
  assert.match(none, /Caveats: Not found in checked sources/);
  assert.doesNotMatch(none, /Not published/);
});
