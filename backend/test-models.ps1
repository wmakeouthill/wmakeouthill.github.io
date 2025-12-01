# Script para testar particularidades de cada modelo OpenAI
# Executa chamadas de teste e analisa respostas

param(
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = $env:OPENAI_API_KEY
)

if (-not $ApiKey) {
    Write-Host "Erro: OPENAI_API_KEY nao definida. Use:" -ForegroundColor Red
    Write-Host '  $env:OPENAI_API_KEY = "sk-..."' -ForegroundColor Yellow
    Write-Host "  .\test-models.ps1" -ForegroundColor Yellow
    exit 1
}

$models = @(
    "gpt-5-mini",
    "gpt-5.1", 
    "gpt-4.1-nano",
    "gpt-4o-mini",
    "gpt-3.5-turbo"
)

$apiUrl = "https://api.openai.com/v1/chat/completions"

function Test-Model {
    param(
        [string]$Model,
        [hashtable]$Payload
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $ApiKey"
    }
    
    $body = $Payload | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body -TimeoutSec 30
        return @{
            Success = $true
            Response = $response
            Error = $null
        }
    }
    catch {
        $errorBody = $_.ErrorDetails.Message
        return @{
            Success = $false
            Response = $null
            Error = $errorBody
            StatusCode = $_.Exception.Response.StatusCode.value__
        }
    }
}

function Get-ErrorMessage {
    param([string]$ErrorJson)
    
    try {
        $parsed = $ErrorJson | ConvertFrom-Json
        return $parsed.error.message
    }
    catch {
        return $ErrorJson
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTE DE PARTICULARIDADES DOS MODELOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$results = @()

foreach ($model in $models) {
    Write-Host "Testando modelo: $model" -ForegroundColor Yellow
    Write-Host ("-" * 50)
    
    $modelResult = @{
        Model = $model
        MaxTokens = $null
        MaxCompletionTokens = $null
        Temperature = $null
        Notes = @()
    }
    
    # Mensagem simples para teste
    $messages = @(
        @{ role = "user"; content = "Responda apenas: OK" }
    )
    
    # Teste 1: max_tokens (formato antigo)
    Write-Host "  [1/3] Testando max_tokens..." -NoNewline
    $payload1 = @{
        model = $model
        messages = $messages
        max_tokens = 10
        temperature = 0.9
    }
    
    $result1 = Test-Model -Model $model -Payload $payload1
    
    if ($result1.Success) {
        Write-Host " OK" -ForegroundColor Green
        $modelResult.MaxTokens = "Suportado"
        $modelResult.Temperature = "Suportado (0.9)"
    }
    else {
        $errorMsg = Get-ErrorMessage $result1.Error
        if ($errorMsg -match "max_tokens") {
            Write-Host " NAO SUPORTADO" -ForegroundColor Red
            $modelResult.MaxTokens = "NAO suportado"
            $modelResult.Notes += "Requer max_completion_tokens"
        }
        elseif ($errorMsg -match "temperature") {
            Write-Host " ERRO (temperature)" -ForegroundColor Red
            $modelResult.MaxTokens = "?"
            $modelResult.Temperature = "NAO suportado (0.9)"
            $modelResult.Notes += "Temperature customizado nao suportado"
        }
        else {
            Write-Host " ERRO: $errorMsg" -ForegroundColor Red
            $modelResult.MaxTokens = "Erro: $errorMsg"
        }
    }
    
    # Teste 2: max_completion_tokens (formato novo)
    Write-Host "  [2/3] Testando max_completion_tokens..." -NoNewline
    $payload2 = @{
        model = $model
        messages = $messages
        max_completion_tokens = 10
    }
    
    $result2 = Test-Model -Model $model -Payload $payload2
    
    if ($result2.Success) {
        Write-Host " OK" -ForegroundColor Green
        $modelResult.MaxCompletionTokens = "Suportado"
    }
    else {
        $errorMsg = Get-ErrorMessage $result2.Error
        if ($errorMsg -match "max_completion_tokens") {
            Write-Host " NAO SUPORTADO" -ForegroundColor Red
            $modelResult.MaxCompletionTokens = "NAO suportado"
            $modelResult.Notes += "Requer max_tokens"
        }
        else {
            Write-Host " ERRO: $errorMsg" -ForegroundColor Red
            $modelResult.MaxCompletionTokens = "Erro: $errorMsg"
        }
    }
    
    # Teste 3: temperature customizado
    if ($modelResult.Temperature -eq $null) {
        Write-Host "  [3/3] Testando temperature=0.9..." -NoNewline
        
        # Usa o formato correto baseado nos testes anteriores
        if ($modelResult.MaxCompletionTokens -eq "Suportado") {
            $payload3 = @{
                model = $model
                messages = $messages
                max_completion_tokens = 10
                temperature = 0.9
            }
        }
        else {
            $payload3 = @{
                model = $model
                messages = $messages
                max_tokens = 10
                temperature = 0.9
            }
        }
        
        $result3 = Test-Model -Model $model -Payload $payload3
        
        if ($result3.Success) {
            Write-Host " OK" -ForegroundColor Green
            $modelResult.Temperature = "Suportado (0.9)"
        }
        else {
            $errorMsg = Get-ErrorMessage $result3.Error
            if ($errorMsg -match "temperature") {
                Write-Host " NAO SUPORTADO" -ForegroundColor Red
                $modelResult.Temperature = "NAO suportado (apenas 1)"
                $modelResult.Notes += "Temperature customizado nao suportado"
            }
            else {
                Write-Host " ERRO: $errorMsg" -ForegroundColor Red
                $modelResult.Temperature = "Erro"
            }
        }
    }
    else {
        Write-Host "  [3/3] Temperature ja testado"
    }
    
    $results += $modelResult
    Write-Host ""
}

# Resumo final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           RESUMO DOS RESULTADOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Modelo              | max_tokens | max_completion_tokens | temperature" -ForegroundColor White
Write-Host ("-" * 85)

foreach ($r in $results) {
    $mtStatus = if ($r.MaxTokens -eq "Suportado") { "SIM" } elseif ($r.MaxTokens -match "NAO") { "NAO" } else { "?" }
    $mctStatus = if ($r.MaxCompletionTokens -eq "Suportado") { "SIM" } elseif ($r.MaxCompletionTokens -match "NAO") { "NAO" } else { "?" }
    $tempStatus = if ($r.Temperature -match "Suportado") { "SIM" } elseif ($r.Temperature -match "NAO") { "NAO" } else { "?" }
    
    $color = if ($r.Notes.Count -eq 0) { "Green" } else { "Yellow" }
    
    $line = "{0,-19} | {1,-10} | {2,-21} | {3}" -f $r.Model, $mtStatus, $mctStatus, $tempStatus
    Write-Host $line -ForegroundColor $color
    
    if ($r.Notes.Count -gt 0) {
        foreach ($note in $r.Notes) {
            Write-Host "                      -> $note" -ForegroundColor DarkYellow
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "      RECOMENDACAO DE CONFIGURACAO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Baseado nos testes, os modelos que requerem tratamento especial:" -ForegroundColor White

$specialModels = $results | Where-Object { $_.Notes.Count -gt 0 }
foreach ($sm in $specialModels) {
    Write-Host "`n  $($sm.Model):" -ForegroundColor Yellow
    foreach ($note in $sm.Notes) {
        Write-Host "    - $note" -ForegroundColor DarkYellow
    }
}

Write-Host "`n`nPara o codigo Java, modelos que precisam de max_completion_tokens:" -ForegroundColor White
$mctModels = $results | Where-Object { $_.MaxCompletionTokens -eq "Suportado" -and $_.MaxTokens -match "NAO" }
foreach ($m in $mctModels) {
    Write-Host "  - $($m.Model)" -ForegroundColor Green
}

Write-Host "`nModelos que NAO aceitam temperature customizado:" -ForegroundColor White
$noTempModels = $results | Where-Object { $_.Temperature -match "NAO" }
foreach ($m in $noTempModels) {
    Write-Host "  - $($m.Model)" -ForegroundColor Green
}

Write-Host "`nModelos compatíveis com formato antigo (max_tokens + temperature):" -ForegroundColor White
$oldFormatModels = $results | Where-Object { $_.MaxTokens -eq "Suportado" -and $_.Temperature -match "Suportado" }
foreach ($m in $oldFormatModels) {
    Write-Host "  - $($m.Model)" -ForegroundColor Green
}

Write-Host "`n"

