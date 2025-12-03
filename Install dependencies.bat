@echo off
title Subway Builder Patcher - Installer
color 0b

cd /d "%~dp0"

echo.
echo ========================================================
echo   Installing necessary files...
echo   (This can take a couple minutes)
echo ========================================================
echo.

echo  > Step 1/3: Installing standard packages...
call npm install

echo.
echo  > Step 2/3: Installing mapPatcher dependencies...
pushd patcher\packages\mapPatcher
call npm install
popd

echo.
echo  > Step 3/3: Installing map tools (pmtiles / gzip)...
pushd patcher\packages\mapPatcher
call node download_tools.js
popd

echo.
echo ========================================================
echo   Installation complete!
echo   You can now run 'Start_GUI.bat'
echo ========================================================
echo.
pause
