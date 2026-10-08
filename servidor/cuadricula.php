<?php
/*
 * Slot Panic — la cuadrícula del constructor, en PHP.
 *
 * Es `nucleo/cuadricula.js` (deCodigo, aCodigo, validarTrazado) portado línea
 * a línea, con enteros: el servidor no publica un circuito que el juego no
 * podría correr. La geometría no se repite aquí: la garantiza el arnés, que
 * corre todo lo que esta validación deja pasar. El arnés también compara las
 * dos validaciones con cientos de códigos (tools/validar-cuadricula.php).
 *
 * Solo define funciones: incluido no imprime nada, y servidor/ no se sirve.
 */

const CUADRICULA_COLUMNAS = 11;
const CUADRICULA_FILAS = 6;
const CUADRICULA_VERSION = 1;
const CUADRICULA_MAXIMO_PASOS = 2 * CUADRICULA_COLUMNAS * CUADRICULA_FILAS;
const CUADRICULA_ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Las mismas listas, en el mismo orden: el código guarda el número de la variante.
const CUADRICULA_VARIANTES = [
  'recta' => ['', 'baches', 'x', 'chicaneIzquierda', 'chicaneDerecha', 'estrecha', 'estrechaLarga'],
  'curva' => ['', 'peralte', 'derrape', 'amplia', 'deslizante'],
];
const CUADRICULA_LADO_CHICANE = ['chicaneIzquierda' => -1, 'chicaneDerecha' => 1];
const CUADRICULA_BLOQUE = ['amplia', 'deslizante'];
const CUADRICULA_DX = [1, 0, -1, 0];
const CUADRICULA_DY = [0, 1, 0, -1];

function cuadricula_girar($rumbo, $giro) { return ($rumbo + $giro + 4) % 4; }
function cuadricula_clave($col, $fila) { return $fila * CUADRICULA_COLUMNAS + $col; }
function cuadricula_dentro($col, $fila) {
  return $col >= 0 && $col < CUADRICULA_COLUMNAS && $fila >= 0 && $fila < CUADRICULA_FILAS;
}
function cuadricula_tipo($giro) { return $giro ? 'curva' : 'recta'; }

/** Del código al trazado; null si no es un código de circuito. No lo valida. */
function cuadricula_de_codigo($codigo) {
  if (!is_string($codigo) || !preg_match('/^[A-Za-z0-9_-]+$/', $codigo) || strlen($codigo) % 4 === 1) return null;
  $bytes = [];
  $acumulado = 0;
  $bits = 0;
  foreach (str_split($codigo) as $letra) {
    $acumulado = (($acumulado << 6) | strpos(CUADRICULA_ALFABETO, $letra)) & 0xffff;
    $bits += 6;
    if ($bits >= 8) {
      $bits -= 8;
      $bytes[] = ($acumulado >> $bits) & 255;
    }
  }
  if (count($bytes) < 5 || $bytes[0] !== CUADRICULA_VERSION) return null;
  $pasos = [];
  foreach (array_slice($bytes, 4) as $byte) {
    $giro = [0, 1, -1, null][$byte & 3];
    if ($giro === null) return null;
    $lista = CUADRICULA_VARIANTES[cuadricula_tipo($giro)];
    $indice = $byte >> 2;
    if ($indice >= count($lista)) return null;
    $pasos[] = ['giro' => $giro, 'variante' => $lista[$indice]];
  }
  return ['col' => $bytes[1], 'fila' => $bytes[2], 'rumbo' => $bytes[3], 'pasos' => $pasos];
}

/** Del trazado al código: el mismo trazado da siempre el mismo. */
function cuadricula_a_codigo($trazado) {
  $bytes = [CUADRICULA_VERSION, $trazado['col'], $trazado['fila'], $trazado['rumbo']];
  foreach ($trazado['pasos'] as $paso) {
    $bits = [0 => 0, 1 => 1, -1 => 2][$paso['giro']];
    $variante = array_search($paso['variante'], CUADRICULA_VARIANTES[cuadricula_tipo($paso['giro'])], true);
    $bytes[] = $bits | ($variante << 2);
  }
  $codigo = '';
  $total = count($bytes);
  for ($i = 0; $i < $total; $i += 3) {
    $a = $bytes[$i];
    $b = $bytes[$i + 1] ?? 0;
    $c = $bytes[$i + 2] ?? 0;
    $n = ($a << 16) | ($b << 8) | $c;
    $letras = min(4, (int) ceil(($total - $i) * 4 / 3));
    for ($k = 0; $k < $letras; $k++) $codigo .= CUADRICULA_ALFABETO[($n >> (18 - 6 * $k)) & 63];
  }
  return $codigo;
}

/** Una entrada por paso: su casilla, el rumbo con que entra y con el que sale. */
function cuadricula_recorrer($trazado) {
  $col = $trazado['col'];
  $fila = $trazado['fila'];
  $rumbo = $trazado['rumbo'];
  $casillas = [];
  foreach ($trazado['pasos'] as $indice => $paso) {
    $entra = $rumbo;
    $rumbo = cuadricula_girar($rumbo, $paso['giro']);
    $casillas[] = [
      'indice' => $indice, 'col' => $col, 'fila' => $fila, 'entra' => $entra, 'sale' => $rumbo,
      'giro' => $paso['giro'], 'variante' => $paso['variante'],
    ];
    $col += CUADRICULA_DX[$rumbo];
    $fila += CUADRICULA_DY[$rumbo];
  }
  return [$casillas, ['col' => $col, 'fila' => $fila, 'rumbo' => $rumbo]];
}

/*
 * ¿Se puede correr? null si sí; si no, ['motivo' => …, 'paso' => …]. Los
 * motivos y el orden en que se comprueban son los de `validarTrazado`.
 */
function cuadricula_validar($trazado) {
  $pasos = $trazado['pasos'];
  $n = count($pasos);
  if ($n < 1 || $n > CUADRICULA_MAXIMO_PASOS) return ['motivo' => 'vacio', 'paso' => 0];
  if (!cuadricula_dentro($trazado['col'], $trazado['fila']) || !in_array($trazado['rumbo'], [0, 1, 2, 3], true)) {
    return ['motivo' => 'fuera', 'paso' => 0];
  }
  foreach ($pasos as $i => $paso) {
    if (!in_array($paso['giro'], [-1, 0, 1], true) || !in_array($paso['variante'], CUADRICULA_VARIANTES[cuadricula_tipo($paso['giro'])], true)) {
      return ['motivo' => 'variante', 'paso' => $i];
    }
  }
  if ($pasos[0]['giro'] !== 0 || $pasos[0]['variante'] !== '') return ['motivo' => 'meta', 'paso' => 0];

  [$casillas, $final] = cuadricula_recorrer($trazado);
  foreach ($casillas as $c) {
    if (!cuadricula_dentro($c['col'], $c['fila'])) return ['motivo' => 'fuera', 'paso' => $c['indice']];
  }
  if ($final['col'] !== $trazado['col'] || $final['fila'] !== $trazado['fila'] || $final['rumbo'] !== $trazado['rumbo']) {
    return ['motivo' => 'abierto', 'paso' => $n - 1];
  }

  // Quién pasa por cada casilla, en el orden en que se ven por primera vez (como el Map de JS).
  $visitas = [];
  foreach ($casillas as $c) $visitas[cuadricula_clave($c['col'], $c['fila'])][] = $c;
  foreach ($visitas as $lista) {
    if (count($lista) === 1) continue;
    [$a, $b] = $lista;
    if (count($lista) > 2 || $a['giro'] || $b['giro'] || ($a['entra'] - $b['entra']) % 2 === 0) return ['motivo' => 'pisa', 'paso' => $b['indice']];
    if ($a['variante'] !== '' || $b['variante'] !== '' || $a['indice'] === 0) return ['motivo' => 'cruce', 'paso' => $b['indice']];
  }
  $libre = function ($col, $fila) use ($visitas) {
    return cuadricula_dentro($col, $fila) && !isset($visitas[cuadricula_clave($col, $fila)]);
  };
  $rectaSola = function ($c) use ($visitas) {
    return $c !== null && $c['indice'] > 0 && !$c['giro'] && $c['variante'] === '' && count($visitas[cuadricula_clave($c['col'], $c['fila'])]) === 1;
  };
  $llevadas = [];
  $llevar = function ($c) use (&$llevadas, $rectaSola) {
    if (!$rectaSola($c) || isset($llevadas[$c['indice']])) return false;
    $llevadas[$c['indice']] = true;
    return true;
  };
  $casilla = function ($i) use ($casillas) { return $casillas[$i] ?? null; };

  $reservadas = [];
  foreach ($casillas as $c) {
    if (!in_array($c['variante'], CUADRICULA_BLOQUE, true)) continue;
    $antes = $casilla($c['indice'] - 1);
    $col = $antes ? $antes['col'] + CUADRICULA_DX[$c['sale']] : -1;
    $fila = $antes ? $antes['fila'] + CUADRICULA_DY[$c['sale']] : -1;
    if (!$llevar($antes) || !$llevar($casilla($c['indice'] + 1)) || !$libre($col, $fila) || isset($reservadas[cuadricula_clave($col, $fila)])) {
      return ['motivo' => $c['variante'], 'paso' => $c['indice']];
    }
    $reservadas[cuadricula_clave($col, $fila)] = true;
  }
  foreach ($casillas as $c) {
    if (!isset(CUADRICULA_LADO_CHICANE[$c['variante']])) continue;
    $lado = cuadricula_girar($c['entra'], CUADRICULA_LADO_CHICANE[$c['variante']]);
    $siguiente = $casilla($c['indice'] + 1);
    $ladoLibre = function ($k) use ($lado, $libre, $reservadas) {
      if ($k === null) return false;
      $col = $k['col'] + CUADRICULA_DX[$lado];
      $fila = $k['fila'] + CUADRICULA_DY[$lado];
      return $libre($col, $fila) && !isset($reservadas[cuadricula_clave($col, $fila)]);
    };
    if (count($visitas[cuadricula_clave($c['col'], $c['fila'])]) > 1 || !$llevar($siguiente) || !$ladoLibre($c) || !$ladoLibre($siguiente)) {
      return ['motivo' => 'chicane', 'paso' => $c['indice']];
    }
  }
  foreach ($casillas as $c) {
    if ($c['variante'] !== 'estrechaLarga') continue;
    if (count($visitas[cuadricula_clave($c['col'], $c['fila'])]) > 1 || !$llevar($casilla($c['indice'] + 1))) {
      return ['motivo' => 'estrecha', 'paso' => $c['indice']];
    }
  }
  return null;
}
