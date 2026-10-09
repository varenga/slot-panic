/*
 * Slot Panic — el estado mutable de la partida.
 *
 * Vive en su propio módulo, como en Rail Panic, para que el dibujo y la
 * pantalla lo lean sin depender del bucle. Se exporta un objeto que se muta;
 * nunca se reasigna la variable `estado`.
 */

import { CARRERAS, GAME_SLUG, NIVELES_CPU } from './config.js';
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

/** La carrera elegida (rápida, normal o resistencia, CARRERAS): también se recuerda. */
export function leerDuracion() {
  try {
    const guardada = localStorage.getItem(`${GAME_SLUG}.carrera`);
    return CARRERAS.some((c) => c.id === guardada) ? guardada : 'normal';
  } catch (error) {
    return 'normal';
  }
}

export function guardarDuracion(id) {
  try { localStorage.setItem(`${GAME_SLUG}.carrera`, id); } catch (error) { /* modo privado */ }
}

/** El nivel de la CPU (NIVELES_CPU): también se recuerda. */
export function leerNivel() {
  try {
    const guardado = localStorage.getItem(`${GAME_SLUG}.cpu`);
    return NIVELES_CPU.some((n) => n.id === guardado) ? guardado : 'normal';
  } catch (error) {
    return 'normal';
  }
}

export function guardarNivel(id) {
  try { localStorage.setItem(`${GAME_SLUG}.cpu`, id); } catch (error) { /* modo privado */ }
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

/*
 * El coche de cada jugador, por su modelo (coches.js): también se recuerda. El
 * del J1, en la clave de siempre; el del J2, por defecto el siguiente.
 */
export function leerModelos(ids) {
  const leer = (clave, defecto) => {
    try {
      const guardado = localStorage.getItem(`${GAME_SLUG}.${clave}`);
      return ids.includes(guardado) ? guardado : defecto;
    } catch (error) {
      return defecto;
    }
  };
  const j1 = leer('coche', ids[0]);
  return [j1, leer('coche2', ids[(ids.indexOf(j1) + 1) % ids.length])];
}

export function guardarModelos([j1, j2]) {
  try {
    localStorage.setItem(`${GAME_SLUG}.coche`, j1);
    localStorage.setItem(`${GAME_SLUG}.coche2`, j2);
  } catch (error) { /* modo privado */ }
}

/** El color de cada coche, de la paleta (COLORES_COCHE): distintos, y se recuerdan. */
export function leerColores(paleta) {
  try {
    const [a, b] = JSON.parse(localStorage.getItem(`${GAME_SLUG}.colores`) || 'null') || [];
    if (paleta.includes(a) && paleta.includes(b) && a !== b) return [a, b];
  } catch (error) { /* modo privado o roto */ }
  return paleta.slice(0, 2);
}

export function guardarColores(colores) {
  try { localStorage.setItem(`${GAME_SLUG}.colores`, JSON.stringify(colores)); } catch (error) { /* modo privado */ }
}

/** Carrera suelta o campeonato (MODOS): también se recuerda. */
export const MODOS = ['suelta', 'campeonato'];

export function leerModo() {
  try {
    const guardado = localStorage.getItem(`${GAME_SLUG}.modo`);
    return MODOS.includes(guardado) ? guardado : MODOS[0];
  } catch (error) {
    return MODOS[0];
  }
}

export function guardarModo(modo) {
  try { localStorage.setItem(`${GAME_SLUG}.modo`, modo); } catch (error) { /* modo privado */ }
}

/*
 * Quién lleva cada carril con teclado: 'humano' o 'cpu'. Por defecto, el J1
 * contra la CPU. En el móvil no cuenta: se entra tocando.
 */
export function leerJugadores() {
  try {
    const lista = JSON.parse(localStorage.getItem(`${GAME_SLUG}.jugadores`) || 'null');
    if (Array.isArray(lista) && lista.length === 2 && lista.every((j) => j === 'humano' || j === 'cpu')) return lista;
  } catch (error) { /* modo privado o roto */ }
  return ['humano', 'cpu'];
}

export function guardarJugadores(jugadores) {
  try { localStorage.setItem(`${GAME_SLUG}.jugadores`, JSON.stringify(jugadores)); } catch (error) { /* modo privado */ }
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
 * carril, coche }) y, aparte, su fantasma (nucleo/fantasma.js, ~5 KB). Una
 * con todos los coches, como la tabla. Lo que no se lea bien no existe.
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

export function guardarMejorVuelta(clave, { tiempo, carril, coche, muestras }) {
  try {
    localStorage.setItem(`${GAME_SLUG}.vuelta.${clave}`, JSON.stringify({ tiempo, carril, coche }));
    localStorage.setItem(`${GAME_SLUG}.fantasma.${clave}`, codificar({ tiempo, muestras, coche }));
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
  nivel: 'normal',     // la CPU: 'facil' | 'normal' | 'dificil' (NIVELES_CPU)
  duracion: 'normal',  // la carrera: 'rapida' | 'normal' | 'resistencia' (CARRERAS, con sus vueltas)
  modelos: [],         // el modelo del coche de cada jugador (coches.js). Cosmético
  colores: [],         // el color de cada coche (COLORES_COCHE), distintos
  modo: 'suelta',      // 'suelta' | 'campeonato' (MODOS): lo que arranca la portada
  jugadores: ['humano', 'cpu'], // con teclado, quién lleva cada carril
  menu: null,          // el grupo abierto en la portada (menu.js): 'carrera' | 'coche' | 'ajustes' | null
  tactil: false,       // se activa con el primer toque
  lupa: false,         // el móvil en vertical: la vista que sigue al J1 (lupa.js)
  carrera: null,       // la de los dos coches; en la portada, la exhibición
  pilotos: [],         // el piloto de cada carril, por si nadie lo conduce
  humanos: [false, false], // qué coches conduce alguien (con teclado, los elegidos; tocando, al pulsar)
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
