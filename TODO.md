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

- [ ] Playtest de las piezas: ¿se nota la curva de derrape?, ¿el peralte y los baches se
      leen antes de llegar?
- [ ] Playtest de los choques: ¿se entiende por qué uno sigue y el otro no?, ¿frustra que
      te saque el que se sale a tu lado?, ¿el roce de la estrecha saca demasiado o poco
      (`ROCE` 12, `GOLPE_SALE` 90)?
- [ ] Más circuitos oficiales (hoy seis).
- [ ] Playtest de *La diagonal*: ¿el cruce a 60° se ve venir desde la diagonal?, ¿se
      chocan en él lo bastante (en la misma pista, la CPU y el mejor piloto casi nunca)?,
      ¿la estrecha del lazo antes de la horquilla sirve de algo?
- [ ] Playtest de *La bañera*: ¿el desvío se lee antes de llegar?, ¿las balas de paja
      se ven pequeñas?, ¿14 px de quiebro (`DESVIO`) se notan?
- [ ] Playtest de los escenarios: ¿se leen las piezas nuevas (flores, estanques, pacas,
      matojos, huesos, muñecos de nieve; canicas, gomas y clips en la mesa) y la vida del
      suelo, o estorban a la pista?
- [ ] Playtest de los récords: ¿el fantasma ayuda o estorba (hoy al 0,3)?, ¿se entiende
      firmar?, ¿el mínimo de vuelta del servidor (el 80 % del mejor piloto automático)
      deja pasar a los buenos?
- [ ] Playtest de los mejores momentos: ¿el que sale solo alarga el fin o se ve con
      gusto (la analítica cuenta `saltar_momento`)?, ¿elige lo que uno recordaría?, ¿se lee
      el rótulo?, ¿el zoom (1,6, `ZOOM_REPETICION`) y la cámara lenta (×0,35) marean o
      se ven borrosos? La salvada (derrape > 0,5 sin salirse) casi no sale: ¿lo consigue
      alguien?

# Fase 2b — El constructor de circuitos

Hecho: dibujar, guardar, compartir y publicar en la galería (v0.8.0, `BITACORA.md`).
Lo que queda:

- [ ] Playtest de la galería en el móvil: ¿se encuentra?, ¿se lee la tarjeta?, ¿publicar
      se entiende a la primera?
- [ ] Ver en la base que con 3 denuncias de IP distintas un circuito se oculta (desde un
      solo ordenador no se puede probar), y revisar los ocultos de vez en cuando.

# Fase 3 — La app de Google Play

El camino entero, con lo hecho marcado, en `APP.md` §8. Lo que queda:

- [ ] Instalar la de Android por USB y probarla en un móvil (APP.md, Fase B).
- [ ] Crear la app en la consola de Play (`es.pnyk.slot`), rellenar la ficha con
      `app/store/` y subir el bundle a pruebas internas; luego, pública.
- [ ] Más adelante, la de iOS (necesita un Mac).
