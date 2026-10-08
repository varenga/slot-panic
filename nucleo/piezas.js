/*
 * Slot Panic — los circuitos de piezas.
 *
 * Un circuito de piezas se declara como en la caja del juguete: desde la meta,
 * una pieza detrás de otra, y cada una sigue donde acaba la anterior. Aquí se
 * recorren con una «tortuga» que avanza y gira, y se muestrea el eje: los
 * arcos salen exactos, con su radio, sin redondear un polígono. Lo demás (s,
 * muros, cruces) es lo común de `circuito.js`.
 *
 * Las piezas (ángulos en grados; positivo, a la derecha en pantalla):
 *
 *   { tipo: 'recta', largo }                 recta
 *   { tipo: 'recta', largo, efecto: 'baches' }   recta de rally: sacude la guía
 *   { tipo: 'curva', radio, giro }           curva
 *   { tipo: 'curva', radio, giro, efecto: 'peralte' | 'derrape' }
 *   { tipo: 'x', largo }                     recta en que los carriles se cruzan
 *                                            en X: cada coche pasa al otro
 *   { tipo: 'chicane', radio, giro }         S de tres arcos (giro, -2·giro,
 *                                            giro): sale en la misma línea
 *   { tipo: 'estrecha', largo, juntos }      recta en que los carriles se
 *                                            acercan (a ESTRECHA) y se vuelven
 *                                            a separar; `juntos`, la fracción
 *                                            del largo en que van juntos (0, la
 *                                            corta). Dos coches a la par se tocan
 *   { tipo: 'deslizante', radio, giro, entrada }   curva amplia y resbaladiza
 *                                            con los carriles juntos: una recta
 *                                            de `entrada` que los acerca, la
 *                                            curva y otra igual que los separa
 *
 * Por dentro, una recta o una curva puede llevar `estrecha: [desde, hasta]`:
 * el factor del carril al empezar y al acabar (de 1, lo normal, a ESTRECHA).
 *
 * El cruce del ocho no es una pieza: es una recta que pasa por encima de otra,
 * y `circuito.js` lo encuentra solo.
 *
 * Si las piezas no cierran el circuito, `construirDePiezas` lo dice: un
 * circuito de juguete que no cierra no se puede montar.
 */

import { ESTRECHA, PASO_EJE } from '../config.js';
import { completarCircuito } from './circuito.js';

const CIERRE = 0.5;                      // px de descuadre que se admiten al cerrar
const CIERRE_ANGULO = 0.1 * Math.PI / 180;

/** Las piezas compuestas, en piezas simples. */
function desplegar(piezas) {
  return piezas.flatMap((pieza) => {
    if (pieza.tipo === 'chicane') {
      const { radio, giro } = pieza;
      return [giro, -2 * giro, giro].map((g) => ({ tipo: 'curva', radio, giro: g, efecto: 'chicane' }));
    }
    if (pieza.tipo === 'estrecha') {
      const juntos = pieza.juntos || 0;
      const lado = pieza.largo * (1 - juntos) / 2;
      return [
        { tipo: 'recta', largo: lado, efecto: 'estrecha', estrecha: [1, ESTRECHA] },
        ...(juntos ? [{ tipo: 'recta', largo: pieza.largo * juntos, efecto: 'estrecha', estrecha: [ESTRECHA, ESTRECHA] }] : []),
        { tipo: 'recta', largo: lado, efecto: 'estrecha', estrecha: [ESTRECHA, 1] }
      ];
    }
    if (pieza.tipo === 'deslizante') {
      const { radio, giro, entrada } = pieza;
      return [
        { tipo: 'recta', largo: entrada, efecto: 'estrecha', estrecha: [1, ESTRECHA] },
        { tipo: 'curva', radio, giro, efecto: 'deslizante', estrecha: [ESTRECHA, ESTRECHA] },
        { tipo: 'recta', largo: entrada, efecto: 'estrecha', estrecha: [ESTRECHA, 1] }
      ];
    }
    return [pieza];
  });
}

/*
 * El factor del carril en la fracción `t` de una pieza, con `carril` el de
 * antes de ella (1 o -1). En la X va de un lado al otro y en una estrecha se
 * acerca al eje, los dos con un coseno: sin esquinas.
 */
function factorEn(pieza, carril, t) {
  if (pieza.tipo === 'x') return carril * Math.cos(Math.PI * t);
  if (!pieza.estrecha) return carril;
  const [desde, hasta] = pieza.estrecha;
  return carril * (desde + (hasta - desde) * (1 - Math.cos(Math.PI * t)) / 2);
}

export function construirDePiezas(datos) {
  const piezas = desplegar(datos.piezas);
  let { x, y, angulo } = datos.inicio;
  let carril = 1;           // el factor del carril: lo que vale `lateral` aquí
  let cambios = 0;
  const eje = [];

  piezas.forEach((pieza, indice) => {
    const curva = pieza.tipo === 'curva' ? Math.sign(pieza.giro) : 0;
    const giro = curva ? pieza.giro * Math.PI / 180 : 0;
    const largo = curva ? Math.abs(giro) * pieza.radio : pieza.largo;
    const pasos = Math.max(2, Math.ceil(largo / PASO_EJE));
    // El centro de la curva, a la normal (-sen, cos) del rumbo por el lado al que gira.
    const centro = curva
      ? { x: x - Math.sin(angulo) * pieza.radio * curva, y: y + Math.cos(angulo) * pieza.radio * curva }
      : null;
    for (let k = 0; k < pasos; k++) {
      const t = k / pasos;
      let px, py;
      if (curva) {
        const a = angulo + giro * t;
        px = centro.x + Math.sin(a) * pieza.radio * curva;
        py = centro.y - Math.cos(a) * pieza.radio * curva;
      } else {
        px = x + Math.cos(angulo) * largo * t;
        py = y + Math.sin(angulo) * largo * t;
      }
      eje.push({
        x: px, y: py,
        radio: curva ? pieza.radio : Infinity,
        curva,
        pieza: indice,
        tipo: pieza.tipo,
        efecto: pieza.efecto || null,
        junta: k === 0,
        carril: factorEn(pieza, carril, t)
      });
    }
    if (curva) {
      angulo += giro;
      x = centro.x + Math.sin(angulo) * pieza.radio * curva;
      y = centro.y - Math.cos(angulo) * pieza.radio * curva;
    } else {
      x += Math.cos(angulo) * largo;
      y += Math.sin(angulo) * largo;
    }
    if (pieza.tipo === 'x') {
      carril = -carril;
      cambios++;
    }
  });

  const descuadre = Math.hypot(x - datos.inicio.x, y - datos.inicio.y);
  const desvio = Math.abs(Math.atan2(Math.sin(angulo - datos.inicio.angulo), Math.cos(angulo - datos.inicio.angulo)));
  if (descuadre > CIERRE || desvio > CIERRE_ANGULO) {
    throw new Error(`el circuito «${datos.clave}» no cierra: acaba a ${descuadre.toFixed(1)} px ` +
      `y ${(desvio * 180 / Math.PI).toFixed(1)}° de la meta (en ${x.toFixed(1)}, ${y.toFixed(1)})`);
  }
  return completarCircuito(eje, { ...datos, cambiosCarril: cambios });
}
