import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Extend Window interface for notification timeout
import { Auth } from './components/Auth';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import { Activities } from './components/Activities';
import SymptomCheckerPage from './pages/SymptomCheckerPage';
import AppointmentBooking from './components/AppointmentBooking';
import PatientAppointmentBooking from './components/PatientAppointmentBooking';
import PrescriptionManagement from './components/PrescriptionManagement';
import { DateOfBirthPicker } from './components/DateOfBirthPicker';
import { generateSummaryWithProgress } from './services/azureOpenAIService';
import { 
  permanentDeleteDocument as deleteDocumentFromTable
} from './services/azureTableRestService';
import { generateMedicalSummary } from './services/azureOpenAIService';
import { 
  getActivityIcon, 
  getActivityColor,
  logPatientAdded,
  logPatientDeleted,
  logSymptomChecker,
  logPrescriptionCreated,
  logSummaryGenerated,
  logSummaryDeleted,
  logAppointmentCreated,
  logDocumentUploaded,
  logDocumentDeleted,
  type Activity
} from './services/activityService';
import { isCurrentUserDemo, isDemoMode } from './services/demoDataService';
// Use data service router that handles demo mode
import { 
  createPatient, 
  getPatients, 
  getPatientsOptimized,
  getPatientsFast,
  updatePatient,
  deletePatient as deletePatientFromAzure,
  searchPatients
} from './services/dataService';
import {
  createAISummary,
  getAISummaries,
  createDocument,
  getDocuments,
  getAllDocuments,
  getRecentActivities
} from './services/dataService';
// Inline user service functions to bypass bundling issues
// Using environment variables for better security
const AZURE_STORAGE_ACCOUNT_NAME = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_KEY = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_KEY || '';
const AZURE_STORAGE_SAS = import.meta.env.VITE_AZURE_STORAGE_SAS_TOKEN || 'se=2026-10-30T17%3A46%3A40Z&sp=rwdxylacupfti&spr=https&sv=2022-11-02&ss=tqbf&srt=sco&sig=KqDI2JIEBhuwZy9EiZP9CaUNGJCp/rj5HAhmwr1fGMU%3D';

// Generate SAS URL for table operations
const getTableUrl = (tableName: string) => {
  const endpoint = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;
  if (AZURE_STORAGE_SAS && AZURE_STORAGE_SAS.trim() !== '') {
    return `${endpoint}/${tableName}?${AZURE_STORAGE_SAS}`;
  }
  return `${endpoint}/${tableName}`;
};

// User service loaded

const getUserByEmail = async (email: string) => {
  try {
    const encodedPartitionKey = encodeURIComponent('user');
    const encodedRowKey = encodeURIComponent(email);
    const baseUrl = getTableUrl('Users');
    const entityUrl = baseUrl.includes('?') 
      ? `${baseUrl.split('?')[0]}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')?${baseUrl.split('?')[1]}`
      : `${baseUrl}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')`;
    
    const response = await fetch(entityUrl, {
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
      return {
        id: data.id || data.RowKey || email,
        name: data.name || data.Name || '',
        email: data.email || data.Email || email,
        role: data.role || data.Role || '',
        practiceName: data.practiceName || data.PracticeName || '',
        licenseNumber: data.licenseNumber || data.LicenseNumber || '',
        createdAt: data.createdAt || data.CreatedAt || new Date().toISOString(),
        lastLogin: data.lastLogin || data.LastLogin || new Date().toISOString(),
        partitionKey: data.partitionKey || data.PartitionKey || 'user',
        rowKey: data.rowKey || data.RowKey || email
      };
    } else if (response.status === 404) {
      return null;
    } else {
      console.error('❌ Failed to get user:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
};

const updateUserProfile = async (email: string, profileData: { name?: string; role?: string }) => {
  try {
    const encodedPartitionKey = encodeURIComponent('user');
    const encodedRowKey = encodeURIComponent(email);
    const baseUrl = getTableUrl('Users');
    const entityUrl = baseUrl.includes('?') 
      ? `${baseUrl.split('?')[0]}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')?${baseUrl.split('?')[1]}`
      : `${baseUrl}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')`;

    const updateBody: any = {
      "PartitionKey": "user",
      "RowKey": email,
      "lastLogin": new Date().toISOString()
    };

    if (profileData.name !== undefined) updateBody.name = profileData.name;
    if (profileData.role !== undefined) updateBody.role = profileData.role;

    const response = await fetch(entityUrl, {
      method: 'MERGE',
      headers: {
        'If-Match': '*',
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(updateBody),
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      return await getUserByEmail(email);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to update user profile:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    return null;
  }
};

// Helper to update deceased status (used by UI) - wraps updatePatient service
const updatePatientDeceasedStatus = async (patientId: string, deceased: boolean, deceasedDate?: string) => {
  try {
    const updateData: any = {
      status: deceased ? 'Deceased' : 'Living'
    };
    if (deceased) updateData.deceasedDate = deceasedDate || new Date().toISOString();
    else updateData.deceasedDate = '';

    const updated = await updatePatient(patientId, updateData);
    return updated;
  } catch (error) {
    console.error('❌ Error in updatePatientDeceasedStatus:', error);
    return null;
  }
};
import './App.css';

// Simple localStorage helpers to replace old SDK functions
const getLocalData = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting local data:', error);
    return null;
  }
};

const setLocalData = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting local data:', error);
  }
};

const isAzureAvailable = () => true; // Always available since we're using REST API

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  mobilePhone?: string;
  whatsappPhone?: string;
  passportId?: string;
  gender?: string;
  race?: string;
  dateOfBirth: string;
  medicalRecordNumber: string;
  emergencyContact: string;
  insuranceProvider: string;
  medicalAidNumber: string;
  dependentCode: string;
  allergies: string;
  currentMedications?: string;
  chronicConditions: string;
  status?: 'Living' | 'Deceased' | 'Unknown';
  deceasedDate?: string;
  createdAt: string;
  partitionKey?: string;
  rowKey?: string;
}

interface Document {
  id: string;
  patientId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  description: string;
  documentType: 'Lab Results' | 'Imaging' | 'Pathology' | 'Consultation' | 'Prescription' | 'Invoice' | 'Body Composition' | 'Other';
}

interface AISummary {
  partitionKey: string;
  rowKey: string;
  patientId: string;
  summaryText: string;
  generatedBy: string;
  documentIds: string;
  createdAt: string;
}

// Initialize Azure services on app start
const initializeApp = async () => {
  try {
    // Skip table initialization - tables are already created in Azure
    // Azure services ready
  } catch (error) {
    console.error('Failed to initialize Azure services:', error);
  }
};

// Main Dashboard Component
function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingDeceased, setEditingDeceased] = useState(false);
  const [deceasedDate, setDeceasedDate] = useState('');
  const [updatingDeceased, setUpdatingDeceased] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    role: ''
  });

  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [totalPatientCount, setTotalPatientCount] = useState<number>(0);
  const [isLoadingMorePatients, setIsLoadingMorePatients] = useState(false);
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [summariesList, setSummariesList] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  // Removed pagination - show all patients

  // Function to refresh activities
  const refreshActivities = async () => {
    const activities = await getRecentActivities(1000); // Get more to include all prescription sends
    setRecentActivities(activities);
    calculate30DayKPIs(); // Recalculate KPIs after refresh
  };

  // Load activities when dashboard loads or when returning to dashboard
  useEffect(() => {
    if (currentView === 'dashboard') {
      refreshActivities();
    }
  }, [currentView]);

  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    mobilePhone: '',
    whatsappPhone: '',
    passportId: '',
    gender: '',
    race: '',
    dateOfBirth: '',
    medicalRecordNumber: '',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
    customInsuranceProvider: '',
    medicalAidNumber: '',
    dependentCode: '',
    allergies: '',
    currentMedications: '',
    chronicConditions: '',
    status: 'Unknown',
    deceasedDate: '',
    // Address fields
    homeNumber: '',
    streetAddress: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    country: ''
  });

  const [newDocument, setNewDocument] = useState({
    fileName: '',
    description: '',
    documentType: 'Other' as Document['documentType']
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<AISummary | null>(null);
  const [lastGeneratedPatient, setLastGeneratedPatient] = useState<Patient | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedDocumentForWhatsApp, setSelectedDocumentForWhatsApp] = useState<any | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isCustomWhatsAppNumber, setIsCustomWhatsAppNumber] = useState(false);

  // KPI data for last 30 days
  const [kpiData, setKpiData] = useState({
    documentsLast30Days: 0,
    patientsLast30Days: 0,
    prescriptionsLast30Days: 0
  });

  // Calculate 30-day KPIs
  const calculate30DayKPIs = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count documents added in last 30 days
    const documentsLast30Days = documentsList.filter(doc => {
      const docDate = new Date(doc.uploadedAt || doc.createdAt);
      return docDate >= thirtyDaysAgo;
    }).length;

    // Count patients added in last 30 days
    const patientsLast30Days = patientsList.filter(patient => {
      const patientDate = new Date(patient.createdAt);
      return patientDate >= thirtyDaysAgo;
    }).length;

    // Count prescription emails sent in last 30 days from database (Activities table)
    const prescriptionSentActivities = recentActivities.filter(activity => {
      if (activity.type === 'prescription_sent') {
        const activityDate = new Date(activity.timestamp);
        const isRecent = activityDate >= thirtyDaysAgo;
        if (isRecent) {
          console.log(`📧 Found recent prescription_sent: ${activity.description} on ${activity.timestamp}`);
        }
        return isRecent;
      }
      return false;
    });
    
    const prescriptionsLast30Days = prescriptionSentActivities.length;
    console.log(`📊 KPI Calculation: Found ${prescriptionsLast30Days} prescription emails sent in last 30 days (from ${recentActivities.length} total activities)`);

    setKpiData({
      documentsLast30Days,
      patientsLast30Days,
      prescriptionsLast30Days
    });
  };

  // Calculate KPIs when data changes
  useEffect(() => {
    if (documentsList.length > 0 || patientsList.length > 0 || recentActivities.length > 0) {
      calculate30DayKPIs();
    }
  }, [documentsList, patientsList, recentActivities]);

  // Listen for prescription email sent events to refresh KPIs from database
  useEffect(() => {
    const handlePrescriptionEmailSent = async () => {
      console.log('📧 Prescription email sent event received, refreshing activities from database...');
      // Wait a moment for the database to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload activities from database to get the latest count
      try {
        const activities = await getRecentActivities(1000); // Get more activities to ensure we capture all
        console.log(`📊 Reloaded ${activities.length} activities, found ${activities.filter(a => a.type === 'prescription_sent').length} prescription_sent activities`);
        
        const prescriptionSends = activities.filter(a => {
          if (a.type === 'prescription_sent') {
            console.log(`✅ Found prescription_sent activity: ${a.description} at ${a.timestamp}`);
            return true;
          }
          return false;
        });
        console.log(`📧 Total prescription emails found: ${prescriptionSends.length}`);
        
        setRecentActivities(activities);
        
        // Force KPI recalculation after a short delay to ensure state is updated
        setTimeout(() => {
          calculate30DayKPIs();
        }, 500);
      } catch (error) {
        console.error('Error refreshing activities:', error);
        // Still recalculate with current data
        calculate30DayKPIs();
      }
    };

    window.addEventListener('prescriptionEmailSent', handlePrescriptionEmailSent);
    
    return () => {
      window.removeEventListener('prescriptionEmailSent', handlePrescriptionEmailSent);
    };
  }, []);

  // Load data on app start
  useEffect(() => {
    // First, immediately check for user session to prevent login page flash
        const savedUser = getLocalData('currentUser');
        if (savedUser) {
      // Set user immediately to prevent login page flash
          setUser({
            id: savedUser.id,
            name: savedUser.name,
            email: savedUser.email,
            role: savedUser.role
          });
    }
    
    // Start loading data immediately
    const loadData = async () => {
      setIsLoading(true);
      try {
        // If we have a saved user, try to load their Azure profile
        if (savedUser) {
          try {
            // Try to load user profile from Azure
            // Loading user profile
            const azureUser = await getUserByEmail(savedUser.email);
            
            if (azureUser) {
              // Use Azure profile data
              setUser({
                id: azureUser.id,
                name: azureUser.name,
                email: azureUser.email,
                role: azureUser.role
              });
            }
          } catch (error) {
            console.error('Failed to load user from Azure, using local data:', error);
            // Keep the user logged in with local data
          }
        }

        await initializeApp();
        
        // Load all data in parallel for maximum speed
        let patients = [];
        let totalCount = 0;
        let documents = [];
        let summaries = [];
        
        try {
          // PROGRESSIVE LOAD: Load first 1000 patients instantly, then rest in background
          setLoadingProgress(20);
          const [fastLoadResult, documentsData, summariesData] = await Promise.all([
            getPatientsFast().then(result => { setLoadingProgress(60); return result; }),
            getAllDocuments().then(result => { setLoadingProgress(80); return result; }),
            getAISummaries().then(result => { setLoadingProgress(100); return result; })
          ]);
          
          // Use fast load results - first 1000 patients loaded
          patients = fastLoadResult.patients;
          totalCount = fastLoadResult.totalCount;
          documents = documentsData;
          summaries = summariesData;
          
          // If there are more patients, load them ALL in the background
          if (fastLoadResult.hasMore) {
            // Load the rest in the background (non-blocking)
            setTimeout(async () => {
              try {
                setIsLoadingMorePatients(true);
                const allPatientsData = await getPatientsOptimized();
                
                // Update with complete patient list
                const patientsWithDefaults = allPatientsData.map(patient => ({
                  ...patient,
                  medicalAidNumber: patient.medicalAidNumber || '',
                  dependentCode: patient.dependentCode || '',
                  allergies: patient.allergies || '',
                  chronicConditions: patient.chronicConditions || ''
                }));
                
                setAllPatients(patientsWithDefaults);
                setPatientsList(patientsWithDefaults);
                setTotalPatientCount(allPatientsData.length); // Update total count with actual loaded count
                setIsLoadingMorePatients(false);
              } catch (error) {
                console.error('❌ Background patient load failed:', error);
                setIsLoadingMorePatients(false);
              }
            }, 100); // Start after 100ms to not block UI
          }
          
        } catch (error) {
          console.error('Failed to load data from Azure:', error);
          // Fallback: try fast load
          try {
            const fastLoadResult = await getPatientsFast();
            patients = fastLoadResult.patients;
            totalCount = fastLoadResult.totalCount;
          } catch (patientError) {
            console.error('Failed to load patients:', patientError);
            patients = [];
            totalCount = 0;
          }
        }
        
        // Add default values for missing fields
        const patientsWithDefaults = patients.map(patient => ({
          ...patient,
          medicalAidNumber: patient.medicalAidNumber || '',
          dependentCode: patient.dependentCode || '',
          allergies: patient.allergies || '',
          chronicConditions: patient.chronicConditions || ''
        }));
        
        setAllPatients(patientsWithDefaults);
        setPatientsList(patientsWithDefaults);
        setTotalPatientCount(totalCount);
        setDocumentsList(documents);
        setSummariesList(summaries);
        
        // Load recent activities
        const activities = await getRecentActivities(1000); // Get more activities to ensure we capture all prescription sends
        setRecentActivities(activities);
        console.log(`📊 Loaded ${activities.length} activities from database, ${activities.filter(a => a.type === 'prescription_sent').length} prescription emails sent`);
        
        // Dashboard data loaded
      } catch (error) {
        console.error('Failed to load data from Azure:', error);
          // Don't log out user if data loading fails - just show empty data
          console.log('Using empty data due to loading failure, but keeping user logged in');
      } finally {
        setIsLoading(false);
      }
    };

    // Call loadData immediately
    loadData();
  }, []);

  const editProfile = () => {
    console.log('Edit profile clicked', user);
    if (user) {
      setEditProfileData({
        name: user.name,
        role: user.role
      });
      setShowEditProfile(true);
      console.log('Edit profile modal should open');
    }
  };


  const updateProfile = async () => {
    if (user && editProfileData.name && editProfileData.role) {
      try {
        console.log('Updating profile in Azure...');
        
        // Update profile in Azure Table Storage
        const updatedUser = await updateUserProfile(user.email, {
          name: editProfileData.name,
          role: editProfileData.role
        });
        
        if (updatedUser) {
          // Update local state
          setUser(updatedUser);
          setLocalData('currentUser', updatedUser);
          setShowEditProfile(false);
          console.log('✅ Profile updated successfully in Azure!');
        } else {
          console.error('❌ Failed to update profile in Azure');
          // Fallback to localStorage
      const updatedUser = {
        ...user,
        name: editProfileData.name,
        role: editProfileData.role
      };
        setUser(updatedUser);
        setLocalData('currentUser', updatedUser);
        setShowEditProfile(false);
          console.log('Profile updated locally as fallback');
        }
      } catch (error) {
        console.error('Failed to update profile:', error);
        // Fallback to localStorage
        const updatedUser = {
          ...user,
          name: editProfileData.name,
          role: editProfileData.role
        };
        setUser(updatedUser);
        setLocalData('currentUser', updatedUser);
        setShowEditProfile(false);
        console.log('Profile updated locally as fallback');
      }
    }
  };

  const editPatient = (patient: Patient) => {
    setEditingPatient(patient);
    
    // Parse emergencyContact string into name and phone
    let emergencyContactName = '';
    let emergencyContactPhone = '';
    if (patient.emergencyContact) {
      // Format is typically "Name (Phone)" or just "Name" or just "Phone"
      const match = patient.emergencyContact.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (match) {
        emergencyContactName = match[1].trim();
        emergencyContactPhone = match[2].trim();
      } else {
        // If no parentheses, assume it's just the name
        emergencyContactName = patient.emergencyContact.trim();
      }
    }
    
    // Validate and sanitize dateOfBirth - prevent "Invalid Date" errors
    let dateOfBirth = patient.dateOfBirth || '';
    if (dateOfBirth) {
      const testDate = new Date(dateOfBirth);
      if (isNaN(testDate.getTime())) {
        console.warn(`⚠️ Patient ${patient.name} has invalid dateOfBirth: "${dateOfBirth}". Clearing it.`);
        dateOfBirth = '';
      }
    }
    
    setNewPatient({
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      mobilePhone: patient.mobilePhone || '',
      whatsappPhone: patient.whatsappPhone || '',
      passportId: patient.passportId || '',
      gender: patient.gender || '',
      race: patient.race || '',
      dateOfBirth: dateOfBirth,
      medicalRecordNumber: patient.medicalRecordNumber,
      emergencyContact: patient.emergencyContact,
      emergencyContactName: emergencyContactName,
      emergencyContactPhone: emergencyContactPhone,
      insuranceProvider: patient.insuranceProvider,
      customInsuranceProvider: '',
      medicalAidNumber: patient.medicalAidNumber,
      dependentCode: patient.dependentCode,
      allergies: patient.allergies,
      currentMedications: patient.currentMedications || '',
      chronicConditions: patient.chronicConditions,
      status: patient.status || 'Unknown',
      deceasedDate: patient.deceasedDate || '',
      // Address fields
      homeNumber: patient.homeNumber || '',
      streetAddress: patient.streetAddress || '',
      suburb: patient.suburb || '',
      city: patient.city || '',
      province: patient.province || '',
      postalCode: patient.postalCode || '',
      country: patient.country || ''
    });
    setShowEditPatient(true);
  };

  const handleUpdatePatient = async () => {
    if (editingPatient && newPatient.name) {
      setIsUpdatingPatient(true);
      try {
        // Combine emergencyContactName and emergencyContactPhone into emergencyContact
        const emergencyContact = newPatient.emergencyContactName && newPatient.emergencyContactPhone 
          ? `${newPatient.emergencyContactName} (${newPatient.emergencyContactPhone})`
          : newPatient.emergencyContactName || newPatient.emergencyContactPhone || '';
        
        const updatedPatientData = {
          name: newPatient.name,
          email: newPatient.email,
          phone: newPatient.phone,
          mobilePhone: newPatient.mobilePhone,
          whatsappPhone: newPatient.whatsappPhone,
          passportId: newPatient.passportId,
          gender: newPatient.gender,
          dateOfBirth: newPatient.dateOfBirth,
          medicalRecordNumber: newPatient.medicalRecordNumber,
          emergencyContact: emergencyContact,
          insuranceProvider: newPatient.insuranceProvider === 'Other' ? newPatient.customInsuranceProvider : newPatient.insuranceProvider,
          medicalAidNumber: newPatient.medicalAidNumber,
          dependentCode: newPatient.dependentCode,
          allergies: newPatient.allergies,
          chronicConditions: newPatient.chronicConditions,
          status: newPatient.status as 'Living' | 'Deceased' | 'Unknown',
          deceasedDate: newPatient.status === 'Deceased' ? newPatient.deceasedDate : undefined,
          // Address fields
          homeNumber: newPatient.homeNumber,
          streetAddress: newPatient.streetAddress,
          suburb: newPatient.suburb,
          city: newPatient.city,
          province: newPatient.province,
          postalCode: newPatient.postalCode,
          country: newPatient.country
        };

        console.log('🔍 DEBUG: Updating patient with data:', {
          patientId: editingPatient.id,
          originalData: editingPatient,
          newData: newPatient,
          updateData: updatedPatientData
        });

        // Update patient using Azure REST API service
        const updatedPatient = await updatePatient(editingPatient.id, updatedPatientData);
        
        console.log('🎯 CRITICAL: Patient returned from updatePatient:', updatedPatient);
        console.log('🎯 CRITICAL: Status field value:', updatedPatient?.status);
        console.log('🎯 CRITICAL: DeceasedDate field value:', updatedPatient?.deceasedDate);
        
        if (updatedPatient) {
          // Update in both lists
          const updatedPatients = allPatients.map(p => 
            p.id === editingPatient.id ? updatedPatient : p
          );
          setAllPatients(updatedPatients);
          setPatientsList(updatedPatients);
          
          console.log('🎯 CRITICAL: Updated patient in list:', updatedPatients.find(p => p.id === editingPatient.id));
          
          // Reset form and close modal
          setNewPatient({
    name: '', email: '', phone: '', mobilePhone: '', whatsappPhone: '', passportId: '', gender: '', race: '', dateOfBirth: '', medicalRecordNumber: '',
    emergencyContact: '', emergencyContactName: '', emergencyContactPhone: '',
    insuranceProvider: '', customInsuranceProvider: '',
    medicalAidNumber: '', dependentCode: '', allergies: '', currentMedications: '', chronicConditions: '',
    status: 'Unknown', deceasedDate: '',
    // Address fields
    homeNumber: '', streetAddress: '', suburb: '', city: '', province: '', postalCode: '', country: ''
          });
          setEditingPatient(null);
          setShowEditPatient(false);
          displayNotification('Patient updated successfully!');
        } else {
          throw new Error('Failed to update patient - no response from server');
        }
      } catch (error) {
        console.error('Failed to update patient:', error);
        if (error instanceof Error && error.message.includes('404')) {
          displayNotification('Patients table not found. Please create the table in Azure portal first.', 'error');
        } else {
          displayNotification('Failed to update patient. Please try again.', 'error');
        }
      } finally {
        setIsUpdatingPatient(false);
      }
    }
  };

  const handleDeceasedStatusUpdate = async (patientId: string, deceased: boolean) => {
    setUpdatingDeceased(true);
    try {
      const deceasedDateValue = deceased ? deceasedDate : undefined;
      const updatedPatient = await updatePatientDeceasedStatus(patientId, deceased, deceasedDateValue);
      
      if (updatedPatient) {
        // Update the patient in the local state
        const updatedPatients = allPatients.map(p => 
          p.id === patientId ? updatedPatient : p
        );
        setAllPatients(updatedPatients);
        setPatientsList(updatedPatients);
        
        // Update selectedPatient if it's the same patient
        if (selectedPatient && selectedPatient.id === patientId) {
          setSelectedPatient(updatedPatient);
        }
        
        setEditingDeceased(false);
        setDeceasedDate('');
        displayNotification(`Patient status updated to ${deceased ? 'Deceased' : 'Living'} successfully!`);
      } else {
        displayNotification('Failed to update patient status. Please try again.', 'error');
      }
    } catch (error) {
      console.error('❌ Error updating deceased status:', error);
      displayNotification('Failed to update patient status. Please try again.', 'error');
    } finally {
      setUpdatingDeceased(false);
    }
  };

  const addPatient = async () => {
    console.log('🔵 Add Patient button clicked!');
    console.log('Current newPatient state:', newPatient);
    
    if (newPatient.name) {
      console.log('✅ Patient data validation passed');
      try {
        const patientData = {
          name: newPatient.name,
          email: newPatient.email,
          phone: newPatient.phone,
          mobilePhone: newPatient.mobilePhone,
          whatsappPhone: newPatient.whatsappPhone,
          passportId: newPatient.passportId,
          gender: newPatient.gender,
          dateOfBirth: newPatient.dateOfBirth,
          medicalRecordNumber: newPatient.medicalRecordNumber || undefined, // Auto-generate if empty
          emergencyContact: newPatient.emergencyContactName && newPatient.emergencyContactPhone 
            ? `${newPatient.emergencyContactName} (${newPatient.emergencyContactPhone})`
            : newPatient.emergencyContactName || newPatient.emergencyContactPhone || '',
          insuranceProvider: newPatient.insuranceProvider === 'Other' ? newPatient.customInsuranceProvider : newPatient.insuranceProvider,
          medicalAidNumber: newPatient.medicalAidNumber,
          dependentCode: newPatient.dependentCode,
          allergies: newPatient.allergies,
          chronicConditions: newPatient.chronicConditions,
          // Address fields
          homeNumber: newPatient.homeNumber,
          streetAddress: newPatient.streetAddress,
          suburb: newPatient.suburb,
          city: newPatient.city,
          province: newPatient.province,
          postalCode: newPatient.postalCode,
          country: newPatient.country
        };

        // Create patient using Azure REST API
        const patient = await createPatient(patientData);
        console.log('✅ Patient created with Azure REST API');
        const updatedPatients = [...allPatients, patient];
        setAllPatients(updatedPatients);
        setPatientsList(updatedPatients);
        setTotalPatientCount(totalPatientCount + 1); // Update total count
        
        // Clear search term and update filtered patients to show all including the new one
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setFilteredPatients(updatedPatients); // Immediately update filtered list

        // Log activity
        if (user) {
          await logPatientAdded(
            patient.medicalRecordNumber || patient.id,
            patient.name,
            user.id || user.email,
            user.name || user.email
          );
          refreshActivities();
        }

        setNewPatient({
    name: '', email: '', phone: '', mobilePhone: '', whatsappPhone: '', passportId: '', gender: '', race: '', dateOfBirth: '', medicalRecordNumber: '',
    emergencyContact: '', emergencyContactName: '', emergencyContactPhone: '', 
    insuranceProvider: '', customInsuranceProvider: '',
    medicalAidNumber: '', dependentCode: '', allergies: '', currentMedications: '', chronicConditions: '',
    status: 'Unknown', deceasedDate: '',
    // Address fields
    homeNumber: '', streetAddress: '', suburb: '', city: '', province: '', postalCode: '', country: ''
        });
        setShowAddPatient(false);
        displayNotification('Patient added successfully!');
      } catch (error) {
        console.error('Failed to add patient:', error);
        
        // Check for specific error types
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('409') || errorMessage.includes('EntityAlreadyExists') || errorMessage.includes('Conflict')) {
          displayNotification(
            `⚠️ A patient with this file number already exists. Please use a different file number or check if the patient is already in the system.`,
            'error'
          );
        } else if (errorMessage.includes('404')) {
          displayNotification(
            '❌ Patients table not found. Please contact your administrator to set up the database.',
            'error'
          );
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          displayNotification(
            '🔒 Permission denied. Please check your authentication or contact your administrator.',
            'error'
          );
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          displayNotification(
            '📡 Network error. Please check your internet connection and try again.',
            'error'
          );
        } else {
          displayNotification(
            `❌ Failed to add patient: ${errorMessage.substring(0, 100)}`,
            'error'
          );
        }
      }
    } else {
      console.log('❌ Patient data validation failed');
      console.log('Missing fields:', {
        name: !newPatient.name
      });
      displayNotification('Please enter a patient name.', 'error');
    }
  };

  // Refresh documents list after upload with delay for Azure Table Storage indexing
  const refreshDocumentsList = async () => {
    try {
      // Add a small delay to allow Azure Table Storage to index the new document
      // Azure Table Storage has eventual consistency, so we wait briefly before querying
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const documents = await getAllDocuments();
      setDocumentsList(documents);
      console.log('📄 Documents list refreshed:', documents.length);
    } catch (error) {
      console.error('Failed to refresh documents list:', error);
    }
  };

  const generateBodyCompositionSummary = async (patient: Patient, document: any, file: File) => {
    try {
      console.log('🏋️ Starting body composition analysis...');
      
      // Import the A4F service
      const { isAzureOpenAIAvailable } = await import('./services/azureOpenAIService');
      
      if (!isAzureOpenAIAvailable()) {
        console.warn('A4F API not configured, skipping body composition summary');
        displayNotification('AI service not configured. Cannot generate summary.', 'error');
        return;
      }

      const age = patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'Unknown';
      const height = patient.height || 'Not specified';

      // Extract text and analyze using A4F vision model
      console.log('🔍 Using A4F vision model to analyze body composition image...');
      
      try {
        // Convert image to base64
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Use A4F vision model to analyze the image and create summary directly
        const { azureConfig } = await import('./config/azure-config');
        const url = `${azureConfig.openai.endpoint}/chat/completions`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${azureConfig.openai.apiKey}`,
          },
          body: JSON.stringify({
            model: 'provider-5/gpt-4.1-mini-2025-04-14',
            messages: [
              { 
                role: 'user', 
                content: [
                  {
                    type: 'text',
                    text: `You are a medical professional from Dr Hlosukwazi Khumalo's practice analyzing a body composition scan.

Patient: Age ${age} years, Height ${height}

Analyze this body composition scan image and create a professional medical report.

IMPORTANT: 
- Write as Dr Hlosukwazi Khumalo's practice
- Do NOT mention AI, automation, or technology
- Write in first-person professional medical language
- Be warm, professional, and reassuring
- END your response with ONLY the signature shown below, do NOT add any additional closing or signature

Format your response as:

Dear ${patient.name},

Thank you for your recent body composition assessment at our practice. Below is a comprehensive analysis of your results:

**Body Composition Metrics**
Based on your scan, here are your current measurements:
- Weight: [value]
- Body Fat Percentage: [value]
- BMI: [value]
- Skeletal Muscle: [value]
- Muscle Mass: [value]
- Protein: [value]
- Basal Metabolic Rate: [value] kcal/day
- Visceral Fat: [value]
- Body Water: [value]
- Bone Mass: [value]
- Metabolic Age: [value]
- [any other visible metrics]

**Health Assessment**
At ${age} years of age, [detailed assessment of metrics compared to healthy ranges, note concerning values if any, overall health status]

**Recommendations for Optimal Health**

*Nutrition:*
[Specific dietary recommendations]

*Exercise Program:*
[Specific exercise recommendations with types and frequency]

*Lifestyle:*
[Other health recommendations]

**Moving Forward**
[Why tracking matters and recommended monitoring frequency]

We're here to support you on your health journey. Please don't hesitate to contact our practice if you have any questions about these results.

Warm regards,

Lifelane Healthcare
Dr Hlosukwazi Khumalo's Practice`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 3000,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('A4F Vision API error:', errorText);
          throw new Error(`A4F Vision API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const summaryContent = data.choices[0].message.content.trim();

        console.log('✅ A4F vision analysis complete');
        console.log('Summary preview:', summaryContent.substring(0, 200) + '...');

        // Save summary to database
        const summaryData = {
          patientId: patient.medicalRecordNumber || patient.id,
          patientName: patient.name,
          documentIds: document.rowKey,
          summaryText: summaryContent,
          summaryType: 'Body Composition Analysis',
          createdBy: user?.id || user?.email || 'system'
        };

        await createAISummary(summaryData);
        console.log('✅ Body composition AI summary saved to database');
        
        // Refresh summaries list immediately
        const { getAISummaries } = await import('./services/azureTableRestService');
        const updatedSummaries = await getAISummaries();
        setSummariesList(updatedSummaries);
        console.log('✅ Summaries list refreshed');
        
        // Show success notification
        displayNotification('🏋️ Body composition summary generated successfully!');
      } catch (error) {
        console.error('❌ Error in vision analysis:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error generating body composition summary:', error);
      displayNotification('Failed to generate body composition summary. Check console for details.', 'error');
      throw error;
    }
  };

  const addDocument = async () => {
    if (selectedPatient && newDocument.fileName) {
      console.log('🚀🚀🚀 UPLOAD STARTING!');
      setIsUploadingDocument(true);
      
      try {
        // Get ALL files from the file input
        const fileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement;
        const files = fileInput?.files;
        
        if (!files || files.length === 0) {
          displayNotification('Please select at least one file to upload.', 'error');
          setIsUploadingDocument(false);
          return;
        }

        const filesToUpload = Array.from(files);
        console.log(`📦 Uploading ${filesToUpload.length} file(s)...`);

        // Process all files
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          console.log(`📄 Processing file ${i + 1}/${filesToUpload.length}: ${file.name}`);

          const fileName = file.name;
          const fileSize = file.size;
          const contentType = file.type;
          let processedText = '';

          // Use simple document processing
          console.log('🔄 Using simple document processing for upload...');
          
          const fileNameLower = file.name.toLowerCase();
          processedText = `Medical Document Analysis
File: ${file.name}
Type: ${file.type}
Size: ${(file.size / 1024).toFixed(1)} KB
Uploaded: ${new Date().toLocaleString()}

Document Category: ${fileNameLower.includes('cbc') ? 'CBC/Blood Count Report' : 
            fileNameLower.includes('lab') ? 'Laboratory Report' : 
            fileNameLower.includes('xray') ? 'X-Ray Report' : 
            fileNameLower.includes('ct') ? 'CT Scan Report' : 
            fileNameLower.includes('mri') ? 'MRI Report' : 
            fileNameLower.includes('screenshot') ? 'Screenshot/Image Report' :
            'Medical Document'}

Processing Method: Simple Analysis (Advanced OCR temporarily unavailable)

Key Information:
- Document successfully uploaded and stored
- File appears to be a medical report or test result
- For detailed analysis, please ensure the document is clear and readable
- Consider re-uploading as a high-resolution image for better processing

Note: This is a simplified analysis. For comprehensive text extraction, 
the advanced document processing module needs to be functioning properly.`;

          console.log('✅ Simple processing completed for upload:', {
            fileName: file.name,
            textLength: processedText.length
          });

          // Upload file to Azure Blob Storage
          let blobUrl = '';
          const { uploadDocument } = await import('./services/azureBlobService');
          const uploadResult = await uploadDocument(file, {
            fileName: fileName,
            fileSize: fileSize,
            contentType: contentType,
            patientId: selectedPatient.medicalRecordNumber,
            description: newDocument.description,
            documentType: newDocument.documentType
          });
          
          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Failed to upload file to Azure Blob Storage');
          }
          
          blobUrl = uploadResult.url || '';
          console.log('File uploaded successfully to Azure Blob Storage:', blobUrl);

          const documentData = {
            patientId: selectedPatient.medicalRecordNumber,
            fileName: fileName,
            fileSize: fileSize,
            description: newDocument.description,
            documentType: newDocument.documentType,
            blobUrl: blobUrl,
            contentType: contentType,
            processedText: processedText
          };

          // Save to Azure
          if (!isAzureAvailable()) {
            throw new Error('Azure storage not available. Cannot save document securely.');
          }
          
          const document = await createDocument(documentData);
          
          // Log activity
          if (user) {
            await logDocumentUploaded(
              selectedPatient.medicalRecordNumber || selectedPatient.id,
              selectedPatient.name,
              user.id || user.email,
              user.name || user.email,
              document.rowKey || 'unknown'
            );
          }

          // Generate AI summary for Body Composition documents
          if (newDocument.documentType === 'Body Composition') {
            console.log('🏋️ Generating AI summary for body composition document...');
            try {
              await generateBodyCompositionSummary(selectedPatient, document, file);
            } catch (summaryError) {
              console.error('Failed to generate body composition summary:', summaryError);
              // Don't fail the upload if summary generation fails
            }
          }
        }
        
        // Refresh after all files uploaded
        await refreshActivities();
        await refreshDocumentsList();

        setNewDocument({ fileName: '', description: '', documentType: 'Other' });
        setShowAddDocument(false);
        displayNotification(`${filesToUpload.length} document(s) uploaded successfully!`);
      } catch (error) {
        console.error('Failed to add document:', error);
        displayNotification('Failed to add document. Please try again.', 'error');
      } finally {
        setIsUploadingDocument(false);
      }
    } else {
      displayNotification('Please select a patient and provide a file name or upload a file.', 'error');
    }
  };

  const generateAISummary = async (patient: Patient) => {
    setIsGeneratingSummary(true);
    setShowAISummary(true);
    setAiProgress(0);
    setAiStatus('Starting AI analysis...');
    setLastGeneratedPatient(patient); // Store the patient for later navigation

    try {
      const patientDocs = documentsList.filter(doc => doc.patientId === patient.medicalRecordNumber);
      const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

      // Process documents during AI summary generation
      
      const documentsWithContent = [];
      
      for (const doc of patientDocs) {
        try {
          // Create a File object from the blob URL for processing
          // Add SAS token to the blob URL for authentication
          const BLOB_SAS_TOKEN = '?se=2030-10-21T20%3A49%3A23Z&sp=rwdlacup&sv=2022-11-02&ss=b&srt=sco&sig=jU1EOpixz4skvqAyuWJt2ItEX1Qys4fmG/oyRIgvg9I%3D';
          let blobUrlWithSas = doc.blobUrl;
          
          // Ensure the blob URL has a SAS token
          if (!blobUrlWithSas.includes('?')) {
            blobUrlWithSas = `${blobUrlWithSas}${BLOB_SAS_TOKEN}`;
          }
          
          const response = await fetch(blobUrlWithSas);
          
          if (!response.ok) {
            console.error(`❌ Blob fetch failed: ${response.status} ${response.statusText}`);
            console.error(`❌ Blob URL: ${blobUrlWithSas}`);
            throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const file = new File([blob], doc.fileName, { type: doc.contentType });
          
          // Process the document now
          console.log(`🔄 Starting document processing for: ${doc.fileName}`);
          console.log('🔄 Using working OCR processing...');
          
          let processedText = '';
          
          try {
            // For PDFs, convert to images using PDF.js then OCR with Tesseract
            if (doc.contentType === 'application/pdf') {
              console.log('📄 Processing PDF - converting to images for OCR...');
              
              try {
                // Use PDF.js to render PDF pages as images
                const pdfjsLib = await import('pdfjs-dist');
                
                // Use the bundled worker from pdfjs-dist package
                const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
                pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;
                
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
                
                let allText = '';
                const { createWorker } = await import('tesseract.js');
                
                // Limit to first 3 pages for speed
                const pagesToProcess = Math.min(pdf.numPages, 3);
                
                // Process pages in parallel for much faster processing
                const pagePromises = [];
                for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
                  pagePromises.push(
                    (async (num) => {
                      console.log(`🔍 Starting page ${num}/${pagesToProcess}...`);
                      
                      const page = await pdf.getPage(num);
                      // Reduced scale from 2.0 to 1.5 for faster processing
                      const viewport = page.getViewport({ scale: 1.5 });
                      
                      // Create canvas
                      const canvas = document.createElement('canvas');
                      const context = canvas.getContext('2d')!;
                      canvas.width = viewport.width;
                      canvas.height = viewport.height;
                      
                      // Render PDF page to canvas
                      await page.render({ 
                        canvasContext: context, 
                        viewport: viewport,
                        canvas: canvas 
                      }).promise;
                      
                      // Convert canvas to blob
                      const blob = await new Promise<Blob>((resolve) => {
                        canvas.toBlob((blob) => resolve(blob!), 'image/png');
                      });
                      
                      // OCR the image with own worker per page
                      const worker = await createWorker('eng');
                      const { data: { text } } = await worker.recognize(blob);
                      await worker.terminate();
                      
                      console.log(`✅ Page ${num} completed (${text.length} chars)`);
                      return { pageNum: num, text };
                    })(pageNum)
                  );
                }
                
                // Update progress as pages complete
                let completed = 0;
                const results = await Promise.all(
                  pagePromises.map(p => p.then(result => {
                    completed++;
                    const progress = Math.round((completed / pagesToProcess) * 100);
                    setAiProgress(progress);
                    setAiStatus(`Processed ${completed} of ${pagesToProcess} pages...`);
                    return result;
                  }))
                );
                
                // Combine text in order
                results.sort((a, b) => a.pageNum - b.pageNum);
                allText = results.map(r => `\n--- Page ${r.pageNum} ---\n${r.text}\n`).join('');
                
                console.log('✅ PDF OCR completed successfully');
                console.log('📄 Total extracted text length:', allText.length);
                console.log('📄 Text preview:', allText.substring(0, 200) + '...');
                
                if (allText && allText.trim().length > 10) {
                  processedText = `PDF OCR EXTRACTED CONTENT:
File: ${doc.fileName}
Type: ${doc.contentType}
Size: ${(doc.fileSize / 1024).toFixed(1)} KB
Pages: ${pagesToProcess}
Uploaded: ${doc.uploadedAt}

EXTRACTED TEXT:
${allText}

Document Category: ${doc.fileName.toLowerCase().includes('cbc') ? 'CBC/Blood Count Report' : 
  doc.fileName.toLowerCase().includes('lab') ? 'Laboratory Report' : 
  doc.fileName.toLowerCase().includes('xray') ? 'X-Ray Report' : 
  doc.fileName.toLowerCase().includes('ct') ? 'CT Scan Report' : 
  doc.fileName.toLowerCase().includes('mri') ? 'MRI Report' : 
  'Medical Document'}

Processing Method: PDF.js + Tesseract OCR (Parallel)`;
                } else {
                  throw new Error('PDF OCR returned insufficient text');
                }
              } catch (pdfError) {
                console.error('❌ PDF OCR failed:', pdfError);
                throw new Error(`Failed to extract text from PDF ${doc.fileName}. OCR processing failed. The PDF may be encrypted, corrupted, or contain no readable text.`);
              }
            } else {
              // Use Tesseract.js for images - but with proper error handling
              console.log('🔍 Loading Tesseract.js for image OCR...');
              
              try {
                const { createWorker } = await import('tesseract.js');
                const worker = await createWorker('eng');
                console.log('✅ Tesseract worker created');
                
                console.log('🔍 Starting OCR processing...');
                const { data: { text } } = await worker.recognize(file);
                await worker.terminate();
                
                console.log('✅ OCR completed successfully');
                console.log('📄 OCR extracted text length:', text.length);
                console.log('📄 OCR text preview:', text.substring(0, 200) + '...');
                
                if (text && text.trim().length > 10) {
                  processedText = `OCR EXTRACTED CONTENT:
File: ${doc.fileName}
Type: ${doc.contentType}
Size: ${(doc.fileSize / 1024).toFixed(1)} KB
Uploaded: ${doc.uploadedAt}

EXTRACTED TEXT:
${text}

Document Category: ${doc.fileName.toLowerCase().includes('cbc') ? 'CBC/Blood Count Report' : 
  doc.fileName.toLowerCase().includes('lab') ? 'Laboratory Report' : 
  doc.fileName.toLowerCase().includes('xray') ? 'X-Ray Report' : 
  doc.fileName.toLowerCase().includes('ct') ? 'CT Scan Report' : 
  doc.fileName.toLowerCase().includes('mri') ? 'MRI Report' : 
  doc.fileName.toLowerCase().includes('screenshot') ? 'Screenshot/Image Report' :
  'Medical Document'}

Processing Method: Tesseract.js OCR (Working)`;
                } else {
                  throw new Error('OCR returned insufficient text');
                }
              } catch (tesseractError) {
                console.error('❌ Tesseract OCR failed:', tesseractError);
                throw new Error(`Failed to extract text from image ${doc.fileName}. OCR processing failed. Please upload a clearer image or a text-based PDF.`);
              }
            }
          } catch (ocrError) {
            console.error('❌ Document processing failed:', ocrError);
            throw new Error(`Failed to process ${doc.fileName}: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
          }

          console.log(`✅ Simple processing completed for: ${doc.fileName}`);
          console.log(`📄 Generated content length: ${processedText.length} characters`);
          
          documentsWithContent.push({
        fileName: doc.fileName,
        description: doc.description,
        uploadedAt: doc.uploadedAt,
        documentType: doc.documentType,
            processedText: processedText,
        fileSize: doc.fileSize || 0,
        contentType: doc.contentType || 'unknown'
          });
        } catch (docError) {
          console.error(`❌ Failed to process document ${doc.fileName}:`, docError);
          // NO FALLBACK - throw the error so user knows what went wrong
          throw docError;
        }
      }

      if (documentsWithContent.length === 0) {
        displayNotification('No documents found for this patient. Please upload documents first.', 'error');
        setIsGeneratingSummary(false);
        return;
      }

      // Debug: Log document content for troubleshooting
      console.log('🔍 AI Summary Debug - Patient documents from database:', patientDocs.map(doc => ({
        fileName: doc.fileName,
        patientId: doc.patientId,
        hasProcessedText: !!doc.processedText,
        processedTextLength: doc.processedText?.length || 0,
        processedTextPreview: doc.processedText?.substring(0, 200) + '...' || 'No text'
      })));
      
      console.log('🔍 AI Summary Debug - Documents with content:', documentsWithContent.map(doc => ({
        fileName: doc.fileName,
        hasProcessedText: !!doc.processedText,
        processedTextLength: doc.processedText?.length || 0,
        processedTextPreview: doc.processedText?.substring(0, 200) + '...' || 'No text'
      })));

      // Debug: Log what we're sending to AI
      console.log('🤖 AI Request Debug:', {
        patientName: patient.name,
        patientAge: age,
        medicalRecordNumber: patient.medicalRecordNumber,
        documentCount: documentsWithContent.length,
        documents: documentsWithContent.map(doc => ({
          fileName: doc.fileName,
          processedTextLength: doc.processedText?.length || 0,
          processedTextPreview: doc.processedText?.substring(0, 100) + '...' || 'No text',
          contentType: doc.contentType
        }))
      });

      const request = {
        patientName: patient.name,
        patientAge: age,
        medicalRecordNumber: patient.medicalRecordNumber,
        documents: documentsWithContent
      };

      console.log('🔍 About to call AI service. Request prepared:', {
        patientName: request.patientName,
        patientAge: request.patientAge,
        medicalRecordNumber: request.medicalRecordNumber,
        documentCount: request.documents.length
      });

      // Call the proper A4F API service
      console.log('🤖 Calling A4F API service...');
      
      let response;
      try {
        // Use the azureOpenAIService which is properly configured for A4F
        response = await generateMedicalSummary(request);
        console.log('✅ AI summary created successfully:', response);
      } catch (aiError) {
        console.error('❌ AI service failed:', aiError);
        // NO FALLBACK - throw the error
        throw aiError;
      }

      const summaryData = {
        patientId: patient.medicalRecordNumber,
        summaryText: response.summary,
        generatedBy: user?.email || 'system',
        documentIds: documentsWithContent.map(doc => doc.rowKey || doc.patientId).join(',')
      };

      // Debug: Log the summary data being stored
      console.log('🔍 AI Summary Data to Store:', {
        patientId: summaryData.patientId,
        summaryTextLength: summaryData.summaryText?.length || 0,
        summaryTextPreview: summaryData.summaryText?.substring(0, 200) + '...' || 'No text',
        generatedBy: summaryData.generatedBy
      });

      // Always save to Azure - no local storage for medical data
      if (!isAzureAvailable()) {
        throw new Error('Azure storage not available. Cannot save AI summary securely.');
      }
      
      const summary = await createAISummary(summaryData);
      setSummariesList([...summariesList, summary]);
      
      // Log activity
      if (user) {
        await logSummaryGenerated(
          patient.medicalRecordNumber || patient.id,
          patient.name,
          user.id || user.email,
          user.name || user.email,
          summary.rowKey || summary.id || 'unknown'
        );
        refreshActivities();
      }
    } catch (error) {
      console.error('AI Summary generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      displayNotification(`Failed to generate AI summary: ${errorMessage}`, 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Helper functions for modals
  const showConfirm = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const displayNotification = (message: string, type: 'success' | 'error' = 'success') => {
    // Create a beautiful notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 12px;
      color: white;
      font-weight: 500;
      font-size: ${type === 'error' ? '15px' : '14px'};
      line-height: 1.5;
      z-index: 10000;
      max-width: 450px;
      min-width: 300px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.25);
      animation: slideInBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      background: ${type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
      border: ${type === 'error' ? '2px solid rgba(255,255,255,0.3)' : 'none'};
      backdrop-filter: blur(10px);
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px; flex-shrink: 0; margin-top: -2px;">
          ${type === 'success' ? '✅' : '⚠️'}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${type === 'success' ? 'Success' : 'Error'}
          </div>
          <div style="font-size: 13px; opacity: 0.95;">
            ${message}
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0;
          flex-shrink: 0;
        ">×</button>
      </div>
    `;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideInBounce {
          0% { transform: translateX(120%) scale(0.8); opacity: 0; }
          50% { transform: translateX(-10px) scale(1.02); }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0) scale(1); opacity: 1; }
          to { transform: translateX(120%) scale(0.8); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after longer duration for errors
    const duration = type === 'error' ? 7000 : 4000;
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.4s ease-in forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, duration);
    
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };



  const logout = () => {
    setUser(null);
    setCurrentView('dashboard');
    setSelectedPatient(null);
    // Clear user session from local storage
    localStorage.removeItem('currentUser');
    console.log('User logged out and session cleared');
  };

  // Debounce search term - reduced for faster response
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150); // Reduced from 300ms to 150ms for faster search
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Smart search - check if search term looks like a file number first
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [hasSearchedAll, setHasSearchedAll] = useState(false);
  
  useEffect(() => {
    // CLIENT-SIDE ONLY search - no database queries!
    if (!debouncedSearchTerm.trim()) {
      setFilteredPatients(allPatients);
      setIsSearching(false);
      setHasSearchedAll(false);
      return;
    }
    
    setIsSearching(true);
    
    // Search through already loaded patients (fast, client-side only)
    const searchLower = debouncedSearchTerm.toLowerCase();
    const results = allPatients.filter(patient => {
      const name = (patient.name || '').toLowerCase();
      const mrn = (patient.medicalRecordNumber || '').toLowerCase();
      const email = (patient.email || '').toLowerCase();
      const phone = patient.phone || '';
      
      return name.includes(searchLower) ||
             mrn.includes(searchLower) ||
             email.includes(searchLower) ||
             phone.includes(debouncedSearchTerm);
    });
    
    setFilteredPatients(results);
    setIsSearching(false);
  }, [debouncedSearchTerm, allPatients, hasSearchedAll]);

  // Sort patients by file number (numerically) - CRITICAL FIX
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    // Extract numeric part from file numbers like "File 123"
    const getFileNumber = (mrn: string) => {
      if (!mrn) return 999999; // Put empty file numbers at the end
      const match = mrn.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 999999;
    };
    
    const aNum = getFileNumber(a.medicalRecordNumber);
    const bNum = getFileNumber(b.medicalRecordNumber);
    
    // Ensure proper numeric sorting
    if (aNum === bNum) {
      // If numbers are same, sort by name
      return (a.name || '').localeCompare(b.name || '');
    }
    
    return aNum - bNum; // Sort ascending (File 1, File 2, File 3...)
  });

  // Debug logging removed for production

  // Pagination logic
  const totalPages = Math.ceil(sortedPatients.length / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const endIndex = startIndex + patientsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);


  // Delete functions
  const deletePatient = async (patientId: string) => {
    showConfirm('Are you sure you want to delete this patient? This will also delete all their documents and summaries.', async () => {
      try {
        // Find the patient before deleting for logging
        const patientToDelete = allPatients.find(p => p.id === patientId);
        
        // Delete patient using Azure REST API service
        const success = await deletePatientFromAzure(patientId);
        
        if (success) {
          // Remove from local state
          const updatedPatients = allPatients.filter(p => p.id !== patientId);
          setAllPatients(updatedPatients);
          setPatientsList(updatedPatients);
          setTotalPatientCount(totalPatientCount - 1); // Update total count
          
          // Clear search and update filtered patients
          setSearchTerm('');
          setDebouncedSearchTerm('');
          setFilteredPatients(updatedPatients);
          
          // Remove related documents and summaries
          const updatedDocuments = documentsList.filter(d => d.patientId !== patientId);
          const updatedSummaries = summariesList.filter(s => s.patientId !== patientId);
          setDocumentsList(updatedDocuments);
          setSummariesList(updatedSummaries);
          
          // Log activity
          if (user && patientToDelete) {
            await logPatientDeleted(
              patientToDelete.medicalRecordNumber || patientToDelete.id,
              patientToDelete.name,
              user.id || user.email,
              user.name || user.email
            );
            refreshActivities();
          }
          
          displayNotification('Patient deleted successfully!');
        } else {
          displayNotification('Failed to delete patient from storage. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Failed to delete patient:', error);
        displayNotification('Failed to delete patient. Please try again.', 'error');
      }
    });
  };

  const deleteDocument = async (documentId: string) => {
    showConfirm('Are you sure you want to delete this document?', async () => {
      try {
        // Find the document to get its partition key and row key
        // Documents use rowKey as their unique identifier, not id
        const document = documentsList.find(d => d.rowKey === documentId);
        if (!document) {
          displayNotification('Document not found.', 'error');
          return;
        }

        // Find the patient for logging
        const patient = allPatients.find(p => p.medicalRecordNumber === document.patientId || p.id === document.patientId);

        // Delete from Azure Table Storage with patient guard
        const success = await deleteDocumentFromTable(
          document.partitionKey,
          document.rowKey
        );
        
        if (success) {
          const updatedDocuments = documentsList.filter(d => d.rowKey !== documentId);
          setDocumentsList(updatedDocuments);
          
          // Log activity
          if (user && patient) {
            await logDocumentDeleted(
              patient.medicalRecordNumber || patient.id,
              patient.name,
              user.id || user.email,
              user.name || user.email,
              document.rowKey || documentId,
              document.fileName || 'Unknown Document'
            );
            refreshActivities();
          }
          
          displayNotification('Document deleted successfully!');
        } else {
          displayNotification('Failed to delete document from storage. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Failed to delete document:', error);
        displayNotification('Failed to delete document. Please try again.', 'error');
      }
    });
  };

  const handleWhatsAppClick = (document: any) => {
    console.log('📱 WhatsApp click for document:', document.fileName);
    setSelectedDocumentForWhatsApp(document);
    
    if (!selectedPatient) return;
    
    // Pre-populate phone numbers from selected patient
    const phoneNumbers = [
      selectedPatient.whatsappPhone,
      selectedPatient.mobilePhone,
      selectedPatient.phone
    ].filter(Boolean);
    
    setWhatsappPhone(phoneNumbers[0] || '');
    
    // Default message
    setWhatsappMessage(
      `Hello ${selectedPatient.name},

Please find your medical document attached: ${document.fileName}

From ${user?.name || 'your medical practice'}`
    );
    
    setShowWhatsAppModal(true);
  };

  const sendViaWhatsApp = () => {
    if (!whatsappPhone) {
      alert('Please select a phone number');
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = whatsappPhone.replace(/[^\d+]/g, '');
    
    // Encode message
    const encodedMessage = encodeURIComponent(whatsappMessage);
    
    // WhatsApp Web URL with message and optionally document link
    let whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Add document link if there is one
    if (selectedDocumentForWhatsApp) {
      const encodedUrl = encodeURIComponent(selectedDocumentForWhatsApp.blobUrl);
      whatsappUrl += `%0A%0ADocument:%20${encodedUrl}`;
    }
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Close modal
    setShowWhatsAppModal(false);
    setSelectedDocumentForWhatsApp(null);
  };

  const deleteSummary = async (summaryRowKey: string) => {
    showConfirm('Are you sure you want to delete this AI summary?', async () => {
      try {
        // Find the summary to get the correct partition key
        const summaryToDelete = summariesList.find(s => s.rowKey === summaryRowKey);
        if (!summaryToDelete) {
          displayNotification('Summary not found.', 'error');
          return;
        }
        
        // Find the patient for logging
        const patient = allPatients.find(p => p.medicalRecordNumber === summaryToDelete.patientId || p.id === summaryToDelete.patientId);
        
        // Delete from Azure Table Storage using the correct partition key
        const { deleteAISummary } = await import('./services/azureTableRestService');
        const success = await deleteAISummary(summaryToDelete.partitionKey, summaryRowKey);
        
        if (success) {
          // Update local state
          const updatedSummaries = summariesList.filter(s => s.rowKey !== summaryRowKey);
          setSummariesList(updatedSummaries);
          
          // Log activity
          if (user && patient) {
            await logSummaryDeleted(
              patient.medicalRecordNumber || patient.id,
              patient.name,
              user.id || user.email,
              user.name || user.email,
              summaryRowKey
            );
            refreshActivities();
          }
          
          displayNotification('AI Summary deleted successfully!');
        } else {
          displayNotification('Failed to delete summary from Azure. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Failed to delete summary:', error);
        displayNotification('Failed to delete summary. Please try again.', 'error');
      }
    });
  };


  // CSV Import functionality
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const importPatientsFromCSV = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      console.log('CSV Headers:', headers);
      
      const importedPatients: Patient[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length < 2) continue; // Skip empty lines
        
        // Map CSV columns to patient fields
        const patient: Patient = {
          id: Date.now().toString() + i,
          name: values[0] || 'Unknown',
          medicalRecordNumber: values[1] ? `File ${values[1].padStart(3, '0')}` : `File ${(i + 1).toString().padStart(3, '0')}`,
          email: values[2] || '',
          phone: values[3] || '',
          dateOfBirth: values[4] || '',
          insuranceProvider: values[5] || '',
          emergencyContact: values[6] || '',
          emergencyPhone: values[7] || '',
          medicalHistory: values[9] || '',
          allergies: values[10] || '',
          currentMedications: values[11] || '',
          uploadedAt: new Date().toISOString()
        };
        
        importedPatients.push(patient);
      }
      
      // Save each patient to Azure Table Storage first
      const successfullyImportedPatients: Patient[] = [];
      
      for (const patient of importedPatients) {
        try {
          console.log('Saving patient to Azure:', patient.name);
          const savedPatient = await createPatient({
            name: patient.name,
            email: patient.email,
            phone: patient.phone,
            dateOfBirth: patient.dateOfBirth,
            medicalRecordNumber: patient.medicalRecordNumber,
            emergencyContact: patient.emergencyContact,
            insuranceProvider: patient.insuranceProvider,
            medicalAidNumber: patient.medicalAidNumber || '',
            dependentCode: patient.dependentCode || '',
            allergies: patient.allergies || '',
            chronicConditions: patient.chronicConditions || ''
          });
          
          if (savedPatient) {
            successfullyImportedPatients.push(savedPatient);
            console.log('✅ Patient saved to Azure:', savedPatient.name);
          }
        } catch (error) {
          console.error('❌ Failed to save patient to Azure:', patient.name, error);
        }
      }
      
      // Update local state with successfully imported patients
      const updatedPatients = [...allPatients, ...successfullyImportedPatients];
      setAllPatients(updatedPatients);
      setPatientsList(updatedPatients);
      setTotalPatientCount(totalPatientCount + successfullyImportedPatients.length); // Update total count
      
      // Clear search and update filtered patients to show all including imported ones
      setSearchTerm('');
      setDebouncedSearchTerm('');
      setFilteredPatients(updatedPatients);
      
      setShowImportModal(false);
      setImportFile(null);
      console.log(`✅ Successfully imported ${successfullyImportedPatients.length} patients to Azure Table Storage`);
      
      if (successfullyImportedPatients.length === 0) {
        displayNotification('No patients were imported. Please create the Patients table in Azure portal first.', 'error');
      } else if (successfullyImportedPatients.length < importedPatients.length) {
        displayNotification(`Imported ${successfullyImportedPatients.length} of ${importedPatients.length} patients. Some failed due to table issues.`, 'error');
      } else {
        displayNotification(`Successfully imported ${successfullyImportedPatients.length} patients!`);
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      displayNotification('Failed to import patients. Please check the CSV format.', 'error');
    }
  };

  if (!user) {
    return <Auth onLogin={async (userData) => {
      try {
        // Try to load user profile from Azure first
        let finalUserData = userData;
        
        try {
          // Loading user profile
          const azureUser = await getUserByEmail(userData.email);
          
          if (azureUser) {
            // Use Azure profile data
            finalUserData = {
              ...userData,
              name: azureUser.name,
              role: azureUser.role
            };
            console.log('✅ Restored profile from Azure:', azureUser);
          } else {
            console.log('No Azure profile found, using login data');
          }
        } catch (error) {
          console.error('Failed to load from Azure, using login data:', error);
        }
        
        // Save user to local storage
        const userToSave = {
          id: Date.now().toString(),
          name: finalUserData.name,
          email: finalUserData.email,
          role: finalUserData.role,
          practiceName: 'Medical Practice',
          licenseNumber: 'MD123456',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        setLocalData('currentUser', userToSave);
        console.log('User saved to local storage:', userToSave);
        setUser(finalUserData);
        
        // Reload data after login
        try {
          if (isAzureAvailable()) {
            // Azure is available, loading from Azure
            // Load from Azure REST API (optimized for speed)
            const [patients, documents, summaries] = await Promise.all([
              getPatientsOptimized(), // Use optimized version for faster loading
              getAllDocuments(),
              getAISummaries()
            ]);
            // Data loaded after login
            setAllPatients(patients);
            setPatientsList(patients);
            setDocumentsList(documents);
            setSummariesList(summaries);
          } else {
            // Load from local storage
            let patients = getLocalData('patients') || [];
            let documents = getLocalData('documents') || [];
            let summaries = getLocalData('summaries') || [];
            
            // If no data exists, create some sample data
            if (patients.length === 0) {
              const samplePatients = [
              {
                id: '1',
                name: 'Evelyn Monene',
                email: 'evelyn@example.com',
                phone: '27798466669',
                dateOfBirth: '1980-01-15',
                medicalRecordNumber: 'File 001',
                emergencyContact: 'John Monene',
                insuranceProvider: 'Discovery Health',
                medicalHistory: 'None',
                allergies: 'None',
                currentMedications: 'None',
                medicalAidNumber: '',
                dependentCode: '',
                chronicConditions: '',
                createdAt: new Date().toISOString()
              },
                {
                  id: '2',
                  name: 'Tafara Mwanyangadza',
                  email: 'tafara@example.com',
                  phone: '27738927809',
                  dateOfBirth: '1985-03-15',
                  medicalRecordNumber: 'File 002',
                  emergencyContact: 'Jane Mwanyangadza',
                  insuranceProvider: 'Discovery Health',
                  medicalHistory: 'Hypertension, Diabetes',
                  allergies: 'Penicillin',
                  currentMedications: 'Metformin, Lisinopril',
                  medicalAidNumber: '',
                  dependentCode: '',
                  chronicConditions: '',
                  createdAt: new Date().toISOString()
                },
                {
                  id: '3',
                  name: 'Christian Mbanga',
                  email: 'christian@example.com',
                  phone: '27768665410',
                  dateOfBirth: '1990-07-22',
                  medicalRecordNumber: 'File 003',
                  emergencyContact: 'Mary Mbanga',
                  insuranceProvider: 'Bonitas',
                  medicalHistory: 'Asthma',
                  allergies: 'None',
                  currentMedications: 'Ventolin',
                  medicalAidNumber: '',
                  dependentCode: '',
                  chronicConditions: '',
                  createdAt: new Date().toISOString()
                }
              ];
              setPatientsList(samplePatients);
              // Data saved to Azure cloud storage
            } else {
              setPatientsList(patients);
            }
            
            setDocumentsList(documents);
            setSummariesList(summaries);
          }
        } catch (dataError) {
          console.error('Failed to load data after login:', dataError);
          // Fallback to local storage
          setPatientsList(getLocalData('patients') || []);
          setDocumentsList(getLocalData('documents') || []);
          setSummariesList(getLocalData('summaries') || []);
        }
      } catch (error) {
        console.error('Login failed:', error);
        // Still set user for demo purposes
        setUser(userData);
        
        // Try to load data anyway
        try {
          setPatientsList(getLocalData('patients') || []);
          setDocumentsList(getLocalData('documents') || []);
          setSummariesList(getLocalData('summaries') || []);
        } catch (dataError) {
          console.error('Failed to load data:', dataError);
        }
      }
    }} />;
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading medical practice system...</p>
        <div className="loading-progress">
          <div className="progress-bar" style={{ width: `${loadingProgress}%` }}></div>
          <span className="progress-text">{loadingProgress}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        onSymptomCheckerClick={() => window.location.href = '/symptom-checker'}
        user={user}
        onEditProfile={editProfile}
        onLogout={logout}
      />
      
      <div className="app-content">

      <main className="app-main">
        {currentView === 'dashboard' && (
          <div className="dashboard">
            <div className="welcome-section">
              <h2>Welcome back, {user.name}</h2>
              <p>Here's your practice overview for today</p>
            </div>


            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <h3>Total Patients</h3>
                  <div className="stat-number">{totalPatientCount.toLocaleString()}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <h3>Documents</h3>
                  <div className="stat-number">{documentsList.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <h3>AI Summaries</h3>
                  <div className="stat-number">{summariesList.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content">
                  <h3>Storage Used</h3>
                  <div className="stat-number">
                    {Math.round(documentsList.reduce((acc, doc) => acc + doc.fileSize, 0) / 1024 / 1024)} MB
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Style Doughnut Charts for Last 30 Days */}
            <div className="kpi-charts">
              <div className="chart-container chart-documents">
                <div className="chart-header">
                  <h3>Documents Added</h3>
                  <span className="chart-period">Last 30 days</span>
                </div>
                <div className="doughnut-chart">
                  <div className="chart-circle">
                    <div className="chart-progress" style={{ '--progress': `${Math.min((kpiData.documentsLast30Days / 100) * 100, 100)}%` }}>
                      <div className="chart-inner">
                        <div className="chart-number">{kpiData.documentsLast30Days}</div>
                        <div className="chart-label">Documents</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-container chart-patients">
                <div className="chart-header">
                  <h3>New Patients</h3>
                  <span className="chart-period">Last 30 days</span>
                </div>
                <div className="doughnut-chart">
                  <div className="chart-circle">
                    <div className="chart-progress" style={{ '--progress': `${Math.min((kpiData.patientsLast30Days / 50) * 100, 100)}%` }}>
                      <div className="chart-inner">
                        <div className="chart-number">{kpiData.patientsLast30Days}</div>
                        <div className="chart-label">Patients</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-container chart-prescriptions">
                <div className="chart-header">
                  <h3>Prescriptions Sent</h3>
                  <span className="chart-period">Last 30 days</span>
                </div>
                <div className="doughnut-chart">
                  <div className="chart-circle">
                    <div className="chart-progress" style={{ '--progress': `${Math.min((kpiData.prescriptionsLast30Days / 30) * 100, 100)}%` }}>
                      <div className="chart-inner">
                        <div className="chart-number">{kpiData.prescriptionsLast30Days}</div>
                        <div className="chart-label">Prescriptions</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div 
                        className="activity-icon" 
                        style={{ color: getActivityColor(activity.type) }}
                      >
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="activity-content">
                        <span className="activity-text">{activity.description}</span>
                        <span className="activity-time">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback to patient data if no activities
                  patientsList.slice(0, 3).map(patient => (
                    <div key={patient.id} className="activity-item">
                      <div className="activity-icon">👤</div>
                      <div className="activity-content">
                        <span className="activity-text">Patient {patient.name} added</span>
                        <span className="activity-time">{new Date(patient.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {currentView === 'patients' && (
          <div className="patients-simple">
            {/* Simple Header */}
            <div className="patients-header">
              <h2>👥 Patient Management</h2>
              <div className="header-actions">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search patients by name, ID, email or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <span className="search-icon">
                    {isSearching ? '⏳' : '🔍'}
                  </span>
                </div>
                <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                  📁 Import CSV
                </button>
                <button className="btn btn-primary" onClick={() => setShowAddPatient(true)}>
                  ➕ Add Patient
                </button>
              </div>
            </div>

            {/* Progressive Loading Banner */}
            {!isLoading && isLoadingMorePatients && !searchTerm && (
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
              }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTop: '3px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <div style={{ flex: 1 }}>
                  <strong>Loading all patients in background...</strong> You can browse the first {allPatients.length.toLocaleString()} patients now. Full list ({totalPatientCount.toLocaleString()} patients) will appear shortly with proper File 1, 2, 3... sorting.
                </div>
              </div>
            )}
            
            {/* All Patients Loaded Success Banner */}
            {!isLoading && !isLoadingMorePatients && allPatients.length === totalPatientCount && !searchTerm && (
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
              }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <div style={{ flex: 1 }}>
                  <strong>All {totalPatientCount.toLocaleString()} patients loaded!</strong> Sorted in proper numeric order: File 1, File 2, File 3, File 4...
                </div>
              </div>
            )}

            {/* Simple Patient List */}
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading patients...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="no-patients">
                <p>
                  No patients found. {searchTerm ? 'Try a different search term.' : 'Add your first patient to get started.'}
                  {isSearching && searchTerm && (
                    <span style={{ color: '#666', fontSize: '0.9em' }}>
                      <br />Searching through all {totalPatientCount} patients...
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="patients-list">
                  {paginatedPatients.map(patient => (
                    <div key={patient.id} className="patient-list-item">
                      <div className="patient-list-info">
                        <div className="patient-name-section">
                          <h3>{patient.name}</h3>
                          <span className="patient-mrn">File: {patient.medicalRecordNumber}</span>
                        </div>
                        <div className="patient-contact-info">
                          <p><i className="fas fa-envelope"></i> {patient.email}</p>
                          <p><i className="fas fa-phone"></i> {patient.phone}</p>
                          {patient.dateOfBirth && <p><i className="fas fa-birthday-cake"></i> {new Date(patient.dateOfBirth).toLocaleDateString('en-ZA')}</p>}
                          {patient.insuranceProvider && <p><i className="fas fa-hospital"></i> {patient.insuranceProvider}</p>}
                          {patient.medicalAidNumber && <p><i className="fas fa-id-card"></i> Medical Aid: {patient.medicalAidNumber}</p>}
                          {patient.dependentCode && <p><i className="fas fa-users"></i> Dependent: {patient.dependentCode}</p>}
                        </div>
                      </div>
                      <div className="patient-list-actions">
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={async () => {
                            setSelectedPatient(patient);
                            setShowPatientDetails(true);
                            // Refresh documents list when opening patient details
                            await refreshDocumentsList();
                          }}
                        >
                          <i className="fas fa-eye"></i> Details
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => editPatient(patient)}
                          title="Edit Patient"
                        >
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-ai"
                          onClick={() => {
                            const patientSummaries = summariesList.filter(s => s.patientId === patient.medicalRecordNumber);
                            if (patientSummaries.length > 0) {
                              setSelectedSummary(patientSummaries[0]);
                              setShowSummaryModal(true);
                            } else {
                              generateAISummary(patient);
                            }
                          }}
                        >
                          <i className="fas fa-robot"></i> {summariesList.filter(s => s.patientId === patient.medicalRecordNumber).length > 0 ? 'Summary' : 'Generate'}
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => deletePatient(patient.id)}
                          title="Delete Patient"
                        >
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                
                <div className="pagination-info">
                  Page {currentPage} of {totalPages} 
                  <span className="pagination-count">
                    ({filteredPatients.length} patients)
                  </span>
                </div>
                
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}


            {/* Simple Patient Details Modal */}
            {showPatientDetails && selectedPatient && (
              <div className="patient-details-modal">
                <div className="modal-content-large">
                  <div className="modal-header">
                    <h2>{selectedPatient.name} - Patient Details</h2>
                    <button 
                      className="close-btn"
                      onClick={() => {
                        setShowPatientDetails(false);
                        setSelectedPatient(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="patient-details-content">
                    <div className="patient-basic-info">
                      <h3>Basic Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>Full Name:</label>
                          <span>{selectedPatient.name}</span>
                        </div>
                        <div className="info-item">
                          <label>Medical Record #:</label>
                          <span>{selectedPatient.medicalRecordNumber}</span>
                        </div>
                        <div className="info-item">
                          <label>Email:</label>
                          <span>{selectedPatient.email || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Phone:</label>
                          <span>{selectedPatient.phone}</span>
                        </div>
                        <div className="info-item">
                          <label>Mobile Phone:</label>
                          <span>{selectedPatient.mobilePhone || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>WhatsApp Phone:</label>
                          <span>{selectedPatient.whatsappPhone || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Passport/ID Number:</label>
                          <span>{selectedPatient.passportId || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Gender:</label>
                          <span>{selectedPatient.gender || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Date of Birth:</label>
                          <span>{new Date(selectedPatient.dateOfBirth).toLocaleDateString('en-ZA')}</span>
                        </div>
                        <div className="info-item">
                          <label>Age:</label>
                          <span>{new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()} years</span>
                        </div>
                        <div className="info-item">
                          <label>Status:</label>
                          <span className={selectedPatient.status === 'Deceased' ? 'deceased-badge' : selectedPatient.status === 'Living' ? 'living-badge' : 'unknown-badge'}>
                            {selectedPatient.status || 'Unknown'}
                            {selectedPatient.status === 'Deceased' && selectedPatient.deceasedDate && (
                              <span className="deceased-date"> ({new Date(selectedPatient.deceasedDate).toLocaleDateString('en-ZA')})</span>
                            )}
                          </span>
                        </div>
                        <div className="info-item">
                          <label>Emergency Contact:</label>
                          <span>{selectedPatient.emergencyContact}</span>
                        </div>
                        <div className="info-item">
                          <label>Medical Aid Scheme:</label>
                          <span>{selectedPatient.insuranceProvider || 'Not specified'}</span>
                        </div>
                        {selectedPatient.medicalAidNumber && (
                          <div className="info-item">
                            <label>Medical Aid Number:</label>
                            <span>{selectedPatient.medicalAidNumber}</span>
                          </div>
                        )}
                        {selectedPatient.dependentCode && (
                          <div className="info-item">
                            <label>Dependent Code:</label>
                            <span>{selectedPatient.dependentCode}</span>
                          </div>
                        )}
                        {selectedPatient.allergies && (
                          <div className="info-item">
                            <label>Allergies:</label>
                            <span>{selectedPatient.allergies}</span>
                          </div>
                        )}
                        {selectedPatient.chronicConditions && (
                          <div className="info-item">
                            <label>Chronic Conditions:</label>
                            <span>{selectedPatient.chronicConditions}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div className="patient-basic-info">
                      <h3>Address Information</h3>
                      <div className="info-grid">
                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                          <label>Home/Unit Number or Estate:</label>
                          <span>{selectedPatient.homeNumber || 'Not specified'}</span>
                        </div>
                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                          <label>Street Address:</label>
                          <span>{selectedPatient.streetAddress || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Suburb:</label>
                          <span>{selectedPatient.suburb || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>City:</label>
                          <span>{selectedPatient.city || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Province:</label>
                          <span>{selectedPatient.province || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Postal Code:</label>
                          <span>{selectedPatient.postalCode || 'Not specified'}</span>
                        </div>
                        <div className="info-item">
                          <label>Country:</label>
                          <span>{selectedPatient.country || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="patient-documents-section">
                      <div className="section-header">
                        <h3>📄 Medical Documents ({documentsList.filter(doc => doc.patientId === selectedPatient.medicalRecordNumber).length})</h3>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => setShowAddDocument(true)}
                        >
                          📤 Add Document
                        </button>
                      </div>
                      
                      <div className="documents-grid">
                        {documentsList
                          .filter(doc => doc.patientId === selectedPatient.medicalRecordNumber)
                          .map(document => (
                            <div key={document.rowKey} className="document-item">
                              <div className="document-icon">
                                {document.documentType === 'Lab Results' ? '🧪' :
                                 document.documentType === 'Imaging' ? '📷' :
                                 document.documentType === 'Pathology' ? '🔬' :
                                 document.documentType === 'Consultation' ? '📝' :
                                 document.documentType === 'Prescription' ? '💊' :
                                 document.documentType === 'Invoice' ? '📋' : '📄'}
                              </div>
                              <div className="document-details">
                                <h4>{document.fileName}</h4>
                                <p>{document.description}</p>
                                <span className="document-type">{document.documentType}</span>
                                <span className="document-date">{new Date(document.uploadedAt).toLocaleDateString('en-ZA')}</span>
                              </div>
                              <div className="document-actions">
                                <button 
                                  className="document-view-btn"
                                  onClick={() => {
                                    console.log('📄 Viewing document:', document.fileName);
                                    console.log('🔗 Blob URL:', document.blobUrl);
                                    
                                    if (document.blobUrl) {
                                      console.log('🚀 Opening document...');
                                      const newWindow = window.open(document.blobUrl, '_blank', 'noopener,noreferrer');
                                      
                                      if (!newWindow) {
                                        alert('Pop-up blocked! Please allow pop-ups for this site.');
                                      } else {
                                        console.log('✅ Document opened successfully');
                                      }
                                    } else {
                                      alert('Document URL not available');
                                    }
                                  }}
                                  title="View Document"
                                >
                                  👁️
                                </button>
                                <button 
                                  className="document-whatsapp-btn"
                                  onClick={() => handleWhatsAppClick(document)}
                                  title="Send via WhatsApp"
                                  style={{
                                    background: '#25D366',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    transition: 'all 0.2s ease',
                                    padding: '6px'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#128C7E'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="white"/>
                                  </svg>
                                </button>
                                <button 
                                  className="document-delete-btn"
                                  onClick={() => deleteDocument(document.rowKey)}
                                  title="Delete Document"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="patient-summaries-section">
                      <div className="section-header">
                        <h3>🤖 AI Medical Summaries ({summariesList.filter(summary => summary.patientId === selectedPatient.medicalRecordNumber).length})</h3>
                        <button 
                          className="btn btn-ai btn-sm"
                          onClick={() => generateAISummary(selectedPatient)}
                        >
                          🤖 Generate New Summary
                        </button>
                      </div>
                      
                      <div className="summaries-grid">
                        {summariesList
                          .filter(summary => summary.patientId === selectedPatient.medicalRecordNumber)
                          .map(summary => {
                            // Debug: Log each summary being displayed
                            console.log('🔍 Displaying Summary:', {
                              rowKey: summary.rowKey,
                              patientId: summary.patientId,
                              hasSummaryText: !!summary.summaryText,
                              summaryTextLength: summary.summaryText?.length || 0,
                              summaryTextPreview: summary.summaryText?.substring(0, 100) + '...' || 'No text',
                              hasSummary: !!summary.summary,
                              summaryLength: summary.summary?.length || 0
                            });
                            
                            return (
                            <div key={summary.rowKey} className="summary-item">
                              <div className="summary-header">
                                <h4>AI Summary - {summary.createdAt ? new Date(summary.createdAt).toLocaleDateString('en-ZA') : 'Unknown Date'}</h4>
                                <div className="summary-header-actions">
                                  <button 
                                    className="btn btn-success btn-sm"
                                    onClick={() => {
                                      setWhatsappPhone(selectedPatient.whatsappPhone || selectedPatient.mobilePhone || selectedPatient.phone || '');
                                      setWhatsappMessage(summary.summaryText || summary.summary);
                                      setIsCustomWhatsAppNumber(false);
                                      setShowWhatsAppModal(true);
                                    }}
                                    style={{ background: '#25D366', color: 'white', marginRight: '8px' }}
                                    title="Send via WhatsApp"
                                  >
                                    📱
                                  </button>
                                  <button 
                                      className="summary-delete-btn"
                                    onClick={() => deleteSummary(summary.rowKey)}
                                    title="Delete Summary"
                                  >
                                      ×
                                  </button>
                                </div>
                              </div>
                              <div className="summary-content">
                                <pre>{summary.summaryText || summary.summary || 'No summary available'}</pre>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showAddPatient && (
              <div className="modal">
                <div className="modal-content">
                  <h3>Add New Patient</h3>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                      placeholder="Dr. John Smith"
                    />
                  </div>
                  <div className="form-group">
                    <label>Medical Record Number (File Number)</label>
                    <input 
                      type="text" 
                      value={newPatient.medicalRecordNumber}
                      onChange={(e) => setNewPatient({...newPatient, medicalRecordNumber: e.target.value})}
                      placeholder="File 123 (or leave empty to auto-generate)"
                    />
                    <small style={{ color: '#666', fontSize: '0.85em' }}>Leave empty to auto-generate next file number</small>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                        placeholder="patient@email.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input 
                        type="tel" 
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Mobile Phone</label>
                      <input 
                        type="tel" 
                        value={newPatient.mobilePhone}
                        onChange={(e) => setNewPatient({...newPatient, mobilePhone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="form-group">
                      <label>WhatsApp Phone</label>
                      <input 
                        type="tel" 
                        value={newPatient.whatsappPhone}
                        onChange={(e) => setNewPatient({...newPatient, whatsappPhone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Passport/ID Number</label>
                      <input 
                        type="text" 
                        value={newPatient.passportId}
                        onChange={(e) => setNewPatient({...newPatient, passportId: e.target.value})}
                        placeholder="A123456789"
                      />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select 
                        value={newPatient.gender}
                        onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Race/Ethnicity</label>
                      <select 
                        value={newPatient.race || ''}
                        onChange={(e) => setNewPatient({...newPatient, race: e.target.value})}
                      >
                        <option value="">Select Race/Ethnicity</option>
                        <option value="Black African">Black African</option>
                        <option value="Coloured">Coloured</option>
                        <option value="Indian/Asian">Indian/Asian</option>
                        <option value="White">White</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Date of Birth 📅</label>
                    <DateOfBirthPicker
                      value={newPatient.dateOfBirth}
                      onChange={(date) => setNewPatient({...newPatient, dateOfBirth: date})}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Emergency Contact Name</label>
                      <input 
                        type="text" 
                        value={newPatient.emergencyContactName || ''}
                        onChange={(e) => setNewPatient({...newPatient, emergencyContactName: e.target.value})}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="form-group">
                      <label>Emergency Contact Phone</label>
                      <input 
                        type="tel" 
                        value={newPatient.emergencyContactPhone || ''}
                        onChange={(e) => setNewPatient({...newPatient, emergencyContactPhone: e.target.value})}
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                  <div className="form-group">
                    <label>Medical Aid Scheme</label>
                    <select 
                      value={newPatient.insuranceProvider}
                      onChange={(e) => setNewPatient({...newPatient, insuranceProvider: e.target.value})}
                    >
                      <option value="">Select Medical Aid Scheme</option>
                      <option value="Discovery Health">Discovery Health</option>
                      <option value="Bonitas">Bonitas</option>
                      <option value="Momentum Health">Momentum Health</option>
                      <option value="Medihelp">Medihelp</option>
                      <option value="Fedhealth">Fedhealth</option>
                      <option value="GEMS">GEMS (Government Employees Medical Scheme)</option>
                      <option value="Bestmed">Bestmed</option>
                      <option value="Profmed">Profmed</option>
                      <option value="Self-pay">Self-pay (No Medical Aid)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  </div>

                  {/* Other Medical Aid Field */}
                  {newPatient.insuranceProvider === 'Other' && (
                    <div className="form-group">
                      <label>Specify Medical Aid Scheme</label>
                      <input 
                        type="text" 
                        value={newPatient.customInsuranceProvider}
                        onChange={(e) => setNewPatient({...newPatient, customInsuranceProvider: e.target.value})}
                        placeholder="Enter medical aid scheme name"
                      />
                    </div>
                  )}

                  {/* Medical Aid Number and Dependent Code */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Medical Aid Number</label>
                      <input 
                        type="text" 
                        value={newPatient.medicalAidNumber}
                        onChange={(e) => setNewPatient({...newPatient, medicalAidNumber: e.target.value})}
                        placeholder="Medical aid membership number"
                      />
                    </div>
                    <div className="form-group">
                      <label>Dependent Code</label>
                      <input 
                        type="text" 
                        value={newPatient.dependentCode}
                        onChange={(e) => setNewPatient({...newPatient, dependentCode: e.target.value})}
                        placeholder="Dependent code (if applicable)"
                      />
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="form-group">
                    <label>Allergies</label>
                    <textarea 
                      value={newPatient.allergies}
                      onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})}
                      placeholder="List any known allergies (e.g., Penicillin, Shellfish, Latex)"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label>Current Medications</label>
                    <textarea 
                      value={newPatient.currentMedications || ''}
                      onChange={(e) => setNewPatient({...newPatient, currentMedications: e.target.value})}
                      placeholder="List current medications and dosages (e.g., Metformin 500mg twice daily, Lisinopril 10mg once daily)"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label>Diagnosed Chronic Conditions</label>
                    <select
                      multiple
                      value={newPatient.chronicConditions ? newPatient.chronicConditions.split(',').map(c => c.trim()).filter(Boolean) : []}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                        setNewPatient({...newPatient, chronicConditions: selectedOptions.join(', ')});
                      }}
                      style={{
                        minHeight: '120px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#000'
                      }}
                    >
                      <option value="Diabetes Type 1" style={{ color: '#000' }}>Diabetes Type 1</option>
                      <option value="Diabetes Type 2" style={{ color: '#000' }}>Diabetes Type 2</option>
                      <option value="Hypertension" style={{ color: '#000' }}>Hypertension</option>
                      <option value="Asthma" style={{ color: '#000' }}>Asthma</option>
                      <option value="COPD" style={{ color: '#000' }}>COPD</option>
                      <option value="Heart Disease" style={{ color: '#000' }}>Heart Disease</option>
                      <option value="Chronic Kidney Disease" style={{ color: '#000' }}>Chronic Kidney Disease</option>
                      <option value="Arthritis" style={{ color: '#000' }}>Arthritis</option>
                      <option value="Epilepsy" style={{ color: '#000' }}>Epilepsy</option>
                      <option value="HIV/AIDS" style={{ color: '#000' }}>HIV/AIDS</option>
                      <option value="Cancer" style={{ color: '#000' }}>Cancer</option>
                      <option value="Depression" style={{ color: '#000' }}>Depression</option>
                      <option value="Anxiety Disorder" style={{ color: '#000' }}>Anxiety Disorder</option>
                      <option value="Bipolar Disorder" style={{ color: '#000' }}>Bipolar Disorder</option>
                      <option value="Schizophrenia" style={{ color: '#000' }}>Schizophrenia</option>
                      <option value="Thyroid Disorder" style={{ color: '#000' }}>Thyroid Disorder</option>
                      <option value="Obesity" style={{ color: '#000' }}>Obesity</option>
                      <option value="High Cholesterol" style={{ color: '#000' }}>High Cholesterol</option>
                    </select>
                    <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</small>
                  </div>

                  {/* Address Section */}
                  <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#2c5282' }}>Address Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Home/Unit Number or Estate</label>
                      <input 
                        type="text" 
                        value={newPatient.homeNumber || ''}
                        onChange={(e) => setNewPatient({...newPatient, homeNumber: e.target.value})}
                        placeholder="Unit 5, Greenside Estate"
                      />
                    </div>
                    <div className="form-group">
                      <label>Street Address</label>
                      <input 
                        type="text" 
                        value={newPatient.streetAddress || ''}
                        onChange={(e) => setNewPatient({...newPatient, streetAddress: e.target.value})}
                        placeholder="123 Main Street"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Suburb</label>
                      <input 
                        type="text" 
                        value={newPatient.suburb || ''}
                        onChange={(e) => setNewPatient({...newPatient, suburb: e.target.value})}
                        placeholder="Sandton"
                      />
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input 
                        type="text" 
                        value={newPatient.city || ''}
                        onChange={(e) => setNewPatient({...newPatient, city: e.target.value})}
                        placeholder="Johannesburg"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Province</label>
                      <input 
                        type="text" 
                        value={newPatient.province || ''}
                        onChange={(e) => setNewPatient({...newPatient, province: e.target.value})}
                        placeholder="Gauteng"
                      />
                    </div>
                    <div className="form-group">
                      <label>Postal Code</label>
                      <input 
                        type="text" 
                        value={newPatient.postalCode || ''}
                        onChange={(e) => setNewPatient({...newPatient, postalCode: e.target.value})}
                        placeholder="2000"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input 
                      type="text" 
                      value={newPatient.country || ''}
                      onChange={(e) => setNewPatient({...newPatient, country: e.target.value})}
                      placeholder="South Africa"
                    />
                  </div>

                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setShowAddPatient(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={addPatient}>
                      Add Patient
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Patient Modal */}
            {showEditPatient && (
              <div className="modal edit-patient-modal">
                <div className="modal-content edit-patient-modal-content">
                  <h3>Edit Patient 📝</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name *</label>
                      <input
                        type="text"
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                        placeholder="Dr. John Smith"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Medical Record Number *</label>
                      <input
                        type="text"
                        value={newPatient.medicalRecordNumber}
                        onChange={(e) => setNewPatient({...newPatient, medicalRecordNumber: e.target.value})}
                        placeholder="MR-001"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Email Address</label>
                      <input
                        type="email"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                        placeholder="patient@email.com"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Phone Number</label>
                      <input
                        type="tel"
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Address Section */}
                  <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#2c5282' }}>Address Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Home/Unit Number or Estate</label>
                      <input
                        type="text"
                        value={newPatient.homeNumber || ''}
                        onChange={(e) => setNewPatient({...newPatient, homeNumber: e.target.value})}
                        placeholder="Unit 5, Greenside Estate"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Street Address</label>
                      <input
                        type="text"
                        value={newPatient.streetAddress || ''}
                        onChange={(e) => setNewPatient({...newPatient, streetAddress: e.target.value})}
                        placeholder="123 Main Street"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Suburb</label>
                      <input
                        type="text"
                        value={newPatient.suburb || ''}
                        onChange={(e) => setNewPatient({...newPatient, suburb: e.target.value})}
                        placeholder="Sandton"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>City</label>
                      <input
                        type="text"
                        value={newPatient.city || ''}
                        onChange={(e) => setNewPatient({...newPatient, city: e.target.value})}
                        placeholder="Johannesburg"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Province</label>
                      <input
                        type="text"
                        value={newPatient.province || ''}
                        onChange={(e) => setNewPatient({...newPatient, province: e.target.value})}
                        placeholder="Gauteng"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Postal Code</label>
                      <input
                        type="text"
                        value={newPatient.postalCode || ''}
                        onChange={(e) => setNewPatient({...newPatient, postalCode: e.target.value})}
                        placeholder="2000"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Country</label>
                      <input
                        type="text"
                        value={newPatient.country || ''}
                        onChange={(e) => setNewPatient({...newPatient, country: e.target.value})}
                        placeholder="South Africa"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Mobile Phone</label>
                      <input
                        type="tel"
                        value={newPatient.mobilePhone}
                        onChange={(e) => setNewPatient({...newPatient, mobilePhone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>WhatsApp Phone</label>
                      <input
                        type="tel"
                        value={newPatient.whatsappPhone}
                        onChange={(e) => setNewPatient({...newPatient, whatsappPhone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Passport/ID Number</label>
                      <input
                        type="text"
                        value={newPatient.passportId}
                        onChange={(e) => setNewPatient({...newPatient, passportId: e.target.value})}
                        placeholder="A123456789"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Gender</label>
                      <select
                        value={newPatient.gender}
                        onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Race/Ethnicity</label>
                      <select
                        value={newPatient.race || ''}
                        onChange={(e) => setNewPatient({...newPatient, race: e.target.value})}
                      >
                        <option value="">Select Race/Ethnicity</option>
                        <option value="Black African">Black African</option>
                        <option value="Coloured">Coloured</option>
                        <option value="Indian/Asian">Indian/Asian</option>
                        <option value="White">White</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#2c3e50', fontWeight: 600 }}>Date of Birth 📅</label>
                    <DateOfBirthPicker
                      value={newPatient.dateOfBirth}
                      onChange={(date) => setNewPatient({...newPatient, dateOfBirth: date})}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Emergency Contact Name</label>
                      <input
                        type="text"
                        value={newPatient.emergencyContactName || ''}
                        onChange={(e) => setNewPatient({...newPatient, emergencyContactName: e.target.value})}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={newPatient.emergencyContactPhone || ''}
                        onChange={(e) => setNewPatient({...newPatient, emergencyContactPhone: e.target.value})}
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                  <div className="form-group">
                    <label style={{ color: '#2c3e50', fontWeight: 600 }}>Medical Aid Scheme</label>
                    <select
                      value={newPatient.insuranceProvider}
                      onChange={(e) => setNewPatient({...newPatient, insuranceProvider: e.target.value})}
                    >
                      <option value="">Select Medical Aid Scheme</option>
                      <option value="Discovery Health">Discovery Health</option>
                      <option value="Bonitas">Bonitas</option>
                      <option value="Momentum Health">Momentum Health</option>
                      <option value="Medihelp">Medihelp</option>
                      <option value="Fedhealth">Fedhealth</option>
                      <option value="GEMS">GEMS (Government Employees Medical Scheme)</option>
                      <option value="Bestmed">Bestmed</option>
                      <option value="Profmed">Profmed</option>
                      <option value="Self-pay">Self-pay (No Medical Aid)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  </div>

                  {/* Other Medical Aid Field */}
                  {newPatient.insuranceProvider === 'Other' && (
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Specify Medical Aid Scheme</label>
                      <input
                        type="text"
                        value={newPatient.customInsuranceProvider}
                        onChange={(e) => setNewPatient({...newPatient, customInsuranceProvider: e.target.value})}
                        placeholder="Enter medical aid scheme name"
                      />
                    </div>
                  )}

                  {/* Medical Aid Number and Dependent Code */}
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Medical Aid Number</label>
                      <input
                        type="text"
                        value={newPatient.medicalAidNumber}
                        onChange={(e) => setNewPatient({...newPatient, medicalAidNumber: e.target.value})}
                        placeholder="Medical aid membership number"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Dependent Code</label>
                      <input
                        type="text"
                        value={newPatient.dependentCode}
                        onChange={(e) => setNewPatient({...newPatient, dependentCode: e.target.value})}
                        placeholder="Dependent code (if applicable)"
                      />
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="form-group">
                    <label style={{ color: '#2c3e50', fontWeight: 600 }}>Allergies</label>
                    <textarea
                      value={newPatient.allergies}
                      onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})}
                      placeholder="List any known allergies (e.g., Penicillin, Shellfish, Latex)"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#2c3e50', fontWeight: 600 }}>Current Medications</label>
                    <textarea
                      value={newPatient.currentMedications || ''}
                      onChange={(e) => setNewPatient({...newPatient, currentMedications: e.target.value})}
                      placeholder="List current medications and dosages (e.g., Metformin 500mg twice daily, Lisinopril 10mg once daily)"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#2c3e50', fontWeight: 600 }}>Diagnosed Chronic Conditions</label>
                    <select
                      multiple
                      value={newPatient.chronicConditions ? newPatient.chronicConditions.split(',').map(c => c.trim()).filter(Boolean) : []}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                        setNewPatient({...newPatient, chronicConditions: selectedOptions.join(', ')});
                      }}
                      style={{
                        minHeight: '120px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#000'
                      }}
                    >
                      <option value="Diabetes Type 1" style={{ color: '#000' }}>Diabetes Type 1</option>
                      <option value="Diabetes Type 2" style={{ color: '#000' }}>Diabetes Type 2</option>
                      <option value="Hypertension" style={{ color: '#000' }}>Hypertension</option>
                      <option value="Asthma" style={{ color: '#000' }}>Asthma</option>
                      <option value="COPD" style={{ color: '#000' }}>COPD</option>
                      <option value="Heart Disease" style={{ color: '#000' }}>Heart Disease</option>
                      <option value="Chronic Kidney Disease" style={{ color: '#000' }}>Chronic Kidney Disease</option>
                      <option value="Arthritis" style={{ color: '#000' }}>Arthritis</option>
                      <option value="Epilepsy" style={{ color: '#000' }}>Epilepsy</option>
                      <option value="HIV/AIDS" style={{ color: '#000' }}>HIV/AIDS</option>
                      <option value="Cancer" style={{ color: '#000' }}>Cancer</option>
                      <option value="Depression" style={{ color: '#000' }}>Depression</option>
                      <option value="Anxiety Disorder" style={{ color: '#000' }}>Anxiety Disorder</option>
                      <option value="Bipolar Disorder" style={{ color: '#000' }}>Bipolar Disorder</option>
                      <option value="Schizophrenia" style={{ color: '#000' }}>Schizophrenia</option>
                      <option value="Thyroid Disorder" style={{ color: '#000' }}>Thyroid Disorder</option>
                      <option value="Obesity" style={{ color: '#000' }}>Obesity</option>
                      <option value="High Cholesterol" style={{ color: '#000' }}>High Cholesterol</option>
                    </select>
                    <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</small>
                  </div>

                  {/* Patient Status */}
                  <div className="form-group">
                    <label style={{ color: '#2c3e50', fontWeight: 600 }}>Patient Status</label>
                    <select
                      value={newPatient.status}
                      onChange={(e) => setNewPatient({...newPatient, status: e.target.value as 'Living' | 'Deceased' | 'Unknown', deceasedDate: e.target.value === 'Deceased' ? new Date().toISOString().split('T')[0] : ''})}
                    >
                      <option value="Unknown">Unknown</option>
                      <option value="Living">Living</option>
                      <option value="Deceased">Deceased</option>
                    </select>
                  </div>

                  {newPatient.status === 'Deceased' && (
                    <div className="form-group">
                      <label style={{ color: '#2c3e50', fontWeight: 600 }}>Date of Death</label>
                      <input
                        type="date"
                        value={newPatient.deceasedDate || ''}
                        onChange={(e) => setNewPatient({...newPatient, deceasedDate: e.target.value})}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}

                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setShowEditPatient(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleUpdatePatient} disabled={isUpdatingPatient}>
                      {isUpdatingPatient ? (
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="loading-spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                          Updating...
                        </span>
                      ) : (
                        'Update Patient'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Profile Modal - Available from any view */}
            {showEditProfile && (
              <div className="modal">
                <div className="modal-content">
                  <h3>Edit Profile</h3>
                  <div className="form-group">
                    <label>Name</label>
                    <input 
                      type="text" 
                      value={editProfileData.name}
                      onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Role/Title</label>
                    <input 
                      type="text" 
                      value={editProfileData.role}
                      onChange={(e) => setEditProfileData({...editProfileData, role: e.target.value})}
                      placeholder="Enter your role (e.g., Physician, Doctor, etc.)"
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setShowEditProfile(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={updateProfile}>
                      Update Profile
                    </button>
                  </div>
                </div>
          </div>
        )}

            {showAddDocument && selectedPatient && (
              <div className="modal">
                <div className="modal-content" style={{position: 'relative'}}>
                  {isUploadingDocument && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, rgba(44, 90, 160, 0.98) 0%, rgba(30, 58, 138, 0.98) 100%)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      borderRadius: '12px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                      {/* Animated pulse background */}
                      <div style={{
                        position: 'absolute',
                        width: '200px',
                        height: '200px',
                        background: 'radial-gradient(circle, rgba(78, 205, 196, 0.2) 0%, transparent 70%)',
                        borderRadius: '50%',
                        animation: 'pulse 2s ease-in-out infinite'
                      }}></div>
                      
                      {/* Medical icon/spinner combo */}
                      <div style={{
                        position: 'relative',
                        marginBottom: '35px'
                      }}>
                        <div style={{
                          width: '90px',
                          height: '90px',
                          border: '5px solid rgba(255, 255, 255, 0.2)',
                          borderTop: '5px solid #4ecdc4',
                          borderRight: '5px solid #45b7d1',
                          borderRadius: '50%',
                          animation: 'spin 1.2s linear infinite',
                          boxShadow: '0 0 30px rgba(78, 205, 196, 0.4)'
                        }}></div>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '40px'
                        }}>📄</div>
                      </div>
                      
                      {/* Title with gradient */}
                      <h2 style={{
                        background: 'linear-gradient(90deg, #4ecdc4 0%, #45b7d1 50%, #4ecdc4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: '28px',
                        fontWeight: '700',
                        margin: '0 0 12px 0',
                        letterSpacing: '1px',
                        textShadow: '0 2px 10px rgba(78, 205, 196, 0.3)',
                        animation: 'shimmer 2s ease-in-out infinite'
                      }}>Uploading Document</h2>
                      
                      {/* Subtitle */}
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.95)',
                        fontSize: '16px',
                        margin: '0 0 8px 0',
                        fontWeight: '500'
                      }}>Processing your medical file...</p>
                      
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '14px',
                        margin: 0,
                        fontStyle: 'italic'
                      }}>Please wait, do not close this window</p>
                      
                      {/* Loading dots animation */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '25px'
                      }}>
                        {[0, 1, 2].map((i) => (
                          <div key={i} style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#4ecdc4',
                            animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                            boxShadow: '0 0 10px rgba(78, 205, 196, 0.6)'
                          }}></div>
                        ))}
                      </div>
                      
                      <style>{`
                        @keyframes pulse {
                          0%, 100% { transform: scale(1); opacity: 0.5; }
                          50% { transform: scale(1.3); opacity: 0.8; }
                        }
                        @keyframes shimmer {
                          0% { background-position: 0% 50%; }
                          50% { background-position: 100% 50%; }
                          100% { background-position: 0% 50%; }
                        }
                        @keyframes bounce {
                          0%, 80%, 100% { transform: translateY(0); }
                          40% { transform: translateY(-12px); }
                        }
                      `}</style>
                    </div>
                  )}
                  <h3>📤 Add Document for {selectedPatient.name}</h3>
                  <div className="form-group">
                    <label>Upload Files * (Multiple files supported)</label>
                    <input 
                      type="file" 
                      id="fileUpload"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const files = Array.from(e.target.files);
                          const firstFile = files[0];
                          setNewDocument({...newDocument, fileName: firstFile.name});
                        }
                      }}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      className="file-input"
                    />
                    <label htmlFor="fileUpload" className="file-upload-label">
                      📁 Choose Files (Hold Ctrl/Cmd for multiple)
                    </label>
                    {(() => {
                      const fileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement;
                      const files = fileInput?.files;
                      return files && files.length > 0 ? (
                        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(78, 205, 196, 0.1)', borderRadius: '8px', border: '1px solid rgba(78, 205, 196, 0.3)' }}>
                          <div style={{ fontWeight: '600', color: '#4ecdc4', marginBottom: '8px' }}>✓ {files.length} file{files.length !== 1 ? 's' : ''} selected</div>
                          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {Array.from(files).map((file, i) => (
                              <div key={i} style={{ fontSize: '0.9em', color: '#000000', padding: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  {(() => {
                    const fileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement;
                    const fileCount = fileInput?.files?.length || 0;
                    return fileCount <= 1 ? (
                      <div className="form-group">
                        <label>Document Name *</label>
                        <input 
                          type="text" 
                          value={newDocument.fileName}
                          onChange={(e) => setNewDocument({...newDocument, fileName: e.target.value})}
                          placeholder="e.g., Blood Test Results - 15 Jan 2024"
                        />
                      </div>
                    ) : null;
                  })()}
                  <div className="form-group">
                    <label>Document Type</label>
                    <select 
                      value={newDocument.documentType}
                      onChange={(e) => setNewDocument({...newDocument, documentType: e.target.value as Document['documentType']})}
                    >
                      <option value="Lab Results">🧪 Lab Results</option>
                      <option value="Imaging">📷 Imaging (X-ray, MRI, CT)</option>
                      <option value="Pathology">🔬 Pathology Report</option>
                      <option value="Consultation">📝 Consultation Notes</option>
                      <option value="Prescription">💊 Prescription</option>
                      <option value="Invoice">📋 Invoice</option>
                      <option value="Body Composition">🏋️‍♀️ Body Composition</option>
                      <option value="Other">📄 Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input 
                      type="text" 
                      value={newDocument.description}
                      onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                      placeholder="Brief description of the document"
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setShowAddDocument(false)} disabled={isUploadingDocument}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => addDocument()} disabled={isUploadingDocument}>
                      {isUploadingDocument ? '⏳ Uploading...' : (() => {
                        const fileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement;
                        const count = fileInput?.files?.length || 0;
                        return count > 1 ? `📤 Upload ${count} Documents` : '📤 Upload Document';
                      })()}
                    </button>
                  </div>
                </div>
              </div>
            )}

        {/* AI Summary Modal - Futuristic Loading */}
        {showAISummary && (
          <div className="modal">
            <div className="modal-content ai-summary-modal">
              <h3 style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.8rem',
                fontWeight: '700',
                marginBottom: '2rem'
              }}>🤖 AI Medical Analysis</h3>
              {isGeneratingSummary ? (
                <div className="ai-progress" style={{ position: 'relative' }}>
                  {/* Futuristic animated background */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '-20px',
                    right: '-20px',
                    bottom: '-20px',
                    background: 'linear-gradient(45deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                    borderRadius: '20px',
                    animation: 'pulse 2s ease-in-out infinite',
                    zIndex: 0
                  }}></div>
                  
                  {/* Neural network animation */}
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    marginBottom: '2rem'
                  }}>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      margin: '0 auto 1.5rem',
                      position: 'relative'
                    }}>
                      {/* Rotating rings */}
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: `${60 + i * 20}px`,
                          height: `${60 + i * 20}px`,
                          border: '3px solid',
                          borderColor: i === 0 ? '#667eea' : i === 1 ? '#764ba2' : '#48bb78',
                          borderRadius: '50%',
                          borderTopColor: 'transparent',
                          borderRightColor: 'transparent',
                          animation: `spin ${1.5 + i * 0.5}s linear infinite ${i === 1 ? 'reverse' : ''}`,
                          opacity: 0.7
                        }}></div>
                      ))}
                      
                      {/* Center brain icon */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '2rem',
                        animation: 'pulse 2s ease-in-out infinite'
                      }}>🧠</div>
                    </div>
                  </div>
                  
                  {/* Progress bar with gradient */}
                  <div className="progress-bar" style={{
                    position: 'relative',
                    zIndex: 1,
                    height: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '2px solid rgba(102, 126, 234, 0.3)',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)'
                  }}>
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${aiProgress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #48bb78 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s linear infinite',
                        transition: 'width 0.3s ease',
                        boxShadow: '0 0 20px rgba(102, 126, 234, 0.6)'
                      }}
                    ></div>
                  </div>
                  
                  {/* Status text with glow effect */}
                  <p className="progress-status" style={{
                    position: 'relative',
                    zIndex: 1,
                    color: '#667eea',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    marginTop: '1.5rem',
                    marginBottom: '0.5rem',
                    textShadow: '0 0 10px rgba(102, 126, 234, 0.5)'
                  }}>{aiStatus}</p>
                  
                  {/* Percentage with particles */}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <p className="progress-percentage" style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginTop: '0.5rem'
                    }}>{aiProgress}%</p>
                    
                    {/* Floating particles */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1rem' }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          animation: `float 2s ease-in-out ${i * 0.2}s infinite`,
                          boxShadow: '0 0 10px rgba(102, 126, 234, 0.6)'
                        }}></div>
                      ))}
                    </div>
                  </div>
                  
                  <style>{`
                    @keyframes shimmer {
                      0% { background-position: 200% 0; }
                      100% { background-position: -200% 0; }
                    }
                    @keyframes float {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-15px); }
                    }
                  `}</style>
                </div>
              ) : (
                <div className="ai-complete">
                  <div className="success-icon">✅</div>
                  <p>AI Summary generated successfully!</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowAISummary(false);
                      // Navigate to patients view and select the patient whose summary was generated
                      setCurrentView('patients');
                      if (lastGeneratedPatient) {
                        setSelectedPatient(lastGeneratedPatient);
                        setShowPatientDetails(true);
                      }
                    }}
                  >
                    View Summary
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Viewing Modal */}
        {showSummaryModal && selectedSummary && (
          <div className="modal">
            <div className="modal-content summary-modal">
              <div className="modal-header">
                <h3>🤖 AI Summary</h3>
                <button 
                  className="btn-close"
                  onClick={() => {
                    setShowSummaryModal(false);
                    setSelectedSummary(null);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="summary-content">
                <div className="summary-meta">
                  <span className="summary-date">
                    Generated: {selectedSummary.createdAt ? new Date(selectedSummary.createdAt).toLocaleDateString('en-ZA') : 'Unknown date'}
                  </span>
                  <span className="summary-author">
                    By: {selectedSummary.generatedBy || 'Unknown'}
                  </span>
                </div>
                <div className="summary-text">
                  <h4>AI Summary:</h4>
                  <p>{selectedSummary.summaryText || 'No summary content available'}</p>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowSummaryModal(false);
                    setSelectedSummary(null);
                  }}
                >
                  Close
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => {
                    const patient = patientsList.find(p => p.medicalRecordNumber === selectedSummary.patientId);
                    if (patient) {
                      setSelectedPatient(patient);
                      setWhatsappPhone(patient.whatsappPhone || patient.mobilePhone || patient.phone || '');
                      setWhatsappMessage(`Hi ${patient.name},

Here is your AI-generated medical summary:

${selectedSummary.summaryText}

Best regards,
Dr Hlosukwazi Khumalo`);
                      setShowWhatsAppModal(true);
                      setShowSummaryModal(false);
                    }
                  }}
                  style={{ background: '#25D366', color: 'white' }}
                >
                  📱 Send via WhatsApp
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    const patient = patientsList.find(p => p.medicalRecordNumber === selectedSummary.patientId);
                    if (patient) {
                      setSelectedPatient(patient);
                      setShowPatientDetails(true);
                      setShowSummaryModal(false);
                      setSelectedSummary(null);
                    }
                  }}
                >
                  View Patient Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import CSV Modal */}
        {showImportModal && (
          <div className="modal">
            <div className="modal-content">
              <h3>📁 Import Patients from CSV</h3>
              <div className="form-group">
                <label htmlFor="csv-upload" className="file-upload-label">
                  <i className="fas fa-file-csv"></i> Choose CSV File
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  className="file-input"
                  accept=".csv"
                  onChange={handleFileImport}
                />
                {importFile && <p className="selected-file-name">Selected: {importFile.name}</p>}
              </div>
              
              <div className="import-instructions">
                <h4>CSV Format Instructions:</h4>
                <p>Your CSV should have the following columns (in order):</p>
                <ol>
                  <li><strong>Name</strong> - Patient's full name</li>
                  <li><strong>Medical Record Number</strong> - Unique patient ID</li>
                  <li><strong>Email</strong> - Patient's email address</li>
                  <li><strong>Phone</strong> - Contact number</li>
                  <li><strong>Date of Birth</strong> - Birth date (YYYY-MM-DD)</li>
                  <li><strong>Insurance Provider</strong> - Medical aid scheme</li>
                  <li><strong>Emergency Contact</strong> - Emergency contact name</li>
                  <li><strong>Emergency Phone</strong> - Emergency contact number</li>
                  <li><strong>Medical History</strong> - Past medical conditions</li>
                  <li><strong>Allergies</strong> - Known allergies</li>
                  <li><strong>Current Medications</strong> - Current prescriptions</li>
                </ol>
                <p><em>Note: Only Name and Medical Record Number are required. Other fields are optional.</em></p>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={importPatientsFromCSV} 
                  className="btn btn-primary"
                  disabled={!importFile}
                >
                  Import Patients
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        )}

        {currentView === 'appointments' && (
          <div className="appointments-view" style={{ padding: '20px', maxWidth: '100%' }}>
            <AppointmentBooking />
          </div>
        )}

        {currentView === 'prescriptions' && (
          <div className="prescriptions-view" style={{ padding: '20px', maxWidth: '100%' }}>
            <PrescriptionManagement user={user} />
          </div>
        )}

        {currentView === 'activities' && (
          <div className="activities-view">
            <Activities />
          </div>
        )}

        {currentView === 'settings' && (
          <Settings 
            user={user}
            onUpdateUser={(userData) => {
              setUser({...user, ...userData});
            }}
          />
        )}

      </main>
      </div> {/* Close app-content */}
      
      {/* Professional Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Action</h3>
            </div>
            <div className="modal-body">
              <p>{confirmMessage}</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && selectedPatient && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: '#f0f9ff',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '3px solid #25D366'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                color: '#1a1a1a', 
                fontSize: '1.5rem', 
                margin: 0, 
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#fff',
                padding: '1rem',
                borderRadius: '8px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366"/>
                </svg>
                Send via WhatsApp
              </h3>
              <p style={{ color: '#1a1a1a', margin: 0, fontSize: '0.9rem', fontWeight: '500', paddingLeft: '1rem' }}>
                {selectedDocumentForWhatsApp ? `Document: ${selectedDocumentForWhatsApp.fileName}` : 'AI Summary'}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#1a1a1a', 
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                Phone Number
              </label>
              <select
                value={isCustomWhatsAppNumber ? 'custom' : whatsappPhone}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomWhatsAppNumber(true);
                    setWhatsappPhone('');
                  } else {
                    setIsCustomWhatsAppNumber(false);
                    setWhatsappPhone(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #25D366',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                {selectedPatient.whatsappPhone && (
                  <option value={selectedPatient.whatsappPhone}>
                    WhatsApp: {selectedPatient.whatsappPhone}
                  </option>
                )}
                {selectedPatient.mobilePhone && (
                  <option value={selectedPatient.mobilePhone}>
                    Mobile: {selectedPatient.mobilePhone}
                  </option>
                )}
                {selectedPatient.phone && (
                  <option value={selectedPatient.phone}>
                    Phone: {selectedPatient.phone}
                  </option>
                )}
                <option value="custom">Custom number...</option>
              </select>
              
              {isCustomWhatsAppNumber && (
                <input
                  type="tel"
                  placeholder="Enter phone number with country code (e.g., +27...)"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '2px solid #25D366',
                    background: '#ffffff',
                    color: '#1a1a1a',
                    fontSize: '1rem',
                    marginTop: '0.5rem',
                    fontWeight: '500'
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#1a1a1a', 
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                Message
              </label>
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #25D366',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontWeight: '500'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setSelectedDocumentForWhatsApp(null);
                  setIsCustomWhatsAppNumber(false);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '2px solid #64748b',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendViaWhatsApp}
                disabled={!whatsappPhone}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: whatsappPhone ? '#25D366' : '#64748b',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: whatsappPhone ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  fontWeight: '700'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="white"/>
                  </svg>
                  Send to WhatsApp
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Notification */}
    </div>
  );
}

// Main App Component with Routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/symptom-checker" element={<SymptomCheckerPage />} />
        <Route path="/book-appointment" element={<PatientAppointmentBooking />} />
      </Routes>
    </Router>
  );
}

export default App;