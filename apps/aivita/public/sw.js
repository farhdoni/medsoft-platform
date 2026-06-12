const CACHE_NAME = 'aivita-v5';
const STATIC_CACHE = 'aivita-static-v5';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/',
  '/ru/home',
  '/ru/sign-in',
  OFFLINE_URL,
];

// Patterns that get Cache First treatment (static assets, rarely change)
const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\.(woff2?|ttf|eot|otf)(\?.*)?$/i,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore precache errors — some URLs may not exist yet
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ─── Push Notifications (medication reminders) ────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'Aivita 💊', body: 'Время принять лекарство', tag: 'medication', scheduleId: null, time: null };
  try { if (event.data) Object.assign(data, event.data.json()); } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      data: { url: '/ru/medications', scheduleId: data.scheduleId, time: data.time },
      actions: [
        { action: 'take', title: '✅ Принял' },
        { action: 'skip', title: '⏭️ Позже' },
      ],
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const { scheduleId, url, time } = event.notification.data || {};

  event.notification.close();

  if (scheduleId && (action === 'take' || action === 'skip')) {
    const endpoint = action === 'take' ? 'take' : 'skip';
    event.waitUntil(
      fetch(`https://api.aivita.uz/v1/aivita/medications/${scheduleId}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: time || null }),
      }).catch(() => {})
    );
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url || '/ru/medications');
    })
  );
});

// ─── Cabinet routes (cache bypass) ────────────────────────────────────────────

const CABINET_ROUTES = ['/home', '/profile', '/habits', '/medications', '/nutrition', '/chat', '/test', '/family', '/report', '/settings', '/notifications', '/install'];

function isCabinetRoute(pathname) {
  return CABINET_ROUTES.some((r) => {
    const segments = pathname.split('/').filter(Boolean);
    const withoutLocale = segments[0] === 'ru' || segments[0] === 'uz' || segments[0] === 'en'
      ? '/' + segments.slice(1).join('/')
      : pathname;
    return withoutLocale === r || withoutLocale.startsWith(r + '/') || withoutLocale.startsWith(r + '?');
  });
}

function isStaticAsset(url) {
  return STATIC_PATTERNS.some((p) => p.test(url.pathname));
}

// ─── Fetch handler ────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip: non-http(s) schemes (e.g. chrome-extension://) — Cache API rejects them
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Skip: cross-origin requests — only cache same-origin responses
  if (url.origin !== location.origin) return;

  // Skip: API calls, external origins, authenticated cabinet routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/v1/') ||
    isCabinetRoute(url.pathname)
  ) {
    return;
  }

  // Cache First — static assets (JS chunks, CSS, fonts, icons)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // Network First — HTML pages and everything else
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('', { status: 408 });
        })
      )
  );
});
