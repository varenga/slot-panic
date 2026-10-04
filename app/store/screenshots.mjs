// Capturas de pantalla para la ficha de Google Play (APP.md §6.4), en
// castellano y en inglés, desde la propia web en un Chrome sin ventana a
// tamaño de móvil en horizontal. Calcado del de Orbit Panic. Sin dependencias:
// habla con Chrome por su protocolo de depuración con el WebSocket que trae
// Node. Antes hay que servir la web:
//
//   python -m http.server 8124        (en la raíz del repositorio)
//   node store/screenshots.mjs        (en /app)
//
// La página se abre como si fuera la app: un window.Capacitor simulado antes
// de que cargue nada hace que enApp() conteste true, así que no hay prosa bajo
// el lienzo, ni pie, ni service worker. El juego es de módulos ES y no deja
// tocar su estado desde fuera: el circuito, el escenario, la hora y el idioma
// se siembran en localStorage, y la carrera se empieza con un Enter. Nadie
// toca los carriles, así que corren las dos CPU: la captura sale con los
// coches en marcha, no parados en la parrilla.
//
// Caen en store/screenshots/<idioma>/ a 1920×1080 (16:9, el lienzo entero sin
// bandas).

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = process.env.SLOTPANIC_ORIGIN || 'http://127.0.0.1:8124';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9335;
const WIDTH = 960, HEIGHT = 540, SCALE = 2;
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'screenshots');

const profile = mkdtempSync(join(tmpdir(), 'slotpanic-shots-'));
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

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  return result.value;
}

async function shot(lang, name) {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
  mkdirSync(join(OUT, lang), { recursive: true });
  writeFileSync(join(OUT, lang, `${name}.png`), Buffer.from(data, 'base64'));
  console.log(`${lang}/${name}.png`);
}

// Las preferencias de quien juega: circuito, escenario, hora, idioma y sin sonido.
const SEMBRAR = (lang, { circuito, escenario, hora }) => `(() => {
  localStorage.clear();
  localStorage.setItem('slotpanic.idioma', ${JSON.stringify(lang)});
  localStorage.setItem('slotpanic.silencio', '1');
  localStorage.setItem('slotpanic.circuito', ${JSON.stringify(circuito)});
  localStorage.setItem('slotpanic.escenario', ${JSON.stringify(escenario)});
  localStorage.setItem('slotpanic.hora', ${JSON.stringify(hora)});
})()`;

const tecla = (code) => evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: ${JSON.stringify(code)} }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: ${JSON.stringify(code)} }))`);

async function abrir(lang, preferencias) {
  await cdp('Page.navigate', { url: `${ORIGIN}/` });
  await sleep(800);
  await evaluate(SEMBRAR(lang, preferencias));
  await cdp('Page.navigate', { url: `${ORIGIN}/` });
  await sleep(1500);
}

const CAPTURAS = [
  // La portada, con la exhibición corriendo detrás.
  { nombre: '1-portada', circuito: 'primero', escenario: 'verde', hora: 'dia', carrera: 0 },
  // En carrera: Enter, la cuenta atrás (3 s) y unos segundos de CPU contra CPU.
  { nombre: '2-ocho', circuito: 'ocho', escenario: 'verde', hora: 'dia', carrera: 9 },
  { nombre: '3-nudo', circuito: 'nudo', escenario: 'tierra', hora: 'atardecer', carrera: 11 },
  { nombre: '4-noche', circuito: 'primero', escenario: 'nieve', hora: 'noche', carrera: 8 },
  { nombre: '5-desierto', circuito: 'ocho', escenario: 'desierto', hora: 'dia', carrera: 14 }
];

try {
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.Capacitor = { isNativePlatform: () => true };'
  });
  await cdp('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: true });
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });

  for (const lang of ['es', 'en']) {
    for (const c of CAPTURAS) {
      await abrir(lang, c);
      if (c.carrera) {
        await tecla('Enter');
        await sleep(c.carrera * 1000);
      } else {
        await sleep(3000);
      }
      await shot(lang, c.nombre);
    }
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
