# DELETES the local database (all data) and recreates it. Needed when the DB role/schema setup changed
# or you see "password authentication failed for user arqon_app".
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "infra\docker")
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
docker compose --env-file .env down -v
& (Join-Path $PSScriptRoot "start-db.ps1")
