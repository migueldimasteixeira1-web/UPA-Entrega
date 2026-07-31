#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:?Uso: ./deploy/restore-storage.sh <arquivo.tar.gz> (veja ./backups)}"
[[ -f "$FILE" ]] || { echo "Arquivo não encontrado: $FILE"; exit 1; }
FILE="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"

if ! docker compose ps minio 2>/dev/null | grep -q Up; then
  echo "O serviço 'minio' não está rodando (docker compose up)."
  exit 1
fi

echo "ATENÇÃO: isso substitui TODOS os arquivos atuais do storage (receitas, fotos) pelo conteúdo de:"
echo "  $FILE"
read -r -p "Digite 'restaurar' para confirmar: " confirm
[[ "$confirm" == "restaurar" ]] || { echo "Cancelado."; exit 1; }

MINIO_CONTAINER="$(docker compose ps -q minio)"
docker run --rm --volumes-from "$MINIO_CONTAINER" -v "$(dirname "$FILE")":/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$FILE") -C /"

echo "Restauração do storage concluída a partir de $FILE"
