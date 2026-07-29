const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SCROLL_BANDS,
  createPowerLawEngine,
  layerDepth,
  layerForProgress,
  layerScale,
  translateZ,
} = require('../../web/power-law-odyssey/power-law-engine.js');

const html = fs.readFileSync(
  path.resolve(__dirname, '../../web/power-law-odyssey/index.html'),
  'utf8',
);
const designCss = fs.readFileSync(
  path.resolve(__dirname, '../../web/shared/forest-design.css'),
  'utf8',
);

test('a complete portfolio contains exactly 47 failures, two neutral bets, and one recovering outlier', () => {
  const engine = createPowerLawEngine('portfolio-proof');
  const outcomes = engine.batch(50);
  const counts = outcomes.reduce((total, result) => {
    total[result.outcome] = (total[result.outcome] || 0) + 1;
    return total;
  }, {});

  assert.deepEqual(counts, { failure: 47, neutral: 2, outlier: 1 });
  assert.equal(outcomes.at(-1).outcome, 'outlier');
  assert.equal(outcomes.at(-1).payout, 50);
  assert.deepEqual(engine.state(), {
    seed: 'portfolio-proof',
    attempts: 50,
    remaining: 0,
    failures: 47,
    neutrals: 2,
    outliers: 1,
    hits: 3,
    invested: 50,
    returned: 52,
    balance: 2,
    bestHit: 50,
    complete: true,
    recovered: true,
  });
});

test('the portfolio stops at 50 bets and reset reproduces its exact seeded scatter', () => {
  const engine = createPowerLawEngine('repeatable-scatter');
  const first = engine.batch(75);

  assert.equal(first.length, 50);
  assert.equal(engine.bet(), null);

  engine.reset();
  assert.deepEqual(engine.batch(50), first);
});

test('each native-scroll threshold selects one of the six blueprint chapters', () => {
  assert.deepEqual(SCROLL_BANDS, [
    [0, 0.15],
    [0.15, 0.35],
    [0.35, 0.55],
    [0.55, 0.75],
    [0.75, 0.9],
    [0.9, 1],
  ]);

  assert.equal(layerForProgress(0), 0);
  assert.equal(layerForProgress(0.1499), 0);
  assert.equal(layerForProgress(0.15), 1);
  assert.equal(layerForProgress(0.35), 2);
  assert.equal(layerForProgress(0.55), 3);
  assert.equal(layerForProgress(0.75), 4);
  assert.equal(layerForProgress(0.9), 5);
  assert.equal(layerForProgress(1), 5);
});

test('Z-space translation follows Tz = Oz + (p × v)', () => {
  assert.equal(translateZ(-1250, 0.25, 5000), 0);
  assert.equal(translateZ(-2250, 0.65, 5000), 1000);
  assert.equal(translateZ(-4750, 1, 5000), 250);
});

test('the scroll world keeps the blueprint camera contract and six substantive chapters', () => {
  assert.match(html, /\.scroll-container\s*\{[^}]*height:\s*600vh/s);
  assert.match(html, /\.stage-3d\s*\{[^}]*perspective:\s*1000px/s);
  assert.match(html, /\.stage-3d\s*\{[^}]*transform-style:\s*preserve-3d/s);
  assert.equal((html.match(/<section class="layer(?:\s|")/g) || []).length, 6);
  assert.match(html, /--scroll-p/);
  assert.match(html, /requestAnimationFrame\(updateScrollProgress\)/);
  assert.match(html, /addEventListener\("scroll"[\s\S]*\{\s*passive:\s*true\s*\}/);
});

test('the venture sandbox exposes a semantic deterministic 50-bet portfolio', () => {
  assert.match(html, /<ol[^>]+id="betField"[^>]+aria-label="50-bet portfolio"/);
  assert.match(html, /className = `bet-coin/);
  assert.match(html, /is-converged/);
  assert.match(html, /outlier-glow/);
  assert.match(html, /prefers-reduced-motion:\s*reduce[\s\S]*\.bet-coin/s);
});

test('all 50 physical coins use the convergence-only 500ms spring transition', () => {
  const convergedRule = html.match(
    /\.bet-field\.is-converged \.bet-coin\s*\{([\s\S]*?)\}/,
  )?.[1] || '';
  const baseRule = html.match(/\.bet-coin\s*\{([\s\S]*?)\}/)?.[1] || '';

  assert.match(convergedRule, /left var\(--duration-convergence\) var\(--spring\)/);
  assert.match(convergedRule, /top var\(--duration-convergence\) var\(--spring\)/);
  assert.match(convergedRule, /transform var\(--duration-convergence\) var\(--spring\)/);
  assert.match(convergedRule, /box-shadow var\(--duration-convergence\) var\(--spring\)/);
  assert.match(baseRule, /var\(--duration-recovery\) var\(--ease-out\)/);
  assert.doesNotMatch(baseRule, /--spring/);
  assert.match(designCss, /--duration-convergence:\s*500ms/);
});

test('scroll velocity continues to drive the page sliding motion', () => {
  assert.match(html, /--scroll-slip/);
  assert.match(html, /scrollVelocity/);
  assert.match(html, /\.layer-inner\s*\{[^}]*translate3d\(var\(--scroll-slip\)/s);
});

test('the page declares the canonical core tokens and does not present the modeled failure rate as a real-world statistic', () => {
  assert.match(html, /--bg:\s*#07070b\s*;/i);
  assert.match(html, /--surface:\s*#0f0f15\s*;/i);
  assert.match(html, /--accent:\s*#4f46e5\s*;/i);
  assert.doesNotMatch(html, /94% base failure rate in startups or creative output/i);
  assert.match(html, /deliberately modeled[\s\S]{0,180}94%/i);
});

test('the camera holds each chapter at the plane instead of flying it through linearly', () => {
  // Chapter 5's real values, straight from the stylesheet.
  const sandbox = { in0: 0.72, in1: 0.775, out0: 0.870, out1: 0.92, inV: 7270, outV: 6000 };

  assert.equal(Math.round(layerDepth(sandbox, 0.72)), -400);   // far, approaching
  assert.equal(Math.round(layerDepth(sandbox, 0.75)), -182);
  assert.equal(layerDepth(sandbox, 0.775), 0);                 // arrives at the plane
  assert.equal(layerDepth(sandbox, 0.82), 0);                  // ...and holds
  assert.equal(layerDepth(sandbox, 0.870), 0);                 // ...to the far edge
  assert.equal(Math.round(layerDepth(sandbox, 0.92)), 300);    // departs past camera

  // The hold is what makes the sandbox clickable: dead still at 1:1 scale.
  for (const p of [0.775, 0.80, 0.82, 0.84, 0.865, 0.870]) {
    assert.equal(layerScale(layerDepth(sandbox, p)), 1, `chapter 5 must not scale at p=${p}`);
  }

  // Clamped outside its own window, never wrapping around.
  assert.equal(Math.round(layerDepth(sandbox, 0)), -400);
  assert.equal(Math.round(layerDepth(sandbox, 1)), 300);

  // The closing chapter has no depart term, so the odyssey ends settled.
  const epiphany = { in0: 0.87, in1: 0.945, out0: 1, out1: 1, inV: 5600, outV: 0 };
  assert.equal(layerDepth(epiphany, 0.945), 0);
  assert.equal(layerDepth(epiphany, 1), 0);
  assert.equal(layerScale(layerDepth(epiphany, 1)), 1);
});

test('every chapter declares an approach, a hold, and a depart window in the stylesheet', () => {
  const rig = [...html.matchAll(
    /#layer(\d)\s*\{([^}]*)\}/g,
  )].map(([, id, body]) => {
    const read = (name) => {
      const match = body.match(new RegExp(`--${name}:\\s*([^;]+);`));
      return match ? match[1].trim() : null;
    };
    return {
      id: Number(id),
      in0: Number(read('in0')),
      in1: Number(read('in1')),
      out0: Number(read('out0')),
      out1: Number(read('out1')),
    };
  });

  assert.equal(rig.length, 6);
  for (const chapter of rig) {
    assert.ok(chapter.in0 <= chapter.in1, `#layer${chapter.id} approach window inverted`);
    assert.ok(chapter.in1 <= chapter.out0, `#layer${chapter.id} has no hold window`);
    assert.ok(chapter.out0 <= chapter.out1, `#layer${chapter.id} depart window inverted`);
  }
  // Chapter 5 holds longest: it is the one the reader has to click fifty times.
  const holds = rig.map((chapter) => chapter.out0 - chapter.in1);
  assert.equal(Math.max(...holds), holds[4], 'the sandbox must hold longest of the content chapters');

  // The camera throw lives at :root so the mobile media query can retune it —
  // an ID selector would outrank any .layer-level override.
  assert.match(html, /:root\s*\{[\s\S]*?--zv-in:\s*\d+px/);
  assert.match(html, /@media\s*\(max-width:\s*760px\)[\s\S]*?:root\s*\{[\s\S]*?--zv-in:\s*\d+px/);
  assert.doesNotMatch(html, /--origin-z|--z-velocity/);
});

test('the page carries the full canonical token set and spends no raw literals on text or radius', () => {
  for (const [name, value] of Object.entries({
    bg: '#07070b',
    surface: '#0f0f15',
    border: 'rgba(255,255,255,0.08)',
    'text-primary': '#f3f4f6',
    'text-muted': '#9ca3af',
    accent: '#4f46e5',
    'accent-green': '#22c55e',
    radius: '8px',
  })) {
    assert.match(
      html,
      new RegExp(`--${name}:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`, 'i'),
      `missing canonical token --${name}: ${value}`,
    );
  }
  // Local aliases resolve onto the canonical set rather than shadowing it.
  assert.match(html, /--ink:\s*var\(--text-primary\)/);
  assert.match(html, /--muted:\s*var\(--text-muted\)/);
  assert.match(html, /--line:\s*var\(--border\)/);

  const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const declarations = style.slice(style.indexOf('* { box-sizing'));
  for (const literal of ['#f2efe4', '#e9e6d4', '#e7e4d6', '#ccd2c2']) {
    assert.equal(declarations.includes(literal), false, `raw text literal ${literal} left in the stylesheet`);
  }
  assert.equal(/border-radius:\s*8px/.test(declarations), false, 'raw 8px radius left in the stylesheet');
});

test('small screens shed the costs that make a Z-scroll janky on a phone', () => {
  const mobile = html.slice(html.indexOf('@media (max-width: 760px)'));
  // backdrop-filter forces a readback of everything behind a panel on every
  // frame the panel moves, and these panels move for the entire scroll.
  assert.match(mobile, /\.chart-panel,\s*\.sandbox,\s*\.risk-panel,\s*\.branch-panel\s*\{[^}]*backdrop-filter:\s*none/);
  assert.match(mobile, /\.back-link\s*\{[^}]*backdrop-filter:\s*none/);
  assert.match(mobile, /--zv-in:\s*\d+px/);

  // The starfield scales to the device and idles when it cannot be seen.
  assert.match(html, /const starCount = smallScreen \?/);
  assert.match(html, /const maxDpr = smallScreen \?/);
  assert.match(html, /IntersectionObserver/);
  assert.match(html, /starsShouldRun/);
  // The per-frame loop reads cached progress, never the resolved style.
  assert.match(html, /const p = scrollProgress;/);
  assert.doesNotMatch(html, /getComputedStyle\(root\)\.getPropertyValue\("--scroll-p"\)/);
});

