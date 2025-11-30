# 🚀 Deploy no Google Cloud Run - Projeto Wesley Portfolio

Este documento explica como fazer o deploy do projeto no Google Cloud Run.

## 📋 Pré-requisitos

1. **Google Cloud SDK (gcloud CLI)** instalado
2. **Docker** instalado e rodando
3. **Conta Google Cloud** com projeto criado
4. **Autenticação** configurada: `gcloud auth login`
5. **Permissões necessárias** no projeto:
   - `roles/serviceusage.serviceUsageAdmin` (para habilitar APIs) OU
   - `roles/editor` (permissão mais ampla)
   - `roles/secretmanager.admin` (para criar/gerenciar secrets)
   - `roles/run.admin` (para fazer deploy no Cloud Run)
   - `roles/storage.admin` (para fazer push de imagens Docker)

## 🔐 Secrets do Secret Manager

O projeto precisa dos seguintes secrets configurados no Google Cloud Secret Manager:

### 1. `openai-api-key`

**Descrição:** Chave da API da OpenAI para o chat do portfólio  
**Tipo:** String  
**Valor:** Sua chave da OpenAI (formato: `sk-...`)  
**Onde obter:** <https://platform.openai.com/api-keys>

**Comando para criar:**

```bash
echo -n 'sk-sua-chave-aqui' | gcloud secrets create openai-api-key --data-file=- --project=portfolio-wesley-479723
```

### 2. `gmail-username`

**Descrição:** Email Gmail usado para enviar emails do formulário de contato  
**Tipo:** String  
**Valor:** Seu email Gmail completo (ex: `seu-email@gmail.com`)

**Comando para criar:**

```bash
echo -n 'seu-email@gmail.com' | gcloud secrets create gmail-username --data-file=- --project=portfolio-wesley-479723
```

### 3. `gmail-app-password`

**Descrição:** Senha de aplicativo do Gmail (NUNCA use sua senha pessoal!)  
**Tipo:** String  
**Valor:** Senha de app gerada no Google (formato: `xxxx xxxx xxxx xxxx`)  
**Onde obter:** <https://myaccount.google.com/apppasswords>

**⚠️ IMPORTANTE:**

- Use sempre **senha de aplicativo**, nunca sua senha pessoal
- Para criar: Google Account > Segurança > Verificação em duas etapas > Senhas de app

**Comando para criar:**

```bash
echo -n 'xxxx xxxx xxxx xxxx' | gcloud secrets create gmail-app-password --data-file=- --project=portfolio-wesley-479723
```

### 4. `email-recipient`

**Descrição:** Email que receberá as mensagens enviadas pelo formulário de contato  
**Tipo:** String  
**Valor:** Email de destino (pode ser o mesmo do `gmail-username`)

**Comando para criar:**

```bash
echo -n 'seu-email@gmail.com' | gcloud secrets create email-recipient --data-file=- --project=portfolio-wesley-479723
```

### 5. `github-api-token`

**Descrição:** Personal Access Token (PAT) do GitHub para buscar informações dos repositórios  
**Tipo:** String  
**Valor:** Token do GitHub (formato: `ghp_...`)  
**Onde obter:** <https://github.com/settings/tokens>

**⚠️ IMPORTANTE:**

- Use token com permissão **somente leitura** (read-only)
- Não precisa de permissões de escrita ou admin
- Scopes recomendados: `public_repo` (se repositórios públicos) ou `repo` (se privados)

**Comando para criar:**

```bash
echo -n 'ghp_seu-token-aqui' | gcloud secrets create github-api-token --data-file=- --project=portfolio-wesley-479723
```

## 📝 Resumo dos Secrets

| Nome do Secret | Variável de Ambiente | Obrigatório | Descrição |
|----------------|---------------------|-------------|-----------|
| `openai-api-key` | `OPENAI_API_KEY` | ✅ Sim | Chave da API OpenAI |
| `gmail-username` | `GMAIL_USERNAME` | ✅ Sim | Email Gmail para envio |
| `gmail-app-password` | `GMAIL_APP_PASSWORD` | ✅ Sim | Senha de app do Gmail |
| `email-recipient` | `EMAIL_RECIPIENT` | ✅ Sim | Email que recebe mensagens |
| `github-api-token` | `GITHUB_API_TOKEN` | ✅ Sim | Token do GitHub |

## 🔄 Atualizar um Secret Existente

Se você precisar atualizar o valor de um secret:

```bash
echo -n 'novo-valor' | gcloud secrets versions add NOME_DO_SECRET --data-file=- --project=portfolio-wesley-479723
```

**Exemplo:**

```bash
echo -n 'sk-nova-chave' | gcloud secrets versions add openai-api-key --data-file=- --project=portfolio-wesley-479723
```

## 📋 Listar Secrets

Para ver todos os secrets criados:

```bash
gcloud secrets list --project=portfolio-wesley-479723
```

## 🚀 Deploy

### Opção 1: Script Automático (Recomendado)

```powershell
.\deploy-completo-projeto-wesley.ps1 portfolio-wesley-479723 southamerica-east1
```

O script irá:

1. ✅ Verificar autenticação
2. ✅ Configurar projeto
3. ✅ Habilitar APIs necessárias
4. ✅ Fazer build da imagem Docker
5. ✅ Fazer push para Container Registry
6. ✅ Verificar se os secrets existem
7. ✅ Fazer deploy no Cloud Run

### Opção 2: Deploy Manual

Se preferir fazer o deploy manualmente:

```bash
# 1. Build da imagem
docker build -f Dockerfile.cloud-run.projeto-wesley -t gcr.io/portfolio-wesley-479723/projeto-wesley:latest .

# 2. Push da imagem
docker push gcr.io/portfolio-wesley-479723/projeto-wesley:latest

# 3. Deploy no Cloud Run
gcloud run deploy projeto-wesley \
  --image gcr.io/portfolio-wesley-479723/projeto-wesley:latest \
  --region southamerica-east1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --port 8080 \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest,GMAIL_USERNAME=gmail-username:latest,GMAIL_APP_PASSWORD=gmail-app-password:latest,EMAIL_RECIPIENT=email-recipient:latest,GITHUB_API_TOKEN=github-api-token:latest" \
  --set-env-vars="SERVER_PORT=8080,SPRING_PROFILES_ACTIVE=prod,LOG_LEVEL=INFO,GITHUB_USERNAME=wmakeouthill" \
  --project=portfolio-wesley-479723
```

## ⚙️ Configuração do Cloud Run

- **Memória:** 512Mi (otimizado para free tier)
- **CPU:** 1 (free tier)
- **Timeout:** 300 segundos (5 minutos)
- **Máximo de instâncias:** 10
- **Mínimo de instâncias:** 0 (scale to zero)
- **Porta:** 8080
- **Plataforma:** Managed

## 🔍 Verificar Deploy

Após o deploy, você pode verificar o status:

```bash
gcloud run services describe projeto-wesley --region southamerica-east1 --project=portfolio-wesley-479723
```

Para ver os logs:

```bash
gcloud run services logs read projeto-wesley --region southamerica-east1 --project=portfolio-wesley-479723
```

## 🌐 Acessar a Aplicação

Após o deploy bem-sucedido, você receberá uma URL do tipo:

```
https://projeto-wesley-xxxxx-xx.a.run.app
```

## 🐛 Troubleshooting

### Erro: "Secret not found"

- Verifique se todos os secrets foram criados
- Use `gcloud secrets list` para listar os secrets

### Erro: "Permission denied" ao habilitar APIs

**Sintoma:**

```
ERROR: (gcloud.services.enable) PERMISSION_DENIED: Permission denied to enable service [containerregistry.googleapis.com]
```

**Causa:** Sua conta não tem permissões suficientes para habilitar APIs no projeto.

**Soluções:**

1. **Habilitar APIs manualmente via Console Web:**
   - Acesse: <https://console.cloud.google.com/apis/library?project=portfolio-wesley-479723>
   - Procure e habilite:
     - Container Registry API (`containerregistry.googleapis.com`)
     - Cloud Run API (`run.googleapis.com`)
     - Secret Manager API (`secretmanager.googleapis.com`)

2. **Pedir permissão ao administrador do projeto:**
   - O administrador deve conceder a role `roles/serviceusage.serviceUsageAdmin` à sua conta
   - Ou a role `roles/editor` (mais ampla, mas funciona)

3. **Se você é o dono do projeto:**
   - Verifique se está usando o projeto correto: `gcloud config get-value project`
   - Se necessário, mude o projeto: `gcloud config set project portfolio-wesley-479723`

### Erro: "Permission denied" ao acessar secrets

- Verifique se o Cloud Run Service Account tem permissão para acessar os secrets
- Execute: `gcloud projects add-iam-policy-binding portfolio-wesley-479723 --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"`
- Para descobrir o PROJECT_NUMBER: `gcloud projects describe portfolio-wesley-479723 --format="value(projectNumber)"`

### Erro: "Build failed"

- Verifique se o Docker está rodando
- Verifique se há espaço em disco suficiente
- Verifique os logs do build

### Erro: "Out of memory"

- Aumente a memória no Cloud Run (mas isso pode sair do free tier)
- Verifique se há vazamentos de memória no código

## 📚 Referências

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Container Registry Documentation](https://cloud.google.com/container-registry/docs)
