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
  **sí, desde la v0.8.0**: se comparte contenido generado por usuarios (los
  circuitos de la galería, con un alias de 3 letras); no hay chat, ni texto
  libre, ni mensajes, ni imágenes. No comparte la ubicación. Resultado
  esperado: PEGI 3 / Everyone, con la nota «Los usuarios interactúan».
* **Contenido generado por usuarios** (política de UGC de Play), lo que pide y
  dónde está:
  * Normas que se aceptan antes de publicar: el diálogo de publicar, la primera
    vez (`publicar.norma.*` en `i18n.js`).
  * Denunciar desde la app: la ⚑ de cada tarjeta de la galería y DENUNCIAR en el
    fin de un circuito ajeno. Con 3 denuncias (de 3 IP distintas) se oculta.
  * Moderación: lo oculto se revisa a mano en la base (`oculto` en
    `circuitos`; 0 lo devuelve, o se borra la fila).
  * Sin texto libre: el nombre sale de dos listas y el alias son 3 letras o
    cifras. Lo único que podría ofender es un alias: se denuncia como el resto.
* **Aplicaciones gubernamentales**: no. **Funciones financieras**: ninguna.
  **Aplicaciones de salud**: no. **Noticias**: no.

## Seguridad de los datos (*Data safety*)

Hasta la v0.7.0 la respuesta era «No recoge datos». **Desde la v0.8.0 (la
galería) sí**, y el formulario cambia. Dentro de la app sigue sin cargarse
Google Analytics (APP.md §5.2). Las preferencias del dispositivo
(`localStorage`) no salen de él y no cuentan.

**¿Recoge o comparte datos?** Recoge: sí. Comparte con terceros: no. Cifrados
en tránsito: sí (HTTPS). Se puede pedir que se borren: sí (desde el dispositivo
con que se publicó, o por correo; política común de pnyk.es).

| Tipo de dato (Play) | Qué es | Obligatorio | Finalidad |
|---|---|---|---|
| Actividad en la app › Otro contenido generado por el usuario | El circuito publicado, su nombre (dos índices de unas listas) y el alias de 3 letras; desde la v0.9.0, también el récord de vuelta que se firma (el alias, el tiempo, el carril y el recorrido de la vuelta) | Opcional: solo si se publica o se firma | Funcionalidad de la app |
| Identificadores del dispositivo u otros | El hash de la llave al azar del dispositivo (permite borrar lo propio) y la huella de la IP (HMAC con sal, no reversible) | Opcional: solo al publicar, firmar un récord, denunciar o jugar un circuito público | Funcionalidad de la app; prevención de fraude y seguridad (límite diario, una denuncia por persona) |

No hay cuentas ni correo; nada se usa para publicidad ni se vende.

## Permisos

Solo `INTERNET`, que Capacitor declara siempre. El juego va entero dentro de la
app; la red solo la usa la galería (`https://slot.pnyk.es/api.php`, con CORS
para `https://localhost`), y sin red se juega igual.

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
