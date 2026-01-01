@echo off
setlocal enabledelayedexpansion

:: Give the terminal a clear, descriptive name
title bitburner-sync-server

echo Script started

:: Change directory to your project
cd "C:\Family Data Backup\Code\BitBurner External Editor Sync Plugin"

echo Starting sync server in this window...

:: Launch npm start in background inside this same terminal (no subshell)
start /b npm start
timeout /t 1 >nul

:: Capture the newest node.exe PID
for /f "tokens=2" %%a in ('tasklist ^| findstr /I "node.exe"') do (
    set SYNC_PID=%%a
)

echo Sync server PID: !SYNC_PID!

echo Launching Bitburner...
start "" steam://rungameid/1812820

echo Waiting for Bitburner to start...

:wait_for_start
tasklist | findstr /I "bitburner.exe" >nul
if errorlevel 1 (
    timeout /t 1 >nul
    goto wait_for_start
)

echo Bitburner detected. Monitoring for shutdown...

:wait_for_exit
tasklist | findstr /I "bitburner.exe" >nul
if not errorlevel 1 (
    timeout /t 2 >nul
    goto wait_for_exit
)

echo Bitburner closed. Stopping sync server...

taskkill /PID !SYNC_PID! /T /F >nul 2>&1

echo Script finished

:: Detect if launched from Explorer (cmd /c)
echo %cmdcmdline% | findstr /I "\/c" >nul
if not errorlevel 1 (
    exit
)

exit /b