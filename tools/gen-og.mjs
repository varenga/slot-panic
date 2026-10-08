// La imagen para compartir (og:image y twitter:image): una captura de 1200×630
// de una carrera, en og.jpg. Calcado de app/store/screenshots.mjs: un Chrome
// sin ventana hablando por su protocolo de depuración, la página como si fuera
// la app (un window.Capacitor simulado: sin prosa ni pie) a 1280×720, una
// carrera de CPU contra CPU y el recorte del centro. Antes hay que servir la web:
//
//   python -m http.server 8124        (en la raíz del repositorio)
//   node tools/gen-og.mjs
//
// Solo hace falta si cambia lo que se ve: og.jpg se versiona.

import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = process.env.SLOTPANIC_ORIGIN || 'http://127.0.0.1:8124';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9336;
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

const profile = mkdtempSync(join(tmpdir(), 'slotpanic-og-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--hide-scrollbars', '--font-render-hinting=none', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const pages = await (await fetch(`http://localhost:${PORT}/json`)).json();
      const page = pages.find((p) => p.type === 'page');
      if (page) return new WebSocket(page.webSocketDebuggerUrl);
    } catch { /* todavía no escucha */ }
    await sleep(200);
  }
  throw new Error('Chrome no ha arrancado');
}

const ws = await connect();
await new Promise((r) => { ws.onopen = r; });
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
const evaluate = (expression) => cdp('Runtime.evaluate', { expression, awaitPromise: true });

try {
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'window.Capacitor = { isNativePlatform: () => true };' });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: `${ORIGIN}/` });
  await sleep(800);
  await evaluate(`localStorage.clear();
    localStorage.setItem('slotpanic.idioma', 'es');
    localStorage.setItem('slotpanic.silencio', '1');
    localStorage.setItem('slotpanic.circuito', 'resbalon');
    localStorage.setItem('slotpanic.escenario', 'verde');
    localStorage.setItem('slotpanic.hora', 'dia');`);
  await cdp('Page.navigate', { url: `${ORIGIN}/` });
  await sleep(1500);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }))`);
  // La cuenta atrás y unos segundos de carrera: los coches por la deslizante.
  await sleep(9500);
  const { data } = await cdp('Page.captureScreenshot', {
    format: 'jpeg', quality: 88, clip: { x: 40, y: 58, width: 1200, height: 630, scale: 1 }
  });
  writeFileSync(join(RAIZ, 'og.jpg'), Buffer.from(data, 'base64'));
  console.log('og.jpg');
} finally {
  ws.close();
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
