@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or not available in PATH.
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
  echo client\.env was not found. Using Vite defaults for the production build.
)

call node scripts/assert-port-free.mjs 5000
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

echo Building client for production...
call npm run build:client
if errorlevel 1 exit /b 1

set NODE_ENV=production
echo Starting TriCore Events in production mode...
echo Application Local: http://localhost:5000
echo Application LAN:   http://%LAN_IP%:5000
echo API LAN:           http://%LAN_IP%:5000/api
echo Atlas Public IP:   %PUBLIC_IP%
echo If MongoDB Atlas blocks startup, add %PUBLIC_IP% in Atlas Network Access.
echo Google OAuth Authorized JavaScript origins:
echo   - http://localhost:5173
echo   - http://%LAN_IP%:5173
echo   - http://localhost:5000
echo   - http://%LAN_IP%:5000
echo If Google consent screen is in Testing, add each Gmail account as a Test user.
call npm run start:server

endlocal
