// Azure Prescription Service - REST API for Browser Compatibility
// Manages prescription data in Azure Table Storage

// Azure Table Storage Configuration
const AZURE_STORAGE_ACCOUNT_NAME = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;

// SAS Token for Prescriptions Table from environment
// Using general SAS token that works for all tables
const PRESCRIPTIONS_SAS_TOKEN = import.meta.env.VITE_PRESCRIPTIONS_SAS_TOKEN || 
  '?sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-12-30T20:02:20Z&st=2025-10-29T11:47:20Z&spr=https&sig=aYu9vvB7FVKK9XeGr5%2BqVoEyXRTYYP1jgqW8%2BvjOlYE%3D';

// Table name
const PRESCRIPTIONS_TABLE = 'Prescriptions';

// Prescription interfaces
export interface PrescriptionMedication {
  medicationId: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
  refills: number;
  form?: string; // Dosage form (tablet, capsule, syrup, etc.)
  schedule?: string; // SA Schedule (0-6)
  route?: string; // Route of administration
}

export interface Prescription {
  partitionKey: string; // 'prescription'
  rowKey: string; // unique prescription ID
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientIdNumber?: string; // ID or passport number
  patientAddress?: string; // Physical address
  patientAge?: number; // Age
  patientGender?: string; // Gender
  patientDateOfBirth?: string; // Date of birth
  guardianName?: string; // For children
  guardianContact?: string; // For children
  doctorId: string;
  doctorName: string;
  doctorQualification?: string; // Professional qualification (MBBCh, etc.)
  doctorLicense?: string; // HPCSA/SAPC registration number
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  date: string;
  diagnosis?: string;
  medications: PrescriptionMedication[];
  notes?: string;
  status: 'active' | 'filled' | 'cancelled' | 'expired';
  createdAt: string;
  updatedAt: string;
  validUntil?: string;
}

// Helper functions
function getTableUrl(): string {
  return `${AZURE_STORAGE_ENDPOINT}/${PRESCRIPTIONS_TABLE}${PRESCRIPTIONS_SAS_TOKEN}`;
}

function getEntityUrl(partitionKey: string, rowKey: string): string {
  const encodedPartitionKey = encodeURIComponent(partitionKey);
  const encodedRowKey = encodeURIComponent(rowKey);
  return `${AZURE_STORAGE_ENDPOINT}/${PRESCRIPTIONS_TABLE}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')${PRESCRIPTIONS_SAS_TOKEN}`;
}

// Generate prescription number
function generatePrescriptionNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RX-${year}${month}-${random}`;
}

// Create prescription
export const createPrescription = async (prescriptionData: Omit<Prescription, 'partitionKey' | 'rowKey' | 'prescriptionNumber' | 'createdAt' | 'updatedAt'>): Promise<Prescription | null> => {
  try {
    console.log('📝 Creating prescription in Azure Table Storage...');
    
    const prescription: Prescription = {
      partitionKey: 'prescription',
      rowKey: `${prescriptionData.patientId}_${Date.now()}`,
      prescriptionNumber: generatePrescriptionNumber(),
      ...prescriptionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const tableUrl = getTableUrl();
    
    // Serialize medications as JSON string for Azure Table Storage
    const requestBody = {
      PartitionKey: prescription.partitionKey,
      RowKey: prescription.rowKey,
      prescriptionNumber: prescription.prescriptionNumber,
      patientId: prescription.patientId,
      patientName: prescription.patientName,
      patientEmail: prescription.patientEmail || '',
      doctorId: prescription.doctorId,
      doctorName: prescription.doctorName,
      doctorLicense: prescription.doctorLicense || '',
      clinicName: prescription.clinicName || '',
      clinicAddress: prescription.clinicAddress || '',
      clinicPhone: prescription.clinicPhone || '',
      date: prescription.date,
      diagnosis: prescription.diagnosis || '',
      medications: JSON.stringify(prescription.medications),
      notes: prescription.notes || '',
      status: prescription.status,
      createdAt: prescription.createdAt,
      updatedAt: prescription.updatedAt,
      validUntil: prescription.validUntil || ''
    };

    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'Prefer': 'return-no-content',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(requestBody),
      mode: 'cors'
    });

    if (response.ok || response.status === 201 || response.status === 204) {
      console.log('✅ Prescription created successfully!');
      return prescription;
    } else if (response.status === 403 || response.status === 404) {
      console.error('❌ Prescriptions table not accessible.');
      console.error('💡 Please create "Prescriptions" table in Azure Storage or update VITE_PRESCRIPTIONS_SAS_TOKEN');
      alert('Prescription feature requires Azure setup.\n\nPlease:\n1. Create "Prescriptions" table in Azure Storage\n2. Generate SAS token with raud permissions\n3. Add VITE_PRESCRIPTIONS_SAS_TOKEN to environment variables');
      return null;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create prescription:', response.status, errorText);
      throw new Error(`Failed to create prescription: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error creating prescription:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      alert('Cannot connect to Azure Storage. Please check your internet connection and Azure configuration.');
    }
    return null;
  }
};

// Get all prescriptions
export const getPrescriptions = async (patientId?: string): Promise<Prescription[]> => {
  try {
    
    const tableUrl = getTableUrl();
    
    const response = await fetch(tableUrl, {
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
      const prescriptions = data.value || [];
      
      // Convert Azure Table Storage format to Prescription interface
      const formattedPrescriptions: Prescription[] = prescriptions.map((p: any) => ({
        partitionKey: p.PartitionKey || '',
        rowKey: p.RowKey || '',
        prescriptionNumber: p.prescriptionNumber || '',
        patientId: p.patientId || '',
        patientName: p.patientName || '',
        patientEmail: p.patientEmail || '',
        doctorId: p.doctorId || '',
        doctorName: p.doctorName || '',
        doctorLicense: p.doctorLicense || '',
        clinicName: p.clinicName || '',
        clinicAddress: p.clinicAddress || '',
        clinicPhone: p.clinicPhone || '',
        date: p.date || '',
        diagnosis: p.diagnosis || '',
        medications: typeof p.medications === 'string' ? JSON.parse(p.medications) : (p.medications || []),
        notes: p.notes || '',
        status: p.status || 'active',
        createdAt: p.createdAt || '',
        updatedAt: p.updatedAt || '',
        validUntil: p.validUntil || ''
      }));
      
      // Filter by patient if specified
      if (patientId) {
        return formattedPrescriptions.filter(p => p.patientId === patientId);
      }
      
      return formattedPrescriptions;
    } else if (response.status === 403 || response.status === 404) {
      // Table doesn't exist or authentication failed - return empty array gracefully
      console.warn('⚠️ Prescriptions table not accessible. Please create the table in Azure or update SAS token.');
      console.warn('💡 Table will be created when first prescription is saved.');
      return [];
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to get prescriptions:', response.status, errorText);
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting prescriptions:', error);
    console.warn('💡 Prescriptions feature requires Azure Table Storage setup.');
    return [];
  }
};

// Get single prescription by ID
export const getPrescriptionById = async (partitionKey: string, rowKey: string): Promise<Prescription | null> => {
  try {
    const entityUrl = getEntityUrl(partitionKey, rowKey);
    
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
      const p = await response.json();
      return {
        partitionKey: p.PartitionKey || '',
        rowKey: p.RowKey || '',
        prescriptionNumber: p.prescriptionNumber || '',
        patientId: p.patientId || '',
        patientName: p.patientName || '',
        patientEmail: p.patientEmail || '',
        doctorId: p.doctorId || '',
        doctorName: p.doctorName || '',
        doctorLicense: p.doctorLicense || '',
        clinicName: p.clinicName || '',
        clinicAddress: p.clinicAddress || '',
        clinicPhone: p.clinicPhone || '',
        date: p.date || '',
        diagnosis: p.diagnosis || '',
        medications: typeof p.medications === 'string' ? JSON.parse(p.medications) : (p.medications || []),
        notes: p.notes || '',
        status: p.status || 'active',
        createdAt: p.createdAt || '',
        updatedAt: p.updatedAt || '',
        validUntil: p.validUntil || ''
      };
    } else {
      console.error('❌ Failed to get prescription');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting prescription:', error);
    return null;
  }
};

// Update prescription
export const updatePrescription = async (partitionKey: string, rowKey: string, updates: Partial<Prescription>): Promise<boolean> => {
  try {
    console.log('🔄 Updating prescription...');
    
    const entityUrl = getEntityUrl(partitionKey, rowKey);
    
    const updateData: any = {
      PartitionKey: partitionKey,
      RowKey: rowKey,
      updatedAt: new Date().toISOString()
    };
    
    // Add fields that are being updated
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.diagnosis !== undefined) updateData.diagnosis = updates.diagnosis;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.medications !== undefined) updateData.medications = JSON.stringify(updates.medications);
    if (updates.validUntil !== undefined) updateData.validUntil = updates.validUntil;
    
    const response = await fetch(entityUrl, {
      method: 'MERGE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(updateData),
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      console.log('✅ Prescription updated successfully!');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to update prescription:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating prescription:', error);
    return false;
  }
};

// Delete prescription
export const deletePrescription = async (partitionKey: string, rowKey: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting prescription...');
    
    const entityUrl = getEntityUrl(partitionKey, rowKey);
    
    const response = await fetch(entityUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      console.log('✅ Prescription deleted successfully!');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to delete prescription:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting prescription:', error);
    return false;
  }
};

// Parse prescription from PDF text
// Parse prescription from PDF file
export const parsePrescriptionFromPDFFile = async (file: File): Promise<Partial<Prescription>> => {
  try {
    console.log('📄 Parsing prescription PDF...');
    
    // Dynamically import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Extract text from all pages
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('📝 Extracted PDF text:', fullText.substring(0, 500) + '...');
    
    return parsePrescriptionFromText(fullText);
  } catch (error) {
    console.error('❌ Error parsing PDF:', error);
    alert('Error reading PDF. Please ensure it is a valid prescription document.');
    return {};
  }
};

// Parse prescription from extracted text
export const parsePrescriptionFromText = (text: string): Partial<Prescription> => {
  try {
    console.log('🔍 Analyzing prescription text...');
    
    const parsed: any = {
      medications: [],
      diagnosis: '',
      notes: '',
      doctorName: '',
      doctorLicense: '',
      clinicName: '',
      clinicAddress: '',
      clinicPhone: ''
    };
    
    // Extract Doctor Information
    const doctorPatterns = [
      /Dr\.?\s+([A-Z][a-zA-Z\s\.]+?)(?:\n|License|Reg)/i,
      /Doctor[:\s]+([A-Z][a-zA-Z\s\.]+)/i,
      /Prescriber[:\s]+([A-Z][a-zA-Z\s\.]+)/i
    ];
    
    for (const pattern of doctorPatterns) {
      const match = text.match(pattern);
      if (match && !parsed.doctorName) {
        parsed.doctorName = match[1].trim();
        break;
      }
    }
    
    // Extract License Number
    const licenseMatch = text.match(/License[#\s:]+([A-Z0-9\-]+)/i) || 
                        text.match(/Registration[#\s:]+([A-Z0-9\-]+)/i) ||
                        text.match(/MP[#\s:]*([0-9]+)/i);
    if (licenseMatch) {
      parsed.doctorLicense = licenseMatch[1].trim();
    }
    
    // Extract Clinic/Practice Name
    const clinicMatch = text.match(/(?:Clinic|Practice|Medical Centre|Medical Center)[:\s]*([A-Z][a-zA-Z\s&]+?)(?:\n|Address|Tel|Phone)/i);
    if (clinicMatch) {
      parsed.clinicName = clinicMatch[1].trim();
    }
    
    // Extract Phone Number
    const phoneMatch = text.match(/(?:Tel|Phone|Contact)[:\s]*([\d\s\-\+\(\)]+)/i);
    if (phoneMatch) {
      parsed.clinicPhone = phoneMatch[1].trim();
    }
    
    // Extract Address
    const addressMatch = text.match(/Address[:\s]*([^Tel|Phone|\n]+)/i);
    if (addressMatch) {
      parsed.clinicAddress = addressMatch[1].trim();
    }
    
    // Extract Patient Name
    const patientPatterns = [
      /Patient[:\s]+([A-Z][a-zA-Z\s]+?)(?:\n|DOB|Age|Date)/i,
      /Name[:\s]+([A-Z][a-zA-Z\s]+?)(?:\n|DOB|Age|Date)/i,
      /For[:\s]+([A-Z][a-zA-Z\s]+?)(?:\n|DOB|Age|Date)/i
    ];
    
    for (const pattern of patientPatterns) {
      const match = text.match(pattern);
      if (match && !parsed.patientName) {
        parsed.patientName = match[1].trim();
        break;
      }
    }
    
    // Extract Diagnosis
    const diagnosisPatterns = [
      /Diagnosis[:\s]+(.+?)(?:\n\n|\nRx|\nMedication|\nTreatment|$)/is,
      /Indication[:\s]+(.+?)(?:\n\n|\nRx|\nMedication|\nTreatment|$)/is,
      /Condition[:\s]+(.+?)(?:\n\n|\nRx|\nMedication|\nTreatment|$)/is
    ];
    
    for (const pattern of diagnosisPatterns) {
      const match = text.match(pattern);
      if (match && !parsed.diagnosis) {
        parsed.diagnosis = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }
    
    // Extract Medications with detailed patterns
    const medicationSections = [
      text.match(/(?:Rx|Medication|Treatment|Prescription)[:\s]+([\s\S]+?)(?:\n\n|Notes|Instructions|Signature|$)/i),
      text.match(/(?:Dispense|Prescribed)[:\s]+([\s\S]+?)(?:\n\n|Notes|Instructions|Signature|$)/i)
    ];
    
    for (const section of medicationSections) {
      if (!section) continue;
      
      const medText = section[1];
      const lines = medText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      for (const line of lines) {
        // Pattern 1: "Medication Name 500mg - Take 1 tablet twice daily for 7 days"
        const pattern1 = /([A-Z][a-zA-Z\s]+?)\s+(\d+\s*(?:mg|mcg|ml|g))\s*[-–]\s*(?:Take|Use)?\s*(\d+)\s*(?:tablet|capsule|ml)s?\s+(.*?)(?:for\s+(\d+)\s*days?)?/i;
        const match1 = line.match(pattern1);
        
        if (match1) {
          parsed.medications.push({
            medicationName: match1[1].trim(),
            dosage: match1[2].trim(),
            quantity: 30,
            frequency: match1[4].trim(),
            duration: match1[5] ? `${match1[5]} days` : '30 days',
            refills: 0
          });
          continue;
        }
        
        // Pattern 2: "Amoxicillin 500mg, 1 tab tid x 7d"
        const pattern2 = /([A-Z][a-zA-Z]+)\s+(\d+\s*(?:mg|mcg|ml|g)),?\s+(\d+)\s+(?:tab|cap|ml)\s+(.*?)(?:x\s*(\d+)d)?/i;
        const match2 = line.match(pattern2);
        
        if (match2) {
          parsed.medications.push({
            medicationName: match2[1].trim(),
            dosage: match2[2].trim(),
            quantity: 30,
            frequency: match2[4].trim(),
            duration: match2[5] ? `${match2[5]} days` : '30 days',
            refills: 0
          });
        }
      }
    }
    
    // Extract Notes/Instructions
    const notesMatch = text.match(/(?:Notes|Instructions|Remarks)[:\s]+(.+?)(?:\n\n|Signature|Doctor|Date|$)/is);
    if (notesMatch) {
      parsed.notes = notesMatch[1].trim().replace(/\s+/g, ' ');
    }
    
    console.log('✅ Parsed prescription data:', parsed);
    console.log(`📋 Found ${parsed.medications.length} medications`);
    
    if (parsed.medications.length === 0) {
      console.warn('⚠️ No medications extracted. PDF may not be in standard prescription format.');
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Error parsing prescription text:', error);
    return {};
  }
};

// Legacy function for backward compatibility
export const parsePrescriptionFromPDF = parsePrescriptionFromText;

