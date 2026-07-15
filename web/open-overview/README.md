# Open Overview in SD Forest

This route-local static subsite consumes the public Open Overview v2 API. It has no browser credentials, never changes the SD Forest homepage, and treats semantic tables and SVG as the quantitative authority. The optional Three.js relationship canopy is loaded only after capability, visibility and user-preference gates.

Canonical routes:

- `/web/open-overview/index.html`
- `/web/open-overview/openrouter/index.html`
- `/web/open-overview/github/index.html`

When the live manifest cannot be reached, the client loads one checksum-verified, deterministic snapshot and labels it `snapshot`; live and fallback rows are never mixed.

Local verification:

    npm run build
    node --test scratch/tests/open-overview.test.js
    npm --prefix scratch/tests exec playwright test open-overview.browser.spec.js -- --config open-overview.playwright.config.js --project=chromium

No production promotion is performed by this implementation branch.
