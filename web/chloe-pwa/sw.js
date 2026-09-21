/* Chloé PWA — service worker (shell cache for installability) */
const CACHE_PREFIX = 'chloe-pwa-';
const CACHE = CACHE_PREFIX + 'v3';
const SHELL = ['./', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    /* Only our own caches. Cache Storage is origin-wide and sdforest.site now
     * serves a second PWA (web/rubiks-teacher/), so `k !== CACHE` meant this
     * worker deleted Cubeflow's shell every time Chloé activated -- and
     * Cubeflow's worker, which had the same line, deleted this one's. Two
     * workers each deleting "everything that is not mine" never settle; they
     * take turns, and neither app is reliably offline. */
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE)
                      .map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  /* API calls (chat, TTS): always network, never cache */
  if (!url.startsWith(self.location.origin) || url.includes('/api/')) {
    return; /* let browser handle normally */
  }
  /* Shell: cache-first */
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});
