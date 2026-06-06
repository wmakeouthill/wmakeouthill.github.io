# 🚀 Deploy no Oracle Cloud Infrastructure (OCI) - Migração do GCP Cloud Run

## 📋 Resumo da Migração

**De:** Google Cloud Run (serverless, com cold start)
**Para:** Oracle Cloud Infrastructure - VM Always Free Tier (always-on, sem cold start)

| Item | Cloud Run (atual) | Oracle Cloud (novo) |
|------|-------------------|---------------------|
| **Tipo** | Serverless (container) | VM Always Free (1GB RAM) |
| **Cold Start** | ❌ Sim (5-15s) | ✅ Não (always-on) |
| **IP** | URL dinâmica | IP fixo: `137.131.158.76` |
| **OS** | Container Alpine | Ubuntu 22.04 Minimal |
| **Segurança** | IAM/allow-unauthenticated | Header `X-API-Key` |
| **Deploy** | `docker push` + `gcloud run deploy` | SSH + `docker compose up` |
| **Secrets** | Google Secret Manager | Arquivo `.env` no servidor |
| **Custo** | Free tier limitado | Always Free (sem limite de req) |

---

## 🔐 Segurança: Header X-API-Key

### Como Funciona

O backend vai exigir um header `X-API-Key` em **todas as requisições** para `/api/**`. Sem esse header (ou com valor incorreto), o servidor retorna `401 Unauthorized`.

```
# Requisição SEM header → 401 Unauthorized
curl http://137.131.158.76:8080/api/projects

# Requisição COM header → 200 OK
curl -H "X-API-Key: SUA_CHAVE_AQUI" http://137.131.158.76:8080/api/projects
```

### Onde Fica o Token

O token é definido por **VOCÊ** no arquivo `.env` do servidor. Não existe um lugar "para pegar" — você mesmo **cria** o token.

**Recomendação:** Use um valor aleatório forte. Exemplo para gerar:
```powershell
# No PowerShell (Windows), gere um token seguro:
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])
```

```bash
# No Linux/Mac:
openssl rand -base64 32
```

O valor gerado (ex: `aB3dF7gH9jK1mN5pQ8rS2tU4vW6xY0z`) será:
1. Colocado no `.env` do servidor Oracle como `API_KEY=aB3dF7gH9jK1mN5pQ8rS2tU4vW6xY0z`
2. Configurado no frontend Vercel como variável de ambiente `NEXT_PUBLIC_API_KEY` (ou no environment config do Angular)
3. Enviado pelo frontend em toda requisição: `headers: { 'X-API-Key': 'aB3dF7gH9jK1mN5pQ8rS2tU4vW6xY0z' }`

### Fluxo de Segurança

```
Frontend (Vercel) ──→ HTTP Request com Header X-API-Key ──→ Backend (Oracle VM)
                                                             │
                                                             ├─ API Key válida? → 200 OK
                                                             └─ API Key inválida/ausente? → 401 Unauthorized
```

---

## 🏗️ Arquitetura no Oracle Cloud

```
┌──────────────────────────────────────────────────┐
│  Oracle Cloud VM (137.131.158.76)                │
│  Ubuntu 22.04 Minimal - 1GB RAM - Always Free    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Docker Container                        │    │
│  │  ┌──────────────────────────────────┐    │    │
│  │  │  Spring Boot (Java 17)           │    │    │
│  │  │  Porta: 8080                     │    │    │
│  │  │  - /api/chat                     │    │    │
│  │  │  - /api/projects                 │    │    │
│  │  │  - /api/contact                  │    │    │
│  │  │  - /api/certifications           │    │    │
│  │  │  - /api/portfolio                │    │    │
│  │  │  - /api/cache                    │    │    │
│  │  │                                  │    │    │
│  │  │  Filtro: ApiKeyFilter            │    │    │
│  │  │  Header: X-API-Key (obrigatório) │    │    │
│  │  └──────────────────────────────────┘    │    │
│  │  Secrets: via .env (volume mounted)      │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Firewall: iptables porta 8080 aberta            │
│  + Oracle Security List (ingress 8080)           │
└──────────────────────────────────────────────────┘
         │
         │  HTTP :8080 com X-API-Key
         │
┌────────┴────────┐
│  Frontend        │
│  (Vercel)        │
│  Angular App     │
└─────────────────┘
```

---

## 📝 Pré-requisitos

1. **Chave SSH**: `C:\Users\wcaco\Downloads\ssh-key-2026-02-25.key`
2. **Docker Desktop** instalado localmente (para build)
3. **Oracle Security List** configurada para permitir tráfego na porta 8080 (TCP ingress)

### ⚠️ Configurar Security List no Oracle Console

Antes de tudo, entre no Oracle Cloud Console e configure:

1. Acesse: **Networking → Virtual Cloud Networks → Sua VCN → Security Lists → Default Security List**
2. Adicione uma **Ingress Rule**:
   - **Source CIDR**: `0.0.0.0/0`
   - **Protocol**: TCP
   - **Destination Port**: `8080`
   - **Description**: "Backend Spring Boot"

---

## 🔧 Passo a Passo da Migração

### Fase 1: Preparar o Servidor Oracle (uma única vez)

#### 1.1 Conectar via SSH
```powershell
ssh -o StrictHostKeyChecking=accept-new -i "C:\Users\wcaco\Downloads\ssh-key-2026-02-25.key" ubuntu@137.131.158.76
```

#### 1.2 Instalar Docker + Docker Compose
```bash
# Atualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar Docker
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Adicionar usuário ao grupo docker (evita precisar de sudo)
sudo usermod -aG docker ubuntu
# IMPORTANTE: sai e entra de novo no SSH para o grupo ter efeito
exit
```

#### 1.3 Abrir Firewall do Ubuntu (iptables)
```bash
# Liberar porta 8080
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save
```

#### 1.4 Criar estrutura de diretórios
```bash
mkdir -p ~/portfolio-backend
```

### Fase 2: Implementar API Key Filter no Backend (código Java)

> **Já feito pelo script de deploy** — veja seção "Arquivos Criados/Modificados" abaixo.

O filtro `ApiKeyAuthFilter.java` será adicionado ao backend:
- Intercepta todas as requisições para `/api/**`
- Verifica o header `X-API-Key`
- Exceções: `/api/health` (para health check)
- Em desenvolvimento local (`localhost` / `127.0.0.1`), o filtro é desativado

### Fase 3: Deploy (usar script da raiz)

No PowerShell local:
```powershell
.\deploy-oracle-cloud.ps1
```

O script faz tudo automaticamente:
1. ✅ Build do JAR do backend (Maven)
2. ✅ Build da imagem Docker para ARM64/AMD64
3. ✅ Salva a imagem como `.tar.gz`
4. ✅ Transfere via SCP para o servidor Oracle
5. ✅ Upload dos arquivos de configuração (docker-compose.yml, .env)
6. ✅ SSH para o servidor e executa `docker compose up -d`
7. ✅ Verifica se o backend está rodando (health check)

---

## 📁 Arquivos de Configuração no Servidor

### `/home/ubuntu/portfolio-backend/.env`
```env
# ===================================
# Secrets - Portfolio Wesley Backend
# Oracle Cloud VM
# ===================================

# API Key para autenticação via header (VOCÊ define este valor)
API_KEY=GERE_UM_TOKEN_SEGURO_AQUI

# AI Providers
GEMINI_API_KEY=sua-chave-gemini
OPENAI_API_KEY=sua-chave-openai

# Email
GMAIL_USERNAME=seu-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_RECIPIENT=seu-email-destino@gmail.com

# GitHub
GITHUB_API_TOKEN=ghp_seutoken
GITHUB_USERNAME=wmakeouthill

# Spring
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=prod
LOG_LEVEL=INFO
FRONTEND_ENABLED=false
```

### `/home/ubuntu/portfolio-backend/docker-compose.yml`
```yaml
version: '3.8'
services:
  backend:
    image: portfolio-wesley-backend:latest
    container_name: portfolio-backend
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env
    environment:
      - JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=65.0 -XX:+UseSerialGC
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 800M
```

---

## 🧪 Testando

### Teste sem API Key (deve retornar 401):
```powershell
curl http://137.131.158.76:8080/api/projects
# Resposta esperada: 401 Unauthorized
```

### Teste com API Key (deve retornar 200):
```powershell
curl -H "X-API-Key: SUA_CHAVE_AQUI" http://137.131.158.76:8080/api/projects
# Resposta esperada: 200 OK + lista de projetos
```

### Health check (sem API Key necessária):
```powershell
curl http://137.131.158.76:8080/api/health
# Resposta esperada: 200 OK
```

---

## 🔄 Integração com Vercel (Frontend)

Depois que o backend estiver funcionando na Oracle:

1. No dashboard da Vercel, adicione as variáveis de ambiente:
   - `API_BASE_URL` = `http://137.131.158.76:8080`
   - `API_KEY` = `MESMO_VALOR_DO_ENV_DO_SERVIDOR`

2. No frontend Angular, configure o interceptor/service para enviar o header:
   ```typescript
   // Em todo HTTP request para o backend:
   headers.set('X-API-Key', environment.apiKey);
   ```

3. Atualize o `CorsConfig.java` para incluir o domínio Vercel:
   ```java
   .allowedOriginPatterns(
       "https://wmakeouthill.github.io",
       "https://*.vercel.app",
       "http://localhost:*",
       "http://127.0.0.1:*"
   )
   ```

---

## 📊 Comparativo de Scripts

| Ação | GCP (atual) | Oracle (novo) |
|------|-------------|---------------|
| **Deploy** | `.\deploy-cloud-run-backend-only.ps1 -ProjectId "..."` | `.\deploy-oracle-cloud.ps1` |
| **Ver logs** | `gcloud run services logs read ...` | `.\deploy-oracle-cloud.ps1 -Action logs` |
| **Parar** | N/A (serverless) | `.\deploy-oracle-cloud.ps1 -Action stop` |
| **Reiniciar** | N/A (auto) | `.\deploy-oracle-cloud.ps1 -Action restart` |
| **Status** | `gcloud run services describe ...` | `.\deploy-oracle-cloud.ps1 -Action status` |

---

## ⚠️ Notas Importantes

1. **1GB RAM**: A JVM está configurada com `MaxRAMPercentage=65.0` (~650MB para heap) e `UseSerialGC` (menor footprint de memória que G1GC). Se o app ficar lento, pode ser necessário reduzir.

2. **Sem HTTPS nativo**: A VM expõe HTTP na porta 8080. Para HTTPS:
   - Opção A: Usar Cloudflare como proxy (recomendado, grátis)
   - Opção B: Instalar nginx + certbot na VM

3. **Persistência**: Se o container parar, o `restart: unless-stopped` do docker-compose garante que ele reinicie automaticamente.

4. **Atualizações**: Basta rodar `.\deploy-oracle-cloud.ps1` novamente. O script faz build, transfere e reconstrói o container sem downtime (docker compose cria o novo antes de parar o antigo).
