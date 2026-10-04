/*
 * Slot Panic — de los datos de un circuito a la pista.
 *
 * Un circuito se declara como un polígono cerrado con un radio por vértice; aquí
 * se redondea, se muestrea en un eje denso y se le pone una coordenada `s`
 * (distancia recorrida desde la meta). Todo lo demás —la pared, las vueltas, el
 * piloto automático— pregunta a la pista en esa coordenada.
 *
 * A cada lado del asfalto, el piano (solo en las curvas) y la escapatoria hasta
 * el muro. El muro no se declara: sale de la geometría, recortado para que no
 * invada otro tramo, el lienzo ni las gradas (ver `calcularMuros`).
 */

import {
  ALTO, ANCHO, ANCHO_PIANO, ANCHO_PISTA, ESCAPATORIA, ESCAPATORIA_CURVA, ESCAPATORIA_DERRAPE, PASO_EJE, PENDIENTE_MURO,
  VENTANA_PROYECCION
} from '../config.js';
import { distancia, proyectarEnSegmento, redondearPoligono } from './geometria.js';

const LEJOS = 300;              // px de pista a partir de los que otro punto del eje es otro tramo
const HOLGURA_LIENZO = 2;       // px entre el muro y el borde del lienzo
const HOLGURA_GRADA = 8;        // px entre el muro y una grada
const RADIO_PIANO_INTERIOR = 3; // px que el piano interior deja hasta el centro de la curva
/*
 * px de pista, a cada lado de un cruce, en que los dos tramos se pisan sin
 * que eso sea invadir: más allá, el otro tramo queda a más de un ancho + 40.
 */
export const VENTANA_CRUCE = 128;

export function construirCircuito(datos) {
  const crudo = redondearPoligono(datos.vertices, PASO_EJE);

  // El eje empieza en la meta: s = 0 es la línea de llegada.
  let inicio = 0;
  crudo.forEach((p, i) => { if (distancia(p, datos.meta) < distancia(crudo[inicio], datos.meta)) inicio = i; });
  return completarCircuito(crudo.slice(inicio).concat(crudo.slice(0, inicio)), datos);
}

/*
 * Lo común a todo circuito, se declare como se declare: un eje cerrado que
 * empieza en la meta, con `radio` y `curva` en cada punto. Le pone `s`, el
 * rumbo, los cruces (donde la pista pasa por encima de sí misma), los muros y
 * los sectores. Lo usan `construirCircuito` y `construirDePiezas`
 * (`piezas.js`).
 */
export function completarCircuito(eje, datos) {
  let s = 0;
  eje.forEach((p, i) => {
    const siguiente = eje[(i + 1) % eje.length];
    p.s = s;
    p.largo = distancia(p, siguiente);
    p.angulo = Math.atan2(siguiente.y - p.y, siguiente.x - p.x);
    // Lo que añaden las piezas; un circuito de vértices no tiene nada de eso.
    p.carril ??= 1;
    p.efecto ??= null;
    s += p.largo;
  });

  const circuito = {
    clave: datos.clave,
    interior: datos.interior,
    gradas: datos.gradas || [],
    eje,
    largo: s,
    ancho: datos.ancho || ANCHO_PISTA,
    // Cuántas X tiene: con un número impar, cada coche cambia de carril cada vuelta.
    cambiosCarril: datos.cambiosCarril || 0,
    proyectar: (p, indicePrevio) => proyectar(circuito, p, indicePrevio),
    puntoEn: (sBuscada) => puntoEn(circuito, sBuscada),
    muroCercano: (p, indicePrevio) => muroCercano(circuito, p, indicePrevio),
    bordeEn: (proyeccion) => bordeEn(circuito, proyeccion)
  };
  circuito.cruces = buscarCruces(circuito);
  calcularMuros(circuito);
  // Dónde acaba cada sector, en s; el último, en la meta (una vuelta entera).
  circuito.sectores = (datos.sectores || []).map((p) => circuito.proyectar(p).s).concat(circuito.largo);
  return circuito;
}

/*
 * Los cruces: los puntos donde el eje se corta a sí mismo, como el centro de
 * un ocho. Cada uno, como el par de `s` de los dos tramos que se cortan.
 */
function buscarCruces(circuito) {
  const { eje, largo } = circuito;
  const n = eje.length;
  const cruces = [];
  for (let i = 0; i < n; i++) {
    const a = eje[i], b = eje[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      const d = eje[j].s - a.s;
      if (Math.min(d, largo - d) < LEJOS) continue;
      const c = eje[j], e = eje[(j + 1) % n];
      const t = corte(a, b, c, e);
      if (t) cruces.push({ s: [a.s + a.largo * t[0], c.s + c.largo * t[1]], x: a.x + (b.x - a.x) * t[0], y: a.y + (b.y - a.y) * t[0] });
    }
  }
  return cruces;
}

/** Dónde se cortan los segmentos a→b y c→d, como fracción de cada uno; null si no se cortan. */
function corte(a, b, c, d) {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  return t >= 0 && t < 1 && u >= 0 && u < 1 ? [t, u] : null;
}

/** ¿Están los puntos `s1` y `s2` del eje en los dos tramos de un mismo cruce? */
export function enCruce(circuito, s1, s2) {
  const cerca = (s, c) => {
    const d = Math.abs(s - c);
    return Math.min(d, circuito.largo - d) < VENTANA_CRUCE;
  };
  return circuito.cruces.some(({ s: [a, b] }) => (cerca(s1, a) && cerca(s2, b)) || (cerca(s1, b) && cerca(s2, a)));
}

/**
 * Proyecta `p` sobre el eje. Con `indicePrevio` busca solo cerca de él, que es
 * lo que impide que en la horquilla un coche «salte» al otro brazo de la U.
 * Devuelve el punto del eje, su `s`, la distancia al eje y la normal hacia `p`.
 */
export function proyectar(circuito, p, indicePrevio = null) {
  const { eje } = circuito;
  const n = eje.length;
  const desde = indicePrevio === null ? 0 : indicePrevio - VENTANA_PROYECCION;
  const hasta = indicePrevio === null ? n - 1 : indicePrevio + VENTANA_PROYECCION;

  let mejor = null;
  for (let k = desde; k <= hasta; k++) {
    const i = ((k % n) + n) % n;
    const a = eje[i], b = eje[(i + 1) % n];
    const q = proyectarEnSegmento(p, a, b);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!mejor || d < mejor.distancia) mejor = { indice: i, t: q.t, x: q.x, y: q.y, s: a.s + a.largo * q.t, distancia: d };
  }
  const d = mejor.distancia || 1;
  mejor.normal = { x: (p.x - mejor.x) / d, y: (p.y - mejor.y) / d };
  // De qué lado del eje está, según la normal (-sen, cos) del rumbo.
  const a = eje[mejor.indice];
  mejor.lado = -mejor.normal.x * Math.sin(a.angulo) + mejor.normal.y * Math.cos(a.angulo) < 0 ? -1 : 1;
  return mejor;
}

/** El punto del eje en la coordenada `s` (que puede dar la vuelta). */
export function puntoEn(circuito, s) {
  const { eje, largo } = circuito;
  const buscada = ((s % largo) + largo) % largo;
  // Búsqueda binaria: el eje está ordenado por s.
  let bajo = 0, alto = eje.length - 1;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (eje[medio].s <= buscada) bajo = medio; else alto = medio - 1;
  }
  const a = eje[bajo], b = eje[(bajo + 1) % eje.length];
  const t = a.largo > 0 ? (buscada - a.s) / a.largo : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angulo: a.angulo, radio: a.radio, curva: a.curva, indice: bajo };
}

/*
 * La zona de cada tramo —asfalto, piano y grava— es la unión de semicírculos:
 * uno por punto del eje y lado, con el radio de su muro. Un punto está dentro
 * si está a menos de su muro de ALGÚN punto del eje, por su lado. Así el muro
 * es una curva suave también por dentro de las curvas, donde pasa del centro,
 * y es exactamente lo que `dibujo.js` pinta.
 *
 * Devuelve cuánto se ha pasado `p` del muro (`fuera`, negativo dentro) y hacia
 * dónde empujarlo para devolverlo (`normal`, hacia fuera). Como `proyectar`,
 * con `indicePrevio` mira solo cerca de él.
 */
export function muroCercano(circuito, p, indicePrevio = null) {
  const { eje } = circuito;
  const n = eje.length;
  const desde = indicePrevio === null ? 0 : indicePrevio - VENTANA_PROYECCION;
  const hasta = indicePrevio === null ? n - 1 : indicePrevio + VENTANA_PROYECCION;
  let mejor = null;
  for (let k = desde; k <= hasta; k++) {
    const q = eje[((k % n) + n) % n];
    const dx = p.x - q.x, dy = p.y - q.y;
    const lado = -dx * Math.sin(q.angulo) + dy * Math.cos(q.angulo) < 0 ? 0 : 1;
    const d = Math.hypot(dx, dy);
    const fuera = d - q.muro[lado];
    if (!mejor || fuera < mejor.fuera) mejor = { fuera, dx, dy, d };
  }
  const d = mejor.d || 1;
  return { fuera: mejor.fuera, normal: { x: mejor.dx / d, y: mejor.dy / d } };
}

/** Distancia del eje al final de lo que se pisa gratis: el asfalto y, en las curvas, el piano. */
export function bordeEn(circuito, { indice, lado }) {
  return circuito.eje[indice].borde[lado < 0 ? 0 : 1];
}

/*
 * El borde de lo que se pisa gratis y el muro de cada punto del eje, a cada
 * lado: `p.borde` y `p.muro`, `[lado -1, lado +1]`, en px desde el eje. El
 * piano va en las curvas, y por dentro de una cerrada solo lo que cabe antes
 * del centro.
 *
 * El muro: primero lo que se quiere —la escapatoria, más ancha por fuera de
 * las curvas y extendida un poco más allá de su salida, que es donde se acaba
 * al entrar pasado— y luego lo que cabe:
 *
 * - frente a otro tramo, como mucho la mitad de lo que los separa;
 * - dentro del lienzo y sin pisar las gradas.
 *
 * Por dentro de una curva el muro puede pasar del centro: la zona es «a menos
 * del muro del punto del eje más cercano», y más allá del centro el más
 * cercano es otro punto de la curva o la recta siguiente. Así el interior es
 * grava, como el resto. Recortarlo en el centro dejaba un muro en pico pegado
 * al piano de las curvas cerradas, y apurarlas paraba el coche (playtest).
 *
 * Al final el muro se suaviza a lo largo de la pista (`PENDIENTE_MURO`): un
 * escalón en el muro sería un choque de frente en mitad de un roce.
 */
function calcularMuros(circuito) {
  const { eje, largo, ancho, gradas } = circuito;
  const n = eje.length;
  const porPista = (i, j) => {
    const d = Math.abs(eje[i].s - eje[j].s);
    return Math.min(d, largo - d);
  };
  eje.forEach((p) => {
    p.piano = p.radio !== Infinity;
    p.borde = [-1, 1].map((lado) => {
      if (!p.piano) return ancho / 2;
      const cabe = lado === p.curva ? p.radio - RADIO_PIANO_INTERIOR - ancho / 2 : ANCHO_PIANO;
      return ancho / 2 + Math.max(0, Math.min(ANCHO_PIANO, cabe));
    });
  });

  // Lo que se quiere: el ancho de la escapatoria por fuera de las curvas se
  // extiende a los lados con la pendiente del muro.
  const quiere = eje.map((p) => [-1, 1].map((lado) =>
    p.curva !== 0 && lado !== p.curva ? (p.efecto === 'derrape' ? ESCAPATORIA_DERRAPE : ESCAPATORIA_CURVA) : ESCAPATORIA));
  const deseado = eje.map((_, i) => [0, 1].map((k) => {
    let mayor = 0;
    for (let j = 0; j < n; j++) {
      const valor = quiere[j][k] - PENDIENTE_MURO * porPista(i, j);
      if (valor > mayor) mayor = valor;
    }
    return ancho / 2 + mayor;
  }));

  // Lo que cabe.
  const contornoGradas = gradas.flatMap(contorno);
  const tope = eje.map((p, i) => [-1, 1].map((lado, k) => {
    let limite = deseado[i][k];
    const nx = -Math.sin(p.angulo) * lado, ny = Math.cos(p.angulo) * lado;
    for (let j = 0; j < n; j++) {
      if (porPista(i, j) < LEJOS || enCruce(circuito, p.s, eje[j].s)) continue;
      const dx = eje[j].x - p.x, dy = eje[j].y - p.y;
      if (dx * nx + dy * ny <= 0) continue;
      limite = Math.min(limite, Math.hypot(dx, dy) / 2 - 2);
    }
    // El semicírculo llega también a lo largo de la pista, no solo por la
    // normal: cuenta todo borde del lienzo y todo punto de grada de su lado.
    for (const [hacia, distancia] of [[nx, ANCHO - p.x], [-nx, p.x], [ny, ALTO - p.y], [-ny, p.y]]) {
      if (hacia > -1e-6) limite = Math.min(limite, distancia - HOLGURA_LIENZO);
    }
    for (const c of contornoGradas) {
      const dx = c.x - p.x, dy = c.y - p.y;
      if (dx * nx + dy * ny > 0) limite = Math.min(limite, Math.hypot(dx, dy) - HOLGURA_GRADA);
    }
    return limite;
  }));

  // Suavizado: el muro no cambia más deprisa que la pendiente, y nunca deja
  // fuera lo que se pisa gratis.
  eje.forEach((p, i) => {
    p.muro = [0, 1].map((k) => {
      let menor = tope[i][k];
      for (let j = 0; j < n; j++) {
        const valor = tope[j][k] + PENDIENTE_MURO * porPista(i, j);
        if (valor < menor) menor = valor;
      }
      return Math.max(menor, p.borde[k]);
    });
  });
}

/** Puntos del contorno de una grada, cada 4 px. */
function contorno(g) {
  const cos = Math.cos(g.angulo), sin = Math.sin(g.angulo);
  const puntos = [];
  const pasos = Math.ceil(g.largo / 4);
  for (let i = 0; i <= pasos; i++) {
    for (const v of [-0.5, 0.5]) {
      const u = (i / pasos - 0.5) * g.largo, w = v * g.fondo;
      puntos.push({ x: g.x + u * cos - w * sin, y: g.y + u * sin + w * cos });
    }
  }
  return puntos;
}
