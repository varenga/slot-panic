/*
 * Google Analytics 4, SOLO tras consentimiento: lo decide el aviso de cookies
 * común de PNYK (vendor/pnyk/consentimiento.js, cargado con <script> en
 * index.html), que carga gtag.js cuando el jugador acepta. El botón «Cookies»
 * de index.html vuelve a abrirlo. La política de privacidad es la común de
 * pnyk.es. Nunca cargar gtag.js directamente.
 *
 * No se inicia en DEPURACION (ni, por el propio aviso, en file:// o localhost):
 * cada prueba contaría como una visita. Mientras no haya consentimiento no
 * existe window.gtag y evento() no hace nada.
 */
import { DEPURACION } from './config.js';
import { idiomaActual } from './i18n.js';

// Vacío hasta que Slot Panic tenga su propiedad de GA4: sin ella no se inicia
// nada (ni el aviso de cookies). No reutilizar la de Race Panic.
const GA4_ID = '';

export function cargarAnalitica() {
  if (!GA4_ID || DEPURACION || typeof window === 'undefined' || !window.PnykConsentimiento) return;
  window.PnykConsentimiento.iniciar({ ga4: GA4_ID, lang: idiomaActual().codigo });
}

/** Un evento con sus parámetros; nunca rompe el juego. */
export function evento(nombre, parametros = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', nombre, parametros);
    }
  } catch {
    // La analítica no puede parar una carrera.
  }
}
