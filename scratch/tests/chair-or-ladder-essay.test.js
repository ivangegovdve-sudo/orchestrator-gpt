const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const FINAL_SHORT_BODY = [
  "A chair and a ladder come from the same oak. A chair holds you where you are. A ladder gets you somewhere you couldn't reach — and stays for the next person. AI is both.",
  "My confession, since this essay is the evidence: I didn't write it. I handed the writing to a machine — not to save time, but because writing scares me. Critiquing is easy; I can pick at a draft forever. Writing one is the exposed part, so I don't. That's what all the iterations are — me editing instead of making. Fumbling on stilts: upright, moving, never quite on my own feet.",
  "That's the chair. It fills the blank page and quietly takes the one thing that was mine to practice. The danger isn't saved effort — a calculator saves effort. It's that the tool removes the repetition and the judgment together, until I can't tell which muscle I've stopped using.",
  "The ladder costs more: decide what matters yourself, check the machine's work, write down where it failed, leave the method for the next person. It's slower, and a metric that counts output per hour punishes slower. So most people take the chair — and they're right to. The cost doesn't land on them. It lands later, on whoever can't reconstruct how the answer was made.",
  "So the fix isn't willpower. It's keeping the work legible and portable — sources you can follow, records you can carry out, judgment you can still see. Borrow the capability; don't lose the ability to leave.",
  "Use the tools. Let them make you faster. But keep enough friction to feel the weight of the thing, and now and then do the scary part yourself. I'm still learning to. I wrote this line. The machine wrote the rest. That's the whole problem, and I know it.",
];

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

test('A Chair or a Ladder renders the approved short first-person essay verbatim', () => {
  const page = read('web/chair-or-ladder/index.html');
  const { article, text } = articleTextNodes(page);
  const words = text.join(' ').match(/[\p{L}\p{N}’'-]+/gu) || [];

  assert.match(page, /<title>A Chair or a Ladder — What AI trains us to become<\/title>/);
  assert.match(page, /<p class="byline">Ivan Gegov<\/p>/);
  assert.deepEqual(text, FINAL_SHORT_BODY, 'the rendered article text matches the supplied short manuscript');
  assert.equal(words.length, 299, 'the short manuscript lexical word count is preserved');
  assert.match(article, /I wrote this line\. The machine wrote the rest\./);
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
  assert.equal((article.match(/<h2\b/g) || []).length, 0, 'the short essay does not add section headings');
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
