const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const pageStyles = [
  ['VFX portfolio', 'web/vfx-portfolio/vfx.css', 'css'],
  ['Upload', 'web/upload/index.html', 'html'],
  ['Library', 'web/library/index.html', 'html'],
  ['Library RAG', 'web/library/rag.html', 'html'],
  ['Library Glossary', 'web/library/glossary/index.html', 'html'],
  ['Library Platform', 'web/library/platform/index.html', 'html'],
  ['AI Research', 'web/ai-research/index.html', 'html'],
];

const canonicalTokens = {
  '--bg': '#07070b',
  '--surface': '#0f0f15',
  '--border': 'rgba(255,255,255,.08)',
  '--text-primary': '#f3f4f6',
  '--text-muted': '#9ca3af',
  '--accent': '#4f46e5',
  '--accent-green': '#22c55e',
  '--radius': '8px',
  '--font': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

function readStyles(relativePath, kind) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  if (kind === 'css') return source;
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join('\n');
}

function normalize(value) {
  return value.replace(/\s+/g, '').replace(/0?\.08\b/g, '.08').toLowerCase();
}

function declarations(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/([-\w]+)\s*:\s*([^;{}]+)(?=;|})/g)]
    .map((match) => ({ property: match[1], value: match[2].trim() }));
}

test('assigned pages re-assert all canonical public design tokens exactly', () => {
  const failures = [];

  for (const [name, relativePath, kind] of pageStyles) {
    const css = readStyles(relativePath, kind);
    const root = css.match(/:root\s*{([\s\S]*?)}/);
    assert.ok(root, `${name} must have a :root token block`);
    const rootDeclarations = Object.fromEntries(
      declarations(`:root{${root[1]}}`).map(({ property, value }) => [property, value]),
    );

    for (const [token, expected] of Object.entries(canonicalTokens)) {
      const actual = rootDeclarations[token];
      if (!actual || normalize(actual) !== normalize(expected)) {
        failures.push({ page: name, token, expected, actual: actual ?? '[missing]' });
      }
    }
  }

  assert.deepEqual(failures, []);
});

test('assigned page CSS uses shared variables for every authored duration and easing', () => {
  const failures = [];
  const rawTime = /(?:^|[^\w.-])(?:\d*\.)?\d+(?:ms|s)\b/i;
  const rawEase = /cubic-bezier\(|(?:^|[\s,])(?:ease|ease-in|ease-out|ease-in-out|linear)(?=$|[\s,])/i;

  for (const [name, relativePath, kind] of pageStyles) {
    const css = readStyles(relativePath, kind);
    for (const { property, value } of declarations(css)) {
      if (
        !property.startsWith('animation')
        && !property.startsWith('transition')
        && property !== '--sd'
      ) continue;

      if (rawTime.test(value) || rawEase.test(value)) {
        failures.push({ page: name, property, value });
      }
    }
  }

  assert.deepEqual(failures, []);
});
