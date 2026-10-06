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
- [ ] Más circuitos oficiales.
- [ ] Estética de juguete: piezas con juntas, trencillas, la mesa.
- [ ] Niveles de CPU (hoy una, `CPU_SLOT`, ~1,2 s por vuelta del mejor piloto).
- [ ] Récords (y fantasma) por circuito y carril.
- [ ] Playtest del modo lupa: ¿qué zoom (hoy 1,2, `?lupa=1.5` para probar otro)?, ¿se ven
      a tiempo las curvas que vienen? Si tuviera que bajar de lo que llena la mesa (0,93),
      algo barato más allá de ella: el suelo del escenario estirado o un patrón.

# Fase 2b — El constructor de circuitos

Que cualquiera dibuje su circuito (sobre todo en el móvil), lo corra y lo publique, y que
los demás elijan entre los publicados. Decidido:

- **Sin registro.** Construir y correr en local no pide nada. Para publicar, un alias de
  3 letras (como los récords de Race Panic) y una **llave anónima** guardada en el
  dispositivo, que permite borrar lo propio. Sin correo ni contraseña: no hay cuenta que
  borrar en Play ni datos personales.
- **Se dibuja con el dedo en una cuadrícula** (unas 11 × 6 casillas de 110 px bajo la
  barra de 56, que tienen que medir ≥ ancho + 40 = 104): el trazo pone solo la recta o la
  curva, y tocar una pieza cambia su variante. En una cuadrícula, cerrar siempre cuadra;
  un circuito abierto no se corre ni se publica.
- **Las piezas son las de hoy**: recta (baches, X, meta), curva (peralte, derrape, amplia
  de 2 × 2), chicane (dos rectas seguidas) y cruce (el trazo vuelve a pasar por una recta,
  en perpendicular).
- **Se publica al instante y se puede denunciar**: con N denuncias se oculta hasta
  revisarlo. El nombre sale de dos listas (adjetivo + sustantivo) en los siete idiomas,
  sin texto libre.
- **El marcador va en una barra arriba, en todos los circuitos**: el interior deja de
  estar reservado y el constructor tiene todo el campo.

Por ramas, en este orden:

- [ ] **12 — El constructor** (local, sin red; v0.6.0). Hecho en la rama: la escena
      (`constructor.js`, `nucleo/trazo.js`), la barra (volver, nombre, estado, deshacer,
      borrar, Probar, Guardar), «Mis circuitos» en `localStorage` (tecla C, detrás de los
      oficiales) y CONSTRUIR (tecla B) en la portada. Falta:
  - [ ] Playtest en el móvil: ¿se dibuja bien con el dedo?, ¿se entiende tocar para
        cambiar la pieza?, ¿la ayuda de abajo estorba?
  - [ ] Borrar un circuito guardado.
  - [ ] CONSTRUIR en la portada de la lupa (hoy hay que girar el móvil).
  - [ ] Compartir: copiar el enlace `?c=<código>` de un circuito.
- [ ] **13 — Circuitos públicos** (v0.7.0). `api.php` + `schema.sql` copiados de Race
      Panic (MySQL en Plesk): publicar (el mismo código da el mismo circuito), lista
      por nuevos o más jugados, borrar con la llave, denunciar (una por huella de IP) y
      jugado. El PHP valida la cuadrícula (aritmética entera); la geometría la garantiza
      el catálogo probado en el arnés. Límite por día, CORS para la app, `.htaccess`.
      Galería con miniaturas, denunciar desde la galería y el fin, normas que se aceptan
      antes de publicar (Play las pide). Privacidad: la ficha de pnyk (`privacy`) y, en
      Play, seguridad de datos y contenido de usuarios.

# Fase 3 — La app de Google Play

El camino entero, con lo hecho marcado, en `APP.md` §8. Lo que queda:

- [ ] Instalar la de Android por USB y probarla en un móvil (APP.md, Fase B).
- [ ] Crear la app en la consola de Play (`es.pnyk.slot`), rellenar la ficha con
      `app/store/` y subir el bundle a pruebas internas; luego, pública.
- [ ] Más adelante, la de iOS (necesita un Mac).
