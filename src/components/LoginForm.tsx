import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    setError('');
    setLoading(true);

    const { error } = await signIn();

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="8" fill="#0066CC"/>
              <path d="M20 10V30M10 20H30" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h1>Medical Practice Portal</h1>
          <p>Secure Patient Document Management System</p>
        </div>

        <div className="login-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="login-description">
            <h3>Welcome to Your Medical Practice Portal</h3>
            <p>Access your secure patient management system with enterprise-grade authentication.</p>
            
            <div className="features-list">
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>HIPAA Compliant Security</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>AI-Powered Document Analysis</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Secure Cloud Storage</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Enterprise Authentication</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSignIn} 
            className="btn-primary btn-large" 
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {loading ? 'Signing In...' : 'Sign In with Azure AD'}
          </button>

          <div className="security-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Your data is protected with enterprise-grade security and HIPAA compliance</span>
          </div>
        </div>
      </div>
    </div>
  );
}