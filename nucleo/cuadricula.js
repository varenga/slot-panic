/*
 * Slot Panic — la cuadrícula del constructor.
 *
 * Un circuito dibujado con el dedo es un camino por las casillas de una
 * cuadrícula: la casilla de la meta y su rumbo, y luego un movimiento por
 * casilla (seguir recto, girar a la derecha o a la izquierda) con su variante.
 * Aquí se valida con aritmética entera (lo mismo que hará el servidor), se
 * pasa a un código corto para compartir y se convierte en piezas para
 * `construirDePiezas`. En una cuadrícula, cerrar siempre cuadra.
 *
 * El eje pasa por el centro de las casillas: una recta va de un lado al
 * opuesto, una curva de 90° (radio media casilla) une dos lados contiguos con
 * el centro en su esquina. Las variantes:
 *
 *   recta   ''  'baches'  'x'  'chicaneIzquierda'  'chicaneDerecha'  'estrecha'
 *           'estrechaLarga'
 *   curva   ''  'peralte'  'derrape'  'amplia'  'deslizante'
 *
 * (Las nuevas van al final de cada lista: el código guarda el número de la
 * variante, y así los circuitos ya compartidos siguen siendo los mismos.)
 *
 * - La CHICANE ocupa dos rectas seguidas (la variante va en la primera) y se
 *   abomba hacia su lado: las dos casillas de ese lado tienen que estar libres.
 * - La AMPLIA es una curva de 2 × 2: la recta de antes, la curva y la recta de
 *   después, con radio de casilla y media; la cuarta casilla del bloque (la de
 *   dentro) queda libre. La DESLIZANTE ocupa el mismo bloque: en la recta de
 *   antes los carriles se juntan y en la de después se separan.
 * - La ESTRECHA junta los carriles en su casilla; la ESTRECHA LARGA, en dos
 *   rectas seguidas (la variante va en la primera), con un tramo en que van
 *   juntos. A la par, dos coches se tocan.
 * - El CRUCE no se declara: es una casilla por la que el camino pasa dos veces,
 *   las dos en recta y en perpendicular.
 *
 * No sabe del DOM: lo usan el constructor, el arnés y (copiado en PHP) el
 * servidor.
 */

import { ANCHO } from '../config.js';
import { BANDA_TEXTO } from './decorado.js';

export const COLUMNAS = 11;
export const FILAS = 6;
/*
 * 110 px: dos tramos en casillas vecinas quedan a 110, más que un ancho de
 * pista + 40 (104), que es lo que el arnés pide para que la pared de uno no
 * sea la del otro. Las 6 filas caben justas bajo la barra del marcador.
 */
export const CASILLA = 110;
export const X0 = (ANCHO - COLUMNAS * CASILLA) / 2;
export const Y0 = BANDA_TEXTO;

const RADIO = CASILLA / 2;
const RADIO_AMPLIA = CASILLA * 1.5;
const RADIO_CHICANE = 55;
const GIRO_CHICANE = 45;
// Lo que avanza la chicane (tres arcos: 45°, -90°, 45°); el resto de las dos casillas, recta.
const AVANCE_CHICANE = 4 * RADIO_CHICANE * Math.sin(GIRO_CHICANE * Math.PI / 180);
// La deslizante, en el bloque de la amplia: entrada + radio = casilla y media.
const ENTRADA_DESLIZANTE = 40;
const RADIO_DESLIZANTE = RADIO_AMPLIA - ENTRADA_DESLIZANTE;
const JUNTOS_LARGA = 0.3;
const MAXIMO_PASOS = 2 * COLUMNAS * FILAS;   // cada casilla, como mucho dos veces (un cruce)
const VERSION = 1;

// Rumbos: 0 este, 1 sur, 2 oeste, 3 norte. Girar a la derecha (+1) es ir en el sentido del reloj.
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

export const VARIANTES = {
  recta: ['', 'baches', 'x', 'chicaneIzquierda', 'chicaneDerecha', 'estrecha', 'estrechaLarga'],
  curva: ['', 'peralte', 'derrape', 'amplia', 'deslizante']
};
const LADO_CHICANE = { chicaneIzquierda: -1, chicaneDerecha: 1 };
// Las curvas que ocupan un bloque de 2 × 2.
const BLOQUE = new Set(['amplia', 'deslizante']);

const girar = (rumbo, giro) => (rumbo + giro + 4) % 4;
const clave = (col, fila) => fila * COLUMNAS + col;
const dentro = (col, fila) => col >= 0 && col < COLUMNAS && fila >= 0 && fila < FILAS;

/** El centro de una casilla, en el lienzo. */
export function centroCasilla(col, fila) {
  return { x: X0 + col * CASILLA + RADIO, y: Y0 + fila * CASILLA + RADIO };
}

/**
 * Recorre el trazado: una entrada por paso, con su casilla, el rumbo con que
 * entra y con el que sale. Al final, dónde acabaría el siguiente paso.
 */
export function recorrer(trazado) {
  let { col, fila, rumbo } = trazado;
  const casillas = trazado.pasos.map((paso, indice) => {
    const entra = rumbo;
    rumbo = girar(rumbo, paso.giro);
    const casilla = { indice, col, fila, entra, sale: rumbo, giro: paso.giro, variante: paso.variante || '' };
    col += DX[rumbo];
    fila += DY[rumbo];
    return casilla;
  });
  return { casillas, final: { col, fila, rumbo } };
}

/*
 * ¿Se puede correr? null si sí; si no, el motivo y el paso donde falla. Solo
 * con enteros: es lo que el servidor repite antes de publicar. Lo que aquí se
 * prohíbe es lo que el arnés (sección 5) ha visto que no cabe.
 *
 *   vacio      no hay pasos, o pasan del máximo
 *   variante   una variante que esa pieza no tiene
 *   meta       la casilla de la meta no es una recta sin variante
 *   fuera      el camino se sale de la cuadrícula
 *   abierto    no vuelve a la meta con su rumbo
 *   pisa       pasa dos veces por una casilla sin que sea un cruce
 *   cruce      un cruce con variante, o en la meta
 *   amplia     una curva amplia sin sus dos rectas, o con la casilla de dentro ocupada
 *   deslizante lo mismo, en una curva deslizante
 *   chicane    una chicane sin la recta siguiente, o con su lado ocupado
 *   estrecha   una estrecha larga sin la recta siguiente
 */
export function validarTrazado(trazado) {
  const { pasos } = trazado;
  if (!Array.isArray(pasos) || pasos.length < 1 || pasos.length > MAXIMO_PASOS) return { motivo: 'vacio', paso: 0 };
  if (!dentro(trazado.col, trazado.fila) || ![0, 1, 2, 3].includes(trazado.rumbo)) return { motivo: 'fuera', paso: 0 };
  for (let i = 0; i < pasos.length; i++) {
    const { giro, variante = '' } = pasos[i];
    if (![-1, 0, 1].includes(giro) || !VARIANTES[giro ? 'curva' : 'recta'].includes(variante)) return { motivo: 'variante', paso: i };
  }
  if (pasos[0].giro !== 0 || (pasos[0].variante || '') !== '') return { motivo: 'meta', paso: 0 };

  const { casillas, final } = recorrer(trazado);
  const fuera = casillas.findIndex((c) => !dentro(c.col, c.fila));
  if (fuera >= 0) return { motivo: 'fuera', paso: fuera };
  if (final.col !== trazado.col || final.fila !== trazado.fila || final.rumbo !== trazado.rumbo) {
    return { motivo: 'abierto', paso: pasos.length - 1 };
  }

  // Quién pasa por cada casilla.
  const visitas = new Map();
  for (const c of casillas) {
    const k = clave(c.col, c.fila);
    if (!visitas.has(k)) visitas.set(k, []);
    visitas.get(k).push(c);
  }
  for (const [, lista] of visitas) {
    if (lista.length === 1) continue;
    const [a, b] = lista;
    if (lista.length > 2 || a.giro || b.giro || (a.entra - b.entra) % 2 === 0) return { motivo: 'pisa', paso: b.indice };
    if (a.variante || b.variante || a.indice === 0) return { motivo: 'cruce', paso: b.indice };
  }
  const libre = (col, fila) => dentro(col, fila) && !visitas.has(clave(col, fila));
  // Una recta sin nada: puede ser parte de una chicane o de una amplia.
  const rectaSola = (c) => c && c.indice > 0 && !c.giro && !c.variante && visitas.get(clave(c.col, c.fila)).length === 1;

  // Las rectas que se lleva otra pieza (una amplia o una deslizante, la de
  // antes y la de después; una chicane o una estrecha larga, la siguiente):
  // ninguna puede ser de dos.
  const llevadas = new Set();
  const llevar = (c) => {
    if (!rectaSola(c) || llevadas.has(c.indice)) return false;
    llevadas.add(c.indice);
    return true;
  };
  // Primero las amplias, que reservan su casilla de dentro; luego las chicanes, que miran a su lado.
  const reservadas = new Set();
  for (const c of casillas) {
    if (!BLOQUE.has(c.variante)) continue;
    const antes = casillas[c.indice - 1];
    // La casilla de dentro del bloque: la de antes, hacia donde gira.
    const col = antes ? antes.col + DX[c.sale] : -1, fila = antes ? antes.fila + DY[c.sale] : -1;
    if (!llevar(antes) || !llevar(casillas[c.indice + 1]) || !libre(col, fila) || reservadas.has(clave(col, fila))) {
      return { motivo: c.variante, paso: c.indice };
    }
    reservadas.add(clave(col, fila));
  }
  for (const c of casillas) {
    if (!LADO_CHICANE[c.variante]) continue;
    const lado = girar(c.entra, LADO_CHICANE[c.variante]);
    const siguiente = casillas[c.indice + 1];
    const ladoLibre = (k) => libre(k.col + DX[lado], k.fila + DY[lado]) && !reservadas.has(clave(k.col + DX[lado], k.fila + DY[lado]));
    if (visitas.get(clave(c.col, c.fila)).length > 1 || !llevar(siguiente) || !ladoLibre(c) || !ladoLibre(siguiente)) {
      return { motivo: 'chicane', paso: c.indice };
    }
  }
  for (const c of casillas) {
    if (c.variante !== 'estrechaLarga') continue;
    if (visitas.get(clave(c.col, c.fila)).length > 1 || !llevar(casillas[c.indice + 1])) return { motivo: 'estrecha', paso: c.indice };
  }
  return null;
}

// --- El código para compartir --------------------------------------------------

/*
 * Un byte de versión, la meta (columna, fila, rumbo) y un byte por paso: el
 * giro en los dos bits bajos (0 recto, 1 derecha, 2 izquierda) y el número de
 * la variante encima. En base64url, sin relleno: un circuito de 30 casillas
 * son 46 letras. El mismo trazado da siempre el mismo código.
 */
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const GIRO_A_BITS = { 0: 0, 1: 1, '-1': 2 };
const BITS_A_GIRO = [0, 1, -1];

export function aCodigo(trazado) {
  const bytes = [VERSION, trazado.col, trazado.fila, trazado.rumbo,
    ...trazado.pasos.map(({ giro, variante = '' }) =>
      GIRO_A_BITS[giro] | (VARIANTES[giro ? 'curva' : 'recta'].indexOf(variante) << 2))];
  let codigo = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = bytes.slice(i, i + 3);
    const n = (a << 16) | (b << 8) | c;
    const letras = Math.min(4, Math.ceil((bytes.length - i) * 4 / 3));
    for (let k = 0; k < letras; k++) codigo += ALFABETO[(n >> (18 - 6 * k)) & 63];
  }
  return codigo;
}

/** Del código al trazado; null si no es un código de circuito. No lo valida: eso es `validarTrazado`. */
export function deCodigo(codigo) {
  if (typeof codigo !== 'string' || !/^[A-Za-z0-9_-]+$/.test(codigo) || codigo.length % 4 === 1) return null;
  const bytes = [];
  let acumulado = 0, bits = 0;
  for (const letra of codigo) {
    acumulado = ((acumulado << 6) | ALFABETO.indexOf(letra)) & 0xffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulado >> bits) & 255);
    }
  }
  if (bytes.length < 5 || bytes[0] !== VERSION) return null;
  const pasos = [];
  for (const byte of bytes.slice(4)) {
    const giro = BITS_A_GIRO[byte & 3];
    const variante = VARIANTES[giro ? 'curva' : 'recta'][byte >> 2];
    if (giro === undefined || variante === undefined) return null;
    pasos.push({ giro, variante });
  }
  return { col: bytes[1], fila: bytes[2], rumbo: bytes[3], pasos };
}

// --- De la cuadrícula a las piezas ------------------------------------------------

/*
 * Los datos para `construirDePiezas`: desde el centro de la casilla de la meta,
 * media recta, una pieza por casilla (la amplia y la chicane, por dos o tres)
 * y la otra media recta. Los sectores, por tercios; y una grada junto a la
 * recta más larga, si tiene un lado libre. El trazado tiene que ser válido.
 */
export function aPiezas(trazado, clave = 'cuadricula') {
  const { casillas } = recorrer(trazado);
  const piezas = [{ tipo: 'recta', largo: RADIO }];
  for (let i = 1; i < casillas.length; i++) {
    const c = casillas[i];
    const siguiente = casillas[i + 1];
    if (siguiente && BLOQUE.has(siguiente.variante)) continue;    // la recta de antes es de la amplia
    if (c.variante === 'amplia') {
      piezas.push({ tipo: 'curva', radio: RADIO_AMPLIA, giro: 90 * c.giro });
      i++;                                                         // y la de después, también
    } else if (c.variante === 'deslizante') {
      piezas.push({ tipo: 'deslizante', radio: RADIO_DESLIZANTE, giro: 90 * c.giro, entrada: ENTRADA_DESLIZANTE });
      i++;
    } else if (c.giro) {
      piezas.push({ tipo: 'curva', radio: RADIO, giro: 90 * c.giro, ...(c.variante ? { efecto: c.variante } : {}) });
    } else if (LADO_CHICANE[c.variante]) {
      const resto = (2 * CASILLA - AVANCE_CHICANE) / 2;
      piezas.push({ tipo: 'recta', largo: resto },
        { tipo: 'chicane', radio: RADIO_CHICANE, giro: GIRO_CHICANE * LADO_CHICANE[c.variante] },
        { tipo: 'recta', largo: resto });
      i++;
    } else if (c.variante === 'x') {
      piezas.push({ tipo: 'x', largo: CASILLA });
    } else if (c.variante === 'estrecha') {
      piezas.push({ tipo: 'estrecha', largo: CASILLA });
    } else if (c.variante === 'estrechaLarga') {
      piezas.push({ tipo: 'estrecha', largo: 2 * CASILLA, juntos: JUNTOS_LARGA });
      i++;
    } else {
      piezas.push({ tipo: 'recta', largo: CASILLA, ...(c.variante ? { efecto: c.variante } : {}) });
    }
  }
  piezas.push({ tipo: 'recta', largo: RADIO });

  const meta = centroCasilla(trazado.col, trazado.fila);
  const grada = gradaJuntoARecta(trazado, casillas);
  return {
    clave,
    inicio: { x: meta.x, y: meta.y, angulo: trazado.rumbo * Math.PI / 2 },
    piezas,
    sectores: [1 / 3, 2 / 3],
    gradas: grada ? [grada] : []
  };
}

const GRADA_FUERA = 75;       // px del eje al centro de la grada, como en los oficiales
const GRADA_MARGEN = 35;      // px que deja libres en cada punta de la recta
const GRADA_MINIMA = 3;       // casillas de recta, como poco

/*
 * La grada va junto a la recta más larga (rectas sin variante y sin cruce,
 * seguidas), por un lado en que todas las casillas vecinas estén libres y
 * dentro de la cuadrícula.
 */
function gradaJuntoARecta(trazado, casillas) {
  const ocupadas = new Set(casillas.map((c) => clave(c.col, c.fila)));
  for (const c of casillas) {
    // La casilla de dentro de una amplia (o una deslizante) también cuenta como ocupada.
    if (BLOQUE.has(c.variante)) {
      const antes = casillas[c.indice - 1];
      ocupadas.add(clave(antes.col + DX[c.sale], antes.fila + DY[c.sale]));
    }
  }
  const repetidas = new Set(casillas.filter((c, i) =>
    casillas.findIndex((o) => o.col === c.col && o.fila === c.fila) !== i).map((c) => clave(c.col, c.fila)));
  const sirve = (c) => !c.giro && !c.variante && !repetidas.has(clave(c.col, c.fila)) &&
    !(casillas[c.indice + 1] && BLOQUE.has(casillas[c.indice + 1].variante)) &&
    !(casillas[c.indice - 1] && BLOQUE.has(casillas[c.indice - 1].variante)) &&
    !(casillas[c.indice - 1] && (LADO_CHICANE[casillas[c.indice - 1].variante] || casillas[c.indice - 1].variante === 'estrechaLarga'));

  let mejor = null;
  const n = casillas.length;
  for (let i = 0; i < n; i++) {
    // Tramos de rectas seguidas que empiezan aquí (sin dar la vuelta a la lista).
    if (!sirve(casillas[i]) || (i > 0 && sirve(casillas[i - 1]))) continue;
    let fin = i;
    while (fin + 1 < n && sirve(casillas[fin + 1])) fin++;
    const tramo = casillas.slice(i, fin + 1);
    if (tramo.length < GRADA_MINIMA || (mejor && tramo.length <= mejor.tramo.length)) continue;
    for (const giro of [1, -1]) {
      const lado = girar(tramo[0].entra, giro);
      const libre = tramo.every((c) => dentro(c.col + DX[lado], c.fila + DY[lado]) &&
        !ocupadas.has(clave(c.col + DX[lado], c.fila + DY[lado])));
      if (libre) { mejor = { tramo, lado }; break; }
    }
  }
  if (!mejor) return null;
  const { tramo, lado } = mejor;
  const a = centroCasilla(tramo[0].col, tramo[0].fila);
  const b = centroCasilla(tramo[tramo.length - 1].col, tramo[tramo.length - 1].fila);
  return {
    x: (a.x + b.x) / 2 + DX[lado] * GRADA_FUERA,
    y: (a.y + b.y) / 2 + DY[lado] * GRADA_FUERA,
    largo: tramo.length * CASILLA - 2 * GRADA_MARGEN,
    fondo: 24,
    angulo: tramo[0].entra % 2 ? Math.PI / 2 : 0
  };
}
