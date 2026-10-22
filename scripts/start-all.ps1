# ===================================================================
# ARQON Complete Stack One-Click Startup Script (Windows PowerShell)
# ===================================================================
$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "     Starting ARQON Enterprise Assessment Platform" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Check & Start Local PostgreSQL on Port 5433
$pgConn = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue
if (-not $pgConn) {
    Write-Host "[1/3] Starting PostgreSQL (port 5433)..." -ForegroundColor Yellow
    & "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Users\Admin\.arqon\pgdata" -l "C:\Users\Admin\.arqon\pg.log" start
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/3] PostgreSQL is already running on port 5433." -ForegroundColor Green
}

# 2. Check & Start ARQON Core Backend on Port 8081
$backendConn = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if (-not $backendConn) {
    Write-Host "[2/3] Starting ARQON Core backend (:8081)..." -ForegroundColor Yellow
    $env:DB_PORT = "5433"
    $env:ARQON_BOOTSTRAP_ADMIN_NAME = "Arjun Shinde"
    $env:ARQON_BOOTSTRAP_ADMIN_EMAIL = "arjunnshinde9@gmail.com"
    $env:ARQON_BOOTSTRAP_ADMIN_PASSWORD = "ArjunAdmin@2026!"
    
    $root = Split-Path -Parent $PSScriptRoot
    $jarPath = Join-Path $root "services\arqon-core\target\arqon-core-0.1.0-SNAPSHOT.jar"
    Start-Process -FilePath "java" -ArgumentList "-jar `"$jarPath`"" -WindowStyle Hidden
    
    Write-Host "Waiting for backend readiness probe..." -ForegroundColor Yellow
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $probe = Invoke-RestMethod -Uri "http://localhost:8081/api/v1/system/ping" -TimeoutSec 2
            if ($probe.status -eq "UP") {
                Write-Host "Backend is UP and healthy on http://localhost:8081" -ForegroundColor Green
                break
            }
        } catch {}
    }
} else {
    Write-Host "[2/3] ARQON Core backend is already running on port 8081." -ForegroundColor Green
}

# 3. Check & Start React Frontend on Port 5173
$frontendConn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if (-not $frontendConn) {
    Write-Host "[3/3] Starting React frontend dev server (:5173)..." -ForegroundColor Yellow
    $frontendDir = Join-Path (Split-Path -Parent $PSScriptRoot) "frontend\arqon-web"
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "cmd.exe"
    $startInfo.Arguments = "/c set API_TARGET=http://localhost:8081 && npm run dev"
    $startInfo.WorkingDirectory = $frontendDir
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    [System.Diagnostics.Process]::Start($startInfo) | Out-Null
    Start-Sleep -Seconds 3
    Write-Host "Frontend is UP on http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "[3/3] Frontend is already running on port 5173." -ForegroundColor Green
}

Write-Host "`nAll services verified running live:" -ForegroundColor Cyan
Write-Host "  - Frontend Portal:    http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API:        http://localhost:8081" -ForegroundColor White
Write-Host "  - Actuator Readiness: http://localhost:9081/actuator/health/readiness" -ForegroundColor White
Write-Host "  - Super Admin Login:  arjunnshinde9@gmail.com / ArjunAdmin@2026!`n" -ForegroundColor Yellow
