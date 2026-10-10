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
  arbol: [10, 17], pino: [9, 14], arbusto: [5, 8], roca: [4, 9], cactus: [5, 8],
  // Los de la mesa del escenario juguete: más grandes que lo que crece.
  taza: [20, 25], lata: [16, 20], lapiz: [26, 34], moneda: [10, 13], chapa: [11, 13],
  dado: [12, 15], ladrillo: [16, 21]
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
  // Lo barato antes: medir la distancia a la pista es lo que cuesta.
  if (!puestas.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + 3)) return false;
  return distanciaAPista(circuito, pieza) >= r + HOLGURA_PISTA;
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

  // El ambiente de un circuito de verdad (boxes, vallas, comisarios y el
  // aparcamiento), en todos menos en la mesa del juguete.
  const instalaciones = escenario.juguete ? [] : instalacionesDe(circuito, azar(semillaDe(circuito.clave + '/instalaciones')), [...ocupado, ...neumaticos]);
  instalaciones.forEach((r) => ocupado.push(...circulosDe(r)));

  const tipos = Object.entries(escenario.piezas);
  const piezas = [];
  // Lo grande (la mesa del juguete) necesita más intentos, y con menos ya se llena.
  const intentos = escenario.intentos ?? INTENTOS;
  const cuantas = escenario.cuantas ?? PIEZAS;
  for (let intento = 0; intento < intentos && piezas.length < cuantas; intento++) {
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
    if (ocupado.every((o) => Math.hypot(o.x - pieza.x, o.y - pieza.y) > o.r + pieza.r) && cabe(circuito, pieza, piezas)) {
      piezas.push(pieza);
    }
  }
  // De arriba abajo: lo de más abajo tapa lo de más arriba, como en una maqueta.
  piezas.sort((a, b) => a.y - b.y);

  return { nombre: nombreEscenario, escenario, piezas, gradas, neumaticos, torres, instalaciones, semilla: semillaDe(circuito.clave + '/' + nombreEscenario + '/suelo') };
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

/*
 * Las instalaciones: lo que tiene un circuito de verdad alrededor de la pista.
 * Cada una es un rectángulo girado { tipo, x, y, largo, fondo, angulo, alto }
 * con la pista hacia su -y local (así el dibujo sabe qué lado le da la cara).
 *
 * - `boxes`: el edificio de los garajes, junto a la recta de meta.
 * - `valla`: publicidad a lo largo de las rectas, pegada al muro.
 * - `comisario`: un puesto con su bandera un poco antes de cada curva.
 * - `aparcamiento`: coches y caravanas, en un hueco libre grande.
 *
 * Como el resto del decorado: con su propia semilla y sin pisar nada que
 * juegue (`instalacionCabe`, la misma pregunta que hace el arnés).
 */
const HOLGURA_INSTALACION = 6;     // px entre el muro y una instalación
const BOXES = { largos: [180, 150, 120, 96], fondo: 26, alto: 9 };
const VALLA = { largo: 46, fondo: 3.5, alto: 4, cada: 150, recta: 120 };
const COMISARIO = { lado: 9, alto: 6 };
const APARCAMIENTO = { medidas: [[168, 84], [132, 84], [108, 60], [84, 48]], alto: 0, paso: 12 };

/** Los puntos del contorno de un rectángulo girado, cada `paso` px, y su centro. */
export function contornoDe(r, paso = 6) {
  const cos = Math.cos(r.angulo), sin = Math.sin(r.angulo);
  const puntos = [{ x: r.x, y: r.y }];
  const a = r.largo / 2, b = r.fondo / 2;
  const lado = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / paso));
    for (let k = 0; k < n; k++) {
      const lx = x0 + (x1 - x0) * k / n, ly = y0 + (y1 - y0) * k / n;
      puntos.push({ x: r.x + lx * cos - ly * sin, y: r.y + lx * sin + ly * cos });
    }
  };
  lado(-a, -b, a, -b); lado(a, -b, a, b); lado(a, b, -a, b); lado(-a, b, -a, -b);
  return puntos;
}

/** Una cadena de círculos que cubre el rectángulo: para no solaparse con lo redondo. */
export function circulosDe(r) {
  const n = Math.max(1, Math.ceil(r.largo / r.fondo));
  const radio = Math.hypot(r.largo / n, r.fondo) / 2;
  const cos = Math.cos(r.angulo), sin = Math.sin(r.angulo);
  const lista = [];
  for (let k = 0; k < n; k++) {
    const u = -r.largo / 2 + r.largo * (k + 0.5) / n;
    lista.push({ x: r.x + u * cos, y: r.y + u * sin, r: radio });
  }
  return lista;
}

/**
 * ¿Cabe una instalación aquí? Dentro de la mesa, fuera de las bandas y del
 * hueco del marcador, a HOLGURA_INSTALACION del muro y sin tocar `otras`
 * (círculos { x, y, r }). El arnés hace la misma pregunta.
 */
export function instalacionCabe(circuito, r, otras = []) {
  const contorno = contornoDe(r);
  if (contorno.some(({ x, y }) => x < 0 || y < 0 || x > ANCHO || y > ALTO)) return false;
  const zonas = zonasVetadas(circuito);
  if (contorno.some(({ x, y }) => zonas.some((z) => enZona(x, y, 0, z)))) return false;
  const propios = circulosDe(r);
  if (!otras.every((o) => propios.every((c) => Math.hypot(o.x - c.x, o.y - c.y) > o.r + c.r + 2))) return false;
  // Lo caro, al final: con el centro bien lejos ya basta; si no, punto a punto.
  if (distanciaAPista(circuito, r) >= Math.hypot(r.largo, r.fondo) / 2 + HOLGURA_INSTALACION) return true;
  return contorno.every((p) => distanciaAPista(circuito, p) >= HOLGURA_INSTALACION);
}

function instalacionesDe(circuito, tirar, ocupado) {
  const lista = [];
  const poner = (r) => {
    if (!instalacionCabe(circuito, r, [...ocupado, ...lista.flatMap(circulosDe)])) return false;
    lista.push(r);
    return true;
  };
  boxesJuntoAMeta(circuito, poner);
  comisariosEnCurvas(circuito, poner);
  vallasEnRectas(circuito, poner);
  aparcamiento(circuito, tirar, poner);
  return lista;
}

/*
 * Un rectángulo pegado al muro junto al punto `p` del eje, por el lado `lado`
 * (-1 o 1, como `muro`), `extra` px más allá de la holgura, mirando a la pista.
 */
function junto(p, lado, tipo, largo, fondo, alto, extra = 0) {
  const d = p.muro[lado < 0 ? 0 : 1] + HOLGURA_INSTALACION + 1 + extra + fondo / 2;
  const nx = -Math.sin(p.angulo) * lado, ny = Math.cos(p.angulo) * lado;
  // La pista, hacia el -y local: con lado 1 el +y local es la normal; con -1, al revés.
  return { tipo, x: p.x + nx * d, y: p.y + ny * d, largo, fondo, alto, angulo: p.angulo + (lado < 0 ? Math.PI : 0) };
}

/** El punto del eje más cerca de `s` (que da la vuelta). */
function puntoDelEje(circuito, s) {
  const { eje, largo } = circuito;
  const buscada = ((s % largo) + largo) % largo;
  // `s` crece a lo largo del eje: el primero que no queda antes, o el de antes.
  let bajo = 0, alto = eje.length - 1;
  while (bajo < alto) {
    const medio = (bajo + alto) >> 1;
    if (eje[medio].s < buscada) bajo = medio + 1; else alto = medio;
  }
  const antes = eje[Math.max(0, bajo - 1)];
  return Math.abs(antes.s - buscada) < Math.abs(eje[bajo].s - buscada) ? antes : eje[bajo];
}

/** ¿Es recta la pista `largo` px alrededor de `s`? */
function esRecta(circuito, s, largo) {
  for (let d = -largo / 2; d <= largo / 2; d += 6) {
    if (puntoDelEje(circuito, s + d).radio !== Infinity) return false;
  }
  return true;
}

/** Los dos lados de `p`, primero el de fuera: el que se aleja del centro del circuito. */
function ladosPorFuera(circuito, p) {
  const { eje } = circuito;
  const cx = eje.reduce((t, q) => t + q.x, 0) / eje.length;
  const cy = eje.reduce((t, q) => t + q.y, 0) / eje.length;
  const nx = -Math.sin(p.angulo), ny = Math.cos(p.angulo);
  return (p.x - cx) * nx + (p.y - cy) * ny > 0 ? [1, -1] : [-1, 1];
}

/*
 * Los boxes: tan cerca de la meta como se pueda, en una recta, primero por
 * fuera; si junto a la meta no caben, en la recta más cerca. Los más largos
 * antes; si no cabe ni el más corto en ninguna, no hay boxes.
 */
function boxesJuntoAMeta(circuito, poner) {
  for (const largo of BOXES.largos) {
    for (let k = 0; k <= circuito.largo / 24; k++) {
      for (const d of k ? [k * 12, -k * 12] : [0]) {
        if (!esRecta(circuito, d, largo)) continue;
        const p = puntoDelEje(circuito, d);
        for (const lado of ladosPorFuera(circuito, p)) {
          if (poner(junto(p, lado, 'boxes', largo, BOXES.fondo, BOXES.alto, 3))) return;
        }
      }
    }
  }
}

/*
 * Un puesto de comisario por curva, por fuera y un poco antes de que empiece:
 * desde ahí se ve venir el coche.
 */
function comisariosEnCurvas(circuito, poner) {
  const { eje } = circuito;
  for (let i = 0; i < eje.length; i++) {
    const p = eje[i], antes = eje[(i - 1 + eje.length) % eje.length];
    if (p.radio === Infinity || antes.radio !== Infinity) continue;
    for (let d = 10; d <= 120; d += 10) {
      const q = puntoDelEje(circuito, p.s - d);
      if (poner(junto(q, -p.curva, 'comisario', COMISARIO.lado, COMISARIO.lado, COMISARIO.alto, 2))) break;
    }
  }
}

/** Las vallas de publicidad: en las rectas largas, cada tanto, primero por fuera. */
function vallasEnRectas(circuito, poner) {
  for (let s = VALLA.cada / 2; s < circuito.largo; s += VALLA.cada) {
    if (!esRecta(circuito, s, VALLA.recta)) continue;
    const p = puntoDelEje(circuito, s);
    ladosPorFuera(circuito, p).some((lado) => poner(junto(p, lado, 'valla', VALLA.largo, VALLA.fondo, VALLA.alto)));
  }
}

/*
 * El aparcamiento: de una rejilla de sitios, los del tamaño más grande que
 * quepa en alguno; de ellos, uno a suertes (con la semilla).
 */
function aparcamiento(circuito, tirar, poner) {
  // Cuánto dista de la pista cada sitio, una vez para todos los tamaños.
  const rejilla = [];
  for (let y = BANDA_TEXTO; y <= ALTO - BANDA_TEXTO; y += APARCAMIENTO.paso) {
    for (let x = 0; x <= ANCHO; x += APARCAMIENTO.paso) {
      rejilla.push({ x, y, d: distanciaAPista(circuito, { x, y }) });
    }
  }
  for (const [largo, fondo] of APARCAMIENTO.medidas) {
    // Lejos de la pista por el centro: sin mirar punto a punto.
    const radio = Math.hypot(largo, fondo) / 2 + HOLGURA_INSTALACION;
    const lejos = rejilla
      .filter(({ x, y, d }) => d >= radio && x >= largo / 2 && x <= ANCHO - largo / 2 &&
        y >= BANDA_TEXTO + fondo / 2 && y <= ALTO - BANDA_TEXTO - fondo / 2)
      .map(({ x, y }) => ({ tipo: 'aparcamiento', x, y, largo, fondo, alto: APARCAMIENTO.alto, angulo: 0 }));
    while (lejos.length) {
      const [r] = lejos.splice(Math.floor(tirar() * lejos.length), 1);
      if (poner(r)) return;
    }
  }
}
