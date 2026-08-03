const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('Chair or Ladder publishes the final concise essay and its decision test', () => {
  const page = read('web/chair-or-ladder/index.html');
  const article = page.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const plain = article
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|mdash|ndash|rsquo|ldquo|rdquo);/g, ' ');
  const words = plain.match(/[\p{L}\p{N}’'-]+/gu) || [];

  assert.match(page, /<title>Chair or Ladder\? — What AI trains us to become<\/title>/);
  assert.match(page, /An essay by Ivan Gegov/);
  assert.match(page, /am I more capable of judgment, or more dependent on judgment I cannot see\?/);
  assert.match(page, /Defaults harden into infrastructure\./);
  assert.match(page, /leave the ladder where someone else can reach it\./);
  assert.ok(words.length >= 920 && words.length <= 1000, `essay body is ${words.length} words`);
  assert.doesNotMatch(article, /Picture an avalanche|Not snow[—-]AI/i);
});

test('Chair or Ladder has a canonical URL, accessible object study, and real public feedback path', () => {
  const page = read('web/chair-or-ladder/index.html');
  const checklist = page.match(/<section class="checklist"[\s\S]*?<\/section>/)?.[0] || '';

  assert.match(page, /rel="canonical" href="https:\/\/www\.sdforest\.site\/web\/chair-or-ladder\/"/);
  assert.match(page, /role="img" aria-labelledby="object-study-title object-study-desc"/);
  assert.equal((checklist.match(/<li>/g) || []).length, 5);
  assert.match(page, /data-feedback-link/);
  assert.match(page, /data-feedback-email/);
  assert.match(page, /mailto:ivangegov\.dve@gmail\.com\?subject=Chair%20or%20Ladder%20feedback/);
  assert.match(page, /github\.com\/ivangegovdve-sudo\/orchestrator-gpt\/issues\/new\?/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noopener"/);
  assert.doesNotMatch(page, /PLACEHOLDER|formspree/i);
  assert.match(page, /Companion piece in production/);
  assert.match(page, /We Are The Training Data/);
});

test('Forest HUB makes Chair or Ladder the first truthful atlas path', () => {
  const home = read('index.html');
  const grid = home.match(/<div class="project-grid" data-project-grid>([\s\S]*?)<\/div>\s*<\/section>/)?.[1] || '';
  const firstProject = grid.match(/data-project="([^"]+)"/)?.[1];

  assert.equal(firstProject, 'chair-ladder');
  assert.equal((home.match(/data-project="chair-ladder"/g) || []).length, 1);
  assert.match(home, /data-project="chair-ladder"[^>]+data-href="\/web\/chair-or-ladder\/"/);
  assert.match(home, /<use href="#icon-chair-ladder"\/>/);
  assert.match(home, /data-status="New essay"/);
});
