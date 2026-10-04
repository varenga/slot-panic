/*
 * Slot Panic — el lienzo: el contexto de dibujo y las primitivas compartidas.
 *
 * Como en Rail Panic, existe para que `dibujo.js` (el mundo) y `pantalla.js`
 * (la interfaz) usen las mismas herramientas sin importarse el uno al otro.
 * `ctx` se exporta como `let`: los módulos ES importan enlaces vivos, así que
 * quien lo importa ve el valor real en cuanto `iniciarLienzo()` lo asigna, y
 * ningún módulo toca el DOM al cargarse.
 */

import { FUENTE } from '../config.js';

export let ctx = null;

export function iniciarLienzo(lienzo) {
  ctx = lienzo.getContext('2d');
}

/*
 * Una capa fuera de pantalla, para lo que no cambia de un fotograma a otro (el
 * suelo, el decorado y la pista): se pinta una vez y luego se copia entera.
 */
export function crearCapa(ancho, alto) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(ancho, alto);
  const capa = document.createElement('canvas');
  capa.width = ancho;
  capa.height = alto;
  return capa;
}

/** Ejecuta `dibujarlo` con `ctx` apuntando a la capa, y lo devuelve después. */
export function dibujarEn(capa, dibujarlo) {
  const anterior = ctx;
  ctx = capa.getContext('2d');
  try {
    dibujarlo();
  } finally {
    ctx = anterior;
  }
}

export function circulo(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Rectángulo de esquinas redondeadas, relleno. */
export function rectanguloRedondo(x, y, ancho, alto, radio) {
  ctx.beginPath();
  ctx.roundRect(x, y, ancho, alto, radio);
  ctx.fill();
}

export function polilinea(puntos, cerrada = true) {
  ctx.beginPath();
  ctx.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) ctx.lineTo(puntos[i].x, puntos[i].y);
  if (cerrada) ctx.closePath();
  ctx.stroke();
}

export function poligono(puntos) {
  ctx.beginPath();
  ctx.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) ctx.lineTo(puntos[i].x, puntos[i].y);
  ctx.closePath();
  ctx.fill();
}

/** Texto en la fuente del juego. `tam` en px lógicos. */
export function texto(cadena, x, y, { tam = 18, color = '#fff', alinear = 'center', peso = 600, base = 'middle' } = {}) {
  ctx.font = `${peso} ${tam}px ${FUENTE}`;
  ctx.fillStyle = color;
  ctx.textAlign = alinear;
  ctx.textBaseline = base;
  ctx.fillText(cadena, x, y);
}
