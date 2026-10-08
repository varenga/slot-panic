<?php
/*
 * Slot Panic — la validación del servidor, para el arnés.
 *
 * Lee un código por línea de la entrada y escribe, por cada uno, una línea
 * JSON con lo que diría el servidor: si se lee, el error de la validación y
 * el código canónico. El arnés hace lo mismo con `nucleo/cuadricula.js` y
 * compara. Solo de línea de órdenes: tools/ no se sirve.
 */

if (PHP_SAPI !== 'cli') exit;
require __DIR__ . '/../servidor/cuadricula.php';

while (($linea = fgets(STDIN)) !== false) {
  $codigo = rtrim($linea, "\r\n");
  $trazado = cuadricula_de_codigo($codigo);
  echo json_encode([
    'lee' => $trazado !== null,
    'error' => $trazado === null ? null : cuadricula_validar($trazado),
    'canonico' => $trazado === null ? null : cuadricula_a_codigo($trazado),
  ]), "\n";
}
