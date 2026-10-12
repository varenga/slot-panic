/*
 * Slot Panic — los mejores momentos de una carrera.
 *
 * Mientras se corre, cada fotograma se apunta en un búfer de poses: de cada
 * coche, dónde está, hacia dónde mira, si lo lleva la mano (a qué altura),
 * cuánto derrapa y a qué velocidad va. También los eventos de la carrera
 * (choque, sale, clac, vuelta, fin) con su instante. Repetir no vuelve a
 * simular: pinta esas poses, y las chispas y el humo salen otra vez de los
 * eventos, porque son cosmética. Así la repetición no depende de la física.
 *
 * A la vez se buscan los momentos:
 *
 *   choque       dos coches que chocan (en una X, un cruce o una estrecha), o
 *                uno que se sale y se lleva por delante al otro (en la pista);
 *                el golpe más fuerte, más vale
 *   salida       un coche que se sale lanzado (SALIDA_FUERTE)
 *   salvada      un derrape de más de SALVADA que no acaba fuera
 *   adelanta     uno pasa a otro, que sigue en el carril, y aguanta delante
 *                (con cuatro, en cada pareja)
 *   llegada      el segundo cruza la meta a menos de LLEGADA s (por su ritmo)
 *   vuelta       la mejor vuelta de la carrera, si la ha dado una persona
 *
 * Cada uno vale unos puntos, más si lo protagoniza una persona, y se eligen
 * los mejores que no se pisen (`elegirMomentos`). Sin DOM: lo prueba el
 * arnés. Lo que se ve, en `repeticion.js`.
 */

import { GRABA_REPETICION, LENTA_ANCHO, LENTA_RAMPA, LENTA_REPETICION, NUMERO_MOMENTOS, PASO_REPETICION, VELOCIDAD_SLOT } from '../config.js';
import { enCruce } from './circuito.js';
import { normalizarAngulo } from './geometria.js';

const SALIDA_FUERTE = 0.75 * VELOCIDAD_SLOT;  // px/s a partir de los que salirse es un momento
const SALVADA = 0.5;          // derrape a partir del que no salirse es un momento (el piloto automático no pasa de 0,4)
const RECUPERADA = 0.15;      // derrape por debajo del que la salvada se da por hecha
const FIRME = 1;              // s que tiene que aguantar delante el que adelanta
const LLEGADA = 0.3;          // s por debajo de los que la llegada es ajustada
const HUMANO = 1.5;           // lo que vale de más un momento de una persona

/*
 * Cuánto se ve de cada momento, en s antes y después de su instante, y lo
 * que vale de partida.
 */
export const TIPOS_MOMENTO = {
  choque: { antes: 2, despues: 1.5, puntos: 5 },
  salida: { antes: 1.5, despues: 2, puntos: 3 },
  salvada: { antes: 1.5, despues: 1, puntos: 3 },
  adelanta: { antes: 2, despues: 1, puntos: 3 },
  llegada: { antes: 3, despues: 1, puntos: 6 },
  vuelta: { antes: 3, despues: 0.5, puntos: 3 }
};

const ESTADOS = ['carril', 'fuera', 'mano'];
const CAMPOS = 7;             // por coche y cuadro: x, y, ángulo, altura, estado, derrape, rapidez

/** Un búfer vacío para una carrera de `coches` coches en `circuito`. */
export function crearRepeticion(circuito, coches) {
  return {
    circuito,
    coches,
    t: 0,               // s desde que empezó a grabarse (con la cuenta atrás)
    cuadros: [],        // [t, ...CAMPOS por coche]
    eventos: [],        // { t, tipo, coche, x, y, vx, vy }
    vueltas: [],        // { t, coche, tiempo, humano }: cada vuelta acabada
    candidatos: [],     // los momentos encontrados: { tipo, t, coches, humano, puntos, lugar }
    derrapes: Array.from({ length: coches }, () => ({ pico: 0, t: 0, lugar: null, humano: false })),
    orden: new Map(),   // de cada pareja de coches, quién va delante
    cambio: new Map()   // de cada pareja, el adelantamiento que aún tiene que aguantar
  };
}

/*
 * Apunta el fotograma: los coches tras `avanzarSlot` y sus eventos. `humanos`
 * dice quién lleva cada coche ahora mismo (un carril puede tomarse a mitad).
 */
export function grabarCuadro(rep, carrera, dt, humanos = []) {
  if (rep.t >= GRABA_REPETICION) return;
  rep.t += dt;
  // Los baches no se graban: son muchos y la pose ya lleva el bote (`altura`).
  const eventos = carrera.eventos.filter((e) => e.tipo !== 'bache');
  const ultimo = rep.cuadros.at(-1);
  if (!ultimo || rep.t - ultimo[0] >= PASO_REPETICION - 1e-9 || eventos.length) {
    const cuadro = [rep.t];
    carrera.coches.forEach((slot, i) => {
      const { coche } = slot;
      // El ángulo, desenrollado: el trompo de una salida da vueltas enteras.
      const angulo = ultimo ? ultimo[1 + i * CAMPOS + 2] + normalizarAngulo(coche.angulo - ultimo[1 + i * CAMPOS + 2]) : coche.angulo;
      cuadro.push(coche.x, coche.y, angulo, slot.altura, ESTADOS.indexOf(slot.estado), slot.derrape, Math.hypot(coche.vx, coche.vy));
    });
    rep.cuadros.push(cuadro);
  }
  for (const e of eventos) {
    if (e.tipo === 'cuenta' || e.tipo === 'salida') continue;
    const coche = e.coche === undefined ? null : carrera.coches[e.coche].coche;
    rep.eventos.push({
      t: rep.t, tipo: e.tipo, coche: e.coche ?? null, fuerza: e.fuerza,
      x: e.x ?? coche?.x, y: e.y ?? coche?.y, vx: coche?.vx ?? 0, vy: coche?.vy ?? 0
    });
  }
  buscarMomentos(rep, carrera, humanos);
}

function proponer(rep, tipo, datos) {
  rep.candidatos.push({ tipo, t: rep.t, puntos: TIPOS_MOMENTO[tipo].puntos, lugar: null, ...datos });
}

/** El efecto de la pieza en la `s` del eje, o su tipo si es una X. */
function piezaEn(circuito, s) {
  const p = circuito.eje[circuito.puntoEn(s).indice];
  return p.tipo === 'x' ? 'x' : p.efecto;
}

/** Dónde han chocado: 'cruce', 'x' o 'estrecha' (en una estrecha, una deslizante o un desvío). */
export function lugarChoque(circuito, s0, s1) {
  if (enCruce(circuito, s0, s1, circuito.cruces)) return 'cruce';
  return piezaEn(circuito, s0) === 'x' ? 'x' : 'estrecha';
}

const estrecha = (pieza) => pieza === 'estrecha' || pieza === 'deslizante' || pieza === 'desvio';

function buscarMomentos(rep, carrera, humanos) {
  const { circuito, coches } = carrera;
  const humano = (i) => !!humanos[i];
  const enChoque = new Set();

  for (const e of carrera.eventos) {
    if (e.tipo === 'choque') {
      const [i, j] = e.coches ?? [0, 1];
      enChoque.add(i).add(j);
      // Un toque vale menos que un golpe de verdad (a media velocidad, o más, todo).
      const puntos = TIPOS_MOMENTO.choque.puntos * (0.6 + 0.4 * Math.min(1, 2 * (e.fuerza ?? 1)));
      const lugar = e.arrolla ? 'pista' : lugarChoque(circuito, coches[i].s, coches[j].s);
      proponer(rep, 'choque', { coches: [i, j], humano: humano(i) || humano(j), lugar, puntos });
    } else if (e.tipo === 'sale' && !enChoque.has(e.coche)) {
      const { coche } = coches[e.coche];
      const rapidez = Math.hypot(coche.vx, coche.vy);
      if (rapidez >= SALIDA_FUERTE) {
        const extra = Math.min(1, (rapidez - SALIDA_FUERTE) / (0.2 * VELOCIDAD_SLOT));
        proponer(rep, 'salida', { coches: [e.coche], humano: humano(e.coche), puntos: TIPOS_MOMENTO.salida.puntos + 2 * extra });
      }
    } else if (e.tipo === 'vuelta' || e.tipo === 'fin') {
      const slot = coches[e.coche];
      const tiempo = slot.vueltas.at(-1);
      const inicio = carrera.tiempo - tiempo;
      rep.vueltas.push({ t: rep.t, coche: e.coche, tiempo, humano: humano(e.coche) && (slot.humanoDesde ?? 0) <= inicio + 1e-9 });
      if (e.tipo === 'fin') llegada(rep, carrera, e.coche, humanos);
    }
  }

  // La salvada: el pico de un derrape que se recupera en el carril.
  coches.forEach((slot, i) => {
    const d = rep.derrapes[i];
    if (slot.estado !== 'carril' || enChoque.has(i)) {
      d.pico = 0;
      return;
    }
    if (slot.derrape > d.pico) Object.assign(d, { pico: slot.derrape, t: rep.t, lugar: piezaEn(circuito, slot.s), humano: humano(i) });
    else if (d.pico >= SALVADA && slot.derrape < RECUPERADA) {
      rep.candidatos.push({
        tipo: 'salvada', t: d.t, coches: [i], humano: d.humano, lugar: d.lugar,
        puntos: TIPOS_MOMENTO.salvada.puntos + 3 * (d.pico - SALVADA) / (1 - SALVADA) + (d.lugar === 'deslizante' ? 1 : 0)
      });
      d.pico = 0;
    } else if (slot.derrape === 0) d.pico = 0;
  });

  // El adelantamiento: entre cada pareja, cambia quién va delante y aguanta FIRME s.
  if (carrera.fase !== 'carrera') return;
  for (let i = 0; i < coches.length; i++) {
    for (let j = i + 1; j < coches.length; j++) adelantamiento(rep, circuito, coches, i, j, humano);
  }
}

function adelantamiento(rep, circuito, coches, i, j, humano) {
  const a = coches[i], b = coches[j];
  if (a.progreso <= 0 || b.progreso <= 0) return;
  const pareja = i * coches.length + j;
  const orden = rep.orden.get(pareja) ?? null;
  const delante = a.progreso === b.progreso ? orden : a.progreso > b.progreso ? i : j;
  if (orden === null) {
    rep.orden.set(pareja, delante);
    return;
  }
  if (delante === orden) {
    rep.cambio.delete(pareja);
    return;
  }
  const detras = delante === i ? j : i;
  let cambio = rep.cambio.get(pareja);
  if (!cambio) {
    // Si el otro está fuera, no lo ha pasado: se ha salido (y eso ya es otro momento).
    cambio = {
      t: rep.t, limpio: coches[detras].estado === 'carril',
      lugar: piezaEn(circuito, coches[delante].s), humano: humano(delante)
    };
    rep.cambio.set(pareja, cambio);
  }
  if (rep.t - cambio.t < FIRME) return;
  const { t, limpio, lugar, humano: deUnHumano } = cambio;
  if (limpio) {
    rep.candidatos.push({
      tipo: 'adelanta', t, coches: [delante, detras], humano: deUnHumano, lugar: estrecha(lugar) ? 'estrecha' : null,
      puntos: TIPOS_MOMENTO.adelanta.puntos + (estrecha(lugar) ? 2 : 0)
    });
  }
  rep.orden.set(pareja, delante);
  rep.cambio.delete(pareja);
}

/*
 * Ha llegado el primero: cuánto le falta al segundo (con cuatro, al que va
 * más cerca), a su ritmo (lo que corre ahora o su media, lo que sea más), y
 * si sigue en el carril.
 */
function llegada(rep, carrera, ganador, humanos) {
  const segundo = carrera.coches.map((_, i) => i).filter((i) => i !== ganador)
    .reduce((a, b) => (carrera.coches[b].progreso > carrera.coches[a].progreso ? b : a));
  const otro = carrera.coches[segundo];
  if (otro.estado !== 'carril' && otro.terminado === null) return;
  const restante = Math.max(0, carrera.vueltas * carrera.circuito.largo - otro.progreso);
  const ritmo = Math.max(otro.v, otro.progreso / Math.max(1, carrera.tiempo), 1);
  const hueco = otro.terminado !== null ? 0 : restante / ritmo;
  if (hueco >= LLEGADA) return;
  proponer(rep, 'llegada', {
    coches: [ganador, segundo], humano: !!humanos[ganador] || !!humanos[segundo],
    puntos: TIPOS_MOMENTO.llegada.puntos + 4 * (LLEGADA - hueco) / LLEGADA
  });
}

// --- Elegir -----------------------------------------------------------------------

/*
 * Los mejores momentos que no se pisan, hasta `n`, en el orden de la carrera.
 * `mejor` es el índice del que más vale (-1 si no hay ninguno). Cada uno
 * lleva su ventana (`desde`, `hasta`, dentro de lo grabado) y lo que vale.
 */
export function elegirMomentos(rep, n = NUMERO_MOMENTOS) {
  const candidatos = [...rep.candidatos];
  const rapida = rep.vueltas.reduce((a, b) => (!a || b.tiempo < a.tiempo ? b : a), null);
  if (rapida?.humano) {
    candidatos.push({ tipo: 'vuelta', t: rapida.t, coches: [rapida.coche], humano: true, puntos: TIPOS_MOMENTO.vuelta.puntos, lugar: null });
  }
  const conVentana = candidatos.map((c) => ({
    ...c,
    desde: Math.max(0, c.t - TIPOS_MOMENTO[c.tipo].antes),
    hasta: Math.min(rep.t, c.t + TIPOS_MOMENTO[c.tipo].despues),
    valor: c.puntos * (c.humano ? HUMANO : 1)
  })).filter((c) => c.hasta > c.desde);
  conVentana.sort((a, b) => b.valor - a.valor || a.t - b.t);
  const elegidos = [];
  for (const c of conVentana) {
    if (elegidos.length >= n) break;
    if (elegidos.every((e) => c.hasta <= e.desde || c.desde >= e.hasta)) elegidos.push(c);
  }
  elegidos.sort((a, b) => a.t - b.t);
  let mejor = -1;
  elegidos.forEach((c, i) => { if (mejor < 0 || c.valor > elegidos[mejor].valor) mejor = i; });
  return { lista: elegidos, mejor };
}

// --- Repetir ----------------------------------------------------------------------

/** El último cuadro con su t ≤ `t` (o el primero). */
function cuadroAntes(rep, t) {
  const { cuadros } = rep;
  let bajo = 0, alto = cuadros.length - 1;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (cuadros[medio][0] <= t) bajo = medio; else alto = medio - 1;
  }
  return bajo;
}

/*
 * Cómo estaban los coches a `t` s de lo grabado, interpolando entre los dos
 * cuadros de alrededor: `{ x, y, angulo, altura, estado, derrape, rapidez }`
 * por coche. El estado, el del cuadro de antes.
 */
export function poseEn(rep, t) {
  const { cuadros } = rep;
  if (!cuadros.length) return [];
  const i = cuadroAntes(rep, t);
  const a = cuadros[i], b = cuadros[Math.min(i + 1, cuadros.length - 1)];
  const f = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 0;
  const mezcla = (k) => a[k] + (b[k] - a[k]) * f;
  return Array.from({ length: rep.coches }, (_, c) => {
    const k = 1 + c * CAMPOS;
    return {
      x: mezcla(k), y: mezcla(k + 1), angulo: mezcla(k + 2), altura: mezcla(k + 3),
      estado: ESTADOS[a[k + 4]], derrape: mezcla(k + 5), rapidez: mezcla(k + 6)
    };
  });
}

/** Los eventos con su t en (t0, t1]. */
export function eventosEntre(rep, t0, t1) {
  return rep.eventos.filter((e) => e.t > t0 && e.t <= t1);
}

/*
 * A qué velocidad se repite cada instante de un momento: a cámara lenta
 * alrededor de su instante, y normal lejos de él.
 */
export function ritmoRepeticion(momento, t) {
  const d = Math.abs(t - momento.t);
  if (d <= LENTA_ANCHO) return LENTA_REPETICION;
  if (d >= LENTA_ANCHO + LENTA_RAMPA) return 1;
  return LENTA_REPETICION + (1 - LENTA_REPETICION) * (d - LENTA_ANCHO) / LENTA_RAMPA;
}

/** Lo que dura un momento repetido, en s de reloj. */
export function duracionMomento(momento, paso = 1 / 120) {
  let duracion = 0;
  for (let t = momento.desde; t < momento.hasta; t += paso * ritmoRepeticion(momento, t)) duracion += paso;
  return duracion;
}

/** Lo que ocupa el búfer: cuántos números lleva dentro (cada uno, 8 bytes). */
export function numerosGrabados(rep) {
  return rep.cuadros.length * (1 + rep.coches * CAMPOS) + rep.eventos.length * 7;
}
