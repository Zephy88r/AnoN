param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$AdminEmail = 'papa@gmail.com',
    [string]$AdminPassword = 'papa@',
    [string]$ReportReason = 'Spam'
)

$ErrorActionPreference = 'Stop'

function New-SessionToken {
    param([string]$DevicePublicId)

    $challengeBody = @{ device_public_id = $DevicePublicId } | ConvertTo-Json
    $challenge = Invoke-RestMethod -Uri ($BaseUrl + '/device/challenge') -Method Post -ContentType 'application/json' -Body $challengeBody

    $keyBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($keyBytes)
    $deviceSecretHash = [Convert]::ToBase64String($keyBytes)

    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $message = '{0}|{1}|{2}' -f $DevicePublicId, $challenge.nonce, $ts

    $hmac = New-Object System.Security.Cryptography.HMACSHA256(,$keyBytes)
    $proofBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($message))
    $proof = [Convert]::ToBase64String($proofBytes)

    $bootstrapBody = @{
        device_public_id = $DevicePublicId
        nonce = $challenge.nonce
        ts = $ts
        proof = $proof
        device_secret_hash = $deviceSecretHash
        region = 'test'
    } | ConvertTo-Json

    Invoke-RestMethod -Uri ($BaseUrl + '/session/bootstrap') -Method Post -ContentType 'application/json' -Body $bootstrapBody
}

Write-Host '=== E2E Reporting Test ===' -ForegroundColor Green

try {
    Write-Host 'Checking backend health...' -ForegroundColor Cyan
    $health = Invoke-RestMethod -Uri ($BaseUrl + '/health') -Method Get
    Write-Host ('Backend health: {0}' -f $health) -ForegroundColor Green

    $authorDeviceId = 'report-test-author-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
    $reporterDeviceId = 'report-test-reporter-' + [guid]::NewGuid().ToString('N').Substring(0, 10)

    Write-Host 'Bootstrapping author session...' -ForegroundColor Cyan
    $authorSession = New-SessionToken -DevicePublicId $authorDeviceId

    Write-Host 'Bootstrapping reporter session...' -ForegroundColor Cyan
    $reporterSession = New-SessionToken -DevicePublicId $reporterDeviceId

    $authorHeaders = @{
        Authorization = 'Bearer ' + $authorSession.token
        'Content-Type' = 'application/json'
    }
    $reporterHeaders = @{
        Authorization = 'Bearer ' + $reporterSession.token
        'Content-Type' = 'application/json'
    }

    Write-Host 'Creating post as author...' -ForegroundColor Cyan
    $postBody = @{ text = ('E2E report test post {0}' -f (Get-Date -Format o)) } | ConvertTo-Json
    $postRes = Invoke-RestMethod -Uri ($BaseUrl + '/posts/create') -Method Post -Headers $authorHeaders -Body $postBody
    $postId = $postRes.post.id
    Write-Host ('Created post: {0}' -f $postId) -ForegroundColor Green

    Write-Host 'Reporting post as reporter...' -ForegroundColor Cyan
    $reportBody = @{ reason = $ReportReason } | ConvertTo-Json
    $reportRes = Invoke-RestMethod -Uri ($BaseUrl + '/posts/' + $postId + '/report') -Method Post -Headers $reporterHeaders -Body $reportBody
    if (-not $reportRes.ok) {
        throw 'Report endpoint did not return ok=true'
    }
    Write-Host 'Report submitted' -ForegroundColor Green

    Write-Host 'Logging in admin...' -ForegroundColor Cyan
    $adminLoginBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $adminLogin = Invoke-RestMethod -Uri ($BaseUrl + '/admin/login') -Method Post -ContentType 'application/json' -Body $adminLoginBody
    $adminHeaders = @{ Authorization = 'Bearer ' + $adminLogin.token }

    Write-Host 'Fetching admin abuse dashboard...' -ForegroundColor Cyan
    $abuse = Invoke-RestMethod -Uri ($BaseUrl + '/admin/abuse') -Method Get -Headers $adminHeaders
    $match = $abuse.abuse_reports | Where-Object { $_.anon_id -eq $authorSession.anon_id }

    if (-not $match) {
        throw ('No abuse row found for author anon_id ' + $authorSession.anon_id)
    }

    if (-not $match.reported_post) {
        throw 'Abuse row found, but reported_post is empty'
    }

    if ($match.reported_post.post_id -ne $postId) {
        throw ('reported_post.post_id mismatch. Expected ' + $postId + ', got ' + $match.reported_post.post_id)
    }

    Write-Host ''
    Write-Host '=== SUCCESS ===' -ForegroundColor Green
    Write-Host ('Author anon_id: ' + $authorSession.anon_id)
    Write-Host ('Reporter anon_id: ' + $reporterSession.anon_id)
    Write-Host ('Post ID: ' + $postId)
    Write-Host ('Report count in abuse: ' + $match.reported_post.report_count)
    Write-Host ('Report reason in abuse: ' + $match.reported_post.reason)
    Write-Host ''
    Write-Host 'Abuse row:' -ForegroundColor Green
    $match | ConvertTo-Json -Depth 8
}
catch {
    Write-Host ''
    Write-Host '=== FAILED ===' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
