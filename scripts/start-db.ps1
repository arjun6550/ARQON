# Starts local PostgreSQL (Docker) and waits until it is healthy. Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "infra\docker")
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
docker compose --env-file .env up -d postgres mailpit
Write-Host "Mailpit (test inbox for invitation e-mails): http://localhost:8025"
Write-Host "Waiting for Postgres to become healthy..."
for ($i = 0; $i -lt 30; $i++) {
    $status = docker inspect -f '{{.State.Health.Status}}' docker-postgres-1 2>$null
    if ($status -eq "healthy") { Write-Host "Postgres is healthy on localhost:5432"; exit 0 }
    Start-Sleep -Seconds 2
}
Write-Error "Postgres did not become healthy. Run: docker compose logs postgres"
