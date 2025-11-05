const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

module.exports = async function (context, req) {
    context.log('Creating users in Users table...');

    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
    const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const tableName = 'Users';

    if (!storageAccountKey) {
        context.res = {
            status: 500,
            body: { error: 'Storage account key not configured' }
        };
        return;
    }

    const users = [
        {
            email: 'andrea@cortexharmony.co.za',
            name: 'Andrea',
            role: 'doctor'
        },
        {
            email: 'lifelanereception@gmail.com',
            name: 'Lifelane Reception',
            role: 'reception'
        }
    ];

    try {
        const credential = new AzureNamedKeyCredential(storageAccountName, storageAccountKey);
        const tableClient = new TableClient(
            `https://${storageAccountName}.table.core.windows.net`,
            tableName,
            credential
        );

        const results = [];

        for (const user of users) {
            const entity = {
                partitionKey: 'user',
                rowKey: user.email,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            try {
                await tableClient.createEntity(entity);
                results.push({ email: user.email, status: 'created' });
                context.log(`✓ Created user profile: ${user.email}`);
            } catch (error) {
                if (error.statusCode === 409) {
                    // Entity already exists, update it
                    await tableClient.updateEntity(entity, 'Merge');
                    results.push({ email: user.email, status: 'updated' });
                    context.log(`✓ Updated user profile: ${user.email}`);
                } else {
                    results.push({ email: user.email, status: 'error', error: error.message });
                    context.log(`✗ Error for ${user.email}: ${error.message}`);
                }
            }
        }

        context.res = {
            status: 200,
            body: { message: 'User profiles processed', results }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: { error: error.message }
        };
    }
};

