$ErrorActionPreference = "Stop"

<#
Deploy Oracle Cloud VM — modo SSR (front + API na mesma VM, substitui Vercel)

Uso:
  .\deploy-oracle-ssr.ps1              # build + deploy SSR
  .\deploy-oracle-ssr.ps1 setup-caddy  # instala Caddy + HTTPS na VM
  .\deploy-oracle-ssr.ps1 setup-firewall
  .\deploy-oracle-ssr.ps1 logs
  .\deploy-oracle-ssr.ps1 status

Antes do primeiro deploy com HTTPS:
  1. Aponte DNS de wmakeouthill.dev → 137.131.158.76 (registro A)
  2. Abra portas 80/443 na Security List do Oracle Console
  3. .\deploy-oracle-ssr.ps1 setup-firewall
  4. .\deploy-oracle-ssr.ps1
  5. .\deploy-oracle-ssr.ps1 setup-caddy
#>

$Action = $null
$SkipBuild = $false
foreach ($arg in $args) {
  if ($arg -eq "-SkipBuild") { $SkipBuild = $true }
  elseif (-not $Action) { $Action = $arg }
}

$SshKeyPath = "C:\Users\wcaco\Downloads\ssh-key-2026-02-25.key"
$ServerIp = "137.131.158.76"
$ServerUser = "ubuntu"
$ImageName = "portfolio-wesley-ssr"
$RemoteDir = "/home/ubuntu/portfolio-backend"
$GoogleCredentialsPath = "portfolio-wesley-479723-27fce2d0b7ef.json"

icacls $SshKeyPath /inheritance:r | Out-Null
icacls $SshKeyPath /remove "NT AUTHORITY\Authenticated Users" | Out-Null
icacls $SshKeyPath /remove "BUILTIN\Users" | Out-Null
icacls $SshKeyPath /remove "Everyone" | Out-Null
icacls $SshKeyPath /grant:r "${env:USERNAME}:(F)" | Out-Null

$SSH_ARGS = @("-o", "StrictHostKeyChecking=accept-new", "-i", $SshKeyPath, "${ServerUser}@${ServerIp}")

function Invoke-Ssh($Cmd) {
  $finalArgs = $SSH_ARGS + $Cmd
  $p = Start-Process -FilePath ssh -ArgumentList $finalArgs -NoNewWindow -PassThru -Wait
  if ($p.ExitCode -ne 0) { throw "Falha no comando SSH." }
}

function Invoke-Scp($LocalPath, $RemoteFile) {
  $remote = "${ServerUser}@${ServerIp}:${RemoteDir}/${RemoteFile}"
  $args = @("-o", "StrictHostKeyChecking=accept-new", "-i", $SshKeyPath, $LocalPath, $remote)
  $p = Start-Process -FilePath scp -ArgumentList $args -NoNewWindow -PassThru -Wait
  if ($p.ExitCode -ne 0) { throw "Falha no SCP." }
}

function Sync-OracleCloudScripts {
  Invoke-Ssh "mkdir -p $RemoteDir/oracle-cloud && chmod 755 $RemoteDir/oracle-cloud"
  Invoke-Scp "oracle-cloud\Caddyfile" "oracle-cloud/Caddyfile"
  Invoke-Scp "oracle-cloud\setup-caddy.sh" "oracle-cloud/setup-caddy.sh"
  Invoke-Scp "oracle-cloud\setup-firewall.sh" "oracle-cloud/setup-firewall.sh"
  Invoke-Ssh "chmod +x $RemoteDir/oracle-cloud/setup-caddy.sh $RemoteDir/oracle-cloud/setup-firewall.sh"
  Invoke-Ssh "sed -i 's/\r$//' $RemoteDir/oracle-cloud/setup-caddy.sh $RemoteDir/oracle-cloud/setup-firewall.sh"
}

if ($Action -eq "logs") {
  Write-Host "Lendo logs do container SSR..." -ForegroundColor Cyan
  $finalArgs = $SSH_ARGS + "cd $RemoteDir && docker compose -f docker-compose.ssr.yml logs --tail=100 -f"
  Start-Process -FilePath ssh -ArgumentList $finalArgs -NoNewWindow -Wait
  exit 0
}

if ($Action -eq "status") {
  Write-Host "Status do servidor..." -ForegroundColor Cyan
  $finalArgs = $SSH_ARGS + "docker stats --no-stream && free -h && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/health"
  Start-Process -FilePath ssh -ArgumentList $finalArgs -NoNewWindow -Wait
  exit 0
}

if ($Action -eq "setup-firewall") {
  Write-Host "Configurando firewall na VM..." -ForegroundColor Cyan
  Sync-OracleCloudScripts
  Invoke-Ssh "bash $RemoteDir/oracle-cloud/setup-firewall.sh"
  Write-Host "Firewall configurado." -ForegroundColor Green
  exit 0
}

if ($Action -eq "setup-caddy") {
  Write-Host "Instalando/configurando Caddy (HTTPS)..." -ForegroundColor Cyan
  Sync-OracleCloudScripts
  Invoke-Ssh "bash $RemoteDir/oracle-cloud/setup-caddy.sh"
  Write-Host "Caddy configurado. Teste: https://wmakeouthill.dev" -ForegroundColor Green
  exit 0
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Oracle Cloud Deploy (SSR - sem Vercel)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $GoogleCredentialsPath -PathType Leaf)) {
  throw "Credencial Vertex AI não encontrada em $GoogleCredentialsPath"
}

if (-not (Test-Path -LiteralPath "oracle-cloud\.env" -PathType Leaf)) {
  throw "Arquivo oracle-cloud\.env não encontrado. Copie de oracle-cloud\.env.example e preencha."
}

# Garante PUBLIC_SITE_BASE_URL no .env local (usado pelo compose remoto)
$envContent = Get-Content "oracle-cloud\.env" -Raw
if ($envContent -notmatch "PUBLIC_SITE_BASE_URL=") {
  Add-Content "oracle-cloud\.env" "`nPUBLIC_SITE_BASE_URL=https://wmakeouthill.dev"
  Write-Host "Adicionado PUBLIC_SITE_BASE_URL=https://wmakeouthill.dev ao .env" -ForegroundColor Yellow
}

Write-Host "[1/6] Build da imagem SSR (Maven + Angular - pode levar varios minutos)..." -ForegroundColor Green
if ($SkipBuild) {
  Write-Host "  (-SkipBuild: reutilizando imagem local portfolio-wesley-ssr:latest)" -ForegroundColor Yellow
} else {
  docker build -f Dockerfile.oracle-ssr -t "${ImageName}:latest" .
  if ($LASTEXITCODE -ne 0) { throw "Erro no build da imagem docker SSR." }
}

Write-Host "[2/6] Compactando imagem..." -ForegroundColor Green
docker save -o "${ImageName}.tar" "${ImageName}:latest"

Write-Host "[3/6] Transferindo para Oracle..." -ForegroundColor Green
Invoke-Ssh "mkdir -p $RemoteDir/secrets $RemoteDir/oracle-cloud && chmod 700 $RemoteDir/secrets"
Invoke-Scp "${ImageName}.tar" "${ImageName}.tar"
Invoke-Scp "oracle-cloud\.env" ".env"
Invoke-Scp "oracle-cloud\docker-compose.ssr.yml" "docker-compose.ssr.yml"
Sync-OracleCloudScripts
Invoke-Ssh "sudo rm -f $RemoteDir/secrets/google-service-account.json"
Invoke-Scp $GoogleCredentialsPath "secrets/google-service-account.json"
Invoke-Ssh "sudo chown 1001:1001 $RemoteDir/secrets/google-service-account.json && sudo chmod 0400 $RemoteDir/secrets/google-service-account.json"

Write-Host "[4/6] Subindo container SSR..." -ForegroundColor Green
$remoteCmd = @(
  "cd $RemoteDir",
  "docker load -i ${ImageName}.tar",
  "docker compose -f docker-compose.yml down --remove-orphans 2>/dev/null || true",
  "docker compose -f docker-compose.ssr.yml down --remove-orphans",
  "docker compose -f docker-compose.ssr.yml up -d",
  "rm -f ${ImageName}.tar"
) -join " && "
$finalArgs = $SSH_ARGS + $remoteCmd
$p = Start-Process -FilePath ssh -ArgumentList $finalArgs -NoNewWindow -PassThru -Wait
if ($p.ExitCode -ne 0) { throw "Falha ao iniciar container SSR na VM." }

Write-Host "[5/6] Aguardando health check (até 120s)..." -ForegroundColor Green
$healthy = $false
for ($i = 1; $i -le 24; $i++) {
  Start-Sleep -Seconds 5
  try {
    $code = ssh @("-o", "StrictHostKeyChecking=accept-new", "-i", $SshKeyPath, "${ServerUser}@${ServerIp}", "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/health")
    if ($code -eq "200") { $healthy = $true; break }
  } catch { }
  Write-Host "  tentativa $i/24..." -ForegroundColor DarkGray
}

Write-Host "[6/6] Finalizando..." -ForegroundColor Green
Remove-Item -Force "${ImageName}.tar" -ErrorAction SilentlyContinue

Write-Host ""
if ($healthy) {
  Write-Host "DEPLOY SSR CONCLUIDO!" -ForegroundColor Green
} else {
  Write-Host "Container iniciado, mas health check ainda nao respondeu 200." -ForegroundColor Yellow
  Write-Host "Verifique: .\deploy-oracle-ssr.ps1 logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. DNS: registro A de wmakeouthill.dev -> $ServerIp" -ForegroundColor White
Write-Host "  2. Oracle Console: abrir portas 80 e 443 na Security List" -ForegroundColor White
Write-Host "  3. .\deploy-oracle-ssr.ps1 setup-firewall" -ForegroundColor White
Write-Host "  4. .\deploy-oracle-ssr.ps1 setup-caddy" -ForegroundColor White
Write-Host "  5. Testar: https://wmakeouthill.dev" -ForegroundColor White
Write-Host ""
Write-Host "Teste local na VM: curl http://127.0.0.1:8080/api/health" -ForegroundColor DarkGray
