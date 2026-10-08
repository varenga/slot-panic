// Generado por tools/gen-pages.mjs. No editar a mano.
//
// Offline primero: todo lo que hace falta para jugar se precarga al instalar y
// se sirve de la caché antes que de la red. Lo que no está en PRECACHE (Google
// Analytics, el sitemap) va a la red como si no hubiera service worker.
//
// Los módulos ES no llevan ?v=: es esta caché, una por versión, la que impide
// que un módulo nuevo se mezcle con uno viejo.

const CACHE = 'slotpanic-d8610214';

const PRECACHE = [
  'index.html',
  'en/index.html',
  'pt/index.html',
  'gl/index.html',
  'ca/index.html',
  'it/index.html',
  'fr/index.html',
  'analitica.js',
  'audio.js',
  'circuitos/indice.js',
  'circuitos/nudo.js',
  'circuitos/ocho.js',
  'circuitos/primero.js',
  'circuitos/resbalon.js',
  'coches.js',
  'config.js',
  'constructor.js',
  'dibujo.js',
  'escenarios.js',
  'estado.js',
  'galeria.js',
  'i18n.js',
  'juego.js',
  'lupa.js',
  'luz.js',
  'nucleo/campeonato.js',
  'nucleo/circuito.js',
  'nucleo/cuadricula.js',
  'nucleo/decorado.js',
  'nucleo/geometria.js',
  'nucleo/lienzo.js',
  'nucleo/piezas.js',
  'nucleo/piloto.js',
  'nucleo/slot.js',
  'nucleo/trazo.js',
  'nucleo/validar.js',
  'pantalla.js',
  'particulas.js',
  'publicar.js',
  'publicos.js',
  'vendor/pnyk/red.js',
  'vendor/pnyk/pie.js',
  'vendor/pnyk/consentimiento.js',
  'style.css',
  'favicon.svg',
  'manifest.webmanifest',
  'iconos/icon-192.png',
  'iconos/icon-512.png',
  'iconos/icon-maskable-192.png',
  'iconos/icon-maskable-512.png',
];

// Las rutas de PRECACHE son relativas a la carpeta del service worker, que es la
// raíz del sitio. Así funciona igual en slot.pnyk.es que en local.
const SCOPE = new URL('./', self.location).pathname;
const PROPIOS = new Set(PRECACHE);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' salta la caché HTTP del navegador: sin él, addAll podría
      // guardar un módulo viejo junto a un index.html nuevo, y la mezcla quedaría fijada.
      .then((cache) => cache.addAll(PRECACHE.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves
        .filter((clave) => clave.startsWith('slotpanic-') && clave !== CACHE)
        .map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;

  // '/' y '/en/' son sus index.html. La query se ignora: las páginas piden
  // style.css?v=<hash>, y en esta caché style.css es justo el de ese hash.
  let ruta = url.pathname.slice(SCOPE.length);
  if (ruta === '' || ruta.endsWith('/')) ruta += 'index.html';
  if (!PROPIOS.has(ruta)) return;

  // Siempre esta caché y nunca el `caches` global: mientras conviven dos
  // versiones, el global podría darle a una página vieja un módulo nuevo.
  event.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(ruta))
      .then((guardado) => guardado || fetch(request))
  );
});
