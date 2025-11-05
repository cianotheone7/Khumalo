/**
 * Azure Function: Generate SAS Token for Blob Storage
 * 
 * This function generates short-lived SAS tokens for secure blob access
 * Prevents exposing storage account keys to the client
 * 
 * Security:
 * - Validates user authentication
 * - Generates tokens with minimal permissions
 * - Short expiration time (1 hour)
 * - Logs all token generation for audit trail
 */

const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    context.log('SAS Token generation request received');

    // Validate authentication
    const userId = req.headers['x-ms-client-principal-id'];
    if (!userId) {
        context.res = {
            status: 401,
            body: { error: 'Unauthorized - Authentication required' }
        };
        return;
    }

    // Get request parameters
    const { containerName, blobName, permissions = 'r', expiryMinutes = 60 } = req.body || {};

    // Validate required parameters
    if (!containerName) {
        context.res = {
            status: 400,
            body: { error: 'Missing required parameter: containerName' }
        };
        return;
    }

    try {
        // Get Azure Storage credentials from environment variables
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

        if (!accountName || !accountKey) {
            context.log.error('Azure Storage credentials not configured');
            context.res = {
                status: 500,
                body: { error: 'Server configuration error' }
            };
            return;
        }

        // Create shared key credential
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        // Set permissions (default to read-only for security)
        const blobSASPermissions = new BlobSASPermissions();
        if (permissions.includes('r')) blobSASPermissions.read = true;
        if (permissions.includes('w')) blobSASPermissions.write = true;
        if (permissions.includes('d')) blobSASPermissions.delete = true;
        if (permissions.includes('c')) blobSASPermissions.create = true;

        // Set expiry time (max 1 hour for security)
        const expiryTime = new Date();
        const validExpiryMinutes = Math.min(expiryMinutes, 60);
        expiryTime.setMinutes(expiryTime.getMinutes() + validExpiryMinutes);

        // Generate SAS token
        const sasOptions = {
            containerName: containerName,
            permissions: blobSASPermissions,
            startsOn: new Date(),
            expiresOn: expiryTime,
        };

        // Add blob name if specified (for specific blob access)
        if (blobName) {
            sasOptions.blobName = blobName;
        }

        const sasToken = generateBlobSASQueryParameters(
            sasOptions,
            sharedKeyCredential
        ).toString();

        // Construct the full URL
        const blobUrl = blobName
            ? `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`
            : `https://${accountName}.blob.core.windows.net/${containerName}?${sasToken}`;

        // Log for audit trail (don't log the actual token)
        context.log('SAS token generated', {
            userId,
            containerName,
            blobName: blobName || 'container-level',
            permissions,
            expiresAt: expiryTime.toISOString()
        });

        // Return success response
        context.res = {
            status: 200,
            body: {
                success: true,
                sasToken: sasToken,
                url: blobUrl,
                expiresAt: expiryTime.toISOString(),
                permissions: permissions
            }
        };

    } catch (error) {
        context.log.error('Error generating SAS token:', error);
        context.res = {
            status: 500,
            body: {
                error: 'Failed to generate SAS token',
                message: error.message
            }
        };
    }
};


