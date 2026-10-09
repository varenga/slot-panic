/*
 * Slot Panic — constantes y paleta.
 *
 * Este módulo no importa nada: es la raíz del grafo de dependencias, y
 * cualquier número que haya que tocar para calibrar el juego vive aquí.
 * Todas las magnitudes físicas van en píxeles lógicos y segundos.
 */

// Raíz de todas las claves de localStorage del juego.
export const GAME_SLUG = 'slotpanic';

/*
 * Dónde se publica, con barra final: slot.pnyk.es, como Race (race.pnyk.es)
 * y Orbit (orbit.pnyk.es). Lo usan las URL absolutas de index.html
 * (canonical, Open Graph); el juego navega siempre con rutas relativas.
 */
export const SITE_ORIGIN = 'https://slot.pnyk.es/';

/*
 * Resolución lógica, la misma que Rail Panic. El CSS deja el lienzo en 960 px
 * de ancho como mucho, así que un píxel lógico mide 0,75 px reales: el coche
 * y la pista se ven un 25 % más pequeños de lo que dicen sus números.
 */
export const ANCHO = 1280;
export const ALTO = 720;

/*
 * El modo lupa (`lupa.js`): el móvil en vertical, un jugador contra la CPU.
 * El lienzo tiene ANCHO_LUPA de ancho y el alto de la proporción de la
 * pantalla (de 9:16 a ALTO_LUPA_MAXIMO): los móviles son más alargados que
 * 9:16 y con un lienzo fijo quedaban bandas. Enseña el mundo ampliado
 * alrededor del J1, con el mapa del circuito arriba. Sus píxeles lógicos son
 * los de la pantalla, no los del mundo: el mundo entra con la cámara, a
 * LUPA_ZOOM (se prueba otro con ?lupa=1.5).
 */
export const ANCHO_LUPA = 540;
export const ALTO_LUPA = 960;           // el alto mínimo: 9:16
export const ALTO_LUPA_MAXIMO = 1400;   // 9:23; más alargado, con bandas
export const MAPA_CRECE = 0.4;          // del alto que pasa de ALTO_LUPA, lo que se lleva el mapa
export const LUPA_ZOOM = 1.2;           // px del lienzo por px del mundo
export const LUPA_GIRO = 0.3;           // s: la dirección en que mira la vista recorre 2/3 de lo que le falta
export const LUPA_ADELANTO = 70;        // px de pista por delante del coche de los que se toma esa dirección
export const LUPA_MIRA = 160;           // px que la vista se adelanta al coche en esa dirección

export const DT_MAX = 0.05;       // s. Acota el salto tras cambiar de pestaña
export const PASO_FISICA = 1 / 120; // s. El fotograma se trocea en pasos de esto como mucho

/*
 * El panel de depuración solo aparece sirviendo en local. El `typeof` es
 * porque config.js también se importa desde Node, donde no hay `location`. Y
 * nunca en la app: dentro de Capacitor el origen es https://localhost.
 */
export const DEPURACION = typeof location !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !enApp();

/*
 * ¿Dentro de la app de las tiendas? Capacitor deja `window.Capacitor` antes de
 * que corra la página. Es el único sitio del juego que sabe que Capacitor
 * existe (APP.md §5): el resto pregunta enApp(). En el navegador y en Node,
 * false.
 */
export function enApp() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  return Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

// --- El coche -------------------------------------------------------------

/*
 * 31×15,5 lógicos (en pantalla, unos 22×11 px) sobre una pista de 64: el de
 * Race Panic (22×11) a ×1,4, que en la pista se perdía. Entre los dos coches
 * en paralelo quedan 14 px, y 9 hasta el borde del asfalto. Los modelos
 * (coches.js) se escalan con él; el CHOQUE también.
 */
export const LARGO_COCHE = 31;
export const ANCHO_COCHE = 15.5;

// --- Pianos y escapatorias ----------------------------------------------------

/*
 * La pista es la de Race Panic: asfalto, pianos en las curvas, grava y un muro
 * de neumáticos al fondo. Aquí solo se dibuja (y el decorado se mide desde el
 * muro); el coche de slot no la pisa: va en el carril o vuela por la mesa.
 */
export const ANCHO_PIANO = 10;          // px por fuera del asfalto, en las curvas
export const ESCAPATORIA = 26;          // px de grava hasta el muro
export const ESCAPATORIA_CURVA = 50;    // px por fuera de las curvas
export const ESCAPATORIA_DERRAPE = 80;  // px por fuera de una curva de derrape: es la pieza ancha
export const PENDIENTE_MURO = 0.5;      // px de cambio del muro por px de pista

// --- La pista y la carrera --------------------------------------------------

export const ANCHO_PISTA = 64;
export const PASO_EJE = 6;            // px entre puntos del eje al muestrear las curvas
export const VENTANA_PROYECCION = 40; // puntos del eje que se miran a cada lado del anterior
export const CUENTA_ATRAS = 3;        // s
export const DURACION_SALIDA = 0.9;   // s que se ve el semáforo en verde
export const ESPERA_REINICIO = 0.6;   // s antes de aceptar la tecla que reinicia

// --- El coche en el carril -------------------------------------------------

/*
 * Los coches van enganchados a un carril: no hay volante, solo se aprieta o
 * se suelta.
 *
 * El primer playtest: «engancha», pero con dos estados (a tope o parado) no se
 * podía dosificar, soltar frenaba demasiado, se salía en todas las curvas
 * (incluso arrancando parado en ellas) y no había derrape: de ir bien a
 * salirse sin aviso. Por eso:
 *
 * - La POTENCIA no salta: sigue al dedo con retraso. A toques se queda a
 *   medias (la mitad del tiempo pulsado da ~0,4), como el gatillo del mando
 *   del juguete. Si subiera y bajara a ritmo fijo, a toques se quedaba en
 *   nada o en todo (lo midió el arnés).
 * - El motor lleva el coche hacia potencia × VELOCIDAD_SLOT con inercia; al
 *   soltar, rueda y se frena poco a poco (más deprisa cuanto más corre).
 * - Pasado AGARRE_SLOT el coche DERRAPA: la cola sale de lado y pierde
 *   velocidad. Solo se sale si sigue pasado (el derrape se acumula) o si entra
 *   muy pasado (LIMITE_SLOT).
 */
export const CARRIL = 15;               // px del eje a cada carril
export const VUELTAS_SLOT = 5;          // las de la carrera normal: las de serie y las del arnés
/*
 * Las carreras que se eligen en la portada (tecla V), de la corta a la larga.
 * Las vueltas no cambian la física ni la CPU: una carrera larga castiga más
 * salirse a menudo y deja remontar más. Los récords son de vuelta, así que no
 * dependen de esto; el campeonato corre todas sus carreras con las elegidas.
 */
export const CARRERAS = [
  { id: 'rapida', vueltas: 3 },
  { id: 'normal', vueltas: VUELTAS_SLOT },
  { id: 'resistencia', vueltas: 10 }
];
export const PASO_FANTASMA = 1 / 30;    // s entre muestras de una vuelta grabada (nucleo/fantasma.js)
export const VELOCIDAD_SLOT = 470;      // px/s con la potencia a tope
export const SUBE_POTENCIA = 0.35;      // s: pulsando, la potencia recorre 2/3 de lo que le falta
export const BAJA_POTENCIA = 0.25;      // s: soltando, pierde 2/3 de la que tiene
export const INERCIA_MOTOR = 0.85;      // s: lo que tarda en ganar ~2/3 de la velocidad que pide la potencia
export const INERCIA_SOLTAR = 1.1;      // s: soltando, pierde 1 px/s por cada 1,1 px que rueda
export const AGARRE_SLOT = 800;         // px/s² laterales a partir de los que derrapa (era 1000: por fuera, la
                                        // curva de 80 se pasaba a tope, frenando solo con el derrape)
/*
 * La guía del coche sujeta más en las curvas cerradas: para el agarre, ningún
 * carril cuenta como más cerrado que esto. Con el agarre, se eligen para que
 * las cerradas admitan lo mismo que tras el segundo playtest («difíciles pero
 * aceptables»): √(800 · 56) ≈ √(1000 · 45) ≈ 212 px/s. Sin ello, por dentro de las curvas
 * de 40 y de la horquilla (radio 25 y 30) un piloto que reacciona un poco
 * tarde se salía todas las vueltas, y por fuera casi nunca (segundo
 * playtest). Sumar un radio fijo a todas arreglaba eso pero daba agarre a las
 * abiertas, y a fondo por fuera ya no se salía.
 */
export const RADIO_GUIA = 56;           // px
export const LIMITE_SLOT = 2.4;         // veces el agarre a partir de las que se sale sin más (era 2: por dentro
                                        // de las cerradas se salía sin llegar a derrapar)
export const ACUMULA_DERRAPE = 3;       // por s y por cada vez el agarre que se pasa
export const RECUPERA_DERRAPE = 2.5;    // por s, sin pasarse
export const FRENO_DERRAPE_SLOT = 8;    // 1/s de velocidad perdida por cada vez el agarre que se pasa
export const COLETEO_DESDE = 0.6;       // fracción del agarre a partir de la que la cola sale
export const COLETEO_MAXIMO = 0.35;     // rad de cola fuera al llegar al agarre
export const COLETEO_DERRAPE = 0.6;     // rad más con el derrape a punto de salirse
export const FRENO_MESA = 520;          // px/s² con que frena dando vueltas por la mesa
export const GIRO_TROMPO = 14;          // rad/s de trompo al salirse a tope
export const ESPERA_MANO = 0.35;        // s parado antes de que llegue la mano
export const DURACION_MANO = 0.4;       // s que tarda la mano en devolverlo al carril
export const FUERA_MAXIMO = 2.2;        // s fuera, como mucho, antes de que llegue la mano
/*
 * Las piezas especiales (`nucleo/piezas.js`). Cambian lo que el coche aguanta
 * en ellas; la geometría la dan sus datos.
 *
 * - El PERALTE agarra más: el radio con que se mide el agarre se multiplica.
 * - La CURVA DE DERRAPE es ancha y plana: se puede entrar pasado y la cola
 *   sale mucho, porque el derrape se acumula más despacio y frena menos (sale
 *   un 2-3 % más rápido de ella). El límite para salirse de golpe es el de
 *   siempre (`limite` lo multiplica): con él más alto se pasaba a tope, porque
 *   el propio derrape frena el coche hasta que agarra. Por eso son cerradas
 *   (radio 95).
 * - Los BACHES sacuden la guía: en la recta agarra como en una curva, y por
 *   encima de VELOCIDAD_BACHES derrapa.
 * - En la ESTRECHA los carriles se acercan al eje hasta ESTRECHA veces su
 *   distancia: a la par, dos coches se tocan (a 2 · CARRIL · ESTRECHA, menos
 *   que CHOQUE). Es la chicane del juguete: adelantar ahí es arriesgarse.
 * - La CURVA DESLIZANTE es amplia, resbaladiza y estrecha: se toma derrapando.
 *   Hasta `tolera` veces el agarre de más, la cola sale mucho y frena, pero el
 *   derrape no se acumula; pasado eso, sí, y a fondo se sale como en todas.
 * - El CHOQUE: dos coches en el carril a menos de esto (en una X, un cruce o una estrecha)
 *   salen los dos. Menos que los 2 · CARRIL de dos carriles en paralelo, y
 *   crece con el coche: se chocan cuando se ve que se tocan (era 14 con el
 *   coche de 22×11).
 */
export const AGARRE_PERALTE = 1.4;
export const CURVA_DERRAPE = { acumula: 0.4, freno: 0.5, limite: 1, coleteo: 1.6, tolera: 0 };
export const CURVA_DESLIZANTE = { acumula: 2, freno: 0.1, limite: 1, coleteo: 2.2, tolera: 0.25 };
export const ESTRECHA = 0.4;            // fracción de CARRIL a la que se acercan los carriles
export const VELOCIDAD_BACHES = 330;    // px/s
export const CHOQUE = 20;               // px entre los centros de los dos coches
/*
 * La CPU que lleva el carril que nadie toca (ver `crearPiloto`). Perfecta, «no
 * había quien le ganara» (0,7 s por vuelta del mejor piloto); con 0,95 ± 30 % y
 * un 8 % de fallos, «ahora es fácil» (2 s). Esta deja ~0,9 s.
 */
export const CPU_SLOT = { prudencia: 1.2, variacion: 0.25, fallo: 0.05 };
/*
 * J1 a la izquierda del teclado y J2 a la derecha; en el móvil, cada mitad de
 * la pantalla.
 */
export const CONTROLES_SLOT = [
  ['KeyW', 'KeyA', 'ShiftLeft', 'Space'],
  ['ArrowUp', 'KeyL', 'ShiftRight', 'Numpad0']
];
export const TECLAS_BLOQUEADAS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

// --- Paleta -----------------------------------------------------------------

// La de Race Panic (y Rail Panic), para que se lean como hermanos.
export const COLOR = {
  fondo: '#12141a',
  hierba: '#1b1e26',
  calzada: '#2c313f',
  borde: '#5b6478',
  eje: '#3a4152',
  piano: '#e05a63',
  pianoClaro: '#c9ccd6',
  cocheCabina: '#1b1e26',
  hud: '#e6e8ee',
  texto: '#8b93a7',
  ambar: '#f2cd68',
  verde: '#4fbf7a',
  rojo: '#e05a63',
  cocheSlot: ['#e05a63', '#88aede'],   // J1 rojo, J2 azul
  ranura: '#0b0c10',
  carril: '#aab1c0',
  velo: 'rgba(18, 20, 26, 0.82)',
  panel: 'rgba(18, 20, 26, 0.72)',
  banda: 'rgba(18, 20, 26, 0.62)'
};

export const FUENTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';
