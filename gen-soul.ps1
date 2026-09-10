# gen-soul.ps1 — gera N imagens Soul V2 (9:16, 2k) e baixa em soul-space/
$ErrorActionPreference = 'Continue'
$dir = "C:\Users\Mateus Horvat\neural-update-youtube\exports\higgsfield-test\soul-space"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$imgs = @(
  @{ n='img1'; p='Photorealistic cinematic astronaut floating weightless in outer space, planet Earth glowing blue in the background, vast starfield, dramatic rim lighting, hyper-detailed, film grain' },
  @{ n='img2'; p='Photorealistic cinematic close-up of an astronaut without a helmet exposed to the vacuum of space, shocked frightened gasping expression, cold dramatic lighting, stars and darkness behind, hyper-detailed' },
  @{ n='img3'; p='Photorealistic cinematic lone astronaut drifting away unconscious into the dark empty void of deep space, small distant Earth, eerie silence and isolation, dramatic moody lighting, hyper-detailed' }
)
foreach ($s in $imgs) {
  Write-Host "=== $($s.n) ==="
  $out = higgsfield generate create text2image_soul_v2 --prompt $s.p --aspect_ratio 9:16 --quality 2k --wait --wait-timeout 5m 2>&1 | Out-String
  $url = [regex]::Match($out, 'https?://[^\s"]+\.(jpg|jpeg|png|webp)').Value
  if ($url) {
    $ext = [System.IO.Path]::GetExtension($url.Split('?')[0]); if (-not $ext) { $ext = '.jpg' }
    try { $f = Join-Path $dir "$($s.n)$ext"; Invoke-WebRequest $url -OutFile $f -UseBasicParsing -TimeoutSec 90; Write-Host "OK $($s.n)$ext ($([math]::Round((Get-Item $f).Length/1KB)) KB)" } catch { Write-Host "FALHA download $($s.n): $($_.Exception.Message)" }
  } else { Write-Host "sem URL. Trecho: $($out.Substring(0,[Math]::Min(180,$out.Length)))" }
}
Write-Host "=== FIM imagens Soul V2 ==="