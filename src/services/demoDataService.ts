/**
 * Demo Data Service
 * Provides anonymized mock data for demo mode
 * No real patient information is exposed
 */

import type { Patient } from './azurePatientRestService';
import type { Prescription } from './azurePrescriptionService';
import type { Activity } from './activityService';

// Demo mode flag - can be set via environment variable
export const isDemoMode = (): boolean => {
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const isDemoUser = localStorage.getItem('isDemoUser') === 'true';
  return demoMode || isDemoUser;
};

// Generate demo patients with anonymized data
export const generateDemoPatients = (): Patient[] => {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Olivia', 'Robert', 'Sophia', 
                      'William', 'Isabella', 'Thomas', 'Mia', 'Daniel', 'Charlotte', 'Matthew', 'Amelia', 'Joseph', 'Emily'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                     'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const conditions = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Arthritis', 'None', 'Hyperlipidemia', 'GERD', 'Anxiety'];
  const allergies = ['None', 'Penicillin', 'Peanuts', 'Latex', 'Sulfa drugs', 'Aspirin', 'Iodine'];
  const insuranceProviders = ['Discovery Health', 'Bonitas Medical Fund', 'Momentum Health', 'Medshield', 'Fedhealth', 'Gems'];
  const provinces = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Mpumalanga'];
  const cities = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein'];

  const demoPatients: Patient[] = [];
  
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const age = 18 + Math.floor(Math.random() * 65);
    const birthYear = new Date().getFullYear() - age;
    const gender = Math.random() > 0.5 ? 'Male' : 'Female';
    
    demoPatients.push({
      id: `DEMO${String(i + 1).padStart(4, '0')}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo-email.com`,
      phone: `+27 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`,
      mobilePhone: `+27 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`,
      whatsappPhone: `+27 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`,
      passportId: `${Math.floor(Math.random() * 900000000 + 100000000)}`,
      gender: gender,
      dateOfBirth: `${birthYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      medicalRecordNumber: `File ${i + 1}`,
      emergencyContact: `Emergency Contact ${i + 1}`,
      insuranceProvider: insuranceProviders[Math.floor(Math.random() * insuranceProviders.length)],
      medicalAidNumber: `${Math.floor(Math.random() * 9000000 + 1000000)}`,
      dependentCode: `${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`,
      allergies: allergies[Math.floor(Math.random() * allergies.length)],
      chronicConditions: conditions[Math.floor(Math.random() * conditions.length)],
      status: Math.random() > 0.95 ? 'Deceased' : 'Living',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString(),
      partitionKey: 'patient',
      rowKey: `DEMO${String(i + 1).padStart(4, '0')}`,
      // Address fields
      homeNumber: `${Math.floor(Math.random() * 500) + 1}`,
      streetAddress: `${Math.floor(Math.random() * 500) + 1} Demo Street`,
      suburb: `Demo Suburb ${i % 10 + 1}`,
      city: cities[Math.floor(Math.random() * cities.length)],
      province: provinces[Math.floor(Math.random() * provinces.length)],
      postalCode: `${Math.floor(Math.random() * 9000) + 1000}`,
      country: 'South Africa'
    });
  }
  
  return demoPatients;
};

// Generate demo documents
export const generateDemoDocuments = (patientId?: string) => {
  const documentTypes = ['Lab Results', 'Imaging', 'Consultation', 'Prescription', 'Other'] as const;
  const demoDocuments = [];
  
  const numDocs = patientId ? Math.floor(Math.random() * 5) + 1 : 25;
  
  for (let i = 0; i < numDocs; i++) {
    const docType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
    const targetPatientId = patientId || `DEMO${String(Math.floor(Math.random() * 50) + 1).padStart(4, '0')}`;
    
    demoDocuments.push({
      partitionKey: 'document',
      rowKey: `demo_doc_${targetPatientId}_${i}`,
      patientId: targetPatientId,
      fileName: `${docType.replace(' ', '_')}_${i + 1}.pdf`,
      fileSize: Math.floor(Math.random() * 500000) + 50000,
      description: `Demo ${docType} document for demonstration purposes`,
      documentType: docType,
      blobUrl: `https://demo.blob.core.windows.net/demo/${docType.replace(' ', '_')}_${i}.pdf`,
      contentType: 'application/pdf',
      processedText: `This is a demo ${docType} document. All data shown is anonymized for demonstration purposes only.`,
      uploadedAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString(),
      isDeleted: false
    });
  }
  
  return demoDocuments;
};

// Generate demo prescriptions
export const generateDemoPrescriptions = (patientId?: string): Prescription[] => {
  const medications = [
    { name: 'Amoxicillin', dosage: '500mg', form: 'TAB' },
    { name: 'Metformin', dosage: '850mg', form: 'TAB' },
    { name: 'Lisinopril', dosage: '10mg', form: 'TAB' },
    { name: 'Ibuprofen', dosage: '400mg', form: 'TAB' },
    { name: 'Omeprazole', dosage: '20mg', form: 'CAP' },
    { name: 'Atorvastatin', dosage: '20mg', form: 'TAB' }
  ];
  
  const demoPrescriptions: Prescription[] = [];
  const numPrescriptions = patientId ? Math.floor(Math.random() * 3) + 1 : 15;
  
  for (let i = 0; i < numPrescriptions; i++) {
    const targetPatientId = patientId || `DEMO${String(Math.floor(Math.random() * 50) + 1).padStart(4, '0')}`;
    const numMeds = Math.floor(Math.random() * 3) + 1;
    const prescriptionMeds = [];
    
    for (let j = 0; j < numMeds; j++) {
      const med = medications[Math.floor(Math.random() * medications.length)];
      prescriptionMeds.push({
        medicationId: `med_${i}_${j}`,
        medicationName: med.name,
        dosage: med.dosage,
        frequency: ['Once daily', 'Twice daily', 'Three times daily'][Math.floor(Math.random() * 3)],
        duration: `${Math.floor(Math.random() * 20) + 5} days`,
        instructions: 'Take with food',
        quantity: Math.floor(Math.random() * 60) + 10,
        refills: Math.floor(Math.random() * 3),
        form: med.form
      });
    }
    
    demoPrescriptions.push({
      partitionKey: 'prescription',
      rowKey: `demo_rx_${targetPatientId}_${i}`,
      prescriptionNumber: `RX-DEMO-${String(i + 1).padStart(5, '0')}`,
      patientId: targetPatientId,
      patientName: `Demo Patient ${targetPatientId}`,
      patientEmail: `demo.patient${targetPatientId}@demo-email.com`,
      doctorId: 'demo_doctor',
      doctorName: 'Dr. Demo Physician',
      doctorLicense: 'MP-DEMO-001',
      clinicName: 'Demo Medical Clinic',
      clinicAddress: '123 Demo Street, Demo City',
      clinicPhone: '+27 11 123 4567',
      date: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString(),
      diagnosis: ['Hypertension', 'Type 2 Diabetes', 'Upper Respiratory Infection', 'Gastritis'][Math.floor(Math.random() * 4)],
      medications: prescriptionMeds,
      notes: 'Follow-up in 2 weeks. Demo prescription for demonstration purposes.',
      status: ['active', 'filled'][Math.floor(Math.random() * 2)] as 'active' | 'filled',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  return demoPrescriptions;
};

// Generate demo activities
export const generateDemoActivities = (): Activity[] => {
  const activityTypes = [
    'patient_added',
    'patient_deleted',
    'document_uploaded',
    'document_deleted',
    'summary_generated',
    'summary_deleted',
    'prescription_created',
    'prescription_sent',
    'appointment_created'
  ];
  
  const demoActivities: Activity[] = [];
  
  for (let i = 0; i < 30; i++) {
    const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString();
    
    let description = '';
    switch (type) {
      case 'patient_added':
        description = 'Added demo patient to system';
        break;
      case 'patient_deleted':
        description = 'Removed demo patient from system';
        break;
      case 'document_uploaded':
        description = 'Uploaded demo medical document';
        break;
      case 'document_deleted':
        description = 'Deleted demo document';
        break;
      case 'summary_generated':
        description = 'Generated AI summary for demo patient';
        break;
      case 'prescription_created':
        description = 'Created prescription for demo patient';
        break;
      case 'prescription_sent':
        description = 'Sent prescription via email (demo)';
        break;
      case 'appointment_created':
        description = 'Scheduled appointment for demo patient';
        break;
      default:
        description = 'Demo activity';
    }
    
    demoActivities.push({
      id: `demo_activity_${i}`,
      type: type as any,
      description: description,
      timestamp: timestamp,
      userId: 'demo_user',
      metadata: {
        demo: true,
        index: i
      }
    });
  }
  
  // Sort by timestamp descending
  return demoActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// Generate demo AI summaries
export const generateDemoSummaries = (patientId?: string) => {
  const summaries = [];
  const numSummaries = patientId ? 1 : 10;
  
  for (let i = 0; i < numSummaries; i++) {
    const targetPatientId = patientId || `DEMO${String(Math.floor(Math.random() * 50) + 1).padStart(4, '0')}`;
    
    summaries.push({
      partitionKey: 'summary',
      rowKey: `demo_summary_${targetPatientId}_${i}`,
      patientId: targetPatientId,
      summaryText: `DEMO MEDICAL SUMMARY

Patient: Demo Patient ${targetPatientId}
Generated: ${new Date().toLocaleDateString()}

CLINICAL OVERVIEW:
This is a demonstration medical summary showing the AI analysis capabilities. 
All patient data is anonymized for demo purposes.

KEY FINDINGS:
• Routine medical history review completed
• Vital signs within normal ranges
• Laboratory results reviewed and documented
• Imaging studies on file for diagnostic evaluation

RECOMMENDATIONS:
• Continue regular follow-up appointments
• Maintain current medication regimen
• Schedule annual health assessment
• Monitor chronic conditions as appropriate

Note: This is demo data for demonstration purposes only.`,
      generatedBy: 'demo_doctor',
      documentIds: `demo_doc_${targetPatientId}_1,demo_doc_${targetPatientId}_2`,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
  
  return summaries;
};

// Demo user information
export const DEMO_USER = {
  id: 'demo_user',
  name: 'Dr. Demo User',
  email: 'demo@cortexha.com',
  role: 'Administrator'
};

// Check if current user is a demo user
export const isCurrentUserDemo = (): boolean => {
  return localStorage.getItem('isDemoUser') === 'true';
};

// Set demo user flag
export const setDemoUserFlag = (isDemo: boolean): void => {
  if (isDemo) {
    localStorage.setItem('isDemoUser', 'true');
  } else {
    localStorage.removeItem('isDemoUser');
  }
};

// Clear all demo data
export const clearDemoData = (): void => {
  localStorage.removeItem('isDemoUser');
  console.log('🧹 Demo data cleared');
};

