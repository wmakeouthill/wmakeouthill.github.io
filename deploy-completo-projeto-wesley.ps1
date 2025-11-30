# Script PowerShell completo: Build + Push + Deploy para Cloud Run - Projeto Wesley Portfolio
# Uso: .\deploy-completo-projeto-wesley.ps1 [PROJECT_ID] [REGION]
# Exemplo: .\deploy-completo-projeto-wesley.ps1 portfolio-wesley-479723 southamerica-east1
#
# IMPORTANTE: Este script é adaptado para o projeto-wesley (Portfolio Wesley)
# - Estrutura: backend Spring Boot + frontend Angular
# - Secrets necessários: OPENAI_API_KEY, GMAIL_USERNAME, GMAIL_APP_PASSWORD, EMAIL_RECIPIENT, GITHUB_API_TOKEN
# - Sem banco de dados (aplicação stateless)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Completo - Cloud Run" -ForegroundColor Cyan
Write-Host "  Projeto Wesley Portfolio" -ForegroundColor Cyan
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
Write-Host "[1/7] Verificando autenticacao..." -ForegroundColor Green
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
Write-Host "[2/7] Configurando projeto: $PROJECT_ID" -ForegroundColor Green
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

# Verificar e habilitar APIs (com fallback se não tiver permissão)
Write-Host ""
Write-Host "[3/7] Verificando APIs necessarias..." -ForegroundColor Green
$apis = @(
    "containerregistry.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com"
)

# Tentar verificar se tem permissão para listar serviços
Write-Host "   Verificando permissoes..." -ForegroundColor Yellow
$testPermission = gcloud services list --enabled --limit=1 --project=$PROJECT_ID 2>&1 | Out-Null
$hasPermission = $LASTEXITCODE -eq 0

if (-not $hasPermission) {
    Write-Host "   AVISO: Sem permissao para verificar status das APIs" -ForegroundColor Yellow
    Write-Host "   Assumindo que as APIs ja estao habilitadas (voce mencionou que ativou manualmente)" -ForegroundColor Yellow
    Write-Host "   Continuando com o deploy..." -ForegroundColor Green
} else {
    # Tem permissão, verificar cada API
    $failedApis = @()
    $enabledApis = @()

    foreach ($api in $apis) {
        Write-Host "   Verificando $api..." -ForegroundColor Yellow
        $status = gcloud services list --enabled --filter="name:$api" --project=$PROJECT_ID --format="value(name)" 2>&1
        
        if ($status -match $api) {
            Write-Host "   OK: $api ja esta habilitada" -ForegroundColor Green
            $enabledApis += $api
        } else {
            # Tentar habilitar a API
            Write-Host "   Tentando habilitar $api..." -ForegroundColor Yellow
            $isSuccess = $false
            $enableOutput = ""
            
            try {
                $ErrorActionPreference = "SilentlyContinue"
                $enableOutput = gcloud services enable $api --project=$PROJECT_ID 2>&1 | Out-String
                $exitCode = $LASTEXITCODE
                $ErrorActionPreference = "Stop"
                
                # Verificar se a operação foi bem-sucedida
                # O gcloud pode retornar sucesso mesmo que o PowerShell mostre como erro
                if ($exitCode -eq 0) {
                    $isSuccess = $true
                } elseif ($enableOutput -match "finished successfully" -or $enableOutput -match "already enabled" -or $enableOutput -match "Operation.*finished successfully") {
                    $isSuccess = $true
                }
            } catch {
                # Capturar exceções do PowerShell (que podem ocorrer mesmo com sucesso)
                $errorMessage = $_.Exception.Message
                if ($errorMessage -match "finished successfully" -or $errorMessage -match "already enabled" -or $errorMessage -match "Operation.*finished successfully") {
                    $isSuccess = $true
                    $enableOutput = $errorMessage
                }
            }
            
            if ($isSuccess) {
                Write-Host "   OK: $api habilitada com sucesso" -ForegroundColor Green
                $enabledApis += $api
            } else {
                Write-Host "   AVISO: Nao foi possivel habilitar $api automaticamente" -ForegroundColor Yellow
                Write-Host "   (Se ja estiver habilitada manualmente, pode continuar)" -ForegroundColor Yellow
                $failedApis += $api
            }
        }
    }

    if ($failedApis.Count -gt 0) {
        Write-Host ""
        Write-Host "AVISO: Algumas APIs nao puderam ser verificadas/habilitadas automaticamente." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "APIs que falharam:" -ForegroundColor Yellow
        foreach ($api in $failedApis) {
            Write-Host "  - $api" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Se voce ja habilitou essas APIs manualmente, pode continuar." -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
        if ($continue -ne "S" -and $continue -ne "s" -and $continue -ne "Y" -and $continue -ne "y") {
            Write-Host "Deploy cancelado. Verifique as APIs e tente novamente." -ForegroundColor Yellow
            Write-Host "Console Web: https://console.cloud.google.com/apis/library?project=$PROJECT_ID" -ForegroundColor Cyan
            exit 0
        }
    } else {
        Write-Host ""
        Write-Host "OK: Todas as APIs necessarias estao habilitadas" -ForegroundColor Green
    }
}

# Configurar Docker
Write-Host ""
Write-Host "[4/7] Configurando credenciais Docker..." -ForegroundColor Green
gcloud auth configure-docker gcr.io --quiet

# Verificar se o frontend está buildado
Write-Host ""
Write-Host "[5/7] Verificando se o frontend esta buildado..." -ForegroundColor Green
$frontendDistPath = "frontend/dist/portfolio/browser"
if (-not (Test-Path $frontendDistPath)) {
    Write-Host "   AVISO: Frontend nao esta buildado em $frontendDistPath" -ForegroundColor Yellow
    Write-Host "   Fazendo build do frontend agora..." -ForegroundColor Yellow
    Push-Location frontend
    npm run build -- --configuration=production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha no build do frontend" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "   OK: Frontend buildado com sucesso" -ForegroundColor Green
} else {
    Write-Host "   OK: Frontend ja esta buildado" -ForegroundColor Green
}

# Build da imagem
Write-Host ""
Write-Host "[6/7] Fazendo build da imagem Docker..." -ForegroundColor Green
$IMAGE_NAME = "gcr.io/$PROJECT_ID/projeto-wesley:latest"
$TIMESTAMP_TAG = "gcr.io/$PROJECT_ID/projeto-wesley:$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "   Usando Dockerfile.cloud-run.projeto-wesley" -ForegroundColor Yellow
Write-Host "   O Docker vai copiar o frontend ja buildado (nao vai buildar novamente)" -ForegroundColor Yellow
Write-Host "   Isso pode levar varios minutos..." -ForegroundColor Yellow

docker build -f Dockerfile.cloud-run.projeto-wesley -t $IMAGE_NAME -t $TIMESTAMP_TAG .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no build da imagem" -ForegroundColor Red
    exit 1
}

Write-Host "   OK: Build concluido" -ForegroundColor Green

# Push da imagem
Write-Host ""
Write-Host "[7/7] Fazendo push da imagem para Container Registry..." -ForegroundColor Green
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
Write-Host "  1. Verifique se os secrets existem no Secret Manager:" -ForegroundColor Yellow
Write-Host "     - openai-api-key" -ForegroundColor Yellow
Write-Host "     - gmail-username" -ForegroundColor Yellow
Write-Host "     - gmail-app-password" -ForegroundColor Yellow
Write-Host "     - email-recipient" -ForegroundColor Yellow
Write-Host "     - github-api-token" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Faca o deploy no Cloud Run:" -ForegroundColor Yellow
Write-Host "     - Via Console Web" -ForegroundColor Yellow
Write-Host "     - Ou configure o deploy automatico aqui no script" -ForegroundColor Yellow
Write-Host ""
Write-Host "Configuracao do Cloud Run:" -ForegroundColor Cyan
Write-Host "  - Project ID: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "  - Region: $REGION" -ForegroundColor Cyan
Write-Host "  - Service Name: projeto-wesley" -ForegroundColor Cyan
Write-Host "  - Memory: 512Mi (otimizado para free tier)" -ForegroundColor Cyan
Write-Host "  - CPU: 1 (free tier)" -ForegroundColor Cyan
Write-Host "  - Aplicacao stateless (sem banco de dados)" -ForegroundColor Cyan
Write-Host ""

# Perguntar se deseja fazer deploy automatico
$deploy = Read-Host "Deseja fazer deploy automatico no Cloud Run agora? (S/N)"
if ($deploy -eq "S" -or $deploy -eq "s" -or $deploy -eq "Y" -or $deploy -eq "y") {
    Write-Host ""
    Write-Host "Fazendo deploy no Cloud Run..." -ForegroundColor Green
    
    # Verificar se os secrets existem
    $secrets = @(
        @{Name="openai-api-key"; EnvVar="OPENAI_API_KEY"},
        @{Name="gmail-username"; EnvVar="GMAIL_USERNAME"},
        @{Name="gmail-app-password"; EnvVar="GMAIL_APP_PASSWORD"},
        @{Name="email-recipient"; EnvVar="EMAIL_RECIPIENT"},
        @{Name="github-api-token"; EnvVar="GITHUB_API_TOKEN"}
    )
    
    $missingSecrets = @()
    foreach ($secret in $secrets) {
        Write-Host "   Verificando secret '$($secret.Name)'..." -ForegroundColor Yellow
        $secretCheck = gcloud secrets describe $secret.Name --project=$PROJECT_ID 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   AVISO: Secret '$($secret.Name)' nao encontrado!" -ForegroundColor Yellow
            $missingSecrets += $secret
        } else {
            Write-Host "   OK: Secret '$($secret.Name)' encontrado" -ForegroundColor Green
        }
    }
    
    if ($missingSecrets.Count -gt 0) {
        Write-Host ""
        Write-Host "   Secrets faltando:" -ForegroundColor Red
        foreach ($secret in $missingSecrets) {
            Write-Host "     - $($secret.Name)" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "   Crie os secrets manualmente antes de fazer o deploy." -ForegroundColor Yellow
        Write-Host "   Veja as instrucoes no final deste script." -ForegroundColor Yellow
        exit 1
    }
    
    # Fazer deploy (configurado para free tier: 512Mi memória, 1 CPU)
    Write-Host ""
    Write-Host "   Fazendo deploy no Cloud Run..." -ForegroundColor Green
    
    gcloud run deploy projeto-wesley `
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
        --set-secrets="OPENAI_API_KEY=openai-api-key:latest,GMAIL_USERNAME=gmail-username:latest,GMAIL_APP_PASSWORD=gmail-app-password:latest,EMAIL_RECIPIENT=email-recipient:latest,GITHUB_API_TOKEN=github-api-token:latest" `
        --set-env-vars="SERVER_PORT=8080,SPRING_PROFILES_ACTIVE=prod,LOG_LEVEL=INFO,GITHUB_USERNAME=wmakeouthill" `
        --project=$PROJECT_ID
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "OK: Deploy concluido com sucesso!" -ForegroundColor Green
        $SERVICE_URL = gcloud run services describe projeto-wesley --region $REGION --format="value(status.url)" --project=$PROJECT_ID
        Write-Host "URL do servico: $SERVICE_URL" -ForegroundColor Cyan
    } else {
        Write-Host "ERRO: Falha no deploy" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCOES: Configurar Secrets" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para criar os secrets no Secret Manager, execute os comandos abaixo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. OPENAI_API_KEY (chave da API OpenAI):" -ForegroundColor Green
Write-Host "   echo -n 'sk-...' | gcloud secrets create openai-api-key --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. GMAIL_USERNAME (seu email Gmail):" -ForegroundColor Green
Write-Host "   echo -n 'seu-email@gmail.com' | gcloud secrets create gmail-username --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. GMAIL_APP_PASSWORD (senha de app do Gmail):" -ForegroundColor Green
Write-Host "   echo -n 'xxxx xxxx xxxx xxxx' | gcloud secrets create gmail-app-password --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host "   (Crie em: https://myaccount.google.com/apppasswords)" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. EMAIL_RECIPIENT (email que recebera as mensagens do formulario):" -ForegroundColor Green
Write-Host "   echo -n 'seu-email@gmail.com' | gcloud secrets create email-recipient --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. GITHUB_API_TOKEN (Personal Access Token do GitHub - somente leitura):" -ForegroundColor Green
Write-Host "   echo -n 'ghp_...' | gcloud secrets create github-api-token --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host "   (Crie em: https://github.com/settings/tokens)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para atualizar um secret existente:" -ForegroundColor Yellow
Write-Host "   echo -n 'novo-valor' | gcloud secrets versions add NOME_DO_SECRET --data-file=- --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para listar todos os secrets:" -ForegroundColor Yellow
Write-Host "   gcloud secrets list --project=$PROJECT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "Concluido!" -ForegroundColor Green

