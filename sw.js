// Finn's Arcade Service Worker
const CACHE = 'finns-arcade-v8';
const BASE = '/finns-arcade/';
const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'leaderboard.html',
  BASE + 'leaderboard.js',
  BASE + 'apple-catch.html',
  BASE + 'appleman-shooter.html',
  BASE + 'helpy-run.html',
  BASE + 'mangle-shooter.html',
  BASE + 'mr-cupcake-3d.html',
  BASE + 'nightmare-shooter.html',
  BASE + 'puppet-shooter.html',
  BASE + 'puppet-box.html',
  BASE + 'fnaf-block-shooter.html',
  BASE + 'freddy-space.html',
  BASE + 'fnaf4-3d.html',
  BASE + 'batman-shooter.html',
  BASE + 'cupcake-hide.html',
  BASE + 'haunted-cupcake.html',
  BASE + 'mangle-dino.html',
  BASE + 'cupcake-vs-nightmare.html',
  BASE + 'foxy-closet.html',
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

// Network-first for HTML & JS (always get latest code, fall back to cache if offline)
// Cache-first for images (they never change)
self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isImage = /\.(png|jpg|jpeg|gif|webp|ico|svg)(\?|$)/i.test(url);

  if (isImage) {
    // Cache-first: images don't change
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }))
    );
  } else {
    // Network-first: always try to get the latest HTML/JS, fall back to cache offline
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)
          .then(cached => cached || caches.match(BASE + 'index.html'))
        )
    );
  }
});
