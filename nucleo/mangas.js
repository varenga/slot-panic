/*
 * Slot Panic — las mangas: una carrera por carril.
 *
 * En la pista de cuatro, un circuito que no sea un ocho tiene carriles de
 * distinto largo: el de fuera de un óvalo da 565 px más por vuelta que el de
 * dentro. Para que sea justo, la carrera se corre en mangas, una por carril:
 * en cada una, cada coche pasa al carril de al lado (el `turno`), y al final
 * todos han corrido por todos. Gana el de menor tiempo sumado.
 *
 * Cada manga acaba cuando llega el primero; a los demás se les pone el tiempo
 * que habrían hecho a su ritmo (`tiempoFinal`, como en el campeonato). Sin DOM:
 * lo prueba el arnés.
 */

import { largoCarril } from './slot.js';
import { tiempoFinal } from './campeonato.js';

/*
 * Lo que tienen que diferir los carriles para pedir mangas: el ocho largo
 * mide lo mismo por los cuatro (0 %); un óvalo, un 15-20 %.
 */
const DESIGUALDAD_MANGAS = 0.02;

/** Cuántas mangas pide un circuito: una por carril si no miden lo mismo; si no, una. */
export function mangasDe(circuito) {
  if (circuito.mangas !== undefined) return circuito.mangas;
  const largos = circuito.carriles.map((l) => largoCarril(circuito, l));
  const desigual = circuito.carriles.length > 2 && Math.max(...largos) / Math.min(...largos) - 1 > DESIGUALDAD_MANGAS;
  // Se calcula una vez: medir los carriles recorre el eje entero.
  circuito.mangas = desigual ? circuito.carriles.length : 1;
  return circuito.mangas;
}

export function crearSerie(total) {
  return { total, mangas: [] };
}

/** Apunta una manga acabada: quién la ganó y el tiempo de cada coche. */
export function anotarManga(serie, carrera) {
  serie.mangas.push({ ganador: carrera.ganador, tiempos: carrera.coches.map((slot) => tiempoFinal(carrera, slot)) });
}

export const serieAcabada = (serie) => serie.mangas.length >= serie.total;

/*
 * Cómo va la serie: el tiempo sumado de cada coche y el orden (el primero, el
 * de menos tiempo). Acabada, el primero la gana.
 */
export function sumaSerie(serie) {
  const n = serie.mangas[0]?.tiempos.length ?? 0;
  const tiempos = Array(n).fill(0);
  for (const m of serie.mangas) m.tiempos.forEach((t, i) => { tiempos[i] += t; });
  const orden = tiempos.map((_, i) => i).sort((a, b) => tiempos[a] - tiempos[b]);
  return { tiempos, orden, ganador: orden[0] ?? null, acabada: serieAcabada(serie) };
}
