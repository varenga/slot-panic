/*
 * Slot Panic — el modo lupa: el móvil en vertical, uno contra la CPU.
 *
 * El lienzo pasa a ser vertical (ANCHO_LUPA de ancho y el alto de la
 * proporción de la pantalla, de 9:16 en adelante) y el mundo entra en él
 * por una cámara que sigue al J1: ampliado y adelantado hacia donde va el
 * coche, con la pista quieta. Arriba, el marcador y el mapa del circuito
 * entero con los dos coches.
 *
 * Una vista que giraba con la pista, con el coche siempre abajo y hacia
 * arriba, mareaba en el primer playtest: se quitó.
 *
 * Es presentación, como `pantalla.js`: la carrera es la misma, y el mundo se
 * dibuja con las mismas funciones, solo que dentro de la transformación de la
 * cámara. Lo pulsable, como siempre, se define una vez para el dibujo y para
 * la pulsación.
 */

import {
  ALTO, ALTO_LUPA, ALTO_LUPA_MAXIMO, ANCHO, ANCHO_LUPA, COLOR, LUPA_ADELANTO, LUPA_GIRO, LUPA_MIRA, LUPA_ZOOM,
  MAPA_CRECE
} from './config.js';
import { circulo, ctx, polilinea, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { formatearTiempo, mejorVueltaSlot, vueltaSlot } from './nucleo/slot.js';
import { serieAcabada } from './nucleo/mangas.js';
import {
  barraPotencia, boton, DESTACADO, ETIQUETA_BOTON, idsFinCampeonato, nombreCircuito, nombreSlot, ordenLlegada, panel, pintarCabeceraCampeonato,
  pintarCabeceraSerie, pintarTablaCampeonato, pintarTablaSerie, semaforo, tituloPortada
} from './pantalla.js';
import { dibujarConfeti } from './particulas.js';
import { t } from './i18n.js';

const BARRA = 56;                  // px del marcador, arriba
const ALTO_MAPA = 230;              // px del mapa con el lienzo en 9:16
const MARGEN_MAPA = 14;            // px del panel al circuito

/*
 * El alto del lienzo, el de la pantalla (`altoLupa`), y lo que depende de él:
 * el mapa crece con una parte de lo que pasa de 9:16 y la zona de juego, con
 * el resto. `densidad` es lo que el lienzo tiene de más por la densidad de la
 * pantalla: con 540 px lógicos en un móvil de 1080, el mundo ampliado se veía
 * borroso.
 */
let altoLienzo = ALTO_LUPA;
let densidad = 1;
let claveMapa = '';
let MAPA = null;
let BAJO_MAPA = 0;

export function prepararLupa(nuevaDensidad, nuevoAlto) {
  densidad = nuevaDensidad;
  altoLienzo = nuevoAlto;
  MAPA = { x: 10, y: BARRA + 6, ancho: ANCHO_LUPA - 20, alto: Math.round(ALTO_MAPA + (altoLienzo - ALTO_LUPA) * MAPA_CRECE) };
  BAJO_MAPA = MAPA.y + MAPA.alto;
  claveMapa = '';
}

prepararLupa(1, ALTO_LUPA);

/** El alto del lienzo de la lupa, en px lógicos: lo que no es la carrera (la galería) también lo usa. */
export const altoLienzoLupa = () => altoLienzo;

/** El alto del lienzo para una pantalla de `ancho` × `altoPantalla`. */
export function altoLupa(ancho, altoPantalla) {
  const proporcional = Math.round(ANCHO_LUPA * altoPantalla / Math.max(1, ancho));
  return Math.min(ALTO_LUPA_MAXIMO, Math.max(ALTO_LUPA, proporcional));
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
 * La cámara sigue al coche: su punto es el del coche y su ángulo (hacia dónde
 * se adelanta la vista), el de la pista un poco por delante, con retraso. El
 * de la pista y no el del coche: con el coleteo, o dando vueltas por la mesa,
 * la vista daba bandazos.
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
 * Dibuja el mundo a través de la cámara, en la zona de juego: lo que queda
 * bajo el mapa. Arriba, el fondo liso, para el marcador y el mapa.
 *
 * La vista mira por delante del coche, pero nunca fuera de la mesa (1280 ×
 * 720): se acota, y el zoom no baja de lo que la llena (`zoomLupa`). Así no
 * hay que pintar nada más allá de la mesa, ni cuesta nada.
 */
export function conCamara(camara, zoomPedido, dibujar, conAcelerador = false) {
  const zoom = zoomEfectivo(zoomPedido);
  // Con el acelerador, la vista acaba donde empieza su franja: el dedo no la tapa.
  const bajo = altoLienzo - (conAcelerador ? ALTO_ACELERADOR : 0);
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, ANCHO_LUPA, BAJO_MAPA);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BAJO_MAPA, ANCHO_LUPA, bajo - BAJO_MAPA);
  ctx.clip();
  const medioAncho = ANCHO_LUPA / 2 / zoom, medioAlto = (bajo - BAJO_MAPA) / 2 / zoom;
  const x = acotar(camara.x + Math.cos(camara.angulo) * LUPA_MIRA, medioAncho, ANCHO - medioAncho);
  const y = acotar(camara.y + Math.sin(camara.angulo) * LUPA_MIRA, medioAlto, ALTO - medioAlto);
  ctx.translate(ANCHO_LUPA / 2, (BAJO_MAPA + bajo) / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-x, -y);
  dibujar();
  ctx.restore();
}

/** `v` entre `menor` y `mayor`; si no cabe, en medio. */
function acotar(v, menor, mayor) {
  return menor > mayor ? (menor + mayor) / 2 : Math.min(mayor, Math.max(menor, v));
}

/** El zoom que se pide con ?lupa=1.5, o el de siempre. */
export function zoomLupa(parametro) {
  const z = parseFloat(parametro);
  return Number.isFinite(z) && z > 0 && z <= 4 ? z : LUPA_ZOOM;
}

/*
 * Nunca menos del que llena la zona de juego con la mesa: por debajo, se
 * vería más allá de ella. Depende del alto de la pantalla.
 */
export function zoomEfectivo(zoom) {
  return Math.max(zoom, ANCHO_LUPA / ANCHO, (altoLienzo - BAJO_MAPA) / ALTO);
}

// --- El acelerador -------------------------------------------------------------

/*
 * Abajo, en la carrera, el sitio del dedo: la vista acaba encima y el dedo
 * ya no tapa el coche. Se acelera igual pulsando en cualquier parte; la
 * franja solo dice dónde. Dentro, la potencia que lleva el coche.
 *
 * Se probó como gatillo analógico (la altura del dedo, cuánto): costaba
 * dosificar y a toques se juega desde el primer momento (IDEAS.md).
 */
const ALTO_ACELERADOR = 120;       // px de la franja

/** La franja: el pedal, que se enciende con el dedo y se llena con la potencia. */
export function dibujarAcelerador(slot, pulsado) {
  const arriba = altoLienzo - ALTO_ACELERADOR;
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, arriba, ANCHO_LUPA, ALTO_ACELERADOR);
  const ancho = 340, alto = 64;
  const x = (ANCHO_LUPA - ancho) / 2, y = arriba + (ALTO_ACELERADOR - alto) / 2;
  ctx.fillStyle = pulsado ? 'rgba(230, 232, 238, 0.16)' : 'rgba(230, 232, 238, 0.07)';
  rectanguloRedondo(x, y, ancho, alto, 14);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, ancho, alto, 14);
  ctx.clip();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = slot.derrape > 0 ? COLOR.rojo : slot.coche.color;
  ctx.fillRect(x, y, ancho * slot.potencia, alto);
  ctx.restore();
  ctx.strokeStyle = pulsado ? slot.coche.color : 'rgba(230, 232, 238, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, ancho, alto, 14);
  ctx.stroke();
  // Las estrías del pedal, a la izquierda del rótulo.
  ctx.fillStyle = pulsado ? COLOR.hud : COLOR.texto;
  for (let k = 0; k < 3; k++) rectanguloRedondo(x + 26, y + 18 + k * 11, 34, 6, 3);
  texto(t('slot.acelerador'), x + ancho / 2 + 22, y + alto / 2 + 1, { tam: 22, color: pulsado ? COLOR.hud : COLOR.texto, peso: 800 });
}

// --- El mapa -------------------------------------------------------------------

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
 * potencia. En la pista de cuatro, a la derecha, el puesto del J1.
 */
export function dibujarMarcadorLupa(carrera, humanos, rotulo = null) {
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ANCHO_LUPA, BARRA);
  if (carrera.coches.length > 2) {
    const puesto = ordenEnCarrera(carrera).indexOf(0) + 1;
    texto(t('hud.puesto', { n: puesto, total: carrera.coches.length }), ANCHO_LUPA - 12, BARRA / 2 - 6, { tam: 20, color: COLOR.hud, peso: 800, alinear: 'right' });
  }
  carrera.coches.slice(0, carrera.coches.length > 2 ? 1 : 2).forEach((slot, i) => {
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
    texto(`${vueltaSlot(carrera, slot)}/${carrera.vueltas}`, borde + lado * (26 + nombre + 12), y, { tam: 20, color: COLOR.hud, peso: 700, alinear });
    barraPotencia(slot, izquierda ? borde : borde - 150, BARRA - 12, 150);
  });
  if (carrera.fase === 'cuenta') {
    texto(String(Math.ceil(carrera.cuenta)), ANCHO_LUPA / 2, BARRA / 2 + 1, { tam: 34, color: COLOR.ambar, peso: 800 });
  } else {
    texto(formatearTiempo(carrera.tiempo), ANCHO_LUPA / 2, BARRA / 2 + 1, { tam: 26, color: COLOR.hud, peso: 700 });
  }
  semaforo(carrera, ANCHO_LUPA / 2, BAJO_MAPA + 40);
  if (carrera.fase === 'cuenta') {
    const y = (BAJO_MAPA + altoLienzo) / 2 - 60;
    panel(ANCHO_LUPA / 2, y - 26, 360, 52);
    texto(t('slot.mantener'), ANCHO_LUPA / 2, y, { tam: 20, color: COLOR.hud, peso: 700 });
    if (rotulo) {
      panel(ANCHO_LUPA / 2, y + 36, 440, 36);
      texto(rotulo, ANCHO_LUPA / 2, y + 55, { tam: 16, color: COLOR.ambar, peso: 700 });
    }
  }
}

/** Quién va delante: por lo que ha corrido (o, ya en la meta, por cuándo llegó). */
function ordenEnCarrera(carrera) {
  if (carrera.fase !== 'carrera') return ordenLlegada(carrera);
  return carrera.coches.map((_, i) => i).sort((a, b) => carrera.coches[b].progreso - carrera.coches[a].progreso);
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

/*
 * Las opciones van en el menú (menu.js): los cuatro grupos, abajo, y el panel
 * del abierto entre el mapa y ellos.
 */
export function marcoMenuLupa() {
  const y = BAJO_MAPA + 16;
  return { x: 16, y, ancho: ANCHO_LUPA - 32, alto: altoLienzo - 40 - 2 * 52 - 12 - 16 - y };
}

/** El botón de los récords, en el panel de la portada de la lupa. Dibujo y pulsación. */
export function cajaRecordsPortadaLupa() {
  return { id: 'records', x: ANCHO_LUPA / 2 - 210, y: BAJO_MAPA + 30 + 168, ancho: 420, alto: 28 };
}

export function dibujarPortadaLupa({ circuito, carrera, tiempo, duracion, modo, marca, menu }) {
  dibujarMapa(circuito, carrera.coches);
  if (menu) return;
  const x = ANCHO_LUPA / 2, y = BAJO_MAPA + 30;
  panel(x, y, 440, 200);
  texto('SLOT PANIC', x, y + 50, { tam: 54, color: COLOR.hud, peso: 800 });
  texto(t('slot.lema'), x, y + 96, { tam: 18, color: COLOR.texto, peso: 500 });
  if (Math.floor(tiempo * 1.6) % 2 === 0) {
    texto(t('portada.jugarTactil'), x, y + 138, { tam: 26, color: COLOR.ambar, peso: 700 });
  }
  const conMarca = marca && modo !== 'campeonato';
  texto(tituloPortada(circuito, duracion, modo), x, y + (conMarca ? 158 : 174), { tam: 15, color: COLOR.texto });
  if (conMarca) boton(cajaRecordsPortadaLupa(), marca + '  ›', false, 15);
}

// --- Fin -------------------------------------------------------------------------

export function botonesFinLupa(ids = ['repetir', 'menu'], y = altoLienzo / 2 + 150) {
  const ancho = 220, alto = 56, hueco = 20;
  const x0 = ANCHO_LUPA / 2 - ancho - hueco / 2;
  // De dos en dos (debajo, momentos y denunciar); el último, si queda solo, centrado.
  return ids.map((id, i) => {
    const solo = i === ids.length - 1 && i % 2 === 0;
    const x = solo ? ANCHO_LUPA / 2 - ancho / 2 : x0 + (i % 2) * (ancho + hueco);
    return { id, x, y: y + Math.floor(i / 2) * (alto + hueco), ancho, alto };
  });
}

/** Los del campeonato y los de las mangas van más abajo: encima va la tabla. */
export function botonesFinTablaLupa(ids) {
  return botonesFinLupa(ids, altoLienzo / 2 + 230);
}

export function dibujarFinLupa(carrera, humanos, particulas, { campeonato = null, serie = null } = {}, ids = undefined) {
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ANCHO_LUPA, altoLienzo);
  const x = ANCHO_LUPA / 2, y = altoLienzo / 2;
  if (campeonato || serie) {
    const cuatro = carrera.coches.length > 2;
    const tabla = { x, y: y - 150, mitad: cuatro ? 250 : 230, tam: cuatro ? 15 : 18, fila: 40 };
    // A media serie, las mangas; acabada, el campeonato si lo hay.
    if (campeonato && !(serie && !serieAcabada(serie))) {
      pintarCabeceraCampeonato(carrera, humanos, campeonato, x, y - 230, 40);
      pintarTablaCampeonato(campeonato, carrera, humanos, tabla);
    } else {
      pintarCabeceraSerie(carrera, humanos, serie, x, y - 230, 40);
      pintarTablaSerie(serie, carrera, humanos, tabla);
    }
    for (const caja of botonesFinTablaLupa(ids ?? idsFinCampeonato(campeonato))) boton(caja, t(ETIQUETA_BOTON[caja.id]), DESTACADO.has(caja.id), 20);
    confeti(particulas);
    return;
  }
  const ganador = carrera.coches[carrera.ganador];
  texto(t('slot.gana', { quien: nombreSlot(carrera.ganador, humanos) }), x, y - 130, { tam: 44, color: ganador.coche.color, peso: 800 });
  texto(t('fin.tiempo', { tiempo: formatearTiempo(ganador.terminado) }), x, y - 70, { tam: 28, color: COLOR.hud, peso: 700 });
  // Con cuatro, por orden de llegada, con su puesto y el resumen al lado: no cabe debajo.
  const cuatro = carrera.coches.length > 2;
  ordenLlegada(carrera).forEach((i, k) => {
    const slot = carrera.coches[i];
    const fila = y - 10 + k * (cuatro ? 40 : 60);
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(x - 220, fila - 9, 18, 18, 4);
    texto((cuatro ? `${k + 1}.  ` : '') + nombreSlot(i, humanos), x - 192, fila, { tam: 20, color: COLOR.hud, peso: 800, alinear: 'left' });
    const resumen = t('slot.resumen', { tiempo: formatearTiempo(mejorVueltaSlot(slot)), n: slot.salidas });
    if (cuatro) texto(resumen, x + 220, fila, { tam: 15, color: COLOR.texto, alinear: 'right' });
    else texto(resumen, x, fila + 26, { tam: 16, color: COLOR.texto });
  });
  for (const caja of botonesFinLupa(ids)) {
    ctx.globalAlpha = caja.id === 'denunciado' ? 0.45 : 1;
    boton(caja, t(ETIQUETA_BOTON[caja.id]), DESTACADO.has(caja.id), 20);
  }
  ctx.globalAlpha = 1;
  confeti(particulas);
}

/** El confeti cae en coordenadas de la mesa (1280 × 720): se estira al lienzo. */
function confeti(particulas) {
  ctx.save();
  ctx.scale(ANCHO_LUPA / ANCHO, altoLienzo / ALTO);
  dibujarConfeti(particulas);
  ctx.restore();
}

/** Solo sirviendo en local: lo mismo que `dibujarDepuracion`, abajo. */
export function dibujarDepuracionLupa(fps, slot, zoom) {
  const { coche } = slot;
  const datos = `${fps} FPS · v ${Math.hypot(coche.vx, coche.vy).toFixed(0)} · exigencia ${(slot.exigencia * 100).toFixed(0)} · zoom ${zoomEfectivo(zoom).toFixed(2)} · ${ANCHO_LUPA}×${altoLienzo}`;
  texto(datos, ANCHO_LUPA - 10, altoLienzo - 12, { tam: 12, color: COLOR.texto, alinear: 'right', peso: 500 });
}
