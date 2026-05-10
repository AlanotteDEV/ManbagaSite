@echo off
echo Compilazione GESTIONALE_MANBAGA.exe...

REM Cerca il compilatore C# (csc.exe) nelle versioni .NET Framework installate
set CSC=
set FWDIR=
for /d %%d in ("%WINDIR%\Microsoft.NET\Framework64\v4*") do (set CSC=%%d\csc.exe & set FWDIR=%%d)
if not exist "%CSC%" (
  for /d %%d in ("%WINDIR%\Microsoft.NET\Framework\v4*") do (set CSC=%%d\csc.exe & set FWDIR=%%d)
)

if not exist "%CSC%" (
  echo ERRORE: compilatore csc.exe non trovato.
  pause
  exit /b 1
)

REM Converte il PNG in ICO tramite PowerShell
set PNG=%~dp0..\WhatsApp_Image_2026-03-10_at_11.15.27-removebg-preview.png
set ICO=%~dp0logo.ico

echo Conversione PNG -> ICO...
powershell -NoProfile -Command ^
  "Add-Type -AssemblyName System.Drawing;" ^
  "$src = [System.Drawing.Image]::FromFile('%PNG%');" ^
  "$bmp = New-Object System.Drawing.Bitmap($src, 256, 256);" ^
  "$hIcon = $bmp.GetHicon();" ^
  "$icon = [System.Drawing.Icon]::FromHandle($hIcon);" ^
  "$fs = New-Object System.IO.FileStream('%ICO%', [System.IO.FileMode]::Create);" ^
  "$icon.Save($fs);" ^
  "$fs.Close()"

REM Compila l'exe con l'icona
if exist "%ICO%" (
  "%CSC%" /target:winexe /out:"%~dp0GESTIONALE_MANBAGA.exe" /win32icon:"%ICO%" /reference:"%FWDIR%\System.Windows.Forms.dll" "%~dp0launcher.cs"
) else (
  echo Icona non trovata, compilo senza icona...
  "%CSC%" /target:winexe /out:"%~dp0GESTIONALE_MANBAGA.exe" /reference:"%FWDIR%\System.Windows.Forms.dll" "%~dp0launcher.cs"
)

REM Rimuove il file ico temporaneo
if exist "%ICO%" del "%ICO%"

:done
if exist "%~dp0GESTIONALE_MANBAGA.exe" (
  echo.
  echo [OK] GESTIONALE_MANBAGA.exe creato con successo!
) else (
  echo.
  echo ERRORE: compilazione fallita.
)
pause
