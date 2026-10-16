/*
 * Slot Panic — la hora: día, atardecer o noche, combinable con el escenario.
 *
 * Es cosmética: ni el agarre ni nada que el arnés mida depende de ella. Se
 * pinta encima del mundo y debajo de lo que brilla (chispas, luces) y de la
 * interfaz.
 *
 * - Atardecer: un velo cálido, más claro hacia el sol y más oscuro al otro
 *   lado. Pintado una vez y estampado en cada fotograma.
 * - Noche: como un circuito de noche de verdad. Una capa oscura en la que se
 *   recorta, horneado una vez, la pista entera a media luz, la mancha de cada
 *   torre de iluminación (las coloca el decorado) y las gradas; y en cada
 *   fotograma, los dos haces de los faros y un halo por coche. Luego, sumando
 *   color, el brillo de faros, pilotos y focos, las balizas de las curvas
 *   cerradas y los flashes de las cámaras en las gradas. Lo que alumbra un
 *   coche que no va por un puente no se ve encima de su tablero.
 *
 * La luz es un número: 0 de día, 1 al atardecer y 2 de noche. Entre medias se
 * funden: en una carrera de resistencia cae la tarde mientras se corre
 * (`luzDeCarrera`).
 */

import { ALTO, ANCHO, ANCHO_COCHE, COCHES, GAME_SLUG, LARGO_COCHE } from './config.js';
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
const PILOTO_LADO = ANCHO_COCHE / 2 - 2.5;   // px del eje a cada piloto
const PILOTO_BRILLO = 6;     // px del brillo de cada piloto…
const PILOTO_FRENA = 9;      // …y frenando, que se encienden más
const PILOTO_ESTELA = 14;    // px del reflejo rojo en el asfalto, detrás del coche
const TABLERO_MAS = 8;       // px que el tablero de un puente tapa más allá de la pista (barandillas)
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
let circuitoBase = null;     // el circuito y el decorado con que se horneó
let decoradoBase = null;
let trabajo = null;          // la capa de cada fotograma
let torres = [];
let foco = null;             // sprite: un degradado redondo, blanco a nada
let ambar = null;            // el mismo, en ámbar: las balizas
let balizas = [];            // { x, y, k }: k, su orden dentro de su curva
let flashes = [];            // { x, y, vida }
let antes = 0;               // el reloj del fotograma anterior, para los flashes
let cono = null;             // sprite: el cono de los faros, mirando a +x
let rojo = null;             // el foco, en rojo: los pilotos
let tablero = null;          // los puentes, opacos: lo que tapa la luz de debajo (o null)
let tableroOscuro = null;    // la oscuridad de la base, solo donde hay tablero
let abajo = null;            // la capa del brillo de los que pasan bajo un puente

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
    // Las gradas, los boxes y el aparcamiento, encendidos.
    const encendidos = [...decorado.gradas, ...decorado.instalaciones.filter((r) => r.tipo === 'boxes' || r.tipo === 'aparcamiento')];
    for (const g of encendidos) {
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
 * Los tramos que van por un puente (la pieza `puente`), como en `dibujo.js`:
 * listas de puntos del eje.
 */
function tramosAltos(eje) {
  const tramos = [];
  let actual = null;
  for (const p of eje) {
    if (p.efecto !== 'puente') actual = null;
    else if (actual) actual.push(p);
    else tramos.push(actual = [p]);
  }
  return tramos;
}

/*
 * El tablero de los puentes, opaco, con sus barandillas: lo que alumbra un
 * coche que pasa por debajo no puede verse encima. Sin puentes, null.
 */
function hornearTablero(circuito) {
  const tramos = tramosAltos(circuito.eje);
  if (!tramos.length) return null;
  const capa = crearCapa(ANCHO, ALTO);
  dibujarEn(capa, () => {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = circuito.ancho + 2 * TABLERO_MAS;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    for (const tramo of tramos) {
      ctx.beginPath();
      tramo.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  });
  return capa;
}

/** El punto del puente más cercano a (x, y) que lo tiene encima, o null. */
function tableroEn(circuito, x, y) {
  const r = circuito.ancho / 2 + TABLERO_MAS;
  let cerca = null, mejor = r;
  for (const p of circuito.eje) {
    if (p.efecto !== 'puente') continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < mejor) { mejor = d; cerca = p; }
  }
  return cerca;
}

/** ¿Cae (x, y) bajo el tablero de un puente? */
function bajoTablero(circuito, x, y) {
  return tableroEn(circuito, x, y) !== null;
}

/*
 * ¿Va el coche por el tablero (o sus rampas)? Encima de él y con su rumbo: el
 * de abajo lo cruza con otro (como `bajoPuente` en dibujo.js). Los demás van por
 * el suelo y el tablero tapa su luz, también la de los faros de uno que se
 * acerca: alumbran 140 px y `bajoPuente` solo cuenta los que están a 90 del
 * cruce (la luz se veía a medias encima).
 */
function porElTablero(circuito, coche) {
  const p = tableroEn(circuito, coche.x, coche.y);
  return p !== null && Math.abs(Math.cos(coche.angulo - p.angulo)) >= 0.9;
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
    for (let lado = -1; lado <= 1; lado += 2) {
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

/*
 * Los pilotos, sumando luz: un punto rojo en cada esquina de la cola, con su
 * brillo, y un reflejo rojo en el asfalto detrás. Frenando (soltando el
 * gatillo) se encienden más, como las luces de freno.
 */
function pintarPilotos(coches, fuerza) {
  for (const coche of coches) {
    const l = (COCHES[coche.modelo]?.largo ?? LARGO_COCHE) / 2;
    const cos = Math.cos(coche.angulo), sin = Math.sin(coche.angulo);
    const frena = coche.frenando;
    ctx.globalAlpha = (frena ? 0.3 : 0.14) * fuerza;
    estampar(rojo, coche.x + (-l - 6) * cos, coche.y + (-l - 6) * sin, PILOTO_ESTELA);
    for (let lado = -1; lado <= 1; lado += 2) {
      // La esquina de la cola: (-l + 1) a lo largo y PILOTO_LADO de lado.
      const u = -l + 1, v = lado * PILOTO_LADO;
      const x = coche.x + u * cos - v * sin, y = coche.y + u * sin + v * cos;
      ctx.globalAlpha = (frena ? 0.85 : 0.5) * fuerza;
      estampar(rojo, x, y, frena ? PILOTO_FRENA : PILOTO_BRILLO);
      ctx.globalAlpha = fuerza;
      estampar(rojo, x, y, 1.6);
    }
  }
}

/** El brillo que suman los coches: los haces de los faros, cálidos, y los pilotos. */
function pintarBrillo(coches, fuerza) {
  ctx.globalAlpha = 0.12 * fuerza;
  pintarConos(coches);
  pintarPilotos(coches, fuerza);
}

/**
 * Pinta la luz (0 día, 1 atardecer, 2 noche, o entre medias) sobre el mundo ya
 * dibujado. `coches`: los que llevan faros (la luz de los que no van por un
 * puente no se ve encima de su tablero). De día no hace nada.
 */
export function pintarHora(luz, circuito, decorado, coches) {
  if (luz <= 0) return;
  // Hasta el atardecer, su velo crece; anocheciendo, se va bajo la noche.
  if (luz < 2) pintarAtardecer(luz <= 1 ? luz : 2 - luz);
  if (luz > 1) pintarNoche(luz - 1, circuito, decorado, coches);
}

/** La noche, con su fuerza: `fuerza` 1 es la noche cerrada. */
function pintarNoche(fuerza, circuito, decorado, coches) {
  if (!foco) {
    foco = crearFoco(); ambar = crearFoco('255, 160, 30'); rojo = crearFoco('255, 30, 20'); cono = crearCono();
    trabajo = crearCapa(ANCHO, ALTO); abajo = crearCapa(ANCHO, ALTO);
  }

  if (circuito !== circuitoBase || decorado !== decoradoBase) {
    torres = decorado.torres;
    // Las balizas de una curva que pasa bajo un puente las tapa el tablero.
    balizas = balizasDe(circuito).filter((b) => !bajoTablero(circuito, b.x, b.y));
    flashes = [];
    base = hornearBase(circuito, decorado);
    tablero = hornearTablero(circuito);
    tableroOscuro = tablero && crearCapa(ANCHO, ALTO);
    if (tablero) {
      dibujarEn(tableroOscuro, () => {
        ctx.drawImage(base, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(tablero, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      });
    }
    circuitoBase = circuito;
    decoradoBase = decorado;
  }
  // Sin puente, nada lo tapa. Las dos listas se reutilizan: es cada fotograma.
  tapados.length = 0;
  encima.length = 0;
  for (const c of coches) (tablero && !porElTablero(circuito, c) ? tapados : encima).push(c);

  dibujarEn(trabajo, () => {
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    if (tapados.length) {
      // Los de abajo alumbran la pista de abajo, no el tablero: se vuelve a
      // oscurecer. Primero se borra: encima de la oscuridad que había, se sumaba
      // y todo el puente quedaba el doble de oscuro.
      recortar(tapados);
      ctx.drawImage(tablero, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tableroOscuro, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
    }
    recortar(encima);
    ctx.globalCompositeOperation = 'source-over';
  });
  ctx.save();
  ctx.globalAlpha = fuerza;
  ctx.drawImage(trabajo, 0, 0);
  ctx.restore();

  // El brillo de los de abajo, en su capa y sin el tablero.
  if (tapados.length) {
    dibujarEn(abajo, () => {
      ctx.clearRect(0, 0, ANCHO, ALTO);
      ctx.globalCompositeOperation = 'lighter';
      pintarBrillo(tapados, 1);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(tablero, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  // El brillo, sumando: los faros y los pilotos de los coches y los focos de
  // cada torre, blancos, encendidos en su cabeza.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (tapados.length) {
    ctx.globalAlpha = fuerza;
    ctx.drawImage(abajo, 0, 0);
  }
  pintarBrillo(encima, fuerza);
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

const tapados = [];   // los coches cuya luz tapa el tablero de un puente
const encima = [];    // y los demás

/** Lo que recorta la oscuridad cada coche: los haces de sus faros y un halo alrededor. */
function recortar(lista) {
  pintarConos(lista);
  for (const coche of lista) estampar(foco, coche.x, coche.y, HALO);
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
    let cerca = false;
    for (const c of coches) cerca ||= Math.hypot(c.x - g.x, c.y - g.y) < FLASH_CERCA;
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
  // Se filtra en el sitio: no una lista nueva en cada fotograma.
  let j = 0;
  for (const f of flashes) if (f.vida > 0) flashes[j++] = f;
  flashes.length = j;
}

/*
 * El atardecer, sin modos de mezcla: `multiply` y `soft-light` no los hace la
 * mezcla de la GPU, y a pantalla completa cada relleno copiaba y releía el
 * lienzo entero (en Android iba a saltos; la noche, no). El velo es una capa
 * pintada una vez y estampada con `source-over`: un color y su alcance, más
 * claro y cálido hacia el sol (bajo, arriba a la izquierda) y malva al otro
 * lado, ajustados a lo que hacían aquellos dos rellenos (por mínimos cuadrados
 * sobre grises de 0,1 a 0,9: queda a ~9/255 en el lado del sol).
 */
let velo = null;
function crearVelo() {
  const capa = crearCapa(ANCHO, ALTO);
  dibujarEn(capa, () => {
    const g = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
    g.addColorStop(0, 'rgba(164, 76, 0, 0.23)');
    g.addColorStop(1, 'rgba(70, 0, 2, 0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ANCHO, ALTO);
  });
  return capa;
}

function pintarAtardecer(fuerza) {
  velo ??= crearVelo();
  ctx.save();
  ctx.globalAlpha = fuerza;
  ctx.drawImage(velo, 0, 0);
  ctx.restore();
}
