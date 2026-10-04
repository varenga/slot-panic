/*
 * Slot Panic — catálogos de idioma y runtime de traducción.
 *
 * Es el i18n.js de Orbit Panic pasado a módulo ES. Ninguna cadena visible se
 * escribe literal en el juego: todas pasan por t(). Se hace desde el primer
 * commit a propósito; reconvertir literales después obliga a repasarlo todo.
 *
 * El español es la referencia: toda clave nueva se añade aquí primero, y t()
 * cae a este idioma cuando falta una traducción. El arnés comprueba que los
 * siete catálogos tengan las mismas claves.
 */

import { GAME_SLUG } from './config.js';

export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
  { codigo: 'pt', nombre: 'Português' },
  { codigo: 'gl', nombre: 'Galego' },
  { codigo: 'ca', nombre: 'Català' },
  { codigo: 'it', nombre: 'Italiano' },
  { codigo: 'fr', nombre: 'Français' }
];

const POR_DEFECTO = 'es';
const CLAVE_IDIOMA = GAME_SLUG + '.idioma';

export const CATALOGOS = {
  es: {
    'slot.lema': 'Suelta antes de la curva.',
    'slot.controles': 'J1: W O ESPACIO · J2: ↑ O L · MANTÉN PARA ACELERAR · ESC MENÚ',
    'slot.controlesTactil': 'MANTÉN EL DEDO PARA ACELERAR · IZQUIERDA J1 · DERECHA J2',
    'slot.mantener': 'MANTÉN PARA ACELERAR',
    'slot.cpuLibre': 'EL CARRIL QUE NADIE TOQUE LO LLEVA LA CPU',
    'slot.jugador': 'J{n}',
    'slot.gana': '¡GANA {quien}!',
    'slot.resumen': 'MEJOR VUELTA {tiempo} · {n} SALIDAS',
    'slot.cpu': 'CPU',
    'portada.jugarTactil': 'TOCA PARA CORRER',
    'opcion.sonido': 'SONIDO: {v}',
    'opcion.idioma': 'IDIOMA: {v}',
    'opcion.escenario': 'ESCENARIO: {v}',
    'opcion.hora': 'HORA: {v}',
    'hora.dia': 'DÍA',
    'hora.atardecer': 'ATARDECER',
    'hora.noche': 'NOCHE',
    'escenario.verde': 'VERDE',
    'escenario.tierra': 'TIERRA',
    'escenario.desierto': 'DESIERTO',
    'escenario.nieve': 'NIEVE',
    'fin.botonRepetir': 'REPETIR',
    'fin.botonMenu': 'MENÚ',
    'aviso.gira': 'Gira el dispositivo para jugar',
    'pie.otros': 'Otros juegos:',
    'portada.jugar': 'ENTER PARA CORRER',
    'sonido.si': 'SÍ',
    'sonido.no': 'NO',
    'circuito.primero': 'LA HORQUILLA',
    'carrera.titulo': '{circuito} · {vueltas} VUELTAS',
    'hud.vuelta': 'VUELTA {n}/{total}',
    'hud.mejor': 'MEJOR VUELTA {tiempo}',
    'aviso.ultima': 'ÚLTIMA VUELTA',
    'fin.tiempo': 'TIEMPO {tiempo}',
    'fin.repetir': 'ENTER O R PARA REPETIR · ESC MENÚ',
  },
  en: {
    'slot.lema': 'Lift before the bend.',
    'slot.controles': 'P1: W OR SPACE · P2: ↑ OR L · HOLD TO ACCELERATE · ESC MENU',
    'slot.controlesTactil': 'HOLD A FINGER TO ACCELERATE · LEFT P1 · RIGHT P2',
    'slot.mantener': 'HOLD TO ACCELERATE',
    'slot.cpuLibre': 'THE CPU DRIVES ANY LANE NOBODY TOUCHES',
    'slot.jugador': 'P{n}',
    'slot.gana': '{quien} WINS!',
    'slot.resumen': 'BEST LAP {tiempo} · {n} OFFS',
    'slot.cpu': 'CPU',
    'portada.jugarTactil': 'TAP TO RACE',
    'opcion.sonido': 'SOUND: {v}',
    'opcion.idioma': 'LANGUAGE: {v}',
    'opcion.escenario': 'SCENERY: {v}',
    'opcion.hora': 'TIME: {v}',
    'hora.dia': 'DAY',
    'hora.atardecer': 'SUNSET',
    'hora.noche': 'NIGHT',
    'escenario.verde': 'GREEN',
    'escenario.tierra': 'DIRT',
    'escenario.desierto': 'DESERT',
    'escenario.nieve': 'SNOW',
    'fin.botonRepetir': 'RETRY',
    'fin.botonMenu': 'MENU',
    'aviso.gira': 'Rotate your device to play',
    'pie.otros': 'Other games:',
    'portada.jugar': 'ENTER TO RACE',
    'sonido.si': 'ON',
    'sonido.no': 'OFF',
    'circuito.primero': 'THE HAIRPIN',
    'carrera.titulo': '{circuito} · {vueltas} LAPS',
    'hud.vuelta': 'LAP {n}/{total}',
    'hud.mejor': 'BEST LAP {tiempo}',
    'aviso.ultima': 'FINAL LAP',
    'fin.tiempo': 'TIME {tiempo}',
    'fin.repetir': 'ENTER OR R TO RETRY · ESC MENU',
  },
  pt: {
    'slot.lema': 'Larga antes da curva.',
    'slot.controles': 'J1: W OU ESPAÇO · J2: ↑ OU L · MANTÉM PARA ACELERAR · ESC MENU',
    'slot.controlesTactil': 'MANTÉM O DEDO PARA ACELERAR · ESQUERDA J1 · DIREITA J2',
    'slot.mantener': 'MANTÉM PARA ACELERAR',
    'slot.cpuLibre': 'A PISTA QUE NINGUÉM TOCAR É DO CPU',
    'slot.jugador': 'J{n}',
    'slot.gana': '{quien} GANHA!',
    'slot.resumen': 'MELHOR VOLTA {tiempo} · {n} SAÍDAS',
    'slot.cpu': 'CPU',
    'portada.jugarTactil': 'TOCA PARA CORRER',
    'opcion.sonido': 'SOM: {v}',
    'opcion.idioma': 'IDIOMA: {v}',
    'opcion.escenario': 'CENÁRIO: {v}',
    'opcion.hora': 'HORA: {v}',
    'hora.dia': 'DIA',
    'hora.atardecer': 'ENTARDECER',
    'hora.noche': 'NOITE',
    'escenario.verde': 'VERDE',
    'escenario.tierra': 'TERRA',
    'escenario.desierto': 'DESERTO',
    'escenario.nieve': 'NEVE',
    'fin.botonRepetir': 'REPETIR',
    'fin.botonMenu': 'MENU',
    'aviso.gira': 'Roda o dispositivo para jogar',
    'pie.otros': 'Outros jogos:',
    'portada.jugar': 'ENTER PARA CORRER',
    'sonido.si': 'SIM',
    'sonido.no': 'NÃO',
    'circuito.primero': 'O GANCHO',
    'carrera.titulo': '{circuito} · {vueltas} VOLTAS',
    'hud.vuelta': 'VOLTA {n}/{total}',
    'hud.mejor': 'MELHOR VOLTA {tiempo}',
    'aviso.ultima': 'ÚLTIMA VOLTA',
    'fin.tiempo': 'TEMPO {tiempo}',
    'fin.repetir': 'ENTER OU R PARA REPETIR · ESC MENU',
  },
  gl: {
    'slot.lema': 'Solta antes da curva.',
    'slot.controles': 'X1: W OU ESPAZO · X2: ↑ OU L · MANTÉN PARA ACELERAR · ESC MENÚ',
    'slot.controlesTactil': 'MANTÉN O DEDO PARA ACELERAR · ESQUERDA X1 · DEREITA X2',
    'slot.mantener': 'MANTÉN PARA ACELERAR',
    'slot.cpuLibre': 'O CARRIL QUE NINGUÉN TOQUE LÉVAO A CPU',
    'slot.jugador': 'X{n}',
    'slot.gana': 'GAÑA {quien}!',
    'slot.resumen': 'MELLOR VOLTA {tiempo} · {n} SAÍDAS',
    'slot.cpu': 'CPU',
    'portada.jugarTactil': 'TOCA PARA CORRER',
    'opcion.sonido': 'SON: {v}',
    'opcion.idioma': 'IDIOMA: {v}',
    'opcion.escenario': 'ESCENARIO: {v}',
    'opcion.hora': 'HORA: {v}',
    'hora.dia': 'DÍA',
    'hora.atardecer': 'SOLPOR',
    'hora.noche': 'NOITE',
    'escenario.verde': 'VERDE',
    'escenario.tierra': 'TERRA',
    'escenario.desierto': 'DESERTO',
    'escenario.nieve': 'NEVE',
    'fin.botonRepetir': 'REPETIR',
    'fin.botonMenu': 'MENÚ',
    'aviso.gira': 'Xira o dispositivo para xogar',
    'pie.otros': 'Outros xogos:',
    'portada.jugar': 'ENTER PARA CORRER',
    'sonido.si': 'SI',
    'sonido.no': 'NON',
    'circuito.primero': 'A GANCHA',
    'carrera.titulo': '{circuito} · {vueltas} VOLTAS',
    'hud.vuelta': 'VOLTA {n}/{total}',
    'hud.mejor': 'MELLOR VOLTA {tiempo}',
    'aviso.ultima': 'ÚLTIMA VOLTA',
    'fin.tiempo': 'TEMPO {tiempo}',
    'fin.repetir': 'ENTER OU R PARA REPETIR · ESC MENÚ',
  },
  ca: {
    'slot.lema': 'Deixa anar abans del revolt.',
    'slot.controles': 'J1: W O ESPAI · J2: ↑ O L · MANTÉN PER ACCELERAR · ESC MENÚ',
    'slot.controlesTactil': 'MANTÉN EL DIT PER ACCELERAR · ESQUERRA J1 · DRETA J2',
    'slot.mantener': 'MANTÉN PER ACCELERAR',
    'slot.cpuLibre': 'EL CARRIL QUE NINGÚ TOQUI EL PORTA LA CPU',
    'slot.jugador': 'J{n}',
    'slot.gana': 'GUANYA {quien}!',
    'slot.resumen': 'MILLOR VOLTA {tiempo} · {n} SORTIDES',
    'slot.cpu': 'CPU',
    'portada.jugarTactil': 'TOCA PER CÓRRER',
    'opcion.sonido': 'SO: {v}',
    'opcion.idioma': 'IDIOMA: {v}',
    'opcion.escenario': 'ESCENARI: {v}',
    'opcion.hora': 'HORA: {v}',
    'hora.dia': 'DIA',
    'hora.atardecer': 'CAPVESPRE',
    'hora.noche': 'NIT',
    'escenario.verde': 'VERD',
    'escenario.tierra': 'TERRA',
    'escenario.desierto': 'DESERT',
    'escenario.nieve': 'NEU',
    'fin.botonRepetir': 'REPETIR',
    'fin.botonMenu': 'MENÚ',
    'aviso.gira': 'Gira el dispositiu per jugar',
    'pie.otros': 'Altres jocs:',
    'portada.jugar': 'ENTER PER CÓRRER',
    'sonido.si': 'SÍ',
    'sonido.no': 'NO',
    'circuito.primero': 'LA FORQUILLA',
    'carrera.titulo': '{circuito} · {vueltas} VOLTES',
    'hud.vuelta': 'VOLTA {n}/{total}',
    'hud.mejor': 'MILLOR VOLTA {tiempo}',
    'aviso.ultima': 'ÚLTIMA VOLTA',
    'fin.tiempo': 'TEMPS {tiempo}',
    'fin.repetir': 'ENTER O R PER REPETIR · ESC MENÚ',
  },
  it: {
    'slot.lema': 'Rilascia prima della curva.',
    'slot.controles': 'G1: W O SPAZIO · G2: ↑ O L · TIENI PREMUTO PER ACCELERARE · ESC MENU',
    'slot.controlesTactil': 'TIENI IL DITO PER ACCELERARE · SINISTRA G1 · DESTRA G2',
    'slot.mantener': 'TIENI PREMUTO PER ACCELERARE',
    'slot.cpuLibre': 'LA CORSIA CHE NESSUNO TOCCA LA GUIDA LA CPU',
    'slot.jugador': 'G{n}',
    'slot.gana': 'VINCE {quien}!',
    'slot.resumen': 'GIRO MIGLIORE {tiempo} · {n} USCITE',
    'slot.cpu': 'CPU',
    'portada.jugarTactil': 'TOCCA PER CORRERE',
    'opcion.sonido': 'AUDIO: {v}',
    'opcion.idioma': 'LINGUA: {v}',
    'opcion.escenario': 'SCENARIO: {v}',
    'opcion.hora': 'ORA: {v}',
    'hora.dia': 'GIORNO',
    'hora.atardecer': 'TRAMONTO',
    'hora.noche': 'NOTTE',
    'escenario.verde': 'VERDE',
    'escenario.tierra': 'STERRATO',
    'escenario.desierto': 'DESERTO',
    'escenario.nieve': 'NEVE',
    'fin.botonRepetir': 'RIPROVA',
    'fin.botonMenu': 'MENU',
    'aviso.gira': 'Ruota il dispositivo per giocare',
    'pie.otros': 'Altri giochi:',
    'portada.jugar': 'INVIO PER CORRERE',
    'sonido.si': 'SÌ',
    'sonido.no': 'NO',
    'circuito.primero': 'IL TORNANTE',
    'carrera.titulo': '{circuito} · {vueltas} GIRI',
    'hud.vuelta': 'GIRO {n}/{total}',
    'hud.mejor': 'GIRO VELOCE {tiempo}',
    'aviso.ultima': 'ULTIMO GIRO',
    'fin.tiempo': 'TEMPO {tiempo}',
    'fin.repetir': 'INVIO O R PER RIPROVARE · ESC MENU',
  },
  fr: {
    'slot.lema': 'Lâche avant le virage.',
    'slot.controles': 'J1 : W OU ESPACE · J2 : ↑ OU L · MAINTIENS POUR ACCÉLÉRER · ÉCHAP MENU',
    'slot.controlesTactil': 'GARDE LE DOIGT POUR ACCÉLÉRER · GAUCHE J1 · DROITE J2',
    'slot.mantener': 'MAINTIENS POUR ACCÉLÉRER',
    'slot.cpuLibre': 'LE CPU PILOTE LA VOIE QUE PERSONNE NE TOUCHE',
    'slot.jugador': 'J{n}',
    'slot.gana': '{quien} GAGNE !',
    'slot.resumen': 'MEILLEUR TOUR {tiempo} · {n} SORTIES',
    'slot.cpu': 'CPU',
    'portada.jugarTactil': 'TOUCHE POUR COURIR',
    'opcion.sonido': 'SON : {v}',
    'opcion.idioma': 'LANGUE : {v}',
    'opcion.escenario': 'DÉCOR : {v}',
    'opcion.hora': 'HEURE : {v}',
    'hora.dia': 'JOUR',
    'hora.atardecer': 'CRÉPUSCULE',
    'hora.noche': 'NUIT',
    'escenario.verde': 'VERT',
    'escenario.tierra': 'TERRE',
    'escenario.desierto': 'DÉSERT',
    'escenario.nieve': 'NEIGE',
    'fin.botonRepetir': 'REJOUER',
    'fin.botonMenu': 'MENU',
    'aviso.gira': 'Tourne ton appareil pour jouer',
    'pie.otros': 'Autres jeux :',
    'portada.jugar': 'ENTRÉE POUR COURIR',
    'sonido.si': 'OUI',
    'sonido.no': 'NON',
    'circuito.primero': "L'ÉPINGLE",
    'carrera.titulo': '{circuito} · {vueltas} TOURS',
    'hud.vuelta': 'TOUR {n}/{total}',
    'hud.mejor': 'MEILLEUR TOUR {tiempo}',
    'aviso.ultima': 'DERNIER TOUR',
    'fin.tiempo': 'TEMPS {tiempo}',
    'fin.repetir': 'ENTRÉE OU R POUR REJOUER · ÉCHAP MENU',
  }
};

let idioma = POR_DEFECTO;

/** Sustituye {marcador} y cae al español si falta la clave. */
export function t(clave, parametros) {
  let texto = CATALOGOS[idioma][clave];
  if (texto === undefined) texto = CATALOGOS[POR_DEFECTO][clave];
  if (texto === undefined) {
    console.warn('[i18n] clave inexistente:', clave);
    return clave;
  }
  if (parametros) {
    for (const k in parametros) texto = texto.split('{' + k + '}').join(parametros[k]);
  }
  return texto;
}

export function idiomaActual() {
  return IDIOMAS.find((l) => l.codigo === idioma);
}

export function cambiarIdioma(paso = 1) {
  const i = IDIOMAS.findIndex((l) => l.codigo === idioma);
  fijarIdioma(IDIOMAS[(i + paso + IDIOMAS.length) % IDIOMAS.length].codigo, true);
}

function fijarIdioma(codigo, guardar) {
  if (!CATALOGOS[codigo]) return;
  idioma = codigo;
  if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', codigo);
  if (guardar) {
    try { localStorage.setItem(CLAVE_IDIOMA, codigo); } catch (error) { /* modo privado */ }
  }
}

/*
 * Orden: ?lang= en la URL, la preferencia guardada, el idioma del navegador y
 * el español. Las páginas por idioma en subcarpetas, cuando las haya, irán
 * antes que la preferencia, como en Orbit Panic.
 */
function resolverIdioma() {
  const deUrl = new URLSearchParams(location.search).get('lang');
  if (deUrl && CATALOGOS[deUrl]) return deUrl;
  try {
    const guardado = localStorage.getItem(CLAVE_IDIOMA);
    if (guardado && CATALOGOS[guardado]) return guardado;
  } catch (error) { /* modo privado */ }
  for (const crudo of navigator.languages || [navigator.language || '']) {
    const codigo = String(crudo).slice(0, 2).toLowerCase();
    if (CATALOGOS[codigo]) return codigo;
  }
  return POR_DEFECTO;
}

// En Node (el arnés) no hay location ni navigator: se queda en español.
if (typeof location !== 'undefined') fijarIdioma(resolverIdioma(), false);
