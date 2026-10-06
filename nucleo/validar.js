/*
 * Slot Panic — ¿cabe este circuito en la mesa?
 *
 * Lo barato de las secciones 1 y 3 del arnés, para que lo use también el
 * juego (el constructor, antes de dejar correr un circuito dibujado): solo
 * geometría, sin correr ninguna carrera. El arnés lo llama para todos los
 * circuitos y escribe sus medidas.
 *
 * - Dos tramos lejanos por la pista (> 300 px de `s`) nunca quedan a menos de
 *   un ancho + 40 px, salvo los dos de un cruce; y la pista cabe en el lienzo.
 * - Ningún punto del muro cae en la zona de otro tramo ni fuera del lienzo, y
 *   en todas partes hay al menos 14 px de grava más allá del piano.
 * - La barra del marcador y el hueco de la portada no pisan lo que se pisa.
 * - Los carriles van por el asfalto, lejos del borde del lienzo, y sus tramos
 *   lejanos a más de 60 px.
 *
 * Devuelve las medidas y la lista de fallos (en español: son para el arnés y
 * para depurar; el jugador ve un aviso traducido).
 */

import { ALTO, ANCHO, ANCHO_COCHE, ANCHO_PISTA, LARGO_COCHE } from '../config.js';
import { enCruce } from './circuito.js';
import { zonasVetadas } from './decorado.js';
import { CARRILES, trazadoCarril } from './slot.js';

const LEJOS = 300;                  // px de pista a partir de los que otro punto es otro tramo
const SEPARACION = ANCHO_PISTA + 40;
const GRAVA_MINIMA = 14;            // px; por dentro de las curvas, medidos a pasos de 1 px
const SEPARACION_CARRILES = 60;
const CERCA = 400;                  // px de eje entre dos tramos a partir de los que ya no se mira más
const CERCA_ZONA = 120;             // px alrededor de la barra y del hueco en que se busca la pista

export function validarCircuito(circuito) {
  const { eje, largo } = circuito;
  const n = eje.length;
  const fallos = [];
  const medidas = {};
  // Los pares de puntos que cuentan como tramos distintos: lejos por la pista y no en un cruce.
  const lejanos = (a, b) => {
    const d = Math.abs(a.s - b.s);
    return Math.min(d, largo - d) >= LEJOS && !enCruce(circuito, a.s, b.s);
  };

  // --- Los tramos y el lienzo
  // De paso, los pares de tramos cercanos: solo en ellos pueden acercarse los carriles.
  let minimo = Infinity;
  const cercanos = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(eje[i].x - eje[j].x, eje[i].y - eje[j].y);
      if (d > CERCA || !lejanos(eje[i], eje[j])) continue;
      minimo = Math.min(minimo, d);
      cercanos.push([i, j]);
    }
  }
  medidas.separacion = minimo;
  if (minimo <= SEPARACION) fallos.push(`dos tramos de pista quedan a ${minimo.toFixed(0)} px (menos de un ancho + 40)`);
  const r = ANCHO_PISTA / 2;
  if (eje.some((p) => p.x - r < 0 || p.y - r < 0 || p.x + r > ANCHO || p.y + r > ALTO)) fallos.push('la pista se sale del lienzo');

  // --- El muro y la grava
  /*
   * El muro de un lado no puede caer en la zona de otro tramo: a menos del
   * muro de un punto del eje lejano, por su lado. (Por dentro de una curva el
   * muro pasa del centro y cae en la zona de la misma curva: eso no es
   * invadir.) Y la grava que hay de verdad más allá de lo que se pisa gratis:
   * se avanza por la normal desde el borde hasta salir de la zona, con la
   * misma regla que la física (`muroCercano`).
   */
  const muroMayor = Math.max(...eje.flatMap((q) => q.muro));
  let invade = 0, fuera = 0, grava = Infinity;
  eje.forEach((p, i) => {
    [-1, 1].forEach((lado, k) => {
      const nx = -Math.sin(p.angulo) * lado, ny = Math.cos(p.angulo) * lado;
      const w = { x: p.x + nx * p.muro[k], y: p.y + ny * p.muro[k] };
      const dentro = eje.some((q) => {
        const dx = w.x - q.x, dy = w.y - q.y;
        if (Math.abs(dx) > muroMayor || Math.abs(dy) > muroMayor || !lejanos(p, q)) return false;
        const ladoQ = -dx * q.sen + dy * q.cos < 0 ? 0 : 1;
        return Math.hypot(dx, dy) < q.muro[ladoQ] - 1;
      });
      if (dentro) invade++;
      if (w.x < 0 || w.y < 0 || w.x > ANCHO || w.y > ALTO) fuera++;
      // Más allá de la menor ya medida no hace falta mirar: no la bajaría.
      let hondo = 0;
      for (let d = p.borde[k] + 1; d <= p.borde[k] + Math.min(30, grava + 1); d += 1) {
        if (circuito.muroCercano({ x: p.x + nx * d, y: p.y + ny * d }, i).fuera >= 0) break;
        hondo = d - p.borde[k];
      }
      grava = Math.min(grava, hondo);
    });
  });
  medidas.grava = grava;
  if (grava < GRAVA_MINIMA) fallos.push(`hay una escapatoria de solo ${grava.toFixed(0)} px`);
  if (invade) fallos.push(`${invade} puntos del muro caen en la zona de otro tramo`);
  if (fuera) fallos.push(`${fuera} puntos del muro se salen del lienzo`);

  // --- Lo que va encima
  /*
   * La barra del marcador (la banda de arriba) y, si lo hay, el hueco de la
   * portada en el interior no pisan el asfalto ni el piano: lo que se conduce
   * no queda nunca debajo de un cartel.
   */
  const [barra, , hueco] = zonasVetadas(circuito);
  for (const [zona, nombre, campo] of [[barra, 'la barra del marcador', 'barra'], [hueco, 'el hueco de la portada', 'hueco']]) {
    if (!zona) continue;
    // Solo cuentan los puntos del eje cerca de la zona: desde el más cercano
    // de ellos, `proyectar` mira solo a su alrededor.
    // Uno de cada 10 basta: la ventana de `proyectar` llega a 40 por cada lado.
    const cerca = [];
    eje.forEach((q, i) => {
      if (q.x < zona.x0 - CERCA_ZONA || q.x > zona.x1 + CERCA_ZONA || q.y < zona.y0 - CERCA_ZONA || q.y > zona.y1 + CERCA_ZONA) return;
      if (!cerca.length || i - cerca[cerca.length - 1] >= 10) cerca.push(i);
    });
    /*
     * Basta con el contorno de la zona: lo que se pisa es una cinta cerrada
     * que no cabe entera dentro, así que si entra en la zona cruza su borde, y
     * si no entra, lo más cerca que queda también está en el borde.
     */
    const contorno = [];
    for (let x = zona.x0; x <= zona.x1; x += 2) contorno.push({ x, y: zona.y0 }, { x, y: zona.y1 });
    for (let y = zona.y0; y <= zona.y1; y += 2) contorno.push({ x: zona.x0, y }, { x: zona.x1, y });
    let holgura = Infinity;
    for (const punto of cerca.length ? contorno : []) {
      let previo = cerca[0];
      for (const i of cerca) {
        if (Math.hypot(eje[i].x - punto.x, eje[i].y - punto.y) < Math.hypot(eje[previo].x - punto.x, eje[previo].y - punto.y)) previo = i;
      }
      const p = circuito.proyectar(punto, previo);
      holgura = Math.min(holgura, p.distancia - circuito.bordeEn(p));
    }
    medidas[campo] = holgura;
    if (holgura <= 0) fallos.push(`${nombre} pisa la pista ${(-holgura).toFixed(0)} px`);
  }

  // --- Los carriles
  const margen = ANCHO_PISTA / 2 - Math.max(...CARRILES.map(Math.abs)) - ANCHO_COCHE / 2;
  if (margen < 4) fallos.push(`un coche en el carril se queda a ${margen} px del borde del asfalto`);
  const trazados = CARRILES.map((l) => trazadoCarril(circuito, l));
  let alBorde = 0, cercania = Infinity;
  for (const trazado of trazados) {
    for (const p of trazado) {
      if (p.x < LARGO_COCHE || p.x > ANCHO - LARGO_COCHE || p.y < LARGO_COCHE || p.y > ALTO - LARGO_COCHE) alBorde++;
    }
  }
  // Cada carril se aparta del eje CARRIL px como mucho: los tramos a más de CERCA no se acercan.
  for (const [i, j] of cercanos) {
    for (const a of trazados) for (const b of trazados) {
      cercania = Math.min(cercania, Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y));
    }
  }
  medidas.carriles = cercania;
  if (alBorde) fallos.push(`${alBorde} puntos de los carriles caen al borde del lienzo`);
  if (cercania <= SEPARACION_CARRILES) fallos.push(`dos tramos lejanos de carril quedan a ${cercania.toFixed(0)} px`);

  return { medidas, fallos };
}
