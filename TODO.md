# TODO

Aquí solo vive **lo pendiente**. Lo cerrado, con sus medidas y el porqué de cada
decisión, está en `BITACORA.md`. Las ideas sin fase, en `IDEAS.md`.

`README.md` es la especificación de diseño a largo plazo; este archivo define el alcance
real de cada fase. **Ante una discrepancia, manda `TODO.md`.**

---

# Fase 1 — Publicar el prototipo

Lo que hereda de Race Panic ya es jugable («sólido y jugable» tras cuatro playtests como
modo). Antes de crecer, que esté en su sitio:

- [ ] Repo en GitHub y despliegue en Plesk (`https://slot.pnyk.es`): un push a `master`
      publica.
- [ ] Propiedad de GA4 propia y su ID en `analitica.js` (`GA4_ID`, hoy vacío).
- [ ] Ficha en `pnyk/proyectos.js` (slug `slot-panic`, los siete idiomas) y propagar
      `vendor/pnyk/` para que la red de la familia lo enlace.
- [ ] Favicon propio (hoy es el de Race Panic).
- [ ] Playtest en el móvil: a dos en una pantalla, ¿se estorban los dedos?
- [ ] ¿5 vueltas (~65 s) es mucho para una revancha?

# Fase 2 — Lo que lo hace suyo

Por decidir el orden, con el filtro de siempre («¿hace la carrera más divertida?»):

- [ ] Circuitos de piezas y más de un circuito.
- [ ] Estética de juguete: piezas con juntas, trencillas, la mesa.
- [ ] Niveles de CPU (hoy una, `CPU_SLOT`, ~1,2 s por vuelta del mejor piloto).
- [ ] Récords (y fantasma) por circuito y carril.

# Fase 3 — Plataforma

- [ ] Páginas por idioma generadas, SEO y PWA: copiarlos de Race Panic cuando los tenga,
      como plantilla.
