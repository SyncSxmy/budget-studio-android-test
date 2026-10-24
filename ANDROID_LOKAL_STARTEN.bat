@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ======================================
echo    Budget Studio - Android Testbuild
 echo ======================================
echo Voraussetzung: Node.js 22+, Android Studio mit Android SDK
where npm >nul 2>&1
if errorlevel 1 (
  echo FEHLER: Node.js/npm fehlt. Bitte zuerst installieren.
  pause
  exit /b 1
)
call npm install --no-audit --no-fund
if errorlevel 1 goto :error
if not exist android (call npx cap add android)
if errorlevel 1 goto :error
call npx cap sync android
if errorlevel 1 goto :error
call npx cap open android
if errorlevel 1 goto :error
echo Android Studio startet. Emulator auswaehlen und Play klicken.
pause
exit /b 0
:error
echo Der Aufbau ist fehlgeschlagen. Bitte Fehlermeldung notieren.
pause
exit /b 1
