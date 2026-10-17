const CACHE_NAME = 't-sandbox-v1';
const ASSETS = [
  './',
  './index.html',
  './game.html',
  './char.html',
  './layout.html',
  './manifest.json',
  './version.js',
  './data.js',
  './utils.js',
  './events.js',
  './save.js',
  './audio.js',
  './ui.js',
  './engine.js',
  './charBuilder.js',
  './action.js',
  './ai.js',
  './main.js',
  './spawnmenu.js',
  './spawnmenu.css'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) {
        fetch(e.request).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, res));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request);
    })
  );
});