@echo off
setlocal enabledelayedexpansion

echo Cleaning unwanted files and build artifacts...

REM Kill all Node/npm processes to release file locks
echo Terminating Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.cmd 2>nul
taskkill /F /IM node-gyp.cmd 2>nul
timeout /t 3 /nobreak

REM Use PowerShell to aggressively remove node_modules (more reliable on Windows)
echo Removing node_modules directories (using PowerShell)...
powershell -NoProfile -Command "if (Test-Path 'node_modules') { Remove-Item -Path 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Removed root node_modules' }"
powershell -NoProfile -Command "if (Test-Path 'client\node_modules') { Remove-Item -Path 'client\node_modules' -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Removed client/node_modules' }"
powershell -NoProfile -Command "if (Test-Path 'server\node_modules') { Remove-Item -Path 'server\node_modules' -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Removed server/node_modules' }"
timeout /t 1 /nobreak

REM Clear npm cache
echo Clearing npm cache...
call npm cache clean --force 2>nul

REM Remove logs and temp files
echo Removing log files...
for %%i in (*.log) do del /q %%i 2>nul
for %%i in (client\*.log) do del /q %%i 2>nul
for %%i in (server\*.log) do del /q %%i 2>nul

REM Install dependencies with increased timeout
echo Installing dependencies (this may take a few minutes)...
call npm install --legacy-peer-deps
if errorlevel 1 (
  echo.
  echo Error: Failed to install dependencies.
  echo Troubleshooting:
  echo 1. Make sure you're running as Administrator
  echo 2. Check if antivirus is blocking file operations
  echo 3. Try manually deleting: C:\Works\Tricore\node_modules
  echo 4. Then run: npm cache clean --force
  echo 5. Then run: npm install
  echo.
  exit /b 1
)

echo Building the application...
if not exist node_modules (
  echo Error: node_modules not found. Dependencies may not have installed correctly.
  echo Please run: npm install
  exit /b 1
)

if not exist client\node_modules\.bin\vite.cmd (
  echo Error: Vite not installed. Running npm install again...
  call npm install --legacy-peer-deps
  if errorlevel 1 (
    echo Error: Failed to install vite.
    exit /b 1
  )
)

call npm run build
if errorlevel 1 (
  echo Error: Failed to build the application.
  exit /b 1
)

echo Creating deployment ZIP file...

REM Create a temporary directory for deployment files
if exist deploy-temp rmdir /s /q deploy-temp
mkdir deploy-temp

REM Copy server files (excluding node_modules, .env, logs)
for /r server %%F in (*.js *.json *.md) do (
    set "file=%%F"
    if not "!file:node_modules=!" == "!file!" (
        REM Skip files in node_modules
    ) else if not "!file:.log=!" == "!file!" (
        REM Skip log files
    ) else (
        set "relpath=!file:*server\=!"
        mkdir "deploy-temp\server\!relpath:~0,-1!" 2>nul
        copy "!file!" "deploy-temp\server\!relpath!" >nul 2>&1
    )
)

REM Copy built client files
if exist client\dist (
    xcopy client\dist\* deploy-temp\client\ /e /i /h /y >nul 2>&1
)

REM Copy root configuration files
copy package.json deploy-temp\ >nul 2>&1
copy README.md deploy-temp\ >nul 2>&1
if exist deploy-app.bat copy deploy-app.bat deploy-temp\ >nul 2>&1

REM Copy server env example
if exist server\.env.example copy server\.env.example deploy-temp\server\ >nul 2>&1

REM Create ZIP using PowerShell (exclude unwanted files)
powershell -NoProfile -Command "Get-ChildItem -Path 'deploy-temp' -Recurse -File | Where-Object { $_.FullName -notmatch '(\.log|node_modules|\.git)' } | ForEach-Object { Add-Member -NotePropertyName 'ArchivePath' -NotePropertyValue $_.FullName.Substring((Get-Item 'deploy-temp').FullName.Length + 1) -Force -PassThru } | Compress-Archive -Path { $_.FullName } -DestinationPath 'tricore-deploy.zip' -Force -ErrorAction SilentlyContinue"

REM Alternative simpler approach if above fails
if not exist tricore-deploy.zip (
    powershell -NoProfile -Command "Compress-Archive -Path 'deploy-temp\*' -DestinationPath 'tricore-deploy.zip' -Force"
)

REM Clean up temp directory
rmdir /s /q deploy-temp >nul 2>&1

echo Deployment ZIP created: tricore-deploy.zip

echo Creating codebase backup ZIP...

REM Create codebase backup (excluding node_modules, .git, logs, build temp files)
powershell -NoProfile -Command "
$excludePatterns = @('node_modules', '\.git', '\.log$', 'deploy-temp', 'tricore-deploy\.zip', 'tricore-codebase\.zip', 'client\\\.vite', 'client\\dist', '\.env$', '\.DS_Store')
$files = @()
Get-ChildItem -Path '.' -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
    $isExcluded = $false
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -match [regex]::Escape($pattern)) {
            $isExcluded = $true
            break
        }
    }
    if (-not $isExcluded) {
        $files += $_.FullName
    }
}
if ($files) {
    Compress-Archive -Path $files -DestinationPath 'tricore-codebase.zip' -Force
    Write-Host 'Codebase backup ZIP created: tricore-codebase.zip'
} else {
    Write-Host 'Warning: No files found for codebase backup'
}
"

echo Codebase backup ZIP created: tricore-codebase.zip
echo.
echo Created files:
echo - tricore-deploy.zip: Production deployment package
echo - tricore-codebase.zip: Complete codebase backup (excluding build artifacts)
echo.
echo To deploy:
echo 1. Unzip tricore-deploy.zip to your server
echo 2. Copy server\.env.example to server\.env and configure it
echo 3. Run 'npm install' in the unzipped directory
echo 4. Run 'npm run start:server' to start the application
echo.
echo The application will be available at the configured ports.

endlocal