/* ECG en Ruta · funcionamiento sin conexión. Generado por build.py: no editar sw.js en la raíz, sino src/sw.js. */
const BUILD = '__BUILD__';
const CACHE = 'ecgenruta-' + BUILD;
const ASSETS = __ASSETS__;
self.addEventListener('install', (e) => {
  // cache: 'reload' salta la caché HTTP de GitHub Pages (10 min) para no guardar una versión vieja con la huella nueva
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('ecgenruta-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // la app es una sola página: cualquier navegación dentro del ámbito recibe index.html
  const key = req.mode === 'navigate' ? 'index.html' : req;
  // caches.match con cacheName no crea cachés: una versión vieja que aún atiende una petición no resucita su caché borrada
  e.respondWith((async () => {
    const hit = await caches.match(key, { ignoreSearch: true, cacheName: CACHE });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic' && req.mode !== 'navigate' && await caches.has(CACHE)) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) {
      return (req.mode === 'navigate' && await caches.match('index.html', { cacheName: CACHE })) || Response.error();
    }
  })());
});
