# Migrar wmakeouthill.dev da Vercel para Oracle Cloud

Substitui o deploy pausado na Vercel por **front + API + SSR** na VM Oracle Always Free (`137.131.158.76`), com HTTPS via Caddy.

## Arquitetura

```text
wmakeouthill.dev (DNS A → 137.131.158.76)
        │
        ▼
   Caddy :443 (Let's Encrypt)
        │
        ▼
   Docker SSR (127.0.0.1:8080)
     ├── Spring Boot (edge, cache, /api/*)
     └── Node Angular SSR (:4000 interno)
```

## Pré-requisitos

1. `oracle-cloud/.env` preenchido (copie de `.env.example`)
2. `portfolio-wesley-479723-27fce2d0b7ef.json` na raiz do repo
3. Chave SSH: `C:\Users\wcaco\Downloads\ssh-key-2026-02-25.key`
4. Docker Desktop rodando localmente (para build da imagem)

## Passo a passo

### 1. DNS (no registrador do domínio)

| Tipo | Nome | Valor |
|------|------|-------|
| A | `@` | `137.131.158.76` |
| A | `www` | `137.131.158.76` |

Remova registros CNAME/A que apontam para a Vercel.

### 2. Oracle Console — Security List

Adicione **Ingress Rules** na VCN:

| Porta | Protocolo | Source | Descrição |
|-------|-----------|--------|-----------|
| 80 | TCP | 0.0.0.0/0 | HTTP / ACME |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

A porta **8080 não precisa** ficar pública — o container escuta só em `127.0.0.1`.

### 3. Deploy

```powershell
# Build + upload + start (demora ~10–20 min no primeiro build)
.\deploy-oracle-ssr.ps1

# Firewall iptables (80/443)
.\deploy-oracle-ssr.ps1 setup-firewall

# Caddy + certificado HTTPS
.\deploy-oracle-ssr.ps1 setup-caddy
```

### 4. Validar

```powershell
.\deploy-oracle-ssr.ps1 status
.\deploy-oracle-ssr.ps1 logs
```

No browser: `https://wmakeouthill.dev`

```bash
# Na VM
curl -s http://127.0.0.1:8080/api/health
curl -sI https://wmakeouthill.dev/
```

### 5. Desligar Vercel

Após confirmar que o site responde na Oracle, pause ou remova o projeto na Vercel.

## Comandos úteis

| Comando | Ação |
|---------|------|
| `.\deploy-oracle-ssr.ps1` | Build + deploy SSR |
| `.\deploy-oracle-ssr.ps1 setup-caddy` | Instala/atualiza Caddy |
| `.\deploy-oracle-ssr.ps1 setup-firewall` | iptables 80/443 |
| `.\deploy-oracle-ssr.ps1 logs` | Logs do container |
| `.\deploy-oracle-ssr.ps1 status` | RAM/CPU + health |

## Rollback

| Situação | Ação |
|----------|------|
| SSR com problema | `SSR_BYPASS=true` no `.env` e redeploy |
| Voltar só API | `.\deploy-oracle-cloud.ps1` (modo anterior) |
| Emergência | Reativar Vercel + reverter DNS |

## RAM (VM 1 GB)

O compose limita o container a **920 MB**. Se o container reiniciar por OOM:

- Reduza `SSR_WARMUP_ENABLED=false` temporariamente
- Ou use `SSR_ENABLED=false` (SPA estático, sem SSR Node)

## Arquivos relacionados

- [`deploy-oracle-ssr.ps1`](../deploy-oracle-ssr.ps1)
- [`Dockerfile.oracle-ssr`](../Dockerfile.oracle-ssr)
- [`oracle-cloud/docker-compose.ssr.yml`](docker-compose.ssr.yml)
- [`oracle-cloud/Caddyfile`](Caddyfile)
- [`oracle-cloud/README-SSR.md`](README-SSR.md)
