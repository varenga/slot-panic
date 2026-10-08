/*
 * Slot Panic — el mundo: suelo, decorado, pista, carriles y coches.
 *
 * El mundo no sabe de la interfaz (`pantalla.js` va encima y es quien sabe de
 * textos). Lee del estado y de los datos; nunca los modifica.
 *
 * Lo que no se mueve —suelo, decorado y pista— se pinta una sola vez en una
 * capa y cada fotograma se copia: con cien piezas y dos mil motas, pintarlo
 * fotograma a fotograma sería tirar el tiempo.
 */

import { ALTO, ANCHO, ANCHO_COCHE, COLOR, LARGO_COCHE } from './config.js';
import {
  circulo, crearCapa, ctx, dibujarEn, poligono, polilinea
} from './nucleo/lienzo.js';
import { azar } from './nucleo/decorado.js';
import { CARRILES, trazadoCarril } from './nucleo/slot.js';
import { modelo, pintarModelo, sombraModelo } from './coches.js';

const PASO_PIANO = 2;    // puntos del eje por franja de piano
const CASILLA_META = 8;
const MOTAS_GRAVA = 1600;
const MOTAS = 2200;
const ANCHO_FRANJA = 48; // césped segado
const PUBLICO = ['#e05a63', '#f2cd68', '#88aede', '#4fbf7a', '#e6e8ee', '#c08a9c', '#ff9f5a'];

let capa = null;
let claveCapa = '';
let capaCarriles = null;
let claveCarriles = '';
const JUNTA = 96;        // px de eje entre dos juntas de las piezas

/** El fondo entero: suelo, decorado y pista. Se repinta solo si cambia. */
export function dibujarFondo(circuito, decorado) {
  const clave = circuito.clave + '/' + decorado.nombre;
  if (clave !== claveCapa) {
    capa = crearCapa(ANCHO, ALTO);
    dibujarEn(capa, () => {
      pintarSuelo(decorado);
      pintarEscapatoria(circuito, decorado);
      decorado.neumaticos.forEach(pintarNeumatico);
      pintarPista(circuito);
      decorado.gradas.forEach((g) => pintarGrada(g, decorado.semilla));
      const color = decorado.escenario.color;
      decorado.piezas.forEach((p) => pintarSombra(p));
      decorado.piezas.forEach((p) => PINTAR[p.tipo](p, color));
      // Las torres, al final: son lo más alto.
      decorado.torres.forEach(pintarTorre);
    });
    claveCapa = clave;
  }
  ctx.drawImage(capa, 0, 0);
}

// --- Suelo ---------------------------------------------------------------------

function pintarSuelo({ escenario, semilla }) {
  const tirar = azar(semilla);
  ctx.fillStyle = escenario.suelo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  if (escenario.franja) {
    ctx.fillStyle = escenario.franja;
    for (let x = 0; x < ANCHO; x += ANCHO_FRANJA * 2) ctx.fillRect(x, 0, ANCHO_FRANJA, ALTO);
  }
  for (let i = 0; i < MOTAS; i++) {
    ctx.fillStyle = escenario.motas[Math.floor(tirar() * escenario.motas.length)];
    const t = 1 + tirar() * 2;
    ctx.fillRect(tirar() * ANCHO, tirar() * ALTO, t, t);
  }
}

// --- Pista ---------------------------------------------------------------------

/*
 * La zona —asfalto, piano y grava— es la unión de semicírculos que usa la
 * física (`muroCercano`): uno por punto del eje y lado, con el radio de su
 * muro. `extra` la agranda: la unión agrandada menos la de verdad es la línea
 * del muro. Todo en UN trazado y un solo relleno, para que lo semitransparente
 * no se acumule donde los semicírculos se solapan.
 */
function rellenarZona(circuito, extra) {
  ctx.beginPath();
  for (const p of circuito.eje) {
    [-1, 1].forEach((lado, k) => {
      const hacia = Math.atan2(Math.cos(p.angulo) * lado, -Math.sin(p.angulo) * lado);
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.muro[k] + extra, hacia - Math.PI / 2, hacia + Math.PI / 2);
      ctx.closePath();
    });
  }
  ctx.fill('nonzero');
}

/** La grava de muro a muro, con su textura, y el muro: una línea clara con sombra. */
function pintarEscapatoria(circuito, { escenario, semilla }) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  rellenarZona(circuito, 4);
  ctx.fillStyle = '#c9ccd6';
  rellenarZona(circuito, 2);
  ctx.fillStyle = escenario.grava;
  rellenarZona(circuito, 0);

  // Motas por la normal de cada punto: por dentro de las curvas pasan del
  // centro, pero siguen dentro del semicírculo, que es zona.
  const tirar = azar(semilla + 1);
  const { eje } = circuito;
  for (let i = 0; i < MOTAS_GRAVA; i++) {
    const p = eje[Math.floor(tirar() * eje.length)];
    const k = tirar() < 0.5 ? 0 : 1, lado = k ? 1 : -1;
    const d = circuito.ancho / 2 + tirar() * (p.muro[k] - circuito.ancho / 2 - 1.5);
    ctx.fillStyle = escenario.gravaMotas[Math.floor(tirar() * escenario.gravaMotas.length)];
    ctx.fillRect(p.x - Math.sin(p.angulo) * lado * d - 0.75, p.y + Math.cos(p.angulo) * lado * d - 0.75, 1.5, 1.5);
  }
}

function pintarPista(circuito) {
  // La calzada es el eje trazado con el ancho de la pista: con uniones
  // redondeadas, lo que se ve coincide con lo que `proyectar` da por pista.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';   // una sombra suave que la despega de la grava
  ctx.lineWidth = circuito.ancho + 8;
  polilinea(circuito.eje);
  ctx.strokeStyle = COLOR.borde;
  ctx.lineWidth = circuito.ancho + 4;
  polilinea(circuito.eje);
  ctx.strokeStyle = COLOR.calzada;
  ctx.lineWidth = circuito.ancho;
  polilinea(circuito.eje);
  pintarPianos(circuito);
  pintarPiezas(circuito);
  pintarSectores(circuito);
  pintarMeta(circuito);
}

/*
 * Las marcas de las piezas especiales (`nucleo/piezas.js`), para que se lean
 * antes de llegar: el peralte, una banda clara rayada por fuera (la pista sube);
 * la curva de derrape, su arcén plano y gris por fuera del piano; la
 * deslizante, franjas ámbar a los dos lados de los carriles juntos; los baches,
 * franjas oscuras a lo ancho. La estrecha no lleva marca: se ven los carriles.
 */
function pintarPiezas(circuito) {
  const { eje, ancho } = circuito;
  const n = eje.length;
  // Un punto a `d` px del eje, hacia el lado `lado`.
  const a = (p, lado, d) => ({ x: p.x - Math.sin(p.angulo) * lado * d, y: p.y + Math.cos(p.angulo) * lado * d });
  ctx.lineCap = 'butt';
  for (let i = 0; i < n; i++) {
    const p = eje[i], q = eje[(i + 1) % n];
    if (!p.efecto || p.efecto === 'chicane' || p.efecto === 'estrecha') continue;
    const fuera = -p.curva;
    if (p.efecto === 'peralte') {
      ctx.fillStyle = i % 2 ? 'rgba(230, 232, 238, 0.10)' : 'rgba(230, 232, 238, 0.22)';
      poligono([a(p, fuera, ancho / 2 - 12), a(q, fuera, ancho / 2 - 12), a(q, fuera, ancho / 2), a(p, fuera, ancho / 2)]);
    } else if (p.efecto === 'derrape') {
      const k = fuera < 0 ? 0 : 1;
      ctx.fillStyle = 'rgba(201, 204, 214, 0.32)';
      poligono([a(p, fuera, p.borde[k]), a(q, fuera, q.borde[k]), a(q, fuera, q.borde[k] + 30), a(p, fuera, p.borde[k] + 30)]);
    } else if (p.efecto === 'deslizante') {
      // Franjas ámbar a los dos lados de los carriles, que van juntos por el centro.
      if (Math.floor(p.s / 16) % 2) continue;
      ctx.fillStyle = 'rgba(242, 170, 60, 0.6)';
      for (const lado of [-1, 1]) {
        poligono([a(p, lado, 14), a(q, lado, 14), a(q, lado, ancho / 2 - 3), a(p, lado, ancho / 2 - 3)]);
      }
    } else if (p.efecto === 'baches' && i % 2 === 0) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.lineWidth = 3;
      const [u, v] = [a(p, -1, ancho / 2), a(p, 1, ancho / 2)];
      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);
      ctx.stroke();
    }
  }
}

/** Una línea tenue a lo ancho de la pista donde acaba cada sector (el último es la meta). */
function pintarSectores(circuito) {
  ctx.strokeStyle = 'rgba(230, 232, 238, 0.35)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';
  for (const s of circuito.sectores.slice(0, -1)) {
    const p = circuito.puntoEn(s);
    const nx = -Math.sin(p.angulo) * circuito.ancho / 2, ny = Math.cos(p.angulo) * circuito.ancho / 2;
    ctx.beginPath();
    ctx.moveTo(p.x - nx, p.y - ny);
    ctx.lineTo(p.x + nx, p.y + ny);
    ctx.stroke();
  }
}

/** Pianos rojos y blancos por fuera de los dos bordes de cada curva: se pisan gratis. */
function pintarPianos(circuito) {
  const { eje } = circuito;
  ctx.lineCap = 'butt';
  for (let i = 0; i < eje.length; i += PASO_PIANO) {
    const a = eje[i], b = eje[(i + PASO_PIANO) % eje.length];
    if (!a.piano || !b.piano) continue;
    ctx.strokeStyle = (i / PASO_PIANO) % 2 === 0 ? COLOR.piano : COLOR.pianoClaro;
    for (const [k, lado] of [[0, -1], [1, 1]]) {
      // Por dentro de una curva cerrada el piano es más estrecho: lo que cabe.
      const ancho = a.borde[k] - circuito.ancho / 2;
      if (ancho <= 0) continue;
      const desplazamiento = circuito.ancho / 2 + ancho / 2;
      ctx.lineWidth = ancho;
      const na = { x: -Math.sin(a.angulo) * lado * desplazamiento, y: Math.cos(a.angulo) * lado * desplazamiento };
      const nb = { x: -Math.sin(b.angulo) * lado * desplazamiento, y: Math.cos(b.angulo) * lado * desplazamiento };
      ctx.beginPath();
      ctx.moveTo(a.x + na.x, a.y + na.y);
      ctx.lineTo(b.x + nb.x, b.y + nb.y);
      ctx.stroke();
    }
  }
}

/** Damero de dos filas a lo ancho de la pista, en s = 0. */
function pintarMeta(circuito) {
  const p = circuito.eje[0];
  const ux = Math.cos(p.angulo), uy = Math.sin(p.angulo);   // a lo largo
  const nx = -uy, ny = ux;                                   // a lo ancho
  const casillas = Math.floor(circuito.ancho / CASILLA_META);
  for (let fila = 0; fila < 2; fila++) {
    for (let k = 0; k < casillas; k++) {
      const lateral = -circuito.ancho / 2 + k * CASILLA_META;
      const ox = p.x + nx * lateral + ux * (fila - 1) * CASILLA_META;
      const oy = p.y + ny * lateral + uy * (fila - 1) * CASILLA_META;
      ctx.fillStyle = (k + fila) % 2 === 0 ? '#e6e8ee' : '#12141a';
      poligono([
        { x: ox, y: oy },
        { x: ox + ux * CASILLA_META, y: oy + uy * CASILLA_META },
        { x: ox + ux * CASILLA_META + nx * CASILLA_META, y: oy + uy * CASILLA_META + ny * CASILLA_META },
        { x: ox + nx * CASILLA_META, y: oy + ny * CASILLA_META }
      ]);
    }
  }
}

// --- Decorado --------------------------------------------------------------------

function pintarSombra(p) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(p.x + p.r * 0.3, p.y + p.r * 0.35, p.r, p.r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
}

const PINTAR = {
  arbol(p, color) {
    ctx.fillStyle = color.arbol;
    circulo(p.x, p.y, p.r);
    ctx.fillStyle = color.arbolLuz;
    for (let k = 0; k < 4; k++) {
      const a = p.giro + k * 1.6;
      circulo(p.x + Math.cos(a) * p.r * 0.35 - p.r * 0.15, p.y + Math.sin(a) * p.r * 0.35 - p.r * 0.15, p.r * 0.45);
    }
  },
  pino(p, color) {
    // Visto desde arriba: una estrella de ramas, y nieve en las puntas y el centro.
    const estrella = (radio) => {
      const puntos = [];
      for (let k = 0; k < 16; k++) {
        const r = k % 2 === 0 ? radio : radio * 0.68;
        const a = p.giro + k * Math.PI / 8;
        puntos.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
      }
      return puntos;
    };
    ctx.fillStyle = color.pino;
    poligono(estrella(p.r));
    ctx.fillStyle = color.pinoLuz;
    poligono(estrella(p.r * 0.62));
    ctx.fillStyle = color.nieve;
    circulo(p.x, p.y, p.r * 0.22);
    for (let k = 0; k < 3; k++) {
      const a = p.giro + k * 2.1;
      circulo(p.x + Math.cos(a) * p.r * 0.7, p.y + Math.sin(a) * p.r * 0.7, p.r * 0.13);
    }
  },
  arbusto(p, color) {
    ctx.fillStyle = color.arbusto;
    for (let k = 0; k < 3; k++) {
      const a = p.giro + k * 2.1;
      circulo(p.x + Math.cos(a) * p.r * 0.45, p.y + Math.sin(a) * p.r * 0.45, p.r * 0.65);
    }
  },
  roca(p, color) {
    const contorno = (escala, dx, dy) => {
      const puntos = [];
      for (let k = 0; k < 7; k++) {
        const a = p.giro + k * Math.PI * 2 / 7;
        const r = p.r * escala * (0.75 + 0.25 * Math.sin(k * 2.3 + p.variante * 9));
        puntos.push({ x: p.x + dx + Math.cos(a) * r, y: p.y + dy + Math.sin(a) * r });
      }
      return puntos;
    };
    ctx.fillStyle = color.roca;
    poligono(contorno(1, 0, 0));
    ctx.fillStyle = color.rocaLuz;
    poligono(contorno(0.5, -p.r * 0.2, -p.r * 0.2));
  },
  cactus(p, color) {
    ctx.fillStyle = color.cactus;
    circulo(p.x, p.y, p.r * 0.7);
    // Los brazos, vistos desde arriba, asoman a los lados.
    circulo(p.x + Math.cos(p.giro) * p.r * 0.85, p.y + Math.sin(p.giro) * p.r * 0.85, p.r * 0.35);
    circulo(p.x - Math.cos(p.giro) * p.r * 0.75, p.y - Math.sin(p.giro) * p.r * 0.75, p.r * 0.3);
    ctx.strokeStyle = color.cactusLuz;
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const a = p.giro + k * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(a) * p.r * 0.6, p.y - Math.sin(a) * p.r * 0.6);
      ctx.lineTo(p.x + Math.cos(a) * p.r * 0.6, p.y + Math.sin(a) * p.r * 0.6);
      ctx.stroke();
    }
  }
};

function pintarNeumatico(n, i) {
  ctx.fillStyle = '#16181d';
  circulo(n.x, n.y, n.r);
  // Uno de cada tres, pintado: la barrera se lee de lejos.
  ctx.fillStyle = i % 3 === 0 ? '#c9ccd6' : '#3a3e48';
  circulo(n.x, n.y, n.r * 0.55);
  ctx.fillStyle = '#16181d';
  circulo(n.x, n.y, n.r * 0.3);
}

/*
 * Una torre de iluminación vista desde arriba: la sombra larga del mástil, la
 * base y la cabeza de focos, atravesada y mirando a la pista. De día son
 * postes; de noche, `luz.js` enciende los focos.
 */
function pintarTorre(t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  // El mástil es alto: su sombra cae lejos, abajo a la derecha, como todas.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(14, 17);
  ctx.stroke();
  ctx.fillStyle = '#3a3e48';
  ctx.fillRect(-2.5, -2.5, 5, 5);
  ctx.rotate(t.angulo);
  ctx.fillStyle = '#20232b';
  ctx.fillRect(1, -6, 3, 12);
  ctx.fillStyle = '#c9ccd6';
  for (const v of [-4.5, -1, 2.5]) ctx.fillRect(3.2, v, 1.3, 2);
  ctx.restore();
}

/** Una grada vista desde arriba: escalones y público, de colores. */
function pintarGrada(g, semilla) {
  const tirar = azar(semilla + Math.round(g.x * 7 + g.y));
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angulo);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(-g.largo / 2 + 3, -g.fondo / 2 + 4, g.largo, g.fondo);
  const filas = 3;
  const alto = g.fondo / filas;
  for (let f = 0; f < filas; f++) {
    ctx.fillStyle = ['#4a5164', '#555d72', '#616a80'][f];
    ctx.fillRect(-g.largo / 2, -g.fondo / 2 + f * alto, g.largo, alto);
    for (let x = -g.largo / 2 + 3; x < g.largo / 2 - 2; x += 4.2) {
      if (tirar() < 0.22) continue;   // huecos: no está llena
      ctx.fillStyle = PUBLICO[Math.floor(tirar() * PUBLICO.length)];
      circulo(x, -g.fondo / 2 + f * alto + alto / 2, 1.5);
    }
  }
  // El tejado, una línea clara por detrás.
  ctx.fillStyle = '#8b93a7';
  ctx.fillRect(-g.largo / 2, g.fondo / 2 - 2, g.largo, 2);
  ctx.restore();
}

// --- Los carriles -------------------------------------------------------------

/*
 * Los carriles: la ranura oscura entre dos bandas plateadas, que son las
 * trencillas por las que el coche coge la corriente. Y las juntas de las
 * piezas, de lado a lado de la pista. Encima de la pista de siempre, en su
 * propia capa: es un prototipo, todavía sin estética de juguete.
 */
export function dibujarCarriles(circuito) {
  if (claveCarriles !== circuito.clave) {
    capaCarriles = crearCapa(ANCHO, ALTO);
    dibujarEn(capaCarriles, () => {
      ctx.strokeStyle = 'rgba(11, 12, 16, 0.6)';
      ctx.lineWidth = 1.5;
      for (const s of juntas(circuito)) {
        const p = circuito.puntoEn(s);
        const nx = -Math.sin(p.angulo) * circuito.ancho / 2, ny = Math.cos(p.angulo) * circuito.ancho / 2;
        ctx.beginPath();
        ctx.moveTo(p.x - nx, p.y - ny);
        ctx.lineTo(p.x + nx, p.y + ny);
        ctx.stroke();
      }
      ctx.lineJoin = 'round';
      // Con un número impar de X, el carril que sale por un lado vuelve por el
      // otro: cada trazado acaba en el primer punto del otro, y abierto.
      const impar = circuito.cambiosCarril % 2 === 1;
      const trazados = CARRILES.map((lateral) =>
        [...trazadoCarril(circuito, lateral), trazadoCarril(circuito, impar ? -lateral : lateral)[0]]);
      for (const [color, grosor] of [[COLOR.carril, 7], [COLOR.ranura, 3]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = grosor;
        for (const trazado of trazados) polilinea(trazado, false);
      }
    });
    claveCarriles = circuito.clave;
  }
  ctx.drawImage(capaCarriles, 0, 0);
}

/*
 * Dónde van las juntas, en s. Un circuito de piezas las tiene donde acaba
 * cada pieza, y las rectas largas, partidas en piezas de unos JUNTA px; uno
 * de vértices, cada JUNTA px.
 */
function juntas(circuito) {
  const { eje } = circuito;
  if (eje[0].pieza === undefined) {
    const lista = [];
    for (let s = 0; s < circuito.largo; s += JUNTA) lista.push(s);
    return lista;
  }
  const inicios = eje.filter((p) => p.junta).map((p) => p.s);
  return inicios.flatMap((s, i) => {
    const fin = inicios[i + 1] ?? circuito.largo;
    const p = eje.find((q) => q.s === s);
    const partes = p.radio === Infinity ? Math.max(1, Math.round((fin - s) / JUNTA)) : 1;
    return Array.from({ length: partes }, (_, k) => s + (fin - s) * k / partes);
  });
}

/** Un coche, más grande y con más sombra mientras la mano lo levanta. */
export function dibujarCocheSlot(slot) {
  const { coche, altura } = slot;
  if (altura <= 0) {
    dibujarCoche(coche);
    return;
  }
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${0.25 * altura})`;
  ctx.beginPath();
  ctx.ellipse(coche.x + 8 * altura, coche.y + 10 * altura, LARGO_COCHE * 0.6, ANCHO_COCHE * 0.7, coche.angulo, 0, Math.PI * 2);
  ctx.fill();
  const escala = 1 + 0.35 * altura;
  ctx.translate(coche.x, coche.y);
  ctx.scale(escala, escala);
  ctx.translate(-coche.x, -coche.y);
  dibujarCoche(coche);
  ctx.restore();
}

// --- Lo que se mueve -----------------------------------------------------------------

const SOMBRA_COCHE = { x: 2, y: 2.5 };

/** El coche con la forma de su modelo (coches.js): ruedas, chapa, cristales y luces. */
export function dibujarCoche(coche) {
  ctx.save();
  const m = modelo(coche.modelo);

  // La sombra cae siempre abajo a la derecha, como la del decorado: se
  // desplaza en el mundo antes de girar, no con el coche.
  ctx.translate(coche.x + SOMBRA_COCHE.x, coche.y + SOMBRA_COCHE.y);
  ctx.rotate(coche.angulo);
  sombraModelo(m, 'rgba(0, 0, 0, 0.3)');
  ctx.rotate(-coche.angulo);
  ctx.translate(-SOMBRA_COCHE.x, -SOMBRA_COCHE.y);
  ctx.rotate(coche.angulo);
  pintarModelo(m, coche.color);
  ctx.restore();
}
