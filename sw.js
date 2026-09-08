// Offline shell cache. Bump VERSION when files change so clients pick up the new build.
const VERSION = 'unity-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/main.js', './js/ui.js', './js/store.js', './js/program.js', './js/phases.js', './js/engine.js', './js/actions.js', './js/notion.js', './js/timer.js',
  './js/views/train.js', './js/views/checkin.js', './js/views/progress.js', './js/views/more.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Cache first for the shell, then refresh the cache in the background. Never block on the network.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.ok) caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
