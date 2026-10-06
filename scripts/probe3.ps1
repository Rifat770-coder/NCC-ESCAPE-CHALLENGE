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
$r = Api POST "http://localhost:3000/api/register" @{
  name = "Test4"
  studentId = "E2E-debug-4"
  department = "Computer Science"
  batch = "24"
}
$reg = $r.Content | ConvertFrom-Json
$attemptId = $reg.attempt.id
Write-Host "  attemptId:" $attemptId

Write-Host "2) GET attempt"
$r = Api GET "http://localhost:3000/api/attempt?id=$attemptId" $null
Write-Host "  status:" ($r.Content | ConvertFrom-Json).attempt.status

Write-Host "3) Start"
$r = Api POST "http://localhost:3000/api/attempt/start" @{ attemptId = $attemptId }
Write-Host "  start response:" $r.Content.Substring(0, 100)

Write-Host "4) GET attempt again"
$r = Api GET "http://localhost:3000/api/attempt?id=$attemptId" $null
Write-Host "  status:" ($r.Content | ConvertFrom-Json).attempt.status

Write-Host "5) Submit wrong code"
$r = Api POST "http://localhost:3000/api/attempt/submit" @{
  attemptId = $attemptId
  level = 1
  payload = @{ code = "9999" }
}
$resp = $r.Content | ConvertFrom-Json
Write-Host "  passed:" $resp.passed "lives:" $resp.attempt.livesRemaining

Write-Host "6) Submit wrong code 2 more times to lose all lives"
Api POST "http://localhost:3000/api/attempt/submit" @{ attemptId = $attemptId; level = 1; payload = @{ code = "8888" } } | Out-Null
$r = Api POST "http://localhost:3000/api/attempt/submit" @{ attemptId = $attemptId; level = 1; payload = @{ code = "7777" } }
$resp = $r.Content | ConvertFrom-Json
Write-Host "  status:" $resp.attempt.status "eligible:" $resp.attempt.prizeEligible

Write-Host "7) Probe leaderboard"
$r = Api GET "http://localhost:3000/api/leaderboard" $null
$lb = $r.Content | ConvertFrom-Json
Write-Host "  attempts:" $lb.stats.totalAttempts "successful:" $lb.stats.successfulMissions "failed:" $lb.stats.failedMissions "entries:" $lb.entries.Count