@echo off
setlocal EnableExtensions

REM Helper to review changes, create a commit, and push to Git
cd /d "%~dp0" || (
  echo [ERROR] Unable to open the project folder.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  pause
  exit /b 1
)

set "COMMIT_MESSAGE=%*"
if "%COMMIT_MESSAGE%"=="" (
  set "COMMIT_MESSAGE=Update deployment changes"
)

echo === Git Status ===
git status --short
if errorlevel 1 goto :git_error
echo.

echo === Last Commit ===
git log -1 --oneline
if errorlevel 1 goto :git_error
echo.

echo === Remotes ===
git remote -v
if errorlevel 1 goto :git_error
echo.

echo === Staging Changes ===
git add -A
if errorlevel 1 goto :git_error

git diff --cached --quiet
set "STAGED_EXIT=%ERRORLEVEL%"
if %STAGED_EXIT% GEQ 2 goto :git_error

if %STAGED_EXIT%==1 (
  echo.
  echo === Creating Commit ===
  echo Message: %COMMIT_MESSAGE%
  git commit -m "%COMMIT_MESSAGE%"
  if errorlevel 1 goto :git_error
) else (
  echo.
  echo No new changes were found to commit.
)

echo.
echo === Pushing to origin/main ===
git push origin main
if errorlevel 1 goto :git_error

echo.
echo === Done ===
git log -1 --oneline
echo.
echo Push completed successfully.
pause
exit /b 0

:git_error
set "GIT_EXIT=%ERRORLEVEL%"
echo.
echo [ERROR] Git command failed with exit code %GIT_EXIT%.
echo Review the output above, fix the issue, and rerun this script.
pause
exit /b %GIT_EXIT%
