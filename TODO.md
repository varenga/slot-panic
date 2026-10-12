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
- [ ] Playtest de *La diagonal* (con el puente, 1.13.0): ¿la estrecha del lazo antes
      de la horquilla sirve de algo?, ¿el puente se lee en el escenario juguete y de noche?
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

# Fase 4 — La pista de cuatro carriles

Un modo propio, con sus circuitos (`CIRCUITOS_CUATRO`) y su campeonato: no entra en el
campeonato de los seis ni en los récords. Hecho: el motor de N carriles y *El ocho
largo* (`BITACORA.md`). Lo que queda, en la rama `43-cuatro-carriles`:

- [ ] El modo en la portada: elegir entre la pista de dos y la de cuatro, y sus
      circuitos.
- [ ] Cuatro coches: el J1 y el J2 (cada uno con su mitad de la pantalla, como hoy) y
      la CPU en los carriles que nadie toque; sus colores y sus modelos.
- [ ] El dibujo: los cuatro carriles (`dibujo.js` aún pinta `CARRILES`) y la parrilla.
- [ ] El marcador y el cartel de fin con cuatro (puestos del 1 al 4), los momentos (la
      llegada solo se busca con dos coches), la repetición y los cuatro zumbidos.
- [ ] La lupa: el J1 contra tres CPU.
- [ ] La portada: el ocho largo no tiene hueco en el interior (se pinta en el centro,
      encima del cruce). ¿Dónde va?
- [ ] El campeonato de cuatro (`campeonato.js` cuenta dos coches).
- [ ] El nombre de *El ocho largo* en los siete idiomas.

Después, en su rama (`44-mangas`): una manga por carril, cada piloto pasa por los
cuatro y gana la suma de tiempos. Hace falta para cualquier circuito de cuatro que no
sea un ocho (`IDEAS.md` › 5).
