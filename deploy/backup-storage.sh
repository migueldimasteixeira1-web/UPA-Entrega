#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if ! docker compose ps minio 2>/dev/null | grep -q Up; then
  echo "O serviço 'minio' não está rodando (docker compose up). Nada para fazer backup."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/sedom-storage-$TIMESTAMP.tar.gz"
TMP_FILE="$FILE.tmp"

# --volumes-from reaproveita o mount do volume nomeado do container minio,
# sem precisar saber o nome real que o Compose gerou pra ele. Grava num
# .tmp e só renomeia no final, mesma lógica de backup-db.sh.
MINIO_CONTAINER="$(docker compose ps -q minio)"
docker run --rm --volumes-from "$MINIO_CONTAINER" -v "$BACKUP_DIR":/backup alpine \
  tar czf "/backup/$(basename "$TMP_FILE")" -C / data

mv "$TMP_FILE" "$FILE"

echo "Backup do storage salvo em $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -maxdepth 1 -name 'sedom-storage-*.tar.gz' -mtime "+$RETENTION_DAYS" -print -delete
