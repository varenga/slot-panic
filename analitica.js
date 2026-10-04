/*
 * Google Analytics 4, SOLO tras consentimiento: lo decide el aviso de cookies
 * común de PNYK (vendor/pnyk/consentimiento.js, cargado con <script> en
 * index.html), que carga gtag.js cuando el jugador acepta. El botón «Cookies»
 * de index.html vuelve a abrirlo. La política de privacidad es la común de
 * pnyk.es. Nunca cargar gtag.js directamente.
 *
 * No se inicia en DEPURACION (ni, por el propio aviso, en file:// o localhost):
 * cada prueba contaría como una visita. Ni en la app de las tiendas (APP.md
 * §5.2): dentro no se recoge nada, y así lo declara la ficha. Mientras no haya consentimiento no
 * existe window.gtag y evento() no hace nada.
 */
import { DEPURACION, enApp } from './config.js';
import { idiomaActual } from './i18n.js';

// La propiedad de GA4 de Slot Panic (nunca la de Race Panic). La declara
// también su ficha de pnyk/proyectos.js (`privacy`), que es la que la política
// común de pnyk.es enumera.
const GA4_ID = 'G-LWMERSV8WH';

export function cargarAnalitica() {
  if (!GA4_ID || DEPURACION || enApp() || typeof window === 'undefined' || !window.PnykConsentimiento) return;
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
