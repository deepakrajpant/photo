/* ============================================
   Dream Japan — Service Worker v1
   Strategy: app shell precache + stale-while-revalidate
   ============================================ */

const CACHE_VERSION = 'dj-v1.0.0';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

/* Install — precache app shell */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function(cache) {
        return Promise.all(
          SHELL_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Failed to cache:', url, err);
            });
          })
        );
      })
      .then(function() { return self.skipWaiting(); })
  );
});

/* Activate — clean old caches */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== SHELL_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

/* Fetch — stale-while-revalidate for same-origin, network-first for APIs */
self.addEventListener('fetch', function(event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip Firebase / Google APIs — always network
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    return;
  }

  // Skip non-http(s) requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Same-origin assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(function(cache) {
        return cache.match(req).then(function(cached) {
          const fetchPromise = fetch(req).then(function(res) {
            if (res && res.status === 200) {
              cache.put(req, res.clone());
            }
            return res;
          }).catch(function() { return cached; });

          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Remote assets (GitHub raw, etc.): cache-first with network fallback
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(function(cache) {
      return cache.match(req).then(function(cached) {
        return cached || fetch(req).then(function(res) {
          if (res && res.status === 200) {
            cache.put(req, res.clone());
          }
          return res;
        });
      });
    }).catch(function() {
      return fetch(req);
    })
  );
});

/* Message handler — allow app to trigger skipWaiting */
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
