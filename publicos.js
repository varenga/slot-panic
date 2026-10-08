/*
 * Slot Panic — los circuitos públicos: la galería y lo que se publica.
 *
 * Es la red de Race Panic (marcas.js): `api.php` es la fuente de verdad, pero
 * el juego nunca la espera. La galería se pide sin bloquear y, si no llega
 * (sin red, o sirviendo en local con Python, que no ejecuta PHP), lo dice y
 * se sigue jugando con lo que haya en el dispositivo.
 *
 * No toca el DOM ni dibuja: lo pinta galeria.js.
 */

import { DEPURACION, enApp, SITE_ORIGIN } from './config.js';

/*
 * Relativa a este módulo, que vive en la raíz (desde /en/ sería /en/api.php,
 * que no existe). En la app, la del sitio: su origen es https://localhost.
 * Sirviendo en local se puede probar contra otra con ?api=<url>.
 */
const otra = DEPURACION ? new URLSearchParams(location.search).get('api') : null;
const API = otra ? new URL('api.php', otra).href : enApp() ? SITE_ORIGIN + 'api.php' : new URL('api.php', import.meta.url).href;
const ESPERA_RED = 6000;   // ms

/*
 * La página de la galería que se ve. `lista` es null mientras se carga;
 * `error`, que no ha llegado. `peticion` descarta las respuestas viejas: si se
 * cambia de página dos veces seguidas, gana la última.
 */
export const galeria = { orden: 'nuevos', pagina: 0, lista: null, mas: false, error: false, peticion: 0 };

/** Un error de la API, con su estado HTTP (0 sin red): quien llama decide qué decir. */
class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

async function pedir(url, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, { ...opciones, signal: AbortSignal.timeout(ESPERA_RED) });
  } catch (error) {
    throw new ErrorApi(0, 'sin red');
  }
  let datos = null;
  try { datos = await respuesta.json(); } catch (error) { /* PHP sin ejecutar, o un 500 en HTML */ }
  if (!respuesta.ok || !datos || typeof datos !== 'object') throw new ErrorApi(respuesta.ok ? 0 : respuesta.status, datos?.error || 'respuesta inesperada');
  return datos;
}

function enviar(cuerpo) {
  return pedir(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
}

/** Lo que no tenga la forma de un circuito de la galería no se pinta. */
function valido(c) {
  return c && Number.isInteger(c.id) && typeof c.codigo === 'string' && typeof c.alias === 'string' &&
    Number.isInteger(c.adjetivo) && Number.isInteger(c.sustantivo) && Number.isInteger(c.jugado);
}

/** Pide una página. No hay que esperarla: quien la pinta mira `galeria.lista`. */
export async function cargarGaleria(orden = galeria.orden, pagina = galeria.pagina) {
  const peticion = ++galeria.peticion;
  Object.assign(galeria, { orden, pagina, lista: null, error: false });
  try {
    const datos = await pedir(`${API}?orden=${orden === 'jugados' ? 'jugados' : 'nuevos'}&pagina=${pagina}`);
    if (peticion !== galeria.peticion) return;
    galeria.lista = Array.isArray(datos.circuitos) ? datos.circuitos.filter(valido) : [];
    galeria.mas = Boolean(datos.mas);
  } catch (error) {
    if (peticion !== galeria.peticion) return;
    galeria.lista = [];
    galeria.mas = false;
    galeria.error = true;
  }
}

/** Publica. Devuelve { id, nuevo } o lanza un ErrorApi (429 límite, 409 retirado, 0 sin red…). */
export async function publicar({ codigo, alias, adjetivo, sustantivo, llave }) {
  const datos = await enviar({ accion: 'publicar', codigo, alias, adjetivo, sustantivo, llave });
  if (!Number.isInteger(datos.id)) throw new ErrorApi(0, 'respuesta inesperada');
  return { id: datos.id, nuevo: Boolean(datos.nuevo) };
}

export function borrarPublicado(id, llave) {
  return enviar({ accion: 'borrar', id, llave });
}

export function denunciar(id) {
  return enviar({ accion: 'denunciar', id });
}

const jugados = new Set();

/** Una jugada por circuito y sesión (el servidor cuenta una por persona y día). Sin esperar. */
export function apuntarJugado(id) {
  if (jugados.has(id)) return;
  jugados.add(id);
  enviar({ accion: 'jugado', id }).catch(() => jugados.delete(id));
}
