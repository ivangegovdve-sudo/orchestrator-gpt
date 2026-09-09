# Open Dashboard in SD Forest

This route-local static subsite consumes the public Open Dashboard v2 API. The SD Forest homepage exposes it through a truthfully labeled `Public snapshot` portal; the subsite has no browser credentials and treats semantic tables and SVG as the quantitative authority. The optional Three.js relationship canopy is loaded only after capability, visibility and user-preference gates.

The MCP route documents `open-dashboard-mcp` 1.0.0: sixteen read-only tools, twelve registered providers, conditioned exact price points, separate published/measured/unknown speed evidence, and the `dashboard_contract` deprecation endpoint. Version 1.0 is the first release with deprecation notices, so its 0.9-to-1.0 migration notice is necessarily retrospective; future removals are announced before removal.

Canonical routes:

- `/web/open-dashboard/index.html`
- `/web/open-dashboard/openrouter/index.html`
- `/web/open-dashboard/matrix/index.html`
- `/web/open-dashboard/github/index.html`
- `/web/open-dashboard/catalogues/index.html`
- `/web/open-dashboard/mcp/index.html`

When the live manifest cannot be reached—or the reviewed v2 manifest has not yet been deployed—the explicit `fallbackOnMissingV2` policy loads one checksum-verified deterministic snapshot and labels it `snapshot`; live and fallback rows are never mixed. A valid response with a different schema major still fails closed and never falls back.

Local verification:

    npm run build
    node --test scratch/tests/open-dashboard.test.js
    npm --prefix scratch/tests exec playwright test open-dashboard.browser.spec.js -- --config open-dashboard.playwright.config.js --project=chromium

Production promotion follows the repository's reviewed GitHub/Vercel release workflow; live ingestion remains disabled until the production credentials are configured.
