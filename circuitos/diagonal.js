/*
 * Slot Panic — La diagonal, de piezas.
 *
 * Un ocho torcido: el lazo grande a la izquierda y uno estrecho abajo a la
 * derecha. La pista baja de la peraltada de arriba a la derecha por una
 * diagonal larga, a 60°, y pasa por debajo de la recta de abajo, que la salta
 * con un puente: en el juguete los cruces son en ángulo recto, y uno torcido
 * no existe. Al subir el coche frena algo y al bajar gana algo. Desde la recta
 * de meta, un valle entra en el lazo grande; en el lazo estrecho, una
 * estrecha.
 *
 * Desde la meta: la recta de arriba, el valle (bajada de baches y horquilla),
 * la peraltada, la diagonal bajo el puente, el lazo estrecho con su estrecha y
 * su horquilla, la recta de abajo por el puente, la curva de derrape y la
 * subida a la meta.
 */

import { construirDePiezas } from '../nucleo/piezas.js';

// La diagonal sale de la peraltada en (1046,6, 250) a 60° y baja hasta la curva
// del lazo estrecho, que deja la recta de su estrecha en y = 620: el lazo, 130 px
// de alto. Su recta acaba en la horquilla, en x = 1100.
const SEN = Math.sqrt(3) / 2;
const BAJADA = (620 - 1.5 * 60 - 250) / SEN;
const RECTA_ESTRECHA = 1100 - (960 + 100 * SEN - BAJADA / 2 + 60 * SEN);

/*
 * El puente, en la recta de abajo (885 px), que pasa sobre la diagonal en
 * x = 908, a 192 px de la horquilla. La rampa empieza a 17 px de ella; el
 * tablero, de 110 px, tapa la diagonal (64 px de pista, que a 60° pisan 74 de
 * la recta) con margen para el coche que pasa por debajo.
 */
const RECTA_ABAJO = 885;
const ANTES_PUENTE = 17;
const RAMPA = 120;
const TABLERO = 110;

export const DIAGONAL = construirDePiezas({
  clave: 'diagonal',
  inicio: { x: 330, y: 100, angulo: 0 },
  piezas: [
    { tipo: 'recta', largo: 350 },
    { tipo: 'curva', radio: 90, giro: 90 },
    { tipo: 'recta', largo: 100, efecto: 'baches' },
    { tipo: 'curva', radio: 60, giro: -180 },
    { tipo: 'recta', largo: 120 },
    { tipo: 'curva', radio: 70, giro: 90 },
    { tipo: 'curva', radio: 100, giro: 120, efecto: 'peralte' },
    { tipo: 'recta', largo: BAJADA },                     // baja bajo el puente (908, 490)
    { tipo: 'curva', radio: 60, giro: -120 },
    { tipo: 'recta', largo: (RECTA_ESTRECHA - 140) / 2 },
    { tipo: 'estrecha', largo: 140 },
    { tipo: 'recta', largo: (RECTA_ESTRECHA - 140) / 2 },
    { tipo: 'curva', radio: 65, giro: -180 },
    { tipo: 'recta', largo: ANTES_PUENTE },
    { tipo: 'puente', rampa: RAMPA, largo: TABLERO },    // pasa sobre la diagonal
    { tipo: 'recta', largo: RECTA_ABAJO - ANTES_PUENTE - 2 * RAMPA - TABLERO },
    { tipo: 'curva', radio: 95, giro: 90, efecto: 'derrape' },
    { tipo: 'recta', largo: 195 },
    { tipo: 'curva', radio: 100, giro: 90 },
    { tipo: 'recta', largo: 110 }
  ],
  sectores: [1 / 3, 2 / 3],
  interior: { x: 457, y: 312 }
});
