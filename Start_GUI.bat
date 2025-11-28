@echo off
REM --------------------------------------------------------------
REM Simple batch launcher for Subway Builder Patcher GUI
REM --------------------------------------------------------------

REM Change to the directory where this bat file resides
cd /d "%~dp0"

REM Check if node command is available
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js and ensure 'node' is in system PATH.
    pause
    exit /b 1
)

REM Start server in a new cmd window
start "" cmd /k "node gui_server.js"

REM Wait a little so the server has time to start
timeout /t 1 /nobreak >nul

REM Open browser to GUI (localhost:3000)
start "" http://localhost:3000

REM Optional: pause in the main window if you want to see logs in original window
REM pause
