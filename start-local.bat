@echo off
title Aivita Local Dev

echo [1/3] Starting Docker (PostgreSQL + Redis)...
docker-compose -f "%~dp0docker-compose.local.yml" up -d

echo [2/3] Starting API on port 4000...
start "Aivita API :4000" cmd /k "cd /d "%~dp0apps\api" && pnpm dev"

echo [3/3] Starting Frontend on port 3001...
start "Aivita Frontend :3001" cmd /k "cd /d "%~dp0apps\aivita" && pnpm dev"

echo.
echo Done! Open http://localhost:3001
timeout /t 3
