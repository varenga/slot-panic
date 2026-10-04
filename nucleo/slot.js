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
 * Los mandos siguen siendo `{ acelerar, frenar, giro }`: aquí solo cuenta
 * `acelerar`. No toca el DOM: el arnés lo ejecuta tal cual.
 */

import {
  ACUMULA_DERRAPE, AGARRE_SLOT, RADIO_GUIA, ALTO, ANCHO, BAJA_POTENCIA, CARRIL, COLETEO_DERRAPE, COLETEO_DESDE,
  COLETEO_MAXIMO, CUENTA_ATRAS, DURACION_MANO, ESPERA_MANO, FRENO_DERRAPE_SLOT, FRENO_MESA, FUERA_MAXIMO,
  GIRO_TROMPO, INERCIA_MOTOR, INERCIA_SOLTAR, LARGO_COCHE, LIMITE_SLOT, PASO_FISICA, RECUPERA_DERRAPE,
  SUBE_POTENCIA, VELOCIDAD_SLOT, VUELTAS_SLOT
} from '../config.js';
import { normalizarAngulo } from './geometria.js';

const DESPLAZAMIENTO_SALIDA = 0.3;  // fracción de la velocidad que sale hacia fuera al soltarse
const QUIETO = 12;                  // px/s por debajo de los que el coche se da por parado en la mesa
const AMORTIGUA_TROMPO = 2.5;       // 1/s con que se apaga el trompo
const REBOTE_MESA = 0.5;            // fracción de la velocidad que vuelve del borde de la mesa
const ATRAS_SALIDA = 30;            // px detrás de la meta en que se sale, como en carretera

// --- El carril ---------------------------------------------------------------

/*
 * Los dos carriles, por el lado -1 y el +1 del eje. No son iguales: casi
 * todas las curvas de La horquilla giran al mismo lado, y con el mismo
 * piloto uno saca un 3-4 % al otro. Como en el juguete, los coches se cambian
 * de carril en cada carrera (`turno`).
 */
export const CARRILES = [-CARRIL, CARRIL];

/** Radio del carril en un punto del eje: por dentro de la curva, más cerrado. */
export function radioCarril(punto, lateral) {
  return punto.radio === Infinity ? Infinity : punto.radio - punto.curva * lateral;
}

/** El radio con el que se mide el agarre: la guía sujeta más en las cerradas. */
export function radioAgarre(punto, lateral) {
  return Math.max(RADIO_GUIA, radioCarril(punto, lateral));
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
      const d = lateral / Math.cos(normalizarAngulo(p.angulo - anterior.angulo) / 2);
      return { x: p.x - Math.sin(medio) * d, y: p.y + Math.cos(medio) * d };
    }));
  }
  return porCarril.get(lateral);
}

/** Lo que mide una vuelta por el carril. */
export function largoCarril(circuito, lateral) {
  return circuito.eje.reduce((total, p) => total + p.largo * factorCarril(p, lateral), 0);
}

/** px de carril por px de eje: menos de 1 por dentro de las curvas. */
function factorCarril(p, lateral) {
  return p.radio === Infinity ? 1 : radioCarril(p, lateral) / p.radio;
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
  const trazado = trazadoCarril(circuito, lateral);
  const { indice, t } = buscar(circuito, s);
  const a = trazado[indice], b = trazado[(indice + 1) % trazado.length];
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
    completadas: 0,
    vueltas: [],
    inicioVuelta: 0,
    salidas: 0,         // veces que se ha salido
    terminado: null     // s de carrera al completar la última vuelta
  };
  colocarEnCarril(slot, circuito);
  return slot;
}

export function crearCarreraSlot(circuito, colores, turno = 0) {
  return {
    circuito,
    // El coche i va por el carril (i + turno) % 2.
    coches: colores.map((color, i) => crearSlot(circuito, CARRILES[(i + turno) % 2], color)),
    fase: 'cuenta',     // 'cuenta' | 'carrera' | 'fin'
    cuenta: CUENTA_ATRAS,
    tiempo: 0,
    tiempoSalida: 0,
    ganador: null,      // índice del primero en terminar
    eventos: []         // { tipo, coche } del último avance: cuenta, salida, sale, clac, vuelta, fin
  };
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
    if (carrera.fase === 'carrera') contarVueltas(carrera, slot, i);
  });
}

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

  const p = circuito.eje[buscar(circuito, slot.s).indice];
  const radio = radioAgarre(p, slot.lateral);
  slot.exigencia = radio === Infinity ? 0 : slot.v * slot.v / radio / AGARRE_SLOT;
  // Pasado el agarre, derrapa: pierde velocidad y el derrape se acumula. Sin
  // pasarse, se recupera.
  const exceso = slot.exigencia - 1;
  if (exceso > 0) {
    slot.v *= Math.exp(-FRENO_DERRAPE_SLOT * exceso * dt);
    slot.derrape = Math.min(1, slot.derrape + ACUMULA_DERRAPE * exceso * dt);
  } else {
    slot.derrape = Math.max(0, slot.derrape - RECUPERA_DERRAPE * dt);
  }
  // Avanza por el carril: por dentro de una curva, más `s` por cada px.
  const ds = slot.v * dt / factorCarril(p, slot.lateral);
  slot.s += ds;
  slot.progreso += ds;

  // La cola sale hacia fuera al acercarse al límite, y más derrapando: el
  // aviso de que viene. En las rectas vuelve a su sitio.
  const cerca = Math.max(0, Math.min(1, (slot.exigencia - COLETEO_DESDE) / (1 - COLETEO_DESDE)));
  const objetivo = (cerca * COLETEO_MAXIMO + slot.derrape * COLETEO_DERRAPE) * (p.curva || Math.sign(slot.coleteo));
  slot.coleteo += (objetivo - slot.coleteo) * Math.min(1, 10 * dt);
  colocarEnCarril(slot, circuito);

  if (slot.derrape >= 1 || slot.exigencia > LIMITE_SLOT) {
    soltar(slot, p.curva);
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
  colocarEnCarril(slot, circuito);
  return 'clac';
}

function contarVueltas(carrera, slot, i) {
  if (slot.terminado !== null) return;
  const completadas = Math.floor(slot.progreso / carrera.circuito.largo);
  if (completadas <= slot.completadas) return;
  slot.completadas = completadas;
  slot.vueltas.push(carrera.tiempo - slot.inicioVuelta);
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
