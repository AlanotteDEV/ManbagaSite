Set objShell = CreateObject("WScript.Shell")
Set objFSO   = CreateObject("Scripting.FileSystemObject")

strDir     = objFSO.GetParentFolderName(WScript.ScriptFullName)
strRoot    = objFSO.GetParentFolderName(strDir)
strFile    = strDir & "\gestionale.html"

' --- Aggiornamento automatico via git pull ---
objShell.CurrentDirectory = strRoot
ret = objShell.Run "git pull --ff-only", 0, True   ' 0 = finestra nascosta, True = attendi

' --- Apri il gestionale ---
objShell.Run """" & strFile & """", 1, False
