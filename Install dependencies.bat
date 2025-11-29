@echo off
title Subway Builder Patcher - Installer
color 0b

echo.
echo ========================================================
echo   Installing necessary files...
echo   (This can take a couple minutes)
echo ========================================================
echo.

echo  > Step 1/2: Installing standard packages...
call npm install

echo.
echo  > Step 2/2: Installing GUI dependencies...
call npm install express socket.io open big-json --save

echo  > Step 2/2: Installing mapPatcher dependencies...
cd patcher/packages/mapPatcher
call npm install
call npm install adm-zip --save
cd ../../..

echo.
echo ========================================================
echo   Installation complete!
echo   You can now run 'Start.bat'
echo ========================================================
echo.
pause