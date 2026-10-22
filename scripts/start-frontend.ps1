# Starts the React app against the ARQON Core backend on :8081 (no gateway / Redis needed).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "frontend\arqon-web")
if (-not (Test-Path "node_modules")) { npm install }
$env:API_TARGET = "http://localhost:8081"
npm run dev
