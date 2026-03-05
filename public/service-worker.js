/**
 * CronosApp — Service Worker v3
 * Estrategia: Network-first con cache fallback para offline.
 * Cachea shell de la app, JS bundle, CSS, fuentes e íconos.
 */

const CACHE_NAME = 'cronosapp-v3';
const STATIC_CACHE = 'cronosapp-static-v3';

// Shell mínimo para funcionar offline
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192x192.svg',
    '/icons/icon-512x512.svg',
    '/icons/apple-touch-icon.svg',
    '/icons/favicon.svg',
];

// ─── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando CronosApp SW v3');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE — Limpiar caches viejos ────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando CronosApp SW v3');
    const allowedCaches = [CACHE_NAME, STATIC_CACHE];
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => !allowedCaches.includes(name))
                    .map((name) => {
                        console.log('[SW] Eliminando cache antiguo:', name);
                        return caches.delete(name);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ─── FETCH — Network-first con cache fallback ────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Ignorar peticiones no GET
    if (request.method !== 'GET') return;

    // Ignorar peticiones a APIs externas (Supabase, analytics, etc.)
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        // Para fuentes de Google, cache-first
        if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
            event.respondWith(cacheFirst(request));
            return;
        }
        // Supabase y demás: no cachear
        return;
    }

    // Navegación (HTML): Network-first con fallback a index.html
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // JS / CSS / SVG / imágenes: Stale-while-revalidate
    if (isAsset(request.url)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Todo lo demás: Network-first
    event.respondWith(networkFirst(request));
});

// ─── Estrategias de cache ─────────────────────────────────

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        return new Response('', { status: 503 });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}

// ─── Helpers ─────────────────────────────────────────────

function isAsset(url) {
    return /\.(js|css|svg|png|jpg|jpeg|gif|woff2?|ttf|eot|ico)(\?|$)/i.test(url);
}

// ─── Push notifications (preparado para futuro) ──────────
self.addEventListener('push', (event) => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'CronosApp', {
            body: data.body || '',
            icon: '/icons/icon-192x192.svg',
            badge: '/icons/icon-96x96.svg',
            vibrate: [200, 100, 200],
            tag: data.tag || 'cronosapp-notification',
            data: { url: data.url || '/' },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            const existing = clients.find((c) => c.url.includes(url));
            if (existing) return existing.focus();
            return self.clients.openWindow(url);
        })
    );
});