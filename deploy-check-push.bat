@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "DEFAULT_BRANCH=main"
set "EXPECTED_ORIGIN_URL=https://github.com/tricoreevent-ai/tricore.git"
set "SKIP_PUSH=false"
set "CHECK_ONLY=false"
set "COMMIT_MESSAGE="
set "SCRIPT_EXIT="

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
if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=Production-ready update"

cd /d "%~dp0"
if errorlevel 1 (
  echo [ERROR] Unable to open the project folder.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git remote "origin" is not configured.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

set "ORIGIN_URL="
for /f "delims=" %%i in ('git remote get-url origin 2^>nul') do set "ORIGIN_URL=%%i"
if not defined ORIGIN_URL (
  echo [ERROR] Unable to read the Git remote "origin" URL.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

call :normalize_git_url "!ORIGIN_URL!" ORIGIN_URL_NORMALIZED
call :normalize_git_url "%EXPECTED_ORIGIN_URL%" EXPECTED_ORIGIN_URL_NORMALIZED
if /I not "!ORIGIN_URL_NORMALIZED!"=="!EXPECTED_ORIGIN_URL_NORMALIZED!" (
  echo [ERROR] Git remote "origin" must point to %EXPECTED_ORIGIN_URL%.
  echo Current origin: !ORIGIN_URL!
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

set "BRANCH_NAME="
for /f "delims=" %%i in ('git branch --show-current 2^>nul') do set "BRANCH_NAME=%%i"
if not defined BRANCH_NAME (
  echo [ERROR] Unable to determine the current Git branch.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

if /I not "!BRANCH_NAME!"=="%DEFAULT_BRANCH%" (
  echo [ERROR] This helper only commits and pushes the %DEFAULT_BRANCH% branch.
  echo Current branch: !BRANCH_NAME!
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found in PATH.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
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

if /I "%CHECK_ONLY%"=="true" goto :check_only_success

echo === Staging Changes ===
git add -A
if errorlevel 1 goto :command_error
echo.

echo === Staged Diff Check ===
git diff --cached --check
if errorlevel 1 goto :command_error
echo.

set "BLOCKED_FILES_FOUND="
for /f "delims=" %%i in ('git diff --cached --name-only 2^>nul') do (
  if /I "%%i"==".env" call :flag_blocked_file "%%i"
  if /I "%%i"==".env production.txt" call :flag_blocked_file "%%i"
  if /I "%%i"=="client/.env" call :flag_blocked_file "%%i"
  if /I "%%i"=="server/.env" call :flag_blocked_file "%%i"
)
if defined BLOCKED_FILES_FOUND goto :blocked_files_error

echo === Commit Decision ===
git diff --cached --quiet
if errorlevel 2 goto :command_error
if errorlevel 1 goto :create_commit

echo No new changes were found to commit.
echo.
goto :after_commit

:create_commit
echo === Creating Commit ===
echo Message: %COMMIT_MESSAGE%
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 goto :command_error
echo.

:after_commit
if /I "%SKIP_PUSH%"=="true" goto :skip_push

echo === Pushing to %EXPECTED_ORIGIN_URL% (origin/!BRANCH_NAME!) ===
git push origin !BRANCH_NAME!
if errorlevel 1 goto :command_error
echo.
goto :done

:skip_push
echo Push skipped by request.
echo.
goto :done

:blocked_files_error
echo Remove the file(s) from the commit and rerun the helper.
set "SCRIPT_EXIT=1"
goto :exit_with_optional_pause

:check_only_success
echo Check-only mode completed successfully.
echo No files were staged, committed, or pushed.
set "SCRIPT_EXIT=0"
goto :exit_with_optional_pause

:done
echo === Done ===
git log -1 --oneline
echo.
if /I "%SKIP_PUSH%"=="true" (
  echo Production-ready commit created locally.
) else (
  echo Production-ready branch pushed successfully.
)
set "SCRIPT_EXIT=0"
goto :exit_with_optional_pause

:command_error
set "SCRIPT_EXIT=%ERRORLEVEL%"
echo.
echo [ERROR] Command failed with exit code %SCRIPT_EXIT%.
echo Review the output above, fix the issue, and rerun this script.
goto :exit_with_optional_pause

:flag_blocked_file
echo [ERROR] Refusing to commit local environment file: %~1
set "BLOCKED_FILES_FOUND=1"
exit /b 0

:normalize_git_url
setlocal
set "VALUE=%~1"
if defined VALUE if /I "!VALUE:~-4!"==".git" set "VALUE=!VALUE:~0,-4!"
if defined VALUE if "!VALUE:~-1!"=="/" set "VALUE=!VALUE:~0,-1!"
endlocal & set "%~2=%VALUE%"
exit /b 0

:help
echo Usage: deploy-check-push.bat [--check-only] [--skip-push] [commit message]
echo.
echo   --check-only  Run the release checks without staging, committing, or pushing.
echo   --skip-push   Run the release checks and create a commit, but do not push.
set "SCRIPT_EXIT=0"
goto :exit_with_optional_pause

:exit_with_optional_pause
if not defined SCRIPT_EXIT set "SCRIPT_EXIT=%~1"
if /I "%TRICORE_NO_PAUSE%"=="1" exit /b %SCRIPT_EXIT%
pause
exit /b %SCRIPT_EXIT%
