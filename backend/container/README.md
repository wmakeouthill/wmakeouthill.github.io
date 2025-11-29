# Pasta `container` — configs locais

Este diretório contém arquivos de configuração destinados ao uso local e/ou para montar como ConfigMap em ambientes de containerização.

## Arquivos de Configuração

- **`configmap-local.properties`**: arquivo para configurações locais (pode conter valores não-sensíveis).
- **`configmap-secrets-local.properties`**: arquivo para **SECRETS** (credenciais, API keys, etc.). Este arquivo está no `.gitignore` e **NUNCA** deve ser commitado.

## Como usar (desenvolvimento):

### 1. Secrets (credenciais sensíveis)

Crie o arquivo `configmap-secrets-local.properties` (baseado no exemplo):

```properties
# OpenAI
OPENAI_API_KEY=sk-...sua-chave...
openai.api.key=sk-...sua-chave...

# GitHub API
GITHUB_API_TOKEN=ghp_...seu-token...

# Gmail SMTP (use App Password, nunca senha normal!)
GMAIL_USERNAME=seu-email@gmail.com
GMAIL_APP_PASSWORD=sua-app-password
EMAIL_RECIPIENT=seu-email@gmail.com
EMAIL_FROM=seu-email@gmail.com
```

### 2. Configurações locais (opcional)

Se precisar de outras configurações locais, use `configmap-local.properties`.

### 3. Iniciar o backend

O `pom.xml` está configurado para carregar automaticamente ambos os arquivos:

```bash
cd backend
mvn spring-boot:run
```

**Alternativas:**
- Exportar variáveis de ambiente antes de iniciar (ex: `export GMAIL_USERNAME=...`).
- Em k8s, monte os arquivos como ConfigMap e injete no pod.

## ⚠️ IMPORTANTE - Segurança

- **NUNCA** adicione secrets reais ao repositório.
- O arquivo `configmap-secrets-local.properties` está no `.gitignore` e não será commitado.
- Use sempre **App Passwords** para Gmail (não use senha normal).
- Em produção, use variáveis de ambiente ou sistemas de gerenciamento de secrets (ex: Kubernetes Secrets, AWS Secrets Manager).
