/*
 * Slot Panic — el arnés. No forma parte del juego.
 *
 * Importa los módulos reales del núcleo (que no tocan el DOM) y hace correr
 * carreras enteras con pilotos automáticos en unos segundos. Mide el equilibrio
 * y comprueba las reglas que se pueden romper sin que se note. Sale con código
 * 1 si alguna aserción falla.
 *
 *   node arnes.mjs
 *
 * Si las piezas de un circuito no cierran, ni siquiera arranca: lo dice
 * `construirDePiezas` al importarlo.
 */

import {
  ALTO, ANCHO, ANCHO_COCHE, ANCHO_PISTA, CPU_SLOT, DURACION_MANO, FUERA_MAXIMO, LARGO_COCHE, VELOCIDAD_SLOT, VUELTAS_SLOT
} from './config.js';
import { CIRCUITOS } from './circuitos/indice.js';
import { enCruce } from './nucleo/circuito.js';
import { crearPiloto, decidirSlot } from './nucleo/piloto.js';
import {
  avanzarSlot, CARRILES, crearCarreraSlot, formatearTiempo, largoCarril, mejorVueltaSlot, trazadoCarril
} from './nucleo/slot.js';
import { CATALOGOS } from './i18n.js';
import { ORDEN_ESCENARIOS } from './escenarios.js';
import { azar, cabe, distanciaAPista, generarDecorado, torreCabe } from './nucleo/decorado.js';
import { validarCircuito } from './nucleo/validar.js';
import { aCodigo, aPiezas, COLUMNAS, deCodigo, FILAS, validarTrazado, VARIANTES } from './nucleo/cuadricula.js';
import { construirDePiezas } from './nucleo/piezas.js';
import { aTrazado, cambiarVariante, crearTrazo, deTrazado, pisar } from './nucleo/trazo.js';
import { anotarCarrera, circuitoDelCampeonato, clasificacion, crearCampeonato, tiempoFinal } from './nucleo/campeonato.js';

const DT = 1 / 60;
let aserciones = 0;
let fallos = 0;

function comprobar(condicion, mensaje) {
  aserciones++;
  if (!condicion) {
    fallos++;
    console.log('  ✗ ' + mensaje);
  }
}

/*
 * Las secciones 1 a 3, por circuito. `oficial` decide si se exigen también
 * las cifras de calibrado (la vuelta, cuánto gana derrapar, la CPU, las
 * curvas a tope, la cantidad de decorado): a un circuito dibujado solo se le
 * exige lo que no puede romperse sin que se note.
 */
function seccionCircuito(circuito, oficial, { decorado: conDecorado = true } = {}) {
  const calibrar = oficial ? comprobar : () => {};
  // --- 1. El circuito ----------------------------------------------------------

  console.log(`\nCircuito «${circuito.clave}»: ${circuito.largo.toFixed(0)} px de eje, ${circuito.eje.length} puntos, ` +
    `${circuito.cruces.length} cruces y ${circuito.cambiosCarril} X`);
  {
    /*
     * La geometría la mide `validarCircuito` (`nucleo/validar.js`), que es lo
     * que el juego pregunta también a un circuito dibujado: tramos lejanos a
     * más de un ancho + 40 px, el muro sin invadir otro tramo ni salirse del
     * lienzo, al menos 14 px de grava más allá del piano (por dentro de las
     * curvas el piano se come 10 de los 26 px: quedan 16, que medidos a pasos
     * de 1 px pueden dar 15), y la barra del marcador y el hueco de la portada
     * sin pisar lo que se conduce.
     */
    const { medidas, fallos: geometria } = validarCircuito(circuito);
    const px = (v) => v === Infinity ? 'más de 100 px' : `${v.toFixed(0)} px`;
    console.log(`  separación mínima entre tramos a más de 300 px por la pista: ${px(medidas.separacion)}`);
    console.log(`  grava mínima más allá del borde, también por dentro de las curvas: ${px(medidas.grava)}`);
    console.log(`  la barra del marcador queda a ${px(medidas.barra)} de lo que se pisa`);
    if (medidas.hueco !== undefined) console.log(`  el hueco de la portada queda a ${px(medidas.hueco)} de lo que se pisa`);
    console.log(`  tramos lejanos de carril a ${px(medidas.carriles)} como poco`);
    for (const fallo of geometria) comprobar(false, fallo);
    comprobar(true, 'la geometría');
  }

  // --- 2. El decorado ------------------------------------------------------------

  if (!conDecorado) return;
  console.log('\nDecorado');
  for (const nombre of ORDEN_ESCENARIOS) {
    const decorado = generarDecorado(circuito, nombre);
    const otra = generarDecorado(circuito, nombre);
    comprobar(JSON.stringify(decorado.piezas) === JSON.stringify(otra.piezas), `${nombre}: el decorado cambia entre dos generaciones`);
    calibrar(decorado.piezas.length >= 40, `${nombre}: solo caben ${decorado.piezas.length} piezas`);
    const malas = decorado.piezas.filter((p, i) => !cabe(circuito, p, decorado.piezas.filter((_, j) => j !== i)));
    comprobar(malas.length === 0, `${nombre}: ${malas.length} piezas pisan la pista, el marcador o a otra`);
    const neumaticosEnPista = decorado.neumaticos.filter((n) => distanciaAPista(circuito, n) < n.r);
    comprobar(neumaticosEnPista.length === 0, `${nombre}: ${neumaticosEnPista.length} neumáticos sobre la pista`);
    // Las torres de iluminación: fuera del muro, del marcador y de las bandas, sin
    // tocarse entre sí ni a las piezas; y bastantes para alumbrar toda la vuelta.
    const torresMalas = decorado.torres.filter((t, i) =>
      !torreCabe(circuito, t, decorado.torres.filter((_, j) => j !== i)) ||
      decorado.piezas.some((p) => Math.hypot(p.x - t.x, p.y - t.y) < p.r + t.r));
    comprobar(torresMalas.length === 0, `${nombre}: ${torresMalas.length} torres pisan la pista, el marcador o algo del decorado`);
    calibrar(decorado.torres.length >= 8, `${nombre}: solo caben ${decorado.torres.length} torres de iluminación`);
    // Las gradas: ninguna esquina ni punto de su contorno sobre la pista.
    for (const g of decorado.gradas) {
      const cos = Math.cos(g.angulo), sin = Math.sin(g.angulo);
      let peor = Infinity;
      for (let u = -0.5; u <= 0.5; u += 0.05) {
        for (const v of [-0.5, 0.5]) {
          const lx = u * g.largo, ly = v * g.fondo;
          peor = Math.min(peor, distanciaAPista(circuito, { x: g.x + lx * cos - ly * sin, y: g.y + lx * sin + ly * cos }));
        }
      }
      comprobar(peor > 6, `${nombre}: una grada queda a ${peor.toFixed(0)} px de la pista`);
    }
    console.log(`  ${nombre.padEnd(9)} ${decorado.piezas.length} piezas, ${decorado.neumaticos.length} neumáticos, ${decorado.gradas.length} gradas, ${decorado.torres.length} torres`);
  }
}

// --- 3. La carrera de slot -----------------------------------------------------

/**
 * Una carrera de Slot con un piloto por coche, hasta que terminan todos
 * (aunque el primero ya haya ganado). Vigila en cada paso lo que se puede
 * romper sin que se note: coordenadas, mesa, progreso y la mano; y cuenta los
 * choques, y si alguno se repite sin que los coches hayan avanzado.
 */
function correrUna(circuito, opciones, turno, limite) {
  const carrera = crearCarreraSlot(circuito, opciones.map((_, i) => ['#f00', '#00f'][i]), turno);
  const pilotos = opciones.map((o) => crearPiloto(o));
  const medida = {
    noFinito: false, fueraDeMesa: false, retrocede: false, manoMax: 0, manos: [], recolocaLejos: 0,
    choques: 0, choqueRepetido: 0
  };
  const salida = carrera.coches.map(() => null);
  let ultimoChoque = null;
  let t = 0;
  while (carrera.coches.some((c) => c.terminado === null) && t < limite) {
    const antes = carrera.coches.map((c) => c.progreso);
    avanzarSlot(carrera, carrera.coches.map((c, i) => decidirSlot(pilotos[i], c, circuito)), DT);
    t += DT;
    // Para medir los dos carriles, la carrera sigue tras el ganador.
    if (carrera.fase === 'fin') carrera.fase = 'carrera';
    carrera.coches.forEach((c, i) => {
      const { coche } = c;
      if (![coche.x, coche.y, coche.angulo, c.v, c.s].every(Number.isFinite)) medida.noFinito = true;
      if (coche.x < 0 || coche.x > ANCHO || coche.y < 0 || coche.y > ALTO) medida.fueraDeMesa = true;
      if (c.progreso < antes[i] - 1e-9) medida.retrocede = true;
    });
    for (const e of carrera.eventos) {
      const c = carrera.coches[e.coche];
      if (e.tipo === 'choque') {
        medida.choques++;
        // Dos choques sin que ninguno de los dos haya avanzado 100 px: la mano los ha dejado chocando.
        const progreso = carrera.coches.map((k) => k.progreso);
        if (ultimoChoque && progreso.every((p, k) => p - ultimoChoque[k] < 100)) medida.choqueRepetido++;
        ultimoChoque = progreso;
      }
      if (e.tipo === 'sale') salida[e.coche] = { t, s: c.s };
      if (e.tipo === 'clac' && salida[e.coche]) {
        const dura = t - salida[e.coche].t;
        medida.manos.push(dura);
        medida.manoMax = Math.max(medida.manoMax, dura);
        if (Math.abs(c.s - salida[e.coche].s) > 1e-6) medida.recolocaLejos++;
        salida[e.coche] = null;
      }
    }
  }
  return { carrera, ...medida };
}

/*
 * Lo que mide al piloto, cada coche solo en la pista y por su carril (el
 * primero por el carril 0 y el segundo por el 1): así los choques no
 * ensucian las medidas. `juntos` los pone a los dos en la misma carrera.
 */
function correrSlot(circuito, opciones, { limite = 400, juntos = false } = {}) {
  if (juntos) return correrUna(circuito, opciones, 0, limite);
  const partes = opciones.map((o, i) => correrUna(circuito, [o], i, limite));
  return {
    carrera: { coches: partes.map((p) => p.carrera.coches[0]) },
    noFinito: partes.some((p) => p.noFinito),
    fueraDeMesa: partes.some((p) => p.fueraDeMesa),
    retrocede: partes.some((p) => p.retrocede),
    manos: partes.flatMap((p) => p.manos),
    manoMax: Math.max(...partes.map((p) => p.manoMax)),
    recolocaLejos: partes.reduce((n, p) => n + p.recolocaLejos, 0),
    choques: 0,
    choqueRepetido: 0
  };
}

/** Un coche solo, por el carril `turno`, ya en carrera: para las pruebas que lo colocan a mano. */
function cocheSolo(circuito, turno) {
  const c = crearCarreraSlot(circuito, ['#f00'], turno);
  c.fase = 'carrera';
  return c;
}

/** Dónde empieza cada estrecha (también la de una curva deslizante), en s. */
const estrecho = (p) => p.efecto === 'estrecha' || p.efecto === 'deslizante';
function estrechas(circuito) {
  return circuito.eje.filter((p, i, eje) => estrecho(p) && !estrecho(eje[(i - 1 + eje.length) % eje.length])).map((p) => p.s);
}

/** Lo que limita la velocidad: una curva o una recta de baches. */
const limita = (p) => p.radio !== Infinity || p.efecto === 'baches';

function seccionSlot(circuito, oficial) {
  const calibrar = oficial ? comprobar : () => {};
  console.log(`\nSlot en «${circuito.clave}»`);
  // Los carriles (por el asfalto, dentro del lienzo y separados) los mide la sección 1.
  const largos = CARRILES.map((l) => largoCarril(circuito, l));
  console.log(`  carriles de ${largos.map((l) => l.toFixed(0)).join(' y ')} px`);

  /*
   * Soltar en las curvas tiene que ganar a ir a fondo, y por mucho. Desde el
   * playtest, pasado el agarre se derrapa antes de salirse: el prudente no
   * pasa del agarre (×1), el fino entra derrapando y el que va a fondo se sale.
   */
  const prudente = correrSlot(circuito, [{ prudencia: 1 }, { prudencia: 1 }]);
  let fino = null;
  // En un circuito dibujado no se calibra: basta un piloto fino.
  for (const prudencia of oficial ? [1.2, 1.4, 1.6, 1.8] : [1.4]) {
    const r = correrSlot(circuito, [{ prudencia }, { prudencia }]);
    const mejor = Math.min(...r.carrera.coches.map((c) => c.terminado ?? Infinity));
    if (!fino || mejor < fino.mejor) fino = { ...r, mejor, prudencia };
  }
  const aFondo = correrSlot(circuito, [{ aFondo: true }, { aFondo: true }]);
  const resumen = (r) => r.carrera.coches.map((c) =>
    `${c.terminado?.toFixed(2)} s, vuelta ${mejorVueltaSlot(c)?.toFixed(2)}, ${c.salidas} salidas`).join(' | ');
  console.log(`  prudente (x1):          ${resumen(prudente)}`);
  console.log(`  al límite (x${fino.prudencia}):      ${resumen(fino)}`);
  console.log(`  a fondo:                ${resumen(aFondo)}`);

  for (const [nombre, r] of [['prudente', prudente], ['al límite', fino], ['a fondo', aFondo]]) {
    comprobar(r.carrera.coches.every((c) => c.vueltas.length === VUELTAS_SLOT), `el piloto ${nombre} no completa las ${VUELTAS_SLOT} vueltas en los dos carriles`);
    comprobar(!r.noFinito, `el piloto ${nombre} produce coordenadas no finitas`);
    comprobar(!r.fueraDeMesa, `un coche del piloto ${nombre} se cae de la mesa`);
    comprobar(!r.retrocede, `el progreso del piloto ${nombre} retrocede`);
    comprobar(r.recolocaLejos === 0, `la mano deja ${r.recolocaLejos} veces el coche lejos de donde se salió`);
  }
  comprobar(prudente.carrera.coches.every((c) => c.salidas === 0), 'el piloto prudente se sale del carril');
  const vueltaPrudente = Math.max(...prudente.carrera.coches.map(mejorVueltaSlot));
  calibrar(vueltaPrudente > 9 && vueltaPrudente < 16, `la vuelta del prudente (${vueltaPrudente.toFixed(2)} s) se sale de 9-16 s`);
  const premio = Math.min(...prudente.carrera.coches.map((c) => c.terminado)) / fino.mejor - 1;
  console.log(`  entrar derrapando ahorra un ${(premio * 100).toFixed(0)} % sobre no pasar del agarre`);
  calibrar(premio > 0, 'entrar derrapando no gana a no pasar del agarre');
  const ventaja = Math.min(...aFondo.carrera.coches.map((c) => c.terminado)) / fino.mejor - 1;
  console.log(`  soltar en las curvas ahorra un ${(ventaja * 100).toFixed(0)} % sobre ir a fondo`);
  calibrar(ventaja > 0.3, 'ir a fondo no pierde al menos un 30 % contra quien suelta');
  calibrar(aFondo.carrera.coches.every((c) => c.salidas >= 2 * VUELTAS_SLOT), 'ir a fondo no se sale al menos dos veces por vuelta');

  // La mano: devuelve siempre el coche, y pronto.
  const media = aFondo.manos.reduce((a, b) => a + b, 0) / aFondo.manos.length;
  if (aFondo.manos.length) console.log(`  la mano tarda ${media.toFixed(2)} s de media desde que se sale (como mucho ${aFondo.manoMax.toFixed(2)})`);
  else console.log('  a fondo no se sale nunca: la mano no ha tenido que salir');
  comprobar(aFondo.manoMax <= FUERA_MAXIMO + DURACION_MANO + 0.05, `la mano tarda ${aFondo.manoMax.toFixed(2)} s en devolver un coche`);

  /*
   * Arrancar parado dentro de una curva con el dedo a fondo (lo que hace quien
   * acaba de recibir el coche de la mano) puede derrapar, pero no sacarlo en
   * esa curva. En el primer playtest se salía en la mitad de los arranques.
   */
  let arranques = 0, salenArrancando = 0;
  for (let s0 = 0; s0 < circuito.largo; s0 += 20) {
    if (!limita(circuito.eje[circuito.puntoEn(s0).indice])) continue;
    for (const i of [0, 1]) {
      const c = cocheSolo(circuito, i);
      const [slot] = c.coches;
      slot.s = s0;
      for (let k = 0; k < 120 && slot.s - s0 < 150; k++) {
        avanzarSlot(c, [{ acelerar: true }], DT);
        if (c.eventos.some((e) => e.tipo === 'sale')) { salenArrancando++; break; }
      }
      arranques++;
    }
  }
  console.log(`  arrancando parado en una curva a fondo, se sale en ${salenArrancando} de ${arranques}`);
  comprobar(salenArrancando === 0, `arrancando parado en una curva se sale ${salenArrancando} veces`);

  // A toques, la potencia se queda a medias: la velocidad se puede dosificar.
  {
    const c = cocheSolo(circuito, 0);
    const [slot] = c.coches;
    let menor = Infinity, mayor = 0;
    for (let k = 0; k < 360; k++) {
      // Medio tiempo pulsado, a cinco toques por segundo, en la recta de meta.
      slot.s = 30;
      avanzarSlot(c, [{ acelerar: k % 12 < 6 }], DT);
      if (k >= 240) { menor = Math.min(menor, slot.v); mayor = Math.max(mayor, slot.v); }
    }
    const tope = VELOCIDAD_SLOT;
    console.log(`  a toques (5 por segundo, la mitad pulsado): de ${menor.toFixed(0)} a ${mayor.toFixed(0)} px/s, con tope ${tope}`);
    comprobar(menor > tope * 0.2 && mayor < tope * 0.8, `a toques la velocidad no se queda a medias (${menor.toFixed(0)}-${mayor.toFixed(0)})`);
  }

  /*
   * Un humano no frena al píxel: el piloto con un retraso de reacción (actúa
   * con lo que decidió hace 0,25 s) y entrando algo derrapando (×1,2) no se
   * sale por ningún carril. En el segundo playtest, por dentro de las curvas
   * de 40 y de la horquilla se salía casi seguro; este piloto, en todas las
   * vueltas (radio 25 y 30).
   */
  {
    const salidasHumano = [0, 1].map((turno) => {
      const c = cocheSolo(circuito, turno);
      const piloto = crearPiloto({ prudencia: 1.2 });
      const cola = [];
      for (let t = 0; c.coches[0].completadas < VUELTAS_SLOT && t < 300; t += DT) {
        cola.push(decidirSlot(piloto, c.coches[0], circuito));
        avanzarSlot(c, [cola.length > Math.round(0.25 / DT) ? cola.shift() : null], DT);
      }
      return c.coches[0].salidas;
    });
    console.log(`  un humano que reacciona 0,25 s tarde se sale ${salidasHumano.join(' y ')} veces (carril 0 y 1)`);
    // En un circuito dibujado, que sea duro lo decide quien lo dibuja: una
    // curva de una casilla tras cuatro de recta saca a este humano.
    calibrar(salidasHumano.every((n) => n === 0), `un humano que reacciona tarde se sale ${salidasHumano.join(' y ')} veces`);
  }

  /*
   * La CPU del juego (`CPU_SLOT`) tiene que ser ganable, pero no fácil: cada
   * curva con su prudencia y algún fallo. Perfecta «no había quien le ganara»
   * (0,7 s por vuelta del mejor piloto); a 2 s, «ahora es fácil».
   */
  {
    const vueltas = [], salidas = [];
    let repetida = null;
    const semillas = oficial ? 6 : 1;
    for (let semilla = 1; semilla <= semillas; semilla++) {
      const r = correrSlot(circuito, [{ ...CPU_SLOT, semilla }, { ...CPU_SLOT, semilla }]);
      const [c] = r.carrera.coches;
      vueltas.push(c.terminado / VUELTAS_SLOT);
      salidas.push(c.salidas);
      if (semilla === 1) repetida = c.terminado;
    }
    const otra = correrSlot(circuito, [{ ...CPU_SLOT, semilla: 1 }, { ...CPU_SLOT, semilla: 1 }]).carrera.coches[0].terminado;
    const media = vueltas.reduce((a, b) => a + b, 0) / vueltas.length;
    const margen = media - fino.mejor / VUELTAS_SLOT;
    console.log(`  la CPU da vueltas de ${media.toFixed(2)} s de media, ${margen.toFixed(2)} s más que el mejor piloto, y se sale ${salidas.join(', ')} veces en ${semillas === 6 ? 'seis carreras' : 'una carrera'}`);
    calibrar(margen > 0.6, `la CPU deja solo ${margen.toFixed(2)} s por vuelta al mejor piloto: no hay quien le gane`);
    calibrar(margen < 1.4, `la CPU deja ${margen.toFixed(2)} s por vuelta al mejor piloto: es fácil`);
    calibrar(salidas.some((n) => n > 0), 'la CPU no se equivoca nunca');
    comprobar(otra === repetida, 'la CPU con la misma semilla no repite la carrera');

    // Y juntos en la pista, la CPU contra el mejor piloto: cuántas veces chocan.
    if (oficial) {
      const choques = [1, 2, 3, 4, 5, 6].map((semilla) =>
        correrSlot(circuito, [{ ...CPU_SLOT, semilla }, { prudencia: fino.prudencia }], { juntos: true }).choques);
      console.log(`  la CPU contra el mejor piloto, en la misma pista: ${choques.join(', ')} choques en seis carreras`);
    }
  }

  /*
   * Ninguna curva se pasa a tope: entrando lanzado y sin soltar, se sale en
   * todas, por los dos carriles. En el tercer playtest, la curva de 80 por
   * fuera (radio 95) se pasaba a fondo: el derrape la frenaba solo. Cuentan
   * también el peralte, la curva de derrape y los baches.
   */
  {
    const inicios = circuito.eje.filter((p, i, eje) => limita(p) && !limita(eje[(i - 1 + eje.length) % eje.length]));
    const pasan = [];
    for (const p of inicios) {
      for (const k of [0, 1]) {
        const c = cocheSolo(circuito, k);
        const [slot] = c.coches;
        Object.assign(slot, { s: p.s - 40, v: VELOCIDAD_SLOT, potencia: 1 });
        let sale = false;
        for (let i = 0; i < 90 && !sale; i++) {
          avanzarSlot(c, [{ acelerar: true }], DT);
          sale = c.eventos.some((e) => e.tipo === 'sale');
        }
        const nombre = p.efecto === 'baches' ? 'los baches' : `la de ${p.radio}${p.efecto ? ' (' + p.efecto + ')' : ''}`;
        if (!sale) pasan.push(`${nombre} por el carril ${k}`);
      }
    }
    console.log(`  a tope contra las ${inicios.length} curvas, por los dos carriles: se pasan ${pasan.length}`);
    calibrar(pasan.length === 0, `se pasan a tope ${pasan.join(', ')}`);
  }

  /*
   * Los carriles no son iguales, por eso se cambian en cada carrera. Con una
   * X, cada coche corre la mitad de las vueltas por cada uno: casi iguales.
   */
  const [t1, t2] = prudente.carrera.coches.map((c) => c.terminado);
  const desigualdad = Math.abs(t1 - t2) / Math.min(t1, t2);
  console.log(`  entre carriles, con el mismo piloto: ${(desigualdad * 100).toFixed(1)} % (se cambian en cada carrera)`);
  calibrar(desigualdad < 0.08, `un carril saca un ${(desigualdad * 100).toFixed(1)} % al otro`);
  if (circuito.cambiosCarril % 2) calibrar(desigualdad < 0.02, `con una X, un carril aún saca un ${(desigualdad * 100).toFixed(1)} % al otro`);
  const cambiada = crearCarreraSlot(circuito, ['#f00', '#00f'], 1);
  comprobar(cambiada.coches[0].lateral === CARRILES[1] && cambiada.coches[1].lateral === CARRILES[0],
    'con el turno cambiado los coches no se cambian de carril');

  /*
   * Los choques. En paralelo, dos coches no se tocan nunca: con el mismo piloto
   * van juntos toda la carrera y sin X, cruces ni estrechas no chocan. En cada X, cada cruce y cada estrecha, dos coches que llegan a la vez chocan, y una
   * vez devueltos por la mano no vuelven a chocar sin haber avanzado.
   */
  {
    const juntos = correrSlot(circuito, [{ prudencia: 1 }, { prudencia: 1 }], { juntos: true });
    const completa = juntos.carrera.coches.every((c) => c.vueltas.length === VUELTAS_SLOT);
    console.log(`  dos coches iguales en la misma pista: ${juntos.choques} choques`);
    // Con una X pueden chocar (si llegan a la vez) y en una estrecha, si van a
    // la par; sin X, cruces ni estrechas, nunca.
    if (!circuito.cambiosCarril && !circuito.cruces.length && !estrechas(circuito).length) {
      comprobar(juntos.choques === 0, `dos coches iguales chocan ${juntos.choques} veces sin X, cruces ni estrechas`);
    }
    comprobar(completa, 'dos coches juntos no terminan la carrera');
    comprobar(juntos.choqueRepetido === 0, `la mano deja dos coches chocando ${juntos.choqueRepetido} veces`);

    // Los encuentros: cada cruce (dos tramos), cada X y cada estrecha (el mismo tramo).
    const encuentros = [
      ...circuito.cruces.map((c) => c.s),
      ...circuito.eje.filter((p, i, eje) => p.tipo === 'x' && eje[(i - 1 + eje.length) % eje.length].tipo !== 'x')
        .map((p) => [p.s, p.s]),
      ...estrechas(circuito).map((s) => [s, s])
    ];
    for (const [sa, sb] of encuentros) {
      let chocan = 0, repetidos = 0;
      // Los dos lanzados a la misma velocidad, el segundo algo adelantado o retrasado.
      for (let desfase = -40; desfase <= 40; desfase += 4) {
        const c = crearCarreraSlot(circuito, ['#f00', '#00f']);
        c.fase = 'carrera';
        c.coches[0].s = sa - 150;
        c.coches[1].s = sb - 150 + desfase;
        for (const slot of c.coches) Object.assign(slot, { v: 250, potencia: 250 / VELOCIDAD_SLOT });
        let veces = 0;
        for (let k = 0; k < 4 / DT; k++) {
          avanzarSlot(c, c.coches.map((slot) => ({ acelerar: slot.v < 250 })), DT);
          veces += c.eventos.filter((e) => e.tipo === 'choque').length;
        }
        if (veces) chocan++;
        if (veces > 1) repetidos++;
      }
      console.log(`  en el encuentro de s ${sa.toFixed(0)} y ${sb.toFixed(0)}: chocan en ${chocan} de 21 desfases`);
      comprobar(chocan > 0, `dos coches que llegan a la vez al encuentro de s ${sa.toFixed(0)} no chocan`);
      comprobar(repetidos === 0, `en el encuentro de s ${sa.toFixed(0)} chocan dos veces seguidas ${repetidos} veces`);
    }
  }
}

for (const circuito of CIRCUITOS) seccionCircuito(circuito, true);
for (const circuito of CIRCUITOS) seccionSlot(circuito, true);

// --- 5. La cuadrícula del constructor -------------------------------------------

/*
 * Un circuito dibujado tiene que poder correrse siempre: lo que deja pasar la
 * validación de la cuadrícula (`validarTrazado`, con enteros: la que repetirá
 * el servidor) cumple la geometría (`validarCircuito`) y las reglas de la
 * carrera que no son de calibrado. Se comprueba con trazados a mano, que ponen
 * cada pieza junto a sus vecinas más apretadas, y con trazados al azar (con
 * semilla). Lo que no cabía, lo prohíbe la validación: la chicane necesita
 * libre su lado, y la amplia, su casilla de dentro.
 */

/*
 * Un trazado a mano, desde la meta: R recta, D derecha, I izquierda, y la
 * variante detrás: b baches, x X, c chicane a la izquierda, C a la derecha;
 * p peralte, d derrape, a amplia.
 */
const LETRA_VARIANTE = { b: 'baches', x: 'x', c: 'chicaneIzquierda', C: 'chicaneDerecha', p: 'peralte', d: 'derrape', a: 'amplia' };
function aMano(col, fila, rumbo, texto) {
  const pasos = [...texto.matchAll(/([RDI])([bxcCpda]?)/g)].map(([, giro, letra]) =>
    ({ giro: { R: 0, D: 1, I: -1 }[giro], variante: LETRA_VARIANTE[letra] || '' }));
  return { col, fila, rumbo, pasos };
}

const A_MANO = {
  // El borde de la cuadrícula, con todas las piezas: amplia, chicanes, X, baches, peralte y derrape.
  marco: aMano(3, 5, 0, 'R' + 'RRbRRxRR' + 'Ia' + 'RRcRRIp' + 'RRcRRRRbRRR' + 'Id' + 'RRRxRI' + 'RR'),
  // Un ocho: el lazo de la derecha cruza la recta de meta en la casilla (5, 3).
  ocho: aMano(3, 3, 0, 'RRRRIRIRIRRRDRRDRD'),
  // Toda la cuadrícula: horquillas de dos curvas junto a rectas paralelas, a una casilla.
  serpiente: aMano(1, 0, 0, 'R' + 'R'.repeat(8) + 'DdDd' + 'R'.repeat(8) + 'IpIp' + 'R'.repeat(8) + 'DD' +
    'R'.repeat(8) + 'II' + 'R'.repeat(8) + 'DD' + 'R'.repeat(9) + 'D' + 'R'.repeat(4) + 'D'),
  // El más pequeño que se puede cerrar: seis casillas.
  minimo: aMano(3, 3, 0, 'RDDRDD')
};

/** Un trazado al azar: un paseo por la cuadrícula que vuelve a la meta, con variantes donde la validación las deja. */
function trazadoAlAzar(tirar) {
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  for (;;) {
    const col = Math.floor(tirar() * COLUMNAS), fila = Math.floor(tirar() * FILAS), rumbo = Math.floor(tirar() * 4);
    const pasos = [{ giro: 0, variante: '' }];
    const visitas = new Map([[fila * COLUMNAS + col, { giro: 0, rumbo }]]);
    const casa = { c: col - DX[rumbo], f: fila - DY[rumbo] };
    const largo = 8 + Math.floor(tirar() * 50);
    let c = col + DX[rumbo], f = fila + DY[rumbo], r = rumbo;
    for (let k = 0; k < 90; k++) {
      if (c === col && f === fila) break;
      if (c < 0 || f < 0 || c >= COLUMNAS || f >= FILAS) break;
      const previa = visitas.get(f * COLUMNAS + c);
      // Por una casilla ya pisada solo se pasa recto (un cruce).
      const giros = previa ? [0] : [0, 1, -1];
      const pesos = giros.map((g) => {
        const nr = (r + g + 4) % 4, nc = c + DX[nr], nf = f + DY[nr];
        if (nc < 0 || nf < 0 || nc >= COLUMNAS || nf >= FILAS) return 0;
        if (nc === col && nf === fila) return nr === rumbo ? 50 : 0;
        const otra = visitas.get(nf * COLUMNAS + nc);
        if (otra && (otra.cruce || otra.giro || (otra.rumbo - nr) % 2 === 0)) return 0;
        let peso = (g === 0 ? 2 : 1) * (otra ? 0.5 : 1);
        // Pasado su largo, vuelve a casa.
        const antes = Math.abs(c - casa.c) + Math.abs(f - casa.f), despues = Math.abs(nc - casa.c) + Math.abs(nf - casa.f);
        if (k > largo) peso *= Math.pow(0.3, despues - antes);
        return peso;
      });
      const total = pesos.reduce((a, b) => a + b, 0);
      if (!total) break;
      let dado = tirar() * total, g = giros[0];
      for (let i = 0; i < giros.length; i++) {
        if (dado < pesos[i]) { g = giros[i]; break; }
        dado -= pesos[i];
      }
      if (previa) previa.cruce = true; else visitas.set(f * COLUMNAS + c, { giro: g, rumbo: r });
      pasos.push({ giro: g, variante: '' });
      r = (r + g + 4) % 4;
      c += DX[r];
      f += DY[r];
    }
    const trazado = { col, fila, rumbo, pasos };
    if (validarTrazado(trazado)) continue;
    for (let i = 1; i < pasos.length; i++) {
      if (tirar() > 0.4) continue;
      const lista = VARIANTES[pasos[i].giro ? 'curva' : 'recta'];
      pasos[i].variante = lista[1 + Math.floor(tirar() * (lista.length - 1))];
      if (validarTrazado(trazado)) pasos[i].variante = '';
    }
    return trazado;
  }
}

console.log('\nLa cuadrícula');
{
  // Lo que la validación prohíbe, y por qué.
  const { marco, ocho, serpiente, minimo } = A_MANO;
  const cambiado = (trazado, i, variante) =>
    ({ ...trazado, pasos: trazado.pasos.map((p, k) => k === i ? { ...p, variante } : p) });
  const prohibidos = [
    ['abierto', aMano(3, 3, 0, 'RRRR')],
    ['fuera', aMano(9, 0, 0, 'RRDD')],
    ['meta', cambiado(marco, 0, 'baches')],
    ['variante', cambiado(marco, 1, 'peralte')],
    // Dos vueltas al mismo lazo.
    ['pisa', aMano(3, 3, 0, 'RDDRDD'.repeat(2))],
    ['cruce', cambiado(ocho, 2, 'baches')],
    // La chicane de la recta de arriba, hacia fuera de la cuadrícula.
    ['chicane', cambiado(marco, 14, 'chicaneDerecha')],
    // Una chicane que acaba en una curva.
    ['chicane', cambiado(marco, 11, 'chicaneIzquierda')],
    // La amplia de una horquilla: no hay recta después.
    ['amplia', cambiado(serpiente, 9, 'amplia')],
    // La amplia que se llevaría la recta de la meta.
    ['amplia', cambiado(minimo, 5, 'amplia')]
  ];
  for (const [motivo, trazado] of prohibidos) {
    const error = validarTrazado(trazado);
    comprobar(error?.motivo === motivo, `la validación da «${error?.motivo}» donde tenía que dar «${motivo}»`);
  }
  console.log(`  ${prohibidos.length} trazados prohibidos, cada uno por su motivo`);

  // El código: ida y vuelta, y lo que no es un código no se lee.
  const tirar = azar(5);
  const azarosos = Array.from({ length: 24 }, () => trazadoAlAzar(tirar));
  const todos = [...Object.values(A_MANO), ...azarosos];
  comprobar(todos.every((t) => !validarTrazado(t)), 'un trazado a mano no es válido');
  const mal = todos.filter((t) => JSON.stringify(deCodigo(aCodigo(t))) !== JSON.stringify(t));
  comprobar(mal.length === 0, `${mal.length} trazados no vuelven iguales de su código`);
  comprobar(['', 'A', 'AQ', 'AgMAAAA', '!!!!', 'AQMFAA=='].every((c) => deCodigo(c) === null), 'se lee como circuito algo que no es un código');
  console.log(`  ${todos.length} trazados van y vuelven por su código (el marco: ${aCodigo(marco)})`);

  /*
   * El trazo del constructor: dibujar con el dedo, casilla a casilla, cada
   * trazado válido lo cierra y da el mismo trazado (sin variantes, que se
   * ponen tocando); ida y vuelta, igual. Volver por el trazo borra, a la meta
   * solo se llega por detrás y un cruce solo se hace en recta.
   */
  const sinVariantes = (t) => ({ ...t, pasos: t.pasos.map((p) => ({ ...p, variante: '' })) });
  let dibujados = 0;
  for (const trazado of todos) {
    const trazo = crearTrazo();
    const casillas = deTrazado(trazado).casillas;
    const pasos = [...casillas, casillas[0]].map((c) => pisar(trazo, c));
    const bien = pasos.at(-1) === 'cierra' && pasos.slice(0, -1).every((r) => r === 'empieza' || r === 'avanza') &&
      JSON.stringify(aTrazado(trazo)) === JSON.stringify(sinVariantes(trazado)) &&
      JSON.stringify(aTrazado(deTrazado(trazado))) === JSON.stringify(trazado);
    if (bien) dibujados++;
  }
  comprobar(dibujados === todos.length, `${todos.length - dibujados} trazados no se dibujan igual con el dedo`);
  {
    const trazo = crearTrazo();
    const c = (col, fila) => ({ col, fila });
    pisar(trazo, c(3, 3)); pisar(trazo, c(4, 3)); pisar(trazo, c(5, 3));
    comprobar(pisar(trazo, c(4, 3)) === 'retrocede' && trazo.casillas.length === 2, 'volver por el trazo no borra');
    comprobar(pisar(trazo, c(6, 3)) === null, 'se salta una casilla');
    pisar(trazo, c(5, 3)); pisar(trazo, c(5, 4)); pisar(trazo, c(4, 4));
    comprobar(pisar(trazo, c(3, 4)) === 'avanza' && pisar(trazo, c(3, 3)) === null, 'a la meta se llega de lado');
    comprobar(pisar(trazo, c(4, 4)) === 'retrocede', 'volver por el trazo no borra');
    // (5, 4) es curva: no se cruza.
    pisar(trazo, c(3, 4)); pisar(trazo, c(3, 5)); pisar(trazo, c(4, 5)); pisar(trazo, c(5, 5));
    comprobar(pisar(trazo, c(5, 4)) === null, 'se cruza una curva');
    // El ocho: cruza la recta de meta en (5, 3), en perpendicular, y sale recto.
    const ocho = crearTrazo();
    const resultados = deTrazado(A_MANO.ocho).casillas.map((k) => pisar(ocho, k));
    comprobar(resultados.every(Boolean) && pisar(ocho, deTrazado(A_MANO.ocho).casillas[0]) === 'cierra', 'el ocho no se dibuja');
    // Tocar: la meta no cambia; cada pieza pasa por sus variantes, saltándose las que no caben.
    comprobar(cambiarVariante(ocho, 0) === null, 'la meta tiene variante');
    let invalidas = 0, vistas = 0;
    for (let i = 1; i < ocho.casillas.length; i++) {
      for (let k = 0; k < 5; k++) {
        if (cambiarVariante(ocho, i)) vistas++;
        if (validarTrazado(aTrazado(ocho))) invalidas++;
      }
    }
    comprobar(invalidas === 0 && vistas > 0, `tocando las piezas del ocho quedan ${invalidas} trazados no válidos`);
  }
  console.log(`  ${dibujados} trazados se dibujan con el dedo y cierran igual`);

  // Los trazados al azar: la geometría, todos; la carrera, unos pocos.
  const pistas = azarosos.map((t, i) => ({ trazado: t, circuito: construirDePiezas(aPiezas(t, `azar-${i + 1}`)) }));
  let malos = 0;
  for (const { trazado, circuito } of pistas) {
    const { fallos: geometria } = validarCircuito(circuito);
    if (geometria.length) {
      malos++;
      console.log(`  ✗ ${aCodigo(trazado)}: ${geometria.join(', ')}`);
    }
  }
  comprobar(malos === 0, `${malos} trazados válidos al azar no cumplen la geometría`);
  const casillas = azarosos.map((t) => t.pasos.length);
  const variantes = azarosos.reduce((n, t) => n + t.pasos.filter((p) => p.variante).length, 0);
  const cruces = pistas.reduce((n, p) => n + p.circuito.cruces.length, 0);
  console.log(`  ${azarosos.length} trazados al azar (de ${Math.min(...casillas)} a ${Math.max(...casillas)} casillas, ` +
    `${variantes} variantes, ${cruces} cruces) cumplen la geometría`);

  // Para verlos en pantalla: http://127.0.0.1:8124/?c=<código>
  console.log('  para probarlos en el juego, ?c=<código>:');
  for (const [nombre, trazado] of Object.entries(A_MANO)) console.log(`    ${nombre.padEnd(10)} ${aCodigo(trazado)}`);
  azarosos.slice(0, 8).forEach((t, i) => console.log(`    ${('azar-' + (i + 1)).padEnd(10)} ${aCodigo(t)}`));

  // Los de a mano, enteros (con su decorado y su grada); de los de al azar, unos pocos, las secciones 1 y 3.
  for (const [nombre, trazado] of Object.entries(A_MANO)) {
    const circuito = construirDePiezas(aPiezas(trazado, nombre));
    seccionCircuito(circuito, false);
    seccionSlot(circuito, false);
  }
  for (const { circuito } of pistas.slice(0, 3)) {
    seccionCircuito(circuito, false, { decorado: false });
    seccionSlot(circuito, false);
  }
}

// --- 6. El campeonato ------------------------------------------------------------

/*
 * Los circuitos oficiales, en orden, con dos pilotos distintos: gana quien
 * gane más carreras, y con las mismas, el menor tiempo sumado. Al que no ha
 * acabado se le pone el tiempo a su ritmo: más que el del ganador.
 */
console.log('\nEl campeonato');
{
  const campeonato = crearCampeonato(CIRCUITOS);
  const estimados = [];
  for (let circuito = circuitoDelCampeonato(campeonato); circuito; circuito = circuitoDelCampeonato(campeonato)) {
    const r = correrSlot(circuito, [{ prudencia: 1.6 }, { ...CPU_SLOT, semilla: campeonato.carreras.length + 1 }], { juntos: true });
    const { carrera } = r;
    estimados.push(...carrera.coches.filter((slot) => slot.terminado === null || slot !== carrera.coches[carrera.ganador])
      .map((slot) => tiempoFinal(carrera, slot) / carrera.coches[carrera.ganador].terminado));
    anotarCarrera(campeonato, carrera, [false, false]);
  }
  const { victorias, tiempos, delante, acabado } = clasificacion(campeonato);
  console.log(`  ${campeonato.carreras.map((c) => `${c.clave}: gana el ${c.ganador}`).join(', ')}`);
  console.log(`  victorias ${victorias.join(' - ')}, tiempos ${tiempos.map(formatearTiempo).join(' y ')}: campeón el ${delante}`);
  comprobar(acabado && campeonato.carreras.length === CIRCUITOS.length, 'el campeonato no corre todos los circuitos oficiales');
  comprobar(circuitoDelCampeonato(campeonato) === null, 'acabado, el campeonato aún tiene circuito');
  comprobar(victorias[0] + victorias[1] === CIRCUITOS.length, 'las victorias no suman las carreras');
  comprobar(estimados.every((f) => f >= 1), 'al que no acaba se le pone menos tiempo que al ganador');

  // El desempate, con carreras de mentira: dos victorias cada uno.
  const empate = crearCampeonato(CIRCUITOS);
  for (const [ganador, tiemposCarrera] of [[0, [50, 51]], [1, [62, 60]], [0, [40, 45]], [1, [70, 69]]]) {
    empate.carreras.push({ clave: 'x', ganador, tiempos: tiemposCarrera, humanos: [true, false] });
  }
  const desempate = clasificacion(empate);
  comprobar(desempate.porTiempo && desempate.delante === 0, `con 2-2 no gana el menor tiempo (${desempate.tiempos.join(' y ')})`);
  // Las victorias del 0, por poco: ahora suma más tiempo.
  empate.carreras[0].tiempos = [58, 59];
  empate.carreras[2].tiempos = [46, 47];
  empate.carreras[1].tiempos = [70, 60];
  comprobar(clasificacion(empate).delante === 1, 'con 2-2 el desempate no cambia con los tiempos');
}

// --- 4. Los idiomas -----------------------------------------------------------

console.log('\nIdiomas');
{
  const base = Object.keys(CATALOGOS.es);
  for (const [codigo, catalogo] of Object.entries(CATALOGOS)) {
    const propias = Object.keys(catalogo);
    const faltan = base.filter((k) => !propias.includes(k));
    const sobran = propias.filter((k) => !base.includes(k));
    comprobar(!faltan.length && !sobran.length, `${codigo}: faltan [${faltan}] sobran [${sobran}]`);
  }
  console.log(`  ${Object.keys(CATALOGOS).length} idiomas, ${base.length} claves cada uno`);
}

console.log(`\n${aserciones - fallos}/${aserciones} aserciones en verde`);
process.exit(fallos ? 1 : 0);
