# Google Play Console — lo que se contesta

Las respuestas a los formularios de la consola, para no reconstruirlas en cada
envío. Salen de lo que la app hace de verdad; si cambia, esto cambia con ello.
Los textos de la ficha están en `listing/es.md` y `listing/en.md`; la imagen
destacada es `feature.png` (`generate.sh`) y las capturas,
`screenshots/<idioma>/` (`screenshots.mjs`). Calcado del de Orbit Panic, que
ya pasó por la consola.

## Ficha

* **Categoría**: Juegos → Carreras. **Tipo**: juego. **Gratis**, sin anuncios
  ni compras.
* **Idioma predeterminado**: español (es-ES); traducción en-US. El juego habla
  siete idiomas, pero la ficha va en dos: los otros cinco caen al inglés.
* **Correo de contacto**: el de la política de privacidad común de PNYK.
* **Sitio web**: https://slot.pnyk.es/
* **Política de privacidad**: https://pnyk.es/privacidad/#juegos, la común de
  PNYK, sección «Juegos de PNYK» (convenciones PNYK: `privacy` en la ficha de
  `pnyk/proyectos.js`), donde figura con su GA4 y sin récords. Las páginas
  del juego la enlazan desde su pie.
* **Capturas**: teléfono, 1920×1080 (16:9). La imagen destacada, 1024×500.

## Contenido de la app

* **Acceso a la app**: toda la funcionalidad está disponible sin credenciales.
  No hay cuentas.
* **Anuncios**: no contiene anuncios.
* **Público objetivo**: 13 años o más. Marcar un grupo menor mete la app en la
  política de Familias, que pide revisiones y requisitos que un juego sin datos
  no necesita.
* **Clasificación de contenido (IARC)**: cuestionario de «Juego». Violencia: no
  —coches de juguete que se salen del carril y una mano que los devuelve; sin
  personas ni daño—. Sin sexo, sin lenguaje malsonante, sin sustancias, sin
  apuestas ni simulación de apuestas, sin compras. Interacción entre usuarios:
  no (los dos jugadores comparten una pantalla; no hay red). No comparte la
  ubicación. Resultado esperado: PEGI 3 / Everyone.
* **Aplicaciones gubernamentales**: no. **Funciones financieras**: ninguna.
  **Aplicaciones de salud**: no. **Noticias**: no.

## Seguridad de los datos (*Data safety*)

**¿Recoge o comparte datos?** No. La app no tiene récords en servidor, ni
cuentas, ni analítica: dentro de la app no se carga Google Analytics (APP.md
§5.2; la web sí lo usa, `G-LWMERSV8WH`, solo tras consentimiento, y no cuenta
aquí), y no hace ninguna petición de red. Lo único que guarda son preferencias
en el propio dispositivo (`localStorage`: idioma, sonido, circuito, escenario y
hora), que nunca salen de él y que Play no considera «datos recogidos».

Con eso, el formulario se contesta con «No» a la primera pregunta y no hay que
marcar ningún tipo de dato.

## Permisos

Solo `INTERNET`, que Capacitor declara siempre. La app no hace ninguna petición
de red: todo va dentro.

## Versión

`versionCode` sube en cada envío (`android/app/build.gradle`) y no puede
repetirse nunca —un bundle rechazado también lo gasta—; `versionName` es lo que
ve la gente, el mismo que la web cuando se publican a la vez. La primera subida
es `versionCode` 1, `versionName` 0.3.0. Play exige `targetSdk` de la última
versión de Android (a octubre de 2026, el nivel 36; `variables.gradle`).

El bundle se firma con la clave de subida de `~/.slotpanic/` (APP.md §6.1).
En la primera subida Play ofrece *Play App Signing*: se acepta, y Google guarda
la clave de firma; la de subida es solo nuestra.

La advertencia de que «no hay archivo de desofuscación» es inofensiva: no hay
código ofuscado (`minifyEnabled false`) y por tanto nada que desofuscar.
