-- Slot Panic — los circuitos públicos (api.php). MySQL 5.7 / MariaDB 10.3 o más.
--
-- Nada de esto identifica a nadie: el alias son 3 letras que se eligen, la
-- llave es un número al azar que guarda el dispositivo (aquí, solo su hash) y la
-- huella es un HMAC de la IP con una sal que vive en config.php (la IP en claro
-- nunca se guarda). La huella sirve para el límite diario, para que cada uno
-- denuncie una vez y para contar una jugada por persona y día.

-- Un circuito publicado. El código es el de la cuadrícula (?c=), canónico: el
-- mismo trazado da siempre el mismo, así que no puede publicarse dos veces.
CREATE TABLE IF NOT EXISTS circuitos (
  id          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(200)      NOT NULL,
  alias       VARCHAR(3)        NOT NULL,
  adjetivo    TINYINT UNSIGNED  NOT NULL,   -- el nombre: dos índices de las listas de i18n.js
  sustantivo  TINYINT UNSIGNED  NOT NULL,
  llave       CHAR(64)          NOT NULL,   -- SHA-256 de la llave del dispositivo
  huella      CHAR(64)          NOT NULL,   -- HMAC de la IP de quien lo publicó
  jugado      INT UNSIGNED      NOT NULL DEFAULT 0,
  denuncias   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  oculto      TINYINT(1)        NOT NULL DEFAULT 0,   -- con 3 denuncias; se revisa a mano
  fecha       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY codigo (codigo),
  KEY nuevos (oculto, fecha),
  KEY jugados (oculto, jugado),
  KEY publicados (huella, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Una denuncia por huella y circuito.
CREATE TABLE IF NOT EXISTS denuncias (
  circuito  INT UNSIGNED NOT NULL,
  huella    CHAR(64)     NOT NULL,
  fecha     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (circuito, huella),
  CONSTRAINT denuncias_circuito FOREIGN KEY (circuito) REFERENCES circuitos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Una jugada por huella, circuito y día: lo que ordena «más jugados».
CREATE TABLE IF NOT EXISTS jugadas (
  circuito  INT UNSIGNED NOT NULL,
  huella    CHAR(64)     NOT NULL,
  dia       DATE         NOT NULL,
  PRIMARY KEY (circuito, huella, dia),
  CONSTRAINT jugadas_circuito FOREIGN KEY (circuito) REFERENCES circuitos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Los récords de vuelta de los circuitos oficiales (servidor/records.php): una
-- fila por marca enviada. La tabla que se ve son las 10 mejores de cada
-- circuito (a igualdad, la más antigua); se guardan las 50 mejores. El
-- fantasma es la vuelta entera (nucleo/fantasma.js, `codificar`, ~5 KB): el
-- del primero se descarga para correr contra él.
CREATE TABLE IF NOT EXISTS records (
  id         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  circuito   VARCHAR(16)       NOT NULL,
  alias      VARCHAR(3)        NOT NULL,
  vuelta     INT UNSIGNED      NOT NULL,   -- ms
  carril     TINYINT UNSIGNED  NOT NULL,   -- 0 o 1 (CARRILES)
  fantasma   MEDIUMTEXT        NOT NULL,
  huella     CHAR(64)          NOT NULL,   -- HMAC de la IP: el límite diario
  fecha      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY tabla (circuito, vuelta, fecha),
  KEY enviados (huella, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
