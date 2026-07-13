(function attachPowerLawEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PowerLawEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createModule() {
  'use strict';

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

  function createPowerLawEngine(seedValue) {
    const seed = String(seedValue || 'forest-2026');
    let random;
    let ledger;

    function reset() {
      random = mulberry32(hashSeed(seed));
      ledger = { seed, attempts: 0, failures: 0, hits: 0, balance: 0, bestHit: 0 };
      return state();
    }

    function bet() {
      ledger.attempts += 1;
      const hit = random() < 0.06;
      // A Pareto-like payout: one-unit downside, long but capped upside.
      const payout = hit
        ? Math.min(1000, Math.max(5, Math.round(5 / Math.pow(Math.max(0.001, 1 - random()), 0.78))))
        : 0;
      ledger.balance += payout - 1;
      if (hit) ledger.hits += 1;
      else ledger.failures += 1;
      ledger.bestHit = Math.max(ledger.bestHit, payout);

      return {
        attempt: ledger.attempts,
        hit,
        payout,
        balance: ledger.balance,
        visual: {
          width: hit ? 118 : 30 + random() * 34,
          angle: hit ? -32 : -4 + random() * 10,
          bottom: 28 + random() * 84,
        },
      };
    }

    function batch(count) {
      const total = Math.max(0, Math.min(1000, Math.floor(Number(count) || 0)));
      return Array.from({ length: total }, bet);
    }

    function state() {
      return { ...ledger };
    }

    reset();
    return { bet, batch, reset, state };
  }

  return { createPowerLawEngine, hashSeed };
});
