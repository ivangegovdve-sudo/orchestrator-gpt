import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const packageRoot = process.env.MCP_PACKAGE_ROOT || resolve(require.resolve('open-dashboard-mcp/package.json'), '..');
const sourceMode = Boolean(process.env.MCP_PACKAGE_ROOT);
const load = async name => sourceMode
  ? (await import('tsx/esm/api')).tsImport(pathToFileURL(resolve(packageRoot, `src/${name}.ts`)).href, import.meta.url)
  : import(pathToFileURL(resolve(packageRoot, `build/${name}.js`)).href);
const { PROVIDER_IDS, PROVIDER_REGISTRY } = await load('providers/registry');
const pages = ['mcp', 'catalogues'];

for (const page of pages) {
  test(`${page} rendered provider-row declarations equal PROVIDER_IDS in count and content`, async () => {
    const html = await readFile(resolve(root, `web/open-dashboard/${page}/index.html`), 'utf8');
    const rows = [...html.matchAll(/<tr\b[^>]*data-provider-id="([^"]+)"/g)].map(m => m[1]);
    assert.equal(rows.length, PROVIDER_IDS.length, 'generated provider table must have one row per source registry provider');
    assert.deepEqual(rows.toSorted(), [...PROVIDER_IDS].toSorted());
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
    const counts = [...html.matchAll(/data-package-tool-count>(\d+)</g)].map(m => Number(m[1]));
    assert.ok(counts.length >= 2); assert.ok(counts.every(count => count === expected.length));
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
  assert.match(html, /data-field="contextLength" data-publication="never">Not published</);
});

test('a new npm release fails the pin guard instead of silently retaining old generated facts', async () => {
  const { assertPublishedVersion } = await import('../../scripts/generate-mcp-pages.mjs');
  await assert.rejects(assertPublishedVersion('0.8.0', async () => Response.json({ name: 'open-dashboard-mcp', version: '0.9.0' })), /differs from npm latest/);
});

test('published-package checks reject an editable source override even with a matching version', () => {
  const child = spawnSync(process.execPath, ['scripts/generate-mcp-pages.mjs', '--check-published'], { cwd: root, env: { ...process.env, MCP_PACKAGE_ROOT: packageRoot }, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /Published-package checks require the lockfile-installed artifact/);
});
