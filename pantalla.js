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

import { ALTO, ANCHO, CARRERAS, COLOR, CUENTA_ATRAS, DURACION_SALIDA, FUENTE } from './config.js';
import { circulo, ctx, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { BANDA_TEXTO } from './nucleo/decorado.js';
import { textoMedida } from './medida.js';
import { formatearTiempo, mejorVueltaSlot, vueltaSlot } from './nucleo/slot.js';
import { clasificacion } from './nucleo/campeonato.js';
import { mangasDe, serieAcabada, sumaSerie } from './nucleo/mangas.js';
import { CIRCUITOS, CIRCUITOS_CUATRO } from './circuitos/indice.js';
import { codigoIdioma, nombreCompuesto, t } from './i18n.js';

/** Los circuitos del campeonato: los oficiales o, en la pista de cuatro, los suyos. */
const circuitosCampeonato = (circuito) => (circuito.carriles.length > 2 ? CIRCUITOS_CUATRO : CIRCUITOS).length;

/** Dónde van la portada y los carteles: el interior del circuito, o el centro. */
function centro(circuito) {
  return circuito.interior || { x: ANCHO / 2, y: ALTO / 2 };
}

export function nombreCircuito(circuito) {
  if (circuito.publico) return nombreCompuesto(circuito.publico.adjetivo, circuito.publico.sustantivo);
  if (circuito.mio) return t('circuito.mio', { n: circuito.mio });
  return t('circuito.' + (circuito.dibujado ? 'dibujado' : circuito.clave));
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

export function semaforo(carrera, x, y, apagado = false) {
  let encendidas, color, alfa = 1;
  if (carrera.fase === 'cuenta') {
    // Mientras la salida espera a los dedos (`apagado`), ninguna.
    encendidas = apagado ? 0 : Math.min(LUCES, CUENTA_ATRAS - Math.ceil(carrera.cuenta) + 1);
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

/*
 * Las opciones van en el menú (menu.js): cuatro grupos en la banda de arriba,
 * y el panel del abierto en el sitio del de la portada (`marcoMenu`). Abajo,
 * con teclado, quién lleva cada coche y con qué teclas; tocando, cómo se toca.
 */
export function marcoMenu() {
  return { x: ANCHO / 2 - 350, y: BANDA_TEXTO + 16, ancho: 700, alto: ALTO - 2 * BANDA_TEXTO - 32 };
}

export function dibujarPortada({ circuito, tiempo, tactil, duracion, modo, marca, menu, jugadores, modelos, colores }) {
  bandas();
  if (tactil) texto(t('portada.comoTactil'), ANCHO / 2, ALTO - BANDA_TEXTO / 2, { tam: 15, color: COLOR.hud, peso: 600 });
  else resumenJugadores(jugadores, modelos, colores);
  if (menu) return;
  const { x, y } = centro(circuito);
  // Tocando, el circuito y los récords, más grandes (en el móvil un píxel lógico es poco más de medio real).
  panel(x, y - 120, 470, tactil ? 276 : 252);
  texto('SLOT PANIC', x, y - 70, { tam: 64, color: COLOR.hud, peso: 800 });
  texto(t('slot.lema'), x, y - 22, { tam: 18, color: COLOR.texto, peso: 500 });

  // Tocando, los dos botones: cuántos juegan, y solo ellos arrancan. Con
  // teclado, Enter, con un parpadeo lento: llama la atención sin cansar.
  if (tactil) {
    for (const caja of cajasJugar(circuito)) boton(caja, t(caja.jugadores === 1 ? 'portada.unJugador' : 'portada.dosJugadores'), true, 24);
  } else if (Math.floor(tiempo * 1.6) % 2 === 0) {
    texto(t('portada.jugar'), x, y + 34, { tam: 24, color: COLOR.ambar, peso: 700 });
  }
  texto(tituloPortada(circuito, duracion, modo), x, y + (tactil ? 84 : 80), { tam: tactil ? 20 : 14, color: COLOR.texto, peso: tactil ? 700 : 600 });
  // En un oficial, el botón de los récords (con el récord y tu mejor vuelta).
  if (marca && modo !== 'campeonato') boton(cajaRecordsPortada(circuito, tactil), marca + '  ›', false, tactil ? 18 : 14);
}

/** Tocando, en el panel de la portada: 1 JUGADOR y 2 JUGADORES. Dibujo y pulsación. */
export function cajasJugar(circuito) {
  const { x, y } = centro(circuito);
  const ancho = 200, alto = 56, hueco = 16;
  return [1, 2].map((jugadores, i) => ({
    id: 'jugar', jugadores, x: x - ancho - hueco / 2 + i * (ancho + hueco), y: y + 4, ancho, alto
  }));
}

/** Lo que se va a correr: el circuito y las vueltas, o el campeonato entero. */
export function tituloPortada(circuito, duracion, modo) {
  if (modo === 'campeonato') return t('portada.campeonato', { n: circuitosCampeonato(circuito), vueltas: vueltasDe(duracion) });
  const mangas = mangasDe(circuito);
  if (mangas > 1) return t('carrera.tituloMangas', { circuito: nombreCircuito(circuito), mangas, vueltas: vueltasDe(duracion) });
  return t('carrera.titulo', { circuito: nombreCircuito(circuito), vueltas: vueltasDe(duracion) });
}

/*
 * Con teclado, en la banda de abajo: cada jugador en su mitad (la de sus
 * teclas), con su color, su coche y sus teclas; o que lo lleva la CPU.
 */
function resumenJugadores(jugadores, modelos, colores) {
  [0, 1].forEach((i) => {
    const cx = ANCHO / 4 + i * ANCHO / 2, y = ALTO - BANDA_TEXTO / 2;
    const quien = t('slot.jugador', { n: i + 1 });
    const linea = jugadores[i] === 'humano'
      ? `${quien} · ${t('coche.' + modelos[i])} · ${t('slot.teclas' + (i + 1))}`
      : `${quien} · ${t('slot.cpu')} · ${t('coche.' + modelos[i])}`;
    ctx.font = `600 14px ${FUENTE}`;
    const ancho = ctx.measureText(linea).width;
    ctx.fillStyle = colores[i];
    rectanguloRedondo(cx - ancho / 2 - 24, y - 8, 16, 16, 4);
    texto(linea, cx + 4, y + 1, { tam: 14, color: jugadores[i] === 'humano' ? COLOR.hud : COLOR.texto, peso: 600 });
  });
}

/** Las vueltas de una carrera de CARRERAS, por su id. */
export function vueltasDe(duracion) {
  return CARRERAS.find((c) => c.id === duracion).vueltas;
}

/** El botón de los récords, en el panel de la portada de un oficial. Dibujo y pulsación. */
export function cajaRecordsPortada(circuito, tactil = false) {
  const { x, y } = centro(circuito);
  if (tactil) return { id: 'records', x: x - 210, y: y + 104, ancho: 420, alto: 40 };
  return { id: 'records', x: x - 200, y: y + 96, ancho: 400, alto: 28 };
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

export const ETIQUETA_BOTON = {
  repetir: 'fin.botonRepetir', siguiente: 'fin.botonSiguiente', manga: 'fin.botonManga', menu: 'fin.botonMenu',
  momentos: 'fin.botonMomentos', denunciar: 'fin.botonDenunciar', confirmarDenuncia: 'fin.botonConfirmarDenuncia', denunciado: 'fin.botonDenunciado'
};
// Los que van destacados (en ámbar).
export const DESTACADO = new Set(['repetir', 'siguiente', 'manga', 'confirmarDenuncia']);

function botones(cajas) {
  for (const caja of cajas) {
    ctx.globalAlpha = caja.id === 'denunciado' ? 0.45 : 1;
    boton(caja, t(ETIQUETA_BOTON[caja.id]), DESTACADO.has(caja.id));
  }
  ctx.globalAlpha = 1;
}

// --- La carrera ----------------------------------------------------------------

/** «J1», «J2» o «CPU»: quién lleva cada carril. */
export function nombreSlot(i, humanos) {
  return humanos[i] ? t('slot.jugador', { n: i + 1 }) : t('slot.cpu');
}

/*
 * El marcador, en la barra de arriba: el J1 a la izquierda y el J2 a la
 * derecha, cada uno del lado de su mitad de la pantalla (la que acelera en el
 * móvil), y en el centro la cuenta atrás o el tiempo. En la pista de cuatro,
 * las dos CPU de más van hacia dentro, más apretadas: sin la mejor vuelta.
 * En mangas, con `suma` (`sumaEnCarrera`), lo que lleva cada uno en la suma.
 */
export function dibujarMarcadorSlot(carrera, humanos, tactil, rotulo = null, suma = null, espera = null) {
  const alto = BANDA_TEXTO;
  if (carrera.fase === 'cuenta') guiaSlot(carrera, humanos, tactil, rotulo, espera);
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ANCHO, alto);
  carrera.coches.forEach((slot, i) => marcadorCoche(carrera, slot, i, humanos, alto, suma));
  if (carrera.fase === 'cuenta') {
    if (!espera) texto(String(Math.ceil(carrera.cuenta)), ANCHO / 2, alto / 2 + 1, { tam: 38, color: COLOR.ambar, peso: 800 });
  } else {
    texto(formatearTiempo(carrera.tiempo), ANCHO / 2, alto / 2 + 1, { tam: 32, color: COLOR.hud, peso: 700 });
  }
  semaforo(carrera, ANCHO / 2, alto + 30, !!espera);
}

/*
 * Lo de un coche en la barra, de fuera hacia dentro: su color, quién lo lleva,
 * la vuelta y la mejor; debajo, la potencia. El J2 es el espejo del J1.
 */
function marcadorCoche(carrera, slot, i, humanos, alto, suma) {
  const izquierda = i % 2 === 0;
  const lado = izquierda ? 1 : -1;
  const apretado = carrera.coches.length > 2;
  // Con cuatro, el J1 y el J2 en los bordes y las otras dos CPU, hacia dentro.
  const desde = i < 2 ? 16 : 300;
  const borde = izquierda ? desde : ANCHO - desde;
  const alinear = izquierda ? 'left' : 'right';
  const barra = apretado ? 210 : 240;
  const y = alto / 2 - 5;
  ctx.fillStyle = slot.coche.color;
  rectanguloRedondo(izquierda ? borde : borde - 22, y - 11, 22, 22, 5);
  texto(nombreSlot(i, humanos), borde + lado * 32, y, { tam: 22, color: COLOR.hud, peso: 800, alinear });
  // Con cuatro y la suma, la vuelta sin rótulo: si no, no cabe.
  texto(textoVuelta(i, vueltaSlot(carrera, slot), carrera.vueltas, apretado && suma), borde + lado * 100, y, { tam: apretado ? 18 : 22, color: COLOR.hud, peso: 700, alinear });
  if (suma) {
    const primero = suma.orden[0] === i;
    texto(diferenciaSuma(suma, i), borde + lado * (apretado ? 150 : 280), y, { tam: 16, color: primero ? COLOR.ambar : COLOR.texto, peso: 700, alinear });
  }
  const mejor = mejorVueltaSlot(slot);
  if (mejor !== null && !apretado && !suma) texto(textoMejor(i, mejor), borde + lado * 280, y, { tam: 16, color: COLOR.texto, alinear });
  barraPotencia(slot, izquierda ? borde : borde - barra, alto - 11, barra);
}

/*
 * La vuelta y la mejor de cada coche cambian una vez por vuelta, pero el
 * marcador se pinta en cada fotograma: se recuerda el último texto de cada
 * coche y solo se rehace si cambia lo que dice (o el idioma).
 */
const vueltas = [], mejores = [];
function recuerdo(lista, i) {
  return lista[i] ??= { a: NaN, b: NaN, idioma: '', texto: '' };
}
function vigente(r, a, b) {
  if (r.a === a && r.b === b && r.idioma === codigoIdioma()) return true;
  r.a = a;
  r.b = b;
  r.idioma = codigoIdioma();
  return false;
}

function textoVuelta(i, n, total, corto) {
  const r = recuerdo(vueltas, i);
  // Corto, «3/10»: el signo distingue los dos textos con los mismos números.
  if (!vigente(r, corto ? -n : n, total)) r.texto = corto ? `${n}/${total}` : t('hud.vuelta', { n, total });
  return r.texto;
}

function textoMejor(i, mejor) {
  const r = recuerdo(mejores, i);
  if (!vigente(r, mejor, 0)) r.texto = t('hud.mejor', { tiempo: formatearTiempo(mejor) });
  return r.texto;
}

/** «Σ +1.23»: lo que lleva un coche sobre el primero de la suma; el primero, «Σ −0.85» sobre el segundo. */
export function diferenciaSuma(suma, i) {
  const d = suma.diferencias[i];
  return `Σ ${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(2)}`;
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
 * Durante la cuenta atrás: qué mitad (o qué teclas) es cada coche y, encima
 * de cada uno, en la parrilla, quién es: así se ve de qué carril sale. Tocando,
 * un anillo que late alrededor del coche de cada jugador (con uno solo, «TÚ»)
 * y, a dos, las dos mitades de la pantalla, cada una del color de su coche.
 * Antes, mientras la salida espera (`espera`: quién tiene ya el dedo puesto),
 * cada jugador ve que tiene que apoyarlo, y luego que está listo.
 */
function guiaSlot(carrera, humanos, tactil, rotulo, espera) {
  const uno = tactil && humanos.filter(Boolean).length === 1;
  // En la pista de cuatro, arriba están la recta y la parrilla: los paneles van
  // más abajo (en el ocho largo, en el hueco de cada lazo), más estrechos. Un
  // circuito que no tenga hueco ahí dice dónde (`circuito.guia`, los centros).
  const cuatro = carrera.coches.length > 2;
  const y = cuatro ? 380 : 150;
  const { guia = {} } = carrera.circuito;
  if (rotulo) {
    const r = guia.rotulo || { x: ANCHO / 2, y: y + 78 };
    panel(r.x, r.y - 18, 440, 36);
    texto(rotulo, r.x, r.y + 1, { tam: 16, color: COLOR.ambar, peso: 700 });
  }
  // Solo los dos primeros coches pueden ser de una persona: cada uno, su mitad.
  carrera.coches.slice(0, 2).forEach((slot, i) => {
    const { x: cx, y: cy } = guia.paneles?.[i] || { x: ANCHO / 4 + i * ANCHO / 2, y };
    if (tactil && humanos[i] && !uno) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = slot.coche.color;
      ctx.fillRect(i * ANCHO / 2, 0, ANCHO / 2, ALTO);
      ctx.globalAlpha = 1;
    }
    panel(cx, cy - 34, cuatro ? 220 : 300, 68);
    texto(nombreGuia(i, humanos, uno), cx, cy - 14, { tam: 22, color: slot.coche.color, peso: 800 });
    // Lo que tiene que hacer cada humano (tocando, apoyar el dedo; con teclado, sus teclas); la CPU, nada.
    let ayuda = '', color = COLOR.hud;
    if (humanos[i] && tactil && espera) {
      ayuda = t(espera[i] ? 'slot.listo' : 'slot.mantenerSalir');
      if (espera[i]) color = COLOR.verde;
    } else if (humanos[i]) ayuda = tactil ? t('slot.mantener') : t('slot.teclas' + (i + 1));
    if (ayuda) texto(ayuda, cx, cy + 14, { tam: cuatro ? 13 : 15, color, peso: 700 });
  });
  if (tactil) anillos(carrera, humanos);
  etiquetasParrilla(carrera, humanos, uno);
  // La barra de arriba es el marcador: la ayuda va abajo.
  bandas(false);
  const ayuda = tactil ? (uno ? 'slot.controlesUno' : 'slot.controlesTactil') : 'slot.controles';
  texto(t(ayuda), ANCHO / 2, ALTO - BANDA_TEXTO / 2, { tam: tactil ? 15 : 13, color: COLOR.hud, peso: tactil ? 600 : 500 });
}

/* Quién es cada coche en la parrilla: tocando y con un solo jugador, el suyo es «TÚ». */
function nombreGuia(i, humanos, uno) {
  return uno && humanos[i] ? t('slot.tu') : nombreSlot(i, humanos);
}

/* Un anillo que late, del color del coche, alrededor del de cada jugador. */
function anillos(carrera, humanos) {
  const latido = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * Math.PI * 2 * 1.2);
  carrera.coches.slice(0, 2).forEach((slot, i) => {
    if (!humanos[i]) return;
    const { coche } = slot;
    ctx.save();
    ctx.strokeStyle = coche.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.45 + 0.55 * latido;
    ctx.beginPath();
    ctx.arc(coche.x, coche.y, slot.ficha.largo * 0.75 + 4 * latido, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

/*
 * Una etiqueta del color de cada coche, al lado de fuera de su carril (lejos
 * del otro coche, que va pegado), con quién lo lleva. Con cuatro no hay lado
 * de fuera para los del medio: cada una va delante de su coche, en su carril.
 */
function etiquetasParrilla(carrera, humanos, uno = false) {
  const coches = carrera.coches.map((slot) => slot.coche);
  const mx = coches.reduce((s, c) => s + c.x, 0) / coches.length, my = coches.reduce((s, c) => s + c.y, 0) / coches.length;
  carrera.coches.forEach((slot, i) => {
    const { coche } = slot;
    const nombre = nombreGuia(i, humanos, uno);
    ctx.font = `800 15px ${FUENTE}`;
    const ancho = ctx.measureText(nombre).width + 16;
    let x, y;
    if (coches.length > 2) {
      const delante = slot.ficha.largo / 2 + ancho / 2 + 6;
      x = coche.x + Math.cos(coche.angulo) * delante;
      y = coche.y + Math.sin(coche.angulo) * delante;
    } else {
      const d = Math.hypot(coche.x - mx, coche.y - my) || 1;
      x = coche.x + (coche.x - mx) / d * 34;
      y = coche.y + (coche.y - my) / d * 34;
    }
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(x - ancho / 2, y - 12, ancho, 24, 6);
    texto(nombre, x, y + 1, { tam: 15, color: COLOR.fondo, peso: 800 });
  });
}

/*
 * El cartel de fin. En el campeonato, su tabla; en mangas, la de las mangas
 * (y, acabada la última, si es del campeonato, la del campeonato).
 */
export function dibujarFinSlot(carrera, humanos, tactil, { campeonato = null, serie = null } = {}, ids = undefined) {
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  if (campeonato && !(serie && !serieAcabada(serie))) {
    dibujarFinCampeonato(carrera, humanos, tactil, campeonato, ids);
    return;
  }
  if (serie) {
    dibujarFinSerie(carrera, humanos, tactil, serie, ids);
    return;
  }
  const x = ANCHO / 2, y = ALTO / 2;
  const ganador = carrera.coches[carrera.ganador];
  texto(t('slot.gana', { quien: nombreSlot(carrera.ganador, humanos) }), x, y - 120, { tam: 44, color: ganador.coche.color, peso: 800 });
  texto(t('fin.tiempo', { tiempo: formatearTiempo(ganador.terminado) }), x, y - 60, { tam: 28, color: COLOR.hud, peso: 700 });
  // Con cuatro, por orden de llegada y con su puesto, más juntas.
  const cuatro = carrera.coches.length > 2;
  ordenLlegada(carrera).forEach((i, k) => {
    const slot = carrera.coches[i];
    const fila = (cuatro ? y - 22 : y - 10) + k * (cuatro ? 28 : 34);
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(x - 260, fila - 8, 16, 16, 4);
    texto((cuatro ? `${k + 1}.  ` : '') + nombreSlot(i, humanos), x - 234, fila, { tam: 16, color: COLOR.hud, peso: 800, alinear: 'left' });
    texto(t('slot.resumen', { tiempo: formatearTiempo(mejorVueltaSlot(slot)), n: slot.salidas }), x + 260, fila, { tam: 16, color: COLOR.texto, alinear: 'right' });
  });
  if (!tactil) texto(t('fin.repetir'), x, y + 95, { tam: 14, color: COLOR.texto, peso: 500 });
  botones(botonesFin(ids));
}

/*
 * Los coches por orden de llegada: los que han acabado, por su tiempo; los
 * demás, por lo que han corrido. Lo comparte la lupa.
 */
export function ordenLlegada(carrera) {
  const { coches } = carrera;
  return coches.map((_, i) => i).sort((a, b) => {
    const ta = coches[a].terminado ?? Infinity, tb = coches[b].terminado ?? Infinity;
    return ta - tb || coches[b].progreso - coches[a].progreso;
  });
}

/*
 * El fin de una carrera del campeonato: quién la ha ganado (o, en la última,
 * el campeón) y la tabla de cómo va.
 */
function dibujarFinCampeonato(carrera, humanos, tactil, campeonato, ids = idsFinCampeonato(campeonato)) {
  const x = ANCHO / 2, y = ALTO / 2;
  pintarCabeceraCampeonato(carrera, humanos, campeonato, x, y - 165, 40);
  pintarTablaCampeonato(campeonato, carrera, humanos, { x, y: y - 90, mitad: carrera.coches.length > 2 ? 380 : 280, tam: 16, fila: 30 });
  botones(botonesFin(ids));
  if (!tactil) {
    const pista = clasificacion(campeonato).acabado ? 'fin.otroCampeonato' : 'fin.siguiente';
    texto(t(pista), x, y + 205, { tam: 14, color: COLOR.texto, peso: 500 });
  }
}

/*
 * El fin de una manga: quién la ha ganado (o, en la última, quién gana la
 * suma) y la tabla de las mangas.
 */
function dibujarFinSerie(carrera, humanos, tactil, serie, ids) {
  const x = ANCHO / 2, y = ALTO / 2;
  pintarCabeceraSerie(carrera, humanos, serie, x, y - 165, 40);
  pintarTablaSerie(serie, carrera, humanos, { x, y: y - 90, mitad: 380, tam: 16, fila: 30 });
  botones(botonesFin(ids));
  if (!tactil) texto(t(serieAcabada(serie) ? 'fin.repetir' : 'fin.siguienteManga'), x, y + 205, { tam: 14, color: COLOR.texto, peso: 500 });
}

/** El titular de una manga y, debajo, cuál era; acabada la serie, quién gana la suma. Lo comparte la lupa. */
export function pintarCabeceraSerie(carrera, humanos, serie, x, y, tam) {
  const acabada = serieAcabada(serie);
  const quien = acabada ? sumaSerie(serie).ganador : carrera.ganador;
  texto(t('slot.gana', { quien: nombreSlot(quien, humanos) }), x, y, { tam, color: carrera.coches[quien].coche.color, peso: 800 });
  const debajo = acabada ? t('manga.suma', { n: serie.total }) : t('manga.n', { n: serie.mangas.length, total: serie.total });
  texto(debajo, x, y + tam * 0.95, { tam: Math.round(tam * 0.38), color: COLOR.ambar, peso: 700 });
}

/** La tabla de las mangas: una fila por manga y, debajo, el tiempo sumado. Lo comparte la lupa. */
export function pintarTablaSerie(serie, carrera, humanos, opciones) {
  const filas = Array.from({ length: serie.total }, (_, k) => ({ nombre: t('manga.fila', { n: k + 1 }), hecha: serie.mangas[k] }));
  pintarTabla(carrera, humanos, filas, [['campeonato.tiempo', sumaSerie(serie).tiempos.map(formatearTiempo)]], opciones);
}

/** Los botones del fin en el campeonato: la siguiente carrera o, acabado, otro campeonato. */
export function idsFinCampeonato(campeonato) {
  return [clasificacion(campeonato).acabado ? 'repetir' : 'siguiente', 'menu'];
}

/*
 * El titular y, debajo, la carrera que era (o por qué gana el campeón con las
 * mismas victorias). Lo comparte la lupa.
 */
export function pintarCabeceraCampeonato(carrera, humanos, campeonato, x, y, tam) {
  const { acabado, delante, porTiempo } = clasificacion(campeonato);
  if (acabado && delante !== null) {
    const color = carrera.coches[delante].coche.color;
    texto(t('campeonato.campeon', { quien: nombreSlot(delante, humanos) }), x, y, { tam, color, peso: 800 });
  } else {
    const color = carrera.coches[carrera.ganador].coche.color;
    texto(t('slot.gana', { quien: nombreSlot(carrera.ganador, humanos) }), x, y, { tam, color, peso: 800 });
  }
  const debajo = acabado && porTiempo
    ? t('campeonato.desempate')
    : t('campeonato.carrera', { n: campeonato.carreras.length, total: campeonato.circuitos.length });
  texto(debajo, x, y + tam * 0.95, { tam: Math.round(tam * 0.38), color: COLOR.ambar, peso: 700 });
}

/*
 * La tabla: una fila por circuito con el tiempo de cada coche (el del ganador,
 * de su color), y debajo las victorias y el tiempo sumado. Lo que falta por
 * correr, en gris.
 */
export function pintarTablaCampeonato(campeonato, carrera, humanos, opciones) {
  const filas = campeonato.circuitos.map((circuito, k) => ({ nombre: nombreCircuito(circuito), hecha: campeonato.carreras[k] }));
  const { victorias, tiempos } = clasificacion(campeonato);
  pintarTabla(carrera, humanos, filas, [['campeonato.victorias', victorias.map(String)], ['campeonato.tiempo', tiempos.map(formatearTiempo)]], opciones);
}

/*
 * Una tabla de resultados: una columna por coche; una fila por carrera (o por
 * manga) con el tiempo de cada uno (`hecha`, o null si falta por correr) y,
 * debajo, los totales (`[clave, valores]`).
 */
function pintarTabla(carrera, humanos, filas, totales, { x, y, mitad, tam, fila }) {
  // Una columna por coche, de la mitad a la derecha (con dos, a 0,35 y al borde).
  const n = carrera.coches.length;
  const columnas = carrera.coches.map((_, i) => x + mitad * (0.35 + 0.65 * i / (n - 1)));
  const izquierda = x - mitad;
  carrera.coches.forEach((slot, i) => {
    ctx.fillStyle = slot.coche.color;
    rectanguloRedondo(columnas[i] - 14, y - 7, 14, 14, 3);
    texto(nombreSlot(i, humanos), columnas[i] - 22, y, { tam, color: COLOR.hud, peso: 800, alinear: 'right' });
  });
  filas.forEach(({ nombre, hecha }, k) => {
    const yFila = y + (k + 1) * fila;
    texto(nombre, izquierda, yFila, { tam, color: hecha ? COLOR.hud : COLOR.texto, peso: 600, alinear: 'left' });
    columnas.forEach((cx, i) => {
      const gana = hecha && hecha.ganador === i;
      const cadena = hecha ? formatearTiempo(hecha.tiempos[i]) : '—';
      texto(cadena, cx, yFila, { tam, color: gana ? carrera.coches[i].coche.color : COLOR.texto, peso: gana ? 800 : 500, alinear: 'right' });
    });
  });
  const yTotal = y + (filas.length + 1) * fila + fila * 0.4;
  ctx.fillStyle = 'rgba(230, 232, 238, 0.25)';
  ctx.fillRect(izquierda, yTotal - fila * 0.7, mitad * 2, 1);
  totales.forEach(([clave, valores], k) => {
    const yFila = yTotal + k * fila;
    texto(t(clave), izquierda, yFila, { tam, color: COLOR.hud, peso: 700, alinear: 'left' });
    valores.forEach((v, i) => texto(v, columnas[i], yFila, { tam, color: COLOR.hud, peso: 800, alinear: 'right' }));
  });
}

/**
 * Solo sirviendo en local. La exigencia del J1 en %: 100 se sale. Encima, la
 * medida del fotograma (medida.js).
 */
/** Los FPS del ajuste (ajustes.js), abajo a la izquierda, pegados al borde: en la mesa y en la lupa. */
export function dibujarFps(medida, y) {
  texto(`${medida.fps} FPS`, 12, y, { tam: 12, color: COLOR.texto, alinear: 'left', peso: 600 });
}

export function dibujarDepuracion(medida, slot) {
  const { coche } = slot;
  const datos = `${medida.fps} FPS · v ${Math.hypot(coche.vx, coche.vy).toFixed(0)} · exigencia ${(slot.exigencia * 100).toFixed(0)}`;
  texto(datos, ANCHO - 12, ALTO - BANDA_TEXTO / 2, { tam: 12, color: COLOR.texto, alinear: 'right', peso: 500 });
  // Pegada al borde: a media banda, más larga, pisaría el rótulo del J2.
  texto(textoMedida(medida), ANCHO - 12, ALTO - 9, { tam: 11, color: COLOR.texto, alinear: 'right', peso: 500 });
}
