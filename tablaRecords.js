/*
 * Slot Panic — la tabla de récords de un circuito y la firma.
 *
 *   RÉCORDS  los 10 mejores (puesto, alias, vuelta y carril), tu mejor vuelta
 *            y contra qué fantasma se corre (el tuyo, el del récord o ninguno)
 *   FIRMA    al acabar una carrera con una vuelta que entra en la tabla: el
 *            alias de 3 letras (con ▲▼ o tecleado), FIRMAR o NO, GRACIAS
 *
 * En la mesa y en la lupa (`vista`: { ancho, alto }). Presentación: no toca el
 * DOM ni la red. Las cajas sirven al dibujo y a la pulsación.
 */

import { COLOR } from './config.js';
import { ctx, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { formatearTiempo } from './nucleo/slot.js';
import { boton } from './pantalla.js';
import { t } from './i18n.js';
import { TOP } from './records.js';

const BARRA = 56, MARGEN = 14;

// --- RÉCORDS -----------------------------------------------------------------------

export function cajasRecords({ ancho }) {
  const anchoBoton = Math.min(240, (ancho - 3 * MARGEN) / 2);
  return [
    { id: 'volver', x: MARGEN, y: (BARRA - 36) / 2, ancho: Math.min(180, anchoBoton), alto: 36 },
    { id: 'fantasma', x: ancho - MARGEN - anchoBoton, y: (BARRA - 36) / 2, ancho: anchoBoton, alto: 36 }
  ];
}

/*
 * `tabla`: la de records.js. `mejor`: tu mejor vuelta ({ tiempo }) o null.
 * `resaltado`: el puesto que se acaba de firmar (parpadea), o null.
 */
export function dibujarRecords(vista, { nombre, tabla, mejor, tipoFantasma, resaltado, desdeFin, tiempo }) {
  const { ancho, alto } = vista;
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ancho, BARRA);
  for (const caja of cajasRecords(vista)) {
    if (caja.id === 'volver') boton(caja, t(desdeFin ? 'records.seguir' : 'galeria.volver'), desdeFin, 15);
    else boton(caja, t('records.fantasma', { v: t('records.fantasma.' + tipoFantasma) }), false, 14);
  }
  const x = ancho / 2;
  texto(t('records.titulo'), x, BARRA + 40, { tam: 26, color: COLOR.hud, peso: 800 });
  texto(nombre, x, BARRA + 72, { tam: 16, color: COLOR.ambar, peso: 700 });

  const fila = Math.min(34, (alto - BARRA - 190) / TOP);
  const y0 = BARRA + 112;
  const mitad = Math.min(300, ancho / 2 - 30);
  const { lista, error } = tabla;
  if (!lista?.length) {
    const clave = lista === null ? 'records.cargando' : error ? 'records.sinRed' : 'records.vacia';
    texto(t(clave), x, y0 + fila * 3, { tam: 17, color: COLOR.texto, peso: 600 });
  } else {
    lista.forEach((r, i) => {
      const y = y0 + i * fila;
      const suyo = resaltado === i + 1;
      if (suyo && Math.floor(tiempo * 3) % 2) return;   // la recién firmada parpadea
      const color = suyo ? COLOR.ambar : i === 0 ? COLOR.hud : COLOR.texto;
      texto(`${i + 1}.`, x - mitad, y, { tam: 17, color, peso: 700, alinear: 'left' });
      texto(r.alias, x - mitad + 50, y, { tam: 17, color, peso: 800, alinear: 'left' });
      texto(t('records.carril', { n: r.carril + 1 }), x + mitad * 0.25, y, { tam: 13, color: COLOR.texto, peso: 500 });
      texto(formatearTiempo(r.vuelta / 1000), x + mitad, y, { tam: 17, color, peso: 800, alinear: 'right' });
    });
    if (error) texto(t('records.sinRed'), x, y0 + TOP * fila + 4, { tam: 12, color: COLOR.texto, peso: 500 });
  }
  if (mejor) {
    texto(t('portada.tuMejor', { tiempo: formatearTiempo(mejor.tiempo) }), x, alto - 34, { tam: 16, color: COLOR.ambar, peso: 700 });
  }
}

// --- FIRMA -------------------------------------------------------------------------

export function cajasFirma({ ancho, alto }) {
  const cx = ancho / 2, cy = alto / 2;
  const cajas = [];
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * 80;
    cajas.push({ id: 'arriba', i, x: x - 32, y: cy - 70, ancho: 64, alto: 36 });
    cajas.push({ id: 'abajo', i, x: x - 32, y: cy + 46, ancho: 64, alto: 36 });
  }
  const anchoBoton = Math.min(200, (ancho - 60) / 2);
  cajas.push({ id: 'firmar', x: cx - anchoBoton - 8, y: cy + 110, ancho: anchoBoton, alto: 48 });
  cajas.push({ id: 'saltar', x: cx + 8, y: cy + 110, ancho: anchoBoton, alto: 48 });
  return cajas;
}

export function dibujarFirma(vista, { vuelta, letras, cursor, tactil, enviando }) {
  const { ancho, alto } = vista;
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ancho, alto);
  const cx = ancho / 2, cy = alto / 2;
  texto(t('firma.titulo'), cx, cy - 170, { tam: 34, color: COLOR.verde, peso: 800 });
  texto(t('firma.vuelta', { tiempo: formatearTiempo(vuelta.tiempo) }), cx, cy - 124, { tam: 18, color: COLOR.hud, peso: 700 });
  if (enviando) {
    texto(t('firma.enviando'), cx, cy, { tam: 22, color: COLOR.hud, peso: 700 });
    return;
  }
  letras.forEach((letra, i) => {
    const x = cx + (i - 1) * 80;
    ctx.fillStyle = 'rgba(230, 232, 238, 0.08)';
    rectanguloRedondo(x - 32, cy - 26, 64, 64, 8);
    texto(letra, x, cy + 6, { tam: 46, color: !tactil && cursor === i ? COLOR.ambar : COLOR.hud, peso: 800 });
  });
  for (const caja of cajasFirma(vista)) {
    const etiqueta = caja.id === 'arriba' ? '▲' : caja.id === 'abajo' ? '▼' : t('firma.' + caja.id);
    boton(caja, etiqueta, caja.id === 'firmar', 18);
  }
  if (!tactil) texto(t('firma.teclado'), cx, cy + 186, { tam: 13, color: COLOR.texto, peso: 500 });
}
