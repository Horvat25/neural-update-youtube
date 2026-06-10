Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\Mateus Horvat\neural-update-youtube"
sh.Run """C:\Program Files\nodejs\node.exe"" process-schedule.js >> ""C:\Users\Mateus Horvat\neural-update-youtube\schedule.log"" 2>&1", 0, False
