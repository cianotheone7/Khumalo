// Azure Backup and Recovery Service
// Provides backup, restore, and preventive measures for Azure Table Storage

import { AZURE_STORAGE_ACCOUNT_NAME } from './azurePatientRestService';

const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008'}.table.core.windows.net`;

// Tables that need backup
const CRITICAL_TABLES = [
  'Patients',
  'Appointments',
  'Prescriptions',
  'Documents',
  'AISummaries',
  'Activities',
  'Users'
];

export interface BackupMetadata {
  timestamp: string;
  backupId: string;
  tables: string[];
  recordCounts: Record<string, number>;
  size: number;
  createdBy: string;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  metadata: BackupMetadata;
  downloadUrl?: string;
  error?: string;
}

/**
 * Create a backup of all critical tables
 */
export const createBackup = async (userId?: string): Promise<BackupResult> => {
  try {
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date().toISOString();
    const backupData: Record<string, any[]> = {};
    const recordCounts: Record<string, number> = {};

    // Get backup API endpoint (if deployed) or use local storage fallback
    const backupApiUrl = import.meta.env.VITE_BACKUP_API_URL || '/api/backupTables';

    try {
      // Try to use backup API function
      const response = await fetch(backupApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tables: CRITICAL_TABLES,
          backupId,
          createdBy: userId || 'system'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          backupId: result.backupId,
          metadata: result.metadata,
          downloadUrl: result.downloadUrl
        };
      }
    } catch (apiError) {
      console.warn('Backup API not available, using client-side backup:', apiError);
    }

    // Client-side backup fallback (for each table that has SAS token access)
    // Note: This is limited - full backup should use Azure Function with storage account key
    for (const tableName of CRITICAL_TABLES) {
      try {
        // Get table-specific SAS token from env
        const sasTokenKey = `VITE_${tableName.toUpperCase()}_SAS_TOKEN`;
        const sasToken = import.meta.env[sasTokenKey];
        
        if (sasToken) {
          const tableUrl = `${AZURE_STORAGE_ENDPOINT}/${tableName}${sasToken}`;
          const response = await fetch(`${tableUrl}&$top=5000`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json;odata=nometadata'
            }
          });

          if (response.ok) {
            const data = await response.json();
            const entities = data.value || [];
            backupData[tableName] = entities;
            recordCounts[tableName] = entities.length;
          }
        }
      } catch (tableError) {
        console.warn(`Failed to backup ${tableName}:`, tableError);
        backupData[tableName] = [];
        recordCounts[tableName] = 0;
      }
    }

    // Create backup blob
    const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });

    // Save to localStorage as fallback (limited by storage size)
    const backupJson = JSON.stringify({
      backupId,
      timestamp,
      data: backupData,
      metadata: {
        timestamp,
        backupId,
        tables: CRITICAL_TABLES,
        recordCounts,
        size: backupBlob.size,
        createdBy: userId || 'system'
      }
    });

    // Store in localStorage (works for small backups)
    if (backupJson.length < 5 * 1024 * 1024) { // 5MB limit
      localStorage.setItem(`backup-${backupId}`, backupJson);
      
      // Keep only last 5 backups in localStorage
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('backup-'))
        .sort()
        .reverse();
      
      if (backupKeys.length > 5) {
        backupKeys.slice(5).forEach(key => localStorage.removeItem(key));
      }
    }

    // Create download link
    const downloadUrl = URL.createObjectURL(backupBlob);

    const metadata: BackupMetadata = {
      timestamp,
      backupId,
      tables: CRITICAL_TABLES,
      recordCounts,
      size: backupBlob.size,
      createdBy: userId || 'system'
    };

    return {
      success: true,
      backupId,
      metadata,
      downloadUrl
    };
  } catch (error) {
    console.error('Backup failed:', error);
    return {
      success: false,
      backupId: '',
      metadata: {} as BackupMetadata,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Restore from backup
 */
export const restoreFromBackup = async (
  backupData: Record<string, any[]>,
  options: {
    tables?: string[];
    skipExisting?: boolean;
  } = {}
): Promise<{ success: boolean; restored: Record<string, number>; errors: string[] }> => {
  const restored: Record<string, number> = {};
  const errors: string[] = [];

  const tablesToRestore = options.tables || Object.keys(backupData);

  for (const tableName of tablesToRestore) {
    if (!backupData[tableName]) continue;

    try {
      // Get table-specific SAS token
      const sasTokenKey = `VITE_${tableName.toUpperCase()}_SAS_TOKEN`;
      const sasToken = import.meta.env[sasTokenKey];
      
      if (!sasToken) {
        errors.push(`No SAS token for ${tableName}`);
        continue;
      }

      const tableUrl = `${AZURE_STORAGE_ENDPOINT}/${tableName}${sasToken}`;
      let restoredCount = 0;

      // Restore entities in batches
      const batch = backupData[tableName];
      for (const entity of batch) {
        try {
          // Check if entity exists (if skipExisting)
          if (options.skipExisting) {
            const checkUrl = `${tableUrl}(PartitionKey='${entity.PartitionKey}',RowKey='${entity.RowKey}')`;
            const checkResponse = await fetch(checkUrl, {
              method: 'GET',
              headers: { 'Accept': 'application/json;odata=nometadata' }
            });
            
            if (checkResponse.ok) {
              continue; // Skip existing
            }
          }

          // Insert or merge entity
          const response = await fetch(`${tableUrl}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json;odata=nometadata'
            },
            body: JSON.stringify(entity)
          });

          if (response.ok) {
            restoredCount++;
          } else {
            errors.push(`Failed to restore ${entity.RowKey} in ${tableName}`);
          }
        } catch (entityError) {
          errors.push(`Error restoring entity in ${tableName}: ${entityError}`);
        }
      }

      restored[tableName] = restoredCount;
    } catch (tableError) {
      errors.push(`Failed to restore table ${tableName}: ${tableError}`);
      restored[tableName] = 0;
    }
  }

  return {
    success: errors.length === 0,
    restored,
    errors
  };
};

/**
 * List available backups
 */
export const listBackups = (): BackupMetadata[] => {
  const backups: BackupMetadata[] = [];
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('backup-')) {
      try {
        const backupJson = localStorage.getItem(key);
        if (backupJson) {
          const backup = JSON.parse(backupJson);
          if (backup.metadata) {
            backups.push(backup.metadata);
          }
        }
      } catch (error) {
        console.warn(`Failed to parse backup ${key}:`, error);
      }
    }
  });

  return backups.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Get backup by ID
 */
export const getBackup = async (backupId: string): Promise<Record<string, any[]> | null> => {
  const backupKey = `backup-${backupId}`;
  const backupJson = localStorage.getItem(backupKey);
  
  if (!backupJson) {
    // Try to find by partial ID
    const matchingKey = Object.keys(localStorage).find(key => 
      key.startsWith('backup-') && key.includes(backupId)
    );
    
    if (matchingKey) {
      const backup = JSON.parse(localStorage.getItem(matchingKey)!);
      return backup.data;
    }
    
    return null;
  }

  const backup = JSON.parse(backupJson);
  return backup.data;
};

/**
 * Delete backup
 */
export const deleteBackup = (backupId: string): boolean => {
  const backupKey = `backup-${backupId}`;
  if (localStorage.getItem(backupKey)) {
    localStorage.removeItem(backupKey);
    return true;
  }
  return false;
};







