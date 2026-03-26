@echo off
setlocal
cd /d "%~dp0"

echo TriCore Events Windows Installer
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Error: Node.js is required. Install Node.js 18 or newer from https://nodejs.org/
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm is required and was not found in PATH.
  exit /b 1
)

if not exist server\.env (
  if exist server\.env.example (
    copy /y server\.env.example server\.env >nul
    echo Created server\.env from server\.env.example
  ) else (
    echo Warning: server\.env.example was not found.
  )
)

if not exist client\.env (
  if exist client\.env.example (
    copy /y client\.env.example client\.env >nul
    echo Created client\.env from client\.env.example
  ) else (
    echo Warning: client\.env.example was not found.
  )
)

echo.
echo Installing workspace dependencies...
call npm install
if errorlevel 1 (
  echo Error: npm install failed.
  exit /b 1
)

echo.
echo Building the client...
call npm run build
if errorlevel 1 (
  echo Error: client build failed.
  exit /b 1
)

echo.
echo Installation complete.
echo Next steps:
echo 1. Update server\.env with MongoDB, SMTP, and Razorpay credentials.
echo 2. Update client\.env if Google OAuth or custom API URLs are needed.
echo 3. Run run-app.bat for development mode.
echo 4. Or run npm run start:server to start the API only.
echo.
echo Tip: use build-deploy.bat when you want a deployment ZIP package.

if /I "%~1"=="--start" (
  echo.
  echo Starting the application...
  call run-app.bat
)

endlocal
