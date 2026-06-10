' Neural Update (YouTube) - catch-up OCULTO + GUARDA DE JOGO.
' Se houver jogo rodando, NAO processa a fila (recupera depois). Sem janela.
Option Explicit
Dim sh, wmi, fso, wd, logPath, nodeExe, cmdLine, games, f
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

wd = "C:\Users\Mateus Horvat\neural-update-youtube"
logPath = wd & "\schedule.log"
nodeExe = Chr(34) & "C:\Program Files\nodejs\node.exe" & Chr(34)

games = "Name='League of Legends.exe' OR Name='LeagueClient.exe' OR " & _
        "Name='VALORANT-Win64-Shipping.exe' OR Name='csgo.exe' OR " & _
        "Name='cs2.exe' OR Name='FortniteClient-Win64-Shipping.exe'"

Set wmi = GetObject("winmgmts:\\.\root\cimv2")
If wmi.ExecQuery("SELECT Name FROM Win32_Process WHERE " & games).Count > 0 Then
  Set f = fso.OpenTextFile(logPath, 8, True)
  f.WriteLine Now & " [guard] jogo rodando - catch-up pulado"
  f.Close
  WScript.Quit 0
End If

sh.CurrentDirectory = wd
cmdLine = "cmd /c " & Chr(34) & nodeExe & " process-schedule.js >> " & Chr(34) & logPath & Chr(34) & " 2>&1" & Chr(34)
sh.Run cmdLine, 0, False
