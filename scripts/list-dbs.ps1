param()
$envPath = Join-Path $PSScriptRoot "..\.env"
$apiKey = ""
foreach ($line in (Get-Content $envPath)) {
    if ($line -match "^APPWRITE_API_KEY=(.+)$") { $apiKey = $Matches[1].Trim(); break }
}
$headers = @{
    "X-Appwrite-Project" = "6ac3e7c0001469e247da"
    "X-Appwrite-Key"     = $apiKey
    "Content-Type"       = "application/json"
}

# List all databases
Write-Host "=== Databases ===" -ForegroundColor Cyan
$dbs = Invoke-RestMethod -Method GET -Uri "https://fra.cloud.appwrite.io/v1/databases" -Headers $headers
Write-Host "Total databases: $($dbs.total)"
foreach ($db in $dbs.databases) {
    Write-Host "  DB: $($db.'$id')   Name: $($db.name)" -ForegroundColor Yellow
    # List collections in each DB
    try {
        $cols = Invoke-RestMethod -Method GET -Uri "https://fra.cloud.appwrite.io/v1/databases/$($db.'$id')/collections" -Headers $headers
        Write-Host "    Collections: $($cols.total)"
        foreach ($col in $cols.collections) {
            Write-Host "      COL: $($col.'$id')   Name: $($col.name)" -ForegroundColor Green
        }
    } catch {
        Write-Host "    (could not list collections)" -ForegroundColor Red
    }
}
