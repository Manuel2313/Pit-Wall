<# 
.SYNOPSIS
    Pit Wall - Start All Services (Windows PowerShell)
    
.DESCRIPTION
    Starts PostgreSQL check, API, and Web in separate PowerShell windows.
    Run from project root: .\start-all.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Pit Wall - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$apiDir = Join-Path $projectRoot "apps\api"
$webDir = Join-Path $projectRoot "apps\web"

# Check PostgreSQL
Write-Host "[1/4] Checking PostgreSQL..." -ForegroundColor Green
try {
    $pgReady = & pg_isready 2>$null
    if (-not $pgReady) {
        Write-Warning "PostgreSQL not ready. Start it first:"
        Write-Host "  net start postgresql-x64-17" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  PostgreSQL is ready." -ForegroundColor Green
} catch {
    Write-Warning "pg_isready not found. Assuming PostgreSQL is running."
}

# Check database
Write-Host "[2/4] Checking database 'pitwall'..." -ForegroundColor Green
$dbExists = & psql -U postgres -lqt 2>$null | Select-String "pitwall" -Quiet
if (-not $dbExists) {
    Write-Host "  Creating database 'pitwall'..." -ForegroundColor Yellow
    & createdb -U postgres pitwall
    Write-Host "  Database created." -ForegroundColor Green
} else {
    Write-Host "  Database exists." -ForegroundColor Green
}

# Start API in new window
Write-Host "[3/4] Starting API..." -ForegroundColor Green
$apiScript = @"
cd '$apiDir'
Write-Host 'Starting API on http://localhost:3000...'
npm run start:dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiScript -WindowTitle "Pit Wall API"

# Wait for API
Write-Host "  Waiting for API to be ready..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  API ready!" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
    if ($i -eq 30) {
        Write-Warning "API didn't start in time. Check the API window for errors."
    }
}

# Start Web in new window
Write-Host "[4/4] Starting Web..." -ForegroundColor Green
$webScript = @"
cd '$webDir'
Write-Host 'Starting Web on http://localhost:4200...'
npm start
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $webScript -WindowTitle "Pit Wall Web"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services started!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API:    http://localhost:3000" -ForegroundColor Green
Write-Host "Web:    http://localhost:4200" -ForegroundColor Green
Write-Host "Health: http://localhost:3000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Create test user:" -ForegroundColor Yellow
Write-Host "  curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '`"{`"email`":`"manuRacing`",`"password`":`"Manu.2022`"}`"'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Close the API/Web windows to stop services." -ForegroundColor Gray