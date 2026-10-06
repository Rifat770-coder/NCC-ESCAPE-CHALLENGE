# NCC Escape Challenge - Add attributes & indexes to existing collections
param()

$ENDPOINT = "https://fra.cloud.appwrite.io/v1"
$PROJECT  = "6ac3e7c0001469e247da"
$DB       = "6ac3f9b00037abd5d025"

$COL_PARTICIPANTS = "6ac3fe62001d3d820f54"
$COL_ATTEMPTS     = "6ac3fe720016a40dfd2c"
$COL_SETTINGS     = "6ac3fe7b0032afeb04ee"

# Load API key from .env
$envPath = Join-Path $PSScriptRoot "..\.env"
$apiKey  = ""
foreach ($line in (Get-Content $envPath)) {
    if ($line -match "^APPWRITE_API_KEY=(.+)$") {
        $apiKey = $Matches[1].Trim()
        break
    }
}
if (-not $apiKey) { Write-Error "APPWRITE_API_KEY not found in .env"; exit 1 }

$headers = @{
    "X-Appwrite-Project" = $PROJECT
    "X-Appwrite-Key"     = $apiKey
    "Content-Type"       = "application/json"
}

function Invoke-AW {
    param($method, $path, $body = $null)
    $uri = "$ENDPOINT$path"
    try {
        if ($body) {
            return Invoke-RestMethod -Method $method -Uri $uri -Headers $headers -Body ($body | ConvertTo-Json -Depth 10)
        } else {
            return Invoke-RestMethod -Method $method -Uri $uri -Headers $headers
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq 409) { return $null }  # already exists
        $msg = $null
        try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch {}
        Write-Host " ERROR $status : $msg" -ForegroundColor Red
        throw
    }
}

function New-Str {
    param($col, $key, $size, $required, $default = $null)
    Write-Host "    + string   $key" -NoNewline
    $b = [ordered]@{ key = $key; size = $size; required = $required }
    if ($null -ne $default -and -not $required) { $b["default"] = $default }
    $r = Invoke-AW "POST" "/databases/$DB/collections/$col/attributes/string" $b
    if ($r) { Write-Host " ok" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

function New-Int {
    param($col, $key, $required, $default = $null, $min = $null, $max = $null)
    Write-Host "    + integer  $key" -NoNewline
    $b = [ordered]@{ key = $key; required = $required }
    # Appwrite rejects default on required attributes
    if ($null -ne $default -and -not $required) { $b["default"] = $default }
    if ($null -ne $min)     { $b["min"]     = $min }
    if ($null -ne $max)     { $b["max"]     = $max }
    $r = Invoke-AW "POST" "/databases/$DB/collections/$col/attributes/integer" $b
    if ($r) { Write-Host " ok" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

function New-Bool {
    param($col, $key, $required, $default = $null)
    Write-Host "    + boolean  $key" -NoNewline
    $b = [ordered]@{ key = $key; required = $required }
    # Appwrite rejects default on required attributes
    if ($null -ne $default -and -not $required) { $b["default"] = $default }
    $r = Invoke-AW "POST" "/databases/$DB/collections/$col/attributes/boolean" $b
    if ($r) { Write-Host " ok" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

function New-Dt {
    param($col, $key, $required)
    Write-Host "    + datetime $key" -NoNewline
    $b = [ordered]@{ key = $key; required = $required }
    $r = Invoke-AW "POST" "/databases/$DB/collections/$col/attributes/datetime" $b
    if ($r) { Write-Host " ok" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

function New-Idx {
    param($col, $key, $type, $attrs, $orders = @())
    Write-Host "    + index    $key" -NoNewline
    $b = [ordered]@{ key = $key; type = $type; attributes = $attrs; orders = $orders }
    $r = Invoke-AW "POST" "/databases/$DB/collections/$col/indexes" $b
    if ($r) { Write-Host " ok" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "=== NCC Escape Challenge - Attributes Setup ===" -ForegroundColor Cyan
Write-Host "  endpoint : $ENDPOINT"
Write-Host "  project  : $PROJECT"
Write-Host "  database : $DB"
Write-Host ""

# ---------- [1] participants ----------
Write-Host "[1/3] participants  ($COL_PARTICIPANTS)" -ForegroundColor Cyan
New-Str $COL_PARTICIPANTS "name"       60   $true
New-Str $COL_PARTICIPANTS "studentId"  30   $true
New-Str $COL_PARTICIPANTS "department" 60   $true
New-Str $COL_PARTICIPANTS "batch"      40   $true
New-Str $COL_PARTICIPANTS "phone"      20   $false
New-Dt  $COL_PARTICIPANTS "createdAt"  $false
New-Idx $COL_PARTICIPANTS "idx_studentId" "unique" @("studentId") @()
New-Idx $COL_PARTICIPANTS "idx_batch"     "key"    @("batch")     @()
Write-Host ""

# ---------- [2] gameAttempts ----------
Write-Host "[2/3] gameAttempts  ($COL_ATTEMPTS)" -ForegroundColor Cyan
New-Str  $COL_ATTEMPTS "participantId"    64   $true
New-Str  $COL_ATTEMPTS "participantName"  60   $true
New-Str  $COL_ATTEMPTS "participantBatch" 40   $true
New-Dt   $COL_ATTEMPTS "startedAt"        $false
New-Dt   $COL_ATTEMPTS "completedAt"      $false
New-Str  $COL_ATTEMPTS "status"           16   $true
New-Int  $COL_ATTEMPTS "currentLevel"     $true  1  1  4
New-Int  $COL_ATTEMPTS "livesRemaining"   $true  3  0  9
New-Int  $COL_ATTEMPTS "completionTimeMs" $false
New-Bool $COL_ATTEMPTS "prizeEligible"    $true  $false
New-Bool $COL_ATTEMPTS "prizeClaimed"     $true  $false
New-Int  $COL_ATTEMPTS "score"            $true  0
New-Int  $COL_ATTEMPTS "levelSeed"        $true
New-Str  $COL_ATTEMPTS "levelResults"     4000 $true "[]"
New-Dt   $COL_ATTEMPTS "createdAt"        $false
New-Idx  $COL_ATTEMPTS "idx_attempt_participant"      "key" @("participantId")                @("ASC")
New-Idx  $COL_ATTEMPTS "idx_attempt_status_completed" "key" @("status","completedAt")         @("ASC","DESC")
New-Idx  $COL_ATTEMPTS "idx_attempt_prize"            "key" @("prizeEligible","prizeClaimed") @()
Write-Host ""

# ---------- [3] gameSettings ----------
Write-Host "[3/3] gameSettings  ($COL_SETTINGS)" -ForegroundColor Cyan
New-Bool $COL_SETTINGS "gameActive"         $true  $true
New-Int  $COL_SETTINGS "durationSeconds"    $true  120  30  3600
New-Int  $COL_SETTINGS "startingLives"      $true  3    1   9
New-Bool $COL_SETTINGS "retryAllowed"       $true  $false
New-Int  $COL_SETTINGS "maximumAttempts"    $true  1    1   10
New-Bool $COL_SETTINGS "leaderboardEnabled" $true  $true
New-Bool $COL_SETTINGS "prizeMode"          $true  $true
Write-Host ""

Write-Host "Waiting 8s for attributes to be ready before creating singleton doc..." -ForegroundColor Gray
Start-Sleep -Seconds 8

Write-Host "  singleton doc ..." -NoNewline
$docBody = [ordered]@{
    documentId  = "singleton"
    data        = [ordered]@{
        gameActive         = $true
        durationSeconds    = 120
        startingLives      = 3
        retryAllowed       = $false
        maximumAttempts    = 1
        leaderboardEnabled = $true
        prizeMode          = $true
    }
    permissions = @()
}
$r = Invoke-AW "POST" "/databases/$DB/collections/$COL_SETTINGS/documents" $docBody
if ($r) { Write-Host " created" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }

Write-Host ""
Write-Host "Done! All attributes, indexes and singleton doc created." -ForegroundColor Green
