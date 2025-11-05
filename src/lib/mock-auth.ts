/**
 * Mock Authentication Service
 * Used for development/testing when Azure AD B2C is not configured
 * 
 * This allows the app to work without manual Azure AD B2C setup
 */

export interface User {
  id: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
}

const MOCK_USER_KEY = 'mock_auth_user';

// Check if we're in development mode or if Azure AD B2C is not configured
export const shouldUseMockAuth = (): boolean => {
  const hasB2CConfig = 
    import.meta.env.VITE_AZURE_CLIENT_ID && 
    import.meta.env.VITE_AZURE_TENANT_NAME &&
    !import.meta.env.VITE_AZURE_CLIENT_ID.includes('your_') &&
    !import.meta.env.VITE_AZURE_CLIENT_ID.includes('here');
  
  // Use mock auth if B2C is not configured OR if explicitly enabled
  return !hasB2CConfig || import.meta.env.VITE_USE_MOCK_AUTH === 'true';
};

// Mock user data
const MOCK_USER: User = {
  id: 'mock-user-001',
  email: 'doctor@healthcare.com',
  name: 'Dr. Demo User',
  givenName: 'Demo',
  familyName: 'User'
};

export const mockAuth = {
  /**
   * Initialize mock authentication
   */
  initialize: async (): Promise<void> => {
    console.log('🔐 Mock Auth: Initialized');
    // Auto-login if previously logged in
    const savedUser = localStorage.getItem(MOCK_USER_KEY);
    if (savedUser) {
      console.log('🔐 Mock Auth: Found saved user session');
    }
  },

  /**
   * Mock login - automatically succeeds
   */
  login: async (): Promise<User> => {
    console.log('🔐 Mock Auth: Login successful');
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(MOCK_USER));
    return MOCK_USER;
  },

  /**
   * Mock logout
   */
  logout: async (): Promise<void> => {
    console.log('🔐 Mock Auth: Logout');
    localStorage.removeItem(MOCK_USER_KEY);
  },

  /**
   * Get current user
   */
  getCurrentUser: (): User | null => {
    const savedUser = localStorage.getItem(MOCK_USER_KEY);
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        return null;
      }
    }
    return null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return localStorage.getItem(MOCK_USER_KEY) !== null;
  },

  /**
   * Get access token (mock)
   */
  getAccessToken: async (): Promise<string | null> => {
    return 'mock-access-token-' + Date.now();
  }
};

// Mock auth is active (silently enabled for production use)


