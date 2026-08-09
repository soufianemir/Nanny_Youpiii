const CACHE = 'nanny-youpiii-v1';
const ASSETS = ['/', '/index.html', '/styles.css', '/js/app.js', '/js/state.js', '/js/templates.js', '/assets/icon.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(event.request, copy));
    return response;
  }).catch(() => caches.match('/'))));
});