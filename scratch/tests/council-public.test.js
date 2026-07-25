const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'vercel-public');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readBuilt = (relativePath) => {
  const absolutePath = path.join(OUT, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
};

test.before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'build-vercel-static.cjs')], {
    cwd: ROOT,
    stdio: 'pipe',
  });
});

test('the built Council exposes exactly two stateless interactive modes', () => {
  const council = readBuilt('web/council/index.html');

  assert.equal((council.match(/\bdata-council-mode=/g) || []).length, 2);
  assert.equal((council.match(/\bdata-council-workspace=/g) || []).length, 2);
  assert.match(council, /TinyLLM Local Oracle/);
  assert.match(council, /OpenRouter Free/);
  assert.match(council, /No fleet memory/);
  assert.match(council, /No delegation/);
  assert.match(council, /href="#tinylm"/);
  assert.match(council, /href="#openrouter-free"/);
  assert.match(council, /id="tinylm"/);
  assert.match(council, /id="openrouter-free"/);
});

test('the public Council contains no private, key, or access-gate surface', () => {
  const publicCouncil = [
    readBuilt('web/council/index.html'),
    readBuilt('web/council/council.js'),
    readBuilt('web/council/byok/index.html'),
    readBuilt('web/council/inner/index.html'),
    readBuilt('web/council/tinylm/index.html'),
    readBuilt('web/tinylm/index.html'),
  ].join('\n');

  assert.doesNotMatch(
    publicCouncil,
    /Personal Round Table|Inner Council|Private Arena|BYOK|mode=private|access[- ]code|openrouter_api_key|X-BYOK-Key|2142|Chlo[eé](?:'s|\s+(?:Council|memory|fleet|private))/i,
  );
  assert.doesNotMatch(publicCouncil, /<input[^>]+type=["'](?:password|text)["'][^>]*(?:key|code)|<input[^>]+(?:key|code)[^>]+type=["'](?:password|text)["']/i);
  assert.equal(fs.existsSync(path.join(ROOT, 'api/council.js')), false);
  assert.equal(fs.existsSync(path.join(OUT, 'web/council/byok/council.js')), false);
});

test('legacy Council URLs redirect harmlessly to the two integrated anchors', () => {
  const redirects = new Map([
    ['web/tinylm/index.html', '/web/council/index.html#tinylm'],
    ['web/council/tinylm/index.html', '/web/council/index.html#tinylm'],
    ['web/council/byok/index.html', '/web/council/index.html#openrouter-free'],
    ['web/council/inner/index.html', '/web/council/index.html#openrouter-free'],
  ]);

  for (const [relativePath, destination] of redirects) {
    const page = readBuilt(relativePath);
    assert.match(page, /http-equiv="refresh"/i, relativePath);
    assert.ok(page.includes(destination), `${relativePath} does not redirect to ${destination}`);
    assert.doesNotMatch(page, /data-council-mode|<form|<textarea|<input/i, relativePath);
  }
});

test('Council streaming writes text safely and uses only fixed public relays', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'web/council/council.js')), 'missing public Council runtime');
  const runtime = read('web/council/council.js');

  assert.match(runtime, /createTextNode|textContent/);
  assert.doesNotMatch(runtime, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtime, /sessionStorage|localStorage|Authorization|X-BYOK-Key|apiKey/i);
  assert.match(runtime, /https:\/\/chloe\.blumenkraft\.cloud\/tinylm-api/);
  assert.match(runtime, /https:\/\/chloe\.blumenkraft\.cloud\/council\/relay/);
  assert.match(runtime, /:free/);
});

test('AI Research describes and routes directly to the two public Councils', () => {
  const research = readBuilt('web/ai-research/index.html');

  assert.match(research, /Exactly two public modes|Two public modes/i);
  assert.match(research, /TinyLLM Local Oracle/);
  assert.match(research, /OpenRouter Free/);
  assert.match(research, /href="\/web\/council\/index\.html"/);
  assert.doesNotMatch(research, /fleet-grounded|own key|4 modes/i);
});
