# gen-civ.ps1 — gera a cena da civilização (Fermi) com retry em caso de 502.
$ErrorActionPreference = 'Continue'
$dir = "C:\Users\Mateus Horvat\neural-update-youtube\exports\higgsfield-test\fermi-final"
$prompt = "A breathtaking futuristic city on a distant planet at dusk, glowing illuminated skyscrapers and towers, massive orbital rings arcing across the sky, small flying vehicles between buildings, advanced civilization, cinematic sci-fi, hyper-detailed, photorealistic, epic scale"
$ok = $false
for ($i = 1; $i -le 4; $i++) {
  Write-Host "=== Tentativa $i (civilizacao) ==="
  $out = higgsfield generate create veo3_1_lite --prompt $prompt --duration 8 --aspect_ratio 9:16 --wait --wait-timeout 15m --wait-interval 10s 2>&1 | Out-String
  $url = [regex]::Match($out, 'https?://[^\s"]+\.mp4').Value
  if ($url) {
    try {
      Invoke-WebRequest -Uri $url -OutFile "$dir\scene2.mp4" -UseBasicParsing -TimeoutSec 180
      Write-Host "OK civilizacao -> scene2.mp4 ($([math]::Round((Get-Item "$dir\scene2.mp4").Length/1MB,2)) MB)"
      $ok = $true; break
    } catch { Write-Host "erro download: $($_.Exception.Message)" }
  } else {
    Write-Host "sem URL (provavel 502). Trecho: $($out.Substring(0,[Math]::Min(180,$out.Length)))"
  }
  Start-Sleep -Seconds 25
}
if ($ok) { Write-Host "=== CIVILIZACAO PRONTA ===" } else { Write-Host "=== FALHOU apos 4 tentativas ===" }