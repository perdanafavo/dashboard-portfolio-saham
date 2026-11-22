// =========================================================================
// Portfolio NAV Tracker — Offline-First Service Worker (GitHub Pages & Vercel)
// Strategy: Network-First with Cache Fallback for local static assets
// =========================================================================

const CACHE_NAME = "portfolio-nav-cache-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icon.svg",
  "./css/tailwind.min.css",
  "./css/styles.css",
  "./js/app.js",
  "./js/nav-engine.js",
  "./js/state.js",
  "./js/storage.js",
  "./js/market.js",
  "./js/charts.js",
  "./js/ui/portfolio.js",
  "./js/ui/dividends.js",
  "./js/ui/mutations.js",
  "./js/ui/analytics.js",
  "./js/ui/journal.js",
  "./js/ui/calculator.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Skip live market quote proxies & Firebase realtime endpoints
  if (
    url.hostname.includes("tradingview.com") ||
    url.hostname.includes("yahoo.com") ||
    url.hostname.includes("allorigins.win") ||
    url.hostname.includes("corsproxy.io") ||
    url.hostname.includes("stooq.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseio.com")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.origin === self.location.origin ||
            url.hostname.includes("jsdelivr.net") ||
            url.hostname.includes("unpkg.com") ||
            url.hostname.includes("fonts.gstatic.com"))
        ) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 504, statusText: "Offline" });
        })
      )
  );
});
