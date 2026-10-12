/*
 * Slot Panic — el núcleo: coches enganchados a un carril.
 *
 * El carril es el eje del circuito desplazado `lateral` px a un lado. Un coche
 * enganchado no tiene posición propia: solo `s` (la del eje) y velocidad; dónde
 * está y hacia dónde mira sale del carril. No hay volante ni freno: se aprieta
 * o se suelta, y soltar frena.
 *
 * Si la aceleración lateral en el carril (v² / radio del carril) pasa de
 * AGARRE_SLOT, el coche derrapa: la cola sale y pierde velocidad. Si sigue
 * pasado (el derrape se acumula hasta 1) o entra muy pasado (LIMITE_SLOT), se
 * sale: sigue por la tangente dando vueltas sobre la mesa hasta pararse, y una
 * «mano» lo devuelve al carril en la `s` donde se salió, parado. El carril de dentro de una curva es más corto pero más
 * cerrado: se recorre antes y se sale antes.
 *
 * Las piezas especiales (`piezas.js`) cambian eso donde están: el peralte
 * agarra más, la curva de derrape aguanta más pasado (y la deslizante, aún
 * más), los baches agarran como una curva, en la X el carril cruza al otro
 * lado y en la estrecha se acerca al otro. Dos coches que se encuentran en una
 * X, en un cruce o a la par en una estrecha chocan: el golpe se suma al
 * derrape y, según cómo y dónde se den, siguen los dos, se sale uno o los dos.
 * Uno que se sale puede llevarse por delante al otro.
 *
 * Los mandos siguen siendo `{ acelerar, frenar, giro }`: aquí solo cuenta
 * `acelerar`. No toca el DOM: el arnés lo ejecuta tal cual.
 */

import {
  ACUMULA_DERRAPE, AGARRE_PERALTE, AGARRE_SLOT, RADIO_GUIA, ALTO, ANCHO, ANCHO_COCHE, BAJA_POTENCIA, CARRIL,
  COCHE_REFERENCIA, COCHES, COLETEO_DERRAPE, ELEVA_COCHE, GRAVEDAD, COLETEO_DESDE, COLETEO_MAXIMO, CUENTA_ATRAS, CURVA_DERRAPE, CURVA_DESLIZANTE, DURACION_MANO, ESPERA_MANO,
  FRENO_BACHES, FRENO_DERRAPE_SLOT, FRENO_MESA, FUERA_MAXIMO, GIRO_TROMPO, GOLPE_SALE, INERCIA_MOTOR, INERCIA_SOLTAR, LIMITE_SLOT, PALANCA_MORRO, PASO_BACHES, PASO_FISICA,
  PENETRA, REBOTE_COCHES, RECUPERA_DERRAPE, ROCE, ROZA, SUBE_POTENCIA, TOQUE, VELOCIDAD_BACHES, VELOCIDAD_SLOT, VUELTAS_SLOT
} from '../config.js';
import { normalizarAngulo } from './geometria.js';
import { cerrar, cocheDe, crearGrabacion, grabar } from './fantasma.js';

const DESPLAZAMIENTO_SALIDA = 0.3;  // fracción de la velocidad que sale hacia fuera al soltarse
const QUIETO = 12;                  // px/s por debajo de los que el coche se da por parado en la mesa
const AMORTIGUA_TROMPO = 2.5;       // 1/s con que se apaga el trompo
const REBOTE_MESA = 0.5;            // fracción de la velocidad que vuelve del borde de la mesa
const ATRAS_SALIDA = 30;            // px detrás de la meta en que se sale, como en carretera
const HOLGURA_CHOQUE = 8;           // px de separación a la que dos coches siguen «tocándose»

// --- El carril ---------------------------------------------------------------

/*
 * Los dos carriles, por el lado -1 y el +1 del eje. No son iguales: casi
 * todas las curvas de La horquilla giran al mismo lado, y con el mismo
 * piloto uno saca un 3-4 % al otro. Como en el juguete, los coches se cambian
 * de carril en cada carrera (`turno`).
 */
export const CARRILES = [-CARRIL, CARRIL];

/*
 * Dónde va de verdad el carril de un coche. `slot.lateral` es su carril al
 * salir de la meta; en una X el carril cruza al otro lado (`punto.carril`
 * pasa de 1 a -1) y, si hay un número impar de X, cada vuelta empieza por el
 * otro carril.
 */
function signoVuelta(circuito, s) {
  if (circuito.cambiosCarril % 2 === 0) return 1;
  return Math.abs(Math.floor(s / circuito.largo)) % 2 ? -1 : 1;
}

/** El carril (0 o 1, el índice de CARRILES) por el que va un coche en la coordenada `s`. */
export function carrilEn(circuito, lateral, s) {
  return lateral * signoVuelta(circuito, s) < 0 ? 0 : 1;
}

/*
 * El desplazamiento de un carril en un punto del eje: `propio`, el lateral del
 * carril (CARRILES), por el factor de la pieza, más lo que el desvío lleva los
 * dos carriles de lado.
 */
function desplazamiento(punto, propio) {
  return punto.centro + propio * punto.carril;
}

/** El desplazamiento del carril en la coordenada `s` de un coche que salió por `lateral`. */
export function lateralEn(circuito, lateral, s) {
  return desplazamiento(circuito.eje[buscar(circuito, s).indice], lateral * signoVuelta(circuito, s));
}

/** Radio del carril en un punto del eje, con su desplazamiento ahí: por dentro de la curva, más cerrado. */
export function radioCarril(punto, lateral) {
  return punto.radio === Infinity ? Infinity : punto.radio - punto.curva * lateral;
}

const RADIO_BACHES = VELOCIDAD_BACHES * VELOCIDAD_BACHES / AGARRE_SLOT;

/*
 * El radio con el que se mide el agarre: la guía sujeta más en las cerradas,
 * el peralte agarra más, los baches agarran como una curva y en el desvío
 * cuenta lo que se quiebra el carril. Infinity: ahí no hay límite.
 */
export function radioAgarre(punto, lateral) {
  if (punto.efecto === 'baches') return RADIO_BACHES;
  const radio = punto.efecto === 'desvio' ? punto.radioDesvio : radioCarril(punto, lateral);
  if (radio === Infinity) return Infinity;
  return Math.max(RADIO_GUIA, radio) * (punto.efecto === 'peralte' ? AGARRE_PERALTE : 1);
}

const trazados = new WeakMap();

/*
 * El carril como polilínea, un punto por punto del eje, desplazado por la
 * bisectriz de los dos tramos que se unen en él: así las juntas de las curvas
 * no hacen escalón. Se calcula una vez por circuito y carril.
 */
export function trazadoCarril(circuito, lateral) {
  if (!trazados.has(circuito)) trazados.set(circuito, new Map());
  const porCarril = trazados.get(circuito);
  if (!porCarril.has(lateral)) {
    const { eje } = circuito;
    const n = eje.length;
    porCarril.set(lateral, eje.map((p, i) => {
      const anterior = eje[(i - 1 + n) % n];
      const medio = anterior.angulo + normalizarAngulo(p.angulo - anterior.angulo) / 2;
      const d = desplazamiento(p, lateral) / Math.cos(normalizarAngulo(p.angulo - anterior.angulo) / 2);
      return { x: p.x - Math.sin(medio) * d, y: p.y + Math.cos(medio) * d };
    }));
  }
  return porCarril.get(lateral);
}

/** Lo que mide la primera vuelta por el carril (con un número impar de X, la segunda es la del otro). */
export function largoCarril(circuito, lateral) {
  return circuito.eje.reduce((total, p, i) => total + p.largo * factorCarril(circuito, i, lateral), 0);
}

/*
 * px de carril por px de eje: menos de 1 por dentro de las curvas, y algo más
 * de 1 donde el carril se mueve de lado (la X, la estrecha, el desvío), que lo
 * recorre en diagonal. `propio` es el lateral del carril (CARRILES).
 */
function factorCarril(circuito, i, propio) {
  const p = circuito.eje[i];
  if (p.radio !== Infinity) return radioCarril(p, desplazamiento(p, propio)) / p.radio;
  if (p.tipo !== 'x' && p.efecto !== 'estrecha' && p.efecto !== 'desvio') return 1;
  const siguiente = circuito.eje[(i + 1) % circuito.eje.length];
  const cambio = Math.abs(desplazamiento(siguiente, propio) - desplazamiento(p, propio));
  return Math.hypot(1, cambio / p.largo);
}

/** Índice del punto del eje en que cae `s` y la fracción hasta el siguiente. */
function buscar(circuito, s) {
  const { eje, largo } = circuito;
  const buscada = ((s % largo) + largo) % largo;
  let bajo = 0, alto = eje.length - 1;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (eje[medio].s <= buscada) bajo = medio; else alto = medio - 1;
  }
  const a = eje[bajo];
  return { indice: bajo, t: a.largo > 0 ? (buscada - a.s) / a.largo : 0 };
}

/** Posición y rumbo sobre el carril en la coordenada `s` del eje. */
export function poseEnCarril(circuito, s, lateral) {
  const propio = lateral * signoVuelta(circuito, s);
  const trazado = trazadoCarril(circuito, propio);
  const { indice, t } = buscar(circuito, s);
  // El último tramo de la vuelta acaba en el primer punto de la siguiente.
  const b = indice + 1 < trazado.length
    ? trazado[indice + 1]
    : trazadoCarril(circuito, propio * (circuito.cambiosCarril % 2 ? -1 : 1))[0];
  const a = trazado[indice];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angulo: Math.atan2(b.y - a.y, b.x - a.x) };
}

// --- La carrera ----------------------------------------------------------------

function crearSlot(circuito, lateral, color, modelo) {
  const slot = {
    lateral,
    modelo: COCHE_REFERENCIA,
    ficha: COCHES[COCHE_REFERENCIA],   // su largo y su carácter (COCHES, en config.js)
    estado: 'carril',   // 'carril' | 'fuera' | 'mano'
    s: circuito.largo - ATRAS_SALIDA,
    progreso: -ATRAS_SALIDA, // la s desenrollada: crece vuelta tras vuelta
    v: 0,
    potencia: 0,        // [0, 1]: sube pulsando, baja soltando
    exigencia: 0,       // aceleración lateral sobre el agarre (pasado 1, derrapa)
    derrape: 0,         // [0, 1]: lo acumulado derrapando; en 1 se sale
    coleteo: 0,         // rad de cola fuera
    // La pose y lo que necesita el dibujo: el mismo formato que el coche de carretera.
    coche: { x: 0, y: 0, angulo: 0, vx: 0, vy: 0, color, frenando: false, atras: false },
    giro: 0,            // rad/s de trompo, fuera del carril
    tFuera: 0, tQuieto: 0, tMano: 0,
    desde: null,        // la pose en que la mano lo recoge
    altura: 0,          // [0, 1]: levantado por la mano, o botando en los baches (para el dibujo)
    posado: false,      // la mano lo ha dejado en este paso: no empieza a tocarse con nadie
    completadas: 0,
    vueltas: [],
    inicioVuelta: 0,
    // Cada vuelta se graba (nucleo/fantasma.js): la que va en curso y las
    // acabadas, con su tiempo, cuándo empezó y por qué carril.
    grabacion: crearGrabacion(),
    grabadas: [],
    carrilVuelta: 0,
    salidas: 0,         // veces que se ha salido
    terminado: null     // s de carrera al completar la última vuelta
  };
  ponerModelo(slot, modelo);
  colocarEnCarril(slot, circuito);
  slot.carrilVuelta = carrilEn(circuito, lateral, slot.s + ATRAS_SALIDA);
  return slot;
}

/*
 * El coche de un carril: su modelo decide su largo y su carácter. La portada
 * lo cambia con la exhibición en marcha; un modelo que no existe es el de
 * siempre.
 */
export function ponerModelo(slot, id) {
  slot.modelo = cocheDe(id);
  slot.ficha = COCHES[slot.modelo];
  slot.coche.modelo = slot.modelo;
}

/*
 * `vueltas`: las de la carrera (CARRERAS, en config.js).
 * `modelos`: el de cada coche (COCHES); por defecto, el de siempre.
 * `grabar`: grabar las vueltas (los fantasmas). Lo pide el juego en sus
 * carreras; el arnés, solo donde lo mide (en miles de carreras triplicaba su tiempo).
 */
export function crearCarreraSlot(circuito, colores, turno = 0, { vueltas = VUELTAS_SLOT, grabar: grabarVueltas = false, modelos = [] } = {}) {
  const carrera = {
    circuito,
    vueltas,
    grabar: grabarVueltas,
    // El coche i va por el carril (i + turno) % 2.
    coches: colores.map((color, i) => crearSlot(circuito, CARRILES[(i + turno) % 2], color, modelos[i])),
    fase: 'cuenta',     // 'cuenta' | 'carrera' | 'fin'
    cuenta: CUENTA_ATRAS,
    tiempo: 0,
    tiempoSalida: 0,
    ganador: null,      // índice del primero en terminar
    toque: null,        // si los dos coches se están tocando: { tregua, choque } (ver `comprobarChoque`)
    eventos: []         // { tipo, coche } del último avance: cuenta, salida, sale, clac, bache, vuelta, fin
  };
  // La primera vuelta empieza en la parrilla, parado.
  if (grabarVueltas) for (const slot of carrera.coches) grabar(slot.grabacion, slot.coche, 0);
  return carrera;
}

/** Avanza `dt` segundos con los mandos de cada coche, troceados en pasos de física. */
export function avanzarSlot(carrera, mandos, dt) {
  carrera.eventos = [];
  let restante = dt;
  while (restante > 1e-9) {
    const paso = Math.min(restante, PASO_FISICA);
    pasoCarreraSlot(carrera, mandos, paso);
    restante -= paso;
  }
}

function pasoCarreraSlot(carrera, mandos, dt) {
  if (carrera.fase === 'cuenta') {
    const antes = Math.ceil(carrera.cuenta);
    carrera.cuenta -= dt;
    if (carrera.cuenta <= 0) {
      carrera.fase = 'carrera';
      carrera.eventos.push({ tipo: 'salida' });
    } else if (Math.ceil(carrera.cuenta) !== antes) {
      carrera.eventos.push({ tipo: 'cuenta' });
    }
    return;
  }
  if (carrera.fase === 'carrera') {
    carrera.tiempo += dt;
    carrera.tiempoSalida += dt;
  }
  carrera.coches.forEach((slot, i) => {
    // Acabada la carrera, nadie acelera: los coches frenan hasta pararse.
    const acelerar = carrera.fase === 'carrera' && slot.terminado === null && !!mandos[i]?.acelerar;
    const evento = pasoSlot(slot, carrera.circuito, acelerar, dt);
    if (evento === 'bache') carrera.eventos.push({ tipo: evento, coche: i, fuerza: slot.v / VELOCIDAD_BACHES });
    else if (evento) carrera.eventos.push({ tipo: evento, coche: i });
    if (carrera.grabar && carrera.fase === 'carrera' && slot.terminado === null) {
      grabar(slot.grabacion, slot.coche, carrera.tiempo - slot.inicioVuelta);
    }
    if (carrera.fase === 'carrera') contarVueltas(carrera, slot, i);
  });
  if (carrera.coches.length === 2) comprobarChoque(carrera);
}

/*
 * Los choques entre los dos coches (GOLPE_SALE, en config.js). Cada coche es
 * una cápsula en su pose: un segmento a lo largo y RADIO_COCHE alrededor. Al
 * empezar a tocarse acercándose, un golpe; mientras siguen tocándose, el roce.
 * El golpe no decide nada: frena o empuja, y de lado se suma al derrape, que
 * es el que saca al coche. Uno fuera choca con uno en el carril (rebota, y al
 * otro le da su golpe); con la mano en el aire, o los dos fuera, no.
 */
export const RADIO_COCHE = ANCHO_COCHE / 2;

/** La cápsula de un coche: los extremos de su segmento, de la cola al morro. */
export function capsula(slot) {
  const { coche } = slot;
  const medio = Math.max(0, slot.ficha.largo / 2 - RADIO_COCHE);
  const ux = Math.cos(coche.angulo) * medio, uy = Math.sin(coche.angulo) * medio;
  return { ax: coche.x - ux, ay: coche.y - uy, bx: coche.x + ux, by: coche.y + uy };
}

/*
 * Los puntos más cercanos de dos segmentos, como fracciones (0 en la cola, 1
 * en el morro). Si van paralelos, el medio de lo que se solapan: así ninguno
 * de los dos lleva siempre el golpe en la cola.
 */
function masCercanos(p, q) {
  const d1x = p.bx - p.ax, d1y = p.by - p.ay, d2x = q.bx - q.ax, d2y = q.by - q.ay;
  const rx = p.ax - q.ax, ry = p.ay - q.ay;
  const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry;
  const acotar = (v) => Math.max(0, Math.min(1, v));
  const c = d1x * rx + d1y * ry, b = d1x * d2x + d1y * d2y;
  if (a < 1e-9 || e < 1e-9) {
    // Un coche tan corto que es un círculo.
    const s = a < 1e-9 ? 0 : acotar(-c / a);
    return { s, t: e < 1e-9 ? 0 : acotar((b * s + f) / e) };
  }
  const denom = a * e - b * b;
  if (denom < 1e-6 * a * e) {
    // Paralelos: lo que q se solapa con p, y su medio.
    const t0 = -c / a, t1 = (b - c) / a;
    const s = (acotar(Math.min(t0, t1)) + acotar(Math.max(t0, t1))) / 2;
    return { s, t: acotar((b * s + f) / e) };
  }
  let s = acotar((b * f - c * e) / denom);
  let t = (b * s + f) / e;
  if (t < 0) { t = 0; s = acotar(-c / a); } else if (t > 1) { t = 1; s = acotar((b - c) / a); }
  return { s, t };
}

/*
 * Cómo se tocan dos coches: la distancia entre sus cápsulas, la normal (de a
 * hacia b), el punto de cada uno y dónde le da a cada uno, de -1 (la cola) a
 * 1 (el morro).
 */
export function contacto(a, b) {
  const p = capsula(a), q = capsula(b);
  const { s, t } = masCercanos(p, q);
  const pa = { x: p.ax + (p.bx - p.ax) * s, y: p.ay + (p.by - p.ay) * s };
  const pb = { x: q.ax + (q.bx - q.ax) * t, y: q.ay + (q.by - q.ay) * t };
  let nx = pb.x - pa.x, ny = pb.y - pa.y;
  const distancia = Math.hypot(nx, ny);
  if (distancia > 1e-9) {
    nx /= distancia;
    ny /= distancia;
  } else {
    // Uno encima del otro: de centro a centro o, si coinciden, de lado.
    const cx = b.coche.x - a.coche.x, cy = b.coche.y - a.coche.y, l = Math.hypot(cx, cy);
    [nx, ny] = l > 1e-9 ? [cx / l, cy / l] : [-Math.sin(a.coche.angulo), Math.cos(a.coche.angulo)];
  }
  return { distancia, nx, ny, pa, pb, ua: 2 * s - 1, ub: 2 * t - 1 };
}

/** Lo que cuenta un golpe según dónde: en la cola, 1; en el morro, donde la guía lo sujeta, PALANCA_MORRO. */
const palanca = (u) => PALANCA_MORRO + (1 - PALANCA_MORRO) * (1 - u) / 2;

/** La `altura` del dibujo de un coche en el carril por un punto del eje: en el puente, más grande. */
const alturaEn = (p) => p.elevacion * ELEVA_COCHE;

/** A qué altura va un coche: en el carril, la del puente (0 fuera de él); fuera, en la mesa. */
function elevacionDe(slot, circuito) {
  return slot.estado === 'carril' ? circuito.eje[buscar(circuito, slot.s).indice].elevacion : 0;
}

function comprobarChoque(carrera) {
  const [a, b] = carrera.coches;
  const posado = a.posado || b.posado;
  a.posado = b.posado = false;
  // Con la mano en el aire no toca a nadie; dos fuera ruedan cada uno a lo suyo,
  // y uno en el puente pasa por encima del de abajo.
  if (a.estado === 'mano' || b.estado === 'mano' || (a.estado === 'fuera' && b.estado === 'fuera') ||
    Math.abs(elevacionDe(a, carrera.circuito) - elevacionDe(b, carrera.circuito)) > 0.5) {
    carrera.toque = null;
    return;
  }
  const c = contacto(a, b);
  const toca = 2 * RADIO_COCHE - c.distancia;   // px metidos uno en el otro
  /*
   * Dejan de tocarse al separarse algo más de lo que hace falta para tocarse:
   * la mano puede dejarlos casi tocándose en una X, y al arrancar los
   * carriles los juntaban y volvían a chocar (lo vio el arnés en una X corta
   * del constructor). Menos que lo que queda entre dos coches en paralelo.
   */
  if (toca <= -HOLGURA_CHOQUE || (toca <= 0 && !carrera.toque)) {
    carrera.toque = null;
    return;
  }
  const empiezan = !carrera.toque && toca > 0;
  if (empiezan) carrera.toque = { tregua: false, choque: false };
  /*
   * Lo que la mano acaba de posar ya estaba ahí: en una estrecha puede dejarlo
   * a la par del otro, que ya ha arrancado y se le acerca (lo vio el arnés en
   * la estrecha larga de El resbalón), y en una X, encima del otro. Hasta que
   * se separen, ni se chocan ni se rozan.
   */
  if (posado) carrera.toque.tregua = true;
  if (carrera.toque.tregua || toca <= 0) return;

  const acercan = (a.coche.vx - b.coche.vx) * c.nx + (a.coche.vy - b.coche.vy) * c.ny;
  const arrolla = a.estado === 'fuera' || b.estado === 'fuera';
  const chocan = () => {
    carrera.toque.choque = true;
    carrera.eventos.push({
      tipo: 'choque', coche: 0, x: (c.pa.x + c.pb.x) / 2, y: (c.pa.y + c.pb.y) / 2,
      fuerza: Math.min(1, Math.max(0, acercan) / VELOCIDAD_SLOT), arrolla
    });
  };
  if (arrolla) {
    // El de fuera no tiene carril que lo sujete: se aparta del otro.
    const [libre, signo] = a.estado === 'fuera' ? [a, -1] : [b, 1];
    libre.coche.x += signo * c.nx * toca;
    libre.coche.y += signo * c.ny * toca;
  }
  // Un golpe al empezar a tocarse o, si uno va suelto, cada vez que se le echa encima.
  if (acercan > 0 && (empiezan || arrolla)) {
    if (empiezan && acercan >= TOQUE) chocan();
    const reparto = acercan * (1 + REBOTE_COCHES) / 2;
    golpear(carrera, 0, -reparto * c.nx, -reparto * c.ny, c.pa, c.ua);
    golpear(carrera, 1, reparto * c.nx, reparto * c.ny, c.pb, c.ub);
    return;
  }
  if (arrolla) return;
  /*
   * Los dos en el carril y metidos más de medio coche uno en el otro (en una X
   * o un cruce, donde los carriles se cortan): ninguno puede seguir y salen
   * los dos, cada uno hacia su lado. Si no, se rozan.
   */
  if (toca > RADIO_COCHE) {
    if (!carrera.toque.choque) chocan();
    [[a, 1], [b, -1]].forEach(([slot, signo], i) => {
      const rumbo = slot.coche.angulo - slot.coleteo;
      const lado = (-Math.sin(rumbo) * c.nx + Math.cos(rumbo) * c.ny) * signo;
      soltar(slot, lado > 0 ? 1 : -1);
      carrera.eventos.push({ tipo: 'sale', coche: i });
    });
    return;
  }
  rozar(carrera, c, toca, acercan);
}

/*
 * El golpe a un coche: (gx, gy), lo que cambia su velocidad. Uno fuera lo
 * toma tal cual y gira según dónde le den. Uno en el carril: a lo largo, su
 * velocidad; de lado, el derrape (con la palanca de dónde le dan) y la cola,
 * que sale hacia donde la empujan. Si el derrape llega a 1, se sale por ahí.
 */
function golpear(carrera, i, gx, gy, punto, u) {
  const slot = carrera.coches[i];
  const { coche } = slot;
  if (slot.estado === 'fuera') {
    coche.vx += gx;
    coche.vy += gy;
    const rx = punto.x - coche.x, ry = punto.y - coche.y;
    slot.giro += (rx * gy - ry * gx) / (slot.ficha.largo * slot.ficha.largo / 3);
    return;
  }
  const rumbo = coche.angulo - slot.coleteo;
  const hx = Math.cos(rumbo), hy = Math.sin(rumbo);
  const lado = -hy * gx + hx * gy;   // hacia la izquierda del coche: la normal de `soltar`
  slot.v = Math.max(0, slot.v + hx * gx + hy * gy);
  const efecto = Math.abs(lado) * palanca(u) / GOLPE_SALE;
  slot.derrape = Math.min(1, slot.derrape + efecto);
  // Empujada la cola hacia la izquierda, el coche mira a la derecha.
  const sacudida = Math.sign(lado) * Math.min(1, efecto) * COLETEO_DERRAPE;
  slot.coleteo -= sacudida;
  coche.angulo -= sacudida;
  if (slot.derrape < 1) return;
  soltar(slot, lado > 0 ? -1 : 1);
  // Y sale con el empujón de lado.
  coche.vx -= hy * lado;
  coche.vy += hx * lado;
  carrera.eventos.push({ tipo: 'sale', coche: i });
}

/*
 * El roce, mientras siguen tocándose en el carril. Ninguno se mete más en el
 * otro a lo largo de su carril: si aún se acercan, el que empuja frena (y el
 * empujado gana). Una cola metida en el otro rebota hacia fuera: si no, la
 * de dentro de una curva deslizante, que sale hacia el de fuera, se le metía
 * cada vez más. Y cada uno suma derrape, más cuanto más aprieta (deprisa o a
 * fondo), más metidos están y más de lado lo empuja, con su palanca; sus
 * velocidades se igualan. El derrape se recupera a RECUPERA_DERRAPE: un roce
 * suave no saca a nadie.
 */
function rozar(carrera, c, toca, acercan) {
  const [a, b] = carrera.coches;
  if (acercan > 0) {
    // Sin rebote y sin derrape: solo lo que se metían.
    [[a, -1], [b, 1]].forEach(([slot, signo]) => {
      const rumbo = slot.coche.angulo - slot.coleteo;
      const largo = Math.cos(rumbo) * c.nx + Math.sin(rumbo) * c.ny;
      slot.v = Math.max(0, slot.v + signo * largo * acercan / 2);
    });
  }
  const relativa = Math.abs(a.v - b.v);
  [[a, c.ua, -1], [b, c.ub, 1]].forEach(([slot, u, signo], i) => {
    const { coche, ficha } = slot;
    const rumbo = coche.angulo - slot.coleteo;
    const lx = -Math.sin(coche.angulo), ly = Math.cos(coche.angulo);
    const deLado = lx * c.nx + ly * c.ny;
    // La cola: girar dθ la mueve -u · medio · dθ por la izquierda del coche (u < 0).
    const medio = ficha.largo / 2 - RADIO_COCHE;
    if (u < 0 && Math.abs(u * deLado) * medio > 1) {
      // Hacia fuera del otro: a se aparta por -n y b por +n.
      const giro = Math.min(0.05, toca / (Math.abs(u * deLado) * medio)) * Math.sign(-signo * deLado * u) * -1;
      slot.coleteo += giro;
      coche.angulo += giro;
    }
    const aprieta = Math.min(1, Math.max((slot.v + relativa) / VELOCIDAD_SLOT, slot.potencia));
    const empuje = Math.abs(-Math.sin(rumbo) * c.nx + Math.cos(rumbo) * c.ny);
    slot.derrape = Math.min(1, slot.derrape + ROCE * palanca(u) * aprieta * empuje * (toca / PENETRA) * PASO_FISICA);
    if (slot.derrape < 1) return;
    soltar(slot, slot.coleteo > 0 ? 1 : -1);
    carrera.eventos.push({ tipo: 'sale', coche: i });
  });
  if (a.estado === 'carril' && b.estado === 'carril') {
    const media = (a.v + b.v) / 2, f = Math.min(1, ROZA * PASO_FISICA);
    a.v += (media - a.v) * f;
    b.v += (media - b.v) * f;
  }
}

const ANCHAS = { derrape: CURVA_DERRAPE, deslizante: CURVA_DESLIZANTE };

/** Un paso de un coche. Devuelve 'sale' o 'clac' si se ha salido o ha vuelto al carril, y 'bache' en cada uno. */
function pasoSlot(slot, circuito, acelerar, dt) {
  if (slot.estado === 'fuera') return pasoFuera(slot, dt);
  if (slot.estado === 'mano') return pasoMano(slot, circuito, dt);

  // La potencia sigue al dedo con retraso. El motor lleva el coche hacia la
  // velocidad que pide, con inercia; por encima, rueda y se frena poco a poco.
  // Cuánto corre, cuánto tarda y cuánto agarra, los de su modelo.
  const { ficha } = slot;
  slot.potencia += ((acelerar ? 1 : 0) - slot.potencia) * dt / (acelerar ? SUBE_POTENCIA : BAJA_POTENCIA);
  const pide = slot.potencia * VELOCIDAD_SLOT * ficha.punta;
  slot.v += (pide - slot.v) * dt / (pide > slot.v ? INERCIA_MOTOR / ficha.acelera : INERCIA_SOLTAR);
  slot.coche.frenando = pide < slot.v - 40;

  const { indice } = buscar(circuito, slot.s);
  const p = circuito.eje[indice];
  // En la rampa del puente, la gravedad: frena al subir y empuja al bajar.
  if (p.pendiente) slot.v = Math.max(0, slot.v - GRAVEDAD * p.pendiente * dt);
  const lateral = lateralEn(circuito, slot.lateral, slot.s);
  const radio = radioAgarre(p, lateral);
  slot.exigencia = radio === Infinity ? 0 : slot.v * slot.v / radio / (AGARRE_SLOT * ficha.agarre);
  // En las curvas de derrape y deslizante se aguanta más pasado.
  const ancha = ANCHAS[p.efecto] || null;
  // Pasado el agarre, derrapa: pierde velocidad y el derrape se acumula (en
  // la deslizante, solo pasado lo que tolera). Sin pasarse, se recupera.
  const exceso = slot.exigencia - 1;
  const acumula = exceso - (ancha ? ancha.tolera : 0);
  if (exceso > 0) slot.v *= Math.exp(-FRENO_DERRAPE_SLOT * (ancha ? ancha.freno : 1) * exceso * dt);
  if (acumula > 0) {
    slot.derrape = Math.min(1, slot.derrape + ACUMULA_DERRAPE * (ancha ? ancha.acumula : 1) * acumula * dt);
  } else {
    slot.derrape = Math.max(0, slot.derrape - RECUPERA_DERRAPE * dt);
  }
  // Los baches frenan, más cuanto más rápido, y el coche bota en cada uno.
  const baches = p.efecto === 'baches';
  if (baches) slot.v *= Math.exp(-FRENO_BACHES * Math.min(1.5, slot.v / VELOCIDAD_BACHES) * dt);
  // Avanza por el carril: por dentro de una curva, más `s` por cada px.
  const ds = slot.v * dt / factorCarril(circuito, indice, slot.lateral * signoVuelta(circuito, slot.s));
  const bache = baches && Math.floor((slot.s + ds) / PASO_BACHES) !== Math.floor(slot.s / PASO_BACHES);
  slot.s += ds;
  slot.progreso += ds;
  slot.altura = baches
    ? 0.12 * Math.min(1, slot.v / VELOCIDAD_BACHES) * Math.abs(Math.sin(Math.PI * slot.s / PASO_BACHES))
    : alturaEn(p);

  // La cola sale hacia fuera al acercarse al límite, y más derrapando: el
  // aviso de que viene. En las rectas vuelve a su sitio.
  const cerca = Math.max(0, Math.min(1, (slot.exigencia - COLETEO_DESDE) / (1 - COLETEO_DESDE)));
  // En los baches la cola va de un lado a otro.
  const hacia = p.curva || p.giroDesvio || (baches ? (Math.floor(slot.s / PASO_BACHES) % 2 ? 1 : -1) : Math.sign(slot.coleteo));
  const objetivo = (cerca * COLETEO_MAXIMO + slot.derrape * COLETEO_DERRAPE) * (ancha ? ancha.coleteo : 1) * hacia;
  slot.coleteo += (objetivo - slot.coleteo) * Math.min(1, 10 * dt);
  colocarEnCarril(slot, circuito);

  if (slot.derrape >= 1 || slot.exigencia > LIMITE_SLOT * (ancha ? ancha.limite : 1)) {
    soltar(slot, hacia || 1);
    return 'sale';
  }
  return bache ? 'bache' : null;
}

/** La pose sale del carril, con la cola fuera que diga el coleteo. */
function colocarEnCarril(slot, circuito) {
  const pose = poseEnCarril(circuito, slot.s, slot.lateral);
  slot.coche.x = pose.x;
  slot.coche.y = pose.y;
  slot.coche.angulo = pose.angulo + slot.coleteo;
  slot.coche.vx = Math.cos(pose.angulo) * slot.v;
  slot.coche.vy = Math.sin(pose.angulo) * slot.v;
}

/*
 * Se sale por la tangente, con algo hacia fuera de la curva, y el trompo gira
 * hacia dentro: la cola, que ya salía, sigue saliendo.
 */
function soltar(slot, curva) {
  const { coche } = slot;
  const rumbo = coche.angulo - slot.coleteo;
  const nx = -Math.sin(rumbo), ny = Math.cos(rumbo);
  coche.vx = Math.cos(rumbo) * slot.v - curva * nx * slot.v * DESPLAZAMIENTO_SALIDA;
  coche.vy = Math.sin(rumbo) * slot.v - curva * ny * slot.v * DESPLAZAMIENTO_SALIDA;
  slot.giro = curva * GIRO_TROMPO * slot.v / VELOCIDAD_SLOT;
  slot.estado = 'fuera';
  slot.tFuera = 0;
  slot.tQuieto = 0;
  slot.v = 0;
  slot.potencia = 0;
  slot.exigencia = 0;
  slot.derrape = 0;
  slot.coleteo = 0;
  slot.altura = 0;
  slot.salidas++;
  coche.frenando = false;
}

function pasoFuera(slot, dt) {
  const { coche } = slot;
  const rapidez = Math.hypot(coche.vx, coche.vy);
  const queda = rapidez > 0 ? Math.max(0, rapidez - FRENO_MESA * dt) / rapidez : 0;
  coche.vx *= queda;
  coche.vy *= queda;
  coche.x += coche.vx * dt;
  coche.y += coche.vy * dt;
  coche.angulo += slot.giro * dt;
  slot.giro *= Math.exp(-AMORTIGUA_TROMPO * dt);

  // El borde de la mesa: rebota hacia dentro.
  const margen = slot.ficha.largo / 2;
  if (coche.x < margen || coche.x > ANCHO - margen) {
    coche.x = Math.max(margen, Math.min(ANCHO - margen, coche.x));
    coche.vx = -coche.vx * REBOTE_MESA;
  }
  if (coche.y < margen || coche.y > ALTO - margen) {
    coche.y = Math.max(margen, Math.min(ALTO - margen, coche.y));
    coche.vy = -coche.vy * REBOTE_MESA;
  }

  slot.tFuera += dt;
  slot.tQuieto = rapidez * queda < QUIETO ? slot.tQuieto + dt : 0;
  if (slot.tQuieto > ESPERA_MANO || slot.tFuera > FUERA_MAXIMO) {
    slot.estado = 'mano';
    slot.tMano = 0;
    slot.desde = { x: coche.x, y: coche.y, angulo: coche.angulo };
    coche.vx = coche.vy = 0;
  }
  return null;
}

/** La mano lo levanta, lo lleva a donde se salió y lo deja en el carril, parado. */
function pasoMano(slot, circuito, dt) {
  slot.tMano += dt;
  const f = Math.min(1, slot.tMano / DURACION_MANO);
  const suave = f * f * (3 - 2 * f);
  const destino = poseEnCarril(circuito, slot.s, slot.lateral);
  const { coche, desde } = slot;
  coche.x = desde.x + (destino.x - desde.x) * suave;
  coche.y = desde.y + (destino.y - desde.y) * suave;
  coche.angulo = desde.angulo + normalizarAngulo(destino.angulo - desde.angulo) * suave;
  slot.altura = Math.sin(Math.PI * f);
  if (f < 1) return null;
  slot.estado = 'carril';
  slot.altura = alturaEn(circuito.eje[buscar(circuito, slot.s).indice]);
  slot.posado = true;
  colocarEnCarril(slot, circuito);
  return 'clac';
}

function contarVueltas(carrera, slot, i) {
  if (slot.terminado !== null) return;
  const completadas = Math.floor(slot.progreso / carrera.circuito.largo);
  if (completadas <= slot.completadas) return;
  slot.completadas = completadas;
  const tiempo = carrera.tiempo - slot.inicioVuelta;
  slot.vueltas.push(tiempo);
  if (carrera.grabar) {
    slot.grabadas.push({ ...cerrar(slot.grabacion, tiempo), inicio: slot.inicioVuelta, carril: slot.carrilVuelta, coche: slot.modelo });
    // La siguiente empieza aquí, a 0 s: sin esta pose, su primera muestra
    // sería la del paso siguiente, 1/120 s tarde (~3 px, lo midió el arnés).
    slot.grabacion = crearGrabacion();
    grabar(slot.grabacion, slot.coche, 0);
  }
  slot.carrilVuelta = carrilEn(carrera.circuito, slot.lateral, slot.s);
  slot.inicioVuelta = carrera.tiempo;
  if (completadas < carrera.vueltas) {
    carrera.eventos.push({ tipo: 'vuelta', coche: i });
    return;
  }
  slot.terminado = carrera.tiempo;
  if (carrera.ganador === null) {
    carrera.ganador = i;
    carrera.fase = 'fin';
    carrera.eventos.push({ tipo: 'fin', coche: i });
  }
}

/** Vuelta en curso de un coche, de 1 a las de la carrera. */
export function vueltaSlot(carrera, slot) {
  return Math.min(slot.completadas + 1, carrera.vueltas);
}

export function mejorVueltaSlot(slot) {
  return slot.vueltas.length ? Math.min(...slot.vueltas) : null;
}

/** Un tiempo como «0:13.71»; sin tiempo, «-:--.--». */
export function formatearTiempo(segundos) {
  if (segundos === null || segundos === undefined) return '-:--.--';
  const minutos = Math.floor(segundos / 60);
  const resto = segundos - minutos * 60;
  const enteros = Math.floor(resto);
  const centesimas = Math.floor((resto - enteros) * 100);
  return `${minutos}:${String(enteros).padStart(2, '0')}.${String(centesimas).padStart(2, '0')}`;
}
