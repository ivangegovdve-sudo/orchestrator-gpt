const CACHE_NAME = 'cubeflow-cache-v1';
const ASSETS_TO_CACHE = [
  '/web/rubiks-teacher/',
  '/web/rubiks-teacher/index.html',
  '/web/rubiks-teacher/manifest.json',
  '/web/rubiks-teacher/assets/icons/icon-192x192.png',
  '/web/rubiks-teacher/assets/icons/icon-512x512.png',
  '/web/rubiks-teacher/assets/icons/icon-512x512-maskable.png',
  '/web/rubiks-teacher/assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best effort caching - don't fail if some assets are missing
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            }
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for our scope
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/web/rubiks-teacher/') &&
      !url.pathname.startsWith('/web/shared/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Only cache valid responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for failed network requests when offline
        if (event.request.mode === 'navigate') {
            return caches.match('/web/rubiks-teacher/');
        }
        return new Response('Offline content not available');
      });
    })
  );
});
