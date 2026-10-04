/*
 * Slot Panic — el generador de las páginas por idioma y de la PWA.
 *
 *     node tools/gen-pages.mjs
 *
 * NO es un paso de compilación del juego: su salida (index.html, en/index.html,
 * pt/…, manifest.webmanifest, service-worker.js, sitemap.xml, robots.txt y
 * llms.txt) está versionada, y el juego se sirve igual sin ejecutar nada. Es lo
 * que impide que las siete páginas diverjan: el texto sale de `i18n.js`, los
 * circuitos de `circuitos/indice.js` y la versión de `pnyk.json`.
 *
 * Es el `tools/gen-pages.js` de Orbit Panic pasado a módulo ES, porque el
 * juego lo es: importa los mismos módulos que carga el navegador.
 *
 * Hay que volver a ejecutarlo tras tocar cualquier fichero del juego, no solo
 * los textos: el service worker lleva el hash de todo lo que precarga, y ese
 * hash es lo que hace que quien ya lo tenía instalado reciba la versión nueva.
 * Regenerar sin cambios no produce diff.
 */

import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALTO, ANCHO, GAME_SLUG, SITE_ORIGIN, VUELTAS_SLOT } from '../config.js';
import { CATALOGOS, IDIOMAS } from '../i18n.js';
import { CIRCUITOS } from '../circuitos/indice.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

// El pie de la red PNYK (vendor/pnyk/, copia de pnyk/comun/): script clásico
// que también se usa desde Node con require.
const { pieRed } = createRequire(import.meta.url)('../vendor/pnyk/pie.js');
const PNYK = JSON.parse(leer('pnyk.json'));

const NOMBRE = 'Slot Panic';
const FONDO = '#12141a';

/*
 * Huella del contenido, para el `?v=` de la hoja de estilos y los iconos y
 * para la versión de la caché del service worker. Se normalizan los CRLF: con
 * core.autocrlf el mismo commit da ficheros distintos en disco según la
 * máquina. Los PNG se miden tal cual.
 */
const TEXTO = /\.(js|mjs|css|svg|html|webmanifest)$/;
const huellas = new Map();
function huella(f) {
  if (!huellas.has(f)) {
    const datos = fs.readFileSync(path.join(RAIZ, f));
    const fuente = TEXTO.test(f) ? datos.toString('utf8').replace(/\r\n/g, '\n') : datos;
    huellas.set(f, crypto.createHash('sha1').update(fuente).digest('hex').slice(0, 8));
  }
  return huellas.get(f);
}

// --- Utilidades ------------------------------------------------------------

function traductor(codigo) {
  return (clave, parametros) => {
    let texto = CATALOGOS[codigo][clave] ?? CATALOGOS.es[clave];
    if (texto === undefined) throw new Error(`clave desconocida: ${clave} (${codigo})`);
    if (parametros) for (const k in parametros) texto = texto.split('{' + k + '}').join(parametros[k]);
    return texto;
  };
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const urlDe = (codigo) => SITE_ORIGIN + IDIOMAS.find((l) => l.codigo === codigo).dir;

/*
 * La política de privacidad es la común de pnyk.es, sección «Juegos de PNYK»
 * (convenciones PNYK; `privacy` en la ficha de pnyk/proyectos.js). Solo hay
 * castellano e inglés: los demás idiomas van a la inglesa.
 */
const privacidadDe = (codigo) => codigo === 'es'
  ? 'https://pnyk.es/privacidad/#juegos'
  : 'https://pnyk.es/en/privacy/#games';

// --- Los módulos del juego --------------------------------------------------

/*
 * Todo lo que el navegador carga para jugar, siguiendo los `import` desde
 * juego.js: así la lista que precarga el service worker (y que empaqueta la
 * app) no puede olvidarse de un módulo nuevo. Solo imports estáticos y
 * relativos, que es lo único que usa el juego.
 */
function modulos(entrada) {
  const vistos = new Set();
  const pendientes = [entrada];
  while (pendientes.length) {
    const f = pendientes.pop();
    if (vistos.has(f)) continue;
    vistos.add(f);
    const fuente = leer(f);
    for (const [, ruta] of fuente.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      pendientes.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), ruta)));
    }
    for (const [, ruta] of fuente.matchAll(/^\s*import\s+['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      pendientes.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), ruta)));
    }
  }
  return [...vistos].sort();
}

// Los scripts clásicos que index.html carga antes del juego (vendor/pnyk/).
const CLASICOS = ['vendor/pnyk/red.js', 'vendor/pnyk/pie.js', 'vendor/pnyk/consentimiento.js'];

// Iconos del manifest, generados por tools/gen-icons.mjs desde favicon.svg.
const ICONOS = [
  { src: 'iconos/icon-192.png', sizes: '192x192' },
  { src: 'iconos/icon-512.png', sizes: '512x512' },
  { src: 'iconos/icon-maskable-192.png', sizes: '192x192', purpose: 'maskable' },
  { src: 'iconos/icon-maskable-512.png', sizes: '512x512', purpose: 'maskable' }
];

// --- La página de cada idioma -------------------------------------------------

function pagina(codigo) {
  const t = traductor(codigo);
  const idioma = IDIOMAS.find((l) => l.codigo === codigo);
  const url = urlDe(codigo);
  const base = idioma.dir ? '../' : './';
  const versionado = (f) => `${base}${f}?v=${huella(f)}`;

  // hreflang: la lista completa en todas las páginas, más x-default a la raíz.
  const alternativas = IDIOMAS
    .map((l) => `  <link rel="alternate" hreflang="${l.codigo}" href="${urlDe(l.codigo)}">`)
    .join('\n') + `\n  <link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}">`;
  const ogAlternativas = IDIOMAS.filter((l) => l.codigo !== codigo)
    .map((l) => `  <meta property="og:locale:alternate" content="${l.locale}">`).join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: NOMBRE,
    url,
    description: t('seo.description'),
    inLanguage: codigo,
    availableLanguage: IDIOMAS.map((l) => l.codigo),
    genre: ['Arcade', 'Racing', 'Top-down'],
    gamePlatform: ['Web browser', 'Mobile'],
    applicationCategory: 'Game',
    operatingSystem: 'Any (HTML5 browser)',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2 },
    isAccessibleForFree: true,
    image: SITE_ORIGIN + 'iconos/icon-512.png',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
    workTranslation: IDIOMAS.filter((l) => l.codigo !== codigo).map((l) => ({
      '@type': 'VideoGame', name: NOMBRE, url: urlDe(l.codigo), inLanguage: l.codigo,
      description: CATALOGOS[l.codigo]['seo.description']
    }))
  }, null, 2).split('\n').map((l) => '    ' + l).join('\n');

  // Enlaces relativos entre idiomas: así funcionan también en local y en la app.
  const idiomas = IDIOMAS.map((l) => {
    const href = (base + l.dir) || './';
    return `        <li><a href="${href}" hreflang="${l.codigo}" lang="${l.codigo}"` +
      `${l.codigo === codigo ? ' aria-current="page"' : ''}>${esc(l.nombre)}</a></li>`;
  }).join('\n');

  const circuitos = CIRCUITOS.map((c) =>
    `      <li><b>${esc(t('circuito.' + c.clave))}</b> — ${esc(t('page.circ.' + c.clave))}</li>`).join('\n');

  return `<!DOCTYPE html>
<!-- Generado por tools/gen-pages.mjs a partir de i18n.js. No editar a mano. -->
<html lang="${codigo}" data-base="${base}"${idioma.dir ? ` data-idioma="${codigo}"` : ''}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${esc(t('seo.title'))}</title>
  <meta name="description" content="${esc(t('seo.description'))}">
  <meta name="pnyk-version" content="${esc(PNYK.version)}">
  <meta name="keywords" content="${esc(t('seo.keywords'))}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="${FONDO}">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="${url}">

${alternativas}

  <meta property="og:locale" content="${idioma.locale}">
${ogAlternativas}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${NOMBRE}">
  <meta property="og:title" content="${esc(t('seo.title'))}">
  <meta property="og:description" content="${esc(t('seo.ogDesc'))}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE_ORIGIN}iconos/icon-512.png">

  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(t('seo.title'))}">
  <meta name="twitter:description" content="${esc(t('seo.ogDesc'))}">
  <meta name="twitter:image" content="${SITE_ORIGIN}iconos/icon-512.png">

  <link rel="icon" type="image/svg+xml" href="${versionado('favicon.svg')}">
  <link rel="apple-touch-icon" href="${versionado('iconos/icon-192.png')}">
  <link rel="manifest" href="${base}manifest.webmanifest">
  <link rel="stylesheet" href="${versionado('style.css')}">

  <script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body>
  <main id="escena">
    <canvas id="lienzo" width="${ANCHO}" height="${ALTO}"></canvas>
    <p id="gira"></p>
  </main>

  <!-- Prosa bajo el lienzo: un canvas es opaco para los buscadores, así que lo
       único que pueden leer del juego es esto. En la app no se muestra. -->
  <article class="info">
    <h1>${esc(t('page.h1'))}</h1>
    <p>${esc(t('page.intro'))}</p>

    <h2>${esc(t('page.howTitle'))}</h2>
    <ul>
      <li>${esc(t('page.how1'))}</li>
      <li>${esc(t('page.how2'))}</li>
      <li>${esc(t('page.how3'))}</li>
      <li>${esc(t('page.how4', { vueltas: VUELTAS_SLOT }))}</li>
    </ul>

    <h2>${esc(t('page.controlsTitle'))}</h2>
    <table>
      <thead><tr><th>${esc(t('page.colWho'))}</th><th>${esc(t('page.colKeys'))}</th><th>${esc(t('page.colTouch'))}</th></tr></thead>
      <tbody>
        <tr><td>${esc(t('page.p1'))}</td><td><kbd>W</kbd> <kbd>A</kbd> <kbd>⇧</kbd> <kbd>␣</kbd></td><td>${esc(t('page.touchLeft'))}</td></tr>
        <tr><td>${esc(t('page.p2'))}</td><td><kbd>↑</kbd> <kbd>L</kbd> <kbd>⇧</kbd> <kbd>0</kbd></td><td>${esc(t('page.touchRight'))}</td></tr>
      </tbody>
    </table>
    <p>${esc(t('page.keysMore'))}</p>

    <h2>${esc(t('page.circuitsTitle'))}</h2>
    <ul>
${circuitos}
    </ul>

    <h2>${esc(t('page.langTitle'))}</h2>
    <nav aria-label="${esc(t('page.langTitle'))}">
      <ul class="idiomas">
${idiomas}
      </ul>
    </nav>

    <p class="legal">${NOMBRE} ${esc(PNYK.version)} · <a href="${privacidadDe(codigo)}">${esc(t('page.privacy'))}</a></p>
  </article>

  <!-- Pie discreto bajo el circuito: enlaces a la familia Panic (los pone juego.js con
       pieRed() de vendor/pnyk/) y el botón que reabre el aviso de cookies común. -->
  <footer id="pie">
    <p id="otros">${esc(t('pie.otros'))} ${pieRed({ slug: PNYK.slug })}</p>
    <button type="button" id="cookies" data-pnyk-cookies>Cookies</button>
  </footer>
  <script src="${base}vendor/pnyk/red.js"></script>
  <script src="${base}vendor/pnyk/pie.js"></script>
  <!-- Aviso de cookies común de PNYK: GA4 solo si el jugador acepta (analitica.js lo inicia). -->
  <script src="${base}vendor/pnyk/consentimiento.js"></script>
  <script type="module" src="${base}juego.js"></script>
</body>
</html>
`;
}

// --- PWA ---------------------------------------------------------------------

/*
 * Un solo manifest para las siete páginas, en la raíz. Arranca en la raíz y no
 * en la subcarpeta desde la que se instaló: ahí el idioma sale de la
 * preferencia guardada o del teléfono, como en la app de las tiendas. El `id`
 * fijo hace que instalar desde /en/ o desde / sea la misma aplicación. En
 * horizontal: el lienzo es 16:9.
 */
function manifest() {
  return JSON.stringify({
    id: '/',
    name: NOMBRE,
    short_name: NOMBRE,
    description: CATALOGOS.es['seo.ogDesc'],
    lang: 'es',
    dir: 'ltr',
    start_url: './',
    scope: './',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: FONDO,
    theme_color: FONDO,
    categories: ['games'],
    icons: ICONOS.map((i) => ({
      src: `${i.src}?v=${huella(i.src)}`, sizes: i.sizes, type: 'image/png', ...(i.purpose ? { purpose: i.purpose } : {})
    }))
  }, null, 2) + '\n';
}

/*
 * Lo que el service worker precarga para jugar sin red. Es además, tal cual,
 * lo que empaqueta la app de las tiendas: app/sync.sh lo lee con un sed y no
 * hay una segunda lista (APP.md §4.1). Por eso el formato es un contrato
 * —literal `const PRECACHE = [`, una ruta por línea entre comillas simples,
 * relativa a la raíz y sin ?v=, y `];` en la columna 0— y no se toca sin tocar
 * sync.sh.
 */
const PRECACHE = [
  ...IDIOMAS.map((l) => l.dir + 'index.html'),
  ...modulos('juego.js'),
  ...CLASICOS,
  'style.css',
  'favicon.svg',
  'manifest.webmanifest',
  ...ICONOS.map((i) => i.src)
];

/*
 * La versión de la caché es la huella de todo lo que precarga: cualquier
 * cambio en un módulo cambia el service worker, el navegador lo detecta y se
 * reinstala. Se calcula después de escribir las páginas y el manifest.
 */
function serviceWorker() {
  const version = crypto.createHash('sha1')
    .update(PRECACHE.map((f) => f + ' ' + huella(f)).join('\n'))
    .digest('hex').slice(0, 8);

  return `// Generado por tools/gen-pages.mjs. No editar a mano.
//
// Offline primero: todo lo que hace falta para jugar se precarga al instalar y
// se sirve de la caché antes que de la red. Lo que no está en PRECACHE (Google
// Analytics, el sitemap) va a la red como si no hubiera service worker.
//
// Los módulos ES no llevan ?v=: es esta caché, una por versión, la que impide
// que un módulo nuevo se mezcle con uno viejo.

const CACHE = '${GAME_SLUG}-${version}';

const PRECACHE = [
${PRECACHE.map((f) => `  '${f}',`).join('\n')}
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
        .filter((clave) => clave.startsWith('${GAME_SLUG}-') && clave !== CACHE)
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

  // Siempre esta caché y nunca el \`caches\` global: mientras conviven dos
  // versiones, el global podría darle a una página vieja un módulo nuevo.
  event.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(ruta))
      .then((guardado) => guardado || fetch(request))
  );
});
`;
}

// --- Sitemap, robots y llms.txt ----------------------------------------------

// La fecha del último commit, para que regenerar sin cambios no produzca diff.
function ultimoCommit() {
  try {
    return execSync('git log -1 --format=%cs', { cwd: RAIZ }).toString().trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function sitemap() {
  const fecha = ultimoCommit();
  const urls = IDIOMAS.map((l) => {
    const alternativas = IDIOMAS
      .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.codigo}" href="${urlDe(a.codigo)}"/>`).join('\n');
    return `  <url>
    <loc>${urlDe(l.codigo)}</loc>
    <lastmod>${fecha}</lastmod>
    <changefreq>monthly</changefreq>
${alternativas}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}"/>
  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

const robots = () => `User-agent: *
Allow: /
Disallow: /tools/
Disallow: /app/

Sitemap: ${SITE_ORIGIN}sitemap.xml
`;

function llms() {
  const lineas = IDIOMAS.map((l) =>
    `- [${l.nombre} (${l.codigo})](${urlDe(l.codigo)}): ${CATALOGOS[l.codigo]['seo.description']}`).join('\n');
  const circuitos = CIRCUITOS.map((c) =>
    `- ${CATALOGOS.es['circuito.' + c.clave]}: ${CATALOGOS.es['page.circ.' + c.clave]}`).join('\n');
  return `# ${NOMBRE}

> ${CATALOGOS.es['seo.description']}

${NOMBRE} es un juego de carreras de slot (coches enganchados a un carril) con vista
cenital, jugable gratis en el navegador (HTML5 Canvas y JavaScript, sin instalación)
y también instalable como app. Un solo control: apretar acelera y soltar frena. Uno
contra la CPU o dos jugadores en la misma pantalla (cada uno su mitad en el móvil),
${VUELTAS_SLOT} vueltas por carrera. Está en siete idiomas, cada uno con su URL:

${lineas}

## Circuitos
${circuitos}

## Notas
- Pasado el agarre el coche derrapa; si insiste, se sale y una mano lo devuelve al
  carril donde se salió: salirse cuesta tiempo, no la carrera.
- En las piezas en X los carriles se cruzan y los coches cambian de carril; en una X
  o un cruce, dos coches que llegan a la vez chocan.
- Política de privacidad: la común de PNYK, ${privacidadDe('es')}
- De la familia Panic de PNYK: https://pnyk.es/
`;
}

// --- Escritura -----------------------------------------------------------------

const escritos = [];
function escribir(rel, contenido) {
  const abs = path.join(RAIZ, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenido, 'utf8');
  huellas.delete(rel);
  escritos.push(rel);
}

for (const f of PRECACHE) {
  if (!f.endsWith('index.html') && f !== 'manifest.webmanifest' && !fs.existsSync(path.join(RAIZ, f))) {
    throw new Error(`falta ${f}, que está en PRECACHE` + (f.startsWith('iconos/') ? ' (node tools/gen-icons.mjs)' : ''));
  }
}
for (const l of IDIOMAS) escribir(l.dir + 'index.html', pagina(l.codigo));
escribir('manifest.webmanifest', manifest());
escribir('service-worker.js', serviceWorker());   // el último de la PWA: mide lo anterior
escribir('sitemap.xml', sitemap());
escribir('robots.txt', robots());
escribir('llms.txt', llms());

console.log(`Generado (${PRECACHE.length} ficheros en PRECACHE):\n  ` + escritos.join('\n  '));
