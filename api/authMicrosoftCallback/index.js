const fetch = require('node-fetch');

module.exports = async function (context, req) {
    context.log('Microsoft OAuth callback received');

    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;

    if (error) {
        context.log(`OAuth error: ${error}`);
        return {
            status: 400,
            body: {
                type: 'email_error',
                message: `OAuth error: ${error}`
            }
        };
    }

    if (!code) {
        context.log('No authorization code received');
        return {
            status: 400,
            body: {
                type: 'email_error',
                message: 'No authorization code received'
            }
        };
    }

    try {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        
        if (!clientId || !clientSecret) {
            context.log('OAuth credentials not configured');
            return {
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
        }
        
        // CRITICAL: The redirect URI MUST exactly match what was sent in the initial OAuth request
        // Build redirectUri strictly from the incoming request (no hardcoded host fallback)
        const detectedProtocol = req.headers['x-forwarded-proto'] ||
                                 req.headers['x-forwarded-protocol'] ||
                                 (req.headers['x-arr-ssl'] ? 'https' : 'https'); // default https
        const detectedHost = req.headers['x-forwarded-host'] || req.headers.host || '';
        const requestPath = (req.url || '').split('?')[0] || '/api/auth/microsoft/callback';
        const redirectUri = `${detectedProtocol}://${(detectedHost || '').split(':')[0]}${requestPath}`;
        
        context.log('=== Redirect URI Detection (Microsoft) ===');
        context.log(`Request URL: ${req.url || 'none'}`);
        context.log(`X-Forwarded-Host: ${req.headers['x-forwarded-host'] || 'none'}`);
        context.log(`X-Original-Host: ${req.headers['x-original-host'] || 'none'}`);
        context.log(`X-Forwarded-URI: ${req.headers['x-forwarded-uri'] || 'none'}`);
        context.log(`X-Original-URL: ${req.headers['x-original-url'] || 'none'}`);
        context.log(`Host header: ${req.headers.host || 'none'}`);
        context.log(`Referer: ${req.headers.referer || 'none'}`);
        context.log(`Origin: ${req.headers.origin || 'none'}`);
        context.log(`Detected host: ${detectedHost}`);
        context.log(`Protocol: ${detectedProtocol}`);
        context.log(`Final redirect URI: ${redirectUri}`);
        context.log(`Code received: ${code ? 'Yes' : 'No'}`);
        context.log(`State received: ${state || 'none'}`);

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
    <title>OAuth Error</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Failed to exchange authorization code. Check Azure Function logs for details.'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ OAuth Error</h2><p>Failed to exchange authorization code. Check server logs.</p>';
        }
    </script>
</body>
</html>
            `;
            return {
                status: 400,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
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
            return {
                status: 400,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
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
            return {
                status: 400,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
        }
        const userEmail = stateParts[1]; // Extract user email from state

        // Get user info from Microsoft Graph
        const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userInfoResponse.ok) {
            const errorText = await userInfoResponse.text();
            context.log(`Failed to get user info from Microsoft: ${errorText}`);
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
            return {
                status: 500,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
        }

        const userInfo = await userInfoResponse.json();
        const email = userInfo.mail || userInfo.userPrincipalName;

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
            return {
                status: 400,
                headers: { 'Content-Type': 'text/html' },
                body: errorHtml
            };
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
            return {
                status: 500,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
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
            return {
                status: 500,
                headers: {
                    'Content-Type': 'text/html'
                },
                body: errorHtml
            };
        }

        // Escape email for XSS prevention
        const escapedEmail = email.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Return success response with postMessage script
        const htmlResponse = `
<!DOCTYPE html>
<html>
<head>
    <title>Email Connected</title>
</head>
<body>
    <script>
        // Send success message to parent window
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_connected',
                provider: 'outlook',
                email: '${escapedEmail}'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>✅ Outlook connected successfully!</h2><p>You can close this window.</p>';
        }
    </script>
</body>
</html>
        `;

        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: htmlResponse
        };
    } catch (error) {
        context.log(`Error in Microsoft callback: ${error.message}`);
        const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Connection Error</title>
</head>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'email_error',
                message: 'Failed to connect Outlook account'
            }, window.location.origin);
            window.close();
        } else {
            document.body.innerHTML = '<h2>❌ Connection failed</h2><p>Please try again.</p>';
        }
    </script>
</body>
</html>
        `;
        return {
            status: 500,
            headers: {
                'Content-Type': 'text/html'
            },
            body: errorHtml
        };
    }
};

