/*
 * Slot Panic — bucle, escenas y entrada.
 *
 * Es el único módulo que toca el DOM. Las reglas de la carrera viven en
 * `nucleo/slot.js`, que no lo toca, y por eso el arnés las ejecuta tal cual.
 */

import {
  ALTO, ANCHO, ANCHO_LUPA, COLETEO_DESDE, COLOR, CONTROLES_SLOT, CPU_SLOT, DEPURACION, DT_MAX, enApp, ESPERA_REINICIO, LARGO_COCHE,
  TECLAS_BLOQUEADAS, VELOCIDAD_SLOT, VUELTAS_SLOT
} from './config.js';
import { estado, guardarCircuito, guardarEscenario, guardarModelo, leerCircuito, leerEscenario, leerModelo } from './estado.js';
import { ORDEN_ESCENARIOS } from './escenarios.js';
import { CIRCUITOS } from './circuitos/indice.js';
import { crearPiloto, decidirSlot } from './nucleo/piloto.js';
import { avanzarSlot, crearCarreraSlot } from './nucleo/slot.js';
import { generarDecorado } from './nucleo/decorado.js';
import { aPiezas, deCodigo, validarTrazado } from './nucleo/cuadricula.js';
import { construirDePiezas } from './nucleo/piezas.js';
import { validarCircuito } from './nucleo/validar.js';
import { iniciarLienzo } from './nucleo/lienzo.js';
import { dibujarCarriles, dibujarCocheSlot, dibujarFondo } from './dibujo.js';
import { MODELOS, siguienteModelo } from './coches.js';
import {
  actualizarParticulas, dibujarChispas, dibujarConfeti, dibujarHumo, emitirChispas, emitirConfeti, emitirHumo
} from './particulas.js';
import {
  botonesFin, dibujarAvisos, dibujarDepuracion, dibujarFinSlot, dibujarMarcadorSlot, dibujarPortada, opcionesPortada
} from './pantalla.js';
import {
  actualizarChirrido, actualizarZumbidos, alternarSilencio, asegurarAudio, sfxChoque, sfxClac, sfxCuenta, sfxFin, sfxSale,
  sfxSalida, sfxVuelta, vibrar
} from './audio.js';
import { cambiarIdioma, t } from './i18n.js';
import { cargarAnalitica, evento } from './analitica.js';
import { guardarHora, leerHora, ORDEN_HORAS, pintarHora } from './luz.js';
import {
  altoLupa, botonesFinLupa, conCamara, crearCamara, dibujarAvisosLupa, dibujarDepuracionLupa, dibujarFinLupa, dibujarMapa,
  dibujarMarcadorLupa, dibujarPortadaLupa, empezarFotogramaLupa, opcionesPortadaLupa, prepararLupa, seguirCamara, zoomLupa
} from './lupa.js';

const lienzo = document.getElementById('lienzo');
const otros = document.getElementById('otros');
const teclas = {};
const punteros = new Map();   // pointerId → 'izq' | 'der'
let reloj = 0;                // s desde que se cargó la página (parpadeos)

/*
 * El modo lupa (`lupa.js`): en el móvil en vertical, en vez de pedir que se
 * gire, el lienzo pasa a 9:16 y sigue al J1. Con ?lupa se fuerza (para
 * probarlo en el ordenador), y ?lupa=1.5 cambia el zoom.
 */
const parametros = new URLSearchParams(location.search);
const LUPA_FORZADA = parametros.has('lupa');
const ZOOM = zoomLupa(parametros.get('lupa'));
const VERTICAL = typeof matchMedia !== 'undefined' ? matchMedia('(orientation: portrait) and (max-width: 900px)') : null;
const camara = crearCamara();

/*
 * Un circuito de la cuadrícula, compartido por su código: ?c=<código>. Se
 * corre si la cuadrícula lo deja y cabe en la mesa; va el primero de la
 * lista y no se recuerda. Mientras no haya constructor, es lo que deja
 * probar los trazados en pantalla (el arnés imprime los suyos).
 */
const DIBUJADO = circuitoCompartido(parametros.get('c'));
const LISTA = DIBUJADO ? [DIBUJADO, ...CIRCUITOS] : CIRCUITOS;

function circuitoCompartido(codigo) {
  if (!codigo) return null;
  const trazado = deCodigo(codigo);
  if (!trazado) {
    console.warn(`?c=${codigo}: no es un código de circuito`);
    return null;
  }
  const error = validarTrazado(trazado);
  if (error) {
    console.warn(`?c=${codigo}: no se puede correr (${error.motivo}, en el paso ${error.paso})`);
    return null;
  }
  const circuito = construirDePiezas(aPiezas(trazado, 'c-' + codigo));
  const { fallos } = validarCircuito(circuito);
  if (fallos.length) {
    console.warn(`?c=${codigo}: no cabe en la mesa: ${fallos.join(', ')}`);
    return null;
  }
  circuito.dibujado = true;
  return circuito;
}

/*
 * Los dos pilotos de la exhibición de la portada (la CPU de la carrera es
 * `CPU_SLOT`, en config.js). La semilla cambia en cada carrera.
 */
const EXHIBICION = [{ prudencia: 1.6, variacion: 0.25, fallo: 0.04 }, { prudencia: 1.3, variacion: 0.25, fallo: 0.04 }];
const semilla = () => Math.floor(Math.random() * 2 ** 32);

// --- Partidas -------------------------------------------------------------

function cambiarHora() {
  estado.hora = ORDEN_HORAS[(ORDEN_HORAS.indexOf(estado.hora) + 1) % ORDEN_HORAS.length];
  guardarHora(estado.hora);
}

/*
 * El J1 lleva el coche elegido y el otro, el siguiente de la lista: nunca
 * son el mismo. Se cambia en la portada, y la exhibición lo enseña ya.
 */
function cambiarCoche() {
  estado.modelo = siguienteModelo(estado.modelo);
  guardarModelo(estado.modelo);
  vestir(estado.carrera);
}

function vestir(carrera) {
  const [j1, j2] = carrera.coches;
  j1.coche.modelo = estado.modelo;
  j2.coche.modelo = siguienteModelo(estado.modelo);
}

function cambiarEscenario() {
  const i = ORDEN_ESCENARIOS.indexOf(estado.escenario);
  estado.escenario = ORDEN_ESCENARIOS[(i + 1) % ORDEN_ESCENARIOS.length];
  guardarEscenario(estado.escenario);
  estado.decorado = generarDecorado(estado.circuito, estado.escenario);
}

/** El circuito siguiente: su decorado y, en la portada, la exhibición en él. */
function cambiarCircuito() {
  const i = LISTA.indexOf(estado.circuito);
  estado.circuito = LISTA[(i + 1) % LISTA.length];
  if (!estado.circuito.dibujado) guardarCircuito(estado.circuito.clave);
  estado.decorado = generarDecorado(estado.circuito, estado.escenario);
  irAPortada();
}

function limpiarPista() {
  camara.lista = false;
  estado.avisos = [];
  estado.particulas.length = 0;
}

/** La portada hace correr a dos pilotos por el circuito: enseña de qué va el juego. */
function irAPortada() {
  estado.fase = 'portada';
  estado.carrera = crearCarreraSlot(estado.circuito, COLOR.cocheSlot);
  vestir(estado.carrera);
  estado.pilotos = EXHIBICION.map((opciones) => crearPiloto({ ...opciones, semilla: semilla() }));
  estado.humanos = [false, false];
  estado.carrera.fase = 'carrera';   // sin cuenta atrás: la exhibición ya está en marcha
  limpiarPista();
}

/*
 * Cada carril lo lleva la CPU hasta que alguien pulsa su control (la mitad de
 * la pantalla o sus teclas); desde ahí es suyo toda la carrera. Así juegan uno
 * contra la CPU o dos entre sí sin menú.
 */
function empezarCarrera() {
  evento('empezar_carrera', datosCarrera());
  estado.fase = 'carrera';
  // Cada carrera, los coches se cambian de carril: no son iguales.
  estado.turno = 1 - estado.turno;
  estado.carrera = crearCarreraSlot(estado.circuito, COLOR.cocheSlot, estado.turno);
  vestir(estado.carrera);
  estado.pilotos = [0, 1].map(() => crearPiloto({ ...CPU_SLOT, semilla: semilla() }));
  estado.humanos = [false, false];
  estado.ultimaAvisada = false;
  limpiarPista();
}

function terminarCarrera() {
  estado.fase = 'fin';
  estado.esperaReinicio = ESPERA_REINICIO;
  const gana = estado.humanos[estado.carrera.ganador];
  evento('acabar_carrera', { ...datosCarrera(), jugadores: estado.humanos.filter(Boolean).length });
  sfxFin(gana);
  if (gana) emitirConfeti(estado.particulas);
}

/** Lo que acompaña a cada evento de carrera en la analítica. */
function datosCarrera() {
  return {
    circuito: estado.circuito.dibujado ? 'dibujado' : estado.circuito.clave,
    escenario: estado.escenario,
    hora: estado.hora,
    coche: estado.modelo,
    tactil: estado.tactil
  };
}

// --- Entrada --------------------------------------------------------------

function pulsada(codigos) {
  return codigos.some((codigo) => teclas[codigo]);
}

/** Los mandos de cada carril: el humano que lo haya tomado o su CPU. */
function mandos() {
  const lados = new Set(punteros.values());
  const { carrera } = estado;
  return carrera.coches.map((slot, i) => {
    // En la lupa se juega solo: el otro carril es siempre de la CPU.
    if (estado.lupa && i === 1) return decidirSlot(estado.pilotos[i], slot, carrera.circuito);
    const pulsado = pulsada(CONTROLES_SLOT[i]) || lados.has(i === 0 ? 'izq' : 'der');
    if (pulsado) estado.humanos[i] = true;
    return estado.humanos[i]
      ? { acelerar: pulsado, frenar: false, giro: 0 }
      : decidirSlot(estado.pilotos[i], slot, carrera.circuito);
  });
}

const empezar = (codigo) => codigo === 'Enter' || codigo === 'Space' || codigo === 'NumpadEnter';

window.addEventListener('keydown', (evento) => {
  if (TECLAS_BLOQUEADAS.includes(evento.code)) evento.preventDefault();
  teclas[evento.code] = true;
  asegurarAudio();
  if (evento.repeat) return;

  if (evento.code === 'KeyM') alternarSilencio();
  ESCENAS[estado.fase].teclear(evento.code);
});
window.addEventListener('keyup', (evento) => { teclas[evento.code] = false; });
// Sin esto, perder el foco con una tecla pulsada la deja «pegada».
window.addEventListener('blur', () => {
  for (const codigo in teclas) teclas[codigo] = false;
  punteros.clear();
});

/** De coordenadas de la ventana a las del lienzo lógico (deshace el escalado CSS). */
function aLienzo(evento) {
  const caja = lienzo.getBoundingClientRect();
  return {
    x: (evento.clientX - caja.left) * (estado.lupa ? ANCHO_LUPA : ANCHO) / caja.width,
    y: (evento.clientY - caja.top) * (estado.lupa ? lienzo.height / densidadLupa : ALTO) / caja.height
  };
}

// En la lupa, toda la pantalla es el acelerador del J1.
const ladoDe = (p) => (estado.lupa || p.x < ANCHO / 2 ? 'izq' : 'der');
const dentro = (p, caja) => p.x >= caja.x && p.x <= caja.x + caja.ancho && p.y >= caja.y && p.y <= caja.y + caja.alto;

lienzo.addEventListener('pointerdown', (evento) => {
  evento.preventDefault();
  asegurarAudio();
  if (evento.pointerType === 'touch') estado.tactil = true;
  const p = aLienzo(evento);
  punteros.set(evento.pointerId, ladoDe(p));
  ESCENAS[estado.fase].pulsar(p);
  // Capturar el puntero es una comodidad (seguir el dedo fuera del lienzo); si
  // el navegador se niega, no puede llevarse por delante la pulsación.
  try { lienzo.setPointerCapture(evento.pointerId); } catch (error) { /* sin captura */ }
});
lienzo.addEventListener('pointermove', (evento) => {
  if (punteros.has(evento.pointerId)) punteros.set(evento.pointerId, ladoDe(aLienzo(evento)));
});
for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  lienzo.addEventListener(tipo, (evento) => punteros.delete(evento.pointerId));
}

function opcionPulsada(id) {
  if (id === 'circuito') cambiarCircuito();
  else if (id === 'sonido') alternarSilencio();
  else if (id === 'idioma') { cambiarIdioma(1); textosDelDocumento(); }
  else if (id === 'escenario') cambiarEscenario();
  else if (id === 'hora') cambiarHora();
  else if (id === 'coche') cambiarCoche();
}

/** Lo único de la interfaz que no se pinta en el lienzo. */
function textosDelDocumento() {
  // Enlaces a la familia Panic: pieRed() de vendor/pnyk/pie.js (script clásico
  // cargado en index.html). Su HTML sale de red.js, generado en pnyk.
  // Si fallara, el juego sigue: sin enlaces, pero sin romper el arranque.
  if (otros && typeof window.pieRed === 'function') {
    try {
      const enlaces = window.pieRed({ slug: 'slot-panic' });
      otros.textContent = t('pie.otros') + ' ';
      otros.insertAdjacentHTML('beforeend', enlaces);
    } catch (error) {
      otros.textContent = '';
    }
  }
}

// --- Escenas --------------------------------------------------------------

/** Los coches y sus efectos. */
function avanzarMundo(mandosCoches, dt) {
  const { carrera } = estado;
  avanzarSlot(carrera, mandosCoches, dt);
  for (const evento of carrera.eventos) {
    if (evento.tipo === 'choque') {
      for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        emitirChispas(estado.particulas, { x: evento.x, y: evento.y, nx, ny }, 0, 0, 8);
      }
    }
    if (evento.tipo !== 'sale') continue;
    const { coche } = carrera.coches[evento.coche];
    const v = Math.hypot(coche.vx, coche.vy) || 1;
    emitirChispas(estado.particulas, { x: coche.x, y: coche.y, nx: coche.vx / v, ny: coche.vy / v }, coche.vx * 0.3, coche.vy * 0.3, 10);
  }
  for (const slot of carrera.coches) {
    const { coche } = slot;
    // Derrapando, la trencilla chisporrotea, más cuanto más cerca de salirse.
    if (slot.estado === 'carril' && slot.derrape > 0.2 && Math.random() < slot.derrape) {
      const morro = { x: coche.x + Math.cos(coche.angulo) * LARGO_COCHE / 2, y: coche.y + Math.sin(coche.angulo) * LARGO_COCHE / 2 };
      emitirChispas(estado.particulas, { ...morro, nx: Math.cos(coche.angulo), ny: Math.sin(coche.angulo) }, coche.vx * 0.2, coche.vy * 0.2, 1);
    }
    if (slot.estado === 'fuera' && Math.hypot(coche.vx, coche.vy) > 30 && Math.random() < 0.6) {
      emitirHumo(estado.particulas, coche.x, coche.y, estado.decorado.escenario.polvo);
    }
  }
  actualizarParticulas(estado.particulas, dt);
}

function dibujarMundo() {
  if (estado.lupa) {
    conCamara(camara, ZOOM, pintarMundo);
    return;
  }
  pintarMundo();
}

function pintarMundo() {
  dibujarFondo(estado.circuito, estado.decorado);
  dibujarCarriles(estado.circuito);
  dibujarHumo(estado.particulas);
  // El que va por el aire, encima.
  const coches = [...estado.carrera.coches].sort((a, b) => a.altura - b.altura);
  coches.forEach(dibujarCocheSlot);
  pintarHora(estado.hora, estado.circuito, estado.decorado, coches.map((slot) => slot.coche));
  dibujarChispas(estado.particulas);
}

/** Cuánto chirría el coche más al límite de los que conduce alguien, en [0, 1]. */
function intensidadChirrido() {
  let mayor = 0;
  estado.carrera.coches.forEach((slot, i) => {
    if (estado.humanos[i]) mayor = Math.max(mayor, 0.6 * (slot.exigencia - COLETEO_DESDE) / (1 - COLETEO_DESDE), slot.derrape);
  });
  return Math.max(0, Math.min(1, mayor));
}

function sonido(activo) {
  const velocidades = estado.carrera.coches.map((slot) => (slot.estado === 'carril' ? slot.v : 0));
  actualizarZumbidos(velocidades, VELOCIDAD_SLOT, activo);
  actualizarChirrido(activo ? intensidadChirrido() : 0, activo);
}

const ESCENAS = {
  portada: {
    actualizar(dt) {
      const { carrera } = estado;
      avanzarMundo(carrera.coches.map((slot, i) => decidirSlot(estado.pilotos[i], slot, carrera.circuito)), dt);
      if (carrera.fase === 'fin') irAPortada();
      sonido(false);
    },
    dibujar() {
      dibujarMundo();
      if (estado.lupa) {
        dibujarPortadaLupa({ ...estado, tiempo: reloj });
        return;
      }
      dibujarPortada(estado.circuito, reloj, estado.escenario, estado.tactil, estado.hora, estado.modelo);
    },
    teclear(codigo) {
      if (empezar(codigo)) empezarCarrera();
      else if (codigo === 'KeyL') { cambiarIdioma(1); textosDelDocumento(); }
      else if (codigo === 'KeyE') cambiarEscenario();
      else if (codigo === 'KeyC') cambiarCircuito();
      else if (codigo === 'KeyH') cambiarHora();
      else if (codigo === 'KeyK') cambiarCoche();
    },
    pulsar(p) {
      const opcion = (estado.lupa ? opcionesPortadaLupa() : opcionesPortada()).find((caja) => dentro(p, caja));
      if (opcion) opcionPulsada(opcion.id);
      else empezarCarrera();
      // El toque que arranca no debe tomar ya un carril.
      punteros.clear();
    }
  },

  carrera: {
    actualizar(dt) {
      const { carrera } = estado;
      avanzarMundo(mandos(), dt);
      for (const evento of carrera.eventos) {
        if (evento.tipo === 'cuenta') sfxCuenta();
        else if (evento.tipo === 'salida') sfxSalida();
        else if (evento.tipo === 'sale') {
          sfxSale();
          if (estado.tactil && estado.humanos[evento.coche]) vibrar(200);
        }
        else if (evento.tipo === 'choque') sfxChoque();
        else if (evento.tipo === 'clac') sfxClac();
        else if (evento.tipo === 'vuelta') {
          sfxVuelta();
          // El primero que entra en la última vuelta la anuncia.
          if (!estado.ultimaAvisada && carrera.coches[evento.coche].completadas === VUELTAS_SLOT - 1) {
            estado.ultimaAvisada = true;
            estado.avisos.push({ texto: t('aviso.ultima'), vida: 1.6, color: COLOR.rojo });
          }
        } else if (evento.tipo === 'fin') terminarCarrera();
      }
      for (const a of estado.avisos) a.vida -= dt;
      estado.avisos = estado.avisos.filter((a) => a.vida > 0);
      sonido(carrera.fase === 'carrera');
    },
    dibujar() {
      dibujarMundo();
      if (estado.lupa) {
        dibujarMapa(estado.circuito, estado.carrera.coches);
        dibujarMarcadorLupa(estado.carrera, estado.humanos);
        dibujarAvisosLupa(estado.avisos);
        return;
      }
      dibujarMarcadorSlot(estado.carrera, estado.humanos, estado.tactil);
      dibujarAvisos(estado.avisos);
    },
    teclear(codigo) {
      if (codigo === 'KeyR') empezarCarrera();
      else if (codigo === 'Escape') irAPortada();
    },
    pulsar() {
      // Cada mitad del lienzo es el acelerador de un carril: lo lee mandos().
    }
  },

  fin: {
    actualizar(dt) {
      // Los coches frenan hasta pararse, detrás del cartel.
      avanzarMundo([], dt);
      estado.esperaReinicio = Math.max(0, estado.esperaReinicio - dt);
      sonido(false);
    },
    dibujar() {
      dibujarMundo();
      if (estado.lupa) {
        dibujarFinLupa(estado.carrera, estado.humanos, estado.particulas);
        return;
      }
      dibujarFinSlot(estado.carrera, estado.humanos, estado.tactil);
      dibujarConfeti(estado.particulas);
    },
    teclear(codigo) {
      if (codigo === 'Escape') irAPortada();
      else if ((empezar(codigo) || codigo === 'KeyR') && estado.esperaReinicio === 0) empezarCarrera();
    },
    pulsar(p) {
      if (estado.esperaReinicio > 0) return;
      const boton = (estado.lupa ? botonesFinLupa() : botonesFin()).find((caja) => dentro(p, caja));
      if (boton?.id === 'repetir') empezarCarrera();
      else if (boton?.id === 'menu') irAPortada();
      punteros.clear();
    }
  }
};

// --- Bucle ----------------------------------------------------------------

let tAnterior = 0;
let fotogramas = 0, acumulado = 0;

function bucle(tActual) {
  // El primer fotograma no tiene delta del que fiarse. Nunca negativo ni mayor
  // que DT_MAX: ni un reloj que retrocede ni una pestaña en segundo plano
  // pueden mover el mundo de golpe.
  const dt = tAnterior === 0 ? 0 : Math.max(0, Math.min((tActual - tAnterior) / 1000, DT_MAX));
  tAnterior = tActual;
  reloj += dt;

  ESCENAS[estado.fase].actualizar(dt);
  if (estado.lupa) {
    seguirCamara(camara, estado.carrera.coches[0], estado.circuito, dt);
    empezarFotogramaLupa();
  }
  ESCENAS[estado.fase].dibujar();

  fotogramas++;
  acumulado += dt;
  if (acumulado >= 1) {
    estado.fps = Math.round(fotogramas / acumulado);
    fotogramas = 0;
    acumulado = 0;
  }
  if (DEPURACION && estado.lupa) dibujarDepuracionLupa(estado.fps, estado.carrera.coches[0], ZOOM);
  else if (DEPURACION) dibujarDepuracion(estado.fps, estado.carrera.coches[0]);

  requestAnimationFrame(bucle);
}

/*
 * El service worker (jugar sin red e instalar la PWA), solo en la web
 * publicada: en la app los ficheros ya van dentro (y en iOS no funcionaría), y
 * sirviendo en local seguiría dando lo de antes al recargar; ahí se prueba con
 * ?sw. Sin él el juego funciona igual, solo no se abre sin red.
 */
function registrarServiceWorker() {
  if (enApp() || !('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && !new URLSearchParams(location.search).has('sw')) return;
  const base = document.documentElement.dataset.base || './';
  navigator.serviceWorker.register(base + 'service-worker.js').catch(() => { /* sin offline */ });
}

/*
 * En la app sobran la prosa para los buscadores y el pie (enlaces fuera y
 * «Cookies», cuando dentro no hay analítica): se quitan, y la página no hace
 * scroll.
 */
function quitarLoDeLaWeb() {
  if (!enApp()) return;
  for (const selector of ['.info', '#pie']) document.querySelector(selector)?.remove();
  document.documentElement.classList.add('app');
}

/*
 * Entra o sale de la lupa según la orientación. La carrera sigue igual: solo
 * cambia cómo se ve. El lienzo de la lupa tiene la densidad de la pantalla
 * (hasta 2): ampliado, el mundo se veía borroso.
 */
let densidadLupa = 1;

function aplicarVista() {
  const lupa = LUPA_FORZADA || Boolean(VERTICAL?.matches);
  // En la lupa, el alto del lienzo sigue la proporción del sitio que hay (sin
  // las muescas): así no quedan bandas en un móvil alargado.
  let alto = 0;
  if (lupa) {
    const escena = lienzo.parentElement;
    const estilo = getComputedStyle(escena);
    const ancho = escena.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    alto = altoLupa(ancho, escena.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom));
  }
  const vista = lupa ? 'lupa-' + alto : 'mesa';
  if (vista === lienzo.dataset.vista) return;
  estado.lupa = lupa;
  lienzo.dataset.vista = vista;
  document.documentElement.classList.toggle('lupa', lupa);
  lienzo.style.setProperty('--alto-lupa', alto || '');
  densidadLupa = lupa ? Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1))) : 1;
  if (lupa) prepararLupa(densidadLupa, alto);
  lienzo.width = (lupa ? ANCHO_LUPA : ANCHO) * densidadLupa;
  lienzo.height = (lupa ? alto : ALTO) * densidadLupa;
  camara.lista = false;
  punteros.clear();
}

estado.tactil = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
estado.escenario = leerEscenario();
estado.hora = leerHora();
estado.modelo = leerModelo(MODELOS.map((m) => m.id));
const elegido = leerCircuito(CIRCUITOS.map((c) => c.clave));
estado.circuito = DIBUJADO || CIRCUITOS.find((c) => c.clave === elegido);
estado.decorado = generarDecorado(estado.circuito, estado.escenario);
iniciarLienzo(lienzo);
aplicarVista();
VERTICAL?.addEventListener?.('change', aplicarVista);
// La barra de direcciones del móvil cambia el alto sin girar.
window.addEventListener('resize', aplicarVista);
quitarLoDeLaWeb();
textosDelDocumento();
registrarServiceWorker();
cargarAnalitica();
irAPortada();
requestAnimationFrame(bucle);
