# Azure Static Web Apps Deployment Script
$ErrorActionPreference = "Continue"

Write-Host "=== Azure Static Web Apps Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$deploymentToken = "d58b09f1ae09c2900fb13d1e42a3468fd69b74b38d62fdd13979c401596adf5a01-4f87cd50-59d4-4af2-b8fb-e656ffe27bb601006160a5856d10"
$appName = "medical-practice-app-v2"
$resourceGroup = "medical-practice-rg"
$env = "production"

# Verify files
Write-Host "Verifying deployment files..." -ForegroundColor Yellow
if (-not (Test-Path "dist")) {
    Write-Host "ERROR: dist folder not found!" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "api")) {
    Write-Host "ERROR: api folder not found!" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "staticwebapp.config.json")) {
    Write-Host "ERROR: staticwebapp.config.json not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All files verified" -ForegroundColor Green
Write-Host ""

# Count files
$distFiles = (Get-ChildItem dist -Recurse -File).Count
$apiFunctions = (Get-ChildItem api -Directory | Where-Object { Test-Path "$($_.FullName)\function.json" }).Count

Write-Host "Deployment summary:" -ForegroundColor Cyan
Write-Host "  - Frontend files: $distFiles"
Write-Host "  - API functions: $apiFunctions"
Write-Host ""

# Deploy using SWA CLI
Write-Host "Starting deployment..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

try {
    # Set environment variables for better error handling
    $env:SWA_CLI_DEBUG = "false"
    $env:NODE_ENV = "production"
    
    # Deploy with explicit timeout handling
    $job = Start-Job -ScriptBlock {
        param($token, $app, $rg, $env)
        Set-Location $using:PWD
        & swa deploy ./dist --api-location ./api --deployment-token $token --app-name $app --resource-group $rg --env $env 2>&1
    } -ArgumentList $deploymentToken, $appName, $resourceGroup, $env
    
    Write-Host "Deployment job started. Waiting for completion..." -ForegroundColor Cyan
    
    # Wait with timeout
    $job | Wait-Job -Timeout 600 | Out-Null
    
    if ($job.State -eq "Running") {
        Write-Host "WARNING: Deployment is taking longer than expected." -ForegroundColor Yellow
        Write-Host "The deployment may still be processing in Azure." -ForegroundColor Yellow
        Write-Host "Check Azure Portal for deployment status." -ForegroundColor Yellow
        Stop-Job $job
    } else {
        $result = Receive-Job $job
        Write-Host $result
    }
    
    Remove-Job $job -Force
    
    Write-Host ""
    Write-Host "=== Deployment Complete ===" -ForegroundColor Green
    Write-Host "Check Azure Portal for deployment status:"
    Write-Host "https://portal.azure.com/#@/resource/subscriptions/635ed0a2-310e-4545-ab0c-269cece8f7ee/resourceGroups/$resourceGroup/providers/Microsoft.Web/staticSites/$appName/deploymentCenter" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Upload deployment.zip manually via Azure Portal" -ForegroundColor Yellow
    exit 1
}
}

