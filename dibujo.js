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

import { ALTO, ANCHO, ANCHO_COCHE, COCHES, COLOR } from './config.js';
import {
  circulo, crearCapa, ctx, dibujarEn, poligono, polilinea
} from './nucleo/lienzo.js';
import { azar } from './nucleo/decorado.js';
import { CARRILES, trazadoCarril } from './nucleo/slot.js';
import { modelo, pintarModelo, sombraModelo } from './coches.js';
import { sombraSol, sombraTorre } from './luz.js';

const PASO_PIANO = 2;    // puntos del eje por franja de piano
const CASILLA_META = 8;
const MOTAS_GRAVA = 1600;
const MOTAS = 2200;
const ANCHO_FRANJA = 48; // césped segado
const PUBLICO = ['#e05a63', '#f2cd68', '#88aede', '#4fbf7a', '#e6e8ee', '#c08a9c', '#ff9f5a'];

let capaSuelo = null;       // suelo, escapatoria, neumáticos y pista
let capaDecorado = null;    // gradas y piezas, sin sombra: transparente
let claveCapa = '';
let capaCarriles = null;
let claveCarriles = '';
const JUNTA = 96;        // px de eje entre dos juntas de las piezas

/*
 * El fondo entero: suelo, pista y decorado, en dos capas que se repintan solo
 * si cambian. Entre una y otra, en cada fotograma, las sombras de las gradas
 * y las piezas, que van con el sol de la luz de ahora (`luz`, 0 día … 2 noche).
 * Las torres, aparte (dibujarTorres): son lo más alto.
 */
export function dibujarFondo(circuito, decorado, luz = 0) {
  const clave = circuito.clave + '/' + decorado.nombre;
  if (clave !== claveCapa) {
    const juguete = decorado.escenario.juguete;
    capaSuelo = crearCapa(ANCHO, ALTO);
    dibujarEn(capaSuelo, () => {
      if (juguete) {
        pintarMesa(decorado);
        pintarBordes(circuito, decorado);
      } else {
        pintarSuelo(decorado);
        pintarEscapatoria(circuito, decorado);
      }
      decorado.neumaticos.forEach(juguete ? pintarNeumaticoJuguete : pintarNeumatico);
      pintarPista(circuito, juguete);
      // El aparcamiento es plano: va con el suelo, debajo de cualquier sombra.
      decorado.instalaciones.filter((r) => r.tipo === 'aparcamiento').forEach((r) => pintarAparcamiento(r, decorado.semilla));
    });
    capaDecorado = crearCapa(ANCHO, ALTO);
    dibujarEn(capaDecorado, () => {
      decorado.instalaciones.filter((r) => r.tipo !== 'aparcamiento').forEach((r) => INSTALACION[r.tipo](r, decorado.semilla));
      decorado.gradas.forEach((g) => (juguete ? pintarGradaJuguete : pintarGrada)(g, decorado.semilla));
      const color = decorado.escenario.color;
      decorado.piezas.forEach((p) => PINTAR[p.tipo](p, color));
    });
    claveCapa = clave;
  }
  ctx.drawImage(capaSuelo, 0, 0);
  pintarSombras(decorado, luz);
  ctx.drawImage(capaDecorado, 0, 0);
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

// --- El escenario juguete: la mesa y el plástico --------------------------------

const PLASTICO = {
  pista: '#1c1e23',
  brillo: 'rgba(255, 255, 255, 0.025)',
  canto: '#3b3f48',
  borde: '#9a9ea7',
  bordeMotas: ['#8e929b', '#a6aab2', '#878b94'],
  reborde: '#e3e5ea',
  junta: 'rgba(0, 0, 0, 0.55)',
  piano: '#e0262f',
  pianoClaro: '#f6f4ef',
  juntaLuz: 'rgba(255, 255, 255, 0.10)'
};
const TABLA = 72;   // px de alto de cada tabla de la mesa

/** La mesa: tablas de madera, cada una de su tono, con su veta y sus juntas. */
function pintarMesa({ semilla }) {
  const tirar = azar(semilla + 7);
  const tonos = ['#a77a4c', '#9d7145', '#b08452', '#a2764a', '#986c41'];
  for (let y = 0, fila = 0; y < ALTO; y += TABLA, fila++) {
    // Cada fila, tablas de largo distinto: las juntas de los extremos, al tresbolillo.
    let x = -tirar() * 400;
    while (x < ANCHO) {
      const largo = 380 + tirar() * 420;
      ctx.fillStyle = tonos[Math.floor(tirar() * tonos.length)];
      ctx.fillRect(x, y, largo, TABLA);
      // La veta: líneas largas y onduladas, un poco más oscuras o más claras.
      for (let v = 0; v < 9; v++) {
        const vy = y + 4 + tirar() * (TABLA - 8);
        const fase = tirar() * 6, onda = 1 + tirar() * 2.5;
        ctx.strokeStyle = tirar() < 0.7 ? 'rgba(70, 40, 15, 0.16)' : 'rgba(255, 230, 190, 0.10)';
        ctx.lineWidth = 0.6 + tirar() * 1.2;
        ctx.beginPath();
        for (let px = x; px <= x + largo; px += 12) {
          const py = vy + Math.sin(fase + px / (60 + v * 13)) * onda;
          if (px === x) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // Algún nudo.
      if (tirar() < 0.35) {
        const nx = x + 40 + tirar() * (largo - 80), ny = y + 12 + tirar() * (TABLA - 24);
        ctx.fillStyle = 'rgba(80, 45, 18, 0.35)';
        ctx.beginPath();
        ctx.ellipse(nx, ny, 7 + tirar() * 5, 3 + tirar() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(40, 22, 8, 0.55)';
      ctx.fillRect(x + largo - 1, y, 2, TABLA);
      x += largo;
    }
    ctx.fillStyle = 'rgba(40, 22, 8, 0.6)';
    ctx.fillRect(0, y + TABLA - 1.5, ANCHO, 2);
    ctx.fillStyle = 'rgba(255, 235, 200, 0.10)';
    ctx.fillRect(0, y, ANCHO, 1);
  }
}

/*
 * Los bordes de plástico gris donde hoy está la grava: la misma zona, que es
 * la que usa la física, con un reborde claro y la sombra sobre la mesa.
 */
function pintarBordes(circuito, { semilla }) {
  ctx.save();
  ctx.translate(2, 3);
  ctx.fillStyle = 'rgba(30, 15, 5, 0.45)';
  rellenarZona(circuito, 3);
  ctx.restore();
  ctx.fillStyle = PLASTICO.reborde;
  rellenarZona(circuito, 3);
  ctx.fillStyle = PLASTICO.borde;
  rellenarZona(circuito, 0);
  const tirar = azar(semilla + 1);
  const { eje } = circuito;
  for (let i = 0; i < MOTAS_GRAVA; i++) {
    const p = eje[Math.floor(tirar() * eje.length)];
    const k = tirar() < 0.5 ? 0 : 1, lado = k ? 1 : -1;
    const d = circuito.ancho / 2 + tirar() * (p.muro[k] - circuito.ancho / 2 - 1.5);
    ctx.fillStyle = PLASTICO.bordeMotas[Math.floor(tirar() * PLASTICO.bordeMotas.length)];
    ctx.fillRect(p.x - Math.sin(p.angulo) * lado * d - 0.5, p.y + Math.cos(p.angulo) * lado * d - 0.5, 1, 1);
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
  trazarZona(circuito, extra);
  ctx.fill('nonzero');
}

function trazarZona(circuito, extra) {
  ctx.beginPath();
  for (const p of circuito.eje) {
    [-1, 1].forEach((lado, k) => {
      const hacia = Math.atan2(Math.cos(p.angulo) * lado, -Math.sin(p.angulo) * lado);
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.muro[k] + extra, hacia - Math.PI / 2, hacia + Math.PI / 2);
      ctx.closePath();
    });
  }
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

function pintarPista(circuito, juguete) {
  // La calzada es el eje trazado con el ancho de la pista: con uniones
  // redondeadas, lo que se ve coincide con lo que `proyectar` da por pista.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';   // una sombra suave que la despega de la grava
  ctx.lineWidth = circuito.ancho + 8;
  polilinea(circuito.eje);
  ctx.strokeStyle = juguete ? PLASTICO.canto : COLOR.borde;
  ctx.lineWidth = circuito.ancho + 4;
  polilinea(circuito.eje);
  ctx.strokeStyle = juguete ? PLASTICO.pista : COLOR.calzada;
  ctx.lineWidth = circuito.ancho;
  polilinea(circuito.eje);
  if (juguete) {
    // El brillo del plástico: una banda algo más clara por el centro.
    ctx.strokeStyle = PLASTICO.brillo;
    ctx.lineWidth = circuito.ancho * 0.45;
    polilinea(circuito.eje);
  }
  pintarPianos(circuito, juguete);
  if (juguete) pintarFiloPianos(circuito);
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
function pintarPianos(circuito, juguete) {
  const { eje } = circuito;
  ctx.lineCap = 'butt';
  for (let i = 0; i < eje.length; i += PASO_PIANO) {
    const a = eje[i], b = eje[(i + PASO_PIANO) % eje.length];
    if (!a.piano || !b.piano) continue;
    const par = (i / PASO_PIANO) % 2 === 0;
    const [rojo, blanco] = juguete ? [PLASTICO.piano, PLASTICO.pianoClaro] : [COLOR.piano, COLOR.pianoClaro];
    ctx.strokeStyle = par ? rojo : blanco;
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

/*
 * Lo alto de cada pieza, en radios (lo que estira su sombra), y el de las
 * gradas, en px. Un pino es más alto que ancho; una roca, casi plana.
 */
const ALTO_PIEZA = {
  arbol: 1, pino: 1.5, arbusto: 0.5, roca: 0.35, cactus: 1.2,
  // Los de la mesa: una lata es más alta que una taza; una moneda, nada.
  taza: 1.3, lata: 1.9, lapiz: 0.12, moneda: 0.04, chapa: 0.12, dado: 1, ladrillo: 0.45
};
const ALTO_GRADA = 7;

/*
 * Las sombras de las gradas y las piezas: lo que tapa cada una barrido desde
 * su base hasta donde cae la sombra de su copa (o su escalón más alto). Todas
 * en un solo trazado y un relleno por tipo, para que lo semitransparente no se
 * acumule donde se pisan.
 */
function rectanguloGirado(x, y, w, h, giro) {
  const cos = Math.cos(giro), sin = Math.sin(giro);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j], n) => {
    const a = i * w / 2, b = j * h / 2;
    if (n === 0) ctx.moveTo(x + a * cos - b * sin, y + a * sin + b * cos);
    else ctx.lineTo(x + a * cos - b * sin, y + a * sin + b * cos);
  });
  ctx.closePath();
}

function pintarSombras(decorado, luz) {
  const sol = sombraSol(luz, 1);   // la de 1 px de alto: se escala
  if (sol.fuerza <= 0.005) return;
  const dx = sol.x, dy = sol.y;

  ctx.fillStyle = `rgba(0, 0, 0, ${0.25 * sol.fuerza})`;
  ctx.beginPath();
  // Las gradas y las instalaciones con algo de alto: rectángulos barridos.
  const rectangulos = [
    ...decorado.gradas.map((g) => ({ ...g, alto: ALTO_GRADA })),
    ...decorado.instalaciones.filter((r) => r.alto > 0)
  ];
  for (const g of rectangulos) {
    // El sol, en los ejes del rectángulo.
    const cos = Math.cos(g.angulo), sin = Math.sin(g.angulo);
    const u = (dx * cos + dy * sin) * g.alto, v = (-dx * sin + dy * cos) * g.alto;
    const pasos = Math.max(1, Math.ceil(Math.hypot(u, v) / 3));
    for (let k = 1; k <= pasos; k++) {
      const f = k / pasos;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j], n) => {
        const a = i * g.largo / 2 + u * f, b = j * g.fondo / 2 + v * f;
        const x = g.x + a * cos - b * sin, y = g.y + a * sin + b * cos;
        if (n === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
  }
  ctx.fill('nonzero');

  ctx.fillStyle = `rgba(0, 0, 0, ${0.22 * sol.fuerza})`;
  ctx.beginPath();
  for (const p of decorado.piezas) {
    const alto = ALTO_PIEZA[p.tipo] * p.r;
    const largo = Math.min(sol.largo * alto, 6 * p.r);
    // Lo alargado (un lápiz, una pieza de construcción, un dado) barre su
    // rectángulo; lo demás, su círculo.
    const caja = CAJA_SOMBRA[p.tipo]?.(p);
    const radio = p.r * (RADIO_SOMBRA[p.tipo] ?? 0.9);
    const pasos = Math.max(1, Math.ceil(largo / ((caja ? Math.min(...caja) : radio) * 0.5)));
    for (let k = 0; k <= pasos; k++) {
      const d = 0.1 * p.r + (largo - 0.1 * p.r) * k / pasos;
      const x = p.x + dx / sol.largo * d, y = p.y + dy / sol.largo * d;
      if (caja) rectanguloGirado(x, y, caja[0], caja[1], p.giro);
      else {
        ctx.moveTo(x + radio, y);
        ctx.arc(x, y, radio, 0, Math.PI * 2);
      }
    }
  }
  ctx.fill('nonzero');
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

/*
 * El piano de juguete va impreso en el borde de plástico: colores
 * planos y vivos, y un filo oscuro por fuera que lo despega del gris.
 */
function pintarFiloPianos(circuito) {
  const { eje } = circuito;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'butt';
  for (const [k, lado] of [[0, -1], [1, 1]]) {
    ctx.beginPath();
    let abierto = false;
    for (let i = 0; i <= eje.length; i++) {
      const p = eje[i % eje.length];
      const d = p.borde[k];
      if (!p.piano || d <= circuito.ancho / 2) { abierto = false; continue; }
      const x = p.x - Math.sin(p.angulo) * lado * d, y = p.y + Math.cos(p.angulo) * lado * d;
      if (abierto) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      abierto = true;
    }
    ctx.stroke();
  }
}

/*
 * Lo que hay en la mesa del escenario juguete: tazas, latas, lápices, monedas,
 * chapas, dados y piezas de construcción. Son piezas del decorado como los
 * árboles (su círculo `r` no pisa nada) y su sombra va con el sol.
 */
const PLASTICOS = ['#d93a3a', '#f2c230', '#2f6fd0', '#3aa055', '#f0f0ea'];

/** Lo que mide cada cosa, en función de su `r`: lo usan el dibujo y la sombra. */
const medidaLapiz = (p) => [p.r * 1.9, Math.max(3.5, p.r * 0.3)];
const ladoDado = (p) => p.r * 1.25;
function medidaLadrillo(p) {
  const largos = p.variante < 0.75 ? 4 : 2;
  const t = p.r * 1.7 / Math.hypot(largos, 2);   // lo que mide un tetón: cabe en el círculo
  return { largos, t, w: largos * t, h: 2 * t };
}
const CAJA_SOMBRA = {
  lapiz: medidaLapiz,
  dado: (p) => [ladoDado(p) * 0.9, ladoDado(p) * 0.9],
  ladrillo: (p) => { const m = medidaLadrillo(p); return [m.w, m.h]; }
};
const RADIO_SOMBRA = { taza: 0.78, lata: 0.72, moneda: 0.75, chapa: 0.8 };

function taza(p) {
  const r = p.r * 0.78;
  const asa = { x: Math.cos(p.giro) * r * 1.05, y: Math.sin(p.giro) * r * 1.05 };
  const loza = ['#ece7dc', '#c9483d', '#3f6fb0', '#e9b93a'][Math.floor(p.variante * 10) % 4];
  ctx.strokeStyle = loza;
  ctx.lineWidth = Math.max(2, p.r * 0.16);
  ctx.beginPath();
  ctx.arc(p.x + asa.x, p.y + asa.y, p.r * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = loza;
  circulo(p.x, p.y, r);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  circulo(p.x, p.y, r * 0.86);
  ctx.fillStyle = '#4a2c1a';                 // el café
  circulo(p.x, p.y, r * 0.8);
  ctx.fillStyle = 'rgba(200, 150, 100, 0.35)';
  circulo(p.x - r * 0.2, p.y - r * 0.2, r * 0.32);
}

function lata(p) {
  const r = p.r * 0.72;
  ctx.fillStyle = ['#c8202c', '#2a5fb8', '#1f8f4c'][Math.floor(p.variante * 10) % 3];
  circulo(p.x, p.y, r);
  ctx.fillStyle = '#c9cdd4';
  circulo(p.x, p.y, r * 0.86);
  ctx.fillStyle = '#a9aeb7';
  circulo(p.x, p.y, r * 0.74);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.giro);
  ctx.fillStyle = '#d9dde3';                 // la anilla
  ctx.beginPath();
  ctx.roundRect(-r * 0.1, -r * 0.18, r * 0.62, r * 0.36, r * 0.16);
  ctx.fill();
  ctx.fillStyle = '#2b2e34';                 // la boca
  ctx.beginPath();
  ctx.roundRect(-r * 0.55, -r * 0.16, r * 0.4, r * 0.32, r * 0.12);
  ctx.fill();
  ctx.restore();
}

function lapiz(p) {
  const [largo, ancho] = medidaLapiz(p);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.giro);
  const punta = largo * 0.16, goma = largo * 0.1, cuerpo = largo - goma - punta;
  ctx.fillStyle = ['#f2c230', '#2f6fd0', '#d93a3a', '#3aa055'][Math.floor(p.variante * 13) % 4];
  ctx.fillRect(-largo / 2 + goma, -ancho / 2, cuerpo, ancho);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(-largo / 2 + goma, ancho * 0.12, cuerpo, ancho * 0.38);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(-largo / 2 + goma, -ancho / 2, cuerpo, ancho * 0.22);
  ctx.fillStyle = '#e98a9b';                 // la goma
  ctx.fillRect(-largo / 2, -ancho / 2, goma * 0.6, ancho);
  ctx.fillStyle = '#b9bdc5';
  ctx.fillRect(-largo / 2 + goma * 0.6, -ancho / 2, goma * 0.4, ancho);
  ctx.fillStyle = '#e8c59a';                 // la madera
  poligono([{ x: largo / 2 - punta, y: -ancho / 2 }, { x: largo / 2, y: 0 }, { x: largo / 2 - punta, y: ancho / 2 }]);
  ctx.fillStyle = '#2b2b2b';                 // la mina
  poligono([{ x: largo / 2 - punta * 0.35, y: -ancho * 0.17 }, { x: largo / 2, y: 0 }, { x: largo / 2 - punta * 0.35, y: ancho * 0.17 }]);
  ctx.restore();
}

function moneda(p) {
  const r = p.r * 0.75;
  const oro = p.variante < 0.25;
  ctx.fillStyle = oro ? '#c9a443' : '#b9bdc5';
  circulo(p.x, p.y, r);
  ctx.fillStyle = oro ? '#ddb955' : '#ced2d8';
  circulo(p.x, p.y, r * 0.8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  circulo(p.x - r * 0.25, p.y - r * 0.25, r * 0.3);
}

function chapa(p) {
  const r = p.r * 0.8;
  const dientes = () => {
    ctx.beginPath();
    for (let k = 0; k < 42; k++) {
      const a = k * Math.PI / 21, d = k % 2 ? r * 0.88 : r;
      if (k === 0) ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      else ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.giro);
  ctx.fillStyle = ['#d93a3a', '#2f6fd0', '#3aa055', '#f2c230'][Math.floor(p.variante * 17) % 4];
  dientes();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const PUNTOS_DADO = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
};

function dado(p) {
  const l = ladoDado(p);
  const cara = () => { ctx.beginPath(); ctx.roundRect(-l / 2, -l / 2, l, l, l * 0.2); };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.giro);
  const rojo = p.variante < 0.3;
  ctx.fillStyle = rojo ? '#d93a3a' : '#f4f2ec';
  cara();
  ctx.fill();
  ctx.fillStyle = rojo ? '#f4f2ec' : '#22242a';
  for (const [i, j] of PUNTOS_DADO[1 + Math.floor(p.variante * 60) % 6]) {
    ctx.beginPath();
    ctx.arc(i * l * 0.27, j * l * 0.27, Math.max(0.7, l * 0.09), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Una pieza de construcción de 2 × 4 (o de 2 × 2), con sus tetones. */
function ladrillo(p) {
  const { largos, t, w, h } = medidaLadrillo(p);
  const caja = () => { ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); };
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.giro);
  const color = PLASTICOS[Math.floor(p.variante * 23) % PLASTICOS.length];
  ctx.fillStyle = color;
  caja();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  for (let i = 0; i < largos; i++) {
    for (let j = 0; j < 2; j++) {
      const cx = -w / 2 + t * (i + 0.5), cy = -h / 2 + t * (j + 0.5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      circulo(cx + 0.5, cy + 0.6, t * 0.32);
      ctx.fillStyle = color;
      circulo(cx, cy, t * 0.32);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      circulo(cx - t * 0.1, cy - t * 0.1, t * 0.12);
    }
  }
  ctx.restore();
}

Object.assign(PINTAR, { taza, lata, lapiz, moneda, chapa, dado, ladrillo });

/** El neumático de juguete, de goma brillante con la llanta de color. */
function pintarNeumaticoJuguete(n, i) {
  ctx.fillStyle = '#17181c';
  circulo(n.x, n.y, n.r);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(n.x, n.y, n.r * 0.78, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.fillStyle = ['#e0262f', '#f6f4ef', '#2f6fd0'][i % 3];
  circulo(n.x, n.y, n.r * 0.48);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  circulo(n.x, n.y, n.r * 0.18);
}

/*
 * La grada de juguete, de plástico: una base blanca con su reborde,
 * escalones azules con el público impreso en filas, y la marquesina roja y
 * blanca por detrás.
 */
function pintarGradaJuguete(g, semilla) {
  const tirar = azar(semilla + Math.round(g.x * 7 + g.y));
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angulo);
  const { largo, fondo } = g;
  ctx.fillStyle = '#ecebe6';
  ctx.beginPath();
  ctx.roundRect(-largo / 2 - 2, -fondo / 2 - 2, largo + 4, fondo + 4, 2);
  ctx.fill();
  const filas = 3, alto = (fondo - 4) / filas;
  for (let f = 0; f < filas; f++) {
    const y = -fondo / 2 + f * alto;
    ctx.fillStyle = ['#2f6fd0', '#3b7ce0', '#4a8aec'][f];
    ctx.fillRect(-largo / 2, y, largo, alto - 0.6);
    for (let x = -largo / 2 + 2.5; x < largo / 2 - 2; x += 4) {
      if (tirar() < 0.12) continue;
      ctx.fillStyle = PLASTICOS[Math.floor(tirar() * PLASTICOS.length)];
      ctx.fillRect(x - 1.2, y + alto / 2 - 1.5, 2.4, 2.4);
    }
  }
  for (let x = -largo / 2 - 2, k = 0; x < largo / 2 + 2; x += 6, k++) {
    ctx.fillStyle = k % 2 ? '#f6f4ef' : '#e0262f';
    ctx.fillRect(x, fondo / 2 - 4, Math.min(6, largo / 2 + 2 - x), 6);
  }
  ctx.restore();
}

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
 * Las torres de iluminación, en cada fotograma y encima de los carriles: son
 * lo más alto. Su sombra va con el sol de la luz de ahora (`sombraTorre`): en
 * la carrera de resistencia se alarga, gira y se va al ponerse.
 */
export function dibujarTorres(decorado, luz) {
  const sombra = sombraTorre(luz);
  if (sombra.alfa > 0.005 && sombra.largo > 0.5) {
    ctx.save();
    ctx.strokeStyle = `rgba(0, 0, 0, ${sombra.alfa})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const t of decorado.torres) {
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + sombra.x, t.y + sombra.y);
    }
    ctx.stroke();
    ctx.restore();
  }
  decorado.torres.forEach((t) => pintarTorre(t, decorado.escenario.juguete));
}

/*
 * Una torre de iluminación vista desde arriba: la base y la cabeza de focos,
 * atravesada y mirando a la pista. De día son postes; de noche, `luz.js`
 * enciende los focos.
 */
function pintarTorre(t, juguete) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = juguete ? '#ecebe6' : '#3a3e48';   // en la mesa, una farola de plástico
  ctx.fillRect(-2.5, -2.5, 5, 5);
  ctx.rotate(t.angulo);
  ctx.fillStyle = juguete ? '#e0262f' : '#20232b';
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

// --- Las instalaciones ----------------------------------------------------------

/*
 * Lo que tiene un circuito de verdad alrededor (`nucleo/decorado.js`): boxes,
 * vallas, comisarios y el aparcamiento. Cada una, en sus ejes: el largo a lo
 * largo de x y la pista hacia -y.
 */
const EQUIPOS = ['#d93a3a', '#2f6fd0', '#f2c230', '#3aa055', '#e6e8ee', '#ff8a3a', '#8a4fc0'];
const MARCAS = [['#d93a3a', '#f6f4ef'], ['#f2c230', '#1c1e23'], ['#2f6fd0', '#f6f4ef'], ['#1c1e23', '#f2c230'], ['#3aa055', '#f6f4ef'], ['#f6f4ef', '#d93a3a']];
const GARAJE = 15;       // px de cada garaje de los boxes
const PLAZA = 18;        // px de ancho de cada plaza del aparcamiento
const FILA = 34;         // px de fondo de cada fila de plazas

function enSusEjes(r, pintar) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angulo);
  pintar(r.largo / 2, r.fondo / 2);
  ctx.restore();
}

const INSTALACION = {
  /** El edificio de los garajes: el tejado, un toldo de color por equipo y la torre de control. */
  boxes(r, semilla) {
    const tirar = azar(semilla + Math.round(r.x * 7 + r.y));
    enSusEjes(r, (a, b) => {
      // El hormigón delante de los garajes.
      ctx.fillStyle = '#b4b7bd';
      ctx.fillRect(-a, -b, r.largo, 6);
      const garajes = Math.floor((r.largo - 20) / GARAJE);
      const desde = -a + 2;
      for (let k = 0; k < garajes; k++) {
        ctx.fillStyle = '#2a2d34';
        ctx.fillRect(desde + k * GARAJE + 1, -b + 1.5, GARAJE - 2, 3);
        ctx.fillStyle = EQUIPOS[Math.floor(tirar() * EQUIPOS.length)];
        ctx.fillRect(desde + k * GARAJE + 1, -b + 4.5, GARAJE - 2, 3);
      }
      // El tejado, a paneles.
      ctx.fillStyle = '#d7d9de';
      ctx.fillRect(-a, -b + 7.5, r.largo, r.fondo - 7.5);
      ctx.fillStyle = '#c2c5cc';
      for (let x = desde + GARAJE; x < a - 18; x += GARAJE) ctx.fillRect(x - 0.5, -b + 7.5, 1, r.fondo - 7.5);
      ctx.fillStyle = '#9da1aa';
      ctx.fillRect(-a, b - 1.5, r.largo, 1.5);
      // La torre de control, al final: más alta, con su cristal mirando a la pista.
      ctx.fillStyle = '#3f4656';
      ctx.fillRect(a - 18, -b + 2, 18, r.fondo - 2);
      ctx.fillStyle = '#86b8de';
      ctx.fillRect(a - 17, -b + 2, 16, 2.5);
      ctx.fillStyle = '#596173';
      ctx.fillRect(a - 14, -b + 8, 10, r.fondo - 13);
    });
  },
  /** Una valla de publicidad: dos o tres anuncios seguidos, de colores de marca. */
  valla(r, semilla) {
    const tirar = azar(semilla + Math.round(r.x * 7 + r.y));
    enSusEjes(r, (a, b) => {
      const anuncios = tirar() < 0.5 ? 2 : 3;
      const largo = r.largo / anuncios;
      for (let k = 0; k < anuncios; k++) {
        const [fondo, letra] = MARCAS[Math.floor(tirar() * MARCAS.length)];
        const x = -a + k * largo;
        ctx.fillStyle = fondo;
        ctx.fillRect(x, -b, largo, r.fondo);
        // El «logo»: una franja del otro color, más corta.
        ctx.fillStyle = letra;
        ctx.fillRect(x + largo * 0.2, -b + r.fondo * 0.3, largo * 0.6, r.fondo * 0.4);
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(-a, b - 0.8, r.largo, 0.8);
    });
  },
  /** Un puesto de comisario: la caseta naranja y su bandera, hacia la pista. */
  comisario(r) {
    enSusEjes(r, (a, b) => {
      ctx.fillStyle = '#f6f4ef';
      ctx.fillRect(-a, -b, r.largo, r.fondo);
      ctx.fillStyle = '#f08a24';
      ctx.fillRect(-a + 1, -b + 1, r.largo - 2, r.fondo - 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(-a + 1, 0, r.largo - 2, b - 1);
      // La bandera, amarilla, en su mástil: asoma por delante.
      ctx.fillStyle = '#1c1e23';
      ctx.fillRect(a - 1.5, -b - 1, 1, 2);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(a - 1, -b - 1, 4, 2.6);
    });
  }
};

/*
 * El aparcamiento: asfalto, plazas pintadas y, en dos de cada tres, un coche
 * de los del juego (de su color, un poco más pequeño) o una caravana.
 */
function pintarAparcamiento(r, semilla) {
  const tirar = azar(semilla + Math.round(r.x * 7 + r.y));
  const modelos = Object.keys(COCHES);
  enSusEjes(r, (a, b) => {
    ctx.fillStyle = '#9a9ea5';
    ctx.fillRect(-a - 1.5, -b - 1.5, r.largo + 3, r.fondo + 3);
    ctx.fillStyle = '#585c63';
    ctx.fillRect(-a, -b, r.largo, r.fondo);
    const filas = r.fondo >= FILA * 2 + 12 ? [-b, b - FILA] : [-b];
    const plazas = Math.floor(r.largo / PLAZA);
    const margen = (r.largo - plazas * PLAZA) / 2;
    for (const y0 of filas) {
      const morro = y0 === -b ? 1 : -1;   // de cara al pasillo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let k = 0; k <= plazas; k++) ctx.fillRect(-a + margen + k * PLAZA - 0.5, y0, 1, FILA);
      for (let k = 0; k < plazas; k++) {
        const dado = tirar();
        if (dado > 0.67) continue;   // libre
        const cx = -a + margen + (k + 0.5) * PLAZA, cy = y0 + FILA / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(morro * Math.PI / 2);
        if (dado < 0.08) {
          // Una caravana: blanca, con su franja y la claraboya.
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(-14, -6, 30, 14);
          ctx.fillStyle = '#eceae4';
          ctx.fillRect(-15, -7, 30, 14);
          ctx.fillStyle = '#c9c6bd';
          ctx.fillRect(-4, -3, 6, 6);
          ctx.fillStyle = EQUIPOS[Math.floor(tirar() * 3)];
          ctx.fillRect(-15, 5, 30, 1.5);
        } else {
          const m = modelo(modelos[Math.floor(tirar() * modelos.length)]);
          ctx.scale(0.85, 0.85);
          ctx.save();
          ctx.translate(SOMBRA_COCHE.x, SOMBRA_COCHE.y);
          sombraModelo(m, 'rgba(0, 0, 0, 0.3)');
          ctx.restore();
          pintarModelo(m, EQUIPOS[Math.floor(tirar() * EQUIPOS.length)]);
        }
        ctx.restore();
      }
    }
  });
}

// --- Los carriles -------------------------------------------------------------

/*
 * Los carriles: la ranura oscura entre dos bandas plateadas, que son las
 * trencillas por las que el coche coge la corriente. Y las juntas de las
 * piezas, de lado a lado de la pista. Encima de la pista de siempre, en su
 * propia capa: es un prototipo, todavía sin estética de juguete.
 */
export function dibujarCarriles(circuito, decorado) {
  const juguete = decorado.escenario.juguete;
  const clave = circuito.clave + (juguete ? '/juguete' : '');
  if (claveCarriles !== clave) {
    capaCarriles = crearCapa(ANCHO, ALTO);
    dibujarEn(capaCarriles, () => {
      if (juguete) pintarJuntasJuguete(circuito);
      else {
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
      }
      ctx.lineJoin = 'round';
      // Con un número impar de X, el carril que sale por un lado vuelve por el
      // otro: cada trazado acaba en el primer punto del otro, y abierto.
      const impar = circuito.cambiosCarril % 2 === 1;
      const trazados = CARRILES.map((lateral) =>
        [...trazadoCarril(circuito, lateral), trazadoCarril(circuito, impar ? -lateral : lateral)[0]]);
      // En el escenario juguete, las trencillas trenzadas: un gris de metal con un
      // punteado claro encima.
      const capas = juguete
        ? [['#80868f', 8, null], ['#d6dae2', 7, [1.5, 1.5]], [COLOR.ranura, 3, null]]
        : [[COLOR.carril, 7, null], [COLOR.ranura, 3, null]];
      for (const [color, grosor, raya] of capas) {
        ctx.strokeStyle = color;
        ctx.lineWidth = grosor;
        ctx.setLineDash(raya ?? []);
        for (const trazado of trazados) polilinea(trazado, false);
      }
      ctx.setLineDash([]);
    });
    claveCarriles = clave;
  }
  ctx.drawImage(capaCarriles, 0, 0);
}

/*
 * Las juntas de juguete, de muro a muro (los bordes también son
 * piezas): una ranura oscura y, al lado, el filo claro de la pieza siguiente.
 */
function pintarJuntasJuguete(circuito) {
  // Recortadas a la zona: en las chicanes, el muro de un punto no es el de al lado.
  ctx.save();
  trazarZona(circuito, 0);
  ctx.clip('nonzero');
  ctx.lineCap = 'butt';
  for (const s of juntas(circuito)) {
    const p = circuito.puntoEn(s);
    const q = circuito.eje.reduce((m, e) => (Math.abs(e.s - s) < Math.abs(m.s - s) ? e : m));
    const sx = -Math.sin(p.angulo), sy = Math.cos(p.angulo);
    const ux = Math.cos(p.angulo), uy = Math.sin(p.angulo);
    // En la chicane el borde de un lado es el de la curva siguiente: solo la pista.
    const tope = q.efecto === 'chicane' ? circuito.ancho / 2 + 2 : circuito.ancho / 2 + 40;
    const [m0, m1] = q.muro.map((m) => Math.min(m, tope));
    for (const [color, grosor, d] of [[PLASTICO.junta, 1.5, 0], [PLASTICO.juntaLuz, 1, 1.5]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = grosor;
      ctx.beginPath();
      ctx.moveTo(p.x - sx * m0 + ux * d, p.y - sy * m0 + uy * d);
      ctx.lineTo(p.x + sx * m1 + ux * d, p.y + sy * m1 + uy * d);
      ctx.stroke();
    }
  }
  ctx.restore();
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
  ctx.ellipse(coche.x + 8 * altura, coche.y + 10 * altura, slot.ficha.largo * 0.6, ANCHO_COCHE * 0.7, coche.angulo, 0, Math.PI * 2);
  ctx.fill();
  const escala = 1 + 0.35 * altura;
  ctx.translate(coche.x, coche.y);
  ctx.scale(escala, escala);
  ctx.translate(-coche.x, -coche.y);
  dibujarCoche(coche);
  ctx.restore();
}

/*
 * El fantasma de una vuelta (nucleo/fantasma.js): el mismo coche que el J1, en
 * su pose y translúcido (0,3, como en Race Panic: al 0,5 parecía otro coche).
 */
export function dibujarFantasma(pose, coche) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  dibujarCoche({ ...coche, x: pose.x, y: pose.y, angulo: pose.angulo, vx: 0, vy: 0, frenando: false, atras: false });
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
