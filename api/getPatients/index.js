const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;
const PATIENTS_TABLE = 'Patients';

module.exports = async function (context, req) {
    context.log('🔍 Get Patients API called');

    try {
        const credential = new AzureNamedKeyCredential(AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY);
        const tableClient = new TableClient(AZURE_STORAGE_ENDPOINT, PATIENTS_TABLE, credential);
        
        const entities = tableClient.listEntities();
        const patients = [];
        
        for await (const entity of entities) {
            const patient = {
                id: entity.rowKey,
                name: entity.name || '',
                email: entity.email || '',
                phone: entity.phone || '',
                dateOfBirth: entity.dateOfBirth || '',
                medicalRecordNumber: entity.medicalRecordNumber || '',
                address: entity.address || '',
                emergencyContact: entity.emergencyContact || '',
                insuranceProvider: entity.insuranceProvider || '',
                createdAt: entity.createdAt || new Date().toISOString()
            };
            patients.push(patient);
        }
        
        context.log(`✅ Loaded ${patients.length} patients from Azure`);
        
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: patients
        };
    } catch (error) {
        context.log.error('❌ Error loading patients:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: { error: error.message }
        };
    }
};


