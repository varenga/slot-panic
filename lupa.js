/*
 * Slot Panic — el modo lupa: el móvil en vertical, uno contra la CPU.
 *
 * El lienzo pasa a ser 9:16 (ANCHO_LUPA × ALTO_LUPA) y el mundo entra en él
 * por una cámara que sigue al J1: ampliado alrededor del coche, que queda
 * abajo y centrado mirando hacia arriba (la vista gira con la pista) o en el
 * centro con la pista quieta (la vista fija). Arriba, el marcador y el mapa
 * del circuito entero con los dos coches.
 *
 * Es presentación, como `pantalla.js`: la carrera es la misma, y el mundo se
 * dibuja con las mismas funciones, solo que dentro de la transformación de la
 * cámara. Lo pulsable, como siempre, se define una vez para el dibujo y para
 * la pulsación.
 */

import {
  ALTO, ALTO_LUPA, ANCHO, ANCHO_LUPA, COLOR, LUPA_ADELANTO, LUPA_ADELANTO_FIJA, LUPA_COCHE, LUPA_GIRO, LUPA_ZOOM,
  VUELTAS_SLOT
} from './config.js';
import { circulo, ctx, polilinea, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { formatearTiempo, mejorVueltaSlot, vueltaSlot } from './nucleo/slot.js';
import {
  barraPotencia, boton, ETIQUETA_BOTON, nombreCircuito, nombreSlot, panel, semaforo
} from './pantalla.js';
import { dibujarConfeti } from './particulas.js';
import { idiomaActual, t } from './i18n.js';
import { silenciado } from './audio.js';

const BARRA = 56;                  // px del marcador, arriba
const MAPA = { x: 10, y: BARRA + 6, ancho: ANCHO_LUPA - 20, alto: 230 };
const BAJO_MAPA = MAPA.y + MAPA.alto;
const MARGEN_MAPA = 14;            // px del panel al circuito

/*
 * Lo que el lienzo tiene de más por la densidad de la pantalla: con 540 px
 * lógicos en un móvil de 1080, el mundo ampliado se veía borroso.
 */
let densidad = 1;

export function prepararLupa(nuevaDensidad) {
  densidad = nuevaDensidad;
}

/** Cada fotograma empieza en píxeles lógicos del lienzo 9:16. */
export function empezarFotogramaLupa() {
  ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
}

// --- La cámara ----------------------------------------------------------------

export function crearCamara() {
  return { x: 0, y: 0, angulo: 0, lista: false };
}

/** El ángulo `a` llevado hacia `b` por el camino corto, una fracción `f`. */
function acercarAngulo(a, b, f) {
  return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * f;
}

/*
 * La cámara sigue al coche: su punto es el del coche y su ángulo, el de la
 * pista un poco por delante, con retraso. El de la pista y no el del coche:
 * con el coleteo, o dando vueltas por la mesa, la vista daba bandazos.
 */
export function seguirCamara(camara, slot, circuito, dt) {
  const objetivo = circuito.puntoEn(slot.s + LUPA_ADELANTO).angulo;
  const { coche } = slot;
  if (!camara.lista) {
    camara.angulo = objetivo;
    camara.lista = true;
  } else {
    camara.angulo = acercarAngulo(camara.angulo, objetivo, 1 - Math.exp(-dt / LUPA_GIRO));
  }
  camara.x = coche.x;
  camara.y = coche.y;
}

/*
 * Dibuja el mundo a través de la cámara. Fuera de la mesa (1280 × 720) no hay
 * nada: el color de fondo.
 */
export function conCamara(camara, vista, zoom, dibujar) {
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, ANCHO_LUPA, ALTO_LUPA);
  ctx.save();
  if (vista === 'gira') {
    ctx.translate(ANCHO_LUPA / 2, ALTO_LUPA - LUPA_COCHE);
    ctx.scale(zoom, zoom);
    // El sentido de la marcha, hacia arriba.
    ctx.rotate(-Math.PI / 2 - camara.angulo);
    ctx.translate(-camara.x, -camara.y);
  } else {
    // Mira por delante del coche, pero sin enseñar fuera de la mesa si cabe:
    // por los bordes, media pantalla se quedaba en negro.
    const medioAncho = ANCHO_LUPA / 2 / zoom, medioAlto = (ALTO_LUPA - BAJO_MAPA) / 2 / zoom;
    const x = acotar(camara.x + Math.cos(camara.angulo) * LUPA_ADELANTO_FIJA, medioAncho, ANCHO - medioAncho);
    const y = acotar(camara.y + Math.sin(camara.angulo) * LUPA_ADELANTO_FIJA, medioAlto, ALTO - medioAlto);
    ctx.translate(ANCHO_LUPA / 2, (BAJO_MAPA + ALTO_LUPA) / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-x, -y);
  }
  // El borde de la mesa: que se sepa dónde se acaba el mundo.
  ctx.fillStyle = COLOR.hierba;
  ctx.fillRect(-12, -12, ANCHO + 24, ALTO + 24);
  ctx.beginPath();
  ctx.rect(0, 0, ANCHO, ALTO);
  ctx.clip();
  dibujar();
  ctx.restore();
}

/** `v` entre `menor` y `mayor`; si no cabe, en medio. */
function acotar(v, menor, mayor) {
  return menor > mayor ? (menor + mayor) / 2 : Math.min(mayor, Math.max(menor, v));
}

/** El zoom que se pide con ?lupa=1.2, o el de siempre. */
export function zoomLupa(parametro) {
  const z = parseFloat(parametro);
  return Number.isFinite(z) && z >= 0.3 && z <= 4 ? z : LUPA_ZOOM;
}

// --- El mapa -------------------------------------------------------------------

let claveMapa = '';
let encaje = null;

/** Escala y desplazamiento que meten el circuito entero en el panel del mapa. */
function encajeMapa(circuito) {
  if (claveMapa === circuito.clave) return encaje;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of circuito.eje) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const borde = circuito.ancho / 2;
  x0 -= borde; y0 -= borde; x1 += borde; y1 += borde;
  const escala = Math.min((MAPA.ancho - 2 * MARGEN_MAPA) / (x1 - x0), (MAPA.alto - 2 * MARGEN_MAPA) / (y1 - y0));
  encaje = {
    escala,
    x: MAPA.x + MAPA.ancho / 2 - (x0 + x1) / 2 * escala,
    y: MAPA.y + MAPA.alto / 2 - (y0 + y1) / 2 * escala
  };
  claveMapa = circuito.clave;
  return encaje;
}

/** El circuito entero, la meta y los coches; el J1, con un aro. */
export function dibujarMapa(circuito, coches) {
  const { escala, x, y } = encajeMapa(circuito);
  ctx.fillStyle = COLOR.panel;
  rectanguloRedondo(MAPA.x, MAPA.y, MAPA.ancho, MAPA.alto, 10);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(escala, escala);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLOR.borde;
  ctx.lineWidth = circuito.ancho + 8;
  polilinea(circuito.eje);
  ctx.strokeStyle = COLOR.calzada;
  ctx.lineWidth = circuito.ancho;
  polilinea(circuito.eje);
  // La meta, de lado a lado.
  const meta = circuito.puntoEn(0);
  const nx = -Math.sin(meta.angulo) * circuito.ancho / 2, ny = Math.cos(meta.angulo) * circuito.ancho / 2;
  ctx.strokeStyle = COLOR.hud;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(meta.x - nx, meta.y - ny);
  ctx.lineTo(meta.x + nx, meta.y + ny);
  ctx.stroke();
  ctx.restore();

  // Los coches, a tamaño fijo: a escala serían un punto. Primero la CPU.
  for (let i = coches.length - 1; i >= 0; i--) {
    const { coche } = coches[i];
    const cx = x + coche.x * escala, cy = y + coche.y * escala;
    if (i === 0) {
      ctx.fillStyle = COLOR.hud;
      circulo(cx, cy, 9);
    }
    ctx.fillStyle = coche.color;
    circulo(cx, cy, 6.5);
  }
}

// --- La carrera ------------------------------------------------------------------

/*
 * El marcador: el J1 a la izquierda y la CPU a la derecha, cada uno con su
 * vuelta; en el centro, la cuenta atrás o el tiempo. Debajo del J1, su
 * potencia.
 */
export function dibujarMarcadorLupa(carrera, humanos) {
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ANCHO_LUPA, BARRA);
  carrera.coches.forEach((slot, i) => {
    const izquierda = i === 0;
    const borde = izquierda ? 12 : ANCHO_LUPA - 12;
    const lado = izquierda ? 1 : -1;
    const alinear = izquierda ? 'left' : 'right';
    const y = BARRA / 2 - 6;
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(izquierda ? borde : borde - 18, y - 9, 18, 18, 4);
    texto(nombreSlot(i, humanos), borde + lado * 26, y, { tam: 20, color: COLOR.hud, peso: 800, alinear });
    // Tras el nombre, mida lo que mida («J1» o «CPU»).
    const nombre = ctx.measureText(nombreSlot(i, humanos)).width;
    texto(`${vueltaSlot(slot)}/${VUELTAS_SLOT}`, borde + lado * (26 + nombre + 12), y, { tam: 20, color: COLOR.hud, peso: 700, alinear });
    barraPotencia(slot, izquierda ? borde : borde - 150, BARRA - 12, 150);
  });
  if (carrera.fase === 'cuenta') {
    texto(String(Math.ceil(carrera.cuenta)), ANCHO_LUPA / 2, BARRA / 2 + 1, { tam: 34, color: COLOR.ambar, peso: 800 });
  } else {
    texto(formatearTiempo(carrera.tiempo), ANCHO_LUPA / 2, BARRA / 2 + 1, { tam: 26, color: COLOR.hud, peso: 700 });
  }
  semaforo(carrera, ANCHO_LUPA / 2, BAJO_MAPA + 40);
  if (carrera.fase === 'cuenta') {
    const y = (BAJO_MAPA + ALTO_LUPA) / 2 - 60;
    panel(ANCHO_LUPA / 2, y - 26, 360, 52);
    texto(t('slot.mantener'), ANCHO_LUPA / 2, y, { tam: 20, color: COLOR.hud, peso: 700 });
  }
}

/** Los carteles (la última vuelta), bajo el mapa. */
export function dibujarAvisosLupa(avisos) {
  avisos.forEach((aviso, i) => {
    ctx.globalAlpha = Math.min(1, aviso.vida);
    const y = BAJO_MAPA + 44 + i * 40 - (1.6 - aviso.vida) * 12;
    panel(ANCHO_LUPA / 2, y - 18, 300, 36);
    texto(aviso.texto, ANCHO_LUPA / 2, y, { tam: 22, color: aviso.color || COLOR.ambar, peso: 700 });
  });
  ctx.globalAlpha = 1;
}

// --- Portada ---------------------------------------------------------------------

/* Las opciones, en dos columnas abajo. Dibujo y pulsación. */
const OPCIONES = ['circuito', 'hora', 'escenario', 'vista', 'sonido', 'idioma'];

export function opcionesPortadaLupa() {
  const columnas = 2, alto = 44, hueco = 12;
  const ancho = (ANCHO_LUPA - 2 * 16 - hueco) / columnas;
  const filas = Math.ceil(OPCIONES.length / columnas);
  const y0 = ALTO_LUPA - 52 - filas * alto - (filas - 1) * hueco;
  return OPCIONES.map((id, i) => ({
    id,
    x: 16 + (i % columnas) * (ancho + hueco),
    y: y0 + Math.floor(i / columnas) * (alto + hueco),
    ancho,
    alto
  }));
}

export function dibujarPortadaLupa({ circuito, carrera, tiempo, escenario, hora, vista }) {
  dibujarMapa(circuito, carrera.coches);
  const x = ANCHO_LUPA / 2, y = BAJO_MAPA + 30;
  panel(x, y, 440, 200);
  texto('SLOT PANIC', x, y + 50, { tam: 54, color: COLOR.hud, peso: 800 });
  texto(t('slot.lema'), x, y + 96, { tam: 18, color: COLOR.texto, peso: 500 });
  if (Math.floor(tiempo * 1.6) % 2 === 0) {
    texto(t('portada.jugarTactil'), x, y + 138, { tam: 26, color: COLOR.ambar, peso: 700 });
  }
  texto(t('carrera.titulo', { circuito: nombreCircuito(circuito), vueltas: VUELTAS_SLOT }), x, y + 174, { tam: 15, color: COLOR.texto });

  const valores = {
    circuito: nombreCircuito(circuito),
    sonido: t(silenciado() ? 'sonido.no' : 'sonido.si'),
    idioma: idiomaActual().nombre.toUpperCase(),
    escenario: t('escenario.' + escenario),
    hora: t('hora.' + hora),
    vista: t('vista.' + vista)
  };
  for (const opcion of opcionesPortadaLupa()) boton(opcion, t('opcion.' + opcion.id, { v: valores[opcion.id] }), false, 17);
}

// --- Fin -------------------------------------------------------------------------

export function botonesFinLupa() {
  const ancho = 220, alto = 56, hueco = 20;
  const x0 = ANCHO_LUPA / 2 - ancho - hueco / 2;
  return ['repetir', 'menu'].map((id, i) => ({ id, x: x0 + i * (ancho + hueco), y: ALTO_LUPA / 2 + 150, ancho, alto }));
}

export function dibujarFinLupa(carrera, humanos, particulas) {
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ANCHO_LUPA, ALTO_LUPA);
  const x = ANCHO_LUPA / 2, y = ALTO_LUPA / 2;
  const ganador = carrera.coches[carrera.ganador];
  texto(t('slot.gana', { quien: nombreSlot(carrera.ganador, humanos) }), x, y - 130, { tam: 44, color: ganador.coche.color, peso: 800 });
  texto(t('fin.tiempo', { tiempo: formatearTiempo(ganador.terminado) }), x, y - 70, { tam: 28, color: COLOR.hud, peso: 700 });
  carrera.coches.forEach((slot, i) => {
    const fila = y - 10 + i * 60;
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(x - 220, fila - 9, 18, 18, 4);
    texto(nombreSlot(i, humanos), x - 192, fila, { tam: 20, color: COLOR.hud, peso: 800, alinear: 'left' });
    texto(t('slot.resumen', { tiempo: formatearTiempo(mejorVueltaSlot(slot)), n: slot.salidas }), x, fila + 26, { tam: 16, color: COLOR.texto });
  });
  for (const caja of botonesFinLupa()) boton(caja, t(ETIQUETA_BOTON[caja.id]), caja.id === 'repetir', 20);
  // El confeti cae en coordenadas de la mesa (1280 × 720): se estira al lienzo.
  ctx.save();
  ctx.scale(ANCHO_LUPA / ANCHO, ALTO_LUPA / ALTO);
  dibujarConfeti(particulas);
  ctx.restore();
}

/** Solo sirviendo en local: lo mismo que `dibujarDepuracion`, abajo. */
export function dibujarDepuracionLupa(fps, slot, zoom) {
  const { coche } = slot;
  const datos = `${fps} FPS · v ${Math.hypot(coche.vx, coche.vy).toFixed(0)} · exigencia ${(slot.exigencia * 100).toFixed(0)} · zoom ${zoom}`;
  texto(datos, ANCHO_LUPA - 10, ALTO_LUPA - 12, { tam: 12, color: COLOR.texto, alinear: 'right', peso: 500 });
}
