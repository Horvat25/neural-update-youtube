# _tarefa-marca-ia.ps1 — roda o _marca-sintetico.js pela tarefa do Windows "NeuralUpdate-MarcaIA".
#
# POR QUE (11/09/2026): faltaram ~170 vídeos públicos sem a declaração "Uso de IA" quando a quota
# diária do YouTube acabou. A quota volta às 04:00 (Brasília) e o PC não fica ligado de madrugada:
# a tarefa tem gatilho diário às 04:15 com "iniciar assim que possível", então roda quando o PC
# ligar. Quando termina tudo, ela mesma se remove — não fica tarefa morta no Windows.
$ErrorActionPreference = 'Continue'
Set-Location 'D:\Neural Update\YouTube'
$log = 'D:\Neural Update\YouTube\data\marca-ia-tarefa.log'
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }

"=== $(Get-Date -Format 'dd/MM/yyyy HH:mm') ===" | Out-File $log -Append -Encoding utf8
$saida = & $node _marca-sintetico.js --publicos 300 2>&1 | Out-String
($saida -split "`n" | Where-Object { $_ -notmatch '^✓' }) -join "`n" | Out-File $log -Append -Encoding utf8

$tudo = $false
if ($saida -match 'nada a marcar') { $tudo = $true }
elseif ($saida -match '(\d+)/(\d+) marcados agora' -and $Matches[1] -eq $Matches[2] -and $saida -notmatch 'quota') { $tudo = $true }
if ($tudo) {
  Unregister-ScheduledTask -TaskName 'NeuralUpdate-MarcaIA' -Confirm:$false
  "tudo marcado — tarefa removida" | Out-File $log -Append -Encoding utf8
}
