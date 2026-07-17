# Open Overview Homepage Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Open Overview to the SD Forest homepage as the sixteenth compact portal, with truthful snapshot copy, full preview/navigation behavior, and its own cyan-violet Three.js cross-source matrix hologram.

**Architecture:** Keep the existing static homepage and its DOM-derived portal controller. Register one new named builder in the existing shared Three.js tile engine, then add one inline SVG symbol and one standard portal button; do not add a runtime, dependency, layout mode, or Open Overview-specific controller branch. Protect the integration with Node contracts, built-artifact browser smoke coverage, inherited baseline checks, and production QA.

**Tech Stack:** Static HTML5, CSS custom properties, browser JavaScript ES modules, vendored Three.js, Node.js 22 `node:test`, Playwright 1.58.2, Vercel static output, GitHub pull requests.

## Global Constraints

- Project key: `open-overview`.
- Title: `Open Overview`.
- Metadata: `AI ecosystem radar`.
- Status: `Public snapshot`; never label the deterministic production fixture `Live`.
- Destination: `/web/open-overview/index.html`, opened in the same tab.
- Primary accent: `#73e9ff`; secondary accent: `#a9b2ff`.
- Description: `Compare OpenRouter models and apps with GitHub AI ecosystems through ten-deep rankings, observed relationships, lifecycle signals, and clearly labeled source evidence.`
- Insert the standard-size portal immediately after `Library & Platforms`; the desktop grid remains three columns and the board reports `16 nodes`.
- Extend the active shared Three.js engine; do not restore `forest-icons.js`, add another animation loop, add a dependency, or rewrite the homepage controller.
- Preserve the existing `prefers-reduced-motion` bypass: reduced-motion users receive the selected content and navigation without WebGL or looping animation.
- Preserve the Open Overview subpages, data acquisition, fixture policy, credentials policy, every existing portal destination, and the user's unrelated untracked `scratch/tests/.open-overview-results/` directory.
- Build output under `vercel-public/` is generated and ignored; never commit it.
- Publish through a pull request, require the Vercel preview/checks to pass, squash-merge to `main`, and verify `sdforest.site` after production promotion.

---

## File Map

- Modify `web/shared/forest-three/tiles.js`: register the `open-overview` cross-source matrix builder and carry the portal's secondary accent into tile state.
- Modify `web/shared/forest-three.js`: update the tile count documentation and cache-bust the changed tile module import.
- Modify `index.html`: add the SVG symbol, standard portal entry, `16 nodes` label, and changed Three.js entry cache key.
- Modify `scratch/tests/open-overview.test.js`: remove the obsolete immutable-home Git-diff assertion and add exact Three.js and homepage integration contracts.
- Modify `scratch/tests/sdforest-redesign.test.js`: include Open Overview in the inherited lineup/route checks while preserving the two approved inherited failures.
- Modify `scratch/tests/browser-smoke.js`: cover the new route, preview, navigation, 3D tile, touch selection, mobile layout, and reduced-motion behavior.
- Modify `web/open-overview/README.md`: replace the obsolete claim that this route never changes the homepage and document the release path truthfully.
- Modify `README.md`: list Open Overview among the public project routes.

---

### Task 1: Register the Open Overview Three.js Motion Identity

**Files:**
- Modify: `scratch/tests/open-overview.test.js:6-25`
- Modify: `web/shared/forest-three.js:1-30`
- Modify: `web/shared/forest-three/tiles.js:1-29,233-269,629-662`

**Interfaces:**
- Consumes: `lineBuilder()`, `lineRange(geometry, fraction)`, `THREE.BufferAttribute`, `THREE.DynamicDrawUsage`, and the existing `BUILDERS[portal.dataset.project]` lookup.
- Produces: `BUILDERS['open-overview']() -> Array<{ geometry, kind?, vertexColors?, baseOpacity?, update? }>` and `tile.secondaryColor: THREE.Color` for animated cyan-violet vertex colors.

- [ ] **Step 1: Replace the obsolete immutable-home assertion with a failing motion-registry contract**

Delete this now-unused import from `scratch/tests/open-overview.test.js`:

```js
const { spawnSync } = require("node:child_process");
```

Replace the first test with:

```js
test("three canonical routes remain isolated and the shared 3D registry exposes Open Overview", () => {
  for (const [file, route] of [["index.html", "overview"], ["openrouter/index.html", "openrouter"], ["github/index.html", "github"]]) {
    const html = read(...file.split("/"));
    assert.match(html, new RegExp(`data-open-overview-route="${route}"`));
    assert.match(html, /href="\/web\/open-overview\/open-overview\.css"/);
    assert.match(html, /src="\/web\/open-overview\/open-overview\.js"/);
    assert.match(html, /id="oo-view-root"/);
    assert.doesNotMatch(html, /forest-three\.js/);
  }

  const entry = fs.readFileSync(path.join(ROOT, "web", "shared", "forest-three.js"), "utf8");
  const tiles = fs.readFileSync(path.join(ROOT, "web", "shared", "forest-three", "tiles.js"), "utf8");
  assert.match(entry, /Sixteen per-portal wireframes/);
  assert.match(entry, /forest-three\/tiles\.js\?v=20260717/);
  assert.match(tiles, /'open-overview'\(\)\s*\{/);
  assert.match(tiles, /secondaryColor/);
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run:

```powershell
node --test --test-name-pattern="three canonical routes remain isolated and the shared 3D registry exposes Open Overview" scratch/tests/open-overview.test.js
```

Expected: one failed test because `forest-three.js` still says `Fifteen`, imports the unversioned tile module, and `tiles.js` has no `'open-overview'()` builder.

- [ ] **Step 3: Cache-bust and document the sixteenth tile in the Three.js entry module**

In `web/shared/forest-three.js`, change the tile description to:

```js
     tiles.js   Sixteen per-portal wireframes, each with its own named
                motion identity (heartbeat rings, weaving ribbons, a
                cross-source evidence matrix, a writing feather, a growing
                math forest...).
```

Replace the tile import with:

```js
import { initTiles, updateTiles, tilesAnimating, tilesDebug } from './forest-three/tiles.js?v=20260717';
```

- [ ] **Step 4: Add the cross-source matrix builder**

Add this identity line after `library` in the opening list in `web/shared/forest-three/tiles.js`:

```js
     open-overview Cross-source evidence matrix connects two ecosystems
```

Insert this builder immediately after `library()` and before `calendar()`:

```js
  // Open Overview — OpenRouter and GitHub node columns exchange evidence
  // through a central matrix; cyan-to-violet links pulse across sources.
  'open-overview'() {
    const matrix = lineBuilder();
    matrix.polyline([[-0.95, -0.76, 0], [0.95, -0.76, 0], [0.95, 0.76, 0], [-0.95, 0.76, 0]], true);
    [-0.32, 0.32].forEach((x) => matrix.line(x, -0.76, 0, x, 0.76, 0));
    [-0.25, 0.25].forEach((y) => matrix.line(-0.95, y, 0, 0.95, y, 0));

    const network = lineBuilder();
    const left = [[-0.68, 0.46, 0.08], [-0.68, 0, 0.08], [-0.68, -0.46, 0.08]];
    const right = [[0.68, 0.46, 0.08], [0.68, 0, 0.08], [0.68, -0.46, 0.08]];
    [...left, ...right].forEach(([x, y, z]) => network.circle(0.075, 10, x, y, z));
    [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]]
      .forEach(([from, to]) => network.line(...left[from], ...right[to]));
    const networkGeometry = network.geometry();
    networkGeometry.setAttribute('color', new THREE.BufferAttribute(
      new Float32Array(networkGeometry.attributes.position.count * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage));

    const evidence = lineBuilder();
    evidence.circle(0.2, 28, 0, 0, 0.2);
    evidence.polyline([[0, 0.29, 0.2], [0.29, 0, 0.2], [0, -0.29, 0.2], [-0.29, 0, 0.2]], true);

    return [
      {
        geometry: matrix.geometry(),
        baseOpacity: 0.62,
        update(object, time, tile) {
          lineRange(object.geometry, tile.alpha * 1.3);
          object.rotation.z = Math.sin(time * 0.5) * 0.035;
        },
      },
      {
        geometry: networkGeometry,
        vertexColors: true,
        baseOpacity: 0.9,
        update(object, time, tile) {
          const colors = object.geometry.attributes.color.array;
          const segmentCount = object.geometry.attributes.position.count / 2;
          for (let segment = 0; segment < segmentCount; segment += 1) {
            const pulse = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(time * 2.2 + segment * 0.55)) ** 3;
            for (let vertex = 0; vertex < 2; vertex += 1) {
              const color = vertex === 0 ? tile.accentColor : tile.secondaryColor;
              const offset = (segment * 2 + vertex) * 3;
              colors[offset] = color.r * pulse;
              colors[offset + 1] = color.g * pulse;
              colors[offset + 2] = color.b * pulse;
            }
          }
          object.geometry.attributes.color.needsUpdate = true;
        },
      },
      {
        geometry: evidence.geometry(),
        update(object, time) {
          const pulse = 1 + Math.sin(time * 1.8) * 0.08;
          object.scale.setScalar(pulse);
          object.rotation.z = time * 0.28;
          object.material.opacity *= 0.7 + 0.3 * Math.sin(time * 2.4) ** 2;
        },
      },
    ];
  },
```

- [ ] **Step 5: Carry the optional secondary accent into every tile without changing existing colors**

In `initTiles()`, replace the accent setup with:

```js
    const primary = portal.style.getPropertyValue('--accent').trim() || '#79f2a8';
    const secondary = portal.style.getPropertyValue('--accent-secondary').trim() || primary;
    const accent = new THREE.Color(primary);
    const secondaryAccent = new THREE.Color(secondary);
```

Add the secondary color beside `accentColor` in the tile state:

```js
      accentColor: accent,
      secondaryColor: secondaryAccent,
```

Existing portals have no `--accent-secondary`, so they retain their current single-color behavior.

- [ ] **Step 6: Run the focused and full Open Overview Node suites**

Run:

```powershell
node --test --test-name-pattern="three canonical routes remain isolated and the shared 3D registry exposes Open Overview" scratch/tests/open-overview.test.js
node --test scratch/tests/open-overview.test.js
git diff --check
```

Expected: the focused test passes with the remaining tests skipped; all 33 Open Overview tests pass; `git diff --check` prints no findings.

- [ ] **Step 7: Commit the motion identity**

Run:

```powershell
git add -- scratch/tests/open-overview.test.js web/shared/forest-three.js web/shared/forest-three/tiles.js
git commit -m "feat(home): add Open Overview 3D portal identity"
```

Expected: one commit containing only the registry contract, shared entry update, and new tile builder.

---

### Task 2: Add the Homepage Portal, Preview Contract, and Responsive Browser Coverage

**Files:**
- Modify: `scratch/tests/open-overview.test.js:14-40`
- Modify: `scratch/tests/sdforest-redesign.test.js:9-30,120-131`
- Modify: `scratch/tests/browser-smoke.js:9-24,81-94,122-161`
- Modify: `index.html:54-64,130,162-172,242`
- Modify: `web/open-overview/README.md:1-19`
- Modify: `README.md:17-39`

**Interfaces:**
- Consumes: the standard `.portal` data contract, `<use href="#icon-*">` SVG pattern, DOM-derived `cards` collection, `selectCard(card)`, and Task 1's `BUILDERS['open-overview']` registration.
- Produces: one `data-project="open-overview"` portal, one `#icon-open-overview` symbol, a 14th live internal destination, a 16-card lattice, a selected preview at DOM index `07`, and browser-visible Three.js tile state.

- [ ] **Step 1: Add the failing static homepage contract**

Add this test immediately after the motion-registry test in `scratch/tests/open-overview.test.js`:

```js
test("SD Forest homepage exposes one truthful animated Open Overview portal", () => {
  const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const portals = home.match(/<button class="portal"/g) || [];
  const matches = home.match(/<button class="portal"[^>]*data-project="open-overview"[\s\S]*?<\/button>/g) || [];
  assert.equal(portals.length, 16);
  assert.match(home, /Portal lattice · 16 nodes/);
  assert.equal(matches.length, 1);

  const portal = matches[0];
  assert.match(portal, /style="--accent:#73e9ff;--accent-secondary:#a9b2ff"/);
  assert.match(portal, /data-href="\/web\/open-overview\/index\.html"/);
  assert.match(portal, /data-status="Public snapshot"/);
  assert.match(portal, /Compare OpenRouter models and apps with GitHub AI ecosystems through ten-deep rankings, observed relationships, lifecycle signals, and clearly labeled source evidence\./);
  assert.match(portal, /<use href="#icon-open-overview"\/>/);
  assert.match(portal, /<span class="portal-name">Open Overview<\/span>/);
  assert.match(portal, /<span class="portal-meta">AI ecosystem radar<\/span>/);
  assert.match(home, /<symbol id="icon-open-overview"[\s\S]*?--accent-secondary, #a9b2ff[\s\S]*?<\/symbol>/);
  assert.match(home, /src="\/web\/shared\/forest-three\.js\?v=20260717"/);
  assert.doesNotMatch(home, /forest-icons\.js/);

  const routeReadme = fs.readFileSync(path.join(ROOT, "web", "open-overview", "README.md"), "utf8");
  const rootReadme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.doesNotMatch(routeReadme, /never changes the SD Forest homepage/);
  assert.match(rootReadme, /web\/open-overview\//);
});
```

- [ ] **Step 2: Update the inherited SD Forest contract without changing its approved failure set**

In `scratch/tests/sdforest-redesign.test.js`, add `Open Overview` to the title array and add these assertions after the array loop:

```js
  assert.equal((home.match(/data-project="/g) || []).length, 16);
  assert.match(home, /Portal lattice · 16 nodes/);
```

In the live-route test, change the expected count and accepted animation entry point to:

```js
  assert.equal(routes.length, 14);
  for (const route of routes) {
    const relativePath = route.replace(/^\//, '');
    assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `${route} does not exist`);
    const page = read(relativePath);
    assert.match(page, /href="\/"|href="\/index\.html"/, `${route} has no Forest return path`);
    assert.match(page, /forest-motion\.js|open-overview\.js|id="world"|id="starfield"/, `${route} has no motion runtime`);
  }
```

- [ ] **Step 3: Add the browser acceptance assertions before changing the homepage**

In `scratch/tests/browser-smoke.js`:

1. Add `'/web/open-overview/index.html'` to `routes`.
2. Change both `.portal` count assertions from `15` to `16`.
3. After the existing VFX preview assertion, add:

```js
  const overviewPortal = home.locator('[data-project="open-overview"]');
  await overviewPortal.focus();
  await home.waitForFunction(() => window.__forestThree?.tiles?.some((tile) => tile.element.dataset.project === 'open-overview'));
  await home.waitForFunction(() => {
    const tile = window.__forestThree?.tiles?.find((item) => item.element.dataset.project === 'open-overview');
    return tile?.target === 1 && tile.alpha > 0;
  });
  assert.equal(await overviewPortal.getAttribute('aria-pressed'), 'true');
  assert.equal(await home.locator('[data-preview-number]').textContent(), '07');
  assert.equal(await home.locator('[data-preview-title]').textContent(), 'Open Overview');
  assert.equal(await home.locator('[data-preview-status]').textContent(), 'Public snapshot');
  assert.equal(
    await home.locator('[data-preview-description]').textContent(),
    'Compare OpenRouter models and apps with GitHub AI ecosystems through ten-deep rankings, observed relationships, lifecycle signals, and clearly labeled source evidence.',
  );
  assert.equal(await home.locator('[data-preview-open]').getAttribute('href'), '/web/open-overview/index.html');
  assert.equal(await home.locator('[data-preview-open]').getAttribute('target'), '_self');
```

4. Create the mobile context with touch enabled:

```js
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
```

5. After the mobile count assertion, add:

```js
  assert.equal(await mobileHome.evaluate(() => matchMedia('(pointer: coarse)').matches), true);
  await mobileHome.locator('[data-project="open-overview"] .portal-icon').click();
  assert.equal(await mobileHome.locator('[data-preview-title]').textContent(), 'Open Overview');
  assert.equal(await mobileHome.locator('[data-preview-status]').textContent(), 'Public snapshot');
```

6. After the reduced-motion assembly assertion, add:

```js
  const calmOverview = calmHome.locator('[data-project="open-overview"]');
  assert.equal(await calmOverview.isVisible(), true);
  await calmOverview.focus();
  assert.equal(await calmHome.locator('[data-preview-title]').textContent(), 'Open Overview');
  assert.equal(await calmHome.evaluate(() => window.__forestThree?.webgl ?? false), false);
```

- [ ] **Step 4: Run the new contracts and verify the red state**

Run:

```powershell
node --test --test-name-pattern="SD Forest homepage exposes one truthful animated Open Overview portal" scratch/tests/open-overview.test.js
node scratch/tests/assert-sdforest-baseline.mjs
npm run build
$browserExecutable='C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $browserExecutable -PathType Leaf)) { throw "Required browser executable not found: $browserExecutable" }
$env:SDFOREST_CHROMIUM_PATH=$browserExecutable
Remove-Item Env:SDFOREST_BASE_URL -ErrorAction SilentlyContinue
$env:SDFOREST_STATIC_ROOT=(Resolve-Path 'vercel-public').Path
$env:SDFOREST_QA_OUTPUT='C:\tmp\sdforest-home-portal-red'
node scratch/tests/browser-smoke.js
```

Expected: the focused test fails on the 15-card homepage; the inherited baseline guard rejects the additional homepage/route failures; browser smoke fails at the expected 16-card assertion. The build itself still succeeds.

- [ ] **Step 5: Add the inline matrix icon**

Insert this symbol immediately after `icon-library` in `index.html`:

```html
      <symbol id="icon-open-overview" viewBox="0 0 48 48">
        <rect class="icon-ring" x="7" y="7" width="34" height="34" rx="7" stroke-dasharray="4 5"/>
        <path class="icon-line" d="M15 15h6v6h-6zM27 15h6v6h-6zM15 27h6v6h-6zM27 27h6v6h-6zM18 21v6m12-6v6M21 18h6m-6 12h6"/>
        <circle class="icon-fill" cx="24" cy="24" r="2.5" style="fill:var(--accent-secondary, #a9b2ff)"/>
      </symbol>
```

- [ ] **Step 6: Add the standard portal after Library & Platforms**

Change the board label to:

```html
                <span class="board-kicker">Portal lattice · 16 nodes</span>
```

Insert this button immediately after the Library portal and before Calendar:

```html
              <button class="portal" type="button" style="--accent:#73e9ff;--accent-secondary:#a9b2ff" data-project="open-overview" data-href="/web/open-overview/index.html" data-status="Public snapshot" data-description="Compare OpenRouter models and apps with GitHub AI ecosystems through ten-deep rankings, observed relationships, lifecycle signals, and clearly labeled source evidence." aria-pressed="false">
                <span class="portal-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><use href="#icon-open-overview"/></svg></span>
                <span class="portal-copy"><span class="portal-name">Open Overview</span><span class="portal-meta">AI ecosystem radar</span></span>
              </button>
```

Change the shared Three.js entry script to:

```html
  <script type="module" src="/web/shared/forest-three.js?v=20260717"></script>
```

Do not change the inline controller: it derives the new preview index, selection, same-tab link, and serpentine delay from the DOM.

- [ ] **Step 7: Correct the route documentation**

Replace the opening paragraph of `web/open-overview/README.md` with:

```md
This route-local static subsite consumes the public Open Overview v2 API. The SD Forest homepage exposes it through a truthfully labeled `Public snapshot` portal; the subsite has no browser credentials and treats semantic tables and SVG as the quantitative authority. The optional Three.js relationship canopy is loaded only after capability, visibility and user-preference gates.
```

Replace its final sentence with:

```md
Production promotion follows the repository's reviewed GitHub/Vercel release workflow; live ingestion remains disabled until the production credentials are configured.
```

Add this entry after `web/llm-db/` in the root `README.md`:

```md
- `web/open-overview/` — OpenRouter + GitHub cross-source ecosystem radar, linked from the homepage as a labeled public snapshot.
```

- [ ] **Step 8: Run the static, inherited, build, and browser checks to green**

Run:

```powershell
node --test --test-name-pattern="SD Forest homepage exposes one truthful animated Open Overview portal" scratch/tests/open-overview.test.js
node --test scratch/tests/open-overview.test.js
node scratch/tests/assert-sdforest-baseline.mjs
npm run build
$browserExecutable='C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $browserExecutable -PathType Leaf)) { throw "Required browser executable not found: $browserExecutable" }
$env:SDFOREST_CHROMIUM_PATH=$browserExecutable
Remove-Item Env:SDFOREST_BASE_URL -ErrorAction SilentlyContinue
$env:SDFOREST_STATIC_ROOT=(Resolve-Path 'vercel-public').Path
$env:SDFOREST_QA_OUTPUT='C:\tmp\sdforest-home-portal-green'
node scratch/tests/browser-smoke.js
git diff --check
```

Expected:

- focused homepage contract passes;
- all 34 Open Overview Node tests pass;
- inherited guard prints `SD Forest inherited baseline guard passed` with its unchanged 11-test/9-pass/2-approved-failure baseline;
- build prints `Static Forest HUB build written to ...\vercel-public`;
- browser smoke prints `Browser smoke passed: 15 routes, desktop/mobile/reduced-motion`;
- whitespace check prints no findings.

- [ ] **Step 9: Verify the generated artifact exactly**

Run:

```powershell
if ((Get-FileHash index.html).Hash -ne (Get-FileHash vercel-public\index.html).Hash) { throw 'Built homepage differs from source.' }
if (-not (Test-Path vercel-public\web\open-overview\index.html)) { throw 'Built Open Overview route is missing.' }
$builtHome = Get-Content vercel-public\index.html -Raw
if (([regex]::Matches($builtHome, '<button class="portal"')).Count -ne 16) { throw 'Built portal count is not 16.' }
if (([regex]::Matches($builtHome, 'data-project="open-overview"')).Count -ne 1) { throw 'Built Open Overview portal is not unique.' }
if ($builtHome -notmatch 'Portal lattice · 16 nodes') { throw 'Built board label is stale.' }
if ($builtHome -notmatch 'data-href="/web/open-overview/index.html"') { throw 'Built destination is missing.' }
Write-Output 'Built homepage integration contract passed.'
```

Expected: `Built homepage integration contract passed.`

- [ ] **Step 10: Commit the homepage integration**

Run:

```powershell
git add -- index.html README.md web/open-overview/README.md scratch/tests/open-overview.test.js scratch/tests/sdforest-redesign.test.js scratch/tests/browser-smoke.js
git commit -m "feat(home): link Open Overview from portal lattice"
```

Expected: one commit containing the homepage, documentation, and all integration coverage; `vercel-public/`, `scratch/tests/.open-overview-results/`, and `C:\tmp` outputs remain uncommitted.

---

### Task 3: Run Full Regression, Publish, and Verify Production

**Files:**
- Verify only: all Task 1 and Task 2 files
- Generated, never commit: `vercel-public/**`, `C:\tmp\sdforest-home-portal-*`

**Interfaces:**
- Consumes: the two implementation commits, existing Vercel Git integration, GitHub pull-request checks, and the production domains.
- Produces: a squash-merged `main`, a green Vercel production deployment, and desktop/mobile/reduced-motion production evidence.

- [ ] **Step 1: Rebase on the current upstream before the final verification**

Run:

```powershell
git fetch origin
git rebase origin/main
```

Expected: the feature branch is rebased without merge commits. If upstream changed a planned file, stop the rebase and resolve only after comparing the upstream intent with this specification.

- [ ] **Step 2: Run the complete local verification matrix**

Run:

```powershell
git diff --check origin/main...HEAD
npm run build
node --test scratch/tests/open-overview.test.js scratch/tests/open-overview-fallback-policy.test.js scratch/tests/open-overview-truth-identity.test.js
node scratch/tests/assert-sdforest-baseline.mjs
$browserExecutable='C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $browserExecutable -PathType Leaf)) { throw "Required browser executable not found: $browserExecutable" }
$env:SDFOREST_CHROMIUM_PATH=$browserExecutable
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE=$browserExecutable
Remove-Item Env:SDFOREST_BASE_URL -ErrorAction SilentlyContinue
$env:SDFOREST_STATIC_ROOT=(Resolve-Path 'vercel-public').Path
$env:SDFOREST_QA_OUTPUT='C:\tmp\sdforest-home-portal-final'
node scratch/tests/browser-smoke.js
Push-Location scratch/tests
npx --no-install playwright test open-overview.browser.spec.js --config open-overview.playwright.config.js --project=chromium
Pop-Location
```

Expected verification inventory:

- 51 Open Overview Node tests pass: 34 main + 13 fallback-policy + 4 truth/identity;
- inherited SD Forest guard confirms 11 tests with 9 passes and exactly 2 approved inherited failures;
- Open Overview Playwright reports 18 passed;
- homepage browser smoke reports 15 production routes with desktop/mobile/reduced-motion coverage;
- 95 deterministic validations in total, with no new failures.

- [ ] **Step 3: Inspect the final screenshots and repository delta**

Inspect these generated images at full size:

```text
C:\tmp\sdforest-home-portal-final\home-dashboard.png
C:\tmp\sdforest-home-portal-final\home-mobile.png
C:\tmp\sdforest-home-portal-final\home-tablet.png
C:\tmp\sdforest-home-portal-final\home-reduced-motion.png
```

Acceptance criteria:

- Open Overview is a normal-size node after Library & Platforms.
- The cyan-violet matrix icon is legible and the final row/grid has no clipping or overflow.
- Focus/selection shows the exact title, `Public snapshot`, description, and `Enter project` action.
- The Three.js matrix appears over the selected card without obscuring text.
- Mobile/touch layout remains compact; reduced-motion content is fully visible and static.

Then run:

```powershell
git status --short
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected: only the approved spec/plan, homepage, Three.js tile files, documentation, and three test files are tracked; `scratch/tests/.open-overview-results/` remains the only unrelated untracked path.

- [ ] **Step 4: Push the branch and open the pull request**

Run:

```powershell
git push -u origin feat/open-overview-home-portal
$body = @"
## Summary
- add Open Overview as the sixteenth SD Forest homepage portal
- add its cyan-violet cross-source matrix to the existing Three.js tile engine
- verify preview, touch, reduced-motion, built artifact, and Open Overview regressions

## Verification
- 51 Open Overview Node tests
- inherited SD Forest baseline guard
- 18 Open Overview Chromium tests
- 15-route homepage browser smoke
- production static build and artifact contract
"@
gh pr create --base main --head feat/open-overview-home-portal --title "feat: add Open Overview homepage portal" --body $body
```

Expected: GitHub returns one pull-request URL; no unrelated files appear in the PR.

- [ ] **Step 5: Require a green preview and squash-merge**

Run:

```powershell
gh pr checks --watch --fail-fast
gh pr view --json url,mergeStateStatus,statusCheckRollup
gh pr merge --squash --delete-branch
```

Expected: Vercel preview/checks are successful, `mergeStateStatus` is mergeable, and GitHub reports the PR merged into `main`. Do not use the unrelated legacy `deploy.ps1` and do not touch the extra Vercel project `openrouter-github-dashboard-dual`.

- [ ] **Step 6: Verify the merged commit and production deployment**

Run:

```powershell
git fetch origin
git log -1 --oneline origin/main
$response = Invoke-WebRequest 'https://www.sdforest.site/' -UseBasicParsing
if ($response.StatusCode -ne 200) { throw "Production homepage returned $($response.StatusCode)." }
if ($response.Content -notmatch 'Portal lattice · 16 nodes') { throw 'Production homepage is not on the merged portal version.' }
if ($response.Content -notmatch 'data-project="open-overview"') { throw 'Production homepage lacks Open Overview.' }
$route = Invoke-WebRequest 'https://www.sdforest.site/web/open-overview/' -UseBasicParsing
if ($route.StatusCode -ne 200 -or $route.Content -notmatch 'data-open-overview-route="overview"') { throw 'Production Open Overview route is unavailable.' }
Write-Output 'Production HTML contract passed.'
```

Expected: `origin/main` shows the squash commit and the command prints `Production HTML contract passed.` If Vercel is still promoting the merged commit, repeat only the two read-only HTTP checks at short intervals until the merged HTML appears; do not create another deployment project.

- [ ] **Step 7: Run final production browser QA**

Run:

```powershell
$browserExecutable='C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $browserExecutable -PathType Leaf)) { throw "Required browser executable not found: $browserExecutable" }
$env:SDFOREST_CHROMIUM_PATH=$browserExecutable
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE=$browserExecutable
Remove-Item Env:SDFOREST_STATIC_ROOT -ErrorAction SilentlyContinue
$env:SDFOREST_BASE_URL='https://www.sdforest.site'
$env:SDFOREST_QA_OUTPUT='C:\tmp\sdforest-home-portal-production'
node scratch/tests/browser-smoke.js
```

Expected: `Browser smoke passed: 15 routes, desktop/mobile/reduced-motion`; production captures show the animated Open Overview node, working preview, same-tab destination, stable mobile/tablet layout, and static reduced-motion state.

- [ ] **Step 8: Report the release checkpoint**

Report exactly:

- feature branch commit IDs and merged squash commit ID;
- pull-request URL;
- production homepage and Open Overview URLs;
- Vercel/check status;
- 51 Node + 11 inherited + 18 Chromium + 15 route-smoke validations;
- fixture-mode truth: the portal says `Public snapshot` and live ingestion remains disabled until credentials are configured;
- confirmation that unrelated untracked QA output, the existing `.gitignore` decision, and the extra Vercel project were untouched.
