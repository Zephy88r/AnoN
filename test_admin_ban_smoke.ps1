param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$AdminEmail = 'papa@gmail.com',
    [string]$AdminPassword = 'papa@',
    [string]$BanDuration = '1day'
)

$ErrorActionPreference = 'Stop'

function New-DeviceSecretBytes {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ,$bytes
}

function Get-Challenge {
    param([string]$DevicePublicId)

    $body = @{ device_public_id = $DevicePublicId } | ConvertTo-Json
    Invoke-RestMethod -Uri ($BaseUrl + '/device/challenge') -Method Post -ContentType 'application/json' -Body $body
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
    [Convert]::ToBase64String($proofBytes)
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

    Invoke-RestMethod -Uri ($BaseUrl + '/session/bootstrap') -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json)
}

Write-Host '=== Admin Users/Ban Smoke Test ===' -ForegroundColor Green

try {
    Write-Host 'Checking backend health...' -ForegroundColor Cyan
    $health = Invoke-RestMethod -Uri ($BaseUrl + '/health') -Method Get
    Write-Host ('Backend health: {0}' -f $health) -ForegroundColor Green

    $deviceId = 'admin-ban-smoke-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
    $keyBytes = New-DeviceSecretBytes

    Write-Host 'Bootstrapping target user (simulates real user)...' -ForegroundColor Cyan
    $userSession = Invoke-Bootstrap -DevicePublicId $deviceId -KeyBytes $keyBytes -IncludeSecretHash
    $anonId = $userSession.anon_id

    Write-Host 'Logging in admin...' -ForegroundColor Cyan
    $adminLoginBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $adminLogin = Invoke-RestMethod -Uri ($BaseUrl + '/admin/login') -Method Post -ContentType 'application/json' -Body $adminLoginBody
    $adminHeaders = @{ Authorization = 'Bearer ' + $adminLogin.token; 'Content-Type' = 'application/json' }

    Write-Host 'Fetching admin users list (pre-ban)...' -ForegroundColor Cyan
    $usersBefore = Invoke-RestMethod -Uri ($BaseUrl + '/admin/users') -Method Get -Headers $adminHeaders
    $targetBefore = $usersBefore.users | Where-Object { $_.anon_id -eq $anonId }
    if (-not $targetBefore) {
        throw ('User not found in /admin/users before ban: ' + $anonId)
    }

    Write-Host ('Applying ban via /admin/users/ban duration=' + $BanDuration + ' ...') -ForegroundColor Cyan
    $banBody = @{ anon_id = $anonId; ban_duration = $BanDuration } | ConvertTo-Json
    $banRes = Invoke-RestMethod -Uri ($BaseUrl + '/admin/users/ban') -Method Post -Headers $adminHeaders -Body $banBody
    if ($banRes.status -ne 'success') {
        throw 'Ban endpoint did not return success'
    }

    Write-Host 'Fetching admin users list (post-ban)...' -ForegroundColor Cyan
    $usersAfter = Invoke-RestMethod -Uri ($BaseUrl + '/admin/users') -Method Get -Headers $adminHeaders
    $targetAfter = $usersAfter.users | Where-Object { $_.anon_id -eq $anonId }
    if (-not $targetAfter) {
        throw ('User not found in /admin/users after ban: ' + $anonId)
    }

    Write-Host 'Verifying banned user cannot refresh session...' -ForegroundColor Cyan
    $refreshBlocked = $false
    try {
        Invoke-RestMethod -Uri ($BaseUrl + '/session/refresh') -Method Post -Headers @{ Authorization = 'Bearer ' + $userSession.token } | Out-Null
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -eq 403) {
            $refreshBlocked = $true
        }
    }
    if (-not $refreshBlocked) {
        throw 'Expected banned user refresh to fail with 403'
    }

    Write-Host 'Verifying banned user cannot bootstrap again...' -ForegroundColor Cyan
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
        throw 'Expected banned user bootstrap to fail with 403'
    }

    Write-Host ''
    Write-Host '=== SUCCESS ===' -ForegroundColor Green
    Write-Host ('Target anon_id: ' + $anonId)
    Write-Host ('Admin users total (before): ' + $usersBefore.total)
    Write-Host ('Admin users total (after): ' + $usersAfter.total)
    Write-Host ('Ban duration: ' + $BanDuration)
    $banRes | ConvertTo-Json -Depth 8
}
catch {
    Write-Host ''
    Write-Host '=== FAILED ===' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
