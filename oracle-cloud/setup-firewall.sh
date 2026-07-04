#!/usr/bin/env bash
# Abre 80/443 (Caddy) e restringe 8080 ao localhost na VM Oracle.
set -euo pipefail

echo "[firewall] Liberando portas 80 e 443 (HTTP/HTTPS) ANTES da regra REJECT..."
# Oracle Ubuntu image has REJECT at ~line 5; rules appended after it never match.
# Insert immediately before REJECT (position 5 in the default image layout).
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true

if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save
fi

echo "[firewall] Portas 80/443 liberadas no iptables."
echo "[firewall] IMPORTANTE: no Oracle Console, adicione Ingress Rules na Security List:"
echo "  - TCP 80  (0.0.0.0/0) — HTTP (redirect/Let's Encrypt)"
echo "  - TCP 443 (0.0.0.0/0) — HTTPS"
echo "[firewall] O Docker SSR escuta 8080 apenas em 127.0.0.1 — não exponha 8080 publicamente."
