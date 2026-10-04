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
import { cabe, distanciaAPista, generarDecorado, torreCabe, zonasVetadas } from './nucleo/decorado.js';

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

for (const circuito of CIRCUITOS) {
  // --- 1. El circuito ----------------------------------------------------------

  console.log(`\nCircuito «${circuito.clave}»: ${circuito.largo.toFixed(0)} px de eje, ${circuito.eje.length} puntos, ` +
    `${circuito.cruces.length} cruces y ${circuito.cambiosCarril} X`);
  {
    /*
     * Ningún tramo del eje se acerca a otro que esté lejos por la pista: si dos
     * brazos quedaran a menos de un ancho (más la hierba), la pared de uno sería
     * la del otro. «Lejos» se mide en `s` y no en número de puntos, porque en
     * los arcos los puntos van más juntos: contando puntos, dos extremos de la
     * misma curva de 90° parecían tramos distintos.
     */
    const { eje, largo } = circuito;
    const LEJOS = 300; // px de pista
    let minimo = Infinity;
    for (let i = 0; i < eje.length; i++) {
      for (let j = i + 1; j < eje.length; j++) {
        const porPista = Math.min(eje[j].s - eje[i].s, largo - (eje[j].s - eje[i].s));
        // En un cruce los dos tramos se pisan: es lo que es.
        if (porPista < LEJOS || enCruce(circuito, eje[i].s, eje[j].s)) continue;
        minimo = Math.min(minimo, Math.hypot(eje[i].x - eje[j].x, eje[i].y - eje[j].y));
      }
    }
    console.log(`  separación mínima entre tramos a más de ${LEJOS} px por la pista: ${minimo.toFixed(0)} px`);
    comprobar(minimo > ANCHO_PISTA + 40, 'dos tramos de pista quedan a menos de un ancho + 40 px');
    const fueraDeLienzo = eje.some((p) => p.x - ANCHO_PISTA / 2 < 0 || p.y - ANCHO_PISTA / 2 < 0 ||
      p.x + ANCHO_PISTA / 2 > 1280 || p.y + ANCHO_PISTA / 2 > 720);
    comprobar(!fueraDeLienzo, 'la pista se sale del lienzo');

    /*
     * El muro de cada lado no puede caer en la zona de otro tramo: ningún
     * punto del muro está a menos del muro de un punto del eje lejano por la
     * pista. Y dentro del lienzo. (Por dentro de una curva el muro pasa del
     * centro y cae en la zona de la misma curva: eso no es invadir.)
     */
    let invade = 0, fuera = 0, escapatoria = Infinity;
    for (const p of eje) {
      [-1, 1].forEach((lado, k) => {
        const w = { x: p.x - Math.sin(p.angulo) * lado * p.muro[k], y: p.y + Math.cos(p.angulo) * lado * p.muro[k] };
        // Dentro de la zona de un tramo lejano: a menos de su muro, por su lado.
        const dentro = eje.some((q) => {
          const porPista = Math.min(Math.abs(q.s - p.s), largo - Math.abs(q.s - p.s));
          if (porPista < LEJOS || enCruce(circuito, p.s, q.s)) return false;
          const dx = w.x - q.x, dy = w.y - q.y;
          const ladoQ = -dx * Math.sin(q.angulo) + dy * Math.cos(q.angulo) < 0 ? 0 : 1;
          return Math.hypot(dx, dy) < q.muro[ladoQ] - 1;
        });
        if (dentro) invade++;
        if (w.x < 0 || w.y < 0 || w.x > 1280 || w.y > 720) fuera++;
        /*
         * La grava que hay de verdad más allá de lo que se pisa gratis: se
         * avanza por la normal desde el borde hasta salir de la zona, con la
         * misma regla que la física (`muroCercano`). Por dentro de una curva la
         * normal cruza el centro, y lo que cuenta es eso, no el número `muro`.
         */
        let hondo = 0;
        for (let d = p.borde[k] + 1; d <= p.borde[k] + 30; d += 1) {
          const x = { x: p.x - Math.sin(p.angulo) * lado * d, y: p.y + Math.cos(p.angulo) * lado * d };
          if (circuito.muroCercano(x, eje.indexOf(p)).fuera >= 0) break;
          hondo = d - p.borde[k];
        }
        escapatoria = Math.min(escapatoria, hondo);
      });
    }
    console.log(`  grava mínima más allá del borde, también por dentro de las curvas: ${escapatoria.toFixed(0)} px`);
    // Por dentro de las curvas el piano se come 10 de los 26 px: quedan 16, que
    // medidos a pasos de 1 px pueden dar 15.
    comprobar(escapatoria >= 14, `hay una escapatoria de solo ${escapatoria.toFixed(0)} px`);
    comprobar(invade === 0, `${invade} puntos del muro caen en la zona de otro tramo`);
    comprobar(fuera === 0, `${fuera} puntos del muro se salen del lienzo`);

    /*
     * El hueco del marcador (el panel de la portada y los avisos, el mismo que
     * el decorado tiene vetado) no pisa el asfalto ni el piano: lo que se
     * conduce no queda nunca debajo de un cartel.
     */
    const hueco = zonasVetadas(circuito)[2];
    let holgura = Infinity;
    for (let x = hueco.x0; x <= hueco.x1; x += 4) {
      for (let y = hueco.y0; y <= hueco.y1; y += 4) {
        const p = circuito.proyectar({ x, y });
        holgura = Math.min(holgura, p.distancia - circuito.bordeEn(p));
      }
    }
    console.log(`  el hueco del marcador queda a ${holgura.toFixed(0)} px de lo que se pisa`);
    comprobar(holgura > 0, `el hueco del marcador pisa la pista ${(-holgura).toFixed(0)} px`);
  }

  // --- 2. El decorado ------------------------------------------------------------

  console.log('\nDecorado');
  for (const nombre of ORDEN_ESCENARIOS) {
    const decorado = generarDecorado(circuito, nombre);
    const otra = generarDecorado(circuito, nombre);
    comprobar(JSON.stringify(decorado.piezas) === JSON.stringify(otra.piezas), `${nombre}: el decorado cambia entre dos generaciones`);
    comprobar(decorado.piezas.length >= 40, `${nombre}: solo caben ${decorado.piezas.length} piezas`);
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
    comprobar(decorado.torres.length >= 8, `${nombre}: solo caben ${decorado.torres.length} torres de iluminación`);
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

/** Lo que limita la velocidad: una curva o una recta de baches. */
const limita = (p) => p.radio !== Infinity || p.efecto === 'baches';

for (const circuito of CIRCUITOS) {
  console.log(`\nSlot en «${circuito.clave}»`);
  // Los carriles van por el asfalto, caben en el lienzo y no se acercan a otro tramo.
  const margen = ANCHO_PISTA / 2 - Math.max(...CARRILES.map(Math.abs)) - ANCHO_COCHE / 2;
  comprobar(margen >= 4, `un coche en el carril se queda a ${margen} px del borde del asfalto`);
  const n = circuito.eje.length;
  let cercania = Infinity, fuera = 0;
  const trazados = CARRILES.map((l) => trazadoCarril(circuito, l));
  for (const trazado of trazados) {
    for (const p of trazado) if (p.x < LARGO_COCHE || p.x > ANCHO - LARGO_COCHE || p.y < LARGO_COCHE || p.y > ALTO - LARGO_COCHE) fuera++;
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const d = Math.abs(circuito.eje[i].s - circuito.eje[j].s);
      if (Math.min(d, circuito.largo - d) < 300 || enCruce(circuito, circuito.eje[i].s, circuito.eje[j].s)) continue;
      for (const a of trazados) for (const b of trazados) {
        cercania = Math.min(cercania, Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y));
      }
    }
  }
  const largos = CARRILES.map((l) => largoCarril(circuito, l));
  console.log(`  carriles de ${largos.map((l) => l.toFixed(0)).join(' y ')} px; tramos lejanos a ${cercania.toFixed(0)} px como poco`);
  comprobar(fuera === 0, `${fuera} puntos de los carriles caen al borde del lienzo`);
  comprobar(cercania > 60, `dos tramos lejanos de carril quedan a ${cercania.toFixed(0)} px`);

  /*
   * Soltar en las curvas tiene que ganar a ir a fondo, y por mucho. Desde el
   * playtest, pasado el agarre se derrapa antes de salirse: el prudente no
   * pasa del agarre (×1), el fino entra derrapando y el que va a fondo se sale.
   */
  const prudente = correrSlot(circuito, [{ prudencia: 1 }, { prudencia: 1 }]);
  let fino = null;
  for (const prudencia of [1.2, 1.4, 1.6, 1.8]) {
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
  comprobar(vueltaPrudente > 9 && vueltaPrudente < 16, `la vuelta del prudente (${vueltaPrudente.toFixed(2)} s) se sale de 9-16 s`);
  const premio = Math.min(...prudente.carrera.coches.map((c) => c.terminado)) / fino.mejor - 1;
  console.log(`  entrar derrapando ahorra un ${(premio * 100).toFixed(0)} % sobre no pasar del agarre`);
  comprobar(premio > 0, 'entrar derrapando no gana a no pasar del agarre');
  const ventaja = Math.min(...aFondo.carrera.coches.map((c) => c.terminado)) / fino.mejor - 1;
  console.log(`  soltar en las curvas ahorra un ${(ventaja * 100).toFixed(0)} % sobre ir a fondo`);
  comprobar(ventaja > 0.3, 'ir a fondo no pierde al menos un 30 % contra quien suelta');
  comprobar(aFondo.carrera.coches.every((c) => c.salidas >= 2 * VUELTAS_SLOT), 'ir a fondo no se sale al menos dos veces por vuelta');

  // La mano: devuelve siempre el coche, y pronto.
  const media = aFondo.manos.reduce((a, b) => a + b, 0) / aFondo.manos.length;
  console.log(`  la mano tarda ${media.toFixed(2)} s de media desde que se sale (como mucho ${aFondo.manoMax.toFixed(2)})`);
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
    comprobar(salidasHumano.every((n) => n === 0), `un humano que reacciona tarde se sale ${salidasHumano.join(' y ')} veces`);
  }

  /*
   * La CPU del juego (`CPU_SLOT`) tiene que ser ganable, pero no fácil: cada
   * curva con su prudencia y algún fallo. Perfecta «no había quien le ganara»
   * (0,7 s por vuelta del mejor piloto); a 2 s, «ahora es fácil».
   */
  {
    const vueltas = [], salidas = [];
    let repetida = null;
    for (let semilla = 1; semilla <= 6; semilla++) {
      const r = correrSlot(circuito, [{ ...CPU_SLOT, semilla }, { ...CPU_SLOT, semilla }]);
      const [c] = r.carrera.coches;
      vueltas.push(c.terminado / VUELTAS_SLOT);
      salidas.push(c.salidas);
      if (semilla === 1) repetida = c.terminado;
    }
    const otra = correrSlot(circuito, [{ ...CPU_SLOT, semilla: 1 }, { ...CPU_SLOT, semilla: 1 }]).carrera.coches[0].terminado;
    const media = vueltas.reduce((a, b) => a + b, 0) / vueltas.length;
    const margen = media - fino.mejor / VUELTAS_SLOT;
    console.log(`  la CPU da vueltas de ${media.toFixed(2)} s de media, ${margen.toFixed(2)} s más que el mejor piloto, y se sale ${salidas.join(', ')} veces en seis carreras`);
    comprobar(margen > 0.6, `la CPU deja solo ${margen.toFixed(2)} s por vuelta al mejor piloto: no hay quien le gane`);
    comprobar(margen < 1.4, `la CPU deja ${margen.toFixed(2)} s por vuelta al mejor piloto: es fácil`);
    comprobar(salidas.some((n) => n > 0), 'la CPU no se equivoca nunca');
    comprobar(otra === repetida, 'la CPU con la misma semilla no repite la carrera');

    // Y juntos en la pista, la CPU contra el mejor piloto: cuántas veces chocan.
    const choques = [1, 2, 3, 4, 5, 6].map((semilla) =>
      correrSlot(circuito, [{ ...CPU_SLOT, semilla }, { prudencia: fino.prudencia }], { juntos: true }).choques);
    console.log(`  la CPU contra el mejor piloto, en la misma pista: ${choques.join(', ')} choques en seis carreras`);
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
    comprobar(pasan.length === 0, `se pasan a tope ${pasan.join(', ')}`);
  }

  /*
   * Los carriles no son iguales, por eso se cambian en cada carrera. Con una
   * X, cada coche corre la mitad de las vueltas por cada uno: casi iguales.
   */
  const [t1, t2] = prudente.carrera.coches.map((c) => c.terminado);
  const desigualdad = Math.abs(t1 - t2) / Math.min(t1, t2);
  console.log(`  entre carriles, con el mismo piloto: ${(desigualdad * 100).toFixed(1)} % (se cambian en cada carrera)`);
  comprobar(desigualdad < 0.08, `un carril saca un ${(desigualdad * 100).toFixed(1)} % al otro`);
  if (circuito.cambiosCarril % 2) comprobar(desigualdad < 0.02, `con una X, un carril aún saca un ${(desigualdad * 100).toFixed(1)} % al otro`);
  const cambiada = crearCarreraSlot(circuito, ['#f00', '#00f'], 1);
  comprobar(cambiada.coches[0].lateral === CARRILES[1] && cambiada.coches[1].lateral === CARRILES[0],
    'con el turno cambiado los coches no se cambian de carril');

  /*
   * Los choques. En paralelo, dos coches no se tocan nunca: con el mismo piloto
   * van juntos toda la carrera y sin X ni cruces no chocan. En cada X y cada cruce, dos coches que llegan a la vez chocan, y una
   * vez devueltos por la mano no vuelven a chocar sin haber avanzado.
   */
  {
    const juntos = correrSlot(circuito, [{ prudencia: 1 }, { prudencia: 1 }], { juntos: true });
    const completa = juntos.carrera.coches.every((c) => c.vueltas.length === VUELTAS_SLOT);
    console.log(`  dos coches iguales en la misma pista: ${juntos.choques} choques`);
    // Con una X pueden chocar (si llegan a la vez); sin X ni cruces, nunca.
    if (!circuito.cambiosCarril && !circuito.cruces.length) comprobar(juntos.choques === 0, `dos coches iguales chocan ${juntos.choques} veces sin X ni cruces`);
    comprobar(completa, 'dos coches juntos no terminan la carrera');
    comprobar(juntos.choqueRepetido === 0, `la mano deja dos coches chocando ${juntos.choqueRepetido} veces`);

    // Los encuentros: cada cruce (dos tramos) y cada X (el mismo tramo).
    const encuentros = [
      ...circuito.cruces.map((c) => c.s),
      ...circuito.eje.filter((p, i, eje) => p.tipo === 'x' && eje[(i - 1 + eje.length) % eje.length].tipo !== 'x')
        .map((p) => [p.s, p.s])
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
