/*
 * Slot Panic — el estado mutable de la partida.
 *
 * Vive en su propio módulo, como en Rail Panic, para que el dibujo y la
 * pantalla lo lean sin depender del bucle. Se exporta un objeto que se muta;
 * nunca se reasigna la variable `estado`.
 */

import { GAME_SLUG } from './config.js';
import { ORDEN_ESCENARIOS } from './escenarios.js';

/** El escenario elegido es una preferencia, como el idioma: se recuerda. */
export function leerEscenario() {
  try {
    const guardado = localStorage.getItem(`${GAME_SLUG}.escenario`);
    return ORDEN_ESCENARIOS.includes(guardado) ? guardado : ORDEN_ESCENARIOS[0];
  } catch (error) {
    return ORDEN_ESCENARIOS[0];
  }
}

export function guardarEscenario(nombre) {
  try { localStorage.setItem(`${GAME_SLUG}.escenario`, nombre); } catch (error) { /* modo privado */ }
}

/** El circuito elegido, por su clave: también se recuerda. */
export function leerCircuito(claves) {
  try {
    const guardado = localStorage.getItem(`${GAME_SLUG}.circuito`);
    return claves.includes(guardado) ? guardado : claves[0];
  } catch (error) {
    return claves[0];
  }
}

export function guardarCircuito(clave) {
  try { localStorage.setItem(`${GAME_SLUG}.circuito`, clave); } catch (error) { /* modo privado */ }
}

export const estado = {
  fase: 'portada',     // 'portada' | 'carrera' | 'fin'
  circuito: null,      // el que se corre, de CIRCUITOS (circuitos/indice.js)
  escenario: null,     // 'verde' | 'tierra' | 'desierto' | 'nieve'
  decorado: null,      // lo que generarDecorado() sembró para circuito + escenario
  hora: 'dia',         // 'dia' | 'atardecer' | 'noche': cosmética, combinable con el escenario
  tactil: false,       // se activa con el primer toque
  carrera: null,       // la de los dos coches; en la portada, la exhibición
  pilotos: [],         // el piloto de cada carril, por si nadie lo conduce
  humanos: [false, false], // qué coches conduce alguien (se toman al pulsar)
  turno: 1,            // alterna en cada carrera quién va por qué carril
  ultimaAvisada: false, // ya se ha anunciado la última vuelta
  avisos: [],          // carteles flotantes: { texto, vida }
  particulas: [],      // chispas y humo (particulas.js)
  esperaReinicio: 0,
  fps: 0
};
