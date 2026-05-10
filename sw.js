// Service Worker — شركة الهنا للنقل
// ملفات المشروع: دائماً من الشبكة (لا كاش)
// مكتبات CDN: كاش (لا تتغير أبداً)
 
const CDN_CACHE = 'hana-cdn-v1';
 
const CDN_URLS = [
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];
 
// تثبيت — كاش مكتبات CDN فقط
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CDN_CACHE)
      .then(c => Promise.allSettled(CDN_URLS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});
 
// تفعيل — احذف أي كاش قديم
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CDN_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});
 
self.addEventListener('fetch', e => {
  const url = e.request.url;
 
  // تجاهل Firebase API — دائماً من الشبكة
  if (url.includes('googleapis.com') ||
      url.includes('firebaseio.com') ||
      url.startsWith('chrome-extension')) return;
 
  // مكتبات CDN — كاش أولاً (لا تتغير)
  if (url.includes('gstatic.com/firebasejs') ||
      url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) caches.open(CDN_CACHE)
            .then(c => c.put(e.request, resp.clone()));
          return resp;
        });
      })
    );
    return;
  }
 
  // ملفات المشروع (js, css, html) — شبكة دائماً بدون كاش
  // أي تحديث على GitHub يظهر فوراً
  e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
});
