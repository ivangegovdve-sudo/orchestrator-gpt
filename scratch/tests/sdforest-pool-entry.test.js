const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const entryPools = ['growingapp', 'ai-d-kit', 'tinkerbox', 'design-gallery', 'artificial-self', 'my-story'];
const presenter = import('../../web/shared/pool-page.mjs');
const catalog = import('../../web/shared/project-catalog.mjs');

test('each non-Health pool carries the shared entry contract and its own scene', () => {
  for (const id of entryPools) {
    const html = read(`web/pools/${id}/index.html`);
    assert.match(html, /<section class="entry" data-pool-entry data-sc-act="pin" data-sc-span="[\d.]+">/, id);
    assert.match(html, /data-entry-canvas[^>]*aria-hidden="true"/, id);
    assert.match(html, /class="entry-notice"/, id);
    assert.match(html, /class="entry-go" href="#pool-world"/, id);
    assert.match(html, /id="pool-world"/, id);
    assert.match(html, /\/web\/shared\/pool-entry\/pool-entry\.css/, id);
    assert.match(html, /\/web\/shared\/feedback\.js/, id);
    assert.doesNotMatch(html, /pool-page\.css|pool-designed\.css/, id);
    assert.ok(fs.existsSync(path.join(ROOT, `web/pools/${id}/entry.mjs`)), id);
    const scene = read(`web/pools/${id}/entry.mjs`);
    assert.match(scene, /duration/, id);
    assert.match(scene, /still/, id);
  }
});

test('Health stays on the old template and does not load the entry system', () => {
  const html = read('web/pools/health/index.html');
  assert.doesNotMatch(html, /pool-entry|feedback\.js/);
});

test('the engine copy is verbatim', () => {
  assert.equal(read('web/shared/pool-entry/scrollcraft.js'), read('.agents/skills/scroll-craft/engine/scrollcraft.js'));
});

test('feedback mode adds a Feedback button to every card, including closed ones, without aria-disabled', async () => {
  const [{ renderProject }, { getPoolProjects }] = await Promise.all([presenter, catalog]);
  for (const name of ['GrowingApp', 'AI-d kit', 'TinkerBox', 'Design Gallery', 'Artificial Self', 'My Story']) {
    for (const project of getPoolProjects(name)) {
      const html = renderProject(project, { designed: true, feedback: true });
      if (!html) continue;
      assert.match(html, new RegExp(`data-feedback-open data-feedback-project="${project.id}"`), project.id);
      assert.doesNotMatch(html, /aria-disabled/, project.id);
      assert.doesNotMatch(renderProject(project, { designed: true }), /data-feedback-open/, 'off by default');
    }
  }
});

test('reduced motion repaints the still after every canvas resize, since resizing clears it', () => {
  const runtime = read('web/shared/pool-entry/pool-entry.mjs');
  // The ResizeObserver fires once on observe(); with no frame loop a blank canvas would stay blank.
  assert.match(runtime, /const relayout = \(\) => \{ resize\(\); if \(reduced\) \{[^}]*paint\(\);/);
  assert.match(runtime, /new ResizeObserver\(relayout\)/);
  assert.match(runtime, /addEventListener\('resize', relayout\)/);
});

test('the scene clock excludes hidden and off-screen time', () => {
  const runtime = read('web/shared/pool-entry/pool-entry.mjs');
  assert.match(runtime, /pausedFor \+= now - pausedAt/);
  assert.match(runtime, /document\.hidden \|\| !visible\) \{ pausedAt \?\?= now; return; \}/);
});

test('shared runtime math helpers are sound and resilient to NaN / division by zero', async () => {
  const { clamp, lerp, seg, smooth, easeOut, easeOutQuint, easeInOut, easeOutBack, rng, hex } =
    await import('../../web/shared/pool-entry/pool-entry.mjs');

  // clamp: bounds enforcement and NaN safety
  assert.equal(clamp(0.5), 0.5);
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(2), 1);
  assert.equal(clamp(15, 10, 20), 15);
  assert.equal(clamp(5, 10, 20), 10);
  assert.equal(clamp(25, 10, 20), 20);
  assert.equal(clamp(NaN), 0, 'NaN safely clamps to lower bound');
  assert.equal(clamp(Infinity), 1);
  assert.equal(clamp(-Infinity), 0);

  // lerp: linear interpolation
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(lerp(10, 20, 0.5), 15);

  // seg: normalized segment progress with zero-division safety
  assert.equal(seg(5, 0, 10), 0.5);
  assert.equal(seg(-2, 0, 10), 0);
  assert.equal(seg(12, 0, 10), 1);
  assert.equal(seg(5, 5, 5), 1, 'matching endpoints do not divide by zero');
  assert.equal(seg(3, 5, 5), 0);

  // smooth and easing functions satisfy [0, 1] range invariants
  for (const fn of [smooth, easeOut, easeOutQuint, easeInOut]) {
    assert.equal(fn(0), 0);
    assert.equal(fn(1), 1);
    const mid = fn(0.5);
    assert.ok(mid > 0 && mid < 1);
  }
  assert.equal(easeOutBack(0), 0);
  assert.equal(easeOutBack(1), 1);

  // deterministic RNG yields identical reproducible sequences
  const r1 = rng(42);
  const r2 = rng(42);
  const seq1 = [r1(), r1(), r1(), r1()];
  const seq2 = [r2(), r2(), r2(), r2()];
  assert.deepEqual(seq1, seq2, 'identical seed produces identical sequence');
  seq1.forEach((val) => assert.ok(val >= 0 && val < 1, 'rng output in [0, 1)'));

  // hex parser handles 6-char, 3-char, alpha, and invalid strings gracefully
  assert.equal(hex('#ffffff'), 'rgba(255,255,255,1)');
  assert.equal(hex('#000000', 0.5), 'rgba(0,0,0,0.5)');
  assert.equal(hex('#fff'), 'rgba(255,255,255,1)', '3-digit hex supported');
  assert.equal(hex('#123456', 0.8), 'rgba(18,52,86,0.8)');
  assert.equal(hex('not-a-hex', 0.5), 'rgba(0,0,0,0.5)', 'invalid hex falls back safely without NaN');
});

test('shared runtime mount gracefully fails closed without throwing on missing elements', async () => {
  const { mount } = await import('../../web/shared/pool-entry/pool-entry.mjs');
  // Root with no entry
  const dummyRoot1 = { querySelector: () => null };
  assert.equal(mount({}, { root: dummyRoot1 }), null, 'returns null when entry missing');

  // Root with entry but no canvas
  const dummyRoot2 = {
    querySelector: (sel) => sel === '[data-pool-entry]' ? { querySelector: () => null } : null,
  };
  assert.equal(mount({}, { root: dummyRoot2 }), null, 'returns null when canvas missing');

  // Root with canvas but no 2d context
  const dummyRoot3 = {
    querySelector: (sel) => {
      if (sel === '[data-pool-entry]') {
        return {
          querySelector: (sub) => sub === '[data-entry-canvas]' ? { getContext: () => null } : null,
        };
      }
      return null;
    },
  };
  assert.equal(mount({}, { root: dummyRoot3 }), null, 'returns null when getContext(2d) fails');
});

test('shared runtime source code contains guards against silent-failure paths and NaN corruption', () => {
  const runtime = read('web/shared/pool-entry/pool-entry.mjs');
  // Division by zero guard on pointer tracking
  assert.match(runtime, /r\.width > 0 && r\.height > 0/, 'guards pointer tracking against 0-dimension NaN propagation');
  // Safe parsing of debug parameters
  assert.match(runtime, /Number\.isFinite\(parsedT\)/, 'validates entry-t parameter is finite number');
  assert.match(runtime, /Number\.isFinite\(parsedP\)/, 'validates entry-p parameter is finite number');
  // Missing 2d context check
  assert.match(runtime, /if \(!g\) return null;/, 'gracefully returns null if 2d context unavailable');
  // Body check before ScrollCraft mount
  assert.match(runtime, /if \(document\.body\) window\.ScrollCraft\?\.mount/, 'verifies document.body exists before mounting');
});

test('pool-entry.css sets accessibility floor: contrast, 44px touch targets, focus rings, and reduced motion', () => {
  const css = read('web/shared/pool-entry/pool-entry.css');
  // Accessible focus outline
  assert.match(css, /:where\([^)]*\):focus-visible\s*\{\s*outline:\s*2px solid var\(--entry-focus\)/);
  // Screen reader utility with clip-path
  assert.match(css, /\.pool-sr\s*\{[^}]*clip-path:\s*inset\(50%\)/);
  // 44px min-height touch targets
  assert.match(css, /\.pool-feedback\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.entry-go\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /body\.pool-page > header a\s*\{[^}]*min-height:\s*44px/);
  // Reduced motion floor
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*animation-duration:\s*\.001ms !important/);
  assert.match(css, /scroll-behavior:\s*auto !important/);
  // Submit button contrast inversion on pool pages
  assert.match(css, /body\.pool-page \[data-feedback-backdrop\] button\[type="submit"\]/);
  assert.match(css, /background:\s*var\(--text-primary,\s*var\(--forest-ink,\s*#f3f4f6\)\)\s*!important/);
  assert.match(css, /color:\s*var\(--surface,\s*var\(--forest-surface,\s*#0f0f15\)\)\s*!important/);
});

test('feedback.js provides accessible dialog with secure textContent and focus management', () => {
  const js = read('web/shared/feedback.js');
  // Modal dialog accessibility
  assert.match(js, /setAttribute\('role',\s*'dialog'\)/);
  assert.match(js, /setAttribute\('aria-modal',\s*'true'\)/);
  assert.match(js, /setAttribute\('aria-label',\s*'Site feedback'\)/);
  // Project-specific labeling via textContent (no innerHTML injection)
  assert.match(js, /about\.textContent = `About: \${name}`/);
  assert.match(js, /dialog\.setAttribute\('aria-label',\s*`Feedback on \${name}`\)/);
  // Safe thanks message
  assert.match(js, /thanks\.setAttribute\('role',\s*'status'\)/);
  assert.match(js, /thanks\.textContent = 'Thanks — noted\.'/);
  // Safe focus restoration on close
  assert.match(js, /target\.focus\(\)/);
  // Graceful fetch error handling with status message
  assert.match(js, /status\.textContent = "Couldn't send — try again later\."/);
  // Double-submit prevention
  assert.match(js, /submitBtn\.disabled = true/);
});

test('pool-page.mjs handles external companion links safely without throwing on malformed URLs', async () => {
  const { renderProject } = await import('../../web/shared/pool-page.mjs');
  // Valid external
  const html1 = renderProject({
    id: 'test-proj',
    publicName: 'Test Project',
    status: 'Live',
    poolContext: 'GrowingApp',
    routeBindings: [{ type: 'external', url: 'https://example.com/demo' }],
  }, { designed: true });
  assert.match(html1, /Visit example\.com/);
  assert.match(html1, /data-pool-rank="unranked"/);

  // Malformed external URL does not throw and falls back safely
  assert.doesNotThrow(() => {
    const html2 = renderProject({
      id: 'test-bad-url',
      publicName: 'Bad URL Project',
      status: 'Live',
      poolContext: 'GrowingApp',
      routeBindings: [{ type: 'external', url: 'https://' }],
    }, { designed: true });
    assert.ok(html2.includes('data-project-id="test-bad-url"'));
  });
});

test('all six pool implementations (including growingapp, tinkerbox, my-story) follow the verified entry scene contract', () => {
  for (const id of entryPools) {
    const entryPath = `web/pools/${id}/entry.mjs`;
    assert.ok(fs.existsSync(path.join(ROOT, entryPath)), `entry exists for ${id}`);
    const src = read(entryPath);
    // Imports pool-entry runtime
    assert.match(src, /from '\/web\/shared\/pool-entry\/pool-entry\.mjs'/);
    // Uses deterministic RNG
    assert.match(src, /\brng\(/, `${id} uses deterministic RNG`);
    // Exports scene object with duration, still, and draw
    assert.match(src, /duration:\s*[\d.]+/, `${id} defines duration`);
    assert.match(src, /still:\s*[\d.]+/, `${id} defines still`);
    assert.match(src, /draw\s*\(/, `${id} defines draw hook`);
    // Handles portrait and landscape
    assert.match(src, /\bportrait\b/, `${id} adapts to portrait/landscape`);
    // HTML links to the scene and shared runtime
    const html = read(`web/pools/${id}/index.html`);
    assert.match(html, new RegExp(`/web/pools/${id}/entry\\.mjs`), `${id} HTML loads scene`);
    assert.match(html, /\/web\/shared\/pool-entry\/pool-entry\.css/, `${id} HTML loads pool-entry.css`);
    assert.match(html, /\/web\/shared\/pool-entry\/scrollcraft\.js/, `${id} HTML loads scrollcraft.js`);
  }
});
