/*
 * Slot Panic — el trazo del constructor: lo que el dedo va dibujando.
 *
 * Mientras se dibuja, un circuito es la lista de casillas por las que ha
 * pasado el dedo, en orden, y la variante de cada una; el giro de cada casilla
 * sale de por dónde entra y por dónde sale. Cerrado, se convierte en el
 * trazado de `cuadricula.js` (la meta, su rumbo y un paso por casilla), que es
 * lo que se valida, se comparte y se corre.
 *
 * Aquí solo están las reglas de la edición: qué casilla se puede pisar,
 * borrar volviendo por el trazo, cerrar en la meta y cambiar la variante de
 * una pieza. No sabe del DOM ni de cómo se dibuja (`constructor.js`).
 */

import { COLUMNAS, FILAS, recorrer, validarTrazado, VARIANTES } from './cuadricula.js';

// Rumbos: 0 este, 1 sur, 2 oeste, 3 norte (los de cuadricula.js).
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

const MINIMO_CERRAR = 6;   // casillas: el circuito más pequeño (dos curvas, recta, dos curvas, recta)

export function crearTrazo() {
  return { casillas: [], variantes: [], cerrado: false };
}

export function copiarTrazo(trazo) {
  return { casillas: trazo.casillas.map((c) => ({ ...c })), variantes: [...trazo.variantes], cerrado: trazo.cerrado };
}

/** El rumbo de una casilla a su vecina; -1 si no son vecinas. */
export function rumboEntre(a, b) {
  for (let r = 0; r < 4; r++) if (a.col + DX[r] === b.col && a.fila + DY[r] === b.fila) return r;
  return -1;
}

const misma = (a, b) => a.col === b.col && a.fila === b.fila;

/*
 * Cómo entra y cómo sale cada casilla: null donde aún no se sabe (la entrada
 * de la primera mientras está abierto: la de la meta es su rumbo; la salida de
 * la última).
 */
export function rumbos(trazo) {
  const { casillas, cerrado } = trazo;
  const n = casillas.length;
  return casillas.map((c, i) => {
    const sale = i < n - 1 ? rumboEntre(c, casillas[i + 1]) : cerrado ? rumboEntre(c, casillas[0]) : null;
    const entra = i > 0 ? rumboEntre(casillas[i - 1], c) : n > 1 ? rumboEntre(c, casillas[1]) : null;
    return { entra, sale };
  });
}

/** Las veces que el trazo pasa por una casilla, y en qué pasos. */
function pasosEn(trazo, casilla) {
  const lista = [];
  trazo.casillas.forEach((c, i) => { if (misma(c, casilla)) lista.push(i); });
  return lista;
}

/*
 * El dedo entra en una casilla. Devuelve lo que ha pasado:
 *   'empieza'    la primera casilla: la meta
 *   'avanza'     una casilla más
 *   'retrocede'  volvió a la anterior: la última se borra
 *   'cierra'     llegó a la meta por detrás: el circuito está cerrado
 *   null         no se puede (se queda como estaba)
 * Por una casilla ya pisada solo se pasa una vez más, en recta y en
 * perpendicular: es un cruce. La meta se cierra entrando con su rumbo.
 */
export function pisar(trazo, casilla) {
  const { casillas } = trazo;
  const n = casillas.length;
  if (trazo.cerrado) return null;
  if (casilla.col < 0 || casilla.fila < 0 || casilla.col >= COLUMNAS || casilla.fila >= FILAS) return null;
  if (!n) {
    casillas.push({ col: casilla.col, fila: casilla.fila });
    trazo.variantes.push('');
    return 'empieza';
  }
  const ultima = casillas[n - 1];
  if (misma(ultima, casilla)) return null;
  const rumbo = rumboEntre(ultima, casilla);
  if (rumbo < 0) return null;
  if (n >= 2 && misma(casillas[n - 2], casilla)) {
    casillas.pop();
    trazo.variantes.pop();
    return 'retrocede';
  }
  // Saliendo de un cruce, recto.
  if (pasosEn(trazo, ultima).length > 1 && rumbo !== rumboEntre(casillas[n - 2], ultima)) return null;
  if (misma(casillas[0], casilla)) {
    // A la meta se llega por detrás, con su rumbo: si no, la meta sería una curva.
    if (n < MINIMO_CERRAR - 1 || n < 2 || rumbo !== rumboEntre(casillas[0], casillas[1])) return null;
    trazo.cerrado = true;
    return 'cierra';
  }
  const antes = pasosEn(trazo, casilla);
  if (antes.length) {
    // Un cruce: la otra pasada fue recta, y esta la corta en perpendicular.
    if (antes.length > 1) return null;
    const i = antes[0];
    const entraOtra = rumboEntre(casillas[i - 1], casillas[i]);
    const saleOtra = rumboEntre(casillas[i], casillas[i + 1]);
    if (entraOtra !== saleOtra || (entraOtra - rumbo) % 2 === 0) return null;
    // La otra pasada ya no puede llevar variante: un cruce no la tiene.
    trazo.variantes[i] = '';
  }
  casillas.push({ col: casilla.col, fila: casilla.fila });
  trazo.variantes.push('');
  return 'avanza';
}

/** Abre un circuito cerrado (para seguir dibujando o deshacer el cierre). */
export function abrir(trazo) {
  trazo.cerrado = false;
}

/** El paso del trazo en esa casilla, si pasa una sola vez por ella; si no, -1. */
export function pasoEnCasilla(trazo, casilla) {
  const lista = pasosEn(trazo, casilla);
  return lista.length === 1 ? lista[0] : -1;
}

/** Recta o curva, si ya se sabe (la última casilla de uno abierto, no). */
export function tipoPaso(trazo, i) {
  const { entra, sale } = rumbos(trazo)[i];
  if (entra === null || sale === null) return null;
  return entra === sale ? 'recta' : 'curva';
}

/*
 * Tocar una pieza cambia su variante a la siguiente que valga. La meta y los
 * cruces no tienen. Cerrado, se salta lo que la validación no deja (una
 * chicane sin sitio a su lado, una amplia sin sus rectas); abierto, se deja
 * todo y lo dirá la validación al cerrar. Devuelve la variante nueva, o null
 * si esa pieza no tiene.
 */
export function cambiarVariante(trazo, i) {
  const tipo = tipoPaso(trazo, i);
  if (i <= 0 || !tipo || pasosEn(trazo, trazo.casillas[i]).length > 1) return null;
  const lista = VARIANTES[tipo];
  const actual = Math.max(0, lista.indexOf(trazo.variantes[i]));
  for (let k = 1; k <= lista.length; k++) {
    const variante = lista[(actual + k) % lista.length];
    trazo.variantes[i] = variante;
    if (!trazo.cerrado || !variante) return variante;
    const trazado = aTrazado(trazo);
    if (!validarTrazado(trazado)) return variante;
  }
  trazo.variantes[i] = '';
  return '';
}

/*
 * El trazado de `cuadricula.js`: la meta en la primera casilla, con el rumbo
 * hacia la segunda. Solo de un trazo cerrado. Una variante que ya no es de su
 * pieza (la casilla cambió de recta a curva al rehacer el trazo) se olvida.
 */
export function aTrazado(trazo) {
  if (!trazo.cerrado) return null;
  const lista = rumbos(trazo);
  const pasos = lista.map(({ entra, sale }, i) => {
    const giro = ((sale - entra + 5) % 4) - 1;
    const variante = trazo.variantes[i] || '';
    return { giro, variante: VARIANTES[giro ? 'curva' : 'recta'].includes(variante) ? variante : '' };
  });
  return { col: trazo.casillas[0].col, fila: trazo.casillas[0].fila, rumbo: lista[0].sale, pasos };
}

/** Y al revés: para seguir editando un circuito guardado o compartido. */
export function deTrazado(trazado) {
  const { casillas } = recorrer(trazado);
  return {
    casillas: casillas.map(({ col, fila }) => ({ col, fila })),
    variantes: casillas.map((c) => c.variante || ''),
    cerrado: true
  };
}
