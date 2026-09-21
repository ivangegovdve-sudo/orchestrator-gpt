/* sdforest.site serves more than one PWA from one origin, and Cache Storage is
 * shared across the whole origin. These tests exist because both service
 * workers independently deleted "every cache that is not mine" on activate,
 * which is only correct while there is exactly one of them.
 *
 * They load the real worker sources into a stubbed ServiceWorkerGlobalScope and
 * drive the install/activate handlers, so they fail if the shipped file changes
 * rather than if a copy of its logic does. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const ORIGIN = 'https://sdforest.site';

/* ------------------------------------------------------------------ harness */

function makeCaches(seed = {}) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, new Map(Object.entries(v))]));

  function open(name) {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name);
    return Promise.resolve({
      put: (req, res) => { entries.set(String(req), res); return Promise.resolve(); },
      /* Real addAll is ATOMIC: one failed request rejects the whole call and
       * nothing is written. The fail-closed test is meaningless without it. */
      addAll: async (urls) => {
        const fetched = [];
        for (const u of urls) {
          const res = await globalThis.fetch(u);
          if (!res.ok) throw new TypeError('Request failed: ' + u);
          fetched.push([u, res]);
        }
        for (const [u, res] of fetched) entries.set(u, res);
      },
    });
  }

  return {
    _store: store,
    open,
    keys: () => Promise.resolve([...store.keys()]),
    delete: (name) => Promise.resolve(store.delete(name)),
    match: (req) => {
      for (const entries of store.values()) {
        const hit = entries.get(String(req));
        if (hit) return Promise.resolve(hit);
      }
      return Promise.resolve(undefined);
    },
  };
}

/** Loads a worker source into a fake global scope and returns its handlers. */
function loadWorker(relPath, { caches, fetchImpl }) {
  const handlers = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (name, fn) => { handlers[name] = fn; },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  // The worker refers to `self` and `caches` as free names, as it does in a
  // real worker. `fetch` is read off globalThis by the harness cache stub too.
  const prevFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    new Function('self', 'caches', 'fetch', src)(self, caches, fetchImpl);
  } finally {
    globalThis.fetch = prevFetch;
  }

  const run = async (name) => {
    let waited;
    const event = { waitUntil: (p) => { waited = p; } };
    handlers[name](event);
    globalThis.fetch = fetchImpl;
    try { await waited; } finally { globalThis.fetch = prevFetch; }
  };
  return { handlers, run };
}

function response(body, ok = true) {
  return { ok, status: ok ? 200 : 404, type: 'basic', text: async () => body, clone: () => response(body, ok) };
}

/** Serves the real files from disk, so a rebuild that renames assets is caught. */
function diskFetch(overrides = {}) {
  return async (url) => {
    const p = String(url);
    if (Object.prototype.hasOwnProperty.call(overrides, p)) return overrides[p];
    const onDisk = path.join(ROOT, p.replace(/^\//, ''));
    if (p.endsWith('/')) return response('<dir>');
    if (fs.existsSync(onDisk)) return response(fs.readFileSync(onDisk, 'utf8'));
    return response('not found', false);
  };
}

/* ------------------------------------------------------------------- tests  */

test('activate deletes only Cubeflow caches and spares the other PWA', async () => {
  const caches = makeCaches({
    'chloe-pwa-v3': { '/web/chloe-pwa/': 'chloe shell' },
    'cubeflow-cache-v1': { '/old': 'stale' },
    'cubeflow-cache-v2': { '/web/rubiks-teacher/': 'current' },
  });
  const { run } = loadWorker('web/rubiks-teacher/sw.js', { caches, fetchImpl: diskFetch() });
  await run('activate');

  const names = [...caches._store.keys()];
  assert.ok(names.includes('chloe-pwa-v3'), 'Chloé PWA cache must survive Cubeflow activating');
  assert.ok(names.includes('cubeflow-cache-v2'), 'the current cache must survive');
  assert.ok(!names.includes('cubeflow-cache-v1'), 'a superseded Cubeflow cache should be cleaned up');
});

test('the other PWA reciprocates: Chloé spares Cubeflow', async () => {
  const caches = makeCaches({
    'chloe-pwa-v3': { '/web/chloe-pwa/': 'shell' },
    'chloe-pwa-v2': { '/old': 'stale' },
    'cubeflow-cache-v2': { '/web/rubiks-teacher/': 'cubeflow shell' },
  });
  const { run } = loadWorker('web/chloe-pwa/sw.js', { caches, fetchImpl: diskFetch() });
  await run('activate');

  const names = [...caches._store.keys()];
  assert.ok(names.includes('cubeflow-cache-v2'), 'Cubeflow cache must survive Chloé activating');
  assert.ok(!names.includes('chloe-pwa-v2'), 'a superseded Chloé cache should be cleaned up');
});

test('install precaches the content-hashed entry assets named by index.html', async () => {
  const caches = makeCaches();
  const { run } = loadWorker('web/rubiks-teacher/sw.js', { caches, fetchImpl: diskFetch() });
  await run('install');

  const cached = [...caches._store.get('cubeflow-cache-v2').keys()];
  const html = fs.readFileSync(path.join(ROOT, 'web/rubiks-teacher/index.html'), 'utf8');
  const entry = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map((m) => m[1])
    .filter((h) => h.startsWith('/web/rubiks-teacher/assets/'));

  assert.ok(entry.length >= 2, 'index.html should reference a JS and a CSS entry asset');
  for (const asset of entry) {
    assert.ok(cached.includes(asset),
      'entry asset must be precached or the first offline launch renders blank: ' + asset);
  }
  assert.ok(cached.includes('/web/rubiks-teacher/manifest.json'));
});

test('install FAILS CLOSED when an asset cannot be fetched', async () => {
  const caches = makeCaches();
  const missing = '/web/rubiks-teacher/assets/icons/icon-512x512.png';
  const { run } = loadWorker('web/rubiks-teacher/sw.js', {
    caches,
    fetchImpl: diskFetch({ [missing]: response('gone', false) }),
  });

  await assert.rejects(run('install'),
    'a failed precache must reject install rather than leave a half-cached "installed" PWA');

  const cache = caches._store.get('cubeflow-cache-v2');
  assert.ok(!cache || cache.size === 0, 'nothing should be written when the precache fails');
});

test('install fails closed when index.html cannot be read', async () => {
  const caches = makeCaches();
  const { run } = loadWorker('web/rubiks-teacher/sw.js', {
    caches,
    fetchImpl: diskFetch({ '/web/rubiks-teacher/index.html': response('gone', false) }),
  });
  await assert.rejects(run('install'),
    'without index.html the entry assets are unknown, so offline support cannot be promised');
});
