/**
 * The service worker, served at /sw.js.
 *
 * It does one job: in a browser with no connection, any page you try to
 * open lands on the offline desk instead of the browser's own error page.
 * To do that it keeps a copy of /offline and of the script, style and font
 * files that page needs.
 *
 * It keeps nothing personal. The copy of /offline is fetched without
 * cookies, so it is the signed-out page; the writing itself lives in the
 * outbox (lib/offline/outbox.ts), not here. Requests to /api and anything
 * that is not a plain page load pass straight through.
 *
 * The version changes each time the server starts, which is how a new
 * build replaces the copy a browser is holding.
 */
const VERSION = Date.now().toString(36);

const WORKER = `
const CACHE = "lifeos-offline-${VERSION}";
const DESK = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch(DESK, { credentials: "omit", cache: "no-store" });
    if (!res.ok) throw new Error("offline desk unavailable");
    const html = await res.clone().text();
    await cache.put(DESK, res);
    const files = Array.from(new Set(html.match(/\\/_next\\/static\\/[^"'\\\\\\s)<>]+/g) || []));
    await Promise.all(files.map((url) => cache.add(url).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("lifeos-offline-") && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Built files never change under the same name: keep them, serve the copy.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
      return res;
    })());
    return;
  }

  // A page load: the network first, the desk if there is no network.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (error) {
        const cache = await caches.open(CACHE);
        if (url.pathname === DESK) {
          const desk = await cache.match(DESK);
          if (desk) return desk;
          throw error;
        }
        return Response.redirect(DESK, 302);
      }
    })());
  }
});
`;

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(WORKER, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
