// Slot Panic — iconos PNG de la PWA, rasterizados desde favicon.svg. Es el
// tools/gen-icons.js de Orbit Panic pasado a módulo ES.
//
//     node tools/gen-icons.mjs
//
// Son la única excepción a «sin imágenes rasterizadas»: Chrome no considera
// instalable una PWA sin un icono PNG de 192 y otro de 512, y el lanzador de
// Android recorta los `maskable` con la forma que le toque. Se usan en el
// manifest y en ningún sitio del juego. La salida (iconos/) está versionada; esto
// solo hace falta volver a ejecutarlo si cambia favicon.svg, y después
// `node tools/gen-pages.mjs`, que mete su hash en el manifest y en la caché del
// service worker.
//
// Sin dependencias: rasteriza un Chrome sin ventana, al que se le habla por su
// protocolo de depuración con el WebSocket que trae Node (22 o superior). Es la
// misma técnica que las capturas de la ficha de Phabetia. La ruta de Chrome se
// cambia con la variable de entorno CHROME.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT   = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// «iconos» y no «icons»: el Apache del alojamiento trae el `Alias /icons/` de
// serie hacia sus propios iconos del sistema, para todo el servidor. Una
// carpeta icons/ del sitio no se sirve nunca (404) y no se puede anular desde
// .htaccess.
const OUT    = path.join(ROOT, 'iconos');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT   = 9334;

// El recorte de un icono maskable puede dejar solo el círculo central del 80%
// del lado. En favicon.svg los carriles llegan a los bordes, así que en la
// versión maskable el dibujo encoge a este factor alrededor del centro, sobre
// el mismo fondo a sangre (el del lienzo).
const MASKABLE_SCALE = 0.8;
const BG = '#1b1e26';

const favicon = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8');
const viewBox = /viewBox="([^"]+)"/.exec(favicon)[1];
const [, , vbW, vbH] = viewBox.split(/\s+/).map(Number);
const inner = favicon.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

// El SVG a su tamaño de destino, para que Chrome lo rasterice como vector y no
// escale un mapa de bits de 32 px.
const sized = size => favicon.replace(/<svg[^>]*>/, m =>
  m.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '')
   .replace('<svg', `<svg width="${size}" height="${size}"`));

const maskable = size => {
  const cx = vbW / 2, cy = vbH / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}">` +
    `<rect width="${vbW}" height="${vbH}" fill="${BG}"/>` +
    `<g transform="translate(${cx} ${cy}) scale(${MASKABLE_SCALE}) translate(${-cx} ${-cy})">${inner}</g>` +
    `</svg>`;
};

const ICONS = [
  { file: 'icon-192.png',          size: 192, svg: sized },
  { file: 'icon-512.png',          size: 512, svg: sized },
  { file: 'icon-maskable-192.png', size: 192, svg: maskable },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(CHROME)) throw new Error('no encuentro Chrome en ' + CHROME + ' (variable CHROME)');

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'slotpanic-icons-'));
  // Sin GPU: con ella el mismo SVG no siempre sale byte a byte igual, y
  // regenerar sin cambios no debe producir diff.
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    let ws = null;
    for (let i = 0; i < 50 && !ws; i++) {
      try {
        const pages = await (await fetch(`http://localhost:${PORT}/json`)).json();
        const page = pages.find(p => p.type === 'page');
        if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
      } catch (e) { /* todavía no escucha */ }
      if (!ws) await sleep(200);
    }
    if (!ws) throw new Error('Chrome no ha arrancado');
    await new Promise(r => { ws.onopen = r; });

    let seq = 0;
    const pending = new Map();
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    // Se dibuja en un canvas dentro de la página y se devuelve su PNG: así el
    // tamaño es exactamente el pedido, sin depender de la ventana ni del zoom.
    async function rasterize(svg, size) {
      const expression = `(async () => {
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))};
        await img.decode();
        const c = document.createElement('canvas');
        c.width = c.height = ${size};
        c.getContext('2d').drawImage(img, 0, 0, ${size}, ${size});
        return c.toDataURL('image/png');
      })()`;
      const { result, exceptionDetails } =
        await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (exceptionDetails) throw new Error(exceptionDetails.text);
      return Buffer.from(result.value.split(',')[1], 'base64');
    }

    fs.mkdirSync(OUT, { recursive: true });
    for (const icon of ICONS) {
      fs.writeFileSync(path.join(OUT, icon.file), await rasterize(icon.svg(icon.size), icon.size));
      console.log('  iconos/' + icon.file);
    }
    ws.close();
  } finally {
    chrome.kill();
    await sleep(300);   // en Windows el perfil sigue bloqueado un instante
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* se queda en el temporal */ }
  }
}

main().catch(e => { console.error('gen-icons: ' + e.message); process.exit(1); });
