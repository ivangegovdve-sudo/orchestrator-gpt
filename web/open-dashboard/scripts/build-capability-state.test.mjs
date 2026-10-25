import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
test('public export contains catalogue facts and excludes all council selection configuration', async () => {
  const state=JSON.parse(await readFile(new URL('../capability-state.json',import.meta.url),'utf8'));
  assert.equal(state.status,'ok'); assert.ok(state.rows.length > 0);
  assert.equal(state.queries,undefined);
  assert.ok(state.rows.every(row=>row.selection===undefined && typeof row.id==='string'));
  assert.doesNotMatch(JSON.stringify(state),/literal_cheapest_paid|cheapest_functional/);
});
