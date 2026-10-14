const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('the middle-way front page has one flat Featured row and three themed preview groups', () => {
  const home = read('index.html');
  const featured = home.match(/<ul class="forest-index__featured"[\s\S]*?<\/ul>/)?.[0];
  assert.ok(featured, 'Featured row exists');
  const cards = [...featured.matchAll(/<li class="forest-index__card forest-index__card--featured" data-featured-id="([^"]+)">([\s\S]*?)<\/li>/g)];
  assert.deepEqual(cards.map(([, id]) => id), [
    'open-dashboard', 'platforms-guide', 'moneywolf', 'repo-shelf', 'the-drop',
    'chair-or-ladder', 'we-are-the-training-data', 'gym-scholar', 'unified-reader',
    'mendeleev', 'math-mania', 'manifesto-newborn', 'avatar-playground',
    'model-councils', 'poetry-space', 'alternate-self',
  ]);
  assert.equal(cards.length, 16);
  for (const [, id, card] of cards) {
    assert.match(card, /<h3><a href="[^"]+"[^>]*>[^<]+<\/a><\/h3>/, id);
    assert.match(card, /<strong>Why featured:<\/strong>/, id);
  }

  const groups = home.match(/<div class="forest-index__groups"[\s\S]*?<\/div>\s*<\/section>\s*<\/section>/)?.[0];
  assert.ok(groups, 'the three themed groups exist');
  assert.deepEqual([...groups.matchAll(/<section class="forest-index__group" aria-labelledby="([^"]+)"[\s\S]*?<h3 id="[^"]+">([^<]+)<\/h3>/g)].map(([, id, name]) => [id, name]), [
    ['tools-systems-title', 'Tools &amp; systems'],
    ['learning-wellbeing-title', 'Learning &amp; wellbeing'],
    ['writing-research-title', 'Writing, research &amp; experiments'],
  ]);
  const previews = [...groups.matchAll(/<li class="forest-index__preview">([\s\S]*?)<\/li>/g)];
  assert.ok(previews.length >= 12);
  for (const [, preview] of previews) {
    assert.match(preview, /In progress/);
    assert.match(preview, /<h4><a href="[^"]+"[^>]*>[^<]+<\/a><\/h4>/);
  }

  assert.match(featured, /MCP companion · npm v2\.0\.0/);
  assert.match(featured, /1,309 repositories across 6 shelves/);
  assert.match(featured, /href="https:\/\/forest-math-plus\.lovable\.app\/"[^>]*>Math Mania<\/a>/);
  assert.match(groups, /Life in Time/);
  assert.match(groups, /We Are The Training Data/);
  assert.match(groups, /The Drop dependency map/);
  assert.doesNotMatch(featured, /Explore Repos|Dyslexia Reader|Audiobook Studio|Hyper Trophy|HypertrophyOS|Math Mania \/ Forest Math|Academy/);
  assert.doesNotMatch(groups, /Explore Repos|Dyslexia Reader|Audiobook Studio|Hyper Trophy|HypertrophyOS|Math Mania \/ Forest Math|Academy/);
  assert.doesNotMatch(home, /1,192 repositories|15 providers|18 tools|1\.2\.1/);
  assert.doesNotMatch(home, /Fleet|Knowledge Ingest|Chloé PWA|Chloé desktop/);
  assert.doesNotMatch(home, /claimed series landing|series concept/);
});

test('the public spoken-word route is no longer marked unlisted or noindex', () => {
  const html = read('web/we-are-the-training-data/index.html');
  assert.doesNotMatch(html, /name="robots"[^>]+noindex/i);
  assert.match(html, /Spoken word &middot; public live piece/);
  assert.match(html, /Live piece &middot; v4 &middot; in progress/);
});
