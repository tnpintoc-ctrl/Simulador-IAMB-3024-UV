// Service Worker — Malla IAMB REXE 3024
// Estrategia: cache-first con actualización en segundo plano (stale-while-revalidate).
// Sube CACHE_VERSION cada vez que publiques cambios importantes en index.html
// para forzar que los usuarios reciban la nueva versión.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `malla-iamb-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

// --- Instalación: precachea el "cascarón" de la app ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// --- Activación: elimina caches de versiones anteriores ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('malla-iamb-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Fetch: cache-first + revalidación en segundo plano ---
// Sirve desde caché al instante (rápido y funciona offline); si hay red,
// actualiza la caché en segundo plano para la próxima visita.
// Esto también cachea recursos de terceros (ej: Tailwind CDN) la primera vez
// que se cargan online, para que sigan disponibles offline después.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // sin red y sin caché de esa URL -> undefined

      return cachedResponse || fetchPromise;
    })
  );
});

// --- Notificaciones push (requiere backend que las envíe, ver README-PWA.md) ---
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Malla IAMB';
  const options = {
    body: data.body || 'Tienes novedades en tu malla curricular.',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html'));
});
