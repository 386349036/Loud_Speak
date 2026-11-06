@echo off
title Pixel Tank Battle Server - keep this window open
chcp 65001 >nul
echo ============================================
echo  Pixel Tank Battle server starting...
echo  Keep this window OPEN while playing LAN.
echo  Close this window to stop the server.
echo ============================================
"C:\Users\Y\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" "%~dp0server.js"
echo.
echo Server exited. Press any key to close...
pause >nul
