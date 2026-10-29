/* Dream Japan Service Worker — v1.0
   Cache-first for shell, stale-while-revalidate for media,
   network-first for API (Firebase). */

const VERSION = 'dj-v1.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const MEDIA_CACHE = `${VERSION}-media`;
const FIREBASE_CACHE = `${VERSION}-firebase`;

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_URLS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip chrome extension etc
  if (!url.protocol.startsWith('http')) return;

  // Firebase / API → network-first, cache fallback
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis.com')) {
    e.respondWith(networkFirst(req, FIREBASE_CACHE));
    return;
  }

  // Images/audio → stale-while-revalidate
  if (/\.(jpg|jpeg|png|webp|gif|svg|mp3|m4a|ogg|wav)$/i.test(url.pathname) ||
      url.hostname.includes('githubusercontent.com')) {
    e.respondWith(staleWhileRevalidate(req, MEDIA_CACHE));
    return;
  }

  // HTML/JS/CSS/manifest → cache-first, fallback to network
  if (/\.(html|js|css|json)$/i.test(url.pathname) || url.pathname === '/') {
    e.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // Default
  e.respondWith(networkFirst(req, SHELL_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const net = await fetch(req);
    if (net.ok) cache.put(req, net.clone());
    return net;
  } catch {
    return hit || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const net = await fetch(req);
    if (net.ok) cache.put(req, net.clone());
    return net;
  } catch {
    const hit = await cache.match(req);
    return hit || new Response(JSON.stringify({ offline: true }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req).then(net => {
    if (net.ok) cache.put(req, net.clone());
    return net;
  }).catch(() => hit);
  return hit || fetchPromise;
}

// Skip waiting message
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
