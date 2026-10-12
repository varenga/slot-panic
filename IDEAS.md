# IDEAS

Tormenta de ideas para **más adelante**. Nada de esto está comprometido: es el cajón
del que saldrán bloques cuando convenga. Cuando una idea entra en una fase, se pasa a
`TODO.md` (con su alcance real) y se quita de aquí; si se descarta, se apunta el motivo
en `BITACORA.md`.

**Ante una discrepancia, manda `TODO.md`.** Este archivo no fija nada.

Cada idea pasa por el mismo filtro:

1. **¿Hace la carrera más divertida?** Si solo la hace más bonita, tiene que ser barata.
2. **¿Funciona en el móvil?** Un dedo por jugador, apretar y soltar. Ninguna idea puede
   pedir un control que el táctil no tenga.
3. **¿Respeta el motor?** Píxeles y segundos, mandos como entradas, el decorado no pisa
   nada que juegue y no usa `Math.random()`.
4. **¿Lo puede medir el arnés?** Lo que toca la física o la pista llega con su prueba.

---

# 1. Circuitos de piezas y constructor

- El circuito se declara como una **lista de piezas** (recta, curva de 45° de radio 1,
  de 90° de radio 2…), como las cajas de slot. Hoy se declara como vértices con radio
  (`circuito.js`, heredado de Race Panic), y un circuito de piezas no usará ese módulo
  tal cual.
- Abre la puerta a un **constructor** para el jugador: elegir piezas, cerrar el
  circuito, correrlo. Y a compartirlo (un código corto, como el fantasma de Race Panic).
- **Cruces** (las piezas en X): vuelve la idea del ocho, sin puente.
- **El puente en el constructor**: donde el trazado se cruza, elegir cruce o puente. Hoy
  solo lo tiene *La diagonal* (`BITACORA.md`, rama `42`).

# 2. Coches y jugadores

- **Cambio de carril**, como los slot digitales: un toque doble cambia de carril en las
  zonas marcadas. Y cambio de carril de la CPU.
- **Niveles de CPU** (hoy una, `CPU_SLOT`).
- **Gatillo analógico en el móvil**: la altura del dedo como potencia. El teclado
  seguiría con el de toques.
  Probado en la lupa (11/10/2026, una franja de 240 px: abajo nada, arriba a fondo):
  cuesta dosificar, se va más lento o más rápido de lo que se quiere y hay que
  entrenarlo; a toques se juega desde el primer momento. Se quedó el hueco del dedo,
  sin gatillo. Si vuelve, quizá como opción para quien ya domina los toques.
- **Récords y fantasma** por circuito y carril.

# 3. Plataforma

Lo que comparte con Race Panic es casi todo **plataforma**, no juego: `i18n.js` (el
mecanismo), `audio.js` (`tone`, `noiseBurst`), la tabla de récords (`marcas.js` +
`api.php`, cambiando `GAME_SLUG`), `analitica.js`, `nucleo/lienzo.js`,
`nucleo/geometria.js`, la PWA, la app y las páginas por idioma.

Se comparte **copiando como plantilla** (los hermanos se leen, nunca se importan). Si
una misma corrección hay que portarla más de un par de veces, pasar a una carpeta común
sincronizada con un script y una prueba en cada arnés que compare su huella.

# 4. Más allá de los mejores momentos

Los mejores momentos ya se repiten al acabar (`BITACORA.md`, rama `34`). Lo que quedó fuera:

- **Compartir la repetición**: grabarla con `canvas.captureStream()` + `MediaRecorder`
  (WebM; en iOS, MP4) y pasarla a `navigator.share({ files })`. En la app, el plugin de
  compartir de Capacitor. Pesa: mejor en una fase propia.
- **En el campeonato, al final**, el mejor momento de cada carrera, seguidos.
- **El fantasma y las repeticiones con el mismo formato de poses**: hoy el fantasma graba
  a 1/30 s solo la pose y el búfer de momentos a 1/60 s con altura, estado, derrape y
  velocidad.

# 5. La pista de cuatro carriles

Recrear los circuitos clásicos de cuatro carriles: **cuatro coches**, como mucho dos
humanos (J1 y J2, cada uno con su mitad de la pantalla, como hoy) y la CPU con los otros.
En la lupa, el J1 contra tres CPU.

- **Circuitos sencillos**, para que quepan: la pista de cuatro carriles es el doble de
  ancha (hoy `ANCHO_PISTA` = 64 con dos carriles a ±`CARRIL`). Un óvalo, una judía o un
  ocho largo con alguna curva de radio distinto. Sin X ni estrechas: en el clásico de
  cuatro carriles no las hay.
- **Las mangas**: el carril de fuera es más largo que el de dentro, y con cuatro la
  diferencia ya no se arregla cambiando de carril cada carrera. En el clásico se corre
  una manga por carril y cada piloto pasa por los cuatro. Gana la suma de tiempos (o de
  vueltas en un tiempo fijo). Encaja con lo que ya hace `campeonato.js`.
- **Choques**: sin X ni cruces, los coches solo se tocan al salirse (uno fuera arrolla
  al de al lado) o si la mano lo posa encima de otro. Con cuatro, más tráfico: más mano.
- **Lo que hoy da por hecho que son dos**: `CARRILES` (dos laterales), `turno` (cambiar
  de carril cada carrera), `comprobarChoque` (con dos coches; con cuatro, cada par de
  vecinos), el marcador, el cartel de fin, los momentos, el fantasma y los récords
  (¿por carril?), el zumbido de los coches (cuatro a la vez) y la portada.
- **Arnés**: las secciones 1 a 3 con cuatro carriles (los de fuera también por el
  asfalto y lejos de otro tramo), ningún carril que se pase de lado en una curva a su
  punta, la diferencia entre carriles medida y compensada por las mangas.

Por decidir: si es un circuito (o varios) aparte, con su propio modo en la portada, o
una opción de cualquier circuito oficial que quepa; y si el constructor llega a dibujar
pistas de cuatro.

# 6. Partidas en línea

Dos jugadores, cada uno en su dispositivo. **Sin registro, sin chat y sin nada que se
compartan los jugadores** durante la partida: solo los coches.

**Cómo se entra** (por decidir; pueden convivir):

- **Sala privada con código**: uno crea la sala y le sale un código corto (4-5 letras sin
  las que se confunden: ni O/0 ni I/1) para pasárselo a quien quiera. El que crea elige
  el circuito, las vueltas y su coche; el otro, su coche.
- **Salas abiertas**: una lista de salas esperando rival (circuito, vueltas), o un botón
  de «partida rápida» que te mete en la primera libre o te crea una. Sin nombres: «Rival».
- Una sala que nadie usa caduca en unos minutos.

**La red.** Plesk sirve PHP + MySQL, sin un proceso que mantenga conexiones abiertas
(WebSocket). Opciones:

- **Sondeo a `api.php`**: cada 100-300 ms. Lo más sencillo, pero el retraso es mucho
  para ver al otro en un choque, y a ese ritmo carga el servidor.
- **WebRTC entre los dos**: `api.php` solo sirve para encontrarse (la sala, el código y
  el apretón de manos, unos pocos mensajes) y después los dos se hablan directamente por
  un canal de datos, con decenas de milisegundos de retraso. Hace falta un STUN (los hay
  públicos y gratuitos); entre algunas redes (móvil con NAT simétrica, empresas) no
  conecta sin un TURN, que es un servidor propio o de pago. Funciona en el navegador y
  en la WebView de la app. Ojo: cada uno ve la IP del otro, y la política de privacidad
  lo tiene que decir.
- **Un servidor de tiempo real aparte** (Node con WebSocket, fuera de Plesk o en un
  servicio): más control, pero otra pieza que mantener y pagar.

La recomendada, de entrada: WebRTC con `api.php` de señalización.

**Lo que viaja.** Lo bueno del slot: cada jugador tiene **un solo mando, un bit**
(`acelerar`), y la física es de paso fijo (`PASO_FISICA`). El que crea la sala es el
anfitrión y simula la carrera; el otro le manda su bit (solo cuando cambia, con el paso
en que cambió), y el anfitrión le devuelve 10-20 veces por segundo el estado de los dos
coches (s, velocidad, derrape, estado). El invitado simula su coche al momento (lo que
siente al apretar no espera a la red) y corrige suave hacia lo que dice el anfitrión.
No se puede fiar todo al determinismo: `Math.sin`, `Math.exp`… no dan el mismo último
bit en todos los motores de JavaScript, y la carrera se desviaría.

**Por decidir y medir**: si un choque se decide solo en el anfitrión (y el invitado lo
ve con retraso); qué pasa si uno se va (gana el otro, o la carrera sigue con la CPU); si
cuentan los récords (mejor no: no es una vuelta de un solo jugador); y cómo lo prueba
el arnés (dos carreras en Node conectadas por una red de mentira, con retraso y
pérdidas, que acaban igual que la del anfitrión).
