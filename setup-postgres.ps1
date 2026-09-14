<# 
.SYNOPSIS
    Pit Wall - PostgreSQL Setup Script
    Run this script as Administrator to set up PostgreSQL and create the database.

.DESCRIPTION
    This script:
    1. Starts PostgreSQL service (if not running)
    2. Creates the 'pitwall' database
    3. Verifies the connection

.NOTES
    Run as Administrator: Right-click PowerShell -> "Run as Administrator"
    Then execute: .\setup-postgres.ps1
#>

# Stop on error
$ErrorActionPreference = "Stop"

Write-Host "=== Pit Wall PostgreSQL Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator!"
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/4] Starting PostgreSQL service..." -ForegroundColor Green
try {
    $service = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        # Try to find postgres service with different naming
        $service = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    
    if ($null -eq $service) {
        Write-Error "PostgreSQL service not found. Is PostgreSQL 17 installed?"
        exit 1
    }
    
    if ($service.Status -ne "Running") {
        Start-Service -Name $service.Name
        Write-Host "  PostgreSQL service started." -ForegroundColor Green
    } else {
        Write-Host "  PostgreSQL service already running." -ForegroundColor Green
    }
} catch {
    Write-Error "Failed to start PostgreSQL: $_"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Waiting for PostgreSQL to be ready..." -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[3/4] Creating 'pitwall' database..." -ForegroundColor Green
try {
    # Check if database exists
    $dbExists = & psql -U postgres -lqt | Select-String "pitwall" -Quiet
    if ($dbExists) {
        Write-Host "  Database 'pitwall' already exists." -ForegroundColor Yellow
    } else {
        & createdb -U postgres pitwall
        Write-Host "  Database 'pitwall' created successfully." -ForegroundColor Green
    }
} catch {
    Write-Error "Failed to create database: $_"
    Write-Host "  Make sure PostgreSQL is installed and in PATH." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[4/4] Verifying connection..." -ForegroundColor Green
try {
    & psql -U postgres -d pitwall -c "SELECT version();" | Out-Null
    Write-Host "  Connection successful!" -ForegroundColor Green
} catch {
    Write-Error "Connection verification failed: $_"
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open Terminal 1: cd apps\api; npm run start:dev"
Write-Host "  2. Open Terminal 2: cd apps\web; npm start"
Write-Host "  3. Create test user: curl -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"manuRacing\",\"password\":\"Manu.2022\"}'"
Write-Host "  4. Open http://localhost:4200 and test the full flow"
Write-Host ""