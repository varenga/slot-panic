/*
 * Slot Panic — La ele, de piezas y de cuatro carriles.
 *
 * Una ele tumbada: la columna a la izquierda, a todo lo alto de la mesa, y el
 * brazo abajo, hacia la derecha. Seis curvas de 90°, y una, la del rincón
 * donde la columna se junta con el brazo, a la izquierda: en ella el carril
 * de fuera de todas las demás va por dentro. El carril de fuera da 565 px más
 * por vuelta que el de dentro (2π · 90): se corre en mangas, una por carril
 * (`nucleo/mangas.js`).
 *
 * Desde la meta, en lo alto de la columna: la bajada al rincón, el brazo, la
 * recta de abajo (la más larga) y la subida por la izquierda.
 */

import { construirDePiezas } from '../nucleo/piezas.js';

const RADIO = 70;                       // el de todas las curvas
const IZQUIERDA = 110, DERECHA = 1170;  // x del eje a los lados
const ARRIBA = 140, ABAJO = 560;        // y del eje arriba y abajo
const COLUMNA = 560;                    // x del eje a la derecha de la columna
const BRAZO = 340;                      // y del eje encima del brazo
const recta = (largo) => ({ tipo: 'recta', largo });
const curva = (giro) => ({ tipo: 'curva', radio: RADIO, giro });

export const ELE = construirDePiezas({
  clave: 'ele',
  carriles: 4,
  inicio: { x: (IZQUIERDA + COLUMNA) / 2, y: ARRIBA, angulo: 0 },
  piezas: [
    recta((COLUMNA - IZQUIERDA) / 2 - RADIO),
    curva(90),
    recta(BRAZO - ARRIBA - 2 * RADIO),
    curva(-90),                                  // el rincón
    recta(DERECHA - COLUMNA - 2 * RADIO),
    curva(90),
    recta(ABAJO - BRAZO - 2 * RADIO),
    curva(90),
    recta(DERECHA - IZQUIERDA - 2 * RADIO),
    curva(90),
    recta(ABAJO - ARRIBA - 2 * RADIO),
    curva(90),
    recta((COLUMNA - IZQUIERDA) / 2 - RADIO)
  ],
  sectores: [1 / 3, 2 / 3],
  // La cuenta atrás: el J1 dentro de la columna y el J2, con el rótulo, en el
  // hueco de arriba a la derecha, fuera de la ele.
  guia: { paneles: [{ x: (IZQUIERDA + COLUMNA) / 2, y: 350 }, { x: 950, y: 195 }], rotulo: { x: 950, y: 115 } }
});
