@echo off
REM Crea un collegamento (shortcut) sul Desktop che punta al file exe nella cartella gestionale

set EXE_PATH=%~dp0GESTIONALE_MANBAGA.exe
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Gestionale MANBAGA.lnk

if not exist "%EXE_PATH%" (
  echo ERRORE: GESTIONALE_MANBAGA.exe non trovato.
  echo Esegui prima COMPILA_EXE.bat per crearlo.
  pause
  exit /b 1
)

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut('%SHORTCUT_PATH%');" ^
  "$lnk.TargetPath = '%EXE_PATH%';" ^
  "$lnk.WorkingDirectory = '%~dp0';" ^
  "$lnk.Description = 'Gestionale MANBAGA Comics & Games';" ^
  "$lnk.Save()"

if exist "%SHORTCUT_PATH%" (
  echo.
  echo ✓ Collegamento creato sul Desktop: "Gestionale MANBAGA"
) else (
  echo ERRORE: creazione collegamento fallita.
)
pause
