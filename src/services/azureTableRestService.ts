// Azure Table Storage REST API Service for Browser Compatibility
// Using REST API directly instead of SDK for browser compatibility

// Azure Table Storage Configuration - Using Environment Variables
const AZURE_STORAGE_ACCOUNT_NAME = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;

// SAS Tokens from environment variables (more secure than hardcoding)
// Permissions: r=read, a=add, u=update, d=delete - all operations needed for document management
const DOCUMENTS_SAS_TOKEN = import.meta.env.VITE_DOCUMENTS_SAS_TOKEN || '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=Documents&sig=LsnkIZlzTkqHXLFDUcfWRc7PmLL6PDmiKD7/qM1vtgA%3D';
const SUMMARIES_SAS_TOKEN = import.meta.env.VITE_SUMMARIES_SAS_TOKEN || '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=AISummaries&sig=avJvHS/n4uU8FEmjJzem/MrmZQ4sVgTLry0INnkfpIM%3D';

// Table names
const PATIENTS_TABLE = 'Patients';
const DOCUMENTS_TABLE = 'Documents';
const SUMMARIES_TABLE = 'AISummaries';
const USERS_TABLE = 'Users';

// Document interface
export interface Document {
  partitionKey: string;
  rowKey: string;
  patientId: string;
  fileName: string;
  fileSize: number;
  description?: string;
  documentType: string;
  blobUrl: string;
  contentType: string;
  processedText?: string;
  uploadedAt: string;
  isDeleted?: boolean;  // Soft delete flag
  deletedAt?: string;   // Deletion timestamp
  deletedBy?: string;   // Who deleted it
}

// Helper function to create table URL
function getTableUrl(tableName: string): string {
  let sasToken = '';
  if (tableName === DOCUMENTS_TABLE) {
    sasToken = DOCUMENTS_SAS_TOKEN;
  } else if (tableName === SUMMARIES_TABLE) {
    sasToken = SUMMARIES_SAS_TOKEN;
  }
  return `${AZURE_STORAGE_ENDPOINT}/${tableName}${sasToken}`;
}

// Helper function to create entity URL
function getEntityUrl(tableName: string, partitionKey: string, rowKey: string): string {
  const encodedPartitionKey = encodeURIComponent(partitionKey);
  const encodedRowKey = encodeURIComponent(rowKey);
  let sasToken = '';
  if (tableName === DOCUMENTS_TABLE) {
    sasToken = DOCUMENTS_SAS_TOKEN;
  } else if (tableName === SUMMARIES_TABLE) {
    sasToken = SUMMARIES_SAS_TOKEN;
  }
  return `${AZURE_STORAGE_ENDPOINT}/${tableName}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')${sasToken}`;
}

// Create document using REST API in Azure Table Storage
export const createDocument = async (documentData: Omit<Document, 'partitionKey' | 'rowKey' | 'uploadedAt'>): Promise<Document> => {
  try {
    console.log('Creating document metadata in Azure Table Storage...');
    
    const document: Document = {
      partitionKey: 'document',
      rowKey: `${documentData.patientId}_${Date.now()}`,
      ...documentData,
      uploadedAt: new Date().toISOString()
    };

    const tableUrl = getTableUrl(DOCUMENTS_TABLE);
    
    const requestBody = {
      "PartitionKey": document.partitionKey,
      "RowKey": document.rowKey,
      "patientId": document.patientId,
      "fileName": document.fileName,
      "fileSize": document.fileSize,
      "description": document.description || '',
      "documentType": document.documentType,
      "blobUrl": document.blobUrl,
      "contentType": document.contentType,
      "processedText": document.processedText || '',
      "uploadedAt": document.uploadedAt
    };

    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'Prefer': 'return-no-content',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'x-ms-client-request-id': `doc-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      body: JSON.stringify(requestBody),
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      return document;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create document in Azure:', response.status, response.statusText);
      console.error('Error details:', errorText);
      throw new Error(`Failed to create document: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Document creation error:', error);
    throw error;
  }
};

// Get documents using REST API from Azure Table Storage
export const getDocuments = async (patientId: string, includeDeleted: boolean = false): Promise<Document[]> => {
  try {
    if (!patientId || patientId.trim() === '' || patientId === 'undefined') {
      return [];
    }

    // Build query URL with OData filter for patientId
    let queryUrl = getTableUrl(DOCUMENTS_TABLE);
    const safePatientId = patientId.replace(/'/g, "''");
    const joiner = queryUrl.includes('?') ? '&' : '?';
    queryUrl += `${joiner}$filter=patientId eq '${safePatientId}'`;
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'x-ms-client-request-id': `docs-${Date.now()}`,
        'x-ms-return-client-request-id': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      mode: 'cors',
      cache: 'no-store'  // Critical: Force fetch to bypass browser cache
    });

    if (response.ok) {
      const data = await response.json();
      const documents = data.value || [];
      
      // Convert Azure Table Storage format to our Document interface
      const formattedDocuments: Document[] = documents.map((doc: any) => ({
        partitionKey: doc.PartitionKey || '',
        rowKey: doc.RowKey || '',
        patientId: doc.patientId || '',
        fileName: doc.fileName || '',
        fileSize: doc.fileSize || 0,
        description: doc.description || '',
        documentType: doc.documentType || 'Other',
        blobUrl: doc.blobUrl || '',
        contentType: doc.contentType || '',
        processedText: doc.processedText || '',
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        // Handle boolean isDeleted (true/false) or string ('true'/'false') or missing
        isDeleted: doc.isDeleted === true || doc.isDeleted === 'true',
        deletedAt: doc.deletedAt || undefined,
        deletedBy: doc.deletedBy || undefined
      }));
      
      // Filter out soft-deleted documents unless explicitly requested
      let filteredDocuments = formattedDocuments;
      if (!includeDeleted) {
        filteredDocuments = formattedDocuments.filter((doc: Document) => !doc.isDeleted);
      }
      
      return filteredDocuments;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to get documents:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting documents:', error);
    return [];
  }
};

// Explicit function to get all documents (dashboard-only)
export const getAllDocuments = async (includeDeleted: boolean = false): Promise<Document[]> => {
  try {
    const queryUrl = getTableUrl(DOCUMENTS_TABLE);
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      mode: 'cors',
      cache: 'no-store'
    });
    if (!response.ok) return [];
    const data = await response.json();
    const docs = (data.value || []).map((doc: any) => ({
      partitionKey: doc.PartitionKey || '',
      rowKey: doc.RowKey || '',
      patientId: doc.patientId || '',
      fileName: doc.fileName || '',
      fileSize: doc.fileSize || 0,
      description: doc.description || '',
      documentType: doc.documentType || 'Other',
      blobUrl: doc.blobUrl || '',
      contentType: doc.contentType || '',
      processedText: doc.processedText || '',
      uploadedAt: doc.uploadedAt || new Date().toISOString(),
      isDeleted: doc.isDeleted === true || doc.isDeleted === 'true',
      deletedAt: doc.deletedAt || undefined,
      deletedBy: doc.deletedBy || undefined
    } as Document));
    return includeDeleted ? docs : docs.filter(d => !d.isDeleted);
  } catch (e) {
    return [];
  }
};

// Soft delete document (mark as deleted instead of permanently removing)
export const softDeleteDocument = async (
  partitionKey: string,
  rowKey: string,
  deletedBy?: string,
  expectedPatientId?: string | string[]
): Promise<boolean> => {
  try {
    console.log('🗑️ Soft deleting document (read-modify-write pattern)...');
    console.log('📍 PartitionKey:', partitionKey);
    console.log('📍 RowKey:', rowKey);
    
    const entityUrl = getEntityUrl(DOCUMENTS_TABLE, partitionKey, rowKey);
    
    // STEP 1: Read the existing entity first
    console.log('📖 Step 1: Reading existing document...');
    const getResponse = await fetch(entityUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=minimalmetadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      mode: 'cors',
      cache: 'no-store'
    });

    if (!getResponse.ok) {
      console.error('❌ Failed to read document for update:', getResponse.status);
      return false;
    }

    const existingEntity = await getResponse.json();
    console.log('✅ Existing entity read successfully');
    console.log('📦 Existing entity keys:', Object.keys(existingEntity));
    console.log('📦 Existing isDeleted value:', existingEntity.isDeleted, `(type: ${typeof existingEntity.isDeleted})`);

    // Guard: ensure we're deleting a document that belongs to the expected patient
    if (expectedPatientId && existingEntity.patientId) {
      const expectedList = Array.isArray(expectedPatientId) ? expectedPatientId : [expectedPatientId];
      if (!expectedList.includes(existingEntity.patientId)) {
      console.error(`❌ Patient mismatch on delete. Expected patientId="${expectedPatientId}", got "${existingEntity.patientId}". Aborting.`);
      return false;
      }
    }
    
    // STEP 2: Create PARTIAL update with only the fields we want to change
    // Using MERGE for partial update - more reliable than PUT for Azure Table Storage
    const updateFields = {
      isDeleted: true,  // Use boolean for Azure Table Storage
      deletedAt: new Date().toISOString(),
      deletedBy: deletedBy || 'system'
    };
    
    console.log('📝 Step 2: Preparing MERGE with deletion flags');
    console.log('📝 Update fields:', updateFields);
    
    // STEP 3: MERGE (partial update) the entity - this is the RIGHT way for Azure Tables
    console.log('💾 Step 3: MERGE updating entity in Azure...');
    const putResponse = await fetch(entityUrl, {
      method: 'MERGE',  // MERGE for partial updates
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=minimalmetadata',
        'If-Match': '*',  // Accept any version
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'x-ms-client-request-id': `soft-delete-doc-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      body: JSON.stringify(updateFields),
      mode: 'cors'
    });

    console.log('📊 MERGE Response status:', putResponse.status, putResponse.statusText);

    if (putResponse.ok || putResponse.status === 204) {
      console.log('✅ ✅ ✅ Document soft deleted successfully with MERGE!');
      
      // STEP 4: Verify the update by reading it back
      console.log('🔍 Step 4: Verifying deletion by reading entity back...');
      const verifyResponse = await fetch(entityUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=minimalmetadata',
          'x-ms-date': new Date().toUTCString(),
          'x-ms-version': '2019-02-02',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        mode: 'cors',
        cache: 'no-store'
      });
      
      if (verifyResponse.ok) {
        const verifiedEntity = await verifyResponse.json();
        console.log('🔍 Verified isDeleted value:', verifiedEntity.isDeleted, `(type: ${typeof verifiedEntity.isDeleted})`);
        if (verifiedEntity.isDeleted === 'true' || verifiedEntity.isDeleted === true) {
          console.log('✅ ✅ ✅ VERIFIED: Document is actually marked as deleted in Azure!');
        } else {
          console.error('⚠️ WARNING: Document shows as NOT deleted after PUT! Value:', verifiedEntity.isDeleted);
        }
      }
      
      return true;
    } else {
      const errorText = await putResponse.text();
      console.error('❌ Failed to PUT updated document:', putResponse.status, putResponse.statusText);
      console.error('❌ Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error soft deleting document:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return false;
  }
};

// Restore a soft-deleted document
export const restoreDocument = async (partitionKey: string, rowKey: string): Promise<boolean> => {
  try {
    console.log('♻️ Restoring document (read-modify-write pattern)...');
    console.log('📍 PartitionKey:', partitionKey);
    console.log('📍 RowKey:', rowKey);
    
    const entityUrl = getEntityUrl(DOCUMENTS_TABLE, partitionKey, rowKey);
    
    // STEP 1: Read the existing entity first
    console.log('📖 Step 1: Reading existing document...');
    const getResponse = await fetch(entityUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=minimalmetadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      mode: 'cors',
      cache: 'no-store'
    });

    if (!getResponse.ok) {
      console.error('❌ Failed to read document for restore:', getResponse.status);
      return false;
    }

    const existingEntity = await getResponse.json();
    console.log('✅ Existing entity read successfully');
    
    // STEP 2: Create PARTIAL update to restore
    // Using MERGE for partial update - more reliable than PUT for Azure Table Storage
    const updateFields = {
      isDeleted: false,  // Use boolean for Azure Table Storage
      deletedAt: '',
      deletedBy: ''
    };
    
    console.log('📝 Step 2: Preparing MERGE to restore document');
    console.log('📝 Restore fields:', updateFields);
    
    // STEP 3: MERGE (partial update) the entity
    console.log('💾 Step 3: MERGE updating entity in Azure...');
    const response = await fetch(entityUrl, {
      method: 'MERGE',  // MERGE for partial updates
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=minimalmetadata',
        'If-Match': '*',  // Accept any version
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'x-ms-client-request-id': `restore-doc-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      body: JSON.stringify(updateFields),
      mode: 'cors'
    });

    console.log('📊 Restore response status:', response.status, response.statusText);

    if (response.ok || response.status === 204) {
      console.log('✅ Document restored successfully!');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to restore document:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
      return false;
    }
  } catch (error) {
    console.error('❌ Error restoring document:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return false;
  }
};

// PERMANENT delete document from Azure Table Storage (use with caution!)
export const permanentDeleteDocument = async (partitionKey: string, rowKey: string): Promise<boolean> => {
  try {
    console.log('⚠️ PERMANENTLY deleting document from Azure Table Storage...');
    console.log('📍 PartitionKey:', partitionKey);
    console.log('📍 RowKey:', rowKey);
    
    const entityUrl = getEntityUrl(DOCUMENTS_TABLE, partitionKey, rowKey);
    console.log('🔗 Delete URL:', entityUrl.substring(0, 100) + '...');
    
    const response = await fetch(entityUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'x-ms-client-request-id': `perm-delete-doc-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      mode: 'cors'
    });

    console.log('📊 Response status:', response.status, response.statusText);

    if (response.ok || response.status === 204) {
      console.log('✅ Document permanently deleted from Azure Table Storage!');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to permanently delete document:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
      return false;
    }
  } catch (error) {
    console.error('❌ Error permanently deleting document:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return false;
  }
};

// Soft-delete available only via explicit function name to avoid accidental use

// Delete all document entities for given patientIds that match an exact fileName
export const deleteDocumentsByFileName = async (
  patientIds: string[],
  fileName: string
): Promise<number> => {
  try {
    const uniqueRows = new Set<string>();
    let targets: { partitionKey: string; rowKey: string }[] = [];
    for (const pid of patientIds.filter(Boolean)) {
      const docs = await getDocuments(pid, true);
      docs
        .filter(d => d.fileName === fileName)
        .forEach(d => {
          if (!uniqueRows.has(d.rowKey)) {
            uniqueRows.add(d.rowKey);
            targets.push({ partitionKey: d.partitionKey, rowKey: d.rowKey });
          }
        });
    }
    let deleted = 0;
    for (const t of targets) {
      const ok = await permanentDeleteDocument(t.partitionKey, t.rowKey);
      if (ok) deleted++;
    }
    return deleted;
  } catch {
    return 0;
  }
};

// Delete AI summary from Azure Table Storage
export const deleteAISummary = async (partitionKey: string, rowKey: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting AI summary from Azure Table Storage...');
    
    const entityUrl = getEntityUrl(SUMMARIES_TABLE, partitionKey, rowKey);
    
    const response = await fetch(entityUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'x-ms-client-request-id': `delete-summary-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      console.log('✅ AI Summary deleted successfully from Azure Table Storage!');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to delete AI summary:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting AI summary:', error);
    return false;
  }
};

// AI Summary interface
export interface AISummary {
  partitionKey: string;
  rowKey: string;
  patientId: string;
  summaryText: string;
  generatedBy: string;
  documentIds: string;
  createdAt: string;
}

// Create AI Summary using REST API
export const createAISummary = async (summaryData: Omit<AISummary, 'partitionKey' | 'rowKey' | 'createdAt'>): Promise<AISummary> => {
  try {
    console.log('Creating AI summary via Azure REST API...');
    
    const summaryId = `summary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const partitionKey = summaryData.patientId;
    const rowKey = summaryId;
    
    const tableUrl = getTableUrl(SUMMARIES_TABLE);
    
    const requestBody = {
      "PartitionKey": partitionKey,
      "RowKey": rowKey,
      "patientId": summaryData.patientId,
      "summaryText": summaryData.summaryText,
      "generatedBy": summaryData.generatedBy,
      "documentIds": summaryData.documentIds,
      "createdAt": new Date().toISOString()
    };

    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(requestBody),
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      console.log('✅ AI Summary created successfully in Azure Table Storage!');
      return {
        partitionKey,
        rowKey,
        patientId: summaryData.patientId,
        summaryText: summaryData.summaryText,
        generatedBy: summaryData.generatedBy,
        documentIds: summaryData.documentIds,
        createdAt: new Date().toISOString()
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create AI summary:', response.status, response.statusText);
      console.error('Error details:', errorText);
      throw new Error(`Failed to create AI summary: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error creating AI summary:', error);
    throw error;
  }
};

// Get AI Summaries using REST API
export const getAISummaries = async (patientId?: string): Promise<AISummary[]> => {
  try {
    // Getting AI summaries via Azure REST API
    
    let queryUrl = getTableUrl(SUMMARIES_TABLE);
    if (patientId) {
      queryUrl += `&$filter=PartitionKey eq '${encodeURIComponent(patientId)}'`;
    }
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      mode: 'cors'
    });

    if (response.ok) {
      const data = await response.json();
      const summaries = data.value || [];
      
      const normalizedSummaries = summaries.map((summary: any) => ({
        partitionKey: summary.PartitionKey || summary.partitionKey || '',
        rowKey: summary.RowKey || summary.rowKey || '',
        patientId: summary.patientId || summary.PatientId || '',
        summaryText: summary.summaryText || summary.SummaryText || '',
        generatedBy: summary.generatedBy || summary.GeneratedBy || '',
        documentIds: summary.documentIds || summary.DocumentIds || '',
        createdAt: summary.createdAt || summary.CreatedAt || new Date().toISOString()
      }));
      
      // Retrieved AI summaries
      return normalizedSummaries;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to get AI summaries:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting AI summaries:', error);
    return [];
  }
};

// Check if Azure Table Storage is available
export const isAzureAvailable = (): boolean => {
  return true; // REST API approach is always available
};
