import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import vocabulary from "open-dashboard-mcp/contract-vocabulary.json" with { type: "json" };

// Mirrors the package's documentation exporter, using the exact installed release.
// Discovery only: provider fetches and tool invocations are never needed here.
const packageUrl = new URL(import.meta.resolve("open-dashboard-mcp/package.json"));
const manifest = JSON.parse(await readFile(packageUrl, "utf8"));
const { createServer } = await import(new URL("build/server.js", packageUrl));
const { PROVIDER_IDS, PROVIDER_REGISTRY, providerDescriptorSchema } = await import(new URL("build/providers/registry.js", packageUrl));
assert.equal(manifest.name, "open-dashboard-mcp");
assert.equal(manifest.version, vocabulary.version);
assert.deepEqual([...PROVIDER_IDS].sort(), Object.keys(PROVIDER_REGISTRY).sort());
for (const id of PROVIDER_IDS) providerDescriptorSchema.parse(PROVIDER_REGISTRY[id]);
const server = createServer({ selectedTools: vocabulary.tools, selectedProviders: PROVIDER_IDS, fetchImpl: async () => { throw new Error("Package documentation must not fetch live data."); } });
const client = new Client({ name: "open-dashboard-site-facts", version: "1.0.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const tools = (await client.listTools()).tools.map(({ name, title, description, annotations }) => ({ name, title, description, annotations })).sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(tools.map(tool => tool.name).sort(), [...vocabulary.tools].sort());
  assert.ok(tools.every(tool => tool.annotations?.readOnlyHint === true));
  const facts = { name: manifest.name, version: manifest.version, node: manifest.engines.node, providers: PROVIDER_IDS.map(id => PROVIDER_REGISTRY[id]), tools, contract: vocabulary.contract };
  const target = new URL("../web/open-dashboard/package-facts.json", import.meta.url);
  const expected = JSON.stringify(facts, null, 2) + "\n";
  if (process.argv.includes("--check")) assert.equal((await readFile(target, "utf8")).replaceAll("\r\n", "\n"), expected, "Package facts are stale; run node scripts/refresh-open-dashboard-package-facts.mjs");
  else await writeFile(target, expected);
  console.log(`Verified open-dashboard-mcp ${manifest.version}: ${facts.providers.length} providers, ${tools.length} read-only tools.`);
} finally {
  await client.close();
  await server.close();
}
