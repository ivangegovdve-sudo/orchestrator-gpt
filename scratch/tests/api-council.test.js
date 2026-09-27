import test from 'node:test';
import assert from 'node:assert';
import pkg from '../../api/council.js';
const { resolveSeats } = pkg;

test('A null price is UNKNOWN, never zero. A model with unknown pricing must NEVER be selected as free.', () => {
  const resolved = [ { id: "google/model", value: null } ];
  const seats = resolveSeats(resolved);
  assert.strictEqual(seats.length, 0);
});

test('resolveSeats accepts only zero-priced :free slugs and ensures independent families', () => {
  const resolved = [
    { id: "cohere/model1:free", value: "0" },
    { id: "cohere/model2:free", value: "0" },
    { id: "google/model:free", value: null },
    { id: "dots-studio/model:free", value: "0" },
    { id: "liquid/model:free", value: "0" },
    { id: "paid/not-free", value: "0" },
    { id: "priced/looks-free:free", value: "0.0000004" }
  ];
  const seats = resolveSeats(resolved);
  assert.deepStrictEqual(seats.map(s => s.id), ["cohere/model1:free", "dots-studio/model:free", "liquid/model:free"]);
});

test('resolveSeats returns fewer than 3 if not enough families', () => {
  const resolved = [
    { id: "cohere/model1:free", value: "0" },
    { id: "google/model:free", value: null },
    { id: "dots-studio/model:free", value: "0" }
  ];
  const seats = resolveSeats(resolved);
  assert.strictEqual(seats.length, 2);
});
