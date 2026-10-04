/*
 * Slot Panic — el sonido. Web Audio, sin ficheros.
 *
 * Los dos helpers genéricos de la saga, tone() y noiseBurst(), y de ellos
 * cuelgan todos los sfx*(). Lo propio son sonidos que no se apagan: el
 * zumbido eléctrico de cada coche, que sigue a su velocidad, y el chirrido de
 * la guía, cuyo volumen sigue al derrape.
 *
 * El contexto se crea en el primer gesto real del usuario (política de
 * autoplay); hasta entonces todo es mudo y nada falla.
 */

import { GAME_SLUG } from './config.js';

const VOLUMEN = 0.35;
const CLAVE_SILENCIO = GAME_SLUG + '.silencio';
const RUIDO_SEGUNDOS = 2;

let audio = null;
let maestro = null;
let ruido = null;
let chirrido = null;
let zumbidos = [];
let silencio = false;
try { silencio = localStorage.getItem(CLAVE_SILENCIO) === '1'; } catch (error) { /* modo privado */ }

export function asegurarAudio() {
  if (!audio) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    audio = new Contexto();
    maestro = audio.createGain();
    maestro.gain.value = silencio ? 0 : VOLUMEN;
    maestro.connect(audio.destination);
  }
  if (audio.state === 'suspended') audio.resume();
}

export function silenciado() {
  return silencio;
}

/*
 * Un toque de vibración en el móvil al chocar: corto, más largo cuanto más
 * fuerte (`fuerza` en px/s normales, como sfxGolpe). El silencio la calla
 * también, y nunca más de una cada VIBRACION_MINIMA segundos.
 */
const VIBRACION_MINIMA = 0.15;
let ultimaVibracion = 0;

export function vibrar(fuerza) {
  if (silencio || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  const ahora = performance.now() / 1000;
  if (ahora - ultimaVibracion < VIBRACION_MINIMA) return;
  ultimaVibracion = ahora;
  try { navigator.vibrate(Math.round(15 + 25 * Math.min(1, fuerza / 200))); } catch (error) { /* sin permiso */ }
}

export function alternarSilencio() {
  silencio = !silencio;
  if (maestro) maestro.gain.value = silencio ? 0 : VOLUMEN;
  try { localStorage.setItem(CLAVE_SILENCIO, silencio ? '1' : '0'); } catch (error) { /* modo privado */ }
}

function tone({ type = 'square', freq = 440, freqEnd = null, dur = 0.12, attack = 0.005, gain = 0.2 }) {
  if (!audio || silencio) return;
  const t0 = audio.currentTime;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(maestro);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Un único búfer de ruido, reutilizado desde un punto al azar (lección de Orbit).
function bufferRuido() {
  if (!ruido) {
    const n = Math.floor(audio.sampleRate * RUIDO_SEGUNDOS);
    ruido = audio.createBuffer(1, n, audio.sampleRate);
    const datos = ruido.getChannelData(0);
    for (let i = 0; i < n; i++) datos[i] = Math.random() * 2 - 1;
  }
  return ruido;
}

function noiseBurst({ dur = 0.2, gain = 0.2, filterFreq = 1200, q = 1 }) {
  if (!audio || silencio) return;
  const t0 = audio.currentTime;
  const fuente = audio.createBufferSource();
  fuente.buffer = bufferRuido();
  const filtro = audio.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = filterFreq;
  filtro.Q.value = q;
  const g = audio.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  fuente.connect(filtro);
  filtro.connect(g);
  g.connect(maestro);
  fuente.start(t0, Math.random() * (RUIDO_SEGUNDOS - dur), dur);
}

export function sfxCuenta() {
  tone({ type: 'square', freq: 440, dur: 0.14, gain: 0.08 });
}

export function sfxSalida() {
  tone({ type: 'square', freq: 880, dur: 0.35, gain: 0.09 });
}

export function sfxVuelta() {
  tone({ type: 'triangle', freq: 660, freqEnd: 990, dur: 0.18, gain: 0.12 });
}

export function sfxFin(record) {
  tone({ type: 'triangle', freq: 523, dur: 0.2, gain: 0.12 });
  setTimeout(() => tone({ type: 'triangle', freq: 659, dur: 0.2, gain: 0.12 }), 160);
  setTimeout(() => tone({ type: 'triangle', freq: record ? 1047 : 784, dur: 0.4, gain: 0.12 }), 320);
}

/*
 * El chirrido de los neumáticos: ruido en bucle por un filtro de banda
 * estrecha, que es casi un tono, con un temblor lento en la frecuencia para que
 * no suene a pitido. `intensidad` en [0, 1]: 0 calla, 1 es un derrape a tope.
 * Más agudo cuanto más fuerte. Se suaviza para no chasquear.
 */
export function actualizarChirrido(intensidad, activo) {
  if (!audio) return;
  if (!chirrido) {
    const fuente = audio.createBufferSource();
    fuente.buffer = bufferRuido();
    fuente.loop = true;
    const filtro = audio.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 9;
    filtro.frequency.value = 1100;
    const temblor = audio.createOscillator();
    const hondo = audio.createGain();
    temblor.frequency.value = 7;
    hondo.gain.value = 70;
    temblor.connect(hondo);
    hondo.connect(filtro.frequency);
    const g = audio.createGain();
    g.gain.value = 0;
    fuente.connect(filtro);
    filtro.connect(g);
    g.connect(maestro);
    fuente.start();
    temblor.start();
    chirrido = { filtro, g };
  }
  const t0 = audio.currentTime;
  const k = activo && !silencio ? Math.max(0, Math.min(1, intensidad)) : 0;
  chirrido.filtro.frequency.setTargetAtTime(950 + 650 * k, t0, 0.05);
  chirrido.g.gain.setTargetAtTime(0.22 * k * k, t0, 0.04);
}

// --- Los coches de slot ---------------------------------------------------------

/** Se sale del carril: un zas que cae y el golpe contra la mesa. */
export function sfxSale() {
  tone({ type: 'sawtooth', freq: 620, freqEnd: 160, dur: 0.25, gain: 0.06 });
  noiseBurst({ dur: 0.12, gain: 0.12, filterFreq: 2400 });
}

/** Dos coches que se encuentran en una X o un cruce: un golpe sordo y plástico que cruje. */
export function sfxChoque() {
  tone({ type: 'sine', freq: 140, freqEnd: 50, dur: 0.3, gain: 0.22 });
  noiseBurst({ dur: 0.22, gain: 0.25, filterFreq: 1400 });
}

/** La pieza encaja en el carril: un clic seco de plástico. */
export function sfxClac() {
  noiseBurst({ dur: 0.03, gain: 0.25, filterFreq: 5000, q: 2 });
  tone({ type: 'square', freq: 1800, dur: 0.025, gain: 0.05 });
}

/*
 * El zumbido eléctrico de cada coche, en vez del motor de combustión: una
 * cuadrada aguda y filtrada, de 110 Hz parado a ~420 Hz a tope. Una voz por
 * coche, para que se oiga el pique. `velocidades` en px/s.
 */
export function actualizarZumbidos(velocidades, maxima, activo) {
  if (!audio) return;
  while (zumbidos.length < velocidades.length) {
    const osc = audio.createOscillator();
    const filtro = audio.createBiquadFilter();
    const g = audio.createGain();
    osc.type = 'square';
    filtro.type = 'lowpass';
    filtro.frequency.value = 1400;
    g.gain.value = 0;
    osc.connect(filtro);
    filtro.connect(g);
    g.connect(maestro);
    osc.start();
    zumbidos.push({ osc, g, desafino: zumbidos.length * 17 });
  }
  const t0 = audio.currentTime;
  zumbidos.forEach((z, i) => {
    const k = Math.min(1, (velocidades[i] || 0) / maxima);
    z.osc.frequency.setTargetAtTime(110 + z.desafino + 310 * k, t0, 0.04);
    z.g.gain.setTargetAtTime(activo && !silencio && k > 0.01 ? 0.012 + 0.022 * k : 0, t0, 0.06);
  });
}
