const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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

test('A Chair or a Ladder publishes Ivan-approved unslopped Revision C verbatim', () => {
  const page = read('web/chair-or-ladder/index.html');
  const { article, text } = articleTextNodes(page);
  const words = text.join(' ').match(/[\p{L}\p{N}’'-]+/gu) || [];
  const normalized = text.join(' ').replace(/\s+/g, ' ').trim();

  assert.match(page, /<title>A Chair or a Ladder — What AI trains us to become<\/title>/);
  assert.match(page, /<p class="byline">Ivan Gegov<\/p>/);
  assert.equal(text.length, 30, 'all approved Revision C text blocks are present');
  assert.equal(words.length, 1607, 'approved Revision C word count');
  assert.equal(
    crypto.createHash('sha256').update(normalized, 'utf8').digest('hex'),
    'a30b3ac7c9820134e0216c270a8c9048a535f84b1273c7adfd192fa14473eac6',
    'the rendered article text matches the approved unslopped manuscript',
  );
  for (const required of [
    'The objection that should stop you',
    'Making judgment legible',
    'Where that leaves you',
    'But they ask for opposite postures.',
    'This essay is itself the example: Ivan Gegov supplied the governing image and the argument; AI drafted and revised the prose.',
    "Judgment isn't being defeated by convenience. It's being outbid by a measurement that doesn't know it exists.",
    'A ladder three people use is an argument.',
    'Stand where the decision matters.',
  ]) assert.match(article, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(article, /Both support weight|invite opposite postures|don't mistake enforced sitting for comfort/);
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
  assert.equal((article.match(/<h2\b/g) || []).length, 3, 'the approved essay keeps its three section headings');
  assert.equal((article.match(/<li>/g) || []).length, 0, 'the approved prose does not introduce list-only copy');
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
