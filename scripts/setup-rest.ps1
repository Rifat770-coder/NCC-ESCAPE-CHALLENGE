# NCC Escape Challenge - Appwrite REST setup (no SDK scope checks)
param()

$ENDPOINT = "https://fra.cloud.appwrite.io/v1"
$PROJECT  = "6ac3e7c0001469e247da"
$DB       = "6ac3f9b00037aed54835"

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
        if ($status -eq 409) { return $null }
        $msg = $null
        try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch {}
        Write-Host " ERROR $status : $msg" -ForegroundColor Red
        throw
    }
}

function New-Col {
    param($id, $name)
    Write-Host "  $id ..." -NoNewline
    $perms = @('read("any")', 'create("users")', 'update("users")', 'delete("users")')
    $body = [ordered]@{
        collectionId     = $id
        name             = $name
        permissions      = $perms
        documentSecurity = $false
    }
    $r = Invoke-AW "POST" "/databases/$DB/collections" $body
    if ($r) { Write-Host " created" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

function New-Str {
    param($col, $key, $size, $required, $default = $null)
    Write-Host "    + string   $key" -NoNewline
    $b = [ordered]@{ key = $key; size = $size; required = $required }
    if ($null -ne $default) { $b["default"] = $default }
    $r = Invoke-AW "POST" "/databases/$DB/collections/$col/attributes/string" $b
    if ($r) { Write-Host " ok" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

function New-Int {
    param($col, $key, $required, $default = $null, $min = $null, $max = $null)
    Write-Host "    + integer  $key" -NoNewline
    $b = [ordered]@{ key = $key; required = $required }
    if ($null -ne $default) { $b["default"] = $default }
    if ($null -ne $min)     { $b["min"]     = $min }
    if ($null -ne $max)     { $b["max"]     = $max }
    $r = Invoke-AW "POST" "/databases/$DB/collections/$col/attributes/integer" $b
    if ($r) { Write-Host " ok" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }
}

function New-Bool {
    param($col, $key, $required, $default = $null)
    Write-Host "    + boolean  $key" -NoNewline
    $b = [ordered]@{ key = $key; required = $required }
    if ($null -ne $default) { $b["default"] = $default }
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
Write-Host "=== NCC Escape Challenge - Appwrite Setup ===" -ForegroundColor Cyan
Write-Host "  endpoint : $ENDPOINT"
Write-Host "  project  : $PROJECT"
Write-Host "  database : $DB"
Write-Host ""

# ---------- [1] participants ----------
Write-Host "[1/3] participants" -ForegroundColor Cyan
New-Col "participants" "Participants"
New-Str "participants" "name"       60   $true
New-Str "participants" "studentId"  30   $true
New-Str "participants" "department" 60   $true
New-Str "participants" "batch"      40   $true
New-Str "participants" "phone"      20   $false
New-Dt  "participants" "createdAt"  $false
New-Idx "participants" "idx_studentId" "unique" @("studentId") @()
New-Idx "participants" "idx_batch"     "key"    @("batch")     @()
Write-Host ""

# ---------- [2] gameAttempts ----------
Write-Host "[2/3] gameAttempts" -ForegroundColor Cyan
New-Col  "gameAttempts" "Game Attempts"
New-Str  "gameAttempts" "participantId"    64   $true
New-Str  "gameAttempts" "participantName"  60   $true
New-Str  "gameAttempts" "participantBatch" 40   $true
New-Dt   "gameAttempts" "startedAt"        $false
New-Dt   "gameAttempts" "completedAt"      $false
New-Str  "gameAttempts" "status"           16   $true
New-Int  "gameAttempts" "currentLevel"     $true  1  1  4
New-Int  "gameAttempts" "livesRemaining"   $true  3  0  9
New-Int  "gameAttempts" "completionTimeMs" $false
New-Bool "gameAttempts" "prizeEligible"    $true  $false
New-Bool "gameAttempts" "prizeClaimed"     $true  $false
New-Int  "gameAttempts" "score"            $true  0
New-Int  "gameAttempts" "levelSeed"        $true
New-Str  "gameAttempts" "levelResults"     4000 $true "[]"
New-Dt   "gameAttempts" "createdAt"        $false
New-Idx  "gameAttempts" "idx_attempt_participant"      "key" @("participantId")            @("ASC")
New-Idx  "gameAttempts" "idx_attempt_status_completed" "key" @("status","completedAt")     @("ASC","DESC")
New-Idx  "gameAttempts" "idx_attempt_prize"            "key" @("prizeEligible","prizeClaimed") @()
Write-Host ""

# ---------- [3] gameSettings ----------
Write-Host "[3/3] gameSettings" -ForegroundColor Cyan
New-Col  "gameSettings" "Game Settings"
New-Bool "gameSettings" "gameActive"         $true  $true
New-Int  "gameSettings" "durationSeconds"    $true  120  30  3600
New-Int  "gameSettings" "startingLives"      $true  3    1   9
New-Bool "gameSettings" "retryAllowed"       $true  $false
New-Int  "gameSettings" "maximumAttempts"    $true  1    1   10
New-Bool "gameSettings" "leaderboardEnabled" $true  $true
New-Bool "gameSettings" "prizeMode"          $true  $true

# Wait a moment for attributes to become available before inserting a document
Write-Host "  waiting for attributes to be ready..."
Start-Sleep -Seconds 5

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
$r = Invoke-AW "POST" "/databases/$DB/collections/gameSettings/documents" $docBody
if ($r) { Write-Host " created" -ForegroundColor Green } else { Write-Host " exists" -ForegroundColor Yellow }

Write-Host ""
Write-Host "Done! All collections created." -ForegroundColor Green
