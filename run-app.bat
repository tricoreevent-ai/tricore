@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Error: Node.js is required to run this application. Please install Node.js from https://nodejs.org/
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm is required to run this application. Please ensure npm is installed with Node.js.
  exit /b 1
)

if not exist node_modules (
  echo Installing workspace dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if not exist server\node_modules (
  echo Installing server dependencies...
  call npm --prefix server install --omit=dev
  if errorlevel 1 exit /b 1
)

if not exist client\node_modules (
  echo Installing client dependencies...
  call npm --prefix client install --include=dev
  if errorlevel 1 exit /b 1
)

if not exist server\.env (
  echo Missing server\.env. Copy server\.env.example and configure it first.
  exit /b 1
)

if not exist client\.env (
  echo client\.env was not found. The app can still start, but Google OAuth may not work until you create it.
)

call node scripts/assert-port-free.mjs 5000 5173
if errorlevel 1 exit /b 1

set "LAN_IP=127.0.0.1"
for /f %%i in ('node scripts/get-network-info.mjs lan') do set "LAN_IP=%%i"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

set "PUBLIC_IP=Unknown"
for /f %%i in ('node scripts/get-network-info.mjs public') do set "PUBLIC_IP=%%i"
if "%PUBLIC_IP%"=="" set "PUBLIC_IP=Unknown"

set "HOST=0.0.0.0"
set "CLIENT_URL=http://localhost:5173,http://%LAN_IP%:5173,http://localhost:5000,http://%LAN_IP%:5000"
set "VITE_API_URL="
set "VITE_GOOGLE_ALLOWED_ORIGINS=http://localhost:5173,http://%LAN_IP%:5173,http://localhost:5000,http://%LAN_IP%:5000"

if /I "%~1"=="--memory" (
  if not exist server\node_modules\mongodb-memory-server (
    echo Installing server development dependencies for temporary memory mode...
    call npm --prefix server install
    if errorlevel 1 exit /b 1
  )
  set "MONGODB_ALLOW_MEMORY_FALLBACK=true"
)

echo Starting TriCore Events in development mode...
echo Frontend Local: http://localhost:5173
echo Frontend LAN:   http://%LAN_IP%:5173
echo Backend Local:  http://localhost:5000
echo Backend LAN:    http://%LAN_IP%:5000
echo API LAN:        http://%LAN_IP%:5000/api
echo Atlas Public IP: %PUBLIC_IP%
echo Rotating logs:  logs\system*.log ^(1 MB each, 10 files max^)
if /I "%~1"=="--memory" (
  echo Temporary in-memory MongoDB fallback is ENABLED for this run.
  echo Data created in this mode is not persistent.
) else (
  echo Using the persisted MongoDB configured in server\.env.
  echo If MongoDB Atlas is unreachable, startup will stop instead of showing an empty temporary database.
  echo Use run-app.bat --memory only when you intentionally want temporary local data.
)
echo If MongoDB Atlas blocks startup, add %PUBLIC_IP% in Atlas Network Access.
echo Google OAuth Authorized JavaScript origins:
echo   - http://localhost:5173
echo   - http://%LAN_IP%:5173
echo   - http://localhost:5000
echo   - http://%LAN_IP%:5000
echo If Google consent screen is in Testing, add each Gmail account as a Test user.
call npm run dev

endlocal
