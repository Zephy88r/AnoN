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

Write-Host '=== Re-ban Guard Test ===' -ForegroundColor Green

try {
    $adminLoginBody = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $adminLogin = Invoke-RestMethod -Uri ($BaseUrl + '/admin/login') -Method Post -ContentType 'application/json' -Body $adminLoginBody
    $adminHeaders = @{ Authorization = 'Bearer ' + $adminLogin.token; 'Content-Type' = 'application/json' }

    $deviceId = 'reban-guard-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
    $keyBytes = New-DeviceSecretBytes
    $userSession = Invoke-Bootstrap -DevicePublicId $deviceId -KeyBytes $keyBytes -IncludeSecretHash
    $anonId = $userSession.anon_id

    Write-Host 'Applying first ban...' -ForegroundColor Cyan
    $first = Invoke-RestMethod -Uri ($BaseUrl + '/admin/users/ban') -Method Post -Headers $adminHeaders -Body (@{ anon_id = $anonId; ban_duration = '1day' } | ConvertTo-Json)
    if ($first.status -ne 'success') {
        throw 'First ban failed unexpectedly'
    }

    Write-Host 'Applying second ban (should be blocked)...' -ForegroundColor Cyan
    $secondBlocked = $false
    try {
        Invoke-RestMethod -Uri ($BaseUrl + '/admin/users/ban') -Method Post -Headers $adminHeaders -Body (@{ anon_id = $anonId; ban_duration = '3days' } | ConvertTo-Json) | Out-Null
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -eq 409) {
            $secondBlocked = $true
        }
    }

    if (-not $secondBlocked) {
        throw 'Expected second ban attempt to be blocked with HTTP 409'
    }

    $users = Invoke-RestMethod -Uri ($BaseUrl + '/admin/users') -Method Get -Headers @{ Authorization = 'Bearer ' + $adminLogin.token }
    $target = $users.users | Where-Object { $_.anon_id -eq $anonId }
    if (-not $target) {
        throw 'Target user not found in admin users list'
    }
    if (-not $target.is_banned) {
        throw 'Expected is_banned=true in admin users list'
    }
    if (-not $target.ban_label) {
        throw 'Expected ban_label to be present in admin users list'
    }

    Write-Host ''
    Write-Host '=== SUCCESS ===' -ForegroundColor Green
    Write-Host ('Target anon_id: ' + $anonId)
    Write-Host ('Ban label: ' + $target.ban_label)
}
catch {
    Write-Host ''
    Write-Host '=== FAILED ===' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
