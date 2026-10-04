/*
 * Slot Panic — los efectos: chispas contra el muro, humo o polvo al derrapar
 * y confeti al ganar.
 *
 * Son presentación pura: no juegan y el arnés no los ejecuta, así que aquí sí
 * se usa `Math.random()`. Viven en `estado.particulas` con un tope, para que un
 * roce largo no llene la memoria.
 */

import { ANCHO } from './config.js';
import { ctx } from './nucleo/lienzo.js';

const MAXIMO = 500;
const COLOR_CHISPA = ['#fff1b8', '#ffd27a', '#ffb347', '#ff8a3c'];
const COLOR_CONFETI = ['#e05a63', '#f2cd68', '#88aede', '#4fbf7a', '#e6e8ee', '#ff9f5a'];
const CONFETI = 120;
const GRAVEDAD_CONFETI = 60;   // px/s²: cae despacio, como papel

/**
 * Chispas desde el punto de contacto: salen hacia atrás y a lo largo del muro,
 * con lo que lleva el coche, nunca hacia dentro del muro.
 */
export function emitirChispas(lista, contacto, vx, vy, cantidad) {
  for (let i = 0; i < cantidad; i++) {
    const dispersion = 0.6 + Math.random() * 0.6;
    const lateral = (Math.random() - 0.5) * 160;
    lista.push({
      tipo: 'chispa',
      x: contacto.x, y: contacto.y,
      vx: vx * dispersion - contacto.nx * 40 + -contacto.ny * lateral,
      vy: vy * dispersion - contacto.ny * 40 + contacto.nx * lateral,
      vida: 0.18 + Math.random() * 0.25,
      color: COLOR_CHISPA[Math.floor(Math.random() * COLOR_CHISPA.length)]
    });
  }
  recortar(lista);
}

/*
 * Cómo es cada clase de humo. El `polvo` de la grava es una nube tenue que se
 * abre deprisa, no bolas opacas (playtest: más densa que el humo se veía de
 * mentira). El del `motor` estropeado, más opaco y lento en abrirse.
 */
const HUMOS = {
  humo: { alfa: 0.35, crece: 14 },
  polvo: { alfa: 0.16, crece: 30 },
  motor: { alfa: 0.4, crece: 16 }
};

/** Una bocanada de humo (o polvo, o nieve: el color lo pone el escenario). */
export function emitirHumo(lista, x, y, color, clase = 'humo') {
  const { alfa, crece } = HUMOS[clase];
  lista.push({
    tipo: 'humo',
    x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4,
    vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
    r: 3 + Math.random() * 2,
    alfa,
    crece,   // px/s de radio
    vida: 0.6 + Math.random() * 0.4,
    color
  });
  recortar(lista);
}

/** Confeti desde arriba del lienzo, a lo ancho: al ganar. */
export function emitirConfeti(lista) {
  for (let i = 0; i < CONFETI; i++) {
    lista.push({
      tipo: 'confeti',
      x: Math.random() * ANCHO, y: -10 - Math.random() * 160,
      vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 60,
      giro: Math.random() * Math.PI * 2,
      vgiro: (Math.random() - 0.5) * 12,
      fase: Math.random() * Math.PI * 2,
      vida: 4 + Math.random() * 1.5,
      color: COLOR_CONFETI[Math.floor(Math.random() * COLOR_CONFETI.length)]
    });
  }
  recortar(lista);
}

function recortar(lista) {
  if (lista.length > MAXIMO) lista.splice(0, lista.length - MAXIMO);
}

export function actualizarParticulas(lista, dt) {
  for (const p of lista) {
    p.vida -= dt;
    if (p.tipo === 'confeti') {
      // Cae y se mece: el papel no frena como el humo.
      p.fase += 3 * dt;
      p.giro += p.vgiro * dt;
      p.vy = Math.min(p.vy + GRAVEDAD_CONFETI * dt, 120);
      p.x += (p.vx + Math.sin(p.fase) * 40) * dt;
      p.y += p.vy * dt;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const frena = Math.exp(-(p.tipo === 'chispa' ? 4 : 2) * dt);
    p.vx *= frena;
    p.vy *= frena;
    if (p.tipo === 'humo') p.r += p.crece * dt;
  }
  // Se filtra en el sitio: la lista es la de `estado` y otros la leen.
  let j = 0;
  for (const p of lista) if (p.vida > 0) lista[j++] = p;
  lista.length = j;
}

/** El humo va debajo del coche; las chispas, encima. */
export function dibujarHumo(lista) {
  for (const p of lista) {
    if (p.tipo !== 'humo') continue;
    ctx.fillStyle = p.color + (Math.min(1, p.vida) * p.alfa).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function dibujarChispas(lista) {
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const p of lista) {
    if (p.tipo !== 'chispa') continue;
    ctx.globalAlpha = Math.min(1, p.vida * 5);
    ctx.strokeStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** El confeti va encima de todo, también del cartel de fin. */
export function dibujarConfeti(lista) {
  for (const p of lista) {
    if (p.tipo !== 'confeti') continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.vida);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.giro);
    ctx.fillStyle = p.color;
    // Al girar en el aire se ve de canto: el ancho late con la fase.
    ctx.fillRect(-3, -2 * Math.abs(Math.cos(p.fase)) - 0.5, 6, 4 * Math.abs(Math.cos(p.fase)) + 1);
    ctx.restore();
  }
}
