import React, { useState } from 'react';
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

      // Check ciano@cortexharmony.co.za
      if (formData.email === 'ciano@cortexharmony.co.za' && formData.password === 'Cherician7') {
        authenticatedUser = {
          id: 'admin',
          name: 'Dr. Ciano',
          email: 'ciano@cortexharmony.co.za',
          role: 'Administrator'
        };
      }
      // Check andrea@cortexharmony.co.za
      else if (formData.email === 'andrea@cortexharmony.co.za' && formData.password === 'EmilyElih95@') {
        authenticatedUser = {
          id: 'andrea',
          name: 'Andrea',
          email: 'andrea@cortexharmony.co.za',
          role: 'doctor'
        };
      }
      // Check lifelanereception@gmail.com
      else if (formData.email === 'lifelanereception@gmail.com' && formData.password === 'Mandlaisking') {
        authenticatedUser = {
          id: 'lifelane',
          name: 'Lifelane Reception',
          email: 'lifelanereception@gmail.com',
          role: 'reception'
        };
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
        </div>
      </div>
    </div>
  );
};
