// =============================================
// Go Heal — Service Worker
// Developer & Owner: S. Sanjith
// Version: 1.0.0
// =============================================

const CACHE_NAME = 'goheal-v1.0.0';
const ASSETS = [
  './GoHeal.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700&display=swap'
];

// ---- INSTALL: Cache all assets ----
self.addEventListener('install', event => {
  console.log('[GoHeal SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[GoHeal SW] Caching app shell');
      return cache.addAll(ASSETS.filter(url => !url.startsWith('https://fonts')));
    }).then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: Clean old caches ----
self.addEventListener('activate', event => {
  console.log('[GoHeal SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[GoHeal SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: Cache-first strategy ----
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache, then update in background
        const fetchUpdate = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => {});
        return cached;
      }

      // Not cached — try network
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.destination === 'document') {
          return caches.match('./GoHeal.html');
        }
      });
    })
  );
});

// ---- SYNC: Background sync (future use) ----
self.addEventListener('sync', event => {
  if (event.tag === 'goheal-sync') {
    console.log('[GoHeal SW] Background sync triggered');
  }
});

// ---- NOTIFICATION: Push notifications (future use) ----
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Go Heal', body: 'Time for your health check!' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Go Heal', {
      body: data.body || 'Check your daily health tasks!',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'goheal-reminder',
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('./GoHeal.html'));
  }
});

console.log('[GoHeal SW] Service Worker loaded — Go Heal v1.0.0 by S. Sanjith');
