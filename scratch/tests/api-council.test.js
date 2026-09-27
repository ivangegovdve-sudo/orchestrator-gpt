import test from 'node:test';
import assert from 'node:assert';
import pkg from '../../api/council.js';
const { resolveSeats } = pkg;

test('A null price is UNKNOWN, never zero. A model with unknown pricing must NEVER be selected as free.', () => {
  const resolved = [ { id: "google/model", value: null } ];
  const seats = resolveSeats(resolved);
  assert.strictEqual(seats.length, 0);
});

test('resolveSeats rejects unknown prices and ensures independent families', () => {
  const resolved = [
    { id: "cohere/model1", value: "0" },
    { id: "cohere/model2", value: "0" },
    { id: "google/model", value: null },
    { id: "dots-studio/model", value: "0" },
    { id: "liquid/model", value: "0" }
  ];
  const seats = resolveSeats(resolved);
  assert.deepStrictEqual(seats.map(s => s.id), ["cohere/model1", "dots-studio/model", "liquid/model"]);
});

test('resolveSeats returns fewer than 3 if not enough families', () => {
  const resolved = [
    { id: "cohere/model1", value: "0" },
    { id: "google/model", value: null },
    { id: "dots-studio/model", value: "0" }
  ];
  const seats = resolveSeats(resolved);
  assert.strictEqual(seats.length, 2);
});
