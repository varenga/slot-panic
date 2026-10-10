/*
 * Slot Panic — los coches: la forma de cada modelo, vista desde arriba.
 *
 * Presentación, como luz.js: la física sabe de cada modelo su largo y su
 * carácter (COCHES, en config.js), no su forma, y los choques siguen con la
 * distancia entre centros. Cada uno se pinta con su largo (el morro, a +x), y
 * el ancho sale de su forma. Son caricaturas de juguete sacadas de los planos
 * de _desarrollo/. En escritorio
 * miden de 18 a 27 px y solo se lee lo exagerado (el techo de lona, el morro en
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
 * Los modelos se dibujan de cola a morro en 22 unidades (la caja de Race
 * Panic, 22×11) y se escalan a su largo (COCHES), con la misma escala a lo
 * largo y a lo ancho. El largo sale de las medidas de verdad (config.js) y el
 * ancho de dibujo de cada uno, de su proporción (ancho / largo, en `medidas`),
 * engordada un 15 %, lo mismo a todos: de juguete. Así el tiburón es el más
 * afilado y el Multiplo, el más chato.
 */
const L = 11, A = 5.5;
const escala = (m) => COCHES[m.id].largo / (2 * L);
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

/**
 * Una aleta suelta a cada lado, de x0 a x1 y del eje de `dentro` a `fuera`:
 * las esquinas de fuera, redondeadas (`delante` y `detras`); la de dentro de
 * delante, a medias, y la de dentro de detrás, apenas.
 */
function aletas(x0, x1, dentro, fuera, delante, detras) {
  ctx.roundRect(x0, -fuera, x1 - x0, fuera - dentro, [detras, delante, delante / 2, 0.5]);
  ctx.roundRect(x0, dentro, x1 - x0, fuera - dentro, [0.5, delante / 2, delante, detras]);
}

/*
 * Cada uno con sus medidas de verdad (mm, de largo y de ancho) y la mitad de
 * su ancho de dibujo, que sale de ellas: 11 · ancho / largo · 1,15.
 */
export const MODELOS = [
  {
    // El Multiplo, el monovolumen del escalón (el de 1998): el más ancho para
    // su largo (±5,93). Chato, con el morro redondo y ancho de punta a punta;
    // el capó es un escalón corto delante de un parabrisas enorme, y en sus
    // esquinas, pegados al cristal, la segunda fila de faros, mirando a la
    // carretera; los otros, abajo, en el parachoques: cuatro luces en
    // trapecio. Los retrovisores asoman a la altura del salpicadero, y el
    // techo lleva cuatro nervios. El id sigue siendo `escalon` (los récords y
    // lo elegido se guardan con él).
    id: 'escalon',
    medidas: [3994, 1871],
    ejes: [6.8, -7.6],
    via: 4.8,
    silueta() {
      const h = 5.93;
      ctx.moveTo(-L, -h + 1.4);
      ctx.quadraticCurveTo(-L, -h, -L + 1.6, -h);
      ctx.lineTo(4.4, -h);
      ctx.bezierCurveTo(8.4, -h, L, -4.4, L, 0);
      ctx.bezierCurveTo(L, 4.4, 8.4, h, 4.4, h);
      ctx.lineTo(-L + 1.6, h);
      ctx.quadraticCurveTo(-L, h, -L, h - 1.4);
      ctx.closePath();
      caja(2.6, 3.7, -h - 0.9, h + 0.9, 0.4);   // los retrovisores
    },
    detalles(techo) {
      rellenar(CRISTAL, () => {                  // el parabrisas, enorme y curvo
        ctx.moveTo(1.6, -5.2);
        ctx.lineTo(5.7, -4.5);
        ctx.quadraticCurveTo(7.1, 0, 5.7, 4.5);
        ctx.lineTo(1.6, 5.2);
        ctx.closePath();
      });
      rellenar(techo, () => caja(-9.9, 1.6, -4.95, 4.95, 1.4));
      rayas(CRISTAL, -9.6, 1.4, [-5.35, 5.35], 0.6);                           // las ventanillas, que abomban
      rayas('rgba(0, 0, 0, 0.22)', -8.8, 0.6, [-2.7, -0.9, 0.9, 2.7], 0.3);   // los nervios
      rellenar(CRISTAL, () => caja(-10.7, -9.9, -4.3, 4.3, 0.5));
      // Los faros del escalón, pequeños y pegados al parabrisas, en su cuenca;
      // la lente, en la mitad de delante: miran a la carretera.
      luces('rgba(0, 0, 0, 0.45)', 6.5, 4.3, 0.9, 0.72);
      rellenar(FARO, () => {
        for (const lado of [-1, 1]) {
          ctx.moveTo(6.4, lado * 4.3 - 0.56);
          ctx.ellipse(6.4, lado * 4.3, 0.78, 0.56, 0, -Math.PI / 2, Math.PI / 2);
          ctx.closePath();
        }
      });
      luces(FARO, 9.4, 3.7, 0.5, 0.65);    // y los del parachoques
      rellenar('rgba(0, 0, 0, 0.4)', () => caja(10.4, 10.8, -1.8, 1.8, 0.2));   // la boca
      luces(PILOTO, -10.8, 4.6, 0.32, 0.85); // los pilotos, altos y estrechos
    }
  },
  {
    // El de los dos caballos (±4,85): estrecho, con las cuatro aletas
    // sueltas, las de delante hasta el morro y con los faros encima. Entre
    // ellas, el capó acanalado, que se estrecha hasta la rejilla; detrás del
    // parabrisas, el techo de lona hasta la cola, con su ventanilla de atrás.
    id: 'patito',
    medidas: [3860, 1480],
    ejes: [6.6, -7],
    via: 3.8,
    silueta() {
      caja(-L, 4, -4.1, 4.1, [1.6, 0.4, 0.4, 1.6]);   // la caja, con la cola redonda
      simetrico([[L, 1.4], [10.5, 2.4], [3.4, 3.7]]);  // el capó, en punta
      aletas(3.6, 10.2, 1.8, 4.85, 2.8, 1);            // las aletas de delante
      aletas(-10.2, -4.2, 2.6, 4.75, 2.6, 2.2);        // y las de atrás
    },
    detalles(techo) {
      rayas('rgba(0, 0, 0, 0.26)', 4.4, 10.2, [-1.6, -0.55, 0.55, 1.6], 0.3);
      rellenar('rgba(0, 0, 0, 0.45)', () => caja(10.5, 10.95, -1.3, 1.3, 0.2));   // la rejilla
      rellenar(CRISTAL, () => simetrico([[3.5, 3.4], [2.3, 3.8]]));
      rellenar(techo, () => caja(-9.2, 2.3, -3.8, 3.8, 1.2));
      rellenar(LONA, () => caja(-8.6, 2.3, -3.1, 3.1, 0.8));
      rayas('rgba(255, 255, 255, 0.1)', -6.6, 2.3, [0]);           // la costura
      rellenar(CRISTAL, () => caja(-8.2, -6.8, -2.1, 2.1, 0.5));   // y la ventanilla de atrás, en la lona
      luces(FARO, 9.1, 3.55, 0.75);
      luces(PILOTO, -10.7, 2.9, 0.3, 0.55);
    }
  },
  {
    // El tiburón (±4,68): el más largo de todos y el más afilado. Morro ancho
    // y redondo, con los faros en las esquinas; el capó, larguísimo hasta un
    // parabrisas curvo; la cola se afila, las ruedas de atrás van tapadas, y
    // el techo es claro, con los intermitentes en las esquinas de atrás, sobre
    // una luna que se estrecha.
    id: 'tiburon',
    medidas: [4874, 1803],
    ejes: [6.9, -7.2],
    via: 3.6,
    silueta() {
      simetrico([[L, 1.2], [10.8, 2.3], [10.1, 3.5], [8.7, 4.4], [6.5, 4.68], [0, 4.6],
        [-5, 4.3], [-8.6, 3.9], [-10.5, 3.5], [-L, 2.9]]);
    },
    detalles() {
      rayas('rgba(0, 0, 0, 0.18)', 4.2, 10.2, [-1, 1], 0.3);   // el capó, largo
      rellenar(CRISTAL, () => {                                 // el parabrisas, curvo
        ctx.moveTo(3.3, -3.9);
        ctx.quadraticCurveTo(4.1, 0, 3.3, 3.9);
        ctx.lineTo(1.7, 4.05);
        ctx.quadraticCurveTo(2.4, 0, 1.7, -4.05);
        ctx.closePath();
      });
      rellenar('#ecebe2', () => caja(-6.5, 1.7, -3.85, 3.85, 1.2));
      rellenar(CRISTAL, () => simetrico([[-6.5, 3.4], [-9.6, 2.3]]));
      luces('#e8913a', -6.3, 3.55, 0.35);   // los intermitentes del techo
      luces(FARO, 10.1, 2.7, 0.5, 0.85);
      luces(PILOTO, -10.8, 2.5, 0.25, 0.6);
    }
  },
  {
    // El escarabajo (±4,79): una burbuja con cuatro aletas redondas a los
    // lados.
    id: 'escarabajo',
    medidas: [4070, 1540],
    ejes: [6.7, -6.7],
    via: 3.7,
    silueta() {
      elipse(0, 0, L, 3.45);
      elipse(6.7, -3.1, 3.4, 1.65);
      elipse(6.7, 3.1, 3.4, 1.65);
      elipse(-6.7, -3.25, 3.6, 1.55);
      elipse(-6.7, 3.25, 3.6, 1.55);
    },
    detalles(techo) {
      rayas('rgba(0, 0, 0, 0.22)', 4.9, 10, [0], 0.4);   // el lomo del capó
      rellenar(CRISTAL, () => {                          // el parabrisas, curvo
        ctx.moveTo(4.3, -2.85);
        ctx.quadraticCurveTo(5, 0, 4.3, 2.85);
        ctx.lineTo(2.6, 2.95);
        ctx.quadraticCurveTo(3.2, 0, 2.6, -2.95);
        ctx.closePath();
      });
      rellenar(techo, () => elipse(-1.4, 0, 4.1, 2.75));
      rellenar(CRISTAL, () => caja(-6.4, -5.3, -1.45, 1.45, 0.6));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (const y of [-0.75, 0, 0.75]) rect(-9.2, -7.9, y - 0.15, y + 0.15);   // la rejilla del motor
      luces(FARO, 9, 3.35, 0.7, 0.65);
      luces(PILOTO, -9.4, 3.4, 0.45, 0.55);
    }
  },
  {
    // El Cinquecenti (id `bambino`, ±5,62): el más corto y redondo, con la
    // lona en el techo y la rejilla del motor detrás.
    id: 'bambino',
    medidas: [2970, 1320],
    ejes: [7, -6.3],
    via: 4.9,
    silueta() {
      caja(-L, L, -5.62, 5.62, 5);
    },
    detalles(techo) {
      rellenar(CRISTAL, () => simetrico([[4.9, 4], [2, 4.55]]));
      rellenar(techo, () => caja(-6.4, 2, -4.55, 4.55, 1.6));
      rellenar(LONA, () => caja(-5.2, 2, -2.8, 2.8, 0.9));
      rellenar(CRISTAL, () => caja(-7.5, -6.4, -3.6, 3.6, 0.6));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (const x of [-10, -9.1, -8.2]) rect(x - 0.2, x + 0.2, -2.6, 2.6);   // la rejilla del motor
      rayas('rgba(255, 255, 255, 0.35)', 9.5, 10.5, [-1.4, 1.4], 0.35);       // los bigotes
      luces(FARO, 9.7, 3.9, 0.85);
      luces(PILOTO, -10.5, 4, 0.4, 0.75);
    }
  },
  {
    // El monovolumen (±4,85): un solo volumen. Sin capó: el parabrisas
    // arranca casi en el morro, redondo y corto, con los faros rasgados en las
    // esquinas. Los retrovisores, las barras del techo y la cola recta.
    id: 'monovolumen',
    medidas: [4856, 1860],
    ejes: [6.8, -6.8],
    via: 4.1,
    silueta() {
      const h = 4.85;
      ctx.moveTo(-L, -h + 1);
      ctx.quadraticCurveTo(-L, -h, -L + 1, -h);
      ctx.lineTo(6, -h);
      ctx.bezierCurveTo(9.4, -h, L, -3, L, 0);
      ctx.bezierCurveTo(L, 3, 9.4, h, 6, h);
      ctx.lineTo(-L + 1, h);
      ctx.quadraticCurveTo(-L, h, -L, h - 1);
      ctx.closePath();
      caja(3.4, 4.8, -h - 0.9, h + 0.9, 0.5);   // los retrovisores
    },
    detalles(techo) {
      rellenar(CRISTAL, () => {                 // el parabrisas, hasta el morro
        ctx.moveTo(2.4, -4.2);
        ctx.lineTo(6, -4.2);
        ctx.bezierCurveTo(8.2, -4, 9.2, -2.3, 9.2, 0);
        ctx.bezierCurveTo(9.2, 2.3, 8.2, 4, 6, 4.2);
        ctx.lineTo(2.4, 4.2);
        ctx.closePath();
      });
      rellenar(techo, () => caja(-10.2, 2.4, -4, 4, 1.2));
      rayas('rgba(0, 0, 0, 0.35)', -9.4, 1.4, [-3.2, 3.2], 0.5);   // las barras
      rellenar(CRISTAL, () => caja(-10.8, -10.2, -3.5, 3.5, 0.3));    // la luna de atrás, de canto
      rellenar(FARO, () => {                    // los faros, rasgados en las esquinas
        for (const lado of [-1, 1]) {
          ctx.moveTo(9.4, lado * 4.05);
          ctx.quadraticCurveTo(10.5, lado * 3, 10.7, lado * 1.7);
          ctx.lineTo(10.2, lado * 1.95);
          ctx.quadraticCurveTo(9.8, lado * 3.2, 8.6, lado * 4.2);
          ctx.closePath();
        }
      });
      luces(PILOTO, -L + 0.3, 3.9, 0.3, 0.8);
    }
  },
  {
    // El de Race Panic: la caja entera, el de siempre. No es de verdad: no
    // tiene medidas.
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
