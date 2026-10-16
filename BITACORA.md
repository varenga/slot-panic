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

---

## Coches con forma (05/10/2026, rama `10-coches`, v0.5.0)

> De `IDEAS.md` › 3, «sus coches». Planos en `_desarrollo/` (Multipla, 2CV, DS,
> Escarabajo, 500 y Espace): ¿se distinguen a 16 px? Si no, tipos genéricos.

- **Se distinguen todos**, como caricaturas: a ~16×8 px de pantalla solo se lee lo
  exagerado, así que cada modelo tiene un rasgo que lo delata. El techo claro del DS y la
  lona del 2CV y del 500 se leen incluso de noche; el escarabajo, por las cuatro aletas;
  el 500, por ser el más corto (17 px); el Espace, por la cuña del parabrisas. No ha
  hecho falta ningún genérico.
- **El Multipla** fue el que costó: con la banda oscura del escalón era una caja. Lo que
  se lee es el **morro más estrecho que la cabina** (±3,4 frente a ±5,5) con los faros
  altos **en los hombros** del escalón (2×2,4 px, casi el doble que los del morro): de
  escritorio se intuye, en la lupa (×2,4) se ven las cuatro luces en trapecio. El plano
  que había es el de 2006, que ya no tiene escalón: se dibujó el de 1998.
- **Las aletas esconden las ruedas**: con las ruedas en el borde de la caja, el 2CV y
  el escarabajo parecían buggies. Cada modelo puede declarar su `via`.
- **Nombres sin marcas**, como «slot»: apodos traducidos (Escalón, Dos caballos/Deuche,
  Tiburón/Déesse, Escarabajo/Coccinelle, Bambino/Cinquino, Monovolumen) y el Clásico de
  Race Panic, que se queda como el último de la lista.
- **Solo cosmético**: la física, los choques, la mano y los faros de `luz.js` siguen con
  la caja de 22×11, y el arnés no cambia (226/226). Se elige en la portada (**COCHE**,
  tecla K), se recuerda (`slotpanic.coche`) y la exhibición lo enseña al momento; el
  J2 o la CPU llevan el siguiente de la lista, nunca el mismo. Por defecto, el Escalón.
- El banco de pruebas, `_desarrollo/coches.html` (no se publica): pinta cada modelo a su
  tamaño real (escritorio, lupa ×1,2 y ×2,4) y lo amplía sin suavizar; `?noche`
  oscurece.
- **Coches más grandes**: con todos los modelos ya dibujados, el coche se perdía en la
  pista, también el de siempre. La caja pasa de 22×11 a **31×15,5** (×1,4): quedan 14 px
  entre los dos coches en paralelo y 9 hasta el borde del asfalto (el arnés exige 4). Los
  modelos se siguen dibujando en 22×11 y `coches.js` los escala. Se probó también ×1,6
  (35×17,5): pasaba el arnés, pero en las curvas cerradas los dos coches iban demasiado
  juntos. El **CHOQUE crece con el coche** (de 14 a 20 px entre centros), para que se
  choquen cuando se ve que se tocan: en cada X o cruce pasan de chocar en 8 y 6 de 21
  desfases a 12 y 9. Cruzarse es más arriesgado, y nunca chocan dos veces seguidas.
- **Los diseños, repasados a la medida nueva**: a 75 px (la lupa, ×2,4) las caricaturas
  pensadas para 16 px eran toscas: ruedas como bloques de buggy, faros cuadrados enormes
  y chapa plana. Ahora el techo va en el color del coche aclarado un 22 % (da volumen),
  hay un contorno fino (pintado *debajo* de la chapa, para que no marque las juntas de
  las aletas), las ruedas apenas asoman (0,6 de la caja) y las luces son óvalos
  pequeños. Y detalles de los planos que antes no cabían: las ventanillas abombadas del
  Escalón, la costura y el rollo de la lona del 2CV, los intermitentes del techo del
  Tiburón, el parabrisas curvo y la rejilla del motor del Escarabajo (el óvalo de antes
  parecían unas gafas), los bigotes del Bambino. En escritorio se siguen leyendo igual.
- **Tres rehechos tras verlos** (el 2CV, el escarabajo y el bambino «tienen un aire» y se
  quedan). El **Escalón**, con el plano del de 1998 (`coche-fiat-multipla-1.jpg`): no
  tiene el morro más estrecho, sino redondo y ancho de punta a punta; los faros altos
  van encima del capó, en sus esquinas, saltones (en una cuenca oscura), y los bajos en
  el parachoques. El **Tiburón** no se parecía: el real mide casi tres veces su anchura,
  así que en la caja de 2:1 solo parece largo si es **estrecho** (±4,2 de ±5,5), con el
  morro ancho y los faros separados en las esquinas, la cola afilada y las ruedas de
  atrás tapadas. El **Monovolumen** no parecía ni un Espace ni un monovolumen: ahora es
  de un solo volumen, sin capó (el parabrisas arranca casi en el morro), con los faros
  rasgados en las esquinas, retrovisores y la cola recta.

## La cuadrícula del constructor (06/10/2026, rama `11-cuadricula`)

> Primera rama de la Fase 2b: el núcleo del constructor, sin interfaz. Un circuito
> dibujado en una cuadrícula ¿se puede correr siempre? Lo que no, que lo prohíba la
> validación antes de llegar a la pista.

- **`nucleo/cuadricula.js`**: 11 × 6 casillas de 110 px bajo la barra. El trazado es la
  casilla y el rumbo de la meta y un paso por casilla (recto, derecha o izquierda) con
  su variante: recta con baches, X o chicane (ocupa dos rectas y se abomba a su lado);
  curva con peralte, derrape o amplia (2 × 2, radio de casilla y media, se lleva la
  recta de antes y la de después). El cruce no se declara: una casilla por la que se
  pasa dos veces, en recta y en perpendicular. `aPiezas()` lo pasa a
  `construirDePiezas` desde el centro de la meta; sectores por tercios (ahora se pueden
  declarar como fracción) y una grada junto a la recta más larga de 3 casillas o más
  con un lado libre.
- **`validarTrazado()` solo usa enteros** (lo repetirá el PHP) y da el motivo y el
  paso: vacio, variante, meta, fuera, abierto, pisa, cruce, amplia, chicane. Lo que el
  arnés vio que no cabía es lo que prohíbe: la chicane necesita libre su lado (en las
  dos casillas) y la amplia, su casilla de dentro; ninguna recta puede ser de dos piezas.
- **El código para compartir**: un byte de versión, la meta y un byte por paso, en
  base64url sin relleno. El mismo trazado da el mismo código (un circuito de 30 casillas,
  46 letras).
- **`nucleo/validar.js`**: la geometría de las secciones 1 y 3 del arnés, sacada para que
  la use el juego. El arnés corre ahora sus secciones 1 a 3 sobre cualquier circuito; a
  los dibujados no les exige las cifras de calibrado (vuelta, ventaja del derrape, CPU,
  cantidad de decorado), solo lo que no puede romperse.
- **Dos ajustes del núcleo que pidió la cuadrícula.** Con dos tramos en casillas vecinas
  (a 110 px) el muro queda a 53 px y el piano entero dejaba 11 px de grava: ahora **el
  piano cede antes que la grava** (`GRAVA_MINIMA`, 16 px). Y en una X corta, la mano
  dejaba los dos coches a poco más de `CHOQUE` y al arrancar volvían a chocar: **dejan
  de tocarse a `CHOQUE` + 8 px** (`HOLGURA_CHOQUE`). Además, `muroCercano` guarda el
  seno y el coseno de cada punto: el arnés lo pregunta miles de veces por punto.
- **Arnés, sección 5**: 10 trazados prohibidos, cada uno por su motivo; 28 van y vuelven
  por su código; 4 a mano (el marco con todas las piezas, un ocho, la serpiente que llena
  la cuadrícula y el mínimo de 6 casillas) pasan las secciones 1 a 3 enteras, y 24 al
  azar con semilla (de 6 a 42 casillas, 135 variantes, 21 cruces) cumplen la geometría
  (tres de ellos también la carrera). 464/464 en verde. Imprime los códigos para
  abrirlos en el juego.
- **`?c=<código>`** abre un circuito de la cuadrícula como «Tu circuito» (siete idiomas),
  el primero de la lista (tecla C) y sin recordarlo. Si no vale, se ignora con un aviso
  en la consola. Sin hueco en el interior, **el panel de la portada tapa parte de la
  pista**; desaparece al correr y se queda así (decidido tras jugarlo).
- **Lo que se ve en los dibujados y no se exige**: en los muy pequeños los carriles
  difieren mucho (el mínimo, 660 y 471 px: un 25 % entre carriles) y a fondo no se sale
  nadie; en el marco y la serpiente la barra queda a 13 px de lo que se pisa. Es el
  precio de dejar dibujar: se cambian de carril en cada carrera.


## El constructor (08/10/2026, rama `12-constructor`, v0.6.0)

> Segunda rama de la Fase 2b: la interfaz del constructor sobre el núcleo de la
> cuadrícula. Dibujar con el dedo, probarlo, guardarlo y compartirlo, en local y sin red.

- **La escena** (`constructor.js`) y **las reglas del trazo** (`nucleo/trazo.js`, en el
  arnés). Se arrastra desde la punta abierta, una casilla vecina cada vez (un arrastre
  rápido se rellena por el eje más lejano); volver por el trazo borra; llegar a la meta
  por detrás cierra; tocar una pieza cambia su variante. Abierto se pinta un trazo
  aproximado con las variantes como iconos. Cerrado y válido, se construye el circuito
  de verdad y se pinta como en la carrera, pero solo al soltar el dedo: en uno grande
  cuesta décimas de segundo.
- **La barra**: volver (si hay cambios sin guardar, el primer toque solo avisa), el
  nombre y el estado en palabras (vacío, abierto, el motivo del error, listo), deshacer
  (60 gestos; sin historial, abre por la meta uno ya cerrado), borrar, eliminar,
  compartir, probar y guardar. Con teclado, cada botón con su tecla.
- **Probar** corre una carrera contra la CPU y al acabar (o con ESC) vuelve al
  constructor con el trazo intacto.
- **«Mis circuitos»** se guardan en `localStorage` (`{ n, codigo }`, «Mi circuito n») y
  salen con la tecla C, detrás de los oficiales. Uno mío se edita y se guarda encima;
  uno abierto desde `?c=` se guarda como nuevo. **Eliminar** pide dos toques (no se
  puede deshacer) y vuelve a la portada.
- **Compartir** da `SITE_ORIGIN` + el idioma + `?c=<código>`, también desde la app, cuyo
  origen es `https://localhost`. Usa el menú de compartir del sistema si lo hay y, si no,
  el portapapeles. **Con el dedo se lanza al soltar, no al pulsar**: un `pointerdown`
  táctil no cuenta como gesto del usuario, y sin gesto el navegador rechaza los dos.
- **CONSTRUIR en la portada** (tecla B) y también **en la de la lupa**, en una última
  fila a todo lo ancho. El constructor siempre es la mesa entera: en vertical se ve
  pequeño, pero entero. Al probar, la carrera vuelve a la lupa.
- **Playtest en el móvil**: «bastante aceptable». Lo de tocar una pieza para cambiarla
  no se ve a la primera, pero se acaba deduciendo, así que se deja como está.
- Para la analítica, `abrir_constructor`, `guardar_circuito`, `compartir_circuito` y
  `eliminar_circuito`. En la prosa de las páginas y en `llms.txt`, una frase sobre el
  constructor (`page.how7`).
- Arnés: 473/473 en verde, con 117 claves en cada idioma.

## Chicanes y campeonato (09/10/2026, rama `13-chicanes-y-campeonato`, v0.7.0)

> Las piezas del juguete que faltaban, a partir de fotos de piezas de verdad (la curva
> deslizante y varias chicanes), un cuarto circuito con ellas y el modo campeonato.

- **La estrecha**: en ella los carriles se juntan. Es lo mismo que la X: el factor del
  carril en cada punto del eje (`punto.carril`) baja con un coseno de 1 a `ESTRECHA`
  (0,4) y vuelve a subir. Dos coches a la par quedan a 12 px, menos que `CHOQUE`, y
  chocan. Hay dos: la **corta**, que se junta y se separa en la misma pieza, y la
  **larga**, con un tramo en que van juntos (`juntos`, la fracción del largo).
  `factorCarril` cuenta también la diagonal de la estrecha, como la de la X.
- **La curva deslizante**: una curva amplia y resbaladiza, con los carriles juntos (una
  recta de entrada que los acerca y otra de salida que los separa) y franjas ámbar a los
  dos lados. Por fuera tiene la escapatoria de la de derrape. `CURVA_DESLIZANTE`:
  - **Una meseta**: hasta ×1,25 del agarre (`tolera`), el derrape no se acumula. El coche
    resbala, la cola sale mucho (`coleteo` 2,2) y frena poco (`freno` 0,1). Por encima,
    el derrape se acumula deprisa (`acumula` 2) y, a fondo, se sale.
  - **Cómo se llegó a esos valores**: con el freno de la curva de derrape (0,4–0,25),
    entrar a tope frenaba el coche hasta quedar en equilibrio justo en la tolerancia, y
    la curva se pasaba entera sin salirse. Con menos freno, a tope se sale en ~100 px
    por los dos carriles.
  - **Playtest en el móvil**: «está bien, no necesita más castigo».
- **El resbalón**: el cuarto circuito oficial.
  - **Las piezas**: la estrecha corta en la recta de meta, una chicane en S en la
    bajada de la derecha, la estrecha larga arriba (360 px, 25 % juntos) y la
    deslizante de 180° y radio 130 a la izquierda.
  - **Cómo se calibró**: la primera versión (curvas de radio 100) era corta y abierta, con
    una vuelta de 8,6 s, y a fondo apenas se salía. La que queda tiene curvas de 70 y 80
    y la deslizante que expulsa a fondo.
  - **Medidas** (arnés, 5 vueltas):
    - Prudente: vuelta de 9,4 s.
    - Entrar derrapando ahorra un 14 %.
    - A fondo se sale 10-14 veces y pierde un 47 %.
    - La CPU deja 0,8 s por vuelta al mejor piloto y choca con él una vez por carrera,
      en las estrechas.
    - Ninguna curva se pasa a tope.
    - En las tres estrechas, los coches chocan en 3-8 de 21 desfases.
- **La mano ya no provoca choques**: en la estrecha larga podía posar un coche a la par
  del otro, que ya había arrancado, y eso contaba como «empezar a tocarse
  acercándose». El paso en que la mano posa un coche (`posado`) ya no cuenta.
- **El campeonato** (`nucleo/campeonato.js`):
  - **Las reglas**: los cuatro oficiales en orden. Gana quien gane más carreras y, con
    las mismas, el menor tiempo sumado. Al que no ha acabado se le pone el tiempo que
    habría hecho a su ritmo.
  - **Cómo se juega**: tecla T o CAMPEONATO en la portada (también en la lupa). Un
    rótulo en la cuenta atrás. El cartel de fin lleva la tabla (tiempos por circuito, el
    del ganador de su color, victorias y tiempo sumado) y SIGUIENTE. ESC lo abandona y R
    no repite una carrera a medias. Al acabar, el confeti es para el campeón si es
    humano.
- **En el constructor**, al final de las listas de variantes, para que los códigos ya
  compartidos sigan valiendo:
  - `estrecha` y `estrechaLarga`, en las rectas. La larga se lleva la recta siguiente,
    como la chicane, pero no necesita libre ningún lado.
  - `deslizante`, en las curvas. Ocupa el bloque de 2 × 2 de la amplia: 40 px de
    entrada y radio 125.
  - Dos motivos nuevos de error: `estrecha` y `deslizante`.
- **El arnés**:
  - **Las estrechas son encuentros**, como las X y los cruces: sin X, cruces ni
    estrechas, dos coches iguales no chocan nunca.
  - **Los coches se lanzan más despacio si hace falta**: el que haya antes del
    encuentro tiene que aguantarlo. En un dibujado, una estrecha puede seguir a una
    curva de media casilla, y a 250 px/s se salían antes de llegar.
  - **El desfase llega a ±80 px**: tras esa curva, el coche de dentro llega ~50 px de
    `s` por delante.
  - **«Chocar dos veces» es en el mismo sitio**: dos estrechas seguidas son dos
    encuentros.
  - **Lo nuevo**: un trazado a mano con las piezas nuevas (`juguete`), dos prohibidos más
    y la sección 6, el campeonato (incluido el desempate). 598/598 en verde, en ~7 s.
- Los mejores momentos quedan planteados en `IDEAS.md` §5.

## Circuitos públicos (08/10/2026, rama `14-circuitos-publicos`, v0.8.0)

> Última rama de la Fase 2b: que lo que se dibuja en el constructor se pueda publicar y
> que los demás lo corran.

- **Lo que estaba decidido**, y se ha hecho así:
  - Sin registro: para publicar basta un alias de 3 letras y una **llave anónima**
    guardada en el dispositivo, que permite borrar lo propio. Sin correo ni contraseña.
  - Se publica al instante y se puede denunciar.
  - El nombre sale de dos listas, sin texto libre.
  - Tres decisiones más: el nombre sale **al azar con «otro»**, se oculta con **3
    denuncias**, que se revisan a mano en la base, y el límite es de **5 publicaciones al
    día**.
- **El servidor** (`api.php`, `schema.sql`, `servidor/cuadricula.php`). Es el de Race
  Panic: PDO, errores en JSON y `config.php` fuera de git.
  - **Galería**: nuevos o más jugados, de 12 en 12.
  - **Publicar**: solo el código canónico y válido. El mismo código es el mismo circuito,
    y otro que dé el mismo trazado se rechaza.
  - **Borrar**, con la llave (se guarda su SHA-256).
  - **Denunciar**: una por huella; con 3 se oculta.
  - **Jugado**: una por huella y día.
  - **La huella** es un HMAC de la IP con una sal de `config.php`: la IP nunca se guarda.
  - **CORS** para la app (`https://localhost`, `capacitor://localhost`) y para las pruebas
    en local.
  - Si falta `config.php`, o le falta una constante, la API lo dice sin enseñar su
    contenido: la primera vez dio un 500 vacío.
  - En una cuenta de denuncias, MySQL evalúa de izquierda a derecha las asignaciones de un
    `UPDATE`: sumar y ocultar van en dos sentencias.
- **La cuadrícula, también en PHP**: un port línea a línea de `deCodigo`, `aCodigo` y
  `validarTrazado`. El arnés compara las dos con `php` (`tools/validar-cuadricula.php`)
  en 648 códigos: los de sus trazados, cientos de mutaciones y cadenas que no son códigos.
  Coinciden en todo, con 9 motivos de error distintos.
- **Los nombres**: 16 adjetivos × 16 sustantivos en cada idioma (`nombre.a.*`,
  `nombre.s.*`).
  - **Género**: el sustantivo lleva su género (`|m`, `|f`) y el adjetivo sus dos formas,
    para que concuerden («PISTA TRAVIESA», «SERPIENTE LOCA»).
  - **Orden**: cada idioma pone el suyo (`nombre.formato`).
  - **Comprobado**: el arnés mira que estén completas y que sean tantas como espera
    `api.php`.
- **El cliente**:
  - **Red** (`publicos.js`): la galería se pide sin bloquear. Sin red lo dice y se sigue
    jugando.
  - **Galería** (`galeria.js`): sustituye a CONSTRUIR en la portada (tecla G) y lleva el
    constructor dentro.
    - **Tarjetas**: 12 en 4 × 3 (2 × 6 en la lupa), cada una con la miniatura del trazo
      aproximado, el nombre, el alias y las jugadas. Construir doce circuitos de verdad
      sería caro en el móvil.
    - **Elegir** uno lo lleva a la portada; la carrera apunta una jugada.
    - **Borrar y denunciar**: la ✕ borra lo propio y la ⚑ denuncia lo ajeno, las dos con
      un segundo toque.
  - **Compartir** abre un diálogo (`publicar.js`): copiar el enlace o publicar.
    - **Normas**: se aceptan la primera vez.
    - **Nombre y alias**: el nombre sale al azar, y el alias son tres letras con ▲▼ o
      tecleadas, que se recuerdan.
    - **Al soltar**: los botones del diálogo actúan al soltar el dedo, porque el
      portapapeles pide un gesto completo.
  - **Fin de carrera**: en un circuito ajeno, DENUNCIAR (un segundo toque para
    confirmar).
- **Probado contra la base de Plesk**:
  - **Con `curl`**: publicar, que no se duplique, los rechazos (código, alias y nombre),
    jugado una vez, la denuncia que no se repite, el CORS (sí a la app, no a ajenos),
    borrar sin la llave (403) y el límite (la sexta, 429).
  - **Desde el juego**, en local con `?api=`: publicar desde el constructor, verlo en la
    galería, jugarlo (sube a 1 jugada) y borrarlo con la ✕.
  - **Sin probar**: que se oculte con 3 denuncias, porque cada una tiene que venir de una
    IP distinta.
- **El servidor salió antes**: `api.php` y lo suyo se publicaron en `master` antes que el
  juego, para probar la API, y el juego publicado no lo usaba.
- **Privacidad y Play**:
  - **La política común de pnyk.es** gana el campo `privacy.content` («contenido que
    publicas») y un párrafo con la finalidad, la base legal (interés legítimo en evitar
    abusos), la conservación y cómo pedir el borrado (rama `10-slot-panic-publicos` de
    pnyk).
  - **Google Play**: en `app/store/play-console.md`, la seguridad de los datos (desde la
    v0.8.0 sí recoge: el contenido publicado y los identificadores, sin compartirlos) y la
    política de contenido de usuarios (normas, denuncias y moderación).
- Arnés: 620/620 en verde.

## CIRCUITOS en la portada (08/10/2026, rama `15-menu-circuitos`, v0.8.1)

> En el ordenador no se encontraba el constructor: en la v0.8.0 la opción CONSTRUIR de la
> portada se cambió por GALERÍA, y el constructor quedó dentro de la galería (o en la
> tecla B, que ya no se veía escrita en ningún sitio).

- La opción de la portada pasa a ser **CIRCUITOS** (tecla G), y abre una pantalla con dos
  botones grandes: **GALERÍA** («corre los que ha publicado la gente») y **CONSTRUIR**
  («dibuja el tuyo en una cuadrícula»). Están uno al lado del otro en la mesa y uno
  encima del otro en la lupa. Con el teclado, G y B. La B de la portada sigue abriendo el
  constructor directamente.
- Se descartaron dos alternativas: volver a poner CONSTRUIR en la portada (nueve opciones
  en la barra, con la letra aún más pequeña) y dejarlo dentro de la galería con un rótulo
  «GALERÍA · CONSTRUIR».
- La pantalla está en `galeria.js` (`cajasCircuitos`, `dibujarCircuitos`); sus cajas
  sirven al dibujo y a la pulsación.

## Récords de vuelta y fantasma (08/10/2026, rama `16-records`, v0.9.0)

> De la Fase 2: «Récords (y fantasma) por circuito y carril». Con el servidor y la
> base de los circuitos públicos ya en marcha, lo que más cambia el juego en solitario.

- **Decidido**: la marca es la **mejor vuelta** (no depende de la salida ni de chocar con
  la CPU); **una tabla por circuito**, que apunta el carril de cada marca (los carriles
  se alternan solos en cada carrera); fantasma **propio y del récord**; solo en los
  **cuatro oficiales**.
- **El fantasma** (`nucleo/fantasma.js`), el de Race Panic:
  - **Grabar**: cada vuelta se graba a 1/30 s, interpolada entre pasos de física, con el
    ángulo desenrollado y una muestra más al cerrar. Así derrapa como derrapó y, si se
    salió, la mano también lo devuelve.
  - **Arrancar**: cada vuelta empieza con la pose de su salida (sin ella, la primera
    muestra llegaba 1/120 s tarde: ~3 px).
  - **Solo si se pide**: `slot.js` graba con `crearCarreraSlot(…, { grabar: true })`. El
    arnés, que corre miles de carreras, solo graba donde lo mide.
  - **Medidas**: se separa 0,5-0,85 px del coche (el error de unir con rectas las
    muestras de una curva cerrada) y la mejor vuelta ocupa 4-6 KB.
- **En el dispositivo**:
  - **Qué cuenta**: una vuelta que da entera una persona (tomó el carril antes de
    empezarla) y baja de su mejor vuelta es récord personal.
  - **Guardado**: se guarda con su fantasma y sale el aviso «¡RÉCORD DE VUELTA!».
  - **En carrera**: el fantasma del J1 va translúcido (0,3) y debajo de los coches. El
    del récord se mira al pintar, porque la tabla puede llegar con la carrera en marcha.
- **El servidor** (`api.php`, `servidor/records.php`, la tabla `records`):
  - **Llamadas**: `GET ?records=<circuito>` da los 10 mejores y el fantasma del primero;
    `POST record` guarda la vuelta (las 50 mejores por circuito, 60 envíos al día por
    huella) y devuelve el puesto.
  - **Una vuelta inventada tiene que venir con una vuelta entera que la cuadre**: el
    mínimo de cada circuito (el 80 % del mejor piloto automático: 9,3 / 7,0 / 8,7 /
    6,5 s); el tiempo del fantasma igual al enviado; las muestras que tocan; todo dentro
    de la mesa; nunca más de 60 px entre muestras (la mano incluida); y la primera,
    junto a la meta.
  - **Comprobado en el arnés**: compara las constantes con el juego y pasa al PHP 4
    vueltas de verdad y 20 trucadas.
- **En el juego**:
  - **Portada**: en un oficial, un botón con el récord y tu mejor vuelta (y la tecla R)
    abre RÉCORDS (`tablaRecords.js`): los 10 mejores con su carril, tu mejor vuelta y
    contra qué fantasma se corre (el tuyo, el del récord o ninguno; tecla F).
  - **Firma**: al acabar, si la mejor vuelta humana entra en la tabla, se firma con el
    alias de 3 letras antes del cartel, y luego se ve la tabla con la tuya parpadeando.
    En el campeonato y en la prueba del constructor, no.
- **Probado contra la base de Plesk**:
  - **Con `curl`**: se rechazan el tiempo trucado, el fantasma de otro circuito y un
    circuito inexistente; se acepta la vuelta de verdad (puesto 1, con su fantasma).
  - **Desde el juego**, con `?api=`: la portada muestra el récord, se corre contra el
    fantasma descargado, y firmar lleva a la tabla con el puesto resaltado.
  - Los récords de prueba (alias ZZT) se borraron a mano.
- **Privacidad**: la ficha de pnyk gana sus `records`, y el párrafo de las tablas de
  récords, la excepción de la huella cifrada (rama `11-slot-panic-records` de pnyk). Las
  respuestas de Play cuentan también los récords.
- Arnés: 659/659 en verde, en ~20 s (la máquina va más lenta que cuando se midieron los
  7 s; no hay una sección culpable).

## Slot Panic 1.0.0 (08/10/2026)

> «Primera versión publicada y enlazada desde pnyk.es» (`pnyk/comun/CONVENCIONES.md`):
> el juego ya está en slot.pnyk.es y tiene su ficha en pnyk.es. Con los récords, lo que
> se quería de un juego completo está dentro: carrera, campeonato, récords, constructor
> y galería, en siete idiomas, en la web y como PWA.

- **La lista de un proyecto publicado** (`CONVENCIONES.md`), repasada: páginas por idioma
  con hreflang y canónica, `sitemap.xml`, `robots.txt` y `llms.txt`, JSON-LD, GA4 solo
  tras consentimiento con su botón «Cookies» y la política común de pnyk.es, pie con
  `pieRed()`, `pnyk.json` al día y assets con `?v=`. Faltaba la **imagen para compartir**:
  era el icono de 512 px y ahora es una captura de 1200×630 de una carrera en El
  resbalón (`og.jpg`, con `tools/gen-og.mjs`, como las de la tienda), con
  `twitter:card` `summary_large_image`.
- **`pnyk.json`**: 1.0.0 y etapa «publicado».
- **pnyk.es**: la ficha cuenta ya el campeonato, los récords con fantasma, el constructor
  y la galería, con la imagen nueva (rama `11-slot-panic-records` de pnyk).
- **Lo que queda** sigue en `TODO.md`: los playtests (a dos, la lupa, la galería y los
  récords) y la app de Google Play.

## Carreras de 3, 5 o 10 vueltas (09/10/2026, rama `17-vueltas`)

> La primera «dificultad» que se elige: no la de la CPU (sigue en `TODO.md`) sino lo
> larga que es la carrera. Una corta es para echar una; una larga castiga salirse a
> menudo y deja remontar.

- **`CARRERAS`** (`config.js`): rápida (3), normal (5, `VUELTAS_SLOT`, la de serie) y
  resistencia (10). Las vueltas son de cada carrera (`crearCarreraSlot(…, { vueltas })`,
  `carrera.vueltas`): las cuentan `contarVueltas`, el marcador (`vueltaSlot(carrera,
  slot)`), el aviso de la última vuelta y el tiempo a su ritmo del que no acaba en el
  campeonato (`tiempoFinal`). La física y la CPU no cambian.
- **En la portada**, una opción más, **CARRERA** (tecla V), que se recuerda
  (`slotpanic.carrera`) y vale también para el campeonato; el panel dice las vueltas
  («EL RESBALÓN · 10 VUELTAS»). Los récords no dependen de ella: son de vuelta.
- **Nueve botones no caben iguales** en la banda: con el mismo ancho, «CIRCUITO: EL
  RESBALÓN» encogía a 9 px. Ahora cada botón mide lo que su etiqueta y lo que sobra se
  reparte (`opcionesPortada(etiquetasPortada(…))`, la misma para dibujar y pulsar): la
  letra queda igual en todos, también en francés. En la lupa son cinco filas; cabe en
  9:16 (360 × 640).
- GA4: `empezar_carrera` y `empezar_campeonato` llevan `vueltas`.
- Arnés: las tres carreras acaban en sus vueltas (La horquilla: 0:37,9, 1:02,5 y 2:04,1)
  y el que va a medias cuando llega el ganador se lleva el doble con sus vueltas, no con
  las de serie. 665/665 en verde.

## Niveles de CPU: fácil, normal y difícil (09/10/2026, rama `17-vueltas`)

> La otra dificultad, la de `TODO.md`: una sola CPU (~1,2 s por vuelta del mejor piloto
> en La horquilla) era mucho para quien empieza y poco para quien ya la gana.

- **`NIVELES_CPU`** (`config.js`): la normal es `CPU_SLOT`, tal cual. Las otras dos, de un
  barrido de prudencia, variación y fallos en los cuatro oficiales (seis semillas por
  los dos carriles), con lo que deja por vuelta al mejor piloto automático:

  | nivel | piloto | Horquilla | Ocho | Nudo | Resbalón |
  |---|---|---|---|---|---|
  | fácil | ×0,9 ± 25 %, 8 % de fallos | 2,31 s | 1,73 s | 1,79 s | 1,63 s |
  | normal | ×1,2 ± 25 %, 5 % | 1,18 s | 0,76 s | 0,77 s | 0,81 s |
  | difícil | ×1,35 ± 15 %, 3 % | 0,68 s | 0,44 s | 0,37 s | 0,48 s |

  La fácil, en torno a los 2 s del «ahora es fácil» de los playtests de Race Panic; la
  difícil, por debajo de los 0,7 s de la CPU perfecta que «no había quien le ganara», pero
  aún falla alguna vez. ×1,45 ± 12 % bajaba a 0,26-0,54 s: se descartó por imbatible.
- **En la portada**, la opción **CPU** (tecla D), que se recuerda (`slotpanic.cpu`) y vale
  para la carrera, el campeonato y la prueba del constructor; la exhibición no cambia.
  Diez botones en la banda; en francés encogen un poco. En la lupa, cinco filas de dos.
- GA4: `empezar_carrera` y `empezar_campeonato` llevan `cpu`.
- Arnés: en cada oficial, la fácil deja 1,3-3 s, la difícil 0,25-0,8 s y van en orden.
  677/677 en verde, en ~28 s (antes ~20).

## Primer playtest de los niveles y anochece en la de resistencia (09/10/2026, rama `17-vueltas`)

> Playtest de la CPU a 3 vueltas: la fácil «es sencilla de ganar, como debe ser» (dos
> salidas propias contra una de la CPU, y aun así ganada); la difícil «no se siente
> demasiado complicada»: perdida, pero razonablemente cerca, con dos salidas contra una.
> Se quedan como están. Y una petición: que en las de 10 vueltas la luz pase de día a
> atardecer y a noche.

- **La luz es un número** (`luz.js`): 0 de día, 1 al atardecer, 2 de noche, y entre medias
  se funden. Hasta 1 crece el velo del atardecer; de 1 a 2 se va mientras la capa de la
  noche (y sus focos, balizas y flashes) sube con la misma fuerza. Las horas fijas
  pintan lo mismo que antes.
- **`luzDeCarrera(hora, fracción)`**: por lo que lleva corrido el primero, el primer
  quinto con la hora elegida, cae la tarde hasta el 40 %, atardecer hasta el 60 %,
  anochece hasta el 80 % y el resto de noche. **El ciclo entero, sea cual sea la hora
  elegida** (se probó a partir de ella, sin aclarar nunca, y se prefirió que la
  resistencia sea siempre «la carrera que dura un día»). Solo en la de resistencia
  (`anochece` en `CARRERAS`); la exhibición de la portada y las demás carreras siguen
  con su hora.
- Visto en una carrera entera de CPU contra CPU en El ocho (1:35): de día hasta la
  vuelta 2, atardecer en la 5-6, anocheciendo en la 7-8 y noche cerrada en la 9-10.
- Arnés: la luz de la resistencia empieza de día, pasa por el atardecer a mitad de
  carrera, acaba de noche y nunca se aclara; solo anochece la de resistencia.

## Slot Panic 1.1.0 (09/10/2026)

> Una funcionalidad visible (`CONVENCIONES.md`): la carrera se elige. Rápida, normal o
> de resistencia (3, 5 o 10 vueltas, y en la de 10 anochece), contra una CPU fácil,
> normal o difícil.

- **`pnyk.json`**: 1.1.0. Se publica junto con lo de la rama `16-records` (los récords
  de vuelta en el juego, 0.9.0, y la 1.0.0), que no había llegado a `master`: allí solo
  estaba el servidor de los récords. Los tags `v0.9.0` y `v1.0.0` se ponen ahora, en sus
  commits.

## La sombra de las torres sigue al sol (09/10/2026, rama `18-sombras`)

> Playtest a 10 vueltas: «el anochecer ha quedado muy realista»; las 10 vueltas de la
> resistencia «van perfectas, no se hace largo, es resistencia». La CPU, bien: «en nivel
> fácil le ganas con facilidad», y en el difícil «hay que estar muy atento para poder
> ganarle, pero no se hace imposible». Una corrección: la sombra de las torres no se
> movía (22 px abajo a la derecha, horneada en el fondo, también de noche). De día casi
> no tiene que haber; al caer la tarde, alargarse y girar, y al ponerse el sol, irse.

- **`sombraTorre(luz)`** (`luz.js`): un sol con altura y dirección. La altura baja de 65°
  a mediodía a 15° al atardecer y a 3° al ponerse (luz 1,5); la sombra mide lo alto de
  la torre (8 px) entre la tangente de la altura, hasta 90 px, y gira de 80° (casi hacia
  abajo) a 35°. Se desvanece entre luz 1,1 y 1,6: de día y al atardecer, 0,28; de noche, nada.
  Mide 4 px de día, 30 al atardecer, 58 (más tenue) anocheciendo.
- **Las torres salen del fondo horneado** (`dibujarTorres` en `dibujo.js`): sombra y torre
  se pintan cada fotograma, encima de los carriles (son lo más alto) y debajo de los
  coches. Son ~20 líneas y rectángulos: no se nota. En el constructor, siempre de día.
  El resto del decorado sigue con su sombra fija: son bajos.
- Arnés: la sombra mide < 6 px de día y > 20 al atardecer, se alarga mientras se apaga,
  gira al caer la tarde y de noche no hay. 684/684 en verde.

## Slot Panic 1.1.1 (09/10/2026)

- Corrección sin funcionalidad nueva: la sombra de las torres sigue al sol. `pnyk.json`: 1.1.1.

## Los árboles y las gradas también siguen al sol (09/10/2026, rama `19-sombras-decorado`)

> Tras la de las torres: que giren también las sombras de los árboles y las gradas.

- **`sombraSol(luz, alto)`** (`luz.js`): el sol de `sombraTorre`, para cualquier alto
  (la de las torres es la de 8 px). Nada da una sombra de más de 11,25 veces su alto.
- **El fondo, en dos capas** (`dibujo.js`): el suelo con la pista, y el decorado (gradas
  y piezas) sin sombra, transparente; las dos se hornean como antes. Entre una y otra,
  cada fotograma, las sombras: cada cosa barrida desde su base hasta donde cae la de su
  copa (círculos) o su escalón más alto (rectángulos), en un trazado y un relleno por
  tipo para que no se oscurezcan donde se pisan. Lo alto de cada pieza, en radios: pino
  1,5, cactus 1,2, árbol 1, arbusto 0,5, roca 0,35; la grada, 7 px. Las de los árboles
  no pasan de 6 radios.
- A mediodía quedan como antes (desplazadas medio radio abajo a la derecha); al caer la
  tarde los árboles echan sombras largas en diagonal y la grada cubre la grava que tiene
  delante; de noche no hay. En el constructor, de día.
- Arnés: la sombra del decorado es proporcional a lo alto. 685/685 en verde.
- **En el móvil, los FPS van bien** también al atardecer de una resistencia, con las
  sombras más largas (playtest tras publicar la 1.1.2): no hace falta hornear la capa de
  sombras solo cuando cambia la luz.

## Slot Panic 1.1.2 (09/10/2026)

- Corrección sin funcionalidad nueva: las sombras de los árboles y las gradas siguen al
  sol, como las de las torres. `pnyk.json`: 1.1.2.

## El menú por grupos y el coche de cada uno (09/10/2026, rama `21-menu-y-coches`)

> La barra de la portada tenía diez opciones y en un portátil la letra bajaba a 9-11 px.
> Se agrupan, y de paso cada jugador elige su coche, su color y (con teclado) si juega.

- **Cuatro grupos** (`menu.js`): CARRERA (modo, circuito, vueltas, CPU y, con teclado,
  J1 y J2), COCHE, CIRCUITOS (su escena de siempre: galería y, un nivel más abajo, el
  constructor) y AJUSTES (escenario, hora, sonido, idioma). En la mesa van en la banda
  de arriba, a 17 px; en la lupa, abajo, de dos en dos. Cada uno abre un panel sobre la
  pista (más opaco que el de la portada, para que las filas se lean); un toque fuera lo
  cierra sin arrancar. Con teclado siguen todas las teclas directas sin abrir nada, y
  cada fila lleva la suya.
- **Dos contextos, no cuatro**: con teclado o tocando (la PWA del móvil y la app, con
  las mismas decisiones). Girar el móvil no esconde opciones; la lupa solo quita lo que
  no cabe (jugar dos, y el coche del J2, que es de la CPU).
- **El modo** (carrera suelta o campeonato) es una opción que se recuerda: ENTER o el
  toque arranca lo elegido. La T ya no arranca el campeonato: cambia el modo. En modo
  campeonato la portada dice «CAMPEONATO · 4 CIRCUITOS · n VUELTAS» y no enseña los
  récords (no se firma en el campeonato).
- **Quién juega**, con teclado: J1 y J2, HUMANO o CPU (teclas 1 y 2), recordado; por
  defecto, el J1 contra la CPU. El carril de la CPU no se toma pulsando, y el humano lo
  es desde la salida (cuenta para los récords). Tocando, como antes: cada mitad es de la
  CPU hasta que alguien la toca.
- **De qué carril sale cada uno**: en la cuenta atrás, una etiqueta del color de cada
  coche en la parrilla, al lado de fuera de su carril, y las teclas de cada humano en
  su panel. En la portada, la banda de abajo dice quién lleva cada coche, cuál y con
  qué teclas. Los carriles se siguen cambiando en cada carrera.
- **COCHE**: una columna por jugador con el coche en grande, sus flechas (o tocar el
  coche) y ocho colores (`COLORES_COCHE`, los dos primeros los de siempre). El modelo
  puede repetirse; el color no: coger el del otro es cambiárselo. Se recuerdan.
- Arnés: 685/685 en verde (no toca la física); 7 idiomas con las mismas claves.
- **Probado en el móvil** (horizontal y lupa): bien. **El constructor se queda en la
  app**: quitarlo no ahorraba nada para publicarla (lo que pide trámite en Play es la
  galería, y está contestado en `app/store/play-console.md`).

## Slot Panic 1.2.0 (09/10/2026)

- El menú por grupos, quién juega con teclado y el coche y el color de cada uno.
  `pnyk.json`: 1.2.0.

## Coches con características (09/10/2026, rama `23-coches-con-caracter`)

> Fase 2d: «los coches ahora tienen forma distinta, más o menos ancho, más o menos largo.
> Y su física cambia».

- **`COCHES`** (`config.js`): cada modelo, su `largo` y tres multiplicadores sobre el
  coche de siempre: `acelera` (divide `INERCIA_MOTOR`), `agarre` (`AGARRE_SLOT`) y
  `punta` (`VELOCIDAD_SLOT`). El **clásico** es ×1 y 31 px: el de siempre, y con él
  siguen valiendo los récords de antes. `slot.ficha` lo lleva al núcleo; `ponerModelo`
  lo cambia (también con la exhibición de la portada en marcha). El piloto automático
  conoce el agarre del suyo.
- **La aceleración es del motor, no del gatillo**: `SUBE_POTENCIA` es del mando (a
  toques todos se dosifican igual); lo que cambia es `INERCIA_MOTOR`.
- **El presupuesto, pesado por lo que vale cada cosa**: medido con el prudente, un 10 %
  de agarre baja la vuelta un 3,5 %, de punta un 2 % (con el fino, 2,7 %) y de
  aceleración un 0,8 % (1,4 %). Con una suma sin pesos el que agarraba ganaba en todas
  (−3 a −4,5 %) y el bambino perdía un 6-8 %. `PESO_CARACTER` = 0,25 / 1 / 0,65.
- **El margen es estrecho**: el clásico está en el filo de dos reglas a la vez. A fondo
  se sale justo 2 veces por vuelta en tres oficiales, y el humano que reacciona tarde
  aguanta justo 0,25 s (en La horquilla y El nudo). Un coche con más velocidad para su
  agarre (un 4 % más de punta, o un 40 % más de aceleración) hacía salirse al humano
  tardío en la misma curva todas las vueltas; con menos (el que agarra y tarda en
  coger velocidad), a fondo pasaba curvas sin salirse. Por eso las reglas, para los
  demás modelos: a fondo ≥ 1 salida por vuelta y > 20 % de pérdida, y el humano
  tardío a 0,2 s. Ninguna curva se pasa a su punta, sin excepción.
- **Los siete** (largo, acelera, agarre, punta): clásico 31, ×1; escalón 29, 1,16 /
  0,96 / 1; dos caballos 29, 0,8 / 1,02 / 1,04; tiburón 35, 0,69 / 1 / 1,12; escarabajo
  30, 0,9 / 1 / 1,04; bambino 27, 1,3 / 0,94 / 0,975; monovolumen 33, 1 / 0,975 / 1,04.
- Medido: el prudente, de −1,2 a +1,7 % del clásico; el más rápido con el mejor piloto
  automático, el monovolumen en La horquilla y El ocho y el escarabajo en El nudo y El
  resbalón; el más lento, el bambino en los cuatro (0,6-1 %), que sale de la mano
  antes que nadie: el playtest dirá si compensa. La CPU, en sus márgenes con todos.
- **El largo juega**: el `CHOQUE` crece con la media de los dos largos (de 18 a 22,6
  px); la holgura para dejar de tocarse se recorta para que no pase de `2 · CARRIL − 2`
  (dos largos que salen juntos de una X seguían «tocándose» en paralelo y no chocaban en
  la siguiente). Cada modelo se dibuja a su largo con la misma escala a lo largo y a lo
  ancho (`mide` en `coches.js`): de 13,4 px de ancho (tiburón) a 16,5 (monovolumen).
- **Récords: una tabla con todos los coches**. Cada vuelta guarda su coche (`c` en el
  fantasma, columna `coche` en `records`); el fantasma se pinta con su forma y el color
  del J1; la tabla dice el coche de cada vuelta. Sin coche (una caché vieja, o una marca
  de antes) es el clásico, que es justo la física que tenían. El mínimo del servidor no
  cambia: con el más rápido de cada oficial queda en el 75-77 % de su vuelta.
- **COCHE enseña lo que tiene**: con teclado, una tabla (+16 %, −4 %, 29 PX); tocando,
  barras con una marca en el clásico. En la lupa, la ficha va al lado del coche: debajo
  se salía 96 px del marco.
- Arnés: la sección 3b (cada modelo en cada oficial) y la 7 con el coche más rápido.
  993/993 en verde, ~33 s (antes ~9: la 3b corre cada modelo en cada oficial; la sección 3
  se reescribió con ayudantes por modelo).
- **La base, ya con la columna**: `ALTER TABLE records ADD COLUMN coche…` (el final de
  `schema.sql`) ejecutado en Plesk antes de publicar el `api.php` nuevo.

## Multiplo y Cinquecenti (09/10/2026, rama `23-coches-con-caracter`)

> «Escalón → Multiplo, Bambino → Cinquecenti. Y en el Multiplo, los faros pegados al
> parabrisas, algo más pequeños y orientados hacia la carretera.»

- **Solo cambian los nombres** (`coche.escalon` y `coche.bambino` en `i18n.js`, iguales en
  los siete idiomas: son apodos, no traducciones). Los id siguen siendo `escalon` y
  `bambino`: con ellos se guardan los récords (columna `coche`) y lo que eligió cada uno.
- **Los faros de arriba del Multiplo**: de un óvalo de 2 × 1,5 en x = 6, separado del
  parabrisas, a una cuenca de 1,8 × 1,4 pegada a su borde (x = 5,8) con la lente solo en
  la mitad de delante (0,8 × 1,1): miran a la carretera. Visto a 12 y a 4 aumentos.

## Slot Panic 1.3.0 (09/10/2026)

- Los coches con características: cada modelo con su largo, su aceleración, su agarre y
  su punta; récords con todos los coches en la misma tabla; COCHE enseña lo que tiene
  cada uno. Multiplo y Cinquecenti. La columna `coche` ya estaba en la base antes del
  push. `pnyk.json`: 1.3.0.

## Playtest de los coches (09/10/2026)

> «Todo correcto en el playtest (ordenador y móvil).»

- El carácter de cada coche, los nerviosos, el Cinquecenti y las barras del móvil: sin
  nada que cambiar. La fase 2d queda cerrada.

## La estética de juguete, descartada (09/10/2026, rama `25-maqueta-juguete`)

> «Me quedo con la estética tal cual la teníamos. La mezcla actual entre real y juguete me
> convence más: en ella entran mejor el día, el atardecer y la noche, la iluminación y los
> escenarios.»

- **La prueba**: una maqueta tras `?juguete` (solo en local), sin tocar nada que mida el
  arnés (993/993 en verde): mesa de madera, bordes de plástico gris en la zona de la
  grava, pista negra con trencillas trenzadas y juntas de muro a muro (en la chicane,
  solo la pista: si no, se cruzaban con el borde de la curva de al lado), pianos de
  colores planos, gradas y neumáticos de plástico, y objetos de mesa en el sitio de los
  árboles (con todos, la mesa parecía un cajón vaciado: uno de cada tres).
- **Por qué no**: la luz realista (atardecer, noche, torres, faros) no tiene tanto
  sentido sobre una mesa, y los cuatro escenarios se pierden. A escala de un coche de
  slot, los objetos de mesa quedan pequeños o se comen la pista.
- **Guardada**: la rama `25-maqueta-juguete` no se fusiona. Volvió enseguida como un
  escenario más (la entrada siguiente).

## El escenario juguete (09/10/2026, rama `27-escenario-juguete`)

> «Vamos a crear el quinto escenario basándonos en la maqueta. Que sea un escenario como
> los otros, donde la iluminación funcione igual. La mesa está perfecta; los elementos
> sobre ella, más grandes.»

- **Un escenario, no una bandera**: `ESCENARIOS.juguete` (el quinto, tecla E y AJUSTES),
  con `juguete: true`. Es el único que cambia también la pista: lo leen `dibujarFondo`,
  `dibujarCarriles` (que ahora recibe el decorado, y su capa se rehace al cambiar a o
  desde el juguete) y las torres. `?juguete` y el `JUGUETE` de `config.js` desaparecen.
  Nombre en los siete idiomas (JUGUETE, TOY, BRINQUEDO, XOGUETE, JOGUINA, GIOCATTOLO,
  JOUET).
- **Las cosas de la mesa, piezas del decorado**: siete tipos propios (`taza`, `lata`,
  `lapiz`, `moneda`, `chapa`, `dado`, `ladrillo`) con sus pesos y tamaños en
  `decorado.js`, en vez de pintar otra cosa encima de los árboles. Así el arnés mide que
  no pisan nada, y su sombra es la del sol (`pintarSombras`, con su `ALTO_PIEZA`): se
  alarga al atardecer y se va de noche, como la de los árboles. Lo alargado (lápiz,
  pieza de construcción, dado) barre su rectángulo, no un círculo.
- **Más grandes y menos**: de r 4-17 (los árboles) a 10-34 (una taza ~40 px, un lápiz
  ~55: algo más que un coche). Con 90 la mesa era un cajón vaciado: `cuantas: 45`. Para
  que quepan 45 de ese tamaño hacen falta más intentos (`intentos: 20000`; en La
  horquilla, con 6000, solo 35). Generarlo cuesta ≤ 60 ms en los oficiales.
- **`cabe()` mira antes lo barato** (lo ya puesto) que la distancia a la pista: el mismo
  resultado (los otros escenarios dan las mismas piezas), menos trabajo.
- **Torres**: farolas de plástico, base blanca y cabeza roja; de noche, la misma luz.
  Neumáticos, gradas y pianos, los de la maqueta; los neumáticos sin sombra propia,
  como en los demás.
- Visto de día, al atardecer y de noche en El ocho. Arnés: 1041/1041 en verde (48 más:
  el decorado del juguete en cada circuito, oficial o de la cuadrícula). Hoy tarda ~3 min
  con o sin el juguete: la máquina va más lenta que el día de los coches.

## Slot Panic 1.4.0 (09/10/2026)

- El quinto escenario: juguete, una mesa de madera con la pista de plástico.
  `pnyk.json`: 1.4.0. Con esto, la estética de juguete queda cerrada.

## El botón COMUNIDAD (09/10/2026, rama `28-boton-comunidad`)

- El tercer grupo del menú se llamaba CIRCUITOS y despistaba: parecía el sitio donde se
  elige el circuito oficial, que está en CARRERA. Ahora es **COMUNIDAD** (COMMUNITY,
  COMUNIDADE, COMUNITAT, COMUNITÀ, COMMUNAUTÉ), también en el título de su escena: ahí
  están los circuitos que comparte la gente y el constructor para hacer y publicar el
  tuyo. «Compartidos» no abarcaba el constructor. Solo cambian las cadenas
  (`opcion.circuitos`, `circuitos.titulo`); las claves y los `id` se quedan.

## Los coches, a escala (10/10/2026, rama `29-coches-a-escala`)

> «Te paso los tamaños reales de los modelos para intentar que conserven la proporción
> entre ellos», con tres vistas cenitales nuevas (2CV, tiburón y Multiplo) en
> `_desarrollo/cenital*`.

- **El largo sale del coche de verdad**: 37 · (mm / 4874)^0,79, el tiburón en 37 px.
  Con la proporción exacta el bambino mediría 22 px al lado de 37: en escritorio, 16 px
  de pantalla, y difícil de alcanzar en una X. El exponente conserva el orden y aprieta
  las diferencias a todos por igual. Antes → ahora: tiburón 35 → 37 (4874 mm),
  monovolumen 33 → 37 (4856), escarabajo 30 → 32 (4070), escalón 29 → 32 (3994), dos
  caballos 29 → 31 (3860), bambino 27 → 25 (2970). El clásico no es de verdad y se
  queda en 31. El arnés admite ahora 25-37 px (antes 27-35).
- **El ancho, de la proporción de cada uno**: la mitad de su ancho de dibujo es
  11 · ancho / largo · 1,15 (el 15 %, lo mismo a todos: de juguete). Antes todos iban en
  la caja de 2:1; ahora el tiburón es el más afilado (2,35:1) y el Multiplo el más chato
  (1,86:1). Todos se dibujan en 22 unidades de cola a morro (`mide` desaparece) y llevan
  sus `medidas` en mm. Anchos en píxeles: de 12,8 (bambino) a 17,2 (Multiplo).
- **Rehechos con las cenitales**: el **dos caballos**, con las aletas de delante
  hasta el morro y los faros encima, el capó acanalado que se estrecha hasta la rejilla
  y la ventanilla de atrás en la lona (en vez del rollo); el **tiburón**, con el morro
  redondo, el parabrisas curvo, el techo claro hasta una luna que se estrecha y la cola
  afilada; el **Multiplo**, con el parabrisas enorme y curvo, los retrovisores a la
  altura del salpicadero, las ventanillas que abomban y cuatro nervios en el techo.
- **Y los otros tres**, con las cenitales del 500 y del escarabajo y una foto del
  monovolumen grande (el de 2006; cenital no la hay). El **escarabajo** deja de ser una
  burbuja con aletas: las cuatro van casi a todo lo ancho (con el borde marcado), la de
  delante con el faro en la punta; entre ellas, el capó en gota y la tapa del motor en
  punta, la luna de atrás partida en dos con las rejillas debajo y parachoques de cromo.
  El **bambino**: esquinas más redondas delante que detrás, la lona en la mitad de
  delante del techo, la luna de atrás, la tapa del motor con sus lamas y los
  parachoques. El **monovolumen**: un capó corto, los faros rasgados hacia atrás por los
  costados y el techo de cristal con su barra y las barras del techo, con chapa
  alrededor (todo de cristal, en escritorio no se veía de qué color era).
- **`simetrico()` gira como las demás piezas**: iba al revés que `roundRect()` y
  `ellipse()`, y donde un polígono se solapaba con otra pieza de la silueta el relleno
  (regla nonzero) se anulaba y asomaban las ruedas: cuñas oscuras en el escarabajo y,
  más sutiles, entre el capó y las aletas del dos caballos.
- **El largo juega**: dos tiburones chocan a 23,9 px (en paralelo van a 30) y dos
  bambinos a 16,1, y aun así chocan en cada X, cruce y estrecha. La vuelta no cambia:
  el largo solo cuenta en los choques, así que los récords siguen valiendo.
- Arnés: 1041/1041 en verde. Para mirarlos: `_desarrollo/coches.html` (cada uno, a su
  tamaño en pantalla) y `_desarrollo/escala.html` (todos en fila, a la misma escala).

## Slot Panic 1.4.1 (10/10/2026)

- Los coches, a escala de los de verdad y rehechos con sus vistas cenitales.
  `pnyk.json`: 1.4.1.

## El ambiente de circuito (10/10/2026, rama `30-detalle-escenarios`)

> «Vamos con más detalles en los escenarios.» De cuatro tandas propuestas (el ambiente de
> circuito, piezas propias de cada escenario, más vida en el suelo, más cosas en la mesa
> del juguete), la primera.

- **Las instalaciones**, un tipo de decorado nuevo: rectángulos girados con la pista
  hacia su -y local (`nucleo/decorado.js`), con su propia semilla (los árboles de
  siempre no se mueven, salvo los que quedaban debajo). En todos los escenarios menos en
  el juguete, que es una mesa:
  - **Boxes**: garajes con un toldo de color por equipo, el tejado a paneles y la torre
    de control al final. Tan cerca de la meta como se pueda, en una recta y primero por
    fuera; de 180 px a 96, el más largo que quepa. Si en la recta de meta no caben (en
    todos los oficiales, la grada, el marcador o el borde de la mesa la ocupan), en la
    recta más cerca.
  - **Vallas de publicidad**: 46 × 3,5 px, dos o tres anuncios de colores de marca, cada
    150 px de recta, pegadas al muro.
  - **Comisarios**: una caseta naranja con su bandera amarilla, por fuera y un poco
    antes de cada curva que sale de una recta.
  - **Aparcamiento**: asfalto, plazas pintadas y, en dos de cada tres, uno de los coches
    del juego (al 0,85, de un color al azar) o una caravana. De 168 × 84 (dos filas) a
    84 × 48 (una), el más grande que quepa, en un sitio a suertes de una rejilla de 12 px.
- **Sombra y luz**: las que tienen alto (boxes 9, comisario 6, valla 4) dan la sombra
  del sol como las gradas (`pintarSombras` barre cualquier rectángulo con su `alto`).
  El aparcamiento es plano y va en la capa del suelo. De noche, los boxes y el
  aparcamiento se encienden como las gradas.
- **`instalacionCabe()`**: dentro de la mesa, fuera de las bandas y del hueco del
  marcador, a 6 px del muro y sin tocar lo ya puesto. Para lo redondo, cada rectángulo
  es una cadena de círculos (`circulosDe`). Primero lo barato: si el centro queda más
  lejos de la pista que media diagonal, ya cabe; si no, punto a punto por el contorno.
- **Coste**: generar el decorado pasa de ≤ 60 ms a ≤ 120 ms en los oficiales. Las dos
  claves: buscar el punto del eje por `s` con búsqueda binaria, y medir la distancia a
  la pista de la rejilla del aparcamiento una sola vez para todos los tamaños (con un
  bucle por tamaño, 320 ms).
- **Medido** (La horquilla / El ocho / El nudo / El resbalón): boxes de 150 / 120 / 150
  / 180 px; vallas 6 / 1 / 7 / 1; comisarios 3 / 1 / 3 / 2; aparcamiento de 84 / 168 /
  84 / 168 px. Las piezas que caben bajan donde el aparcamiento se come el hueco (la
  nieve de La horquilla, 41: el mínimo es 40).
- **Arnés**: en cada escenario, las instalaciones son deterministas, ninguna pisa nada
  (la misma pregunta, contra neumáticos, torres, gradas, las demás y las piezas que
  crecen) y en la mesa del juguete no hay; en los oficiales, unos boxes, un
  aparcamiento, algún comisario y alguna valla. 1188/1188 en verde.
- Visto de día en El ocho, El nudo y El resbalón, y de noche en El nudo.

## Slot Panic 1.5.0 (10/10/2026)

- El ambiente de circuito: boxes, vallas de publicidad, comisarios y aparcamiento en
  los escenarios realistas. `pnyk.json`: 1.5.0.

## Seis coches más (10/10/2026, rama `31-coches-nuevos`)

> «Vamos a añadir nuevos coches», con las cenitales del familiar sueco de 1993 y el
> de 1996 (el del turbo), el deportivo del motor detrás, el cuatro latas, el mini y
> el escarabajo nuevo en `_desarrollo/cenital*`.

- **Trece coches.** Los seis nuevos, con apodo (nunca la marca) en cada idioma:
  **ladrillo** (BRICK, TOTXO, MATTONE…), **ranchera** (ESTATE, BREAK, GIARDINETTA…),
  **rana** (FROG, GRANOTA, GRENOUILLE…), **cuatro latas** (QUATRELLE, QUATRE
  LLAUNES…), **mínimo** (TINY, MINUS…) y **burbuja** (BUBBLE, BULLE…). Los id:
  `ladrillo`, `ranchera`, `rana`, `cuatrolatas`, `minimo` y `burbuja`; van también en
  `RECORDS_COCHES` (`servidor/records.php`), y la columna `coche` de la base ya admite
  16 caracteres: no hay que tocar la base.
- **El largo**, con la fórmula de siempre (37 · (mm / 4874)^0,79): ladrillo 36 px
  (4790 mm), ranchera 36 (4709), rana 33 (4245), cuatro latas 30 (3668), mínimo 26
  (3054) y burbuja 32 (4081). El ancho de dibujo, 11 · ancho / largo · 1,15: de ±4,51
  (ladrillo) a ±5,84 (mínimo).
- **El rasgo de cada uno**: el ladrillo, la caja de esquinas vivas con los parachoques
  negros de punta a punta y los faros cuadrados; la ranchera, el morro en cuña, los
  nervios del capó, el alerón y los pilotos que suben por las esquinas; la rana, los
  faros redondos encima de las aletas, la cabina estrecha, la luna tumbada hasta la
  rejilla del motor y las caderas anchas; el cuatro latas, los parachoques de tubo
  que doblan por las esquinas y el capó acanalado; el mínimo, el techo blanco
  flotando sobre los cristales y una rueda en cada esquina; la burbuja, tres arcos: el
  parabrisas y la luna curvos alrededor de la cúpula.
- **El carácter** (acelera / agarre / punta, presupuesto 0): ladrillo 0,8 / 1,01 /
  1,06; ranchera 0,92 / 0,97 / 1,075; rana 1,24 / 0,94 / 1; cuatro latas 1,1 / 0,975 /
  1; mínimo 0,83 / 1,02 / 1,035; burbuja 1,06 / 0,985 / 1.
- **Mucho agarre pide punta**: con punta² < agarre el coche pasa a tope curvas que el
  de siempre no. El primer reparto (ladrillo 1,04 de agarre con punta 1; cuatro latas
  1,03 / 0,955; mínimo 1,05 / 0,92) se pasaba a tope 8 curvas en los cuatro
  oficiales; el mínimo con 1,025 / 1,025, justo en el filo, aún pasaba el peralte de
  El ocho. Apuntado en el comentario de `COCHES`.
- Medido: el prudente, de −0,9 a +1,4 % del clásico; la ranchera es la más rápida con
  el mejor piloto automático en La horquilla, El ocho y El nudo (por 0,01-0,02 s por
  vuelta: con 1,08 de punta también, y se recortó a 1,075), y el escarabajo en El
  resbalón. El bambino sigue el más lento en los cuatro.
- Arnés: 1464/1464 en verde, ~60 s (antes ~35: la 3b corre los trece en cada oficial).
  Vistos en `_desarrollo/escala.html` (los trece en fila) y en el panel COTXE: QUATRE
  LLAUNES cabe entre las flechas.

## Slot Panic 1.6.0 (10/10/2026)

- Seis coches más: ladrillo, ranchera, rana, cuatro latas, mínimo y burbuja (trece en
  total). `servidor/records.php` los admite; la base no cambia. `pnyk.json`: 1.6.0.

## La bañera y el desvío (10/10/2026, rama `32-quinto-circuito`)

> «La recta de salida la prefiero limpia, si no se chocan casi siempre; me gustaría
> meter en algún punto una chicane con más decorado», con la chicane de Goodwood de
> `_desarrollo/chicanes-varias.webp` y `chicane-grande-2.webp`.

- **El quinto oficial, *La bañera*** (`circuitos/banera.js`, clave `banera`): un
  rectángulo con un valle por debajo, el primero en el sentido de las agujas del reloj.
  La recta de meta más larga de todos (750 px), limpia; peraltada r55, bajada r60, la
  recta de abajo, el valle (r60 a izquierdas, el desvío y la subida), otra peraltada
  r60 y la de derrape r95 de vuelta a la meta. 2661 px de eje. La X de la recta de
  meta se propuso y se quitó: a la par al salir chocaban casi siempre (va abajo; ver
  el final).
- **El desvío**, pieza nueva (`{ tipo: 'desvio', largo, entrada, lado }`): la placa
  sigue recta y son los carriles los que se juntan (como en la estrecha), se van
  juntos `DESVIO` (14 px) a un lado con un coseno en un tercio del largo, se quedan y
  vuelven. El carril ya no es solo un factor: cada punto del eje lleva `centro`, y
  `desplazamiento(punto, propio) = centro + propio · carril` es lo que usan
  `lateralEn`, `trazadoCarril` y `factorCarril`. La guía nota el quiebro: en el
  desvío, `radioAgarre` usa el radio de la curvatura del carril (`radioDesvio`,
  1 / |c''|; con 160 px de largo, por debajo de `RADIO_GUIA`), y la cola sale hacia
  `giroDesvio`. Para el arnés cuenta como estrecha (un encuentro) y como lo que limita
  (curvas a tope).
- **Su decorado**, en `pintarDesvios` (`dibujo.js`), dentro de la pista y sin tocar
  los carriles: una valla blanca con postes a los dos lados, conos naranjas donde los
  carriles se juntan y una fila de balas de paja en el sitio que dejan libre.
- **Lo que costó calibrarlo**: las curvas grandes no castigan ir a fondo (el derrape
  frena el coche hasta que agarra: un óvalo con una de 190 se pasaba a tope), así que
  todas son cerradas. Y sin X el carril de fuera de las curvas a derechas es siempre
  el mismo: a fondo, por fuera, solo se salía en la primera peraltada (la mano lo deja
  parado y ya no llega lanzado a la siguiente). La recta de abajo va **antes** del
  valle: entra lanzado en la única curva a izquierdas, donde ese carril es el de
  dentro. Un humano que reacciona 0,25 s tarde se salía por dentro en la primera de la
  izquierda tras la recta (r60 llana): peraltada, ya no; la de derrape, a la izquierda,
  aguanta entrar pasado.
- Medido: prudente 10,07 s por vuelta, el fino le gana un 12 %, a fondo pierde un 46 %
  (10 y 15 salidas en cinco vueltas), 0 curvas a tope, el humano tardío 0 salidas,
  carriles a 2,8 %, CPU 1,95 / 1,05 / 0,56 s; en el desvío chocan en 4 de 21 desfases.
  Con los trece coches, a fondo pierde del 43 al 68 %; el más rápido ahí, el
  monovolumen. `servidor/records.php`: mínimo 7000 ms (el 76 % de la mejor vuelta
  grabada), meta en (310, 110).
- **Tras verlo jugando**: «las balas de paja tienen que seguir la forma del desvío» y
  «un cambio de carril en la recta después de la segunda curva». Las balas siguen a
  los carriles, a `ANCHO_COCHE / 2 + 5` px de cada uno y giradas como ellos, por donde
  caben en la placa: a los dos lados mientras se juntan y por el libre en el quiebro,
  y dibujan la S; los conos, solo en las dos bocas. La X va en el centro de la recta
  de abajo (80 + 180 + 80): con una sola, cada vuelta se corre por un carril, y los
  carriles se igualan (de 2,8 % a 0,3 %). Lo de la recta antes del valle deja de
  hacer falta para el carril de fuera, pero se queda: con la X, la entrada al valle
  sigue siendo el sitio de salirse a fondo. Medido: prudente 9,82 s, a fondo pierde
  un 52 % (12-13 salidas), del 53 al 73 % con los trece; chocan en la X en 5 de 21
  desfases y en el desvío en 7; la mejor vuelta grabada, 8,94 s (el mínimo del
  servidor es su 78 %).
- Arnés: 1709/1709 en verde.

## Slot Panic 1.7.0 (10/10/2026)

- El quinto oficial, *La bañera*, con una pieza nueva: el desvío (la chicane de
  Goodwood del juguete). El campeonato pasa a cinco carreras. `servidor/records.php`
  admite el circuito; la base no cambia. `pnyk.json`: 1.7.0.

## Lo propio de cada escenario (10/10/2026, rama `33-escenarios-con-detalle`)

> «Adelante con los escenarios.» Las tres tandas que quedaban de las cuatro de la
> rama `30`: piezas propias de cada escenario, más vida en el suelo y más cosas en la
> mesa del juguete.

- **Piezas nuevas** (`TAMANO` en `nucleo/decorado.js`, `PINTAR` en `dibujo.js`), con
  sus pesos en `escenarios.js`:
  - Verde: **macizos de flores** (hojas y flores de cinco pétalos, de un color) y
    **estanques** (orilla de barro, agua, reflejo y nenúfares).
  - Tierra: **pacas redondas de paja**, de pie, con la espiral del enrollado.
  - Desierto: **matojos secos** (una maraña de ramitas) y **huesos** blanqueados.
  - Nieve: **muñecos de nieve** vistos desde arriba: cuerpo, cabeza con sombrero,
    nariz de zanahoria, brazos de rama y un botón.
  - Juguete: **canicas**, **gomas de borrar** y **clips**.
- **`tope`**: un escenario puede limitar cuántas hay de un tipo (estanques, 2). La
  pieza se descarta después de tirar sus números: un tope no mueve lo demás.
- **Lo plano** (`ALTO_PIEZA` 0, el estanque) no da sombra y va en la capa del suelo,
  como el aparcamiento: lo que crece a su lado lo tapa.
- **La vida del suelo** (`marcas` del escenario, `VIDA_SUELO` en `dibujo.js`), pintada
  con el suelo, debajo de la escapatoria y la pista, que la tapan: los **caminos** del
  público en el césped (acaban en la grava, como los de verdad), las **roderas** de
  los tractores en la tierra (dos surcos con su dibujo), las **ondas** del viento en
  la arena (todas a lo ancho del mismo viento, con su sombra y su luz) y las
  **huellas** en la nieve (de un paseante y, alguna, de un zorro). Con su propia
  semilla: no mueven nada.
- **Tras verlo**: las pacas, de 6-8 px, se leían como monedas (lo mismo que se
  pregunta de las balas de La bañera): pasan a 8-11 px con un filo oscuro. Los
  muñecos, de 6-9 a 8-11. Las huellas y las roderas, más marcadas.
- **Medido**: las piezas que caben no bajan (La horquilla: verde 44, nieve 41, el
  mínimo es 40; los demás oficiales llenan las 90 menos El nudo, 53 y 51). Estanques,
  de 0 a 2 por circuito; muñecos, de 0 a 6.
- Arnés: 1709/1709 en verde. Visto de día en La bañera y El ocho, en los cinco
  escenarios.

## Slot Panic 1.8.0 (10/10/2026)

- Lo propio de cada escenario (flores y estanques, pacas, matojos y huesos, muñecos
  de nieve, y canicas, gomas y clips en la mesa) y la vida del suelo (caminos,
  roderas, ondas de arena y huellas). `pnyk.json`: 1.8.0.

## Los mejores momentos (11/10/2026, rama `34-mejores-momentos`)

> De `IDEAS.md` › 4. Decidido lo abierto: al acabar se repite **solo el mejor**, y el
> botón MOMENTOS del cartel repite los tres; compartir el vídeo, en una fase propia.

- **Un búfer de poses, no volver a simular** (`nucleo/momentos.js`): cada fotograma, como
  mucho cada 1/60 s (`PASO_REPETICION`), de cada coche x, y, ángulo (desenrollado),
  altura de la mano, estado, derrape y velocidad; y los eventos (choque, sale, clac,
  vuelta, fin) con su instante. Las chispas y el humo se vuelven a emitir de los
  eventos y del derrape grabado. Así la repetición no se ata a la versión de la física
  ni al `dt` de cada fotograma. Una carrera de 10 vueltas (139 s), 8320 cuadros: ~1 MB.
  Deja de grabar a los 1800 s (`GRABA_REPETICION`).
- **Los momentos** se buscan mientras se graba: el **choque** (dice dónde: X, cruce o
  estrecha), la **salida** lanzada (a más de 0,75 · `VELOCIDAD_SLOT`, ~350 px/s; las
  salidas van de 310 a 410, así que entra una de cada tres), la **salvada** (un derrape
  de más de 0,5 que vuelve a menos de 0,15 en el carril), el **adelantamiento** (cambia
  quién va delante, el otro sigue en el carril y aguanta 1 s; en una estrecha vale más),
  la **llegada** (el segundo a menos de 0,3 s por su ritmo) y la **vuelta rápida** de la
  carrera si es de una persona. Cada uno vale unos puntos (×1,5 si es de una persona) y
  se eligen los tres mejores que no se pisan, con su ventana (de 2 s antes y 1,5 después
  en el choque a 3 y 1 en la llegada).
- **La salvada de 0,8 de la idea no salía nunca**: el piloto automático no pasa de 0,4
  de derrape (0,8 una vez, en la deslizante), y forzando el derrape y soltando, casi
  siempre acaba fuera. Se queda en 0,5: es una hazaña, y pregunta del playtest.
- **Cómo se ve** (`repeticion.js`): una cámara que sigue al protagonista (o al punto
  medio si son dos y caben), a 1,6× (`ZOOM_REPETICION`), acotada a la mesa como la de la
  lupa; a cámara lenta (×0,35) medio segundo a cada lado del instante, volviendo a
  velocidad normal en 0,7 s; bandas de cine con el rótulo («¡CHOQUE EN LA X!»), quién y
  cuál, un punto rojo que parpadea y cómo saltarlo. Sirve igual a la mesa que a la
  lupa, donde ocupa toda la pantalla (sin mapa). Suenan los choques, las salidas, el
  clac y los motores, a la velocidad de la imagen.
- **El flujo**: tras la meta se sigue grabando 1,2 s (`TRAS_META`, para que la llegada
  se vea entera), con la carrera aún en pantalla; luego el mejor momento, la firma si
  toca y el cartel. Un toque o una tecla salta el momento (no en los primeros 0,35 s: el
  dedo de la meta), ESC salta todos. Sin momentos, al cartel directamente. En el
  campeonato, igual tras cada carrera. La analítica cuenta `ver_momentos` (el botón) y
  `saltar_momento` (saltar el que sale solo, y cuánto se vio): ¿alarga el fin?
- **El botón MOMENTOS** (o la tecla O) va tras REPETIR y MENÚ; en la lupa los botones
  van de dos en dos y el último, si queda solo, centrado.
- **Medido** (arnés, sección 8 nueva; tres vueltas, un piloto que falla contra la CPU
  normal, 6 carreras por oficial): 29 de 30 carreras con algún momento; de los elegidos,
  18 adelantamientos, 15 choques, 12 salidas, 8 vueltas rápidas, 3 llegadas y 1
  salvada. Un momento repetido dura hasta 6,7 s y los tres, hasta 18,7. En cada
  encuentro, los choques son momentos en su sitio (El ocho, 6 en el cruce; El resbalón,
  15 en sus estrechas…). Los demás, con carreras de mentira: 10 de 10.
- **Tras verlo**: en la lupa el rótulo pisaba «REPETICIÓN»: va en una línea propia.
  CPU contra CPU muchas carreras no tienen nada (sin salidas ni adelantamientos): sale
  el cartel sin el botón.
- Arnés: 1731/1731 en verde. Visto en la mesa y en la lupa (?lupa), en El ocho.

## Slot Panic 1.9.0 (11/10/2026)

- Los mejores momentos: al acabar se repite el mejor (choque, salida, salvada,
  adelantamiento, llegada o vuelta rápida) a cámara lenta, y MOMENTOS repite los tres.
  `pnyk.json`: 1.9.0.

## Choques más realistas (11/10/2026, rama `35-choques`)

> Hasta ahora, dos coches que se tocaban (centros a menos de `CHOQUE`, 20 px) salían
> los dos, siempre: un roce a 50 px/s igual que un golpe a 470. Y uno que se salía
> atravesaba al otro como si no estuviera. Se quería que a veces uno siga y el otro
> no, que el que se sale a la par se lleve al otro por delante, y que en las chicanes
> uno pueda empujar al otro y hacerle derrapar.

- **Cada coche es una cápsula** (`capsula`, `contacto` en `nucleo/slot.js`): un
  segmento a lo largo de su pose, con la cola que haya sacado, y `ANCHO_COCHE / 2`
  alrededor. Dos carriles en paralelo no se tocan sin derrapar (los dos tiburones, con
  la cola a `COLETEO_MAXIMO`, quedan a 7,1 px); derrapando a tope, sí pueden (hasta
  3 px): es lo que se arriesga al límite. Paralelos y solapados, el contacto va al medio
  de lo que se solapan: si no, siempre llevaba el golpe en la cola el primero.
- **El choque no decide: da un golpe.** Lo que se acercan por la normal se lo reparten
  (`REBOTE_COCHES` 0,3). A lo largo del carril cambia la velocidad (el de detrás frena,
  el de delante gana); de lado se suma al derrape, `GOLPE_SALE` (90 px/s) en la cola
  sacan a un coche agarrado, y la cola sale hacia donde la empujan. La guía va en el
  morro: ahí cuenta `PALANCA_MORRO` (0,35). Así sale lo que se pedía sin dados: el que
  ya derrapaba se sale con un toque; al que le dan en la cola (el de delante) se cruza
  y el de detrás solo frena; en el cruce, el que da con el morro sigue frenado y el
  golpeado de costado se sale.
- **El roce**, mientras siguen tocándose: el que empuja a lo largo frena (no se
  atraviesan), la cola metida en el otro rebota hacia fuera, y cada uno suma `ROCE`
  (12) de derrape por segundo con su palanca, según aprieta (velocidad o gatillo) y lo
  metidos que estén (`PENETRA`, 4 px), que tiene que ganarle a `RECUPERA_DERRAPE` (2,5):
  un roce suave no saca a nadie. `ROZA` iguala sus velocidades. Sin el rebote de la
  cola, en la deslizante (estrecha, y con la cola del de dentro saliendo hacia el de
  fuera) se metían cada vez más y salían los dos a 128 px/s.
- **Metidos más de medio coche, salen los dos** (lo de antes, como último recurso): en
  la X, a la par, los carriles se cortan y no hay otra. Sin eso se atravesaban.
- **Uno fuera choca con uno en el carril**: se aparta de él, rebota y le da su golpe
  (cada paso que se le echa encima). Lanzado de lado a 400 px/s lo saca; a 80, no. Dos
  fuera, o uno en la mano, no chocan.
- **La tregua**: si la mano posa un coche tocando al otro, no se chocan ni se rozan
  hasta que se separen (antes bastaba con no contar el paso de posarlo, pero ahora el
  roce seguía). `carrera.toque` (`{ tregua, choque }`) sustituye a `solapados`.
- **Por debajo de `TOQUE` (30 px/s) tocarse no es un choque**: ni suena ni es un
  momento. El evento `choque` lleva su `fuerza` (0-1): el sonido y las chispas (de 2 a
  10 por lado, `chispasChoque`) van con ella, en la carrera y en la repetición, y un
  toque vale menos momento (×0,6). El que se lleva al otro por delante es un momento
  en la «pista»: «¡SE LO LLEVA POR DELANTE!», en los siete idiomas.
- **Medido** (21 desfases por encuentro, a la velocidad que aguanta cada uno solo,
  desde 50 px antes): en el cruce de El ocho, al 40 % siguen los dos en 8 de 9 y, al
  60 % o más, se sale uno en 5-8 de 9; en la X de El nudo, a tope, se sale uno en 6 de
  9; en las estrechas, a media velocidad siguen y, cerca del tope, se sale uno en la
  mitad. Que salgan los dos es raro (1-2 de 9): a la par en la X.
- **Arnés**: a la velocidad de sus encuentros (190-250 px/s) siguen los dos en 43
  choques, se sale uno en 6 y los dos en 2; comprueba que salen los tres desenlaces y
  que en ningún encuentro de un oficial salen siempre los dos. «Nunca dos veces
  seguidas» pasa a ser «la mano nunca los deja chocando otra vez»: darse dos veces sin
  la mano es legítimo (en el desvío de La bañera el de detrás, frenado por el golpe,
  alcanza al otro y le vuelve a dar). 1742/1742 en verde. Visto en El ocho: el golpe en
  el cruce cruza la cola del golpeado y siguen los dos; a más velocidad, el de detrás
  se queda frenado contra el costado del otro.

## Slot Panic 1.10.0 (11/10/2026)

- Choques más realistas: el golpe se suma al derrape (siguen los dos, se sale uno o los
  dos), el roce en las estrechas y el que se sale se lleva por delante al otro.
  `pnyk.json`: 1.10.0.

## La diagonal (11/10/2026, rama `36-sexto-circuito`)

> «Vamos con el sexto circuito», con los planos de `_desarrollo/circuito-*.jpg` de
> inspiración. El que manda es el *C1 G* (`circuito-1.jpg`): un ocho cuya rama larga
> cruza en diagonal y un dedo que entra en el lazo grande.

- **El sexto oficial, *La diagonal*** (`circuitos/diagonal.js`, clave `diagonal`): un
  ocho torcido. El lazo grande a la izquierda, con la recta de meta arriba; de ella
  baja un valle (r90, bajada de baches, horquilla r60, subida y r70) que entra en el
  lazo. Arriba a la derecha, una peraltada r100 de 120° deja la pista en una diagonal
  larga que cruza la recta de abajo; abajo a la derecha, un lazo estrecho (130 px de
  alto: r60, la recta con una estrecha, horquilla r65). La recta de abajo vuelve por el
  cruce a la curva de derrape r95 y a la meta. 3532 px de eje, la meta en (330, 100).
- **El cruce, a 60° y no a 45°**: a 45°, en la cuña estrecha del cruce la recta y la
  diagonal se quedaban a 98-103 px (el mínimo es 104) justo fuera de la ventana del
  cruce (`VENTANA_CRUCE`, 128 px a cada lado). A 60° se separan antes y la ventana
  basta: el núcleo no cambia. Sigue leyéndose en diagonal al lado del de El ocho, que
  es en ángulo recto.
- **El hueco de la portada** (470 × 300) obliga a la forma: el lazo grande tiene que
  quedar vacío de arriba abajo, así que el cruce baja a la recta de abajo (y = 490) y
  el valle va a su derecha (queda a 3 px del hueco).
- **Lo que costó calibrarlo**: con el valle de r60 un humano que reacciona 0,25 s tarde
  se salía en su entrada (tras la recta de meta) y en su salida (tras la subida), por
  dentro, y la CPU difícil dejaba 0,80-0,81 s con los coches de menos agarre (el tope
  es 0,8). Con r90 a la entrada y r70 a la salida, las dos cosas pasan.
- Medido: prudente 12,41 s por vuelta, el fino le gana un 12 %, a fondo pierde un 47 %
  (15 y 20 salidas en cinco vueltas), 0 curvas a tope, el humano tardío 0 salidas,
  carriles a 3,0 %, CPU 2,36 / 0,88 / 0,64 s (con los trece coches, la difícil de
  0,61 a 0,72). En el cruce chocan 9 de 9 veces con su momento, en la estrecha 4 de 4.
  En la misma pista, la CPU contra el mejor piloto apenas se choca (1 en seis
  carreras): el cruce lo pisan los dos coches a la vez pocas veces. El más rápido
  ahí, la ranchera. `servidor/records.php`: mínimo 9000 ms (el 79 % de la mejor vuelta
  grabada, 11,37 s), meta en (330, 100).

## Slot Panic 1.11.0 (11/10/2026)

- El sexto oficial, *La diagonal*: un ocho torcido que se cruza a 60°, con un valle de
  baches, una peraltada y un lazo estrecho con su estrecha. El campeonato pasa a seis
  carreras. `servidor/records.php` admite el circuito; la base no cambia.
  `pnyk.json`: 1.11.0.

## El ladrillo, berlina (11/10/2026, rama `37-ladrillo-berlina`)

- El ladrillo y la ranchera se confundían: los dos eran familiares de techo largo. El
  ladrillo pasa a ser la berlina de 1978 (plano en `_desarrollo/coche-volvo-244jpg.jpg`):
  tres volúmenes, con el capó largo, el techo corto con su techo solar, la luna y el
  maletero, y los pilotos grandes doblando las esquinas de atrás. Se quedan los
  parachoques negros, los faros cuadrados (la calandra, más ancha) y la caja de
  esquinas vivas. Ancho de dibujo ±4,41 (4898 × 1707 mm).
- Solo cambia la forma: el id (`ladrillo`), el largo (36 px, aunque la fórmula daría
  37) y el carácter son los de antes, así que los récords y el arnés no cambian.
- **Apodos nuevos**, iguales en los siete idiomas (como MULTIPLO): rana → PORCHETA,
  monovolumen → ESPACIO, ladrillo → BOLVO 244, ranchera → BOLVO 850R, mínimo → MINIC y
  burbuja → BITLE. Los id no cambian (`rana`, `monovolumen`, `ladrillo`, `ranchera`,
  `minimo`, `burbuja`): con ellos se guardan los récords y lo elegido.

## Slot Panic 1.11.1 (11/10/2026)

- El ladrillo, berlina (el Bolvo 244), y seis apodos nuevos: PORCHETA, ESPACIO,
  BOLVO 244, BOLVO 850R, MINIC y BITLE. Los récords siguen valiendo.
  `pnyk.json`: 1.11.1.

## El sitio del dedo en la lupa (11/10/2026, rama `38-gatillo-lupa`)

- En el modo lupa el dedo a veces tapaba por donde iba el coche. Durante la carrera,
  abajo, una franja de 120 px (`ALTO_ACELERADOR`, `lupa.js`) para el pulgar: la vista
  acaba encima, así que el coche nunca queda bajo el dedo. Dentro, un pedal con el
  rótulo ACELERADOR (`slot.acelerador`, siete idiomas) que se enciende al pulsar y se
  llena con la potencia que lleva el coche (en rojo si derrapa): los toques se ven. Se
  sigue acelerando pulsando en cualquier parte; la franja solo dice dónde.
- **Se probó antes como gatillo analógico** (una franja de 240 px: abajo nada, a partir
  del 15 % más, a fondo desde el 88 %; la potencia seguía a lo pedido con el retraso de
  siempre). Playtest en el móvil: el hueco gusta, pero dosificar con la altura cuesta,
  se va más lento o más rápido de lo que se quiere y hay que entrenarlo; a toques se
  juega desde el primer momento. Se quedó el hueco, sin gatillo (`IDEAS.md`).

## Slot Panic 1.11.2 (11/10/2026)

- En el modo lupa, el sitio del dedo: una franja abajo con el pedal del acelerador, y
  la vista encima, sin el dedo. `pnyk.json`: 1.11.2.

## Playtest del modo lupa (11/10/2026)

- El zoom se queda en 1,2 (`LUPA_ZOOM`): «se puede jugar perfectamente, no da sensación
  de pequeño ni de que las cosas vengan pronto». Las curvas se ven a tiempo también con
  la vista más baja por la franja del acelerador (1.11.2). No hace falta pintar nada
  más allá de la mesa.

## Playtests: momentos, piezas, choques y escenarios (11/10/2026)

- **Los mejores momentos**: bien. No alargan el fin («duración perfecta») y eligen
  momentos adecuados. Se quedan el zoom (1,6) y la cámara lenta (×0,35). La salvada
  sí sale y se ve: el coche pasa echando chispas sin salirse, y se siente al pasar.
- **Las piezas**: la curva de derrape, «perfecta». El peralte «no se entiende tanto» y
  los baches «no se notan mucho»: pasa a `TODO.md`.
- **Los choques**: «se entiende siempre por qué se sigue o por qué te vas fuera, le
  dan más realismo al juego». No se ha encontrado ninguno que no se entienda. Se quedan
  `ROCE` 12 y `GOLPE_SALE` 90.
- **Los escenarios**: las piezas nuevas del decorado están bien y no estorban al juego.

## El peralte y los baches, que se lean (11/10/2026, rama `41-peralte-baches`)

- Del playtest: el peralte «no se entiende tanto» y los baches «no se notan mucho».
- **Los baches, al pasar**: frenan (`FRENO_BACHES`, 0,15 por segundo a 330 px/s, más
  cuanto más rápido, hasta ×1,5), el coche bota en cada uno (`altura`, la de la mano, hasta
  0,12: se graba en la repetición) y cada bache (uno cada `PASO_BACHES`, 40 px) es un
  evento `bache`: un golpe hueco (`sfxBache`, el de la CPU a la mitad), vibración en el
  móvil y, rápido, polvo. No se graba en la repetición: son muchos y el bote ya va en
  la pose. **Antes de llegar**: una cresta a lo ancho en cada bache (sombra y luz),
  donde bota el coche; antes eran rayas flojas que no casaban con nada.
- **El freno, medido**: con 0,5 los baches frenaban tanto antes de la curva que ir a
  fondo dejaba de castigarse (*El nudo*: a fondo no perdía un 30 % ni se salía dos veces
  por vuelta, y la CPU no se equivocaba; *La diagonal*: el patito y el mínimo a fondo,
  5 salidas y un 15 %). Con 0,15, todo en verde. La mejor vuelta automática apenas se
  mueve (*El nudo* 11,38 → 11,40 s, *La diagonal* igual): quien va fino ya los pasa
  despacio; pierde el que va rápido. Los récords siguen valiendo.
- **El peralte, antes de llegar**: la pista inclinada, oscura por dentro y clara por
  fuera (`RAMPA`), la banda rayada del borde más marcada y flechas en el sentido de la
  marcha cada 44 px por la parte alta: ahí se pasa más rápido. Al pasar no cambia nada:
  primero, ver si con el dibujo se entiende.

## Slot Panic 1.12.0 (11/10/2026)

- Los baches se notan: frenan, el coche bota, suenan, vibran y levantan polvo; y se ven
  antes de llegar. El peralte se ve inclinado, con flechas. Los récords siguen valiendo.
  `pnyk.json`: 1.12.0.

## El puente de La diagonal (12/10/2026, rama `42-puente`)

- **Por qué**: el cruce de *La diagonal*, a 60°, no convencía: en el juguete los cruces
  son siempre en ángulo recto, y uno torcido no existe. El puente sí ha existido
  siempre. La diagonal pasa por debajo y la recta que sale de la horquilla del lazo
  estrecho sube por encima; el trazado en planta no cambia (ni el decorado).
- **La pieza** `{ tipo: 'puente', rampa, largo }` (`nucleo/piezas.js`): una rampa que
  sube, el tablero y otra que baja, con la altura (`elevacion`, de 0 a 1) y la
  `pendiente` en cada punto del eje; la rampa sube con un coseno, sin esquinas. En *La
  diagonal*: rampas de 120 px, tablero de 110 (tapa los 74 px que la diagonal, de 64 px
  de ancho a 60°, pisa de la recta) y la rampa a 17 px de la horquilla.
- **Al subir frena, al bajar empuja**, como en el juguete: la gravedad (`GRAVEDAD`, 1800
  px/s²) por la pendiente, con `ALTURA_PUENTE` 12 px. Se probó en el móvil tras
  `?puente`: con 8 px se notaba poco; con 12, gustó más. Saliendo de la horquilla a
  fondo, arriba se llega un 22 % más lento que sin puente y abajo un 8 % más rápido; a
  toques, un 38 % y un 25 %. La vuelta del prudente, 12,43 → 12,53 s.
- **No es un cruce**: donde uno de los dos tramos va arriba, `circuito.js` lo aparta
  de `cruces` a `puentes`; los coches a distinta altura no chocan (`comprobarChoque`) y
  ya no hay choques de «cruce» en *La diagonal* (lanzados a la vez, en 0 de 21
  desfases; con el cruce, en 9). Para la geometría (`enCruce`) sigue contando: los dos
  tramos se pisan en el plano.
- **El dibujo**: el tablero, en su capa (`dibujarPuentes`): la sombra en lo de abajo,
  un costado, la calzada, estrías en las rampas, barandillas en lo alto y los carriles.
  El coche de arriba se agranda un poco (`ELEVA_COCHE`, la `altura` de la mano: se
  graba en la repetición). **El parpadeo**: el primer montaje decidía por la altura
  del coche qué iba debajo del tablero, y al pie de la rampa es 0: el tablero lo tapaba
  un instante al empezar a subir. Ahora va debajo solo el que cruza por abajo
  (`bajoPuente`: cerca del cruce y sin el rumbo del tablero, o suelto por la mesa), por
  la pose: vale para la repetición y el fantasma.
- **El arnés**: en cada puente, uno por arriba y otro por abajo nunca se tocan, y a
  fondo la subida frena un 10-35 % (hoy 17 %, entrando a 200 px/s) y la bajada empuja un
  3-20 % (hoy 7 %), frente a la misma pista sin pendiente.
- **Los récords de *La diagonal*** se vacían: con el puente la vuelta es ~0,1 s más
  lenta. El mínimo del servidor (9000 ms) sigue por debajo de la mejor vuelta
  automática. El fantasma viejo sigue sirviendo de dibujo (el trazado en planta es el
  mismo), solo que va algo más rápido.

## Slot Panic 1.13.0 (12/10/2026)

- *La diagonal* pasa bajo un puente, en vez de cruzarse a 60°: al subir el coche frena
  y al bajar gana; en el puente no se chocan. Sus récords se vacían. `pnyk.json`: 1.13.0.

## El motor de cuatro carriles y El ocho largo (12/10/2026, rama `43-cuatro-carriles`)

- **Un modo, no un séptimo oficial.** El motor (N carriles, N coches, choques por
  parejas) costaba lo mismo en los dos casos. Lo que cambiaba: como oficial, el ocho
  largo entraba en el campeonato de los seis (de dos coches), en los récords del
  servidor y en las secciones del arnés que recorren cada oficial (3b, 6, 7 y 8), y
  sacarlo de ahí después no salía gratis. Un modo propio, con sus circuitos
  (`CIRCUITOS_CUATRO`) y su campeonato, puede crecer: más circuitos, mangas.
- **Los carriles los da el circuito** (`circuito.carriles`, de izquierda a derecha):
  `{ carriles: 4 }` en la declaración da cuatro, a ±15 y ±45 px (cada uno a 2 ·
  `CARRIL` del de al lado), y la pista se ensancha lo que tiene de más: 124 px. Lo que
  antes daba por hecho que eran dos: el `turno` reparte `(i + turno) % carriles`,
  `carrilEn` da el índice en `circuito.carriles` y los choques se comprueban **por
  parejas** (`carrera.toques`, por 'i-j'; el evento `choque` lleva `coches: [i, j]`, y
  los momentos lo usan). Lo que la mano posa vale para todas las parejas del coche en
  ese paso.
- **El margen del cruce crece con el ancho** (`circuito.ventanaCruce`, 128 px más lo que
  la pista tiene de más: 188). Con 128, a un brazo del cruce le quedaba el otro a 130 px
  y el muro se quedaba en el asfalto: 0 px de grava. `validarCircuito` mide con el
  ancho de cada circuito.
- **El ocho largo** (`circuitos/ochoLargo.js`): dos lazos con la recta del fondo (240
  px) y rectas de 200 arriba y abajo, unidos por dos diagonales que se cruzan en
  ángulo recto (a 60°, como se probó primero, los dos brazos se quedaban a 100 px
  fuera del margen del cruce). Las curvas, de radio 90: los cuatro carriles miden
  3167 px (el de fuera de un lazo es el de dentro del otro).
  - Con radio 150 no se salía nadie a fondo (el de fuera, a 195, iba sobrado): vuelta
    del prudente de 7,6 s y a fondo, lo mismo. Con 90, el prudente da la vuelta en ~11 s,
    a fondo se sale 2-4 veces por vuelta y pierde un 37 %.
  - **El carril de más afuera se pasa a fondo** su lazo (a 135 px). Con radio 70 no
    pasaba, pero el de dentro quedaba a 25 px, los carriles se separaban un 6,7 % y la
    CPU difícil dejaba 0,87 s. Se queda en 90: es lo que tiene ese carril, y lo paga
    en el otro lazo, por dentro. El arnés no lo cuenta en «ninguna curva se pasa a
    tope» (solo el carril a más de 2 · `CARRIL` del eje por fuera; con dos carriles,
    ninguno).

### Medidas (arnés, 5 vueltas, un coche por carril)

| Piloto | Vuelta (carriles 0 / 1 / 2 / 3) | Salidas |
|---|---|---|
| prudente (×1) | 10,97 / 11,11 / 11,08 / 10,97 s | 0 |
| al límite (×1,8) | 9,90 / 9,90 / 9,90 / 9,91 s | 0 |
| a fondo | 17,2 / 13,7 / 13,7 / 16,1 s | 20 / 10 / 10 / 19 |

- Entre carriles, con el mismo piloto, un 1,3 %. La CPU deja 0,90 s por vuelta al mejor
  piloto (la fácil 1,77, la difícil 0,47) y se equivoca alguna vez.
- En el cruce, cada pareja de carriles lanzada a 250 px/s choca en 8-9 de 21 desfases,
  con los tres desenlaces. Cuatro CPU juntas: 1-2 choques por carrera, y la mano nunca
  las deja chocando. Para eso el arnés cuenta los choques repetidos **por pareja**: con
  cuatro, dos parejas distintas que chocan seguidas no son la mano.

## La pista de cuatro carriles en la portada (12/10/2026, rama `43-cuatro-carriles`)

- **El modo lo da el circuito**: si el elegido es de cuatro carriles, la carrera es de
  cuatro coches; sin otra preferencia guardada (se recuerda el circuito, como siempre).
  En CARRERA, **PISTA: 2 / 4 CARRILES** (tecla P) pasa a la otra lista; la tecla C solo
  recorre los de su pista, y de vuelta a la de dos se vuelve al circuito que se corría.
  El campeonato de la pista de cuatro corre `CIRCUITOS_CUATRO`.
- **Cuatro coches siempre**: el J1 y el J2 (cada uno con su mitad de la pantalla, como
  hoy) y los otros dos, siempre de la CPU, con los primeros colores de la paleta que no
  lleve nadie y el coche de siempre. En la lupa, el J1 contra tres CPU. En cada carrera,
  cada coche pasa al carril de al lado (`turno` mod 4).
- **La portada, encima del cruce**: el ocho largo no tiene hueco dentro de los lazos; la
  portada va en el centro y se va al empezar. Los paneles de la cuenta atrás (J1 y J2)
  van en el hueco de cada lazo, más estrechos: arriba estaban la recta y la parrilla.
- **Lo de encima, para cuatro**: el marcador pone el J1 y el J2 en los bordes y las CPU
  de más hacia dentro (sin la mejor vuelta); las etiquetas de la parrilla van delante de
  cada coche, en su carril; el fin, por orden de llegada (`ordenLlegada`) y con el
  puesto; el campeonato, una columna por coche. En la lupa, a la derecha, el puesto del
  J1 (`hud.puesto`). La llegada apretada, como momento, se mide con el segundo que va
  más cerca. Se jugó en el navegador: portada, cuenta atrás, carrera, fin, campeonato y
  lupa.
- **`clasificacion`** cuenta tantos coches como lleven las carreras: delante, el de más
  victorias y, con las mismas, el de menos tiempo. El arnés corre el campeonato de cuatro
  con cuatro CPU y prueba el desempate con cuatro.

## Slot Panic 1.14.0 (12/10/2026)

- La pista de cuatro carriles: un modo propio (PISTA, tecla P) con *El ocho largo*,
  cuatro coches (el J1, el J2 y dos CPU) y su campeonato. `pnyk.json`: 1.14.0.

## Las mangas, La judía y La ele (12/10/2026, rama `44-mangas`)

- **Por qué mangas**: todo circuito cerrado que no es un ocho gira 360°, y en la pista
  de cuatro el carril de fuera da 2π · 90 = 565 px más por vuelta que el de dentro.
  En el ocho largo no hace falta (el de fuera de un lazo es el de dentro del otro);
  en cualquier otro, sí. `mangasDe` (`nucleo/mangas.js`) lo encuentra, no se declara:
  si los carriles de un circuito de cuatro se separan más de un 2 %, pide una manga
  por carril.
- **La serie**: cada manga es una carrera de las vueltas elegidas; en cada una, cada
  coche pasa al carril de al lado (el `turno`), y en cuatro seguidas todos han corrido
  por todos. Cada manga acaba cuando llega el primero (a los demás, su tiempo a su
  ritmo: `tiempoFinal`, como en el campeonato) y gana la **menor suma**, no el que gana
  más mangas. En el campeonato de la pista de cuatro, la carrera de un circuito con
  mangas cuenta su suma (`anotarCarrera` con el resultado de la serie).
- **En pantalla**: la portada dice «4 MANGAS DE 3 VUELTAS»; la cuenta atrás, «MANGA 2
  DE 4» (con el campeonato, delante); el fin de cada manga, quién la gana y la tabla de
  las mangas con la suma, y SIGUIENTE MANGA; el de la última, quién gana la suma (o, en
  el campeonato, su tabla). R a media serie no repite (solo en la primera manga).
  `pintarTabla` sirve a las dos tablas, la del campeonato y la de las mangas, en la mesa
  y en la lupa. Se vio en el navegador: portada, cuenta atrás, fin de manga y de serie.
- **Los paneles de la cuenta atrás**, en la pista de cuatro, iban en el hueco de cada
  lazo del ocho largo. Un circuito que no tiene hueco ahí dice dónde (`guia`): en *La
  ele*, el J2 y el rótulo, en el hueco de arriba a la derecha, fuera de la ele; en *La
  judía*, el rótulo encima del hundimiento. Y la meta de *La judía* va 200 px a la
  derecha del centro: debajo del semáforo, tapaba el coche del carril de arriba.
- **El arnés, con mangas**: lo que cuenta es la serie. A fondo se mide la suma de los
  cuatro carriles: el de más afuera va casi a fondo (lo paga en los otros). La CPU, por
  cada carril contra el mejor piloto por ese mismo: contra el mejor carril, en *La ele*
  la difícil dejaba 0,96 s (un carril saca un 11 % a otro). Y en vez de «los carriles
  se separan < 8 %», una serie de cuatro mangas con el mismo piloto: cada coche pasa
  por todos los carriles y las sumas se separan < 1 %.
- **La judía** (`circuitos/judia.js`): un óvalo de 900 px de recta con la de abajo
  hundida (cuatro curvas de 45°; las dos del fondo, al otro lado). Con radio 90, el
  carril de fuera a fondo solo perdía un 7 %; con 80, un 19 %.
- **La ele** (`circuitos/ele.js`): seis curvas de 90°, una a la izquierda (el rincón).
  Con radio 80 la CPU no se equivocaba nunca y por el carril 1 ir a fondo era lo más
  rápido (0 salidas). Una chicane en la recta de abajo sacaba al humano que reacciona
  tarde por el carril de dentro; unos baches se pasaban a tope. Con radio 70 y sin
  nada más, en verde: el carril de dentro va a 25 px (en el ocho largo eso separaba
  los carriles; aquí lo arreglan las mangas).
- **El huevo**, descartado: con una peraltada y una horquilla la vuelta se quedaba en
  6-7 s y el carril de fuera iba más rápido a fondo; con una chicane, igual.

### Medidas (arnés, 5 vueltas, un coche por carril)

| | Carriles (px) | Prudente (vuelta, carril 0-3) | A fondo, la serie | CPU fácil / normal / difícil |
|---|---|---|---|---|
| *La judía* | 3218-2653 | 10,17 / 10,40 / 10,60 / 10,15 s | pierde 66 %, 68 salidas | 1,73 / 0,78 / 0,42 s |
| *La ele* | 3062-2497 | 9,85 / 9,99 / 10,10 / 9,10 s | pierde 54 %, 53 salidas | 1,59 / 0,75 / 0,41 s |

- La serie con el mismo piloto: 209,87 s los cuatro en *La judía*; en *La ele*, un
  0,03 % del primero al último. Cuatro CPU juntas: 1-2 choques por carrera.

## Slot Panic 1.15.0 (12/10/2026)

- Las mangas en la pista de cuatro: un circuito que no es un ocho se corre en una manga
  por carril y gana la menor suma. Dos circuitos nuevos de cuatro carriles, *La judía* y
  *La ele*. `pnyk.json`: 1.15.0.

## Playtest de las mangas (12/10/2026)

- En el móvil, cuatro mangas de 3 vueltas (~2 min) se hacen bien. Queda por ver las de
  10 vueltas.

## El adelantamiento con cuatro coches (12/10/2026)

- `momentos.js` solo buscaba adelantamientos con dos coches: en la pista de cuatro las
  repeticiones se quedaban sin ellos. Ahora se miran por parejas (quién va delante y el
  cambio que tiene que aguantar `FIRME` s, de cada una), y el momento lleva al que pasa
  y al pasado. Con dos coches no cambia nada.
- Medido (tres carreras de 3 vueltas en cada circuito de cuatro, el J1 contra tres
  CPU): de 5 a 12 adelantamientos por carrera, de 0 a 3 del J1; entre los tres
  elegidos se mezclan con choques, llegadas y la vuelta rápida. El arnés lo prueba con
  una carrera de mentira de cuatro: el cuarto pasa al tercero y solo sale ese.
- `pnyk.json`: 1.15.1.

## La suma en carrera (12/10/2026)

- El playtest de las mangas preguntaba si se echaba de menos ver la suma mientras se
  corre, no solo en el fin. Se probó en el móvil tras `?suma` y se queda.
- `sumaEnCarrera` (`nucleo/mangas.js`): lo de las mangas acabadas más lo de esta, en la
  que a cada coche se le cuenta lo que tarda, a su ritmo, en llegar adonde va el
  primero. Es la misma cuenta que `tiempoFinal` al acabar, así que lo que se ve al
  cruzar la meta es lo que apunta la tabla del fin. El ritmo de media no cuenta por
  debajo del 20 % de `VELOCIDAD_SLOT`: al salir aún es casi cero y la diferencia se
  disparaba.
- En la mesa, cada coche lleva «Σ +0.84» tras su vuelta (que, con la suma, pierde el
  rótulo: «1/3», o no cabe con cuatro); el primero, en ámbar, lo que le saca al
  segundo («Σ −0.63»). En la lupa, el puesto de la suma («SUMA 2/4») sustituye al de
  la carrera, que en mangas engaña (cada uno va por un carril), y debajo la
  diferencia. En la cuenta atrás de la primera manga no hay nada que sumar.
- Medido (arnés, cuatro CPU, 3 vueltas): al acabar cada manga se separa 0,000 s de la
  serie; corriendo, salta como mucho 0,05 s (*La judía*) y 0,10 s (*La ele*) de un
  fotograma a otro. Al empezar la primera manga, el primero de la suma cambia mucho
  (las diferencias son de centésimas).
- `pnyk.json`: 1.16.0.

## Slot Panic 1.16.1: las luces de noche, el puente tapa y los pilotos (13/10/2026)

- En *La diagonal* de noche, las balizas ámbar de la curva que pasa bajo el puente se
  veían encima del tablero, como si fuera de cristal: la luz se pinta después del
  puente. Ahora las balizas que caen bajo el tablero (a menos de medio ancho + 8 px
  de un punto de la pieza `puente`) no se encienden, y lo que alumbra un coche que
  pasa por debajo (`bajoPuente`, el mismo criterio que lo pinta bajo el tablero) se
  recorta del tablero: su hueco en la oscuridad se vuelve a tapar con la oscuridad
  horneada del tablero y su brillo va en una capa aparte sin él. `pintarHora` recibe
  esos coches (`debajo`).
- Los pilotos, de noche: un punto rojo en cada esquina de la cola, con su brillo, y un
  reflejo rojo en el asfalto detrás. Soltando el gatillo (`coche.frenando`, el que ya
  daba la física) se encienden más, como las luces de freno: se ve dónde frena cada
  uno.

## Slot Panic 1.16.2: la luz de freno a cualquier hora y en la repetición (13/10/2026)

- La luz de freno solo se veía de noche (la pintaba `luz.js`) y en los mejores momentos
  ni eso: la repetición posaba los coches con `frenando: false`.
- Ahora la pinta el coche (`dibujarCoche`): frenando, los pilotos de cada modelo pasan
  de granate apagado a rojo encendido (`coches.js`, que en la lupa es lo que se lee) y
  un brillo rojo de 4,5 px suma luz en cada esquina de la cola. De noche, `luz.js`
  suma el suyo encima, como antes.
- La repetición graba el freno: un campo más por coche y cuadro (`CAMPOS` 8) y
  `poseEn` lo da con el estado del cuadro de antes. Una carrera de 10 vueltas sigue
  por debajo de 2 MB. El arnés ya no da por hecho 7 campos y comprueba que se frena y
  que la repetición enciende la luz donde se grabó.

## La luz bajo el puente de *La diagonal* (13/10/2026)

- De noche, con un coche pasando por debajo, todo el puente se oscurecía: la oscuridad
  del tablero se volvía a pintar encima de la que ya había y, semitransparente, se
  sumaba. Ahora primero se borra el tablero y luego se pone la suya: mide lo mismo
  (71, 75, 88) sin coche, con uno llegando y con uno debajo.
- Y la luz de uno que llegaba medio pasaba por encima: `bajoPuente` solo cuenta los
  que están a 90 px del cruce y los faros alumbran 140. Para la luz se pregunta lo
  contrario (`porElTablero`, en `luz.js`): ¿va por el tablero o sus rampas (encima y
  con su rumbo)? La de todos los demás, que van por el suelo, la tapa el tablero.
  `pintarHora` ya no recibe los de debajo.

## Slot Panic 1.16.3: los módulos a la vez y las versiones por partes (13/10/2026, rama `50-modulepreload`)

### Los módulos, todos a la vez: `modulepreload`

- Sin service worker (la primera visita, o quien no instala la PWA) el navegador
  descubre los módulos por capas: el HTML trae `juego.js`, este 32 módulos y esos los
  12 últimos (los circuitos, `geometria.js`, `trazo.js`, `circuito.js`). Cada capa es
  una ida y vuelta, y con `no-cache` también lo es revalidar.
- Ahora cada página lleva un `<link rel="modulepreload">` por módulo (45, `juego.js`
  el primero), de la misma lista que `PRECACHE` (`MODULOS`, en `gen-pages.mjs`). La
  lista de `PRECACHE` no cambia de orden: es el contrato con `app/sync.sh`.
- Medido contra producción (HTTP/2 y brotli) con Chrome sin ventana y la red de
  DevTools, inyectando los enlaces en el HTML; la mediana de 5 cargas, dos tandas
  (`load`, con los módulos ya ejecutados):

  | red | caché | antes | con `modulepreload` |
  |---|---|---|---|
  | 4G lenta | sí (revalida) | 2,42 s | 2,03 s |
  | 4G rápida | sí (revalida) | 1,15 s | 0,90 s |
  | 4G rápida | no | 1,13 s | 1,02 s |
  | 4G lenta | no | 3,4-3,5 s | igual (ruido) |

  Se gana una ida y vuelta, no dos: `juego.js` ya lo encontraba pronto el escáner del
  HTML. Sin caché y en 4G lenta manda el ancho de banda (los ~210 KB). Los pedidos
  son los mismos (ninguno se pide dos veces) y no hay errores.

### Una versión nueva solo baja lo que ha cambiado

- Hasta ahora, cada versión cambiaba `CACHE` y el service worker se reinstalaba
  pidiendo los 62 ficheros de `PRECACHE` (~250 KB) aunque cambiara uno.
- Ahora el service worker lleva la huella de cada fichero (`HUELLAS`, la misma de
  `huella()` en `gen-pages.mjs`, en un bloque aparte de `PRECACHE`: `app/sync.sh` lee
  ese y no debe ver otra cosa). Cada caché guarda, en la entrada `slotpanic-huellas`,
  las huellas con las que se llenó, y se escribe la última: una caché sin ella está a
  medias y no sirve de origen. Al instalarse, lo que tiene la misma huella en una
  caché anterior se copia de allí y solo lo demás va a la red (con `cache: 'reload'`,
  como antes). La caché nueva queda entera y de una sola versión: no se mezclan.
- Probado en Chrome sin ventana con `?sw`: instalada una versión, se cambia un
  comentario de `luz.js` y se regenera; la actualización pide al servidor
  `service-worker.js` y `luz.js`, nada más, y la caché nueva tiene sus 62 ficheros, el
  de `luz.js` el nuevo, y la vieja se borra.
- La primera actualización desde la 1.16.2 todavía lo baja todo: su caché no tiene
  índice. Los `modulepreload` no llevan huella en la dirección, así que cambiar un
  módulo no cambia las páginas: un cambio en un módulo baja ese módulo.

## El tiempo de fotograma en la depuración (16/10/2026, rama `51-tiempo-de-fotograma`)

- Los FPS no dicen si se va sobrado o al límite, y un tirón suelto se pierde en la
  media. `medida.js` anota cada fotograma: el **trabajo** (actualizar y dibujar, con
  `performance.now()`; lo que corre en el hilo principal, sin la composición del
  navegador ni el propio panel) y el **cuadro** (el hueco entre dos
  `requestAnimationFrame`: pasado de 16,7 ms se ha perdido uno). Cada segundo, la media
  y el percentil 95 de cada uno: el peor 5 %. Sin asignaciones por fotograma (búferes
  fijos, se ordenan al resumir). Solo con `DEPURACION`: publicado no mide nada.
- Se pinta en una segunda línea del panel, pegada al borde de abajo (a media banda
  pisaba el rótulo del J2); en la lupa, encima de la de siempre. `estado.fps` se va:
  el resumen vive en `medida`.
- En el portátil de desarrollo (pantalla de 144 Hz), *El ocho largo* de noche con
  cuatro CPU: 144 FPS, trabajo 0,6 ms (p95 0,9) y cuadro 6,9 ms (p95 7,1). Sobra
  más de diez veces: la decisión de la fase 5 la dará el Android modesto.

## La luz de freno, en un sprite (16/10/2026, rama `52-freno-en-capa`)

- `pintarFreno` (`dibujo.js`) creaba dos degradados radiales por coche y fotograma
  frenando: basura para el recolector. Ahora el degradado se pinta una vez, la primera
  vez que alguien frena, en un sprite (`crearSpriteFreno`), y se estampa dos veces con
  `drawImage`, sumando color como antes. El sprite va a ×8 (72 px para 9): con la lupa
  y en pantallas densas se amplía y no se ve borroso.
- Comparado ampliado ×8 con el de antes, uno junto al otro: no se distinguen. Medido en
  el portátil con 20.000 coches seguidos, el freno con degradados añadía ~140 µs por
  coche y con el sprite no se aprecia (está dentro del ruido). Es un banco de pruebas
  tosco, que mide también lo que la GPU tarda en vaciar la cola; la cifra que manda es
  la del Android.

## Slot Panic 1.16.4: el atardecer, fluido en Android (16/10/2026, rama `53-atardecer-fluido`)

- En la PWA de Android, el atardecer iba lento y a saltos aun con dos carriles; la
  noche, con cuatro, no. El velo eran dos rellenos de pantalla completa por
  fotograma con `multiply` y `soft-light`, modos que la mezcla de la GPU no hace: cada
  uno copia y relee el lienzo entero. La noche solo usa `source-over`, `lighter` y
  `destination-out`.
- Ahora el velo es una capa pintada una vez (`crearVelo`, `luz.js`) y estampada con
  `source-over` y `globalAlpha` = la fuerza del atardecer (así sigue fundiéndose en la
  carrera que anochece). Con mezcla normal no se puede multiplicar por canal, así que
  el color y el alcance de cada extremo se ajustaron por mínimos cuadrados a lo que
  hacían los dos rellenos, sobre grises de 0,1 a 0,9: hacia el sol
  `rgba(164, 76, 0, 0.23)` (queda a ~9/255), al otro lado `rgba(70, 0, 2, 0.34)`
  (~4/255). En el ordenador la portada con uno y con otro casi no se distingue.
- Probado en el móvil por la wifi, el viejo y el nuevo tras `?velo`: con el velo va
  fluido. No queda ningún otro modo de mezcla de esos en el juego.

## Slot Panic 1.17.0: empezar a jugar en el móvil en horizontal (16/10/2026, rama `54-sin-pie-en-movil`)

Del playtest en el móvil en horizontal (sin PWA): el menú no se veía, un toque perdido
arrancaba la carrera, no se sabía cómo jugar uno o dos ni qué coche era el tuyo.

- **El lienzo se salía de la pantalla.** Su ancho salía de `100vh`, que en el móvil es
  el alto sin la barra del navegador: con ella a la vista, el lienzo era más alto que
  lo visible y se cortaba arriba (el menú entero) y abajo. Ahora `100dvh`, con `100vh`
  de respaldo.
- **El pie flotante**, con los enlaces y «Cookies», caía encima del circuito y se
  pulsaba en vez de acelerar. En táctil (`pointer: coarse`) y en pantallas de menos de
  600 px de alto va al final de la página, bajo la prosa, como en la lupa.
- **Tocando en la mesa** (con teclado y en la lupa, todo igual):
  - La barra del menú ocupa la banda (48 px lógicos en vez de 36) y su letra, 22 en vez
    de 17: un píxel lógico es poco más de medio real.
  - La portada tiene dos botones, **1 JUGADOR** y **2 JUGADORES** (`cajasJugar`), y un
    toque fuera ya no arranca nada. El circuito y el botón de récords, más grandes (20
    y 40 px de alto).
  - A uno, toda la pantalla acelera su coche; a dos, una mitad cada uno. El carril de
    la CPU ya no se toma tocando (`juegaTactil`; en la lupa, sí).
  - **La salida espera** (`estado.espera`): la parrilla quieta, el semáforo apagado y
    sin número, un anillo que late alrededor del coche de cada jugador («TÚ» si juega
    uno) y en su panel «MANTÉN EL DEDO PARA SALIR», que pasa a «¡LISTO!» en verde con el
    dedo puesto. La cuenta atrás empieza cuando todos lo tienen. También al repetir, en
    cada carrera del campeonato y en cada manga.
- Siete textos nuevos en los siete idiomas; se va «el carril que nadie toque lo lleva
  la CPU», que ya no es verdad.
- Probado en el navegador simulando el táctil (un toque fuera no arranca; la espera,
  a uno y a dos) y en el móvil por la wifi. Arnés: 2331/2331.
