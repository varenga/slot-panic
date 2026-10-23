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
  AGARRE_SLOT, ALTO, ANCHO, ANCHO_COCHE, ANCHO_PISTA, CARRERAS, CARRIL, COCHE_REFERENCIA, COCHES, COLETEO_MAXIMO, CPU_SLOT, DURACION_MANO, FUERA_MAXIMO,
  GRABA_REPETICION, LARGO_COCHE, NIVELES_CPU, NUMERO_MOMENTOS, PASO_REPETICION, PESO_CARACTER, TRAS_META, VELOCIDAD_SLOT, VUELTAS_SLOT
} from './config.js';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { CIRCUITOS, CIRCUITOS_CUATRO } from './circuitos/indice.js';
import { enCruce } from './nucleo/circuito.js';
import { crearPiloto, decidirSlot } from './nucleo/piloto.js';
import {
  avanzarSlot, contacto, crearCarreraSlot, formatearTiempo, largoCarril, lateralEn, mejorVueltaSlot, radioAgarre, radioCarril, trazadoCarril
} from './nucleo/slot.js';
import { RADIO_COCHE } from './nucleo/slot.js';
import { cambiarIdioma, codigoIdioma, IDIOMAS, t, todosLosCatalogos } from './i18n.js';
import { ORDEN_ESCENARIOS } from './escenarios.js';
import { azar, cabe, circulosDe, distanciaAPista, generarDecorado, instalacionCabe, torreCabe } from './nucleo/decorado.js';
import { validarCircuito } from './nucleo/validar.js';
import { aCodigo, aPiezas, COLUMNAS, deCodigo, FILAS, validarTrazado, VARIANTES } from './nucleo/cuadricula.js';
import { construirDePiezas } from './nucleo/piezas.js';
import { aTrazado, cambiarVariante, crearTrazo, deTrazado, pisar } from './nucleo/trazo.js';
import { luzDeCarrera, sombraSol, sombraTorre } from './luz.js';
import { anotarCarrera, circuitoDelCampeonato, clasificacion, crearCampeonato, tiempoFinal } from './nucleo/campeonato.js';
import { anotarManga, crearSerie, mangasDe, serieAcabada, sumaEnCarrera, sumaSerie } from './nucleo/mangas.js';
import { codificar, decodificar, posar } from './nucleo/fantasma.js';
import {
  crearRepeticion, duracionMomento, elegirMomentos, eventosEntre, grabarCuadro, numerosGrabados, poseEn, TIPOS_MOMENTO
} from './nucleo/momentos.js';
import { claveRotulo } from './repeticion.js';
import { ajuste, autoBajada, cambiarAjuste, elegido, OPCIONES, ponerAjustes, reiniciarAjustes, vigilar } from './ajustes.js';

// Los siete catálogos (el juego solo baja el suyo).
const CATALOGOS = await todosLosCatalogos();

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
    // Las instalaciones (boxes, vallas, comisarios, aparcamiento): la misma
    // pregunta que al colocarlas, contra todo lo demás; y nada crece encima.
    const { instalaciones } = decorado;
    comprobar(JSON.stringify(instalaciones) === JSON.stringify(otra.instalaciones), `${nombre}: las instalaciones cambian entre dos generaciones`);
    const redondo = [
      ...decorado.neumaticos,
      ...decorado.torres,
      ...decorado.gradas.map((g) => ({ x: g.x, y: g.y, r: Math.hypot(g.largo, g.fondo) / 2 }))
    ];
    const instalacionesMalas = instalaciones.filter((r, i) =>
      !instalacionCabe(circuito, r, [...redondo, ...instalaciones.filter((_, j) => j !== i).flatMap(circulosDe)]) ||
      decorado.piezas.some((p) => circulosDe(r).some((c) => Math.hypot(p.x - c.x, p.y - c.y) < p.r + c.r)));
    comprobar(instalacionesMalas.length === 0, `${nombre}: ${instalacionesMalas.length} instalaciones pisan la pista, el marcador o algo del decorado`);
    const cuantas = (tipo) => instalaciones.filter((r) => r.tipo === tipo).length;
    if (decorado.escenario.juguete) comprobar(instalaciones.length === 0, `${nombre}: la mesa del juguete tiene instalaciones de circuito`);
    else {
      calibrar(cuantas('boxes') === 1, `${nombre}: no caben los boxes`);
      calibrar(cuantas('aparcamiento') === 1, `${nombre}: no cabe el aparcamiento`);
      calibrar(cuantas('comisario') >= 1 && cuantas('valla') >= 1, `${nombre}: ni un comisario o ni una valla`);
    }
    console.log(`  ${nombre.padEnd(9)} ${decorado.piezas.length} piezas, ${decorado.neumaticos.length} neumáticos, ${decorado.gradas.length} gradas, ${decorado.torres.length} torres, ` +
      `${cuantas('boxes')} boxes, ${cuantas('valla')} vallas, ${cuantas('comisario')} comisarios, ${cuantas('aparcamiento')} aparcamiento`);
  }
}

// --- 3. La carrera de slot -----------------------------------------------------

/**
 * Una carrera de Slot con un piloto por coche, hasta que terminan todos
 * (aunque el primero ya haya ganado). Vigila en cada paso lo que se puede
 * romper sin que se note: coordenadas, mesa, progreso y la mano; y cuenta los
 * choques, y si alguno se repite sin que los coches hayan avanzado.
 */
const COLORES = ['#f00', '#00f', '#0a0', '#fa0'];

function correrUna(circuito, opciones, turno, limite, vueltas = VUELTAS_SLOT, modelos = []) {
  const carrera = crearCarreraSlot(circuito, opciones.map((_, i) => COLORES[i]), turno, { vueltas, modelos });
  const pilotos = opciones.map((o) => crearPiloto(o));
  const medida = {
    noFinito: false, fueraDeMesa: false, retrocede: false, manoMax: 0, manos: [], recolocaLejos: 0,
    choques: 0, choqueRepetido: 0
  };
  const salida = carrera.coches.map(() => null);
  const ultimoChoque = {};   // por pareja de coches: el progreso de los dos en su último choque
  let t = 0;
  while (carrera.coches.some((c) => c.terminado === null) && t < limite) {
    const antes = carrera.coches.map((c) => c.progreso);
    avanzarSlot(carrera, carrera.coches.map((c, i) => decidirSlot(pilotos[i], c, circuito)), DT);
    t += DT;
    // Para medir todos los carriles, la carrera sigue tras el ganador.
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
        // Dos choques de la misma pareja sin que ninguno de los dos haya avanzado
        // 100 px: la mano los ha dejado chocando.
        const pareja = e.coches.join('-');
        const progreso = e.coches.map((k) => carrera.coches[k].progreso);
        const ultimo = ultimoChoque[pareja];
        if (ultimo && progreso.every((p, k) => p - ultimo[k] < 100)) medida.choqueRepetido++;
        ultimoChoque[pareja] = progreso;
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
 * primero por el carril 0, el segundo por el 1…): así los choques no
 * ensucian las medidas. `juntos` los pone a todos en la misma carrera.
 * `modelos`, el coche de cada uno (COCHES); si no, el de siempre.
 */
function correrSlot(circuito, opciones, { limite = 400, juntos = false, vueltas = VUELTAS_SLOT, modelos = [] } = {}) {
  if (juntos) return correrUna(circuito, opciones, 0, limite, vueltas, modelos);
  const partes = opciones.map((o, i) => correrUna(circuito, [o], i, limite, VUELTAS_SLOT, [modelos[i]]));
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
function cocheSolo(circuito, turno, modelo) {
  const c = crearCarreraSlot(circuito, ['#f00'], turno, { modelos: [modelo] });
  c.fase = 'carrera';
  return c;
}

/** Dónde empieza cada estrecha (también la de una curva deslizante o un desvío), en s. */
const estrecho = (p) => p.efecto === 'estrecha' || p.efecto === 'deslizante' || p.efecto === 'desvio';
function estrechas(circuito) {
  return circuito.eje.filter((p, i, eje) => estrecho(p) && !estrecho(eje[(i - 1 + eje.length) % eje.length])).map((p) => p.s);
}

/** Lo que limita la velocidad: una curva, una recta de baches o el quiebro de un desvío. */
const limita = (p) => p.radio !== Infinity || p.efecto === 'baches' || p.radioDesvio < Infinity;

/** La ficha de un modelo (COCHES); sin modelo, la del de siempre. */
const ficha = (modelo) => COCHES[modelo ?? COCHE_REFERENCIA];

/** Los índices de los carriles de un circuito: 0 y 1, o de 0 a 3 en la pista de cuatro. */
const carrilesDe = (circuito) => [...circuito.carriles.keys()];

/** Arranca parado en cada curva, a fondo, por cada carril: cuántas veces, y cuántas se sale en ella. */
function arrancarEnCurvas(circuito, modelo) {
  let arranques = 0, salen = 0;
  for (let s0 = 0; s0 < circuito.largo; s0 += 20) {
    if (!limita(circuito.eje[circuito.puntoEn(s0).indice])) continue;
    for (const i of carrilesDe(circuito)) {
      const c = cocheSolo(circuito, i, modelo);
      const [slot] = c.coches;
      slot.s = s0;
      for (let k = 0; k < 120 && slot.s - s0 < 150; k++) {
        avanzarSlot(c, [{ acelerar: true }], DT);
        if (c.eventos.some((e) => e.tipo === 'sale')) { salen++; break; }
      }
      arranques++;
    }
  }
  return { arranques, salen };
}

/** Medio tiempo pulsado, a cinco toques por segundo, en la recta de meta: entre qué velocidades se queda. */
function aToques(circuito, modelo) {
  const c = cocheSolo(circuito, 0, modelo);
  const [slot] = c.coches;
  let menor = Infinity, mayor = 0;
  for (let k = 0; k < 360; k++) {
    slot.s = 30;
    avanzarSlot(c, [{ acelerar: k % 12 < 6 }], DT);
    if (k >= 240) { menor = Math.min(menor, slot.v); mayor = Math.max(mayor, slot.v); }
  }
  return { menor, mayor, tope: VELOCIDAD_SLOT * ficha(modelo).punta };
}

/*
 * Un humano no frena al píxel: el piloto con un retraso de reacción (actúa
 * con lo que decidió hace `retraso` s) y entrando algo derrapando (×1,2). Las
 * veces que se sale por cada carril.
 */
function humanoTarde(circuito, modelo, retraso = 0.25) {
  return carrilesDe(circuito).map((turno) => {
    const c = cocheSolo(circuito, turno, modelo);
    const piloto = crearPiloto({ prudencia: 1.2 });
    const cola = [];
    for (let t = 0; c.coches[0].completadas < VUELTAS_SLOT && t < 300; t += DT) {
      cola.push(decidirSlot(piloto, c.coches[0], circuito));
      avanzarSlot(c, [cola.length > Math.round(retraso / DT) ? cola.shift() : null], DT);
    }
    return c.coches[0].salidas;
  });
}

/*
 * Entrando lanzado a la punta del coche y sin soltar, las curvas que se pasan
 * (por qué carril). En la pista de cuatro, el carril de más afuera de una
 * curva (a más de 2 · CARRIL del eje por fuera) no cuenta: va tan abierto que
 * se pasa a fondo, y es lo que tiene ese carril. En el ocho largo lo paga en
 * el otro lazo, por dentro, y los carriles siguen midiendo lo mismo; con las
 * curvas tan cerradas como para que no se pasara (radio 70), el de dentro
 * quedaba a 25 px y los carriles se separaban un 7 %.
 */
function curvasATope(circuito, modelo) {
  const inicios = circuito.eje.filter((p, i, eje) => limita(p) && !limita(eje[(i - 1 + eje.length) % eje.length]));
  const tope = VELOCIDAD_SLOT * ficha(modelo).punta;
  const pasan = [];
  for (const p of inicios) {
    for (const k of carrilesDe(circuito)) {
      if (p.radio !== Infinity && radioCarril(p, lateralEn(circuito, circuito.carriles[k], p.s)) > p.radio + 2 * CARRIL) continue;
      const c = cocheSolo(circuito, k, modelo);
      const [slot] = c.coches;
      Object.assign(slot, { s: p.s - 40, v: tope, potencia: 1 });
      let sale = false;
      for (let i = 0; i < 90 && !sale; i++) {
        avanzarSlot(c, [{ acelerar: true }], DT);
        sale = c.eventos.some((e) => e.tipo === 'sale');
      }
      const nombre = p.efecto === 'baches' ? 'los baches' : p.efecto === 'desvio' ? 'el desvío' : `la de ${p.radio}${p.efecto ? ' (' + p.efecto + ')' : ''}`;
      if (!sale) pasan.push(`${nombre} por el carril ${k}`);
    }
  }
  return { curvas: inicios.length, pasan };
}

/*
 * Los encuentros: cada cruce (dos tramos), cada X y cada estrecha (el mismo
 * tramo). Los dos coches (`modelos`) lanzados a la misma velocidad, el
 * segundo algo adelantado o retrasado: 250 px/s, o menos si antes hay una
 * curva que no la aguanta (en un dibujado, una X o una estrecha puede seguir
 * a una de media casilla). En cuántos de los 21 desfases chocan, cómo acaba
 * cada choque (siguen los dos, se sale uno o los dos: `desenlaces`) y en
 * cuántos vuelven a chocar en el mismo sitio después de devolverlos la mano.
 * Darse otra vez sin la mano es legítimo: el de detrás, frenado por el golpe,
 * alcanza al otro y le vuelve a dar.
 */
function encuentros(circuito, modelos = [], carriles = [0, 1]) {
  const lista = [
    ...circuito.cruces.map((c) => c.s),
    ...circuito.eje.filter((p, i, eje) => p.tipo === 'x' && eje[(i - 1 + eje.length) % eje.length].tipo !== 'x')
      .map((p) => [p.s, p.s]),
    ...estrechas(circuito).map((s) => [s, s])
  ];
  const agarre = AGARRE_SLOT * Math.min(ficha(modelos[0]).agarre, ficha(modelos[1]).agarre);
  return lista.map(([sa, sb]) => {
    let chocan = 0, repetidos = 0;
    const desenlaces = [0, 0, 0];
    const aguanta = (s0) => Math.min(...circuito.eje.filter((p) => p.s > s0 - 200 && p.s <= s0)
      .map((p) => Math.sqrt(agarre * Math.min(...circuito.carriles.map((l) => radioAgarre(p, l * p.carril))))));
    const lanzada = Math.min(250, 0.9 * aguanta(sa), 0.9 * aguanta(sb));
    // ±80 px: tras una curva cerrada, el coche de dentro llega ~50 px de s por delante.
    for (let desfase = -80; desfase <= 80; desfase += 8) {
      const c = crearCarreraSlot(circuito, ['#f00', '#00f'], 0, { modelos });
      c.fase = 'carrera';
      c.coches[0].s = sa - 150;
      c.coches[1].s = sb - 150 + desfase;
      c.coches.forEach((slot, i) => { slot.lateral = circuito.carriles[carriles[i]]; });
      for (const slot of c.coches) Object.assign(slot, { v: lanzada, potencia: lanzada / (VELOCIDAD_SLOT * slot.ficha.punta) });
      /*
       * Dónde choca cada vez (la s del primer coche). Repetir es volver a chocar
       * en el mismo sitio; otra estrecha más adelante es otro encuentro.
       */
      const donde = [];
      let mano = false;
      for (let k = 0; k < 4 / DT; k++) {
        avanzarSlot(c, c.coches.map((slot) => ({ acelerar: slot.v < lanzada })), DT);
        for (const e of c.eventos) {
          if (e.tipo === 'clac') mano = true;
          if (e.tipo !== 'choque') continue;
          if (mano && donde.some((s0) => Math.abs(c.coches[0].s - s0) < 150)) repetidos++;
          donde.push(c.coches[0].s);
        }
      }
      if (donde.length) {
        chocan++;
        desenlaces[c.coches.filter((slot) => slot.salidas > 0).length]++;
      }
    }
    return { sa, sb, chocan, repetidos, lanzada, desenlaces, carriles };
  });
}

/** Los encuentros de cada pareja de carriles: con dos, la única. */
function encuentrosPorCarriles(circuito, modelos = []) {
  const indices = carrilesDe(circuito);
  return indices.flatMap((i) => indices.filter((j) => j > i).flatMap((j) => encuentros(circuito, modelos, [i, j])));
}

/*
 * Los puentes: en cada uno, los dos coches lanzados hacia el cruce, uno por
 * arriba y otro por abajo, con 21 desfases (como en los encuentros). Van a
 * distinta altura: no se tocan nunca.
 */
function bajoElPuente(circuito) {
  return circuito.puentes.map(({ s: [sa, sb] }) => {
    let tocan = 0;
    for (let desfase = -80; desfase <= 80; desfase += 8) {
      const c = crearCarreraSlot(circuito, ['#f00', '#00f'], 0);
      c.fase = 'carrera';
      c.coches[0].s = sa - 150;
      c.coches[1].s = sb - 150 + desfase;
      for (const slot of c.coches) Object.assign(slot, { v: 200, potencia: 200 / VELOCIDAD_SLOT });
      let toca = false;
      for (let k = 0; k < 2 / DT; k++) {
        avanzarSlot(c, c.coches.map((slot) => ({ acelerar: slot.v < 200 })), DT);
        if (Object.keys(c.toques).length || c.eventos.some((e) => e.tipo === 'choque')) toca = true;
      }
      if (toca) tocan++;
    }
    return { sa, sb, tocan };
  });
}

/*
 * Lo que la rampa frena y empuja: un coche a fondo desde 150 px antes del
 * puente (a 200 px/s, lo que deja la curva de antes), en la pista de verdad y
 * en una igual sin pendiente. Su velocidad arriba (donde empieza el tablero) y
 * abajo (donde acaba la rampa), en las dos.
 */
function rampas(circuito) {
  const plana = { ...circuito, eje: circuito.eje.map((p) => ({ ...p, pendiente: 0 })) };
  const piezas = [];
  circuito.eje.forEach((p, i, eje) => {
    if (p.efecto !== 'puente') return;
    if (eje[(i - 1 + eje.length) % eje.length].efecto !== 'puente') piezas.push([]);
    piezas[piezas.length - 1].push(p);
  });
  return piezas.map((puntos) => {
    const desde = puntos[0].s;
    const arriba = puntos.find((p) => p.elevacion === 1).s;
    const abajo = puntos[puntos.length - 1].s;
    const medir = (pista) => {
      const c = crearCarreraSlot(pista, ['#f00'], 0);
      c.fase = 'carrera';
      const slot = c.coches[0];
      Object.assign(slot, { s: desde - 150, v: 200, potencia: 200 / VELOCIDAD_SLOT });
      const v = {};
      while (slot.s < abajo && slot.estado === 'carril') {
        avanzarSlot(c, [{ acelerar: true }], DT);
        if (v.arriba === undefined && slot.s >= arriba) v.arriba = slot.v;
      }
      return { ...v, abajo: slot.v, sale: slot.salidas > 0 };
    };
    return { s: desde, con: medir(circuito), sin: medir(plana) };
  });
}

/*
 * Las mangas: un circuito de cuatro que no es un ocho (sus carriles no miden
 * lo mismo) se corre en una manga por carril. En la serie, cada coche pasa
 * por todos, una vez; con el mismo piloto en todos, la suma de cada uno es
 * casi la misma (< 1 %), aunque un carril saque mucho a otro; y gana la menor
 * suma, no el que más mangas gana.
 */
function seccionMangas(circuito, mangas) {
  const largos = circuito.carriles.map((l) => largoCarril(circuito, l));
  comprobar(mangas === circuito.carriles.length, `«${circuito.clave}» pide ${mangas} mangas con ${circuito.carriles.length} carriles`);
  console.log(`  pide mangas: el carril de fuera da ${(Math.max(...largos) - Math.min(...largos)).toFixed(0)} px más por vuelta`);
  const serie = crearSerie(mangas);
  const recorridos = circuito.carriles.map(() => new Set());
  for (let turno = 0; !serieAcabada(serie); turno++) {
    const r = correrUna(circuito, circuito.carriles.map(() => ({ prudencia: 1 })), turno, 400);
    r.carrera.coches.forEach((slot, i) => recorridos[i].add(slot.lateral));
    comprobar(r.choques === 0, `en la manga ${turno + 1}, coches iguales en paralelo chocan ${r.choques} veces`);
    anotarManga(serie, r.carrera);
  }
  comprobar(recorridos.every((r) => r.size === circuito.carriles.length), 'en la serie de mangas algún coche no corre por todos los carriles');
  const { tiempos, ganador, orden } = sumaSerie(serie);
  const reparto = (Math.max(...tiempos) - Math.min(...tiempos)) / Math.min(...tiempos);
  console.log(`  la serie con el mismo piloto: ${tiempos.map((t) => t.toFixed(2)).join(', ')} s (un ${(reparto * 100).toFixed(2)} % entre el primero y el último)`);
  comprobar(reparto < 0.01, `en la serie de mangas, con el mismo piloto, uno saca un ${(reparto * 100).toFixed(2)} % a otro`);
  comprobar(ganador === orden[0] && tiempos[ganador] === Math.min(...tiempos), 'la serie de mangas no la gana la menor suma');

  /*
   * La suma en carrera (la del marcador): cuatro CPU, una serie de 3 vueltas.
   * Al llegar el primero da lo mismo que la serie, y corriendo no salta.
   */
  const enCarrera = crearSerie(mangas);
  let error = 0, salto = 0;
  for (let turno = 0; !serieAcabada(enCarrera); turno++) {
    const carrera = crearCarreraSlot(circuito, circuito.carriles.map((_, i) => COLORES[i]), turno, { vueltas: 3 });
    const pilotos = circuito.carriles.map((_, i) => crearPiloto({ ...CPU_SLOT, semilla: 30 + i + 4 * turno }));
    let antes = null;
    for (let k = 0; carrera.fase !== 'fin' && k < 400 / DT; k++) {
      avanzarSlot(carrera, carrera.fase === 'carrera' ? carrera.coches.map((c, i) => decidirSlot(pilotos[i], c, circuito)) : [], DT);
      if (carrera.fase === 'cuenta') continue;
      const { tiempos } = sumaEnCarrera(enCarrera, carrera);
      // Lo que se ve es la diferencia con el primero: es la que no puede saltar.
      const dif = tiempos.map((t) => t - Math.min(...tiempos));
      if (antes && carrera.tiempo > 3) salto = Math.max(salto, ...dif.map((d, i) => Math.abs(d - antes[i])));
      antes = dif;
    }
    const vivo = sumaEnCarrera(enCarrera, carrera).tiempos;
    anotarManga(enCarrera, carrera);
    error = Math.max(error, ...sumaSerie(enCarrera).tiempos.map((t, i) => Math.abs(t - vivo[i])));
  }
  console.log(`  la suma en carrera: al acabar cada manga se separa ${error.toFixed(3)} s de la serie; corriendo, salta como mucho ${salto.toFixed(3)} s`);
  comprobar(error < 0.01, `la suma en carrera se separa ${error.toFixed(3)} s de la de la serie al acabar la manga`);
  comprobar(salto < 0.25, `la suma en carrera salta ${salto.toFixed(3)} s de un fotograma a otro`);

  // Con mangas de mentira: gana la menor suma aunque otro gane más mangas.
  const mentira = crearSerie(3);
  for (const tiemposManga of [[30, 31, 40], [30, 31, 40], [45, 31, 40]]) {
    mentira.mangas.push({ ganador: tiemposManga.indexOf(Math.min(...tiemposManga)), tiempos: tiemposManga });
  }
  comprobar(sumaSerie(mentira).ganador === 1 && sumaSerie(mentira).acabada, 'en mangas no gana la menor suma (gana el de más mangas)');
}

function seccionSlot(circuito, oficial) {
  const calibrar = oficial ? comprobar : () => {};
  console.log(`\nSlot en «${circuito.clave}»`);
  // Los carriles (por el asfalto, dentro del lienzo y separados) los mide la sección 1.
  const largos = circuito.carriles.map((l) => largoCarril(circuito, l));
  console.log(`  carriles de ${largos.map((l) => l.toFixed(0)).join(', ')} px`);
  // El mismo piloto en cada carril.
  const cada = (piloto) => circuito.carriles.map(() => piloto);

  /*
   * Soltar en las curvas tiene que ganar a ir a fondo, y por mucho. Desde el
   * playtest, pasado el agarre se derrapa antes de salirse: el prudente no
   * pasa del agarre (×1), el fino entra derrapando y el que va a fondo se sale.
   */
  const prudente = correrSlot(circuito, cada({ prudencia: 1 }));
  let fino = null;
  // En un circuito dibujado no se calibra: basta un piloto fino.
  for (const prudencia of oficial ? [1.2, 1.4, 1.6, 1.8] : [1.4]) {
    const r = correrSlot(circuito, cada({ prudencia }));
    const mejor = Math.min(...r.carrera.coches.map((c) => c.terminado ?? Infinity));
    if (!fino || mejor < fino.mejor) fino = { ...r, mejor, prudencia };
  }
  const aFondo = correrSlot(circuito, cada({ aFondo: true }));
  const resumen = (r) => r.carrera.coches.map((c) =>
    `${c.terminado?.toFixed(2)} s, vuelta ${mejorVueltaSlot(c)?.toFixed(2)}, ${c.salidas} salidas`).join(' | ');
  console.log(`  prudente (x1):          ${resumen(prudente)}`);
  console.log(`  al límite (x${fino.prudencia}):      ${resumen(fino)}`);
  console.log(`  a fondo:                ${resumen(aFondo)}`);

  for (const [nombre, r] of [['prudente', prudente], ['al límite', fino], ['a fondo', aFondo]]) {
    comprobar(r.carrera.coches.every((c) => c.vueltas.length === VUELTAS_SLOT), `el piloto ${nombre} no completa las ${VUELTAS_SLOT} vueltas en todos los carriles`);
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
  /*
   * En mangas cada coche corre por todos los carriles, y lo que cuenta es la
   * suma: el de fuera de casi todas las curvas puede ir a fondo casi sin
   * salirse (lo paga en el de dentro), y a fondo se mide la serie entera.
   */
  const mangas = mangasDe(circuito);
  const suma = (r) => r.carrera.coches.reduce((a, c) => a + c.terminado, 0);
  const ventaja = mangas > 1
    ? suma(aFondo) / suma(fino) - 1
    : Math.min(...aFondo.carrera.coches.map((c) => c.terminado)) / fino.mejor - 1;
  console.log(`  soltar en las curvas ahorra un ${(ventaja * 100).toFixed(0)} % sobre ir a fondo${mangas > 1 ? ' (en la serie de mangas)' : ''}`);
  calibrar(ventaja > 0.3, 'ir a fondo no pierde al menos un 30 % contra quien suelta');
  if (mangas > 1) {
    const salidas = aFondo.carrera.coches.reduce((a, c) => a + c.salidas, 0);
    calibrar(salidas >= 2 * VUELTAS_SLOT * mangas, `ir a fondo no se sale al menos dos veces por vuelta en la serie (${salidas} en ${VUELTAS_SLOT * mangas})`);
  } else calibrar(aFondo.carrera.coches.every((c) => c.salidas >= 2 * VUELTAS_SLOT), 'ir a fondo no se sale al menos dos veces por vuelta');

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
  {
    const { arranques, salen } = arrancarEnCurvas(circuito);
    console.log(`  arrancando parado en una curva a fondo, se sale en ${salen} de ${arranques}`);
    comprobar(salen === 0, `arrancando parado en una curva se sale ${salen} veces`);
  }

  // A toques, la potencia se queda a medias: la velocidad se puede dosificar.
  {
    const { menor, mayor, tope } = aToques(circuito);
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
    const salidasHumano = humanoTarde(circuito);
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
    /*
     * La CPU corre por el carril 0 contra el mejor piloto por su mejor carril.
     * En mangas los carriles sacan mucho uno a otro (y cada coche pasa por
     * todos): la CPU, por cada carril, contra el mejor piloto por ese mismo.
     */
    const delCarril0 = (r) => (mangas > 1 ? r.carrera.coches : r.carrera.coches.slice(0, 1));
    const referencia = mangas > 1 ? suma(fino) / fino.carrera.coches.length / VUELTAS_SLOT : fino.mejor / VUELTAS_SLOT;
    const vueltas = [], salidas = [];
    let repetida = null;
    const semillas = oficial ? 6 : 1;
    for (let semilla = 1; semilla <= semillas; semilla++) {
      const r = correrSlot(circuito, cada({ ...CPU_SLOT, semilla }));
      for (const c of delCarril0(r)) vueltas.push(c.terminado / VUELTAS_SLOT);
      salidas.push(delCarril0(r).reduce((a, c) => a + c.salidas, 0));
      if (semilla === 1) repetida = r.carrera.coches[0].terminado;
    }
    const otra = correrSlot(circuito, cada({ ...CPU_SLOT, semilla: 1 })).carrera.coches[0].terminado;
    const media = vueltas.reduce((a, b) => a + b, 0) / vueltas.length;
    const margen = media - referencia;
    console.log(`  la CPU da vueltas de ${media.toFixed(2)} s de media, ${margen.toFixed(2)} s más que el mejor piloto, y se sale ${salidas.join(', ')} veces en ${semillas === 6 ? 'seis carreras' : 'una carrera'}`);
    calibrar(margen > 0.6, `la CPU deja solo ${margen.toFixed(2)} s por vuelta al mejor piloto: no hay quien le gane`);
    calibrar(margen < 1.4, `la CPU deja ${margen.toFixed(2)} s por vuelta al mejor piloto: es fácil`);
    calibrar(salidas.some((n) => n > 0), 'la CPU no se equivoca nunca');
    comprobar(otra === repetida, 'la CPU con la misma semilla no repite la carrera');

    /*
     * Los niveles (NIVELES_CPU): la normal es la de arriba; la fácil deja
     * 1,3-3 s por vuelta al mejor piloto y la difícil, 0,25-0,8 s (ganable,
     * pero poco). En orden en cada oficial.
     */
    if (oficial) {
      const margenes = NIVELES_CPU.map(({ id, piloto }) => {
        if (piloto === CPU_SLOT) return margen;
        const tiempos = [1, 2, 3, 4, 5, 6].flatMap((semilla) =>
          correrSlot(circuito, cada({ ...piloto, semilla })).carrera.coches.map((c) => c.terminado / VUELTAS_SLOT));
        return tiempos.reduce((a, b) => a + b, 0) / tiempos.length - referencia;
      });
      const [facil, , dificil] = margenes;
      console.log(`  los niveles de la CPU dejan ${NIVELES_CPU.map(({ id }, i) => `${id} ${margenes[i].toFixed(2)}`).join(', ')} s por vuelta`);
      calibrar(facil > 1.3 && facil < 3, `la CPU fácil deja ${facil.toFixed(2)} s por vuelta`);
      calibrar(dificil > 0.25 && dificil < 0.8, `la CPU difícil deja ${dificil.toFixed(2)} s por vuelta`);
      comprobar(margenes.every((m, i) => i === 0 || m < margenes[i - 1]), 'los niveles de la CPU no van de fácil a difícil');
    }

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
    const { curvas, pasan } = curvasATope(circuito);
    console.log(`  a tope contra las ${curvas} curvas, por cada carril: se pasan ${pasan.length}`);
    calibrar(pasan.length === 0, `se pasan a tope ${pasan.join(', ')}`);
  }

  /*
   * Los carriles no son iguales, por eso se cambian en cada carrera. Con una
   * X, cada coche corre la mitad de las vueltas por cada uno: casi iguales.
   */
  const terminados = prudente.carrera.coches.map((c) => c.terminado);
  const desigualdad = (Math.max(...terminados) - Math.min(...terminados)) / Math.min(...terminados);
  console.log(`  entre carriles, con el mismo piloto: ${(desigualdad * 100).toFixed(1)} % (${mangas > 1 ? `en ${mangas} mangas` : 'se cambian en cada carrera'})`);
  if (mangas > 1) seccionMangas(circuito, mangas);
  else calibrar(desigualdad < 0.08, `un carril saca un ${(desigualdad * 100).toFixed(1)} % a otro`);
  if (circuito.cambiosCarril % 2) calibrar(desigualdad < 0.02, `con una X, un carril aún saca un ${(desigualdad * 100).toFixed(1)} % al otro`);
  const cambiada = crearCarreraSlot(circuito, COLORES.slice(0, circuito.carriles.length), 1);
  comprobar(cambiada.coches.every((slot, i) => slot.lateral === circuito.carriles[(i + 1) % circuito.carriles.length]),
    'con el turno cambiado los coches no se cambian de carril');

  /*
   * Los choques. En paralelo, dos coches no se tocan nunca: con el mismo piloto
   * van juntos toda la carrera y sin X, cruces ni estrechas no chocan. En cada
   * X, cada cruce y cada estrecha, dos coches que llegan a la vez chocan, y una
   * vez devueltos por la mano no vuelven a chocar sin haber avanzado. Cómo
   * acaba cada choque lo decide el golpe: en un oficial, no siempre salen los dos.
   */
  {
    const juntos = correrSlot(circuito, cada({ prudencia: 1 }), { juntos: true });
    const completa = juntos.carrera.coches.every((c) => c.vueltas.length === VUELTAS_SLOT);
    console.log(`  ${juntos.carrera.coches.length} coches iguales en la misma pista: ${juntos.choques} choques`);
    // Con una X pueden chocar (si llegan a la vez) y en una estrecha, si van a
    // la par; sin X, cruces ni estrechas, nunca.
    if (!circuito.cambiosCarril && !circuito.cruces.length && !estrechas(circuito).length) {
      comprobar(juntos.choques === 0, `coches iguales chocan ${juntos.choques} veces sin X, cruces ni estrechas`);
    }
    comprobar(completa, 'los coches juntos no terminan la carrera');
    comprobar(juntos.choqueRepetido === 0, `la mano deja dos coches chocando ${juntos.choqueRepetido} veces`);

    /*
     * En la pista de cuatro, cuatro CPU juntas, cada una con su semilla: en el
     * cruce se encuentran de verdad. Acaban todas, nada se rompe y la mano no
     * las deja chocando.
     */
    if (circuito.carriles.length > 2) {
      const carreras = [1, 2, 3].map((semilla) =>
        correrSlot(circuito, circuito.carriles.map((_, i) => ({ ...CPU_SLOT, semilla: 10 * semilla + i })), { juntos: true }));
      console.log(`  ${circuito.carriles.length} CPU juntas: ${carreras.map((r) => r.choques).join(', ')} choques en tres carreras`);
      for (const r of carreras) {
        comprobar(r.carrera.coches.every((c) => c.vueltas.length === VUELTAS_SLOT), `${circuito.carriles.length} CPU juntas no terminan la carrera`);
        comprobar(!r.noFinito && !r.fueraDeMesa && !r.retrocede, `${circuito.carriles.length} CPU juntas rompen algo (no finito, fuera de la mesa o retrocede)`);
        comprobar(r.choqueRepetido === 0, `la mano deja a las CPU chocando ${r.choqueRepetido} veces`);
      }
    }

    for (const { sa, sb, chocan, repetidos, lanzada, desenlaces, carriles } of encuentrosPorCarriles(circuito)) {
      const pareja = circuito.carriles.length > 2 ? ` (carriles ${carriles.join(' y ')})` : '';
      console.log(`  en el encuentro de s ${sa.toFixed(0)} y ${sb.toFixed(0)}${pareja}: chocan en ${chocan} de 21 desfases (a ${lanzada.toFixed(0)} px/s); ` +
        `siguen los dos en ${desenlaces[0]}, se sale uno en ${desenlaces[1]} y los dos en ${desenlaces[2]}`);
      comprobar(chocan > 0, `dos coches que llegan a la vez al encuentro de s ${sa.toFixed(0)} no chocan`);
      comprobar(repetidos === 0, `en el encuentro de s ${sa.toFixed(0)} la mano los deja chocando otra vez ${repetidos} veces`);
      calibrar(desenlaces[2] < chocan, `en el encuentro de s ${sa.toFixed(0)} salen siempre los dos`);
      if (oficial) desenlaces.forEach((n, i) => { DESENLACES[i] += n; });
    }
    for (const { sa, sb, tocan } of bajoElPuente(circuito)) {
      console.log(`  en el puente de s ${sa.toFixed(0)} y ${sb.toFixed(0)}: se tocan en ${tocan} de 21 desfases`);
      comprobar(tocan === 0, `en el puente de s ${sa.toFixed(0)}, uno por arriba y otro por abajo se tocan en ${tocan} de 21 desfases`);
    }
  }

  /*
   * El puente: al subir frena y al bajar empuja, sin ser mucho. A fondo, arriba
   * llega un 10-35 % más lento que sin pendiente (hoy 17 %) y abajo, un 3-20 %
   * más rápido (hoy 7 %).
   */
  for (const { s, con, sin } of rampas(circuito)) {
    const pierde = 1 - con.arriba / sin.arriba, gana = con.abajo / sin.abajo - 1;
    console.log(`  el puente de s ${s.toFixed(0)}, a fondo: arriba ${con.arriba.toFixed(0)} px/s (${sin.arriba.toFixed(0)} sin pendiente, ` +
      `un ${(pierde * 100).toFixed(0)} % menos), abajo ${con.abajo.toFixed(0)} (${sin.abajo.toFixed(0)}, un ${(gana * 100).toFixed(0)} % más)`);
    comprobar(!con.sale && !sin.sale, `a fondo se sale en el puente de s ${s.toFixed(0)}`);
    calibrar(pierde > 0.1 && pierde < 0.35, `la subida del puente de s ${s.toFixed(0)} frena un ${(pierde * 100).toFixed(0)} %`);
    calibrar(gana > 0.03 && gana < 0.2, `la bajada del puente de s ${s.toFixed(0)} empuja un ${(gana * 100).toFixed(0)} %`);
  }
}

// Los oficiales y los de la pista de cuatro carriles.
const PISTAS = [...CIRCUITOS, ...CIRCUITOS_CUATRO];
for (const circuito of PISTAS) seccionCircuito(circuito, true);
const DESENLACES = [0, 0, 0];
for (const circuito of PISTAS) seccionSlot(circuito, true);
console.log(`
Los choques en los oficiales: siguen los dos en ${DESENLACES[0]}, se sale uno en ${DESENLACES[1]} y los dos en ${DESENLACES[2]}`);
comprobar(DESENLACES.every((n) => n > 0), `los choques acaban siempre igual: ${DESENLACES.join(' / ')}`);

/*
 * Uno que se sale se lleva por delante al otro: un coche fuera que va de lado
 * contra uno en el carril, en una recta de La horquilla. Lanzado, lo saca; despacio, solo lo
 * empuja. Y el de fuera rebota: va hacia el otro más despacio que antes.
 */
{
  const circuito = CIRCUITOS[0];
  const recta = circuito.eje.find((p) => p.s > 200 && circuito.eje.every((q) => Math.abs(q.s - p.s) > 60 || q.radio === Infinity));
  const arrollar = (de) => {
    const c = crearCarreraSlot(circuito, ['#f00', '#00f'], 0);
    c.fase = 'carrera';
    const [libre, otro] = c.coches;
    Object.assign(otro, { s: recta.s, v: 300, potencia: 300 / VELOCIDAD_SLOT });
    avanzarSlot(c, [null, { acelerar: true }], 1e-6);
    const { angulo } = otro.coche;
    const hx = Math.cos(angulo), hy = Math.sin(angulo), lx = -hy, ly = hx;
    Object.assign(libre, { estado: 'fuera', tFuera: 0, tQuieto: 0, giro: 0 });
    Object.assign(libre.coche, {
      x: otro.coche.x - lx * 30, y: otro.coche.y - ly * 30, angulo,
      vx: hx * otro.v + lx * de, vy: hy * otro.v + ly * de
    });
    let choque = false, tras = null;
    for (let k = 0; k < 60; k++) {
      avanzarSlot(c, [null, { acelerar: true }], DT / 4);
      if (c.eventos.some((e) => e.tipo === 'choque' && e.arrolla)) choque = true;
      if (choque && tras === null) tras = libre.coche.vx * lx + libre.coche.vy * ly;
    }
    return { choque, saca: otro.salidas > 0, rebota: tras !== null && tras < de };
  };
  const [lanzado, despacio] = [arrollar(400), arrollar(80)];
  console.log(`  uno fuera, de lado contra el otro: a 400 px/s ${lanzado.saca ? 'lo saca' : 'no lo saca'}, a 80 px/s ${despacio.saca ? 'lo saca' : 'no lo saca'}`);
  comprobar(lanzado.choque && despacio.choque, 'uno fuera no choca con el que sigue en el carril');
  comprobar(lanzado.saca && !despacio.saca, `uno fuera lanzado ${lanzado.saca ? '' : 'no '}saca al otro, y despacio ${despacio.saca ? 'sí' : 'no'}`);
  comprobar(lanzado.rebota && despacio.rebota, 'el que va fuera no rebota en el otro');
}

// --- 3b. Los coches ---------------------------------------------------------------

/*
 * Cada modelo (COCHES), con su largo y su carácter. La sección 3 mide el de
 * siempre; aquí, en cada oficial, cada uno de los demás: el piloto prudente
 * no se sale y da la vuelta a ±3 % de la del de siempre; a fondo se sale al
 * menos una vez por vuelta y pierde > 20 %; ninguna curva se pasa a su punta;
 * arrancando parado en una curva no se sale, ni un humano que reacciona 0,2 s
 * tarde; y la CPU, que conoce el agarre de su coche, deja los márgenes de cada nivel,
 * en orden. Ningún coche es el más rápido en los cuatro.
 */
const MAS_RAPIDO = {};   // por circuito: el mejor piloto automático, con el coche más rápido
console.log('\nLos coches');
{
  const ids = Object.keys(COCHES);
  const referencia = COCHES[COCHE_REFERENCIA];
  comprobar(referencia.largo === LARGO_COCHE && referencia.acelera === 1 && referencia.agarre === 1 && referencia.punta === 1,
    'el coche de siempre no tiene la física de siempre: los récords de antes no valdrían');
  for (const id of ids) {
    const f = COCHES[id];
    const gasto = Object.entries(PESO_CARACTER).reduce((total, [k, peso]) => total + peso * (f[k] - 1), 0);
    console.log(`  ${id.padEnd(12)} ${f.largo} px, acelera ×${f.acelera}, agarre ×${f.agarre}, punta ×${f.punta}: gasta ${gasto >= 0 ? '+' : ''}${gasto.toFixed(3)}`);
    comprobar(Math.abs(gasto) < 0.006, `el ${id} se sale del presupuesto (${gasto.toFixed(3)})`);
    comprobar(f.largo >= 25 && f.largo <= 37, `el ${id} mide ${f.largo} px`);
  }
  /*
   * Dos coches en paralelo no se tocan: ni los dos más largos, con la cola
   * fuera hasta donde llega sin pasar del agarre (COLETEO_MAXIMO), a la par o
   * desfasados. Derrapando sí pueden: es lo que se arriesga al límite.
   */
  const largos = [...ids].sort((a, b) => COCHES[b].largo - COCHES[a].largo);
  const [masLargo, masCorto] = [largos[0], largos.at(-1)];
  let holgura = Infinity;
  for (let k = 0; k <= 10; k++) {
    for (let dx = -40; dx <= 40; dx++) {
      const angulo = COLETEO_MAXIMO * k / 10;
      const a = { ficha: COCHES[masLargo], coche: { x: 0, y: 0, angulo } };
      const b = { ficha: COCHES[masLargo], coche: { x: dx, y: 2 * CARRIL, angulo } };
      holgura = Math.min(holgura, contacto(a, b).distancia - 2 * RADIO_COCHE);
    }
  }
  console.log(`  dos ${masLargo} en paralelo, con la cola fuera sin derrapar: a ${holgura.toFixed(1)} px de tocarse`);
  comprobar(holgura > 2, `dos ${masLargo} en paralelo se tocan sin derrapar (a ${holgura.toFixed(1)} px)`);

  const ganadores = [];
  for (const circuito of CIRCUITOS) {
    console.log(`  «${circuito.clave}»`);
    const finos = {};
    let vueltaReferencia = null;
    for (const id of [COCHE_REFERENCIA, ...ids.filter((i) => i !== COCHE_REFERENCIA)]) {
      const modelos = [id, id];
      const prudente = correrSlot(circuito, [{ prudencia: 1 }, { prudencia: 1 }], { modelos });
      const vuelta = Math.max(...prudente.carrera.coches.map(mejorVueltaSlot));
      if (id === COCHE_REFERENCIA) vueltaReferencia = vuelta;
      let fino = null;
      for (const prudencia of [1.2, 1.4, 1.6, 1.8]) {
        const r = correrSlot(circuito, [{ prudencia }, { prudencia }], { modelos });
        const mejor = Math.min(...r.carrera.coches.map((c) => c.terminado ?? Infinity));
        if (!fino || mejor < fino.mejor) fino = { mejor, prudencia, vuelta: Math.min(...r.carrera.coches.map(mejorVueltaSlot)) };
      }
      finos[id] = fino;
      const aFondo = correrSlot(circuito, [{ aFondo: true }, { aFondo: true }], { modelos });
      const salidasAFondo = Math.min(...aFondo.carrera.coches.map((c) => c.salidas));
      const pierde = Math.min(...aFondo.carrera.coches.map((c) => c.terminado ?? Infinity)) / fino.mejor - 1;
      const niveles = NIVELES_CPU.map(({ piloto }) => {
        const tiempos = [1, 2, 3, 4, 5, 6].flatMap((semilla) =>
          correrSlot(circuito, [{ ...piloto, semilla }, { ...piloto, semilla }], { modelos }).carrera.coches.map((c) => c.terminado / VUELTAS_SLOT));
        return tiempos.reduce((a, b) => a + b, 0) / tiempos.length - fino.mejor / VUELTAS_SLOT;
      });
      const diferencia = vuelta / vueltaReferencia - 1;
      console.log(`    ${id.padEnd(12)} prudente ${vuelta.toFixed(2)} s (${diferencia >= 0 ? '+' : ''}${(diferencia * 100).toFixed(1)} %), ` +
        `mejor ${(fino.mejor / VUELTAS_SLOT).toFixed(2)} s/vuelta, a fondo ${salidasAFondo} salidas (+${(pierde * 100).toFixed(0)} %), ` +
        `CPU ${niveles.map((m) => m.toFixed(2)).join(' / ')}`);
      if (id === COCHE_REFERENCIA) continue;   // lo demás, la sección 3

      comprobar(prudente.carrera.coches.every((c) => c.salidas === 0), `«${circuito.clave}»: el piloto prudente se sale con el ${id}`);
      comprobar(Math.abs(diferencia) <= 0.03, `«${circuito.clave}»: con el ${id}, el prudente da la vuelta un ${(diferencia * 100).toFixed(1)} % distinta`);
      comprobar(salidasAFondo >= VUELTAS_SLOT && pierde > 0.2, `«${circuito.clave}»: a fondo con el ${id}, ${salidasAFondo} salidas y pierde un ${(pierde * 100).toFixed(0)} %`);
      const { pasan } = curvasATope(circuito, id);
      comprobar(pasan.length === 0, `«${circuito.clave}»: con el ${id} se pasan a tope ${pasan.join(', ')}`);
      const { salen } = arrancarEnCurvas(circuito, id);
      comprobar(salen === 0, `«${circuito.clave}»: con el ${id}, arrancando parado en una curva se sale ${salen} veces`);
      const humano = humanoTarde(circuito, id, 0.2);
      comprobar(humano.every((n) => n === 0), `«${circuito.clave}»: con el ${id}, un humano que reacciona 0,2 s tarde se sale ${humano.join(' y ')} veces`);
      const { menor, mayor, tope } = aToques(circuito, id);
      comprobar(menor > tope * 0.2 && mayor < tope * 0.8, `«${circuito.clave}»: con el ${id}, a toques no se queda a medias (${menor.toFixed(0)}-${mayor.toFixed(0)})`);
      const [facil, normal, dificil] = niveles;
      comprobar(normal > 0.6 && normal < 1.4, `«${circuito.clave}»: con el ${id}, la CPU normal deja ${normal.toFixed(2)} s por vuelta`);
      comprobar(facil > 1.3 && facil < 3, `«${circuito.clave}»: con el ${id}, la CPU fácil deja ${facil.toFixed(2)} s por vuelta`);
      comprobar(dificil > 0.25 && dificil < 0.8, `«${circuito.clave}»: con el ${id}, la CPU difícil deja ${dificil.toFixed(2)} s por vuelta`);
      comprobar(facil > normal && normal > dificil, `«${circuito.clave}»: con el ${id}, los niveles de la CPU no van de fácil a difícil`);
    }
    const orden = ids.slice().sort((a, b) => finos[a].mejor - finos[b].mejor);
    ganadores.push(orden[0]);
    MAS_RAPIDO[circuito.clave] = { coche: orden[0], vuelta: finos[orden[0]].vuelta };
    console.log(`    del más rápido al más lento: ${orden.join(', ')}`);

    // Los choques, con los coches más cortos (los más difíciles de alcanzar) y los más largos.
    for (const id of [masCorto, masLargo]) {
      for (const { sa, chocan, repetidos } of encuentros(circuito, [id, id])) {
        comprobar(chocan > 0, `«${circuito.clave}»: dos ${id} que llegan a la vez al encuentro de s ${sa.toFixed(0)} no chocan`);
        comprobar(repetidos === 0, `«${circuito.clave}»: dos ${id} chocan dos veces seguidas en el encuentro de s ${sa.toFixed(0)}`);
      }
    }
    if (!circuito.cambiosCarril && !circuito.cruces.length && !estrechas(circuito).length) {
      const juntos = correrSlot(circuito, [{ prudencia: 1 }, { prudencia: 1 }], { juntos: true, modelos: [masLargo, masLargo] });
      comprobar(juntos.choques === 0, `«${circuito.clave}»: dos ${masLargo} chocan ${juntos.choques} veces sin X, cruces ni estrechas`);
    }
  }
  console.log(`  el más rápido de cada oficial: ${ganadores.join(', ')}`);
  comprobar(new Set(ganadores).size > 1, `el ${ganadores[0]} es el más rápido en los ${CIRCUITOS.length} oficiales`);
}

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
 * variante detrás: b baches, x X, c chicane a la izquierda, C a la derecha,
 * e estrecha, E estrecha larga; p peralte, d derrape, a amplia, s deslizante.
 */
const LETRA_VARIANTE = {
  b: 'baches', x: 'x', c: 'chicaneIzquierda', C: 'chicaneDerecha', e: 'estrecha', E: 'estrechaLarga',
  p: 'peralte', d: 'derrape', a: 'amplia', s: 'deslizante'
};
function aMano(col, fila, rumbo, texto) {
  const pasos = [...texto.matchAll(/([RDI])([bxcCeEpdas]?)/g)].map(([, giro, letra]) =>
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
  minimo: aMano(3, 3, 0, 'RDDRDD'),
  // El marco con las piezas del juguete: estrechas, estrecha larga y deslizante.
  juguete: aMano(3, 5, 0, 'R' + 'RReRRERR' + 'Is' + 'RRcRRIp' + 'RRcRRRRERRR' + 'Id' + 'RRRxRI' + 'RR')
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
    ['amplia', cambiado(minimo, 5, 'amplia')],
    // La deslizante, donde no cabría la amplia.
    ['deslizante', cambiado(serpiente, 9, 'deslizante')],
    // Una estrecha larga que acaba en una curva.
    ['estrecha', cambiado(marco, marco.pasos.findIndex((p) => p.variante === 'derrape') - 1, 'estrechaLarga')]
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
   * El servidor valida lo mismo (servidor/cuadricula.php): los códigos de
   * todos estos trazados, cada uno con letras cambiadas (casi todos dejan de
   * valer, cada uno por su motivo) y cosas que no son códigos. PHP y JS tienen
   * que decir lo mismo: si se lee, el error y el código canónico.
   */
  {
    const tirarCodigo = azar(11);
    const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const validos = [...todos, ...prohibidos.map(([, t]) => t)]
      .filter((t) => t.pasos.every((p) => VARIANTES[p.giro ? 'curva' : 'recta'].includes(p.variante)))
      .map(aCodigo);
    const codigos = [...validos, '', 'A', 'AQ', '!!!!', 'AQMFAA==', 'AgMAAAAA', 'AQMF', 'AQMFAA'];
    for (const codigo of validos) {
      for (let k = 0; k < 12; k++) {
        const i = Math.floor(tirarCodigo() * codigo.length);
        const letra = ALFABETO[Math.floor(tirarCodigo() * 64)];
        codigos.push(codigo.slice(0, i) + letra + codigo.slice(i + 1));
      }
      codigos.push(codigo + 'A', codigo.slice(0, -1), codigo + 'AAAA');
    }
    const php = spawnSync('php', ['tools/validar-cuadricula.php'], { input: codigos.join('\n') + '\n', encoding: 'utf8' });
    if (php.error || php.status !== 0) {
      console.log(`  sin PHP no se compara la validación del servidor (${php.error?.code || php.stderr})`);
    } else {
      const respuestas = php.stdout.trim().split('\n').map((l) => JSON.parse(l));
      const distintos = codigos.filter((codigo, i) => {
        const trazado = deCodigo(codigo);
        const js = { lee: trazado !== null, error: trazado && validarTrazado(trazado), canonico: trazado && aCodigo(trazado) };
        return JSON.stringify(js) !== JSON.stringify(respuestas[i]);
      });
      const motivos = new Set(respuestas.map((r) => r.error?.motivo).filter(Boolean));
      console.log(`  el servidor (PHP) y el juego validan igual ${codigos.length - distintos.length} de ${codigos.length} códigos (${motivos.size} motivos distintos)`);
      comprobar(respuestas.length === codigos.length && distintos.length === 0, `PHP y JS no validan igual: ${distintos.slice(0, 3).join(', ')}`);
    }
  }

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

  /*
   * El de la pista de cuatro: cuatro coches de verdad en sus circuitos, y las
   * victorias de cuatro (con carreras de mentira): el que tiene más gana, y
   * con las mismas, el menor tiempo, aunque otro sume menos con menos victorias.
   */
  {
    const cuatro = crearCampeonato(CIRCUITOS_CUATRO);
    while (!clasificacion(cuatro).acabado || !cuatro.carreras.length) {
      const circuito = circuitoDelCampeonato(cuatro);
      // En un circuito que pide mangas, la carrera es la serie: cuenta la suma.
      const serie = crearSerie(mangasDe(circuito));
      let r;
      for (let turno = 0; !serieAcabada(serie); turno++) {
        r = correrUna(circuito, circuito.carriles.map((_, i) => ({ ...CPU_SLOT, semilla: 20 + i + 4 * turno })), turno, 400);
        anotarManga(serie, r.carrera);
      }
      const suma = sumaSerie(serie);
      anotarCarrera(cuatro, r.carrera, [true, false, false, false], serie.total > 1 ? suma : null);
      const ultima = cuatro.carreras[cuatro.carreras.length - 1];
      if (serie.total > 1) comprobar(ultima.ganador === suma.ganador && ultima.tiempos.every((t, i) => t === suma.tiempos[i]), `en el campeonato, «${circuito.clave}» no cuenta la suma de las mangas`);
    }
    const { victorias, tiempos } = clasificacion(cuatro);
    comprobar(victorias.length === 4 && tiempos.every(Number.isFinite), `el campeonato de cuatro no cuenta a los cuatro (${victorias.join(', ')})`);
    comprobar(victorias.reduce((a, b) => a + b, 0) === CIRCUITOS_CUATRO.length, 'las victorias de cuatro no suman las carreras');
    const mentira = crearCampeonato([0, 1, 2, 3]);
    for (const [ganador, tiemposCarrera] of [[2, [50, 51, 49, 40]], [1, [62, 60, 61, 40]], [2, [40, 45, 39, 30]]]) {
      mentira.carreras.push({ clave: 'x', ganador, tiempos: tiemposCarrera, humanos: [true, false, false, false] });
    }
    comprobar(clasificacion(mentira).delante === 2, 'con cuatro no gana el que tiene más victorias');
    // 2-2 entre el 1 y el 2; el 3 suma menos tiempo, pero sin victorias.
    mentira.carreras.push({ clave: 'x', ganador: 1, tiempos: [55, 50, 58, 30], humanos: [true, false, false, false] });
    const empatados = clasificacion(mentira);
    comprobar(empatados.delante === 1 && empatados.porTiempo, 'con cuatro y 2-2 no gana el menor tiempo de los empatados');
  }

  // Las carreras que se eligen (rápida, normal, resistencia): acaban en sus
  // vueltas, y el que no acaba lleva su ritmo con esas vueltas, no con las de serie.
  const medidas = [];
  for (const { id, vueltas } of CARRERAS) {
    const { carrera } = correrSlot(CIRCUITOS[0], [{ prudencia: 1.6 }, { ...CPU_SLOT, semilla: 7 }], { juntos: true, vueltas });
    const ganador = carrera.coches[carrera.ganador];
    const otro = carrera.coches[1 - carrera.ganador];
    medidas.push(`${id} ${vueltas} vueltas en ${formatearTiempo(ganador.terminado)}`);
    comprobar(ganador.vueltas.length === vueltas && otro.vueltas.length === vueltas, `la carrera ${id} no acaba en ${vueltas} vueltas`);
    // A medio camino cuando llega el ganador: su tiempo, el doble.
    const aMedias = { vueltas, circuito: CIRCUITOS[0], tiempo: 60 };
    const ritmo = tiempoFinal(aMedias, { terminado: null, progreso: vueltas * CIRCUITOS[0].largo / 2 }) / aMedias.tiempo;
    comprobar(Math.abs(ritmo - 2) < 1e-9, `en la carrera ${id}, al que va a medias se le pone ${ritmo.toFixed(2)} veces el tiempo del ganador`);
  }
  console.log(`  ${medidas.join(', ')}`);

  // En la de resistencia anochece: del día a la noche, pasando por el atardecer, sin aclarar nunca.
  const camino = Array.from({ length: 101 }, (_, k) => luzDeCarrera(k / 100));
  comprobar(camino[0] === 0 && camino[50] === 1 && camino[100] === 2, `la luz de la resistencia va de ${camino[0]} a ${camino[50]} y a ${camino[100]}`);
  comprobar(camino.every((l, k) => k === 0 || l >= camino[k - 1]), 'la luz de la resistencia se aclara en algún momento');

  // La sombra de las torres: casi nada a mediodía, larga al atardecer, alargándose y girando hasta irse de noche.
  const sombras = [0, 0.5, 1, 1.3, 1.6, 2].map(sombraTorre);
  console.log(`  la sombra de una torre mide ${sombras.map((s) => `${s.largo.toFixed(0)} px (${s.alfa.toFixed(2)})`).join(', ')} de día a noche`);
  comprobar(sombras[0].largo < 6 && sombras[2].largo > 20, `la sombra de una torre mide ${sombras[0].largo.toFixed(1)} px de día y ${sombras[2].largo.toFixed(1)} al atardecer`);
  comprobar(sombras.every((s, k) => k === 0 || (s.largo >= sombras[k - 1].largo && s.alfa <= sombras[k - 1].alfa)), 'la sombra de una torre no se alarga y se apaga a la vez');
  comprobar(sombras[4].alfa === 0 && sombras[5].alfa === 0, 'de noche las torres siguen dando sombra de sol');
  // Los árboles y las gradas, con el mismo sol: la sombra, proporcional a lo alto.
  comprobar([0, 0.5, 1, 1.3].every((l) => Math.abs(sombraSol(l, 3).largo - 3 * sombraSol(l, 1).largo) < 1e-9 && sombraSol(l, 3).fuerza === sombraSol(l, 1).fuerza),
    'la sombra del decorado no es proporcional a lo alto');
  comprobar(Math.atan2(sombras[0].y, sombras[0].x) - Math.atan2(sombras[3].y, sombras[3].x) > 0.3, 'la sombra de una torre no gira al caer la tarde');
  comprobar(CARRERAS.filter((c) => c.anochece).map((c) => c.id).join() === 'resistencia', 'anochece otra carrera que la de resistencia');
}

// --- 7. El fantasma ------------------------------------------------------------

/*
 * Cada vuelta se graba y se reproduce con su reloj (nucleo/fantasma.js). Una
 * carrera del piloto fino, con el coche más rápido en ese circuito (sección
 * 3b), apuntando dónde estaba el coche a cada tiempo de vuelta: el fantasma de cada vuelta tiene que estar ahí (las muestras se
 * interpolan entre pasos de física), llegar hasta la meta, desaparecer
 * después y sobrevivir a guardarse. Sin `grabar`, una carrera no graba nada.
 */
console.log('\nEl fantasma');
{
  const SERVIDOR_RECORDS = readFileSync('servidor/records.php', 'utf8');
  const pruebasRecord = [];
  const sinGrabar = crearCarreraSlot(CIRCUITOS[0], ['#f00']);
  // Los coches que acepta el servidor son los del juego, en el mismo orden.
  const cochesServidor = /RECORDS_COCHES = \[([^\]]*)\]/.exec(SERVIDOR_RECORDS)?.[1].match(/\w+/g) ?? [];
  comprobar(cochesServidor.join() === Object.keys(COCHES).join(), `los coches del servidor (${cochesServidor.join(', ')}) no son los de COCHES`);
  for (const circuito of CIRCUITOS) {
    const { coche } = MAS_RAPIDO[circuito.clave];
    const c = crearCarreraSlot(circuito, ['#f00'], 0, { grabar: true, modelos: [coche] });
    c.fase = 'carrera';
    const piloto = crearPiloto({ prudencia: 1.4 });
    const vivas = [[]];   // por vuelta: [t de vuelta, x, y]
    let completadas = 0;
    for (let k = 0; c.coches[0].terminado === null && k < 200 / DT; k++) {
      avanzarSlot(c, [decidirSlot(piloto, c.coches[0], circuito)], DT);
      const slot = c.coches[0];
      if (slot.completadas > completadas) { completadas = slot.completadas; vivas.push([]); }
      vivas.at(-1).push([c.tiempo - slot.inicioVuelta, slot.coche.x, slot.coche.y]);
    }
    const { grabadas } = c.coches[0];
    let error = 0, alFinal = Infinity, despues = true;
    grabadas.forEach((g, n) => {
      for (const [t, x, y] of vivas[n]) {
        const p = posar(g, t);
        if (p) error = Math.max(error, Math.hypot(p.x - x, p.y - y));
      }
      const meta = circuito.eje[0];
      const final = posar(g, g.tiempo - 1e-6);
      if (final) alFinal = Math.min(alFinal, Math.hypot(final.x - meta.x, final.y - meta.y));
      if (posar(g, g.tiempo + 0.05) !== null) despues = false;
    });
    const mejor = grabadas.reduce((a, b) => (b.tiempo < a.tiempo ? b : a));
    const texto = codificar(mejor);
    const leida = decodificar(texto);
    let deriva = 0;
    for (let t = 0; t < mejor.tiempo; t += 0.1) {
      const a = posar(mejor, t), b = posar(leida, t);
      if (a && b) deriva = Math.max(deriva, Math.hypot(a.x - b.x, a.y - b.y));
    }
    console.log(`  «${circuito.clave}»: ${grabadas.length} vueltas grabadas, se separan ${error.toFixed(2)} px; la mejor (${mejor.tiempo.toFixed(2)} s, carril ${mejor.carril}, ${mejor.coche}) ocupa ${texto.length} caracteres y guardada se separa ${deriva.toFixed(2)} px`);
    comprobar(grabadas.length === VUELTAS_SLOT, `«${circuito.clave}»: ${grabadas.length} vueltas grabadas de ${VUELTAS_SLOT}`);
    comprobar(error < 1, `«${circuito.clave}»: el fantasma se separa ${error.toFixed(2)} px del coche`);
    comprobar(alFinal < 40, `«${circuito.clave}»: el fantasma acaba a ${alFinal.toFixed(0)} px de la meta`);
    comprobar(despues, `«${circuito.clave}»: el fantasma sigue después de acabar su vuelta`);
    comprobar(deriva < 0.2 && texto.length < 12000, `«${circuito.clave}»: guardado se separa ${deriva.toFixed(2)} px y ocupa ${texto.length}`);
    comprobar(grabadas.every((g) => g.carril === 0 || g.carril === 1), `«${circuito.clave}»: una vuelta sin carril`);
    comprobar(grabadas.every((g) => g.coche === coche) && leida.coche === coche, `«${circuito.clave}»: la vuelta no dice que se hizo con el ${coche}`);

    /*
     * El servidor (servidor/records.php): el circuito está, su mínimo queda por
     * debajo de esta vuelta (la de un piloto fino: un humano tiene que poder
     * bajarla) sin quedar regalado, y su meta es la del circuito. La vuelta de
     * verdad pasa; trucada (otro tiempo, un salto, desplazada, sin muestras,
     * por debajo del mínimo), no.
     */
    const registro = new RegExp(`'${circuito.clave}'\\s*=>\\s*\\['minimo'\\s*=>\\s*(\\d+),\\s*'meta'\\s*=>\\s*\\[(\\d+),\\s*(\\d+)\\]`).exec(SERVIDOR_RECORDS);
    comprobar(registro, `«${circuito.clave}» no está en RECORDS_CIRCUITOS (servidor/records.php)`);
    if (!registro) continue;
    const [minimo, mx, my] = registro.slice(1).map(Number);
    const ms = Math.round(mejor.tiempo * 1000);
    // El mínimo, con la vuelta del coche más rápido en este circuito.
    console.log(`    el mínimo del servidor, ${minimo} ms, es el ${(minimo / ms * 100).toFixed(0)} % de esta vuelta`);
    comprobar(minimo <= 0.85 * ms && minimo >= 0.6 * ms, `«${circuito.clave}»: el mínimo del servidor (${minimo} ms) frente a una vuelta de ${ms} ms`);
    comprobar(Math.hypot(mx - circuito.eje[0].x, my - circuito.eje[0].y) < 1, `«${circuito.clave}»: la meta del servidor no es la del circuito`);
    const datos = JSON.parse(texto);
    const trucar = (cambio) => { const d = structuredClone(datos); cambio(d); return JSON.stringify(d); };
    const pruebas = [
      [null, { vuelta: ms, fantasma: texto }],
      ['tiempo', { vuelta: ms - 500, fantasma: texto }],
      ['salto', { vuelta: ms, fantasma: trucar((d) => { d.d[30] += 2000; }) }],
      ['meta', { vuelta: ms, fantasma: trucar((d) => { for (let i = 0; i < d.d.length; i += 3) d.d[i + 1] -= 700; }) }],
      ['muestras', { vuelta: ms, fantasma: trucar((d) => { d.d.splice(30, 30); }) }],
      ['vuelta', { vuelta: minimo - 1, fantasma: trucar((d) => { d.tiempo = (minimo - 1) / 1000; }) }],
      // El coche: el que dice la vuelta, uno que existe y el mismo en el fantasma.
      ['coche', { vuelta: ms, fantasma: texto, coche: coche === 'bambino' ? 'tiburon' : 'bambino' }],
      ['coche', { vuelta: ms, fantasma: trucar((d) => { d.c = 'cohete'; }), coche: 'cohete' }],
      // Sin coche (una caché vieja): el de siempre, con su fantasma sin `c`.
      [null, { vuelta: ms, fantasma: trucar((d) => { delete d.c; }), coche: undefined }]
    ];
    pruebasRecord.push(...pruebas.map(([esperado, r]) => ({ esperado, circuito: circuito.clave, r: { circuito: circuito.clave, carril: mejor.carril, coche, ...r } })));
  }
  const php = spawnSync('php', ['tools/validar-record.php'], { input: pruebasRecord.map((p) => JSON.stringify(p.r)).join('\n') + '\n', encoding: 'utf8' });
  if (php.error || php.status !== 0) {
    console.log(`  sin PHP no se comprueban los récords del servidor (${php.error?.code || php.stderr})`);
  } else {
    const respuestas = php.stdout.trim().split('\n').map((l) => JSON.parse(l));
    const mal = pruebasRecord.filter((p, i) => respuestas[i] !== p.esperado);
    console.log(`  el servidor acepta las ${CIRCUITOS.length} vueltas de verdad y rechaza las trucadas: ${pruebasRecord.length - mal.length} de ${pruebasRecord.length}`);
    comprobar(mal.length === 0, `records.php: ${mal.map((p) => `${p.circuito} esperaba ${p.esperado} y dio ${respuestas[pruebasRecord.indexOf(p)]}`).join(', ')}`);
  }
  comprobar(sinGrabar.grabar === false && sinGrabar.coches[0].grabadas.length === 0, 'una carrera sin grabar graba');
  comprobar(['', '{}', '{"v":1}', 'nada', JSON.stringify({ v: 1, paso: 1 / 30, tiempo: 9, d: [1, 2] })].every((t) => decodificar(t) === null),
    'decodificar acepta un fantasma malformado');
}

// --- 8. Los mejores momentos ----------------------------------------------------

/*
 * Lo grabado y lo elegido (nucleo/momentos.js). Carreras como las del juego
 * (un piloto que falla, de «humano», contra la CPU normal), grabadas hasta
 * TRAS_META s tras la meta: hay momentos, los elegidos no se pisan y caben en
 * lo grabado, el búfer es finito y no pesa, la repetición dura lo que debe y
 * con la misma semilla sale lo mismo. Los choques, lanzados en cada
 * encuentro, dicen bien dónde han sido; los demás momentos se prueban con
 * carreras de mentira, donde se ve exactamente qué tiene que encontrarse.
 */
console.log('\nLos mejores momentos');
{
  function carreraGrabada(circuito, semilla, vueltas = 3) {
    const carrera = crearCarreraSlot(circuito, ['#f00', '#00f'], semilla % 2, { vueltas });
    const rep = crearRepeticion(circuito, 2);
    const pilotos = [crearPiloto({ prudencia: 1.25, variacion: 0.3, fallo: 0.1, semilla: semilla * 7 }), crearPiloto({ ...CPU_SLOT, semilla })];
    let tras = null;
    for (let k = 0; k < 600 / DT; k++) {
      avanzarSlot(carrera, carrera.fase === 'carrera' ? carrera.coches.map((s, i) => decidirSlot(pilotos[i], s, circuito)) : [], DT);
      grabarCuadro(rep, carrera, DT, [true, false]);
      if (carrera.fase === 'fin' && tras === null) tras = TRAS_META;
      if (tras !== null && (tras -= DT) <= 0) break;
    }
    return { carrera, rep };
  }

  const SEMILLAS = 6;
  const tipos = {};
  let peorDuracion = 0, peorTotal = 0;
  for (const circuito of CIRCUITOS) {
    let conMomentos = 0, mal = [];
    for (let semilla = 1; semilla <= SEMILLAS; semilla++) {
      const { rep } = carreraGrabada(circuito, semilla);
      const elegidos = elegirMomentos(rep);
      const { lista, mejor } = elegidos;
      if (lista.length) conMomentos++;
      for (const m of lista) tipos[m.tipo] = (tipos[m.tipo] || 0) + 1;
      if (lista.length > NUMERO_MOMENTOS) mal.push(`${lista.length} momentos`);
      if (lista.some((m, i) => i > 0 && m.desde < lista[i - 1].hasta)) mal.push('momentos que se pisan o desordenados');
      if (lista.some((m) => m.desde < 0 || m.hasta > rep.t + 1e-9 || m.t < m.desde || m.t > m.hasta)) mal.push('un momento fuera de lo grabado');
      if (lista.length && lista.some((m) => m.valor > lista[mejor].valor)) mal.push('el mejor no es el que más vale');
      if (lista.some((m) => m.tipo === 'vuelta' && !m.humano)) mal.push('una vuelta rápida de la CPU');
      // Lugares que el circuito no tiene.
      for (const c of rep.candidatos.filter((c) => c.tipo === 'choque')) {
        const tiene = { cruce: circuito.cruces.length > 0, x: circuito.cambiosCarril > 0, estrecha: estrechas(circuito).length > 0, pista: true }[c.lugar];
        if (!tiene) mal.push(`un choque en ${c.lugar}`);
      }
      // El búfer: finito, un cuadro cada PASO_REPETICION como mucho (más los de los eventos) y el ángulo sin saltos.
      const finito = rep.cuadros.every((q) => q.every(Number.isFinite));
      const campos = (rep.cuadros[0].length - 1) / rep.coches;   // por coche y cuadro
      const salto = rep.cuadros.some((q, i) => i > 0 && [0, 1].some((c) => Math.abs(q[3 + c * campos] - rep.cuadros[i - 1][3 + c * campos]) > Math.PI));
      if (!finito || salto) mal.push(!finito ? 'un cuadro no finito' : 'el ángulo salta');
      if (rep.cuadros.length > Math.ceil(rep.t / PASO_REPETICION) + rep.eventos.length + 1) mal.push(`${rep.cuadros.length} cuadros en ${rep.t.toFixed(1)} s`);
      // La repetición: en cada cuadro, la pose es la del cuadro; entre dos, entre ellos.
      for (let i = 1; i < rep.cuadros.length; i += 97) {
        const q = rep.cuadros[i], antes = rep.cuadros[i - 1];
        const [p] = poseEn(rep, q[0]);
        const [medio] = poseEn(rep, (q[0] + antes[0]) / 2);
        const entre = (v, a, b) => v >= Math.min(a, b) - 1e-6 && v <= Math.max(a, b) + 1e-6;
        if (Math.hypot(p.x - q[1], p.y - q[2]) > 1e-6 || !entre(medio.x, antes[1], q[1]) || !entre(medio.y, antes[2], q[2])) {
          mal.push(`la pose de la repetición no es la grabada a ${q[0].toFixed(2)} s`);
          break;
        }
      }
      // La luz de freno: se graba y la repetición la enciende donde se grabó.
      const frenadas = rep.cuadros.filter((q) => q[campos] === 1);
      if (!frenadas.length) mal.push('nunca frena');
      else if (frenadas.some((q) => !poseEn(rep, q[0])[0].frenando)) mal.push('la repetición no enciende la luz de freno');
      if (eventosEntre(rep, -1, rep.t).length !== rep.eventos.length) mal.push('eventosEntre pierde eventos');
      const duraciones = lista.map((m) => duracionMomento(m));
      peorDuracion = Math.max(peorDuracion, ...duraciones);
      peorTotal = Math.max(peorTotal, duraciones.reduce((a, b) => a + b, 0));
      if (lista.some((m, i) => duraciones[i] < m.hasta - m.desde - 1e-6)) mal.push('una repetición más corta que su momento');
      // Con la misma semilla, los mismos momentos.
      if (semilla === 1) {
        const otra = elegirMomentos(carreraGrabada(circuito, semilla).rep);
        if (JSON.stringify(otra) !== JSON.stringify(elegidos)) mal.push('con la misma semilla, otros momentos');
      }
    }
    console.log(`  «${circuito.clave}»: ${conMomentos} de ${SEMILLAS} carreras con momentos${mal.length ? ' · ' + [...new Set(mal)].join(', ') : ''}`);
    comprobar(conMomentos >= SEMILLAS - 2, `«${circuito.clave}»: solo ${conMomentos} de ${SEMILLAS} carreras tienen algún momento`);
    comprobar(!mal.length, `«${circuito.clave}»: ${[...new Set(mal)].join(', ')}`);
  }
  console.log(`  los elegidos: ${Object.entries(tipos).map(([k, n]) => `${n} ${k}`).join(', ')}`);
  console.log(`  repetido, un momento dura hasta ${peorDuracion.toFixed(1)} s y los ${NUMERO_MOMENTOS}, hasta ${peorTotal.toFixed(1)} s`);
  comprobar(peorDuracion <= 7.5, `un momento repetido dura ${peorDuracion.toFixed(1)} s (más de 7,5)`);
  comprobar(peorTotal <= 20, `los ${NUMERO_MOMENTOS} momentos duran ${peorTotal.toFixed(1)} s (más de 20)`);

  // Lo que pesa una carrera larga, la de resistencia.
  const larga = CARRERAS.at(-1).vueltas;
  const { rep: repLarga } = carreraGrabada(CIRCUITOS[0], 1, larga);
  const megas = numerosGrabados(repLarga) * 8 / 1e6;
  console.log(`  una carrera de ${larga} vueltas (${repLarga.t.toFixed(0)} s) graba ${repLarga.cuadros.length} cuadros: ~${megas.toFixed(1)} MB`);
  comprobar(megas < 2, `una carrera de ${larga} vueltas ocupa ${megas.toFixed(1)} MB grabada`);
  const llena = crearRepeticion(CIRCUITOS[0], 2);
  llena.t = GRABA_REPETICION;
  grabarCuadro(llena, crearCarreraSlot(CIRCUITOS[0], ['#f00', '#00f']), DT);
  comprobar(llena.cuadros.length === 0, `pasados ${GRABA_REPETICION} s se sigue grabando`);

  /*
   * Los choques, en cada encuentro (como en la sección 3: los dos lanzados
   * con 21 desfases): cada uno es un momento, y en su sitio.
   */
  for (const circuito of CIRCUITOS) {
    const lista = [
      ...circuito.cruces.map((c) => [...c.s, 'cruce']),
      ...circuito.eje.filter((p, i, eje) => p.tipo === 'x' && eje[(i - 1 + eje.length) % eje.length].tipo !== 'x').map((p) => [p.s, p.s, 'x']),
      ...estrechas(circuito).map((s) => [s, s, 'estrecha'])
    ];
    const resultado = lista.map(([sa, sb, lugar]) => {
      let choques = 0, momentos = 0, bien = 0;
      for (let desfase = -80; desfase <= 80; desfase += 8) {
        const c = crearCarreraSlot(circuito, ['#f00', '#00f'], 0);
        c.fase = 'carrera';
        c.coches[0].s = sa - 150;
        c.coches[1].s = sb - 150 + desfase;
        for (const slot of c.coches) Object.assign(slot, { v: 200, potencia: 200 / VELOCIDAD_SLOT });
        const rep = crearRepeticion(circuito, 2);
        for (let k = 0; k < 3 / DT; k++) {
          avanzarSlot(c, c.coches.map((slot) => ({ acelerar: slot.v < 200 })), DT);
          choques += c.eventos.filter((e) => e.tipo === 'choque').length;
          grabarCuadro(rep, c, DT);
        }
        const suyos = rep.candidatos.filter((m) => m.tipo === 'choque');
        momentos += suyos.length;
        bien += suyos.filter((m) => m.lugar === lugar).length;
      }
      return { lugar, choques, momentos, bien };
    });
    if (!resultado.length) continue;
    console.log(`  «${circuito.clave}»: ${resultado.map((r) => `${r.lugar} ${r.bien}/${r.choques}`).join(', ')} choques con su momento, en su sitio`);
    comprobar(resultado.every((r) => r.choques > 0 && r.momentos === r.choques && r.bien === r.choques),
      `«${circuito.clave}»: choques sin momento o en otro sitio: ${resultado.map((r) => `${r.lugar} ${r.bien}/${r.momentos}/${r.choques}`).join(', ')}`);
  }

  /*
   * Carreras de mentira: dos coches (o cuatro) en una recta de La horquilla,
   * movidos a mano, para ver que cada momento se encuentra cuando toca y solo
   * entonces.
   */
  const circuito = CIRCUITOS[0];
  function deMentira(salidas = [200, 150]) {
    const coche = (s) => ({
      estado: 'carril', s, progreso: s, v: 300, derrape: 0, altura: 0, vueltas: [], terminado: null, humanoDesde: 0,
      coche: { x: 100 + s, y: 100, angulo: 0, vx: 300, vy: 0 }
    });
    const carrera = { circuito, fase: 'carrera', tiempo: 10, vueltas: 3, eventos: [], coches: salidas.map(coche) };
    return { carrera, rep: crearRepeticion(circuito, salidas.length) };
  }
  function correrMentira(pasos, salidas) {
    const { carrera, rep } = deMentira(salidas);
    for (let k = 0; k < pasos.length; k++) {
      carrera.eventos = [];
      pasos[k](carrera, k);
      carrera.tiempo += DT;
      grabarCuadro(rep, carrera, DT, [true, false]);
    }
    return rep.candidatos.map((m) => m.tipo + (m.lugar ? ':' + m.lugar : '') + (salidas ? ':' + m.coches : '')).join(',');
  }
  const durante = (n, paso) => Array.from({ length: n }, () => paso);
  // La salvada: un derrape de 0,7 que vuelve a 0 en el carril; si acaba fuera, nada.
  const derrape = (k) => Math.max(0, 0.7 - Math.abs(k - 30) * 0.7 / 30);
  const salvada = correrMentira(durante(90, (c, k) => { c.coches[0].derrape = derrape(k); }));
  const fuera = correrMentira(durante(90, (c, k) => { c.coches[0].derrape = k < 30 ? derrape(k) : 0; if (k >= 30) c.coches[0].estado = 'fuera'; }));
  // El adelantamiento: el segundo pasa y aguanta; si devuelve el puesto, o el otro estaba fuera, nada.
  const pasa = (hasta) => (c, k) => { c.coches[1].progreso = 150 + k * 2; c.coches[1].s = c.coches[1].progreso; if (k > hasta) c.coches[1].progreso = 190; };
  const adelanta = correrMentira(durante(150, pasa(Infinity)));
  const devuelve = correrMentira(durante(150, pasa(50)));
  const alSalirse = correrMentira(durante(150, (c, k) => { pasa(Infinity)(c, k); c.coches[0].estado = 'fuera'; }));
  // Con cuatro, entre dos de la CPU: el cuarto pasa al tercero (y a nadie más).
  const enCuatro = correrMentira(durante(150, (c, k) => { c.coches[3].progreso = c.coches[3].s = 350 + k * 2; }), [200, 150, 400, 350]);
  // La llegada: el primero gana con el segundo a 0,1 s (por su ritmo); a 1 s, nada.
  const llega = (hueco) => [(c) => {
    c.coches[0].vueltas = [9];
    c.coches[1].progreso = c.vueltas * circuito.largo - hueco * c.coches[1].v;
    c.tiempo = c.coches[1].progreso / c.coches[1].v;   // a su ritmo de siempre
    c.eventos = [{ tipo: 'fin', coche: 0 }];
  }];
  // La salida: lanzada, sí; despacio, o por un choque, no (es el choque).
  const sale = (v, choque = false) => [(c) => {
    Object.assign(c.coches[0].coche, { vx: v, vy: 0 });
    c.eventos = [...(choque ? [{ tipo: 'choque', coche: 0, x: 0, y: 0 }] : []), { tipo: 'sale', coche: 0 }];
  }];
  const mentiras = [
    ['una salvada', salvada, 'salvada'], ['salvada que acaba fuera', fuera, ''],
    ['un adelantamiento', adelanta, 'adelanta'], ['uno que devuelve el puesto', devuelve, ''], ['pasar al que se ha salido', alSalirse, ''],
    ['adelantar con cuatro', enCuatro, 'adelanta:3,2'],
    ['llegar a 0,1 s', correrMentira(llega(0.1)), 'llegada'], ['llegar a 1 s', correrMentira(llega(1)), ''],
    ['salirse lanzado', correrMentira(sale(420)), 'salida'], ['salirse despacio', correrMentira(sale(200)), ''],
    ['salirse por un choque', correrMentira(sale(420, true)), 'choque:']
  ];
  const fallan = mentiras.filter(([, hallado, esperado]) => !(esperado.endsWith(':') ? hallado.startsWith(esperado) && !hallado.includes('salida') : hallado === esperado));
  console.log(`  de mentira: ${mentiras.length - fallan.length} de ${mentiras.length} momentos encontrados cuando tocaba`);
  comprobar(!fallan.length, `momentos de mentira: ${fallan.map(([n, h, e]) => `${n} da «${h}» y se esperaba «${e}»`).join('; ')}`);
  // La vuelta rápida de una persona entra; la de la CPU, no.
  const conVuelta = (humano) => {
    const rep = crearRepeticion(circuito, 2);
    rep.t = 20;
    rep.vueltas.push({ t: 15, coche: 0, tiempo: 9, humano }, { t: 16, coche: 1, tiempo: 9.5, humano: false });
    return elegirMomentos(rep).lista.map((m) => m.tipo).join();
  };
  comprobar(conVuelta(true) === 'vuelta' && conVuelta(false) === '', `la vuelta rápida: de una persona da «${conVuelta(true)}» y de la CPU «${conVuelta(false)}»`);
  comprobar(Object.keys(TIPOS_MOMENTO).every((k) => TIPOS_MOMENTO[k].antes > 0 && TIPOS_MOMENTO[k].despues > 0), 'un momento sin ventana');
  // Cada momento, en cada sitio, tiene su rótulo.
  const posibles = [
    ...['x', 'cruce', 'estrecha', 'pista'].map((lugar) => ({ tipo: 'choque', lugar })),
    ...[null, 'deslizante'].map((lugar) => ({ tipo: 'salvada', lugar })),
    ...[null, 'estrecha'].map((lugar) => ({ tipo: 'adelanta', lugar })),
    ...['salida', 'llegada', 'vuelta'].map((tipo) => ({ tipo, lugar: null }))
  ];
  const sinRotulo = posibles.map(claveRotulo).filter((k) => !CATALOGOS.es[k]);
  comprobar(!sinRotulo.length && posibles.every((m) => Object.hasOwn(TIPOS_MOMENTO, m.tipo)), `momentos sin rótulo: ${sinRotulo.join(', ')}`);
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
  // Cada idioma de IDIOMAS tiene su fichero, y cambiar de idioma da la vuelta
  // a los siete y deja t() en el nuevo (es asíncrono: espera a bajarlo).
  comprobar(IDIOMAS.every((l) => CATALOGOS[l.codigo]), `idiomas sin catálogo en idiomas/`);
  const vistos = [];
  for (const _ of IDIOMAS) { await cambiarIdioma(1); vistos.push(codigoIdioma()); }
  comprobar(vistos.join() === [...IDIOMAS.slice(1), IDIOMAS[0]].map((l) => l.codigo).join()
    && t('page.langTitle') === CATALOGOS.es['page.langTitle'], `cambiar de idioma da ${vistos.join(' ')}`);
  // Cada coche tiene nombre (el menú COCHE y la tabla de récords lo enseñan).
  const sinNombre = Object.keys(COCHES).filter((id) => !CATALOGOS.es['coche.' + id]);
  comprobar(!sinNombre.length, `coches sin nombre en idiomas/es.js: ${sinNombre.join(', ')}`);

  /*
   * Los nombres de los circuitos públicos: en cada idioma, las mismas listas
   * que cuenta api.php (ADJETIVOS, SUSTANTIVOS), el sustantivo con su género
   * y el adjetivo con sus dos formas.
   */
  const api = readFileSync('api.php', 'utf8');
  const constante = (nombre) => Number(new RegExp(`const ${nombre}\\s*=\\s*(\\d+)`).exec(api)?.[1]);
  for (const [codigo, catalogo] of Object.entries(CATALOGOS)) {
    const adjetivos = Object.keys(catalogo).filter((k) => k.startsWith('nombre.a.'));
    const sustantivos = Object.keys(catalogo).filter((k) => k.startsWith('nombre.s.'));
    comprobar(adjetivos.length === constante('ADJETIVOS') && sustantivos.length === constante('SUSTANTIVOS'),
      `${codigo}: ${adjetivos.length} adjetivos y ${sustantivos.length} sustantivos, y api.php espera ${constante('ADJETIVOS')} y ${constante('SUSTANTIVOS')}`);
    comprobar(adjetivos.every((k) => /^[^|]+\|[^|]+$/.test(catalogo[k])) && sustantivos.every((k) => /^[^|]+\|[mf]$/.test(catalogo[k])),
      `${codigo}: un adjetivo sin sus dos formas o un sustantivo sin género`);
    comprobar(/\{a\}/.test(catalogo['nombre.formato']) && /\{s\}/.test(catalogo['nombre.formato']), `${codigo}: el formato del nombre no lleva {a} y {s}`);
  }
  console.log(`  ${constante('ADJETIVOS')} × ${constante('SUSTANTIVOS')} nombres de circuito en cada idioma`);
}

// --- 9. Los ajustes de rendimiento ----------------------------------------------

console.log('\nLos ajustes');
{
  // De serie: Auto, y todo lo de verdad (lo elegido es el primer valor de cada fila).
  reiniciarAjustes();
  comprobar(OPCIONES.every((o) => ajuste(o.id) === o.valores[0]) && elegido('calidad') === 'auto', 'los de serie no son el primer valor de cada fila');
  // Cada fila da la vuelta a sus valores y vuelve al de serie.
  for (const o of OPCIONES) {
    const vistos = [];
    for (let i = 0; i < o.valores.length; i++) vistos.push(cambiarAjuste(o.id)[o.id]);
    comprobar(vistos.at(-1) === o.valores[0] && new Set(vistos).size === o.valores.length, `${o.id}: las vueltas dan ${vistos.join(' ')}`);
  }
  // Lo guardado que no vale (otra fila, otro valor, otra cosa) no cambia nada.
  ponerAjustes({ calidad: 'ultra', luces: 'apagadas', sombras: 'no', inventada: true });
  ponerAjustes('basura');
  ponerAjustes(null);
  comprobar(OPCIONES.every((o) => ajuste(o.id) === o.valores[0]), 'lo guardado que no vale ha cambiado algo');
  // Baja: lo gráfico al mínimo y lo demás como esté, sin tocar lo elegido; Alta: lo elegido.
  const graficas = OPCIONES.filter((o) => o.grafica);
  ponerAjustes({ calidad: 'baja', vibracion: false, fps: true });
  comprobar(graficas.every((o) => ajuste(o.id) === o.valores.at(-1)), 'con Baja algo gráfico no está al mínimo');
  comprobar(ajuste('vibracion') === false && ajuste('fps') === true, 'Baja ha tocado lo que no es gráfico');
  comprobar(graficas.every((o) => elegido(o.id) === o.valores[0]), 'Baja ha cambiado lo elegido');
  ponerAjustes({ calidad: 'alta', luces: 'simples' });
  comprobar(ajuste('luces') === 'simples' && ajuste('sombras') === true && ajuste('resolucion') === 'nitida', 'con Alta no vale lo elegido');
  // Auto: unos lentos sueltos no bajan; 2 s seguidos sí, una vez; y en Alta, nunca.
  reiniciarAjustes();
  const dt = 1 / 60;
  let bajo = false;
  for (let i = 0; i < 600; i++) bajo ||= vigilar(i % 3 === 0 ? 40 : 16.7, dt);
  comprobar(!bajo && !autoBajada(), 'Auto ha bajado con un lento de cada tres');
  let cuando = -1, veces = 0;
  for (let i = 0; i < 300; i++) if (vigilar(30, dt)) { veces++; cuando = i; }
  comprobar(veces === 1 && autoBajada() && ajuste('luces') === 'simples' && elegido('luces') === 'completas',
    `Auto: ${veces} bajadas`);
  comprobar(cuando * dt > 1.9 && cuando * dt < 2.2, `Auto baja a los ${(cuando * dt).toFixed(2)} s de ir lento`);
  reiniciarAjustes();
  ponerAjustes({ calidad: 'alta' });
  let enAlta = false;
  for (let i = 0; i < 300; i++) enAlta ||= vigilar(30, dt);
  comprobar(!enAlta && ajuste('luces') === 'completas', 'Alta ha bajado sola');
  // Cada fila y cada valor tienen su texto (que los siete tengan las mismas claves lo mira la sección 4).
  const sinTexto = OPCIONES.flatMap((o) => ['opcion.' + o.id, ...o.valores.map((v) => 'ajustes.' + (typeof v === 'boolean' ? (v ? 'si' : 'no') : v))])
    .filter((k) => !CATALOGOS.es[k]);
  comprobar(!sinTexto.length && CATALOGOS.es['grupo.rendimiento'], `ajustes sin texto: ${sinTexto.join(', ')}`);
  reiniciarAjustes();
  console.log(`  ${OPCIONES.length} filas; Auto baja tras ${(cuando * dt).toFixed(2)} s lento`);
}

console.log(`\n${aserciones - fallos}/${aserciones} aserciones en verde`);
process.exit(fallos ? 1 : 0);
