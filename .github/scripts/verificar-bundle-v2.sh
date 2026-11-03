#!/usr/bin/env bash
# AUD-07 — o build versionado da Carreira 2.0 (public/carreira/, copiado
# como está pelo Dockerfile) tem de ser exatamente o que a fonte
# (carreira-v2/) gera. Recompila e falha se qualquer arquivo da saída mudar,
# sumir ou aparecer (inclusive arquivo novo não versionado — um asset novo
# não escapa). Rodar da raiz do repositório, com as dependências de
# carreira-v2/ instaladas (npm ci).
set -euo pipefail
OUT=public/carreira
(cd carreira-v2 && npm run build --silent)
status="$(git status --porcelain --untracked-files=all -- "$OUT")"
if [ -n "$status" ]; then
  echo "::error::O build versionado em $OUT não corresponde à fonte em carreira-v2/."
  echo "Rode 'cd carreira-v2 && npm run build' e versione $OUT junto com a mudança da fonte."
  echo "Diferenças (M = alterado, D = removido, ?? = novo):"
  echo "$status"
  git --no-pager diff --stat -- "$OUT" || true
  exit 1
fi
echo "Build versionado em $OUT idêntico ao gerado pela fonte."
