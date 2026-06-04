// Bondly Service Worker for PWA

const CACHE_NAME = 'bondly-v3';
const urlsToCache = [
    '/Bondly/',
    '/Bondly/index.html',
    '/Bondly/styles.css',
    '/Bondly/app.js',
    '/Bondly/auth.js',
    '/Bondly/friends.js',
    '/Bondly/home.js',
    '/Bondly/messaging.js',
    '/Bondly/notifications.js',
    '/Bondly/notificationCenter.js',
    '/Bondly/profile.js',
    '/Bondly/settings.js',
    '/Bondly/utils.js',
    '/Bondly/firebase.js',
    '/Bondly/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('[Bondly] Service Worker: Installing');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Bondly] Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Bondly] Service Worker: Activating');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Bondly] Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[Bondly] Service Worker: Push received');

    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/favicon.ico',
badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Bondly', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[Bondly] Service Worker: Notification clicked');

    event.notification.close();

    event.waitUntil(
        clients.openWindow('/Bondly/')
    );
});
