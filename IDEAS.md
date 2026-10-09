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

# 2. Un escenario «juguete»

La estética de juguete como estética de todo el juego se probó y se descartó
(`BITACORA.md`): la de hoy, mezcla de slot y maqueta realista, va mejor con el día, el
atardecer, la noche y los escenarios. Pero la maqueta está hecha y guardada en la rama
`25-maqueta-juguete` (con `?juguete` en local), y podría volver como **un escenario más**,
al lado de verde, tierra, desierto y nieve:

- Una mesa de madera; bordes de plástico gris en vez de grava; pista negra con brillo,
  trencillas trenzadas y juntas marcadas; pianos impresos; gradas y neumáticos de
  plástico; en vez de árboles, tazas, latas, lápices, monedas, chapas, dados y piezas
  de construcción.
- Para que sea un escenario, lo que hoy decide el `JUGUETE` de `config.js` pasaría a
  decidirlo el escenario (`ESCENARIOS.juguete` en `escenarios.js`): sus colores de
  pista y piano, y qué pinta cada pieza del decorado.
- Lo que falta: las torres de iluminación como farolas de juguete; ver la noche (los
  faros y los halos sobre la madera); el aclarado de objetos (uno de cada tres) llevarlo
  al decorado, con sus propios pesos y tamaños, para que el arnés lo mida; y quizá otros
  suelos (alfombra, baldosa).

# 3. Coches y jugadores

- **Cambio de carril**, como los slot digitales: un toque doble cambia de carril en las
  zonas marcadas. Y cambio de carril de la CPU.
- **Niveles de CPU** (hoy una, `CPU_SLOT`).
- **Gatillo analógico en el móvil**: la altura del dedo como potencia. El teclado
  seguiría con el de toques.
- **Récords y fantasma** por circuito y carril.

# 4. Plataforma

Lo que comparte con Race Panic es casi todo **plataforma**, no juego: `i18n.js` (el
mecanismo), `audio.js` (`tone`, `noiseBurst`), la tabla de récords (`marcas.js` +
`api.php`, cambiando `GAME_SLUG`), `analitica.js`, `nucleo/lienzo.js`,
`nucleo/geometria.js`, la PWA, la app y las páginas por idioma.

Se comparte **copiando como plantilla** (los hermanos se leen, nunca se importan). Si
una misma corrección hay que portarla más de un par de veces, pasar a una carpeta común
sincronizada con un script y una prueba en cada arnés que compare su huella.

# 5. Los mejores momentos de cada carrera

Al acabar, repetir lo mejor de la carrera: el choque en la X, el adelantamiento en la
estrecha, la deslizante tomada al límite, la llegada al foto-finish. Hoy solo está
planteado; antes de entrar en `TODO.md` hay que decidir lo abierto (abajo).

**Es barato de grabar.** No hace falta volver a simular: basta con un **búfer de poses**.
En cada fotograma, de cada coche, `x`, `y`, `angulo`, `altura` (la mano) y el estado.
Son unos 16 bytes por coche y fotograma: a 60 fps, una carrera de 70 s ocupa ~140 KB,
también en el móvil. Los eventos que ya existen (`carrera.eventos`: choque, sale, clac,
vuelta, fin) se apuntan con su instante. Las chispas y el humo se vuelven a emitir a
partir de esos eventos al repetir, porque son cosmética.

> Volver a simular desde los mandos (la física es determinista y la CPU lleva semilla)
> ocuparía menos, pero `dt` cambia en cada fotograma y el último trozo de cada uno no
> mide `PASO_FISICA`: habría que grabar también `dt`. Las poses son más simples y no
> atan la repetición a la versión de la física.

**Qué es un momento** (lo detecta un módulo puro, `nucleo/momentos.js`, que el arnés puede
probar):

| Momento | Cómo se detecta | Ventana |
|---|---|---|
| Choque | evento `choque` (X, cruce o estrecha) | −2 s … +1,5 s |
| Salida espectacular | evento `sale` a más de ~380 px/s, o con trompo largo | −1,5 s … +2 s |
| Salvada | derrape > 0,8 sin llegar a salirse (sobre todo en la deslizante) | −1,5 s … +1 s |
| Adelantamiento | cambia el orden del `progreso`; mejor si es en una estrecha | −2 s … +1 s |
| Llegada ajustada | el segundo llega a menos de ~0,3 s (por su ritmo) | −3 s … +1 s |
| Vuelta rápida | la mejor vuelta de la carrera, si es de un humano | la última curva |

Cada momento suma puntos según el tipo y quién lo protagoniza (un humano vale más que la
CPU). Se eligen los 3 mejores que no se pisen.

**Cómo se ve**: con la cámara de la lupa (`crearCamara` / `seguirCamara`), siguiendo al
protagonista y algo más cerca, a cámara lenta (×0,5) alrededor del instante y con un
rótulo («¡CHOQUE EN LA X!», «¡SALVADA EN LA DESLIZANTE!»). En la mesa, la cámara también
sirve: la repetición ocupa todo el lienzo. Se puede saltar con un toque.

**En el campeonato**: al final, el mejor momento de cada carrera.

**Abierto** (por decidir antes de pasarlo a `TODO.md`):

- ¿Se repiten solos al acabar, o con un botón MOMENTOS en el cartel de fin? Solos alargan
  el fin; con botón, casi nadie los vería.
- ¿Cuánto dura todo? Con 3 momentos de ~4 s a cámara lenta, unos 20 s.
- **Compartir**: grabar la repetición con `canvas.captureStream()` + `MediaRecorder`
  (WebM; en iOS, MP4) y pasarla a `navigator.share({ files })`. En la app, el plugin de
  compartir de Capacitor. Pesa: mejor en una fase propia.
- Si llegan los récords con fantasma (§3), el fantasma y las repeticiones pueden
  compartir el formato de poses.

Filtro: hace la carrera más divertida (se revive lo que ha pasado y da qué contar), no
pide ningún control nuevo (un toque para saltar), no toca la física y lo que se detecta
lo puede medir el arnés.
