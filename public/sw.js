// Service worker minimale: necessario per i criteri di installabilita' PWA.
// Intenzionalmente NON mette in cache pagine HTML/dati dinamici (tornei, auth, server
// actions): mette in cache solo asset statici immutabili (_next/static, icone).
const CACHE_NAME = "padel-torneo-static-v1";
const STATIC_PATTERNS = [/^\/_next\/static\//, /^\/pwa-icon-/, /^\/icon$/, /^\/apple-icon$/];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // mai intercettare POST (server actions, login, ecc.)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!STATIC_PATTERNS.some((pattern) => pattern.test(url.pathname))) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
