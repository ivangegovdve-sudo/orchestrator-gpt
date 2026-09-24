# Estate content checks

`node scripts/estate-synthetics.mjs --output evidence/estate.json` measures five public surfaces. Node 22 and internet access are the only requirements. It makes public GET requests; it has no database connection, migrations, package installation, or write operation against a target.

The existing hosted GitHub Actions infrastructure runs `estate-synthetics.yml` at minute 17 and 47 each hour. Each run retains sanitized JSON and a readable report for 14 days and writes the report into the Actions summary. BROKEN exits 1; COULD_NOT_CHECK exits 2; all HEALTHY exits 0. A mixed run exits 1 while preserving every individual outcome. There is no email, Telegram, Slack, issue creation, or other external message step. GitHub's own notification preferences remain under the account owner's control. GitHub schedules may be delayed and may be disabled after repository inactivity; the report timestamp is the measurement, not a guarantee of the next run.

| Surface | Content assertion |
| --- | --- |
| The Drop custom domain `/api/public/edition/latest` | JSON published edition, headline and real article links; generation no older than 48 hours (a documented daily-edition freshness allowance). A successfully served old edition remains BROKEN for freshness. |
| Dashboard `/api/public/v2/live-models` | Fetch unfiltered pages of 500 to `cursor:null`; compare the complete row provider set against the independently declared sources from `/source-status`. Every provider source must be fresh, published and fully acquired. A sample of five cannot prove coverage. |
| Dashboard `/api/public/v2/app-model-matrix?appLimit=10&modelLimit=10&window=latest-complete` | Available and fresh; unique complete app/model cell grid, real observed token/rank/evidence/period fields, consistent coverage counts. Unknown cells remain unknown; partial acquisition and unmapped observations are explicitly reported, not advertised as complete coverage. |
| `https://www.sdforest.site/` | Served HTML contains Forest identity and at least three named project links. This checks static entry content, not browser animation or every linked project. |
| `https://sdforest.site/web/open-dashboard/mcp/` | Served HTML names every provider in the **published** `open-dashboard-mcp` registry. Scripts, styles, templates and comments do not count as page copy. |

The dashboard's denominator comes from registry-backed source declarations, including sources that have never published. `models_current` maps to OpenRouter; `<provider>_models_current` maps to that provider. Unknown providers appearing in rows fail the set comparison. Missing source evidence is COULD_NOT_CHECK, not an empty expected set. Cursor cycles, duplicate rows, malformed data and incomplete acquisitions cannot pass.

The npm homepage truth check fetches registry metadata, downloads the referenced tarball, verifies SHA-512 integrity and matching package name/version, then parses `package/build/providers/registry.js` as static data. It never executes the package. Unsupported registry syntax fails closed as COULD_NOT_CHECK; it never falls back to a remembered provider list or an unshipped checkout. Evidence includes package version, archive URL/integrity, registry SHA-256, served-page SHA-256 and provider denominator. Nine package providers and eight dashboard providers are separate contracts; Sail is present in the former.

No raw response bodies, headers or exception messages reach reports. All output sinks share central redaction for known sensitive environment values, credential patterns, sensitive object keys, auth headers and credential URLs. Requests are bounded to 20 seconds and 8 MiB; model pagination is capped at 30 pages. Network/DNS/TLS/timeout and incomplete reads are COULD_NOT_CHECK. HTTP error responses, HTML instead of JSON and violated body contracts are BROKEN. Evidence dependency failure is COULD_NOT_CHECK for its dependent assertion.

## Repeatable proofs

```powershell
node --test scratch/tests/estate-synthetics.test.mjs
node scripts/estate-synthetics.mjs --only home --output evidence/green.json
node scripts/estate-synthetics.mjs --only edition --url https://excalidraw.com/ --output evidence/spa-red.json
node scripts/estate-synthetics.mjs --only edition --url https://synthetic-proof.invalid/ --output evidence/unreachable.json
node scripts/estate-synthetics.mjs --output evidence/all-five.json
```

The expected outputs for the live control runs are HEALTHY (0), BROKEN (1), and COULD_NOT_CHECK (2), respectively. Excalidraw is an external control fixture, not a monitored estate surface: verify its HTTP 200 HTML contains an empty React root and a module script before calling this a SPA-shell proof. The Drop's former shell routes now return HTTP 500 to JSON requests, which proves HTTP-error detection but does not prove shell rejection. The reserved `.invalid` hostname deliberately exercises inability to reach a target. It does not simulate an HTTP failure. Never change the actual estate targets just to obtain a green suite.

## MCP release contract (step D)

Reuse this exact served-page assertion after deploying `web/open-dashboard/mcp/index.html` and `web/open-dashboard/catalogues/index.html`, before publishing the next npm release:

```powershell
node scripts/estate-synthetics.mjs --only mcp --output evidence/mcp-before-publish.json
# After npm publishing, check the registry again and repeat against the new release:
node scripts/estate-synthetics.mjs --only mcp --package-version 1.0.0 --output evidence/mcp-after-publish.json
```

The pre-publish run proves coverage of the currently published package only. D must additionally compare the page against its release candidate provider set before publishing if providers are added; this check cannot discover an unpublished release. The post-publish run verifies the actual published artifact. Never move the homepage URL or waive a stale page. The package's `test/readme-truth.test.ts` covers description and README; this check covers the separately deployed homepage. B detects drift and does not repair the page.
