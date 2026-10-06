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

Write-Host "1. Register participant"
$reg = Api POST "http://localhost:3000/api/register" @{
  name = "Rifat Hossain"
  studentId = "CSE-2024-001"
  department = "Computer Science & Engineering"
  batch = "24"
}
$regJson = $reg.Content | ConvertFrom-Json
Write-Host "  ok=" $regJson.ok " attemptId=" $regJson.attempt.id
$attemptId = $regJson.attempt.id

Write-Host "2. Start attempt"
$start = Api POST "http://localhost:3000/api/attempt/start" @{ attemptId = $attemptId }
$startJson = $start.Content | ConvertFrom-Json
Write-Host "  ok=" $startJson.ok " status=" $startJson.attempt.status " durationSeconds=" $startJson.attempt.durationSeconds

Write-Host "3. Submit Level 1 with WRONG code"
$sub1 = Api POST "http://localhost:3000/api/attempt/submit" @{
  attemptId = $attemptId
  level = 1
  payload = @{ code = "0000" }
}
$sub1Json = $sub1.Content | ConvertFrom-Json
Write-Host "  passed=" $sub1Json.passed " message=" $sub1Json.message " lives=" $sub1Json.attempt.livesRemaining

Write-Host "4. Submit Level 1 again with WRONG code"
$sub2 = Api POST "http://localhost:3000/api/attempt/submit" @{
  attemptId = $attemptId
  level = 1
  payload = @{ code = "1111" }
}
$sub2Json = $sub2.Content | ConvertFrom-Json
Write-Host "  passed=" $sub2Json.passed " lives=" $sub2Json.attempt.livesRemaining

Write-Host "5. Probe leaderboard"
$lb = Api GET "http://localhost:3000/api/leaderboard" $null
$lbJson = $lb.Content | ConvertFrom-Json
Write-Host "  entries=" $lbJson.entries.Count " stats=" ($lbJson.stats | ConvertTo-Json -Compress)

Write-Host "6. Probe admin login with WRONG password"
try {
  $login = Api POST "http://localhost:3000/api/admin/login" @{ password = "wrong" }
  Write-Host "  unexpected status=" $login.StatusCode
} catch {
  Write-Host "  rejected as expected"
}

Write-Host "7. Probe admin login with DEFAULT password"
$login2 = Api POST "http://localhost:3000/api/admin/login" @{ password = "admin123" }
$login2Json = $login2.Content | ConvertFrom-Json
Write-Host "  ok=" $login2Json.ok

Write-Host "DONE"