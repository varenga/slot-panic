// Generado por tools/gen-pages.mjs. No editar a mano.
//
// Offline primero: todo lo que hace falta para jugar se precarga al instalar y
// se sirve de la caché antes que de la red. Lo que no está en PRECACHE (Google
// Analytics, el sitemap) va a la red como si no hubiera service worker.
//
// Los módulos ES no llevan ?v=: es esta caché, una por versión, la que impide
// que un módulo nuevo se mezcle con uno viejo.

const CACHE = 'slotpanic-6bd57fd1';

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
  'circuitos/banera.js',
  'circuitos/diagonal.js',
  'circuitos/ele.js',
  'circuitos/indice.js',
  'circuitos/judia.js',
  'circuitos/nudo.js',
  'circuitos/ocho.js',
  'circuitos/ochoLargo.js',
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
  'idiomas/ca.js',
  'idiomas/en.js',
  'idiomas/es.js',
  'idiomas/fr.js',
  'idiomas/gl.js',
  'idiomas/it.js',
  'idiomas/pt.js',
  'juego.js',
  'lupa.js',
  'luz.js',
  'medida.js',
  'menu.js',
  'nucleo/campeonato.js',
  'nucleo/circuito.js',
  'nucleo/cuadricula.js',
  'nucleo/decorado.js',
  'nucleo/fantasma.js',
  'nucleo/geometria.js',
  'nucleo/lienzo.js',
  'nucleo/mangas.js',
  'nucleo/momentos.js',
  'nucleo/piezas.js',
  'nucleo/piloto.js',
  'nucleo/slot.js',
  'nucleo/trazo.js',
  'nucleo/validar.js',
  'pantalla.js',
  'particulas.js',
  'publicar.js',
  'publicos.js',
  'records.js',
  'repeticion.js',
  'tablaRecords.js',
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

// La huella del contenido de cada fichero de PRECACHE.
const HUELLAS = {
  'index.html':                   '6f59ee15',
  'en/index.html':                '4fa04914',
  'pt/index.html':                '91ca3ba0',
  'gl/index.html':                'ed8ce56a',
  'ca/index.html':                'dace35d1',
  'it/index.html':                '5ac423f0',
  'fr/index.html':                '693c29b4',
  'analitica.js':                 'bccaef26',
  'audio.js':                     '936e65ae',
  'circuitos/banera.js':          '89b3bfc0',
  'circuitos/diagonal.js':        '131faa47',
  'circuitos/ele.js':             'ea63a1ae',
  'circuitos/indice.js':          '0ca5c55d',
  'circuitos/judia.js':           'cd09d0a8',
  'circuitos/nudo.js':            '33ddb5c6',
  'circuitos/ocho.js':            '54adea02',
  'circuitos/ochoLargo.js':       'f2e26f77',
  'circuitos/primero.js':         '936cf9c2',
  'circuitos/resbalon.js':        'cc7c10f6',
  'coches.js':                    '217fd71f',
  'config.js':                    '922a0ae4',
  'constructor.js':               'a4944864',
  'dibujo.js':                    '9aca60dc',
  'escenarios.js':                '448d173f',
  'estado.js':                    '5be7a028',
  'galeria.js':                   '625d65a3',
  'i18n.js':                      '1859ef57',
  'idiomas/ca.js':                'ab4ec14b',
  'idiomas/en.js':                'a472e542',
  'idiomas/es.js':                'b3f9aa53',
  'idiomas/fr.js':                '38352ca1',
  'idiomas/gl.js':                '0345445a',
  'idiomas/it.js':                '70f1a194',
  'idiomas/pt.js':                '7ef5c990',
  'juego.js':                     'e881d9f8',
  'lupa.js':                      '5f4421a7',
  'luz.js':                       'b94332bb',
  'medida.js':                    '03f10cbb',
  'menu.js':                      '0625b4a3',
  'nucleo/campeonato.js':         '5fab5848',
  'nucleo/circuito.js':           'eeff2a68',
  'nucleo/cuadricula.js':         'ae7eca4d',
  'nucleo/decorado.js':           '869552ff',
  'nucleo/fantasma.js':           '2e160b50',
  'nucleo/geometria.js':          '8c5572a4',
  'nucleo/lienzo.js':             'c52e7f9e',
  'nucleo/mangas.js':             '8f1e9a08',
  'nucleo/momentos.js':           '597aa183',
  'nucleo/piezas.js':             '2765d349',
  'nucleo/piloto.js':             '1eed4e6a',
  'nucleo/slot.js':               '960557ce',
  'nucleo/trazo.js':              'baeee985',
  'nucleo/validar.js':            '4a20240f',
  'pantalla.js':                  'dd90158b',
  'particulas.js':                'e00d19aa',
  'publicar.js':                  '3a304ef5',
  'publicos.js':                  '63cec294',
  'records.js':                   'f29f8ad1',
  'repeticion.js':                '080fef0c',
  'tablaRecords.js':              '68277b09',
  'vendor/pnyk/red.js':           '73a46da0',
  'vendor/pnyk/pie.js':           'bc866a2f',
  'vendor/pnyk/consentimiento.js':'df9a1409',
  'style.css':                    'ef982470',
  'favicon.svg':                  '423ea574',
  'manifest.webmanifest':         'ddd3731a',
  'iconos/icon-192.png':          'cc0e9575',
  'iconos/icon-512.png':          'e9c91cf6',
  'iconos/icon-maskable-192.png': '4869011c',
  'iconos/icon-maskable-512.png': '84d281c1',
};

// Las rutas de PRECACHE son relativas a la carpeta del service worker, que es la
// raíz del sitio. Así funciona igual en slot.pnyk.es que en local.
const SCOPE = new URL('./', self.location).pathname;
const PROPIOS = new Set(PRECACHE);

// Cada caché guarda, en esta entrada, las huellas con las que se llenó. Se
// escribe la última: una caché sin ella está a medias y no sirve de origen.
const INDICE = 'slotpanic-huellas';

// Una versión nueva no baja lo que no ha cambiado: lo que tiene la misma huella
// en una caché anterior se copia de allí, y solo lo demás va a la red. La caché
// nueva queda entera y de una sola versión, como si se hubiera bajado todo.
async function llenar(cache) {
  const anteriores = [];
  for (const clave of await caches.keys()) {
    if (!clave.startsWith('slotpanic-') || clave === CACHE) continue;
    const vieja = await caches.open(clave);
    const indice = await vieja.match(INDICE);
    if (indice) anteriores.push({ vieja, huellas: await indice.json() });
  }
  await Promise.all(PRECACHE.map(async (f) => {
    for (const { vieja, huellas } of anteriores) {
      if (huellas[f] !== HUELLAS[f]) continue;
      const guardado = await vieja.match(f);
      if (guardado) return cache.put(f, guardado);
    }
    // cache: 'reload' salta la caché HTTP del navegador: sin él podría guardarse
    // un módulo viejo junto a un index.html nuevo, y la mezcla quedaría fijada.
    const respuesta = await fetch(new Request(f, { cache: 'reload' }));
    if (!respuesta.ok) throw new Error(f + ': ' + respuesta.status);
    return cache.put(f, respuesta);
  }));
  await cache.put(INDICE, new Response(JSON.stringify(HUELLAS)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(llenar)
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
