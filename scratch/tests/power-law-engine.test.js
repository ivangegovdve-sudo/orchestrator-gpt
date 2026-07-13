const test = require('node:test');
const assert = require('node:assert/strict');

const { createPowerLawEngine } = require('../../web/power-law-odyssey/power-law-engine.js');

test('the same seed produces the same bet sequence', () => {
  const first = createPowerLawEngine('forest-42');
  const second = createPowerLawEngine('forest-42');

  assert.deepEqual(
    Array.from({ length: 40 }, () => first.bet()),
    Array.from({ length: 40 }, () => second.bet()),
  );
});

test('every attempt costs one unit and state tracks failures, balance, and best hit', () => {
  const engine = createPowerLawEngine('accounting');
  const results = engine.batch(50);
  const state = engine.state();

  assert.equal(state.attempts, 50);
  assert.equal(state.failures + state.hits, 50);
  assert.equal(state.balance, results.reduce((sum, result) => sum + result.payout - 1, 0));
  assert.equal(state.bestHit, Math.max(0, ...results.map((result) => result.payout)));
});

test('reset reproduces the original sequence', () => {
  const engine = createPowerLawEngine('again');
  const first = engine.batch(20);
  engine.reset();
  assert.deepEqual(engine.batch(20), first);
});
