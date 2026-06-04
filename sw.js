// Finn's Arcade Service Worker
const CACHE = 'finns-arcade-v3';
const BASE = '/finns-arcade/';
const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'apple-catch.html',
  BASE + 'appleman-shooter.html',
  BASE + 'helpy-run.html',
  BASE + 'mangle-shooter.html',
  BASE + 'mr-cupcake-3d.html',
  BASE + 'nightmare-shooter.html',
  BASE + 'puppet-shooter.html',
  BASE + 'leaderboard.js',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .catch(() => caches.match(BASE + 'index.html'))
      )
  );
});
