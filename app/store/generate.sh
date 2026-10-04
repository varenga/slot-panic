#!/bin/sh
# Icono adaptativo y pantalla de arranque para el proyecto nativo (APP.md §4 y
# §6.1), generados desde favicon.svg, el mismo del que tools/gen-icons.mjs saca
# los PNG del manifest. Son la excepción a «sin imágenes rasterizadas»: las
# tiendas exigen PNG a sus medidas. Caen en android/app/src/main/res; aquí no
# se guarda ninguna copia del icono. El juego no tiene tema claro: las
# variantes «dark» llevan el mismo fondo. Calcado del de Orbit Panic.
set -eu

cd "$(dirname "$0")/.."
# Un temporal dentro del proyecto: la herramienta no entiende las rutas de
# /tmp de Git Bash en Windows.
TMP=store/.src
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP"

cp ../favicon.svg "$TMP/logo.svg"
npx capacitor-assets generate --android \
  --assetPath "$TMP" \
  --iconBackgroundColor '#1b1e26' --iconBackgroundColorDark '#1b1e26' \
  --splashBackgroundColor '#12141a' --splashBackgroundColorDark '#12141a'

# La imagen destacada de la ficha de Google Play (APP.md §6.4): 1024×500 desde
# store/feature.svg, con el sharp que trae @capacitor/assets. Cae en
# store/feature.png, que no se versiona: se regenera con esto.
node -e "require('sharp')('store/feature.svg').resize(1024, 500).png().toFile('store/feature.png')"
