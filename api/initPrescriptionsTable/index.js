const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  context.log('🚀 Initializing Azure Tables (Prescriptions & Appointments)...');

  try {
    // Get credentials from environment variables
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    context.log('🔍 Environment check:');
    context.log('Account Name:', accountName);
    context.log('Account Key exists:', !!accountKey);
    context.log('Account Key length:', accountKey ? accountKey.length : 0);

    if (!accountKey) {
      context.log.error('❌ AZURE_STORAGE_ACCOUNT_KEY not found in environment variables');
      context.res = {
        status: 500,
        body: { 
          success: false, 
          error: 'Storage account key not configured',
          message: 'Please set AZURE_STORAGE_ACCOUNT_KEY in Azure Function settings'
        }
      };
      return;
    }

    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
    context.log('Connection string built (length):', connectionString.length);
    
    const results = [];
    const tables = ['Prescriptions', 'Appointments'];
    
    for (const tableName of tables) {
      const tableClient = new TableClient(connectionString, tableName);
      
      try {
        await tableClient.createTable();
        context.log(`✅ ${tableName} table created successfully!`);
        results.push({ table: tableName, status: 'created' });
      } catch (createError) {
        if (createError.statusCode === 409) {
          context.log(`ℹ️ ${tableName} table already exists`);
          results.push({ table: tableName, status: 'already exists' });
        } else {
          throw createError;
        }
      }
    }
    
    context.res = {
      status: 200,
      body: {
        success: true,
        message: 'All tables initialized successfully!',
        tables: results,
        accountName: accountName
      }
    };

  } catch (error) {
    context.log.error('❌ Error initializing tables:', error);
    context.res = {
      status: 500,
      body: {
        success: false,
        error: error.message,
        details: error.toString()
      }
    };
  }
};

