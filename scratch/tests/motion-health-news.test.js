const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const pages = [
  ['Women’s Health OS', 'web/womens-health-os/index.html', 'health'],
  ['Hyper Trophy OS', 'web/hypertrophyos/index.html', 'muscle'],
  ['Morning News', 'web/morning-news/index.html', 'news'],
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

function readPage(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function compactTokenValue(value) {
  return value.replace(/\s+/g, '').toLowerCase();
}

function localRootTokens(html) {
  const root = html.match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(root, 'page must declare a local :root block');

  return Object.fromEntries(
    [...root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+)\s*;/g)]
      .map(([, name, value]) => [name, value.trim()]),
  );
}

function authoredStyles(html) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map(([, css]) => css.replace(/\/\*[\s\S]*?\*\//g, ''))
    .join('\n');
}

test('health and news pages declare the complete canonical token contract locally', () => {
  for (const [name, relativePath] of pages) {
    const html = readPage(relativePath);
    const tokens = localRootTokens(html);

    for (const [token, expected] of Object.entries(canonicalTokens)) {
      assert.equal(
        compactTokenValue(tokens[token] || ''),
        compactTokenValue(expected),
        `${name} ${token}`,
      );
    }
    assert.doesNotMatch(html, /\bforest-palette\b/, `${name} must not remap the canonical palette`);
  }
});

test('health and news authored CSS routes all timing and easing through shared variables', () => {
  for (const [name, relativePath] of pages) {
    const css = authoredStyles(readPage(relativePath));
    assert.doesNotMatch(
      css,
      /(?:^|[\s:,(])(?:\d*\.)?\d+(?:ms|s)\b/i,
      `${name} contains a raw CSS duration or delay`,
    );
    assert.doesNotMatch(
      css,
      /\bcubic-bezier\s*\(/i,
      `${name} contains a raw cubic-bezier easing`,
    );
  }
});

test('health and news pages retain their thematic shared Three.js integration', () => {
  for (const [name, relativePath, mode] of pages) {
    const html = readPage(relativePath);
    assert.match(html, new RegExp(`data-forest-page=["']${mode}["']`), `${name} theme mode`);
    assert.match(
      html,
      /data-forest-runtime=["']motion["'][^>]+\/web\/shared\/forest-runtime-boot\.mjs\?v=/,
      `${name} prerender-safe shared motion runtime`,
    );
  }
});
