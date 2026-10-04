/*
 * Slot Panic — El nudo, de piezas.
 *
 * Un rectángulo con un dedo que entra desde la derecha. En la recta de arriba,
 * una X: los carriles se cruzan y cada coche pasa al otro, así que cada vuelta
 * se corre por un carril distinto. Si los dos llegan a la vez, chocan.
 *
 * Desde la meta: la recta larga, la entrada al dedo con su recta de baches (no
 * se puede ir a fondo), la horquilla, la X, la curva de derrape de arriba a la
 * izquierda y la chicane de la bajada.
 */

import { construirDePiezas } from '../nucleo/piezas.js';

export const NUDO = construirDePiezas({
  clave: 'nudo',
  inicio: { x: 420, y: 620, angulo: 0 },
  piezas: [
    { tipo: 'recta', largo: 660 },
    { tipo: 'curva', radio: 100, giro: -90 },
    { tipo: 'recta', largo: 50 },
    { tipo: 'curva', radio: 60, giro: -90 },
    { tipo: 'recta', largo: 220, efecto: 'baches' },
    { tipo: 'curva', radio: 70, giro: 180 },
    { tipo: 'recta', largo: 220 },
    { tipo: 'curva', radio: 60, giro: -90 },
    { tipo: 'recta', largo: 30 },
    { tipo: 'curva', radio: 80, giro: -90 },
    { tipo: 'recta', largo: 150 },
    { tipo: 'x', largo: 180 },
    { tipo: 'recta', largo: 575 },
    { tipo: 'curva', radio: 95, giro: -90, efecto: 'derrape' },
    { tipo: 'recta', largo: 55 + (220 - 4 * 55 * Math.SQRT1_2) / 2 },
    { tipo: 'chicane', radio: 55, giro: -45 },
    { tipo: 'recta', largo: (220 - 4 * 55 * Math.SQRT1_2) / 2 },
    { tipo: 'curva', radio: 150, giro: -90 },
    { tipo: 'recta', largo: 170 }
  ],
  // Fin de los sectores 1 y 2: el dedo y la recta de la X.
  sectores: [{ x: 1180, y: 195 }, { x: 100, y: 360 }],
  interior: { x: 440, y: 360 }
});
