/*
 * Slot Panic — El resbalón, de piezas.
 *
 * Las chicanes del juguete: tres sitios en que los carriles se juntan y dos
 * coches a la par se tocan. En la recta de meta, una estrecha corta; arriba,
 * una estrecha larga, y a la izquierda, la curva deslizante: una U amplia y
 * resbaladiza, con los carriles juntos, que se toma derrapando.
 *
 * Desde la meta: la estrecha corta, la vuelta de la derecha, la estrecha larga
 * de arriba, la deslizante y la bajada a la meta por dentro.
 */

import { construirDePiezas } from '../nucleo/piezas.js';

export const RESBALON = construirDePiezas({
  clave: 'resbalon',
  inicio: { x: 600, y: 620, angulo: 0 },
  piezas: [
    { tipo: 'recta', largo: 100 },
    { tipo: 'estrecha', largo: 160 },
    { tipo: 'recta', largo: 170 },
    { tipo: 'curva', radio: 80, giro: -90 },
    { tipo: 'recta', largo: 60 },
    { tipo: 'chicane', radio: 55, giro: -45 },
    { tipo: 'recta', largo: 260 - 4 * 55 * Math.SQRT1_2 },
    { tipo: 'curva', radio: 70, giro: -90 },
    { tipo: 'estrecha', largo: 360, juntos: 0.25 },
    { tipo: 'recta', largo: 320 },
    { tipo: 'deslizante', radio: 130, giro: -180, entrada: 60 },
    { tipo: 'recta', largo: 40 },
    { tipo: 'curva', radio: 70, giro: 90 },
    { tipo: 'recta', largo: 70 },
    { tipo: 'curva', radio: 70, giro: -90 },
    { tipo: 'recta', largo: 60 }
  ],
  sectores: [1 / 3, 2 / 3],
  interior: { x: 770, y: 380 }
});
