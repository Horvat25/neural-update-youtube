# gen-lote-numeros.ps1 — gera as imagens de todas as pastas da série + aula, em sequência.
# gen-imgs.ps1 pula imagens que já existem (economia), então é seguro re-rodar.
param([string[]]$dirs)
Set-Location "C:\Users\Mateus Horvat\neural-update-youtube"
if (-not $dirs -or $dirs.Count -eq 0) {
  $dirs = @(
    'exports\n2-inflacao','exports\n3-um-segundo','exports\n4-tres-minutos','exports\n5-primeira-luz',
    'exports\n6-primeira-estrela','exports\n7-galaxias','exports\n8-nasce-o-sol','exports\n9-agora',
    'exports\n10-oceanos','exports\n11-andromeda','exports\n12-morte-do-sol','exports\n13-ultima-estrela',
    'exports\n14-ultimo-buraco-negro','exports\n15-morte-termica','exports\pl4-zona-habitavel'
  )
}
$before = (higgsfield account status --json | ConvertFrom-Json).credits
Write-Host "===== SALDO INICIAL: $before ====="
foreach ($d in $dirs) {
  Write-Host "########## $d ##########"
  .\gen-imgs.ps1 -dir $d
}
$after = (higgsfield account status --json | ConvertFrom-Json).credits
Write-Host "===== SALDO FINAL: $after | GASTO LOTE: $([math]::Round($before-$after,3)) ====="
Write-Host "===== LOTE COMPLETO ====="
