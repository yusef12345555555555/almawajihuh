@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist node_modules\.bin\vite.cmd (
  echo ========================================
  echo Installing project dependencies...
  echo ========================================
  call npm install
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
)

if not exist node_modules\.bin\vite.cmd (
  echo.
  echo Vite is still missing after npm install.
  echo Run npm install manually and try again.
  pause
  exit /b 1
)

start "" http://localhost:3000
call npm run dev
