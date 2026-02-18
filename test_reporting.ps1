#!/usr/bin/env pwsh

# Test script to create dummy posts and test reporting

$baseUrl = "http://localhost:8080"
$headers = @{
    "Content-Type" = "application/json"
}

# Create multiple users by creating different sessions
# Each post will have a different anonID

$anonIds = @("user_test_001", "user_test_002", "user_test_003", "user_test_004")
$postIds = @()

Write-Host "=== Creating Dummy Posts ===" -ForegroundColor Green

foreach ($anonId in $anonIds) {
    try {
        # Create a JWT token with this anonID (for testing purposes, we'll use the backend directly)
        # In real scenario, devices authenticate via challenge/response
        
        # For now, let's just make direct calls to the backend
        # First, let's create a post through the API with a simple auth approach
        
        Write-Host "Creating post for $anonId..." -ForegroundColor Cyan
        
        $postBody = @{
            text = "Dummy post from $anonId at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'). Test content for reporting feature."
        } | ConvertTo-Json
        
        # Note: This will fail without proper auth. Let's try to create posts via unauthenticated endpoint first
        # to see what happens
        $response = Invoke-WebRequest -Uri "$baseUrl/posts/create" `
            -Method POST `
            -Headers $headers `
            -Body $postBody `
            -SkipHttpErrorCheck
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
            $content = $response.Content | ConvertFrom-Json
            $postIds += $content.post.id
            Write-Host "✓ Created post: $($content.post.id)" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed: $($response.StatusCode) - $($response.Content)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Testing Report Functionality ===" -ForegroundColor Green

# Test reporting posts
for ($i = 0; $i -lt [Math]::Min(2, $postIds.Count); $i++) {
    $postId = $postIds[$i]
    Write-Host "`nReporting post $postId..." -ForegroundColor Cyan
    
    try {
        $reportBody = @{
            reason = "Test report $((Get-Date).Ticks % 1000)"
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$baseUrl/posts/$postId/report" `
            -Method POST `
            -Headers $headers `
            -Body $reportBody `
            -SkipHttpErrorCheck
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Report submitted successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed: $($response.StatusCode) - $($response.Content)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
Write-Host "Created posts: $($postIds.Count)"
Write-Host "Post IDs: $($postIds -join ', ')"
