/**
 * Service Worker: Tensorcade Pyodide Asset Cache.
 *
 * Conforms to docs/QUALITY_BAR.md:
 * - Versioned cache key: tensorcade-pyodide-v314.0.8.
 * - Cache-First strategy for Pyodide binary wasm, stdlib zip, and wheels.
 * - Automatic cache invalidation for older versions on activate.
 */

const CACHE_NAME = 'tensorcade-pyodide-v314.0.8';

self.addEventListener('install', (_event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key.startsWith('tensorcade-pyodide-') && key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Same-origin check to prevent caching external cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Match Pyodide assets: wasm binaries, zip archives, whl packages, pyodide scripts
  const isPyodideAsset =
    url.pathname.includes('/pyodide/') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.whl') ||
    url.pathname.endsWith('.zip') ||
    url.pathname.includes('python_stdlib');

  if (isPyodideAsset && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      }),
    );
  }
});
