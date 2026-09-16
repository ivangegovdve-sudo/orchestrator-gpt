import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../../.github/workflows/mcp-page-truth.yml', import.meta.url), 'utf8');
const trustedCondition = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";
// This workflow deliberately uses ordinary two-space job declarations, without
// YAML aliases, reusable workflows or matrix indirection around the boundary.
function jobs(text) {
  assert.doesNotMatch(text, /^\s*(?:<<:|uses:.*\.github\/workflows)/m);
  const entries = [...text.matchAll(/^  ([a-z][a-z0-9-]*):\s*\r?$/gm)].filter(match => match.index > text.indexOf('\njobs:'));
  return Object.fromEntries(entries.map((match, index) => [match[1], text.slice(match.index, entries[index + 1]?.index ?? text.length)]));
}
function assertPrSecretless(text) {
  assert.doesNotMatch(text.slice(0, text.indexOf('\njobs:')), /\bsecrets\b|MCP_PACKAGE_READ_TOKEN/);
  for (const [id, job] of Object.entries(jobs(text))) {
    const condition = job.match(/^    if: (.+)\r?$/m)?.[1].trim();
    if (id === 'trusted-source-verification' && condition === trustedCondition) continue;
    assert.doesNotMatch(job, /\bsecrets\b|MCP_PACKAGE_READ_TOKEN|^    environment:/m, `${id} can run PR-controlled code and must not request configured secrets or an environment`);
  }
}
function assertTrustedGate(text) {
  assert.doesNotMatch(text, /pull_request_target|workflow_run|secrets: inherit/);
  const job = jobs(text)['trusted-source-verification'];
  assert.ok(job, 'independent source verification must remain an explicit, separate job');
  assert.equal(job.match(/^    if: (.+)\r?$/m)?.[1].trim(), trustedCondition);
  assert.match(job, /^    environment: mcp-source-verification\r?$/m);
  assert.match(job, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(job, /ref: \$\{\{ steps\.package-source\.outputs\.commit \}\}/);
  assert.match(job, /token: \$\{\{ secrets\.MCP_PACKAGE_READ_TOKEN \}\}/);
  assert.match(job, /--check-source --check/);
  assert.match(job, /mcp-page-registry\.test\.mjs/);
  assert.doesNotMatch(job, /continue-on-error|actions\/cache|cache:|(?:download|upload)-artifact|pull_request\.head|ref: main|^    env:/m);
  assert.equal([...job.matchAll(/persist-credentials: false/g)].length, 2);
  assert.equal([...job.matchAll(/\bsecrets\b/g)].length, 2, 'only the presence preflight and checkout may reference the credential');
  assert.match(job, /PACKAGE_READ_ACCESS_CONFIGURED: \$\{\{ secrets\.MCP_PACKAGE_READ_TOKEN != '' \}\}/);
}

test('PR-capable MCP jobs have no configured secret or protected-environment access', () => assertPrSecretless(workflow));
test('independent source verification requires a trusted main event and a separate approval environment', () => assertTrustedGate(workflow));
test('secretless PR checks are explicitly manifest consistency, never substituted source verification', () => {
  const job = jobs(workflow)['generated-manifest-checks'];
  assert.ok(job);
  assert.match(job, /Manifest\/page consistency only/);
  assert.match(job, /Independent private-source verification: NOT RUN/);
  assert.match(job, /npm run check:mcp-pages/);
  assert.match(job, /catalogue-provider-registry\.test\.js/);
  assert.match(job, /mcp-release-promotion\.test\.mjs/);
  assert.doesNotMatch(job, /--check-source|mcp-page-registry\.test\.mjs|MCP_PACKAGE_ROOT/);
});
test('workflow guard rejects leaked PR secrets and removal of the trusted-main or environment boundary', () => {
  const leaked = workflow.replace('  generated-manifest-checks:', '  generated-manifest-checks:\n    env:\n      LEAK: ${{ secrets.MCP_PACKAGE_READ_TOKEN }}');
  assert.throws(() => assertPrSecretless(leaked));
  const globalLeak = workflow.replace('\njobs:', "\nenv:\n  LEAK: ${{ secrets['MCP_PACKAGE_READ_TOKEN'] }}\njobs:");
  assert.throws(() => assertPrSecretless(globalLeak));
  assert.throws(() => assertTrustedGate(workflow.replace(trustedCondition, 'always()')));
  assert.throws(() => assertTrustedGate(workflow.replace('    environment: mcp-source-verification', '    environment: unprotected')));
});
