import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { factsDigest, generatedBlocks, loadInstalledPackageFacts, publishedReleaseManifest, readReleaseManifest, validateReleaseManifest } from '../../scripts/generate-mcp-pages.mjs';

test('catalogue banner distinguishes candidate facts from a version-pinned npm install', async () => {
  const release = await readReleaseManifest();
  const blocks = generatedBlocks(release.facts, 'catalogues', { installedVersion: '0.8.0', source: release.source, channel: 'release_candidate' });
  assert.equal(typeof blocks.banner, 'string', 'the banner must be generated from release and installed package facts');
  assert.match(blocks.banner, /Release candidate/);
  assert.ok(blocks.banner.includes(`data-package-provider-count>${release.facts.providers.length}</span>`));
  assert.ok(blocks.banner.includes(`data-package-tool-count>${release.facts.tools.length}</span>`));
  assert.match(blocks.banner, /Published npm/);
  assert.match(blocks.banner, /npx -y open-dashboard-mcp@0\.8\.0/);
  assert.doesNotMatch(blocks.banner, /same published data/i);
});

test('matching npm version never silently promotes a candidate page while its manifest stays candidate', async () => {
  const release = await readReleaseManifest();
  const blocks = generatedBlocks(release.facts, 'mcp', { installedVersion: release.facts.version, source: release.source, channel: 'release_candidate' });
  assert.match(blocks.hero, /Release candidate/);
  assert.doesNotMatch(blocks.hero, /Published release/);
});

test('published manifest state is accepted with the same immutable source pin and digest', async () => {
  const release = await readReleaseManifest();
  const temporary = await mkdtemp(resolve(tmpdir(), 'mcp-published-manifest-'));
  try {
    await mkdir(resolve(temporary, 'web/open-dashboard'), { recursive: true });
    await writeFile(resolve(temporary, 'web/open-dashboard/package-release.json'), JSON.stringify({ ...release, channel: 'published' }));
    const published = await readReleaseManifest({ siteRoot: temporary });
    assert.equal(published.channel, 'published');
    assert.deepEqual(published.source, release.source);
    assert.deepEqual(published.facts, release.facts);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('promotion fixture uses actual installed artifact facts and changes only the manifest channel', async () => {
  const installedFacts = await loadInstalledPackageFacts();
  const candidate = await readReleaseManifest();
  // This fixture models a source whose facts equal the installed npm artifact.
  // It never writes or promotes the real candidate manifest.
  const fixture = { ...candidate, channel: 'release_candidate', facts: installedFacts, source: { ...candidate.source, factsSha256: factsDigest(installedFacts) } };
  const promoted = publishedReleaseManifest(fixture, installedFacts);
  assert.deepEqual(promoted, { ...fixture, channel: 'published' });
  assert.equal(fixture.channel, 'release_candidate');
  assert.deepEqual(validateReleaseManifest(promoted), promoted);
  const blocks = generatedBlocks(promoted.facts, 'catalogues', { installedVersion: installedFacts.version, source: promoted.source, channel: promoted.channel });
  assert.match(blocks.hero, /published release/);
  assert.match(blocks.banner, /Published release/);
  assert.doesNotMatch(blocks.banner, /Release candidate/);
  assert.ok(blocks.banner.includes(`open-dashboard-mcp@${installedFacts.version}`));
});

test('published promotion rejects wrong version, same-version changed facts and altered source digest', async () => {
  const installedFacts = await loadInstalledPackageFacts();
  const candidate = await readReleaseManifest();
  const fixture = { ...candidate, channel: 'release_candidate', facts: installedFacts, source: { ...candidate.source, factsSha256: factsDigest(installedFacts) } };
  assert.throws(() => publishedReleaseManifest(fixture, { ...installedFacts, version: 'different-version' }), /match the pinned source version/);
  const changed = structuredClone(installedFacts);
  changed.providers[0].displayName += ' changed';
  assert.throws(() => publishedReleaseManifest(fixture, changed), /Installed npm artifact differs/);
  assert.throws(() => publishedReleaseManifest({ ...fixture, source: { ...fixture.source, factsSha256: '0'.repeat(64) } }, installedFacts), /Invalid or altered/);
  assert.throws(() => validateReleaseManifest({ ...fixture, channel: 'assumed_published' }), /Invalid or altered/);
});

test('published page rendering fails if installed npm does not match the declared published version', async () => {
  const release = await readReleaseManifest();
  assert.throws(() => generatedBlocks(release.facts, 'catalogues', { installedVersion: 'different-version', source: release.source, channel: 'published' }), /differs from installed npm/);
});
