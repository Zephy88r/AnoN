param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$AdminEmail = 'papa@gmail.com',
    [string]$AdminPassword = 'papa@'
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
    param([string]$DevicePublicId, [string]$Nonce, [long]$Timestamp, [byte[]]$KeyBytes)
    $message = '{0}|{1}|{2}' -f $DevicePublicId, $Nonce, $Timestamp
    $hmac = New-Object System.Security.Cryptography.HMACSHA256(,$KeyBytes)
    [Convert]::ToBase64String($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($message)))
}

function Invoke-Bootstrap {
    param([string]$DevicePublicId, [byte[]]$KeyBytes, [switch]$IncludeSecretHash)

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

Write-Host '=== Ban Popup Payload Test ===' -ForegroundColor Green

try {
    $adminLogin = Invoke-RestMethod -Uri ($BaseUrl + '/admin/login') -Method Post -ContentType 'application/json' -Body (@{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json)
    $adminHeaders = @{ Authorization = 'Bearer ' + $adminLogin.token; 'Content-Type' = 'application/json' }

    $deviceId = 'ban-popup-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
    $keyBytes = New-DeviceSecretBytes

    $session = Invoke-Bootstrap -DevicePublicId $deviceId -KeyBytes $keyBytes -IncludeSecretHash
    Invoke-RestMethod -Uri ($BaseUrl + '/admin/users/ban') -Method Post -Headers $adminHeaders -Body (@{ anon_id = $session.anon_id; ban_duration = '1day' } | ConvertTo-Json) | Out-Null

    $challenge = Get-Challenge -DevicePublicId $deviceId
    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $proof = New-Proof -DevicePublicId $deviceId -Nonce $challenge.nonce -Timestamp $ts -KeyBytes $keyBytes
    $bootstrapBody = @{
        device_public_id = $deviceId
        nonce = $challenge.nonce
        ts = $ts
        proof = $proof
        region = 'test'
    } | ConvertTo-Json

    $bodyText = ''
    try {
        Invoke-RestMethod -Uri ($BaseUrl + '/session/bootstrap') -Method Post -ContentType 'application/json' -Body $bootstrapBody | Out-Null
        throw 'Expected bootstrap to fail for banned user'
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -ne 403) {
            throw ('Expected 403, got ' + $statusCode)
        }

        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $bodyText = $_.ErrorDetails.Message
        } else {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $bodyText = $reader.ReadToEnd()
        }
    }

    Write-Host ('Raw ban response: ' + $bodyText)
    $payload = $bodyText | ConvertFrom-Json

    if ($payload.code -ne 'USER_BANNED') {
        throw 'Expected code USER_BANNED in response'
    }
    if (-not $payload.details.remaining_seconds) {
        throw 'Expected details.remaining_seconds in response'
    }

    Write-Host 'SUCCESS: popup payload fields present' -ForegroundColor Green
    Write-Host $bodyText
}
catch {
    Write-Host ''
    Write-Host '=== FAILED ===' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
