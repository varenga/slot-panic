# Bitácora

Registro de lo que se ha hecho y —sobre todo— de **por qué**. `TODO.md` mira hacia
delante y solo contiene lo pendiente; aquí queda constancia de lo cerrado, con las
medidas y las decisiones que costaron trabajo, para no volver a discutirlas.

Cada entrada es un bloque de trabajo cerrado. El orden es cronológico. Las primeras
vienen de **Race Panic**, donde esto nació como un modo de juego (sus ramas 12 a 16);
los números de arnés y los nombres de módulos de esas entradas son los de entonces.

---

## Prototipo del modo Slot (02/10/2026, rama `12` de Race Panic)

> De `IDEAS.md` › 7, el que más apetecía probar, incluso como juego aparte. Primero un
> prototipo dentro de Race Panic para contestar lo único que importa: ¿engancha apretar
> y soltar? Si engancha, sería un hermano de la familia (sin la marca en el nombre).

- **El coche enganchado solo tiene `s` y velocidad** (`nucleo/slot.js`). Dos
  carriles a ±15 px del eje (`CARRIL`), trazados por la bisectriz de cada junta para que
  las curvas no hagan escalón. Por dentro de una curva el carril es más cerrado y más
  corto: por cada px de carril avanza `radio / radioCarril` px de `s`.
- **Soltar frena** (el motor en cortocircuito, como el juguete): 640 px/s². El motor
  empuja menos cuanto más deprisa va, hasta 480 px/s.
- **Salirse**: cuando `v² / radioCarril` pasa de `AGARRE_SLOT` (900). Antes, desde el
  60 %, la cola sale de lado (hasta 0,45 rad) y, desde el 85 %, la trencilla
  chisporrotea: el aviso de que viene. Se sale por la tangente con un 30 % hacia fuera,
  dando vueltas hacia dentro, y frena en la mesa (que rebota en los bordes del lienzo).
  Parado 0,35 s (o a los 2,2 s como mucho), la mano lo levanta y lo deja en 0,4 s en la
  misma `s` donde se salió, parado, con un clac. **No usa la física libre de carretera**:
  su agarre enderezaba el coche y el trompo no se leía.
- **Quién conduce, sin menú**: cada carril lo lleva la CPU hasta que alguien pulsa su
  control (mitad izquierda o W/Espacio/Mayús izq. para J1; mitad derecha o ↑/L/Mayús
  dcha. para J2), y desde ahí es suyo toda la carrera. Uno contra la CPU o dos entre sí.
- **El piloto** (`decidirSlot`) suelta si alguna curva por delante no admite la
  velocidad con la que llegaría soltando ya. Decidir una vez por fotograma lo hacía
  entrar pasado en la horquilla aun con prudencia 0,8: ahora cuenta con frenar un 15 %
  menos y con reaccionar 1/30 s tarde.
- La portada tiene una opción más, **MODO** (tecla X), que se recuerda; en Slot la
  exhibición son dos CPU. Zumbido eléctrico por coche (una cuadrada aguda, una voz por
  coche), el chirrido sigue a la exigencia del humano más al límite.
- Lo que falta adrede: estética de juguete (los carriles van sobre la pista de siempre),
  cambio de carril, récords, cruces, circuitos de piezas.

### Medidas (arnés, 5 vueltas)

| Piloto | Total | Mejor vuelta | Salidas |
|---|---|---|---|
| prudente (×0,8, la CPU) | 66,1 / 65,5 s | 13,0 s | 0 |
| al límite (×0,9) | 64,2 / 63,5 s | 12,5 s | 0 |
| a fondo | 175 / 180 s | 34,9 s | 75 (todas las curvas) |

- Soltar ahorra un 175 %: salirse cuesta ~1,3 s de mano más volver a arrancar, y a fondo
  no hay curva que se tome. Con ×0,95 ya se sale 15 veces: el margen entre ir al límite
  y salirse es estrecho, que es el juego.
- Los carriles miden 3532 y 3721 px, pero con el mismo piloto solo se separan un 0,9 %:
  el de dentro es más corto y más lento en las curvas.

## Slot jugable: gatillo, derrape y cambio de carril (02/10/2026, rama `13` de Race Panic)

> Playtest del prototipo: «engancha, el diseño es muy creíble». Pero era casi imposible
> no salirse en todas las curvas, incluso arrancando desde ellas; soltar frenaba
> demasiado; con dos estados (a tope o parado) no se podía calibrar la velocidad; y en
> las curvas no se derrapaba: se salía directamente.

- **Medido antes de tocar nada**: arrancando parado dentro de una curva con el dedo a
  fondo, se salía en 31 de 68 arranques.
- **La potencia sigue al dedo con retraso** (`SUBE_POTENCIA` 0,35 s, `BAJA_POTENCIA`
  0,25 s): un filtro, no una rampa. Con una rampa de ritmo fijo, a toques la potencia
  acababa en nada (45 px/s con la mitad del tiempo pulsado) o en todo: no hay término
  medio estable. Con el filtro, la mitad del tiempo pulsado da ~0,4 de potencia y unos
  195 px/s, firmes. Es el gatillo del mando del juguete hecho con una tecla.
- **El motor tiene inercia**: lleva el coche hacia potencia × 470 px/s en ~0,85 s. Al
  soltar, **rueda**: pierde 1 px/s por cada 1,1 px (`INERCIA_SOLTAR`), así que frena más
  cuanto más corre y casi nada despacio. Antes eran 640 px/s² fijos.
- **Pasado el agarre, derrapa** (`AGARRE_SLOT` 1000): la cola sale hasta ~0,95 rad,
  pierde velocidad (`FRENO_DERRAPE_SLOT` 8/s por cada vez el agarre que se pasa) y el
  derrape se acumula. Se sale si llega a 1 o si se entra a más de 2 veces el agarre
  (`LIMITE_SLOT`). Derrapando, la trencilla chisporrotea más cuanto más cerca está de
  salirse, el chirrido sube y la barra de potencia se pone roja.
- **Barra de potencia** en el marcador, por coche.
- **Los coches se cambian de carril en cada carrera** (`turno`). Con la inercia, el
  carril de dentro (el de la mayoría de las curvas) quedó un 4-6 % más lento con el
  mismo piloto, y cerrar los carriles no lo arreglaba (12 o 10 px: 3-4 %). En el
  juguete se resuelve igual, corriendo en los dos carriles.
- El piloto cuenta con frenar rodando (lo que se pierde en `d` px es `d / INERCIA_SOLTAR`)
  y con el retraso de la potencia. La CPU pasa a prudencia 1,2: entra algo derrapando.

### Medidas (arnés, 5 vueltas)

| Piloto | Mejor vuelta | Salidas |
|---|---|---|
| prudente (×1, no pasa del agarre) | 12,7-13,3 s | 0 |
| CPU (×1,2) | 12,2-12,8 s | 0 |
| al límite (×1,8, derrapando) | 11,5-12,1 s | 0 |
| ×2,0 | 14,5-16,9 s | 11-15 |
| a fondo | 22-25 s | 29-35 |

- Arrancando parado en una curva a fondo: **0 de 68** salidas (antes 31).
- Entrar derrapando ahorra un 11 % sobre no pasar del agarre; ir a fondo pierde un 98 %.
- El margen: hasta ~1,8 veces el agarre se derrapa sin salirse; a 2 ya se sale.

## Slot: curvas cerradas por dentro y una CPU que falla (02/10/2026, rama `14` de Race Panic)

> Segundo playtest: «ha mejorado muchísimo»; el gatillo es lógico y regula bien y el
> derrape se ve y se agradece. Pero por el carril interior las curvas muy cerradas siguen
> siendo difíciles y te sales casi seguro. Y a la CPU no hay quien le gane: frena y
> acelera exactamente cuando toca.

- **Un piloto «humano» para medirlo**: el de siempre, pero actuando con lo que decidió
  hace un rato. Con 0,15-0,25 s de retraso se salía **en todas las vueltas** en los
  carriles de radio 25 y 30: por dentro de las dos curvas de 40 y de la horquilla, que en
  el carril de dentro se quedan en la mitad. Por fuera, casi nunca. Es lo que se sentía.
- **La guía sujeta más en las cerradas** (`RADIO_GUIA`, 45): para el agarre, ningún
  carril cuenta como más cerrado que 45 px. Primero se probó sumar un radio fijo a todas
  (+15 a +35): arreglaba las cerradas pero daba agarre a las abiertas, y a fondo por fuera
  ya casi no se salía (el arnés lo rechazó). El suelo solo toca las cerradas.
- **El límite duro sube de 2 a 2,4** veces el agarre: por dentro de las cerradas se
  entraba tan pasado que se salía sin llegar a derrapar. Con 2,8, ir a fondo ya no perdía
  lo suficiente.
- **La CPU es humana** (`variacion` y `fallo` en `crearPiloto`): cada curva, en cada
  vuelta, la entra con su propia prudencia (0,95 ± 30 %) y en un 8 % de las curvas se
  pasa de largo (×2,8) y se sale. Sembrada (mulberry32 de `decorado.js`): el núcleo
  sigue siendo determinista; `juego.js` cambia la semilla en cada carrera. La
  exhibición de la portada también falla de vez en cuando.

### Medidas

| | Antes | Ahora |
|---|---|---|
| humano con 0,25 s de retraso (×1,2), salidas en 5 vueltas, carril de dentro / de fuera | 25 / 5 | 0 / 0 |
| CPU, vuelta media | 12,3 s, sin salidas | 13,3-13,9 s, de 1 a 3 salidas por carrera |
| el mejor piloto (×1,8, derrapando) | 11,5-12,1 s | 11,3-11,6 s |
| a fondo | 22-25 s, 29-35 salidas | 17-23 s, 15-30 salidas |

- Ir a fondo pierde ahora un 48 % (antes 98 %): sigue sin compensar, pero castiga menos.
- Entre carriles, con el mismo piloto: 3,2 % (antes 4,4 %); se siguen cambiando en
  cada carrera.

## Slot: las curvas abiertas piden soltar y una CPU a medio camino (02/10/2026, rama `15` de Race Panic)

> Tercer playtest: «ya es jugable». Las curvas cerradas, difíciles pero aceptables:
> practicando un poco se pasan. Pero por el carril exterior las curvas abiertas se pasan
> sin bajar la velocidad, y ahora es fácil ganar a la CPU.

- **Medido**: entrando lanzado a 470 px/s y sin soltar, de las 16 entradas (8 curvas
  por 2 carriles) solo se pasaba una, la curva de 80 tras la recta de meta por fuera
  (radio 95): el derrape la frenaba solo hasta 317 y no hacía falta levantar. Era la
  que se notaba, porque llega desde la recta más larga.
- **Menos agarre y más suelo de radio, a la par** (`AGARRE_SLOT` 1000 → 800,
  `RADIO_GUIA` 45 → 56): las cerradas admiten lo mismo que antes (√(800 · 56) ≈
  √(1000 · 45) ≈ 212 px/s), que era lo que gustaba, y las abiertas un 11 % menos. Con
  700 y 64, el humano que reacciona tarde volvía a salirse por dentro.
- **La CPU, a medio camino** (`CPU_SLOT` en `config.js`, para que el arnés mida la del
  juego): perfecta dejaba 0,7 s por vuelta al mejor piloto y «no había quien le
  ganara»; la de la rama anterior, 2 s y «es fácil». Ahora 1,2 ± 25 % y un 5 % de
  fallos: ~1,2 s, y se sale una vez en la mayoría de las carreras.

### Medidas

- A tope contra cada curva: se pasan **0 de 16** (antes 1).
- Prudente (×1): 13,3-13,5 s; el mejor (×1,8): 12,0-12,1 s; a fondo: 23-25 s.
- Humano que reacciona 0,25 s tarde: 0 salidas por los dos carriles.
- CPU: 13,4 s de media, 1,2 s por vuelta más que el mejor piloto; 0-1 salidas.
- Entre carriles, con el mismo piloto: 1,7 % (antes 3,2 %).

## Cierre del modo Slot (02/10/2026)

> Cuarto playtest: «funciona perfecto ahora, lo damos por bueno… la versión slot
> es sólida y jugable».

Se cierra de momento. Cuatro playtests en un día: el prototipo enganchó; el gatillo, el
rodar y el derrape lo hicieron jugable; la guía en las cerradas y una CPU que falla lo
equilibraron; y menos agarre con más suelo de radio hizo que las abiertas pidieran
soltar. Todo lo medido queda en las cuatro entradas anteriores y en la sección 8 del
arnés. Lo que quedó abierto (juego aparte o no, dos en una pantalla, niveles de CPU,
gatillo analógico, récords) está en `IDEAS.md` › 7.

---

## Slot Panic nace de Race Panic (04/10/2026, rama `01-nace-de-race-panic`, v0.1.0)

El modo Slot sale de Race Panic (su rama `39-aislar-slot`, v0.10.0) y pasa a ser un
juego propio de la familia, con su desarrollo: circuitos, coches y un constructor de
circuitos por piezas. Nace del tag **`v0.9.3`** de Race Panic, el último con el modo
dentro, copiado como plantilla («los hermanos se leen, nunca se importan»).

**Lo que se trajo**: `nucleo/slot.js` (más `formatearTiempo`, que vivía en el
`carrera.js` de carretera), el piloto (`crearPiloto` y `decidirSlot`), `circuito.js`,
`geometria.js`, `decorado.js`, `lienzo.js`, La horquilla, los cuatro escenarios, la
hora (`luz.js`), las partículas, el audio (tone, noiseBurst, zumbidos, zas y clac), el
i18n de siete idiomas, la analítica tras consentimiento y `vendor/pnyk/`.

**Lo que se quedó en Race Panic**: la física del coche libre (`coche.js`), las vueltas
por progreso (`carrera.js`), rivales, choques, fantasma, sectores, desperfectos, la
tabla de récords online (`api.php`, `marcas.js`), el motor de combustión, la grava,
los otros dos circuitos y la parrilla.

**Cambios al separarlo**:

- Un solo modo: las escenas son `portada`, `carrera` y `fin`. La portada ofrece
  sonido, idioma, escenario y hora.
- `GAME_SLUG` = `slotpanic`; `SITE_ORIGIN` = `https://slot.pnyk.es/`. Nada se lee de lo
  que guardó Race Panic, que además vive en otro origen.
- **GA4 apagado** (`GA4_ID` vacío) hasta que Slot Panic tenga su propia propiedad: sin
  ella no se carga nada, ni el aviso de cookies.
- El coche ya no tiene desperfectos ni luces de freno (un coche de slot no frena con
  luces); los pilotos traseros quedan apagados.
- Las claves de i18n de carretera fuera: de 93 a 35 por idioma.
- El arnés se queda con el circuito, el decorado, la carrera de slot y los idiomas:
  79/79, con las cifras del modo en Race Panic (prudente 13,5 s por vuelta, derrapando
  gana un 11 %, a fondo pierde un 90 %, la CPU deja al mejor a 1,18 s).

De ~7.500 líneas a ~3.900.

Y un favicon propio (`favicon.svg`): la U de La horquilla con sus dos carriles plateados
y los coches rojo y azul. Es también el icono de su ficha en pnyk.es.

---

## Publicado (04/10/2026, v0.1.0)

En **https://slot.pnyk.es**: repo `github.com/varenga/slot-panic`, Plesk despliega
`master` con webhook. Ficha en pnyk.es (`/slot-panic/`, saga Panic, número 6) y
`comun` 1.2.2 propagado: el pie de Asteroids, Horizon, Orbit, Gravity y Race Panic ya
enlaza a Slot Panic. `pnyk.json` pasa a `"web": true`. Falta GA4 (TODO › Fase 1).

## Circuitos de piezas: El ocho y El nudo (04/10/2026, rama `05-circuitos-de-piezas`, v0.2.0)

> Primera tarea de la Fase 2. El usuario pidió piezas nuevas («la típica en X, cruce,
> chicane, curva de derrape… todas las que se te ocurran») y dos circuitos con ellas.
> Decidió: dos coches que coinciden en un cruce **chocan y se salen**; la pista se sigue
> viendo como la de Race Panic, con una marca por pieza (la estética de juguete va aparte).

- **`nucleo/piezas.js`**: un circuito de piezas se declara desde la meta, pieza tras
  pieza, y se recorre con una tortuga. Los arcos salen exactos, con su radio. Si no
  cierra (0,5 px, 0,1°), `construirDePiezas` lanza un error: el arnés ni arranca.
  `construirCircuito` se partió para compartir `completarCircuito` (s, muros, sectores).
- **Las piezas**: recta, curva, `x` (los carriles se cruzan y cada coche pasa al otro),
  `chicane` (S de tres arcos, giro/−2·giro/giro, que sale en la misma línea) y tres
  efectos: `peralte` (agarre ×1,4), `derrape` y `baches` (agarran como una curva de
  radio 330²/800: por encima de 330 px/s derrapan). El cruce del ocho no es pieza:
  `circuito.js` encuentra solo dónde se corta el eje (`circuito.cruces`), y ahí ni los
  muros se recortan ni el arnés exige separación (`enCruce`, ±128 px de s).
- **El carril según `s`**: `punto.carril` va de 1 a −1 en la X (un coseno, sin
  esquinas). Con un número impar de X, cada vuelta empieza por el otro carril
  (`lateralEn`). El coche sigue teniendo solo `s` y velocidad.
- **El choque**: dos coches en el carril a menos de 14 px (`CHOQUE`; en paralelo van a
  30) salen los dos, cada uno hacia su lado. Solo cuenta **al empezar a tocarse y si se
  acercan**: la mano puede dejar uno encima del otro, parados, y al arrancar no vuelven
  a chocar. Así la mano sigue devolviendo cada coche a la `s` donde se salió.
- **La curva de derrape** costó: con el límite para salirse más alto, se pasaba a
  tope, porque el propio derrape frena el coche hasta que agarra (pasaba también con
  el límite ×1,35 y radio 192). Se quedó con el límite de siempre, el derrape que se
  acumula al 40 % y frena al 50 %, y radio 95: sale un 2-3 % más rápida y la cola se
  va más (×1,6). Poca diferencia en números: el playtest dirá si se nota.
- **La CPU** mira el carril que llevará en cada punto y lo que agarra la pieza; trata
  los baches como una curva. No esquiva los choques, como en el juguete.
- **El arnés** corre la sección 3 en los tres circuitos, con cada coche **solo** en la
  pista (si no, el choque ensucia «el prudente no se sale»), y añade: dos coches iguales
  sin X ni cruces no chocan; en cada encuentro (X o cruce), lanzados con 21 desfases,
  chocan en alguno y nunca dos veces seguidas; con una X, los carriles quedan a < 2 %.
- **La portada** tiene una opción más, **CIRCUITO** (tecla C), que se recuerda. Marcas:
  rayas claras por fuera del peralte, arcén gris por fuera de la curva de derrape,
  franjas oscuras en los baches, y las juntas en los límites de las piezas. Un golpe
  sordo (`sfxChoque`) y chispas en el punto del choque.

### Medidas (arnés, 5 vueltas)

| | La horquilla | El ocho | El nudo |
|---|---|---|---|
| Eje | 3627 px | 2945 px | 3623 px |
| Vuelta del prudente | 13,5 s | 10,4 s | 12,4 s |
| Entrar derrapando gana | 11 % | 12 % | 11 % |
| A fondo pierde | 90 % | 40 % | 32 % |
| CPU, por vuelta, tras el mejor | 1,18 s | 0,76 s | 0,77 s |
| Entre carriles | 1,7 % | 1,6 % | 0,3 % (la X) |
| Choques en el encuentro (21 desfases) | — | 8 | 6 |

- La CPU contra el mejor piloto, juntos: 0 choques en seis carreras en cada circuito.
  Chocar pide llegar a la vez: es raro, y por eso asusta.
- El hueco del marcador del ocho queda a 3 px de la pista: cabe justo.

## PWA, páginas por idioma y la app de Android (04/10/2026, rama `06-pwa-y-app`, v0.3.0)

> «Este juego es perfecto para ser PWA + APP estilo Orbit Panic o Phabetia.» Se copia el
> camino de Orbit Panic (su `APP.md`, su generador, su `/app`). Decisiones del usuario:
> `appId` **`es.pnyk.slot`**, la política de privacidad **común de pnyk.es** y llegar
> **hasta el bundle firmado para Play**. Las 5 vueltas se quedan: «no se hace largo».

- **`tools/gen-pages.mjs`** (el `gen-pages.js` de Orbit Panic pasado a módulo ES, porque el
  juego lo es: importa `i18n.js`, `config.js` y `circuitos/` tal cual) genera las siete
  páginas —SEO, hreflang, JSON-LD y una prosa bajo el lienzo para los buscadores—, el
  manifest, el service worker, el sitemap, `robots.txt` y `llms.txt`. `index.html` deja de
  editarse a mano. Regenerar sin cambios no produce diff (el sitemap lleva la fecha del
  último commit).
- **`PRECACHE` sigue los `import` desde `juego.js`**: con 25 módulos, una lista a mano se
  habría olvidado del siguiente. Es también lo que empaqueta la app (`app/sync.sh`).
- **Los módulos no llevan `?v=`**: lo que impide mezclar uno viejo con uno nuevo es la caché
  del service worker, una por versión (la huella de todo lo que precarga). Sin service
  worker sigue valiendo el `no-cache` del `.htaccess`.
- **El idioma de la página manda** (`data-idioma` en `/en/`, `/pt/`…), como en Orbit
  Panic; la raíz y la app usan la preferencia guardada o la del teléfono.
- **`enApp()`** en `config.js`, el único sitio que sabe de Capacitor. Dentro de la app: sin
  service worker, sin prosa ni pie, sin analítica y **sin depuración**: el origen de
  Capacitor es `https://localhost`, que contaba como «sirviendo en local» y sacaba el panel
  de FPS. Lo destapó la primera tanda de capturas.
- **`/app`**: Capacitor 7, `es.pnyk.slot`, `targetSdk` 36, horizontal (`sensorLandscape`) y
  pantalla completa (`MainActivity` esconde las barras del sistema). Icono y arranque desde
  `favicon.svg`; imagen destacada y cinco capturas por idioma (1920×1080, CPU contra CPU en
  marcha: el juego es de módulos y no deja tocar su estado, así que las preferencias se
  siembran en `localStorage` y la carrera se empieza con un Enter).
- **La clave de subida** está en `~/.slotpanic/`, fuera del repositorio. El bundle sale
  firmado (`jarsigner -verify`: «jar verified», CN=Slot Panic).

### Lo que queda (APP.md §8)

Probarla en un móvil por USB, poner Slot Panic en la política común de pnyk.es y crear la
app en la consola de Play.

## Slot Panic en la política común de pnyk.es (04/10/2026, rama `08-privacidad-slot-panic` de pnyk)

- La ficha de `pnyk/proyectos.js` declara `privacy`: GA4 propio (`G-LWMERSV8WH`), solo
  tras consentimiento, y sin récords online. La política común
  (https://pnyk.es/privacidad/#juegos, y su versión en inglés) lo enumera.
- Fusionada en `master` de pnyk y publicada: la página en línea ya nombra Slot Panic.
  Es la URL que enlaza la ficha de Play, así que crear la app en la consola ya no espera
  a nada.

## Gradas y marcador arriba (05/10/2026, rama `08-gradas-y-barra`, v0.3.1)

> Primer paso del constructor (`TODO.md`, Fase 2b): un circuito dibujado por el jugador no
> tiene un hueco en el interior para el marcador, así que el marcador sube a una barra, en
> todos los circuitos. De paso, la grada de El ocho.

- **La grada de El ocho** estaba en `(1060, 470)`, en el hueco vacío de abajo a la
  derecha, de cara a nada (se vio dibujando el eje). Pasa a estar por fuera de la recta de
  meta, en `(560, 165)` y con 380 px: entre la curva de derrape y el cruce.
- **El marcador va en la banda de arriba**: el J1 a la izquierda y el J2 a la derecha (cada
  uno en el lado de su mitad de la pantalla), con quién lo lleva, la vuelta, la mejor y la
  potencia. En el centro, la cuenta atrás o el tiempo; el semáforo y los avisos cuelgan
  debajo, y la ayuda de la cuenta atrás baja a la banda de abajo, en dos líneas.
- **La banda pasa de 46 a 56 px** (`BANDA_TEXTO`): en un móvil horizontal el lienzo se
  queda a ~0,54, y con 46 px la letra del marcador se quedaba en ~10 px reales. Con 56, la
  letra del marcador sube de 18 a 22 y la del tiempo, de 26 a 32. Es lo más que cabe: en
  los tres circuitos lo pisable empieza en y = 58.
- **`interior` es opcional**: la portada va allí si el circuito lo declara y, si no, al
  centro; el cartel de fin ya iba al centro. `zonasVetadas` solo veta el hueco si existe.
- **Arnés**: la prueba del hueco del marcador pasa a comprobar también la barra: lo que se
  pisa no puede quedar debajo. Queda a 2 px en los tres circuitos; el hueco de la portada,
  a 40, 3 y 31. El decorado sigue cabiendo (51 piezas como poco, 12 torres o más).
  226/226 en verde.

## El modo lupa (05/10/2026, rama `09-modo-lupa`, v0.4.0)

> Probando en el móvil: en horizontal la mesa entera se ve pequeña (el coche, ~14 px de
> pantalla) y en vertical solo se pedía girar el teléfono. La idea: en vertical, ver
> ampliado el trozo de pista donde va el coche, con un mapa del circuito arriba, y solo
> contra la CPU.

- **Se activa sola en vertical** (`(orientation: portrait) and (max-width: 900px)`, la
  condición del antiguo aviso «Gira el dispositivo», que se quita) y se sale al girar, a
  mitad de carrera: la carrera es la misma, solo cambia la vista. En el ordenador se
  fuerza con `?lupa`, y `?lupa=1.5` prueba otro zoom.
- **Es presentación** (`lupa.js`, al lado de `pantalla.js`): el mundo se dibuja con las
  mismas funciones dentro de la transformación de una cámara. Ni la física ni el arnés
  cambian.
- **Un jugador**: toda la pantalla es el acelerador del J1 y el otro carril es siempre de
  la CPU. Arriba, el marcador (J1 y CPU) y el mapa: el eje del circuito con la meta y los
  dos coches a tamaño fijo, el J1 con un aro.
- **La vista que giraba con la pista mareaba** (el coche siempre abajo y hacia arriba,
  con el giro suavizado, siguiendo el rumbo de la pista 70 px por delante y no el del
  coche, que coletea). «La FIJA es la más acertada»: la pista quieta y la vista
  adelantada 160 px al coche en la dirección de la pista, con retraso (0,3 s). Se quitó la
  que giraba.
- **Nunca se ve fuera de la mesa**: la vista se acota a los 1280 × 720 y el zoom no baja
  de lo que llena la zona de juego (0,93 en 9:16). El mundo se recorta a la zona bajo el
  mapa y arriba el fondo es liso. Así no hay que pintar nada más allá, ni cuesta nada. Con
  la vista que giraba, por los bordes media pantalla se quedaba en negro.
- **El zoom, 1,2**: con 0,9 el coche se veía igual de pequeño que en horizontal.
- **El lienzo sigue la proporción del móvil**: 540 de ancho y el alto del sitio que hay
  (de 960, 9:16, a 1400). En un 19,5:9 sale 540 × 1169 y no quedan bandas. De lo que pasa
  de 9:16, el 40 % agranda el mapa (230 px en 9:16) y el resto, la zona de juego; en un
  móvil alargado el zoom sube un poco (~1,22) para no salirse de la mesa. Se recalcula al
  girar y al cambiar la barra de direcciones. Tiene la densidad de la pantalla (hasta ×2):
  ampliado, el mundo se veía borroso.
- **La PWA y la app giran**: el manifest pasa de `landscape` a `any` y la actividad de
  Android de `sensorLandscape` a `fullUser` (respeta el bloqueo de rotación). Al girar
  no se recrea la actividad (`configChanges` ya incluía `orientation`).
- En la lupa el pie de la web («Otros juegos», «Cookies») deja de estar fijo, porque caía
  encima del coche: va debajo, al hacer scroll. La prosa de las páginas y `llms.txt`
  cuentan el modo (`page.how5`, siete idiomas).
- Verificado con capturas en un Chrome sin ventana a tamaño de móvil (390 × 844 y
  360 × 640, en la web y con la app simulada) y un primer playtest en el móvil: «bastante
  potencial como solución para el móvil». Arnés: 226/226.

