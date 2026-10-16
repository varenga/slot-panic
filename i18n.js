/*
 * Slot Panic — catálogos de idioma y runtime de traducción.
 *
 * Es el i18n.js de Orbit Panic pasado a módulo ES. Ninguna cadena visible se
 * escribe literal en el juego: todas pasan por t(). Se hace desde el primer
 * commit a propósito; reconvertir literales después obliga a repasarlo todo.
 *
 * Cada idioma, su fichero (idiomas/es.js, idiomas/en.js…): se baja solo el
 * que se usa, y otro cuando se cambia. El español es la referencia: toda clave
 * nueva se añade allí primero, y el arnés comprueba que los siete catálogos
 * tengan las mismas claves.
 */

import { GAME_SLUG } from './config.js';

/*
 * Los siete idiomas. `dir` es la carpeta de su página (el español, en la raíz)
 * y `locale` el de Open Graph: los usa el generador (tools/gen-pages.mjs).
 */
export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español', dir: '', locale: 'es_ES' },
  { codigo: 'en', nombre: 'English', dir: 'en/', locale: 'en_US' },
  { codigo: 'pt', nombre: 'Português', dir: 'pt/', locale: 'pt_PT' },
  { codigo: 'gl', nombre: 'Galego', dir: 'gl/', locale: 'gl_ES' },
  { codigo: 'ca', nombre: 'Català', dir: 'ca/', locale: 'ca_ES' },
  { codigo: 'it', nombre: 'Italiano', dir: 'it/', locale: 'it_IT' },
  { codigo: 'fr', nombre: 'Français', dir: 'fr/', locale: 'fr_FR' }
];

const POR_DEFECTO = 'es';
const CLAVE_IDIOMA = GAME_SLUG + '.idioma';

/*
 * Los catálogos ya bajados. El primero se carga antes de que arranque el
 * juego (el await de abajo: quien importa este módulo espera), así que t()
 * sigue siendo síncrona; cambiar de idioma, en cambio, espera a bajar el otro.
 */
const CATALOGOS = {};
let idioma = POR_DEFECTO;

const existe = (codigo) => IDIOMAS.some((l) => l.codigo === codigo);

/** Baja el catálogo de un idioma, una vez. */
export async function cargarCatalogo(codigo) {
  if (!CATALOGOS[codigo]) CATALOGOS[codigo] = (await import(`./idiomas/${codigo}.js`)).default;
  return CATALOGOS[codigo];
}

/** Los siete, para el arnés y el generador de páginas. */
export async function todosLosCatalogos() {
  for (const l of IDIOMAS) await cargarCatalogo(l.codigo);
  return CATALOGOS;
}

/** Sustituye {marcador}; sin la clave, la deja tal cual y avisa (el arnés lo impide). */
export function t(clave, parametros) {
  let texto = CATALOGOS[idioma]?.[clave];
  if (texto === undefined) {
    console.warn('[i18n] clave inexistente:', clave);
    return clave;
  }
  if (parametros) {
    for (const k in parametros) texto = texto.split('{' + k + '}').join(parametros[k]);
  }
  return texto;
}

/*
 * El nombre de un circuito público, de sus dos índices: el adjetivo concuerda
 * con el género del sustantivo, en el orden de cada idioma.
 */
export function nombreCompuesto(adjetivo, sustantivo) {
  const [palabra, genero] = t('nombre.s.' + sustantivo).split('|');
  const [masculino, femenino] = t('nombre.a.' + adjetivo).split('|');
  return t('nombre.formato', { s: palabra, a: genero === 'f' ? femenino : masculino });
}

/** El código del idioma de ahora ('es', 'en'…), sin buscarlo en IDIOMAS. */
export const codigoIdioma = () => idioma;

export function idiomaActual() {
  return IDIOMAS.find((l) => l.codigo === idioma);
}

/*
 * Pasa al idioma siguiente cuando ya está bajado: hasta entonces se sigue en
 * el de antes. Dos toques seguidos no se pisan: gana el último.
 */
let pedido = null;
export async function cambiarIdioma(paso = 1) {
  const desde = pedido ?? idioma;
  const i = IDIOMAS.findIndex((l) => l.codigo === desde);
  const codigo = IDIOMAS[(i + paso + IDIOMAS.length) % IDIOMAS.length].codigo;
  pedido = codigo;
  try {
    await cargarCatalogo(codigo);
  } catch (error) {
    // Sin red y sin service worker: se queda en el que estaba.
    if (pedido === codigo) pedido = null;
    console.warn('[i18n] no se pudo cargar', codigo, error);
    return;
  }
  if (pedido !== codigo) return;
  pedido = null;
  fijarIdioma(codigo, true);
}

function fijarIdioma(codigo, guardar) {
  if (!CATALOGOS[codigo]) return;
  idioma = codigo;
  if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', codigo);
  if (guardar) {
    try { localStorage.setItem(CLAVE_IDIOMA, codigo); } catch (error) { /* modo privado */ }
  }
}

/*
 * Orden: ?lang= en la URL, el de la página (las de /en/, /pt/… lo llevan en
 * `data-idioma`; la raíz no, aunque sea la española), la preferencia
 * guardada, el idioma del navegador y el español. Como en Orbit Panic: quien
 * entra por /en/ juega en inglés, y quien abre la raíz o el juego instalado,
 * en el suyo.
 */
function resolverIdioma() {
  const deUrl = new URLSearchParams(location.search).get('lang');
  if (deUrl && existe(deUrl)) return deUrl;
  const dePagina = document.documentElement.dataset.idioma;
  if (dePagina && existe(dePagina)) return dePagina;
  try {
    const guardado = localStorage.getItem(CLAVE_IDIOMA);
    if (guardado && existe(guardado)) return guardado;
  } catch (error) { /* modo privado */ }
  for (const crudo of navigator.languages || [navigator.language || '']) {
    const codigo = String(crudo).slice(0, 2).toLowerCase();
    if (existe(codigo)) return codigo;
  }
  return POR_DEFECTO;
}

// En Node (el arnés) no hay location ni navigator: se queda en español. Si el
// idioma elegido no baja (sin red), el español.
const inicial = typeof location !== 'undefined' ? resolverIdioma() : POR_DEFECTO;
try {
  await cargarCatalogo(inicial);
} catch (error) {
  console.warn('[i18n] no se pudo cargar', inicial, error);
  if (inicial !== POR_DEFECTO) await cargarCatalogo(POR_DEFECTO);
}
fijarIdioma(CATALOGOS[inicial] ? inicial : POR_DEFECTO, false);
