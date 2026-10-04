'use strict';

// Pie común de la red PNYK: enlaces de un proyecto a los demás.
//
// NO se edita en los proyectos: vive en pnyk (`comun/pie.js`) y
// `tools/propagar.js` lo copia a `vendor/pnyk/` de cada repo. Los datos salen
// de `red.js`, que genera el `tools/gen-pages.js` de pnyk desde `proyectos.js`.
//
// Script clásico, sin dependencias: lo puede usar un generador en Node
//     const { pieRed } = require('../vendor/pnyk/pie.js');
// o una página con <script src="vendor/pnyk/red.js"> + <script src="vendor/pnyk/pie.js">.
//
// pieRed({ slug, grupo, pnyk }) → HTML con los enlaces separados por " · ".
//   slug   el proyecto que pinta el pie: se excluye de la lista
//   grupo  'panic' (por defecto: la familia Panic, primero la saga por sagaOrder y
//          después los demás juegos Panic en el orden de proyectos.js) |
//          'saga' (solo la saga, por sagaOrder) |
//          'todos' (saga y después todo lo demás, en el orden de proyectos.js)
//   pnyk   texto del enlace final a pnyk.es; vacío = sin enlace. Por defecto 'PNYK'.
// El rótulo ("Otros juegos:") lo pone cada proyecto con su propio i18n.

(function (root) {
  // En el navegador, el `const PNYK_RED` de red.js es global pero NO propiedad de
  // window: se lee por su nombre.
  const RED = typeof module !== 'undefined' && module.exports
    ? require('./red.js').PNYK_RED
    : (typeof PNYK_RED !== 'undefined' ? PNYK_RED : root.PNYK_RED);

  const esc = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const link = (url, name) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>`;

  function proyectosRed({ slug, grupo = 'panic' } = {}) {
    const saga = RED.proyectos.filter(p => p.sagaOrder).sort((a, b) => a.sagaOrder - b.sagaOrder);
    const resto = RED.proyectos.filter(p => !p.sagaOrder);
    const lista = grupo === 'todos' ? saga.concat(resto)
      : grupo === 'saga' ? saga
      : saga.concat(resto.filter(p => p.family === 'panic'));
    return lista.filter(p => p.slug !== slug);
  }

  function pieRed({ slug, grupo = 'panic', pnyk = 'PNYK' } = {}) {
    const enlaces = proyectosRed({ slug, grupo }).map(p => link(p.url, p.name));
    if (pnyk) enlaces.push(link(RED.origin, pnyk));
    return enlaces.join(' · ');
  }

  const api = { pieRed, proyectosRed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : this);
