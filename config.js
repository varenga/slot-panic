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

export const DT_MAX = 0.05;        // s. Acota el salto tras cambiar de pestaña
export const PASO_FISICA = 1 / 120; // s. El fotograma se trocea en pasos de esto como mucho

/*
 * El panel de depuración solo aparece sirviendo en local. El `typeof` es
 * porque config.js también se importa desde Node, donde no hay `location`.
 */
export const DEPURACION = typeof location !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

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
 * El de Race Panic: 22×11 lógicos, que en pantalla son unos 16×8 px, sobre
 * una pista de 64.
 */
export const LARGO_COCHE = 22;
export const ANCHO_COCHE = 11;

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
export const VUELTAS_SLOT = 5;
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
 * - El CHOQUE: dos coches en el carril a menos de esto (en una X o un cruce)
 *   salen los dos. Menos que los 2 · CARRIL de dos carriles en paralelo.
 */
export const AGARRE_PERALTE = 1.4;
export const CURVA_DERRAPE = { acumula: 0.4, freno: 0.5, limite: 1, coleteo: 1.6 };
export const VELOCIDAD_BACHES = 330;    // px/s
export const CHOQUE = 14;               // px entre los centros de los dos coches
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
