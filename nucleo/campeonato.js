/*
 * Slot Panic — el campeonato: los circuitos oficiales, uno detrás de otro.
 *
 * Gana quien gane más carreras. Con las mismas victorias, el menor tiempo
 * sumado de todas. La carrera acaba cuando llega el primero: al otro se le
 * pone el tiempo que habría hecho a su ritmo (lo que le faltaba, a la
 * velocidad media que llevaba).
 *
 * El coche 0 es siempre el J1 (la mitad izquierda) y el 1, el J2 o la CPU:
 * en cada carrera se cambian de carril, no de número. Sin DOM: lo prueba el
 * arnés.
 */

import { VUELTAS_SLOT } from '../config.js';

export function crearCampeonato(circuitos) {
  return { circuitos, carreras: [] };
}

/** El circuito que toca correr, o null si ya se han corrido todos. */
export function circuitoDelCampeonato(campeonato) {
  return campeonato.circuitos[campeonato.carreras.length] || null;
}

export function campeonatoAcabado(campeonato) {
  return campeonato.carreras.length >= campeonato.circuitos.length;
}

/** El tiempo de un coche al acabar la carrera: el suyo, o el que habría hecho a su ritmo. */
export function tiempoFinal(carrera, slot) {
  if (slot.terminado !== null) return slot.terminado;
  const meta = VUELTAS_SLOT * carrera.circuito.largo;
  // Sin haber avanzado (no ha salido, o apenas), no hay ritmo: el doble del ganador.
  if (slot.progreso < meta * 0.05) return carrera.tiempo * 2;
  return carrera.tiempo * meta / slot.progreso;
}

/** Apunta una carrera acabada: su circuito, el ganador, los tiempos y quién llevaba cada coche. */
export function anotarCarrera(campeonato, carrera, humanos) {
  campeonato.carreras.push({
    clave: carrera.circuito.clave,
    ganador: carrera.ganador,
    tiempos: carrera.coches.map((slot) => tiempoFinal(carrera, slot)),
    humanos: [...humanos]
  });
}

/*
 * Cómo va: victorias y tiempo sumado de cada coche, y quién va delante (o
 * null si van empatados del todo). Acabado, el que va delante es el campeón.
 */
export function clasificacion(campeonato) {
  const victorias = [0, 0], tiempos = [0, 0];
  for (const c of campeonato.carreras) {
    victorias[c.ganador]++;
    c.tiempos.forEach((t, i) => { tiempos[i] += t; });
  }
  let delante = null;
  if (victorias[0] !== victorias[1]) delante = victorias[0] > victorias[1] ? 0 : 1;
  else if (tiempos[0] !== tiempos[1]) delante = tiempos[0] < tiempos[1] ? 0 : 1;
  const porTiempo = victorias[0] === victorias[1] && delante !== null;
  return { victorias, tiempos, delante, porTiempo, acabado: campeonatoAcabado(campeonato) };
}
