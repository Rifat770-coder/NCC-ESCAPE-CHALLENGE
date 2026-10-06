$ErrorActionPreference = "Stop"

function Api([string]$method, [string]$url, $body) {
  $params = @{
    Uri = $url
    Method = $method
    UseBasicParsing = $true
  }
  if ($body) {
    $params["ContentType"] = "application/json"
    $params["Body"] = ($body | ConvertTo-Json -Compress -Depth 10)
  }
  return Invoke-WebRequest @params
}

$stamp = [DateTime]::Now.Ticks
Write-Host "Stamp: $stamp"

Write-Host "1) Register"
$r = Api POST "http://localhost:3000/api/register" @{
  name = "Brute"
  studentId = "BRUTE-$stamp"
  department = "Computer Science"
  batch = "24"
}
$reg = $r.Content | ConvertFrom-Json
$attemptId = $reg.attempt.id
Write-Host "  attemptId:" $attemptId

Write-Host "2) Start"
Api POST "http://localhost:3000/api/attempt/start" @{ attemptId = $attemptId } | Out-Null

Write-Host "3) Brute force Level 1 (4-digit code)"
$found = $false
for ($i = 0; $i -lt 10000; $i++) {
  $code = ("{0:D4}" -f $i)
  $r = Api POST "http://localhost:3000/api/attempt/submit" @{
    attemptId = $attemptId
    level = 1
    payload = @{ code = $code }
  }
  $resp = $r.Content | ConvertFrom-Json
  if ($resp.passed -eq $true) {
    Write-Host "  FOUND code:" $code "after $i tries"
    $found = $true
    break
  }
}

if (-not $found) {
  Write-Host "  code not found in 10k tries (rare)"
}

Write-Host "4) Check attempt status"
$r = Api GET "http://localhost:3000/api/attempt?id=$attemptId" $null
$view = ($r.Content | ConvertFrom-Json).attempt
Write-Host "  status:" $view.status "level:" $view.currentLevel "lives:" $view.livesRemaining

Write-Host "5) Probe leaderboard"
$r = Api GET "http://localhost:3000/api/leaderboard" $null
$lb = $r.Content | ConvertFrom-Json
Write-Host "  attempts:" $lb.stats.totalAttempts "successful:" $lb.stats.successfulMissions "failed:" $lb.stats.failedMissions "entries:" $lb.entries.Count