/*
 * Slot Panic — bucle, escenas y entrada.
 *
 * Es el único módulo que toca el DOM. Las reglas de la carrera viven en
 * `nucleo/slot.js`, que no lo toca, y por eso el arnés las ejecuta tal cual.
 */

import {
  ALTO, ANCHO, ANCHO_LUPA, CARRERAS, COLETEO_DESDE, COLOR, COLORES_COCHE, CONTROLES_SLOT, DEPURACION, DT_MAX, enApp, ESPERA_REINICIO, LARGO_COCHE, NIVELES_CPU,
  SITE_ORIGIN, TECLAS_BLOQUEADAS, VELOCIDAD_SLOT
} from './config.js';
import {
  aceptarNormas, estado, guardarAlias, guardarColores, guardarDuracion, guardarJugadores, guardarModo, guardarNivel, guardarMejorVuelta,
  guardarTipoFantasma, leerColores, leerFantasmaPropio, leerJugadores, leerMejorVuelta, leerModo, leerTipoFantasma, MODOS, TIPOS_FANTASMA,
  guardarCircuito, guardarEscenario, guardarMisCircuitos, guardarModelos, guardarPublicados, leerAlias, leerCircuito, leerDuracion, leerNivel,
  leerEscenario, leerLlave, leerMisCircuitos, leerModelos, leerPublicados, normasAceptadas
} from './estado.js';
import { ORDEN_ESCENARIOS } from './escenarios.js';
import { CIRCUITOS } from './circuitos/indice.js';
import { crearPiloto, decidirSlot } from './nucleo/piloto.js';
import { avanzarSlot, crearCarreraSlot } from './nucleo/slot.js';
import { generarDecorado } from './nucleo/decorado.js';
import { aPiezas, deCodigo, validarTrazado } from './nucleo/cuadricula.js';
import {
  acabarGesto, actualizarAviso, actualizarEdicion, avisar, borrar, botonesConstructor, crearEdicion, deshacer,
  dibujarConstructor, empezarGesto, listo, moverGesto
} from './constructor.js';
import { construirDePiezas } from './nucleo/piezas.js';
import { validarCircuito } from './nucleo/validar.js';
import { anotarCarrera, circuitoDelCampeonato, clasificacion, crearCampeonato } from './nucleo/campeonato.js';
import { posar } from './nucleo/fantasma.js';
import { iniciarLienzo } from './nucleo/lienzo.js';
import { dibujarCarriles, dibujarCocheSlot, dibujarFantasma, dibujarFondo, dibujarTorres } from './dibujo.js';
import { formatearTiempo } from './nucleo/slot.js';
import { MODELOS } from './coches.js';
import { cajasGrupos, cajasMenu, dibujarGrupos, dibujarMenu } from './menu.js';
import {
  actualizarParticulas, dibujarChispas, dibujarConfeti, dibujarHumo, emitirChispas, emitirConfeti, emitirHumo
} from './particulas.js';
import {
  botonesFin, cajaRecordsPortada, dibujarAvisos, dibujarDepuracion, dibujarFinSlot, dibujarMarcadorSlot, dibujarPortada, idsFinCampeonato,
  marcoMenu, nombreCircuito
} from './pantalla.js';
import {
  actualizarChirrido, actualizarZumbidos, alternarSilencio, asegurarAudio, sfxChoque, sfxClac, sfxCuenta, sfxFin, sfxSale,
  sfxSalida, sfxVuelta, vibrar
} from './audio.js';
import { cambiarIdioma, idiomaActual, t } from './i18n.js';
import { cargarAnalitica, evento } from './analitica.js';
import { apuntarJugado, borrarPublicado, cargarGaleria, denunciar, galeria, publicar } from './publicos.js';
import { cajasDialogo, cambiarLetra, crearDialogo, dibujarDialogo, escribirLetra, LETRAS_ALIAS, otroNombre } from './publicar.js';
import { cajasCircuitos, cajasGaleria, dibujarCircuitos, dibujarGaleria } from './galeria.js';
import { cargarRecords, entraEnTabla, enviarRecord, tablaDe } from './records.js';
import { cajasFirma, cajasRecords, dibujarFirma, dibujarRecords } from './tablaRecords.js';
import { guardarHora, leerHora, luzDeCarrera, ORDEN_HORAS, pintarHora } from './luz.js';
import {
  altoLienzoLupa, altoLupa, botonesFinCampeonatoLupa, cajaRecordsPortadaLupa, botonesFinLupa, conCamara, crearCamara, dibujarAvisosLupa, dibujarDepuracionLupa, dibujarFinLupa, dibujarMapa,
  dibujarMarcadorLupa, dibujarPortadaLupa, empezarFotogramaLupa, marcoMenuLupa, prepararLupa, seguirCamara, zoomLupa
} from './lupa.js';

const lienzo = document.getElementById('lienzo');
const otros = document.getElementById('otros');
const teclas = {};
const punteros = new Map();   // pointerId → 'izq' | 'der'
let punteroConstructor = null; // el dedo que dibuja en el constructor
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
 * Los circuitos de la cuadrícula. Uno compartido por su código (?c=<código>)
 * va el primero de la lista y no se recuerda; «Mis circuitos», los guardados
 * en este dispositivo, van detrás de los oficiales. Cada uno se corre si la
 * cuadrícula lo deja y cabe en la mesa.
 */
const DIBUJADO = circuitoDeCodigo(parametros.get('c'));
let MIOS = cargarMios();
// El último elegido en la galería: va el primero de la lista y no se recuerda.
let PUBLICO = null;

function listaCircuitos() {
  return [...(DIBUJADO ? [DIBUJADO] : []), ...(PUBLICO ? [PUBLICO] : []), ...CIRCUITOS, ...MIOS];
}

function cargarMios() {
  return leerMisCircuitos().map(({ n, codigo }) => circuitoDeCodigo(codigo, n)).filter(Boolean);
}

function circuitoDeCodigo(codigo, mio = null) {
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
  circuito.trazado = trazado;
  circuito.mio = mio;
  return circuito;
}

/*
 * Los dos pilotos de la exhibición de la portada (la CPU de la carrera es
 * la del nivel elegido, NIVELES_CPU en config.js). La semilla cambia en cada carrera.
 */
const EXHIBICION = [{ prudencia: 1.6, variacion: 0.25, fallo: 0.04 }, { prudencia: 1.3, variacion: 0.25, fallo: 0.04 }];
const semilla = () => Math.floor(Math.random() * 2 ** 32);

// --- Partidas -------------------------------------------------------------

/** Las vueltas de la carrera elegida (CARRERAS, en config.js). */
function vueltasElegidas() {
  return CARRERAS.find((c) => c.id === estado.duracion).vueltas;
}

/** Rápida, normal o resistencia: también vale para el campeonato. */
function cambiarDuracion() {
  const i = CARRERAS.findIndex((c) => c.id === estado.duracion);
  estado.duracion = CARRERAS[(i + 1) % CARRERAS.length].id;
  guardarDuracion(estado.duracion);
}

/** La CPU de la carrera: fácil, normal o difícil. */
function cambiarNivel() {
  const i = NIVELES_CPU.findIndex((n) => n.id === estado.nivel);
  estado.nivel = NIVELES_CPU[(i + 1) % NIVELES_CPU.length].id;
  guardarNivel(estado.nivel);
}

function cambiarHora() {
  estado.hora = ORDEN_HORAS[(ORDEN_HORAS.indexOf(estado.hora) + 1) % ORDEN_HORAS.length];
  guardarHora(estado.hora);
}

/*
 * Cada jugador elige su coche y su color (el menú COCHE); la exhibición de la
 * portada lo enseña ya. El modelo puede repetirse; el color, no: coger el del
 * otro es cambiárselo.
 */
function cambiarModelo(i, paso) {
  const n = MODELOS.length;
  const actual = MODELOS.findIndex((m) => m.id === estado.modelos[i]);
  estado.modelos[i] = MODELOS[(actual + paso + n) % n].id;
  guardarModelos(estado.modelos);
  vestir(estado.carrera);
}

function cambiarColor(i, color) {
  const otro = 1 - i;
  if (estado.colores[otro] === color) estado.colores[otro] = estado.colores[i];
  estado.colores[i] = color;
  guardarColores(estado.colores);
  vestir(estado.carrera);
}

function vestir(carrera) {
  carrera.coches.forEach((slot, i) => {
    slot.coche.modelo = estado.modelos[i];
    slot.coche.color = estado.colores[i];
  });
}

/** Carrera suelta o campeonato: lo que arranca la portada. */
function cambiarModo() {
  estado.modo = MODOS[(MODOS.indexOf(estado.modo) + 1) % MODOS.length];
  guardarModo(estado.modo);
}

/** Con teclado, quién lleva el carril i: una persona o la CPU. */
function cambiarJugador(i) {
  estado.jugadores[i] = estado.jugadores[i] === 'humano' ? 'cpu' : 'humano';
  guardarJugadores(estado.jugadores);
}

/*
 * Quién juega se elige solo con teclado y en la mesa. Tocando, cada carril es
 * de la CPU hasta que alguien toca su mitad; en la lupa, el J1 contra la CPU.
 */
const eligeJugadores = () => !estado.tactil && !estado.lupa;

/** Desde la portada: la carrera o el campeonato, según el modo. */
function arrancar() {
  estado.menu = null;
  if (estado.modo === 'campeonato') empezarCampeonato();
  else empezarCarrera();
}

function cambiarEscenario() {
  const i = ORDEN_ESCENARIOS.indexOf(estado.escenario);
  estado.escenario = ORDEN_ESCENARIOS[(i + 1) % ORDEN_ESCENARIOS.length];
  guardarEscenario(estado.escenario);
  estado.decorado = generarDecorado(estado.circuito, estado.escenario);
}

/** El circuito siguiente: su decorado y, en la portada, la exhibición en él. */
function cambiarCircuito() {
  const lista = listaCircuitos();
  const i = lista.indexOf(estado.circuito);
  estado.circuito = lista[(i + 1) % lista.length];
  if (estado.circuito !== DIBUJADO && estado.circuito !== PUBLICO) guardarCircuito(estado.circuito.clave);
  estado.decorado = generarDecorado(estado.circuito, estado.escenario);
  irAPortada();
}

// --- El campeonato ---------------------------------------------------------

/*
 * Los circuitos oficiales, uno detrás de otro (`nucleo/campeonato.js`).
 * Mientras dura, el fin lleva a la carrera siguiente y ESC lo abandona.
 */
function empezarCampeonato() {
  estado.campeonato = crearCampeonato(CIRCUITOS);
  evento('empezar_campeonato', { vueltas: vueltasElegidas(), cpu: estado.nivel, tactil: estado.tactil, lupa: estado.lupa });
  correrSiguiente();
}

function correrSiguiente() {
  estado.circuito = circuitoDelCampeonato(estado.campeonato);
  estado.decorado = generarDecorado(estado.circuito, estado.escenario);
  empezarCarrera();
}

/** Lo que se lee en la cuenta atrás de una carrera del campeonato. */
function rotuloCampeonato() {
  const { campeonato } = estado;
  if (!campeonato) return null;
  const n = campeonato.carreras.length + 1;
  return `${t('campeonato.carrera', { n, total: campeonato.circuitos.length })} · ${nombreCircuito(estado.circuito)}`;
}

/** Repetir en el fin: la misma carrera o, acabado el campeonato, otro. */
function repetir() {
  if (estado.campeonato) empezarCampeonato();
  else empezarCarrera();
}

/** Seguir en el fin: en el campeonato, la siguiente; si no, repetir. */
function seguir() {
  if (estado.campeonato && !clasificacion(estado.campeonato).acabado) correrSiguiente();
  else repetir();
}

// --- El constructor ---------------------------------------------------------

let circuitoAntes = null;     // el de la portada, para volver a él sin guardar
let salirSinGuardar = false;  // el primer «volver» con cambios sin guardar avisa
let eliminarPendiente = false; // y el primer «eliminar», también
let pulsadoPendiente = null;   // el dedo que pulsó un botón que actúa al soltar: { id, caja, p }

/*
 * Se abre con el circuito de la portada si es de la cuadrícula (uno mío se
 * edita y se guarda encima; uno compartido, se guarda como nuevo) o vacío.
 */
function abrirConstructor() {
  const { circuito } = estado;
  circuitoAntes = circuito;
  estado.edicion = crearEdicion(circuito.trazado || null, circuito.mio || null);
  actualizarEdicion(estado.edicion, estado.escenario);
  salirSinGuardar = false;
  eliminarPendiente = false;
  estado.fase = 'constructor';
  estado.probando = false;
  punteros.clear();
  aplicarVista();
  evento('abrir_constructor', datosCarrera());
}

function volverAlConstructor() {
  estado.probando = false;
  estado.fase = 'constructor';
  limpiarPista();
  actualizarEdicion(estado.edicion, estado.escenario);
  punteros.clear();
  aplicarVista();
}

/** Prueba lo que hay, contra la CPU; al acabar, de vuelta al constructor. */
function probarConstructor() {
  const edicion = estado.edicion;
  if (!listo(edicion)) return;
  estado.circuito = edicion.circuito;
  estado.decorado = edicion.decorado;
  estado.probando = true;
  edicion.aviso = null;
  empezarCarrera();
  aplicarVista();
}

function guardarConstructor() {
  const edicion = estado.edicion;
  if (!listo(edicion) || (edicion.guardado && edicion.mio)) return;
  const lista = leerMisCircuitos();
  const propio = lista.find((c) => c.n === edicion.mio);
  if (propio) propio.codigo = edicion.codigo;
  else {
    edicion.mio = lista.reduce((n, c) => Math.max(n, c.n), 0) + 1;
    lista.push({ n: edicion.mio, codigo: edicion.codigo });
  }
  if (!guardarMisCircuitos(lista)) {
    avisar(edicion, t('constructor.sinSitio'), COLOR.rojo);
    return;
  }
  edicion.guardado = true;
  edicion.circuito.mio = edicion.mio;
  MIOS = cargarMios();
  avisar(edicion, t('constructor.guardadoAviso'), COLOR.verde);
  evento('guardar_circuito', { casillas: edicion.trazo.casillas.length });
}

/*
 * A la portada. Con lo guardado elegido; si no, con el circuito de antes. Con
 * cambios sin guardar, el primer «volver» solo avisa.
 */
function salirDelConstructor() {
  const edicion = estado.edicion;
  if (!edicion.guardado && edicion.historial.length && !salirSinGuardar) {
    salirSinGuardar = true;
    avisar(edicion, t('constructor.sinGuardar'), COLOR.rojo);
    return;
  }
  const guardado = edicion.guardado && edicion.mio && MIOS.find((c) => c.mio === edicion.mio);
  estado.circuito = guardado || circuitoAntes;
  if (guardado) guardarCircuito(guardado.clave);
  estado.decorado = generarDecorado(estado.circuito, estado.escenario);
  estado.edicion = null;
  estado.probando = false;
  irAPortada();
  aplicarVista();
}

/*
 * Quita el circuito de «Mis circuitos» y vuelve a la portada. El primer toque
 * solo avisa: no se puede deshacer.
 */
function eliminarConstructor() {
  const edicion = estado.edicion;
  if (!edicion.mio) return;
  if (!eliminarPendiente) {
    eliminarPendiente = true;
    avisar(edicion, t('constructor.eliminarOtraVez'), COLOR.rojo);
    return;
  }
  const lista = leerMisCircuitos().filter((c) => c.n !== edicion.mio);
  if (!guardarMisCircuitos(lista)) {
    avisar(edicion, t('constructor.sinSitio'), COLOR.rojo);
    return;
  }
  const quitado = edicion.mio;
  MIOS = cargarMios();
  evento('eliminar_circuito');
  estado.circuito = circuitoAntes.mio === quitado ? CIRCUITOS[0] : circuitoAntes;
  guardarCircuito(estado.circuito.clave);
  estado.decorado = generarDecorado(estado.circuito, estado.escenario);
  estado.edicion = null;
  estado.probando = false;
  irAPortada();
  aplicarVista();
}

/*
 * El enlace que abre este circuito en la web (también desde la app, cuyo
 * origen es https://localhost), en el idioma de ahora.
 */
function enlaceCircuito(codigo) {
  return `${SITE_ORIGIN}${idiomaActual().dir}?c=${codigo}`;
}

/*
 * Con el menú de compartir del sistema si lo hay; si no, al portapapeles. Los
 * dos piden un gesto del usuario: con el dedo, se llama al soltarlo.
 */
async function compartirConstructor() {
  const edicion = estado.edicion;
  if (!listo(edicion)) return;
  const url = enlaceCircuito(edicion.codigo);
  evento('compartir_circuito', { casillas: edicion.trazo.casillas.length });
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Slot Panic', url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;   // lo ha cerrado quien comparte
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    avisar(edicion, t('constructor.enlaceCopiado'), COLOR.verde);
  } catch (error) {
    avisar(edicion, t('constructor.sinCompartir'), COLOR.rojo);
  }
}

/*
 * Compartir abre un diálogo (publicar.js): copiar el enlace o publicar en la
 * galería. La primera vez que se publica, las normas.
 */
function abrirDialogo() {
  const edicion = estado.edicion;
  if (!listo(edicion)) return;
  edicion.dialogo = crearDialogo(leerAlias());
}

function accionDialogo(caja) {
  const edicion = estado.edicion;
  const dialogo = edicion?.dialogo;
  if (!dialogo || dialogo.paso === 'enviando') return;
  if (caja.id === 'cancelar') edicion.dialogo = null;
  else if (caja.id === 'enlace') {
    edicion.dialogo = null;
    compartirConstructor();
  } else if (caja.id === 'publicar') dialogo.paso = normasAceptadas() ? 'publicar' : 'normas';
  else if (caja.id === 'aceptar') {
    aceptarNormas();
    dialogo.paso = 'publicar';
  } else if (caja.id === 'otro') otroNombre(dialogo);
  else if (caja.id === 'arriba') cambiarLetra(dialogo, caja.i, 1);
  else if (caja.id === 'abajo') cambiarLetra(dialogo, caja.i, -1);
  else if (caja.id === 'enviar') enviarPublicacion();
}

/** Publica lo que hay. Sin red, o con el límite del día, lo dice y no pasa nada más. */
async function enviarPublicacion() {
  const edicion = estado.edicion;
  const { dialogo } = edicion;
  const alias = dialogo.alias.join('');
  guardarAlias(alias);
  dialogo.paso = 'enviando';
  let aviso, color = COLOR.rojo;
  try {
    const { id, nuevo } = await publicar({
      codigo: edicion.codigo, alias, adjetivo: dialogo.adjetivo, sustantivo: dialogo.sustantivo, llave: leerLlave()
    });
    if (nuevo) guardarPublicados([...leerPublicados(), { id, codigo: edicion.codigo }]);
    aviso = nuevo ? 'publicar.hecho' : 'publicar.yaEstaba';
    color = COLOR.verde;
    evento('publicar_circuito', { nuevo, casillas: edicion.trazo.casillas.length });
  } catch (error) {
    aviso = { 429: 'publicar.limite', 409: 'publicar.retirado', 0: 'publicar.sinRed' }[error.estado] || 'publicar.error';
  }
  edicion.dialogo = null;
  avisar(edicion, t(aviso), color);
}

function botonConstructor(id) {
  const edicion = estado.edicion;
  if (id !== 'volver') salirSinGuardar = false;
  if (id !== 'eliminar') eliminarPendiente = false;
  if (id === 'volver') salirDelConstructor();
  else if (id === 'eliminar') eliminarConstructor();
  else if (id === 'compartir') abrirDialogo();
  else if (id === 'deshacer') deshacer(edicion, estado.escenario);
  else if (id === 'borrar') borrar(edicion, estado.escenario);
  else if (id === 'probar') probarConstructor();
  else if (id === 'guardar') guardarConstructor();
}

// --- La galería -------------------------------------------------------------

/*
 * Los circuitos que ha publicado la gente (galeria.js, publicos.js). Elegir
 * uno lo lleva a la portada, el primero de la lista. Borrar lo propio y
 * denunciar lo ajeno piden un segundo toque.
 */
const galeriaUI = { pendiente: null, aviso: null };

/** CIRCUITOS, en la portada: elegir entre la galería y el constructor. */
function abrirCircuitos() {
  estado.fase = 'circuitos';
  punteros.clear();
  aplicarVista();
}

function pulsarCircuitos(id) {
  if (id === 'galeria') abrirGaleria();
  else if (id === 'construir') abrirConstructor();
  else if (id === 'volver') {
    irAPortada();
    aplicarVista();
  }
}

function abrirGaleria() {
  estado.fase = 'galeria';
  galeriaUI.pendiente = null;
  galeriaUI.aviso = null;
  cargarGaleria(galeria.orden, 0);
  punteros.clear();
  aplicarVista();
  evento('abrir_galeria', { lupa: estado.lupa });
}

function vistaGaleria() {
  return estado.lupa ? { ancho: ANCHO_LUPA, alto: altoLienzoLupa() } : { ancho: ANCHO, alto: ALTO };
}

function avisarGaleria(clave, color = COLOR.ambar) {
  galeriaUI.aviso = { texto: t(clave), color, vida: 1.8 };
}

const propios = () => new Set(leerPublicados().map((c) => c.id));

function elegirPublico(publico) {
  const circuito = circuitoDeCodigo(publico.codigo);
  if (!circuito) {
    avisarGaleria('galeria.noCorre', COLOR.rojo);
    return;
  }
  circuito.publico = publico;
  PUBLICO = circuito;
  estado.circuito = circuito;
  estado.decorado = generarDecorado(circuito, estado.escenario);
  irAPortada();
  aplicarVista();
}

function pulsarGaleria(caja) {
  const lista = galeria.lista || [];
  if (caja.id !== 'esquina') galeriaUI.pendiente = null;
  if (caja.id === 'volver') {
    irAPortada();
    aplicarVista();
  } else if (caja.id === 'orden') cargarGaleria(galeria.orden === 'jugados' ? 'nuevos' : 'jugados', 0);
  else if (caja.id === 'construir') abrirConstructor();
  else if (caja.id === 'anterior' && galeria.pagina > 0) cargarGaleria(galeria.orden, galeria.pagina - 1);
  else if (caja.id === 'siguiente' && galeria.mas) cargarGaleria(galeria.orden, galeria.pagina + 1);
  else if (caja.id === 'tarjeta') elegirPublico(lista[caja.i]);
  else if (caja.id === 'esquina') esquinaGaleria(lista[caja.i], caja.i);
}

/** La esquina de una tarjeta: el primer toque avisa; el segundo borra (lo propio) o denuncia (lo ajeno). */
function esquinaGaleria(publico, i) {
  const propio = propios().has(publico.id);
  if (galeriaUI.pendiente?.i !== i) {
    galeriaUI.pendiente = { i };
    avisarGaleria(propio ? 'galeria.borrarOtraVez' : 'galeria.denunciarOtraVez', COLOR.rojo);
    return;
  }
  galeriaUI.pendiente = null;
  const peticion = propio ? borrarPublicado(publico.id, leerLlave()) : denunciar(publico.id);
  peticion.then(() => {
    if (propio) guardarPublicados(leerPublicados().filter((c) => c.id !== publico.id));
    avisarGaleria(propio ? 'galeria.borrado' : 'galeria.denunciado', COLOR.verde);
    evento(propio ? 'borrar_publico' : 'denunciar_publico');
    cargarGaleria();
  }, () => avisarGaleria('publicar.sinRed', COLOR.rojo));
}

/** Salir de una carrera: a la portada (abandonando el campeonato) o, si era la prueba, al constructor. */
function alMenu() {
  if (estado.probando) volverAlConstructor();
  else {
    estado.campeonato = null;
    estado.menu = null;
    irAPortada();
  }
}

function limpiarPista() {
  camara.lista = false;
  estado.avisos = [];
  estado.particulas.length = 0;
}

/** La portada hace correr a dos pilotos por el circuito: enseña de qué va el juego. */
function irAPortada() {
  estado.fase = 'portada';
  if (conRecords()) cargarRecords(estado.circuito.clave);
  estado.carrera = crearCarreraSlot(estado.circuito, estado.colores);
  vestir(estado.carrera);
  estado.pilotos = EXHIBICION.map((opciones) => crearPiloto({ ...opciones, semilla: semilla() }));
  estado.humanos = [false, false];
  estado.carrera.fase = 'carrera';   // sin cuenta atrás: la exhibición ya está en marcha
  limpiarPista();
}

/*
 * Con teclado, cada carril es de quien diga CARRERA (una persona o la CPU).
 * Tocando, lo lleva la CPU hasta que alguien toca su mitad de la pantalla;
 * desde ahí es suyo toda la carrera: juegan uno o dos sin menú.
 */
function empezarCarrera() {
  evento('empezar_carrera', datosCarrera());
  if (estado.circuito.publico) apuntarJugado(estado.circuito.publico.id);
  estado.denuncia = null;
  estado.fase = 'carrera';
  // Cada carrera, los coches se cambian de carril: no son iguales.
  estado.turno = 1 - estado.turno;
  estado.carrera = crearCarreraSlot(estado.circuito, estado.colores, estado.turno, { vueltas: vueltasElegidas(), grabar: conRecords() });
  vestir(estado.carrera);
  estado.carrera.anochece = !!CARRERAS.find((c) => c.id === estado.duracion).anochece;
  const { piloto } = NIVELES_CPU.find((n) => n.id === estado.nivel);
  estado.pilotos = [0, 1].map(() => crearPiloto({ ...piloto, semilla: semilla() }));
  estado.humanos = [false, false];
  if (eligeJugadores()) {
    estado.carrera.coches.forEach((slot, i) => {
      if (estado.jugadores[i] !== 'humano') return;
      estado.humanos[i] = true;
      slot.humanoDesde = 0;
    });
  }
  estado.fantasma = fantasmaElegido();
  if (conRecords()) cargarRecords(estado.circuito.clave);
  estado.ultimaAvisada = false;
  limpiarPista();
}

// --- Récords -------------------------------------------------------------------

/** Solo los circuitos oficiales tienen récords (y fantasma). */
const conRecords = () => CIRCUITOS.includes(estado.circuito);

/*
 * El fantasma propio del J1 (el que se guarda en el dispositivo). El del
 * récord no se fija al empezar: la tabla puede llegar con la carrera ya en
 * marcha, y se mira al pintar (`fantasmaDelJ1`).
 */
function fantasmaElegido() {
  if (!conRecords() || estado.tipoFantasma === 'no') return null;
  return leerFantasmaPropio(estado.circuito.clave);
}

/** Contra qué fantasma corre ahora el J1: el del récord si se eligió y ha llegado; si no, el propio. */
function fantasmaDelJ1() {
  if (estado.tipoFantasma === 'record' && conRecords()) return tablaDe(estado.circuito.clave).fantasma || estado.fantasma;
  return estado.fantasma;
}

/*
 * Una vuelta acabada: si la ha dado entera una persona (tomó el carril antes
 * de empezarla) y baja de su mejor vuelta, es récord personal: se guarda con
 * su fantasma y, si corría contra el propio, la siguiente ya corre contra ella.
 */
function apuntarVuelta(i) {
  if (!conRecords()) return;
  const slot = estado.carrera.coches[i];
  const vuelta = slot.grabadas.at(-1);
  if (!vuelta || slot.humanoDesde === undefined || vuelta.inicio < slot.humanoDesde) return;
  const { clave } = estado.circuito;
  const mejor = leerMejorVuelta(clave);
  if (mejor && vuelta.tiempo >= mejor.tiempo) return;
  guardarMejorVuelta(clave, vuelta);
  estado.avisos.push({ texto: t('aviso.recordVuelta', { tiempo: formatearTiempo(vuelta.tiempo) }), vida: 1.8, color: COLOR.verde });
  if (i === 0 && estado.tipoFantasma === 'tuyo') estado.fantasma = vuelta;
}

/** Lo que dice la portada de un oficial: tu mejor vuelta, si la tienes. */
function marcaPortada() {
  if (!conRecords()) return null;
  const { clave } = estado.circuito;
  const primero = tablaDe(clave).lista?.[0];
  const mejor = leerMejorVuelta(clave);
  const partes = [
    primero && t('portada.record', { tiempo: formatearTiempo(primero.vuelta / 1000), alias: primero.alias }),
    mejor && t('portada.tuMejor', { tiempo: formatearTiempo(mejor.tiempo) })
  ].filter(Boolean);
  return partes.length ? partes.join('  ·  ') : t('portada.verRecords');
}

/*
 * La mejor vuelta de la carrera que haya dado entera una persona (de los dos
 * coches, si juegan dos), con su fantasma; o null.
 */
function mejorVueltaHumana() {
  let mejor = null;
  estado.carrera.coches.forEach((slot, i) => {
    if (!estado.humanos[i] || slot.humanoDesde === undefined) return;
    for (const vuelta of slot.grabadas) {
      if (vuelta.inicio >= slot.humanoDesde && (!mejor || vuelta.tiempo < mejor.tiempo)) mejor = vuelta;
    }
  });
  return mejor;
}

// --- La tabla de récords y la firma --------------------------------------------

/*
 * RÉCORDS (tablaRecords.js), desde la portada (botón o R) o tras firmar.
 * Desde el fin, SEGUIR vuelve al cartel.
 */
const recordsUI = { desdeFin: false, resaltado: null };

function abrirRecords(desdeFin = false, resaltado = null) {
  if (!conRecords()) return;
  Object.assign(recordsUI, { desdeFin, resaltado });
  estado.fase = 'records';
  if (!resaltado) cargarRecords(estado.circuito.clave);
  punteros.clear();
}

function salirDeRecords() {
  if (recordsUI.desdeFin) estado.fase = 'fin';
  else irAPortada();
}

function cambiarTipoFantasma() {
  estado.tipoFantasma = TIPOS_FANTASMA[(TIPOS_FANTASMA.indexOf(estado.tipoFantasma) + 1) % TIPOS_FANTASMA.length];
  guardarTipoFantasma(estado.tipoFantasma);
}

/*
 * Al acabar, si la mejor vuelta humana entra en la tabla, se firma antes del
 * cartel (como en Race Panic). En el campeonato y en la prueba del
 * constructor, no: sería parar a mitad.
 */
function pedirFirma() {
  if (!conRecords() || estado.campeonato || estado.probando) return false;
  const vuelta = mejorVueltaHumana();
  if (!vuelta || !entraEnTabla(estado.circuito.clave, vuelta.tiempo)) return false;
  estado.firma = { vuelta, letras: leerAlias().split(''), cursor: 0, enviando: false };
  estado.fase = 'firma';
  return true;
}

const LETRAS_FIRMA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function cambiarLetraFirma(i, paso) {
  const { letras } = estado.firma;
  const n = LETRAS_FIRMA.length;
  letras[i] = LETRAS_FIRMA[(LETRAS_FIRMA.indexOf(letras[i]) + paso + n) % n];
}

async function firmar() {
  const { firma } = estado;
  if (firma.enviando) return;
  const alias = firma.letras.join('');
  guardarAlias(alias);
  firma.enviando = true;
  const { clave } = estado.circuito;
  try {
    const puesto = await enviarRecord(clave, alias, firma.vuelta);
    evento('firmar_record', { ...datosCarrera(), puesto, vuelta: Math.round(firma.vuelta.tiempo * 1000) });
    estado.firma = null;
    abrirRecords(true, puesto);
  } catch (error) {
    estado.firma = null;
    estado.fase = 'fin';
    const clave2 = { 429: 'firma.limite', 0: 'firma.sinRed' }[error.estado] || 'firma.error';
    estado.avisoFin = { texto: t(clave2), vida: 3 };
  }
}

function terminarCarrera() {
  estado.fase = 'fin';
  estado.esperaReinicio = ESPERA_REINICIO;
  let gana = estado.humanos[estado.carrera.ganador];
  evento('acabar_carrera', { ...datosCarrera(), jugadores: estado.humanos.filter(Boolean).length });
  const { campeonato } = estado;
  if (campeonato) {
    anotarCarrera(campeonato, estado.carrera, estado.humanos);
    const { acabado, delante } = clasificacion(campeonato);
    // Al acabar, lo que se celebra es el campeonato.
    if (acabado) {
      gana = delante !== null && estado.humanos[delante];
      evento('acabar_campeonato', { campeon: delante === null ? 'empate' : nombreDe(delante), tactil: estado.tactil });
    }
  }
  sfxFin(gana);
  if (gana) emitirConfeti(estado.particulas);
  pedirFirma();
}

/*
 * Los botones del fin fuera del campeonato. En un circuito público ajeno,
 * también denunciarlo: el primer toque pregunta y el segundo lo envía.
 */
function idsFin() {
  const { publico } = estado.circuito;
  if (!publico || propios().has(publico.id) || estado.probando) return ['repetir', 'menu'];
  return ['repetir', 'menu', { null: 'denunciar', pendiente: 'confirmarDenuncia', hecha: 'denunciado' }[estado.denuncia]];
}

function denunciarDesdeFin() {
  estado.denuncia = 'hecha';
  denunciar(estado.circuito.publico.id).catch(() => { estado.denuncia = null; });
  evento('denunciar_publico');
}

/** Para la analítica: quién llevaba un coche. */
function nombreDe(i) {
  return estado.humanos[i] ? 'j' + (i + 1) : 'cpu';
}

/** Lo que acompaña a cada evento de carrera en la analítica. */
function datosCarrera() {
  return {
    circuito: estado.circuito.publico ? 'publico' : estado.circuito.dibujado ? 'dibujado' : estado.circuito.clave,
    escenario: estado.escenario,
    hora: estado.hora,
    vueltas: vueltasElegidas(),
    cpu: estado.nivel,
    coche: estado.modelos[0],
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
    // Con teclado, el carril de la CPU no se toma pulsando.
    if (eligeJugadores() && !estado.humanos[i]) return decidirSlot(estado.pilotos[i], slot, carrera.circuito);
    if (pulsado && !estado.humanos[i]) {
      estado.humanos[i] = true;
      slot.humanoDesde = carrera.fase === 'carrera' ? carrera.tiempo : 0;
    }
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
  ESCENAS[estado.fase].pulsar(p, evento.pointerId);
  // Capturar el puntero es una comodidad (seguir el dedo fuera del lienzo); si
  // el navegador se niega, no puede llevarse por delante la pulsación.
  try { lienzo.setPointerCapture(evento.pointerId); } catch (error) { /* sin captura */ }
});
lienzo.addEventListener('pointermove', (evento) => {
  if (punteros.has(evento.pointerId)) punteros.set(evento.pointerId, ladoDe(aLienzo(evento)));
  ESCENAS[estado.fase].mover?.(aLienzo(evento), evento.pointerId);
});
for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  lienzo.addEventListener(tipo, (evento) => {
    punteros.delete(evento.pointerId);
    ESCENAS[estado.fase].soltar?.(evento.pointerId);
  });
}

function opcionPulsada(id) {
  if (id === 'modo') cambiarModo();
  else if (id === 'j1') cambiarJugador(0);
  else if (id === 'j2') cambiarJugador(1);
  else if (id === 'circuito') cambiarCircuito();
  else if (id === 'sonido') alternarSilencio();
  else if (id === 'idioma') { cambiarIdioma(1); textosDelDocumento(); }
  else if (id === 'escenario') cambiarEscenario();
  else if (id === 'hora') cambiarHora();
  else if (id === 'duracion') cambiarDuracion();
  else if (id === 'nivel') cambiarNivel();
}

// --- El menú de la portada ----------------------------------------------------

/* Lo que menu.js necesita de la vista de ahora: dónde va cada cosa. */
const vistaMenu = () => ({ ...vistaGaleria(), lupa: estado.lupa });
const marcoActual = () => (estado.lupa ? marcoMenuLupa() : marcoMenu());
const opcionesMenu = () => ({ columnas: estado.lupa ? 1 : 2, eligeJugadores: eligeJugadores(), lupa: estado.lupa, teclado: !estado.tactil });

/** Un grupo de la barra: CIRCUITOS es su escena; los demás abren (o cierran) su panel. */
function pulsarGrupo(id) {
  if (id === 'circuitos') {
    estado.menu = null;
    abrirCircuitos();
  } else estado.menu = estado.menu === id ? null : id;
}

/*
 * Un toque con el panel abierto: lo de dentro actúa; fuera de él lo cierra
 * (y no arranca: con el panel abierto, un toque perdido no es correr).
 */
function pulsarMenu(p) {
  const marco = marcoActual();
  const { cajas, alto, ancho } = cajasMenu(marco, estado.menu, opcionesMenu());
  const caja = cajas.find((c) => dentro(p, c));
  if (!caja) {
    const fondo = { x: marco.x + marco.ancho / 2 - ancho / 2, y: marco.y, ancho, alto };
    if (!dentro(p, fondo)) estado.menu = null;
  } else if (caja.id === 'opcion') opcionPulsada(caja.opcion);
  else if (caja.id === 'listo') estado.menu = null;
  else if (caja.id === 'vista') cambiarModelo(caja.i, 1);
  else if (caja.id === 'modelo') cambiarModelo(caja.i, caja.paso);
  else if (caja.id === 'color') cambiarColor(caja.i, COLORES_COCHE[caja.c]);
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

/*
 * El fantasma del J1, con el reloj de su vuelta: debajo de los coches y
 * translúcido. En la cuenta atrás ya está en la parrilla; luego, mientras el
 * J1 lo conduzca alguien.
 */
function pintarFantasma() {
  const { carrera } = estado;
  const fantasma = fantasmaDelJ1();
  if (!fantasma || estado.fase !== 'carrera') return;
  if (carrera.fase !== 'cuenta' && !estado.humanos[0]) return;
  const slot = carrera.coches[0];
  const pose = posar(fantasma, carrera.tiempo - slot.inicioVuelta);
  if (pose) dibujarFantasma(pose, slot.coche);
}

function pintarMundo() {
  const luz = luzAhora();
  dibujarFondo(estado.circuito, estado.decorado, luz);
  dibujarCarriles(estado.circuito);
  dibujarTorres(estado.decorado, luz);
  dibujarHumo(estado.particulas);
  pintarFantasma();
  // El que va por el aire, encima.
  const coches = [...estado.carrera.coches].sort((a, b) => a.altura - b.altura);
  coches.forEach(dibujarCocheSlot);
  pintarHora(luz, estado.circuito, estado.decorado, coches.map((slot) => slot.coche));
  dibujarChispas(estado.particulas);
}

/*
 * La luz de ahora: la hora elegida o, en una carrera que anochece (la de
 * resistencia), la que toca por lo que lleva corrido el primero, del día a la noche.
 */
function luzAhora() {
  const { carrera } = estado;
  if (!carrera.anochece) return ORDEN_HORAS.indexOf(estado.hora);
  const corrido = Math.max(...carrera.coches.map((slot) => slot.progreso));
  const fraccion = Math.min(1, Math.max(0, corrido / (carrera.vueltas * carrera.circuito.largo)));
  return luzDeCarrera(fraccion);
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
  constructor: {
    actualizar(dt) {
      actualizarAviso(estado.edicion, dt);
      sonido(false);
    },
    dibujar() {
      const { edicion } = estado;
      const nombre = edicion.mio ? t('circuito.mio', { n: edicion.mio }) : t('circuito.dibujado');
      dibujarConstructor(edicion, { tiempo: reloj, tactil: estado.tactil, nombre });
      if (edicion.dialogo) dibujarDialogo(edicion.dialogo, estado.tactil);
    },
    teclear(codigo) {
      const { dialogo } = estado.edicion;
      if (dialogo) {
        const letra = /^Key([A-Z])$/.exec(codigo)?.[1] || /^(?:Digit|Numpad)([0-9])$/.exec(codigo)?.[1];
        if (codigo === 'Escape') accionDialogo({ id: 'cancelar' });
        else if (dialogo.paso === 'normas' && empezar(codigo)) accionDialogo({ id: 'aceptar' });
        else if (dialogo.paso === 'publicar' && empezar(codigo)) accionDialogo({ id: 'enviar' });
        else if (dialogo.paso === 'publicar' && letra && LETRAS_ALIAS.includes(letra)) escribirLetra(dialogo, letra);
        return;
      }
      if (codigo === 'Escape') botonConstructor('volver');
      else if (codigo === 'Backspace' || codigo === 'KeyZ') botonConstructor('deshacer');
      else if (codigo === 'Delete') botonConstructor('borrar');
      else if (empezar(codigo)) botonConstructor('probar');
      else if (codigo === 'KeyG') botonConstructor('guardar');
      else if (codigo === 'KeyX') botonConstructor('eliminar');
      else if (codigo === 'KeyS') botonConstructor('compartir');
    },
    pulsar(p, id) {
      punteros.clear();
      if (punteroConstructor !== null) return;   // dibuja un dedo; los demás no cuentan
      const { dialogo } = estado.edicion;
      if (dialogo) {
        // Los botones del diálogo actúan al soltar: copiar el enlace pide un gesto completo.
        const caja = cajasDialogo(dialogo).find((b) => dentro(p, b));
        if (caja) pulsadoPendiente = { id, caja, p };
        return;
      }
      const caja = botonesConstructor().find((b) => dentro(p, b));
      if (caja) botonConstructor(caja.id);
      if (caja) return;
      salirSinGuardar = false;
      eliminarPendiente = false;
      punteroConstructor = id;
      empezarGesto(estado.edicion, p);
    },
    mover(p, id) {
      if (id === punteroConstructor) moverGesto(estado.edicion, p);
      if (id === pulsadoPendiente?.id) pulsadoPendiente.p = p;
    },
    soltar(id) {
      if (id === pulsadoPendiente?.id) {
        const { caja, p } = pulsadoPendiente;
        pulsadoPendiente = null;
        if (dentro(p, caja)) accionDialogo(caja);
      }
      if (id !== punteroConstructor) return;
      punteroConstructor = null;
      acabarGesto(estado.edicion, estado.escenario);
    }
  },

  records: {
    actualizar(dt) {
      // Detrás, la exhibición (desde la portada) o los coches parándose (desde el fin).
      if (recordsUI.desdeFin) avanzarMundo([], dt);
      else ESCENAS.portada.actualizar(dt);
      if (estado.fase === 'portada') estado.fase = 'records';
      sonido(false);
    },
    dibujar() {
      dibujarMundo();
      const { clave } = estado.circuito;
      dibujarRecords(vistaGaleria(), {
        nombre: nombreCircuito(estado.circuito), tabla: tablaDe(clave), mejor: leerMejorVuelta(clave),
        tipoFantasma: estado.tipoFantasma, resaltado: recordsUI.resaltado, desdeFin: recordsUI.desdeFin, tiempo: reloj
      });
    },
    teclear(codigo) {
      if (codigo === 'Escape' || empezar(codigo)) salirDeRecords();
      else if (codigo === 'KeyF') cambiarTipoFantasma();
    },
    pulsar(p) {
      punteros.clear();
      const caja = cajasRecords(vistaGaleria()).find((c) => dentro(p, c));
      if (caja?.id === 'volver') salirDeRecords();
      else if (caja?.id === 'fantasma') cambiarTipoFantasma();
    }
  },

  firma: {
    actualizar(dt) {
      avanzarMundo([], dt);
      estado.esperaReinicio = Math.max(0, estado.esperaReinicio - dt);
      sonido(false);
    },
    dibujar() {
      dibujarMundo();
      dibujarFirma(vistaGaleria(), { ...estado.firma, tactil: estado.tactil });
    },
    teclear(codigo) {
      // Quien cruza la meta lleva una tecla pisada: hasta que pasa la espera, nada.
      if (estado.esperaReinicio > 0 || estado.firma.enviando) return;
      const letra = /^Key([A-Z])$/.exec(codigo)?.[1] || /^(?:Digit|Numpad)([0-9])$/.exec(codigo)?.[1];
      const { firma } = estado;
      if (codigo === 'Escape') estado.fase = 'fin';
      else if (empezar(codigo)) firmar();
      else if (letra) {
        firma.letras[firma.cursor] = letra;
        firma.cursor = (firma.cursor + 1) % firma.letras.length;
      }
    },
    pulsar(p) {
      punteros.clear();
      if (estado.esperaReinicio > 0 || estado.firma.enviando) return;
      const caja = cajasFirma(vistaGaleria()).find((c) => dentro(p, c));
      if (caja?.id === 'arriba') cambiarLetraFirma(caja.i, 1);
      else if (caja?.id === 'abajo') cambiarLetraFirma(caja.i, -1);
      else if (caja?.id === 'firmar') firmar();
      else if (caja?.id === 'saltar') estado.fase = 'fin';
    }
  },

  circuitos: {
    actualizar() {
      sonido(false);
    },
    dibujar() {
      dibujarCircuitos(vistaGaleria(), estado.tactil);
    },
    teclear(codigo) {
      if (codigo === 'Escape') pulsarCircuitos('volver');
      else if (codigo === 'KeyG') pulsarCircuitos('galeria');
      else if (codigo === 'KeyB') pulsarCircuitos('construir');
    },
    pulsar(p) {
      punteros.clear();
      const caja = cajasCircuitos(vistaGaleria()).find((c) => dentro(p, c));
      if (caja) pulsarCircuitos(caja.id);
    }
  },

  galeria: {
    actualizar(dt) {
      if (galeriaUI.aviso && (galeriaUI.aviso.vida -= dt) <= 0) galeriaUI.aviso = null;
      sonido(false);
    },
    dibujar() {
      dibujarGaleria(vistaGaleria(), { galeria, propios: propios(), pendiente: galeriaUI.pendiente, aviso: galeriaUI.aviso });
    },
    teclear(codigo) {
      if (codigo === 'Escape') pulsarGaleria({ id: 'volver' });
      else if (codigo === 'ArrowLeft') pulsarGaleria({ id: 'anterior' });
      else if (codigo === 'ArrowRight') pulsarGaleria({ id: 'siguiente' });
      else if (codigo === 'KeyO') pulsarGaleria({ id: 'orden' });
      else if (codigo === 'KeyB') pulsarGaleria({ id: 'construir' });
    },
    pulsar(p) {
      punteros.clear();
      // La esquina va encima de su tarjeta: se busca primero.
      const cajas = cajasGaleria(vistaGaleria(), (galeria.lista || []).length);
      const caja = cajas.find((c) => c.id === 'esquina' && dentro(p, c)) || cajas.find((c) => dentro(p, c));
      if (caja) pulsarGaleria(caja);
    }
  },

  portada: {
    actualizar(dt) {
      const { carrera } = estado;
      avanzarMundo(carrera.coches.map((slot, i) => decidirSlot(estado.pilotos[i], slot, carrera.circuito)), dt);
      if (carrera.fase === 'fin') irAPortada();
      sonido(false);
    },
    dibujar() {
      dibujarMundo();
      const datos = { ...estado, tiempo: reloj, marca: marcaPortada() };
      if (estado.lupa) dibujarPortadaLupa(datos);
      else dibujarPortada(datos);
      dibujarGrupos(vistaMenu(), estado.menu);
      if (estado.menu) dibujarMenu(marcoActual(), estado.menu, estado, opcionesMenu());
    },
    teclear(codigo) {
      if (empezar(codigo)) arrancar();
      else if (codigo === 'Escape') estado.menu = null;
      else if (codigo === 'KeyT') cambiarModo();
      else if (codigo === 'Digit1' || codigo === 'Numpad1') cambiarJugador(0);
      else if (codigo === 'Digit2' || codigo === 'Numpad2') cambiarJugador(1);
      else if (codigo === 'KeyL') { cambiarIdioma(1); textosDelDocumento(); }
      else if (codigo === 'KeyE') cambiarEscenario();
      else if (codigo === 'KeyC') cambiarCircuito();
      else if (codigo === 'KeyH') cambiarHora();
      else if (codigo === 'KeyV') cambiarDuracion();
      else if (codigo === 'KeyD') cambiarNivel();
      else if (codigo === 'KeyK') cambiarModelo(0, 1);
      else if (codigo === 'KeyB') abrirConstructor();
      else if (codigo === 'KeyG') pulsarGrupo('circuitos');
      else if (codigo === 'KeyR') abrirRecords();
    },
    pulsar(p) {
      const grupo = cajasGrupos(vistaMenu()).find((caja) => dentro(p, caja));
      // Los récords, solo con el panel de la portada a la vista (sin menú y en una carrera suelta).
      const records = !estado.menu && estado.modo !== 'campeonato' && conRecords()
        && dentro(p, estado.lupa ? cajaRecordsPortadaLupa() : cajaRecordsPortada(estado.circuito));
      if (grupo) pulsarGrupo(grupo.id);
      else if (estado.menu) pulsarMenu(p);
      else if (records) abrirRecords();
      else arrancar();
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
        else if (evento.tipo === 'vuelta' || evento.tipo === 'fin') apuntarVuelta(evento.coche);
        if (evento.tipo === 'vuelta') {
          sfxVuelta();
          // El primero que entra en la última vuelta la anuncia.
          if (!estado.ultimaAvisada && carrera.coches[evento.coche].completadas === carrera.vueltas - 1) {
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
        dibujarMarcadorLupa(estado.carrera, estado.humanos, rotuloCampeonato());
        dibujarAvisosLupa(estado.avisos);
        return;
      }
      dibujarMarcadorSlot(estado.carrera, estado.humanos, estado.tactil, rotuloCampeonato());
      dibujarAvisos(estado.avisos);
    },
    teclear(codigo) {
      // En el campeonato no se repite una carrera a medias.
      if (codigo === 'KeyR' && !estado.campeonato) empezarCarrera();
      else if (codigo === 'Escape') alMenu();
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
      if (estado.avisoFin && (estado.avisoFin.vida -= dt) <= 0) estado.avisoFin = null;
      sonido(false);
    },
    dibujar() {
      dibujarMundo();
      if (estado.lupa) {
        dibujarFinLupa(estado.carrera, estado.humanos, estado.particulas, estado.campeonato, idsFin());
        if (estado.avisoFin) dibujarAvisosLupa([estado.avisoFin]);
        return;
      }
      dibujarFinSlot(estado.carrera, estado.humanos, estado.tactil, estado.campeonato, idsFin());
      if (estado.avisoFin) dibujarAvisos([estado.avisoFin]);
      dibujarConfeti(estado.particulas);
    },
    teclear(codigo) {
      if (codigo === 'Escape') alMenu();
      else if ((empezar(codigo) || codigo === 'KeyR') && estado.esperaReinicio === 0) seguir();
    },
    pulsar(p) {
      if (estado.esperaReinicio > 0) return;
      const { campeonato } = estado;
      const cajas = estado.lupa
        ? (campeonato ? botonesFinCampeonatoLupa(campeonato) : botonesFinLupa(idsFin()))
        : botonesFin(campeonato ? idsFinCampeonato(campeonato) : idsFin());
      const boton = cajas.find((caja) => dentro(p, caja));
      if (boton?.id === 'repetir') repetir();
      else if (boton?.id === 'siguiente') correrSiguiente();
      else if (boton?.id === 'menu') alMenu();
      else if (boton?.id === 'denunciar') estado.denuncia = 'pendiente';
      else if (boton?.id === 'confirmarDenuncia') denunciarDesdeFin();
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
  // El constructor es la mesa entera: en vertical se ve pequeño, pero entero.
  const lupa = (LUPA_FORZADA || Boolean(VERTICAL?.matches)) && estado.fase !== 'constructor';
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
estado.duracion = leerDuracion();
estado.nivel = leerNivel();
estado.modelos = leerModelos(MODELOS.map((m) => m.id));
estado.colores = leerColores(COLORES_COCHE);
estado.modo = leerModo();
estado.jugadores = leerJugadores();
estado.tipoFantasma = leerTipoFantasma();
const elegido = leerCircuito([...CIRCUITOS, ...MIOS].map((c) => c.clave));
estado.circuito = DIBUJADO || [...CIRCUITOS, ...MIOS].find((c) => c.clave === elegido);
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
