@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "DEFAULT_BRANCH=main"
set "EXPECTED_ORIGIN_URL=https://github.com/tricoreevent-ai/tricore.git"
set "GITHUB_HOST=github.com"
set "PUSH_MAX_ATTEMPTS=3"
set "PUSH_RETRY_DELAY_SECONDS=5"
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

echo === GitHub Connectivity Check ===
call :resolve_dns "%GITHUB_HOST%"
if errorlevel 1 (
  echo [ERROR] Unable to resolve %GITHUB_HOST% before push.
  echo Check your internet connection, VPN, proxy, or DNS settings, then rerun deploy-check-push.bat.
  set "SCRIPT_EXIT=1"
  goto :exit_with_optional_pause
)
echo %GITHUB_HOST% resolved successfully.
echo.

echo === Pushing to %EXPECTED_ORIGIN_URL% (origin/!BRANCH_NAME!) ===
set "PUSH_FAILURE_HANDLED="
call :push_with_retry "!BRANCH_NAME!"
if errorlevel 1 (
  if defined PUSH_FAILURE_HANDLED goto :exit_with_optional_pause
  goto :command_error
)
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

:push_with_retry
setlocal EnableDelayedExpansion
set "TARGET_BRANCH=%~1"
set "PUSH_ATTEMPT=1"
:push_retry_loop
set "PUSH_LOG=%TEMP%\tricore-git-push-!RANDOM!-!RANDOM!.log"
echo Attempt !PUSH_ATTEMPT! of %PUSH_MAX_ATTEMPTS%...
git push origin "!TARGET_BRANCH!" > "!PUSH_LOG!" 2>&1
set "PUSH_EXIT=!ERRORLEVEL!"
type "!PUSH_LOG!"

if "!PUSH_EXIT!"=="0" (
  if exist "!PUSH_LOG!" del /q "!PUSH_LOG!" >nul 2>&1
  echo.
  endlocal & exit /b 0
)

call :classify_push_failure "!PUSH_LOG!" PUSH_FAILURE_KIND
if /I "!PUSH_FAILURE_KIND!"=="dns" (
  if !PUSH_ATTEMPT! LSS %PUSH_MAX_ATTEMPTS% (
    echo.
    echo [WARN] GitHub DNS lookup failed during push. Retrying in %PUSH_RETRY_DELAY_SECONDS% seconds...
    if exist "!PUSH_LOG!" del /q "!PUSH_LOG!" >nul 2>&1
    call :sleep_seconds %PUSH_RETRY_DELAY_SECONDS%
    set /a PUSH_ATTEMPT+=1
    goto :push_retry_loop
  )
  echo.
  echo [ERROR] GitHub could not be reached because DNS resolution failed.
  echo Check your internet connection, VPN, proxy, or DNS settings, then rerun deploy-check-push.bat.
  if exist "!PUSH_LOG!" del /q "!PUSH_LOG!" >nul 2>&1
  endlocal & set "SCRIPT_EXIT=%PUSH_EXIT%" & set "PUSH_FAILURE_HANDLED=1" & exit /b %PUSH_EXIT%
)

if /I "!PUSH_FAILURE_KIND!"=="network" (
  if !PUSH_ATTEMPT! LSS %PUSH_MAX_ATTEMPTS% (
    echo.
    echo [WARN] GitHub could not be reached over the network. Retrying in %PUSH_RETRY_DELAY_SECONDS% seconds...
    if exist "!PUSH_LOG!" del /q "!PUSH_LOG!" >nul 2>&1
    call :sleep_seconds %PUSH_RETRY_DELAY_SECONDS%
    set /a PUSH_ATTEMPT+=1
    goto :push_retry_loop
  )
  echo.
  echo [ERROR] GitHub could not be reached over the network while pushing.
  echo Check connectivity to %GITHUB_HOST%, then rerun deploy-check-push.bat.
  if exist "!PUSH_LOG!" del /q "!PUSH_LOG!" >nul 2>&1
  endlocal & set "SCRIPT_EXIT=%PUSH_EXIT%" & set "PUSH_FAILURE_HANDLED=1" & exit /b %PUSH_EXIT%
)

if exist "!PUSH_LOG!" del /q "!PUSH_LOG!" >nul 2>&1
endlocal & exit /b %PUSH_EXIT%

:classify_push_failure
setlocal
set "PUSH_LOG_FILE=%~1"
set "FAILURE_KIND=generic"

findstr /I /C:"Could not resolve host" "%PUSH_LOG_FILE%" >nul
if not errorlevel 1 set "FAILURE_KIND=dns"

if /I not "%FAILURE_KIND%"=="dns" (
  findstr /I /C:"Failed to connect" /C:"Connection timed out" /C:"Operation timed out" /C:"Connection was reset" /C:"Could not read from remote repository" "%PUSH_LOG_FILE%" >nul
  if not errorlevel 1 set "FAILURE_KIND=network"
)

endlocal & set "%~2=%FAILURE_KIND%"
exit /b 0

:resolve_dns
powershell -NoProfile -Command "try { Resolve-DnsName '%~1' -ErrorAction Stop | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
exit /b %ERRORLEVEL%

:sleep_seconds
powershell -NoProfile -Command "Start-Sleep -Seconds %~1"
exit /b %ERRORLEVEL%

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
