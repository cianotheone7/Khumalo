const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

module.exports = async function (context, req) {
    context.log('Email disconnect requested');

    const userEmail = req.query.user;
    const provider = req.query.provider;

    if (!userEmail) {
        return {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'User email is required'
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
                error: 'Storage account key not configured'
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

        // If provider is specified, verify it matches before deleting
        if (provider) {
            try {
                const entity = await tableClient.getEntity('user', userEmail);
                if (entity.provider !== provider) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            error: 'Provider mismatch'
                        }
                    };
                }
            } catch (getError) {
                if (getError.statusCode === 404) {
                    return {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: {
                            error: 'Email connection not found'
                        }
                    };
                }
                throw getError;
            }
        }

        // Delete the entity
        await tableClient.deleteEntity('user', userEmail);
        context.log(`✅ Disconnected email for user: ${userEmail}`);

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                success: true,
                message: 'Email disconnected successfully'
            }
        };
    } catch (error) {
        if (error.statusCode === 404) {
            // Entity doesn't exist - treat as success
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    success: true,
                    message: 'Email connection not found (already disconnected)'
                }
            };
        }

        context.log(`Error disconnecting email: ${error.message}`);
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                error: 'Failed to disconnect email connection'
            }
        };
    }
};
