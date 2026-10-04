# TODO

Aquí solo vive **lo pendiente**. Lo cerrado, con sus medidas y el porqué de cada
decisión, está en `BITACORA.md`. Las ideas sin fase, en `IDEAS.md`.

`README.md` es la especificación de diseño a largo plazo; este archivo define el alcance
real de cada fase. **Ante una discrepancia, manda `TODO.md`.**

---

# Fase 1 — Publicar el prototipo

Lo que hereda de Race Panic ya es jugable («sólido y jugable» tras cuatro playtests como
modo). Antes de crecer, que esté en su sitio:

- [ ] Propiedad de GA4 propia y su ID en `analitica.js` (`GA4_ID`, hoy vacío), y
      `privacy` en su ficha de `pnyk/proyectos.js`.
- [ ] Playtest en el móvil: a dos en una pantalla, ¿se estorban los dedos?

# Fase 2 — Lo que lo hace suyo

Por decidir el orden, con el filtro de siempre («¿hace la carrera más divertida?»):

- [ ] Playtest de las piezas: ¿se nota la curva de derrape?, ¿los choques en la X y el
      cruce divierten o frustran?, ¿el peralte y los baches se leen antes de llegar?
- [ ] Constructor de circuitos (con `construirDePiezas` ya hecho) y más circuitos.
- [ ] Estética de juguete: piezas con juntas, trencillas, la mesa.
- [ ] Niveles de CPU (hoy una, `CPU_SLOT`, ~1,2 s por vuelta del mejor piloto).
- [ ] Récords (y fantasma) por circuito y carril.

# Fase 3 — La app de Google Play

El camino entero, con lo hecho marcado, en `APP.md` §8. Lo que queda:

- [ ] Instalar la de Android por USB y probarla en un móvil (APP.md, Fase B).
- [ ] Slot Panic en la política de privacidad común de pnyk.es (`privacy` en
      `pnyk/proyectos.js`): la ficha de Play la enlaza.
- [ ] Crear la app en la consola de Play (`es.pnyk.slot`), rellenar la ficha con
      `app/store/` y subir el bundle a pruebas internas; luego, pública.
- [ ] Más adelante, la de iOS (necesita un Mac).
