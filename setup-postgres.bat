@echo off
REM Pit Wall - PostgreSQL Setup Script (Batch version)
REM Run as Administrator: Right-click -> "Run as administrator"

echo ========================================
echo  Pit Wall PostgreSQL Setup
echo ========================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/4] Starting PostgreSQL service...
sc query "postgresql-x64-17" >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: PostgreSQL service not found. Is PostgreSQL 17 installed?
    pause
    exit /b 1
)

sc query "postgresql-x64-17" | find "RUNNING" >nul
if %errorLevel% neq 0 (
    echo Starting PostgreSQL...
    net start "postgresql-x64-17"
    if %errorLevel% neq 0 (
        echo ERROR: Failed to start PostgreSQL service
        pause
        exit /b 1
    )
) else (
    echo PostgreSQL already running.
)

echo.
echo [2/4] Waiting for PostgreSQL to be ready...
timeout /t 3 /nobreak >nul

echo.
echo [3/4] Creating 'pitwall' database...
psql -U postgres -lqt | find "pitwall" >nul
if %errorLevel% equ 0 (
    echo Database 'pitwall' already exists.
) else (
    createdb -U postgres pitwall
    if %errorLevel% neq 0 (
        echo ERROR: Failed to create database
        echo Make sure PostgreSQL is installed and in PATH
        pause
        exit /b 1
    )
    echo Database 'pitwall' created successfully.
)

echo.
echo [4/4] Verifying connection...
psql -U postgres -d pitwall -c "SELECT version();" >nul
if %errorLevel% neq 0 (
    echo ERROR: Connection verification failed
    pause
    exit /b 1
)
echo Connection successful!

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Terminal 1: cd apps\api ^& npm run start:dev
echo   2. Terminal 2: cd apps\web ^& npm start
echo   3. Create test user:
echo      curl -X POST http://localhost:3000/api/auth/register ^
echo        -H "Content-Type: application/json" ^
echo        -d "{\"email\":\"manuRacing\",\"password\":\"Manu.2022\"}"
echo   4. Open http://localhost:4200 and test
echo.
pause