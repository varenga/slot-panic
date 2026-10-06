/*
 * Slot Panic — el constructor: dibujar un circuito con el dedo.
 *
 * La cuadrícula ocupa la mesa bajo la barra de arriba. Arrastrar desde la
 * punta abierta traza (una casilla vecina cada vez); volver por el trazo
 * borra; llegar a la meta por detrás cierra. Tocar una pieza cambia su
 * variante. Las reglas son de `nucleo/trazo.js`; aquí, el gesto y el dibujo.
 *
 * Mientras está abierto se pinta un trazo aproximado (rectas y curvas de
 * casilla, con las variantes como iconos). Cerrado y válido, se construye el
 * circuito de verdad y se pinta como en la carrera: con su decorado, sus
 * chicanes y sus amplias. Eso cuesta décimas de segundo en uno grande, así
 * que solo se hace al acabar el gesto, nunca mientras el dedo se mueve.
 *
 * Presentación, como `pantalla.js`: no toca el DOM. Lo que sale de aquí
 * (probar, guardar, volver) lo decide `juego.js`, que es quien sabe del estado
 * de la partida y del almacenamiento.
 */

import { ANCHO, ALTO, CARRIL, COLOR, FUENTE } from './config.js';
import { circulo, ctx, polilinea, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { BANDA_TEXTO, generarDecorado } from './nucleo/decorado.js';
import { aCodigo, aPiezas, CASILLA, centroCasilla, COLUMNAS, FILAS, validarTrazado, X0, Y0 } from './nucleo/cuadricula.js';
import { construirDePiezas } from './nucleo/piezas.js';
import { validarCircuito } from './nucleo/validar.js';
import {
  abrir, aTrazado, cambiarVariante, copiarTrazo, crearTrazo, deTrazado, pasoEnCasilla, pisar, rumbos
} from './nucleo/trazo.js';
import { dibujarCarriles, dibujarFondo } from './dibujo.js';
import { boton } from './pantalla.js';
import { t } from './i18n.js';

const MEDIA = CASILLA / 2;
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
const HISTORIAL = 60;           // gestos que se pueden deshacer
const VIDA_AVISO = 1.4;         // s
const AYUDA_HASTA = 12;         // casillas a partir de las que ya no se recuerda cómo se dibuja

/*
 * Un constructor abierto: el trazo, lo que se puede deshacer, a qué guardado
 * corresponde (`mio`, el número de «Mi circuito n», o null si es nuevo) y,
 * cerrado y válido, el circuito construido y su decorado.
 */
export function crearEdicion(trazado = null, mio = null) {
  const edicion = {
    trazo: trazado ? deTrazado(trazado) : crearTrazo(),
    historial: [],
    mio,
    guardado: Boolean(trazado),   // lo que se ve es lo que hay guardado (o lo que se abrió)
    gesto: null,
    trazado: null, error: null, codigo: '', circuito: null, decorado: null, escenario: null,
    aviso: null
  };
  return edicion;
}

/*
 * Rehace lo que sale del trazo: el trazado, si vale, y el circuito de verdad.
 * El circuito y su decorado solo se rehacen si el código o el escenario
 * cambian.
 */
export function actualizarEdicion(edicion, escenario) {
  const trazado = aTrazado(edicion.trazo);
  edicion.trazado = trazado;
  edicion.error = trazado ? validarTrazado(trazado) : null;
  const codigo = trazado && !edicion.error ? aCodigo(trazado) : '';
  if (codigo !== edicion.codigo) {
    edicion.codigo = codigo;
    edicion.circuito = null;
    edicion.decorado = null;
    if (codigo) {
      const circuito = construirDePiezas(aPiezas(trazado, 'c-' + codigo));
      if (validarCircuito(circuito).fallos.length) {
        // No debería pasar (lo garantiza el arnés), pero si pasa, no se corre.
        edicion.error = { motivo: 'nocabe', paso: -1 };
        edicion.codigo = '';
      } else {
        circuito.dibujado = true;
        edicion.circuito = circuito;
      }
    }
  }
  if (edicion.circuito) edicion.circuito.mio = edicion.mio;
  if (edicion.circuito && (!edicion.decorado || edicion.escenario !== escenario)) {
    edicion.decorado = generarDecorado(edicion.circuito, escenario);
    edicion.escenario = escenario;
  }
}

/** ¿Se puede correr y guardar? */
export function listo(edicion) {
  return Boolean(edicion.circuito);
}

// --- Gestos -------------------------------------------------------------------

/** La casilla bajo un punto del lienzo, o null fuera de la cuadrícula. */
export function casillaEn(p) {
  const col = Math.floor((p.x - X0) / CASILLA), fila = Math.floor((p.y - Y0) / CASILLA);
  if (col < 0 || fila < 0 || col >= COLUMNAS || fila >= FILAS) return null;
  return { col, fila };
}

function guardarParaDeshacer(edicion) {
  edicion.historial.push(copiarTrazo(edicion.trazo));
  if (edicion.historial.length > HISTORIAL) edicion.historial.shift();
}

function cambiado(edicion) {
  edicion.guardado = false;
}

/*
 * El dedo baja. Sobre la punta abierta (o en un constructor vacío) empieza a
 * trazar; sobre otra pieza, puede ser un toque, que se decide al soltar.
 */
export function empezarGesto(edicion, p) {
  const casilla = casillaEn(p);
  if (!casilla) return;
  const { casillas, cerrado } = edicion.trazo;
  const ultima = casillas.at(-1);
  const antes = copiarTrazo(edicion.trazo);
  if (!casillas.length) {
    pisar(edicion.trazo, casilla);
    edicion.gesto = { tipo: 'trazar', antes, casilla, movido: true };
  } else if (!cerrado && ultima.col === casilla.col && ultima.fila === casilla.fila) {
    edicion.gesto = { tipo: 'trazar', antes, casilla, movido: false };
  } else {
    edicion.gesto = { tipo: 'tocar', antes, casilla, movido: false };
  }
}

/*
 * El dedo se mueve. Trazando, avanza casilla a casilla hacia donde está el
 * dedo (un arrastre rápido se salta casillas entre dos eventos): primero por
 * el eje en que queda más lejos.
 */
export function moverGesto(edicion, p) {
  const gesto = edicion.gesto;
  const casilla = casillaEn(p);
  if (!gesto || !casilla) return;
  if (casilla.col !== gesto.casilla.col || casilla.fila !== gesto.casilla.fila) gesto.movido = true;
  if (gesto.tipo !== 'trazar') return;
  const { trazo } = edicion;
  for (let pasos = 0; pasos < COLUMNAS + FILAS && !trazo.cerrado; pasos++) {
    const ultima = trazo.casillas.at(-1);
    if (!ultima) break;
    const dc = casilla.col - ultima.col, df = casilla.fila - ultima.fila;
    if (!dc && !df) break;
    const siguiente = Math.abs(dc) >= Math.abs(df)
      ? { col: ultima.col + Math.sign(dc), fila: ultima.fila }
      : { col: ultima.col, fila: ultima.fila + Math.sign(df) };
    if (!pisar(trazo, siguiente)) break;
  }
}

/** El dedo sube: un toque cambia la variante; un trazo, se apunta para deshacerlo. */
export function acabarGesto(edicion, escenario) {
  const gesto = edicion.gesto;
  edicion.gesto = null;
  if (!gesto) return;
  if (gesto.tipo === 'tocar' && !gesto.movido) {
    const i = pasoEnCasilla(edicion.trazo, gesto.casilla);
    const variante = i >= 0 ? cambiarVariante(edicion.trazo, i) : null;
    if (variante !== null) {
      avisar(edicion, t(variante ? 'variante.' + variante : 'variante.normal'));
    } else if (i === 0) {
      avisar(edicion, t('constructor.meta'));
    }
  }
  if (JSON.stringify(gesto.antes) !== JSON.stringify(edicion.trazo)) {
    edicion.historial.push(gesto.antes);
    if (edicion.historial.length > HISTORIAL) edicion.historial.shift();
    cambiado(edicion);
  }
  actualizarEdicion(edicion, escenario);
}

/** Vuelve atrás un gesto. Sin nada que deshacer, abre un circuito cerrado. */
export function deshacer(edicion, escenario) {
  const anterior = edicion.historial.pop();
  if (anterior) edicion.trazo = anterior;
  else if (edicion.trazo.cerrado) {
    // Uno abierto desde un código o desde «Mis circuitos» no tiene historial:
    // deshacer lo abre por la meta, para poder rehacer el final.
    abrir(edicion.trazo);
  } else return;
  cambiado(edicion);
  actualizarEdicion(edicion, escenario);
}

export function borrar(edicion, escenario) {
  if (!edicion.trazo.casillas.length) return;
  guardarParaDeshacer(edicion);
  edicion.trazo = crearTrazo();
  cambiado(edicion);
  actualizarEdicion(edicion, escenario);
}

export function avisar(edicion, cadena, color = COLOR.ambar) {
  edicion.aviso = { texto: cadena, vida: VIDA_AVISO, color };
}

export function actualizarAviso(edicion, dt) {
  if (edicion.aviso && (edicion.aviso.vida -= dt) <= 0) edicion.aviso = null;
}

// --- La barra -------------------------------------------------------------------

const BOTONES = ['volver', 'deshacer', 'borrar', 'probar', 'guardar'];

/* Los botones de la barra: volver a la izquierda, el resto a la derecha. Dibujo y pulsación. */
export function botonesConstructor() {
  const alto = 34, y = (BANDA_TEXTO - alto) / 2, hueco = 10, ancho = 132;
  const cajas = [{ id: 'volver', x: 12, y, ancho, alto }];
  const derecha = BOTONES.slice(1);
  derecha.forEach((id, i) => {
    cajas.push({ id, x: ANCHO - 12 - (derecha.length - i) * (ancho + hueco) + hueco, y, ancho, alto });
  });
  return cajas;
}

// --- Dibujo ---------------------------------------------------------------------

export function dibujarConstructor(edicion, { tiempo, tactil, nombre }) {
  if (edicion.circuito) {
    dibujarFondo(edicion.circuito, edicion.decorado);
    dibujarCarriles(edicion.circuito);
    // Sobre el suelo del escenario (la nieve es clara), la cuadrícula va en oscuro.
    pintarCuadricula('rgba(18, 20, 26, 0.14)');
  } else {
    ctx.fillStyle = COLOR.hierba;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    pintarCuadricula('rgba(230, 232, 238, 0.12)');
    pintarTrazo(edicion.trazo);
  }
  pintarMarcas(edicion, tiempo);
  if (!edicion.trazo.casillas.length) {
    texto(t(tactil ? 'constructor.empiezaTactil' : 'constructor.empieza'), ANCHO / 2, Y0 + FILAS * MEDIA,
      { tam: 22, color: COLOR.hud, peso: 600 });
  } else if (!edicion.gesto && edicion.trazo.casillas.length < AYUDA_HASTA && !edicion.trazo.cerrado) {
    // La ayuda tapa la fila de abajo: solo al empezar, y nunca mientras se dibuja.
    pintarAyuda(t(tactil ? 'constructor.ayudaTactil' : 'constructor.ayuda'));
  }
  pintarBarra(edicion, nombre, tactil);
  if (edicion.aviso) {
    const { aviso } = edicion;
    ctx.globalAlpha = Math.min(1, aviso.vida / 0.4);
    ctx.fillStyle = COLOR.panel;
    rectanguloRedondo(ANCHO / 2 - 170, BANDA_TEXTO + 14, 340, 34, 8);
    texto(aviso.texto, ANCHO / 2, BANDA_TEXTO + 32, { tam: 18, color: aviso.color, peso: 700 });
    ctx.globalAlpha = 1;
  }
}

function pintarCuadricula(color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLUMNAS; c++) {
    ctx.moveTo(X0 + c * CASILLA, Y0);
    ctx.lineTo(X0 + c * CASILLA, Y0 + FILAS * CASILLA);
  }
  for (let f = 0; f <= FILAS; f++) {
    ctx.moveTo(X0, Y0 + f * CASILLA);
    ctx.lineTo(X0 + COLUMNAS * CASILLA, Y0 + f * CASILLA);
  }
  ctx.stroke();
}

/*
 * El eje aproximado de cada casilla: de la mitad del lado por el que entra a
 * la del lado por el que sale, recto o en un cuarto de círculo con el centro
 * en la esquina. Sin saber por dónde sale (la punta abierta), hasta el centro.
 */
function ejeCasilla(casilla, entra, sale) {
  const c = centroCasilla(casilla.col, casilla.fila);
  if (entra === null && sale === null) return [c];
  if (sale === null) return [{ x: c.x - DX[entra] * MEDIA, y: c.y - DY[entra] * MEDIA }, c];
  if (entra === null || entra === sale) {
    const r = entra ?? sale;
    return [{ x: c.x - DX[r] * MEDIA, y: c.y - DY[r] * MEDIA }, { x: c.x + DX[r] * MEDIA, y: c.y + DY[r] * MEDIA }];
  }
  const esquina = { x: c.x + (DX[sale] - DX[entra]) * MEDIA, y: c.y + (DY[sale] - DY[entra]) * MEDIA };
  const desde = Math.atan2(-DY[sale], -DX[sale]);
  let giro = Math.atan2(DY[entra], DX[entra]) - desde;
  giro = Math.atan2(Math.sin(giro), Math.cos(giro));
  const puntos = [];
  for (let k = 0; k <= 8; k++) {
    const a = desde + giro * k / 8;
    puntos.push({ x: esquina.x + Math.cos(a) * MEDIA, y: esquina.y + Math.sin(a) * MEDIA });
  }
  return puntos;
}

/** El eje aproximado de todo el trazo, en orden. */
function ejeTrazo(trazo) {
  const lista = rumbos(trazo);
  const puntos = [];
  trazo.casillas.forEach((casilla, i) => {
    // La primera casilla de uno abierto: sin trazo detrás de la meta.
    const entra = i === 0 && !trazo.cerrado ? null : lista[i].entra;
    const tramo = ejeCasilla(casilla, entra, lista[i].sale);
    puntos.push(...(puntos.length ? tramo.slice(1) : tramo));
  });
  return puntos;
}

/** Un desplazamiento lateral de una polilínea (los carriles del trazo aproximado). */
function desplazar(puntos, d) {
  return puntos.map((p, i) => {
    const a = puntos[Math.max(0, i - 1)], b = puntos[Math.min(puntos.length - 1, i + 1)];
    const largo = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x - (b.y - a.y) / largo * d, y: p.y + (b.x - a.x) / largo * d };
  });
}

function pintarTrazo(trazo) {
  if (!trazo.casillas.length) return;
  const eje = ejeTrazo(trazo);
  const cerrada = trazo.cerrado;
  ctx.lineJoin = 'round';
  ctx.lineCap = trazo.casillas.length === 1 ? 'round' : 'butt';
  if (eje.length === 1) eje.push({ x: eje[0].x + 0.1, y: eje[0].y });
  for (const [color, grosor] of [[COLOR.borde, 68], [COLOR.calzada, 64]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    polilinea(eje, cerrada);
  }
  for (const [color, grosor] of [[COLOR.carril, 7], [COLOR.ranura, 3]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    for (const d of [-CARRIL, CARRIL]) polilinea(desplazar(eje, d), cerrada);
  }
  ctx.lineCap = 'butt';
  // Las variantes, como iconos en su casilla.
  trazo.variantes.forEach((variante, i) => {
    if (!variante) return;
    const c = centroCasilla(trazo.casillas[i].col, trazo.casillas[i].fila);
    ctx.fillStyle = 'rgba(18, 20, 26, 0.85)';
    circulo(c.x, c.y, 17);
    texto(ICONO[variante], c.x, c.y + 1, { tam: 17, color: COLOR.ambar, peso: 700 });
  });
}

const ICONO = {
  baches: '≋', x: '✕', chicaneIzquierda: '↰', chicaneDerecha: '↱', peralte: '◢', derrape: '∿', amplia: '◠'
};

/** La meta, la punta abierta (que late) y la casilla del error. */
function pintarMarcas(edicion, tiempo) {
  const { trazo, error } = edicion;
  const { casillas } = trazo;
  if (!casillas.length) return;
  if (!edicion.circuito) {
    // La meta: un damero a lo ancho, en el centro de su casilla.
    const r = rumbos(trazo)[0].sale ?? 0;
    const c = centroCasilla(casillas[0].col, casillas[0].fila);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(r * Math.PI / 2);
    for (let k = -4; k < 4; k++) {
      for (let columna = 0; columna < 2; columna++) {
        ctx.fillStyle = (k + columna + 8) % 2 ? '#e6e8ee' : '#12141a';
        ctx.fillRect(columna * 8 - 8, k * 8, 8, 8);
      }
    }
    ctx.restore();
  }
  if (!trazo.cerrado) {
    const ultima = centroCasilla(casillas.at(-1).col, casillas.at(-1).fila);
    const latido = 0.5 + 0.5 * Math.sin(tiempo * 6);
    ctx.strokeStyle = COLOR.ambar;
    ctx.globalAlpha = 0.5 + 0.5 * latido;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ultima.x, ultima.y, 22 + 6 * latido, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Y la meta, que es adonde hay que volver.
    if (casillas.length > 1) {
      const meta = casillas[0];
      ctx.strokeStyle = 'rgba(242, 205, 104, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(X0 + meta.col * CASILLA + 3, Y0 + meta.fila * CASILLA + 3, CASILLA - 6, CASILLA - 6);
      ctx.setLineDash([]);
    }
  }
  if (error && error.paso >= 0 && casillas[error.paso]) {
    const c = casillas[error.paso];
    ctx.strokeStyle = COLOR.rojo;
    ctx.lineWidth = 4;
    ctx.strokeRect(X0 + c.col * CASILLA + 4, Y0 + c.fila * CASILLA + 4, CASILLA - 8, CASILLA - 8);
  }
}

function pintarAyuda(cadena) {
  ctx.font = `600 14px ${FUENTE}`;
  const ancho = Math.min(ANCHO - 40, ctx.measureText(cadena).width + 40);
  ctx.fillStyle = COLOR.panel;
  rectanguloRedondo(ANCHO / 2 - ancho / 2, ALTO - 40, ancho, 30, 8);
  texto(cadena, ANCHO / 2, ALTO - 25, { tam: 14, color: COLOR.hud, peso: 600 });
}

/** El estado, en palabras: vacío, abierto, el error o listo. */
function estadoEnPalabras(edicion) {
  const { trazo, error } = edicion;
  if (!trazo.casillas.length) return { texto: t('constructor.vacio'), color: COLOR.texto };
  if (!trazo.cerrado) return { texto: t('constructor.abierto'), color: COLOR.ambar };
  if (error) return { texto: t('constructor.error.' + error.motivo), color: COLOR.rojo };
  return { texto: t(edicion.guardado && edicion.mio ? 'constructor.guardado' : 'constructor.cerrado'), color: COLOR.verde };
}

const TECLA_BOTON = { volver: 'ESC', deshacer: '⌫', borrar: 'SUPR', probar: 'ENTER', guardar: 'G' };

function pintarBarra(edicion, nombre, tactil) {
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ANCHO, BANDA_TEXTO);
  const activos = {
    volver: true,
    deshacer: edicion.historial.length > 0 || edicion.trazo.cerrado,
    borrar: edicion.trazo.casillas.length > 0,
    probar: listo(edicion),
    guardar: listo(edicion) && !(edicion.guardado && edicion.mio)
  };
  for (const caja of botonesConstructor()) {
    ctx.globalAlpha = activos[caja.id] ? 1 : 0.35;
    const etiqueta = t('constructor.' + caja.id);
    boton(caja, tactil ? etiqueta : `${TECLA_BOTON[caja.id]} · ${etiqueta}`, caja.id === 'probar' && activos.probar);
  }
  ctx.globalAlpha = 1;
  // El nombre y el estado, entre volver y los demás botones.
  const cajas = botonesConstructor();
  const x = (cajas[0].x + cajas[0].ancho + cajas[1].x) / 2;
  const { texto: estadoTexto, color } = estadoEnPalabras(edicion);
  texto(nombre, x, 19, { tam: 15, color: COLOR.hud, peso: 700 });
  texto(estadoTexto, x, 39, { tam: 12, color, peso: 600 });
}
