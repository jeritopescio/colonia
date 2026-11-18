/* Colonia: primero la red (para tener siempre la última versión), y si no hay señal, lo guardado.
   GitHub Pages manda los archivos con "guardalo 10 minutos": por eso se pide con no-cache (pregunta al servidor si cambió). */
const CACHE = 'colonia-v6';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/config.js', 'js/data.js', 'js/sky.js', 'js/arte-img.js', 'js/arte.js', 'js/sonido.js', 'js/store.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'no-cache' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase y el clima van directo
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
