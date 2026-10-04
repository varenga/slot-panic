'use strict';

// Aviso de cookies común de PNYK: Google Analytics 4 SOLO tras consentimiento.
//
// NO se edita en los proyectos: vive en pnyk (`comun/consentimiento.js`) y
// `tools/propagar.js` lo copia a `vendor/pnyk/` de cada repo.
//
// Qué hace en el navegador:
//   - gtag.js no se carga hasta que el visitante pulsa «Aceptar». Con «Rechazar»
//     no se carga nada de Google. Los dos botones pesan lo mismo (criterio AEPD).
//   - La elección se guarda en localStorage[clave] = 'granted' | 'denied' y no se
//     vuelve a preguntar. Cualquier elemento con el atributo data-pnyk-cookies
//     vuelve a abrir el aviso para cambiarla (retirar el consentimiento ha de ser
//     tan fácil como darlo: pon uno en el pie).
//   - En file://, localhost y 127.0.0.1 no hace nada: las pruebas no cuentan visitas.
//   - window.gtag solo existe tras aceptar: un evento('…') protegido con
//     `typeof gtag === 'function'` no hace nada mientras tanto.
//   - Pinta su propio aviso con estilos propios (prefijo pnyk-cc): no necesita CSS
//     del proyecto. Textos en es, en, pt, gl, ca, it y fr.
//
// Uso desde un generador en Node (lo habitual: va en línea en el <head>, así no
// depende de que vendor/ se sirva y no necesita ?v=):
//     const consentimiento = require('../vendor/pnyk/consentimiento.js');
//     consentimiento.snippet({ ga4: 'G-XXXX', lang: 'es' })   → '<script>…</script>'
//     consentimiento.botonCookies('es')                       → '<button … data-pnyk-cookies>Cookies</button>'
//
// Uso directo en una página:
//     <script src="vendor/pnyk/consentimiento.js"></script>
//     <script>PnykConsentimiento.iniciar({ ga4: 'G-XXXX' });</script>
//
// Opciones de iniciar() / snippet():
//   ga4         ID de medición de GA4 (obligatorio)
//   lang        idioma del aviso; por defecto el de <html lang>, y si no, es
//   privacidad  URL de la política; por defecto la común de pnyk.es
//   clave       clave de localStorage; por defecto 'pnyk-consent'
//   local       true = funcionar también en file:// y localhost (para probarlo)

(function (root) {
  const TEXTOS = {
    es: { etiqueta: 'Aviso de cookies', texto: '¿Nos dejas contar visitas? Usamos Google Analytics solo si aceptas; si no, todo funciona igual y no se carga nada.', mas: 'Más información', aceptar: 'Aceptar', rechazar: 'Rechazar', cookies: 'Cookies' },
    en: { etiqueta: 'Cookie notice', texto: 'May we count visits? We only use Google Analytics if you accept; if not, everything works the same and nothing is loaded.', mas: 'More information', aceptar: 'Accept', rechazar: 'Reject', cookies: 'Cookies' },
    pt: { etiqueta: 'Aviso de cookies', texto: 'Podemos contar as visitas? Só usamos o Google Analytics se aceitares; se não, tudo funciona igual e nada é carregado.', mas: 'Mais informação', aceptar: 'Aceitar', rechazar: 'Recusar', cookies: 'Cookies' },
    gl: { etiqueta: 'Aviso de cookies', texto: 'Déixasnos contar as visitas? Só usamos Google Analytics se aceptas; se non, todo funciona igual e non se carga nada.', mas: 'Máis información', aceptar: 'Aceptar', rechazar: 'Rexeitar', cookies: 'Cookies' },
    ca: { etiqueta: 'Avís de galetes', texto: 'Ens deixes comptar les visites? Només fem servir Google Analytics si acceptes; si no, tot funciona igual i no es carrega res.', mas: 'Més informació', aceptar: 'Acceptar', rechazar: 'Rebutjar', cookies: 'Galetes' },
    it: { etiqueta: 'Avviso sui cookie', texto: 'Possiamo contare le visite? Usiamo Google Analytics solo se accetti; altrimenti tutto funziona allo stesso modo e non viene caricato nulla.', mas: 'Maggiori informazioni', aceptar: 'Accetta', rechazar: 'Rifiuta', cookies: 'Cookie' },
    fr: { etiqueta: 'Avis sur les cookies', texto: 'Pouvons-nous compter les visites ? Nous n’utilisons Google Analytics que si vous acceptez ; sinon, tout fonctionne pareil et rien n’est chargé.', mas: 'En savoir plus', aceptar: 'Accepter', rechazar: 'Refuser', cookies: 'Cookies' },
  };

  // La política común de pnyk.es solo existe en castellano e inglés: gallego y
  // catalán van a la castellana, el resto a la inglesa.
  const privacidadPorDefecto = lang => ['es', 'gl', 'ca'].includes(lang)
    ? 'https://pnyk.es/privacidad/#juegos'
    : 'https://pnyk.es/en/privacy/#games';

  const textos = lang => TEXTOS[lang] || TEXTOS.es;

  const esc = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ── Navegador ──────────────────────────────────────────────────────────────
  const CSS = '.pnyk-cc{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:2147483000;max-width:40rem;margin:0 auto;padding:1rem 1.25rem;box-sizing:border-box;display:grid;gap:.75rem;background:#12161e;color:#e6e9ef;border:1px solid #2a3140;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.45);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:left}'
    + '.pnyk-cc[hidden]{display:none}.pnyk-cc p{margin:0}.pnyk-cc a{color:#8fd3ff}'
    + '.pnyk-cc-acciones{display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap}'
    + '.pnyk-cc button{font:inherit;font-weight:600;cursor:pointer;padding:.5em 1.2em;border-radius:8px;border:1px solid #8fd3ff;background:transparent;color:#e6e9ef}'
    + '.pnyk-cc button:hover,.pnyk-cc button:focus-visible{background:#8fd3ff;color:#0b0d12}'
    + '@media (min-width:40rem){.pnyk-cc{grid-template-columns:1fr auto;align-items:center}}';

  let opciones = null, aviso = null, cargado = false;

  function guardado() { try { return localStorage.getItem(opciones.clave); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(opciones.clave, v); } catch (e) { /* modo privado */ } }

  function cargarGA() {
    if (cargado) return; cargado = true;
    root.dataLayer = root.dataLayer || [];
    // gtag.js necesita el objeto arguments tal cual, no un array.
    root.gtag = function () { root.dataLayer.push(arguments); };
    root.gtag('js', new Date());
    root.gtag('config', opciones.ga4);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(opciones.ga4);
    document.head.appendChild(s);
  }

  function crearAviso() {
    if (aviso) return aviso;
    const t = textos(opciones.lang);
    const estilo = document.createElement('style');
    estilo.textContent = CSS;
    document.head.appendChild(estilo);
    aviso = document.createElement('div');
    aviso.className = 'pnyk-cc';
    aviso.setAttribute('role', 'region');
    aviso.setAttribute('aria-label', t.etiqueta);
    aviso.hidden = true;
    aviso.innerHTML = '<p>' + esc(t.texto) + ' <a href="' + esc(opciones.privacidad) + '" target="_blank" rel="noopener">' + esc(t.mas) + '</a></p>'
      + '<div class="pnyk-cc-acciones"><button type="button" data-v="denied">' + esc(t.rechazar) + '</button>'
      + '<button type="button" data-v="granted">' + esc(t.aceptar) + '</button></div>';
    aviso.addEventListener('click', e => {
      const v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (v) elegir(v);
    });
    document.body.appendChild(aviso);
    return aviso;
  }

  function elegir(v) {
    guardar(v);
    if (v === 'granted') cargarGA();
    if (aviso) aviso.hidden = true;
    // Retirar el consentimiento: GA ya cargado no se descarga en caliente; al
    // recargar ya no se carga. Sus cookies las borra el navegador o el usuario.
  }

  function abrir() { if (opciones) crearAviso().hidden = false; }

  function enDom(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function iniciar(o) {
    if (opciones || typeof document === 'undefined') return;
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (!o || !o.ga4 || (local && !o.local)) return;
    const lang = o.lang || (document.documentElement.lang || 'es').slice(0, 2).toLowerCase();
    opciones = {
      ga4: o.ga4, lang,
      privacidad: o.privacidad || privacidadPorDefecto(lang),
      clave: o.clave || 'pnyk-consent',
    };
    const v = guardado();
    if (v === 'granted') cargarGA();
    enDom(() => {
      document.addEventListener('click', e => {
        const el = e.target.closest && e.target.closest('[data-pnyk-cookies]');
        if (el) { e.preventDefault(); abrir(); }
      });
      if (v !== 'granted' && v !== 'denied') abrir();
    });
  }

  const estado = () => (opciones ? guardado() : null);

  // ── Node (generadores) ─────────────────────────────────────────────────────
  // Este mismo fichero, en línea, seguido de la llamada a iniciar().
  function snippet(o) {
    if (!o || !/^G-[A-Z0-9]+$/.test(o.ga4 || '')) throw new Error('consentimiento.snippet: ga4 inválido');
    // Sin los comentarios de línea completa (no hacen falta en la página) y con
    // "</script" escapado, que cerraría la etiqueta antes de tiempo.
    const fuente = require('fs').readFileSync(__filename, 'utf8').replace(/\r\n/g, '\n')
      .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
      .replace(/<\/script/gi, '<\\/script').trim();
    const conf = JSON.stringify({ ga4: o.ga4, lang: o.lang, privacidad: o.privacidad, clave: o.clave });
    return `<script>\n${fuente}\nPnykConsentimiento.iniciar(${conf});\n</script>`;
  }

  // Botón para el pie que vuelve a abrir el aviso.
  function botonCookies(lang, clase) {
    return `<button type="button" data-pnyk-cookies${clase ? ` class="${esc(clase)}"` : ''}>${esc(textos(lang).cookies)}</button>`;
  }

  const api = { iniciar, abrir, estado, snippet, botonCookies, textos, TEXTOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PnykConsentimiento = api;
})(typeof window !== 'undefined' ? window : this);
