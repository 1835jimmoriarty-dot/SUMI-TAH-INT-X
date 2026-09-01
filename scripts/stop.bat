@echo off
echo Stopping local Node/Next.js servers...
taskkill /F /IM node.exe >nul 2>&1
echo [STOPPED]