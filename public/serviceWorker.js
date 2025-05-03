// Service Worker for Tetris PWA
const CACHE_NAME = 'tetris-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './assets/index-B36bgirl.js',
  './assets/index-Bws2x3JZ.css',
  './manifest.json',
  // Add your image assets, music files, etc.
  './images/background.webp',
  './images/logo.webp',
  './images/main_background.webp',
  './music/music001.mp3',
  './music/music002.mp3',
  './music/music003.mp3',
  './music/clear_line.wav',
  // Add favicon files
  './favicon/android-chrome-192x192.png',
  './favicon/android-chrome-512x512.png',
  './favicon/apple-touch-icon.png',
  './favicon/favicon-16x16.png',
  './favicon/favicon-32x32.png',
  './favicon/favicon-96x96.png',
  './favicon/favicon-144x144.png',
  './favicon/favicon-152x152.png',
  './favicon/favicon-180x180.png',
  './favicon/favicon-192x192.png',
  './favicon/favicon-384x384.png',
  './favicon/favicon-512x512.png',
  './favicon/favicon-72x72.png',
  './favicon/favicon.ico'
];

// Install the service worker and cache assets
self.addEventListener('install', (event) => {
  // Skip waiting forces the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the cached response
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        // Try to fetch the resource from the network
        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            // Open the cache and add the new response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If the fetch fails (offline), return a fallback response if possible
            // For images, you could return a default offline image
            if (event.request.url.match(/\.(jpe?g|png|gif|svg|webp)$/)) {
              return caches.match('./images/background.webp');
            }
            
            // For HTML documents, you could return an offline page
            if (event.request.headers.get('accept') && 
                event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // Otherwise return nothing, which will result in a network error
            // but at least won't crash your app
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Update the cache when new version is available
self.addEventListener('activate', (event) => {
  // Claim control immediately, rather than waiting for reload
  event.waitUntil(self.clients.claim());
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});