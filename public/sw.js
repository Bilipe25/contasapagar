const CACHE_NAME = 'contas-pagar-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Simple fetch handler to satisfy PWA requirements
    // In a real app we might want to cache assets
    event.respondWith(
        fetch(event.request).catch(() => {
            // Return a basic offline fallback if network fails
            return new Response('Você está offline. Verifique sua conexão.');
        })
    );
});
