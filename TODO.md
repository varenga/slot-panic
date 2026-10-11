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

- [ ] Playtest del peralte y los baches (1.12.0): ¿se entiende ya el peralte (la rampa
      y las flechas) o hace falta que se note al pasar?, ¿los baches se notan (bote,
      golpe, vibración, polvo)?, ¿el freno (`FRENO_BACHES` 0,15) se queda corto?
- [ ] Más circuitos oficiales (hoy seis).
- [ ] Playtest de *La diagonal*: ¿el cruce a 60° se ve venir desde la diagonal?, ¿se
      chocan en él lo bastante (en la misma pista, la CPU y el mejor piloto casi nunca)?,
      ¿la estrecha del lazo antes de la horquilla sirve de algo?
- [ ] Playtest de *La bañera*: ¿el desvío se lee antes de llegar?, ¿las balas de paja
      se ven pequeñas?, ¿14 px de quiebro (`DESVIO`) se notan?
- [ ] Playtest de los récords: ¿el fantasma ayuda o estorba (hoy al 0,3)?, ¿se entiende
      firmar?, ¿el mínimo de vuelta del servidor (el 80 % del mejor piloto automático)
      deja pasar a los buenos?

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
