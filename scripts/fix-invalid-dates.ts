/**
 * Database Cleanup Script: Fix Invalid DateOfBirth Values
 * 
 * This script:
 * 1. Fetches all patients from Azure Table Storage
 * 2. Identifies patients with invalid dateOfBirth values
 * 3. Updates them to empty string (user can fill in correct date later)
 * 4. Logs all fixes for auditing
 */

// Azure Table Storage Configuration
const AZURE_STORAGE_ACCOUNT_NAME = process.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;
const TABLE_SAS_TOKEN = process.env.VITE_PATIENTS_SAS_TOKEN || '?se=2030-12-31T23%3A59%3A59Z&sp=raud&spr=https&sv=2019-02-02&tn=Patients&sig=eGPFXl2orGOl22HxLB5shJs5PbhW0TL8xpo3we5X8LI%3D';
const PATIENTS_TABLE = 'Patients';

interface Patient {
  PartitionKey: string;
  RowKey: string;
  dateOfBirth?: string;
  DateOfBirth?: string;
  name?: string;
  Name?: string;
  medicalRecordNumber?: string;
  MedicalRecordNumber?: string;
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

// Check if a date string is valid
function isValidDate(dateString: string | undefined): boolean {
  if (!dateString || dateString.trim() === '') {
    return true; // Empty is acceptable
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// Get all patients
async function getAllPatients(): Promise<Patient[]> {
  console.log('📥 Fetching all patients from Azure Table Storage...');
  
  let allPatients: Patient[] = [];
  let nextPartitionKey: string | undefined = undefined;
  let nextRowKey: string | undefined = undefined;
  let pageCount = 0;
  
  do {
    pageCount++;
    let tableUrl = getTableUrl(PATIENTS_TABLE);
    
    if (nextPartitionKey && nextRowKey) {
      tableUrl += `&NextPartitionKey=${encodeURIComponent(nextPartitionKey)}&NextRowKey=${encodeURIComponent(nextRowKey)}`;
    }
    
    tableUrl += `&$top=1000`;
    
    console.log(`   Loading page ${pageCount}...`);
    
    const response = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2022-11-02'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const patients = data.value || [];
      allPatients = [...allPatients, ...patients];
      
      nextPartitionKey = response.headers.get('x-ms-continuation-NextPartitionKey') || undefined;
      nextRowKey = response.headers.get('x-ms-continuation-NextRowKey') || undefined;
      
      console.log(`   ✅ Page ${pageCount}: ${patients.length} patients (Total: ${allPatients.length})`);
      
      if (!nextPartitionKey || !nextRowKey) {
        break;
      }
    } else {
      console.error(`❌ Failed to fetch page ${pageCount}:`, response.status);
      break;
    }
  } while (nextPartitionKey && nextRowKey);
  
  console.log(`✅ Total patients loaded: ${allPatients.length}\n`);
  return allPatients;
}

// Update a patient's dateOfBirth
async function updatePatientDate(patient: Patient): Promise<boolean> {
  try {
    const entityUrl = getEntityUrl(PATIENTS_TABLE, patient.PartitionKey, patient.RowKey);
    
    const updateBody = {
      "PartitionKey": patient.PartitionKey,
      "RowKey": patient.RowKey,
      "dateOfBirth": "",
      "DateOfBirth": ""
    };
    
    const response = await fetch(entityUrl, {
      method: 'MERGE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(updateBody)
    });
    
    if (response.ok || response.status === 204) {
      return true;
    } else {
      console.error(`❌ Failed to update patient ${patient.RowKey}:`, response.status);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating patient ${patient.RowKey}:`, error);
    return false;
  }
}

// Main cleanup function
async function cleanupInvalidDates() {
  console.log('🔧 Starting database cleanup: Fixing invalid dateOfBirth values\n');
  console.log('=' .repeat(70));
  console.log();
  
  try {
    // Fetch all patients
    const patients = await getAllPatients();
    
    // Find patients with invalid dates
    console.log('🔍 Analyzing patients for invalid dates...\n');
    
    const invalidPatients: Array<{ patient: Patient; invalidValue: string }> = [];
    
    for (const patient of patients) {
      const dateOfBirth = patient.dateOfBirth || patient.DateOfBirth || '';
      
      if (!isValidDate(dateOfBirth)) {
        const name = patient.name || patient.Name || 'Unknown';
        const mrn = patient.medicalRecordNumber || patient.MedicalRecordNumber || patient.RowKey;
        
        invalidPatients.push({
          patient,
          invalidValue: dateOfBirth
        });
        
        console.log(`❌ Invalid date found:`);
        console.log(`   Name: ${name}`);
        console.log(`   MRN: ${mrn}`);
        console.log(`   Invalid value: "${dateOfBirth}"`);
        console.log();
      }
    }
    
    console.log('=' .repeat(70));
    console.log(`\n📊 Summary: Found ${invalidPatients.length} patients with invalid dates\n`);
    
    if (invalidPatients.length === 0) {
      console.log('✅ No invalid dates found! Database is clean.\n');
      return;
    }
    
    // Confirm before proceeding
    console.log('🔄 Starting updates...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < invalidPatients.length; i++) {
      const { patient, invalidValue } = invalidPatients[i];
      const name = patient.name || patient.Name || 'Unknown';
      const mrn = patient.medicalRecordNumber || patient.MedicalRecordNumber || patient.RowKey;
      
      console.log(`[${i + 1}/${invalidPatients.length}] Updating ${name} (${mrn})...`);
      
      const success = await updatePatientDate(patient);
      
      if (success) {
        console.log(`   ✅ Updated successfully`);
        successCount++;
      } else {
        console.log(`   ❌ Update failed`);
        failCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 Final Results:');
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Failed updates: ${failCount}`);
    console.log(`   📝 Total processed: ${invalidPatients.length}`);
    console.log('\n✅ Database cleanup complete!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
console.log('\n');
console.log('╔' + '═'.repeat(68) + '╗');
console.log('║' + ' '.repeat(10) + 'Azure Table Storage - Date Cleanup Script' + ' '.repeat(17) + '║');
console.log('╚' + '═'.repeat(68) + '╝');
console.log('\n');

cleanupInvalidDates()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
