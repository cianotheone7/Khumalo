const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

module.exports = async function (context, req) {
    context.log('Email status check requested');

    const userEmail = req.query.user;

    if (!userEmail) {
        context.res = {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'User email is required',
                connected: false
            }
        };
        return;
    }

    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
    const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const tableName = 'EmailConnections';

    if (!storageAccountKey) {
        context.log('ERROR: AZURE_STORAGE_ACCOUNT_KEY not configured');
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'Storage account key not configured',
                connected: false
            }
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

        try {
            const entity = await tableClient.getEntity('user', userEmail);
            
            context.log(`✅ Email connection found for ${userEmail}: ${entity.provider} - ${entity.email}`);
            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    connected: true,
                    email: entity.email,
                    provider: entity.provider,
                    connectedAt: entity.connectedAt
                }
            };
            return;
        } catch (getError) {
            if (getError.statusCode === 404) {
                // No connection found
                context.log(`ℹ️ No email connection found for ${userEmail}`);
                context.res = {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: {
                        connected: false
                    }
                };
                return;
            }
            throw getError;
        }
    } catch (error) {
        context.log(`Error checking email status: ${error.message}`);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'Failed to check email connection status',
                connected: false
            }
        };
    }
};
