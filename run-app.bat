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

if not exist server\.env (
  echo Missing server\.env. Copy server\.env.example and configure it first.
  exit /b 1
)

if not exist client\.env (
  echo client\.env was not found. The app can still start, but Google OAuth may not work until you create it.
)

set "LAN_IP=127.0.0.1"
for /f %%i in ('powershell -NoProfile -Command "$cfg = Get-NetIPConfiguration ^| Where-Object { $_.IPv4Address -and $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } ^| Select-Object -First 1; if ($cfg) { $cfg.IPv4Address.IPAddress }"') do set "LAN_IP=%%i"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

set "PUBLIC_IP=Unknown"
for /f %%i in ('powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri ''https://api.ipify.org?format=text'' -TimeoutSec 10).Trim() } catch { ''Unknown'' }"') do set "PUBLIC_IP=%%i"
if "%PUBLIC_IP%"=="" set "PUBLIC_IP=Unknown"

set "HOST=0.0.0.0"
set "CLIENT_URL=http://localhost:5173,http://%LAN_IP%:5173,http://localhost:5000,http://%LAN_IP%:5000"
set "VITE_API_URL="
set "VITE_GOOGLE_ALLOWED_ORIGINS=http://localhost:5173,http://%LAN_IP%:5173,http://localhost:5000,http://%LAN_IP%:5000"

if /I "%~1"=="--memory" (
  set "MONGODB_ALLOW_MEMORY_FALLBACK=true"
)

echo Starting TriCore Events in development mode...
echo Frontend Local: http://localhost:5173
echo Frontend LAN:   http://%LAN_IP%:5173
echo Backend Local:  http://localhost:5000
echo Backend LAN:    http://%LAN_IP%:5000
echo API LAN:        http://%LAN_IP%:5000/api
echo Atlas Public IP: %PUBLIC_IP%
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
