# Load .env variables
$envFile = Join-Path $PSScriptRoot "..\\.env"
Get-Content $envFile | Where-Object { $_ -match "^[A-Z]" -and $_ -notmatch "^#" } | ForEach-Object {
    $parts = $_ -split "=", 2
    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
}

Write-Host "APPWRITE_DATABASE_ID = $env:APPWRITE_DATABASE_ID"
Write-Host "APPWRITE_API_KEY     = $($env:APPWRITE_API_KEY.Substring(0,20))..."

npx tsx scripts/setup-collections.ts
