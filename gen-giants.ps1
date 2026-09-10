# gen-giants.ps1 — 4 imagens Soul V2 (robôs gigantes de combate, conteúdo original) 9:16 2k
$ErrorActionPreference = 'Continue'
$dir = "C:\Users\Mateus Horvat\neural-update-youtube\exports\higgsfield-test\giants"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$imgs = @(
  @{ n='img1'; p='Photorealistic cinematic giant humanoid combat robot entering a packed futuristic fighting arena at night, massive towering scale, dramatic spotlights and lens flares, roaring crowd silhouettes below, hyper-detailed brushed steel armor, epic, film grain' },
  @{ n='img2'; p='Photorealistic cinematic low-angle close-up of a colossal battle robot mechanical face and chest, glowing blue eyes, intricate steel armor plating, sparks flying, dramatic rim lighting, imposing, hyper-detailed' },
  @{ n='img3'; p='Photorealistic cinematic two giant humanoid robots trading heavy powerful punches inside a brightly lit combat arena, flying sparks and metal debris, dynamic motion blur, roaring packed crowd, hyper-detailed steel, epic scale' },
  @{ n='img4'; p='Photorealistic cinematic victorious giant combat robot raising its fist in triumph inside a packed roaring arena, explosion of golden light and falling confetti, ecstatic crowd, triumphant mood, dramatic, hyper-detailed' }
)
foreach ($s in $imgs) {
  Write-Host "=== $($s.n) ==="
  $out = higgsfield generate create text2image_soul_v2 --prompt $s.p --aspect_ratio 9:16 --quality 2k --wait --wait-timeout 5m 2>&1 | Out-String
  $url = [regex]::Match($out, 'https?://[^\s"]+\.(jpg|jpeg|png|webp)').Value
  if ($url) {
    $ext = [System.IO.Path]::GetExtension($url.Split('?')[0]); if (-not $ext) { $ext = '.png' }
    try { $f = Join-Path $dir "$($s.n)$ext"; Invoke-WebRequest $url -OutFile $f -UseBasicParsing -TimeoutSec 90; Write-Host "OK $($s.n)$ext ($([math]::Round((Get-Item $f).Length/1KB)) KB)" } catch { Write-Host "FALHA download $($s.n): $($_.Exception.Message)" }
  } else { Write-Host "sem URL. Trecho: $($out.Substring(0,[Math]::Min(180,$out.Length)))" }
}
Write-Host "=== FIM imagens gigantes ==="