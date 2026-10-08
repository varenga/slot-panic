<?php
/*
 * Slot Panic — los circuitos públicos.
 *
 *   GET  ?orden=nuevos|jugados&pagina=0     la galería: los visibles, de POR_PAGINA en POR_PAGINA
 *   POST { accion: 'publicar', codigo, alias, adjetivo, sustantivo, llave }
 *   POST { accion: 'borrar', id, llave }    solo con la llave con que se publicó
 *   POST { accion: 'denunciar', id }        una por huella; con DENUNCIAS se oculta
 *   POST { accion: 'jugado', id }           una por huella y día
 *
 * El juego nunca espera a este fichero: sin red se construye y se corre igual.
 * Es el api.php de Race Panic (PDO, errores en JSON, credenciales en
 * config.php, fuera de git) con la cuadrícula validada en PHP
 * (servidor/cuadricula.php, que el arnés compara con la del juego).
 *
 * Sin datos personales: el alias son 3 letras, de la llave solo se guarda el
 * hash y la IP solo como huella (un HMAC con la sal de config.php).
 */

const POR_PAGINA      = 12;
const DENUNCIAS       = 3;      // con estas se oculta hasta revisarlo (a mano: oculto = 0)
const PUBLICAR_AL_DIA = 5;      // por huella, en las últimas 24 h
// El nombre: un índice de cada lista de i18n.js (nombre.a.* y nombre.s.*). El arnés lo comprueba.
const ADJETIVOS       = 16;
const SUSTANTIVOS     = 16;
// Quién puede llamar desde otro origen: la app (Capacitor en Android e iOS)
const ORIGENES = ['https://slot.pnyk.es', 'https://localhost', 'capacitor://localhost',
  'http://127.0.0.1:8124'];   // y las pruebas en local (?api=): la galería es pública, y borrar pide la llave

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// El detalle nunca se envía al cliente: va al log de errores de PHP.
function fail($status, $msg, $detail = null) {
  if ($detail !== null) error_log("[slotpanic/api] $msg: $detail");
  http_response_code($status);
  echo json_encode(['error' => $msg]);
  exit;
}

set_exception_handler(function ($e) {
  fail(500, 'Error interno', get_class($e) . ' ' . $e->getMessage());
});

/*
 * config.php se sube a mano (no está en git): si falta o le falta algo, se dice
 * qué (nunca su contenido) en vez de un 500 vacío.
 */
if (!is_file(__DIR__ . '/config.php')) fail(500, 'Falta config.php junto a api.php');
require __DIR__ . '/config.php';
foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'SAL_HUELLA'] as $constante) {
  if (!defined($constante)) fail(500, "Falta $constante en config.php");
}
require __DIR__ . '/servidor/cuadricula.php';

$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origen, ORIGENES, true)) {
  header('Access-Control-Allow-Origin: ' . $origen);
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Max-Age: 86400');
  header('Vary: Origin');
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function db() {
  try {
    return new PDO(
      'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
      DB_USER,
      DB_PASS,
      [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
      ]
    );
  } catch (PDOException $e) {
    fail(500, 'No se pudo conectar con la base de datos', $e->getMessage());
  }
}

/** La IP, irreconocible: solo sirve para comparar con otra. */
function huella() {
  return hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '', SAL_HUELLA);
}

function id_de($body) {
  $id = $body['id'] ?? null;
  if (!is_int($id) || $id < 1) fail(400, 'Circuito inválido');
  return $id;
}

function entero($valor, $tope) {
  if (!is_int($valor) || $valor < 0 || $valor >= $tope) fail(400, 'Nombre inválido');
  return $valor;
}

// --- La galería ---------------------------------------------------------------

if ($method === 'GET') {
  $orden = ($_GET['orden'] ?? 'nuevos') === 'jugados' ? 'jugado DESC, fecha DESC' : 'fecha DESC';
  $pagina = max(0, min(1000, (int) ($_GET['pagina'] ?? 0)));
  // LIMIT y OFFSET se acotan y se interpolan: sin emulación no admiten parámetros.
  $limite = POR_PAGINA + 1;
  $desde = $pagina * POR_PAGINA;
  try {
    $filas = db()->query(
      'SELECT id, codigo, alias, adjetivo, sustantivo, jugado, fecha FROM circuitos' .
      " WHERE oculto = 0 ORDER BY $orden, id DESC LIMIT $limite OFFSET $desde"
    )->fetchAll();
  } catch (PDOException $e) {
    fail(500, 'Error al leer los circuitos', $e->getMessage());
  }
  $mas = count($filas) > POR_PAGINA;
  $circuitos = array_map(function ($f) {
    return [
      'id' => (int) $f['id'], 'codigo' => $f['codigo'], 'alias' => $f['alias'],
      'adjetivo' => (int) $f['adjetivo'], 'sustantivo' => (int) $f['sustantivo'],
      'jugado' => (int) $f['jugado'], 'fecha' => $f['fecha'],
    ];
  }, array_slice($filas, 0, POR_PAGINA));
  echo json_encode(['circuitos' => $circuitos, 'mas' => $mas]);
  exit;
}

if ($method !== 'POST') fail(405, 'Método no permitido');

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) fail(400, 'Cuerpo JSON inválido');
$accion = $body['accion'] ?? '';

// --- Publicar -------------------------------------------------------------------

if ($accion === 'publicar') {
  $codigo = $body['codigo'] ?? null;
  $trazado = is_string($codigo) && strlen($codigo) <= 200 ? cuadricula_de_codigo($codigo) : null;
  if ($trazado === null || cuadricula_validar($trazado) !== null) fail(400, 'Circuito inválido');
  // Solo el código canónico: otro que diera el mismo trazado lo publicaría dos veces.
  if (cuadricula_a_codigo($trazado) !== $codigo) fail(400, 'Circuito inválido');

  $alias = $body['alias'] ?? '';
  if (!is_string($alias) || !preg_match('/^[A-Z0-9]{1,3}$/', $alias)) fail(400, 'Alias inválido');
  $adjetivo = entero($body['adjetivo'] ?? null, ADJETIVOS);
  $sustantivo = entero($body['sustantivo'] ?? null, SUSTANTIVOS);
  $llave = $body['llave'] ?? '';
  if (!is_string($llave) || !preg_match('/^[0-9a-f]{32}$/', $llave)) fail(400, 'Llave inválida');

  $pdo = db();
  $huella = huella();
  try {
    $ya = $pdo->prepare('SELECT id, oculto FROM circuitos WHERE codigo = ?');
    $ya->execute([$codigo]);
    $existente = $ya->fetch();
    if ($existente) {
      if ((int) $existente['oculto']) fail(409, 'Retirado');
      // El mismo circuito ya está publicado (quizá por otro): es ese.
      echo json_encode(['id' => (int) $existente['id'], 'nuevo' => false]);
      exit;
    }
    $hoy = $pdo->prepare('SELECT COUNT(*) FROM circuitos WHERE huella = ? AND fecha > NOW() - INTERVAL 1 DAY');
    $hoy->execute([$huella]);
    if ((int) $hoy->fetchColumn() >= PUBLICAR_AL_DIA) fail(429, 'Límite diario');

    $pdo->prepare('INSERT INTO circuitos (codigo, alias, adjetivo, sustantivo, llave, huella) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$codigo, $alias, $adjetivo, $sustantivo, hash('sha256', $llave), $huella]);
    echo json_encode(['id' => (int) $pdo->lastInsertId(), 'nuevo' => true]);
  } catch (PDOException $e) {
    // Dos que publican el mismo a la vez: el segundo choca con la clave única.
    if ($e->getCode() === '23000') fail(409, 'Ya publicado');
    fail(500, 'Error al publicar', $e->getMessage());
  }
  exit;
}

// --- Borrar, denunciar y jugado --------------------------------------------------

if ($accion === 'borrar') {
  $id = id_de($body);
  $llave = $body['llave'] ?? '';
  if (!is_string($llave) || !preg_match('/^[0-9a-f]{32}$/', $llave)) fail(400, 'Llave inválida');
  try {
    $borrar = db()->prepare('DELETE FROM circuitos WHERE id = ? AND llave = ?');
    $borrar->execute([$id, hash('sha256', $llave)]);
    if ($borrar->rowCount() === 0) fail(403, 'No es tuyo');
    echo json_encode(['ok' => true]);
  } catch (PDOException $e) {
    fail(500, 'Error al borrar', $e->getMessage());
  }
  exit;
}

if ($accion === 'denunciar') {
  $id = id_de($body);
  try {
    $pdo = db();
    $nueva = $pdo->prepare('INSERT IGNORE INTO denuncias (circuito, huella) SELECT id, ? FROM circuitos WHERE id = ?');
    $nueva->execute([huella(), $id]);
    if ($nueva->rowCount() > 0) {
      // En dos: en un mismo UPDATE, MySQL ya vería la denuncia sumada al calcular «oculto».
      $pdo->prepare('UPDATE circuitos SET denuncias = denuncias + 1 WHERE id = ?')->execute([$id]);
      $pdo->prepare('UPDATE circuitos SET oculto = 1 WHERE id = ? AND denuncias >= ?')->execute([$id, DENUNCIAS]);
    }
    echo json_encode(['ok' => true]);
  } catch (PDOException $e) {
    fail(500, 'Error al denunciar', $e->getMessage());
  }
  exit;
}

if ($accion === 'jugado') {
  $id = id_de($body);
  try {
    $pdo = db();
    $nueva = $pdo->prepare('INSERT IGNORE INTO jugadas (circuito, huella, dia) SELECT id, ?, CURDATE() FROM circuitos WHERE id = ?');
    $nueva->execute([huella(), $id]);
    if ($nueva->rowCount() > 0) $pdo->prepare('UPDATE circuitos SET jugado = jugado + 1 WHERE id = ?')->execute([$id]);
    echo json_encode(['ok' => true]);
  } catch (PDOException $e) {
    fail(500, 'Error al apuntar la jugada', $e->getMessage());
  }
  exit;
}

fail(400, 'Acción desconocida');
