/*
 * Slot Panic — La judía, de piezas y de cuatro carriles.
 *
 * Un óvalo con la recta de abajo hundida hacia dentro, como una judía. La
 * recta de arriba es la más larga, limpia; en los extremos, dos curvas de 90°
 * con una recta entre ellas. Abajo, el hundimiento: cuatro curvas de 45°, y
 * las dos del fondo giran al otro lado, de modo que ahí el carril de fuera de
 * todas las demás va por dentro. Aun así, el carril de fuera da 565 px más por
 * vuelta que el de dentro (2π · 90): se corre en mangas, una por carril
 * (`nucleo/mangas.js`).
 *
 * Desde la meta, en la recta de arriba: el extremo de la derecha, la recta de
 * abajo con el hundimiento y el extremo de la izquierda.
 */

import { ANCHO } from '../config.js';
import { construirDePiezas } from '../nucleo/piezas.js';

const RADIO = 80;     // el de todas las curvas
const ARRIBA = 900;   // px de la recta de arriba
const LADO = 260;     // px de la recta de cada extremo
const HONDO = 150;    // px de cada recta inclinada del hundimiento
const Y_META = 140;
// La meta, a la derecha del centro: en el centro, el semáforo tapaba el coche de arriba.
const META = 200;
// Lo que avanza el hundimiento en horizontal, y lo que queda de recta a cada lado.
const ANCHO_HUNDIDO = 4 * RADIO * Math.SQRT1_2 + 2 * HONDO * Math.SQRT1_2;
const ABAJO = (ARRIBA - ANCHO_HUNDIDO) / 2;

const extremo = [
  { tipo: 'curva', radio: RADIO, giro: 90 },
  { tipo: 'recta', largo: LADO },
  { tipo: 'curva', radio: RADIO, giro: 90 }
];

export const JUDIA = construirDePiezas({
  clave: 'judia',
  carriles: 4,
  inicio: { x: ANCHO / 2 + META, y: Y_META, angulo: 0 },
  piezas: [
    { tipo: 'recta', largo: ARRIBA / 2 - META },
    ...extremo,
    { tipo: 'recta', largo: ABAJO },
    { tipo: 'curva', radio: RADIO, giro: 45 },
    { tipo: 'recta', largo: HONDO },
    { tipo: 'curva', radio: RADIO, giro: -90 },
    { tipo: 'recta', largo: HONDO },
    { tipo: 'curva', radio: RADIO, giro: 45 },
    { tipo: 'recta', largo: ABAJO },
    ...extremo,
    { tipo: 'recta', largo: ARRIBA / 2 + META }
  ],
  sectores: [1 / 3, 2 / 3],
  // El rótulo de la cuenta atrás, encima del hundimiento (debajo lo pisaría).
  guia: { rotulo: { x: ANCHO / 2, y: 290 } }
});
