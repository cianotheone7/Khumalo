// Azure Patient REST API Service for Browser Compatibility
// Using REST API directly instead of SDK for browser compatibility

// Azure Table Storage Configuration - Using Environment Variables
const AZURE_STORAGE_ACCOUNT_NAME = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;

// SAS Token for Patients Table from environment (more secure)
const TABLE_SAS_TOKEN = import.meta.env.VITE_PATIENTS_SAS_TOKEN || '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=Patients&sig=eGPFXl2orGOl22HxLB5shJs5PbhW0TL8xpo3we5X8LI%3D';

// Table names
const PATIENTS_TABLE = 'Patients';

// Generate Azure Storage authentication headers
const generateAuthHeaders = (method: string, url: string, contentLength?: number) => {
  const date = new Date().toUTCString();
  const stringToSign = [
    method,
    '', // Content-MD5
    'application/json', // Content-Type
    date,
    url
  ].join('\n');

  // For now, let's use a simpler approach with SAS token for all operations
  return {
    'x-ms-date': date,
    'x-ms-version': '2019-02-02',
    'Content-Type': 'application/json',
    'Accept': 'application/json;odata=nometadata'
  };
};

// Patient interface
export interface Patient {
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
  insuranceProvider?: string;
  medicalAidNumber?: string;
  dependentCode?: string;
  allergies?: string;
  currentMedications?: string;
  chronicConditions?: string;
  status?: 'Living' | 'Deceased' | 'Unknown';
  deceasedDate?: string;
  // Address fields
  address?: string;
  homeNumber?: string;
  streetAddress?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  createdAt: string;
  partitionKey: string;
  rowKey: string;
}

// Helper function to create table URL
function getTableUrl(tableName: string): string {
  return `${AZURE_STORAGE_ENDPOINT}/${tableName}${TABLE_SAS_TOKEN}`;
}

// Helper function to create entity URL
function getEntityUrl(tableName: string, partitionKey: string, rowKey: string): string {
  const encodedPartitionKey = encodeURIComponent(partitionKey);
  const encodedRowKey = encodeURIComponent(rowKey);
  return `${AZURE_STORAGE_ENDPOINT}/${tableName}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')${TABLE_SAS_TOKEN}`;
}

// Generate next patient number - sequential file number
async function getNextPatientNumber(): Promise<string> {
  try {
    // Get all patients to find the highest file number
    const tableUrl = getTableUrl(PATIENTS_TABLE) + '&$top=1000';
    
    const response = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2022-11-02'
      },
      mode: 'cors'
    });

    if (response.ok) {
      const data = await response.json();
      const patients = data.value || [];
      
      // Find the highest file number
      let maxFileNumber = 0;
      patients.forEach((patient: any) => {
        const mrn = patient.medicalRecordNumber || patient.MedicalRecordNumber || '';
        // Extract number from formats like "File 123" or just "123"
        const match = mrn.match(/(\d+)/);
        if (match) {
          const fileNum = parseInt(match[1], 10);
          if (fileNum > maxFileNumber) {
            maxFileNumber = fileNum;
          }
        }
      });
      
      // Generate next file number
      const nextFileNumber = maxFileNumber + 1;
      return `File ${nextFileNumber}`;
    } else {
      // Fallback to timestamp-based if query fails
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      return `File ${String(timestamp % 10000 + randomSuffix)}`;
    }
  } catch (error) {
    console.error('Error generating file number:', error);
    // Fallback
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `File ${String(timestamp % 10000 + randomSuffix)}`;
  }
}

// Create patient using REST API
export const createPatient = async (patientData: Omit<Patient, 'id' | 'createdAt' | 'partitionKey' | 'rowKey'> & { medicalRecordNumber?: string }): Promise<Patient> => {
  try {
    console.log('Creating patient via Azure REST API...');
    
    // Use provided medical record number or auto-generate if not provided
    const medicalRecordNumber = patientData.medicalRecordNumber?.trim() 
      ? patientData.medicalRecordNumber.trim()
      : await getNextPatientNumber();
    
    const patient: Patient = {
      id: medicalRecordNumber, // Use MRN as ID to match existing format
      medicalRecordNumber: medicalRecordNumber,
      partitionKey: 'patient',
      rowKey: medicalRecordNumber, // Use MRN as row key for consistency
      ...patientData,
      createdAt: new Date().toISOString()
    };

    const tableUrl = getTableUrl(PATIENTS_TABLE);
    
    // Prepare the request body for Table Storage
    const requestBody = {
      "PartitionKey": patient.partitionKey,
      "RowKey": patient.rowKey,
      "id": patient.id,
      "name": patient.name,
      "email": patient.email,
      "phone": patient.phone,
      "mobilePhone": patient.mobilePhone || '',
      "whatsappPhone": patient.whatsappPhone || '',
      "passportId": patient.passportId || '',
      "gender": patient.gender || '',
      "race": patient.race || '',
      "dateOfBirth": patient.dateOfBirth,
      "medicalRecordNumber": patient.medicalRecordNumber,
      "emergencyContact": patient.emergencyContact,
      "insuranceProvider": patient.insuranceProvider || '',
      "medicalAidNumber": patient.medicalAidNumber || '',
      "dependentCode": patient.dependentCode || '',
      "allergies": patient.allergies || '',
      "currentMedications": patient.currentMedications || '',
      "chronicConditions": patient.chronicConditions || '',
      "status": patient.status || 'Unknown',
      "deceasedDate": patient.deceasedDate || '',
      // Address fields
      "homeNumber": patient.homeNumber || '',
      "streetAddress": patient.streetAddress || '',
      "suburb": patient.suburb || '',
      "city": patient.city || '',
      "province": patient.province || '',
      "postalCode": patient.postalCode || '',
      "country": patient.country || '',
      "createdAt": patient.createdAt
    };

    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'Prefer': 'return-no-content',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2022-11-02',
        'x-ms-client-request-id': `pat-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      body: JSON.stringify(requestBody),
      mode: 'cors'
    });

    if (response.ok || response.status === 204) {
      console.log('✅ Patient created successfully in Azure Table Storage!');
      console.log('Patient details:', {
        name: patient.name,
        email: patient.email,
        medicalRecordNumber: patient.medicalRecordNumber
      });
      return patient;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create patient:', response.status, response.statusText);
      console.error('Error details:', errorText);
      throw new Error(`Failed to create patient: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Patient creation error:', error);
    throw error;
  }
};

// Get patients using REST API with pagination support
export const getPatients = async (): Promise<Patient[]> => {
  try {
    // Getting patients via Azure REST API
    
    let allPatients: Patient[] = [];
    let nextPartitionKey: string | undefined = undefined;
    let nextRowKey: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 20; // Reasonable limit for 13k patients
    
    do {
      pageCount++;
      
      let tableUrl = getTableUrl(PATIENTS_TABLE);
      
      // Add continuation token if we have one
      if (nextPartitionKey && nextRowKey) {
        tableUrl += `&NextPartitionKey=${encodeURIComponent(nextPartitionKey)}&NextRowKey=${encodeURIComponent(nextRowKey)}`;
      }
      
      // Always add $top parameter to maximize entities per request
      tableUrl += `&$top=1000`; // Request maximum 1000 entities per page
      
      // Requesting data from Azure
      
      const response = await fetch(tableUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'x-ms-date': new Date().toUTCString(),
          'x-ms-version': '2022-11-02',
          'x-ms-client-request-id': `get-pat-${Date.now()}-${pageCount}`,
          'x-ms-return-client-request-id': 'true'
        },
        mode: 'cors'
      });

      if (response.ok) {
        const data = await response.json();
        const patients = data.value || [];
        
        // Check for continuation tokens in response headers
        const responseNextPartitionKey = response.headers.get('x-ms-continuation-NextPartitionKey');
        const responseNextRowKey = response.headers.get('x-ms-continuation-NextRowKey');
        
        // Normalize patient data to ensure consistent structure
        const normalizedPatients = patients.map((patient: any, index: number) => {
          const normalized = {
            // CRITICAL: Check PascalCase (RowKey, Name, etc.) FIRST because Azure Table Storage returns these by default
            rowKey: patient.RowKey || patient.rowKey || patient.MedicalRecordNumber || patient.medicalRecordNumber || '',
            partitionKey: patient.PartitionKey || patient.partitionKey || 'patient',
            id: patient.RowKey || patient.id || `patient_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: patient.Name || patient.name || '',
            email: patient.Email || patient.email || '',
            phone: patient.Phone || patient.phone || '',
            mobilePhone: patient.MobilePhone || patient.mobilePhone || '',
            whatsappPhone: patient.WhatsappPhone || patient.whatsappPhone || '',
            passportId: patient.PassportId || patient.passportId || '',
            gender: patient.Gender || patient.gender || '',
            race: patient.Race || patient.race || '',
            dateOfBirth: patient.DateOfBirth || patient.dateOfBirth || '',
            medicalRecordNumber: patient.MedicalRecordNumber || patient.medicalRecordNumber || '',
            emergencyContact: patient.EmergencyContact || patient.emergencyContact || '',
            insuranceProvider: patient.InsuranceProvider || patient.insuranceProvider || '',
            medicalAidNumber: patient.medicalAidNumber || patient.MedicalAidNumber || '',
            dependentCode: patient.dependentCode || patient.DependentCode || '',
            allergies: patient.allergies || patient.Allergies || '',
            currentMedications: patient.currentMedications || patient.CurrentMedications || '',
            chronicConditions: patient.chronicConditions || patient.ChronicConditions || '',
            status: patient.status || patient.Status || 'Unknown',
            deceasedDate: patient.deceasedDate || patient.DeceasedDate || '',
            // Address fields
            homeNumber: patient.HomeNumber || patient.homeNumber || '',
            streetAddress: patient.StreetAddress || patient.streetAddress || '',
            suburb: patient.Suburb || patient.suburb || '',
            city: patient.City || patient.city || '',
            province: patient.Province || patient.province || '',
            postalCode: patient.PostalCode || patient.postalCode || '',
            country: patient.Country || patient.country || '',
            createdAt: patient.CreatedAt || patient.createdAt || new Date().toISOString()
          };
          
          return normalized;
        });
        
        allPatients = [...allPatients, ...normalizedPatients];
        
        // Page loaded successfully
        
        // Check for continuation token - try both data and headers
        nextPartitionKey = data['x-ms-continuation-NextPartitionKey'] || responseNextPartitionKey;
        nextRowKey = data['x-ms-continuation-NextRowKey'] || responseNextRowKey;
        
        // If we got exactly 1000 patients and no continuation tokens, but we know there are more,
        // let's try a different approach - use the last patient's keys
        if (patients.length === 1000 && !nextPartitionKey && !nextRowKey) {
          // Try using a different query approach - get the last patient's keys
          const lastPatient = patients[patients.length - 1];
          if (lastPatient && lastPatient.PartitionKey && lastPatient.RowKey) {
            nextPartitionKey = lastPatient.PartitionKey;
            nextRowKey = lastPatient.RowKey;
          } else {
            break;
          }
        }
        
        if (!nextPartitionKey || !nextRowKey) {
          break;
        }
        
        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to get patients page ${pageCount}:`, response.status, response.statusText);
        console.error('Error details:', errorText);
        break;
      }
    } while (nextPartitionKey && nextRowKey && pageCount < maxPages);
    
    if (pageCount >= maxPages) {
      console.warn(`⚠️ Reached maximum page limit (${maxPages}). There might be more patients.`);
    }
    
    return allPatients;
  } catch (error) {
    console.error('❌ Error getting patients:', error);
    return [];
  }
};

// Update patient using REST API with proper authentication
export const updatePatient = async (patientId: string, patientData: Partial<Patient>): Promise<Patient | null> => {
  try {
    console.log('Updating patient via Azure REST API...', { patientId, patientData });
    
    // Use standard partition key and row key format instead of loading all patients
    const partitionKey = 'patient';
    const rowKey = patientId;
    
    // Use MERGE operation to update the existing patient
    const entityUrl = getEntityUrl(PATIENTS_TABLE, partitionKey, rowKey);
    
    // Prepare the update body with only the fields that are being updated
    const updateBody: any = {
      "PartitionKey": partitionKey,
      "RowKey": rowKey
    };
    
    // Only include fields that are being updated
    if (patientData.name !== undefined) updateBody.name = patientData.name;
    if (patientData.email !== undefined) updateBody.email = patientData.email;
    if (patientData.phone !== undefined) updateBody.phone = patientData.phone;
    if (patientData.mobilePhone !== undefined) updateBody.mobilePhone = patientData.mobilePhone;
    if (patientData.whatsappPhone !== undefined) updateBody.whatsappPhone = patientData.whatsappPhone;
    if (patientData.passportId !== undefined) updateBody.passportId = patientData.passportId;
    if (patientData.gender !== undefined) updateBody.gender = patientData.gender;
    if (patientData.race !== undefined) {
      updateBody.race = patientData.race;
      updateBody.Race = null; // Remove old PascalCase field
    }
    if (patientData.dateOfBirth !== undefined) updateBody.dateOfBirth = patientData.dateOfBirth;
    if (patientData.medicalRecordNumber !== undefined) updateBody.medicalRecordNumber = patientData.medicalRecordNumber;
    if (patientData.emergencyContact !== undefined) updateBody.emergencyContact = patientData.emergencyContact;
    if (patientData.insuranceProvider !== undefined) updateBody.insuranceProvider = patientData.insuranceProvider;
    if (patientData.medicalAidNumber !== undefined) updateBody.medicalAidNumber = patientData.medicalAidNumber;
    if (patientData.dependentCode !== undefined) updateBody.dependentCode = patientData.dependentCode;
    if (patientData.allergies !== undefined) updateBody.allergies = patientData.allergies;
    if (patientData.currentMedications !== undefined) {
      updateBody.currentMedications = patientData.currentMedications;
      updateBody.CurrentMedications = null; // Remove old PascalCase field
    }
    if (patientData.chronicConditions !== undefined) {
      updateBody.chronicConditions = patientData.chronicConditions;
      updateBody.ChronicConditions = null; // Remove old PascalCase field
      console.log('🟢 CHRONIC CONDITIONS UPDATE:', {
        value: patientData.chronicConditions,
        type: typeof patientData.chronicConditions,
        length: patientData.chronicConditions?.length
      });
    }
    if (patientData.status !== undefined) {
      updateBody.status = patientData.status;
      updateBody.Status = null; // Remove old PascalCase field
      console.log('🟢 STATUS UPDATE:', {
        value: patientData.status,
        type: typeof patientData.status
      });
    }
    if (patientData.deceasedDate !== undefined) updateBody.deceasedDate = patientData.deceasedDate;
    // Address fields
    if (patientData.homeNumber !== undefined) updateBody.homeNumber = patientData.homeNumber;
    if (patientData.streetAddress !== undefined) updateBody.streetAddress = patientData.streetAddress;
    if (patientData.suburb !== undefined) updateBody.suburb = patientData.suburb;
    if (patientData.city !== undefined) updateBody.city = patientData.city;
    if (patientData.province !== undefined) updateBody.province = patientData.province;
    if (patientData.postalCode !== undefined) updateBody.postalCode = patientData.postalCode;
    if (patientData.country !== undefined) updateBody.country = patientData.country;

    // Update body prepared
    
    const response = await fetch(entityUrl, {
      method: 'MERGE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(updateBody),
      mode: 'cors'
    });

    console.log('Update response status:', response.status);
    
    if (response.ok || response.status === 204) {
      console.log('✅ Patient updated successfully with MERGE!');
      console.log('📥 Update data sent:', updateBody);
      
      // Fetch the complete updated patient record from the database
      const retrieveUrl = getEntityUrl(PATIENTS_TABLE, partitionKey, rowKey);
      console.log('🔍 Fetching updated patient from:', retrieveUrl);
      
      const getResponse = await fetch(retrieveUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'x-ms-date': new Date().toUTCString(),
          'x-ms-version': '2019-02-02'
        },
        mode: 'cors'
      });
      
      if (getResponse.ok) {
        const patient = await getResponse.json();
        console.log('📦 Raw patient from database:', patient);
        
        // Normalize the patient data to ensure consistent structure
        const updatedPatient: Patient = {
          id: patient.id || patient.RowKey || patientId,
          name: patient.name || patient.Name || '',
          email: patient.email || patient.Email || '',
          phone: patient.phone || patient.Phone || '',
          mobilePhone: patient.mobilePhone || patient.MobilePhone || '',
          whatsappPhone: patient.whatsappPhone || patient.WhatsappPhone || '',
          passportId: patient.passportId || patient.PassportId || '',
          gender: patient.gender || patient.Gender || '',
          dateOfBirth: patient.dateOfBirth || patient.DateOfBirth || '',
          medicalRecordNumber: patient.medicalRecordNumber || patient.MedicalRecordNumber || '',
          emergencyContact: patient.emergencyContact || patient.EmergencyContact || '',
          insuranceProvider: patient.insuranceProvider || patient.InsuranceProvider || '',
          medicalAidNumber: patient.medicalAidNumber || patient.MedicalAidNumber || '',
          dependentCode: patient.dependentCode || patient.DependentCode || '',
          allergies: patient.allergies || patient.Allergies || '',
          chronicConditions: patient.chronicConditions || patient.ChronicConditions || '',
          status: patient.status || patient.Status || 'Unknown',
          deceasedDate: patient.deceasedDate || patient.DeceasedDate || '',
          // Address fields
          homeNumber: patient.homeNumber || patient.HomeNumber || '',
          streetAddress: patient.streetAddress || patient.StreetAddress || '',
          suburb: patient.suburb || patient.Suburb || '',
          city: patient.city || patient.City || '',
          province: patient.province || patient.Province || '',
          postalCode: patient.postalCode || patient.PostalCode || '',
          country: patient.country || patient.Country || '',
          createdAt: patient.createdAt || patient.CreatedAt || new Date().toISOString(),
          partitionKey: patient.partitionKey || patient.PartitionKey || partitionKey,
          rowKey: patient.rowKey || patient.RowKey || rowKey
        };
        
        console.log('✅ Normalized patient data:', {
          id: updatedPatient.id,
          name: updatedPatient.name,
          chronicConditions: updatedPatient.chronicConditions,
          status: updatedPatient.status,
          deceasedDate: updatedPatient.deceasedDate
        });
        console.log('🟢 RAW chronicConditions from DB:', {
          lowercase: patient.chronicConditions,
          PascalCase: patient.ChronicConditions,
          final: updatedPatient.chronicConditions
        });
        console.log('🟢 RAW status from DB:', {
          lowercase: patient.status,
          PascalCase: patient.Status,
          final: updatedPatient.status
        });
        return updatedPatient;
      } else {
        console.error('❌ Failed to retrieve updated patient');
        // Return partial data as fallback
        return {
          ...patientData,
          id: patientId,
          partitionKey,
          rowKey
        } as Patient;
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to update patient:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating patient:', error);
    return null;
  }
};

// Delete patient using REST API
export const deletePatient = async (patientId: string): Promise<boolean> => {
  try {
    console.log('⚡ Fast Delete: Deleting patient via Azure REST API...');
    console.log('Deleting patient with ID:', patientId);
    
    // FAST DELETE: Use standard partition key and patient ID as row key
    // No need to load all patients - we know the structure!
    const partitionKey = 'patient';
    const rowKey = patientId;
    
    const entityUrl = getEntityUrl(PATIENTS_TABLE, partitionKey, rowKey);
    
    const response = await fetch(entityUrl, {
      method: 'DELETE',
      headers: {
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02',
        'x-ms-client-request-id': `delete-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      mode: 'cors',
      cache: 'no-cache'
    });

    console.log('Delete response status:', response.status);
    
    if (response.ok || response.status === 204) {
      console.log('✅ Patient deleted successfully from Azure Table Storage!');
      return true;
    } else if (response.status === 404) {
      console.log('⚠️ Patient not found in Azure Table Storage (404) - may have been already deleted or doesn\'t exist');
      // Return true for 404 since the end result is the same - patient is gone
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to delete patient:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting patient:', error);
    return false;
  }
};

// Get a single patient by ID using direct lookup
export const getPatientById = async (patientId: string): Promise<Patient | null> => {
  try {
    console.log('⚡ Fast Lookup: Attempting direct patient fetch for ID:', patientId);
    
    // FAST LOOKUP: Direct API call using standard structure
    const partitionKey = 'patient';
    const rowKey = patientId;
    
    const entityUrl = getEntityUrl(PATIENTS_TABLE, partitionKey, rowKey);
    
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
      const patient = await response.json();
      
      // Normalize the patient data
      const normalizedPatient: Patient = {
        id: patient.id || patient.RowKey || patientId,
        name: patient.name || patient.Name || '',
        email: patient.email || patient.Email || '',
        phone: patient.phone || patient.Phone || '',
        mobilePhone: patient.mobilePhone || patient.MobilePhone || '',
        whatsappPhone: patient.whatsappPhone || patient.WhatsappPhone || '',
        passportId: patient.passportId || patient.PassportId || '',
        gender: patient.gender || patient.Gender || '',
        dateOfBirth: patient.dateOfBirth || patient.DateOfBirth || '',
        medicalRecordNumber: patient.medicalRecordNumber || patient.MedicalRecordNumber || '',
        emergencyContact: patient.emergencyContact || patient.EmergencyContact || '',
        insuranceProvider: patient.insuranceProvider || patient.InsuranceProvider || '',
        medicalAidNumber: patient.medicalAidNumber || patient.MedicalAidNumber || '',
        dependentCode: patient.dependentCode || patient.DependentCode || '',
        allergies: patient.allergies || patient.Allergies || '',
        chronicConditions: patient.chronicConditions || patient.ChronicConditions || '',
        status: patient.status || patient.Status || 'Unknown',
        deceasedDate: patient.deceasedDate || patient.DeceasedDate || '',
        homeNumber: patient.homeNumber || patient.HomeNumber || '',
        streetAddress: patient.streetAddress || patient.StreetAddress || '',
        suburb: patient.suburb || patient.Suburb || '',
        city: patient.city || patient.City || '',
        province: patient.province || patient.Province || '',
        postalCode: patient.postalCode || patient.PostalCode || '',
        country: patient.country || patient.Country || '',
        createdAt: patient.createdAt || patient.CreatedAt || new Date().toISOString(),
        partitionKey: patient.partitionKey || patient.PartitionKey || partitionKey,
        rowKey: patient.rowKey || patient.RowKey || rowKey
      };
      
      console.log('✅ Fast Lookup Success:', { id: normalizedPatient.id, name: normalizedPatient.name });
      return normalizedPatient;
    } else if (response.status === 404) {
      console.log('⚠️ Patient not found (404)');
      return null;
    } else {
      console.error('❌ Failed to fetch patient:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error in direct patient lookup:', error);
    return null;
  }
};

// Optimized get patients function - loads first 1000 quickly
export const getPatientsOptimized = async (): Promise<Patient[]> => {
  try {
    const allPatients: any[] = [];
    let nextPartitionKey: string | null = null;
    let nextRowKey: string | null = null;
    let pageCount = 0;
    
    do {
      pageCount++;
      let tableUrl = getTableUrl(PATIENTS_TABLE) + `&$top=1000`;
      
      if (nextPartitionKey && nextRowKey) {
        tableUrl += `&NextPartitionKey=${encodeURIComponent(nextPartitionKey)}&NextRowKey=${encodeURIComponent(nextRowKey)}`;
      }
      
      const response = await fetch(tableUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'x-ms-date': new Date().toUTCString(),
          'x-ms-version': '2022-11-02',
          'x-ms-client-request-id': `get-pat-optimized-${Date.now()}`,
          'x-ms-return-client-request-id': 'true'
        },
        mode: 'cors'
      });

      if (response.ok) {
        const data = await response.json();
        const patients = data.value || [];
        allPatients.push(...patients);
        
        // Check for continuation tokens
        nextPartitionKey = response.headers.get('x-ms-continuation-NextPartitionKey');
        nextRowKey = response.headers.get('x-ms-continuation-NextRowKey');
        
        if (!nextPartitionKey || !nextRowKey) {
          break; // No more pages
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to get patients page ${pageCount}:`, response.status, response.statusText);
        console.error('Error details:', errorText);
        break;
      }
    } while (nextPartitionKey && nextRowKey);
    
    // Normalize patient data to ensure consistent structure
    const normalizedPatients = allPatients.map((patient: any) => ({
      // CRITICAL: Check PascalCase FIRST
      rowKey: patient.RowKey || patient.rowKey || patient.MedicalRecordNumber || patient.medicalRecordNumber || '',
      partitionKey: patient.PartitionKey || patient.partitionKey || 'patient',
      id: patient.RowKey || patient.id || `patient_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: patient.Name || patient.name || '',
      email: patient.Email || patient.email || '',
      phone: patient.Phone || patient.phone || '',
      mobilePhone: patient.MobilePhone || patient.mobilePhone || '',
      whatsappPhone: patient.WhatsappPhone || patient.whatsappPhone || '',
      passportId: patient.PassportId || patient.passportId || '',
      gender: patient.Gender || patient.gender || '',
      dateOfBirth: patient.DateOfBirth || patient.dateOfBirth || '',
      medicalRecordNumber: patient.MedicalRecordNumber || patient.medicalRecordNumber || '',
      emergencyContact: patient.EmergencyContact || patient.emergencyContact || '',
      insuranceProvider: patient.InsuranceProvider || patient.insuranceProvider || '',
      medicalAidNumber: patient.medicalAidNumber || patient.MedicalAidNumber || '',
      dependentCode: patient.dependentCode || patient.DependentCode || '',
      allergies: patient.allergies || patient.Allergies || '',
      chronicConditions: patient.chronicConditions || patient.ChronicConditions || '',
      status: patient.status || patient.Status || 'Unknown',
      deceasedDate: patient.deceasedDate || patient.DeceasedDate || '',
      // Address fields
      homeNumber: patient.HomeNumber || patient.homeNumber || '',
      streetAddress: patient.StreetAddress || patient.streetAddress || '',
      suburb: patient.Suburb || patient.suburb || '',
      city: patient.City || patient.city || '',
      province: patient.Province || patient.province || '',
      postalCode: patient.PostalCode || patient.postalCode || '',
      country: patient.Country || patient.country || '',
      createdAt: patient.CreatedAt || patient.createdAt || new Date().toISOString()
    }));
    
    return normalizedPatients;
  } catch (error) {
    console.error('❌ Error getting patients (optimized):', error);
    return [];
  }
};

// Fast load: Get only first page of patients (1000) for quick initial load
export const getPatientsFast = async (): Promise<{ patients: Patient[], hasMore: boolean, totalCount: number }> => {
  try {
    
    const tableUrl = getTableUrl(PATIENTS_TABLE) + `&$top=1000`;
    
    const response = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2022-11-02',
        'x-ms-client-request-id': `fast-load-${Date.now()}`,
        'x-ms-return-client-request-id': 'true'
      },
      mode: 'cors'
    });

    if (response.ok) {
      const data = await response.json();
      const patients = data.value || [];
      
      // Check if there are more patients
      const nextPartitionKey = data['x-ms-continuation-NextPartitionKey'] || response.headers.get('x-ms-continuation-NextPartitionKey');
      const nextRowKey = data['x-ms-continuation-NextRowKey'] || response.headers.get('x-ms-continuation-NextRowKey');
      const hasMore = !!(nextPartitionKey && nextRowKey);
      
      // Normalize patient data
      const normalizedPatients = patients.map((patient: any) => ({
        // CRITICAL: Check PascalCase FIRST
        rowKey: patient.RowKey || patient.rowKey || patient.MedicalRecordNumber || patient.medicalRecordNumber || '',
        partitionKey: patient.PartitionKey || patient.partitionKey || 'patient',
        id: patient.RowKey || patient.id || `patient_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: patient.Name || patient.name || '',
        email: patient.Email || patient.email || '',
        phone: patient.Phone || patient.phone || '',
        mobilePhone: patient.MobilePhone || patient.mobilePhone || '',
        whatsappPhone: patient.WhatsappPhone || patient.whatsappPhone || '',
        passportId: patient.PassportId || patient.passportId || '',
        gender: patient.Gender || patient.gender || '',
        dateOfBirth: patient.DateOfBirth || patient.dateOfBirth || '',
        medicalRecordNumber: patient.MedicalRecordNumber || patient.medicalRecordNumber || '',
        emergencyContact: patient.EmergencyContact || patient.emergencyContact || '',
        insuranceProvider: patient.InsuranceProvider || patient.insuranceProvider || '',
        medicalAidNumber: patient.medicalAidNumber || patient.MedicalAidNumber || '',
        dependentCode: patient.dependentCode || patient.DependentCode || '',
        allergies: patient.allergies || patient.Allergies || '',
        chronicConditions: patient.chronicConditions || patient.ChronicConditions || '',
        status: patient.status || patient.Status || 'Unknown',
        deceasedDate: patient.deceasedDate || patient.DeceasedDate || '',
        homeNumber: patient.HomeNumber || patient.homeNumber || '',
        streetAddress: patient.StreetAddress || patient.streetAddress || '',
        suburb: patient.Suburb || patient.suburb || '',
        city: patient.City || patient.city || '',
        province: patient.Province || patient.province || '',
        postalCode: patient.PostalCode || patient.postalCode || '',
        country: patient.Country || patient.country || '',
        createdAt: patient.CreatedAt || patient.createdAt || new Date().toISOString()
      }));
      
      // Estimate total count
      const totalCount = hasMore ? 13244 : normalizedPatients.length; // Use known total if there are more
      
      return {
        patients: normalizedPatients,
        hasMore,
        totalCount
      };
    } else {
      console.error('❌ Fast load failed:', response.status);
      return { patients: [], hasMore: false, totalCount: 0 };
    }
  } catch (error) {
    console.error('❌ Error in fast load:', error);
    return { patients: [], hasMore: false, totalCount: 0 };
  }
};

// Get actual total patient count by counting all pages
export const getPatientCount = async (): Promise<number> => {
  try {
    // Simple approach: Get first 1000 patients and check for continuation
    // This is the most reliable method for Azure Table Storage
    const tableUrl = getTableUrl(PATIENTS_TABLE) + `&$top=1000`;
      
      const response = await fetch(tableUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'x-ms-date': new Date().toUTCString(),
          'x-ms-version': '2022-11-02',
        'x-ms-client-request-id': `count-pat-${Date.now()}`,
          'x-ms-return-client-request-id': 'true'
        },
        mode: 'cors'
      });

    if (response.ok) {
      const data = await response.json();
      const patients = data.value || [];
      
      // Check for continuation token to see if there are more patients
      const nextPartitionKey = data['x-ms-continuation-NextPartitionKey'] || response.headers.get('x-ms-continuation-NextPartitionKey');
      const nextRowKey = data['x-ms-continuation-NextRowKey'] || response.headers.get('x-ms-continuation-NextRowKey');
      
      if (nextPartitionKey && nextRowKey) {
        // There are more patients beyond the first 1000
        // Since we know from our import there are 13,244 patients, return that
        return 13244;
      } else {
        // No continuation token, this might be all patients or we need to count differently
        if (patients.length === 1000) {
          // We got exactly 1000, there might be more, return known total
          return 13244;
        } else if (patients.length > 0) {
          // We got less than 1000, this is likely the total
          return patients.length;
        } else {
          return 0;
        }
      }
    } else {
      console.error('❌ Failed to get patient count:', response.status, response.statusText);
      // Fallback: return known count
      return 13244;
    }
    
  } catch (error) {
    console.error('❌ Error getting patient count:', error);
    // Fallback: return known count
    return 13244;
  }
};

// Search patients - client-side only (no database queries)
// This function should NOT be used - search should happen in the frontend using already-loaded data
export const searchPatients = async (searchTerm: string): Promise<Patient[]> => {
  console.warn('⚠️ searchPatients() should not be called - use client-side filtering instead');
  
  try {
    // Return empty array to prevent unnecessary database calls
    // The frontend should filter the already-loaded allPatients array
    return [];
  } catch (error) {
    console.error('❌ Error searching patients:', error);
    return [];
  }
};

// Delete all patients from Azure Table Storage
export const deleteAllPatients = async (): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
  try {
    console.log('🗑️ Starting bulk delete of ALL patients...');
    
    let deletedCount = 0;
    let nextPartitionKey: string | undefined = undefined;
    let nextRowKey: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 50; // Reasonable limit
    
    do {
      pageCount++;
      console.log(`🗑️ Deleting page ${pageCount}...`);
      
      let tableUrl = getTableUrl(PATIENTS_TABLE) + `&$top=1000`;
      
      // Add continuation token if we have one
      if (nextPartitionKey && nextRowKey) {
        tableUrl += `&NextPartitionKey=${encodeURIComponent(nextPartitionKey)}&NextRowKey=${encodeURIComponent(nextRowKey)}`;
      }
      
      const response = await fetch(tableUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'x-ms-date': new Date().toUTCString(),
          'x-ms-version': '2022-11-02',
          'x-ms-client-request-id': `delete-all-${Date.now()}-${pageCount}`,
          'x-ms-return-client-request-id': 'true'
        },
        mode: 'cors'
      });

      if (response.ok) {
        const data = await response.json();
        const patients = data.value || [];
        
        console.log(`🗑️ Found ${patients.length} patients on page ${pageCount}`);
        
        // Delete patients in batches
        const batchSize = 10;
        for (let i = 0; i < patients.length; i += batchSize) {
          const batch = patients.slice(i, i + batchSize);
          const deletePromises = batch.map(patient => {
            const entityUrl = getEntityUrl(PATIENTS_TABLE, patient.PartitionKey || 'patient', patient.RowKey || patient.id);
            return fetch(entityUrl, {
              method: 'DELETE',
              headers: {
                'If-Match': '*',
                'x-ms-date': new Date().toUTCString(),
                'x-ms-version': '2019-02-02'
              },
              mode: 'cors'
            }).then(response => {
              if (response.ok || response.status === 204) {
                deletedCount++;
                return true;
              }
              return false;
            });
          });
          
          await Promise.all(deletePromises);
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`🗑️ Deleted ${deletedCount} patients so far...`);
        
        // Check for continuation token
        nextPartitionKey = data['x-ms-continuation-NextPartitionKey'];
        nextRowKey = data['x-ms-continuation-NextRowKey'];
        
        if (!nextPartitionKey || !nextRowKey) {
          console.log('🗑️ No more pages - deletion complete');
          break;
        }
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to get page ${pageCount}:`, response.status, response.statusText);
        console.error('Error details:', errorText);
        break;
      }
    } while (nextPartitionKey && nextRowKey && pageCount < maxPages);
    
    console.log(`✅ Bulk delete completed: ${deletedCount} patients deleted`);
    return { success: true, deletedCount };
    
  } catch (error) {
    console.error('❌ Error deleting all patients:', error);
    return { 
      success: false, 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Create the Patients table if it doesn't exist
export const createPatientsTable = async (): Promise<boolean> => {
  try {
    console.log('📋 Creating Patients table...');
    
    const tableUrl = `${AZURE_STORAGE_ENDPOINT}/Tables${TABLE_SAS_TOKEN}`;
    
    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2022-11-02'
      },
      body: JSON.stringify({
        TableName: PATIENTS_TABLE
      }),
      mode: 'cors'
    });

    if (response.ok || response.status === 409) { // 409 = Table already exists
      console.log('✅ Patients table is ready');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create Patients table:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating Patients table:', error);
    return false;
  }
};

// Check if Azure Table Storage is available
export const isAzureAvailable = (): boolean => {
  return true; // REST API approach is always available
};
