const CACHE_NAME = 'segnala-cestini-ve-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/mappa.html',
  '/statistiche.html',
  '/profilo.html',
  '/info.html',
  '/privacy.html',
  '/js/config.js',
  '/css/style.css'
];

// Installa il service worker e mette in cache i file
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Recupera i file dalla cache o dalla rete
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Restituisce il file dalla cache se presente, altrimenti va in rete
        return response || fetch(event.request);
      })
  );
});

// Pulisce le cache vecchie quando si attiva un nuovo service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
