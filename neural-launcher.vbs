' Motor do "Iniciar Neural Update" - sobe os 3 apps OCULTOS (sem janela).
' YouTube Shorts (3001) + TikTok (3000) + Neural Analytics (4050)
' e abre os paineis. Se algum ja estiver rodando, a copia nova morre sozinha (porta em uso).
Set sh = CreateObject("WScript.Shell")
nodeExe = """C:\Program Files\nodejs\node.exe"""
operaExe = """C:\Users\Mateus Horvat\AppData\Local\Programs\Opera\opera.exe"""

sh.CurrentDirectory = "C:\Users\Mateus Horvat\neural-update-youtube"
sh.Run nodeExe & " server\dashboard.js", 0, False

sh.CurrentDirectory = "C:\Users\Mateus Horvat\neural-update-tiktok"
sh.Run nodeExe & " dashboard.js", 0, False

sh.CurrentDirectory = "C:\Users\Mateus Horvat\OneDrive\Documentos\Neural Analytics"
sh.Run nodeExe & " server.js", 0, False

' Espera 8s os servidores subirem e abre os 3 paineis no OPERA (em abas)
WScript.Sleep 8000
sh.Run operaExe & " http://localhost:3001 http://localhost:3000 http://localhost:4050", 1, False
