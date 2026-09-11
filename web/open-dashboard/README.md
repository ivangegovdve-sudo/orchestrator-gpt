# Open Dashboard

The public explorer for `open-dashboard-mcp` 1.1.0, hosted as a static subsite of SD Forest. The site helps people explore model prices, catalogue identities, public usage and GitHub projects before connecting selected MCP tools to an agent.

## Pages

- `/web/open-dashboard/` — model and media explorer, benchmark evidence, lifecycle dates, daily history and app–model connections.
- `/web/open-dashboard/github/` — repository discovery, adoption and momentum.
- `/web/open-dashboard/mcp/` — Hermes, Codex, Claude Code/Desktop, Cursor and generic local MCP setup with exact tool selection.
- Previous `openrouter/`, `catalogues/` and `matrix/` routes preserve entry points into the new explorer.

The light and dark themes share local Manrope typography and generated forest artwork. D3 7.9.0 renders quantitative SVG. Vendor and font licenses are beside their assets. Generated artwork is decorative; it contains no data marks or labels.

## Data and interpretation

`explorer-data.js` reads the public v2 API with bounded pagination. Source dates and incomplete/unavailable states remain visible. Text token prices, native media units, provider free-plan quotas, catalogue listing, and operational availability are distinct. Exact provider/model identities are never joined through fuzzy names. Benchmark prices belong to each original observation and evaluation group.

The media catalogue is an explicitly dated snapshot, refreshed through public metadata only:

```sh
node web/open-dashboard/scripts/refresh-media.mjs
```

This command uses the pinned package collectors with fixed GET endpoints, no credentials and no inference calls. It preserves native units, conditions and source notes. Unknown media prices never become free models.

The app–model chart prefers a valid live matrix. When unavailable, it can show `matrix-snapshot.json`, clearly labeled as an archived September 9 view. The accompanying metadata identifies a September 10 read-only capture rendered through the repaired shared-history reader. Its captured freshness flag is not a claim about current freshness. This archive has 15 observed relationships out of 100 possible pairs and 144 unmapped observations.

Backend repair is in the separate `openrouter-github-dashboard` repository, commit `48a1c82b1cb0fdb24b5a32e19dd4418d1668c3ee`. Its migration `0015_app_model_published_history.sql` must precede backend rollout. It also fixes unknown-price ordering and zero-token media classification. No production database changes are part of this frontend checkout.

## Local preview and checks

```sh
npm ci
python web/open-dashboard/scripts/preview.py
```

Open `http://127.0.0.1:4174/web/open-dashboard/`. The preview server binds localhost and proxies only fixed, unauthenticated public GET routes. Production continues to call the public API directly; its existing SD Forest CORS policy is unchanged.

```sh
npm --prefix web/open-dashboard test
node scripts/refresh-open-dashboard-package-facts.mjs --check
npm run build
```

Package facts can be regenerated with `node scripts/refresh-open-dashboard-package-facts.mjs`. It verifies the actual installed MCP tool registry, without fetching private account data. `OPEN_DASHBOARD_TOOLS` limits registration; it does not selectively download parts of the npm package. GitHub projects are installed separately from their own repositories. Local stdio configurations are not advertised as a hosted Cowork connector.

See the root `design-qa.md` and `open-dashboard-release.md` for visual validation and release dependencies. Existing legacy rendering modules remain for their contract tests; the redesigned pages do not load them or their Three.js scene.
