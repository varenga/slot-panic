/*
 * Slot Panic — El ocho, de piezas.
 *
 * Un lazo grande abajo a la izquierda y uno pequeño arriba a la derecha, que
 * se cruzan en ángulo recto: el ocho del juguete, sin puente. En el cruce los
 * dos coches pueden encontrarse, y entonces chocan. En un ocho los carriles se
 * igualan solos: el de dentro de un lazo es el de fuera del otro.
 *
 * Desde la meta, en la recta de arriba del lazo grande: el cruce, la
 * horquilla peraltada del lazo pequeño (se toma rápido), la bajada con la
 * chicane, y las dos curvas de derrape de la izquierda, las de entrar pasado.
 */

import { construirDePiezas } from '../nucleo/piezas.js';

export const OCHO = construirDePiezas({
  clave: 'ocho',
  inicio: { x: 420, y: 240, angulo: 0 },
  piezas: [
    { tipo: 'recta', largo: 670 },                          // pasa por el cruce (860, 240)
    { tipo: 'curva', radio: 70, giro: -180, efecto: 'peralte' },
    { tipo: 'recta', largo: 170 },
    { tipo: 'curva', radio: 60, giro: -90 },
    { tipo: 'recta', largo: 140 },                          // baja por el cruce
    { tipo: 'chicane', radio: 55, giro: -45 },
    { tipo: 'recta', largo: 385 - 140 - 4 * 55 * Math.SQRT1_2 },
    { tipo: 'curva', radio: 80, giro: 90 },
    { tipo: 'recta', largo: 565 },
    { tipo: 'curva', radio: 95, giro: 90, efecto: 'derrape' },
    { tipo: 'recta', largo: 195 },
    { tipo: 'curva', radio: 95, giro: 90, efecto: 'derrape' },
    { tipo: 'recta', largo: 205 }
  ],
  // Fin de los sectores 1 y 2: el lazo pequeño y la bajada.
  sectores: [{ x: 860, y: 170 }, { x: 600, y: 625 }],
  interior: { x: 550, y: 445 },
  gradas: [{ x: 1060, y: 470, largo: 260, fondo: 24, angulo: 0 }]
});
