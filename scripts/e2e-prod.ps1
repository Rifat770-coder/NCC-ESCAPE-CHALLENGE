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
Write-Host "E2E prod: $stamp"

Write-Host "1) Register"
$r = Api POST "http://localhost:3000/api/register" @{
  name = "E2E-Prod"
  studentId = "PROD-$stamp"
  department = "Computer Science"
  batch = "24"
}
$reg = $r.Content | ConvertFrom-Json
$attemptId = $reg.attempt.id
$seed = $reg.attempt.levelSeed
Write-Host "  attemptId:" $attemptId "seed:" $seed

Write-Host "2) Start"
$r = Api POST "http://localhost:3000/api/attempt/start" @{ attemptId = $attemptId }
$start = $r.Content | ConvertFrom-Json
$l1 = $start.plan.level1
Write-Host "  Level 1 puzzle:" $l1.id

Write-Host "3) Brute force Level 1 (try ~25 codes per digit, stop on first hit)"
$found = $false
foreach ($first in 0..9) {
  if ($found) { break }
  for ($i = 0; $i -lt 1000; $i++) {
    $code = ("{0}{1:D3}" -f $first, $i)
    $r = Api POST "http://localhost:3000/api/attempt/submit" @{
      attemptId = $attemptId
      level = 1
      payload = @{ code = $code }
    }
    $resp = $r.Content | ConvertFrom-Json
    if ($resp.passed -eq $true) {
      Write-Host "  FOUND L1:" $code
      $found = $true
      break
    }
    if ($resp.attempt.status -ne "ACTIVE") {
      Write-Host "  attempt died:" $resp.attempt.status
      exit 1
    }
  }
}
if (-not $found) { Write-Host "  L1 not found"; exit 1 }

Write-Host "4) Probe leaderboard (L1 passed, but mission not complete)"
$r = Api GET "http://localhost:3000/api/leaderboard" $null
$lb = $r.Content | ConvertFrom-Json
Write-Host "  attempts:" $lb.stats.totalAttempts "entries:" $lb.entries.Count

Write-Host "DONE"