const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SCROLL_BANDS,
  createPowerLawEngine,
  layerForProgress,
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
  assert.match(convergedRule, /left:\s*50%/);
  assert.match(convergedRule, /top:\s*50%/);
  assert.match(convergedRule, /transform var\(--duration-convergence\) var\(--spring\)/);
  assert.match(convergedRule, /box-shadow var\(--duration-convergence\) var\(--spring\)/);
  assert.match(baseRule, /var\(--duration-recovery\) var\(--ease-out\)/);
  assert.doesNotMatch(baseRule, /--spring/);
  assert.doesNotMatch(html, /--grid-[xy]/);
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
