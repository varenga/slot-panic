<?php
/*
 * Slot Panic — la validación de récords del servidor, para el arnés.
 *
 * Lee una línea JSON por récord ({ circuito, vuelta, carril, fantasma, coche })
 * y escribe, por cada una, lo que diría records_validar(): null o el motivo.
 * Sin coche, el de antes (como api.php). Solo de línea de órdenes: tools/ no
 * se sirve.
 */

if (PHP_SAPI !== 'cli') exit;
require __DIR__ . '/../servidor/records.php';

while (($linea = fgets(STDIN)) !== false) {
  $r = json_decode($linea, true);
  echo json_encode(records_validar($r['circuito'] ?? null, $r['vuelta'] ?? null, $r['carril'] ?? null, $r['fantasma'] ?? null,
    $r['coche'] ?? RECORDS_COCHE_ANTIGUO)), "\n";
}
