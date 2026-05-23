const CACHE_NAME = "cache-gasolina";
const urlsToCache = [
  "./",
  "./index.html",
  "./css/styles.css",
  "../css/leaflet.css",
  "../css/remixicon.css",
  "../css/MarkerCluster.css",
  "../css/MarkerCluster.Default.css",
  "./js/main.js",
  "../js/leaflet.js",
  "../js/leaflet.markercluster.js",
  "./manifest.json",
  "../fonts/remixicon.woff2",
  "../logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Archivos cacheados correctamente");
      return cache.addAll(urlsToCache);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.url.includes("proxy.contacto-granago.workers.dev") ||
    event.request.url.includes("minetur.gob.es")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});
