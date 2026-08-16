/* Atlas Observatory PWA shell: cache only the app shell, never stale weather responses. */
const BASE = new URL("./", self.registration.scope).pathname;
const CACHE_NAME = "atlas-observatory-shell-v3";
const APP_SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}robots.txt`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached ?? caches.match(BASE))));
});
