/*
 * Slot Panic — el sonido. Web Audio, sin ficheros: todo se sintetiza.
 *
 * Lo que suena sale de tres cosas:
 *   - El motor de cada coche (actualizarCoches): una voz continua por coche. En
 *     una pista de slot lo que más se oye es el roce con la pista, no el motor:
 *     casi todo es ruido que sigue al tono (la calibración, en BITACORA.md). La
 *     velocidad da el tono, la potencia (el dedo) la fuerza y el silbido, y lo
 *     cerca que pasa, el volumen.
 *   - El chirrido de la guía, cuyo volumen sigue al derrape.
 *   - Los golpes (sfx*): cuerpo grave más los modos de una carcasa de plástico.
 *
 * Todo pasa por `bus`, y de ahí a un compresor y al maestro, con una
 * reverberación corta de sala (se quita con los efectos en Baja).
 *
 * El contexto se crea en el primer gesto real del usuario (política de
 * autoplay); hasta entonces todo es mudo y nada falla.
 */

import { GAME_SLUG, JUNTA } from './config.js';
import { ajuste } from './ajustes.js';

const VOLUMEN = 0.8;
const CLAVE_SILENCIO = GAME_SLUG + '.silencio';
const RUIDO_SEGUNDOS = 2;
const REVERB_SEGUNDOS = 0.4;
const REVERB_NIVEL = 0.14;

let audio = null;
let maestro = null;
let bus = null;
let envio = null;
let conReverb = false;
let ruido = null;
let chirrido = null;
const voces = [];
let silencio = false;
try { silencio = localStorage.getItem(CLAVE_SILENCIO) === '1'; } catch (error) { /* modo privado */ }

/** Una cola de sala: ruido que cae y se oscurece. Se calcula una vez. */
function colaDeSala() {
  const n = Math.floor(audio.sampleRate * REVERB_SEGUNDOS);
  const cola = audio.createBuffer(2, n, audio.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const datos = cola.getChannelData(canal);
    let suave = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const abierto = 0.5 * (1 - t) + 0.05;   // cuanto más tarde, más oscuro
      suave += ((Math.random() * 2 - 1) - suave) * abierto;
      datos[i] = suave * Math.pow(1 - t, 3);
    }
  }
  return cola;
}

export function asegurarAudio() {
  if (!audio) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    audio = new Contexto();
    maestro = audio.createGain();
    maestro.gain.value = silencio ? 0 : VOLUMEN;
    maestro.connect(audio.destination);

    // El compresor sube lo flojo y sujeta los golpes: en el móvil se oye más sin saturar.
    const compresor = audio.createDynamicsCompressor();
    compresor.threshold.value = -16;
    compresor.knee.value = 14;
    compresor.ratio.value = 3;   // deja respirar: una pista real sube y baja mucho
    compresor.attack.value = 0.003;
    compresor.release.value = 0.16;
    compresor.connect(maestro);

    bus = audio.createGain();
    bus.connect(compresor);

    const sala = audio.createConvolver();
    sala.buffer = colaDeSala();
    envio = audio.createGain();
    envio.gain.value = REVERB_NIVEL;
    envio.connect(sala);
    sala.connect(compresor);
    ponerReverb();
  }
  if (audio.state === 'suspended') audio.resume();
}

/** La reverberación es un efecto: con los efectos apagados (Baja), ni se calcula. */
function ponerReverb() {
  const quiere = Boolean(ajuste('efectos'));
  if (quiere === conReverb) return;
  conReverb = quiere;
  if (quiere) bus.connect(envio);
  else bus.disconnect(envio);
}

/*
 * Con la página oculta (otra pestaña, o salir de la app) no corre el bucle, y
 * los motores, que son continuos, se quedarían sonando: se suspende todo.
 */
export function pausarAudio() {
  if (audio?.state === 'running') audio.suspend();
}

export function reanudarAudio() {
  if (audio?.state === 'suspended') audio.resume();
}

export function silenciado() {
  return silencio;
}

/*
 * Un toque de vibración en el móvil: más largo cuanto más fuerte (`fuerza` de 0
 * a 200). Navegador y WebView no dejan elegir la intensidad, solo la duración,
 * y en un Redmi Note 14 Pro 40 ms casi no se notaban y 200 aún eran suaves. El
 * silencio la calla también, como el ajuste de la vibración (ajustes.js). Nunca
 * más de una cada VIBRACION_MINIMA segundos, salvo otra más larga: un choque
 * flojo no se puede comer la salida de pista que provoca.
 */
const VIBRACION_MINIMA = 0.15;
let ultimaVibracion = 0;
let ultimaDuracion = 0;

export function vibrar(fuerza) {
  if (silencio || !ajuste('vibracion') || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  const ahora = performance.now() / 1000;
  const duracion = Math.round(40 + 160 * Math.min(1, fuerza / 200));
  if (ahora - ultimaVibracion < VIBRACION_MINIMA && duracion <= ultimaDuracion) return;
  ultimaVibracion = ahora;
  ultimaDuracion = duracion;
  try { navigator.vibrate(duracion); } catch (error) { /* sin permiso */ }
}

export function alternarSilencio() {
  silencio = !silencio;
  if (maestro) maestro.gain.value = silencio ? 0 : VOLUMEN;
  try { localStorage.setItem(CLAVE_SILENCIO, silencio ? '1' : '0'); } catch (error) { /* modo privado */ }
}

/** Dónde se conecta un sonido suelto: al bus, situado en estéreo si hace falta. */
function salidaEn(pan) {
  if (!pan || !audio.createStereoPanner) return bus;
  const situado = audio.createStereoPanner();
  situado.pan.value = pan;
  situado.connect(bus);
  return situado;
}

function tone({ type = 'square', freq = 440, freqEnd = null, dur = 0.12, attack = 0.005, gain = 0.2, en = 0, pan = 0 }) {
  if (!audio || silencio) return;
  const t0 = audio.currentTime + en;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(salidaEn(pan));
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

function noiseBurst({ dur = 0.2, gain = 0.2, filterFreq = 1200, filterEnd = null, q = 1, filtro: tipo = 'lowpass', en = 0, pan = 0 }) {
  if (!audio || silencio) return;
  const t0 = audio.currentTime + en;
  const fuente = audio.createBufferSource();
  fuente.buffer = bufferRuido();
  const filtro = audio.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.setValueAtTime(filterFreq, t0);
  if (filterEnd !== null) filtro.frequency.exponentialRampToValueAtTime(filterEnd, t0 + dur);
  filtro.Q.value = q;
  const g = audio.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  fuente.connect(filtro);
  filtro.connect(g);
  g.connect(salidaEn(pan));
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
  tone({ type: 'triangle', freq: 659, dur: 0.2, gain: 0.12, en: 0.16 });
  tone({ type: 'triangle', freq: record ? 1047 : 784, dur: 0.4, gain: 0.12, en: 0.32 });
}

/*
 * El chirrido de los neumáticos: ruido en bucle por dos filtros de banda
 * estrecha, que es casi un tono, con un temblor lento en la frecuencia para que
 * no suene a pitido. `intensidad` en [0, 1]: 0 calla, 1 es un derrape a tope.
 * Más agudo cuanto más fuerte. Se suaviza para no chasquear.
 */
export function actualizarChirrido(intensidad, activo, pan = 0) {
  if (!audio) return;
  if (!chirrido) {
    const fuente = audio.createBufferSource();
    fuente.buffer = bufferRuido();
    fuente.loop = true;
    const filtro = audio.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 9;
    filtro.frequency.value = 1100;
    const armonico = audio.createBiquadFilter();
    armonico.type = 'bandpass';
    armonico.Q.value = 12;
    armonico.frequency.value = 1700;
    const nivelArmonico = audio.createGain();
    nivelArmonico.gain.value = 0.35;
    const temblor = audio.createOscillator();
    const hondo = audio.createGain();
    temblor.frequency.value = 7;
    hondo.gain.value = 70;
    temblor.connect(hondo);
    hondo.connect(filtro.frequency);
    hondo.connect(armonico.frequency);
    const g = audio.createGain();
    g.gain.value = 0;
    fuente.connect(filtro);
    fuente.connect(armonico);
    armonico.connect(nivelArmonico);
    filtro.connect(g);
    nivelArmonico.connect(g);
    const situado = audio.createStereoPanner ? audio.createStereoPanner() : null;
    if (situado) {
      g.connect(situado);
      situado.connect(bus);
    } else g.connect(bus);
    fuente.start();
    temblor.start();
    chirrido = { filtro, armonico, g, situado };
  }
  const t0 = audio.currentTime;
  const k = activo && !silencio ? Math.max(0, Math.min(1, intensidad)) : 0;
  chirrido.filtro.frequency.setTargetAtTime(950 + 650 * k, t0, 0.05);
  chirrido.armonico.frequency.setTargetAtTime(1500 + 1050 * k, t0, 0.05);
  chirrido.g.gain.setTargetAtTime(0.24 * k * k, t0, 0.04);
  chirrido.situado?.pan.setTargetAtTime(pan, t0, 0.05);
}

// --- Los golpes ------------------------------------------------------------------

/** La carcasa de plástico: unos modos agudos que se apagan enseguida y un chasquido. */
function plastico({ fuerza = 1, en = 0, pan = 0, tono = 1 }) {
  tone({ type: 'sine', freq: 830 * tono, dur: 0.05, attack: 0.001, gain: 0.11 * fuerza, en, pan });
  tone({ type: 'sine', freq: 1490 * tono, dur: 0.035, attack: 0.001, gain: 0.08 * fuerza, en, pan });
  tone({ type: 'sine', freq: 2370 * tono, dur: 0.022, attack: 0.001, gain: 0.05 * fuerza, en, pan });
  noiseBurst({ dur: 0.014, gain: 0.14 * fuerza, filterFreq: 3200, filtro: 'highpass', en, pan });
}

/** Se sale del carril: el aire que corta, el golpe contra la mesa y unos rebotes. */
export function sfxSale(pan = 0) {
  noiseBurst({ dur: 0.2, gain: 0.08, filterFreq: 2600, filterEnd: 500, filtro: 'bandpass', q: 1.2, pan });
  tone({ type: 'sine', freq: 170, freqEnd: 70, dur: 0.14, gain: 0.16, en: 0.12, pan });
  plastico({ fuerza: 1, en: 0.12, pan });
  plastico({ fuerza: 0.55, en: 0.24 + Math.random() * 0.03, pan, tono: 1.08 });
  plastico({ fuerza: 0.3, en: 0.33 + Math.random() * 0.03, pan, tono: 0.95 });
  plastico({ fuerza: 0.16, en: 0.39 + Math.random() * 0.02, pan, tono: 1.15 });
}

/*
 * Dos coches que chocan: un golpe sordo y plástico que cruje. Más flojo
 * cuanto menos `fuerza` (de 0 a 1; a media velocidad, ya a tope).
 */
export function sfxChoque(fuerza = 1, pan = 0) {
  const f = 0.35 + 0.65 * Math.min(1, 2 * fuerza);
  tone({ type: 'sine', freq: 140, freqEnd: 50, dur: 0.26, gain: 0.22 * f, pan });
  noiseBurst({ dur: 0.1, gain: 0.16 * f, filterFreq: 1800, pan });
  plastico({ fuerza: f, pan });
  plastico({ fuerza: f * 0.8, en: 0.012, pan, tono: 1.21 });
  if (f > 0.7) plastico({ fuerza: f * 0.35, en: 0.09 + Math.random() * 0.03, pan, tono: 0.9 });
}

/*
 * Un bache: un golpe corto y hueco de la guía contra la pista. Más fuerte
 * cuanto más rápido (`fuerza`, la velocidad entre la de los baches).
 */
export function sfxBache(fuerza = 1, pan = 0) {
  const f = Math.min(1.2, Math.max(0.15, fuerza));
  tone({ type: 'sine', freq: 120, freqEnd: 60, dur: 0.07, gain: 0.17 * f, pan });
  noiseBurst({ dur: 0.05, gain: 0.08 * f, filterFreq: 800, q: 1.5, pan });
  plastico({ fuerza: 0.4 * f, en: 0.006, pan, tono: 0.8 });
}

/** La pieza encaja en el carril: la guía entra y el coche asienta. */
export function sfxClac(pan = 0) {
  noiseBurst({ dur: 0.012, gain: 0.2, filterFreq: 4200, filtro: 'highpass', pan });
  tone({ type: 'square', freq: 1800, dur: 0.018, gain: 0.03, pan });
  plastico({ fuerza: 0.6, en: 0.035, pan, tono: 0.85 });
}

/*
 * Una unión de la pista: pasan las ruedas de delante y, `entre` segundos después,
 * las de atrás. Un golpe seco de plástico, nunca dos iguales: en una pista real son
 * irregulares y graves (centroide de 200-800 Hz). Sobre el puente, hueco.
 */
function sfxJunta(fuerza, entre, pan, hueco) {
  for (const [en, f] of [[0, fuerza], [entre, fuerza * (0.45 + Math.random() * 0.4)]]) {
    const azar = 0.55 + Math.random() * 0.75;
    const cuerpo = (hueco ? 170 + Math.random() * 110 : 300 + Math.random() * 450);
    tone({ type: 'sine', freq: cuerpo, dur: hueco ? 0.06 : 0.03, attack: 0.001, gain: (hueco ? 0.16 : 0.1) * f * azar, en, pan });
    noiseBurst({ dur: 0.022, gain: 0.13 * f * azar, filterFreq: 1400 + Math.random() * 1600, en, pan });
  }
}

// --- Los motores ------------------------------------------------------------------

const CADENCIA_VOCES = 1 / 30;   // s: los motores no piden más; el audio ya suaviza entre medias
// Para que cuatro coches iguales no se pisen ni batan: un intervalo claro entre ellos.
const INTERVALO_VOZ = [1, 1.122, 0.841, 1.26];

/*
 * La voz que da a un modelo su carácter (COCHES): el corto, más agudo; el de
 * mucha aceleración, más brillante. Sin DOM.
 */
export function vozDe(ficha) {
  const altura = 1 + (31 - ficha.largo) * 0.025;
  return {
    base: 105 * altura,
    rango: 330 * altura,
    brillo: 0.75 + 0.8 * (ficha.acelera - 0.69)
  };
}

/** Ruido del búfer común, muy lento: lo que hace que nada sea constante. */
function vaiven(hz, cuanto, destino) {
  const fuente = audio.createBufferSource();
  fuente.buffer = bufferRuido();
  fuente.loop = true;
  const filtro = audio.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = hz;
  const nivel = audio.createGain();
  nivel.gain.value = cuanto;
  fuente.connect(filtro);
  filtro.connect(nivel);
  nivel.connect(destino);
  fuente.start(0, Math.random() * RUIDO_SEGUNDOS);
}

function banda(tipo, frecuencia, q, fuente, destino) {
  const filtro = audio.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = frecuencia;
  filtro.Q.value = q;
  fuente.connect(filtro);
  if (destino) filtro.connect(destino);
  return filtro;
}

function ganancia(destino) {
  const g = audio.createGain();
  g.gain.value = 0;
  g.connect(destino);
  return g;
}

/*
 * Un motor, medido contra una pista real: casi no hay líneas limpias, sino
 *   - el grano: ruido en dos bandas que siguen el tono, con una sierra muy baja debajo;
 *   - el silbido: una banda estrecha de 1000-1350 Hz que sale al tirar;
 *   - el retumbo: ruido de 110-320 Hz, rugoso, de las ruedas contra la pista;
 *   - las escobillas y la rodadura de siempre, más bajas.
 */
function crearVoz(i) {
  const salida = audio.createGain();
  const situado = audio.createStereoPanner ? audio.createStereoPanner() : null;
  if (situado) {
    salida.connect(situado);
    situado.connect(bus);
  } else salida.connect(bus);

  const fuente = audio.createBufferSource();
  fuente.buffer = bufferRuido();
  fuente.loop = true;

  const bobinado = audio.createOscillator();
  bobinado.type = 'sawtooth';
  const nivelBobinado = ganancia(salida);
  const filtroBobinado = banda('lowpass', 900, 0.7, bobinado, nivelBobinado);
  vaiven(25, 1900, bobinado.detune);   // ±35 cents al azar: la línea se deshilacha

  const nivelGrano = ganancia(salida);
  const grano1 = banda('bandpass', 300, 6, fuente, nivelGrano);
  const grano2 = banda('bandpass', 600, 5, fuente, nivelGrano);

  const nivelSilbido = ganancia(salida);
  const silbido = banda('bandpass', 1100, 14, fuente, nivelSilbido);
  vaiven(40, 4000, silbido.detune);

  const nivelRetumbo = ganancia(salida);
  const retumbo = banda('highpass', 110, 0.7, banda('lowpass', 320, 0.7, fuente), nivelRetumbo);
  const nivelRugosidad = audio.createGain();
  nivelRugosidad.gain.value = 0;
  vaiven(18, 30, nivelRugosidad);
  nivelRugosidad.connect(nivelRetumbo.gain);

  const nivelEscobillas = ganancia(salida);
  const filtroEscobillas = banda('bandpass', 3000, 0.8, fuente, nivelEscobillas);
  const nivelRodadura = ganancia(salida);
  const filtroRodadura = banda('bandpass', 600, 0.7, fuente, nivelRodadura);

  bobinado.start();
  fuente.start(0, Math.random() * RUIDO_SEGUNDOS);
  return {
    i, bobinado, filtroBobinado, nivelBobinado, nivelGrano, grano1, grano2, nivelSilbido, silbido,
    nivelRetumbo, retumbo, nivelRugosidad, nivelEscobillas, filtroEscobillas, nivelRodadura, filtroRodadura,
    salida, situado, recorrido: Math.random() * JUNTA
  };
}

function ponerVoz(voz, coche, maxima, t0) {
  const k = Math.min(1.2, coche.v / maxima);
  const p = coche.potencia;
  const { base, rango, brillo } = vozDe(coche.ficha);
  const intervalo = INTERVALO_VOZ[voz.i % INTERVALO_VOZ.length];
  const tono = (base + rango * k) * intervalo * (0.95 + 0.1 * p);
  const fuerza = 0.3 + 0.7 * p;
  const k07 = Math.pow(k, 0.7);
  // Quieto y sin gas, callado: si no, el grano sigue sonando en la parrilla.
  const anda = k > 0.01 || p > 0.03 ? 1 : 0;
  voz.bobinado.frequency.setTargetAtTime(tono, t0, 0.03);
  voz.filtroBobinado.frequency.setTargetAtTime(500 + 1100 * p * brillo, t0, 0.03);
  voz.nivelBobinado.gain.setTargetAtTime(anda * 0.022 * k07 * fuerza, t0, 0.04);
  voz.grano1.frequency.setTargetAtTime(tono, t0, 0.03);
  voz.grano2.frequency.setTargetAtTime(tono * 2, t0, 0.03);
  voz.nivelGrano.gain.setTargetAtTime(anda * 1.1 * k07 * fuerza, t0, 0.04);
  voz.silbido.frequency.setTargetAtTime((950 + 400 * Math.min(1, k)) * Math.sqrt(intervalo), t0, 0.06);
  voz.nivelSilbido.gain.setTargetAtTime(0.8 * Math.pow(k, 1.5) * p * p * brillo, t0, 0.05);
  voz.retumbo.frequency.setTargetAtTime(coche.puente ? 80 : 110, t0, 0.06);
  const retumbo = (coche.puente ? 1.4 : 0.9) * k07;
  voz.nivelRetumbo.gain.setTargetAtTime(retumbo, t0, 0.05);
  voz.nivelRugosidad.gain.setTargetAtTime(retumbo, t0, 0.05);   // el vaivén ya viene a ±0,35
  voz.filtroEscobillas.frequency.setTargetAtTime(2000 + 2400 * k, t0, 0.05);
  voz.nivelEscobillas.gain.setTargetAtTime(0.022 * p * (0.35 + k) * anda, t0, 0.04);
  voz.filtroRodadura.frequency.setTargetAtTime(420 + 500 * k, t0, 0.06);
  voz.nivelRodadura.gain.setTargetAtTime(0.03 * k, t0, 0.05);
  // Cerca se oye mucho más: en la pista real, 21 dB entre un coche que pasa y uno lejos.
  const { cerca } = coche;
  const nivel = coche.humano ? 0.45 + 0.55 * cerca : 0.14 + 0.76 * cerca;
  voz.salida.gain.setTargetAtTime(nivel, t0, 0.08);
  voz.situado?.pan.setTargetAtTime(coche.pan, t0, 0.05);
}

function callarVoz(voz, t0) {
  for (const g of [voz.nivelBobinado, voz.nivelGrano, voz.nivelSilbido, voz.nivelRetumbo, voz.nivelRugosidad, voz.nivelEscobillas, voz.nivelRodadura]) {
    g.gain.setTargetAtTime(0, t0, 0.06);
  }
}

let ultimoAudio = 0;
let ultimaVoz = -1;

/*
 * Los motores, cada fotograma. `coches`: { v (px/s), potencia [0, 1], ficha,
 * pan [-1, 1], humano, puente }, en una lista que puede reutilizarse.
 */
export function actualizarCoches(coches, maxima, activo) {
  if (!audio) return;
  while (voces.length < coches.length) voces.push(crearVoz(voces.length));
  const t0 = audio.currentTime;
  const dt = Math.min(0.1, Math.max(0, t0 - ultimoAudio));
  ultimoAudio = t0;

  // Las uniones de la pista: el traqueteo es lo que más dice a qué velocidad se va.
  if (activo && !silencio) {
    for (let i = 0; i < coches.length; i++) {
      const coche = coches[i];
      const voz = voces[i];
      voz.recorrido += coche.v * dt;
      if (voz.recorrido < JUNTA) continue;
      voz.recorrido -= JUNTA;
      if (coche.v < 60) continue;
      const k = Math.min(1, coche.v / maxima);
      const cerca = coche.cerca;
      sfxJunta((coche.humano ? 0.5 + 0.5 * cerca : 0.1 + 0.6 * cerca) * (0.35 + 0.65 * k), coche.ficha.largo / coche.v, coche.pan, coche.puente);
      voz.recorrido -= Math.random() * JUNTA * 0.3;   // la siguiente, nunca a compás
    }
  }

  if (t0 - ultimaVoz < CADENCIA_VOCES) return;
  ultimaVoz = t0;
  ponerReverb();
  voces.forEach((voz, i) => {
    if (activo && !silencio && i < coches.length) ponerVoz(voz, coches[i], maxima, t0);
    else callarVoz(voz, t0);
  });
}
