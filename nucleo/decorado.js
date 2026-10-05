/*
 * Slot Panic — el decorado: árboles, rocas, cactus, pinos, gradas, pilas de
 * neumáticos y torres de iluminación. Solo decide DÓNDE va cada cosa; cómo se pinta es de `dibujo.js`.
 *
 * Es la lección del decorado de Rail Panic, con sus dos reglas:
 *
 * - **Se genera con su propia semilla, nunca con `Math.random()`**: el mismo
 *   circuito y escenario dan siempre el mismo paisaje, y nada de esto puede
 *   mover una cifra que el arnés mida.
 * - **Nunca pisa nada que juegue**: la pista, el hueco del marcador en el
 *   interior ni las bandas de texto de arriba y abajo. Lo comprueba
 *   `generarDecorado()` al sembrar y el arnés al terminar.
 */

import { ALTO, ANCHO } from '../config.js';
import { ESCENARIOS } from '../escenarios.js';

export const BANDA_TEXTO = 56;     // px de arriba y de abajo: el marcador y los textos
const HOLGURA_PISTA = 10;          // px entre el muro y cualquier pieza
const PIEZAS = 90;                 // las que se intentan colocar
const INTENTOS = 1500;
export const RADIO_CURVA_NEUMATICOS = 60; // curvas con este radio o menos llevan barrera
const TORRE_CADA = 165;            // px de eje entre dos torres de iluminación
const TORRE_RADIO = 4;             // la base de una torre
const TORRE_FUERA = 6;             // px entre el muro y la base
const TORRE_BUSCA = 60;            // px de eje, antes o después, donde buscarle sitio
const TORRE_SEPARA = 80;           // px como mínimo entre dos torres: si no, parecen puestas al azar

const TAMANO = {
  arbol: [10, 17], pino: [9, 14], arbusto: [5, 8], roca: [4, 9], cactus: [5, 8]
};

/** mulberry32: un PRNG de 32 bits, sembrado, que no toca `Math.random()`. */
export function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function semillaDe(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Distancia de un punto al muro, por fuera (negativa dentro: en la pista, el
 * piano o la grava). Sin ventana: el decorado no tiene índice previo.
 */
export function distanciaAPista(circuito, p) {
  return circuito.muroCercano(p).fuera;
}

/**
 * Las zonas donde no puede haber nada: las bandas de texto (la de arriba es el
 * marcador) y, si el circuito lo declara, el hueco de la portada en el interior.
 */
export function zonasVetadas(circuito) {
  const zonas = [
    { x0: 0, y0: 0, x1: ANCHO, y1: BANDA_TEXTO },
    { x0: 0, y0: ALTO - BANDA_TEXTO, x1: ANCHO, y1: ALTO }
  ];
  if (circuito.interior) {
    const { x, y } = circuito.interior;
    zonas.push({ x0: x - 235, y0: y - 165, x1: x + 235, y1: y + 135 });
  }
  return zonas;
}

function enZona(x, y, r, z) {
  return x + r > z.x0 && x - r < z.x1 && y + r > z.y0 && y - r < z.y1;
}

/** ¿Cabe una pieza redonda aquí? El arnés hace la misma pregunta al revés. */
export function cabe(circuito, pieza, puestas = []) {
  const { x, y, r } = pieza;
  if (x - r < 0 || y - r < 0 || x + r > ANCHO || y + r > ALTO) return false;
  if (zonasVetadas(circuito).some((z) => enZona(x, y, r, z))) return false;
  if (distanciaAPista(circuito, pieza) < r + HOLGURA_PISTA) return false;
  return puestas.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + 3);
}

export function generarDecorado(circuito, nombreEscenario) {
  const escenario = ESCENARIOS[nombreEscenario];
  const tirar = azar(semillaDe(circuito.clave + '/' + nombreEscenario));

  const gradas = (circuito.gradas || []).map((g) => ({ ...g }));
  const neumaticos = barrerasDeNeumaticos(circuito);
  const enGradas = gradas.map((g) => ({ x: g.x, y: g.y, r: Math.hypot(g.largo, g.fondo) / 2 }));
  const torres = torresDeLuz(circuito, [...neumaticos, ...enGradas]);
  // Las gradas, los neumáticos y las torres cuentan como ocupado para lo que crece.
  const ocupado = [
    ...neumaticos.map((n) => ({ x: n.x, y: n.y, r: n.r + 4 })),
    ...enGradas,
    ...torres.map((t) => ({ x: t.x, y: t.y, r: t.r + 6 }))
  ];

  const tipos = Object.entries(escenario.piezas);
  const piezas = [];
  for (let intento = 0; intento < INTENTOS && piezas.length < PIEZAS; intento++) {
    let dado = tirar(), tipo = tipos[0][0];
    for (const [nombre, peso] of tipos) {
      if (dado < peso) { tipo = nombre; break; }
      dado -= peso;
    }
    const [minimo, maximo] = TAMANO[tipo];
    const pieza = {
      tipo,
      x: tirar() * ANCHO,
      y: tirar() * ALTO,
      r: minimo + tirar() * (maximo - minimo),
      giro: tirar() * Math.PI * 2,
      variante: tirar()
    };
    // Las gradas son rectángulos; para ellas basta con no acercarse a su círculo.
    if (cabe(circuito, pieza, piezas) && ocupado.every((o) => Math.hypot(o.x - pieza.x, o.y - pieza.y) > o.r + pieza.r)) {
      piezas.push(pieza);
    }
  }
  // De arriba abajo: lo de más abajo tapa lo de más arriba, como en una maqueta.
  piezas.sort((a, b) => a.y - b.y);

  return { nombre: nombreEscenario, escenario, piezas, gradas, neumaticos, torres, semilla: semillaDe(circuito.clave + '/' + nombreEscenario + '/suelo') };
}

/*
 * Las torres de iluminación, como en un circuito de noche de verdad: a
 * intervalos regulares a lo largo de la pista y por el perímetro de fuera (el
 * lado más lejos del centro del circuito), pegadas al muro y mirando a la
 * pista. Si no caben por fuera, por dentro; si tampoco, ese tramo se queda
 * sin torre. Dónde dan luz (`luz`) es el punto del eje al que miran.
 */
function torresDeLuz(circuito, ocupado) {
  const { eje } = circuito;
  const centro = {
    x: eje.reduce((t, p) => t + p.x, 0) / eje.length,
    y: eje.reduce((t, p) => t + p.y, 0) / eje.length
  };
  const lista = [];
  const colocar = (p) => {
    const nx = -Math.sin(p.angulo), ny = Math.cos(p.angulo);
    const posicion = (lado) => {
      const d = p.muro[lado < 0 ? 0 : 1] + TORRE_RADIO + TORRE_FUERA;
      return { x: p.x + nx * lado * d, y: p.y + ny * lado * d, r: TORRE_RADIO };
    };
    const lados = [posicion(-1), posicion(1)]
      .sort((a, b) => Math.hypot(b.x - centro.x, b.y - centro.y) - Math.hypot(a.x - centro.x, a.y - centro.y));
    const torre = lados.find((t) => torreCabe(circuito, t, [...ocupado, ...lista]) &&
      lista.every((o) => Math.hypot(o.x - t.x, o.y - t.y) >= TORRE_SEPARA));
    if (!torre) return false;
    lista.push({
      x: torre.x, y: torre.y, r: torre.r,
      angulo: Math.atan2(p.y - torre.y, p.x - torre.x),   // la cabeza mira a la pista
      luz: { x: p.x, y: p.y, angulo: p.angulo }
    });
    return true;
  };
  // Cada TORRE_CADA px de eje; si justo ahí no cabe por ningún lado (el borde
  // del lienzo, otro tramo, una grada), se busca algo antes o después.
  for (let s = TORRE_CADA / 2; s < circuito.largo; s += TORRE_CADA) {
    const cerca = eje.filter((p) => Math.abs(p.s - s) <= TORRE_BUSCA)
      .sort((a, b) => Math.abs(a.s - s) - Math.abs(b.s - s));
    cerca.some(colocar);
  }
  return lista;
}

/*
 * ¿Cabe una torre aquí? Como `cabe()`, pero va más pegada al muro que el resto
 * del decorado (TORRE_FUERA en vez de HOLGURA_PISTA): es la valla de la pista.
 * El arnés hace la misma pregunta.
 */
export function torreCabe(circuito, t, otras = []) {
  const { x, y, r } = t;
  if (x - r < 0 || y - r < 0 || x + r > ANCHO || y + r > ALTO) return false;
  if (zonasVetadas(circuito).some((z) => enZona(x, y, r, z))) return false;
  if (distanciaAPista(circuito, t) < r + TORRE_FUERA - 0.5) return false;
  return otras.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + 3);
}

/*
 * Una barrera de neumáticos por fuera de cada curva cerrada: es el muro del
 * fondo de la escapatoria, donde acaba quien entra pasado, y verla dice «aquí
 * se frena». Se coloca a lo largo del arco, pegada al muro por el lado
 * contrario al centro de la curva, y se descarta lo que caería en la zona de
 * otro tramo.
 */
function barrerasDeNeumaticos(circuito) {
  const { eje } = circuito;
  const lista = [];
  const R = 4.5;
  let desdeUltimo = Infinity;
  for (let i = 0; i < eje.length; i++) {
    const p = eje[i];
    if (p.radio > RADIO_CURVA_NEUMATICOS) { desdeUltimo = Infinity; continue; }
    desdeUltimo += p.largo;
    if (desdeUltimo < 9) continue;
    desdeUltimo = 0;
    // Hacia fuera de la curva: la normal (-sen, cos) por el lado opuesto al centro.
    const lado = -p.curva;
    const distancia = p.muro[lado < 0 ? 0 : 1] + R + 2.5;   // por fuera de la línea del muro
    const nx = -Math.sin(p.angulo) * lado, ny = Math.cos(p.angulo) * lado;
    const n = { x: p.x + nx * distancia, y: p.y + ny * distancia, r: R };
    if (distanciaAPista(circuito, n) >= R &&
        !zonasVetadas(circuito).some((z) => enZona(n.x, n.y, n.r, z))) {
      lista.push(n);
    }
  }
  return lista;
}
