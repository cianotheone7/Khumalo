const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

module.exports = async function (context, req) {
    context.log('Email disconnect requested');

    const userEmail = req.query.user;
    const provider = req.query.provider;

    if (!userEmail) {
        context.res = {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'User email is required'
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
                error: 'Storage account key not configured'
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

        // If provider is specified, verify it matches before deleting
        if (provider) {
            try {
                const entity = await tableClient.getEntity('user', userEmail);
                if (entity.provider !== provider) {
                    context.res = {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            error: 'Provider mismatch'
                        }
                    };
                    return;
                }
            } catch (getError) {
                if (getError.statusCode === 404) {
                    context.res = {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            error: 'Email connection not found'
                        }
                    };
                    return;
                }
                throw getError;
            }
        }

        // Delete the entity
        await tableClient.deleteEntity('user', userEmail);
        context.log(`✅ Disconnected email for user: ${userEmail}`);

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                success: true,
                message: 'Email disconnected successfully'
            }
        };
        return;
    } catch (error) {
        if (error.statusCode === 404) {
            // Entity doesn't exist - treat as success
            context.log(`Email connection not found for ${userEmail} (already disconnected)`);
            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    success: true,
                    message: 'Email connection not found (already disconnected)'
                }
            };
            return;
        }

        context.log(`Error disconnecting email: ${error.message}`);
        context.log(`Error stack: ${error.stack}`);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'Failed to disconnect email connection',
                details: error.message
            }
        };
        return;
    }
};
