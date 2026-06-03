// Finn's Arcade Service Worker - enables offline play
const CACHE = 'finns-arcade-v1';
const ASSETS = [
  './',
  './index.html',
  './apple-catch.html',
  './appleman-shooter.html',
  './helpy-run.html',
  './mangle-shooter.html',
  './mr-cupcake-3d.html',
  './nightmare-shooter.html',
  './puppet-shooter.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
