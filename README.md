# Slot Panic

> Carreras de slot con vista cenital, en **HTML5, JavaScript y CSS**, sin frameworks ni
> dependencias. Los coches van enganchados a un carril: no hay volante, **solo apretar y
> soltar**. Una sola lección que dominar: **suelta antes de la curva**.

Hermano de **Race Panic** (`race.pnyk.es`), del que nació como modo de juego.

---

# Estado actual

Prototipo publicado en **https://slot.pnyk.es**: tres circuitos (La horquilla, y El ocho y
El nudo, de piezas: X, cruce, chicane, peralte, curva de derrape y baches) con dos
carriles, cinco vueltas, uno contra una CPU que falla o dos en la misma pantalla,
instalable como PWA y con la app de Android preparada para Google Play (`APP.md`), cuatro escenarios de día, al atardecer o
de noche, siete idiomas, sonido, teclado y táctil.

- `TODO.md` — lo pendiente y el alcance de la fase en curso.
- `BITACORA.md` — lo ya hecho, con las medidas y el porqué de cada decisión.
- `CLAUDE.md` — el mapa de módulos y las invariantes del motor.
- `IDEAS.md` — tormenta de ideas para más adelante, sin compromiso.
- `APP.md` — la app de las tiendas: Capacitor en `/app`, por fases.

Este README es la **especificación de diseño a largo plazo**: describe el juego que se
quiere, no el que hay hoy. Ante una discrepancia, manda `TODO.md`.

---

# Concepto

Una pista de slot vista desde arriba. Cada coche va por su carril y solo tiene un
mando: el gatillo. Apretar acelera; soltar deja rodar y frena. Si se entra en la curva
demasiado deprisa, la cola sale de lado (aviso), y si se insiste el coche se sale del
carril, da vueltas sobre la mesa y una **mano** lo devuelve al sitio donde se salió.
Salirse cuesta tiempo, no la carrera.

Es el control móvil perfecto: **un dedo** acelera, soltar frena. Y es el multijugador
local más sencillo posible: uno aprieta a la izquierda y otro a la derecha. Con el móvil
en vertical, el **modo lupa**: la pista ampliada alrededor del coche y el mapa del
circuito arriba, uno contra la CPU.

# Mecánica

- **El gatillo se dosifica**: la potencia sigue al dedo con retraso; a toques se queda a
  medias, como el mando del juguete.
- **Derrape antes de salirse**: pasado el agarre, la cola sale y el coche pierde
  velocidad; solo se sale si sigue pasado o si entra muy pasado.
- **Dos carriles** que se cambian en cada carrera: el de dentro es más corto pero más
  cerrado.
- **La CPU** lleva el carril que nadie toca, y se equivoca alguna vez. Pulsar el control
  de un carril lo toma para toda la carrera: sin menú, uno contra la CPU o dos entre sí.

# Lo que se quiere

- **Circuitos de piezas** (recta, curva, X, cruce, chicane, peralte, derrape, baches;
  ya hay dos) y un **constructor** para el jugador: se dibuja con el dedo en una
  cuadrícula, se corre y se publica sin registrarse (un alias y una llave en el
  dispositivo), y los demás eligen entre los publicados. Lo publicado se puede denunciar.
- **Todo el campo para la pista**: el marcador va en una barra arriba.
- **Sus coches** y una **estética de juguete**: piezas negras con juntas, trencillas
  plateadas, una mesa o el suelo de un salón.
- Cambio de carril y cruces como en los slot digitales.

Detalle y más, en `IDEAS.md`.

# Controles

| | Teclado | Táctil |
|---|---|---|
| J1 | W, A, Mayús izquierda o Espacio | mitad izquierda |
| J2 | ↑, L, Mayús derecha o 0 del teclado numérico | mitad derecha |

En la portada: Enter empieza, C circuito, M sonido, L idioma, E escenario, H hora. En carrera: R
repite y Esc vuelve al menú.

# Técnica

Módulos ES nativos, sin build. Todo en píxeles lógicos (1280×720) y segundos. Un arnés
en Node (`node arnes.mjs`) corre carreras enteras con pilotos automáticos y comprueba
las reglas.
