const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function articleTextNodes(page) {
  const article = page.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const text = [...article.matchAll(/<(?:p|h2|h3|li)\b[^>]*>([\s\S]*?)<\/(?:p|h2|h3|li)>/gi)]
    .map((match) => match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim());
  return { article, text };
}

test('A Chair or a Ladder publishes the complete Revision C essay body', () => {
  const page = read('web/chair-or-ladder/index.html');
  const { article, text } = articleTextNodes(page);
  const words = text.join(' ').match(/[\p{L}\p{N}’'-]+/gu) || [];

  assert.match(page, /<title>A Chair or a Ladder — What AI trains us to become<\/title>/);
  assert.match(page, /<p class="byline">Ivan Gegov<\/p>/);
  assert.equal(text.length, 67, 'all Revision C text blocks are present');
  assert.equal(words.length, 2003, 'Revision C word count');
  for (const required of [
    'The objection that should stop you',
    'Making judgment legible',
    'Where that leaves you',
    'Before delegating, ask (as a person or as a team)',
    'Ivan Gegov supplied the governing image and the argument; AI systems drafted and revised the prose.',
    'The work did not disappear. It moved:',
    'A ladder three people use is an argument.',
    'push for a world where climbing is not punished as inefficiency.',
  ]) assert.match(article, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(article, /Council review|Reference — the council prescription|Alternate revision|Working draft/i);
  assert.doesNotMatch(page, /<audio\b/i);
});

test('A Chair or a Ladder has the clean public route and readable essay structure', () => {
  const page = read('web/chair-or-ladder/index.html');
  const config = JSON.parse(read('vercel.json'));
  const { article } = articleTextNodes(page);

  assert.match(page, /rel="canonical" href="https:\/\/www\.sdforest\.site\/chair-or-ladder"/);
  assert.match(page, /property="og:url" content="https:\/\/www\.sdforest\.site\/chair-or-ladder"/);
  assert.match(page, /role="img" aria-labelledby="object-study-title object-study-desc"/);
  assert.match(page, /font-size: clamp\(18px, 2\.15vw, 21px\)/);
  assert.match(page, /line-height: 1\.76/);
  assert.deepEqual(config.rewrites.filter(({ source }) => source.startsWith('/chair-or-ladder')), [
    { source: '/chair-or-ladder', destination: '/web/chair-or-ladder/' },
    { source: '/chair-or-ladder/', destination: '/web/chair-or-ladder/' },
  ]);
  assert.equal((article.match(/<li>/g) || []).length, 15);
});

test('Forest HUB and My Story link to the clean essay URL', () => {
  const home = read('index.html');
  const myStory = read('web/pools/my-story/index.html');
  const expected = /href="\/chair-or-ladder">A Chair or a Ladder<\/a>/;

  assert.match(home, expected);
  assert.match(myStory, expected);
  assert.doesNotMatch(home, /href="\/web\/chair-or-ladder\//);
  assert.doesNotMatch(myStory, /href="\/web\/chair-or-ladder\//);
});