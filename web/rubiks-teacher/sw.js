/* Cubeflow (Rubik's Teacher) — service worker.
 *
 * Cache Storage is ORIGIN-WIDE, and sdforest.site serves more than one PWA from
 * it. Everything below that looks over-careful is careful for that reason.
 */

const CACHE_PREFIX = 'cubeflow-cache-';
const CACHE_NAME = CACHE_PREFIX + 'v2';
const SCOPE = '/web/rubiks-teacher/';

/* The stable part of the shell. Hand-maintainable because these names never
 * change; the build-generated ones are handled separately below. */
const SHELL = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'manifest.json',
  SCOPE + 'assets/icons/icon-192x192.png',
  SCOPE + 'assets/icons/icon-512x512.png',
  SCOPE + 'assets/icons/icon-512x512-maskable.png',
  SCOPE + 'assets/icons/apple-touch-icon.png',
];

/* THE ENTRY ASSETS CANNOT BE LISTED HERE, and listing them was the bug.
 *
 * Vite content-hashes them -- today `assets/index-BOLL9lX0.js` and
 * `assets/index-C52SfukJ.css`. Those names change on every rebuild, and
 * `web/rubiks-teacher/assets/` has already been rebuilt four times. A hardcoded
 * hash therefore does not merely go stale, it becomes a permanent 404 that this
 * worker would faithfully try to precache forever.
 *
 * So read them out of the shipped index.html at install time. The list is then
 * correct by construction after every rebuild, with nothing to remember. */
const ASSET_REF = /(?:src|href)="([^"]+\.(?:js|css))"/g;

async function entryAssets() {
  // `cache: 'reload'` so we parse what the server has, not what the HTTP cache
  // kept -- otherwise a stale index.html names assets that no longer exist.
  const res = await fetch(SCOPE + 'index.html', { cache: 'reload' });
  if (!res.ok) throw new Error('index.html returned ' + res.status);

  const html = await res.text();
  const found = new Set();
  let m;
  while ((m = ASSET_REF.exec(html)) !== null) {
    const href = m[1];
    // Same-origin and inside a scope we are entitled to cache. Anything else
    // (a CDN, another product's directory) is not ours to hold.
    if (href.startsWith(SCOPE) || href.startsWith('/web/shared/')) found.add(href);
  }
  if (found.size === 0) throw new Error('no entry assets found in index.html');
  return [...found];
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    /* FAIL CLOSED. The previous version used Promise.allSettled and ignored
     * non-ok responses, so a transient 404 produced an "installed" PWA with an
     * incomplete cache -- an app that reports itself available offline and then
     * opens blank. `addAll` rejects atomically if any single asset fails, which
     * is the behaviour we want: no cache at all is honest, a half cache is not.
     *
     * The cost of failing closed here is one online visit; the cost of failing
     * open is an app that lies about being installed. */
    const assets = [...SHELL, ...(await entryAssets())];
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(assets);

    // Only take over once there is genuinely something to serve.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    /* DELETE ONLY OUR OWN CACHES.
     *
     * The previous version deleted every cache whose name was not ours. Cache
     * Storage is shared across the whole origin, so that removed `chloe-pwa-v3`
     * -- installing or updating Cubeflow silently destroyed Chloé's offline
     * shell, and vice versa once both are present. Two workers each deleting
     * "everything that is not mine" do not settle; they take turns. */
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE) && !url.pathname.startsWith('/web/shared/')) return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const res = await fetch(event.request);
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        // Not awaited: the response should not wait on the write.
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
      }
      return res;
    } catch (err) {
      // Offline and not cached.
      if (event.request.mode === 'navigate') {
        const shell = await caches.match(SCOPE);
        if (shell) return shell;
      }
      /* A 200 carrying the words "Offline content not available" is what the
       * previous version returned for EVERY miss -- including scripts and
       * stylesheets, which the browser then tried to parse as code. An error
       * status is both truthful and what the platform expects. */
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
