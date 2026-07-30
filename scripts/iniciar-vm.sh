#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado."
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "Crie o arquivo .env a partir de .env.vm.example antes de iniciar."
  exit 1
fi
if grep -Eq 'troque-|gere-|IP-OU-DNS-DA-VM' .env; then
  echo "Substitua os valores de exemplo no arquivo .env."
  exit 1
fi

read_env() {
  sed -n "s/^$1=//p" .env | tail -1
}

JWT_SECRET="$(read_env JWT_SECRET)"
POSTGRES_PASSWORD="$(read_env POSTGRES_PASSWORD)"
PUBLIC_APP_URL="$(read_env PUBLIC_APP_URL)"

if (( ${#JWT_SECRET} < 32 )); then
  echo "JWT_SECRET deve ter pelo menos 32 caracteres."
  exit 1
fi
if (( ${#POSTGRES_PASSWORD} < 12 )); then
  echo "POSTGRES_PASSWORD deve ter pelo menos 12 caracteres."
  exit 1
fi
if [[ -z "$PUBLIC_APP_URL" ]]; then
  echo "PUBLIC_APP_URL é obrigatório."
  exit 1
fi

docker compose config --quiet
docker compose up -d --build

UPA_PORT="$(read_env UPA_PORT)"
UPA_PORT="${UPA_PORT:-80}"
HEALTH_URL="http://127.0.0.1:$UPA_PORT/api/health"

for _ in {1..60}; do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "UPA Entrega iniciado e saudável na porta $UPA_PORT."
    echo "Acesse: $PUBLIC_APP_URL"
    exit 0
  fi
  sleep 2
done

docker compose ps
echo "O serviço não respondeu ao health check em $HEALTH_URL."
exit 1
