/* Colonia: primero la red (para tener siempre la última versión), y si no hay señal, lo guardado.
   GitHub Pages manda los archivos con "guardalo 10 minutos": por eso se pide con no-cache (pregunta al servidor si cambió).
   Las imágenes van aparte: se guardan en el celu y se muestran al instante (Supabase las manda con no-cache,
   así que sin esto se vuelven a pedir cada vez que aparecen en pantalla). */
const CACHE = 'colonia-v49';
const IMGS = 'colonia-img-1'; // fotos y arte: sobreviven a las actualizaciones de la app
const MAX_IMGS = 700;
// Los bordes de crayón se usan en todas las pantallas: quedan guardados desde que se instala la versión.
const BORDES = ['tarjeta', 'boton', 'chip', 'aro'].map((n) => `img/crayon/${n}.png?v=1`).concat('img/mar/fantasma.webp?v=1', 'img/mar/fantasma-frente.webp?v=1', 'img/mar/nube-negra.webp?v=1'); // y el barco fantasma con su nube, para que esté aunque no haya señal
const SHELL = ['./', 'index.html', 'css/app.css', 'js/config.js', 'js/data.js', 'js/sky.js', 'js/arte-img.js', 'js/arte.js', 'js/sonido.js', 'js/inicio.js', 'js/store.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'no-cache' })))),
    caches.open(IMGS).then((c) => Promise.all(BORDES.map((u) => fetch(u).then((r) => r.ok && c.put(new URL(u, self.registration.scope).href, r))))).catch(() => {}),
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== IMGS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Imágenes: las que no cambian nunca (llevan ?v= o son fotos subidas, que tienen nombre único) salen directo de lo guardado;
// las demás (las caras de WhatsApp) se muestran de lo guardado y se actualizan por detrás para la próxima vez.
let puestas = 0;
function recortar() {
  if (++puestas % 25) return;
  caches.open(IMGS).then(async (c) => {
    const ks = await c.keys();
    for (const k of ks.slice(0, Math.max(0, ks.length - MAX_IMGS))) await c.delete(k);
  });
}
async function imagen(e, url, bucket) {
  const c = await caches.open(IMGS);
  const hit = await c.match(e.request.url);
  const fija = url.searchParams.has('v') || url.pathname.includes('/fotos/');
  const red = fetch(bucket ? new Request(e.request.url, { mode: 'cors', credentials: 'omit' }) : e.request)
    .then((r) => { if (r.ok) c.put(e.request.url, r.clone()).then(recortar).catch(() => {}); return r; });
  if (hit) {
    if (!fija) e.waitUntil(red.catch(() => {}));
    return hit;
  }
  return red.catch(() => fetch(e.request));
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const bucket = url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/');
  if (/\.(webp|jpe?g|png|gif)$/i.test(url.pathname) && (bucket || url.origin === location.origin)) {
    e.respondWith(imagen(e, url, bucket));
    return;
  }
  if (url.origin !== location.origin) return; // Supabase (datos) y el clima van directo
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
