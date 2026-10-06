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
$r = Invoke-RestMethod -Method GET -Uri "https://fra.cloud.appwrite.io/v1/databases/6ac3f9b00037aed54835/collections" -Headers $headers
Write-Host "Total: $($r.total)"
$r.collections | ForEach-Object { Write-Host "  ID: $($_.'$id')   Name: $($_.name)" }
