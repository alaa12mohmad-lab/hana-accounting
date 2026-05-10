// Service Worker — شركة الهنا للنقل
const CACHE_NAME = 'hana-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Firebase CDN assets to cache
const FB_CDN = [
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
];

// ── Install: cache app shell ───────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets (ignore failures)
      return Promise.allSettled([
        ...ASSETS.map(url => cache.add(url).catch(() => {})),
        ...FB_CDN.map(url => cache.add(url).catch(() => {})),
      ]);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for Firebase, cache-first for app ─
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase Firestore/Auth calls → always network
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com')) {
    return; // let browser handle
  }

  // Firebase CDN scripts → cache first
  if (url.includes('gstatic.com/firebasejs')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // App shell (HTML, manifest) → cache first, fallback to network
  if (url.includes(self.location.origin) ||
      url.endsWith('index.html') ||
      url.endsWith('manifest.json')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});

// ── Background sync message ────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
