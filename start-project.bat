@echo off
echo Starting Live Code Editor with AI...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd Backend && node server.js"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd Frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul