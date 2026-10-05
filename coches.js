/*
 * Slot Panic — los coches: la forma de cada modelo, vista desde arriba.
 *
 * Presentación, como luz.js: la física y los choques siguen con la caja de
 * LARGO_COCHE × ANCHO_COCHE, y cada modelo cabe en ella (el morro, a +x). Son
 * caricaturas de juguete sacadas de los planos de _desarrollo/: a 16 px en
 * pantalla solo se lee lo exagerado (el techo de lona, el morro en punta, las
 * dos filas de faros), así que cada uno tiene un rasgo que lo delata.
 *
 * Los nombres son apodos, nunca marcas (como «slot»): los pone i18n.js.
 *
 * Cada modelo da `silueta()`, el camino de la carrocería (sin rellenar: sirve
 * para la sombra y para la chapa), `ejes` y `via`, dónde van las ruedas (la
 * vía, del eje al centro de la rueda; si no, el borde de la caja), y
 * `detalles()`, lo que se pinta encima: cristales, techo y luces.
 */

import { ANCHO_COCHE, COLOR, LARGO_COCHE } from './config.js';
import { ctx } from './nucleo/lienzo.js';

const L = LARGO_COCHE / 2, A = ANCHO_COCHE / 2;
const CRISTAL = COLOR.cocheCabina;
const FARO = '#fff3c4';
const PILOTO = '#7a2a30';
const LONA = '#2e2a26';

function rect(x0, x1, y0, y1) {
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

/** Un rectángulo redondeado añadido al camino en curso: x e y como intervalos. */
function caja(x0, x1, y0, y1, radio) {
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, radio);
}

function elipse(x, y, rx, ry) {
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function rellenar(color, trazar) {
  ctx.fillStyle = color;
  ctx.beginPath();
  trazar();
  ctx.fill();
}

/** Un par de luces simétricas: x, a qué distancia del eje y de qué tamaño. */
function luces(color, x, y, ancho, alto) {
  ctx.fillStyle = color;
  ctx.fillRect(x - ancho / 2, -y - alto / 2, ancho, alto);
  ctx.fillRect(x - ancho / 2, y - alto / 2, ancho, alto);
}

function lucesRedondas(color, x, y, r) {
  rellenar(color, () => {
    elipse(x, -y, r, r);
    elipse(x, y, r, r);
  });
}

export const MODELOS = [
  {
    // El monovolumen del escalón: chato y ancho, con el morro más estrecho que
    // la cabina. En los hombros del escalón, al pie del parabrisas, la segunda
    // fila de faros: cuatro luces en trapecio, que es lo que lo delata.
    id: 'escalon',
    ejes: [6, -6.5],
    silueta() {
      caja(-10, 7.6, -A, A, 3.2);
      caja(4, 10.5, -3.4, 3.4, 2);
    },
    detalles() {
      ctx.fillStyle = CRISTAL;
      rect(1, 5.2, -4.6, 4.6);          // el parabrisas, enorme
      rect(-9.3, -8, -3.8, 3.8);
      luces(FARO, 6.4, 4.1, 2, 2.4);    // los del escalón
      luces(FARO, 9.9, 2.3, 1.2, 1.8);  // y los del morro
      luces(PILOTO, -9.5, A - 1.2, 1.2, 1.8);
    }
  },
  {
    // El de los dos caballos: cuerpo estrecho, aletas sueltas, el capó
    // acanalado y el techo de lona.
    id: 'patito',
    ejes: [6, -6],
    via: 4.3,
    silueta() {
      caja(-10, 7, -4, 4, 3.5);
      caja(3, 10, -3.2, 3.2, 2.5);           // el capó
      caja(3, 9, -A, A, 2.4);                 // las aletas delanteras
      caja(-8.6, -3.4, -5.2, 5.2, 2.4);       // y las traseras
    },
    detalles() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (const y of [-1.6, 0, 1.6]) rect(4.5, 9.4, y - 0.3, y + 0.3);
      ctx.fillStyle = CRISTAL;
      rect(1.6, 3.4, -3.4, 3.4);
      rellenar(LONA, () => caja(-7.2, 1.6, -3.3, 3.3, 1.5));
      lucesRedondas(FARO, 8.3, 4.2, 1.1);
      luces(PILOTO, -9.4, 3, 1, 1.4);
    }
  },
  {
    // El tiburón: el más largo, morro en punta, cola estrecha y el techo claro.
    id: 'tiburon',
    ejes: [6.5, -6.5],
    silueta() {
      ctx.moveTo(L, -1.8);
      ctx.quadraticCurveTo(L + 0.3, 0, L, 1.8);
      ctx.bezierCurveTo(9, 4.8, 5, A, 1, A);
      ctx.lineTo(-7, A);
      ctx.bezierCurveTo(-9.5, A, -L, 4, -L, 2.8);
      ctx.lineTo(-L, -2.8);
      ctx.bezierCurveTo(-L, -4, -9.5, -A, -7, -A);
      ctx.lineTo(1, -A);
      ctx.bezierCurveTo(5, -A, 9, -4.8, L, -1.8);
      ctx.closePath();
    },
    detalles() {
      ctx.fillStyle = CRISTAL;
      rect(1.5, 4.2, -4.2, 4.2);
      rect(-8.6, -6, -3.6, 3.6);
      rellenar('#ecebe2', () => caja(-6.2, 1.6, -4, 4, 1.6));
      lucesRedondas(FARO, L - 0.9, 1.7, 0.9);
      luces(PILOTO, -L + 0.5, 2.6, 1, 1.2);
    }
  },
  {
    // El escarabajo: una burbuja con cuatro aletas redondas a los lados.
    id: 'escarabajo',
    ejes: [6.3, -6.3],
    via: 4.2,
    silueta() {
      elipse(0, 0, 10.3, 4);
      elipse(6.3, -3.6, 3.2, 1.9);
      elipse(6.3, 3.6, 3.2, 1.9);
      elipse(-6.3, -3.8, 3.4, 1.8);
      elipse(-6.3, 3.8, 3.4, 1.8);
    },
    detalles() {
      rellenar(CRISTAL, () => elipse(2.1, 0, 1.6, 3.1));
      rellenar('rgba(255, 255, 255, 0.18)', () => elipse(-2, 0, 3.6, 3.1));
      rellenar(CRISTAL, () => elipse(-6, 0, 0.9, 2));
      lucesRedondas(FARO, 8.3, 3.8, 1.1);
      luces(PILOTO, -9, 4, 1.2, 1.2);
    }
  },
  {
    // El bambino: el más corto y redondo, con la lona en el techo y la rejilla
    // del motor detrás.
    id: 'bambino',
    ejes: [5.2, -5],
    via: 4.6,
    silueta() {
      caja(-8.6, 8.6, -4.8, 4.8, 4.2);
    },
    detalles() {
      ctx.fillStyle = CRISTAL;
      rect(1.6, 3.8, -3.8, 3.8);
      rect(-5.6, -4.4, -3.2, 3.2);
      rellenar(LONA, () => caja(-4.2, 1.6, -2.4, 2.4, 1));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (const x of [-7.7, -6.7]) rect(x - 0.3, x + 0.3, -2.4, 2.4);
      lucesRedondas(FARO, 7.6, 3.3, 1);
      luces(PILOTO, -8.3, 3.4, 0.8, 1.4);
    }
  },
  {
    // El monovolumen: una cuña, con el parabrisas casi hasta el morro y las
    // barras del techo.
    id: 'monovolumen',
    ejes: [6.5, -6.5],
    silueta() {
      ctx.moveTo(L - 1, -3.6);
      ctx.quadraticCurveTo(L + 0.2, 0, L - 1, 3.6);
      ctx.quadraticCurveTo(8, A, 5, A);
      ctx.lineTo(-L + 1.5, A);
      ctx.quadraticCurveTo(-L, A, -L, A - 1.5);
      ctx.lineTo(-L, -A + 1.5);
      ctx.quadraticCurveTo(-L, -A, -L + 1.5, -A);
      ctx.lineTo(5, -A);
      ctx.quadraticCurveTo(8, -A, L - 1, -3.6);
      ctx.closePath();
    },
    detalles() {
      ctx.fillStyle = CRISTAL;
      ctx.beginPath();
      ctx.moveTo(1.5, -4.6);
      ctx.lineTo(5.2, -4.6);
      ctx.lineTo(8.4, -3.1);
      ctx.lineTo(8.4, 3.1);
      ctx.lineTo(5.2, 4.6);
      ctx.lineTo(1.5, 4.6);
      ctx.closePath();
      ctx.fill();
      rect(-L + 0.6, -L + 1.8, -4, 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      rect(-8.8, 0.8, -3.9, -3.3);
      rect(-8.8, 0.8, 3.3, 3.9);
      luces(FARO, L - 1.4, 3.1, 1.3, 2);
      luces(PILOTO, -L + 0.5, A - 1.3, 1, 2);
    }
  },
  {
    // El de Race Panic: la caja entera, el de siempre.
    id: 'clasico',
    ejes: [L - 4.5, -L + 4.5],
    silueta() {
      caja(-L, L, -A, A, 3);
    },
    detalles() {
      ctx.fillStyle = CRISTAL;
      rect(L - 10, L - 6, -A + 2, A - 2);
      rect(-L + 4, -L + 6.5, -A + 2.5, A - 2.5);
      luces(FARO, L - 0.75, A - 2.1, 1.5, 2.2);
      luces(PILOTO, -L + 0.9, A - 3.3, 1.8, 2);
    }
  }
];

const POR_ID = new Map(MODELOS.map((m) => [m.id, m]));

export function modelo(id) {
  return POR_ID.get(id) ?? MODELOS[0];
}

/** El siguiente de la lista: el del otro coche, que nunca es el mismo. */
export function siguienteModelo(id) {
  const i = MODELOS.indexOf(modelo(id));
  return MODELOS[(i + 1) % MODELOS.length].id;
}

/**
 * Dibuja el coche en sus coordenadas (el origen en el centro, el morro a +x),
 * con la sombra ya puesta por quien llama: ruedas, chapa y detalles.
 */
export function pintarModelo(m, color) {
  const via = m.via ?? A;
  rellenar('#0d0f14', () => {
    for (const u of m.ejes) {
      ctx.rect(u - 2.5, -via - 1.5, 5, 3);
      ctx.rect(u - 2.5, via - 1.5, 5, 3);
    }
  });
  rellenar(color, () => m.silueta());
  m.detalles();
}

/** La sombra: la silueta, rellena. */
export function sombraModelo(m, color) {
  rellenar(color, () => m.silueta());
}
