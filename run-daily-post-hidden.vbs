Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\Mateus Horvat\neural-update-youtube"
sh.Run """C:\Program Files\nodejs\node.exe"" daily-post.js --public >> ""C:\Users\Mateus Horvat\neural-update-youtube\daily-post.log"" 2>&1", 0, False
