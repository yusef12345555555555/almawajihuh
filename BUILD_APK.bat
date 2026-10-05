@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo AL MWAJHA - Android APK Builder
echo ========================================
echo.

if not exist package.json (
  echo package.json not found. Open this file from the project root.
  pause
  exit /b 1
)

if not exist node_modules\.bin\vite.cmd (
  echo Installing npm dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo [1/4] Building the web assets for the Android package...
call npm run build
if errorlevel 1 (
  echo.
  echo Web build failed. Fix the errors above and try again.
  pause
  exit /b 1
)

echo.
echo [2/4] Syncing Capacitor with Android...
call npm run android:sync
if errorlevel 1 (
  echo.
  echo Capacitor sync failed.
  pause
  exit /b 1
)

echo.
echo [3/4] Building Android APK...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo.
  echo Android build failed.
  pause
  exit /b 1
)

cd ..
echo.
echo [4/4] APK created successfully.
echo.
echo APK:
echo %CD%\android\app\build\outputs\apk\debug\app-debug.apk
explorer "%CD%\android\app\build\outputs\apk\debug"
pause
