/*
 * Slot Panic — el fantasma de una vuelta.
 *
 * Es el de Race Panic (`nucleo/fantasma.js` de aquel repo): mientras se corre,
 * cada vuelta de cada coche se graba (posición y ángulo cada PASO_FANTASMA
 * segundos de vuelta, interpolados entre pasos de física), y una vuelta
 * grabada se reproduce con su mismo reloj: el coche translúcido está donde
 * estaba el que la hizo a esa altura de la vuelta. Lo graba `slot.js`; el
 * ángulo lleva el coleteo, así que el fantasma derrapa como derrapó, y si se
 * salió, también se sale (y la mano lo devuelve).
 *
 * Sin DOM: lo prueba el arnés, lo guarda `estado.js` y viaja a `api.php` con
 * `codificar()` / `decodificar()`.
 */

import { PASO_FANTASMA } from '../config.js';
import { normalizarAngulo } from './geometria.js';

const VERSION = 1;

/** Una grabación vacía. `anterior` es la pose del paso de física anterior, para interpolar. */
export function crearGrabacion() {
  return { muestras: [], anterior: null };
}

/*
 * Añade las muestras que caen entre el paso anterior y este, interpoladas: la
 * física va a 1/120 s y el fantasma a 1/30, y tomar la pose del primer paso
 * que llega a la muestra la retrasaría. El ángulo se guarda desenrollado (sin
 * saltos de 2π): el trompo de una salida da vueltas enteras.
 */
export function grabar(grabacion, coche, t) {
  const { muestras } = grabacion;
  const ultima = muestras.at(-1);
  const angulo = ultima ? ultima[2] + normalizarAngulo(coche.angulo - ultima[2]) : coche.angulo;
  const ahora = { t, x: coche.x, y: coche.y, angulo };
  const antes = grabacion.anterior || ahora;
  while (muestras.length * PASO_FANTASMA <= t + 1e-9) {
    const tm = muestras.length * PASO_FANTASMA;
    const f = ahora.t > antes.t ? Math.min(1, Math.max(0, (tm - antes.t) / (ahora.t - antes.t))) : 1;
    muestras.push([
      antes.x + (ahora.x - antes.x) * f,
      antes.y + (ahora.y - antes.y) * f,
      antes.angulo + (ahora.angulo - antes.angulo) * f
    ]);
  }
  grabacion.anterior = ahora;
}

/*
 * Cierra la vuelta en `tiempo`: una muestra más, extrapolada con la última
 * velocidad, para que el fantasma no desaparezca la fracción de muestra que
 * le faltaba para cruzar la meta (en Race Panic lo encontró el arnés).
 */
export function cerrar(grabacion, tiempo) {
  const { muestras } = grabacion;
  if (muestras.length >= 2) {
    const a = muestras.at(-2), b = muestras.at(-1);
    muestras.push([2 * b[0] - a[0], 2 * b[1] - a[1], 2 * b[2] - a[2]]);
  }
  return { tiempo, muestras };
}

/**
 * Dónde está el fantasma a `t` segundos de vuelta: `{ x, y, angulo }`, o null
 * si ya ha acabado su vuelta (o no la tiene).
 */
export function posar(fantasma, t) {
  if (!fantasma || t < 0 || t > fantasma.tiempo) return null;
  const { muestras } = fantasma;
  const k = t / PASO_FANTASMA;
  const i = Math.floor(k);
  if (i >= muestras.length - 1) return null;
  const a = muestras[i], b = muestras[i + 1], f = k - i;
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, angulo: a[2] + (b[2] - a[2]) * f };
}

/*
 * Para guardar y enviar: enteros en décimas de píxel y centésimas de radián,
 * en una lista plana. Una vuelta de 9 s son unas 280 muestras: ~4 KB.
 */
export function codificar(fantasma) {
  return JSON.stringify({
    v: VERSION,
    tiempo: Math.round(fantasma.tiempo * 1000) / 1000,
    paso: PASO_FANTASMA,
    d: fantasma.muestras.flatMap(([x, y, a]) => [Math.round(x * 10), Math.round(y * 10), Math.round(a * 100)])
  });
}

/** El inverso de `codificar`. Cualquier cosa rara (otra versión, otro paso) es null. */
export function decodificar(texto) {
  try {
    const datos = typeof texto === 'string' ? JSON.parse(texto) : texto;
    if (!datos || datos.v !== VERSION || datos.paso !== PASO_FANTASMA) return null;
    if (!(datos.tiempo > 0) || !Array.isArray(datos.d) || datos.d.length % 3 !== 0 || datos.d.length < 6) return null;
    const muestras = [];
    for (let i = 0; i < datos.d.length; i += 3) {
      const x = datos.d[i] / 10, y = datos.d[i + 1] / 10, a = datos.d[i + 2] / 100;
      if (![x, y, a].every(Number.isFinite)) return null;
      muestras.push([x, y, a]);
    }
    return { tiempo: datos.tiempo, muestras };
  } catch (error) {
    return null;
  }
}
