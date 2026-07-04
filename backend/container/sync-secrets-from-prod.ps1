# Sincroniza application-secrets.properties a partir de oracle-cloud/.env (fonte principal).
# configmap-secrets-local.properties so entra como fallback para chaves ausentes.

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$outFile = Join-Path $PSScriptRoot 'application-secrets.properties'
$oracleEnvFile = Join-Path $root 'oracle-cloud\.env'
$fallbackFile = Join-Path $PSScriptRoot 'configmap-secrets-local.properties'

function Is-PlaceholderValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    return $Value -match 'REPLACE_ME|seu-email|senha-de-app|ghp_\.\.\.|sk-\.\.\.|AIzaSy\.\.\.|^sk-REPLACE|^ghp_REPLACE'
}

function Read-PropertiesFile {
    param([string]$Path)
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $map[$key] = $value
    }
    return $map
}

function Merge-WithPriority {
    param(
        [hashtable]$Primary,
        [hashtable]$Fallback
    )
    $merged = @{}
    foreach ($entry in $Fallback.GetEnumerator()) {
        if (Is-PlaceholderValue -Value $entry.Value) { continue }
        $merged[$entry.Key] = $entry.Value
    }
    foreach ($entry in $Primary.GetEnumerator()) {
        if (Is-PlaceholderValue -Value $entry.Value) { continue }
        $merged[$entry.Key] = $entry.Value
    }
    return $merged
}

function Get-FirstValue {
    param([hashtable]$Map, [string[]]$Keys)
    foreach ($key in $Keys) {
        if ($Map.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($Map[$key])) {
            return $Map[$key]
        }
    }
    return $null
}

if (-not (Test-Path $oracleEnvFile)) {
    Write-Error "Fonte principal nao encontrada: $oracleEnvFile"
}

$oracleEnv = Read-PropertiesFile -Path $oracleEnvFile
$fallback = Read-PropertiesFile -Path $fallbackFile
$merged = Merge-WithPriority -Primary $oracleEnv -Fallback $fallback

$serviceAccountCandidates = @(
    (Join-Path $root 'vercel-service-account-key.json'),
    (Join-Path $root 'portfolio-wesley-479723-27fce2d0b7ef.json'),
    (Join-Path $root 'oracle-cloud\secrets\google-service-account.json')
)

$serviceAccountPath = $null
$vertexProjectId = Get-FirstValue -Map $merged -Keys @('VERTEX_AI_PROJECT_ID', 'vertex.ai.project-id')
foreach ($candidate in $serviceAccountCandidates) {
    if (Test-Path $candidate) {
        $serviceAccountPath = $candidate
        if ([string]::IsNullOrWhiteSpace($vertexProjectId)) {
            try {
                $json = Get-Content $candidate -Raw | ConvertFrom-Json
                if ($json.project_id) { $vertexProjectId = [string]$json.project_id }
            } catch { }
        }
        break
    }
}

$githubToken = Get-FirstValue -Map $merged -Keys @('GITHUB_API_TOKEN', 'github.api.token')
$openAiKey = Get-FirstValue -Map $merged -Keys @('OPENAI_API_KEY', 'openai.api.key')
$gmailUser = Get-FirstValue -Map $merged -Keys @('GMAIL_USERNAME', 'spring.mail.username')
$gmailPass = Get-FirstValue -Map $merged -Keys @('GMAIL_APP_PASSWORD', 'spring.mail.password')
$emailRecipient = Get-FirstValue -Map $merged -Keys @('EMAIL_RECIPIENT', 'email.recipient')
$emailFrom = Get-FirstValue -Map $merged -Keys @('EMAIL_FROM', 'email.from', 'GMAIL_USERNAME')
$vertexLocation = Get-FirstValue -Map $merged -Keys @('VERTEX_AI_LOCATION', 'vertex.ai.location')
if ([string]::IsNullOrWhiteSpace($vertexLocation)) { $vertexLocation = 'global' }

$lines = @(
    '# ===========================',
    '# SECRETS LOCAIS — sincronizado automaticamente (nao commitar)',
    '# Fonte principal: oracle-cloud/.env (credenciais de producao Oracle)',
    '# Fallback: configmap-secrets-local.properties (somente chaves ausentes)',
    '# ===========================',
    ''
)

function Add-Line {
    param([string]$Key, [string]$Value, [string]$Comment)
    if ($Comment) { $script:lines += "# $Comment" }
    if ([string]::IsNullOrWhiteSpace($Value)) {
        $script:lines += "${Key}="
    } else {
        $escaped = $Value -replace '\\', '\\\\'
        $script:lines += "${Key}=$escaped"
    }
}

Add-Line -Key 'GITHUB_API_TOKEN' -Value $githubToken -Comment 'GitHub API'
Add-Line -Key 'OPENAI_API_KEY' -Value $openAiKey
Add-Line -Key 'openai.api.key' -Value $openAiKey -Comment 'OpenAI (fallback)'

if ($serviceAccountPath) {
    $windowsPath = ($serviceAccountPath -replace '/', '\')
    Add-Line -Key 'GOOGLE_APPLICATION_CREDENTIALS' -Value $windowsPath -Comment 'Gemini via Vertex AI'
} else {
    Add-Line -Key 'GOOGLE_APPLICATION_CREDENTIALS' -Value '' -Comment 'Gemini via Vertex AI (JSON nao encontrado localmente)'
}

Add-Line -Key 'VERTEX_AI_PROJECT_ID' -Value $vertexProjectId
Add-Line -Key 'VERTEX_AI_LOCATION' -Value $vertexLocation
Add-Line -Key 'GMAIL_USERNAME' -Value $gmailUser -Comment 'E-mail (Gmail SMTP)'
Add-Line -Key 'GMAIL_APP_PASSWORD' -Value $gmailPass
Add-Line -Key 'EMAIL_RECIPIENT' -Value $emailRecipient
Add-Line -Key 'EMAIL_FROM' -Value $emailFrom

Set-Content -Path $outFile -Value ($lines -join "`r`n") -Encoding UTF8

$filled = New-Object System.Collections.Generic.List[string]
if ($githubToken) { $filled.Add('GITHUB_API_TOKEN') }
if ($openAiKey) { $filled.Add('OPENAI_API_KEY') }
if ($serviceAccountPath) { $filled.Add('GOOGLE_APPLICATION_CREDENTIALS') }
if ($vertexProjectId) { $filled.Add('VERTEX_AI_PROJECT_ID') }
if ($gmailUser) { $filled.Add('GMAIL_USERNAME') }
if ($gmailPass) { $filled.Add('GMAIL_APP_PASSWORD') }
if ($emailRecipient) { $filled.Add('EMAIL_RECIPIENT') }
if ($emailFrom) { $filled.Add('EMAIL_FROM') }

Write-Output "application-secrets.properties atualizado a partir de oracle-cloud/.env."
Write-Output ("Chaves preenchidas: {0}" -f ($filled -join ', '))
if (-not $serviceAccountPath) {
    Write-Output 'Aviso: JSON da service account nao encontrado — chat Gemini pode nao funcionar ate configurar GOOGLE_APPLICATION_CREDENTIALS.'
}
