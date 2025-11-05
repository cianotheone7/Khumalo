import { PublicClientApplication } from '@azure/msal-browser';
import type { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { azureConfig } from '../config/azure-config';
import { shouldUseMockAuth, mockAuth } from './mock-auth';

// Determine if using Azure AD or Azure AD B2C
const isB2C = azureConfig.auth.policyName && azureConfig.auth.policyName !== '';
const tenantId = azureConfig.auth.tenantName;

// Azure AD Configuration (supports both Azure AD and Azure AD B2C)
const msalConfig = {
  auth: {
    clientId: azureConfig.auth.clientId,
    authority: isB2C
      ? `https://${tenantId}.b2clogin.com/${tenantId}.onmicrosoft.com/${azureConfig.auth.policyName}`
      : `https://login.microsoftonline.com/${tenantId}`,
    knownAuthorities: isB2C ? [`${tenantId}.b2clogin.com`] : undefined,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL or Mock Auth
export const initializeMsal = async () => {
  if (shouldUseMockAuth()) {
    await mockAuth.initialize();
    return;
  }
  await msalInstance.initialize();
};

// Authentication scopes
export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

export const tokenRequest = {
  scopes: ['openid', 'profile', 'email'],
};

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
}

// Convert MSAL account to our User type
export const accountToUser = (account: AccountInfo | null): User | null => {
  if (!account) return null;

  return {
    id: account.localAccountId,
    email: account.username || '',
    name: account.name || '',
    givenName: account.idTokenClaims?.given_name as string,
    familyName: account.idTokenClaims?.family_name as string,
  };
};

// Authentication functions
export const login = async (): Promise<AuthenticationResult | null> => {
  try {
    if (shouldUseMockAuth()) {
      const user = await mockAuth.login();
      // Return mock authentication result
      return {
        authority: '',
        uniqueId: user.id,
        tenantId: '',
        scopes: ['openid', 'profile', 'email'],
        account: {
          homeAccountId: user.id,
          environment: 'mock',
          tenantId: 'mock',
          username: user.email,
          localAccountId: user.id,
          name: user.name,
          idTokenClaims: {
            given_name: user.givenName,
            family_name: user.familyName
          }
        } as AccountInfo,
        idToken: 'mock-id-token',
        idTokenClaims: {},
        accessToken: 'mock-access-token',
        fromCache: false,
        expiresOn: new Date(Date.now() + 3600000),
        tokenType: 'Bearer',
        correlationId: 'mock-correlation-id',
        state: ''
      } as AuthenticationResult;
    }
    const response = await msalInstance.loginPopup(loginRequest);
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    if (shouldUseMockAuth()) {
      await mockAuth.logout();
      return;
    }
    const account = msalInstance.getActiveAccount();
    if (account) {
      await msalInstance.logoutPopup({
        account: account,
        postLogoutRedirectUri: window.location.origin,
      });
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export const getCurrentUser = (): User | null => {
  if (shouldUseMockAuth()) {
    return mockAuth.getCurrentUser();
  }
  const account = msalInstance.getActiveAccount();
  return accountToUser(account);
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    if (shouldUseMockAuth()) {
      return await mockAuth.getAccessToken();
    }
    const account = msalInstance.getActiveAccount();
    if (!account) return null;

    const response = await msalInstance.acquireTokenSilent({
      ...tokenRequest,
      account: account,
    });

    return response.accessToken;
  } catch (error) {
    console.error('Token acquisition failed:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  if (shouldUseMockAuth()) {
    return mockAuth.isAuthenticated();
  }
  const account = msalInstance.getActiveAccount();
  return account !== null;
};
