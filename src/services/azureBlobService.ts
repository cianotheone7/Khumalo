// Azure Blob Storage Service for Document Upload
// Uses Azure Storage SDK with proper authentication

import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { azureConfig } from '../config/azure-config';

// Azure Blob Storage Configuration from environment
const AZURE_STORAGE_ACCOUNT_NAME = azureConfig.storage.accountName;
const AZURE_STORAGE_CONTAINER_NAME = azureConfig.storage.containerName;
const AZURE_STORAGE_SAS_TOKEN = azureConfig.storage.sasToken;

// Base URL for Azure Blob Storage with SAS token
const BLOB_STORAGE_URL = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`;
const BLOB_SERVICE_URL_WITH_SAS = `${BLOB_STORAGE_URL}?${AZURE_STORAGE_SAS_TOKEN}`;

// Create BlobServiceClient with SAS token authentication (works in browser)
const getBlobServiceClient = (): BlobServiceClient => {
  console.log('🔑 Blob Storage Config:', {
    accountName: AZURE_STORAGE_ACCOUNT_NAME,
    containerName: AZURE_STORAGE_CONTAINER_NAME,
    hasSasToken: !!AZURE_STORAGE_SAS_TOKEN,
    sasTokenLength: AZURE_STORAGE_SAS_TOKEN?.length,
    blobServiceUrl: BLOB_SERVICE_URL_WITH_SAS.substring(0, 100) + '...'
  });
  return new BlobServiceClient(BLOB_SERVICE_URL_WITH_SAS);
};

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  blobName?: string;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  contentType: string;
  patientId: string;
  description?: string;
  documentType?: string;
}

/**
 * Upload a file to Azure Blob Storage using Azure SDK
 */
export const uploadDocument = async (
  file: File,
  metadata: DocumentMetadata
): Promise<UploadResult> => {
  try {
    console.log('Starting Azure Blob Storage upload...');
    
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    
    // Container already exists in Azure with private access (HIPAA compliant)
    // No need to create - just get reference
    
    // Create a unique blob name with patient ID and timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${metadata.patientId}/${timestamp}-${sanitizedFileName}`;
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Upload with metadata and progress tracking
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: metadata.contentType,
      },
      metadata: {
        patientId: metadata.patientId,
        originalFileName: metadata.fileName,
        uploadedAt: new Date().toISOString(),
        description: metadata.description || '',
        documentType: metadata.documentType || 'Other',
      },
      onProgress: (progress: any) => {
        const percent = Math.round((progress.loadedBytes / file.size) * 100);
        console.log(`Upload progress: ${percent}% (${progress.loadedBytes}/${file.size} bytes)`);
      }
    };

    const uploadResponse = await blockBlobClient.uploadData(file, uploadOptions);
    
    if (uploadResponse.requestId) {
      console.log('✅ File uploaded successfully to Azure Blob Storage!');
      console.log('Blob URL:', blockBlobClient.url);
      
      return {
        success: true,
        url: blockBlobClient.url,
        blobName: blobName
      };
    } else {
      return {
        success: false,
        error: 'Upload failed - no request ID returned'
      };
    }
  } catch (error) {
    console.error('❌ Azure Blob Storage upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
};

/**
 * Delete a document from Azure Blob Storage
 */
export const deleteDocument = async (blobUrl: string): Promise<UploadResult> => {
  try {
    console.log('🗑️ Deleting document from Azure Blob Storage...');
    console.log('🔗 Blob URL:', blobUrl);
    
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    
    // Extract blob name from URL
    const urlParts = blobUrl.split('/');
    const blobName = urlParts.slice(4).join('/'); // Remove domain and container name
    
    console.log('📁 Container:', AZURE_STORAGE_CONTAINER_NAME);
    console.log('📄 Blob name:', blobName);
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Check if blob exists before trying to delete
    const exists = await blockBlobClient.exists();
    console.log('📋 Blob exists:', exists);
    
    if (!exists) {
      console.warn('⚠️ Blob does not exist, may have been already deleted');
      return { success: true }; // Consider it success if already gone
    }
    
    const deleteResponse = await blockBlobClient.delete();
    console.log('📊 Delete response:', deleteResponse);
    
    console.log('✅ Document deleted successfully from Azure Blob Storage');
    return { success: true };
  } catch (error) {
    console.error('❌ Azure Blob Storage delete error:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error'
    };
  }
};

/**
 * Get a signed URL for secure document access
 * Generates SAS URL valid for 1 hour
 */
export const getDocumentUrl = async (blobUrl: string): Promise<string | null> => {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    
    // Extract blob name from URL
    const urlParts = blobUrl.split('/');
    const blobName = urlParts.slice(4).join('/');
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Generate SAS URL valid for 1 hour
    const expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 1);
    
    const sasUrl = await blockBlobClient.generateSasUrl({
      permissions: 'r', // Read-only
      expiresOn
    });
    
    console.log('Generated signed URL (expires in 1 hour)');
    return sasUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

/**
 * Batch upload multiple documents with concurrent processing
 */
export const batchUploadDocuments = async (
  files: File[],
  patientId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ successful: UploadResult[]; failed: UploadResult[] }> => {
  const results: UploadResult[] = [];
  const batchSize = 3; // Upload 3 files concurrently for better performance
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (file) => {
      const metadata: DocumentMetadata = {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        patientId,
        description: `Batch upload - ${file.name}`
      };
      return uploadDocument(file, metadata);
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, files.length), files.length);
    }
  }
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  return { successful, failed };
};

/**
 * Get storage usage statistics from Azure
 */
export const getStorageStats = async (): Promise<{
  totalFiles: number;
  totalSize: number;
  containerName: string;
}> => {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    
    let totalFiles = 0;
    let totalSize = 0;
    
    // Iterate through all blobs in container
    for await (const blob of containerClient.listBlobsFlat()) {
      totalFiles++;
      totalSize += blob.properties.contentLength || 0;
    }
    
    console.log(`Storage stats: ${totalFiles} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      totalFiles,
      totalSize,
      containerName: AZURE_STORAGE_CONTAINER_NAME
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      containerName: AZURE_STORAGE_CONTAINER_NAME
    };
  }
};

/**
 * Check if Azure Blob Storage is available
 * Returns true since we have SAS token authentication
 */
export const isAzureAvailable = (): boolean => {
  return true; // Real Azure Blob Storage with SAS token is available
};

