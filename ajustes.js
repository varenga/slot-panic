/*
 * Slot Panic — los ajustes de rendimiento: lo que se elige y lo que vale de
 * verdad.
 *
 * Como en Traffic Panic. No sabe del DOM: lo guarda `estado.js`, lo cambia
 * `juego.js` y lo leen los que pintan (`ajuste(id)`), cada uno con un `if`
 * donde ya pintaba. El núcleo no los ve: la carrera es la misma con cualquier
 * ajuste.
 *
 * La calidad manda sobre lo gráfico: en Alta vale lo elegido en cada fila; en
 * Baja, lo más barato de todo; y en Auto, lo elegido hasta que el juego va
 * lento (`vigilar`), y entonces Baja, una vez en la sesión.
 */

import { AUTO_CALIDAD } from './config.js';

/*
 * Las filas del panel RENDIMIENTO, en orden; el primer valor de cada una, el
 * de serie. `grafica`: la que la calidad baja deja al mínimo (su último
 * valor). El sonido no va aquí: es el silencio de `audio.js` (la M), en
 * AJUSTES, que ya se guardaba.
 */
export const OPCIONES = [
  { id: 'calidad', valores: ['auto', 'alta', 'baja'] },
  { id: 'resolucion', valores: ['nitida', 'ligera'], grafica: true },
  { id: 'luces', valores: ['completas', 'simples'], grafica: true },
  { id: 'sombras', valores: [true, false], grafica: true },
  { id: 'efectos', valores: [true, false], grafica: true },
  { id: 'vibracion', valores: [true, false] },
  { id: 'fps', valores: [false, true] }
];

const BAJA = Object.fromEntries(OPCIONES.filter((o) => o.grafica).map((o) => [o.id, o.valores[o.valores.length - 1]]));

const elegidos = Object.fromEntries(OPCIONES.map((o) => [o.id, o.valores[0]]));
let bajada = false;   // si Auto ya ha bajado la calidad en esta sesión
let lento = 0;        // s seguidos (más o menos) yendo lento

/** ¿Va todo al mínimo? Con Baja, o con Auto ya bajada. */
export const calidadBaja = () => elegidos.calidad === 'baja' || (elegidos.calidad === 'auto' && bajada);

/** Lo que vale de verdad el ajuste `id`: lo elegido, o lo de la calidad baja. */
export function ajuste(id) {
  return calidadBaja() && id in BAJA ? BAJA[id] : elegidos[id];
}

/** Lo elegido en la fila `id`, mande o no la calidad. */
export const elegido = (id) => elegidos[id];

/** ¿La manda la calidad? Una fila gráfica con todo al mínimo: el panel la pinta apagada. */
export const mandaLaCalidad = (id) => calidadBaja() && id in BAJA;

/** Si Auto ya ha bajado la calidad (el panel lo dice). */
export const autoBajada = () => elegidos.calidad === 'auto' && bajada;

/** El siguiente valor de la fila `id`. Devuelve lo que hay que guardar. */
export function cambiarAjuste(id) {
  const { valores } = OPCIONES.find((o) => o.id === id);
  elegidos[id] = valores[(valores.indexOf(elegidos[id]) + 1) % valores.length];
  return guardables();
}

/** Lo guardado (de `estado.js`): solo lo que existe y con un valor que vale. */
export function ponerAjustes(guardados) {
  if (!guardados || typeof guardados !== 'object') return;
  for (const o of OPCIONES) if (o.valores.includes(guardados[o.id])) elegidos[o.id] = guardados[o.id];
}

export const guardables = () => ({ ...elegidos });

/*
 * Auto: con el hueco entre fotogramas (`hueco`, ms) por encima de
 * AUTO_CALIDAD.ms durante AUTO_CALIDAD.segundos, baja. `dt` es el del bucle,
 * acotado: un tirón suelto (una pestaña que vuelve, una capa que se hornea)
 * no cuenta más que un fotograma, y uno de más de AUTO_CALIDAD.tope no
 * cuenta. Lo rápido descuenta, así que unos pocos
 * lentos sueltos no bajan. Devuelve true el fotograma en que baja.
 */
export function vigilar(hueco, dt) {
  if (elegidos.calidad !== 'auto' || bajada || hueco > AUTO_CALIDAD.tope) return false;
  lento = hueco > AUTO_CALIDAD.ms ? lento + dt : Math.max(0, lento - dt);
  if (lento <= AUTO_CALIDAD.segundos) return false;
  bajada = true;
  return true;
}

/** Para el arnés: la sesión de nuevo, con lo de serie. */
export function reiniciarAjustes() {
  for (const o of OPCIONES) elegidos[o.id] = o.valores[0];
  bajada = false;
  lento = 0;
}
