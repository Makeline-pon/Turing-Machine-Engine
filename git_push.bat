@echo off
chcp 65001 >nul
title GitHub Auto Push Tool

echo =========================================
echo        GitHub Auto Push Tool
echo =========================================
echo.

:: Check if a parameter was passed
if "%~1"=="" (
    set /p commit_msg="Enter commit message (Press Enter for 'Auto update'): "
) else (
    set commit_msg=%~1
)

:: Default message if empty
if "%commit_msg%"=="" set commit_msg=Auto update

echo.
echo [1/3] Adding changes (git add .)...
git add .

echo [2/3] Committing changes (git commit)...
git commit -m "%commit_msg%"

echo [3/3] Pushing to GitHub (git push)...
git pull origin main --rebase
git push

echo.
echo Push completed!
echo If no errors occurred, GitHub Pages will update in about 1 minute.
echo.
pause