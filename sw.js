// Service Worker — شركة الهنا للنقل v5 Multi-file
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

const CDN = [
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        ...ASSETS.map(u => cache.add(u).catch(()=>{})),
        ...CDN.map(u => cache.add(u).catch(()=>{})),
      ])
    ).then(() => self.skipWaiting())
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
  // Firebase API calls — always network
  if(url.includes('firestore.googleapis.com')||
     url.includes('identitytoolkit.googleapis.com')||
     url.includes('securetoken.googleapis.com')) return;
  // CDN — cache first
  if(url.includes('gstatic.com/firebasejs')||url.includes('cdnjs.cloudflare.com')){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{
      caches.open(CACHE).then(cache=>cache.put(e.request,r.clone()));
      return r;
    })));
    return;
  }
  // App files — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(r=>{ caches.open(CACHE).then(c=>c.put(e.request,r.clone())); return r; })
      .catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html')))
  );
});
