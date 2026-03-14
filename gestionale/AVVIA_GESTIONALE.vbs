Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strFile = strDir & "\gestionale.html"
objShell.Run """" & strFile & """", 1, False
