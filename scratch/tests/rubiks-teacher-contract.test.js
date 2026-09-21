const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const page = fs.readFileSync(path.join(ROOT, 'web/rubiks-teacher/index.html'), 'utf8');
const guard = fs.readFileSync(path.join(ROOT, 'web/rubiks-teacher/unread-guard.js'), 'utf8');
const tokens = fs.readFileSync(path.join(ROOT, 'web/rubiks-teacher/forest-overrides.css'), 'utf8');
const bundle = fs.readFileSync(path.join(ROOT, 'web/rubiks-teacher/assets/index-BOLL9lX0.js'), 'utf8');

test('Rubik’s teacher keeps the route and loads the safety shell', () => {
  assert.match(page, /<html lang="en" class="forest-skin">/);
  assert.match(page, /rubiks-teacher\/unread-guard\.js/);
  assert.match(page, /rubiks-teacher\/forest-overrides\.css/);
  assert.match(page, /rubiks-teacher\/manifest\.json/);
  assert.match(page, /rubiks-teacher\/assets\/index-BOLL9lX0\.js/);
});

test('the vision integration has an explicit UNREAD stop state', () => {
  assert.match(bundle, /confidence/);
  assert.match(bundle, /uncertain/);
  assert.match(guard, /UNREAD/);
  assert.match(guard, /still looks/);
  assert.match(guard, /could not be read reliably/);
  assert.match(guard, /confirm\.disabled = !complete/);
  assert.match(guard, /Retake the face or correct every sticker manually/);
  assert.match(guard, /Camera unavailable/);
  assert.match(guard, /CAMERA_START_TIMEOUT_MS/);
});

test('the Rubik’s shell carries the settled SD Forest design tokens', () => {
  for (const token of [
    '--bg: #07070b',
    '--surface: #0f0f15',
    '--border: rgba(255, 255, 255, 0.08)',
    '--text-primary: #f3f4f6',
    '--text-muted: #9ca3af',
    '--accent: #4f46e5',
    '--accent-green: #22c55e',
    '--radius: 8px',
  ]) assert.match(tokens, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(tokens, /mobile-scroll/);
  assert.match(tokens, /overflow: auto !important/);
});
