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

Write-Host "1) Register"
$body = @{
  name = "Test3"
  studentId = "E2E-debug-3"
  department = "Computer Science"
  batch = "24"
}
$r = Api POST "http://localhost:3000/api/register" $body
$reg = $r.Content | ConvertFrom-Json
$attemptId = $reg.attempt.id
Write-Host "  attemptId:" $attemptId "seed:" $reg.attempt.levelSeed

Write-Host "2) Start"
$r = Api POST "http://localhost:3000/api/attempt/start" @{ attemptId = $attemptId }
Write-Host "  status:" ($r.Content | ConvertFrom-Json).attempt.status

Write-Host "3) Submit wrong code (verify lives decrement)"
$r = Api POST "http://localhost:3000/api/attempt/submit" @{
  attemptId = $attemptId
  level = 1
  payload = @{ code = "9999" }
}
$resp = $r.Content | ConvertFrom-Json
Write-Host "  passed:" $resp.passed "lives:" $resp.attempt.livesRemaining

Write-Host "4) Fail attempt (timeout simulation via fail API)"
$r = Api POST "http://localhost:3000/api/attempt/fail" @{ attemptId = $attemptId }
$resp = $r.Content | ConvertFrom-Json
Write-Host "  status:" $resp.view.status "eligible:" $resp.view.prizeEligible

Write-Host "5) Probe leaderboard"
$r = Api GET "http://localhost:3000/api/leaderboard" $null
$lb = $r.Content | ConvertFrom-Json
Write-Host "  attempts:" $lb.stats.totalAttempts "successful:" $lb.stats.successfulMissions "entries:" $lb.entries.Count

Write-Host "DONE"