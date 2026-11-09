# Slot Panic en red

Cómo correr en Slot Panic contra otras personas, **cada una en su dispositivo**, sin que deje
de ser el juego de un dedo que ya es. Es la Fase 6 del `TODO.md`, pero el diseño vive aquí: toca
reglas, red, el servidor de salas común y privacidad, y hay que poder leerlo de una vez. El
camino, por bloques, está en §10, y las casillas en el `TODO.md`.

Sigue los pasos del cooperativo de Orbit Panic (`C:\html\orbitpanic\MULTIJUGADOR.md`), y hereda
lo que allí ya está resuelto: la prueba de red en Plesk (su bloque 0, superada), el servidor de
salas común (`salas.pnyk.es`, repositorio `C:\html\salas`) y su cliente, `net.js`, en
`pnyk/comun/`. Se escribe en presente de intención, como el README y `APP.md`. Sustituye a la
sección «Partidas en línea» de `IDEAS.md`.

## 1. El principio

Una persona crea una sala y recibe un código. Las demás lo escriben y entran. Sin cuentas, sin
lista de salas y sin nadie más: quien no tiene el código no entra. Corren unas contra otras,
como en la mesa, y sus coches chocan como en la mesa.

**De dos a cuatro, por fases.** Primero a dos, con el servidor de salas tal como está: en la pista
de dos carriles, o en la de cuatro con dos coches de la CPU. Después, en un bloque propio (S4,
§5.2), el servidor admite salas de hasta cuatro y la pista de cuatro se llena de personas.

De ahí salen las reglas de esta fase:

* **Lo más simple que funcione.** Cuando dos opciones valen, gana la que tiene menos piezas.
* **La carrera de siempre no cambia.** Ni su física, ni sus récords, ni su forma de funcionar
  sin red: el arnés tiene que dar las mismas cifras.
* **Ningún control nuevo.** Sigue en pie la regla de `CLAUDE.md`: ninguna mecánica puede exigir
  un control que el móvil no tenga. En red cada uno tiene la pantalla entera para su dedo.
* **El gatillo no espera a la red.** Todo el juego es soltar a tiempo antes de la curva: si el
  coche propio respondiera con el retardo de la red, se saldría donde en la mesa no se sale.

La pregunta del README sigue siendo el filtro de cada añadido: «¿hace la carrera más divertida?».

## 2. Decisiones

| Decisión | Elegido | Motivo |
|---|---|---|
| Conexión | El servidor de salas común (WebSocket) | Ya está montado, medido (p50 80 ms entre jugadores) y dado de alta para Slot en el plan de Orbit (§12 de su documento) |
| Quién simula | Cada coche, quien lo conduce; el anfitrión arbitra | El gatillo no espera a la red, y lo que ves es lo que corres (§6). La física es de paso fijo, pero `Math.sin` o `Math.exp` no dan el mismo último bit en todos los motores: un *lockstep* puro acabaría desviándose |
| Choques y ganador | El anfitrión | Alguien tiene que ver a todos a la vez; el golpe viaja a quien lo recibe |
| Jugadores | Dos primero; hasta cuatro con el bloque S4 | Dos no tocan el servidor; cuatro cambian `salas.js` y `net.js`, que comparte Orbit |
| Récords | No cuentan | La vuelta de un invitado pasa por la red y el anfitrión decide sus choques: no es una vuelta de un solo jugador |

**Por qué no WebRTC**, que es lo que recomendaba `IDEAS.md`: el servidor de salas ya existe, va
por el 443 y la otra persona no ve tu IP. WebRTC necesitaría un TURN para algunas redes y una
política de privacidad que contara la IP del otro.

## 3. Reglas

* **La sala la arma el anfitrión**: pista (dos o cuatro carriles), circuito y vueltas. El circuito
  puede ser oficial o uno suyo del constructor o de la galería: viaja como su código (`?c=`), que
  ya es corto y lo valida `validarTrazado` al llegar.
* **Cada uno, su coche**: elige el modelo (`COCHES`) en la sala. El color es el del puesto, igual
  en todos los dispositivos, para que nadie dude de cuál es el suyo.
* **Los carriles**, como en la mesa: el coche del puesto `i` va por `(i + turno) % carriles`, y el
  `turno` cambia en cada carrera. En la pista de cuatro, los puestos vacíos los lleva la CPU, con
  el nivel que elige el anfitrión. Los circuitos de mangas se corren en mangas (`estado.serie`), y
  gana la menor suma, como siempre.
* **La salida espera a todos**: la cuenta atrás no empieza hasta que cada persona apoya el dedo
  (o la tecla), como `estado.espera` en la mesa. Quien no lo apoya en 20 s sale con el coche parado,
  y lo puede coger en cuanto pulse.
* **Salirse, la mano y los choques**, los de siempre. Los decide el anfitrión.
* **La sala sigue tras la carrera.** Al acabar, el cartel de fin y la repetición; después, todos
  vuelven a la sala y el anfitrión lanza otra (la revancha, con el turno cambiado). Las carreras
  de Slot duran uno o dos minutos: una sala de una sola carrera obligaría a repetir el código cada vez.
* **Sin récords ni fantasma** (§7). La repetición de los mejores momentos sí: cada uno ve la suya,
  grabada de lo que vio.
* **Preferencias locales**: idioma, sonido, escenario, hora, lupa y rendimiento. El escenario y la
  hora son cosméticos (`CLAUDE.md`): cada uno corre en la mesa que le guste.
* **La lupa**, en vertical, sigue al coche propio, no al coche 0.

Las cifras son puntos de partida para jugar, como en el resto del `TODO.md`. El ajuste se apunta
en `BITACORA.md`.

## 4. Salas y pantallas

* En la portada, en el grupo **CARRERA**, junto a cuántos juegan, **EN RED**, con dos opciones:
  crear sala y unirse.
* El código, el del servidor común: 4 caracteres de `NET_ALFABETO`, sin los que se confunden.
* Pantallas nuevas en un módulo propio, `sala.js`, como `menu.js`: presentación, y la misma
  función da la caja para dibujar y para pulsar. También en la lupa. Los textos, en `idiomas/`.
  * **Unirse**: el código en cuatro casillas, tecleado o con un teclado en el lienzo que solo tiene
    las letras del código (y ⌫). Con ▲▼ por casilla, como la firma, eran hasta 15 toques por letra.
    Tocar una casilla borra desde ella. Los fallos —no existe, llena, demasiados
    intentos, sin red, versión— se quedan aquí, junto al código, para corregirlo sin escribirlo entero.
  * **La sala**: el código en grande mientras se espera; los puestos, con su color, su coche y si
    están conectados; el anfitrión ve además circuito, pista, vueltas y EMPEZAR. De aquí solo se sale
    con Escape o con el botón, para que un toque perdido no cierre la sala a quien entra.
  * **El motivo del cierre**, uno por cada motivo de `NET_MOTIVOS`.

**Desconexiones**, sin reconexión:

* **Cae un invitado** a mitad de carrera: su coche lo coge la CPU y la carrera sigue; al acabar,
  su puesto queda libre. En la sala, su puesto se vacía.
* **Cae el anfitrión**: la carrera acaba para todos, con el aviso y la clasificación que había.
  Sin migración de anfitrión.
* **Sin red o sin servidor**: mensaje claro al crear o unirse. Jugar sin red sigue funcionando
  entero, también offline y en la app.

## 5. El servidor de salas

Es el común (`C:\html\salas`, su `README.md`): no conoce el juego, empareja y reenvía. Para Slot:

* **Alta**: `'slot-panic': ['https://slot.pnyk.es', ...APP]` en `salas/juegos.js`, push (=
  despliegue) y `node comprobar.js wss://salas.pnyk.es/ws https://slot.pnyk.es slot-panic`.
* **Cliente**: `vendor/pnyk/net.js` con `propagar.js` (comun 1.3.0). `juego.js` pone
  `net.juego = 'slot-panic'` y `net.version`, la de los mensajes de §6, que sube cuando cambian.
* **Sitio**: aquí `vendor/pnyk/` sí se sirve (el `.htaccess` no lo deniega, y de ahí cargan ya
  `red.js`, `pie.js` y `consentimiento.js`), así que no se copia a la raíz como en Orbit: va en
  `CLASICOS` de `tools/gen-pages.mjs`, que lo pone en un `<script>` antes que `juego.js` y en
  `PRECACHE`. Es un script clásico: `net` queda en el ámbito global (un `const`, no en `window`), y
  `juego.js` lo lee con `typeof net`.
* **En local**, `npm run dev` en `C:\html\salas` (puerto 3001); `net.js` lo busca solo cuando la web
  se sirve por `http://`. `?lag=` y `?jitter=` simulan una mala red.

### 5.1. A dos

Con el servidor de hoy, sin cambios: un anfitrión y un invitado, `compa` cuando entra y `cierre`
con `compa` cuando uno se va. Basta para el bloque G.

### 5.2. Bloque S4: salas de hasta cuatro

El servidor y `net.js` pasan a admitir salas de más de dos, **sin cambiar las de dos**, que son las
de Orbit y las de su app de Play, que tarda en actualizarse:

* `{"t":"crear","max":4}`: la sala admite hasta `max` (2 a 4). Sin `max`, 2, como hoy.
* `{"t":"sala","codigo","rol","puesto"}`: el invitado sabe su puesto (1 a 3); el anfitrión es el 0.
* `{"t":"compa","puesto"}` al anfitrión cuando entra alguien; `{"t":"sale","puesto"}` cuando un
  invitado se va de una sala de más de dos, que sigue abierta. Si se va el anfitrión, `cierre` a todos.
* `{"t":"m","d","de"}`: el anfitrión recibe de cada invitado con su puesto; lo del anfitrión va a
  todos los invitados, o a uno con `para`. Los invitados no se hablan entre sí: no lo necesitan.
* `llena` cuando ya hay `max`. Los topes por IP siguen igual: cuatro móviles en la misma wifi son 4
  de las 6 conexiones por IP.
* **Despliegue**: el servidor antes que el cliente. Es una ampliación: un cliente sin `max` no ve
  diferencia, así que `SERVIDOR` no sube y Orbit no cambia. `net.js` va a comun 1.4.0, con
  `net.alSale(puesto)`, `net.puesto` y `net.enviar(datos, para)`.
* **La política común** de pnyk.es dice hoy «Jugar a dos» y «los dos jugadores»: pasa a «Jugar con
  otras personas», en `pnyk/i18n.js` y sus páginas.

## 6. Red en el juego

`nucleo/` sigue sin saber del DOM ni de la red. Lo de la red se reparte así:

* **`nucleo/red.js`**, puro, como el resto del núcleo: hace y aplica los mensajes. Lo prueba el
  arnés sin sockets (§11).
* **`juego.js`**, el único que ve `net`: conecta, manda lo que `red.js` prepara y le pasa lo que llega.
* **`sala.js`**, las pantallas de §4.

| Qué | Quién decide | Cómo viaja |
|---|---|---|
| Cada coche de una persona: su física, sus salidas, la mano y sus vueltas | Quien lo conduce | Reporte a 30 Hz al anfitrión |
| Los choques entre coches | Anfitrión | Un golpe a quien lo recibe, en el acto |
| Su coche, los de la CPU, la fase y el ganador | Anfitrión | Instantáneas a 20 Hz |
| La sala: circuito, vueltas, coches, `turno`, empezar | Anfitrión | Un mensaje al cambiar |
| Sonido, partículas, chirrido y vibración | Cada lado | Los eventos, con azar local |

**El primer diseño** —el anfitrión simula toda la carrera y el invitado adelanta su coche en su
pantalla y lo corrige— se descartó en el bloque A, antes de escribirlo: el anfitrión vería soltar el
gatillo unos 60 ms tarde, y un coche que en la pantalla del invitado pasaba la curva se saldría en la
suya. Así que el coche es de quien lo conduce, como la nave del invitado en Orbit («lo que ves es lo
que te mata»), y en los demás es `remoto` (`slot.js`): no se simula, solo rueda con lo que su dueño
dijo la última vez.

* **La misma hora de carrera.** Cada uno cuenta el tiempo de carrera desde su propia salida, y la
  del invitado es la del anfitrión cuando le llega: a la misma hora de carrera, todos están a la par.
  Lo que llega se lleva a la hora propia: el anfitrión adelanta un reporte lo que tardó en llegarle
  más lo que el invitado salió después (unos 120 ms con 60 de ida), y un invitado, casi nada (lo que
  tardó la instantánea menos lo que él salió después). Las vueltas y la llegada de cada coche son las
  de su dueño, en su reloj de carrera: gana el menor, y el anfitrión cambia el ganador si un reporte
  trae una llegada anterior a la que dio por buena.
* **Los reportes** (`{k:'c', t, ag, c}`): la hora de carrera del invitado, el último golpe que ha
  aplicado y su coche. Las **instantáneas** (`{k:'s', t, f, cu, g, c, e}`): la hora, la fase, la
  cuenta, el ganador, cada coche y los eventos desde la anterior. Un coche viaja como una lista:
  `estado`, `s`, `v`, `potencia`, `derrape`, `exigencia`, `coleteo`, `altura`, vueltas, llegada,
  salidas y freno; fuera del carril, además su pose y su velocidad; en la mano, de dónde lo recoge.
  El progreso no viaja: es siempre `s − largo`. Números redondeados, en JSON: con cuatro coches,
  ≤ 401 B y unos 5,4 KB/s (§11).
* **Los choques los decide el anfitrión**, con todos a la misma hora de carrera. Lo que un choque le
  hace a un coche remoto se apunta (`fotografiar` antes de mirar los choques, `anotarGolpe` después)
  y se le manda como golpe (`{k:'g', n, g}`): en el carril, lo que cambian su velocidad, su derrape y
  su cola; si lo saca, cómo sale respecto a su rumbo; fuera, lo que lo mueve. Su dueño lo aplica
  (`aplicarGolpe`) donde lo tenga ya. Hasta que confirma que lo tiene (`ag`), el anfitrión aplica ese
  golpe encima de cada reporte, y antes de adelantarlo: sin lo primero, un reporte de antes del golpe
  lo desharía y volverían a chocar; sin lo segundo, adelantado con la velocidad de antes del golpe se
  metía en el otro más de lo que se mete (en los encuentros salían los dos tres veces más que en la
  mesa). Si el golpe lo sacaba, mientras no lo confirma el anfitrión no toca su coche. Quién se sale
  lo decide el anfitrión: un golpe que no lo saca no lo deja en 1 de derrape.
* **Los demás coches**, en un invitado, salen de la última instantánea llevada a su hora de carrera,
  y lo que ya pintaba se acerca a eso en unos 100 ms (`SUAVIZA`): en el carril, por la `s`, así que
  nunca se pinta un coche fuera de su carril. Si cambia de estado, va en la mano o está a más de 60 px
  (`SALTO`), se pone de golpe.
* **El anfitrión** corre la carrera como siempre (`avanzarSlot`): su mando y `decidirSlot` para la
  CPU; los remotos ruedan.
* **Segundo plano.** Si el anfitrión oculta la pestaña, su `requestAnimationFrame` se para y la
  carrera con él: los demás ven «Esperando al anfitrión…» pasado medio segundo sin instantáneas. Al
  volver, el `dt` acotado a `DT_MAX` hace que siga donde estaba. Si se oculta un invitado, su
  gatillo cuenta como suelto.

**El riesgo conocido** es el de Orbit: WebSocket va sobre TCP, y en una red móvil mala una pérdida
retiene lo que viene detrás. El coche propio no se afecta, porque es local; los demás pueden dar
un tirón. La prueba de Orbit dio huecos de hasta 452 ms en el flujo del anfitrión.

## 7. Récords

No hay. Una vuelta en red no es de un solo jugador: el anfitrión decide los choques del
invitado y la corrige. La tabla y el fantasma siguen siendo de la carrera sin red, y no hace falta
tocar `api.php`, `schema.sql` ni `servidor/records.php`: Slot se ahorra el bloque F de Orbit.

## 8. Privacidad, sitio y app

* **Política.** Slot usa la común de pnyk.es, y su sección «Juegos de PNYK» ya cuenta el servidor
  de salas. Con el S4 cambia el «a dos» (§5.2). En `pnyk/proyectos.js` se puede añadir a la ficha
  de Slot que se juega en red, si la sección lo enumera por juego.
* **Prosa** de las páginas (`idiomas/`, la que lee el generador) y JSON-LD (`playMode`: añade
  `MultiPlayer`).
* **App.** `enApp()` no necesita ramas nuevas: la URL del servidor es absoluta y los orígenes de
  Capacitor ya están en `juegos.js`. La ficha de Play declara la interacción entre usuarios.
* **Versión.** El G sube `pnyk.json` a **1.20.0** (a dos) y el S4, a la siguiente menor.

## 9. Fuera de la primera versión

Salas abiertas o «partida rápida», enlace para compartir la sala, reconexión, migración de
anfitrión, chat, el campeonato en red, récords en red y espectadores.

## 10. El camino

Las casillas están en la Fase 6 del `TODO.md`. El orden importa:

0. **Prueba de red.** Heredada: la superó Orbit el 2026-11-07 con el mismo servidor.
1. **A. La red de mentira.** `nucleo/red.js` y una sección del arnés que une dos carreras en Node
   con una red de mentira, con retraso, variación y huecos. Va antes que los sockets a propósito,
   como el A de Orbit: separa los fallos del protocolo de los de conexión. **Hecho** (§11).
2. **B. Alta en salas.** `juegos.js`, `net.js` (comun 1.3.0), la copia a la raíz y `PRECACHE`.
3. **C. Pantallas.** EN RED, crear, unirse y la sala, en la mesa y en la lupa. **Hecho.**
4. **D. A dos en red.** `juego.js` con `net` y `red.js`: reportes, instantáneas, golpes, los
   remotos en el dibujo y los eventos.
5. **E. Reglas en red.** La salida que espera, la revancha, las mangas, la CPU en los huecos,
   segundo plano y desconexiones.
6. **G. Publicación a dos.** Prosa, ficha de Play, versión 1.20.0 y `BITACORA.md`.
7. **S4. Salas de cuatro.** Servidor, `net.js` (comun 1.4.0), la política común y hasta cuatro
   personas en la pista de cuatro.

Para probar: dos pestañas en local con el servidor en Node (`npm run dev` en `salas`), con `?lag=`
y `?jitter=`; y al final, siempre, dos móviles reales en redes distintas (y en el S4, cuatro).

## 11. Lo que mide el arnés

Es la sección 10 del arnés (`correrEnRed`), con los módulos reales y una red de mentira: cada
mensaje sale con un retraso fijo más una variación al azar sembrado, en orden, como TCP, y en
JSON, como por `net.js`. Con 60 ms de ida y 20 de variación (lo que midió Orbit), en los seis
oficiales a dos, en los tres de cuatro con dos CPU y en *El ocho largo* con cuatro personas:

* **Nada cambia sin red**: las demás secciones dan las mismas cifras que antes del bloque A,
  idénticas.
* **Cada coche donde va**: el anfitrión tiene al invitado a < 3,5 px de donde va a la misma hora de
  carrera (p95; hoy 2,3-2,6; máximo < 8, hoy 4,4), y el invitado pinta a los demás a < 2,5 (hoy
  1,2-1,4; máximo < 5, hoy 2,5). Lejos de los choques, las salidas y la mano, que corrigen de golpe.
* **El gatillo**: la mejor vuelta del invitado en red, a < 2 % de la suya sin red (hoy, la misma).
* **La carrera acaba igual** en todos: el mismo ganador, las mismas vueltas y la llegada de cada
  uno, la suya.
* **El tamaño**: la instantánea < 500 B (hoy ≤ 401 con cuatro coches) y una carrera de 10 vueltas
  largas (150 s) < 2 MB de ida (hoy unos 5,4 KB/s: ~0,8 MB).
* **Los encuentros**, los de la sección 3 con el invitado al otro lado de la red: chocan donde
  chocan en la mesa, las salidas del invitado cuadran en los dos lados (un golpe que lo saca no se
  aplica dos veces) y salen los dos como mucho el doble que en la mesa, más 2. Hoy, siguen los dos /
  se sale uno / los dos: en la mesa 47 / 6 / 2, en red 47 / 5 / 3.
* **Un hueco de 450 ms** (el peor que midió Orbit) a mitad de carrera: acaba igual en los dos.

Lo que el arnés no ve, el bloque D lo prueba a mano: si un golpe que llega 60 ms tarde se entiende
en la pantalla de quien lo recibe.
