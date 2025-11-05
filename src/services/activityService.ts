// Activity tracking service - Azure Table Storage integration
const AZURE_STORAGE_ACCOUNT_NAME = 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;
const ACTIVITIES_TABLE = 'Activities';
const ACTIVITIES_SAS_TOKEN = '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=Activities&sig=YOUR_SAS_TOKEN'; // Will use general table access

export interface Activity {
  id: string;
  type: 'patient_added' | 'patient_deleted' | 'symptom_checker' | 'prescription_created' | 'prescription_sent' | 'summary_generated' | 'summary_deleted' | 'appointment_created' | 'document_uploaded' | 'document_deleted';
  patientId?: string;
  patientName?: string;
  userId: string;
  userName: string;
  description: string;
  timestamp: string;
  partitionKey?: string;
  rowKey?: string;
  metadata?: {
    prescriptionId?: string;
    summaryId?: string;
    appointmentId?: string;
    documentId?: string;
    symptoms?: string[];
    medications?: string[];
    recipientEmail?: string;
  };
}

// Helper function to create table URL
function getTableUrl(tableName: string): string {
  // SAS token for Activities table (has raud permissions)
  const SAS_TOKEN = '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=Activities&sig=ibKNJdANGHX1H%2BaxgYhZkMHYTQVPI/2Wty8sBsdcBPo%3D';
  return `${AZURE_STORAGE_ENDPOINT}/${tableName}${SAS_TOKEN}`;
}

// Save activity to Azure Table Storage
export const logActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>): Promise<Activity> => {
  const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const newActivity: Activity = {
    ...activity,
    id: activityId,
    timestamp,
    partitionKey: 'activity',
    rowKey: activityId
  };
  
  try {
    // Save to Azure Table Storage
    const tableUrl = getTableUrl(ACTIVITIES_TABLE);
    
    const requestBody = {
      "PartitionKey": "activity",
      "RowKey": activityId,
      "id": activityId,
      "type": activity.type,
      "patientId": activity.patientId || '',
      "patientName": activity.patientName || '',
      "userId": activity.userId,
      "userName": activity.userName,
      "description": activity.description,
      "timestamp": timestamp,
      "metadata": JSON.stringify(activity.metadata || {})
    };

    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'Prefer': 'return-no-content',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2022-11-02'
      },
      body: JSON.stringify(requestBody),
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      // Activity logged successfully
      console.log('✅ Activity logged successfully to database:', activity.type);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to log activity to Azure:', response.status, errorText);
      // Continue anyway - don't break the app if activity logging fails
    }
  } catch (error) {
    console.error('❌ Error logging activity:', error);
    // Continue anyway - activity logging should never break the app
  }
  
  return newActivity;
};

// Fetch recent activities from Azure Table Storage
export const getRecentActivities = async (limit: number = 100): Promise<Activity[]> => {
  try {
    const tableUrl = getTableUrl(ACTIVITIES_TABLE) + `&$top=${limit}`;
    
    const response = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2022-11-02'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch activities from Azure:', response.status);
      return [];
    }

    const data = await response.json();
    const activities: Activity[] = (data.value || []).map((item: any) => ({
      id: item.id || item.RowKey,
      type: item.type,
      patientId: item.patientId || undefined,
      patientName: item.patientName || undefined,
      userId: item.userId,
      userName: item.userName,
      description: item.description,
      timestamp: item.timestamp,
      metadata: item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : undefined
    }));

    // Sort by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities;
  } catch (error) {
    console.error('❌ Error fetching activities:', error);
    return [];
  }
};

// Helper functions are handled by filtering in the Activities component
// since we fetch all activities from Azure and filter client-side

// Helper functions for specific activity types
export const logPatientAdded = async (patientId: string, patientName: string, userId: string, userName: string): Promise<Activity> => {
  return await logActivity({
    type: 'patient_added',
    patientId,
    patientName,
    userId,
    userName,
    description: `Patient ${patientName} added to the system`
  });
};

export const logSymptomChecker = async (patientId: string, patientName: string, userId: string, userName: string, symptoms: string[]): Promise<Activity> => {
  return await logActivity({
    type: 'symptom_checker',
    patientId,
    patientName,
    userId,
    userName,
    description: `Symptom checker completed for ${patientName}`,
    metadata: { symptoms }
  });
};

export const logPrescriptionCreated = async (patientId: string, patientName: string, userId: string, userName: string, prescriptionId: string, medications: string[]): Promise<Activity> => {
  return await logActivity({
    type: 'prescription_created',
    patientId,
    patientName,
    userId,
    userName,
    description: `Prescription created for ${patientName}`,
    metadata: { prescriptionId, medications }
  });
};

export const logPrescriptionSent = async (patientId: string, patientName: string, userId: string, userName: string, prescriptionId: string, recipientEmail: string): Promise<Activity> => {
  return await logActivity({
    type: 'prescription_sent',
    patientId,
    patientName,
    userId,
    userName,
    description: `Prescription sent via email to ${recipientEmail}`,
    metadata: { prescriptionId, recipientEmail }
  });
};

export const logSummaryGenerated = async (patientId: string, patientName: string, userId: string, userName: string, summaryId: string): Promise<Activity> => {
  return await logActivity({
    type: 'summary_generated',
    patientId,
    patientName,
    userId,
    userName,
    description: `AI summary generated for ${patientName}`,
    metadata: { summaryId }
  });
};

export const logAppointmentCreated = async (patientId: string, patientName: string, userId: string, userName: string, appointmentId: string): Promise<Activity> => {
  return await logActivity({
    type: 'appointment_created',
    patientId,
    patientName,
    userId,
    userName,
    description: `Appointment scheduled for ${patientName}`,
    metadata: { appointmentId }
  });
};

export const logDocumentUploaded = async (patientId: string, patientName: string, userId: string, userName: string, documentId: string): Promise<Activity> => {
  return await logActivity({
    type: 'document_uploaded',
    patientId,
    patientName,
    userId,
    userName,
    description: `Document uploaded for ${patientName}`,
    metadata: { documentId }
  });
};

export const logPatientDeleted = async (patientId: string, patientName: string, userId: string, userName: string): Promise<Activity> => {
  return await logActivity({
    type: 'patient_deleted',
    patientId,
    patientName,
    userId,
    userName,
    description: `Patient ${patientName} deleted from the system`
  });
};

export const logDocumentDeleted = async (patientId: string, patientName: string, userId: string, userName: string, documentId: string, documentName: string): Promise<Activity> => {
  return await logActivity({
    type: 'document_deleted',
    patientId,
    patientName,
    userId,
    userName,
    description: `Document "${documentName}" deleted for ${patientName}`,
    metadata: { documentId }
  });
};

export const logSummaryDeleted = async (patientId: string, patientName: string, userId: string, userName: string, summaryId: string): Promise<Activity> => {
  return await logActivity({
    type: 'summary_deleted',
    patientId,
    patientName,
    userId,
    userName,
    description: `AI Summary deleted for ${patientName}`,
    metadata: { summaryId }
  });
};

// Get activity icon based on type
export const getActivityIcon = (type: Activity['type']): string => {
  switch (type) {
    case 'patient_added':
      return '👤';
    case 'patient_deleted':
      return '❌';
    case 'symptom_checker':
      return '🔍';
    case 'prescription_created':
      return '💊';
    case 'summary_generated':
      return '📋';
    case 'summary_deleted':
      return '🗑️';
    case 'appointment_created':
      return '📅';
    case 'document_uploaded':
      return '📄';
    case 'document_deleted':
      return '🗑️';
    default:
      return '📝';
  }
};

// Get activity color based on type
export const getActivityColor = (type: Activity['type']): string => {
  switch (type) {
    case 'patient_added':
      return '#2c5aa0';
    case 'patient_deleted':
      return '#e74c3c';
    case 'symptom_checker':
      return '#e67e22';
    case 'prescription_created':
      return '#27ae60';
    case 'summary_generated':
      return '#8e44ad';
    case 'summary_deleted':
      return '#c0392b';
    case 'appointment_created':
      return '#3498db';
    case 'document_uploaded':
      return '#f39c12';
    case 'document_deleted':
      return '#d35400';
    default:
      return '#95a5a6';
  }
};


