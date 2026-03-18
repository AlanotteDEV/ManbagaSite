const CACHE_NAME = 'manbaga-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/cookie-banner.js',
  '/manifest.json',
  '/WhatsApp_Image_2026-03-10_at_11.15.27-removebg-preview.png',
  '/fonts/fonts.css'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  /* Solo GET, ignora Firebase/EmailJS/CDN */
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.includes('firestore') || url.includes('firebase') ||
      url.includes('emailjs') || url.includes('googleapis') ||
      url.includes('gstatic')) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var network = fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() { return cached; });
      return cached || network;
    })
  );
});
