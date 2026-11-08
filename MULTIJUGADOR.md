# Slot Panic en red

Cómo correr en Slot Panic contra otras personas, **cada una en su dispositivo**, sin que deje
de ser el juego de un dedo que ya es. Es la Fase 5 del `TODO.md`, pero el diseño vive aquí: toca
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
| Quién simula | Un navegador, el del anfitrión | La física es de paso fijo, pero `Math.sin` o `Math.exp` no dan el mismo último bit en todos los motores: un *lockstep* puro acabaría desviándose |
| El coche propio | Se adelanta en local y se corrige hacia el anfitrión | Un bit de mando y un paso fijo lo hacen barato, y el gatillo no espera a la red |
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
  * **Unirse**: el código en cuatro casillas, con ▲▼, tecleado o tocado, como el alias de la firma
    (`tablaRecords.js`), solo con el alfabeto del código. Los fallos —no existe, llena, demasiados
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
* **Cliente**: `vendor/pnyk/net.js` con `propagar.js` (comun 1.3.0; Slot está en la 1.2.4).
  `net.juego = 'slot-panic'` y `net.version`, la de los mensajes de §6, que sube cuando cambian.
* **Sitio**: como `vendor/` no se sirve, `tools/gen-pages.mjs` copia `net.js` a la raíz, como hace
  Orbit; `index.html` lo carga con `<script>` antes que `juego.js` (deja `net` en `window`, como
  `pie.js` deja `pieRed`) y va a mano en `PRECACHE`, porque no se llega a él siguiendo `import`.
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

* **`nucleo/red.js`**, puro, como el resto del núcleo: hace y aplica las instantáneas, adelanta el
  coche propio y lo corrige, e interpola a los demás. Lo prueba el arnés sin sockets.
* **`juego.js`**, el único que ve `net`: conecta, manda lo que `red.js` prepara y le pasa lo que llega.
* **`sala.js`**, las pantallas de §4.

| Qué | Quién decide | Cómo viaja |
|---|---|---|
| La carrera entera: coches, choques, salidas, la mano, vueltas, ganador | Anfitrión | Instantáneas a 20 Hz |
| El gatillo de cada invitado | Invitado | Un bit, solo cuando cambia, con su número de orden |
| Los coches de la CPU | Anfitrión | En la instantánea, como los demás |
| La sala: circuito, vueltas, coches, `turno`, empezar | Anfitrión | Un mensaje al cambiar |
| Sonido, partículas, chirrido y vibración | Cada lado | Los eventos de la instantánea, con azar local |

* **El gatillo.** El invitado manda `{k:'g', n, a}` (número de orden y pulsado o no) cada vez que
  cambia, y lo repite cada 250 ms por si acaso. El anfitrión aplica el último que le llega. Son
  unos pocos bytes por pulsación.
* **Las instantáneas** (`{k:'s', …}`): la hora de la carrera, la fase, la cuenta y, de cada coche,
  lo que necesitan la física y el dibujo: `estado`, `s`, `progreso`, `v`, `potencia`, `derrape`,
  `coleteo`, `altura` y vueltas; fuera del carril, además la pose (`x`, `y`, `angulo`, `giro`) y sus
  tiempos. Más el último número de gatillo aplicado de cada invitado y los eventos del intervalo
  (`carrera.eventos`, acumulados entre instantáneas). Números redondeados, en JSON; binario solo si
  la medida lo pide. Cuatro coches deberían quedar por debajo de 400 bytes: unos 8 KB/s.
* **El coche propio no tiene retardo.** El invitado lo simula en local con la misma física y su
  gatillo al momento. Al llegar una instantánea, toma el estado de su coche en el anfitrión, que ya
  incluye su gatillo hasta el número que dice, y vuelve a simular desde ahí los gatillos que el
  anfitrión aún no ha visto. Lo que difiera de lo que ya pintaba se reparte en unos 100 ms, en el
  dibujo, no en la física. Para eso `slot.js` exporta el paso de un coche suelto (hoy
  `pasoSlot`, interno).
* **Los choques los decide el anfitrión**, con todos los coches donde él los tiene. El invitado no
  adelanta los choques: los demás coches los ve en el pasado. Un golpe le llega en la instantánea
  como un cambio de `v` o de `derrape`, y la corrección lo hace notar. Es el precio de un anfitrión, y
  hay que medir si se nota (bloque D).
* **Los demás coches** se pintan unos 100 ms por detrás de la hora del anfitrión, interpolando
  entre las dos instantáneas que rodean ese instante, como en Orbit. En el carril se interpola la
  `s` y la pose sale de `poseEnCarril`: así un coche nunca se pinta fuera de su carril. Fuera, la pose.
* **El anfitrión** corre la carrera como siempre (`avanzarSlot`): su mando, el último bit de cada
  invitado y `decidirSlot` para la CPU.
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

Las casillas están en la Fase 5 del `TODO.md`. El orden importa:

0. **Prueba de red.** Heredada: la superó Orbit el 2026-11-07 con el mismo servidor.
1. **A. La red de mentira.** `nucleo/red.js` y una sección del arnés que une dos carreras en Node
   con una red de mentira, con retraso, variación y huecos. Va antes que los sockets a propósito,
   como el A de Orbit: separa los fallos del protocolo de los de conexión.
2. **B. Alta en salas.** `juegos.js`, `net.js` (comun 1.3.0), la copia a la raíz y `PRECACHE`.
3. **C. Pantallas.** EN RED, crear, unirse y la sala, en la mesa y en la lupa.
4. **D. A dos en red.** Instantáneas, gatillo, adelanto y corrección, interpolación y eventos.
5. **E. Reglas en red.** La salida que espera, la revancha, las mangas, la CPU en los huecos,
   segundo plano y desconexiones.
6. **G. Publicación a dos.** Prosa, ficha de Play, versión 1.20.0 y `BITACORA.md`.
7. **S4. Salas de cuatro.** Servidor, `net.js` (comun 1.4.0), la política común y hasta cuatro
   personas en la pista de cuatro.

Para probar: dos pestañas en local con el servidor en Node (`npm run dev` en `salas`), con `?lag=`
y `?jitter=`; y al final, siempre, dos móviles reales en redes distintas (y en el S4, cuatro).

## 11. Lo que mide el arnés

Una sección nueva, **En red**, con los módulos reales y una red de mentira (cada mensaje sale con
un retraso fijo más una variación al azar sembrado, en orden, como TCP). En cada oficial y con
pilotos automáticos:

* **Nada cambia sin red**: las demás secciones dan las mismas cifras.
* **El coche propio**: con 60 ms de ida y 20 de variación, lo que pinta el invitado se separa
  < 3 px de lo que tiene el anfitrión a la misma hora, salvo en los choques, y vuelve en ≤ 200 ms.
* **El gatillo**: con el piloto prudente en el invitado, su vuelta dista < 2 % de la misma vuelta
  sin red, y no se sale.
* **Los demás**: interpolados, nunca fuera de su carril y sin saltos de más de un coche de largo
  entre fotogramas, salvo tras un hueco de la red.
* **La carrera acaba igual** en los dos: mismo ganador, mismas vueltas y los tiempos del anfitrión.
* **El tamaño**: la instantánea, < 400 bytes con cuatro coches; una carrera de 10 vueltas, < 2 MB
  de ida.

Las cifras son de partida, como todas: se fijan con lo que se mida.
