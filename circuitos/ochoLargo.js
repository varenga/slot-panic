/*
 * Slot Panic — El ocho largo, de piezas y de cuatro carriles.
 *
 * El clásico de la pista de cuatro carriles: dos lazos, uno a cada lado de la
 * mesa, unidos por dos diagonales largas que se cruzan en ángulo recto en el
 * centro. En el cruce se encuentran los cuatro coches. Como en todo ocho, los
 * carriles miden lo mismo: el de fuera de un lazo es el de dentro del otro, y
 * no hace falta correr una manga por carril para que sea justo.
 *
 * Las curvas son cerradas (radio 90) para que los cuatro carriles tengan que
 * soltar: el de dentro queda en la guía y el de fuera, a 135. Los de los
 * lados (0 y 3) tienen la curva más cerrada de un lazo y la más abierta del
 * otro; los del medio, las dos a medias.
 *
 * Desde la meta, en la recta de arriba del lazo de la derecha: el lazo (a
 * derechas), la diagonal que sube por el cruce, el lazo de la izquierda (a
 * izquierdas) y la diagonal que baja, otra vez por el cruce.
 */

import { construirDePiezas } from '../nucleo/piezas.js';

const RADIO = 90;     // el de todas las curvas
const RECTA = 200;    // px de las rectas de arriba y abajo de cada lazo
const ALTO = 240;     // px de la recta del fondo de cada lazo
/*
 * px de cada diagonal, del cruce a su curva. Para que las dos se corten en
 * ángulo recto en el centro, la recta del fondo del lazo la alarga.
 */
const DIAGONAL = RADIO + ALTO * Math.SQRT1_2;
const CRUCE = { x: 640, y: 380 };

/** Un lazo: dos curvas de 90° con la recta del fondo; `giro`, 1 a derechas y -1 a izquierdas. */
const lazo = (giro) => [
  { tipo: 'curva', radio: RADIO, giro: 90 * giro },
  { tipo: 'recta', largo: ALTO },
  { tipo: 'curva', radio: RADIO, giro: 90 * giro }
];

export const OCHO_LARGO = construirDePiezas({
  clave: 'ochoLargo',
  carriles: 4,
  inicio: { x: CRUCE.x + (DIAGONAL + RADIO) * Math.SQRT1_2 + RECTA / 2, y: CRUCE.y - RADIO - ALTO / 2, angulo: 0 },
  piezas: [
    { tipo: 'recta', largo: RECTA / 2 },
    ...lazo(1),
    { tipo: 'recta', largo: RECTA },
    { tipo: 'curva', radio: RADIO, giro: 45 },
    { tipo: 'recta', largo: 2 * DIAGONAL },          // por el cruce
    { tipo: 'curva', radio: RADIO, giro: -45 },
    { tipo: 'recta', largo: RECTA },
    ...lazo(-1),
    { tipo: 'recta', largo: RECTA },
    { tipo: 'curva', radio: RADIO, giro: -45 },
    { tipo: 'recta', largo: 2 * DIAGONAL },          // y otra vez
    { tipo: 'curva', radio: RADIO, giro: 45 },
    { tipo: 'recta', largo: RECTA / 2 }
  ],
  sectores: [1 / 3, 2 / 3]
});
