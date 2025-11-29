# Script PowerShell completo: Build + Push + Deploy para Cloud Run - Obaid Revival
# Uso: .\deploy-completo-obaid-revival.ps1 [PROJECT_ID] [REGION]
# Exemplo: .\deploy-completo-obaid-revival.ps1 obaid-revival southamerica-east1
#
# IMPORTANTE: Este script é adaptado para o projeto obaid-revival
# - Estrutura simplificada: backend único + frontend Angular
# - Apenas uma credencial: OPENAI_API_KEY (via Secret Manager)
# - Sem banco de dados (aplicação stateless)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Completo - Cloud Run" -ForegroundColor Cyan
Write-Host "  Obaid Revival Project" -ForegroundColor Cyan
Write-Host "  Build + Push + Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se gcloud esta instalado
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "ERRO: gcloud CLI nao esta instalado. Instale em: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}

# Verificar autenticacao
Write-Host "[1/6] Verificando autenticacao..." -ForegroundColor Green
try {
    $authOutput = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>&1
    $activeAccount = ($authOutput | Where-Object { $_ -notmatch 'ERROR|WARNING' } | Select-Object -First 1).ToString().Trim()
    
    if ([string]::IsNullOrWhiteSpace($activeAccount)) {
        Write-Host "ERRO: Voce nao esta autenticado." -ForegroundColor Red
        Write-Host "Execute: gcloud auth login" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "OK: Autenticado como: $activeAccount" -ForegroundColor Green
    }
} catch {
    Write-Host "ERRO: Nao foi possivel verificar autenticacao" -ForegroundColor Red
    exit 1
}

# Obter PROJECT_ID
if ($args.Count -eq 0) {
    Write-Host ""
    Write-Host "Projetos disponiveis:" -ForegroundColor Yellow
    gcloud projects list --format="table(projectId,name)" 2>&1 | Out-Host
    Write-Host ""
    $PROJECT_ID = Read-Host "Digite o PROJECT_ID"
} else {
    $PROJECT_ID = $args[0]
}

# Obter REGION
$REGION = if ($args.Count -gt 1) { $args[1] } else { "southamerica-east1" }

Write-Host ""
Write-Host "[2/6] Configurando projeto: $PROJECT_ID" -ForegroundColor Green
try {
    $currentProject = (gcloud config get-value project 2>&1).ToString().Trim()
    
    if ($currentProject -ne $PROJECT_ID) {
        Write-Host "   Mudando projeto de '$currentProject' para '$PROJECT_ID'" -ForegroundColor Yellow
        gcloud config set project $PROJECT_ID
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERRO: Nao foi possivel configurar projeto" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   OK: Projeto ja esta configurado" -ForegroundColor Green
    }
} catch {
    Write-Host "ERRO: Nao foi possivel configurar projeto" -ForegroundColor Red
    exit 1
}

# Habilitar APIs
Write-Host ""
Write-Host "[3/6] Habilitando APIs necessarias..." -ForegroundColor Green
gcloud services enable containerregistry.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Configurar Docker
Write-Host ""
Write-Host "[4/6] Configurando credenciais Docker..." -ForegroundColor Green
gcloud auth configure-docker gcr.io --quiet

# Build da imagem
Write-Host ""
Write-Host "[5/6] Fazendo build da imagem Docker..." -ForegroundColor Green
$IMAGE_NAME = "gcr.io/$PROJECT_ID/obaid-revival:latest"
$TIMESTAMP_TAG = "gcr.io/$PROJECT_ID/obaid-revival:$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "   Usando Dockerfile.cloud-run.obaid-revival" -ForegroundColor Yellow
Write-Host "   Isso pode levar varios minutos..." -ForegroundColor Yellow

docker build -f Dockerfile.cloud-run.obaid-revival -t $IMAGE_NAME -t $TIMESTAMP_TAG .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no build da imagem" -ForegroundColor Red
    exit 1
}

Write-Host "   OK: Build concluido" -ForegroundColor Green

# Push da imagem
Write-Host ""
Write-Host "[6/6] Fazendo push da imagem para Container Registry..." -ForegroundColor Green
Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Yellow

docker push $IMAGE_NAME
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no push da imagem $IMAGE_NAME" -ForegroundColor Red
    exit 1
}

docker push $TIMESTAMP_TAG
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no push da imagem $TIMESTAMP_TAG" -ForegroundColor Red
    exit 1
}

Write-Host "   OK: Push concluido" -ForegroundColor Green

# Informacoes finais
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Build e Push Concluidos!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Imagem: $IMAGE_NAME" -ForegroundColor Cyan
Write-Host "Tag com timestamp: $TIMESTAMP_TAG" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "  1. Verifique se o secret existe no Secret Manager:" -ForegroundColor Yellow
Write-Host "     - openai-api-key (ou OPENAI_API_KEY)" -ForegroundColor Yellow
Write-Host ""
Write-Host "     Se nao existir, crie com:" -ForegroundColor Yellow
Write-Host "     gcloud secrets create openai-api-key --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host "     echo -n 'sk-...' | gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Faca o deploy no Cloud Run:" -ForegroundColor Yellow
Write-Host "     - Via Console Web" -ForegroundColor Yellow
Write-Host "     - Ou configure o deploy automatico aqui no script" -ForegroundColor Yellow
Write-Host ""
Write-Host "Configuracao do Cloud Run:" -ForegroundColor Cyan
Write-Host "  - Project ID: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "  - Region: $REGION" -ForegroundColor Cyan
Write-Host "  - Service Name: obaid-revival" -ForegroundColor Cyan
Write-Host "  - Memory: 512Mi (otimizado para free tier)" -ForegroundColor Cyan
Write-Host "  - CPU: 1 (free tier)" -ForegroundColor Cyan
Write-Host "  - Aplicacao stateless (sem banco de dados)" -ForegroundColor Cyan
Write-Host ""

# Perguntar se deseja fazer deploy automatico
$deploy = Read-Host "Deseja fazer deploy automatico no Cloud Run agora? (S/N)"
if ($deploy -eq "S" -or $deploy -eq "s" -or $deploy -eq "Y" -or $deploy -eq "y") {
    Write-Host ""
    Write-Host "Fazendo deploy no Cloud Run..." -ForegroundColor Green
    
    # Verificar se o secret existe
    Write-Host "   Verificando secret 'openai-api-key'..." -ForegroundColor Yellow
    $secretCheck = gcloud secrets describe openai-api-key --project=$PROJECT_ID 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   AVISO: Secret 'openai-api-key' nao encontrado!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Opcoes:" -ForegroundColor Yellow
        Write-Host "   1. Criar o secret agora (sera solicitada a chave)" -ForegroundColor Cyan
        Write-Host "   2. Criar manualmente depois e executar o deploy novamente" -ForegroundColor Cyan
        Write-Host ""
        $createSecret = Read-Host "   Deseja criar o secret agora? (S/N)"
        
        if ($createSecret -eq "S" -or $createSecret -eq "s" -or $createSecret -eq "Y" -or $createSecret -eq "y") {
            Write-Host ""
            Write-Host "   Por favor, insira a chave da API OpenAI:" -ForegroundColor Yellow
            $apiKey = Read-Host "   Digite a OPENAI_API_KEY (sk-...)" -AsSecureString
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
            $plainApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)  # Limpar memória
            
            Write-Host "   Criando secret..." -ForegroundColor Yellow
            echo $plainApiKey | gcloud secrets create openai-api-key --data-file=- --project=$PROJECT_ID
            $plainApiKey = $null  # Limpar variável
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "ERRO: Nao foi possivel criar o secret" -ForegroundColor Red
                Write-Host "   Tente criar manualmente:" -ForegroundColor Yellow
                Write-Host "   echo -n 'sk-...' | gcloud secrets create openai-api-key --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
                exit 1
            }
            Write-Host "   OK: Secret criado com sucesso" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "   Para criar o secret manualmente, execute:" -ForegroundColor Yellow
            Write-Host "   echo -n 'sk-...' | gcloud secrets create openai-api-key --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "   Depois, execute o deploy novamente." -ForegroundColor Yellow
            exit 0
        }
    } else {
        Write-Host "   OK: Secret encontrado" -ForegroundColor Green
    }
    
    # Fazer deploy (configurado para free tier: 512Mi memória, 1 CPU)
    gcloud run deploy obaid-revival `
        --image $IMAGE_NAME `
        --region $REGION `
        --platform managed `
        --allow-unauthenticated `
        --memory 512Mi `
        --cpu 1 `
        --timeout 300 `
        --max-instances 10 `
        --min-instances 0 `
        --port 8080 `
        --set-secrets="OPENAI_API_KEY=openai-api-key:latest" `
        --set-env-vars="SERVER_PORT=8080,SPRING_PROFILES_ACTIVE=prod,LOG_LEVEL=INFO" `
        --project=$PROJECT_ID
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "OK: Deploy concluido com sucesso!" -ForegroundColor Green
        $SERVICE_URL = gcloud run services describe obaid-revival --region $REGION --format="value(status.url)" --project=$PROJECT_ID
        Write-Host "URL do servico: $SERVICE_URL" -ForegroundColor Cyan
    } else {
        Write-Host "ERRO: Falha no deploy" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Concluido!" -ForegroundColor Green

