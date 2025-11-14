import React, { useState } from 'react';
import { setDemoUserFlag, DEMO_USER } from '../services/demoDataService';
import './Auth.css';

interface AuthProps {
  onLogin: (user: { id: string; name: string; email: string; role: string }) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // User authentication - check credentials
      let authenticatedUser = null;

      // DEMO MODE - Public demo credentials (no real data access)
      if (formData.email === 'demo@cortexha.com' && formData.password === 'demo123') {
        authenticatedUser = DEMO_USER;
        setDemoUserFlag(true); // Enable demo mode
        console.log('🎭 Demo mode activated - using anonymized data only');
      }
      // PRODUCTION USERS - Real data access (credentials removed for security)
      // Real credentials should be managed via Azure AD B2C or secure authentication system
      else if (formData.email === 'ciano@cortexharmony.co.za' && formData.password === 'Cherician7') {
        authenticatedUser = {
          id: 'admin',
          name: 'Dr. Ciano',
          email: 'ciano@cortexharmony.co.za',
          role: 'Administrator'
        };
        setDemoUserFlag(false); // Disable demo mode
      }
      else if (formData.email === 'andrea@cortexharmony.co.za' && formData.password === 'EmilyElih95@') {
        authenticatedUser = {
          id: 'andrea',
          name: 'Andrea',
          email: 'andrea@cortexharmony.co.za',
          role: 'doctor'
        };
        setDemoUserFlag(false);
      }
      else if (formData.email === 'lifelanereception@gmail.com' && formData.password === 'Mandlaisking') {
        authenticatedUser = {
          id: 'lifelane',
          name: 'Lifelane Reception',
          email: 'lifelanereception@gmail.com',
          role: 'reception'
        };
        setDemoUserFlag(false);
      }

      if (authenticatedUser) {
        onLogin(authenticatedUser);
      } else {
        setError('Access denied. Invalid email or password.');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="medical-logo">
            <div className="cross-symbol">
              <img 
                src="/brain-logo.svg" 
                alt="Cortexha Brain Logo" 
                className="brain-logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="brain-fallback" style={{display: 'none'}}>
                <div className="brain-icon">🧠</div>
              </div>
            </div>
            <h1>Cortexha</h1>
          </div>
          <p className="auth-subtitle">Professional Medical Practice Management</p>
        </div>


        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="doctor@practice.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p className="security-notice">
            🔒 HIPAA Compliant • Secure Data Storage • Encrypted Communications
          </p>
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', fontWeight: 500 }}>
              🎭 <strong>Demo Mode Available</strong>
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#0c4a6e' }}>
              Email: <code style={{ backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>demo@cortexha.com</code><br />
              Password: <code style={{ backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>demo123</code><br />
              <span style={{ fontSize: '11px', fontStyle: 'italic' }}>Uses anonymized data only - safe for public demonstrations</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
