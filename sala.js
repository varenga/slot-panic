/*
 * Slot Panic — las pantallas de las carreras en red (MULTIJUGADOR.md §4).
 *
 * Tres, como la galería, sobre el lienzo y en la mesa y en la lupa:
 *
 *   EN RED   crear una sala o unirse a una; debajo, el motivo si la última se cerró.
 *   UNIRSE   el código en cuatro casillas y un teclado con solo las letras del
 *            código (NET_ALFABETO): con ▲▼, como la firma, eran hasta 15 toques
 *            por letra. Tecleado también. Los fallos se quedan aquí, junto al
 *            código, para corregir una letra sin escribirlo entero.
 *   LA SALA  el código en grande, los dos puestos (su color, su coche y si
 *            están) y, abajo, lo que arma el anfitrión: pista, circuito,
 *            vueltas, la CPU en la de cuatro y EMPEZAR. El invitado lo ve, sin
 *            tocarlo. Solo se sale con SALIR o Escape.
 *
 * Es presentación, como `menu.js`: no ve `net` ni la red. Lo pulsable se define
 * una vez (`cajasRed`, `cajasUnirse`, `cajasSala`), para el dibujo y la pulsación.
 */

import { COLOR, COLORES_COCHE, FUENTE } from './config.js';
import { ctx, rectanguloRedondo, texto } from './nucleo/lienzo.js';
import { boton } from './pantalla.js';
import { etiquetaOpcion } from './menu.js';
import { t } from './i18n.js';

const BARRA = 56, MARGEN = 14;

/** El color de cada puesto: el mismo en todos los dispositivos (MULTIJUGADOR.md §3). */
export const COLORES_RED = [COLORES_COCHE[0], COLORES_COCHE[1]];

/** Las filas de la sala que elige el anfitrión: la CPU, solo en la pista de cuatro. */
export const opcionesSala = (cuatro) => ['pista', 'circuito', 'duracion', ...(cuatro ? ['nivel'] : [])];

function fondo(vista, titulo) {
  const { ancho, alto } = vista;
  ctx.fillStyle = '#1b1e27';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ancho, BARRA);
  tituloBarra(titulo, ancho);
}

/*
 * El título de la barra: centrado en la mesa; en la lupa, a la derecha del
 * botón de volver, y más pequeño si no cabe (UNIRSE A UNA SALA, en gallego).
 */
function tituloBarra(titulo, ancho) {
  if (ancho > 800) {
    texto(titulo, ancho / 2, BARRA / 2 + 1, { tam: 22, color: COLOR.hud, peso: 800 });
    return;
  }
  const izquierda = MARGEN + cajaVolver(ancho).ancho + 12, sitio = ancho - MARGEN - izquierda;
  let tam = 22;
  ctx.font = `800 ${tam}px ${FUENTE}`;
  while (tam > 12 && ctx.measureText(titulo).width > sitio) ctx.font = `800 ${--tam}px ${FUENTE}`;
  texto(titulo, izquierda + sitio / 2, BARRA / 2 + 1, { tam, color: COLOR.hud, peso: 800 });
}

const cajaVolver = (ancho) => ({ id: 'volver', x: MARGEN, y: (BARRA - 36) / 2, ancho: Math.min(180, ancho / 3 - MARGEN), alto: 36 });

// --- EN RED: crear o unirse --------------------------------------------------------

/* Dos botones grandes, uno al lado del otro en la mesa y uno encima del otro en la lupa. */
export function cajasRed({ ancho, alto }) {
  const enFila = ancho > 800;
  const b = enFila ? { ancho: 380, alto: 200 } : { ancho: ancho - 2 * 40, alto: 180 };
  const centroY = (BARRA + alto) / 2;
  const cajas = ['crear', 'unirse'].map((id, i) => enFila
    ? { id, x: ancho / 2 + (i ? 20 : -20 - b.ancho), y: centroY - b.alto / 2, ...b }
    : { id, x: (ancho - b.ancho) / 2, y: centroY + (i ? 20 : -20 - b.alto), ...b });
  return [cajaVolver(ancho), ...cajas];
}

/* `motivo`: el de NET_MOTIVOS con que se cerró la última sala (o no se pudo crear), o null. */
export function dibujarRed(vista, { tactil, motivo }) {
  fondo(vista, t('red.titulo'));
  const cajas = cajasRed(vista);
  const { ancho } = vista;
  texto(t('red.intro'), ancho / 2, BARRA + 34, { tam: ancho > 800 ? 17 : 15, color: COLOR.texto, peso: 600 });
  for (const caja of cajas) {
    if (caja.id === 'volver') {
      boton(caja, t('galeria.volver'), false, 15);
      continue;
    }
    const destacado = caja.id === 'crear';
    ctx.fillStyle = destacado ? COLOR.ambar : 'rgba(43, 48, 64, 0.95)';
    rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 12);
    const tecla = tactil ? '' : (caja.id === 'crear' ? 'C · ' : 'U · ');
    texto(tecla + t('red.' + caja.id), caja.x + caja.ancho / 2, caja.y + caja.alto / 2 - 16, { tam: 32, color: destacado ? COLOR.fondo : COLOR.hud, peso: 800 });
    lineas(t('red.' + caja.id + 'Ayuda'), caja.x + caja.ancho / 2, caja.y + caja.alto / 2 + 28, caja.ancho - 24,
      { tam: 14, color: destacado ? COLOR.fondo : COLOR.texto, peso: 600 });
  }
  const abajo = Math.max(...cajas.map((c) => c.y + c.alto));
  if (motivo) lineas(t('red.motivo.' + motivo), ancho / 2, abajo + 40, ancho - 2 * MARGEN, { tam: 17, color: COLOR.rojo, peso: 700 });
}

/* Un texto que puede no caber en una línea (los motivos, en la lupa): lo parte en dos. */
function lineas(cadena, x, y, ancho, estilo) {
  ctx.font = `${estilo.peso} ${estilo.tam}px ${FUENTE}`;
  if (ctx.measureText(cadena).width <= ancho) {
    texto(cadena, x, y, estilo);
    return;
  }
  const palabras = cadena.split(' ');
  let corte = palabras.length;
  while (corte > 1 && ctx.measureText(palabras.slice(0, corte).join(' ')).width > ancho) corte--;
  texto(palabras.slice(0, corte).join(' '), x, y, estilo);
  texto(palabras.slice(corte).join(' '), x, y + estilo.tam * 1.35, estilo);
}

// --- UNIRSE: el código ------------------------------------------------------------

const LARGO_CODIGO = 4;

/*
 * Las casillas, el teclado (las letras del código y ⌫) y ENTRAR, centrados en
 * lo que queda bajo la barra. En la mesa, el teclado en dos filas de 16; en la
 * lupa, en cuatro de 8.
 */
export function cajasUnirse({ ancho, alto }, alfabeto) {
  const columnas = ancho > 800 ? 16 : 8;
  const teclas = [...alfabeto, '⌫'];
  const filas = Math.ceil(teclas.length / columnas);
  const hueco = 8;
  const lado = Math.min(62, Math.floor((ancho - 2 * MARGEN - (columnas - 1) * hueco) / columnas));
  const altoTecla = Math.min(56, lado);
  const casilla = 76, entreCasillas = 16;
  // De arriba abajo: el título, las casillas, el mensaje, el teclado y ENTRAR.
  const total = 40 + casilla + 64 + filas * (altoTecla + hueco) + 16 + 52;
  let y = BARRA + Math.max(16, (alto - BARRA - total) / 2) + 40;
  const cajas = [cajaVolver(ancho)];
  const x0 = ancho / 2 - (LARGO_CODIGO * casilla + (LARGO_CODIGO - 1) * entreCasillas) / 2;
  for (let i = 0; i < LARGO_CODIGO; i++) cajas.push({ id: 'casilla', i, x: x0 + i * (casilla + entreCasillas), y, ancho: casilla, alto: casilla });
  y += casilla + 64;
  const anchoTeclado = columnas * lado + (columnas - 1) * hueco;
  teclas.forEach((letra, k) => {
    const fila = Math.floor(k / columnas), columna = k % columnas;
    // La última fila, centrada.
    const enFila = fila === filas - 1 ? teclas.length - fila * columnas : columnas;
    const xFila = ancho / 2 - (enFila * lado + (enFila - 1) * hueco) / 2;
    cajas.push({
      id: letra === '⌫' ? 'borrar' : 'letra', letra, x: (fila === filas - 1 ? xFila : ancho / 2 - anchoTeclado / 2) + columna * (lado + hueco),
      y: y + fila * (altoTecla + hueco), ancho: lado, alto: altoTecla
    });
  });
  y += filas * (altoTecla + hueco) + 16;
  cajas.push({ id: 'entrar', x: ancho / 2 - 130, y, ancho: 260, alto: 52 });
  return cajas;
}

/* `codigo`: lo escrito (hasta 4). `motivo`: por qué no se pudo entrar, o null. */
export function dibujarUnirse(vista, { alfabeto, codigo, motivo, conectando, tactil, tiempo }) {
  fondo(vista, t('unirse.titulo'));
  const cajas = cajasUnirse(vista, alfabeto);
  const { ancho } = vista;
  const primera = cajas.find((c) => c.id === 'casilla');
  texto(t('unirse.pide'), ancho / 2, primera.y - 24, { tam: 17, color: COLOR.texto, peso: 600 });
  for (const caja of cajas) {
    if (caja.id === 'volver') boton(caja, t('galeria.volver'), false, 15);
    else if (caja.id === 'casilla') {
      const letra = codigo[caja.i];
      // La que toca escribir, con el borde en ámbar (y parpadeando si está vacía).
      const toca = !conectando && caja.i === Math.min(codigo.length, LARGO_CODIGO - 1) && codigo.length < LARGO_CODIGO;
      ctx.fillStyle = toca && Math.floor(tiempo * 2) % 2 ? COLOR.ambar : 'rgba(230, 232, 238, 0.18)';
      rectanguloRedondo(caja.x - 3, caja.y - 3, caja.ancho + 6, caja.alto + 6, 10);
      ctx.fillStyle = '#12141a';
      rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 8);
      if (letra) texto(letra, caja.x + caja.ancho / 2, caja.y + caja.alto / 2 + 2, { tam: 48, color: COLOR.hud, peso: 800 });
    } else {
      ctx.globalAlpha = conectando || (caja.id === 'entrar' && codigo.length < LARGO_CODIGO)
        || (caja.id === 'letra' && codigo.length >= LARGO_CODIGO) || (caja.id === 'borrar' && !codigo.length) ? 0.4 : 1;
      if (caja.id === 'entrar') boton(caja, t('unirse.entrar'), true, 20);
      else boton(caja, caja.letra, false, 22);
      ctx.globalAlpha = 1;
    }
  }
  const yMensaje = primera.y + primera.alto + 34;
  if (conectando) texto(t('red.conectando'), ancho / 2, yMensaje, { tam: 18, color: COLOR.hud, peso: 700 });
  else if (motivo) lineas(t('red.motivo.' + motivo), ancho / 2, yMensaje - (ancho > 800 ? 0 : 10), ancho - 2 * MARGEN, { tam: 16, color: COLOR.rojo, peso: 700 });
  else if (!tactil) texto(t('unirse.teclado'), ancho / 2, yMensaje, { tam: 13, color: COLOR.texto, peso: 500 });
}

// --- LA SALA ----------------------------------------------------------------------

/*
 * De arriba abajo: el código, los dos puestos (el propio, con ‹ › para el
 * coche) y las filas del anfitrión con EMPEZAR. `puesto`: el propio (0, el
 * anfitrión; 1, el invitado).
 */
export function cajasSala({ ancho, alto }, { puesto, cuatro }) {
  const lupa = ancho <= 800;
  const cajas = [{ ...cajaVolver(ancho), id: 'salir' }];
  let y = BARRA + (lupa ? 150 : 128);
  const entre = 20, anchoPuesto = Math.min(300, (ancho - 2 * MARGEN - entre) / 2), altoPuesto = 116;
  const x0 = ancho / 2 - anchoPuesto - entre / 2;
  for (let i = 0; i < 2; i++) {
    const x = x0 + i * (anchoPuesto + entre);
    cajas.push({ id: 'puesto', i, x, y, ancho: anchoPuesto, alto: altoPuesto });
    if (i === puesto) {
      const lado = 40, yFlechas = y + altoPuesto - lado - 10;
      cajas.push({ id: 'modelo', paso: -1, x: x + 10, y: yFlechas, ancho: lado, alto: lado });
      cajas.push({ id: 'modelo', paso: 1, x: x + anchoPuesto - 10 - lado, y: yFlechas, ancho: lado, alto: lado });
    }
  }
  y += altoPuesto + (lupa ? 34 : 22);
  const fila = lupa ? 48 : 40, hueco = 8, anchoFila = Math.min(460, ancho - 2 * MARGEN);
  for (const opcion of opcionesSala(cuatro)) {
    cajas.push({ id: 'opcion', opcion, x: ancho / 2 - anchoFila / 2, y, ancho: anchoFila, alto: fila });
    y += fila + hueco;
  }
  cajas.push({ id: 'empezar', x: ancho / 2 - 130, y: Math.min(y + 8, alto - 70), ancho: 260, alto: 52 });
  return cajas;
}

/*
 * `sala`: { codigo, puesto, compa, enSala, modelos }. `e`: lo que enseñan
 * las filas (circuito, duracion, nivel), el de la sala; `manga` ({ n, total }),
 * a media serie de mangas: EMPEZAR corre la siguiente. Encima del mundo (la
 * exhibición en el circuito elegido), con un velo.
 */
export function dibujarSala(vista, sala, e, { tactil, tiempo, manga = null }) {
  const { ancho, alto } = vista;
  const lupa = ancho <= 800;
  ctx.fillStyle = 'rgba(18, 20, 26, 0.82)';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = COLOR.banda;
  ctx.fillRect(0, 0, ancho, BARRA);
  tituloBarra(t('sala.titulo'), ancho);
  const anfitrion = sala.puesto === 0;
  const cajas = cajasSala(vista, { puesto: sala.puesto, cuatro: e.circuito.carriles.length === 4 });
  // El código, en grande: lo que el anfitrión tiene que pasar.
  const yCodigo = BARRA + (lupa ? 74 : 62);
  texto(t('sala.codigo'), ancho / 2, BARRA + 26, { tam: 14, color: COLOR.texto, peso: 700 });
  if (sala.codigo) texto(sala.codigo.split('').join(' '), ancho / 2, yCodigo, { tam: lupa ? 56 : 52, color: COLOR.ambar, peso: 800 });
  else texto(t('red.conectando'), ancho / 2, yCodigo, { tam: 22, color: COLOR.hud, peso: 700 });
  if (sala.codigo && anfitrion && !sala.compa) {
    texto(t('sala.pasalo'), ancho / 2, yCodigo + (lupa ? 50 : 42), { tam: 14, color: COLOR.texto, peso: 600 });
  }
  for (const caja of cajas) {
    if (caja.id === 'salir') boton(caja, (tactil ? '' : 'Esc · ') + t('sala.salir'), false, 15);
    else if (caja.id === 'puesto') puesto(caja, sala, tiempo);
    else if (caja.id === 'modelo') boton(caja, caja.paso < 0 ? '‹' : '›', false, 24);
    else if (caja.id === 'opcion') {
      // El invitado ve lo que elige el anfitrión, apagado: no se toca.
      ctx.globalAlpha = anfitrion ? 1 : 0.55;
      boton(caja, etiquetaOpcion(caja.opcion, e, !tactil && anfitrion), false, lupa ? 17 : 15);
      ctx.globalAlpha = 1;
    } else if (caja.id === 'empezar') {
      const rotulo = manga && t('manga.n', manga);
      if (!anfitrion) {
        const espera = t('sala.esperaAnfitrion');
        texto(rotulo ? `${rotulo} · ${espera}` : espera, ancho / 2, caja.y + caja.alto / 2, { tam: 15, color: COLOR.texto, peso: 600 });
        continue;
      }
      // La revancha espera a que el otro haya vuelto a la sala.
      ctx.globalAlpha = sala.compa && sala.enSala ? 1 : 0.4;
      boton(caja, (tactil ? '' : '↵ · ') + (rotulo || t('sala.empezar')), true, rotulo ? 18 : 20);
      ctx.globalAlpha = 1;
    }
  }
  if (!tactil) {
    const ultima = cajas[cajas.length - 1];
    texto(t('sala.teclaCoche'), ancho / 2, Math.min(alto - 12, ultima.y + ultima.alto + 22), { tam: 12, color: COLOR.texto, peso: 500 });
  }
}

/* Un puesto: su color, quién es (TÚ o RIVAL), su coche y si está. */
function puesto(caja, sala, tiempo) {
  const { i } = caja;
  const propio = i === sala.puesto;
  const esta = propio || sala.compa;
  const color = COLORES_RED[i];
  ctx.fillStyle = propio ? 'rgba(230, 232, 238, 0.12)' : 'rgba(230, 232, 238, 0.06)';
  rectanguloRedondo(caja.x, caja.y, caja.ancho, caja.alto, 10);
  ctx.fillStyle = color;
  rectanguloRedondo(caja.x, caja.y, 8, caja.alto, 4);
  const cx = caja.x + caja.ancho / 2;
  const quien = t(propio ? 'sala.tu' : 'sala.rival') + (i === 0 ? ` · ${t('sala.anfitrion')}` : '');
  texto(quien, cx, caja.y + 22, { tam: 15, color, peso: 800 });
  if (!esta) {
    // Esperando a alguien: tres puntos que se encienden por turno.
    const n = Math.floor(tiempo * 2.5) % 4;
    texto(t('sala.esperando') + '.'.repeat(n), cx, caja.y + caja.alto / 2 + 8, { tam: 15, color: COLOR.texto, peso: 600 });
    return;
  }
  const modelo = sala.modelos[i];
  texto(modelo ? t('coche.' + modelo) : '…', cx, caja.y + caja.alto - 30, { tam: 17, color: COLOR.hud, peso: 700 });
  // El otro, aún en el cartel de fin de la anterior: el anfitrión no puede empezar todavía.
  const fuera = !propio && sala.puesto === 0 && !sala.enSala;
  const estadoPuesto = propio ? 'sala.tuCoche' : fuera ? 'sala.enCarrera' : 'sala.conectado';
  texto(t(estadoPuesto), cx, caja.y + 50, { tam: 12, color: propio || fuera ? COLOR.texto : COLOR.verde, peso: 600 });
}
