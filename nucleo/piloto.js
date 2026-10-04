/*
 * Slot Panic — el piloto automático: la CPU, la exhibición de la portada y el
 * instrumento del arnés.
 *
 * No hay volante: solo decide cuándo soltar. Mira las curvas que vienen y
 * suelta si alguna no admitiría la velocidad que llevaría al llegar.
 * `prudencia` multiplica el agarre que el piloto cree tener: por debajo de 1
 * suelta antes de lo necesario; `aFondo` no suelta nunca (el que el juego
 * tiene que castigar).
 */

import { AGARRE_SLOT, BAJA_POTENCIA, INERCIA_SOLTAR, PASO_EJE } from '../config.js';
import { azar } from './decorado.js';
import { radioAgarre } from './slot.js';

/*
 * `variacion` y `fallo` hacen humano al piloto, que sin ellos calcula cada
 * frenada al píxel («no había quien le ganara», segundo playtest): cada
 * curva, en cada vuelta, la entra con su propia prudencia, entre
 * `prudencia · (1 ± variacion)`, y con probabilidad `fallo` se pasa de largo
 * (con prudencia `exceso`) y se sale. Sembrado con `semilla`:
 * determinista, como todo lo que juega.
 */
const EXCESO_FALLO = 2.8;

export function crearPiloto({
  prudencia = 0.95, aFondo = false, variacion = 0, fallo = 0, exceso = EXCESO_FALLO, semilla = 1
} = {}) {
  return { prudencia, aFondo, variacion, fallo, exceso, tirar: azar(semilla), elegidas: new Map() };
}

/*
 * Los mandos del piloto: suelta si alguna curva por delante no admite la
 * velocidad que llevaría al llegar soltando desde ya. La velocidad máxima en el carril es √(AGARRE_SLOT · radioAgarre).
 * Soltando, el coche pierde 1 px/s por cada INERCIA_SOLTAR px que rueda, así
 * que lo que se pierde en `d` px es d / INERCIA_SOLTAR. Antes de eso la
 * potencia tarda en bajar: cuenta con reaccionar ese rato tarde, y con
 * frenar algo menos de lo que frena.
 */
const PERDIDA_PREVISTA = 0.85 / INERCIA_SOLTAR; // px/s por px
const REACCION = BAJA_POTENCIA + 1 / 30;         // s
export function decidirSlot(piloto, slot, circuito) {
  if (slot.estado !== 'carril') return { acelerar: false, frenar: false, giro: 0 };
  if (piloto.aFondo) return { acelerar: true, frenar: false, giro: 0 };
  const { v } = slot;
  const horizonte = v / PERDIDA_PREVISTA + v * REACCION + 20;
  for (let d = 0; d <= horizonte; d += PASO_EJE) {
    const p = circuito.puntoEn(slot.s + d);
    if (p.radio === Infinity) continue;
    const agarre = AGARRE_SLOT * prudenciaCurva(piloto, circuito, p.indice, Math.floor((slot.progreso + d) / circuito.largo));
    const permitida = Math.sqrt(agarre * radioAgarre(p, slot.lateral));
    const llegaria = v - PERDIDA_PREVISTA * Math.max(0, d - v * REACCION);
    if (llegaria > permitida) return { acelerar: false, frenar: false, giro: 0 };
  }
  return { acelerar: true, frenar: false, giro: 0 };
}

/*
 * La prudencia con la que el piloto entra una curva en una vuelta: se elige
 * la primera vez que la ve venir y se mantiene hasta pasarla. La curva se
 * reconoce por el índice del eje en que empieza.
 */
function prudenciaCurva(piloto, circuito, indice, vuelta) {
  if (!piloto.variacion && !piloto.fallo) return piloto.prudencia;
  const clave = vuelta * circuito.eje.length + inicioCurva(circuito, indice);
  if (!piloto.elegidas.has(clave)) {
    const valor = piloto.tirar() < piloto.fallo
      ? piloto.exceso
      : piloto.prudencia * (1 + piloto.variacion * (piloto.tirar() * 2 - 1));
    piloto.elegidas.set(clave, valor);
  }
  return piloto.elegidas.get(clave);
}

function inicioCurva(circuito, indice) {
  const { eje } = circuito;
  const n = eje.length;
  let i = indice;
  for (let k = 0; k < n && eje[(i - 1 + n) % n].radio !== Infinity; k++) i = (i - 1 + n) % n;
  return i;
}
