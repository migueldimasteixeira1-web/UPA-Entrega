#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-upa}"
POSTGRES_DB="${POSTGRES_DB:-upa_entrega}"

if ! docker compose ps db 2>/dev/null | grep -q Up; then
  echo "O serviço 'db' não está rodando (docker compose up). Nada para fazer backup."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/upa_entrega-$TIMESTAMP.sql.gz"
TMP_FILE="$FILE.tmp"

# --clean --if-exists: o dump inclui DROP antes de cada CREATE, então o
# mesmo arquivo restaura tanto num banco vazio (disaster recovery) quanto por
# cima de um banco já existente, sem erro de "already exists".
# Grava num .tmp e só renomeia no final: um pg_dump interrompido no meio
# nunca deixa um arquivo corrompido com o nome "definitivo" pra trás.
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$TMP_FILE"
mv "$TMP_FILE" "$FILE"

echo "Backup salvo em $FILE ($(du -h "$FILE" | cut -f1))"

# Rotação: mantém só os últimos RETENTION_DAYS dias.
find "$BACKUP_DIR" -maxdepth 1 -name 'upa_entrega-*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete
