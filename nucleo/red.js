/*
 * Slot Panic — la carrera en red (MULTIJUGADOR.md §6). Sin DOM y sin red: hace
 * y aplica los mensajes; quién los lleva (juego.js con net.js, o la red de
 * mentira del arnés) no es cosa de aquí.
 *
 * **Cada coche lo simula quien lo conduce.** El gatillo no espera a la red: el
 * coche propio corre con la física de siempre en su dispositivo, y en los
 * demás es `remoto` (slot.js): rueda con lo que su dueño dijo la última vez.
 *
 * **El anfitrión arbitra.** Simula su coche y los de la CPU, pone los remotos
 * donde dicen sus reportes, decide los choques entre todos y quién gana. Lo
 * que un choque le hace a un coche remoto se le manda como golpe, y su dueño
 * lo aplica. Hasta que confirma que lo tiene (`ag`), el anfitrión aplica ese
 * golpe encima de cada reporte que le llega: si no, un reporte de antes del
 * golpe lo desharía, y el coche volvería a chocar.
 *
 * **La misma hora de carrera.** Cada uno cuenta el tiempo de carrera desde su
 * propia salida, y quien sale después es quien se enteró después: así, a la
 * misma hora de carrera, todos están a la par. Lo que llega de otro se lleva
 * a la hora de carrera propia (`adelantar`): el anfitrión adelanta un reporte
 * lo que tardó en llegarle más lo que el otro salió después, y un invitado,
 * casi nada. Las vueltas y el tiempo de llegada de cada coche son los de su
 * dueño, en su reloj de carrera: gana el menor.
 */

import { aplicarGolpe, avanzarSlot, rodarRemoto } from './slot.js';
import { normalizarAngulo } from './geometria.js';

export const RITMO_INSTANTANEA = 1 / 20;   // s entre instantáneas del anfitrión
export const RITMO_REPORTE = 1 / 30;       // s entre reportes de un invitado
export const ADELANTO_MAXIMO = 0.3;        // s que se adelanta como mucho lo que llega
export const SUAVIZA = 0.1;                // s en que un invitado corrige lo que pinta de los demás
export const SALTO = 60;                   // px de error por encima de los que se pone de golpe

const ESTADOS = ['carril', 'fuera', 'mano'];
const FASES = ['cuenta', 'carrera', 'fin'];

// --- El coche en un mensaje --------------------------------------------------------

const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

/*
 * Un coche, como una lista (en este orden, `M`): lo que necesitan la física
 * de un remoto y el dibujo. Fuera del carril, además su pose y su velocidad;
 * en la mano, de dónde lo recoge y cuánto lleva. El progreso no viaja: va
 * siempre con la s (`progreso = s - largo`, desde la parrilla).
 */
const M = {
  estado: 0, s: 1, v: 2, potencia: 3, derrape: 4, exigencia: 5, coleteo: 6, altura: 7,
  completadas: 8, ultimaVuelta: 9, terminado: 10, salidas: 11, frenando: 12, extra: 13
};
export function cocheAMensaje(slot) {
  const { coche } = slot;
  const m = [
    ESTADOS.indexOf(slot.estado), r1(slot.s), r1(slot.v), r3(slot.potencia),
    r3(slot.derrape), r3(slot.exigencia), r3(slot.coleteo), r3(slot.altura),
    slot.completadas, slot.vueltas.length ? r3(slot.vueltas.at(-1)) : 0,
    slot.terminado === null ? -1 : r3(slot.terminado), slot.salidas, coche.frenando ? 1 : 0
  ];
  if (slot.estado === 'fuera') m.push(r1(coche.x), r1(coche.y), r3(coche.angulo), r1(coche.vx), r1(coche.vy), r3(slot.giro));
  if (slot.estado === 'mano') m.push(r1(slot.desde.x), r1(slot.desde.y), r3(slot.desde.angulo), r3(slot.tMano));
  return m;
}

/*
 * Pone un coche remoto como dice su mensaje y lo adelanta `adelanto` s. Las
 * vueltas: la lista crece con la última de cada mensaje (por TCP llegan
 * todos, y en orden). Devuelve los eventos que se deducen: se ha salido, ha
 * vuelto al carril, ha dado una vuelta.
 */
function ponerCoche(slot, circuito, m, adelanto, i) {
  const { coche } = slot;
  const antes = slot.estado;
  const eventos = [];
  slot.estado = ESTADOS[m[M.estado]];
  slot.s = m[M.s];
  slot.progreso = m[M.s] - circuito.largo;
  slot.v = m[M.v];
  slot.potencia = m[M.potencia];
  slot.derrape = m[M.derrape];
  slot.exigencia = m[M.exigencia];
  slot.coleteo = m[M.coleteo];
  slot.altura = m[M.altura];
  anotarVueltas(slot, m, eventos, i);
  slot.salidas = m[M.salidas];
  coche.frenando = Boolean(m[M.frenando]);
  const x = M.extra;
  if (slot.estado === 'fuera') {
    [coche.x, coche.y, coche.angulo, coche.vx, coche.vy, slot.giro] = m.slice(x, x + 6);
  } else if (slot.estado === 'mano') {
    slot.desde = { x: m[x], y: m[x + 1], angulo: m[x + 2] };
    slot.tMano = m[x + 3];
    coche.vx = coche.vy = 0;
  }
  rodarRemoto(slot, circuito, adelanto);
  if (antes === 'carril' && slot.estado === 'fuera') eventos.push({ tipo: 'sale', coche: i });
  if (antes !== 'carril' && slot.estado === 'carril') {
    eventos.push({ tipo: 'clac', coche: i });
    slot.posado = true;   // la mano lo acaba de posar: tregua, como en la mesa
  }
  return eventos;
}

function anotarVueltas(slot, m, eventos, i) {
  const completadas = m[M.completadas], ultima = m[M.ultimaVuelta], terminado = m[M.terminado];
  while (slot.vueltas.length < completadas) {
    slot.vueltas.push(ultima);
    slot.inicioVuelta += ultima;
    if (slot.vueltas.length < completadas || terminado < 0) eventos.push({ tipo: 'vuelta', coche: i });
  }
  slot.completadas = completadas;
  slot.terminado = terminado < 0 ? null : terminado;
}

/** Un evento de la carrera en un mensaje, con sus números redondeados. */
function eventoAMensaje(e) {
  const m = { ...e };
  for (const k of ['x', 'y', 'fuerza']) if (typeof m[k] === 'number') m[k] = r1(m[k] * (k === 'fuerza' ? 100 : 1)) / (k === 'fuerza' ? 100 : 1);
  return m;
}

// --- El anfitrión ------------------------------------------------------------------

/*
 * `remotos`: los índices de los coches que conducen otros (el resto son el
 * suyo y la CPU). Cada uno, con los golpes que aún no ha confirmado.
 */
export function crearAnfitrion(carrera, remotos) {
  const anf = { carrera, remotos: new Map(), eventos: [], reloj: 0, enviadas: 0 };
  for (const i of remotos) {
    carrera.coches[i].remoto = true;
    anf.remotos.set(i, { pendientes: [], numero: 0 });
  }
  return anf;
}

/*
 * El reporte de un coche remoto (`{k:'c', t, ag, c}`): su hora de carrera,
 * el último golpe que ha aplicado y el coche. Se pone a la hora de carrera
 * del anfitrión, con los golpes que aún no ha visto encima. Si alguno lo
 * sacaba, no se toca: aún no se ha enterado, y el anfitrión ya lo tiene fuera.
 */
export function recibirReporte(anf, i, msg) {
  const remoto = anf.remotos.get(i);
  if (!remoto || msg?.k !== 'c') return;
  remoto.pendientes = remoto.pendientes.filter((p) => p.n > msg.ag);
  const { carrera } = anf;
  const slot = carrera.coches[i];
  if (remoto.pendientes.some((p) => p.golpe.sale)) return;
  /*
   * Los golpes van antes de adelantarlo: si no, se adelantaba con la velocidad
   * de antes del golpe y el anfitrión lo veía meterse en el otro más de lo que
   * se mete (en los encuentros salían los dos tres veces más que en la mesa).
   */
  anf.eventos.push(...ponerCoche(slot, carrera.circuito, msg.c, 0, i));
  for (const p of remoto.pendientes) aplicarGolpe(slot, p.golpe);
  rodarRemoto(slot, carrera.circuito, Math.min(ADELANTO_MAXIMO, Math.max(0, carrera.tiempo - msg.t)));
  // Quien llega antes, en su reloj de carrera, gana.
  if (slot.terminado !== null) {
    const ganador = carrera.ganador === null ? null : carrera.coches[carrera.ganador];
    if (!ganador || ganador.terminado === null || slot.terminado < ganador.terminado) {
      if (carrera.ganador === null) anf.eventos.push({ tipo: 'fin', coche: i });
      carrera.ganador = i;
      carrera.fase = 'fin';
    }
  }
}

/*
 * Un fotograma del anfitrión: la carrera de siempre (los remotos ruedan) y,
 * en `carrera.eventos`, también lo que se ha deducido de los reportes.
 * Devuelve lo que hay que mandar: `{ para, d }`, con `para` el coche remoto
 * al que va, o null si va a todos.
 */
export function avanzarAnfitrion(anf, mandos, dt) {
  const { carrera } = anf;
  avanzarSlot(carrera, mandos, dt);
  carrera.eventos.unshift(...anf.eventos);
  anf.eventos = [];
  const salida = [];
  for (const [i, remoto] of anf.remotos) {
    const slot = carrera.coches[i];
    if (!slot.golpe) continue;
    const golpe = slot.golpe;
    slot.golpe = null;
    const n = ++remoto.numero;
    remoto.pendientes.push({ n, golpe });
    salida.push({ para: i, d: { k: 'g', n, g: golpeAMensaje(golpe) } });
  }
  anf.acumulados = (anf.acumulados ?? []).concat(carrera.eventos.map(eventoAMensaje));
  anf.reloj += dt;
  if (anf.reloj >= RITMO_INSTANTANEA) {
    anf.reloj %= RITMO_INSTANTANEA;
    salida.push({ para: null, d: instantanea(anf) });
  }
  return salida;
}

/** La instantánea (`{k:'s'}`): la hora, la fase, la cuenta, el ganador, cada coche y los eventos desde la anterior. */
export function instantanea(anf) {
  const { carrera } = anf;
  const msg = {
    k: 's', t: r3(carrera.tiempo), f: FASES.indexOf(carrera.fase), cu: r3(carrera.cuenta),
    g: carrera.ganador ?? -1, c: carrera.coches.map(cocheAMensaje), e: anf.acumulados ?? []
  };
  anf.acumulados = [];
  anf.enviadas++;
  return msg;
}

function golpeAMensaje(g) {
  if (g.sale) return { sale: { adelante: r1(g.sale.adelante), lado: r1(g.sale.lado), giro: r3(g.sale.giro), angulo: r3(g.sale.angulo) } };
  const m = {};
  for (const k of ['dv', 'dx', 'dy', 'dvx', 'dvy']) if (g[k]) m[k] = r1(g[k]);
  for (const k of ['dd', 'dco', 'dg']) if (g[k]) m[k] = r3(g[k]);
  return m;
}

// --- El invitado -------------------------------------------------------------------

/*
 * `propio`: el índice de su coche. Los demás son remotos; los choques y el
 * ganador, del anfitrión.
 */
export function crearInvitado(carrera, propio) {
  carrera.choques = false;
  carrera.arbitro = false;
  carrera.coches.forEach((slot, i) => { slot.remoto = i !== propio; });
  return { carrera, propio, ultima: null, golpes: [], aplicado: 0, eventos: [], reloj: 0 };
}

/** Lo que manda el anfitrión: una instantánea o un golpe. Se aplica en el siguiente fotograma. */
export function recibirDelAnfitrion(inv, msg) {
  if (msg?.k === 's') {
    inv.ultima = msg;
    inv.eventos.push(...msg.e.filter((e) => e.coche !== inv.propio || e.tipo === 'choque' || e.tipo === 'fin'));
    const { carrera } = inv;
    // Las vueltas de los demás, en cuanto llegan (no se pierde ninguna).
    msg.c.forEach((m, i) => { if (i !== inv.propio) anotarVueltas(carrera.coches[i], m, [], i); });
    if (msg.f === 2 && carrera.fase !== 'fin') carrera.fase = 'fin';
    carrera.ganador = msg.g < 0 ? null : msg.g;
  } else if (msg?.k === 'g') {
    inv.golpes.push(msg);
  }
}

/*
 * Un fotograma del invitado: los golpes que han llegado, su coche con su
 * gatillo, y los demás donde dice la última instantánea a su hora de carrera,
 * corrigiendo poco a poco lo que ya pintaba. Devuelve lo que hay que mandar
 * al anfitrión (el reporte, a su ritmo).
 */
export function avanzarInvitado(inv, mandoPropio, dt) {
  const { carrera, propio } = inv;
  const slot = carrera.coches[propio];
  const eventos = [];
  for (const msg of inv.golpes) {
    if (aplicarGolpe(slot, msg.g) === 'sale') eventos.push({ tipo: 'sale', coche: propio });
    inv.aplicado = msg.n;
  }
  inv.golpes = [];
  const mandos = carrera.coches.map((_, i) => (i === propio ? mandoPropio : null));
  avanzarSlot(carrera, mandos, dt);
  seguirALosDemas(inv, dt);
  carrera.eventos.unshift(...eventos, ...inv.eventos);
  inv.eventos = [];
  inv.reloj += dt;
  if (inv.reloj < RITMO_REPORTE) return [];
  inv.reloj %= RITMO_REPORTE;
  return [{ para: null, d: reporte(inv) }];
}

/** El reporte del coche propio (`{k:'c'}`). */
export function reporte(inv) {
  return { k: 'c', t: r3(inv.carrera.tiempo), ag: inv.aplicado, c: cocheAMensaje(inv.carrera.coches[inv.propio]) };
}

const dicho = { coche: {}, vueltas: [] };   // un coche de mentira: lo que dice la instantánea, para compararlo

function seguirALosDemas(inv, dt) {
  const { carrera, ultima } = inv;
  if (!ultima) return;
  const adelanto = Math.max(0, Math.min(ADELANTO_MAXIMO, carrera.tiempo - ultima.t));
  const k = Math.min(1, dt / SUAVIZA);
  ultima.c.forEach((m, i) => {
    if (i === inv.propio) return;
    const slot = carrera.coches[i];
    // Lo que dice la instantánea, a esta hora, en un coche de mentira.
    Object.assign(dicho, {
      lateral: slot.lateral, ficha: slot.ficha, estado: slot.estado, completadas: slot.completadas,
      vueltas: slot.vueltas, inicioVuelta: slot.inicioVuelta, desde: slot.desde, tMano: slot.tMano, giro: slot.giro
    });
    dicho.coche = { ...slot.coche };
    dicho.vueltas = [...slot.vueltas];
    ponerCoche(dicho, carrera.circuito, m, adelanto, i);
    const lejos = Math.hypot(dicho.coche.x - slot.coche.x, dicho.coche.y - slot.coche.y) > SALTO;
    if (dicho.estado !== slot.estado || lejos || dicho.estado === 'mano') {
      copiar(slot, dicho);
      rodarRemoto(slot, carrera.circuito, 0);
      return;
    }
    // El mismo estado y cerca: se acerca a lo que dice, sin saltos.
    copiar(slot, dicho, ['s', 'progreso']);
    if (slot.estado === 'carril') {
      const ds = (dicho.s - slot.s) * k;
      slot.s += ds;
      slot.progreso += ds;
    } else {
      const { coche } = slot, f = dicho.coche;
      coche.x += (f.x - coche.x) * k;
      coche.y += (f.y - coche.y) * k;
      coche.angulo += normalizarAngulo(f.angulo - coche.angulo) * k;
      coche.vx = f.vx;
      coche.vy = f.vy;
    }
    rodarRemoto(slot, carrera.circuito, 0);
  });
}

/** Lo que dice la instantánea de un coche (en `dicho`), salvo `menos`; con todo, también su pose. */
function copiar(slot, de, menos = []) {
  for (const k of ['estado', 's', 'progreso', 'v', 'potencia', 'derrape', 'exigencia', 'coleteo', 'altura', 'salidas', 'desde', 'tMano', 'giro']) {
    if (!menos.includes(k)) slot[k] = de[k];
  }
  slot.coche.frenando = de.coche.frenando;
  if (!menos.length) Object.assign(slot.coche, { x: de.coche.x, y: de.coche.y, angulo: de.coche.angulo, vx: de.coche.vx, vy: de.coche.vy });
}
