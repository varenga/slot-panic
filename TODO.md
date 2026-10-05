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

# Fase 2b — El constructor de circuitos

Que cualquiera dibuje su circuito (sobre todo en el móvil), lo corra y lo publique, y que
los demás elijan entre los publicados. Decidido:

- **Sin registro.** Construir y correr en local no pide nada. Para publicar, un alias de
  3 letras (como los récords de Race Panic) y una **llave anónima** guardada en el
  dispositivo, que permite borrar lo propio. Sin correo ni contraseña: no hay cuenta que
  borrar en Play ni datos personales.
- **Se dibuja con el dedo en una cuadrícula** (unas 11 × 6 casillas de 112 px, que tienen
  que medir ≥ ancho + 40 = 104): el trazo pone solo la recta o la curva, y tocar una pieza
  cambia su variante. En una cuadrícula, cerrar siempre cuadra; un circuito abierto no se
  corre ni se publica.
- **Las piezas son las de hoy**: recta (baches, X, meta), curva (peralte, derrape, amplia
  de 2 × 2), chicane (dos rectas seguidas) y cruce (el trazo vuelve a pasar por una recta,
  en perpendicular).
- **Se publica al instante y se puede denunciar**: con N denuncias se oculta hasta
  revisarlo. El nombre sale de dos listas (adjetivo + sustantivo) en los siete idiomas,
  sin texto libre.
- **El marcador va en una barra arriba, en todos los circuitos**: el interior deja de
  estar reservado y el constructor tiene todo el campo.

Por ramas, en este orden:

- [ ] **08 — Gradas y barra** (v0.3.1). La grada de El ocho flota en el hueco de abajo a
      la derecha, sin tramo delante: va junto a la recta de meta, por fuera. El marcador,
      los avisos y la guía pasan a la barra superior (medir si 46 px se leen en el móvil);
      `interior` pasa a ser opcional (portada y cartel de fin al centro si no lo hay).
- [ ] **09 — La cuadrícula** (núcleo, sin interfaz). `nucleo/cuadricula.js`: el trazado
      (casilla y rumbo de la meta + un movimiento por casilla con su variante), su código
      para compartir (base64url), `aPiezas()` hacia `construirDePiezas`, sectores por
      tercios y gradas solas junto a la recta más larga. `nucleo/validar.js`: lo barato de
      las secciones 1 y 3 del arnés, para que lo use también el juego. Arnés, sección 5:
      el catálogo y sus vecinas cumplen la geometría y N trazados al azar (con semilla)
      pasan las secciones 1 y 3; lo que no valga, lo prohíbe la validación.
- [ ] **10 — El constructor** (local, sin red; v0.4.0). Escena propia: cuadrícula, trazo
      con el aspecto de la pista y extremo abierto resaltado. Barra: volver, nombre,
      estado (abierto / cerrado), deshacer, borrar, Probar, Guardar. Un dedo: arrastrar
      traza, volver por el trazo borra, tocar cambia la variante, llegar al inicio
      cierra. Probar corre contra la CPU. «Mis circuitos» en `localStorage`; la portada
      ofrece oficiales / míos / públicos y Construir; `?c=<código>` abre un circuito
      compartido, también sin red.
- [ ] **11 — Circuitos públicos** (v0.5.0). `api.php` + `schema.sql` copiados de Race
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
