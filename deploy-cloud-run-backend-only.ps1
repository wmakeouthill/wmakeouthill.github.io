$ErrorActionPreference = "Stop"

<#
Deploy Cloud Run (backend-only) — build local + push + deploy

Uso:
  .\deploy-cloud-run-backend-only.ps1 -ProjectId "seu-projeto" -Region "southamerica-east1"

Observações importantes:
  - Cloud Run SEMPRE precisa puxar a imagem de um registry (não dá para “deploy direto do Docker local”).
  - Este script usa Artifact Registry (recomendado). Se preferir gcr.io, ajuste IMAGE abaixo.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $false)]
  [string]$Region = "southamerica-east1",

  [Parameter(Mandatory = $false)]
  [string]$ServiceName = "projeto-wesley-backend",

  [Parameter(Mandatory = $false)]
  [string]$ArtifactRepo = "cloud-run",

  [Parameter(Mandatory = $false)]
  [string]$DockerfilePath = "Dockerfile.cloud-run.projeto-wesley"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloud Run Deploy (Backend-only)" -ForegroundColor Cyan
Write-Host "  Build local + Push + Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar gcloud
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
  Write-Host "ERRO: gcloud CLI não está instalado. Instale em: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
  exit 1
}

# Verificar Docker
$dockerPath = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerPath) {
  Write-Host "ERRO: Docker não está instalado (ou não está no PATH)." -ForegroundColor Red
  exit 1
}

# Verificar autenticação
Write-Host "[1/7] Verificando autenticação..." -ForegroundColor Green
$activeAccount = (gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null | Select-Object -First 1)
if ([string]::IsNullOrWhiteSpace($activeAccount)) {
  Write-Host "ERRO: você não está autenticado. Execute: gcloud auth login" -ForegroundColor Red
  exit 1
}
Write-Host "OK: autenticado como: $activeAccount" -ForegroundColor Green

# Configurar projeto
Write-Host ""
Write-Host "[2/7] Configurando projeto: $ProjectId" -ForegroundColor Green
gcloud config set project $ProjectId | Out-Null

# Habilitar APIs mínimas (Cloud Run + Secret Manager + Artifact Registry)
Write-Host ""
Write-Host "[3/7] Habilitando APIs necessárias..." -ForegroundColor Green
$apis = @(
  "run.googleapis.com",
  "secretmanager.googleapis.com",
  "artifactregistry.googleapis.com"
)
foreach ($api in $apis) {
  Write-Host " - $api" -ForegroundColor Yellow
  gcloud services enable $api --project $ProjectId | Out-Null
}

# Descobrir project number (para IAM do service account padrão)
Write-Host ""
Write-Host "[4/7] Preparando permissões para ler secrets..." -ForegroundColor Green
$projectNumber = (gcloud projects describe $ProjectId --format="value(projectNumber)" 2>$null).ToString().Trim()
if ([string]::IsNullOrWhiteSpace($projectNumber)) {
  Write-Host "ERRO: não consegui descobrir o projectNumber." -ForegroundColor Red
  exit 1
}
$runtimeSa = "$projectNumber-compute@developer.gserviceaccount.com"

Write-Host "Service Account (runtime) assumido: $runtimeSa" -ForegroundColor Cyan
gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$runtimeSa" `
  --role="roles/secretmanager.secretAccessor" | Out-Null

# Garantir repositório do Artifact Registry
Write-Host ""
Write-Host "[5/7] Verificando Artifact Registry..." -ForegroundColor Green
$repoExists = $true
gcloud artifacts repositories describe $ArtifactRepo --location $Region --project $ProjectId 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { $repoExists = $false }

if (-not $repoExists) {
  Write-Host "Criando repo Docker '$ArtifactRepo' em '$Region'..." -ForegroundColor Yellow
  gcloud artifacts repositories create $ArtifactRepo `
    --repository-format=docker `
    --location=$Region `
    --description="Imagens Docker para Cloud Run" `
    --project=$ProjectId | Out-Null
} else {
  Write-Host "OK: repo '$ArtifactRepo' já existe." -ForegroundColor Green
}

# Configurar Docker auth para Artifact Registry da região
Write-Host ""
Write-Host "Configurando credenciais Docker para '$Region-docker.pkg.dev'..." -ForegroundColor Green
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet | Out-Null

# Montar nome da imagem
$image = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepo/$ServiceName:latest"

# Build + push
Write-Host ""
Write-Host "[6/7] Build e push da imagem..." -ForegroundColor Green
Write-Host "Dockerfile: $DockerfilePath" -ForegroundColor Cyan
Write-Host "Imagem: $image" -ForegroundColor Cyan

docker build -f $DockerfilePath -t $image .
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO: falha no build da imagem." -ForegroundColor Red
  exit 1
}

docker push $image
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO: falha no push da imagem." -ForegroundColor Red
  exit 1
}

# Verificar secrets necessários
Write-Host ""
Write-Host "[7/7] Verificando secrets e fazendo deploy (config free-tier friendly)..." -ForegroundColor Green

$requiredSecrets = @(
  "gemini-api-key",
  "gmail-username",
  "gmail-app-password",
  "email-recipient",
  "github-api-token"
)

$optionalSecrets = @(
  "openai-api-key"
)

$missing = @()
foreach ($s in $requiredSecrets) {
  gcloud secrets describe $s --project $ProjectId 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { $missing += $s }
}

if ($missing.Count -gt 0) {
  Write-Host "ERRO: faltam secrets obrigatórios no Secret Manager:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  Write-Host ""
  Write-Host "Crie-os e rode o script novamente." -ForegroundColor Yellow
  exit 1
}

$hasOpenAi = $false
gcloud secrets describe "openai-api-key" --project $ProjectId 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $hasOpenAi = $true }

$secretsArg = @(
  "GEMINI_API_KEY=gemini-api-key:latest",
  "GMAIL_USERNAME=gmail-username:latest",
  "GMAIL_APP_PASSWORD=gmail-app-password:latest",
  "EMAIL_RECIPIENT=email-recipient:latest",
  "GITHUB_API_TOKEN=github-api-token:latest"
)
if ($hasOpenAi) {
  $secretsArg += "OPENAI_API_KEY=openai-api-key:latest"
}

# Flags bem conservadoras para “free-tier friendly”:
# - min-instances=0 (scale to zero; evita cobrança idle)
# - max-instances=1 (evita surpresas de escala)
# - request-based billing (padrão; CPU só durante request; NÃO usar --no-cpu-throttling)
# - memory/cpu modestos
# - timeout curto para evitar requests “pendurados”
gcloud run deploy $ServiceName `
  --image $image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60 `
  --max-instances 1 `
  --min-instances 0 `
  --concurrency 20 `
  --port 8080 `
  --set-secrets=($secretsArg -join ",") `
  --set-env-vars="SERVER_PORT=8080,SPRING_PROFILES_ACTIVE=prod,LOG_LEVEL=INFO,FRONTEND_ENABLED=false,GITHUB_USERNAME=wmakeouthill" `
  --project $ProjectId

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO: falha no deploy do Cloud Run." -ForegroundColor Red
  exit 1
}

$serviceUrl = (gcloud run services describe $ServiceName --region $Region --format="value(status.url)" --project $ProjectId 2>$null).ToString().Trim()
Write-Host ""
Write-Host "OK: Deploy concluído." -ForegroundColor Green
Write-Host "URL: $serviceUrl" -ForegroundColor Cyan

