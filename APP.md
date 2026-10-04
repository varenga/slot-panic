# Slot Panic en las tiendas

Cómo publicar Slot Panic en Google Play (y algún día en la App Store) **sin dejar de ser la
web que ya es**. Calcado del `APP.md` de Orbit Panic (`C:\html\orbitpanic`), que a su vez
copió el de Phabetia: allí están razonadas las decisiones, y aquí solo lo que cambia. El
camino, por fases, está en §8, y ahí se marca lo hecho.

## 1. El principio

**Una sola aplicación.** La de las tiendas es la misma web —los mismos módulos, el mismo
`i18n.js`— metida en una envoltura nativa (Capacitor). Nada de reescribir en nativo: dos
juegos son dos equilibrios. De ahí las dos reglas:

* **El repositorio web no cambia de naturaleza.** Sigue sin build ni dependencias. La
  envoltura vive en `/app` y depende de la web; la web no sabe que existe salvo por una
  pregunta —«¿estoy dentro de una app?»— que se hace en un solo sitio: `enApp()`, en
  `config.js` (§5).
* **Lo que ya vale, se aprovecha.** La lista de ficheros que precarga el service worker es
  la que se empaqueta; el icono sale de `favicon.svg`.

## 2. Por qué no basta con la PWA

La PWA se instala desde Chrome, pero no da presencia en las tiendas (descubrimiento y
confianza), y en iOS Apple la limita. Ninguno de esos motivos justifica un juego distinto:
todos se resuelven envolviendo el que hay.

## 3. Capacitor, con los ficheros dentro

**Capacitor en las dos plataformas**, como Orbit Panic y Phabetia, y los ficheros
**empaquetados**, no cargados de `slot.pnyk.es` (`server.url`): funciona sin red y pasa la
directriz 4.2 de Apple. El precio: cada cambio de la web que se quiera en la app es una
versión nueva en la tienda.

Aquí es más fácil que en Orbit Panic: **no hay API ni récords en servidor**, así que la app
no habla con la red (ni CORS que configurar) y no recoge ningún dato.

## 4. Dónde vive

```
/app
  package.json          Capacitor: la única dependencia npm del repositorio, y solo aquí
  capacitor.config.json appId es.pnyk.slot, appName, fondo #12141a
  sync.sh               copia la web a www/ (§4.1)
  www/                  la copia; generado, fuera del control de versiones
  android/              proyecto Android generado por Capacitor; se versiona
  store/                lo que piden las tiendas: generate.sh (icono y arranque),
                        feature.svg, listing/, play-console.md, screenshots.mjs
                        y screenshots/
```

* `/app` **no se sirve nunca**: el `.htaccess` lo contesta con un 404 (un push a `master`
  publica todo el repositorio).
* Los iconos y la pantalla de arranque salen de `favicon.svg` con `@capacitor/assets`
  (`sh app/store/generate.sh`) y caen en el proyecto nativo.

### 4.1. Qué se copia

`sync.sh` copia a `www/` **exactamente lo que precarga el service worker**: lee `PRECACHE`
de `service-worker.js` y falla si falta algo. `tools/gen-pages.mjs` construye `PRECACHE`
siguiendo los `import` desde `juego.js`, así que un módulo nuevo entra solo. Son las siete
páginas, los módulos, los tres scripts de `vendor/pnyk/`, `style.css`, `favicon.svg`, el
manifest y los iconos. Quedan fuera `sitemap.xml`, `robots.txt`, `llms.txt`, `tools/`, el
arnés, los `.md` y el propio `service-worker.js`.

## 5. Lo que se toca en la web

Todo detrás de `enApp()` (`config.js`): Capacitor deja `window.Capacitor` antes de que
corra la página.

* **El service worker no se registra** (los ficheros ya van dentro; en iOS ni funciona).
* **La prosa bajo el lienzo y el pie se quitan** (`quitarLoDeLaWeb()` en `juego.js`): son
  para los buscadores y para enlazar fuera. La página deja de hacer scroll y el lienzo llena
  la pantalla, sin el tope de 960 px de la web.
* **Sin analítica**: `cargarAnalitica()` no hace nada dentro de la app.
* **Sin depuración**: dentro de Capacitor el origen es `https://localhost`, que contaba como
  «sirviendo en local» y sacaba el panel de FPS. `DEPURACION` lo excluye.
* **Horizontal y pantalla completa**: el lienzo es 16:9. El manifest de Android bloquea
  `sensorLandscape`, y `MainActivity` esconde las barras del sistema (vuelven un momento
  con un deslizamiento desde el borde). Las muescas, con `env(safe-area-inset-*)`.
* **El botón atrás** cierra la app desde cualquier pantalla, como en Orbit Panic: no hay
  historial. Se decide probando si molesta.
* **Audio**: Web Audio arranca en el primer gesto, igual que en la web.

## 6. Lo que exigen las tiendas

* **`appId`**: **`es.pnyk.slot`**, definitivo (cambiarlo es publicar otra app).
* **Versión**: `versionName` igual que la web cuando se publican a la vez; `versionCode`,
  un entero propio que solo sube (`android/app/build.gradle`).
* **Firma en Android**: la **clave de subida** vive fuera del repositorio, en
  `~/.slotpanic/` (`upload.jks` y `keystore.properties`). `build.gradle` la lee y firma
  `bundleRelease`; sin ella el bundle sale sin firmar. **Ese directorio se copia a un sitio
  seguro**: si se pierde, hay que pedir a Play un reemplazo.
* **Privacidad**: la común de PNYK, https://pnyk.es/privacidad/#juegos. La app no recoge
  nada; la web, solo GA4 (`G-LWMERSV8WH`) tras consentimiento.
* **Ficha**: `app/store/` (textos, respuestas de la consola, imagen destacada, capturas).

## 7. El flujo de una versión

```
1. La web cambia y se regenera    node tools/gen-pages.mjs
2. app/sync.sh                    copia PRECACHE a www/
3. npx cap sync android           la mete en el proyecto nativo
4. Sube versionCode (y versionName)
5. ./gradlew bundleRelease        firmado con ~/.slotpanic/ (JDK 21 en JAVA_HOME)
6. Consola de Play
```

La web se publica primero, y la app se corta de una revisión que ya está en producción.

## 8. Roadmap

### Fase A — La web sabe que está en una app

* [x] PWA: páginas por idioma, manifest, service worker e iconos (`tools/gen-pages.mjs`,
  `tools/gen-icons.mjs`).
* [x] `enApp()` en `config.js`; sin service worker, prosa, pie, analítica ni depuración
  dentro de la app (§5). Probado con un `window.Capacitor` simulado sobre `www/`.

### Fase B — `/app` con Capacitor y la de Android en local

* [x] `/app` con Capacitor 7, `appId` `es.pnyk.slot`, fondo `#12141a`, y `sync.sh`.
* [x] Proyecto Android: `compileSdk` y `targetSdk` 36, horizontal, pantalla completa,
  compilado con `gradlew assembleDebug`.
* [x] Icono adaptativo y pantalla de arranque desde `favicon.svg`.
* [ ] Instalado por USB y comprobado en un móvil: jugar sin red, dos dedos a la vez, botón
  atrás, muescas, audio y el conmutador de idioma. (En un Xiaomi con HyperOS hay que
  activar «Instalar vía USB»; ver el `APP.md` de Orbit Panic.)

### Fase C — Google Play

* [x] Clave de subida en `~/.slotpanic/` y `bundleRelease` firmado, comprobado con
  `jarsigner -verify`; `versionCode` 1, `versionName` 0.3.0.
* [x] Ficha: textos en castellano e inglés, capturas de los dos, imagen destacada y
  respuestas de la consola, en `app/store/`.
* [x] Slot Panic en la política común de pnyk.es (`privacy` en `pnyk/proyectos.js`, con
  su GA4 `G-LWMERSV8WH` y sin récords). Falta publicar pnyk.es.
* [ ] Crear la app en la consola de Play con el paquete `es.pnyk.slot`, rellenar la ficha
  y subir el bundle a pruebas internas, aceptando *Play App Signing*.
* [ ] Pruebas internas, luego pública.

### Fase D — La de iOS

Mismo `www/`, en un Mac: proyecto Xcode, comprobarlo en un iPhone, App Store Connect y
TestFlight. Ver el `APP.md` de Orbit Panic, §8 Fase D.

### Fase E — Lo nativo que apetece

Optativa, siempre detrás de `enApp()`: vibración por Haptics (que llegue a iOS), la
petición de valoración del sistema, compartir un tiempo.
