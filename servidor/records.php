<?php
/*
 * Slot Panic — los récords de vuelta, en el servidor.
 *
 * Qué se acepta como récord de un circuito oficial: una vuelta de al menos su
 * mínimo y su fantasma (nucleo/fantasma.js, `codificar`), coherente con ella.
 * No hace imposible hacer trampas (todo sale del cliente), pero un tiempo
 * inventado tiene que venir con una vuelta entera que lo cuadre.
 *
 * El arnés comprueba las constantes contra el juego (el mínimo, por debajo del
 * mejor piloto automático; la meta, la del circuito) y que una vuelta de verdad
 * pasa y las trucadas no (tools/validar-record.php).
 *
 * Solo define funciones: incluido no imprime nada, y servidor/ no se sirve.
 */

/*
 * Los oficiales (CIRCUITOS en circuitos/indice.js): la vuelta mínima, en ms (el
 * 80 % de la del mejor piloto automático: un humano que derrapa bien le gana,
 * pero no tanto), y dónde está la meta, en px.
 */
const RECORDS_CIRCUITOS = [
  'primero'  => ['minimo' => 9300, 'meta' => [423, 620]],
  'ocho'     => ['minimo' => 7000, 'meta' => [420, 240]],
  'nudo'     => ['minimo' => 8700, 'meta' => [420, 620]],
  'resbalon' => ['minimo' => 6500, 'meta' => [600, 620]],
];
const RECORDS_MAXIMO = 120000;            // ms: más que esto no es una vuelta
const RECORDS_PASO = 1 / 30;              // s entre muestras (PASO_FANTASMA)
const RECORDS_SALTO = 600;                // décimas de px entre muestras, como mucho (la mano incluida)
const RECORDS_DESDE_META = 500;           // décimas de px de la primera muestra a la meta, como mucho
const RECORDS_ANCHO = 12800, RECORDS_ALTO = 7200;   // la mesa, en décimas de px

/** null si vale; si no, por qué. `$fantasma` es el texto de `codificar`. */
function records_validar($circuito, $vuelta, $carril, $fantasma) {
  if (!is_string($circuito) || !isset(RECORDS_CIRCUITOS[$circuito])) return 'circuito';
  if (!is_int($vuelta) || $vuelta < RECORDS_CIRCUITOS[$circuito]['minimo'] || $vuelta > RECORDS_MAXIMO) return 'vuelta';
  if (!in_array($carril, [0, 1], true)) return 'carril';
  if (!is_string($fantasma) || strlen($fantasma) > 40000) return 'fantasma';
  $datos = json_decode($fantasma, true);
  if (!is_array($datos) || ($datos['v'] ?? null) !== 1) return 'fantasma';
  if (!is_numeric($datos['paso'] ?? null) || abs($datos['paso'] - RECORDS_PASO) > 1e-9) return 'fantasma';
  if (!is_numeric($datos['tiempo'] ?? null) || abs(round($datos['tiempo'] * 1000) - $vuelta) > 1) return 'tiempo';
  $d = $datos['d'] ?? null;
  if (!is_array($d) || count($d) % 3 !== 0) return 'fantasma';
  // Una muestra cada paso, más la del cierre.
  $muestras = intdiv(count($d), 3);
  $esperadas = (int) floor($datos['tiempo'] / RECORDS_PASO) + 2;
  if (abs($muestras - $esperadas) > 2) return 'muestras';
  for ($i = 0; $i < count($d); $i += 3) {
    [$x, $y, $a] = [$d[$i], $d[$i + 1], $d[$i + 2]];
    if (!is_int($x) || !is_int($y) || !is_int($a)) return 'fantasma';
    if ($x < 0 || $x > RECORDS_ANCHO || $y < 0 || $y > RECORDS_ALTO) return 'mesa';
    if ($i > 0 && hypot($x - $d[$i - 3], $y - $d[$i - 2]) > RECORDS_SALTO) return 'salto';
  }
  [$mx, $my] = RECORDS_CIRCUITOS[$circuito]['meta'];
  if (hypot($d[0] - $mx * 10, $d[1] - $my * 10) > RECORDS_DESDE_META) return 'meta';
  return null;
}
