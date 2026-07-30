#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:?Uso: ./deploy/restore-db.sh <arquivo.sql.gz> (veja ./backups)}"
[[ -f "$FILE" ]] || { echo "Arquivo não encontrado: $FILE"; exit 1; }

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-upa}"
POSTGRES_DB="${POSTGRES_DB:-upa_entrega}"

if ! docker compose ps db 2>/dev/null | grep -q Up; then
  echo "O serviço 'db' não está rodando (docker compose up)."
  exit 1
fi

echo "ATENÇÃO: isso substitui TODOS os dados atuais do banco '$POSTGRES_DB' pelo conteúdo de:"
echo "  $FILE"
read -r -p "Digite 'restaurar' para confirmar: " confirm
[[ "$confirm" == "restaurar" ]] || { echo "Cancelado."; exit 1; }

gunzip -c "$FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

echo "Restauração concluída a partir de $FILE"
