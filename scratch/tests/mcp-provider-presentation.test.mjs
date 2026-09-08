import test from 'node:test';
import assert from 'node:assert/strict';
import { providerTable, readReleaseManifest } from '../../scripts/generate-mcp-pages.mjs';

test('provider roles come from optional package kinds without provider-name inference', async () => {
  const { facts } = await readReleaseManifest();
  for (const [kind, label] of Object.entries({ aggregator: 'Multi-provider aggregator', media: 'Media generation platform', model_provider: 'Model provider' })) {
    const provider = { ...facts.providers[0], displayName: 'Unrelated example name', providerKind: kind };
    const html = providerTable({ ...facts, providers: [provider] });
    assert.ok(html.includes(`<small data-provider-kind="${kind}">${label}</small>`));
    assert.match(html, /data-package-provider-count>1</);
    assert.doesNotMatch(html, /account-specific prices|authenticated pricing/i);
  }
});

test('an absent provider kind leaves the role unspecified', async () => {
  const { facts } = await readReleaseManifest();
  const provider = { ...facts.providers[0] };
  delete provider.providerKind;
  const html = providerTable({ ...facts, providers: [provider] });
  assert.doesNotMatch(html, /data-provider-kind|Multi-provider aggregator|Media generation platform/);
});

test('an unsupported provider kind fails instead of inventing a role', async () => {
  const { facts } = await readReleaseManifest();
  assert.throws(() => providerTable({ ...facts, providers: [{ ...facts.providers[0], providerKind: 'unverified_kind' }] }), /Unsupported package provider kind/);
});
