# Package facts on the MCP and Catalogues pages

The package owns provider declarations, attributed pitches, measured caveats and tool registrations. Both pages and the catalogue runtime consume generated facts. Do not edit marked HTML blocks, `package-facts.mjs` or `package-release.json` by hand.

This release must land the site before npm publication. The site keeps its exact published npm dependency and separately documents a release candidate from an immutable package commit. The page labels these versions separately and pins installation commands to the installed, published package. Candidate provider/tool counts do not describe that installed version. The catalogue banner is generated too: it names the candidate counts and separately pins its npm command to the installed published version.

`scripts/generate-docs.ts` in the package exports `exportPackageFacts()`. It reads `PROVIDER_IDS` / `PROVIDER_REGISTRY` and obtains tools from an in-memory MCP `tools/list` handshake. No tool is called; dashboard/provider fetching during generation throws. The existing `scripts/generate-mcp-pages.mjs` remains the site's only page renderer and consumes this package export.

`web/open-dashboard/package-release.json` records the candidate facts, the immutable package Git commit, its repository, and SHA-256 of `JSON.stringify(facts)`. GitHub Actions checks out that exact commit, installs its lockfile, re-derives registry and tool facts, checks the digest, and compares the actual source registry and actual tools/list with HTML. A digest alone is not source verification; that independent checkout is required by the workflow.

## Private package source access

The package repository is private. The site's default `GITHUB_TOKEN` cannot read it. This workflow requires an Actions secret named `MCP_PACKAGE_READ_TOKEN`, granting **Contents: read** access to `ivangegovdve-sudo/openrouter-dashboard-mcp`. Prefer a fine-grained credential restricted to that repository; no write scope is needed. The token is supplied only to the package checkout, with `persist-credentials: false`. The preflight exposes only whether configuration exists, never its value.

Provisioning or granting this access requires Ivan's approval. The code change does not create a credential, configure a secret or alter repository visibility. Until approved access is configured, CI fails before package-checkout retries with an actionable message. It must not substitute the vendored manifest for independent source verification.

Fork pull requests do not receive repository secrets, so they cannot complete this private-source guard. After review, run the guard from an approved same-repository branch. Do not change to `pull_request_target` or grant secrets to fork code to bypass this boundary. The public generated manifest remains readable; opening the exact source commit requires access to the package repository.

## Updating the candidate

In the package checkout, run tests and `npm run docs:check`, then commit source. Do not publish npm. In the site checkout:

```powershell
npm ci --ignore-scripts
$env:MCP_PACKAGE_ROOT = 'D:\path\to\openrouter-dashboard-mcp'
node scripts/generate-mcp-pages.mjs --pin-source
node scripts/generate-mcp-pages.mjs --check-source --check
node --test scratch/tests/mcp-page-registry.test.mjs scratch/tests/catalogue-provider-registry.test.js scratch/tests/mcp-release-promotion.test.mjs
Remove-Item Env:MCP_PACKAGE_ROOT
npm run check:mcp-pages
npm run build
```

`--pin-source` refuses uncommitted package source changes. Push the package commit so CI can retrieve it. The pin, generated module, both HTML pages and tests belong in the site PR. `--check-source` refuses a different package HEAD even if its version matches. The source test requires `MCP_PACKAGE_ROOT`; it never substitutes npm or compares the manifest with itself.

Every generation path compares supplied or loaded facts with the pinned manifest digest before writing. Source overrides also verify the exact package HEAD. Normal generation and static/Vercel builds use the integrity-checked release manifest. `check:mcp-pages` and production builds separately verify that installed npm is npm latest. A new npm release or unavailable registry fails the published-version guard rather than silently promoting candidate claims. The manifest channel controls every page label. Matching version strings alone never promote a candidate. A published manifest additionally requires the installed artifact to match its version and facts; mismatches fail before rendering. Promotion is the explicit operation documented below, not a side effect of a build.

CI checks committed output **before** building so generation cannot hide an HTML hand edit. The build generates both pages before copying to `vercel-public`; CI verifies generated sources remain unchanged. Build-time generation reads package-derived facts without manufacturing a fresh observation date.

## Promoting an authorized published release

After the required reviews, site merge and authorized npm publication, update the site's exact npm dependency and lockfile to the source release version. Then check out the immutable package source commit with dependencies installed and run:

```powershell
$env:MCP_PACKAGE_ROOT = 'D:\path\to\exact-package-source-commit'
node scripts/generate-mcp-pages.mjs --promote-published
node scripts/generate-mcp-pages.mjs --check-source --check --check-published
npm run build
Remove-Item Env:MCP_PACKAGE_ROOT
```

`--promote-published` requires the exact source HEAD and digest, reads the installed compiled registry and actual MCP `tools/list`, requires its version and all exported facts to equal the pinned source, and verifies that version against npm latest. Only then does it write `channel: "published"` and regenerate both pages. The immutable source commit, facts and digest stay unchanged. The linked manifest and page/banner labels therefore agree. Repeating the operation on the same published release is idempotent.

`release_candidate` and `published` are the only valid manifest channels. `--pin-source` explicitly creates a candidate; it does not publish it. A candidate may remain labelled candidate after its npm dependency is updated, until explicit promotion succeeds. Do not hand-edit the channel. The promotion command changes local documentation only; it never publishes npm, changes access permissions or merges a PR. It cannot be combined with `--check` or `--pin-source`.

## Required negative proof

With `MCP_PACKAGE_ROOT` set, temporarily remove one provider property from the actual source `PROVIDER_REGISTRY` in an isolated checkout, leaving generated pages unchanged. Run:

```powershell
node --test scratch/tests/mcp-page-registry.test.mjs
```

Provider-row count/set comparison and generated-output comparison must fail. Restore the exact registry and run the same test again; retain both exit statuses as evidence. A fabricated fixture mutation is additional coverage, not a replacement for this real source mutation. Repeat provider-set assertions in a browser against built pages; HTTP 200 does not prove row identity.

## Reading the data honestly

Publication flags describe the named connector: `always` means all collected models, `partial` some, `never` no published value in this connector, and `unknown` not established. Missing sampled values do not establish provider-wide absence. Pitches retain quotation, attribution, URL and observation date. Caveats retain kind, exact decimal value, units, scope, URL and date; a published quota is not a benchmark measurement. An absent caveat preserves `not_researched`, `not_found_in_checked_sources`, or explicit source-supported `not_published`.

Catalogue runtime identities come from generated descriptors. The live dashboard manifest determines which endpoints can be requested. A candidate provider absent from that manifest is not declared by this API; this says nothing about what the provider publishes. Pending reads, failures, unavailable manifests and missing sampled fields remain distinct. Partial pages stay labelled as slices; this site does not claim a full live catalogue census.
