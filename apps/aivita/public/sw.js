const CACHE_NAME = 'aivita-v2';
const OFFLINE_URL = '/ru/offline';

const PRECACHE_URLS = [
  '/',
  '/ru',
  OFFLINE_URL,
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
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

const CABINET_ROUTES = ['/home', '/profile', '/habits', '/nutrition', '/chat', '/test', '/family', '/report', '/settings', '/notifications', '/install'];

function isCabinetRoute(pathname) {
  return CABINET_ROUTES.some((r) => {
    const segments = pathname.split('/').filter(Boolean);
    // Strip locale prefix (ru/uz/en) before matching
    const withoutLocale = segments[0] === 'ru' || segments[0] === 'uz' || segments[0] === 'en'
      ? '/' + segments.slice(1).join('/')
      : pathname;
    return withoutLocale === r || withoutLocale.startsWith(r + '/') || withoutLocale.startsWith(r + '?');
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't cache API calls, Next.js internals, or authenticated cabinet routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/v1/') ||
    url.pathname.startsWith('/_next/') ||
    isCabinetRoute(url.pathname)
  ) {
    return;
  }

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
