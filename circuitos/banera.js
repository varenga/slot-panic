/*
 * Slot Panic — La bañera, de piezas.
 *
 * Un rectángulo con un valle por debajo, el primero que se corre en el
 * sentido de las agujas del reloj. La recta de meta, la más larga de todos,
 * limpia: a fondo hasta la peraltada. Abajo, una recta con una X (cada
 * vuelta se corre por un carril, y si llegan a la vez chocan) y el valle; en
 * su fondo, el desvío (la chicane de Goodwood del juguete): los carriles se
 * juntan y se quiebran de lado, y a la par los coches se tocan. A la
 * izquierda, otra peraltada y la curva de derrape, la de entrar pasado, de
 * vuelta a la meta. La bajada al valle es la única a la izquierda: en ella,
 * el carril de fuera de todas las demás es el de dentro.
 *
 * Desde la meta: la recta, la peraltada, la bajada a la derecha, la recta de
 * abajo con la X, el valle con el desvío, la otra peraltada y la de derrape.
 */

import { construirDePiezas } from '../nucleo/piezas.js';

export const BANERA = construirDePiezas({
  clave: 'banera',
  inicio: { x: 310, y: 110, angulo: 0 },
  piezas: [
    { tipo: 'recta', largo: 750 },
    { tipo: 'curva', radio: 55, giro: 90, efecto: 'peralte' },
    { tipo: 'recta', largo: 265 },
    { tipo: 'curva', radio: 60, giro: 90 },
    { tipo: 'recta', largo: 80 },
    { tipo: 'x', largo: 180 },
    { tipo: 'recta', largo: 80 },
    { tipo: 'curva', radio: 60, giro: -90 },
    { tipo: 'curva', radio: 60, giro: 90 },
    { tipo: 'desvio', largo: 160, entrada: 40, lado: 1 },
    { tipo: 'curva', radio: 60, giro: 90 },
    { tipo: 'curva', radio: 60, giro: -90 },
    { tipo: 'curva', radio: 60, giro: 90, efecto: 'peralte' },
    { tipo: 'recta', largo: 225 },
    { tipo: 'curva', radio: 95, giro: 90, efecto: 'derrape' },
    { tipo: 'recta', largo: 40 }
  ],
  sectores: [1 / 3, 2 / 3],
  interior: { x: 640, y: 311 }
});
