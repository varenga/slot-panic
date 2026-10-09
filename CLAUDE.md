# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual

Publicado (v1.0.0): carreras de slot en cuatro circuitos (*La horquilla*, y *El
ocho*, *El nudo* y *El resbalón*, de piezas), dos coches enganchados a carriles que se cambian en cada
carrera, solo apretar y soltar (un gatillo que se
dosifica a toques), derrape antes de salirse, choques en las X, los cruces y las estrechas, una curva deslizante y una mano que devuelve el
coche; uno
contra una CPU que falla o dos en la misma pantalla, con siete coches a elegir (solo de forma), carrera suelta o campeonato (los cuatro seguidos), de 3, 5 o 10 vueltas, y récords de vuelta online con
fantasma en los oficiales. Un constructor: el circuito
se dibuja con el dedo en una cuadrícula, se prueba, se guarda en el dispositivo, se
comparte con un enlace (`?c=`) y se publica en la galería (`api.php`, MySQL en Plesk). Con el móvil en vertical, el modo
lupa: la pista ampliada alrededor del coche y el mapa arriba, contra la CPU. Cuatro escenarios de día, al
atardecer o de noche, siete idiomas (una página por idioma, con SEO), sonido, teclado y
táctil; instalable como PWA y sin red. La app de Android (Capacitor, `es.pnyk.slot`) está
en `/app`, con el bundle firmado listo para Play: el camino, en `APP.md`. Publicado en https://slot.pnyk.es. Lo
siguiente, en `TODO.md`.

Nació como el modo Slot de **Race Panic** (`C:\html\roadpanic`, `race.pnyk.es`) y se
separó del tag `v0.9.3` de aquel repo (`BITACORA.md`). Tendrá su propio desarrollo: sus
circuitos (de piezas), sus coches y un constructor de circuitos.

**Nunca «Scalextric»**: es una marca registrada. Todo se llama **slot**: Slot Panic,
`nucleo/slot.js`, `CPU_SLOT`… ni en el código, ni en los textos, ni en los documentos.

Publicado en **https://slot.pnyk.es** (`SITE_ORIGIN` en `config.js`). El remoto es
`github.com/varenga/slot-panic` y Plesk despliega desde él: **un push a `master` publica**. A `master` solo llega
lo que ha pasado el arnés; el trabajo se hace en ramas.

## Documentación

- `README.md` — la especificación de diseño a largo plazo: el juego que se quiere.
- `TODO.md` — el alcance real de la fase en curso. Contiene **solo lo pendiente**.
- `BITACORA.md` — lo ya cerrado, con las medidas y el porqué de cada decisión. Las
  primeras entradas vienen de Race Panic.
- `IDEAS.md` — tormenta de ideas a futuro. No compromete nada: una idea entra en
  `TODO.md` cuando toca.
- `APP.md` — la app de las tiendas (Capacitor en `/app`): decisiones y roadmap por fases.

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
lo vuelve a abrir. La propiedad es la propia de Slot Panic, **`G-LWMERSV8WH`** (nunca la de
Race Panic), y la declara también su ficha de `pnyk/proyectos.js` (`privacy`), que es lo
que la política común de pnyk.es enumera. Dentro de la app no se carga. Nunca se carga
gtag.js directamente.

## Ejecución y verificación

Módulos ES: hay que **servir por HTTP**; con doble clic falla por CORS.

**Las páginas se generan**: `index.html`, `en/`… `fr/`, `manifest.webmanifest`,
`service-worker.js`, `sitemap.xml`, `robots.txt` y `llms.txt` no se editan a mano. Tras
tocar **cualquier fichero del juego** (no solo los textos) y antes de publicar:

```bash
node tools/gen-pages.mjs     # páginas, PWA y la versión de la caché del service worker
node tools/gen-icons.mjs     # solo si cambia favicon.svg (necesita Chrome)
```

El service worker solo se registra en HTTPS; en local se prueba con `?sw`, y después hay
que quitarlo (DevTools › Application, o seguirá sirviendo su caché).

```bash
python -m http.server 8124   # y abrir http://127.0.0.1:8124
```

Python no ejecuta PHP: en local la galería dice «sin conexión». Para probarla contra la
API publicada, `?api=https://slot.pnyk.es/` (solo sirviendo en local; `api.php` admite el
origen `http://127.0.0.1:8124`). Ojo: publica y denuncia de verdad, en la base de Plesk.

Ojo en esta máquina: `localhost:8000` y `localhost:8123` los intercepta un service worker
de otro proyecto (Phabetia); `127.0.0.1` es otro origen y no le afecta. Una pestaña en
segundo plano no ejecuta `requestAnimationFrame`: el juego se queda congelado.

No hay build, tests ni linter, pero sí un **arnés**:

```bash
node arnes.mjs
```

Importa los módulos reales del núcleo (no tocan el DOM) y corre carreras enteras con
pilotos automáticos en unos segundos (hoy, ~20 s). Si las piezas de un circuito no
cierran, ni arranca: lo dice `construirDePiezas` al importarlo. Sale con código 1 si algo falla. No admite
argumentos: siempre corre todas las secciones enteras. Es `.mjs` a propósito: el
`.htaccess` deniega `*.mjs` (y `*.md`, `pnyk.json`), así que no se publica; por lo
mismo, un módulo que cargue el navegador tiene que ser `.js`. **Pásalo tras
cualquier cambio en la física, la pista o las reglas.** Las secciones 1 a 3 corren en
cada circuito de `CIRCUITOS`; las cifras de abajo son las de La horquilla (las de los
demás, en `BITACORA.md`). Mide y comprueba:

1. **El circuito**: cabe en el lienzo y dos tramos lejanos por la pista (> 300 px de `s`)
   nunca quedan a menos de un ancho + 40 px. Ningún punto del muro cae en la zona de otro
   tramo ni fuera del lienzo, y en todas partes hay al menos 14 px de grava más allá del
   piano (hoy 15). Ni la barra del marcador (arriba) ni el hueco de la portada pisan el asfalto ni el piano. Los dos tramos
   de un cruce (`enCruce`, ±128 px de `s`) quedan exentos.
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
   1,7 %; con una X, < 2 %) y con el turno cambiado los coches se cambian de carril.
   Las medidas del piloto se toman con **cada coche solo** en la pista. Juntos, dos
   coches iguales sin X, cruces ni estrechas no chocan nunca; en cada X, cada cruce y
   cada estrecha, lanzados con 21 desfases, chocan en alguno y nunca dos veces seguidas.
   Las curvas a tope incluyen el peralte, la de derrape, la deslizante y los baches.
4. **Idiomas**: los siete catálogos tienen las mismas claves, y los nombres de los
   circuitos públicos (adjetivo y sustantivo, con género) son tantos como espera
   `api.php`.
5. **La cuadrícula del constructor**: lo que deja pasar `validarTrazado` se puede correr
   (trazados a mano y al azar pasan las secciones 1 a 3, sin las cifras de calibrado), y
   el servidor valida igual: con `php` en el PATH, compara `servidor/cuadricula.php` con
   la de JS en cientos de códigos (sin PHP lo avisa y no lo compara).
6. **El campeonato**: corre los circuitos oficiales en orden, las victorias suman las
   carreras, al que no acaba se le pone más tiempo que al ganador y, con las mismas
   victorias, gana el menor tiempo sumado.
7. **El fantasma**: en cada oficial, la vuelta grabada se separa < 1 px del coche, acaba
   en la meta, desaparece después y guardada ocupa < 12.000 caracteres; con `php`, el
   servidor (`servidor/records.php`) tiene el circuito, su mínimo por debajo de una vuelta
   fina y su meta, acepta la vuelta de verdad y rechaza las trucadas.

Verificar un cambio visual significa además abrir la página y jugar. Sirviendo en local
aparece la depuración: FPS, velocidad y exigencia del J1 (100 % se sale).

La app de Android se compila desde `/app` (el único sitio con `package.json`), con el SDK
de Android (`sdk.dir` en `app/android/local.properties`, sin versionar) y el JDK 21 de
`JAVA_HOME`:

```bash
cd app && npm install && sh sync.sh && npx cap sync android
cd android && ./gradlew assembleDebug     # APK para el móvil por USB
cd android && ./gradlew bundleRelease     # para Play, firmado con ~/.slotpanic/
node store/screenshots.mjs                # capturas de la ficha (con la web en el 8124)
sh store/generate.sh                      # icono, arranque e imagen destacada
```

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
nucleo/circuito.js     de vértices a pista, y completarCircuito(): eje denso con `s`,
                       proyectar(p, índice), puntoEn(s), los cruces, y el borde y el
                       muro de cada lado (para dibujar la pista y medir el decorado)
nucleo/piezas.js       construirDePiezas(): de la lista de piezas al eje, con su
                       efecto y el factor del carril (la X, la estrecha) en cada punto
nucleo/slot.js         el núcleo: carriles (lateralEn), el coche enganchado (s y
                       velocidad), efectos de pieza, derrape, salirse, el choque, la
                       mano, la carrera y formatearTiempo. Sin DOM
nucleo/piloto.js       la CPU, la exhibición y el instrumento del arnés: decidirSlot()
nucleo/campeonato.js   el campeonato: los oficiales en orden, victorias, tiempos (el
                       del que no acaba, a su ritmo) y el desempate
nucleo/fantasma.js     cada vuelta grabada a 1/30 s y reproducida con su reloj;
                       codificar() / decodificar() para guardarla y enviarla
nucleo/cuadricula.js   el constructor, en enteros: el trazado (meta + un paso por
                       casilla), validarTrazado(), el código (?c=) y aPiezas()
nucleo/trazo.js        lo que el dedo dibuja: pisar(), cerrar, cambiarVariante()
nucleo/validar.js      validarCircuito(): la geometría del arnés, para el juego
nucleo/decorado.js     DÓNDE va cada pieza del decorado: PRNG propio, cabe(),
                       barreras de neumáticos. No dibuja
nucleo/lienzo.js       `ctx` (enlace vivo), primitivas y capas fuera de pantalla

circuitos/indice.js    CIRCUITOS: la lista, en el orden de la portada (tecla C)
circuitos/primero.js   «La horquilla», por vértices (heredada de Race Panic)
circuitos/ocho.js      «El ocho», de piezas: cruce, peralte, chicane, derrape
circuitos/nudo.js      «El nudo», de piezas: X, baches, horquilla, derrape, chicane
circuitos/resbalon.js  «El resbalón», de piezas: las estrechas (corta y larga), la
                       curva deslizante y una chicane
dibujo.js              el mundo: suelo, decorado y pista (en una capa que se pinta
                       una vez), carriles y coches
coches.js              la forma de cada modelo, vista desde arriba: silueta, ruedas
                       y detalles. Cosmética: los choques siguen con la caja del coche
particulas.js          chispas, humo y confeti. Presentación: aquí sí vale Math.random()
luz.js                 la hora: día, atardecer (un velo) o noche (la pista a media
                       luz, las torres del decorado, faros y halos). Cosmética, y se
                       recuerda
pantalla.js            lo que va encima: marcador, avisos, portada, cartel de fin.
                       opcionesPortada() y botonesFin() sirven al dibujo Y a la
                       pulsación
lupa.js                el modo lupa (móvil en vertical): la cámara que sigue al J1,
                       el mapa y su marcador, portada y fin. Presentación, como
                       pantalla.js
constructor.js         la escena del constructor: gestos, trazo, barra. Cerrado y
                       válido, construye el circuito y lo pinta con dibujo.js
publicar.js            el diálogo de compartir y publicar (normas, nombre, alias)
galeria.js             CIRCUITOS (galería o constructor) y la galería de circuitos
                       públicos: tarjetas y miniaturas
publicos.js            la red de la galería (api.php): nunca bloquea el juego
records.js             la red de los récords de vuelta (api.php): la tabla y firmar
tablaRecords.js        RÉCORDS (la tabla y el fantasma elegido) y la firma
api.php                los circuitos públicos (PHP + MySQL); config.php, fuera de git
servidor/cuadricula.php  la cuadrícula en PHP: la validación del servidor (no se sirve)
servidor/records.php   qué vuelta se acepta como récord (no se sirve)
schema.sql             las tablas de api.php (no se sirve)
arnes.mjs              el arnés (no lo carga el juego)

tools/gen-pages.mjs    genera las páginas por idioma, el manifest y el service worker;
                       PRECACHE sigue los import desde juego.js
tools/gen-icons.mjs    los PNG de iconos/ desde favicon.svg
app/                   la envoltura Capacitor (APP.md); no se sirve (404)
```

`enApp()` (`config.js`) es el único sitio que sabe de Capacitor: dentro de la app no hay
service worker, prosa, pie, analítica ni depuración.

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
- **Un circuito se declara, no se dibuja**: por vértices con radio (`circuito.js`) o por
  piezas desde la meta (`piezas.js`), con sectores e interior. Las piezas tienen que
  cerrar; la última, recta (la parrilla sale 30 px detrás de la meta). El cruce no se
  declara: se encuentra.
- **El carril lo da la pieza**: el desplazamiento real es `lateralEn(circuito, lateral,
  s)`, nunca `slot.lateral` a secas (en la X cambia de lado, y con un número impar de
  X, cada vuelta; en la estrecha se acerca al eje, a `ESTRECHA`). Lo que agarra cada
  punto, `radioAgarre(punto, lateral)`.
- **Chocar es empezar a tocarse acercándose**: así la mano puede dejar dos coches uno
  encima del otro sin que vuelvan a chocar en bucle. El paso en que la mano posa un
  coche (`posado`) no cuenta como empezar a tocarse.
- **Lo que publica un push no puede romper con la caché vieja.** Los módulos ES no
  llevan `?v=`: con service worker, cada versión tiene su caché (la huella de todo lo que
  precarga) y no se mezclan; sin él, el `.htaccess` hace revalidar HTML, JS y CSS
  (`no-cache`). Por eso hay que regenerar las páginas tras tocar cualquier módulo: si no,
  el service worker no cambia y quien tiene la PWA se queda con lo viejo.
- **La depuración solo sale sirviendo en local** (`DEPURACION` en `config.js`), y nunca
  en la app, cuyo origen es `https://localhost`.
- **Lo que precarga el service worker es lo que empaqueta la app**: `PRECACHE` (generado)
  es la única lista. Un fichero que el juego cargue sin `import` desde `juego.js` (como los
  de `vendor/pnyk/`) hay que añadirlo a mano en `tools/gen-pages.mjs`.
- **El decorado nunca usa `Math.random()` ni pisa nada que juegue.** Los escenarios son
  cosméticos.
- **Lo pulsable se define una vez**: la misma función da la caja para dibujarla y para
  saber si se ha pulsado.
- **Un dedo por jugador**: la mitad izquierda es J1 y la derecha J2. Ninguna mecánica
  nueva puede exigir un control que el móvil no tenga.
- **En vertical, la lupa** (`estado.lupa`): toda la pantalla es el J1 y el otro carril, la
  CPU. La vista nunca enseña fuera de la mesa (1280 × 720) y el lienzo tiene el alto de
  la pantalla: lo que dibuje la lupa no puede suponer 960 px de alto.

## Convenciones de trabajo

- Ramas numeradas con nombre descriptivo en español: `01-nace-de-race-panic`, `02-…`.
- Mensajes de commit en español.
- Regla de diseño para cada añadido: «¿hace la carrera más divertida?».
