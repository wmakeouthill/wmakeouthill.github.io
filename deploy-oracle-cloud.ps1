$ErrorActionPreference = "Stop"

<#
Deploy Oracle Cloud VM — build local + deploy

Uso:
  .\deploy-oracle-cloud.ps1

Ações opcionales:
  .\deploy-oracle-cloud.ps1 logs (para ver logs)
  .\deploy-oracle-cloud.ps1 status (para ver uso de memoria/cpu)
#>

$Action = $null
if ($args.Count -gt 0) { $Action = $args[0] }

$SshKeyPath = "C:\Users\wcaco\Downloads\ssh-key-2026-02-25.key"
$ServerIp = "137.131.158.76"
$ServerUser = "ubuntu"
$ImageName = "portfolio-wesley-backend"
$RemoteDir = "/home/ubuntu/portfolio-backend"

# Corrige permissões da chave SSH (Windows OpenSSH exige que apenas o dono tenha acesso)
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

if ($Action -eq "logs") {
  Write-Host "Lendo logs do container..." -ForegroundColor Cyan
  $finalArgs = $SSH_ARGS + "cd $RemoteDir && docker compose logs --tail=100 -f"
  Start-Process -FilePath ssh -ArgumentList $finalArgs -NoNewWindow -Wait
  exit 0
}

if ($Action -eq "status") {
  Write-Host "Status do servidor..." -ForegroundColor Cyan
  $finalArgs = $SSH_ARGS + "docker stats --no-stream && free -h"
  Start-Process -FilePath ssh -ArgumentList $finalArgs -NoNewWindow -Wait
  exit 0
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Oracle Cloud Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Build
Write-Host "[1/5] Fazendo build da imagem Docker..." -ForegroundColor Green
docker build -f Dockerfile.oracle-cloud -t "${ImageName}:latest" .
if ($LASTEXITCODE -ne 0) { throw "Erro no build da imagem docker." }

# 2. Save
Write-Host "[2/5] Compactando imagem para tar..." -ForegroundColor Green
docker save -o "${ImageName}.tar" "${ImageName}:latest"

# 3. SCP
Write-Host "[3/5] Transferindo arquivos para Oracle (pode demorar ~30s)..." -ForegroundColor Green
Invoke-Scp "${ImageName}.tar" "${ImageName}.tar"
Invoke-Scp "oracle-cloud\.env" ".env"
Invoke-Scp "oracle-cloud\docker-compose.yml" "docker-compose.yml"

# 4. SSH Load and Up
Write-Host "[4/5] Reiniciando container na nuvem..." -ForegroundColor Green
$remoteCmd = "cd $RemoteDir && docker load -i ${ImageName}.tar && docker compose down --remove-orphans && docker compose up -d && rm -f ${ImageName}.tar"
$finalArgs = $SSH_ARGS + $remoteCmd
$p = Start-Process -FilePath ssh -ArgumentList $finalArgs -NoNewWindow -PassThru -Wait
if ($p.ExitCode -ne 0) { throw "Falha iniciar o docker na nuvem." }

# 5. Done
Remove-Item -Force "${ImageName}.tar" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "Testar: curl -H `"X-API-Key: SEU_TOKEN`" http://${ServerIp}:8080/api/projects" -ForegroundColor Cyan
