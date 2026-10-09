/*
 * Slot Panic — los coches: la forma de cada modelo, vista desde arriba.
 *
 * Presentación, como luz.js: la física sabe de cada modelo su largo y su
 * carácter (COCHES, en config.js), no su forma, y los choques siguen con la
 * distancia entre centros. Cada uno se pinta con su largo (el morro, a +x), y
 * el ancho sale de su forma. Son caricaturas de juguete sacadas de los planos
 * de _desarrollo/. En escritorio
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

import { COCHES, COLOR } from './config.js';
import { ctx } from './nucleo/lienzo.js';

/*
 * Los modelos se dibujan en la caja de Race Panic, 22×11, cada uno con lo que
 * mide de cola a morro ahí (`mide`), y se escalan a su largo (COCHES): con la
 * misma escala a lo largo y a lo ancho, para no deformarlos. Así el bambino,
 * el más corto, es también algo más ancho, y el tiburón, el más largo, el más
 * estrecho.
 */
const L = 11, A = 5.5;
const escala = (m) => COCHES[m.id].largo / m.mide;
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
    // El Multiplo, el monovolumen del escalón (el de 1998): chato, ancho de
    // punta a punta y con el morro redondo. El capó es un escalón corto delante
    // del parabrisas, y encima, en sus esquinas y pegados al cristal, la
    // segunda fila de faros, pequeños y mirando a la carretera; los otros,
    // abajo, en el parachoques: cuatro luces en trapecio. El id sigue siendo
    // `escalon` (los récords y lo elegido se guardan con él).
    id: 'escalon',
    mide: 20.6,
    ejes: [6, -6.5],
    silueta() {
      ctx.moveTo(-10, -A + 2);
      ctx.quadraticCurveTo(-10, -A, -8, -A);
      ctx.lineTo(5, -A);
      ctx.bezierCurveTo(8.6, -A, 10.6, -3.8, 10.6, 0);
      ctx.bezierCurveTo(10.6, 3.8, 8.6, A, 5, A);
      ctx.lineTo(-8, A);
      ctx.quadraticCurveTo(-10, A, -10, A - 2);
      ctx.closePath();
    },
    detalles(techo) {
      rellenar(CRISTAL, () => simetrico([[5.1, 4.2], [1, 4.8]]));   // el parabrisas, enorme
      rellenar(techo, () => caja(-8.6, 1, -4.5, 4.5, 1.4));
      rayas(CRISTAL, -8.4, 0.8, [-4.85, 4.85], 0.6);   // y las ventanillas, que abomban
      rellenar(CRISTAL, () => caja(-9.7, -8.6, -4.1, 4.1, 0.5));
      // Los faros del escalón, pequeños y pegados al parabrisas, en su cuenca;
      // la lente, en la mitad de delante: miran a la carretera.
      luces('rgba(0, 0, 0, 0.45)', 5.8, 3.4, 0.9, 0.72);
      rellenar(FARO, () => {
        for (const lado of [-1, 1]) {
          ctx.moveTo(5.7, lado * 3.4 - 0.56);
          ctx.ellipse(5.7, lado * 3.4, 0.78, 0.56, 0, -Math.PI / 2, Math.PI / 2);
          ctx.closePath();
        }
      });
      luces(FARO, 9.3, 3.5, 0.5, 0.65);    // y los del parachoques
      rellenar('rgba(0, 0, 0, 0.4)', () => caja(10.1, 10.5, -1.6, 1.6, 0.2));   // la boca
      luces(PILOTO, -9.8, 4.5, 0.35, 0.8); // los pilotos, altos y estrechos
    }
  },
  {
    // El de los dos caballos: cuerpo estrecho, aletas sueltas, el capó
    // acanalado y el techo de lona, enrollable, hasta la cola.
    id: 'patito',
    mide: 20.2,
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
    // El tiburón: el más largo de todos, casi tres veces su anchura, así que
    // aquí es el más estrecho. Morro ancho y redondo, con los faros en las
    // esquinas; la cola se afila, las ruedas de atrás van tapadas, y el techo
    // es claro, con los intermitentes en las esquinas de atrás.
    id: 'tiburon',
    mide: 2 * L,
    ejes: [6.5, -6.5],
    via: 3.5,
    silueta() {
      simetrico([[L, 1.6], [10.4, 3], [8.6, 3.95], [5, 4.2], [-5, 4.2], [-8.6, 3.6], [-10.6, 2.6], [-L, 1.6]]);
    },
    detalles() {
      rayas('rgba(0, 0, 0, 0.2)', 4, 10, [-1.1, 1.1], 0.3);   // el capó, largo
      rellenar(CRISTAL, () => simetrico([[3.4, 3.3], [1, 3.8]]));
      rellenar('#ecebe2', () => caja(-6.2, 1, -3.7, 3.7, 1.4));
      rellenar(CRISTAL, () => simetrico([[-6.2, 3.4], [-8.4, 2.5]]));
      luces('#e8913a', -5.9, 3.3, 0.35);   // los intermitentes del techo
      luces(FARO, 10.1, 2.9, 0.55, 0.75);
      luces(PILOTO, -10.6, 2.2, 0.3, 0.6);
    }
  },
  {
    // El escarabajo: una burbuja con cuatro aletas redondas a los lados.
    id: 'escarabajo',
    mide: 20.6,
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
    // El Cinquecenti (id `bambino`): el más corto y redondo, con la lona en el
    // techo y la rejilla del motor detrás.
    id: 'bambino',
    mide: 17.2,
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
    // El monovolumen: un solo volumen. Sin capó: el parabrisas arranca casi en
    // el morro, redondo y corto, con los faros rasgados en las esquinas. Los
    // retrovisores, las barras del techo y la cola recta.
    id: 'monovolumen',
    mide: 2 * L,
    ejes: [6.8, -6.8],
    silueta() {
      ctx.moveTo(-L, -A + 1);
      ctx.quadraticCurveTo(-L, -A, -L + 1, -A);
      ctx.lineTo(6, -A);
      ctx.bezierCurveTo(9.4, -A, L, -3.4, L, 0);
      ctx.bezierCurveTo(L, 3.4, 9.4, A, 6, A);
      ctx.lineTo(-L + 1, A);
      ctx.quadraticCurveTo(-L, A, -L, A - 1);
      ctx.closePath();
      caja(3.4, 4.8, -A - 0.9, A + 0.9, 0.5);   // los retrovisores
    },
    detalles(techo) {
      rellenar(CRISTAL, () => {                 // el parabrisas, hasta el morro
        ctx.moveTo(2.4, -4.8);
        ctx.lineTo(6, -4.8);
        ctx.bezierCurveTo(8.2, -4.6, 9.2, -2.6, 9.2, 0);
        ctx.bezierCurveTo(9.2, 2.6, 8.2, 4.6, 6, 4.8);
        ctx.lineTo(2.4, 4.8);
        ctx.closePath();
      });
      rellenar(techo, () => caja(-10.2, 2.4, -4.6, 4.6, 1.2));
      rayas('rgba(0, 0, 0, 0.35)', -9.4, 1.4, [-3.7, 3.7], 0.5);   // las barras
      rellenar(CRISTAL, () => caja(-10.8, -10.2, -4, 4, 0.3));    // la luna de atrás, de canto
      rellenar(FARO, () => {                    // los faros, rasgados en las esquinas
        for (const lado of [-1, 1]) {
          ctx.moveTo(9.4, lado * 4.6);
          ctx.quadraticCurveTo(10.5, lado * 3.4, 10.7, lado * 1.9);
          ctx.lineTo(10.2, lado * 2.2);
          ctx.quadraticCurveTo(9.8, lado * 3.6, 8.6, lado * 4.8);
          ctx.closePath();
        }
      });
      luces(PILOTO, -L + 0.3, 4.4, 0.3, 0.9);
    }
  },
  {
    // El de Race Panic: la caja entera, el de siempre.
    id: 'clasico',
    mide: 2 * L,
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
  ctx.scale(escala(m), escala(m));
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
  ctx.scale(escala(m), escala(m));
  rellenar(color, () => m.silueta());
  ctx.restore();
}
