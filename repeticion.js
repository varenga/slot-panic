/*
 * Slot Panic — la repetición de los mejores momentos.
 *
 * Lo grabado y lo elegido viene de `nucleo/momentos.js`; aquí se enseña: una
 * cámara que sigue al protagonista, más cerca que la mesa, a cámara lenta
 * alrededor del instante, con bandas de cine arriba y abajo y un rótulo
 * («¡CHOQUE EN LA X!»). Las chispas y el humo se vuelven a emitir de los
 * eventos grabados: son cosmética, y aquí sí vale Math.random().
 *
 * Es presentación, como `lupa.js`: sirve igual a la mesa (1280 × 720) que a
 * la lupa (vertical), y nunca enseña nada fuera de la mesa.
 */

import { ALTO, ANCHO, COLOR, FUENTE, SALTAR_REPETICION, ZOOM_REPETICION } from './config.js';
import { circulo, ctx, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { eventosEntre, poseEn, ritmoRepeticion } from './nucleo/momentos.js';
import { actualizarParticulas, chispasChoque, emitirChispas, emitirHumo } from './particulas.js';
import { nombreSlot } from './pantalla.js';
import { t } from './i18n.js';

const SIGUE_CAMARA = 0.2;   // s: la cámara recorre 2/3 de lo que le falta hasta el protagonista

/*
 * Una repetición: los momentos `indices` de `momentos` (lo que devuelve
 * `elegirMomentos`), uno detrás de otro. `auto`: la que sale sola al acabar.
 */
export function crearReproduccion(rep, momentos, indices, auto) {
  const rp = { rep, cola: indices.map((i) => momentos.lista[i]), indices, total: momentos.lista.length, mejor: momentos.mejor, auto, i: -1, t: 0, reloj: 0, camara: { x: 0, y: 0, lista: false }, particulas: [] };
  siguiente(rp);
  return rp;
}

function siguiente(rp) {
  rp.i++;
  rp.reloj = 0;
  rp.camara.lista = false;
  rp.particulas.length = 0;
  if (rp.i < rp.cola.length) rp.t = rp.cola[rp.i].desde;
}

export const momentoActual = (rp) => rp.cola[rp.i] || null;
export const reproduccionAcabada = (rp) => rp.i >= rp.cola.length;

/** Sin ver lo que queda. */
export function acabarReproduccion(rp) {
  rp.i = rp.cola.length;
}

/** El toque que salta el momento: no en cuanto empieza (el dedo de la meta aún puede estar ahí). */
export function saltarMomento(rp) {
  if (rp.reloj < SALTAR_REPETICION) return;
  siguiente(rp);
}

/*
 * Avanza `dt` s de reloj, a la velocidad del instante (cámara lenta cerca de
 * él). Devuelve los eventos grabados que han pasado, para el sonido.
 */
export function avanzarReproduccion(rp, dt, polvo) {
  const m = momentoActual(rp);
  if (!m) return [];
  const ritmo = ritmoRepeticion(m, rp.t);
  const t1 = Math.min(m.hasta, rp.t + dt * ritmo);
  const eventos = eventosEntre(rp.rep, rp.t, t1);
  rp.t = t1;
  rp.reloj += dt;
  emitir(rp, eventos, polvo);
  actualizarParticulas(rp.particulas, dt * ritmo);
  seguir(rp, dt);
  if (rp.t >= m.hasta) siguiente(rp);
  return eventos;
}

function emitir(rp, eventos, polvo) {
  for (const e of eventos) {
    if (e.tipo === 'choque') {
      const chispas = chispasChoque(e.fuerza);
      for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) emitirChispas(rp.particulas, { x: e.x, y: e.y, nx, ny }, 0, 0, chispas);
    } else if (e.tipo === 'sale') {
      const v = Math.hypot(e.vx, e.vy) || 1;
      emitirChispas(rp.particulas, { x: e.x, y: e.y, nx: e.vx / v, ny: e.vy / v }, e.vx * 0.3, e.vy * 0.3, 10);
    }
  }
  for (const pose of poseEn(rp.rep, rp.t)) {
    if (pose.estado === 'carril' && pose.derrape > 0.2 && Math.random() < pose.derrape) {
      const nx = Math.cos(pose.angulo), ny = Math.sin(pose.angulo);
      emitirChispas(rp.particulas, { x: pose.x + nx * 15, y: pose.y + ny * 15, nx, ny }, 0, 0, 1);
    }
    if (pose.estado === 'fuera' && pose.rapidez > 30 && Math.random() < 0.6) emitirHumo(rp.particulas, pose.x, pose.y, polvo);
  }
}

/*
 * Los coches como los pinta `dibujarCocheSlot`, en su pose grabada: el resto
 * (color, modelo, largo) es el de los de la carrera.
 */
export function cochesRepeticion(rp, coches) {
  const poses = poseEn(rp.rep, rp.t);
  return coches.map((slot, i) => {
    const pose = poses[i];
    if (!pose) return slot;
    return {
      ficha: slot.ficha,
      altura: pose.altura,
      estado: pose.estado,
      coche: {
        ...slot.coche, x: pose.x, y: pose.y, angulo: pose.angulo,
        vx: Math.cos(pose.angulo) * pose.rapidez, vy: Math.sin(pose.angulo) * pose.rapidez, frenando: pose.frenando, atras: false
      }
    };
  });
}

// --- La cámara ------------------------------------------------------------------

/*
 * A quién mira: el protagonista o, si el momento es de dos y caben juntos en
 * la vista, el punto medio.
 */
function foco(rp, vista) {
  const m = momentoActual(rp);
  const poses = poseEn(rp.rep, rp.t);
  const [a, b] = m.coches.map((i) => poses[i]);
  const zoom = zoomRepeticion(vista);
  if (b && Math.abs(a.x - b.x) < 0.6 * vista.ancho / zoom && Math.abs(a.y - b.y) < 0.6 * vista.alto / zoom) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  return a;
}

let vistaUltima = { ancho: ANCHO, alto: ALTO };

function seguir(rp, dt) {
  if (!momentoActual(rp)) return;
  const objetivo = foco(rp, vistaUltima);
  const { camara } = rp;
  const f = camara.lista ? 1 - Math.exp(-dt / SIGUE_CAMARA) : 1;
  camara.x += (objetivo.x - camara.x) * f;
  camara.y += (objetivo.y - camara.y) * f;
  camara.lista = true;
}

/** Nunca menos del que llena la vista con la mesa. */
function zoomRepeticion(vista) {
  return Math.max(ZOOM_REPETICION, vista.ancho / ANCHO, vista.alto / ALTO);
}

/** `v` entre `menor` y `mayor`; si no cabe, en medio. */
function acotar(v, menor, mayor) {
  return menor > mayor ? (menor + mayor) / 2 : Math.min(mayor, Math.max(menor, v));
}

/*
 * Dibuja el mundo a través de la cámara, en toda la vista (`ancho` × `alto`,
 * en px lógicos del lienzo).
 */
export function conCamaraRepeticion(rp, vista, dibujar) {
  vistaUltima = vista;
  if (!rp.camara.lista) seguir(rp, 0);
  const zoom = zoomRepeticion(vista);
  const medioAncho = vista.ancho / 2 / zoom, medioAlto = vista.alto / 2 / zoom;
  const x = acotar(rp.camara.x, medioAncho, ANCHO - medioAncho);
  const y = acotar(rp.camara.y, medioAlto, ALTO - medioAlto);
  ctx.save();
  ctx.translate(vista.ancho / 2, vista.alto / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-x, -y);
  dibujar();
  ctx.restore();
}

// --- Lo de encima -------------------------------------------------------------------

/** La clave del rótulo de un momento (i18n.js). */
export function claveRotulo(m) {
  if (m.tipo === 'choque') return 'momento.choque.' + m.lugar;
  if (m.tipo === 'salvada') return m.lugar === 'deslizante' ? 'momento.salvadaDeslizante' : 'momento.salvada';
  if (m.tipo === 'adelanta') return m.lugar === 'estrecha' ? 'momento.adelantaEstrecha' : 'momento.adelanta';
  return 'momento.' + m.tipo;
}

/** El tamaño de letra más grande, hasta `tam`, con el que `cadena` cabe en `ancho`. */
function tamQueCabe(cadena, ancho, tam, peso) {
  ctx.font = `${peso} ${tam}px ${FUENTE}`;
  const mide = ctx.measureText(cadena).width;
  return mide > ancho ? Math.floor(tam * ancho / mide) : tam;
}

/*
 * Las bandas de cine, arriba y abajo. Arriba, el rótulo del momento, quién
 * lo protagoniza (con su color) y cuál es; abajo, cómo saltarlo. Un punto
 * rojo parpadea: es una repetición.
 */
export function dibujarRotuloRepeticion(rp, vista, { coches, humanos, tactil, reloj }) {
  const m = momentoActual(rp);
  if (!m) return;
  const estrecha = vista.ancho < 800;
  const banda = estrecha ? 116 : 64;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(0, 0, vista.ancho, banda);
  ctx.fillRect(0, vista.alto - (estrecha ? 56 : 40), vista.ancho, estrecha ? 56 : 40);

  const titulo = t(claveRotulo(m));
  const yTitulo = estrecha ? 54 : banda / 2;
  texto(titulo, vista.ancho / 2, yTitulo, { tam: tamQueCabe(titulo, vista.ancho - (estrecha ? 32 : 520), estrecha ? 30 : 32, 800), color: COLOR.ambar, peso: 800 });

  // Quién: a la izquierda en la mesa, debajo del rótulo en la lupa.
  const nombres = m.tipo === 'adelanta' ? [m.coches[0]] : m.coches;
  ctx.font = `800 16px ${FUENTE}`;
  const quien = nombres.map((i) => nombreSlot(i, humanos));
  const anchoQuien = quien.reduce((s, q) => s + ctx.measureText(q).width + 30, -8);
  let x = estrecha ? vista.ancho / 2 - anchoQuien / 2 : 24;
  const yQuien = estrecha ? 94 : banda / 2;
  nombres.forEach((i, k) => {
    ctx.fillStyle = coches[i].coche.color;
    rectanguloRedondo(x, yQuien - 7, 14, 14, 3);
    texto(quien[k], x + 20, yQuien, { tam: 16, color: COLOR.hud, peso: 800, alinear: 'left' });
    x += ctx.measureText(quien[k]).width + 30;
  });

  // Cuál: el mejor (el que sale solo) o el n de los tres.
  const cual = rp.auto ? t('momento.mejor') : t('momento.de', { n: rp.indices[rp.i] + 1, total: rp.total });
  if (Math.floor(reloj * 2) % 2 === 0) {
    ctx.fillStyle = COLOR.rojo;
    circulo(estrecha ? 18 : vista.ancho - 24, estrecha ? 18 : banda / 2, 6);
  }
  if (estrecha) texto(t('momento.repeticion'), 32, 18, { tam: 13, color: COLOR.hud, peso: 700, alinear: 'left' });
  else texto(cual, vista.ancho - 40, banda / 2, { tam: 15, color: COLOR.hud, peso: 700, alinear: 'right' });

  const pie = (estrecha ? cual + ' · ' : '') + t(tactil ? 'momento.saltarTactil' : 'momento.saltar');
  texto(pie, vista.ancho / 2, vista.alto - (estrecha ? 28 : 20), { tam: estrecha ? 15 : 14, color: COLOR.texto, peso: 600 });
}
