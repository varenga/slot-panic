/*
 * Slot Panic — los récords de vuelta online, uno por circuito oficial.
 *
 * Como la galería (publicos.js) y la tabla de Race Panic (marcas.js): api.php
 * es la fuente de verdad, pero el juego nunca la espera. La tabla se pide al
 * llegar a la portada de un oficial y al empezar la carrera; si no llega, la
 * portada y el fin siguen con el récord del dispositivo.
 *
 * No toca el DOM ni dibuja: lo pinta tablaRecords.js.
 */

import { DEPURACION, enApp, SITE_ORIGIN } from './config.js';
import { cocheDe, codificar, decodificar } from './nucleo/fantasma.js';

const otra = DEPURACION ? new URLSearchParams(location.search).get('api') : null;
const API = otra ? new URL('api.php', otra).href : enApp() ? SITE_ORIGIN + 'api.php' : new URL('api.php', import.meta.url).href;
const ESPERA_RED = 6000;   // ms
export const TOP = 10;

/*
 * Por circuito: `lista` es null mientras se carga (y [] si no hay ninguno);
 * `error`, que no ha llegado; `fantasma`, la vuelta del primero, ya leída.
 */
const tablas = {};

export function tablaDe(clave) {
  if (!tablas[clave]) tablas[clave] = { lista: null, error: false, fantasma: null };
  return tablas[clave];
}

const valida = (f) => f && typeof f.alias === 'string' && Number.isInteger(f.vuelta) && (f.carril === 0 || f.carril === 1);

function guardarRespuesta(tabla, datos) {
  // Cada fila, con su coche (el de siempre, si no lo dice).
  tabla.lista = Array.isArray(datos.records) ? datos.records.filter(valida).map((f) => ({ ...f, coche: cocheDe(f.coche) })) : [];
  tabla.fantasma = datos.fantasma ? decodificar(datos.fantasma) : null;
  tabla.error = false;
}

async function pedir(url, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, { ...opciones, signal: AbortSignal.timeout(ESPERA_RED) });
  } catch (error) {
    throw Object.assign(new Error('sin red'), { estado: 0 });
  }
  let datos = null;
  try { datos = await respuesta.json(); } catch (error) { /* PHP sin ejecutar */ }
  if (!respuesta.ok || !datos || typeof datos !== 'object') throw Object.assign(new Error(datos?.error || 'respuesta'), { estado: respuesta.ok ? 0 : respuesta.status });
  return datos;
}

/** Pide la tabla. No hay que esperarla: quien la pinta mira `tablaDe(clave).lista`. */
export async function cargarRecords(clave) {
  const tabla = tablaDe(clave);
  try {
    guardarRespuesta(tabla, await pedir(`${API}?records=${encodeURIComponent(clave)}`));
  } catch (error) {
    if (tabla.lista === null) tabla.lista = [];
    tabla.error = true;
  }
}

/** ¿Entra esta vuelta (en s) en la tabla? Sin tabla (sin red), se intenta igual. */
export function entraEnTabla(clave, vuelta) {
  const { lista, error } = tablaDe(clave);
  if (error || lista === null || lista.length < TOP) return true;
  return Math.round(vuelta * 1000) < lista[TOP - 1].vuelta;
}

/** Envía una vuelta, con su coche. Devuelve el puesto, o lanza (con `estado`: 0 sin red, 429 límite…). */
export async function enviarRecord(clave, alias, { tiempo, carril, coche, muestras }) {
  const datos = await pedir(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accion: 'record', circuito: clave, alias, vuelta: Math.round(tiempo * 1000), carril, coche,
      fantasma: codificar({ tiempo, muestras, coche })
    })
  });
  guardarRespuesta(tablaDe(clave), datos);
  return Number.isInteger(datos.puesto) ? datos.puesto : null;
}
