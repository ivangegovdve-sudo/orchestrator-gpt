const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (name) => fs.readFileSync(path.resolve(__dirname, '../..', name), 'utf8');
const publicMarkup = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '');

test('retained legacy routes identify their settled relationships', () => {
  const cases = [
    ['kids', /retired legacy hub/i, /href="\/web\/pools\/growingapp\/"/, /movies and books/i],
    ['gallery', /internal.reference legacy surface/i, /visibility does not enforce access/i, /author/i],
    ['voice-playground', /absorbed into Avatar Playground/i, /href="\/web\/avatar-playground\/"/],
    ['evolution', /Website History material/i, /href="\/web\/pools\/design-gallery\/"/],
  ];
  for (const [route, ...requirements] of cases) {
    const html = publicMarkup(read(`web/${route}/index.html`));
    for (const requirement of requirements) assert.match(html, requirement, route);
  }
  const kids = publicMarkup(read('web/kids/index.html'));
  assert.match(kids, /<title>[^<]*retired/i);
  assert.match(kids, /<h1[^>]*>[^<]*retired legacy hub/i);
  assert.doesNotMatch(kids, /<span[^>]*>Game<\/span>|kid-safe|Growing Up/);
});

test('C2C archives retain distinct topology and suppress unverified public measurements', () => {
  for (const route of ['c2c-dolphin', 'c2c-self']) {
    const source = read(`web/${route}/index.html`);
    const html = publicMarkup(source);
    assert.match(html, /archived claims requiring rederivation before publication/i);
    assert.match(html, /not verified findings/i);
    assert.match(html, /id="transcript"/);
    assert.match(source, /const TURNS = \[/);
    assert.doesNotMatch(html, /Attractor Rate|Archetype [AB]|The Poet|The Logician|Metaphor density|<div class="big5"/i);
    assert.doesNotMatch(source, /frags\.push\([^\n]*Attractor convergence/);
  }
  assert.match(publicMarkup(read('web/c2c-dolphin/index.html')), /AI Conversation[\s\S]*C2C Dolphin/);
  assert.match(publicMarkup(read('web/c2c-dolphin/index.html')), /Nemotron Super 120B[\s\S]*Dolphin Mistral 24B/);
  assert.match(publicMarkup(read('web/c2c-self/index.html')), /identical-model self-mirror control/i);
  assert.match(publicMarkup(read('web/c2c-self/index.html')), /distinct from C2C Dolphin/i);
});

test('C2C transcript renderers keep same-model and cross-model labels distinct', () => {
  const self = read('web/c2c-self/index.html');
  const dolphin = read('web/c2c-dolphin/index.html');
  assert.match(self, /const label = t\.speaker === 'A' \? 'Instance A' : 'Instance B \(Mirror\)'/,
    'C2C Self must label the transcript as two identical-model instances');
  assert.doesNotMatch(self, /const label = t\.speaker === 'A' \? 'Nemotron Super' : 'Dolphin Mistral'/,
    'C2C Self must not use the cross-model Dolphin label');
  assert.match(dolphin, /const label = t\.speaker === 'A' \? 'Nemotron Super' : 'Dolphin Mistral'/,
    'C2C Dolphin must retain its two named model participants');
});

test('AI Research is the settled research part of the Artificial Self pool', () => {
  const html = publicMarkup(read('web/ai-research/index.html'));
  assert.match(html, /research archive/i);
  assert.match(html, /Artificial Self is the pool[\s\S]*AI Research is the research part/i);
  assert.doesNotMatch(html, /naming review|\[OPEN\]/i);
  assert.match(html, /council[\s\S]*AI-d kit[\s\S]*TinkerBox/i);
  assert.match(html, /seven pools/i);
  assert.match(html, /rederivation/i);
  assert.doesNotMatch(html, /converge to The Poet|psychometric profiling|The mirror speaks with one voice/);
});

test('Knowledge Ingest copy labels its private repair state without operational disclosure', () => {
  const html = publicMarkup(read('web/upload/index.html'));
  assert.match(html, /private, unlisted, access-gated/i);
  assert.match(html, /repair-needed infrastructure/i);
  assert.match(html, /id="auth-gate"/);
  assert.ok(!/soul-server|<code>\/ingest<\/code>|Qdrant|soul\.blumenkraft|chloe\.blumenkraft/i.test(html), 'public copy must omit operational details');
});

test('project readiness uses verified vocabulary independently of evidence', async () => {
  const { renderProject } = await import('../../web/shared/pool-page.mjs');
  const project = { id: 'test', publicName: 'Test', status: 'Live', readiness: { review: 'verified' }, visibility: { access: 'public', navigation: 'listed' }, evidenceLevel: 'rederivation-required', routeBindings: [{ type: 'local', route: '/test/' }] };
  const verified = renderProject(project);
  assert.doesNotMatch(verified, /readiness review remains pending/i);
  assert.match(verified, /Archive interpretations require rederivation/);
  const pending = renderProject({ ...project, readiness: { review: 'pending' } });
  assert.match(pending, /readiness review remains pending/i);
  assert.match(pending, /href="\/test\/"/);
  const evidencePending = renderProject({ ...project, evidenceLevel: { review: 'pending' } });
  assert.doesNotMatch(evidencePending, /readiness review remains pending/i);
  assert.match(evidencePending, /Evidence review remains pending/);
});

