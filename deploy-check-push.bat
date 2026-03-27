@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "DEFAULT_BRANCH=main"
set "SKIP_PUSH=false"
set "CHECK_ONLY=false"
set "COMMIT_MESSAGE="

:parse_args
if "%~1"=="" goto :after_args
if /I "%~1"=="--help" goto :help
if /I "%~1"=="--skip-push" (
  set "SKIP_PUSH=true"
  shift
  goto :parse_args
)
if /I "%~1"=="--check-only" (
  set "CHECK_ONLY=true"
  shift
  goto :parse_args
)
if defined COMMIT_MESSAGE (
  set "COMMIT_MESSAGE=!COMMIT_MESSAGE! %~1"
) else (
  set "COMMIT_MESSAGE=%~1"
)
shift
goto :parse_args

:after_args
if not defined COMMIT_MESSAGE (
  set "COMMIT_MESSAGE=Production-ready update"
)

REM Helper to validate the release build, create a commit, and push main
cd /d "%~dp0" || (
  echo [ERROR] Unable to open the project folder.
  call :exit_with_optional_pause 1
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  call :exit_with_optional_pause 1
  exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git remote "origin" is not configured.
  call :exit_with_optional_pause 1
  exit /b 1
)

set "BRANCH_NAME="
for /f "delims=" %%i in ('git branch --show-current 2^>nul') do set "BRANCH_NAME=%%i"
if not defined BRANCH_NAME (
  echo [ERROR] Unable to determine the current Git branch.
  call :exit_with_optional_pause 1
  exit /b 1
)

if /I not "!BRANCH_NAME!"=="%DEFAULT_BRANCH%" (
  echo [ERROR] This helper only commits and pushes the %DEFAULT_BRANCH% branch.
  echo Current branch: !BRANCH_NAME!
  call :exit_with_optional_pause 1
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  call :exit_with_optional_pause 1
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found in PATH.
  call :exit_with_optional_pause 1
  exit /b 1
)

echo === Release Branch ===
echo !BRANCH_NAME!
echo.

echo === Git Status ===
git status --short
if errorlevel 1 goto :command_error
echo.

echo === Last Commit ===
git log -1 --oneline
if errorlevel 1 goto :command_error
echo.

echo === Remotes ===
git remote -v
if errorlevel 1 goto :command_error
echo.

echo === Production Build Check ===
call npm.cmd run build
if errorlevel 1 goto :command_error
echo.

echo === Server Import Check ===
node --input-type=module -e "import('./server/src/app.js').then(()=>console.log('server-app import ok')).catch((error)=>{console.error(error);process.exit(1);})"
if errorlevel 1 goto :command_error
echo.

echo === Working Tree Check ===
git diff --check
if errorlevel 1 goto :command_error
echo.

if /I "%CHECK_ONLY%"=="true" (
  echo Check-only mode completed successfully.
  echo No files were staged, committed, or pushed.
  call :exit_with_optional_pause 0
  exit /b 0
)

echo === Staging Changes ===
git add -A
if errorlevel 1 goto :command_error
echo.

echo === Staged Diff Check ===
git diff --cached --check
if errorlevel 1 goto :command_error
echo.

set "BLOCKED_FILES_FOUND=false"
for %%i in (.env ".env production.txt" client/.env server/.env) do (
  for /f "delims=" %%j in ('git diff --cached --name-only -- "%%i" 2^>nul') do (
    echo [ERROR] Refusing to commit local environment file: %%j
    set "BLOCKED_FILES_FOUND=true"
  )
)

if /I "!BLOCKED_FILES_FOUND!"=="true" (
  echo Remove the file(s) from the commit and rerun the helper.
  call :exit_with_optional_pause 1
  exit /b 1
)

git diff --cached --quiet
set "STAGED_EXIT=%ERRORLEVEL%"
if %STAGED_EXIT% GEQ 2 goto :command_error

if %STAGED_EXIT%==1 (
  echo === Creating Commit ===
  echo Message: %COMMIT_MESSAGE%
  git commit -m "%COMMIT_MESSAGE%"
  if errorlevel 1 goto :command_error
  echo.
) else (
  echo No new changes were found to commit.
  echo.
)

if /I "%SKIP_PUSH%"=="true" (
  echo Push skipped by request.
  echo.
) else (
  echo === Pushing to origin/!BRANCH_NAME! ===
  git push origin !BRANCH_NAME!
  if errorlevel 1 goto :command_error
  echo.
)

echo === Done ===
git log -1 --oneline
echo.
if /I "%SKIP_PUSH%"=="true" (
  echo Production-ready commit created locally.
) else (
  echo Production-ready branch pushed successfully.
)
call :exit_with_optional_pause 0
exit /b 0

:command_error
set "SCRIPT_EXIT=%ERRORLEVEL%"
echo.
echo [ERROR] Command failed with exit code %SCRIPT_EXIT%.
echo Review the output above, fix the issue, and rerun this script.
call :exit_with_optional_pause %SCRIPT_EXIT%
exit /b %SCRIPT_EXIT%

:help
echo Usage: deploy-check-push.bat [--check-only] [--skip-push] [commit message]
echo.
echo   --check-only  Run the release checks without staging, committing, or pushing.
echo   --skip-push   Run the release checks and create a commit, but do not push.
exit /b 0

:exit_with_optional_pause
if /I "%TRICORE_NO_PAUSE%"=="1" exit /b %~1
pause
exit /b %~1
