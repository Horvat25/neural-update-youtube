# gen-scenes.ps1 — gera N clipes Veo (uma cena cada) e baixa em exports/.../scenes-fermi/
$ErrorActionPreference = 'Continue'
$dir = "C:\Users\Mateus Horvat\neural-update-youtube\exports\higgsfield-test\scenes-fermi"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$scenes = @(
  @{ n='scene1'; p='Cinematic slow majestic flythrough of the Milky Way galaxy, billions of glowing stars and swirling colorful nebulae, immense cosmic scale, deep space, hyper-detailed, photorealistic, volumetric light, awe-inspiring' },
  @{ n='scene2'; p='A breathtaking advanced alien civilization on a distant exoplanet, glowing futuristic megastructures, orbital rings and city lights at dusk, sci-fi grandeur, cinematic, hyper-detailed, photorealistic, epic scale' },
  @{ n='scene3'; p='A lone giant radio telescope dish on Earth at night slowly pointing up at a vast silent empty starry sky, profound cosmic solitude, no signal, eerie stillness, faint stars, cinematic, hyper-detailed, photorealistic' }
)
foreach ($s in $scenes) {
  Write-Host "=== Gerando $($s.n) ==="
  $out = higgsfield generate create veo3_1_lite --prompt $s.p --duration 8 --aspect_ratio 9:16 --wait --wait-timeout 18m --wait-interval 10s 2>&1 | Out-String
  $url = [regex]::Match($out, 'https?://[^\s"]+\.mp4').Value
  if ($url) {
    try {
      $f = Join-Path $dir "$($s.n).mp4"
      Invoke-WebRequest -Uri $url -OutFile $f -UseBasicParsing -TimeoutSec 180
      Write-Host "OK $($s.n) baixado ($([math]::Round((Get-Item $f).Length/1MB,2)) MB)"
    } catch { Write-Host "FALHA download $($s.n): $($_.Exception.Message)" }
  } else { Write-Host "FALHA $($s.n): sem URL no retorno." }
}
Write-Host "=== FIM geracao cenas ==="