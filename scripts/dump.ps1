# Requires MongoDB Database Tools installed (mongodump)
# Usage: ./scripts/dump.ps1 [-DbName movies] [-OutDir ./db-dumps]
param(
  [string]$DbName = "movies",
  [string]$OutDir = "./db-dumps"
)

# Load .env MONGODB_URI to infer db name if possible
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
  $envContent = Get-Content $envPath | Where-Object { $_ -match "^MONGODB_URI=" }
  if ($envContent) {
    $uri = $envContent -replace "^MONGODB_URI=", ""
    # Try to parse db name from mongodb://host:port/db
    if ($uri -match "mongodb(?:\+srv)?:\/\/.*\/(.+)$") {
      $DbName = $Matches[1]
    }
  }
}

# Timestamped folder
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path $OutDir $timestamp

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Dumping database '$DbName' to '$targetDir'" -ForegroundColor Cyan

# Verify mongodump is available
$tool = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $tool) {
  Write-Host "mongodump not found. Install MongoDB Database Tools and ensure it's in PATH." -ForegroundColor Red
  Write-Host "Download: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
  exit 1
}

# Build args and execute
$dumpArgs = @('--db', $DbName, '--out', $targetDir)
& $tool.Source $dumpArgs

Write-Host "Dump complete." -ForegroundColor Green
