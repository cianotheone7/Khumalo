// API Configuration
// Handles both relative URLs (for integrated API) and absolute URLs (for separate Functions app)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - The API endpoint (e.g., '/api/health' or 'health')
 * @returns The full URL to the API endpoint
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If endpoint doesn't start with 'api/', add it
  const apiEndpoint = cleanEndpoint.startsWith('api/') 
    ? `/${cleanEndpoint}` 
    : `/api/${cleanEndpoint}`;
  
  // If API_BASE_URL is set, use it (for separate Functions app)
  if (API_BASE_URL) {
    // Remove trailing slash from base URL if present
    const baseUrl = API_BASE_URL.endsWith('/') 
      ? API_BASE_URL.slice(0, -1) 
      : API_BASE_URL;
    return `${baseUrl}${apiEndpoint}`;
  }
  
  // Otherwise use relative URL (for integrated API in Static Web App)
  return apiEndpoint;
}

/**
 * Get the API base URL (for constructing URLs manually)
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL || '';
}

