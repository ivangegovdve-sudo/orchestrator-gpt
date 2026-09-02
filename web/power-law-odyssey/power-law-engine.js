(function attachPowerLawEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PowerLawEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createModule() {
  'use strict';

  const PORTFOLIO_SIZE = 50;
  const OUTLIER_PAYOUT = 50;
  const SCROLL_BANDS = Object.freeze([
    [0, 0.15],
    [0.15, 0.35],
    [0.35, 0.55],
    [0.55, 0.75],
    [0.75, 0.9],
    [0.9, 1],
  ]);

  function hashSeed(value) {
    const text = String(value || 'forest-2026');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let value = seed | 0;
    return function random() {
      value = (value + 0x6D2B79F5) | 0;
      let result = value;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));
  }

  function layerForProgress(progress) {
    const normalized = clamp01(progress);
    if (normalized === 1) return SCROLL_BANDS.length - 1;
    return SCROLL_BANDS.findIndex(([start, end]) => normalized >= start && normalized < end);
  }

  function translateZ(originZ, progress, velocity) {
    return Number(originZ) + clamp01(progress) * Number(velocity);
  }

  function createOutcomeDeck(random) {
    const deck = [
      ...Array.from({ length: 47 }, () => 'failure'),
      'neutral',
      'neutral',
    ];

    // The 49 ordinary bets scatter deterministically; the recovering outlier is
    // deliberately the fiftieth reveal so the portfolio demonstrates
    // persistence instead of occasionally paying out before the lesson lands.
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [deck[index], deck[target]] = [deck[target], deck[index]];
    }
    deck.push('outlier');
    return deck;
  }

  function createPortfolio(seed) {
    const random = mulberry32(hashSeed(seed));
    return createOutcomeDeck(random).map((outcome, index) => {
      const payout = outcome === 'outlier' ? OUTLIER_PAYOUT : outcome === 'neutral' ? 1 : 0;
      const scatterX = 7 + random() * 86;
      const scatterY = 9 + random() * 76;
      const rotation = -14 + random() * 28;
      return Object.freeze({
        index,
        outcome,
        payout,
        visual: Object.freeze({
          scatterX,
          scatterY,
          rotation,
          width: outcome === 'outlier' ? 118 : outcome === 'neutral' ? 48 : 30 + random() * 34,
          angle: outcome === 'outlier' ? -32 : -4 + random() * 10,
          bottom: 28 + random() * 84,
        }),
      });
    });
  }

  function createPowerLawEngine(seedValue) {
    const seed = String(seedValue || 'forest-2026');
    let portfolio;
    let ledger;

    function reset() {
      portfolio = createPortfolio(seed);
      ledger = {
        seed,
        attempts: 0,
        failures: 0,
        neutrals: 0,
        outliers: 0,
        hits: 0,
        invested: 0,
        returned: 0,
        balance: 0,
        bestHit: 0,
      };
      return state();
    }

    function bet() {
      if (ledger.attempts >= PORTFOLIO_SIZE) return null;

      const planned = portfolio[ledger.attempts];
      ledger.attempts += 1;
      ledger.invested += 1;
      ledger.returned += planned.payout;
      ledger.balance = ledger.returned - ledger.invested;
      if (planned.outcome === 'failure') ledger.failures += 1;
      if (planned.outcome === 'neutral') ledger.neutrals += 1;
      if (planned.outcome === 'outlier') ledger.outliers += 1;
      if (planned.outcome !== 'failure') ledger.hits += 1;
      ledger.bestHit = Math.max(ledger.bestHit, planned.payout);

      return {
        attempt: ledger.attempts,
        outcome: planned.outcome,
        hit: planned.outcome === 'outlier',
        neutral: planned.outcome === 'neutral',
        payout: planned.payout,
        net: planned.payout - 1,
        balance: ledger.balance,
        portfolioRecovered: ledger.attempts === PORTFOLIO_SIZE && ledger.returned >= ledger.invested,
        visual: planned.visual,
      };
    }

    function batch(count) {
      const requested = Math.max(0, Math.floor(Number(count) || 0));
      const total = Math.min(requested, PORTFOLIO_SIZE - ledger.attempts);
      return Array.from({ length: total }, bet);
    }

    function state() {
      const complete = ledger.attempts === PORTFOLIO_SIZE;
      return {
        seed: ledger.seed,
        attempts: ledger.attempts,
        remaining: PORTFOLIO_SIZE - ledger.attempts,
        failures: ledger.failures,
        neutrals: ledger.neutrals,
        outliers: ledger.outliers,
        hits: ledger.hits,
        invested: ledger.invested,
        returned: ledger.returned,
        balance: ledger.balance,
        bestHit: ledger.bestHit,
        complete,
        recovered: complete && ledger.returned >= ledger.invested,
      };
    }

    reset();
    return { bet, batch, reset, state };
  }

  return {
    PORTFOLIO_SIZE,
    OUTLIER_PAYOUT,
    SCROLL_BANDS,
    createPowerLawEngine,
    hashSeed,
    layerForProgress,
    translateZ,
  };
});
