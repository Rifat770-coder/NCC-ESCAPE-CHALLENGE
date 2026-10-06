$ErrorActionPreference = "Stop"

$body = '{"name":"Test2","studentId":"E2E-debug-2","department":"Computer Science","batch":"24"}'
$r = Invoke-WebRequest -Uri http://localhost:3000/api/register -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
Write-Host "REGISTER:" $r.Content

$lb = Invoke-WebRequest -Uri http://localhost:3000/api/leaderboard -UseBasicParsing
Write-Host "LEADERBOARD:" $lb.Content