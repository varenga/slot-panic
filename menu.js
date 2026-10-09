/*
 * Slot Panic — el menú de la portada: cuatro grupos y el panel de cada uno.
 *
 * Con diez opciones en fila, en un portátil la letra de la barra bajaba a
 * 9-11 px. Ahora la barra lleva cuatro botones: CARRERA (modo, circuito,
 * vueltas, CPU y, con teclado, quién juega), COCHE (modelo y color de cada
 * uno), CIRCUITOS (la galería y el constructor, en su escena) y AJUSTES
 * (escenario, hora, sonido, idioma). Cada uno abre un panel sobre la pista;
 * con teclado siguen las teclas directas de cada opción, sin abrir nada.
 *
 * Es presentación, como `pantalla.js`, y sirve a la mesa y a la lupa: cada
 * una da su `marco` (dónde cabe el panel) y su `vista`. Lo pulsable se define
 * una vez, en `cajasGrupos` y `cajasMenu`, para el dibujo y para la pulsación.
 */

import { COLOR, COLORES_COCHE, LARGO_COCHE } from './config.js';
import { ctx, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { BANDA_TEXTO } from './nucleo/decorado.js';
import { modelo, pintarModelo } from './coches.js';
import { boton, nombreCircuito, vueltasDe } from './pantalla.js';
import { idiomaActual, t } from './i18n.js';
import { silenciado } from './audio.js';

export const GRUPOS = ['carrera', 'coche', 'circuitos', 'ajustes'];

/** La tecla directa de cada opción (con teclado), que funciona con el panel cerrado. */
export const TECLA_OPCION = {
  modo: 'T', circuito: 'C', duracion: 'V', nivel: 'D', j1: '1', j2: '2', escenario: 'E', hora: 'H', sonido: 'M', idioma: 'L'
};

/** Las filas de un grupo. Quién juega solo se elige con teclado: tocando, se entra tocando. */
export function opcionesGrupo(grupo, eligeJugadores) {
  if (grupo === 'carrera') return ['modo', 'circuito', 'duracion', 'nivel', ...(eligeJugadores ? ['j1', 'j2'] : [])];
  if (grupo === 'ajustes') return ['escenario', 'hora', 'sonido', 'idioma'];
  return [];
}

// --- La barra de los grupos ----------------------------------------------------------

/*
 * En la mesa, los cuatro en la banda de arriba, iguales; en la lupa, abajo,
 * de dos en dos. Dibujo y pulsación.
 */
export function cajasGrupos(vista) {
  if (vista.lupa) {
    const alto = 52, hueco = 12, ancho = (vista.ancho - 2 * 16 - hueco) / 2;
    const y0 = vista.alto - 40 - 2 * alto - hueco;
    return GRUPOS.map((id, i) => ({
      id, x: 16 + (i % 2) * (ancho + hueco), y: y0 + Math.floor(i / 2) * (alto + hueco), ancho, alto
    }));
  }
  const alto = 36, hueco = 10, ancho = Math.floor((vista.ancho - 24 - hueco * (GRUPOS.length - 1)) / GRUPOS.length);
  return GRUPOS.map((id, i) => ({ id, x: 12 + i * (ancho + hueco), y: (BANDA_TEXTO - alto) / 2, ancho, alto }));
}

export function dibujarGrupos(vista, abierto) {
  for (const caja of cajasGrupos(vista)) {
    const etiqueta = t(caja.id === 'circuitos' ? 'opcion.circuitos' : 'grupo.' + caja.id);
    boton(caja, etiqueta + (caja.id === abierto ? '' : '  ›'), caja.id === abierto, vista.lupa ? 19 : 17);
  }
}

// --- El panel de un grupo -----------------------------------------------------------

/*
 * Las cajas del panel, de arriba abajo desde el título: las filas de opciones
 * o, en COCHE, una columna por jugador (la vista del coche, que también
 * cambia de modelo, las flechas y los colores); al final, LISTO. Devuelve
 * también el alto del panel, que se ajusta a lo que lleva.
 */
export function cajasMenu(marco, grupo, { columnas = 2, eligeJugadores = false, lupa = false }) {
  const cx = marco.x + marco.ancho / 2;
  const fila = lupa ? 52 : 42, hueco = 10;
  const cajas = [];
  let y = marco.y + 62;
  if (grupo === 'coche') {
    const entre = 28;
    const anchoColumna = Math.min(300, (marco.ancho - 40 - entre * (columnas - 1)) / columnas);
    const x0 = cx - (anchoColumna * columnas + entre * (columnas - 1)) / 2;
    const lado = lupa ? 50 : 40, separa = 10;
    let fondo = y;
    for (let i = 0; i < columnas; i++) {
      const x = x0 + i * (anchoColumna + entre);
      let yc = y + 22;
      cajas.push({ id: 'vista', i, x, y: yc, ancho: anchoColumna, alto: 110 });
      yc += 110 + 10;
      cajas.push({ id: 'modelo', i, paso: -1, x, y: yc, ancho: fila, alto: fila });
      cajas.push({ id: 'modelo', i, paso: 1, x: x + anchoColumna - fila, y: yc, ancho: fila, alto: fila });
      yc += fila + 14;
      const xs = x + (anchoColumna - (4 * lado + 3 * separa)) / 2;
      COLORES_COCHE.forEach((_, c) => cajas.push({
        id: 'color', i, c, x: xs + (c % 4) * (lado + separa), y: yc + Math.floor(c / 4) * (lado + separa), ancho: lado, alto: lado
      }));
      fondo = Math.max(fondo, yc + 2 * lado + separa);
    }
    y = fondo + 22;
  } else {
    const ancho = Math.min(460, marco.ancho - 40);
    for (const opcion of opcionesGrupo(grupo, eligeJugadores)) {
      cajas.push({ id: 'opcion', opcion, x: cx - ancho / 2, y, ancho, alto: fila });
      y += fila + hueco;
    }
    y += 8;
  }
  cajas.push({ id: 'listo', x: cx - 110, y, ancho: 220, alto: fila });
  return { cajas, alto: y + fila + 20 - marco.y, ancho: grupo === 'coche' ? marco.ancho : Math.min(marco.ancho, 520) };
}

/** Lo que pone cada fila (con su tecla si hay teclado). */
export function etiquetaOpcion(id, e, teclado) {
  let v;
  if (id === 'modo') v = t(e.modo === 'campeonato' ? 'opcion.campeonato' : 'modo.suelta');
  else if (id === 'circuito') v = nombreCircuito(e.circuito);
  else if (id === 'duracion') v = `${vueltasDe(e.duracion)} · ${t('duracion.' + e.duracion)}`;
  else if (id === 'nivel') v = t('nivel.' + e.nivel);
  else if (id === 'escenario') v = t('escenario.' + e.escenario);
  else if (id === 'hora') v = t('hora.' + e.hora);
  else if (id === 'sonido') v = t(silenciado() ? 'sonido.no' : 'sonido.si');
  else if (id === 'idioma') v = idiomaActual().nombre.toUpperCase();
  let etiqueta;
  if (id === 'j1' || id === 'j2') {
    const n = id === 'j1' ? 1 : 2;
    etiqueta = t('opcion.jugador', { j: t('slot.jugador', { n }), v: t(e.jugadores[n - 1] === 'humano' ? 'jugador.humano' : 'slot.cpu') });
  } else etiqueta = t('opcion.' + id, { v });
  return (teclado ? TECLA_OPCION[id] + '  ·  ' : '') + etiqueta;
}

/*
 * El panel abierto. `e` es el estado (circuito, modelos, colores…); en la
 * lupa, `columnas` es 1: solo el coche del J1 (el otro es de la CPU).
 */
export function dibujarMenu(marco, grupo, e, { columnas = 2, eligeJugadores = false, lupa = false, teclado = false }) {
  const { cajas, alto, ancho } = cajasMenu(marco, grupo, { columnas, eligeJugadores, lupa });
  const cx = marco.x + marco.ancho / 2;
  // Más opaco que el de la portada: encima de la pista, las filas tienen que leerse.
  ctx.fillStyle = 'rgba(18, 20, 26, 0.9)';
  rectanguloRedondo(cx - ancho / 2, marco.y, ancho, alto, 10);
  texto(t(grupo === 'circuitos' ? 'opcion.circuitos' : 'grupo.' + grupo), cx, marco.y + 32, { tam: lupa ? 30 : 26, color: COLOR.hud, peso: 800 });
  const tam = lupa ? 18 : 15;
  for (const caja of cajas) {
    if (caja.id === 'opcion') boton(caja, etiquetaOpcion(caja.opcion, e, teclado), false, tam);
    else if (caja.id === 'listo') boton(caja, t('menu.listo'), true, tam);
    else if (caja.id === 'vista') vistaCoche(caja, e.modelos[caja.i], e.colores[caja.i], e, lupa);
    else if (caja.id === 'modelo') boton(caja, caja.paso < 0 ? '‹' : '›', false, tam + 8);
    else if (caja.id === 'color') muestra(caja, COLORES_COCHE[caja.c], e.colores[caja.i] === COLORES_COCHE[caja.c]);
  }
  // El nombre del modelo, entre sus flechas.
  for (const caja of cajas) {
    if (caja.id !== 'modelo' || caja.paso > 0) continue;
    const vista = cajas.find((c) => c.id === 'vista' && c.i === caja.i);
    texto(t('coche.' + e.modelos[caja.i]), vista.x + vista.ancho / 2, caja.y + caja.alto / 2 + 1, { tam: tam + 2, color: COLOR.hud, peso: 700 });
  }
}

/* El coche de un jugador, grande y de lado, con quién lo lleva encima (en su color). */
function vistaCoche(caja, id, color, e, lupa) {
  const cx = caja.x + caja.ancho / 2;
  const quien = t('slot.jugador', { n: caja.i + 1 });
  const cpu = !lupa && !e.tactil && e.jugadores[caja.i] === 'cpu';
  texto(cpu ? `${quien} · ${t('slot.cpu')}` : quien, cx, caja.y - 12, { tam: lupa ? 22 : 18, color, peso: 800 });
  ctx.fillStyle = 'rgba(230, 232, 238, 0.06)';
  rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 8);
  const escala = Math.min(caja.ancho * 0.62, (caja.alto - 20) * 2) / LARGO_COCHE;
  ctx.save();
  ctx.translate(cx, caja.y + caja.alto / 2);
  ctx.scale(escala, escala);
  pintarModelo(modelo(id), color);
  ctx.restore();
}

/** Una muestra de color: la elegida, con un aro. */
function muestra(caja, color, elegida) {
  if (elegida) {
    ctx.fillStyle = COLOR.hud;
    rectanguloRedondo(caja.x - 4, caja.y - 4, caja.ancho + 8, caja.alto + 8, 9);
    ctx.fillStyle = COLOR.fondo;
    rectanguloRedondo(caja.x - 1, caja.y - 1, caja.ancho + 2, caja.alto + 2, 7);
  }
  ctx.fillStyle = color;
  rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 6);
}
