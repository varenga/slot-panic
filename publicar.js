/*
 * Slot Panic — el diálogo de compartir y publicar, encima del constructor.
 *
 *   menu      copiar el enlace (?c=) o publicar en la galería
 *   normas    la primera vez: lo que se acepta al publicar (Play las pide)
 *   publicar  el nombre (al azar, con «otro») y el alias de 3 letras
 *   enviando  esperando a api.php
 *
 * Presentación, como pantalla.js: no toca el DOM ni la red. Lo que pasa al
 * pulsar lo decide juego.js. Las cajas se definen una vez y sirven al dibujo
 * y a la pulsación.
 */

import { ANCHO, ALTO, COLOR } from './config.js';
import { ctx, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { boton } from './pantalla.js';
import { nombreCompuesto, t } from './i18n.js';

export const LETRAS_ALIAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ADJETIVOS = 16, SUSTANTIVOS = 16;   // los de api.php (el arnés los compara con i18n.js)
const NORMAS = 4;
const PANEL = { ancho: 680, alto: 420 };

export function crearDialogo(alias) {
  const dialogo = { paso: 'menu', alias: alias.split(''), adjetivo: 0, sustantivo: 0 };
  otroNombre(dialogo);
  return dialogo;
}

/** Otro nombre al azar, distinto del que había. Presentación: vale Math.random(). */
export function otroNombre(dialogo) {
  const antes = dialogo.adjetivo * SUSTANTIVOS + dialogo.sustantivo;
  let n = antes;
  while (n === antes) n = Math.floor(Math.random() * ADJETIVOS * SUSTANTIVOS);
  dialogo.adjetivo = Math.floor(n / SUSTANTIVOS);
  dialogo.sustantivo = n % SUSTANTIVOS;
}

/** Arriba, la letra siguiente; abajo, la anterior. */
export function cambiarLetra(dialogo, i, paso) {
  const n = LETRAS_ALIAS.length;
  dialogo.alias[i] = LETRAS_ALIAS[(LETRAS_ALIAS.indexOf(dialogo.alias[i]) + paso + n) % n];
}

/** Con el teclado: escribe y pasa a la siguiente; con la última, vuelve a la primera. */
export function escribirLetra(dialogo, letra) {
  dialogo.cursor = dialogo.cursor ?? 0;
  dialogo.alias[dialogo.cursor] = letra;
  dialogo.cursor = (dialogo.cursor + 1) % dialogo.alias.length;
}

const x0 = ANCHO / 2 - PANEL.ancho / 2, y0 = ALTO / 2 - PANEL.alto / 2;

/* Las cajas de cada paso: botones abajo y, al publicar, las flechas de cada letra y «otro». */
export function cajasDialogo(dialogo) {
  const abajo = y0 + PANEL.alto - 70;
  const fila = (ids, y = abajo, ancho = 200) => {
    const hueco = 16;
    const xi = ANCHO / 2 - (ids.length * ancho + (ids.length - 1) * hueco) / 2;
    return ids.map((id, i) => ({ id, x: xi + i * (ancho + hueco), y, ancho, alto: 46 }));
  };
  if (dialogo.paso === 'menu') {
    return [...fila(['enlace', 'publicar'], y0 + 150, 280), ...fila(['cancelar'])];
  }
  if (dialogo.paso === 'normas') return fila(['aceptar', 'cancelar']);
  if (dialogo.paso === 'publicar') {
    const cajas = [{ id: 'otro', x: ANCHO / 2 - 110, y: y0 + 128, ancho: 220, alto: 36 }];
    dialogo.alias.forEach((_, i) => {
      const cx = ANCHO / 2 + (i - 1) * 76;
      cajas.push({ id: 'arriba', i, x: cx - 30, y: y0 + 196, ancho: 60, alto: 32 });
      cajas.push({ id: 'abajo', i, x: cx - 30, y: y0 + 290, ancho: 60, alto: 32 });
    });
    return [...cajas, ...fila(['enviar', 'cancelar'])];
  }
  return [];
}

const ETIQUETA = {
  enlace: 'publicar.enlace', publicar: 'publicar.galeria', cancelar: 'publicar.cancelar', aceptar: 'publicar.aceptar',
  otro: 'publicar.otro', enviar: 'publicar.enviar'
};

export function dibujarDialogo(dialogo, tactil) {
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  // Opaco: encima de la pista, los textos pequeños no se leían.
  ctx.fillStyle = '#1b1e27';
  rectanguloRedondo(x0, y0, PANEL.ancho, PANEL.alto, 12);
  const x = ANCHO / 2;
  const titulo = (clave) => texto(t(clave), x, y0 + 44, { tam: 26, color: COLOR.hud, peso: 800 });

  if (dialogo.paso === 'menu') {
    titulo('publicar.titulo');
    texto(t('publicar.menuAyuda'), x, y0 + 100, { tam: 15, color: COLOR.texto, peso: 500 });
  } else if (dialogo.paso === 'normas') {
    titulo('publicar.normasTitulo');
    for (let i = 0; i < NORMAS; i++) {
      texto('· ' + t('publicar.norma.' + i), x0 + 44, y0 + 104 + i * 46, { tam: 16, color: COLOR.hud, peso: 500, alinear: 'left' });
    }
  } else if (dialogo.paso === 'publicar') {
    titulo('publicar.publicarTitulo');
    texto(nombreCompuesto(dialogo.adjetivo, dialogo.sustantivo), x, y0 + 100, { tam: 28, color: COLOR.ambar, peso: 800 });
    texto(t('publicar.alias'), x, y0 + 184, { tam: 13, color: COLOR.texto, peso: 600 });
    dialogo.alias.forEach((letra, i) => {
      const cx = x + (i - 1) * 76;
      ctx.fillStyle = 'rgba(230, 232, 238, 0.08)';
      rectanguloRedondo(cx - 30, y0 + 232, 60, 54, 6);
      const activa = !tactil && (dialogo.cursor ?? 0) === i;
      texto(letra, cx, y0 + 260, { tam: 40, color: activa ? COLOR.ambar : COLOR.hud, peso: 800 });
    });
    if (!tactil) texto(t('publicar.teclado'), x, y0 + PANEL.alto - 90, { tam: 12, color: COLOR.texto, peso: 500 });
  } else {
    titulo('publicar.enviando');
  }

  for (const caja of cajasDialogo(dialogo)) {
    const etiqueta = caja.id === 'arriba' ? '▲' : caja.id === 'abajo' ? '▼' : t(ETIQUETA[caja.id]);
    boton(caja, etiqueta, caja.id === 'publicar' || caja.id === 'enviar' || caja.id === 'aceptar', 16);
  }
}
