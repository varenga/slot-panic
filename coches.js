/*
 * Slot Panic — los coches: la forma de cada modelo, vista desde arriba.
 *
 * Presentación, como luz.js: la física y los choques no saben de modelos, y
 * cada uno cabe en la caja de LARGO_COCHE × ANCHO_COCHE (el morro, a +x). Son
 * caricaturas de juguete sacadas de los planos de _desarrollo/. En escritorio
 * miden unos 22 px y solo se lee lo exagerado (el techo de lona, el morro en
 * punta, las dos filas de faros): cada uno tiene un rasgo que lo delata. En la
 * lupa llegan a 75 px, y ahí cuentan el volumen (el techo, más claro, y un
 * contorno), unas ruedas que apenas asoman y luces pequeñas.
 *
 * Los nombres son apodos, nunca marcas (como «slot»): los pone i18n.js.
 *
 * Cada modelo da `silueta()`, el camino de la carrocería (sin rellenar: sirve
 * para la sombra y para la chapa), `ejes` y `via`, dónde van las ruedas (la
 * vía, del eje al centro de la rueda; si no, casi el borde de la caja), y
 * `detalles(techo)`, lo que se pinta encima: cristales, techo y luces. `techo`
 * es el color del coche, aclarado.
 */

import { COLOR, LARGO_COCHE } from './config.js';
import { ctx } from './nucleo/lienzo.js';

/*
 * Los modelos se dibujan en la caja de Race Panic, 22×11, y se escalan a la
 * del juego (LARGO_COCHE × ANCHO_COCHE, con la misma proporción): así crecen
 * todos a la vez sin tocar sus cifras.
 */
const L = 11, A = 5.5;
const ESCALA = LARGO_COCHE / (2 * L);
const CRISTAL = COLOR.cocheCabina;
const FARO = '#fff3c4';
const PILOTO = '#7a2a30';
const LONA = '#2e2a26';
const CONTORNO = 'rgba(0, 0, 0, 0.35)';

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

/** Un polígono simétrico respecto al eje: los puntos de un lado (y ≥ 0), de delante atrás. */
function simetrico(puntos) {
  ctx.moveTo(puntos[0][0], -puntos[0][1]);
  for (const [x, y] of puntos.slice(1)) ctx.lineTo(x, -y);
  for (const [x, y] of puntos.slice().reverse()) ctx.lineTo(x, y);
  ctx.closePath();
}

/** Un par de luces simétricas, ovaladas: x, a qué distancia del eje y sus radios. */
function luces(color, x, y, rx, ry = rx) {
  rellenar(color, () => {
    elipse(x, -y, rx, ry);
    elipse(x, y, rx, ry);
  });
}

/** Rayas finas a lo largo, de x0 a x1, en cada y: costuras, barras y rejillas. */
function rayas(color, x0, x1, ys, grosor = 0.4) {
  ctx.fillStyle = color;
  for (const y of ys) rect(x0, x1, y - grosor / 2, y + grosor / 2);
}

/** El color del coche mezclado con blanco: `t` de 0 (igual) a 1 (blanco). */
function aclarar(color, t) {
  const n = parseInt(color.slice(1), 16);
  const canal = (c) => Math.round(c + (255 - c) * t);
  return `rgb(${canal(n >> 16)}, ${canal((n >> 8) & 255)}, ${canal(n & 255)})`;
}

export const MODELOS = [
  {
    // El monovolumen del escalón: chato y ancho, con el morro más estrecho que
    // la cabina. En los hombros del escalón, al pie del parabrisas, la segunda
    // fila de faros: cuatro luces en trapecio, que es lo que lo delata.
    id: 'escalon',
    ejes: [6, -6.5],
    silueta() {
      caja(-10.2, 7.4, -A, A, [2.6, 2.6, 2.2, 2.2]);
      caja(3, 10.6, -3.7, 3.7, 2.2);
    },
    detalles(techo) {
      rellenar(CRISTAL, () => simetrico([[5.6, 4.1], [1, 4.8]]));   // el parabrisas, enorme
      rellenar(techo, () => caja(-8.6, 1, -4.5, 4.5, 1.4));
      rayas(CRISTAL, -8.4, 0.8, [-4.85, 4.85], 0.6);   // y las ventanillas, que abomban
      rellenar(CRISTAL, () => caja(-9.8, -8.6, -4.1, 4.1, 0.5));
      luces(FARO, 6.5, 4.3, 0.9, 1.1);     // los del escalón
      luces(FARO, 10.1, 2.6, 0.55, 0.8);   // y los del morro
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      rect(10.1, 10.5, -1.3, 1.3);         // la rejilla
      luces(PILOTO, -9.9, 4.5, 0.35, 0.8); // los pilotos, altos y estrechos
    }
  },
  {
    // El de los dos caballos: cuerpo estrecho, aletas sueltas, el capó
    // acanalado y el techo de lona, enrollable, hasta la cola.
    id: 'patito',
    ejes: [6, -6],
    via: 4.4,
    silueta() {
      caja(-10, 7, -4, 4, [2, 3.5, 3.5, 2]);
      caja(3, 10.2, -3, 3, [1.4, 2.6, 2.6, 1.4]);   // el capó
      caja(3, 9.2, -A, A, 2.4);                      // las aletas delanteras
      caja(-8.6, -3.4, -5, 5, 2.2);                  // y las traseras
    },
    detalles(techo) {
      rayas('rgba(0, 0, 0, 0.28)', 4.6, 9.6, [-1.6, -0.55, 0.55, 1.6], 0.35);
      rellenar(CRISTAL, () => simetrico([[3.4, 3.1], [1.5, 3.5]]));
      rellenar(techo, () => caja(-8.4, 1.5, -3.7, 3.7, 1.2));
      rellenar(LONA, () => caja(-7.6, 1.5, -3, 3, 0.8));
      rayas('rgba(255, 255, 255, 0.1)', -7.6, 1.5, [0]);   // la costura
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      rect(-7.6, -6.6, -3, 3);                             // y el rollo, atrás
      luces(FARO, 8.4, 4.1, 0.8);
      luces(PILOTO, -9.6, 2.9, 0.35, 0.6);
    }
  },
  {
    // El tiburón: el más largo, morro en punta, cola estrecha y el techo
    // claro, con los intermitentes en las esquinas de atrás.
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
      rayas('rgba(0, 0, 0, 0.22)', 4.4, 9.6, [0], 0.35);   // el lomo del capó
      rellenar(CRISTAL, () => simetrico([[4.4, 3.6], [1.5, 4.4]]));
      rellenar(CRISTAL, () => simetrico([[-6.1, 3.9], [-8.8, 3.2]]));
      rellenar('#ecebe2', () => caja(-6.4, 1.6, -4.1, 4.1, 1.6));
      luces('#e8913a', -6.1, 3.7, 0.4);    // los intermitentes del techo
      luces(FARO, L - 1, 1.7, 0.6, 0.8);
      luces(PILOTO, -L + 0.4, 2.6, 0.35, 0.7);
    }
  },
  {
    // El escarabajo: una burbuja con cuatro aletas redondas a los lados.
    id: 'escarabajo',
    ejes: [6.3, -6.3],
    via: 4.3,
    silueta() {
      elipse(0, 0, 10.3, 4);
      elipse(6.3, -3.6, 3.2, 1.9);
      elipse(6.3, 3.6, 3.2, 1.9);
      elipse(-6.3, -3.8, 3.4, 1.8);
      elipse(-6.3, 3.8, 3.4, 1.8);
    },
    detalles(techo) {
      rayas('rgba(0, 0, 0, 0.22)', 4.6, 9.4, [0], 0.4);   // el lomo del capó
      rellenar(CRISTAL, () => {                            // el parabrisas, curvo
        ctx.moveTo(4, -3.3);
        ctx.quadraticCurveTo(4.7, 0, 4, 3.3);
        ctx.lineTo(2.4, 3.4);
        ctx.quadraticCurveTo(3, 0, 2.4, -3.4);
        ctx.closePath();
      });
      rellenar(techo, () => elipse(-1.3, 0, 3.8, 3.2));
      rellenar(CRISTAL, () => caja(-6, -5, -1.7, 1.7, 0.6));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (const y of [-0.9, 0, 0.9]) rect(-8.6, -7.4, y - 0.15, y + 0.15);   // la rejilla del motor
      luces(FARO, 8.4, 3.9, 0.75);
      luces(PILOTO, -8.8, 4, 0.45, 0.6);
    }
  },
  {
    // El bambino: el más corto y redondo, con la lona en el techo y la rejilla
    // del motor detrás.
    id: 'bambino',
    ejes: [5.2, -5],
    via: 4.4,
    silueta() {
      caja(-8.6, 8.6, -4.8, 4.8, 4.2);
    },
    detalles(techo) {
      rellenar(CRISTAL, () => simetrico([[3.8, 3.4], [1.6, 3.9]]));
      rellenar(techo, () => caja(-5, 1.6, -3.9, 3.9, 1.4));
      rellenar(LONA, () => caja(-4.1, 1.6, -2.4, 2.4, 0.8));
      rellenar(CRISTAL, () => caja(-5.9, -5, -3.1, 3.1, 0.5));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (const x of [-7.8, -7.1, -6.4]) rect(x - 0.17, x + 0.17, -2.2, 2.2);   // la rejilla del motor
      rayas('rgba(255, 255, 255, 0.35)', 7.4, 8.2, [-1.2, 1.2], 0.3);           // los bigotes
      luces(FARO, 7.6, 3.3, 0.75);
      luces(PILOTO, -8.2, 3.4, 0.35, 0.65);
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
    detalles(techo) {
      rellenar(CRISTAL, () => simetrico([[8.4, 3], [5.4, 4.6], [1.4, 4.7]]));
      rellenar(techo, () => caja(-9.4, 1.4, -4.4, 4.4, 1.2));
      rellenar(CRISTAL, () => caja(-L + 0.5, -9.4, -4, 4, 0.5));
      rayas('rgba(0, 0, 0, 0.35)', -8.8, 0.6, [-3.6, 3.6], 0.5);   // las barras
      luces(FARO, L - 1.3, 3.1, 0.5, 1);
      luces(PILOTO, -L + 0.35, A - 1.4, 0.35, 0.9);
    }
  },
  {
    // El de Race Panic: la caja entera, el de siempre.
    id: 'clasico',
    ejes: [L - 4.5, -L + 4.5],
    silueta() {
      caja(-L, L, -A, A, 3);
    },
    detalles(techo) {
      rellenar(CRISTAL, () => simetrico([[5, 3.3], [1, 3.6]]));
      rellenar(techo, () => caja(-6.6, 1, -3.6, 3.6, 1));
      rellenar(CRISTAL, () => caja(-7.6, -6.6, -3.2, 3.2, 0.4));
      luces(FARO, L - 0.8, A - 2, 0.6, 0.9);
      luces(PILOTO, -L + 0.5, A - 2, 0.4, 0.9);
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
 * con la sombra ya puesta por quien llama: ruedas, chapa, contorno y detalles.
 */
export function pintarModelo(m, color) {
  ctx.save();
  ctx.scale(ESCALA, ESCALA);
  const via = m.via ?? A - 0.5;
  rellenar('#0d0f14', () => {
    for (const u of m.ejes) {
      caja(u - 2.2, u + 2.2, -via - 1.1, -via + 1.1, 0.6);
      caja(u - 2.2, u + 2.2, via - 1.1, via + 1.1, 0.6);
    }
  });
  // El contorno, debajo de la chapa: así solo asoma el de fuera, no las
  // juntas de las piezas de la silueta (las aletas, el capó).
  ctx.beginPath();
  m.silueta();
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
  m.detalles(aclarar(color, 0.22));
  ctx.restore();
}

/** La sombra: la silueta, rellena. */
export function sombraModelo(m, color) {
  ctx.save();
  ctx.scale(ESCALA, ESCALA);
  rellenar(color, () => m.silueta());
  ctx.restore();
}
