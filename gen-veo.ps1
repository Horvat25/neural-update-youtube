# gen-veo.ps1 — gera N clipes Veo 3.1 Lite (9:16) de <dir>\veo-prompts.txt (1 prompt/linha) → scene1.mp4, scene2.mp4...
# Com retry pra HTTP 502 (servidor Higgsfield instável). Uso: .\gen-veo.ps1 <dir> [duracao=8]
param([string]$dir, [int]$dur = 8)
$ErrorActionPreference = 'Continue'
$pf = Join-Path $dir 'veo-prompts.txt'
if (-not (Test-Path $pf)) { Write-Host "sem veo-prompts.txt em $dir"; exit 1 }
$prompts = Get-Content $pf -Encoding UTF8 | Where-Object { $_.Trim() -ne '' }
$i = 1
foreach ($p in $prompts) {
  $scene = "scene$i"
  $dest = Join-Path $dir "$scene.mp4"
  if (Test-Path $dest) { Write-Host "== $scene ja existe, pulando =="; $i++; continue }
  $ok = $false
  for ($t = 1; $t -le 4; $t++) {
    Write-Host "=== $scene (tentativa $t) ==="
    $out = higgsfield generate create veo3_1_lite --prompt "$p" --duration $dur --aspect_ratio 9:16 --wait --wait-timeout 15m --wait-interval 10s 2>&1 | Out-String
    $url = [regex]::Match($out, 'https?://[^\s"]+\.mp4').Value
    if ($url) {
      try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 180
        Write-Host "OK $scene ($([math]::Round((Get-Item $dest).Length/1MB,2)) MB)"
        $ok = $true; break
      } catch { Write-Host "erro download ${scene}: $($_.Exception.Message)" }
    } else {
      Write-Host "sem URL (provavel 502). Trecho: $($out.Substring(0,[Math]::Min(160,$out.Length)))"
    }
    Start-Sleep -Seconds 25
  }
  if (-not $ok) { Write-Host "FALHOU $scene apos 4 tentativas" }
  $i++
}
Write-Host "=== FIM ==="
