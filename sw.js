// Service Worker — شركة الهنا للنقل v5
const CACHE = 'hana-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/app.css',
  './js/config.js',
  './js/db.js',
  './js/router.js',
  './js/firebase.js',
  './js/app.js',
  './js/pages/dashboard.js',
  './js/pages/sarkis.js',
  './js/pages/journal.js',
  './js/pages/cheques.js',
  './js/pages/statements.js',
  './js/pages/reports.js',
  './js/pages/accounts.js',
  './js/pages/parties.js',
  './js/pages/settings.js',
  './js/pages/expenses.js',
  './js/pages/income.js',
  './js/pages/excel.js',
  './js/pages/stmt-advanced.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(ASSETS.map(u => cache.add(u).catch(()=>{}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Firebase API — always network, skip SW
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com')) return;

  // CDN scripts — cache first
  if (url.includes('gstatic.com') || url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // App files — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() =>
        caches.match(e.request)
          .then(cached => cached || caches.match('./index.html'))
      )
  );
});
