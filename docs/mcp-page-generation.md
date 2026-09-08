# Package facts on the MCP and Catalogues pages

The package owns provider publication declarations and tool registrations. Both pages and the catalogue runtime consume generated facts; do not edit their marked blocks or `web/open-dashboard/package-facts.mjs` by hand.

The npm dependency and lockfile pin the published package. `loadPackageFacts` imports its compiled `providers/registry.js` (the output of `src/providers/registry.ts`) and walks the actual server registration graph through an in-memory MCP `tools/list` handshake. It does not count files, imports, regular-expression matches, or a second list. No tool is called and dashboard fetching throws during this handshake. Tool titles are generated too; upstream prose descriptions that enumerate older provider subsets are not presented as current page claims.

```sh
npm ci --ignore-scripts
npm run generate:mcp-pages
npm run check:mcp-pages
node --test scratch/tests/mcp-page-registry.test.mjs scratch/tests/catalogue-provider-registry.test.js
npm run build
```

`generate:mcp-pages` is deterministic and can run offline after installation. `check:mcp-pages` additionally reads npm latest and fails if the dependency pin is behind or the registry cannot be checked. The static/Vercel build also performs that published-version check before generating and copying the pages, so a direct deployment cannot silently ship an older pin. The read-only GitHub Actions guard checks committed output **before** building, on pull requests, main pushes and a daily schedule. Generated data contains a package version, not a misleading new observation timestamp.

When the package changes, update its exact dependency pin and lockfile, regenerate both pages, and include the resulting diff in the release PR. Generation follows the published artifact by default. For release-candidate validation and the required local mutation proof, set `MCP_PACKAGE_ROOT` to an isolated source checkout with its dependencies installed. This explicitly loads `src/providers/registry.ts` and `src/server.ts` through `tsx`; changing that registry while leaving the page unchanged must fail the same test:

```powershell
$env:MCP_PACKAGE_ROOT='D:\path\to\isolated\openrouter-dashboard-mcp'
node --test scratch/tests/mcp-page-registry.test.mjs
```

Restore the mutation and clear the environment variable after testing. Do not publish candidate-generated content as evidence of what npm currently ships. `--check-published` and production builds reject this override even if the source checkout retains the same version string. Normal CI and production builds use the lockfile-installed artifact.

The test independently compares each HTML provider-row set with `PROVIDER_IDS`, including count and duplicates, checks publication attributes against registry values, compares the displayed tool names/counts with actual `tools/list`, and rejects any changed generated block or runtime fact. The browser check should repeat the provider-set assertion against the built pages at desktop and phone widths.

Publication meanings remain separate: `always` is published for all models, `partial` for some, `never` is not published, and `unknown` means the package has not established it. The registry does not provide per-field observation dates; the caption says so. Generation propagates package declarations, not new upstream measurements. A null field on one returned catalogue page does not establish `never`.

Catalogue runtime identities come from generated provider descriptors. The live manifest determines which provider endpoints can be requested, including future declarations. A provider absent from the manifest is “not declared by this API,” not “the provider publishes nothing.” Pending reads, failed requests, unavailable manifests and missing sampled fields remain distinct. Partial pages are labelled as slices; this change does not claim a full catalogue census. Nullable `ownedBy` follows the producer's schema, allowing QwenCloud rows without inventing an owner.

Both existing URLs remain unchanged. PROMPT-B's served-page/published-artifact check can verify provider-name coverage after deployment. This PR does not publish npm or deploy/merge itself.
