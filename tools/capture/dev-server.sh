#!/usr/bin/env bash
# Servidor de desenvolvimento isolado pra capturas do redesign: cópia de
# server/ num diretório temporário (data/ vazio), public/ por symlink.
# Uso: tools/capture/dev-server.sh [porta]   (padrão 8791)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${1:-8791}"
ROOT="$(mktemp -d /tmp/brdata-dev-XXXX)"
mkdir -p "$ROOT/server/data"
cp "$REPO/server/server.js" "$REPO/server/package.json" "$ROOT/server/"
cp -r "$REPO/server/src" "$ROOT/server/src"
for d in node_modules frozen-catalog; do [ -e "$REPO/server/$d" ] && ln -s "$REPO/server/$d" "$ROOT/server/$d"; done
ln -s "$REPO/public" "$ROOT/public"
cd "$ROOT/server" && PORT="$PORT" exec node server.js
