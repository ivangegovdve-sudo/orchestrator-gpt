const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const iconsCss = fs
  .readFileSync(path.join(repoRoot, 'web/shared/forest-icons.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

test('shared icon motion uses design-system duration and easing tokens only', () => {
  const rawTimings = iconsCss.match(/\b(?:\d*\.)?\d+(?:ms|s)\b/gi) || [];
  const rawEasings = iconsCss.match(
    /\b(?:linear|ease|ease-in|ease-out|ease-in-out)\b(?=\s|[,;])/gi,
  ) || [];

  assert.deepEqual(rawTimings, [], `raw timing literals: ${rawTimings.join(', ')}`);
  assert.deepEqual(rawEasings, [], `raw easing values: ${rawEasings.join(', ')}`);
  assert.match(iconsCss, /var\(--duration-loop(?:-(?:fast|slow))?\)/);
  assert.match(iconsCss, /var\(--ease-(?:linear|in-out)\)/);
});

test('reduced-motion guard remains intact around authored icon loops', () => {
  assert.match(
    iconsCss,
    /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*animation:/,
  );
  assert.match(iconsCss, /\.portal-icon svg\[data-icon\]\s*\{\s*animation:\s*none/);
});
