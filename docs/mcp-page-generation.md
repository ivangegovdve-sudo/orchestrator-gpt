# Package facts on the MCP and Catalogues pages

The package owns provider declarations, attributed pitches, measured caveats and tool registrations. Both pages and the catalogue runtime consume generated facts. Do not edit marked HTML blocks, `package-facts.mjs` or `package-release.json` by hand.

This release must land the site before npm publication. The site keeps its exact published npm dependency and separately documents a release candidate from an immutable package commit. The page labels these versions separately and pins installation commands to the installed, published package. Candidate provider/tool counts do not describe that installed version.

`scripts/generate-docs.ts` in the package exports `exportPackageFacts()`. It reads `PROVIDER_IDS` / `PROVIDER_REGISTRY` and obtains tools from an in-memory MCP `tools/list` handshake. No tool is called; dashboard/provider fetching during generation throws. The existing `scripts/generate-mcp-pages.mjs` remains the site's only page renderer and consumes this package export.

`web/open-dashboard/package-release.json` records the candidate facts, the immutable package Git commit, its repository, and SHA-256 of `JSON.stringify(facts)`. GitHub Actions checks out that exact commit, installs its lockfile, re-derives registry and tool facts, checks the digest, and compares the actual source registry and actual tools/list with HTML. A digest alone is not source verification; that independent checkout is required by the workflow.

## Updating the candidate

In the package checkout, run tests and `npm run docs:check`, then commit source. Do not publish npm. In the site checkout:

```powershell
npm ci --ignore-scripts
$env:MCP_PACKAGE_ROOT = 'D:\path\to\openrouter-dashboard-mcp'
node scripts/generate-mcp-pages.mjs --pin-source
node scripts/generate-mcp-pages.mjs --check-source --check
node --test scratch/tests/mcp-page-registry.test.mjs scratch/tests/catalogue-provider-registry.test.js
Remove-Item Env:MCP_PACKAGE_ROOT
npm run check:mcp-pages
npm run build
```

`--pin-source` refuses uncommitted package source changes. Push the package commit so CI can retrieve it. The pin, generated module, both HTML pages and tests belong in the site PR. `--check-source` refuses a different package HEAD even if its version matches. The source test requires `MCP_PACKAGE_ROOT`; it never substitutes npm or compares the manifest with itself.

Every generation path compares supplied or loaded facts with the pinned manifest digest before writing. Source overrides also verify the exact package HEAD. Normal generation and static/Vercel builds use the integrity-checked candidate manifest. `check:mcp-pages` and production builds separately verify that installed npm is npm latest. A new npm release or unavailable registry fails the published-version guard rather than silently promoting candidate claims. After authorized npm publication, update the exact installed dependency/lockfile and regenerate installation facts. When installed npm matches the source version, the generator compares its compiled registry and actual tools/list with the source digest before changing the page label to Published release. A same-version/different-artifact mismatch fails. That promotion is a separate reviewed change; neither this generator nor this PR publishes or merges anything.

CI checks committed output **before** building so generation cannot hide an HTML hand edit. The build generates both pages before copying to `vercel-public`; CI verifies generated sources remain unchanged. Build-time generation reads package-derived facts without manufacturing a fresh observation date.

## Required negative proof

With `MCP_PACKAGE_ROOT` set, temporarily remove one provider property from the actual source `PROVIDER_REGISTRY` in an isolated checkout, leaving generated pages unchanged. Run:

```powershell
node --test scratch/tests/mcp-page-registry.test.mjs
```

Provider-row count/set comparison and generated-output comparison must fail. Restore the exact registry and run the same test again; retain both exit statuses as evidence. A fabricated fixture mutation is additional coverage, not a replacement for this real source mutation. Repeat provider-set assertions in a browser against built pages; HTTP 200 does not prove row identity.

## Reading the data honestly

Publication flags describe the named connector: `always` means all collected models, `partial` some, `never` no published value in this connector, and `unknown` not established. Missing sampled values do not establish provider-wide absence. Pitches retain quotation, attribution, URL and observation date. Caveats retain kind, exact decimal value, units, scope, URL and date; a published quota is not a benchmark measurement. An absent caveat preserves `not_researched`, `not_found_in_checked_sources`, or explicit source-supported `not_published`.

Catalogue runtime identities come from generated descriptors. The live dashboard manifest determines which endpoints can be requested. A candidate provider absent from that manifest is not declared by this API; this says nothing about what the provider publishes. Pending reads, failures, unavailable manifests and missing sampled fields remain distinct. Partial pages stay labelled as slices; this site does not claim a full live catalogue census.
