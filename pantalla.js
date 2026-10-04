/*
 * Slot Panic — lo que va encima del mundo: marcador, cuenta atrás y semáforo,
 * avisos, portada y cartel de fin. Todo texto pasa por t().
 *
 * El marcador y los carteles van en el interior del circuito
 * (`circuito.interior`), sobre un panel oscuro: con suelos claros (desierto,
 * nieve) el texto blanco sin panel no se leía. Las opciones y la ayuda, en las
 * bandas de arriba y abajo, que el decorado deja libres.
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

function nombreCircuito(circuito) {
  return t('circuito.' + circuito.clave);
}

function panel(x, y, ancho, alto) {
  ctx.fillStyle = COLOR.panel;
  rectanguloRedondo(x - ancho / 2, y, ancho, alto, 10);
}

function bandas() {
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ANCHO, BANDA_TEXTO);
  ctx.fillRect(0, ALTO - BANDA_TEXTO, ANCHO, BANDA_TEXTO);
}

/*
 * El semáforo de salida, flotando sobre el marcador: una luz roja más por
 * cada segundo de la cuenta atrás y, al dar la salida, las tres en verde (es
 * el «¡ya!»). Se desvanece en cuanto pasa la salida: no tapa la carrera.
 */
const LUCES = 3;
const LUZ_RADIO = 11;
const LUZ_PASO = 34;
const DESVANECER = 0.3;   // s finales de DURACION_SALIDA en que se apaga

function semaforo(carrera, x, y) {
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

/** Carteles que suben y se desvanecen (la última vuelta). */
export function dibujarAvisos(avisos, circuito) {
  const { x, y } = circuito.interior;
  avisos.forEach((aviso, i) => {
    ctx.globalAlpha = Math.min(1, aviso.vida);
    texto(aviso.texto, x, y - 150 - i * 30 - (1.6 - aviso.vida) * 12, { tam: 22, color: aviso.color || COLOR.ambar, peso: 700 });
  });
  ctx.globalAlpha = 1;
}

// --- Portada -------------------------------------------------------------------

/* Las opciones de la portada, en la banda de arriba. Dibujo y pulsación. */
const OPCIONES = ['sonido', 'idioma', 'escenario', 'hora'];

export function opcionesPortada() {
  const alto = 30, hueco = 10;
  const ancho = Math.min(230, Math.floor((ANCHO - 24 - hueco * (OPCIONES.length - 1)) / OPCIONES.length));
  const x0 = ANCHO / 2 - (ancho * OPCIONES.length + hueco * (OPCIONES.length - 1)) / 2;
  return OPCIONES.map((id, i) => ({
    id, x: x0 + i * (ancho + hueco), y: (BANDA_TEXTO - alto) / 2, ancho, alto
  }));
}

const TECLA_OPCION = { sonido: 'M', idioma: 'L', escenario: 'E', hora: 'H' };

export function dibujarPortada(circuito, tiempo, escenario, tactil, hora) {
  const { x, y } = circuito.interior;
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
    sonido: t(silenciado() ? 'sonido.no' : 'sonido.si'),
    idioma: idiomaActual().nombre.toUpperCase(),
    escenario: t('escenario.' + escenario),
    hora: t('hora.' + hora)
  };
  for (const opcion of opcionesPortada()) {
    boton(opcion, (tactil ? '' : TECLA_OPCION[opcion.id] + '  ·  ') + t('opcion.' + opcion.id, { v: valores[opcion.id] }));
  }
  texto(t(tactil ? 'slot.controlesTactil' : 'slot.controles'), ANCHO / 2, ALTO - 23, { tam: 13, color: COLOR.hud, peso: 500 });
}

function boton(caja, etiqueta, destacado = false) {
  ctx.fillStyle = destacado ? COLOR.ambar : 'rgba(43, 48, 64, 0.9)';
  rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 6);
  // Si la etiqueta no cabe (seis botones, idiomas largos), la letra se encoge.
  let tam = 13;
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

const ETIQUETA_BOTON = { repetir: 'fin.botonRepetir', menu: 'fin.botonMenu' };

function botones(cajas) {
  for (const caja of cajas) boton(caja, t(ETIQUETA_BOTON[caja.id]), caja.id === 'repetir');
}

// --- La carrera ----------------------------------------------------------------

/** «J1», «J2» o «CPU»: quién lleva cada carril. */
export function nombreSlot(i, humanos) {
  return humanos[i] ? t('slot.jugador', { n: i + 1 }) : t('slot.cpu');
}

export function dibujarMarcadorSlot(carrera, humanos, tactil) {
  const { x, y } = carrera.circuito.interior;
  panel(x, y - 112, 300, 232);
  texto(t('carrera.titulo', { circuito: nombreCircuito(carrera.circuito), vueltas: VUELTAS_SLOT }), x, y - 92, { tam: 14, color: COLOR.texto });

  if (carrera.fase === 'cuenta') {
    semaforo(carrera, x, y - 140);
    texto(String(Math.ceil(carrera.cuenta)), x, y, { tam: 96, color: COLOR.ambar, peso: 800 });
    guiaSlot(carrera, humanos, tactil);
    return;
  }
  semaforo(carrera, x, y - 140);
  texto(formatearTiempo(carrera.tiempo), x, y - 46, { tam: 40, color: COLOR.hud, peso: 700 });
  // Una fila por coche, con su color: quién lo lleva, la vuelta y la mejor.
  carrera.coches.forEach((slot, i) => {
    const fila = y + 6 + i * 52;
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(x - 128, fila - 9, 18, 18, 4);
    texto(nombreSlot(i, humanos), x - 100, fila, { tam: 18, color: COLOR.hud, peso: 800, alinear: 'left' });
    texto(t('hud.vuelta', { n: vueltaSlot(slot), total: VUELTAS_SLOT }), x + 128, fila, { tam: 18, color: COLOR.hud, alinear: 'right' });
    const mejor = mejorVueltaSlot(slot);
    if (mejor !== null) texto(t('hud.mejor', { tiempo: formatearTiempo(mejor) }), x + 128, fila + 22, { tam: 12, color: COLOR.texto, alinear: 'right' });
    barraPotencia(slot, x - 128, fila + 16);
  });
}

/*
 * La potencia que lleva el coche, como el gatillo del mando: con toques se
 * queda a medias. En rojo mientras derrapa.
 */
function barraPotencia(slot, x, y) {
  const ancho = 110, alto = 6;
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
  bandas();
  texto(t(tactil ? 'slot.controlesTactil' : 'slot.controles'), ANCHO / 2, ALTO - 23, { tam: 13, color: COLOR.hud, peso: 500 });
  texto(t('slot.cpuLibre'), ANCHO / 2, 23, { tam: 13, color: COLOR.hud, peso: 500 });
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
  texto(datos, ANCHO - 12, ALTO - 23, { tam: 12, color: COLOR.texto, alinear: 'right', peso: 500 });
}
