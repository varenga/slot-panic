# TODO

Aquí solo vive **lo pendiente**. Lo cerrado, con sus medidas y el porqué de cada
decisión, está en `BITACORA.md`. Las ideas sin fase, en `IDEAS.md`.

`README.md` es la especificación de diseño a largo plazo; este archivo define el alcance
real de cada fase. **Ante una discrepancia, manda `TODO.md`.**

---

# Fase 1 — Publicar el prototipo

Lo que hereda de Race Panic ya es jugable («sólido y jugable» tras cuatro playtests como
modo). Antes de crecer, que esté en su sitio:

- [ ] Playtest en el móvil: a dos en una pantalla, ¿se estorban los dedos?

# Fase 2 — Lo que lo hace suyo

Por decidir el orden, con el filtro de siempre («¿hace la carrera más divertida?»):

- [ ] Playtest de las piezas: ¿se nota la curva de derrape?, ¿los choques en la X y el
      cruce divierten o frustran?, ¿el peralte y los baches se leen antes de llegar?
- [ ] Más circuitos oficiales (hoy cuatro).
- [ ] Estética de juguete: piezas con juntas, trencillas, la mesa.
- [ ] Playtest de los récords: ¿el fantasma ayuda o estorba (hoy al 0,3)?, ¿se entiende
      firmar?, ¿el mínimo de vuelta del servidor (el 80 % del mejor piloto automático)
      deja pasar a los buenos?
- [ ] Playtest del modo lupa: ¿qué zoom (hoy 1,2, `?lupa=1.5` para probar otro)?, ¿se ven
      a tiempo las curvas que vienen? Si tuviera que bajar de lo que llena la mesa (0,93),
      algo barato más allá de ella: el suelo del escenario estirado o un patrón.

# Fase 2b — El constructor de circuitos

Hecho: dibujar, guardar, compartir y publicar en la galería (v0.8.0, `BITACORA.md`).
Lo que queda:

- [ ] Playtest de la galería en el móvil: ¿se encuentra?, ¿se lee la tarjeta?, ¿publicar
      se entiende a la primera?
- [ ] Ver en la base que con 3 denuncias de IP distintas un circuito se oculta (desde un
      solo ordenador no se puede probar), y revisar los ocultos de vez en cuando.

# Fase 2c — El menú por grupos y el coche de cada uno

La barra de la portada tiene diez opciones y en un portátil la letra baja a 9-11 px. Se
agrupan en cuatro botones que abren un panel sobre la pista:

| Botón | Qué tiene |
|---|---|
| **CARRERA** | circuito, vueltas (3, 5 y 10, también en el móvil), CPU, suelta o campeonato, jugadores |
| **COCHE** | modelo y color, uno por jugador; las características (Fase 2d) |
| **CIRCUITOS** | la galería y, un nivel más abajo, el constructor |
| **AJUSTES** | escenario, hora, sonido, idioma |

Dos contextos, no cuatro: **ordenador** (teclado) y **móvil** (táctil: la PWA y la app,
con las mismas decisiones). Se decide por cómo se juega, no por la orientación: girar el
móvil no esconde opciones; la lupa solo quita lo que no cabe en vertical (jugar dos).

Hecho: los cuatro grupos, quién juega, el coche y el color de cada uno (`BITACORA.md`).
Lo que queda:

- [ ] Playtest en el móvil (horizontal y lupa): ¿se encuentra todo a la primera?, ¿los
      paneles se tocan bien con el dedo?
- [ ] ¿El constructor en la app? Decidir antes de subirla a Play.

# Fase 2d — Coches con características

Deja de ser cosmético: cada modelo, su tamaño y su carácter. Va detrás de la 2c.

- [ ] Largo por modelo (≈ 27-35 px), el ancho casi fijo: dos coches en paralelo no
      pueden tocarse en recta (sección 3 del arnés).
- [ ] Aceleración (`SUBE_POTENCIA`), agarre (`AGARRE_SLOT`) y punta (`VELOCIDAD_SLOT`)
      como multiplicadores con un presupuesto fijo; el carácter, acorde a la forma.
- [ ] Arnés: con cada modelo, el piloto prudente en ±3 % del de hoy y ninguno gana en
      los cuatro oficiales; la CPU conoce el agarre de su coche y `NIVELES_CPU` se mide
      con cada modelo.
- [ ] Récords: **una tabla con todos los coches**, cada vuelta con su modelo (el fantasma
      lo pinta). Un modelo se queda con la física de hoy, para que los récords que hay
      sigan valiendo; el mínimo de `servidor/records.php`, con el más rápido.
- [ ] COCHE enseña las características: barras en el móvil, la tabla en el ordenador.

# Fase 3 — La app de Google Play

El camino entero, con lo hecho marcado, en `APP.md` §8. Lo que queda:

- [ ] Instalar la de Android por USB y probarla en un móvil (APP.md, Fase B).
- [ ] Crear la app en la consola de Play (`es.pnyk.slot`), rellenar la ficha con
      `app/store/` y subir el bundle a pruebas internas; luego, pública.
- [ ] Más adelante, la de iOS (necesita un Mac).
