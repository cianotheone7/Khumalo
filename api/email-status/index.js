const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

module.exports = async function (context, req) {
    context.log('Email status check requested');

    const userEmail = req.query.user;

    if (!userEmail) {
        return {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'User email is required',
                connected: false
            }
        };
    }

    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
    const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const tableName = 'EmailConnections';

    if (!storageAccountKey) {
        context.log('ERROR: AZURE_STORAGE_ACCOUNT_KEY not configured');
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'Storage account key not configured',
                connected: false
            }
        };
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
            
            return {
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
        } catch (getError) {
            if (getError.statusCode === 404) {
                // No connection found
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: {
                        connected: false
                    }
                };
            }
            throw getError;
        }
    } catch (error) {
        context.log(`Error checking email status: ${error.message}`);
        return {
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
