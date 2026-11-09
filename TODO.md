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

- [ ] Pasar a pública (en prueba cerrada, con el bundle 1.18.1, `versionCode` 5).
- [ ] Más adelante, la de iOS (necesita un Mac).

# Fase 4 — La pista de cuatro carriles

Un modo propio, con sus circuitos (`CIRCUITOS_CUATRO`) y su campeonato: no entra en el
campeonato de los seis ni en los récords. Hecho: el motor, *El ocho largo*, el modo en
la portada, con cuatro coches siempre, las mangas y *La judía* y *La ele*
(`BITACORA.md`). Lo que queda:

- [ ] Playtest de la pista de cuatro, en el ordenador y en el móvil: ¿se distingue el
      coche propio entre cuatro?, ¿el cruce con cuatro es divertido o un caos?, ¿se
      entiende que el carril de fuera de un lazo va a fondo?, ¿los paneles de la cuenta
      atrás en los lazos se leen?, ¿cuatro coches a la vez cansan de oído?
- [ ] Playtest de las mangas: ¿cuatro mangas de 10 vueltas (~7 min) se hacen largas?,
      ¿se entiende que gana la suma y no el que gana más mangas?, ¿el ámbar del primero
      de la suma, que al empezar la primera manga salta de un coche a otro, molesta?
- [ ] Playtest de *La judía* y *La ele*: ¿se entiende que el carril de fuera va casi a
      fondo y el de dentro hay que soltar?, ¿el carril de dentro de *La ele* (radio 25)
      se ve demasiado cerrado?

# Fase 6 — En red

Cada uno en su dispositivo, en una sala privada con código: primero a dos, después hasta
cuatro en la pista de cuatro. El diseño y sus razones, en `MULTIJUGADOR.md`; sigue los
pasos del cooperativo de Orbit Panic y usa el servidor de salas común (`salas.pnyk.es`).
La prueba de red (el bloque 0) la superó Orbit con el mismo servidor; el bloque A (la
red de mentira, `nucleo/red.js` y la sección 10 del arnés), el B (`net.js` y el alta en
`salas.pnyk.es`), el C (las pantallas, `sala.js`), el D (la carrera a dos) y el E (las reglas)
están hechos (`BITACORA.md`). El orden importa:

- [ ] **Playtest del bloque D**, a dos pestañas en ventanas separadas (o dos dispositivos) y
      a `?lag=60&jitter=20`: ¿el coche propio responde sin retardo?, ¿los demás se ven
      fluidos?, ¿un golpe que llega 60 ms tarde se entiende en quien lo recibe?
- [ ] **Playtest del bloque E**, en dos dispositivos: ¿se entiende que hay que pulsar para estar
      listo?, ¿20 s de espera son muchos?, ¿se lee «Aún en la carrera» en la sala?, ¿y el aviso
      cuando el otro se va? Una serie de mangas en red entera (cuatro carreras), que en la prueba
      del bloque solo se vio empezar.
- [ ] **Bloque G: publicación a dos.** Prosa y JSON-LD, ficha de Play, `pnyk.json` a
      1.20.0, `BITACORA.md` y `CLAUDE.md`. Criterio: probado entre web y app de Android, y
      con dos móviles reales en redes distintas.
- [ ] **Bloque S4: salas de cuatro.** El servidor admite `max` hasta 4 sin cambiar las
      salas de dos (Orbit), `net.js` a comun 1.4.0, la política común dice «con otras
      personas», y hasta cuatro personas en la pista de cuatro (`MULTIJUGADOR.md` §5.2).
      Criterio: Orbit sigue igual y cuatro navegadores corren juntos.
