/*
 * Slot Panic — la medida del fotograma, para la depuración.
 *
 * Los FPS solo dicen cuántos fotogramas caben en un segundo: a 60 FPS se puede
 * ir sobrado o al límite, y un tirón de vez en cuando se pierde en la media.
 * Aquí se mide, en cada fotograma, lo que tarda nuestro trabajo (actualizar y
 * dibujar: lo que corre en el hilo principal, sin lo que el navegador hace
 * después para componer) y el hueco desde el anterior (el que da el
 * requestAnimationFrame: si pasa de 16,7 ms, se ha perdido un cuadro). Cada
 * segundo se resume en la media y el percentil 95 de cada uno: el peor 5 %.
 *
 * Sin asignaciones por fotograma: las muestras van a un búfer fijo, y solo al
 * resumir, una vez por segundo, se ordenan en otro.
 */

const CAPACIDAD = 512;   // muestras por segundo como mucho (una pantalla de 240 Hz cabe de sobra)

export function crearMedida() {
  return {
    trabajo: new Float64Array(CAPACIDAD),   // ms
    hueco: new Float64Array(CAPACIDAD),     // ms
    orden: new Float64Array(CAPACIDAD),
    n: 0,
    acumulado: 0,                           // s desde el último resumen
    // El último resumen: lo que se pinta.
    fps: 0,
    trabajoMedia: 0, trabajoP95: 0,
    huecoMedia: 0, huecoP95: 0
  };
}

/** Un fotograma: `trabajo` y `hueco` en ms, `dt` en s (el del bucle, acotado). */
export function anotarFotograma(m, trabajo, hueco, dt) {
  if (m.n < CAPACIDAD) {
    m.trabajo[m.n] = trabajo;
    m.hueco[m.n] = hueco;
    m.n++;
  }
  m.acumulado += dt;
  if (m.acumulado >= 1) resumir(m);
}

function resumir(m) {
  m.fps = Math.round(m.n / m.acumulado);
  [m.trabajoMedia, m.trabajoP95] = mediaYP95(m, m.trabajo);
  [m.huecoMedia, m.huecoP95] = mediaYP95(m, m.hueco);
  m.n = 0;
  m.acumulado = 0;
}

function mediaYP95(m, muestras) {
  if (m.n === 0) return [0, 0];
  const orden = m.orden.subarray(0, m.n);
  orden.set(muestras.subarray(0, m.n));
  orden.sort();
  let suma = 0;
  for (let i = 0; i < m.n; i++) suma += orden[i];
  return [suma / m.n, orden[Math.min(m.n - 1, Math.floor(m.n * 0.95))]];
}

/** El resumen en una línea, para el panel de depuración. */
export function textoMedida(m) {
  return `trabajo ${m.trabajoMedia.toFixed(1)} ms (p95 ${m.trabajoP95.toFixed(1)}) · ` +
    `cuadro ${m.huecoMedia.toFixed(1)} ms (p95 ${m.huecoP95.toFixed(1)})`;
}
