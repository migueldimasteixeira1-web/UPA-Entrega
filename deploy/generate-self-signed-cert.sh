#!/usr/bin/env bash
set -Eeuo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/certs"
CN="${1:-localhost}"

mkdir -p "$CERT_DIR"

if [[ -f "$CERT_DIR/fullchain.pem" && -f "$CERT_DIR/privkey.pem" ]]; then
  echo "Certificado já existe em $CERT_DIR — mantendo (apague os arquivos para gerar um novo)."
  exit 0
fi

command -v openssl >/dev/null 2>&1 || { echo "openssl não encontrado."; exit 1; }

openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=$CN" \
  -addext "subjectAltName=DNS:$CN,IP:127.0.0.1"

echo "Certificado autoassinado gerado para CN=$CN em $CERT_DIR"
echo "O navegador vai alertar que o certificado não é confiável — isso é esperado para um certificado autoassinado."
echo "Para um domínio público, substitua fullchain.pem/privkey.pem por certificados reais (ex.: Let's Encrypt) e reinicie o serviço gateway."
