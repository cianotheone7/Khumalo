const fetch = require('node-fetch');

module.exports = async function (context, req) {
    context.log('=== Microsoft OAuth callback received ===');
    context.log('Query params:', JSON.stringify(req.query));
    context.log('Headers host:', req.headers.host);
    context.log('URL:', req.url);

    // Wrap everything in try-catch to ensure we always return a response
    try {
        const code = req.query.code;
        const state = req.query.state;
        const error = req.query.error;

    if (error) {
        context.log(`OAuth error: ${error}`);
        const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>OAuth Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 { margin: 0 0 1rem 0; color: #dc3545; }
        p { margin: 0.5rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>❌ OAuth Error</h2>
        <p>OAuth authentication was cancelled or failed.</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">This window will close automatically...</p>
    </div>
    <script>
        try {
            if (window.opener && !window.opener.closed) {
                const origin = window.location.origin;
                window.opener.postMessage({
                    type: 'email_error',
                    message: 'OAuth error: ${error.replace(/'/g, "\\'").replace(/"/g, '&quot;')}'
                }, origin);
                setTimeout(function() {
                    window.close();
                }, 2000);
            } else {
                document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
            }
        } catch (e) {
            console.error('Error:', e);
            document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
        }
    </script>
</body>
</html>
        `;
        context.res = {
            status: 400,
            headers: {
                'Content-Type': 'text/html'
            },
            body: errorHtml
        };
        return;
    }

    if (!code) {
        context.log('No authorization code received');
        const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Authorization Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 { margin: 0 0 1rem 0; color: #dc3545; }
        p { margin: 0.5rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>❌ Authorization Error</h2>
        <p>No authorization code received from Microsoft.</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">This window will close automatically...</p>
    </div>
    <script>
        try {
            if (window.opener && !window.opener.closed) {
                const origin = window.location.origin;
                window.opener.postMessage({
                    type: 'email_error',
                    message: 'No authorization code received'
                }, origin);
                setTimeout(function() {
                    window.close();
                }, 2000);
            } else {
                document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
            }
        } catch (e) {
            console.error('Error:', e);
            document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
        }
    </script>
</body>
</html>
        `;
        context.res = {
            status: 400,
            headers: {
                'Content-Type': 'text/html'
            },
            body: errorHtml
        };
        return;
        }

        try {
            const clientId = process.env.MICROSOFT_CLIENT_ID;
            const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
            const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
            
            if (!clientId || !clientSecret) {
            context.log('OAuth credentials not configured');
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: `
<!DOCTYPE html>
<html>
<head>
    <title>Configuration Error</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'OAuth is not configured on the server. Please contact your administrator.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Configuration Error</h2><p>OAuth credentials are not configured. Please contact your administrator.</p>';
        }
    </script>
</body>
</html>
                `
            };
            return;
        }
        
        // CRITICAL: The redirect URI MUST exactly match what was sent in the initial OAuth request
        // The redirect URI is the URL that Microsoft redirected TO (this callback URL)
        // We need to construct it from the current request
        
        // Known valid domains (custom domain and Static Web App domain)
        const validDomains = [
            'cortexha.com',
            'www.cortexha.com',
            'lemon-mushroom-0a5856d10.1.azurestaticapps.net'
        ];
        
        const detectedProtocol = req.headers['x-forwarded-proto'] ||
                                 req.headers['x-forwarded-protocol'] ||
                                 (req.headers['x-arr-ssl'] ? 'https' : 'https');
        
        // Method 1: Try x-forwarded-host first (most reliable for custom domains)
        let detectedHost = req.headers['x-forwarded-host'] || '';
        
        // Method 2: If x-forwarded-host contains azurewebsites.net (internal Function App), ignore it
        if (detectedHost && detectedHost.includes('azurewebsites.net')) {
            detectedHost = ''; // Reset to find the actual client domain
        }
        
        // Method 3: Try x-original-host
        if (!detectedHost) {
            detectedHost = req.headers['x-original-host'] || '';
        }
        
        // Method 4: Use host header but validate it's not an internal Azure domain
        if (!detectedHost || detectedHost.includes('azurewebsites.net')) {
            const hostHeader = req.headers.host || '';
            if (hostHeader && !hostHeader.includes('azurewebsites.net')) {
                detectedHost = hostHeader;
            }
        }
        
        // Clean up the host: remove port, lowercase, trim
        let hostWithoutPort = '';
        if (detectedHost) {
            hostWithoutPort = detectedHost.split(':')[0].trim().toLowerCase();
            
            // If we still have an internal Azure domain, try to extract from referer or use known domain
            if (hostWithoutPort.includes('azurewebsites.net')) {
                context.log('WARNING: Detected internal Azure Function App domain, trying to find actual domain');
                
                // Try to extract from referer if available
                if (req.headers.referer) {
                    try {
                        const refererUrl = new URL(req.headers.referer);
                        hostWithoutPort = refererUrl.hostname.toLowerCase();
                        context.log(`Extracted host from referer: ${hostWithoutPort}`);
                    } catch (e) {
                        context.log(`Failed to parse referer: ${req.headers.referer}`);
                    }
                }
                
                // If still an internal domain, use the first valid domain as fallback
                if (hostWithoutPort.includes('azurewebsites.net')) {
                    hostWithoutPort = validDomains[0]; // Use cortexha.com as primary
                    context.log(`Using fallback domain: ${hostWithoutPort}`);
                }
            }
        }
        
        // Final fallback: use known domain if nothing worked
        if (!hostWithoutPort || hostWithoutPort.includes('azurewebsites.net')) {
            hostWithoutPort = validDomains[0]; // Default to cortexha.com
            context.log(`Using default domain fallback: ${hostWithoutPort}`);
        }
        
        const redirectUri = `${detectedProtocol}://${hostWithoutPort}/api/auth/microsoft/callback`;
        context.log(`Final redirect URI: ${redirectUri}`);
        
        // Log all header information for debugging
        context.log('=== Redirect URI Detection (Microsoft) ===');
        context.log(`Request URL: ${req.url || 'none'}`);
        context.log(`X-Forwarded-Host: ${req.headers['x-forwarded-host'] || 'none'}`);
        context.log(`X-Original-Host: ${req.headers['x-original-host'] || 'none'}`);
        context.log(`X-Forwarded-URI: ${req.headers['x-forwarded-uri'] || 'none'}`);
        context.log(`X-Original-URL: ${req.headers['x-original-url'] || 'none'}`);
        context.log(`Host header: ${req.headers.host || 'none'}`);
        context.log(`Referer: ${req.headers.referer || 'none'}`);
        context.log(`Origin: ${req.headers.origin || 'none'}`);
        context.log(`Detected host (before cleanup): ${detectedHost || 'none'}`);
        context.log(`Final host: ${hostWithoutPort}`);
        context.log(`Final redirect URI: ${redirectUri}`);
        context.log(`Code received: ${code ? 'Yes' : 'No'}`);
        context.log(`State received: ${state || 'none'}`);
        
        if (!redirectUri || redirectUri.includes('azurewebsites.net')) {
            context.log('ERROR: Could not determine redirect URI');
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Configuration Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 { margin: 0 0 1rem 0; color: #dc3545; }
        p { margin: 0.5rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>❌ Configuration Error</h2>
        <p>Could not determine redirect URI. Please check server configuration.</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">This window will close automatically...</p>
    </div>
    <script>
        try {
            if (window.opener && !window.opener.closed) {
                const origin = window.location.origin;
                window.opener.postMessage({
                    type: 'email_error',
                    message: 'Configuration error: Could not determine redirect URI'
                }, origin);
                setTimeout(function() {
                    window.close();
                }, 2000);
            } else {
                document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
            }
        } catch (e) {
            console.error('Error:', e);
            document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
            return;
        }

        // Exchange code for tokens
        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                scope: 'https://graph.microsoft.com/Mail.Send offline_access'
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            context.log(`Token exchange failed: ${errorText}`);
            context.log(`Attempted redirect URI: ${redirectUri}`);
            context.log(`Client ID: ${clientId ? 'Set' : 'Missing'}`);
            context.log(`Client Secret: ${clientSecret ? 'Set' : 'Missing'}`);
            
            // Return detailed error for debugging
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>OAuth Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 { margin: 0 0 1rem 0; color: #dc3545; }
        p { margin: 0.5rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>❌ OAuth Error</h2>
        <p>Failed to exchange authorization code.</p>
        <p style="font-size: 0.85rem; color: #999; margin-top: 1rem;">Please check that your redirect URI matches your OAuth app configuration.</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">This window will close automatically...</p>
    </div>
    <script>
        try {
            if (window.opener && !window.opener.closed) {
                const origin = window.location.origin;
                window.opener.postMessage({
                    type: 'email_error',
                    message: 'Failed to exchange authorization code. Please verify your OAuth configuration.'
                }, origin);
                setTimeout(function() {
                    window.close();
                }, 2000);
            } else {
                document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
            }
        } catch (e) {
            console.error('Error:', e);
            document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 400,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
            return;
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;

        // Validate state format
        if (!state || typeof state !== 'string' || !state.includes('_')) {
            context.log('Invalid state format received');
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Invalid Request</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Invalid authentication request. Please try again.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Invalid Request</h2><p>Please try again.</p>';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
            return;
        }

        // Parse state to get user email
        const stateParts = state.split('_');
        if (stateParts.length < 2 || !stateParts[1]) {
            context.log('State missing user email');
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Invalid Request</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Invalid authentication request. Please try again.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Invalid Request</h2><p>Please try again.</p>';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
            return;
        }
        const userEmail = stateParts[1]; // Extract user email from state

        // Get user info from Microsoft Graph with timeout
        context.log('Fetching user info from Microsoft Graph...');
        context.log(`Using access token (first 20 chars): ${accessToken.substring(0, 20)}...`);
        
        let userInfoResponse;
        try {
            userInfoResponse = await Promise.race([
                fetch('https://graph.microsoft.com/v1.0/me', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('User info fetch timeout after 15 seconds')), 15000)
                )
            ]);
        } catch (timeoutError) {
            context.log(`User info fetch timeout or error: ${timeoutError.message}`);
            throw timeoutError;
        }

        if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            context.log(`Failed to get user info from Microsoft: Status ${userInfoResponse.status}`);
            context.log(`Error response: ${errorText}`);
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Error</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Failed to retrieve user information from Microsoft. Please try again.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Authentication Error</h2><p>Failed to retrieve user information.</p>';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 500,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
            return;
        }

        let userInfo;
        try {
            const responseText = await userInfoResponse.text();
            context.log(`User info response received (length: ${responseText.length})`);
            userInfo = JSON.parse(responseText);
            context.log(`User info parsed successfully. Keys: ${Object.keys(userInfo).join(', ')}`);
        } catch (jsonError) {
            context.log(`Failed to parse user info JSON: ${jsonError.message}`);
            throw new Error(`Invalid user info response from Microsoft: ${jsonError.message}`);
        }
        
        const email = userInfo.mail || userInfo.userPrincipalName;
        context.log(`Retrieved email from Microsoft: ${email}`);

        // Validate email was retrieved
        if (!email) {
            context.log('No email found in user info');
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Error</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Could not retrieve email address from Microsoft account.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Authentication Error</h2><p>Could not retrieve email address.</p>';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
            return;
        }

        // Store tokens in Azure Table Storage
        const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");
        const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
        const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const tableName = 'EmailConnections';

        if (!storageAccountKey) {
            context.log(`ERROR: AZURE_STORAGE_ACCOUNT_KEY not configured`);
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Configuration Error</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Backend configuration error: Storage account key not set. Please contact your administrator.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Configuration Error</h2><p>Storage account key not configured.</p>';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
            return;
        }

        try {
            const credential = new AzureNamedKeyCredential(storageAccountName, storageAccountKey);
            const tableClient = new TableClient(
                `https://${storageAccountName}.table.core.windows.net`,
                tableName,
                credential
            );

            // Ensure table exists
            try {
                await tableClient.createTable();
                context.log(`Table ${tableName} created or already exists`);
            } catch (createError) {
                // Ignore error if table already exists
                if (!createError.message.includes('TableAlreadyExists') && createError.statusCode !== 409) {
                    context.log(`Warning creating table: ${createError.message}`);
                    throw createError; // Re-throw if it's not a "table exists" error
                }
            }

            const entity = {
                partitionKey: 'user',
                rowKey: userEmail,
                email: email,
                provider: 'outlook',
                accessToken: accessToken, // In production, encrypt this
                refreshToken: refreshToken, // In production, encrypt this
                connectedAt: new Date().toISOString()
            };

            await tableClient.upsertEntity(entity, 'Replace');
            context.log(`✅ Stored tokens for user: ${userEmail}, email: ${email}`);
        } catch (storageError) {
            context.log(`❌ ERROR storing tokens: ${storageError.message}`);
            context.log(`Storage error details:`, storageError);
            
            const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Storage Error</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Failed to save email connection. Please contact your administrator. Error: Storage connection failed.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Storage Error</h2><p>Could not save email connection.</p>';
        }
    </script>
</body>
</html>
            `;
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
            return;
        }

        // Escape email for XSS prevention
        const escapedEmail = email.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Return success response with postMessage script
        const htmlResponse = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Connected</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 { margin: 0 0 1rem 0; color: #28a745; }
        p { margin: 0.5rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>✅ Outlook Connected Successfully!</h2>
        <p>Email: ${escapedEmail}</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">Closing window...</p>
    </div>
    <script>
        // Send success message to parent window
        try {
            if (window.opener && !window.opener.closed) {
                const origin = window.location.origin;
                window.opener.postMessage({
                    type: 'email_connected',
                    provider: 'outlook',
                    email: '${escapedEmail}'
                }, origin);
                
                // Close window after a short delay
                setTimeout(function() {
                    window.close();
                }, 500);
            } else {
                // No opener, just show message
                document.querySelector('.container p:last-child').textContent = 'You can close this window manually.';
            }
        } catch (error) {
            console.error('Error sending postMessage:', error);
            document.querySelector('.container p:last-child').textContent = 'Connection successful! Please close this window.';
        }
    </script>
</body>
</html>
        `;

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: htmlResponse
        };
        return;
        } catch (error) {
            context.log(`Error in Microsoft callback: ${error.message}`);
            context.log(`Error stack: ${error.stack}`);
        const errorMessage = error.message || 'Unknown error occurred';
        const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Connection Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 { margin: 0 0 1rem 0; color: #dc3545; }
        p { margin: 0.5rem 0; color: #666; }
        .error-detail { font-size: 0.85rem; color: #999; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h2>❌ Connection Failed</h2>
        <p>Failed to connect Outlook account.</p>
        <p class="error-detail">${errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">This window will close automatically...</p>
    </div>
    <script>
        try {
            if (window.opener && !window.opener.closed) {
                const origin = window.location.origin;
                window.opener.postMessage({
                    type: 'email_error',
                    message: 'Failed to connect Outlook account: ${errorMessage.replace(/'/g, "\\'").replace(/"/g, '&quot;')}'
                }, origin);
                
                setTimeout(function() {
                    window.close();
                }, 2000);
            } else {
                document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
            }
        } catch (e) {
            console.error('Error sending error message:', e);
            document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
        }
    </script>
</body>
</html>
        `;
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
        }
    } catch (outerError) {
        // Catch any unhandled errors and return a response
        context.log(`Unhandled error in Microsoft callback: ${outerError.message}`);
        context.log(`Error stack: ${outerError.stack}`);
        const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Unexpected Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 { margin: 0 0 1rem 0; color: #dc3545; }
        p { margin: 0.5rem 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>❌ Unexpected Error</h2>
        <p>An unexpected error occurred during authentication.</p>
        <p style="font-size: 0.85rem; color: #999; margin-top: 1rem;">Please try again or contact support.</p>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">This window will close automatically...</p>
    </div>
    <script>
        try {
            if (window.opener && !window.opener.closed) {
                const origin = window.location.origin;
                window.opener.postMessage({
                    type: 'email_error',
                    message: 'An unexpected error occurred. Please try again.'
                }, origin);
                setTimeout(function() {
                    window.close();
                }, 2000);
            } else {
                document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
            }
        } catch (e) {
            console.error('Error:', e);
            document.querySelector('.container p:last-child').textContent = 'Please close this window manually.';
        }
    </script>
</body>
</html>
        `;
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'text/html'
            },
            body: errorHtml
        };
    }
};

