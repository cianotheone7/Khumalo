import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { 
  msalInstance, 
  initializeMsal, 
  login, 
  logout, 
  getCurrentUser, 
  isAuthenticated,
  type User 
} from '../lib/azure-auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initializeMsal();
        
        // Check if user is already logged in
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for account changes
    const handleAccountChange = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    };

    msalInstance.addEventCallback((event) => {
      if (event.eventType === 'msal:loginSuccess' || event.eventType === 'msal:logoutSuccess') {
        handleAccountChange();
      }
    });
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      const result = await login();
      if (result) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        return { error: null };
      } else {
        return { error: new Error('Login failed') };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await logout();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const authValue: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: isAuthenticated(),
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}