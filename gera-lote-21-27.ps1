$ErrorActionPreference = 'Continue'
$slugs = Get-Content "lotes\_ordem.txt" | Where-Object { $_.Trim() -ne '' }
foreach ($s in $slugs) {
  Write-Output "######## $s"
  .\gen-imgs.ps1 -dir "exports\$s"
}
Write-Output "######## LOTE COMPLETO"
