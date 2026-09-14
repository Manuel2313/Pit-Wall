<# 
.SYNOPSIS
    Pit Wall - Create Test User (Windows PowerShell)
    
.DESCRIPTION
    Creates test user 'manuRacing' with password 'Manu.2022'
    Run after API is started: .\create-test-user.ps1
#>

$ErrorActionPreference = "Stop"

$apiUrl = "http://localhost:3000/api"

Write-Host "Creating test user: manuRacing / Manu.2022" -ForegroundColor Cyan
Write-Host ""

$body = @{
    email = "manuRacing"
    password = "Manu.2022"
} | ConvertTo-Json -Compress

try {
    $response = Invoke-RestMethod -Uri "$apiUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now login at http://localhost:4200/login" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message
    Write-Error "Failed to create user (HTTP $statusCode)"
    Write-Host "Error: $errorBody" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  - API not running (start with .\start-all.ps1)"
    Write-Host "  - User already exists (try login instead)"
    Write-Host "  - Database not set up (run .\setup-postgres.ps1 as Admin)"
}