@echo off
REM Quick helper to review deploy changes and push to Git
cd /d "%~dp0"

echo === Git Status ===
git status
echo.

echo === Last Commit ===
git log -1 --oneline
echo.

echo === Remotes ===
git remote -v
echo.

echo Attempting push to origin main...
git push origin main

echo.
echo Done. If push failed, check your network/credentials and rerun.
pause
