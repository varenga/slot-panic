#!/bin/sh
# Copia la web a www/ para que Capacitor la empaquete (APP.md §4.1).
#
# Qué se copia lo decide PRECACHE en service-worker.js, y solo eso: lo que el
# service worker precarga para jugar sin red es exactamente lo que la app
# necesita llevar dentro. No hay una segunda lista que mantener, y lo que se
# olvide de precargar se echará en falta en los dos sitios.
set -eu

cd "$(dirname "$0")"
ROOT=..
WWW=www

FILES=$(sed -n '/^const PRECACHE = \[/,/^\];/p' "$ROOT/service-worker.js" | grep -o "'[^']*'" | tr -d "'")
[ -n "$FILES" ] || { echo "sync.sh: no encuentro PRECACHE en service-worker.js" >&2; exit 1; }

rm -rf "$WWW"
n=0
for f in $FILES; do
  [ -f "$ROOT/$f" ] || { echo "sync.sh: falta $f (está en PRECACHE)" >&2; exit 1; }
  mkdir -p "$WWW/$(dirname "$f")"
  cp "$ROOT/$f" "$WWW/$f"
  n=$((n + 1))
done
echo "sync.sh: $n ficheros en $WWW/"
