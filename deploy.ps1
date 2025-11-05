$deploymentToken = "d58b09f1ae09c2900fb13d1e42a3468fd69b74b38d62fdd13979c401596adf5a01-4f87cd50-59d4-4af2-b8fb-e656ffe27bb601006160a5856d10"
$zipPath = "deployment.zip"
$hostname = "lemon-mushroom-0a5856d10.1.azurestaticapps.net"

Write-Host "Using SWA CLI to deploy..."
Write-Host "Deployment token: $($deploymentToken.Substring(0,20))..."
Write-Host "Zip file: $zipPath"

# Use SWA CLI directly with timeout
$env:SWA_CLI_DEBUG = "1"
swa deploy ./dist --api-location ./api --deployment-token $deploymentToken --app-name medical-practice-app-v2 --env production --no-use-keychain

