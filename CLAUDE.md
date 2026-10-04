# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual

Prototipo jugable (v0.1.0): carreras de slot en *La horquilla*, dos coches enganchados a
carriles que se cambian en cada carrera, solo apretar y soltar (un gatillo que se
dosifica a toques), derrape antes de salirse y una mano que devuelve el coche; uno
contra una CPU que falla o dos en la misma pantalla. Cuatro escenarios de día, al
atardecer o de noche, siete idiomas, sonido, teclado y táctil. Aún sin publicar. Lo
siguiente, en `TODO.md` › Fase 1.

Nació como el modo Slot de **Race Panic** (`C:\html\roadpanic`, `race.pnyk.es`) y se
separó del tag `v0.9.3` de aquel repo (`BITACORA.md`). Tendrá su propio desarrollo: sus
circuitos (de piezas), sus coches y un constructor de circuitos.

**Nunca «Scalextric»**: es una marca registrada. Todo se llama **slot**: Slot Panic,
`nucleo/slot.js`, `CPU_SLOT`… ni en el código, ni en los textos, ni en los documentos.

Se publicará en **https://slot.pnyk.es** (`SITE_ORIGIN` en `config.js`). Cuando haya
remoto, Plesk desplegará desde él: **un push a `master` publica**. A `master` solo llega
lo que ha pasado el arnés; el trabajo se hace en ramas.

## Documentación

- `README.md` — la especificación de diseño a largo plazo: el juego que se quiere.
- `TODO.md` — el alcance real de la fase en curso. Contiene **solo lo pendiente**.
- `BITACORA.md` — lo ya cerrado, con las medidas y el porqué de cada decisión. Las
  primeras entradas vienen de Race Panic.
- `IDEAS.md` — tormenta de ideas a futuro. No compromete nada: una idea entra en
  `TODO.md` cuando toca.

**Ante una discrepancia, manda `TODO.md`.** Al terminar un bloque de trabajo, muévelo de
`TODO.md` a `BITACORA.md` con lo que se haya medido: `TODO.md` no acumula tareas marcadas.

Todo el proyecto está en español: comentarios, identificadores, mensajes de commit y
documentación. Las cadenas visibles van en `i18n.js` (siete idiomas).

## Los hermanos son plantilla, no dependencia

Slot Panic es de la familia Panic. Los hermanos viven fuera de este repositorio y se
leen, nunca se importan:

- `C:\html\roadpanic` — **Race Panic, de donde nació**: misma estructura, mismo lienzo,
  misma pista. Lo que Race Panic resuelva de plataforma (PWA, páginas por idioma, SEO,
  récords online) se copia de allí.
- `C:\html\railpanic` — la plantilla de la estructura: módulos ES, `config.js` /
  `estado.js` / `juego.js` / `nucleo/`, arnés en Node, README/TODO/BITACORA.
- `C:\html\orbitpanic` — la plantilla del i18n, el audio (`tone`/`noiseBurst`), los
  récords online, las páginas por idioma y la PWA.

## Capa común PNYK

Las reglas que comparten todos los proyectos PNYK (versiones, `pnyk.json`, `vendor/pnyk/`,
checklist de publicación) viven en pnyk y se importan aquí:

@C:/html/pnyk/comun/CONVENCIONES.md

`pnyk.json` declara la versión, la etapa y los idiomas del juego. `vendor/pnyk/` es copia
de `pnyk/comun/` (no se edita aquí: se actualiza desde pnyk con `node tools/propagar.js`);
`red.js` + `pie.js` dan los enlaces a los demás juegos de la familia Panic: `index.html`
los carga con `<script>` (son scripts clásicos, no módulos ES; dejan `pieRed` en `window`)
y `textosDelDocumento()` de `juego.js` pinta con ellos la línea «Otros juegos» del pie
(`#otros`, clave `pie.otros`), también al cambiar de idioma.

Google Analytics 4 se carga **solo tras consentimiento**: `index.html` carga el aviso común
(`vendor/pnyk/consentimiento.js`) y `analitica.js` lo inicia; el botón «Cookies» (`#cookies`)
lo vuelve a abrir. **Hoy `GA4_ID` está vacío** y no se inicia nada: Slot Panic necesita su
propia propiedad (nunca la de Race Panic). Nunca se carga gtag.js directamente.

## Ejecución y verificación

Módulos ES: hay que **servir por HTTP**; con doble clic falla por CORS.

```bash
python -m http.server 8124   # y abrir http://127.0.0.1:8124
```

Ojo en esta máquina: `localhost:8000` y `localhost:8123` los intercepta un service worker
de otro proyecto (Phabetia); `127.0.0.1` es otro origen y no le afecta. Una pestaña en
segundo plano no ejecuta `requestAnimationFrame`: el juego se queda congelado.

No hay build, tests ni linter, pero sí un **arnés**:

```bash
node arnes.mjs
```

Importa los módulos reales del núcleo (no tocan el DOM) y corre carreras enteras con
pilotos automáticos en unos segundos. Sale con código 1 si algo falla. **Pásalo tras
cualquier cambio en la física, la pista o las reglas.** Las secciones 1 y 2 corren en
cada circuito de `CIRCUITOS`. Mide y comprueba:

1. **El circuito**: cabe en el lienzo y dos tramos lejanos por la pista (> 300 px de `s`)
   nunca quedan a menos de un ancho + 40 px. Ningún punto del muro cae en la zona de otro
   tramo ni fuera del lienzo, y en todas partes hay al menos 14 px de grava más allá del
   piano (hoy 15). El hueco del marcador no pisa el asfalto ni el piano.
2. **Decorado**, en los cuatro escenarios: es determinista, caben al menos 40 piezas y
   ninguna pieza, neumático, grada ni torre de iluminación pisa la pista, el marcador ni
   las bandas de texto; hay al menos 8 torres (hoy 20).
3. **Slot**: los carriles van por el asfalto y dentro del lienzo, y sus tramos lejanos a
   > 60 px. El piloto prudente (×1, no pasa del agarre) no se sale nunca y da la vuelta
   en 9-16 s (hoy 13,5); entrar derrapando le gana (hoy 11 %) y a fondo se sale al menos
   dos veces por vuelta y pierde > 30 % (hoy 90 %). Ninguna curva se pasa a tope, por
   ningún carril (16 entradas). Arrancando parado en una curva a fondo no se sale en esa
   curva (0 de 68). A toques, la mitad pulsado, la velocidad se queda a medias (hoy ~195
   de 470). Un humano que reacciona 0,25 s tarde no se sale por ningún carril. La CPU
   (`CPU_SLOT`) deja al mejor piloto entre 0,6 y 1,4 s por vuelta (hoy 1,2), se equivoca
   alguna vez y con la misma semilla repite la carrera. La mano devuelve siempre el coche
   a la `s` donde se salió, en ≤ 2,6 s (hoy ~1,4). Nada sale de la mesa ni es no finito,
   el progreso no retrocede, los carriles se separan < 8 % con el mismo piloto (hoy
   1,7 %) y con el turno cambiado los coches se cambian de carril.
4. **Idiomas**: los siete catálogos tienen las mismas claves.

Verificar un cambio visual significa además abrir la página y jugar. Sirviendo en local
aparece la depuración: FPS, velocidad y exigencia del J1 (100 % se sale).

## Arquitectura

Módulos ES nativos, sin bundler. El grafo no tiene ciclos y la flecha va en un solo
sentido: **`nucleo/` no sabe del DOM ni de la interfaz**, y el mundo (`dibujo.js`) no sabe
de la interfaz (`pantalla.js`).

```
config.js              constantes, paleta, controles, GAME_SLUG y SITE_ORIGIN (no
                       importa nada)
escenarios.js          los cuatro escenarios: colores del suelo y pesos del decorado
                       (datos, no importa nada)
i18n.js                catálogos de 7 idiomas, t(), cambiarIdioma()
estado.js              el objeto `estado` mutable y el escenario guardado
audio.js               Web Audio: tone(), noiseBurst(), sfx*(), el zumbido de cada coche
                       y el chirrido continuos
analitica.js           GA4 tras consentimiento y evento(), que nunca rompe el juego
juego.js               bucle, escenas (portada/carrera/fin), teclado y punteros
                       (táctil). Único módulo que toca el DOM

nucleo/geometria.js    geometría pura: proyección en segmento, redondear un polígono
nucleo/circuito.js     de datos a pista: eje denso con `s`, proyectar(p, índice),
                       puntoEn(s), y el borde y el muro de cada lado (para dibujar
                       la pista y medir el decorado)
nucleo/slot.js         el núcleo: carriles, el coche enganchado (s y velocidad),
                       derrape, salirse, la mano, la carrera y formatearTiempo. Sin DOM
nucleo/piloto.js       la CPU, la exhibición y el instrumento del arnés: decidirSlot()
nucleo/decorado.js     DÓNDE va cada pieza del decorado: PRNG propio, cabe(),
                       barreras de neumáticos. No dibuja
nucleo/lienzo.js       `ctx` (enlace vivo), primitivas y capas fuera de pantalla

circuitos/indice.js    CIRCUITOS: la lista
circuitos/primero.js   «La horquilla», como datos (heredada de Race Panic)
dibujo.js              el mundo: suelo, decorado y pista (en una capa que se pinta
                       una vez), carriles y coches
particulas.js          chispas, humo y confeti. Presentación: aquí sí vale Math.random()
luz.js                 la hora: día, atardecer (un velo) o noche (la pista a media
                       luz, las torres del decorado, faros y halos). Cosmética, y se
                       recuerda
pantalla.js            lo que va encima: marcador, avisos, portada, cartel de fin.
                       opcionesPortada() y botonesFin() sirven al dibujo Y a la
                       pulsación
arnes.mjs              el arnés (no lo carga el juego)
```

## Reglas del motor

Invariantes que cualquier cambio debe respetar. Las razones y las medidas, en
`BITACORA.md`.

- **Todo en píxeles lógicos y segundos.** `dt` llega acotado a `DT_MAX` y `slot.js` lo
  trocea en pasos de `PASO_FISICA` (1/120 s). Nada de «× 60».
- **Los mandos son entradas, no teclas**: `{ acelerar, frenar, giro }`; aquí solo cuenta
  `acelerar`. Los rellena el teclado, el táctil o la CPU; la física no sabe quién
  conduce.
- **El coche enganchado solo tiene `s` y velocidad**: la posición y el rumbo salen del
  carril (el eje desplazado `CARRIL` px). El carril de dentro es más corto y más
  cerrado.
- **La potencia sigue al dedo con retraso** (`SUBE_POTENCIA`, `BAJA_POTENCIA`): a toques
  se queda a medias. Si subiera y bajara a ritmo fijo, a toques se quedaba en nada o en
  todo.
- **Derrapar antes que salirse**: pasado `AGARRE_SLOT` la cola sale y el coche pierde
  velocidad; solo se sale si el derrape se acumula o entra pasado de `LIMITE_SLOT`. Para
  el agarre, ningún carril cuenta como más cerrado que `RADIO_GUIA`.
- **Salirse cuesta tiempo, no la carrera**: la mano devuelve el coche a la `s` donde se
  salió, parado.
- **Las vueltas son progreso**, no cruces de línea: la `s` desenrollada.
- **Lo que pasa en un fotograma se acumula de todos sus subpasos** (`carrera.eventos`).
- **Un circuito se declara, no se dibuja**: hoy, vértices con radio, meta, sectores e
  interior (`circuito.js`). Los de piezas vendrán con su propio módulo.
- **Lo que publica un push no puede romper con la caché vieja.** Los módulos ES no
  llevan `?v=`: el `.htaccess` hace revalidar HTML, JS y CSS (`no-cache`). Una
  exportación nueva va mejor en un módulo nuevo que en uno que el móvil ya tenga.
- **La depuración solo sale sirviendo en local** (`DEPURACION` en `config.js`).
- **El decorado nunca usa `Math.random()` ni pisa nada que juegue.** Los escenarios son
  cosméticos.
- **Lo pulsable se define una vez**: la misma función da la caja para dibujarla y para
  saber si se ha pulsado.
- **Un dedo por jugador**: la mitad izquierda es J1 y la derecha J2. Ninguna mecánica
  nueva puede exigir un control que el móvil no tenga.

## Convenciones de trabajo

- Ramas numeradas con nombre descriptivo en español: `01-nace-de-race-panic`, `02-…`.
- Mensajes de commit en español.
- Regla de diseño para cada añadido: «¿hace la carrera más divertida?».
