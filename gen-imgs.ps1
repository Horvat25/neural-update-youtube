# gen-imgs.ps1 - gera N imagens Soul V2 a partir de <dir>\prompts.txt (1 prompt por linha)
# Uso: .\gen-imgs.ps1 -dir "exports\<slug>" [-ratio 16:9]
#   -ratio 9:16 (padrao) para Short | 16:9 para video LONGO
param([string]$dir, [string]$ratio = '9:16')
$ErrorActionPreference = 'Continue'
$promptsFile = Join-Path $dir 'prompts.txt'
if (-not (Test-Path $promptsFile)) { Write-Host "sem prompts.txt em $dir"; exit 1 }
$prompts = Get-Content $promptsFile -Encoding UTF8 | Where-Object { $_.Trim() -ne '' }
# Assinatura visual cinematografica aplicada a TODAS as imagens (look de cinema coeso).
#
# CONSERTO 26/07/2026 - ESTA LINHA ERA A RAIZ DA GARATUJA (pseudo-latim cravado na imagem):
#  1) tinha JUNK TOKENS - "ultra-detailed, 8k, award-winning" - que os modelos de 2026
#     ignoram (pesquisa Rory Flynn, memoria prompt-imagem-ia). Trocados por detalhe fisico.
#  2) NAO TINHA NEGATIVE DE TEXTO. Sem isso o Soul V2 escreve garatuja na imagem.
#     O conserto tinha sido feito em higgsfield-images.js, mas o script que a gente USA
#     e este aqui - passou batido e a garatuja continuou saindo por semanas.
# REGRA: imagem de IA NUNCA leva texto. Todo texto do video e queimado por nos depois.
# 12/08/2026 - TIREI "shot on ARRI Alexa". Conferindo os frames de um longo de 70
# cenas, varias imagens vinham com "ARRI" e uma assinatura falsa escrita no canto:
# o modelo tratava o nome da CAMERA como marca a estampar. Nome de marca dentro do
# prompt e convite pra logotipo na imagem, por mais negative de texto que se ponha.
# Trocado por descricao otica pura, que e o que a gente queria de fato.
$style = ', anamorphic lens flare, dramatic volumetric god rays, cinematic teal and orange color grade, photorealistic texture with visible grain and floating dust particles, subtle chromatic aberration, shallow depth of field, epic atmosphere, no text, no words, no letters, no writing, no captions, no watermark, no signature, no logo, no brand name'
$i = 1
foreach ($p in $prompts) {
  $n = "img$i"
  # 13/08/2026 - AGORA CONFERE SE A IMAGEM EXISTENTE ESTA INTEIRA.
  # Antes bastava o arquivo existir pra pular. Um processo interrompido deixou
  # meia img3.png no disco; a rodada seguinte pulou ela "por economia", o clipe
  # 3 de 70 falhou no ffmpeg e o video de 15 min saiu com TUDO depois dos 40s
  # adiantado 13 segundos. Arquivo pela metade e' pior que arquivo ausente.
  $existente = Get-ChildItem -Path $dir -Filter "$n.*" -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '\.(png|jpe?g|webp)$' } | Select-Object -First 1
  if ($existente) {
    $inteira = & python -c "import sys;f=open(sys.argv[1],'rb');f.seek(-12,2);t=f.read(12);print('OK' if (t[4:8]==b'IEND' or t[-2:]==b'\xff\xd9') else 'RUIM')" $existente.FullName
    if ($inteira -match 'OK') {
      Write-Host "=== $n já existe, pulando (economia) ==="
      $i++; continue
    }
    Write-Host "=== $n existe mas está TRUNCADA - apagando e gerando de novo ==="
    Remove-Item $existente.FullName -Force
  }
  Write-Host "=== $n ==="
  # A Higgsfield retorna HTTP 502 intermitente — tentar até 4x com espera crescente
  # antes de desistir dessa imagem (o débito só ocorre quando gera de verdade).
  $url = ''
  for ($try = 1; $try -le 4 -and -not $url; $try++) {
    if ($try -gt 1) { Write-Host "  retry $try (502/sem URL)..."; Start-Sleep -Seconds ($try * 6) }
    $out = higgsfield generate create text2image_soul_v2 --prompt "$p$style" --aspect_ratio $ratio --quality 2k --wait --wait-timeout 5m 2>&1 | Out-String
    $url = [regex]::Match($out, 'https?://[^\s"]+\.(jpg|jpeg|png|webp)').Value
  }
  if ($url) {
    $ext = [System.IO.Path]::GetExtension($url.Split('?')[0]); if (-not $ext) { $ext = '.png' }
    # 30/07/2026 - CONSERTO: era Invoke-WebRequest, que TRUNCA PNG grande (3-4MB).
    # O arquivo ficava pela metade, o ffmpeg quebrava com "Invalid data found when
    # processing input" e o Short inteiro falhava DEPOIS de a imagem ter sido paga.
    # Agora: curl (nao trunca) + conferencia do chunk IEND (fim de PNG valido).
    # O gen-hero.ps1 ja fazia isso desde 25/jul; aqui tinha passado batido.
    $f = Join-Path $dir "$n$ext"
    # 12/08/2026 - O DOWNLOAD SAIU DO POWERSHELL. Num lote de 70 imagens, o
    # `curl.exe` chamado daqui truncou TODAS - a Higgsfield gerou e cobrou, e a
    # gente apagava. As mesmas URLs baixadas por Python vieram inteiras. O
    # baixa.py tambem repete o DOWNLOAD 4x (gratis) antes de desistir, em vez de
    # devolver o problema pra ca e tentar a GERACAO de novo (que cobra).
    $r = & python (Join-Path $PSScriptRoot 'baixa.py') $url $f 2>&1 | Out-String
    $bom = $r -match '^OK'
    if (-not $bom) { Write-Host "  download: $($r.Trim())" }
    if ($bom) {
      Write-Host "OK $n$ext ($([math]::Round((Get-Item $f).Length/1KB)) KB)"
    } else {
      if (Test-Path $f) { Remove-Item $f -Force }
      Write-Host "TRUNCADO ${n} - apagado. URL (baixe manual, NAO regere): $url"
    }
  } else { Write-Host "sem URL apos 4 tentativas: $($out.Substring(0,[Math]::Min(160,$out.Length)))" }
  $i++
}
Write-Host "=== FIM ==="