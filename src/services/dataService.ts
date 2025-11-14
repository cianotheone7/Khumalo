/**
 * Data Service Router
 * Routes data operations to either real Azure services or demo data
 * based on current mode (demo vs production)
 */

import { 
  isDemoMode, 
  generateDemoPatients, 
  generateDemoDocuments,
  generateDemoPrescriptions,
  generateDemoActivities,
  generateDemoSummaries,
  isCurrentUserDemo
} from './demoDataService';

// Real service imports
import * as realPatientService from './azurePatientRestService';
import * as realPrescriptionService from './azurePrescriptionService';
import { getRecentActivities as getRealActivities } from './activityService';
import { 
  getDocuments as getRealDocuments, 
  getAllDocuments as getRealAllDocuments,
  getAISummaries as getRealSummaries,
  createDocument as realCreateDocument,
  createAISummary as realCreateSummary
} from './azureTableRestService';

// Cache for demo data to maintain consistency during session
let demoDataCache: {
  patients: any[] | null;
  documents: any[] | null;
  prescriptions: any[] | null;
  activities: any[] | null;
  summaries: any[] | null;
} = {
  patients: null,
  documents: null,
  prescriptions: null,
  activities: null,
  summaries: null
};

// Reset demo cache
export const resetDemoCache = () => {
  demoDataCache = {
    patients: null,
    documents: null,
    prescriptions: null,
    activities: null,
    summaries: null
  };
};

// Patient operations
export const getPatients = async () => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning demo patients');
    if (!demoDataCache.patients) {
      demoDataCache.patients = generateDemoPatients();
    }
    return demoDataCache.patients;
  }
  return realPatientService.getPatients();
};

export const getPatientsOptimized = async () => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning demo patients (optimized)');
    if (!demoDataCache.patients) {
      demoDataCache.patients = generateDemoPatients();
    }
    return demoDataCache.patients;
  }
  return realPatientService.getPatientsOptimized();
};

export const getPatientsFast = async () => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning demo patients (fast)');
    if (!demoDataCache.patients) {
      demoDataCache.patients = generateDemoPatients();
    }
    return {
      patients: demoDataCache.patients,
      totalCount: demoDataCache.patients.length,
      hasMore: false
    };
  }
  return realPatientService.getPatientsFast();
};

export const createPatient = async (patientData: any) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating patient creation');
    // Simulate creation in demo mode
    const newPatient = {
      ...patientData,
      id: `DEMO${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      partitionKey: 'patient',
      rowKey: patientData.medicalRecordNumber || `DEMO${Date.now()}`
    };
    
    if (!demoDataCache.patients) {
      demoDataCache.patients = generateDemoPatients();
    }
    demoDataCache.patients = [newPatient, ...demoDataCache.patients];
    
    return newPatient;
  }
  return realPatientService.createPatient(patientData);
};

export const updatePatient = async (patientId: string, patientData: any) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating patient update');
    if (demoDataCache.patients) {
      const index = demoDataCache.patients.findIndex(p => p.id === patientId);
      if (index !== -1) {
        demoDataCache.patients[index] = { ...demoDataCache.patients[index], ...patientData };
        return demoDataCache.patients[index];
      }
    }
    return null;
  }
  return realPatientService.updatePatient(patientId, patientData);
};

export const deletePatient = async (patientId: string) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating patient deletion');
    if (demoDataCache.patients) {
      demoDataCache.patients = demoDataCache.patients.filter(p => p.id !== patientId);
    }
    return true;
  }
  return realPatientService.deletePatient(patientId);
};

export const searchPatients = async (searchTerm: string) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Searching demo patients');
    if (!demoDataCache.patients) {
      demoDataCache.patients = generateDemoPatients();
    }
    const term = searchTerm.toLowerCase();
    return demoDataCache.patients.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.medicalRecordNumber.toLowerCase().includes(term)
    );
  }
  return realPatientService.searchPatients(searchTerm);
};

// Document operations
export const getDocuments = async (patientId: string) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning demo documents');
    if (!demoDataCache.documents) {
      demoDataCache.documents = generateDemoDocuments();
    }
    return demoDataCache.documents.filter(d => d.patientId === patientId);
  }
  return getRealDocuments(patientId);
};

export const getAllDocuments = async () => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning all demo documents');
    if (!demoDataCache.documents) {
      demoDataCache.documents = generateDemoDocuments();
    }
    return demoDataCache.documents;
  }
  return getRealAllDocuments();
};

export const createDocument = async (documentData: any) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating document creation');
    const newDoc = {
      ...documentData,
      partitionKey: 'document',
      rowKey: `demo_doc_${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    
    if (!demoDataCache.documents) {
      demoDataCache.documents = generateDemoDocuments();
    }
    demoDataCache.documents = [newDoc, ...demoDataCache.documents];
    
    return newDoc;
  }
  return realCreateDocument(documentData);
};

// Prescription operations
export const getPrescriptions = async (patientId?: string) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning demo prescriptions');
    if (!demoDataCache.prescriptions) {
      demoDataCache.prescriptions = generateDemoPrescriptions();
    }
    if (patientId) {
      return demoDataCache.prescriptions.filter(p => p.patientId === patientId);
    }
    return demoDataCache.prescriptions;
  }
  return realPrescriptionService.getPrescriptions(patientId);
};

export const createPrescription = async (prescriptionData: any) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating prescription creation');
    const newPrescription = {
      ...prescriptionData,
      partitionKey: 'prescription',
      rowKey: `demo_rx_${Date.now()}`,
      prescriptionNumber: `RX-DEMO-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!demoDataCache.prescriptions) {
      demoDataCache.prescriptions = generateDemoPrescriptions();
    }
    demoDataCache.prescriptions = [newPrescription, ...demoDataCache.prescriptions];
    
    return newPrescription;
  }
  return realPrescriptionService.createPrescription(prescriptionData);
};

export const updatePrescription = async (partitionKey: string, rowKey: string, updates: any) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating prescription update');
    if (demoDataCache.prescriptions) {
      const index = demoDataCache.prescriptions.findIndex(p => p.rowKey === rowKey);
      if (index !== -1) {
        demoDataCache.prescriptions[index] = { ...demoDataCache.prescriptions[index], ...updates, updatedAt: new Date().toISOString() };
        return true;
      }
    }
    return false;
  }
  return realPrescriptionService.updatePrescription(partitionKey, rowKey, updates);
};

export const deletePrescription = async (partitionKey: string, rowKey: string) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating prescription deletion');
    if (demoDataCache.prescriptions) {
      demoDataCache.prescriptions = demoDataCache.prescriptions.filter(p => p.rowKey !== rowKey);
    }
    return true;
  }
  return realPrescriptionService.deletePrescription(partitionKey, rowKey);
};

// Activity operations
export const getRecentActivities = async (limit?: number) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning demo activities');
    if (!demoDataCache.activities) {
      demoDataCache.activities = generateDemoActivities();
    }
    return limit ? demoDataCache.activities.slice(0, limit) : demoDataCache.activities;
  }
  return getRealActivities(limit);
};

// AI Summary operations
export const getAISummaries = async () => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Returning demo summaries');
    if (!demoDataCache.summaries) {
      demoDataCache.summaries = generateDemoSummaries();
    }
    return demoDataCache.summaries;
  }
  return getRealSummaries();
};

export const createAISummary = async (summaryData: any) => {
  if (isDemoMode() || isCurrentUserDemo()) {
    console.log('🎭 Demo Mode: Simulating AI summary creation');
    const newSummary = {
      ...summaryData,
      partitionKey: 'summary',
      rowKey: `demo_summary_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    if (!demoDataCache.summaries) {
      demoDataCache.summaries = generateDemoSummaries();
    }
    demoDataCache.summaries = [newSummary, ...demoDataCache.summaries];
    
    return newSummary;
  }
  return realCreateSummary(summaryData);
};

// Export patient service types
export type { Patient } from './azurePatientRestService';
