// Azure Function: Backup Tables
// Creates a backup of all critical tables to Azure Blob Storage
// Should be run on a schedule (daily/weekly)

const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require('uuid');

module.exports = async function (context, req) {
  context.log('🔄 Backup Tables function started');

  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;

    if (!accountKey) {
      throw new Error('AZURE_STORAGE_ACCOUNT_KEY not configured');
    }

    const tables = req.body?.tables || ['Patients', 'Appointments', 'Prescriptions', 'Documents', 'AISummaries', 'Activities', 'Users'];
    const backupId = req.body?.backupId || `backup-${Date.now()}-${uuidv4()}`;
    const createdBy = req.body?.createdBy || 'system';

    const backupData = {};
    const recordCounts = {};

    // Backup each table
    for (const tableName of tables) {
      try {
        context.log(`📦 Backing up ${tableName}...`);
        const tableClient = new TableClient(connectionString, tableName);
        
        const entities = [];
        const listEntities = tableClient.listEntities();
        
        for await (const entity of listEntities) {
          entities.push(entity);
        }

        backupData[tableName] = entities;
        recordCounts[tableName] = entities.length;
        context.log(`✅ Backed up ${entities.length} records from ${tableName}`);
      } catch (error) {
        context.log.error(`❌ Failed to backup ${tableName}:`, error);
        backupData[tableName] = [];
        recordCounts[tableName] = 0;
      }
    }

    // Save to Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = 'table-backups';
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist
    try {
      await containerClient.createIfNotExists({ access: 'private' });
    } catch (error) {
      // Container might already exist, ignore
    }

    // Upload backup
    const blobName = `${backupId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const backupMetadata = {
      timestamp: new Date().toISOString(),
      backupId,
      tables,
      recordCounts,
      createdBy
    };

    const backupContent = JSON.stringify({
      metadata: backupMetadata,
      data: backupData
    }, null, 2);

    await blockBlobClient.upload(backupContent, Buffer.byteLength(backupContent, 'utf8'), {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      },
      metadata: {
        backupId,
        timestamp: backupMetadata.timestamp
      }
    });

    context.log(`✅ Backup completed: ${backupId}`);

    // Generate SAS URL for download (valid for 1 hour)
    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: 'r',
      expiresOn: new Date(Date.now() + 3600000) // 1 hour
    });

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        success: true,
        backupId,
        metadata: backupMetadata,
        downloadUrl: sasUrl,
        size: Buffer.byteLength(backupContent, 'utf8')
      }
    };
  } catch (error) {
    context.log.error('❌ Backup failed:', error);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        success: false,
        error: error.message || 'Backup failed'
      }
    };
  }
};

