#!/usr/bin/env bash
# Instala Caddy e configura HTTPS para wmakeouthill.dev (executar na VM Oracle).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CADDYFILE_SRC="${SCRIPT_DIR}/Caddyfile"

if [[ ! -f "${CADDYFILE_SRC}" ]]; then
  echo "Caddyfile não encontrado em ${CADDYFILE_SRC}"
  exit 1
fi

if ! command -v caddy >/dev/null 2>&1; then
  echo "[setup-caddy] Instalando Caddy..."
  sudo apt-get update
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y caddy
fi

echo "[setup-caddy] Copiando Caddyfile..."
sudo cp "${CADDYFILE_SRC}" /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable caddy
sudo systemctl reload caddy || sudo systemctl restart caddy

echo "[setup-caddy] Caddy ativo. Teste: curl -I https://wmakeouthill.dev/api/health"
echo "[setup-caddy] Certifique-se de que o DNS aponta para este servidor antes do primeiro acesso HTTPS."
