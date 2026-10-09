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

# Fase 3 — La app de Google Play

El camino entero, con lo hecho marcado, en `APP.md` §8. Lo que queda:

- [ ] Instalar la de Android por USB y probarla en un móvil (APP.md, Fase B).
- [ ] Crear la app en la consola de Play (`es.pnyk.slot`), rellenar la ficha con
      `app/store/` y subir el bundle a pruebas internas; luego, pública.
- [ ] Más adelante, la de iOS (necesita un Mac).
