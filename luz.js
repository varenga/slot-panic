/*
 * Slot Panic — la hora: día, atardecer o noche, combinable con el escenario.
 *
 * Es cosmética: ni el agarre ni nada que el arnés mida depende de ella. Se
 * pinta encima del mundo y debajo de lo que brilla (chispas, luces) y de la
 * interfaz.
 *
 * - Atardecer: un velo cálido, más claro hacia el sol y más oscuro al otro
 *   lado. Un relleno por fotograma.
 * - Noche: como un circuito de noche de verdad. Una capa oscura en la que se
 *   recorta, horneado una vez, la pista entera a media luz, la mancha de cada
 *   torre de iluminación (las coloca el decorado) y las gradas; y en cada
 *   fotograma, los dos haces de los faros y un halo por coche. Luego, sumando
 *   color, el brillo de faros y focos, las balizas de las curvas cerradas y
 *   los flashes de las cámaras en las gradas.
 *
 * La luz es un número: 0 de día, 1 al atardecer y 2 de noche. Entre medias se
 * funden: en una carrera de resistencia cae la tarde mientras se corre
 * (`luzDeCarrera`).
 */

import { ALTO, ANCHO, ANCHO_COCHE, GAME_SLUG, LARGO_COCHE } from './config.js';
import { crearCapa, ctx, dibujarEn } from './nucleo/lienzo.js';
import { RADIO_CURVA_NEUMATICOS } from './nucleo/decorado.js';

export const ORDEN_HORAS = ['dia', 'atardecer', 'noche'];

/*
 * La luz de una carrera de resistencia, según lo que lleva corrido el primero
 * (`fraccion`, de 0 a 1): el primer quinto de día, el segundo cayendo la
 * tarde, el del medio al atardecer, el cuarto anocheciendo y el último de
 * noche. El ciclo entero, sea cual sea la hora elegida: la resistencia es la
 * carrera que dura un día.
 */
/*
 * El sol de cada luz, para las sombras del decorado (`sombraSol`): lo alto
 * que está (grados sobre el horizonte) y hacia dónde cae la sombra (grados
 * desde +x, girando hacia abajo). A mediodía, alto: la sombra casi no se ve.
 * Cayendo la tarde, baja y gira, y la sombra se alarga hacia la derecha; al
 * ponerse (luz 1,1-1,6) se desvanece (`fuerza`). De noche no hay.
 *
 * `alto`: lo alto de lo que la da, en px a escala de su sombra; nada da una
 * sombra de más de SOMBRA_ESTIRA veces su alto (el sol rozando el horizonte).
 */
const MASTIL = 8;            // px: lo alto de una torre
const SOMBRA_ESTIRA = 11.25; // la de una torre, como mucho 90 px
const SOMBRA_ALFA = 0.28;    // la de una torre; los árboles y las gradas, la suya (dibujo.js)
export function sombraSol(luz, alto) {
  const altura = luz <= 1 ? 65 - 50 * luz : Math.max(3, 15 - 24 * (luz - 1));
  const hacia = (80 - 30 * Math.min(luz, 1.5)) * Math.PI / 180;
  const largo = Math.min(alto * SOMBRA_ESTIRA, alto / Math.tan(altura * Math.PI / 180));
  const fuerza = Math.min(1, Math.max(0, (1.6 - luz) / 0.5));
  return { x: Math.cos(hacia) * largo, y: Math.sin(hacia) * largo, largo, fuerza };
}

export function sombraTorre(luz) {
  const sombra = sombraSol(luz, MASTIL);
  return { ...sombra, alfa: SOMBRA_ALFA * sombra.fuerza };
}

const CAMINO_LUZ = [[0.2, 0], [0.4, 1], [0.6, 1], [0.8, 2]];
export function luzDeCarrera(fraccion) {
  let luz = 2;
  for (let i = 0; i < CAMINO_LUZ.length; i++) {
    const [f, l] = CAMINO_LUZ[i];
    if (fraccion > f) continue;
    if (i === 0) { luz = l; break; }
    const [f0, l0] = CAMINO_LUZ[i - 1];
    luz = l0 + (l - l0) * (fraccion - f0) / (f - f0);
    break;
  }
  return luz;
}

/*
 * La hora elegida es una preferencia, como el escenario: se recuerda. Vive
 * aquí y no en `estado.js` a propósito: un módulo nuevo no puede estar en la
 * caché del navegador, y una copia vieja de `estado.js` sin estas funciones
 * rompía el arranque (lo hizo en local).
 */
export function leerHora() {
  try {
    const guardada = localStorage.getItem(`${GAME_SLUG}.hora`);
    return ORDEN_HORAS.includes(guardada) ? guardada : ORDEN_HORAS[0];
  } catch (error) {
    return ORDEN_HORAS[0];
  }
}

export function guardarHora(hora) {
  try { localStorage.setItem(`${GAME_SLUG}.hora`, hora); } catch (error) { /* modo privado */ }
}

const OSCURIDAD = 'rgba(6, 10, 26, 0.88)';
const FONDO_PISTA = 0.42;    // cuánta luz llega a toda la pista y su escapatoria
const MANCHA_LARGO = 92;     // px de la mancha de una torre, a lo largo de la pista
const MANCHA_ANCHO = 46;     // px a lo ancho
const MANCHA_HACIA = 6;      // px que la mancha se acerca a su torre
const FARO_LARGO = 140;      // px del haz de cada faro
const FARO_ABRE = 0.13;      // rad a cada lado del eje del haz
const FARO_ABRE_FUERA = 0.03;   // rad que cada haz se abre hacia su lado
const FARO_LADO = ANCHO_COCHE / 2 - 2.1;   // px del eje a cada faro: casi en las esquinas (dibujo.js)
const HALO = 22;             // px alrededor de cada coche: que se vea siempre
const BALIZA_RITMO = 7;      // pasos por segundo de la ola de las balizas
const BALIZA_OLA = 4;        // cada cuántas balizas va encendida una
const BALIZA_PASO = 16;      // px de pista entre dos balizas de una curva
const BALIZA_FUERA = 1.5;    // px más allá del borde del piano
const BALIZA_HALO = 4.5;     // px del brillo de una baliza…
const BALIZA_LUZ = 1.3;      // …y de la luz misma
const FLASH_VIDA = 0.09;     // s que dura un flash
const FLASHES_CALMA = 1.2;   // flashes por segundo en una grada…
const FLASHES_PASO = 9;      // …y con un coche pasando cerca
const FLASH_CERCA = 150;     // px del centro de la grada que cuentan como «cerca»

let base = null;             // la oscuridad con lo fijo ya recortado
let claveBase = '';
let trabajo = null;          // la capa de cada fotograma
let torres = [];
let foco = null;             // sprite: un degradado redondo, blanco a nada
let ambar = null;            // el mismo, en ámbar: las balizas
let balizas = [];            // { x, y, k }: k, su orden dentro de su curva
let flashes = [];            // { x, y, vida }
let antes = 0;               // el reloj del fotograma anterior, para los flashes
let cono = null;             // sprite: el cono de los faros, mirando a +x

/** Un sprite de degradado redondo: se pinta una vez y se estampa escalado. */
function crearFoco(color = '255, 255, 255') {
  const r = 64;
  const capa = crearCapa(r * 2, r * 2);
  dibujarEn(capa, () => {
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, `rgba(${color}, 1)`);
    g.addColorStop(0.5, `rgba(${color}, 0.75)`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r * 2, r * 2);
  });
  return capa;
}

/** El haz de un faro: una cuña con el degradado del foco, con el vértice en (0, FARO_LARGO). */
function crearCono() {
  const capa = crearCapa(FARO_LARGO, FARO_LARGO * 2);
  dibujarEn(capa, () => {
    const g = ctx.createRadialGradient(0, FARO_LARGO, 0, 0, FARO_LARGO, FARO_LARGO);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.5)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, FARO_LARGO);
    ctx.arc(0, FARO_LARGO, FARO_LARGO, -FARO_ABRE, FARO_ABRE);
    ctx.closePath();
    ctx.fill();
  });
  return capa;
}

function estampar(sprite, x, y, radio) {
  ctx.drawImage(sprite, x - radio, y - radio, radio * 2, radio * 2);
}

/*
 * La mancha de luz de una torre sobre el asfalto: alargada a lo largo de la
 * pista, centrada en el punto del eje al que mira y un poco hacia la torre,
 * que alumbra más su lado.
 */
function pintarMancha(t) {
  const dx = t.x - t.luz.x, dy = t.y - t.luz.y, d = Math.hypot(dx, dy) || 1;
  ctx.save();
  ctx.translate(t.luz.x + dx / d * MANCHA_HACIA, t.luz.y + dy / d * MANCHA_HACIA);
  ctx.rotate(t.luz.angulo);
  ctx.drawImage(foco, -MANCHA_LARGO, -MANCHA_ANCHO, MANCHA_LARGO * 2, MANCHA_ANCHO * 2);
  ctx.restore();
}

/*
 * Lo fijo de la noche, horneado una vez por circuito y escenario: la pista
 * entera a media luz (un circuito de noche se ilumina todo, no a manchas), la
 * mancha de cada torre, las gradas encendidas y un poco de luz al pie de cada
 * torre.
 */
function hornearBase(circuito, decorado) {
  const capa = crearCapa(ANCHO, ALTO);
  dibujarEn(capa, () => {
    ctx.fillStyle = OSCURIDAD;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = FONDO_PISTA;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = circuito.ancho + 2 * 26;
    ctx.beginPath();
    circuito.eje.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const t of torres) pintarMancha(t);
    for (const t of torres) estampar(foco, t.x, t.y, 16);
    ctx.globalAlpha = 0.75;
    for (const g of decorado.gradas) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angulo);
      ctx.drawImage(foco, -g.largo / 2 - 14, -g.fondo / 2 - 14, g.largo + 28, g.fondo + 28);
      ctx.restore();
    }
  });
  return capa;
}

/*
 * Los dos haces de los faros, en la capa que toque: recortando o sumando luz.
 * Cada uno sale de su faro, casi en una esquina del morro: cerca del coche se
 * ven dos y a unos 35 px se funden en una sola mancha, como unos faros de
 * verdad. Un cono desde el centro se leía como un foco, y dos que se abrían
 * hacia fuera no llegaban a tocarse (playtest).
 */
function pintarConos(coches) {
  const l = LARGO_COCHE / 2;
  for (const coche of coches) {
    for (const lado of [-1, 1]) {
      ctx.save();
      ctx.translate(coche.x, coche.y);
      ctx.rotate(coche.angulo);
      ctx.translate(l, lado * FARO_LADO);
      ctx.rotate(lado * FARO_ABRE_FUERA);
      ctx.drawImage(cono, 0, -FARO_LARGO);
      ctx.restore();
    }
  }
}

/**
 * Pinta la luz (0 día, 1 atardecer, 2 noche, o entre medias) sobre el mundo ya
 * dibujado. `coches`: los que llevan faros. De día no hace nada.
 */
export function pintarHora(luz, circuito, decorado, coches) {
  if (luz <= 0) return;
  // Hasta el atardecer, su velo crece; anocheciendo, se va bajo la noche.
  if (luz < 2) pintarAtardecer(luz <= 1 ? luz : 2 - luz);
  if (luz > 1) pintarNoche(luz - 1, circuito, decorado, coches);
}

/** La noche, con su fuerza: `fuerza` 1 es la noche cerrada. */
function pintarNoche(fuerza, circuito, decorado, coches) {
  if (!foco) { foco = crearFoco(); ambar = crearFoco('255, 160, 30'); cono = crearCono(); trabajo = crearCapa(ANCHO, ALTO); }

  const clave = circuito.clave + '/' + decorado.nombre;
  if (clave !== claveBase) {
    torres = decorado.torres;
    balizas = balizasDe(circuito);
    flashes = [];
    base = hornearBase(circuito, decorado);
    claveBase = clave;
  }

  dibujarEn(trabajo, () => {
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    pintarConos(coches);
    for (const coche of coches) estampar(foco, coche.x, coche.y, HALO);
    ctx.globalCompositeOperation = 'source-over';
  });
  ctx.save();
  ctx.globalAlpha = fuerza;
  ctx.drawImage(trabajo, 0, 0);
  ctx.restore();

  // El brillo, sumando: los haces de los faros, cálidos, y los focos de cada
  // torre, blancos, encendidos en su cabeza.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.12 * fuerza;
  pintarConos(coches);
  for (const t of torres) {
    const cx = t.x + Math.cos(t.angulo) * 4, cy = t.y + Math.sin(t.angulo) * 4;
    ctx.globalAlpha = 0.9 * fuerza;
    estampar(foco, cx, cy, 7);
    ctx.globalAlpha = 0.35 * fuerza;
    estampar(foco, cx, cy, 15);
  }
  pintarBalizas(fuerza);
  pintarFlashes(decorado.gradas, coches, fuerza);
  ctx.restore();
}

/*
 * Las balizas: luces ámbar pequeñas pegadas al borde de fuera del piano de las
 * curvas cerradas (las de la barrera de neumáticos). Son de adorno: no chocan.
 * Van en el orden de la pista, así que la ola corre en el sentido de la
 * marcha: dice dónde está la curva y hacia dónde gira. Cada curva empieza su
 * cuenta. En la barrera de neumáticos quedaban lejos de la pista y grandes.
 */
function balizasDe(circuito) {
  const lista = [];
  let k = -1, recorrido = Infinity;
  for (const p of circuito.eje) {
    if (p.radio > RADIO_CURVA_NEUMATICOS) { k = -1; recorrido = Infinity; continue; }
    recorrido += p.largo;
    if (recorrido < BALIZA_PASO) continue;
    recorrido = 0;
    k++;
    const lado = -p.curva;
    const distancia = p.borde[lado < 0 ? 0 : 1] + BALIZA_FUERA;
    lista.push({ x: p.x - Math.sin(p.angulo) * lado * distancia, y: p.y + Math.cos(p.angulo) * lado * distancia, k });
  }
  return lista;
}

function pintarBalizas(fuerza) {
  const paso = Math.floor(performance.now() / 1000 * BALIZA_RITMO);
  for (const b of balizas) {
    // La encendida y, detrás, la que se apaga: la ola tiene cola.
    const fase = (((b.k - paso) % BALIZA_OLA) + BALIZA_OLA) % BALIZA_OLA;
    const brillo = fase === 0 ? 1 : fase === BALIZA_OLA - 1 ? 0.4 : 0.08;
    ctx.globalAlpha = brillo * fuerza;
    estampar(ambar, b.x, b.y, BALIZA_HALO);
    ctx.globalAlpha = Math.min(1, brillo * 1.4) * fuerza;
    estampar(ambar, b.x, b.y, BALIZA_LUZ);
  }
}

/*
 * Los flashes de las cámaras del público: destellos blancos muy breves en
 * sitios al azar de cada grada, muchos más cuando pasa un coche cerca. Es
 * presentación: aquí vale Math.random().
 */
function pintarFlashes(gradas, coches, fuerza) {
  const ahora = performance.now() / 1000;
  const dt = Math.min(0.1, Math.max(0, ahora - antes));
  antes = ahora;
  for (const g of gradas) {
    const cerca = coches.some((c) => Math.hypot(c.x - g.x, c.y - g.y) < FLASH_CERCA);
    if (Math.random() < (cerca ? FLASHES_PASO : FLASHES_CALMA) * dt) {
      const u = (Math.random() - 0.5) * g.largo, v = (Math.random() - 0.5) * g.fondo;
      const cos = Math.cos(g.angulo), sin = Math.sin(g.angulo);
      flashes.push({ x: g.x + u * cos - v * sin, y: g.y + u * sin + v * cos, vida: FLASH_VIDA });
    }
  }
  for (const f of flashes) {
    ctx.globalAlpha = Math.max(0, f.vida / FLASH_VIDA) * fuerza;
    estampar(foco, f.x, f.y, 8);
    estampar(foco, f.x, f.y, 2.5);
    f.vida -= dt;
  }
  flashes = flashes.filter((f) => f.vida > 0);
}

function pintarAtardecer(fuerza) {
  ctx.save();
  ctx.globalAlpha = fuerza;
  // El sol, bajo y arriba a la izquierda: claro y cálido hacia él, malva al otro lado.
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
  g.addColorStop(0, 'rgb(255, 228, 190)');
  g.addColorStop(1, 'rgb(196, 162, 178)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(255, 150, 70, 0.18)';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.restore();
}
