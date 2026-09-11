# _tarefa-marca-ia.ps1 - roda o _marca-sintetico.js pela tarefa do Windows "NeuralUpdate-MarcaIA".
#
# POR QUE (11/09/2026): faltaram ~170 videos publicos sem a declaracao "Uso de IA" quando a quota
# diaria do YouTube acabou. A quota volta as 04:00 (Brasilia) e o PC nao fica ligado de madrugada:
# a tarefa tem gatilho diario as 04:15 com "iniciar assim que possivel", entao roda quando o PC
# ligar. Quando termina tudo, ela mesma se remove - nao fica tarefa morta no Windows.
#
# ATENCAO: este arquivo tem que ser SO ASCII. O Windows PowerShell 5.1 le script sem BOM como
# ANSI, e um travessao ou um "check" viram aspas curvas no meio da string (quebrou em 11/09).
$ErrorActionPreference = 'Continue'
Set-Location 'D:\Neural Update\YouTube'
$log = 'D:\Neural Update\YouTube\data\marca-ia-tarefa.log'
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
$check = [string][char]0x2713

"=== $(Get-Date -Format 'dd/MM/yyyy HH:mm') ===" | Out-File $log -Append -Encoding utf8
$saida = & $node _marca-sintetico.js --publicos 300 2>&1 | Out-String
($saida -split "`n" | Where-Object { -not $_.StartsWith($check) }) -join "`n" | Out-File $log -Append -Encoding utf8

$tudo = $false
if ($saida -match 'nada a marcar') { $tudo = $true }
elseif ($saida -match '(\d+)/(\d+) marcados agora' -and $Matches[1] -eq $Matches[2] -and $saida -notmatch 'quota') { $tudo = $true }
if ($tudo) {
  Unregister-ScheduledTask -TaskName 'NeuralUpdate-MarcaIA' -Confirm:$false
  'tudo marcado - tarefa removida' | Out-File $log -Append -Encoding utf8
}
