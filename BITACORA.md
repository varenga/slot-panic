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
