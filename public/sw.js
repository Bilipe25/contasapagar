const CACHE_NAME = 'contas-pagar-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache offline page
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            // Cache offline fallback
            await cache.addAll(['/']);
        })()
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Enable navigation preload if supported
            if ('navigationPreload' in self.registration) {
                await self.registration.navigationPreload.enable();
            }
        })()
    );
    self.clients.claim();
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        (async () => {
            try {
                // Try network first
                const preloadResponse = await event.preloadResponse;
                if (preloadResponse) {
                    return preloadResponse;
                }

                const networkResponse = await fetch(event.request);
                return networkResponse;
            } catch (error) {
                // If network fails, try cache
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                // Return a basic offline response for navigation requests
                if (event.request.mode === 'navigate') {
                    return new Response(
                        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0a0a0a;color:#fff"><div style="text-align:center"><h1>Você está offline</h1><p>Verifique sua conexão com a internet.</p></div></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                }

                throw error;
            }
        })()
    );
});
