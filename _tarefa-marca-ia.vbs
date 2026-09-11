' Dispara o _tarefa-marca-ia.ps1 sem abrir janela (tarefa NeuralUpdate-MarcaIA, 11/09/2026).
Set sh = CreateObject("WScript.Shell")
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\Neural Update\YouTube\_tarefa-marca-ia.ps1""", 0, True
