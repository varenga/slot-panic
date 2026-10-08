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
 * X, en un cruce o a la par en una estrecha chocan y salen los dos.
 *
 * Los mandos siguen siendo `{ acelerar, frenar, giro }`: aquí solo cuenta
 * `acelerar`. No toca el DOM: el arnés lo ejecuta tal cual.
 */

import {
  ACUMULA_DERRAPE, AGARRE_PERALTE, AGARRE_SLOT, RADIO_GUIA, ALTO, ANCHO, BAJA_POTENCIA, CARRIL, CHOQUE,
  COLETEO_DERRAPE, COLETEO_DESDE, COLETEO_MAXIMO, CUENTA_ATRAS, CURVA_DERRAPE, CURVA_DESLIZANTE, DURACION_MANO, ESPERA_MANO,
  FRENO_DERRAPE_SLOT, FRENO_MESA, FUERA_MAXIMO, GIRO_TROMPO, INERCIA_MOTOR, INERCIA_SOLTAR, LARGO_COCHE, LIMITE_SLOT, PASO_FISICA, RECUPERA_DERRAPE,
  SUBE_POTENCIA, VELOCIDAD_BACHES, VELOCIDAD_SLOT, VUELTAS_SLOT
} from '../config.js';
import { normalizarAngulo } from './geometria.js';
import { cerrar, crearGrabacion, grabar } from './fantasma.js';

const DESPLAZAMIENTO_SALIDA = 0.3;  // fracción de la velocidad que sale hacia fuera al soltarse
const QUIETO = 12;                  // px/s por debajo de los que el coche se da por parado en la mesa
const AMORTIGUA_TROMPO = 2.5;       // 1/s con que se apaga el trompo
const REBOTE_MESA = 0.5;            // fracción de la velocidad que vuelve del borde de la mesa
const ATRAS_SALIDA = 30;            // px detrás de la meta en que se sale, como en carretera
const HOLGURA_CHOQUE = 8;           // px más allá de CHOQUE en que dos coches siguen tocándose

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

/** El desplazamiento del carril en la coordenada `s` de un coche que salió por `lateral`. */
export function lateralEn(circuito, lateral, s) {
  return lateral * signoVuelta(circuito, s) * circuito.eje[buscar(circuito, s).indice].carril;
}

/** Radio del carril en un punto del eje, con su desplazamiento ahí: por dentro de la curva, más cerrado. */
export function radioCarril(punto, lateral) {
  return punto.radio === Infinity ? Infinity : punto.radio - punto.curva * lateral;
}

const RADIO_BACHES = VELOCIDAD_BACHES * VELOCIDAD_BACHES / AGARRE_SLOT;

/*
 * El radio con el que se mide el agarre: la guía sujeta más en las cerradas,
 * el peralte agarra más y los baches agarran como una curva. Infinity: ahí no
 * hay límite.
 */
export function radioAgarre(punto, lateral) {
  if (punto.efecto === 'baches') return RADIO_BACHES;
  const radio = radioCarril(punto, lateral);
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
      const d = lateral * p.carril / Math.cos(normalizarAngulo(p.angulo - anterior.angulo) / 2);
      return { x: p.x - Math.sin(medio) * d, y: p.y + Math.cos(medio) * d };
    }));
  }
  return porCarril.get(lateral);
}

/** Lo que mide la primera vuelta por el carril (con un número impar de X, la segunda es la del otro). */
export function largoCarril(circuito, lateral) {
  return circuito.eje.reduce((total, p, i) => total + p.largo * factorCarril(circuito, i, lateral * p.carril), 0);
}

/*
 * px de carril por px de eje: menos de 1 por dentro de las curvas, y algo más
 * de 1 donde el carril se mueve de lado (la X, la estrecha), que lo recorre
 * en diagonal. `lateral` es el desplazamiento en ese punto.
 */
function factorCarril(circuito, i, lateral) {
  const p = circuito.eje[i];
  if (p.radio !== Infinity) return radioCarril(p, lateral) / p.radio;
  if (p.tipo !== 'x' && p.efecto !== 'estrecha') return 1;
  const siguiente = circuito.eje[(i + 1) % circuito.eje.length];
  const cambio = Math.abs(lateral) * Math.abs(siguiente.carril - p.carril);
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

function crearSlot(circuito, lateral, color) {
  const slot = {
    lateral,
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
    altura: 0,          // [0, 1]: levantado por la mano (para el dibujo)
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
  colocarEnCarril(slot, circuito);
  slot.carrilVuelta = carrilEn(circuito, lateral, slot.s + ATRAS_SALIDA);
  return slot;
}

/*
 * `grabar`: grabar las vueltas (los fantasmas). Lo pide el juego en sus
 * carreras; el arnés, solo donde lo mide (en miles de carreras triplicaba su tiempo).
 */
export function crearCarreraSlot(circuito, colores, turno = 0, { grabar: grabarVueltas = false } = {}) {
  const carrera = {
    circuito,
    grabar: grabarVueltas,
    // El coche i va por el carril (i + turno) % 2.
    coches: colores.map((color, i) => crearSlot(circuito, CARRILES[(i + turno) % 2], color)),
    fase: 'cuenta',     // 'cuenta' | 'carrera' | 'fin'
    cuenta: CUENTA_ATRAS,
    tiempo: 0,
    tiempoSalida: 0,
    ganador: null,      // índice del primero en terminar
    solapados: false,   // si los dos coches se tocaban en el paso anterior (ver `comprobarChoque`)
    eventos: []         // { tipo, coche } del último avance: cuenta, salida, sale, clac, vuelta, fin
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
    if (evento) carrera.eventos.push({ tipo: evento, coche: i });
    if (carrera.grabar && carrera.fase === 'carrera' && slot.terminado === null) {
      grabar(slot.grabacion, slot.coche, carrera.tiempo - slot.inicioVuelta);
    }
    if (carrera.fase === 'carrera') contarVueltas(carrera, slot, i);
  });
  if (carrera.coches.length === 2) comprobarChoque(carrera);
}

/*
 * Dos coches en el carril que se tocan (en una X, un cruce o a la par en una
 * estrecha; en paralelo van a 2 · CARRIL) chocan y salen los dos, cada uno hacia su lado. Solo cuenta
 * al empezar a tocarse y si se acercan: la mano puede dejar uno encima del
 * otro, parados, y no vuelven a chocar al arrancar.
 */
function comprobarChoque(carrera) {
  const [a, b] = carrera.coches;
  const dx = b.coche.x - a.coche.x, dy = b.coche.y - a.coche.y;
  const distancia = Math.hypot(dx, dy);
  const solapados = distancia < CHOQUE;
  const empiezan = solapados && !carrera.solapados;
  /*
   * Dejan de tocarse al separarse algo más de lo que hace falta para chocar:
   * la mano puede dejarlos a poco más de CHOQUE en una X, y al arrancar los
   * carriles los juntaban y volvían a chocar (lo vio el arnés en una X corta
   * del constructor). Menos que los 2 · CARRIL de dos coches en paralelo.
   */
  carrera.solapados = solapados || (carrera.solapados && distancia < CHOQUE + HOLGURA_CHOQUE);
  /*
   * Lo que la mano acaba de posar ya estaba ahí: en una estrecha puede dejarlo
   * a la par del otro, que ya ha arrancado y se le acerca (lo vio el arnés en
   * la estrecha larga de El resbalón).
   */
  const posado = a.posado || b.posado;
  a.posado = b.posado = false;
  if (!empiezan || posado || a.estado !== 'carril' || b.estado !== 'carril') return;
  const acercandose = (b.coche.vx - a.coche.vx) * dx + (b.coche.vy - a.coche.vy) * dy < 0;
  if (!acercandose) return;
  carrera.eventos.push({ tipo: 'choque', coche: 0, x: (a.coche.x + b.coche.x) / 2, y: (a.coche.y + b.coche.y) / 2 });
  [[a, 1], [b, -1]].forEach(([slot, signo], i) => {
    // Hacia el lado contrario del otro: `soltar` empuja hacia -curva · normal.
    const rumbo = slot.coche.angulo - slot.coleteo;
    const lado = (-Math.sin(rumbo) * dx + Math.cos(rumbo) * dy) * signo;
    soltar(slot, lado > 0 ? 1 : -1);
    carrera.eventos.push({ tipo: 'sale', coche: i });
  });
}

const ANCHAS = { derrape: CURVA_DERRAPE, deslizante: CURVA_DESLIZANTE };

/** Un paso de un coche. Devuelve 'sale' o 'clac' si se ha salido o ha vuelto al carril. */
function pasoSlot(slot, circuito, acelerar, dt) {
  if (slot.estado === 'fuera') return pasoFuera(slot, dt);
  if (slot.estado === 'mano') return pasoMano(slot, circuito, dt);

  // La potencia sigue al dedo con retraso. El motor lleva el coche hacia la
  // velocidad que pide, con inercia; por encima, rueda y se frena poco a poco.
  slot.potencia += ((acelerar ? 1 : 0) - slot.potencia) * dt / (acelerar ? SUBE_POTENCIA : BAJA_POTENCIA);
  const pide = slot.potencia * VELOCIDAD_SLOT;
  slot.v += (pide - slot.v) * dt / (pide > slot.v ? INERCIA_MOTOR : INERCIA_SOLTAR);
  slot.coche.frenando = pide < slot.v - 40;

  const { indice } = buscar(circuito, slot.s);
  const p = circuito.eje[indice];
  const lateral = lateralEn(circuito, slot.lateral, slot.s);
  const radio = radioAgarre(p, lateral);
  slot.exigencia = radio === Infinity ? 0 : slot.v * slot.v / radio / AGARRE_SLOT;
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
  // Avanza por el carril: por dentro de una curva, más `s` por cada px.
  const ds = slot.v * dt / factorCarril(circuito, indice, lateral);
  slot.s += ds;
  slot.progreso += ds;

  // La cola sale hacia fuera al acercarse al límite, y más derrapando: el
  // aviso de que viene. En las rectas vuelve a su sitio.
  const cerca = Math.max(0, Math.min(1, (slot.exigencia - COLETEO_DESDE) / (1 - COLETEO_DESDE)));
  // En los baches la cola va de un lado a otro.
  const hacia = p.curva || (p.efecto === 'baches' ? (Math.floor(slot.s / 40) % 2 ? 1 : -1) : Math.sign(slot.coleteo));
  const objetivo = (cerca * COLETEO_MAXIMO + slot.derrape * COLETEO_DERRAPE) * (ancha ? ancha.coleteo : 1) * hacia;
  slot.coleteo += (objetivo - slot.coleteo) * Math.min(1, 10 * dt);
  colocarEnCarril(slot, circuito);

  if (slot.derrape >= 1 || slot.exigencia > LIMITE_SLOT * (ancha ? ancha.limite : 1)) {
    soltar(slot, hacia || 1);
    return 'sale';
  }
  return null;
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
  const margen = LARGO_COCHE / 2;
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
  slot.altura = 0;
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
    slot.grabadas.push({ ...cerrar(slot.grabacion, tiempo), inicio: slot.inicioVuelta, carril: slot.carrilVuelta });
    // La siguiente empieza aquí, a 0 s: sin esta pose, su primera muestra
    // sería la del paso siguiente, 1/120 s tarde (~3 px, lo midió el arnés).
    slot.grabacion = crearGrabacion();
    grabar(slot.grabacion, slot.coche, 0);
  }
  slot.carrilVuelta = carrilEn(carrera.circuito, slot.lateral, slot.s);
  slot.inicioVuelta = carrera.tiempo;
  if (completadas < VUELTAS_SLOT) {
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

/** Vuelta en curso de un coche, de 1 a VUELTAS_SLOT. */
export function vueltaSlot(slot) {
  return Math.min(slot.completadas + 1, VUELTAS_SLOT);
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
