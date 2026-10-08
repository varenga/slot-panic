/*
 * Slot Panic — el estado mutable de la partida.
 *
 * Vive en su propio módulo, como en Rail Panic, para que el dibujo y la
 * pantalla lo lean sin depender del bucle. Se exporta un objeto que se muta;
 * nunca se reasigna la variable `estado`.
 */

import { GAME_SLUG } from './config.js';
import { ORDEN_ESCENARIOS } from './escenarios.js';
import { codificar, decodificar } from './nucleo/fantasma.js';

/** El escenario elegido es una preferencia, como el idioma: se recuerda. */
export function leerEscenario() {
  try {
    const guardado = localStorage.getItem(`${GAME_SLUG}.escenario`);
    return ORDEN_ESCENARIOS.includes(guardado) ? guardado : ORDEN_ESCENARIOS[0];
  } catch (error) {
    return ORDEN_ESCENARIOS[0];
  }
}

export function guardarEscenario(nombre) {
  try { localStorage.setItem(`${GAME_SLUG}.escenario`, nombre); } catch (error) { /* modo privado */ }
}

/** El circuito elegido, por su clave: también se recuerda. */
export function leerCircuito(claves) {
  try {
    const guardado = localStorage.getItem(`${GAME_SLUG}.circuito`);
    return claves.includes(guardado) ? guardado : claves[0];
  } catch (error) {
    return claves[0];
  }
}

export function guardarCircuito(clave) {
  try { localStorage.setItem(`${GAME_SLUG}.circuito`, clave); } catch (error) { /* modo privado */ }
}

/** El coche del J1, por su modelo (coches.js): también se recuerda. */
export function leerModelo(ids) {
  try {
    const guardado = localStorage.getItem(`${GAME_SLUG}.coche`);
    return ids.includes(guardado) ? guardado : ids[0];
  } catch (error) {
    return ids[0];
  }
}

export function guardarModelo(id) {
  try { localStorage.setItem(`${GAME_SLUG}.coche`, id); } catch (error) { /* modo privado */ }
}

/*
 * «Mis circuitos», los del constructor: una lista de { n, codigo }, donde n es
 * el número de su nombre («Mi circuito 3») y el código, el de la cuadrícula.
 * Solo en este dispositivo; un código que ya no se lea se descarta al cargar.
 */
export function leerMisCircuitos() {
  try {
    const lista = JSON.parse(localStorage.getItem(`${GAME_SLUG}.misCircuitos`) || '[]');
    return Array.isArray(lista) ? lista.filter((c) => Number.isInteger(c?.n) && typeof c.codigo === 'string') : [];
  } catch (error) {
    return [];
  }
}

export function guardarMisCircuitos(lista) {
  try {
    localStorage.setItem(`${GAME_SLUG}.misCircuitos`, JSON.stringify(lista));
    return true;
  } catch (error) {
    return false;   // modo privado o sin sitio: quien guarda avisa
  }
}

/*
 * Lo de publicar (publicos.js). La llave es un número al azar que solo tiene
 * este dispositivo: con ella se borra lo publicado (el servidor guarda su
 * hash). Si no hay almacenamiento, se inventa cada vez: se publica igual,
 * pero no se podrá borrar.
 */
export function leerLlave() {
  const nueva = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    let llave = localStorage.getItem(`${GAME_SLUG}.llave`);
    if (!/^[0-9a-f]{32}$/.test(llave || '')) {
      llave = nueva();
      localStorage.setItem(`${GAME_SLUG}.llave`, llave);
    }
    return llave;
  } catch (error) {
    return nueva();
  }
}

/** El alias de 3 letras con que se publica: se recuerda para la próxima. */
export function leerAlias() {
  try {
    const alias = localStorage.getItem(`${GAME_SLUG}.alias`);
    return /^[A-Z0-9]{3}$/.test(alias || '') ? alias : 'AAA';
  } catch (error) {
    return 'AAA';
  }
}

export function guardarAlias(alias) {
  try { localStorage.setItem(`${GAME_SLUG}.alias`, alias); } catch (error) { /* modo privado */ }
}

/** Los publicados desde aquí: { id, codigo }. Son los que se pueden borrar. */
export function leerPublicados() {
  try {
    const lista = JSON.parse(localStorage.getItem(`${GAME_SLUG}.publicados`) || '[]');
    return Array.isArray(lista) ? lista.filter((c) => Number.isInteger(c?.id) && typeof c.codigo === 'string') : [];
  } catch (error) {
    return [];
  }
}

export function guardarPublicados(lista) {
  try { localStorage.setItem(`${GAME_SLUG}.publicados`, JSON.stringify(lista)); } catch (error) { /* modo privado */ }
}

/*
 * El récord personal de cada circuito oficial: la mejor vuelta ({ tiempo,
 * carril }) y, aparte, su fantasma (nucleo/fantasma.js, ~5 KB). Lo que no se
 * lea bien no existe.
 */
export function leerMejorVuelta(clave) {
  try {
    const marca = JSON.parse(localStorage.getItem(`${GAME_SLUG}.vuelta.${clave}`) || 'null');
    return marca && marca.tiempo > 0 ? marca : null;
  } catch (error) {
    return null;
  }
}

export function leerFantasmaPropio(clave) {
  try { return decodificar(localStorage.getItem(`${GAME_SLUG}.fantasma.${clave}`) || ''); } catch (error) { return null; }
}

export function guardarMejorVuelta(clave, { tiempo, carril, muestras }) {
  try {
    localStorage.setItem(`${GAME_SLUG}.vuelta.${clave}`, JSON.stringify({ tiempo, carril }));
    localStorage.setItem(`${GAME_SLUG}.fantasma.${clave}`, codificar({ tiempo, muestras }));
  } catch (error) { /* modo privado o sin sitio */ }
}

/** Contra qué fantasma se corre: 'tuyo', 'record' (el primero de la tabla) o 'no'. */
export const TIPOS_FANTASMA = ['tuyo', 'record', 'no'];

export function leerTipoFantasma() {
  try {
    const tipo = localStorage.getItem(`${GAME_SLUG}.tipoFantasma`);
    return TIPOS_FANTASMA.includes(tipo) ? tipo : 'tuyo';
  } catch (error) {
    return 'tuyo';
  }
}

export function guardarTipoFantasma(tipo) {
  try { localStorage.setItem(`${GAME_SLUG}.tipoFantasma`, tipo); } catch (error) { /* modo privado */ }
}

/** Las normas de publicar se aceptan una vez. */
export function normasAceptadas() {
  try { return localStorage.getItem(`${GAME_SLUG}.normas`) === '1'; } catch (error) { return false; }
}

export function aceptarNormas() {
  try { localStorage.setItem(`${GAME_SLUG}.normas`, '1'); } catch (error) { /* modo privado */ }
}

export const estado = {
  fase: 'portada',     // 'portada' | 'carrera' | 'fin' | 'constructor' | 'circuitos' | 'galeria'
  circuito: null,      // el que se corre, de CIRCUITOS (circuitos/indice.js)
  escenario: null,     // 'verde' | 'tierra' | 'desierto' | 'nieve'
  decorado: null,      // lo que generarDecorado() sembró para circuito + escenario
  hora: 'dia',         // 'dia' | 'atardecer' | 'noche': cosmética, combinable con el escenario
  modelo: null,        // el coche del J1 (coches.js); el otro lleva el siguiente. Cosmético
  tactil: false,       // se activa con el primer toque
  lupa: false,         // el móvil en vertical: la vista que sigue al J1 (lupa.js)
  carrera: null,       // la de los dos coches; en la portada, la exhibición
  pilotos: [],         // el piloto de cada carril, por si nadie lo conduce
  humanos: [false, false], // qué coches conduce alguien (se toman al pulsar)
  turno: 1,            // alterna en cada carrera quién va por qué carril
  ultimaAvisada: false, // ya se ha anunciado la última vuelta
  avisos: [],          // carteles flotantes: { texto, vida }
  particulas: [],      // chispas y humo (particulas.js)
  esperaReinicio: 0,
  edicion: null,       // el constructor abierto (constructor.js); sigue vivo mientras se prueba
  probando: false,     // la carrera es la prueba del constructor: al acabar se vuelve a él
  campeonato: null,    // el campeonato en curso (nucleo/campeonato.js), o null
  denuncia: null,      // en el fin de un público ajeno: null, 'pendiente' (preguntando) o 'hecha'
  tipoFantasma: 'tuyo', // contra qué fantasma corre el J1 (TIPOS_FANTASMA)
  fantasma: null,      // la vuelta contra la que corre el J1 ahora (nucleo/fantasma.js), o null
  firma: null,         // firmando un récord: { vuelta, letras, cursor, enviando }
  avisoFin: null,      // un aviso en el cartel de fin (la firma que no se pudo enviar)
  fps: 0
};
