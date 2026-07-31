#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
SERVICES_STARTED=0

cleanup() {
  local exit_code=$?
  if [[ "$SERVICES_STARTED" -eq 1 ]]; then
    echo
    echo "Encerrando UPA Entrega..."
  fi
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

fail() {
  echo
  echo "ERRO: $1"
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js não encontrado. Instale Node.js 20 LTS ou superior."
command -v npm >/dev/null 2>&1 || fail "npm não encontrado."
command -v docker >/dev/null 2>&1 || fail "Docker não encontrado (necessário para o PostgreSQL)."

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if (( NODE_MAJOR < 20 )); then
  fail "Node.js $(node -v) detectado. Este projeto requer Node.js 20 ou superior."
fi

echo "Ambiente: Node $(node -v), npm $(npm -v)"

echo "[1/5] Subindo PostgreSQL e MinIO (compose.dev)..."
docker compose -f "$ROOT_DIR/compose.dev.yaml" up -d db minio

echo "[2/5] Instalando dependências do backend..."
cd "$BACKEND_DIR"
if [[ ! -d node_modules ]]; then
  npm ci
else
  echo "node_modules do backend já presente."
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Criado backend/.env a partir de .env.example"
fi

echo "[3/5] Instalando dependências do frontend..."
cd "$FRONTEND_DIR"
if [[ ! -d node_modules ]]; then
  npm ci
else
  echo "node_modules do frontend já presente."
fi

echo "[4/5] Migrando e fazendo seed do banco..."
cd "$BACKEND_DIR"
npx prisma generate
npx prisma migrate deploy
SEED_DEMO_DATA=true node prisma/seed.js

echo "[5/5] Iniciando API e frontend..."
(cd "$BACKEND_DIR" && npm run dev) &
BACKEND_PID=$!
(cd "$FRONTEND_DIR" && VITE_PROXY_TARGET="${VITE_PROXY_TARGET:-http://127.0.0.1:3001}" npm run dev) &
FRONTEND_PID=$!
SERVICES_STARTED=1

sleep 3
echo
echo "Frontend: http://localhost:5173"
echo "API:      http://localhost:3001/api/health"
echo "Use Ctrl+C para encerrar."
wait
