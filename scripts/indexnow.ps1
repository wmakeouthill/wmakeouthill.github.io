# Avisa o IndexNow (Bing, Yandex, etc.) que as URLs do site mudaram, para
# forçar um recrawl rápido. Lê as URLs do próprio sitemap, então fica sempre
# em sincronia. Rode DEPOIS de fazer deploy de uma alteração.
#
#   powershell -ExecutionPolicy Bypass -File scripts\indexnow.ps1
#
# O arquivo de chave precisa estar publicado em:
#   https://wmakeouthill.dev/<key>.txt   (frontend/public/<key>.txt)

$ErrorActionPreference = 'Stop'

$host_     = 'wmakeouthill.dev'
$key       = '752a295029484d62ae869e29c22dc209'
$keyLoc    = "https://$host_/$key.txt"
$sitemap   = "https://$host_/sitemap.xml"
$endpoint  = 'https://api.indexnow.org/indexnow'

Write-Host "Lendo URLs de $sitemap ..."
[xml]$xml = (Invoke-WebRequest -Uri $sitemap -UseBasicParsing).Content
$urls = $xml.urlset.url.loc | Where-Object { $_ }
Write-Host ("Encontradas {0} URLs." -f $urls.Count)

$body = @{
  host        = $host_
  key         = $key
  keyLocation = $keyLoc
  urlList     = @($urls)
} | ConvertTo-Json -Depth 4

Write-Host "Enviando ao IndexNow ..."
$resp = Invoke-WebRequest -Uri $endpoint -Method Post -ContentType 'application/json; charset=utf-8' -Body $body -UseBasicParsing
Write-Host ("Resposta: HTTP {0} {1}" -f [int]$resp.StatusCode, $resp.StatusDescription)
Write-Host "200/202 = aceito. Recrawl costuma ocorrer em horas."
