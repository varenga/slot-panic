/*
 * Slot Panic — la galería de circuitos públicos.
 *
 * Una página de 12 tarjetas (4 × 3 en la mesa, 2 × 6 en la lupa), cada una
 * con la miniatura del trazado, el nombre (en el idioma de quien mira), el
 * alias y cuántos lo han jugado. Arriba, volver, el orden y construir; abajo,
 * las páginas. En cada tarjeta, una esquina: borrar lo propio o denunciar lo
 * ajeno (las dos piden un segundo toque).
 *
 * Las miniaturas son el trazo aproximado del constructor (rectas y cuartos de
 * círculo por casilla): construir doce circuitos de verdad costaría décimas
 * de segundo en el móvil. Presentación: no toca el DOM ni la red.
 */

import { COLOR } from './config.js';
import { ctx, polilinea, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { CASILLA, COLUMNAS, deCodigo, FILAS, X0, Y0 } from './nucleo/cuadricula.js';
import { deTrazado } from './nucleo/trazo.js';
import { ejeTrazo } from './constructor.js';
import { boton } from './pantalla.js';
import { nombreCompuesto, t } from './i18n.js';

const BARRA = 56, PIE = 56, MARGEN = 14, HUECO = 12;
const ejes = new Map();   // código → la polilínea de su miniatura (o null si no se lee)

function ejeDe(codigo) {
  if (!ejes.has(codigo)) {
    const trazado = deCodigo(codigo);
    ejes.set(codigo, trazado ? ejeTrazo(deTrazado(trazado)) : null);
  }
  return ejes.get(codigo);
}

/* Las cajas: la barra, las tarjetas (con su esquina) y el pie. Dibujo y pulsación. */
export function cajasGaleria({ ancho, alto }, cuantas) {
  const columnas = ancho > 800 ? 4 : 2, filas = 12 / columnas;
  const barra = [];
  const anchoBoton = Math.min(220, (ancho - 2 * MARGEN - 2 * HUECO) / 3);
  ['volver', 'orden', 'construir'].forEach((id, i) => {
    const x = i === 0 ? MARGEN : i === 2 ? ancho - MARGEN - anchoBoton : ancho / 2 - anchoBoton / 2;
    barra.push({ id, x, y: (BARRA - 36) / 2, ancho: anchoBoton, alto: 36 });
  });
  const anchoTarjeta = (ancho - 2 * MARGEN - (columnas - 1) * HUECO) / columnas;
  const altoTarjeta = (alto - BARRA - PIE - 2 * MARGEN - (filas - 1) * HUECO) / filas;
  const tarjetas = [];
  for (let i = 0; i < Math.min(cuantas, 12); i++) {
    const x = MARGEN + (i % columnas) * (anchoTarjeta + HUECO);
    const y = BARRA + MARGEN + Math.floor(i / columnas) * (altoTarjeta + HUECO);
    tarjetas.push({ id: 'tarjeta', i, x, y, ancho: anchoTarjeta, alto: altoTarjeta });
    tarjetas.push({ id: 'esquina', i, x: x + anchoTarjeta - 44, y: y + 6, ancho: 38, alto: 32 });
  }
  const pie = [
    { id: 'anterior', x: MARGEN, y: alto - PIE + 8, ancho: 120, alto: 40 },
    { id: 'siguiente', x: ancho - MARGEN - 120, y: alto - PIE + 8, ancho: 120, alto: 40 }
  ];
  return [...barra, ...tarjetas, ...pie];
}

/*
 * `vista`: { ancho, alto } del lienzo. `galeria`: la de publicos.js.
 * `propios`: los id publicados desde este dispositivo. `pendiente`: la
 * esquina que espera el segundo toque ({ i }). `aviso`: { texto, color, vida }.
 */
export function dibujarGaleria(vista, { galeria, propios, pendiente, aviso }) {
  const { ancho, alto } = vista;
  // Algo más claro que la página: que se vea dónde acaba el lienzo.
  ctx.fillStyle = '#1b1e27';
  ctx.fillRect(0, 0, ancho, alto);
  const lista = galeria.lista || [];
  const cajas = cajasGaleria(vista, lista.length);
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ancho, BARRA);
  ctx.fillRect(0, alto - PIE, ancho, PIE);

  for (const caja of cajas) {
    if (caja.id === 'volver') boton(caja, t('galeria.volver'), false, 15);
    else if (caja.id === 'orden') boton(caja, t(galeria.orden === 'jugados' ? 'galeria.jugados' : 'galeria.nuevos'), false, 15);
    else if (caja.id === 'construir') boton(caja, t('galeria.construir'), true, 15);
    else if (caja.id === 'tarjeta') tarjeta(caja, lista[caja.i], propios.has(lista[caja.i].id));
    else if (caja.id === 'esquina') esquina(caja, propios.has(lista[caja.i].id), pendiente?.i === caja.i);
    else if (caja.id === 'anterior') {
      ctx.globalAlpha = galeria.pagina > 0 ? 1 : 0.35;
      boton(caja, '◀', false, 18);
    } else if (caja.id === 'siguiente') {
      ctx.globalAlpha = galeria.mas ? 1 : 0.35;
      boton(caja, '▶', false, 18);
    }
    ctx.globalAlpha = 1;
  }
  texto(t('galeria.pagina', { n: galeria.pagina + 1 }), ancho / 2, alto - PIE / 2, { tam: 15, color: COLOR.texto, peso: 600 });

  // Lo que se ve en vez de tarjetas: cargando, sin red o vacía.
  const vacio = galeria.lista === null ? 'galeria.cargando' : galeria.error ? 'galeria.sinRed' : lista.length ? null : 'galeria.vacia';
  if (vacio) texto(t(vacio), ancho / 2, alto / 2, { tam: 20, color: COLOR.hud, peso: 600 });

  if (aviso) {
    ctx.globalAlpha = Math.min(1, aviso.vida / 0.4);
    ctx.fillStyle = COLOR.velo;
    rectanguloRedondo(ancho / 2 - Math.min(220, ancho / 2 - 10), BARRA + 10, Math.min(440, ancho - 20), 38, 8);
    texto(aviso.texto, ancho / 2, BARRA + 29, { tam: 17, color: aviso.color, peso: 700 });
    ctx.globalAlpha = 1;
  }
}

function tarjeta(caja, circuito, propio) {
  ctx.fillStyle = 'rgba(43, 48, 64, 0.9)';
  rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 8);
  // La miniatura: la cuadrícula entera, encajada arriba con su proporción.
  const texto2 = Math.max(34, caja.alto * 0.3);
  const caben = { ancho: caja.ancho - 20, alto: caja.alto - texto2 - 14 };
  const escala = Math.min(caben.ancho / (COLUMNAS * CASILLA), caben.alto / (FILAS * CASILLA));
  const ox = caja.x + (caja.ancho - COLUMNAS * CASILLA * escala) / 2, oy = caja.y + 10;
  const eje = ejeDe(circuito.codigo);
  if (eje) {
    const puntos = eje.map((p) => ({ x: ox + (p.x - X0) * escala, y: oy + (p.y - Y0) * escala }));
    ctx.lineJoin = 'round';
    // Más clara que la tarjeta, con la línea de los carriles encima.
    for (const [color, grosor] of [['#5b6278', Math.max(4, 64 * escala)], [COLOR.hud, 1]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = grosor;
      polilinea(puntos, true);
    }
  }
  const tam = Math.max(11, Math.min(15, caja.alto * 0.09));
  const yTexto = caja.y + caja.alto - texto2 + tam * 0.4;
  texto(nombreCompuesto(circuito.adjetivo, circuito.sustantivo), caja.x + caja.ancho / 2, yTexto, { tam, color: COLOR.hud, peso: 800 });
  const linea = `${circuito.alias} · ${t('galeria.jugado', { n: circuito.jugado })}`;
  texto(propio ? `${t('galeria.tuyo')} · ${linea}` : linea, caja.x + caja.ancho / 2, yTexto + tam * 1.35,
    { tam: tam - 2, color: propio ? COLOR.ambar : COLOR.texto, peso: 600 });
}

/** La esquina: ✕ borra lo propio, ⚑ denuncia lo ajeno. En rojo, esperando el segundo toque. */
function esquina(caja, propio, pendiente) {
  ctx.fillStyle = pendiente ? COLOR.rojo : 'rgba(18, 20, 26, 0.6)';
  rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 6);
  texto(propio ? '✕' : '⚑', caja.x + caja.ancho / 2, caja.y + caja.alto / 2 + 1, { tam: 16, color: COLOR.hud, peso: 700 });
}

// --- CIRCUITOS: la galería o el constructor ------------------------------------

/*
 * Lo que abre la opción CIRCUITOS de la portada: dos botones grandes, uno al
 * lado del otro en la mesa y uno encima del otro en la lupa. Dibujo y pulsación.
 */
export function cajasCircuitos({ ancho, alto }) {
  const volver = { id: 'volver', x: MARGEN, y: (BARRA - 36) / 2, ancho: Math.min(220, ancho / 3), alto: 36 };
  const enFila = ancho > 800;
  const b = enFila ? { ancho: 380, alto: 220 } : { ancho: ancho - 2 * 40, alto: 200 };
  const centroY = (BARRA + alto) / 2;
  const cajas = ['galeria', 'construir'].map((id, i) => enFila
    ? { id, x: ancho / 2 + (i ? 20 : -20 - b.ancho), y: centroY - b.alto / 2, ...b }
    : { id, x: (ancho - b.ancho) / 2, y: centroY + (i ? 20 : -20 - b.alto), ...b });
  return [volver, ...cajas];
}

export function dibujarCircuitos(vista, tactil) {
  const { ancho, alto } = vista;
  ctx.fillStyle = '#1b1e27';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ancho, BARRA);
  texto(t('circuitos.titulo'), ancho / 2, BARRA / 2 + 1, { tam: 22, color: COLOR.hud, peso: 800 });
  for (const caja of cajasCircuitos(vista)) {
    if (caja.id === 'volver') {
      boton(caja, t('galeria.volver'), false, 15);
      continue;
    }
    const destacado = caja.id === 'construir';
    ctx.fillStyle = destacado ? COLOR.ambar : 'rgba(43, 48, 64, 0.95)';
    rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 12);
    const color = destacado ? COLOR.fondo : COLOR.hud;
    const tecla = tactil ? '' : (caja.id === 'galeria' ? 'G · ' : 'B · ');
    texto(tecla + t('circuitos.' + caja.id), caja.x + caja.ancho / 2, caja.y + caja.alto / 2 - 18, { tam: 34, color, peso: 800 });
    texto(t('circuitos.' + caja.id + 'Ayuda'), caja.x + caja.ancho / 2, caja.y + caja.alto / 2 + 30,
      { tam: 15, color: destacado ? COLOR.fondo : COLOR.texto, peso: 600 });
  }
}
