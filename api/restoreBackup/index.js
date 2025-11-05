// Azure Function: Restore from Backup
// Restores data from a backup file in Blob Storage

const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  context.log('🔄 Restore Backup function started');

  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;

    if (!accountKey) {
      throw new Error('AZURE_STORAGE_ACCOUNT_KEY not configured');
    }

    const backupId = req.body?.backupId || req.query?.backupId;
    if (!backupId) {
      throw new Error('backupId is required');
    }

    const tablesToRestore = req.body?.tables || null; // null = restore all
    const skipExisting = req.body?.skipExisting !== false; // default true

    // Get backup from Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = 'table-backups';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = `${backupId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Download backup
    const downloadResponse = await blockBlobClient.download(0);
    const backupContent = await streamToString(downloadResponse.readableStreamBody);
    const backup = JSON.parse(backupContent);

    const restoreResults = {};
    const errors = [];

    // Restore each table
    const tables = tablesToRestore || Object.keys(backup.data);
    
    for (const tableName of tables) {
      if (!backup.data[tableName]) {
        continue;
      }

      try {
        context.log(`📦 Restoring ${tableName}...`);
        const tableClient = new TableClient(connectionString, tableName);
        let restoredCount = 0;

        for (const entity of backup.data[tableName]) {
          try {
            if (skipExisting) {
              // Check if entity exists
              try {
                await tableClient.getEntity(entity.PartitionKey, entity.RowKey);
                continue; // Skip existing
              } catch (error) {
                if (error.statusCode !== 404) {
                  throw error;
                }
              }
            }

            // Insert or update entity
            await tableClient.upsertEntity(entity, 'Replace');
            restoredCount++;
          } catch (entityError) {
            errors.push(`Failed to restore ${entity.RowKey} in ${tableName}: ${entityError.message}`);
          }
        }

        restoreResults[tableName] = restoredCount;
        context.log(`✅ Restored ${restoredCount} records to ${tableName}`);
      } catch (error) {
        context.log.error(`❌ Failed to restore ${tableName}:`, error);
        errors.push(`Failed to restore ${tableName}: ${error.message}`);
        restoreResults[tableName] = 0;
      }
    }

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        success: errors.length === 0,
        backupId,
        restored: restoreResults,
        errors
      }
    };
  } catch (error) {
    context.log.error('❌ Restore failed:', error);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        success: false,
        error: error.message || 'Restore failed'
      }
    };
  }
};

// Helper function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

