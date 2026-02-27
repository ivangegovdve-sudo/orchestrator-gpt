const test = require('node:test');
const assert = require('node:assert/strict');

const { createGlossarySearch } = require('../../web/ai-init/glossary-search.js');

test('ranking priority exact > prefix > contains for abbreviation', () => {
  const data = [
    { abbr: 'XLLM', expansion: 'contains case', desc: 'contains llm in abbr', category: 'Cat' },
    { abbr: 'LLMX', expansion: 'prefix case', desc: 'prefix llm in abbr', category: 'Cat' },
    { abbr: 'LLM', expansion: 'exact case', desc: 'exact', category: 'Cat' },
  ];

  const api = createGlossarySearch(data);
  const result = api.search('LLM', 10).map((entry) => entry.abbr);

  assert.equal(result[0], 'LLM');
  assert.equal(result[1], 'LLMX');
  assert.equal(result[2], 'XLLM');
});

test('expansion and description matching works when abbreviation differs', () => {
  const data = [
    { abbr: 'ABC', expansion: 'Large Language Model', desc: 'general concept', category: 'Cat' },
    { abbr: 'DEF', expansion: 'Token windows', desc: 'mentions language model details', category: 'Cat' },
    { abbr: 'GHI', expansion: 'Vector index', desc: 'nothing related', category: 'Cat' },
  ];

  const api = createGlossarySearch(data);
  const result = api.search('language model', 10).map((entry) => entry.abbr);

  assert.deepEqual(result.slice(0, 2), ['ABC', 'DEF']);
  assert.ok(!result.includes('GHI'));
});

test('format copy output uses ABBR — Expansion', () => {
  const data = [{ abbr: 'RAG', expansion: 'Retrieval Augmented Generation', desc: 'desc', category: 'Cat' }];
  const api = createGlossarySearch(data);

  assert.equal(api.formatCopy(api.entries[0]), 'RAG — Retrieval Augmented Generation');
});
