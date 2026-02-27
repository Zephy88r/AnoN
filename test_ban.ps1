param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$AdminEmail = 'papa@gmail.com',
    [string]$AdminPassword = 'papa@',
    [string]$BanDuration = '1day'
)

$ErrorActionPreference = 'Stop'

function New-DeviceSecretBytes {
    $keyBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($keyBytes)
    return ,$keyBytes
}

function Get-Challenge {
    param([string]$DevicePublicId)

    $challengeBody = @{ device_public_id = $DevicePublicId } | ConvertTo-Json
    return Invoke-RestMethod -Uri ($BaseUrl + '/device/challenge') -Method Post -ContentType 'application/json' -Body $challengeBody
}

function New-Proof {
    param(
        [string]$DevicePublicId,
        [string]$Nonce,
        [long]$Timestamp,
        [byte[]]$KeyBytes
    )

    $message = '{0}|{1}|{2}' -f $DevicePublicId, $Nonce, $Timestamp
    $hmac = New-Object System.Security.Cryptography.HMACSHA256(,$KeyBytes)
    $proofBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($message))
    return [Convert]::ToBase64String($proofBytes)
}

function Invoke-Bootstrap {
    param(
        [string]$DevicePublicId,
        [byte[]]$KeyBytes,
        [switch]$IncludeSecretHash
    )

    $challenge = Get-Challenge -DevicePublicId $DevicePublicId
    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $proof = New-Proof -DevicePublicId $DevicePublicId -Nonce $challenge.nonce -Timestamp $ts -KeyBytes $KeyBytes

    $body = @{
        device_public_id = $DevicePublicId
        nonce = $challenge.nonce
        ts = $ts
        proof = $proof
        region = 'test'
    }

    if ($IncludeSecretHash) {
        $body.device_secret_hash = [Convert]::ToBase64String($KeyBytes)
    }

    return Invoke-RestMethod -Uri ($BaseUrl + '/session/bootstrap') -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json)
}

Write-Host '=== E2E Ban Test ===' -ForegroundColor Green

try {
    Write-Host 'Checking backend health...' -ForegroundColor Cyan
    $health = Invoke-RestMethod -Uri ($BaseUrl + '/health') -Method Get
    Write-Host ('Backend health: {0}' -f $health) -ForegroundColor Green

    $deviceId = 'ban-test-user-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
    $keyBytes = New-DeviceSecretBytes

    Write-Host 'Bootstrapping target user session...' -ForegroundColor Cyan
    $userSession = Invoke-Bootstrap -DevicePublicId $deviceId -KeyBytes $keyBytes -IncludeSecretHash
    $anonId = $userSession.anon_id
    Write-Host ('Target anon_id: {0}' -f $anonId) -ForegroundColor Green

    Write-Host 'Logging in as admin...' -ForegroundColor Cyan
    $adminLoginBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $adminLogin = Invoke-RestMethod -Uri ($BaseUrl + '/admin/login') -Method Post -ContentType 'application/json' -Body $adminLoginBody
    $adminHeaders = @{
        Authorization = 'Bearer ' + $adminLogin.token
        'Content-Type' = 'application/json'
    }

    Write-Host ('Banning user for duration: {0}' -f $BanDuration) -ForegroundColor Cyan
    $banBody = @{ anon_id = $anonId; ban_duration = $BanDuration } | ConvertTo-Json
    $banRes = Invoke-RestMethod -Uri ($BaseUrl + '/admin/users/ban') -Method Post -Headers $adminHeaders -Body $banBody
    if ($banRes.status -ne 'success') {
        throw 'Ban endpoint did not return success status'
    }

    Write-Host ('Ban applied. sessions_revoked={0}' -f $banRes.sessions_revoked) -ForegroundColor Green

    Write-Host 'Verifying refresh is blocked for banned user...' -ForegroundColor Cyan
    $refreshHeaders = @{ Authorization = 'Bearer ' + $userSession.token }
    $refreshBlocked = $false
    try {
        Invoke-RestMethod -Uri ($BaseUrl + '/session/refresh') -Method Post -Headers $refreshHeaders | Out-Null
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -eq 403) {
            $refreshBlocked = $true
        }
    }
    if (-not $refreshBlocked) {
        throw 'Expected /session/refresh to return 403 for banned user'
    }

    Write-Host 'Verifying re-bootstrap is blocked for banned user...' -ForegroundColor Cyan
    $bootstrapBlocked = $false
    try {
        Invoke-Bootstrap -DevicePublicId $deviceId -KeyBytes $keyBytes | Out-Null
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -eq 403) {
            $bootstrapBlocked = $true
        }
    }
    if (-not $bootstrapBlocked) {
        throw 'Expected /session/bootstrap to return 403 for banned user device'
    }

    Write-Host ''
    Write-Host '=== SUCCESS ===' -ForegroundColor Green
    Write-Host ('Banned anon_id: ' + $anonId)
    Write-Host ('Ban duration: ' + $BanDuration)
    $banRes | ConvertTo-Json -Depth 8
}
catch {
    Write-Host ''
    Write-Host '=== FAILED ===' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
