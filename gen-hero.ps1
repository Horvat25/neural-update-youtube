# gen-hero.ps1 - gera UMA imagem num modelo caro (Seedream).
#
# ⚠️ 29/07/2026 - USO RESTRITO A THUMBNAIL DE VIDEO LONGO (teto 5 creditos).
# NAO usar mais em cena de Short nem de longo: a regra vigente e TODA cena a
# 0,12cr (Soul V2, via gen-imgs.ps1) + 2 cenas vindas do banco. A thumbnail do
# longo e a unica excecao porque e ela que decide o clique na busca.
# Ver a "REGRA DE CUSTO VIGENTE" no CLAUDE.md.
#
# Uso: .\gen-hero.ps1 -dir "exports\<slug>" [-img 1] [-model seedream_v5_pro]
# ECONOMIA: UMA geracao = UMA cobranca. NAO re-gera em cima de "sem URL" (isso cobrava 2-3x).
# Parseia a URL do JSON. Se a imagem ja existe, pula (0 credito).
# ⚠️ 29/07: o -ratio existe porque este script cravava 9:16 e a thumbnail de
# LONGO saiu vertical (gerou, cobrou 3cr, e nao servia). Passar -ratio 16:9.
param([string]$dir, [int]$img = 1, [string]$model = 'seedream_v5_pro', [string]$ratio = '9:16')
$ErrorActionPreference = 'Continue'
$promptsFile = Join-Path $dir 'prompts.txt'
if (-not (Test-Path $promptsFile)) { Write-Host "sem prompts.txt em $dir"; exit 1 }
$linhas = @(Get-Content $promptsFile -Encoding UTF8 | Where-Object { $_.Trim() -ne '' })
if ($img -lt 1 -or $img -gt $linhas.Count) { Write-Host "img $img fora do range (1..$($linhas.Count))"; exit 1 }
$p = $linhas[$img - 1]
$outf = Join-Path $dir "img$img.png"
if (Test-Path $outf) { Write-Host "img$img ja existe (0 credito)"; exit 0 }
Write-Host "=== PREMIUM img$img ($model) em $dir - 1 geracao, 1 cobranca ==="
$raw = higgsfield generate create $model --prompt "$p" --aspect_ratio $ratio --resolution 2k --wait --wait-timeout 5m --json 2>&1 | Out-String
$url = ''
try {
  $jsonStart = $raw.IndexOf('{')
  if ($jsonStart -ge 0) {
    $obj = $raw.Substring($jsonStart) | ConvertFrom-Json
    if ($obj.results.rawUrl) { $url = $obj.results.rawUrl }
    elseif ($obj.rawUrl)     { $url = $obj.rawUrl }
  }
} catch {}
if (-not $url) { $url = [regex]::Match($raw, 'https?://[^\s"]+\.(jpg|jpeg|png|webp)').Value }
if ($url) {
  try {
    # curl em vez de Invoke-WebRequest: o IWR falha/trunca nos PNG grandes (6-7MB)
    # do Seedream (erro real 25/jul: 4 downloads seguidos falharam; curl baixou os 4 ok).
    curl.exe -sS -L --retry 3 -o $outf $url
    if (-not (Test-Path $outf)) { throw "curl nao gerou arquivo" }
    # Valida se o PNG baixou INTEIRO (precisa terminar com o chunk IEND).
    # Download cortado no meio gera imagem truncada que quebra o ffmpeg com
    # "Failed to reallocate parser buffer" na cena 1 (erro real 25/jul).
    # le SO os ultimos 8 bytes (ReadAllBytes num PNG de 6MB estoura o pipeline do PS 5.1)
    # 30/07: lia 8 bytes e comparava [4..7], que e o CRC, nao o 'IEND'. Nos 12
    # bytes finais ([tamanho][IEND][CRC]) o 'IEND' fica em [4..7]. Este check
    # nunca havia sido exercitado aqui; a mesma confusao apagou 33 imagens boas
    # no gen-imgs. Corrigido nos tres arquivos.
    $fs = [System.IO.File]::OpenRead($outf)
    $buf = New-Object byte[] 12
    $null = $fs.Seek(-12, [System.IO.SeekOrigin]::End)
    $null = $fs.Read($buf, 0, 12)
    $fs.Close()
    $sig = ($buf[4..7] | ForEach-Object { [char]$_ }) -join ''
    if ($sig -ne 'IEND') {
      Remove-Item $outf -Force
      Write-Host "TRUNCADO (sem IEND) - arquivo apagado. Rode de novo (vai re-cobrar). URL: $url"
      exit 1
    }
    Write-Host "OK img$img.png ($([math]::Round((Get-Item $outf).Length/1KB)) KB) [$model] IEND ok"
  }
  catch { Write-Host "GEROU (creditou) mas FALHOU download. URL: $url - baixe manual, NAO rode de novo." }
} else {
  Write-Host "SEM URL. NAO vou re-gerar (evita cobranca dupla). Retorno:"
  Write-Host $raw.Substring(0, [Math]::Min(300, $raw.Length))
}
