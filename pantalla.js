/*
 * Slot Panic — lo que va encima del mundo: marcador, cuenta atrás y semáforo,
 * avisos, portada y cartel de fin. Todo texto pasa por t().
 *
 * En carrera, el marcador va en la barra de arriba (la banda que el decorado
 * deja libre y que la pista no pisa): todo el campo queda para la pista, y un
 * circuito sin hueco en el interior (los del constructor) se corre igual. La
 * portada va en el interior del circuito si lo declara (`circuito.interior`),
 * si no, en el centro, y el cartel de fin, en el centro; siempre sobre un
 * panel oscuro: con suelos claros (desierto, nieve) el texto blanco sin panel
 * no se leía. Las opciones y la ayuda, en las bandas de arriba y abajo.
 *
 * Lo pulsable (opciones de la portada, botones del fin) se define en UNA
 * función de distribución que usan a la vez el dibujo y `juego.js` para saber
 * qué se ha pulsado: así no pueden divergir (regla de Orbit Panic).
 */

import { ALTO, ANCHO, COLOR, CUENTA_ATRAS, DURACION_SALIDA, FUENTE, VUELTAS_SLOT } from './config.js';
import { circulo, ctx, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { BANDA_TEXTO } from './nucleo/decorado.js';
import { formatearTiempo, mejorVueltaSlot, vueltaSlot } from './nucleo/slot.js';
import { idiomaActual, t } from './i18n.js';
import { silenciado } from './audio.js';

/** Dónde van la portada y los carteles: el interior del circuito, o el centro. */
function centro(circuito) {
  return circuito.interior || { x: ANCHO / 2, y: ALTO / 2 };
}

export function nombreCircuito(circuito) {
  return t('circuito.' + circuito.clave);
}

export function panel(x, y, ancho, alto) {
  ctx.fillStyle = COLOR.panel;
  rectanguloRedondo(x - ancho / 2, y, ancho, alto, 10);
}

function bandas(arriba = true) {
  ctx.fillStyle = COLOR.banda;
  if (arriba) ctx.fillRect(0, 0, ANCHO, BANDA_TEXTO);
  ctx.fillRect(0, ALTO - BANDA_TEXTO, ANCHO, BANDA_TEXTO);
}

/*
 * El semáforo de salida, colgado bajo la barra: una luz roja más por
 * cada segundo de la cuenta atrás y, al dar la salida, las tres en verde (es
 * el «¡ya!»). Se desvanece en cuanto pasa la salida: no tapa la carrera.
 */
const LUCES = 3;
const LUZ_RADIO = 11;
const LUZ_PASO = 34;
const DESVANECER = 0.3;   // s finales de DURACION_SALIDA en que se apaga

export function semaforo(carrera, x, y) {
  let encendidas, color, alfa = 1;
  if (carrera.fase === 'cuenta') {
    encendidas = Math.min(LUCES, CUENTA_ATRAS - Math.ceil(carrera.cuenta) + 1);
    color = COLOR.rojo;
  } else {
    if (carrera.tiempoSalida >= DURACION_SALIDA) return;
    encendidas = LUCES;
    color = COLOR.verde;
    alfa = Math.min(1, (DURACION_SALIDA - carrera.tiempoSalida) / DESVANECER);
  }
  const ancho = LUZ_PASO * LUCES + 10, alto = LUZ_RADIO * 2 + 14;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#14161c';
  rectanguloRedondo(x - ancho / 2, y - alto / 2, ancho, alto, 9);
  ctx.shadowColor = 'transparent';
  for (let i = 0; i < LUCES; i++) {
    const lx = x + (i - (LUCES - 1) / 2) * LUZ_PASO;
    const encendida = i < encendidas;
    if (encendida) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = encendida ? color : '#2c2f38';
    circulo(lx, y, LUZ_RADIO);
    ctx.shadowColor = 'transparent';
  }
  ctx.restore();
}

/** Carteles bajo la barra, que suben y se desvanecen (la última vuelta). */
export function dibujarAvisos(avisos) {
  avisos.forEach((aviso, i) => {
    ctx.globalAlpha = Math.min(1, aviso.vida);
    const y = BANDA_TEXTO + 34 + i * 34 - (1.6 - aviso.vida) * 12;
    panel(ANCHO / 2, y - 15, 260, 30);
    texto(aviso.texto, ANCHO / 2, y, { tam: 20, color: aviso.color || COLOR.ambar, peso: 700 });
  });
  ctx.globalAlpha = 1;
}

// --- Portada -------------------------------------------------------------------

/* Las opciones de la portada, en la banda de arriba. Dibujo y pulsación. */
const OPCIONES = ['circuito', 'coche', 'escenario', 'hora', 'sonido', 'idioma'];

export function opcionesPortada() {
  const alto = 30, hueco = 10;
  const ancho = Math.min(230, Math.floor((ANCHO - 24 - hueco * (OPCIONES.length - 1)) / OPCIONES.length));
  const x0 = ANCHO / 2 - (ancho * OPCIONES.length + hueco * (OPCIONES.length - 1)) / 2;
  return OPCIONES.map((id, i) => ({
    id, x: x0 + i * (ancho + hueco), y: (BANDA_TEXTO - alto) / 2, ancho, alto
  }));
}

const TECLA_OPCION = { circuito: 'C', coche: 'K', sonido: 'M', idioma: 'L', escenario: 'E', hora: 'H' };

export function dibujarPortada(circuito, tiempo, escenario, tactil, hora, modelo) {
  const { x, y } = centro(circuito);
  panel(x, y - 120, 470, 252);
  texto('SLOT PANIC', x, y - 70, { tam: 64, color: COLOR.hud, peso: 800 });
  texto(t('slot.lema'), x, y - 22, { tam: 18, color: COLOR.texto, peso: 500 });

  // El parpadeo es lento: llama la atención sin cansar.
  if (Math.floor(tiempo * 1.6) % 2 === 0) {
    texto(t(tactil ? 'portada.jugarTactil' : 'portada.jugar'), x, y + 34, { tam: 24, color: COLOR.ambar, peso: 700 });
  }
  texto(t('carrera.titulo', { circuito: nombreCircuito(circuito), vueltas: VUELTAS_SLOT }), x, y + 80, { tam: 14, color: COLOR.texto });
  texto(t('slot.cpuLibre'), x, y + 104, { tam: 14, color: COLOR.texto });

  bandas();
  const valores = {
    circuito: nombreCircuito(circuito),
    coche: t('coche.' + modelo),
    sonido: t(silenciado() ? 'sonido.no' : 'sonido.si'),
    idioma: idiomaActual().nombre.toUpperCase(),
    escenario: t('escenario.' + escenario),
    hora: t('hora.' + hora)
  };
  for (const opcion of opcionesPortada()) {
    boton(opcion, (tactil ? '' : TECLA_OPCION[opcion.id] + '  ·  ') + t('opcion.' + opcion.id, { v: valores[opcion.id] }));
  }
  texto(t(tactil ? 'slot.controlesTactil' : 'slot.controles'), ANCHO / 2, ALTO - BANDA_TEXTO / 2, { tam: 13, color: COLOR.hud, peso: 500 });
}

export function boton(caja, etiqueta, destacado = false, tamMaximo = 13) {
  ctx.fillStyle = destacado ? COLOR.ambar : 'rgba(43, 48, 64, 0.9)';
  rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 6);
  // Si la etiqueta no cabe (seis botones, idiomas largos), la letra se encoge.
  let tam = tamMaximo;
  ctx.font = `600 ${tam}px ${FUENTE}`;
  while (tam > 9 && ctx.measureText(etiqueta).width > caja.ancho - 14) {
    tam--;
    ctx.font = `600 ${tam}px ${FUENTE}`;
  }
  texto(etiqueta, caja.x + caja.ancho / 2, caja.y + caja.alto / 2 + 1, {
    tam, color: destacado ? COLOR.fondo : COLOR.hud, peso: 600
  });
}

// --- Fin ---------------------------------------------------------------------------

/* Los botones del fin, centrados en fila. */
export function botonesFin(ids = ['repetir', 'menu'], y = ALTO / 2 + 130) {
  const ancho = 190, alto = 46, hueco = 20;
  const x0 = ANCHO / 2 - (ancho * ids.length + hueco * (ids.length - 1)) / 2;
  return ids.map((id, i) => ({ id, x: x0 + i * (ancho + hueco), y, ancho, alto }));
}

export const ETIQUETA_BOTON = { repetir: 'fin.botonRepetir', menu: 'fin.botonMenu' };

function botones(cajas) {
  for (const caja of cajas) boton(caja, t(ETIQUETA_BOTON[caja.id]), caja.id === 'repetir');
}

// --- La carrera ----------------------------------------------------------------

/** «J1», «J2» o «CPU»: quién lleva cada carril. */
export function nombreSlot(i, humanos) {
  return humanos[i] ? t('slot.jugador', { n: i + 1 }) : t('slot.cpu');
}

/*
 * El marcador, en la barra de arriba: el J1 a la izquierda y el J2 a la
 * derecha, cada uno del lado de su mitad de la pantalla (la que acelera en el
 * móvil), y en el centro la cuenta atrás o el tiempo.
 */
export function dibujarMarcadorSlot(carrera, humanos, tactil) {
  const alto = BANDA_TEXTO;
  if (carrera.fase === 'cuenta') guiaSlot(carrera, humanos, tactil);
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ANCHO, alto);
  carrera.coches.forEach((slot, i) => marcadorCoche(slot, i, humanos, alto));
  if (carrera.fase === 'cuenta') {
    texto(String(Math.ceil(carrera.cuenta)), ANCHO / 2, alto / 2 + 1, { tam: 38, color: COLOR.ambar, peso: 800 });
  } else {
    texto(formatearTiempo(carrera.tiempo), ANCHO / 2, alto / 2 + 1, { tam: 32, color: COLOR.hud, peso: 700 });
  }
  semaforo(carrera, ANCHO / 2, alto + 30);
}

/*
 * Lo de un coche en la barra, de fuera hacia dentro: su color, quién lo lleva,
 * la vuelta y la mejor; debajo, la potencia. El J2 es el espejo del J1.
 */
function marcadorCoche(slot, i, humanos, alto) {
  const lado = i === 0 ? 1 : -1;
  const borde = i === 0 ? 16 : ANCHO - 16;
  const alinear = i === 0 ? 'left' : 'right';
  const y = alto / 2 - 5;
  ctx.fillStyle = slot.coche.color;
  rectanguloRedondo(i === 0 ? borde : borde - 22, y - 11, 22, 22, 5);
  texto(nombreSlot(i, humanos), borde + lado * 32, y, { tam: 22, color: COLOR.hud, peso: 800, alinear });
  texto(t('hud.vuelta', { n: vueltaSlot(slot), total: VUELTAS_SLOT }), borde + lado * 112, y, { tam: 22, color: COLOR.hud, peso: 700, alinear });
  const mejor = mejorVueltaSlot(slot);
  if (mejor !== null) texto(t('hud.mejor', { tiempo: formatearTiempo(mejor) }), borde + lado * 280, y, { tam: 16, color: COLOR.texto, alinear });
  barraPotencia(slot, i === 0 ? borde : borde - 240, alto - 11, 240);
}

/*
 * La potencia que lleva el coche, como el gatillo del mando: con toques se
 * queda a medias. En rojo mientras derrapa.
 */
export function barraPotencia(slot, x, y, ancho) {
  const alto = 5;
  ctx.fillStyle = 'rgba(230, 232, 238, 0.15)';
  ctx.fillRect(x, y, ancho, alto);
  ctx.fillStyle = slot.derrape > 0 ? COLOR.rojo : slot.coche.color;
  ctx.fillRect(x, y, ancho * slot.potencia, alto);
}

/*
 * Durante la cuenta atrás: qué mitad (o qué teclas) es cada coche. En el
 * móvil, las dos mitades de la pantalla, cada una del color de su coche.
 */
function guiaSlot(carrera, humanos, tactil) {
  const y = 150;
  carrera.coches.forEach((slot, i) => {
    const cx = ANCHO / 4 + i * ANCHO / 2;
    if (tactil) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = slot.coche.color;
      ctx.fillRect(i * ANCHO / 2, 0, ANCHO / 2, ALTO);
      ctx.globalAlpha = 1;
    }
    panel(cx, y - 34, 300, 68);
    texto(nombreSlot(i, humanos), cx, y - 14, { tam: 22, color: slot.coche.color, peso: 800 });
    texto(t('slot.mantener'), cx, y + 14, { tam: 15, color: COLOR.hud, peso: 700 });
  });
  // La barra de arriba es el marcador: la ayuda va abajo, en dos líneas.
  bandas(false);
  texto(t(tactil ? 'slot.controlesTactil' : 'slot.controles'), ANCHO / 2, ALTO - 38, { tam: 13, color: COLOR.hud, peso: 500 });
  texto(t('slot.cpuLibre'), ANCHO / 2, ALTO - 17, { tam: 12, color: COLOR.texto, peso: 500 });
}

export function dibujarFinSlot(carrera, humanos, tactil) {
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const x = ANCHO / 2, y = ALTO / 2;
  const ganador = carrera.coches[carrera.ganador];
  texto(t('slot.gana', { quien: nombreSlot(carrera.ganador, humanos) }), x, y - 120, { tam: 44, color: ganador.coche.color, peso: 800 });
  texto(t('fin.tiempo', { tiempo: formatearTiempo(ganador.terminado) }), x, y - 60, { tam: 28, color: COLOR.hud, peso: 700 });
  carrera.coches.forEach((slot, i) => {
    const fila = y - 10 + i * 34;
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(x - 260, fila - 8, 16, 16, 4);
    texto(nombreSlot(i, humanos), x - 234, fila, { tam: 16, color: COLOR.hud, peso: 800, alinear: 'left' });
    texto(t('slot.resumen', { tiempo: formatearTiempo(mejorVueltaSlot(slot)), n: slot.salidas }), x + 260, fila, { tam: 16, color: COLOR.texto, alinear: 'right' });
  });
  if (!tactil) texto(t('fin.repetir'), x, y + 95, { tam: 14, color: COLOR.texto, peso: 500 });
  botones(botonesFin());
}

/** Solo sirviendo en local. La «deriva» es la exigencia del J1 en %: 100 se sale. */
export function dibujarDepuracion(fps, slot) {
  const { coche } = slot;
  const datos = `${fps} FPS · v ${Math.hypot(coche.vx, coche.vy).toFixed(0)} · exigencia ${(slot.exigencia * 100).toFixed(0)}`;
  texto(datos, ANCHO - 12, ALTO - BANDA_TEXTO / 2, { tam: 12, color: COLOR.texto, alinear: 'right', peso: 500 });
}
