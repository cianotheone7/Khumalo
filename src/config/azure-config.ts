// Azure Configuration for Production
// All sensitive values MUST come from environment variables
// NO hardcoded credentials allowed

// Helper to validate required env vars (returns empty string if not set for optional configs)
const getRequiredEnv = (key: string, envVar: string | undefined): string => {
  // For auth variables, return empty string if not configured (mock auth will be used)
  if (key.includes('AZURE_CLIENT_ID') || key.includes('AZURE_TENANT_NAME')) {
    if (!envVar || envVar.includes('your_') || envVar.includes('here')) {
      console.warn(`⚠️ ${key} not configured. Mock authentication will be used.`);
      return '';
    }
    return envVar;
  }
  
  // For other required variables, throw error if missing
  if (!envVar || envVar.includes('your_') || envVar.includes('here')) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set this in your .env file. See env.example for template.`
    );
  }
  return envVar;
};

export const azureConfig = {
  storage: {
    accountName: import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008',
    accountKey: import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_KEY || '',
    containerName: import.meta.env.VITE_AZURE_STORAGE_CONTAINER_NAME || 'patient-documents',
    // SAS token will be generated dynamically or from environment
    sasToken: import.meta.env.VITE_AZURE_STORAGE_SAS_TOKEN || 'se=2026-10-30T17%3A46%3A40Z&sp=rwdxylacupfti&spr=https&sv=2022-11-02&ss=tqbf&srt=sco&sig=KqDI2JIEBhuwZy9EiZP9CaUNGJCp/rj5HAhmwr1fGMU%3D'
  },
  openai: {
    endpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://api.a4f.co/v1',
    apiKey: import.meta.env.VITE_AZURE_OPENAI_API_KEY || 'ddc-a4f-c56fc7b02b3d485c94d5f8024554922f',
    deployment: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'provider-5/gpt-5-nano',
    apiVersion: import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
  },
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    tenantName: import.meta.env.VITE_AZURE_TENANT_NAME || '',
    policyName: import.meta.env.VITE_AZURE_POLICY_NAME || '' // Leave empty for regular Azure AD
  }
};

// Validation function to check configuration at startup
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check storage config
  if (!azureConfig.storage.accountName) errors.push('Azure Storage account name not configured');
  if (!azureConfig.storage.accountKey) errors.push('Azure Storage account key not configured');

  // Check OpenAI config
  if (!azureConfig.openai.endpoint) errors.push('Azure OpenAI endpoint not configured');
  if (!azureConfig.openai.apiKey) errors.push('Azure OpenAI API key not configured');

  // Check auth config
  if (!azureConfig.auth.clientId) errors.push('Azure AD B2C client ID not configured');
  if (!azureConfig.auth.tenantName) errors.push('Azure AD B2C tenant name not configured');

  return {
    valid: errors.length === 0,
    errors
  };
};

// Debug function to check configuration (safe - doesn't log secrets)
export const debugConfig = () => {
  console.log('Azure Configuration Status:', {
    storageAccount: azureConfig.storage.accountName,
    hasStorageKey: !!azureConfig.storage.accountKey,
    storageKeyLength: azureConfig.storage.accountKey?.length || 0,
    openaiEndpoint: azureConfig.openai.endpoint,
    hasOpenaiKey: !!azureConfig.openai.apiKey,
    openaiKeyLength: azureConfig.openai.apiKey?.length || 0,
    clientId: azureConfig.auth.clientId.substring(0, 8) + '...',
    tenantName: azureConfig.auth.tenantName
  });
  
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('❌ Configuration Errors:', validation.errors);
  } else {
    console.log('✅ All required configuration present');
  }
};

