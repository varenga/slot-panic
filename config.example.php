<?php
// Credenciales de MySQL y la sal de la huella para api.php. Copiar a config.php
// (ignorado por git) y rellenar. El fichero real nunca se versiona: se sube al
// servidor una sola vez. La sal: 64 caracteres al azar, por ejemplo con
//   php -r "echo bin2hex(random_bytes(32));"
// Si cambia, las huellas viejas dejan de coincidir (límite diario, denuncias y
// jugadas empiezan de cero), nada más.
const DB_HOST = 'localhost';
const DB_NAME = 'slot_bd';
const DB_USER = 'slot_user';
const DB_PASS = 'cambiame';
const SAL_HUELLA = 'cambiame';
