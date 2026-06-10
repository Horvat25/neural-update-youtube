' Motor do "Iniciar Neural Update" - sobe os 3 apps OCULTOS (sem janela).
' Banco de Imagens (3030) + YouTube Shorts (3001) + TikTok (3000) e abre os paineis.
' Se algum ja estiver rodando, a copia nova morre sozinha (porta em uso) - sem problema.
Set sh = CreateObject("WScript.Shell")
nodeExe = """C:\Program Files\nodejs\node.exe"""

sh.CurrentDirectory = "C:\Users\Mateus Horvat\neural-image-agent"
sh.Run nodeExe & " src\index.js", 0, False

sh.CurrentDirectory = "C:\Users\Mateus Horvat\neural-update-youtube"
sh.Run nodeExe & " server\dashboard.js", 0, False

sh.CurrentDirectory = "C:\Users\Mateus Horvat\neural-update-tiktok"
sh.Run nodeExe & " dashboard.js", 0, False

' Espera 8s os servidores subirem e abre os 3 paineis no navegador
WScript.Sleep 8000
sh.Run "http://localhost:3030"
sh.Run "http://localhost:3001"
sh.Run "http://localhost:3000"
