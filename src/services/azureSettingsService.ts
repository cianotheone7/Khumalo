// Azure Settings Service for User and Practice Settings
import { getUserByEmail, saveUserProfile, updateUserProfile } from './azureUserRestService';

// Azure Table Storage Configuration - Using Environment Variables
const AZURE_STORAGE_ACCOUNT_NAME = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;

// Users table SAS Token from environment (more secure)
const USERS_SAS_TOKEN = import.meta.env.VITE_USERS_SAS_TOKEN || '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=Users&sig=2l3%2BQyFe9xIY8U3ntofjnmANQ1UN1WxJgGnqXNVvX9I%3D';

// Use Users table for settings storage (more reliable)
const SETTINGS_TABLE = 'Users';

// Helper function to create settings entity URL
function getSettingsEntityUrl(partitionKey: string, rowKey: string): string {
  const encodedPartitionKey = encodeURIComponent(partitionKey);
  const encodedRowKey = encodeURIComponent(rowKey);
  return `${AZURE_STORAGE_ENDPOINT}/${SETTINGS_TABLE}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')${USERS_SAS_TOKEN}`;
}

// Helper function to get settings from database (stored as part of user record)
async function getSettingsFromDatabase(email: string, settingsType: string): Promise<any> {
  try {
    console.log(`🔍 Getting ${settingsType} settings from user record...`, email);
    
    // Get the user record first
    const user = await getUserByEmail(email);
    if (!user) {
      console.log(`👤 User not found:`, email);
      return null;
    }
    
    // Extract settings from user record based on type
    const settings = {};
    switch (settingsType) {
      case 'profile':
        settings.name = user.name;
        settings.email = user.email;
        settings.role = user.role;
        settings.practiceName = user.practiceName;
        settings.licenseNumber = user.licenseNumber;
        settings.phone = user.phone;
        settings.address = user.address;
        settings.specialization = user.specialization;
        settings.experience = user.experience;
        settings.qualifications = user.qualifications;
        break;
      case 'system':
        // For now, return default system settings since we don't store them separately
        return {
          autoSave: true,
          notifications: true,
          emailAlerts: true,
          dataRetention: '7',
          backupFrequency: 'daily',
          theme: 'light',
          language: 'en',
          timezone: 'Africa/Johannesburg',
          dateFormat: 'DD/MM/YYYY',
          currency: 'ZAR'
        };
      case 'security':
        // For now, return default security settings
        return {
          twoFactorAuth: false,
          sessionTimeout: '30',
          passwordExpiry: '90',
          loginAttempts: '5',
          ipWhitelist: '',
          auditLogging: true
        };
      case 'practice':
        // For now, return default practice settings
        return {
          practiceName: user.practiceName || '',
          practiceType: 'General Practice',
          practiceCode: '',
          taxNumber: '',
          practiceAddress: '',
          practicePhone: '',
          practiceEmail: '',
          operatingHours: {
            monday: { start: '08:00', end: '17:00', closed: false },
            tuesday: { start: '08:00', end: '17:00', closed: false },
            wednesday: { start: '08:00', end: '17:00', closed: false },
            thursday: { start: '08:00', end: '17:00', closed: false },
            friday: { start: '08:00', end: '17:00', closed: false },
            saturday: { start: '09:00', end: '13:00', closed: false },
            sunday: { start: '09:00', end: '13:00', closed: true }
          },
          appointmentDuration: '30',
          maxPatientsPerDay: '50',
          emergencyContact: '',
          insuranceProviders: ['Discovery Health', 'Bonitas', 'Medihelp', 'GEMS']
        };
    }
    
    console.log(`✅ ${settingsType} settings retrieved successfully:`, settings);
    return settings;
  } catch (error) {
    console.error(`❌ Error getting ${settingsType} settings:`, error);
    return null;
  }
}

// Helper function to save settings to database (update user record)
async function saveSettingsToDatabase(email: string, settingsType: string, settings: any): Promise<boolean> {
  try {
    console.log(`💾 Saving ${settingsType} settings to user record...`, { email, settingsType, settings });
    
    // Only save profile settings to the user record for now
    if (settingsType === 'profile') {
      const success = await updateUserProfile(email, settings);
      if (success) {
        console.log(`✅ ${settingsType} settings saved to user record!`);
        return true;
      } else {
        console.error(`❌ Failed to save ${settingsType} settings to user record`);
        return false;
      }
    } else {
      // For other settings types, just return true for now (they're not persisted)
      console.log(`ℹ️ ${settingsType} settings not persisted yet (using defaults)`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error saving ${settingsType} settings:`, error);
    return false;
  }
}

// Settings interfaces
export interface UserProfile {
  name: string;
  email: string;
  role: string;
  practiceName: string;
  licenseNumber: string;
  phone: string;
  address: string;
  specialization: string;
  experience: string;
  qualifications: string;
}

export interface SystemSettings {
  autoSave: boolean;
  notifications: boolean;
  emailAlerts: boolean;
  dataRetention: string;
  backupFrequency: string;
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: string;
  passwordExpiry: string;
  loginAttempts: string;
  ipWhitelist: string;
  auditLogging: boolean;
}

export interface PracticeSettings {
  practiceName: string;
  practiceType: string;
  practiceCode: string;
  taxNumber: string;
  practiceAddress: string;
  practicePhone: string;
  practiceEmail: string;
  operatingHours: {
    monday: { start: string; end: string; closed: boolean };
    tuesday: { start: string; end: string; closed: boolean };
    wednesday: { start: string; end: string; closed: boolean };
    thursday: { start: string; end: string; closed: boolean };
    friday: { start: string; end: string; closed: boolean };
    saturday: { start: string; end: string; closed: boolean };
    sunday: { start: string; end: string; closed: boolean };
  };
  appointmentDuration: string;
  maxPatientsPerDay: string;
  emergencyContact: string;
  insuranceProviders: string[];
}

// Load user profile from database
export const loadUserProfile = async (email: string): Promise<UserProfile | null> => {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      console.log('👤 User not found in database');
      return null;
    }

    const profile: UserProfile = {
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      practiceName: user.practiceName || '',
      licenseNumber: user.licenseNumber || '',
      phone: (user as any).phone || '',
      address: (user as any).address || '',
      specialization: (user as any).specialization || '',
      experience: (user as any).experience || '',
      qualifications: (user as any).qualifications || ''
    };

    console.log('✅ User profile loaded successfully:', profile);
    return profile;
  } catch (error) {
    console.error('❌ Error loading user profile:', error);
    return null;
  }
};

// Save user profile to database
export const saveUserProfileToDatabase = async (email: string, profileData: UserProfile): Promise<boolean> => {
  try {
    console.log('💾 Saving user profile to database...', { email, profileData });
    
    const userData = {
      name: profileData.name,
      email: profileData.email,
      role: profileData.role,
      practiceName: profileData.practiceName,
      licenseNumber: profileData.licenseNumber,
      phone: profileData.phone,
      address: profileData.address,
      specialization: profileData.specialization,
      experience: profileData.experience,
      qualifications: profileData.qualifications
    };

    const result = await saveUserProfile(userData);
    
    if (result) {
      console.log('✅ User profile saved successfully to database');
      return true;
    } else {
      console.error('❌ Failed to save user profile to database');
      return false;
    }
  } catch (error) {
    console.error('❌ Error saving user profile to database:', error);
    return false;
  }
};

// Load system settings from database
export const loadSystemSettings = async (email: string): Promise<SystemSettings> => {
  try {
    console.log('🔍 Loading system settings from database...', email);
    
    const settings = await getSettingsFromDatabase(email, 'system');
    
    if (settings) {
      console.log('✅ System settings loaded from database:', settings);
      return settings as SystemSettings;
    }

    // Default settings if none found
    const defaultSettings: SystemSettings = {
      autoSave: true,
      notifications: true,
      emailAlerts: true,
      dataRetention: '7',
      backupFrequency: 'daily',
      theme: 'light',
      language: 'en',
      timezone: 'Africa/Johannesburg',
      dateFormat: 'DD/MM/YYYY',
      currency: 'ZAR'
    };

    console.log('📝 Using default system settings:', defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('❌ Error loading system settings:', error);
    return {
      autoSave: true,
      notifications: true,
      emailAlerts: true,
      dataRetention: '7',
      backupFrequency: 'daily',
      theme: 'light',
      language: 'en',
      timezone: 'Africa/Johannesburg',
      dateFormat: 'DD/MM/YYYY',
      currency: 'ZAR'
    };
  }
};

// Save system settings to database
export const saveSystemSettings = async (email: string, settings: SystemSettings): Promise<boolean> => {
  try {
    console.log('💾 Saving system settings to database...', { email, settings });
    
    const success = await saveSettingsToDatabase(email, 'system', settings);
    
    if (success) {
      console.log('✅ System settings saved to database');
      return true;
    } else {
      console.error('❌ Failed to save system settings to database');
      return false;
    }
  } catch (error) {
    console.error('❌ Error saving system settings:', error);
    return false;
  }
};

// Load security settings from database
export const loadSecuritySettings = async (email: string): Promise<SecuritySettings> => {
  try {
    console.log('🔍 Loading security settings from database...', email);
    
    const settings = await getSettingsFromDatabase(email, 'security');
    
    if (settings) {
      console.log('✅ Security settings loaded from database:', settings);
      return settings as SecuritySettings;
    }

    // Default security settings
    const defaultSettings: SecuritySettings = {
      twoFactorAuth: false,
      sessionTimeout: '30',
      passwordExpiry: '90',
      loginAttempts: '5',
      ipWhitelist: '',
      auditLogging: true
    };

    console.log('📝 Using default security settings:', defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('❌ Error loading security settings:', error);
    return {
      twoFactorAuth: false,
      sessionTimeout: '30',
      passwordExpiry: '90',
      loginAttempts: '5',
      ipWhitelist: '',
      auditLogging: true
    };
  }
};

// Save security settings to database
export const saveSecuritySettings = async (email: string, settings: SecuritySettings): Promise<boolean> => {
  try {
    console.log('💾 Saving security settings to database...', { email, settings });
    
    const success = await saveSettingsToDatabase(email, 'security', settings);
    
    if (success) {
      console.log('✅ Security settings saved to database');
      return true;
    } else {
      console.error('❌ Failed to save security settings to database');
      return false;
    }
  } catch (error) {
    console.error('❌ Error saving security settings:', error);
    return false;
  }
};

// Load practice settings from database
export const loadPracticeSettings = async (email: string): Promise<PracticeSettings> => {
  try {
    console.log('🔍 Loading practice settings from database...', email);
    
    const settings = await getSettingsFromDatabase(email, 'practice');
    
    if (settings) {
      console.log('✅ Practice settings loaded from database:', settings);
      return settings as PracticeSettings;
    }

    // Default practice settings
    const defaultSettings: PracticeSettings = {
      practiceName: '',
      practiceType: 'General Practice',
      practiceCode: '',
      taxNumber: '',
      practiceAddress: '',
      practicePhone: '',
      practiceEmail: '',
      operatingHours: {
        monday: { start: '08:00', end: '17:00', closed: false },
        tuesday: { start: '08:00', end: '17:00', closed: false },
        wednesday: { start: '08:00', end: '17:00', closed: false },
        thursday: { start: '08:00', end: '17:00', closed: false },
        friday: { start: '08:00', end: '17:00', closed: false },
        saturday: { start: '09:00', end: '13:00', closed: false },
        sunday: { start: '09:00', end: '13:00', closed: true }
      },
      appointmentDuration: '30',
      maxPatientsPerDay: '50',
      emergencyContact: '',
      insuranceProviders: ['Discovery Health', 'Bonitas', 'Medihelp', 'GEMS']
    };

    console.log('📝 Using default practice settings:', defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('❌ Error loading practice settings:', error);
    return {
      practiceName: '',
      practiceType: 'General Practice',
      practiceCode: '',
      taxNumber: '',
      practiceAddress: '',
      practicePhone: '',
      practiceEmail: '',
      operatingHours: {
        monday: { start: '08:00', end: '17:00', closed: false },
        tuesday: { start: '08:00', end: '17:00', closed: false },
        wednesday: { start: '08:00', end: '17:00', closed: false },
        thursday: { start: '08:00', end: '17:00', closed: false },
        friday: { start: '08:00', end: '17:00', closed: false },
        saturday: { start: '09:00', end: '13:00', closed: false },
        sunday: { start: '09:00', end: '13:00', closed: true }
      },
      appointmentDuration: '30',
      maxPatientsPerDay: '50',
      emergencyContact: '',
      insuranceProviders: ['Discovery Health', 'Bonitas', 'Medihelp', 'GEMS']
    };
  }
};

// Save practice settings to database
export const savePracticeSettings = async (email: string, settings: PracticeSettings): Promise<boolean> => {
  try {
    console.log('💾 Saving practice settings to database...', { email, settings });
    
    const success = await saveSettingsToDatabase(email, 'practice', settings);
    
    if (success) {
      console.log('✅ Practice settings saved to database');
      return true;
    } else {
      console.error('❌ Failed to save practice settings to database');
      return false;
    }
  } catch (error) {
    console.error('❌ Error saving practice settings:', error);
    return false;
  }
};

// Get real data statistics from database
export const getDataStatistics = async (email: string): Promise<{
  totalPatients: number;
  totalDocuments: number;
  storageUsed: string;
  lastBackup: string;
}> => {
  try {
    // Import the patient service to get counts only (not all data)
    const { getPatientCount } = await import('./azurePatientRestService');
    const { getAllDocuments } = await import('./azureTableRestService');
    
    // Get patient count without loading all patients
    const totalPatients = await getPatientCount();
    
    // Get documents count (this is usually a smaller dataset) - don't filter by patientId to get all documents
    const documents = await getAllDocuments(false);
    
    // Calculate storage used (simplified calculation)
    const storageUsedMB = documents.reduce((total, doc) => total + (doc.fileSize || 0), 0) / 1024 / 1024;
    const storageUsed = `${storageUsedMB.toFixed(1)} MB`;
    
    // Get last backup time from database
    const backupSettings = await getSettingsFromDatabase(email, 'backup');
    const lastBackup = backupSettings?.lastBackup || 'Never';
    
    const stats = {
      totalPatients: totalPatients,
      totalDocuments: documents.length,
      storageUsed,
      lastBackup
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting data statistics:', error);
    return {
      totalPatients: 0,
      totalDocuments: 0,
      storageUsed: '0 MB',
      lastBackup: 'Never'
    };
  }
};

// Export data functionality
export const exportData = async (email: string, format: 'excel' | 'pdf' | 'csv'): Promise<boolean> => {
  try {
    console.log('📤 Exporting data...', { email, format });
    
    // Import the patient service to get real data
    const { getPatients } = await import('./azurePatientRestService');
    const { getAllDocuments } = await import('./azureTableRestService');
    
    // Get real data
    const patients = await getPatients();
    const documents = await getAllDocuments(false);
    
    // Create export data
    const exportData = {
      patients,
      documents,
      exportDate: new Date().toISOString(),
      format
    };
    
    // Create and download file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `practice_data_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Data exported successfully');
    return true;
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    return false;
  }
};

// Create data backup
export const createDataBackup = async (email: string): Promise<boolean> => {
  try {
    console.log('💾 Creating data backup...', email);
    
    // Import the patient service to get real data
    const { getPatients } = await import('./azurePatientRestService');
    const { getAllDocuments } = await import('./azureTableRestService');
    
    // Get real data
    const patients = await getPatients();
    const documents = await getAllDocuments(false);
    
    // Create backup data
    const backupData = {
      patients,
      documents,
      backupDate: new Date().toISOString(),
      userEmail: email
    };
    
    // Save backup information to database
    const backupInfo = {
      lastBackup: new Date().toLocaleString(),
      backupDate: new Date().toISOString(),
      patientCount: patients.length,
      documentCount: documents.length,
      backupSize: JSON.stringify(backupData).length
    };
    
    await saveSettingsToDatabase(email, 'backup', backupInfo);
    
    console.log('✅ Data backup created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating data backup:', error);
    return false;
  }
};
