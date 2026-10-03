/** Public catalogue facts only. Council selection policy belongs to the council repo. */
import { readFile, writeFile } from 'node:fs/promises';
const snapshot = JSON.parse(await readFile(new URL('../public-catalogue.json', import.meta.url), 'utf8'));
const state = { schemaVersion: '1.0', status: 'ok', generatedAt: snapshot.fetchedAt || new Date().toISOString(),
  scope: { completeness: snapshot.hasMore ? 'partial' : 'full', definition: 'dated public catalogue observations; not live inference' },
  rows: (snapshot.data || []).map(row => ({ provider: row.provider, id: row.id, contextLength: row.contextLength,
    pricing: row.pricing, availability: row.availability, lastConfirmedAt: row.lastConfirmedAt })) };
await writeFile(new URL('../capability-state.json', import.meta.url), JSON.stringify(state, null, 2) + '\n');
console.log(`Public catalogue facts: ${state.rows.length} rows; no council policy fields.`);
