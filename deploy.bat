@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "REPO_URL=https://github.com/tricoreevent-ai/tricore.git"
set "DEFAULT_BRANCH=main"
set "RECOMMENDED_NODE_VERSION=22.x"
set "SKIP_PUSH=false"

if /I "%~1"=="--help" goto :help
if /I "%~1"=="--skip-push" set "SKIP_PUSH=true"

echo TriCore Events Hostinger Deployment Helper
echo.
echo Recommended Hostinger option: Connect with GitHub
echo Repository: %REPO_URL%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Error: Node.js is required and was not found in PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm is required and was not found in PATH.
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo Warning: Git was not found in PATH. Git push will be skipped.
  set "SKIP_PUSH=true"
)

if not exist node_modules (
  echo Installing workspace dependencies...
  call npm install
  if errorlevel 1 (
    echo Error: npm install failed.
    exit /b 1
  )
)

echo Building the client for production...
call npm run build
if errorlevel 1 (
  echo Error: build failed.
  exit /b 1
)

set "BRANCH_NAME=%DEFAULT_BRANCH%"
if exist .git (
  for /f %%i in ('git branch --show-current 2^>nul') do set "BRANCH_NAME=%%i"
  if "!BRANCH_NAME!"=="" set "BRANCH_NAME=%DEFAULT_BRANCH%"

  git remote get-url origin >nul 2>nul
  if errorlevel 1 (
    echo Adding origin remote: %REPO_URL%
    git remote add origin "%REPO_URL%"
  )

  if /I "%SKIP_PUSH%"=="true" (
    echo Git push skipped by request.
  ) else (
    set "HAS_CHANGES=false"
    for /f %%i in ('git status --porcelain 2^>nul') do (
      set "HAS_CHANGES=true"
      goto :commit_changes
    )
    goto :push_changes
  )
) else (
  echo Warning: This folder is not a git repository. Build succeeded, but git push was skipped.
  goto :write_summary
)

goto :write_summary

:commit_changes
set "DEFAULT_MESSAGE=Hostinger deploy %date% %time%"
set "COMMIT_MESSAGE="
set /p COMMIT_MESSAGE=Commit message [!DEFAULT_MESSAGE!]: 
if "!COMMIT_MESSAGE!"=="" set "COMMIT_MESSAGE=!DEFAULT_MESSAGE!"

echo Staging changes...
git add -A
if errorlevel 1 (
  echo Error: git add failed.
  exit /b 1
)

echo Creating commit...
git commit -m "!COMMIT_MESSAGE!"
if errorlevel 1 (
  echo Error: git commit failed.
  exit /b 1
)

:push_changes
echo Pushing branch !BRANCH_NAME! to origin...
git push -u origin !BRANCH_NAME!
if errorlevel 1 (
  echo Error: git push failed.
  exit /b 1
)

:write_summary
(
  echo TriCore Events Hostinger Deployment
  echo ==================================
  echo Recommended option: Connect with GitHub
  echo Repository: %REPO_URL%
  echo Branch: !BRANCH_NAME!
  echo Root directory: /
  echo Install command: npm install
  echo Build command: npm run build
  echo Start command: npm start
  echo Suggested Node.js version: %RECOMMENDED_NODE_VERSION%
  echo.
  echo Hostinger checklist:
  echo 1. Open the Node.js app deployment flow.
  echo 2. Choose Connect with GitHub.
  echo 3. Select repository tricoreevent-ai/tricore.
  echo 4. Select branch !BRANCH_NAME!.
  echo 5. Review the build and start commands above.
  echo 6. Add production environment variables from server/.env in Hostinger.
) > hostinger-deploy.txt

echo.
echo Deployment summary written to hostinger-deploy.txt
echo If Hostinger is already connected to GitHub, pushing to origin will trigger the next deploy.
exit /b 0

:help
echo Usage: deploy.bat [--skip-push]
echo.
echo   --skip-push   Build locally and write Hostinger deployment instructions without git push.
exit /b 0
