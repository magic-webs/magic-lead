/// <reference lib="webworker" />

/**
 * Minimal service worker for Magic Lead.
 *
 * Deliberately conservative. This dashboard reads live data over a Convex
 * websocket, so caching responses would show stale leads and stale team
 * counters — worse than showing nothing. We therefore:
 *
 *   - never touch cross-origin requests (Convex lives on another origin),
 *   - never cache anything but same-origin GETs for build assets,
 *   - serve a small offline notice when a navigation fails with no network.
 *
 * The fetch handler also satisfies the browser's installability requirement.
 */

const VERSION = "magic-lead-v1";
const OFFLINE_URL = "/~offline";

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline · Magic Lead</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100svh; display: grid; place-items: center;
    background: #0c0c09; color: #f5f5f0; text-align: center; padding: 24px;
    font: 15px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card { max-width: 22rem; }
  h1 { font-size: 1.125rem; margin: 0 0 .5rem; }
  p { margin: 0 0 1.25rem; color: #a3a39a; }
  button {
    font: inherit; font-weight: 500; cursor: pointer;
    background: #00786f; color: #fff; border: 0;
    border-radius: 10px; padding: .55rem 1.1rem;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>You're offline</h1>
    <p>Magic Lead needs a connection to load leads and team assignments.</p>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.put(
        OFFLINE_URL,
        new Response(OFFLINE_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions so an update never serves stale assets.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Convex, fonts and anything else off-origin are left completely alone.
  if (url.origin !== self.location.origin) return;

  // Navigations: always go to the network, fall back to the offline notice.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(VERSION);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response(OFFLINE_HTML, {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  // Immutable build output is safe to serve cache-first; nothing else is.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const hit = await cache.match(request);
        if (hit) return hit;

        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })()
    );
  }
});
