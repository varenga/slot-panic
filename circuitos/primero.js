/*
 * Slot Panic — el primer circuito, heredado de Race Panic.
 *
 * Recta de meta abajo, hacia la derecha. Dos curvas rápidas de 90° en las
 * esquinas de la derecha, y arriba un «dedo» que baja hacia el interior: una
 * curva cerrada a la izquierda, una horquilla de 180° (dos vértices de radio
 * 45) y otra cerrada para volver arriba. Esas tres son las que no se toman a
 * fondo.
 *
 * Lo que enseñó el primer trazado: una curva de 60° no obliga a frenar por
 * cerrado que sea su radio, porque con 64 px de pista la trazada la abre casi
 * hasta una recta. Lo que obliga a frenar es el ÁNGULO: 90° o más.
 *
 * Los dos brazos del dedo van a 140 px de eje a eje: 76 px de hierba entre
 * ellos, que es lo que el arnés exige para que una pared no sea la del otro.
 */

import { construirCircuito } from '../nucleo/circuito.js';

export const PRIMERO = construirCircuito({
  clave: 'primero',
  vertices: [
    { x: 120, y: 620, radio: 70 },
    { x: 1160, y: 620, radio: 80 },
    { x: 1160, y: 100, radio: 60 },
    { x: 900, y: 100, radio: 40 },
    { x: 900, y: 450, radio: 45 },
    { x: 760, y: 450, radio: 45 },
    { x: 760, y: 100, radio: 40 },
    { x: 120, y: 100, radio: 70 }
  ],
  meta: { x: 420, y: 620 },
  // Fin de los sectores 1 y 2 (el 3 acaba en la meta): las curvas rápidas, el
  // dedo con la horquilla y la vuelta a meta.
  sectores: [{ x: 1160, y: 360 }, { x: 760, y: 300 }],
  // El hueco libre del interior, donde van el marcador y los carteles.
  interior: { x: 445, y: 360 },
  // Gradas: por dentro de la recta de meta y por fuera de la recta de la derecha.
  gradas: [
    { x: 440, y: 548, largo: 380, fondo: 24, angulo: 0 },
    { x: 1244, y: 360, largo: 300, fondo: 24, angulo: Math.PI / 2 }
  ]
});
