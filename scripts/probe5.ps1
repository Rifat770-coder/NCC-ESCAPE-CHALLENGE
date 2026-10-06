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

Write-Host "3) Brute force Level 1 (split into 4 quadrants based on first digit)"
$found = $false
$digit = -1
foreach ($firstDigit in 0..9) {
  if ($found) { break }
  Write-Host "  trying first digit $firstDigit..."
  for ($i = 0; $i -lt 1000; $i++) {
    $code = ("{0}{1:D3}" -f $firstDigit, $i)
    $r = Api POST "http://localhost:3000/api/attempt/submit" @{
      attemptId = $attemptId
      level = 1
      payload = @{ code = $code }
    }
    $resp = $r.Content | ConvertFrom-Json
    if ($resp.passed -eq $true) {
      Write-Host "  FOUND code:" $code
      $found = $true
      break
    }
    if ($resp.attempt.status -ne "ACTIVE") {
      Write-Host "  attempt ended:" $resp.attempt.status "lives:" $resp.attempt.livesRemaining
      $found = $false
      break
    }
  }
  if ($found -eq $false -and $i -ge 999) {
    # Maybe no active attempts left; check
  }
}

if (-not $found) {
  Write-Host "  brute force failed (rare)"
  exit 1
}

Write-Host "4) Probe leaderboard"
$r = Api GET "http://localhost:3000/api/leaderboard" $null
$lb = $r.Content | ConvertFrom-Json
Write-Host "  attempts:" $lb.stats.totalAttempts "successful:" $lb.stats.successfulMissions "entries:" $lb.entries.Count

Write-Host "DONE"