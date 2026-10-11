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
