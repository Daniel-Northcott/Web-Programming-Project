# Requires MongoDB Database Tools installed (mongorestore)
# Usage: ./scripts/restore.ps1 [-DbName movies] [-DumpPath ./db-dumps/<timestamp>/movies]
param(
  [string]$DbName = "movies",
  [string]$DumpPath = ""
)

# Load .env MONGODB_URI to infer db name if possible
$envPath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envPath) {
  $envContent = Get-Content $envPath | Where-Object { $_ -match "^MONGODB_URI=" }
  if ($envContent) {
    $uri = $envContent -replace "^MONGODB_URI=", ""
    if ($uri -match "mongodb(?:\+srv)?:\/\/.*\/(.+)$") {
      $DbName = $Matches[1]
    }
  }
}

if (-not $DumpPath -or -not (Test-Path $DumpPath)) {
  # Try to use latest folder under ./db-dumps/<timestamp>/movies
  $base = Join-Path $PSScriptRoot "..\db-dumps"
  if (Test-Path $base) {
    $latest = Get-ChildItem $base | Sort-Object Name -Descending | Select-Object -First 1
    if ($latest) {
      $candidate = Join-Path $latest.FullName $DbName
      if (Test-Path $candidate) { $DumpPath = $candidate }
    }
  }
}

if (-not $DumpPath) {
  Write-Host "DumpPath not provided and no latest dump found in ./db-dumps" -ForegroundColor Red
  exit 1
}

Write-Host "Restoring to database '$DbName' from '$DumpPath'" -ForegroundColor Cyan

# Verify mongorestore is available
$tool = Get-Command mongorestore -ErrorAction SilentlyContinue
if (-not $tool) {
  Write-Host "mongorestore not found. Install MongoDB Database Tools and ensure it's in PATH." -ForegroundColor Red
  Write-Host "Download: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
  exit 1
}

# Build args and execute
$restoreArgs = @('--db', $DbName, $DumpPath)
& $tool.Source $restoreArgs

Write-Host "Restore complete." -ForegroundColor Green
