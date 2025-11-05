import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../config/api-config';
import './Settings.css';
import {
  loadUserProfile,
  saveUserProfileToDatabase,
  getDataStatistics,
  exportData,
  createDataBackup
} from '../services/azureSettingsService';

// Define types locally to avoid import issues
interface UserProfile {
  name: string;
  email: string;
  role: string;
  practiceName: string;
  licenseNumber: string;
  phone: string;
  address: string;
  specialization: string;
  experience: string;
  qualifications: string;
}


interface SettingsProps {
  user: any;
  onUpdateUser: (userData: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dataStats, setDataStats] = useState({
    totalPatients: 0,
    totalDocuments: 0,
    storageUsed: '0 MB',
    lastBackup: 'Never'
  });
  
  // Email connection state
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'outlook' | 'other' | null>(null);
  const [emailConnected, setEmailConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<'gmail' | 'outlook' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Profile settings - safely handle undefined user
  const [profileData, setProfileData] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
    practiceName: user?.practiceName || '',
    licenseNumber: user?.licenseNumber || '',
    phone: user?.phone || '',
    address: user?.address || '',
    specialization: user?.specialization || '',
    experience: user?.experience || '',
    qualifications: user?.qualifications || ''
  });

  const showMessage = useCallback((type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const loadAllSettings = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      // Load profile data from database
      const profile = await loadUserProfile(user?.email || '');
      if (profile) {
        setProfileData(profile);
      }
      
      // Load data statistics
      const stats = await getDataStatistics(user?.email || '');
      setDataStats(stats);
      
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      showMessage('error', 'Failed to load settings. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      console.log('💾 Saving profile to database...', profileData);
      
      const success = await saveUserProfileToDatabase(user.email, profileData);
      
      if (success) {
        // Update the user in the parent component
        onUpdateUser(profileData);
        showMessage('success', 'Profile updated successfully in database!');
      } else {
        showMessage('error', 'Failed to update profile in database. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      showMessage('error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const handleDataExport = async (format: 'excel' | 'pdf' | 'csv') => {
    setIsLoading(true);
    try {
      console.log('📤 Exporting data...', format);
      
      const success = await exportData(user.email, format);
      
      if (success) {
        showMessage('success', `Data exported successfully as ${format.toUpperCase()}! Download started.`);
      } else {
        showMessage('error', 'Failed to export data. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      showMessage('error', 'Failed to export data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataBackup = async () => {
    setIsLoading(true);
    try {
      console.log('💾 Creating data backup...');
      
      const success = await createDataBackup(user.email);
      
      if (success) {
        // Refresh data statistics after backup
        const stats = await getDataStatistics(user.email);
        setDataStats(stats);
        showMessage('success', 'Data backup completed successfully!');
      } else {
        showMessage('error', 'Failed to create backup. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      showMessage('error', 'Failed to create backup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectEmail = (provider: 'gmail' | 'outlook') => {
    setIsConnecting(true);
    setEmailProvider(provider);
    
    if (provider === 'gmail') {
      connectGmail();
    } else if (provider === 'outlook') {
      connectOutlook();
    }
  };

  const connectGmail = () => {
    // Get Google OAuth Client ID from environment variable
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID is not configured. Please set it in your .env file.');
      showMessage('error', 'Google OAuth is not configured. Please contact your administrator.');
      return;
    }
    
    // Dynamically determine redirect URI based on current domain
    const currentOrigin = window.location.origin;
    // Use the route that matches Azure Functions route configuration
    const redirectUri = `${currentOrigin}/api/auth/google/callback`;
    
    const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';
    const responseType = 'code';
    const state = `user_${user.email}_${Date.now()}_gmail`; // CSRF protection
    
    // Store state in sessionStorage for verification
    sessionStorage.setItem('email_oauth_state', state);
    sessionStorage.setItem('email_provider', 'gmail');
    
    // Build OAuth URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${encodeURIComponent(state)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    openOAuthWindow(authUrl, 'Connect Gmail');
  };

  const connectOutlook = () => {
    // Get Microsoft OAuth Client ID from environment variable
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    
    if (!clientId) {
      console.error('VITE_MICROSOFT_CLIENT_ID is not configured. Please set it in your .env file.');
      showMessage('error', 'Microsoft OAuth is not configured. Please contact your administrator.');
      return;
    }
    
    // Dynamically determine redirect URI based on current domain
    const currentOrigin = window.location.origin;
    // Use the route that matches Azure Functions route configuration
    const redirectUri = `${currentOrigin}/api/auth/microsoft/callback`;
    
    const scope = 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read';
    const responseType = 'code';
    const state = `user_${user.email}_${Date.now()}_outlook`; // CSRF protection
    
    // Store state in sessionStorage for verification
    sessionStorage.setItem('email_oauth_state', state);
    sessionStorage.setItem('email_provider', 'outlook');
    
    // Build Microsoft OAuth URL
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `response_type=${responseType}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_mode=query&` +
      `scope=${encodeURIComponent(scope)} offline_access&` +
      `state=${encodeURIComponent(state)}`;
    
    openOAuthWindow(authUrl, 'Connect Outlook');
  };

  const openOAuthWindow = (authUrl: string, title: string) => {
    // Open OAuth flow in new window
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const authWindow = window.open(
      authUrl,
      title,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    // Listen for OAuth callback
    const checkConnection = setInterval(() => {
      try {
        if (authWindow?.closed) {
          clearInterval(checkConnection);
          setIsConnecting(false);
          // Check if connection was successful after window closes
          setTimeout(() => {
            checkEmailConnectionStatus();
          }, 1000);
        }
      } catch (e) {
        // Cross-origin access - window closed
        clearInterval(checkConnection);
        setIsConnecting(false);
        // Still check connection status
        setTimeout(() => {
          checkEmailConnectionStatus();
        }, 1000);
      }
    }, 1000);
    
    // Listen for postMessage from OAuth callback
    window.addEventListener('message', handleEmailOAuthCallback);
  };

  const handleEmailOAuthCallback = async (event: MessageEvent) => {
    // Security: Only accept messages from same origin
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'email_connected') {
      setEmailConnected(true);
      setConnectedEmail(event.data.email);
      setConnectedProvider(event.data.provider);
      setIsConnecting(false);
      const providerName = event.data.provider === 'gmail' ? 'Gmail' : 'Outlook';
      showMessage('success', `${providerName} connected successfully! You can now send prescriptions via email.`);
      
      // Verify the connection by checking status
      setTimeout(() => {
        checkEmailConnectionStatus();
      }, 500);
    } else if (event.data.type === 'email_error') {
      setIsConnecting(false);
      showMessage('error', event.data.message || 'Failed to connect email account. Please try again.');
    }
  };

  const checkEmailConnectionStatus = useCallback(async () => {
    if (!user?.email) {
      console.log('⚠️ No user email available for email status check');
      return;
    }

    const userEmail = user.email;
    console.log(`🔍 Checking email status for: ${userEmail}`);

    try {
      const url = getApiUrl(`/api/email-status?user=${encodeURIComponent(userEmail)}`);
      console.log(`📡 Fetching: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📥 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📧 Email status check result:', JSON.stringify(data, null, 2));
        
        if (data && data.connected === true) {
          console.log(`✅ Setting email as connected: ${data.email} (${data.provider})`);
          setEmailConnected(true);
          setConnectedEmail(data.email);
          setConnectedProvider(data.provider);
        } else {
          console.log('ℹ️ Email not connected (data.connected is false or missing)');
          setEmailConnected(false);
          setConnectedEmail(null);
          setConnectedProvider(null);
        }
      } else {
        // Backend returned an error
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ Backend error response:', JSON.stringify(errorData, null, 2));
        } catch (jsonError) {
          // If JSON parsing fails, clone response first to read as text
          try {
            const clonedResponse = response.clone();
            const text = await clonedResponse.text();
            errorData = { error: `HTTP ${response.status}: ${response.statusText}`, body: text };
            console.error('❌ Backend error (non-JSON):', errorData);
          } catch (textError) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: 'Could not read response body' };
            console.error('❌ Backend error (could not read body):', errorData);
          }
        }
        
        // Don't show error for 404s (just means not connected)
        if (response.status === 404 || (errorData.error && errorData.error.includes('not found'))) {
          console.log('ℹ️ No connection found (404)');
          setEmailConnected(false);
          setConnectedEmail(null);
          setConnectedProvider(null);
          return;
        }
        
        // Show error message to user for other errors
        if (errorData.error && errorData.error.includes('Storage account key not configured')) {
          setMessage({ type: 'error', text: 'Email connection service is not configured. Please contact your administrator to set up AZURE_STORAGE_ACCOUNT_KEY.' });
        } else {
          console.error(`Unable to check email connection status: ${errorData.error || 'Unknown error'}`);
        }
        
        // Set as not connected on error
        setEmailConnected(false);
        setConnectedEmail(null);
        setConnectedProvider(null);
      }
    } catch (error: any) {
      console.error('❌ Network error checking email status:', error);
      console.error('❌ Error details:', error.message, error.stack);
      // Don't show error for network issues during status check - it's not critical
      // User will see the error when they try to connect
      // But still set as not connected on network error
      setEmailConnected(false);
      setConnectedEmail(null);
      setConnectedProvider(null);
    }
  }, [user?.email]);

  // Load all settings on component mount
  useEffect(() => {
    if (user?.email) {
      loadAllSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Check email connection status separately and on mount
  useEffect(() => {
    if (!user?.email) {
      console.log('⚠️ useEffect: No user email, skipping email status check');
      return;
    }
    
    console.log(`🔄 useEffect: Checking email status for ${user.email}`);
    
    // Check immediately
    checkEmailConnectionStatus();
    
    // Also check after delays to handle any timing issues
    const timeout1 = setTimeout(() => {
      console.log('🔄 Retry 1: Checking email status again');
      checkEmailConnectionStatus();
    }, 500);
    
    const timeout2 = setTimeout(() => {
      console.log('🔄 Retry 2: Checking email status again');
      checkEmailConnectionStatus();
    }, 2000);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [user?.email, checkEmailConnectionStatus]);

  // Also check when email tab is opened
  useEffect(() => {
    if (activeTab === 'email' && user?.email) {
      console.log('📧 Email tab opened, checking status');
      checkEmailConnectionStatus();
    }
  }, [activeTab, user?.email, checkEmailConnectionStatus]);

  const handleDisconnectEmail = async () => {
    const providerName = connectedProvider === 'gmail' ? 'Gmail' : 'Outlook';
    if (!confirm(`Are you sure you want to disconnect your ${providerName} account? You will no longer be able to send emails via ${providerName}.`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/email/disconnect?user=${encodeURIComponent(user.email)}&provider=${connectedProvider}`), { 
        method: 'POST' 
      });
      
      if (response.ok) {
        setEmailConnected(false);
        setConnectedEmail(null);
        setConnectedProvider(null);
        showMessage('success', `${providerName} account disconnected successfully.`);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting email:', error);
      showMessage('error', 'Failed to disconnect email account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account, practice, and system preferences</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-layout">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            <button 
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
            <button 
              className={activeTab === 'data' ? 'active' : ''}
              onClick={() => setActiveTab('data')}
            >
              💾 Data Management
            </button>
            <button 
              className={activeTab === 'email' ? 'active' : ''}
              onClick={() => setActiveTab('email')}
            >
              📧 Email Settings
            </button>
          </nav>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Settings</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={profileData.role}
                    onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                  >
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label>License Number</label>
                  <input
                    type="text"
                    value={profileData.licenseNumber}
                    onChange={(e) => setProfileData({...profileData, licenseNumber: e.target.value})}
                    placeholder="Enter license number"
                  />
                </div>
                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    type="text"
                    value={profileData.specialization}
                    onChange={(e) => setProfileData({...profileData, specialization: e.target.value})}
                    placeholder="e.g., General Practice, Cardiology"
                  />
                </div>
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input
                    type="number"
                    value={profileData.experience}
                    onChange={(e) => setProfileData({...profileData, experience: e.target.value})}
                    placeholder="Years"
                    min="0"
                    max="50"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    placeholder="Enter your address"
                    rows={2}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Qualifications</label>
                  <textarea
                    value={profileData.qualifications}
                    onChange={(e) => setProfileData({...profileData, qualifications: e.target.value})}
                    placeholder="List your qualifications and certifications"
                    rows={2}
                  />
                </div>
              </div>
              <button 
                className="btn-primary"
                onClick={handleProfileSave}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}




          {activeTab === 'data' && (
            <div className="settings-section">
              <h2>Data Management</h2>
              
              <div className="data-section">
                <h3>Export Data</h3>
                <p>Download all your practice data in various formats</p>
                <div className="export-options">
                  <button className="btn-secondary" onClick={() => handleDataExport('excel')} disabled={isLoading}>
                    📊 Export to Excel
                  </button>
                  <button className="btn-secondary" onClick={() => handleDataExport('pdf')} disabled={isLoading}>
                    📄 Export to PDF
                  </button>
                  <button className="btn-secondary" onClick={() => handleDataExport('csv')} disabled={isLoading}>
                    💾 Export to CSV
                  </button>
                </div>
              </div>

              <div className="data-section">
                <h3>Backup Data</h3>
                <p>Create a complete backup of your practice data</p>
                <button className="btn-primary" onClick={handleDataBackup} disabled={isLoading}>
                  {isLoading ? 'Creating Backup...' : '🔄 Create Backup'}
                </button>
              </div>

              <div className="data-section">
                <h3>Data Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">Total Patients</div>
                    <div className="stat-value">{dataStats.totalPatients.toLocaleString()}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Documents</div>
                    <div className="stat-value">{dataStats.totalDocuments.toLocaleString()}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Storage Used</div>
                    <div className="stat-value">{dataStats.storageUsed}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Last Backup</div>
                    <div className="stat-value">{dataStats.lastBackup}</div>
                  </div>
                </div>
              </div>

              <div className="data-section danger-zone">
                <h3>Danger Zone</h3>
                <p>Irreversible actions that will permanently delete data</p>
                <button className="btn-danger" disabled>
                  🗑️ Delete All Data
                </button>
                <small>This action cannot be undone</small>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="settings-section">
              <h2>Email Settings</h2>
              
              <div className="email-settings-content">
                {emailConnected && connectedEmail ? (
                  // Connected State
                  <div className="email-connected-state" style={{
                    background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                    border: '2px solid #28a745',
                    borderRadius: '12px',
                    padding: '25px',
                    marginBottom: '25px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                      <span style={{ fontSize: '32px' }}>
                        {connectedProvider === 'gmail' ? '📧' : '📮'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#155724', fontSize: '1.2rem', display: 'block', marginBottom: '5px' }}>
                          {connectedProvider === 'gmail' ? 'Gmail' : 'Outlook'} Connected ✅
                        </strong>
                        <p style={{ margin: 0, color: '#155724', fontSize: '0.95rem' }}>
                          Connected as: <strong>{connectedEmail}</strong>
                        </p>
                        <p style={{ margin: '5px 0 0 0', color: '#155724', fontSize: '0.85rem', opacity: 0.8 }}>
                          Prescriptions will be sent from this email address
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectEmail}
                      style={{
                        padding: '12px 24px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#c82333';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#dc3545';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      Disconnect {connectedProvider === 'gmail' ? 'Gmail' : 'Outlook'}
                    </button>
                  </div>
                ) : (
                  // Not Connected - Provider Selection
                  <div className="email-provider-selection" style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    border: '2px solid #dee2e6',
                    borderRadius: '12px',
                    padding: '30px'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                      <div style={{ fontSize: '56px', marginBottom: '15px' }}>📧</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '1.5rem' }}>
                        Connect Your Email Account
                      </h3>
                      <p style={{ margin: '0 0 25px 0', color: '#666', lineHeight: '1.6', fontSize: '1rem' }}>
                        Connect your email account to send prescriptions directly to patients.<br />
                        Emails will be sent <strong>from your email address</strong>, not from the platform.
                      </p>
                    </div>

                    {/* Provider Options */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '20px',
                      marginBottom: '25px'
                    }}>
                      {/* Gmail Option */}
                      <div style={{
                        background: '#ffffff',
                        border: `2px solid ${emailProvider === 'gmail' ? '#1a73e8' : '#dee2e6'}`,
                        borderRadius: '12px',
                        padding: '25px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: emailProvider === 'gmail' ? '0 4px 12px rgba(26, 115, 232, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transform: emailProvider === 'gmail' ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                      onClick={() => setEmailProvider('gmail')}
                      onMouseEnter={(e) => {
                        if (emailProvider !== 'gmail') {
                          e.currentTarget.style.borderColor = '#1a73e8';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (emailProvider !== 'gmail') {
                          e.currentTarget.style.borderColor = '#dee2e6';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        }
                      }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                          }}>
                            📧
                          </div>
                          <div>
                            <strong style={{ fontSize: '1.1rem', color: '#2c3e50', display: 'block' }}>
                              Gmail / Google
                            </strong>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                              Gmail, Google Workspace
                            </span>
                          </div>
                          {emailProvider === 'gmail' && (
                            <div style={{ marginLeft: 'auto', fontSize: '20px' }}>✓</div>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666', lineHeight: '1.5' }}>
                          Connect your Gmail or Google Workspace account. Simple one-click setup!
                        </p>
                      </div>

                      {/* Outlook Option */}
                      <div style={{
                        background: '#ffffff',
                        border: `2px solid ${emailProvider === 'outlook' ? '#0078d4' : '#dee2e6'}`,
                        borderRadius: '12px',
                        padding: '25px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: emailProvider === 'outlook' ? '0 4px 12px rgba(0, 120, 212, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transform: emailProvider === 'outlook' ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                      onClick={() => setEmailProvider('outlook')}
                      onMouseEnter={(e) => {
                        if (emailProvider !== 'outlook') {
                          e.currentTarget.style.borderColor = '#0078d4';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 120, 212, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (emailProvider !== 'outlook') {
                          e.currentTarget.style.borderColor = '#dee2e6';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        }
                      }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                          }}>
                            📮
                          </div>
                          <div>
                            <strong style={{ fontSize: '1.1rem', color: '#2c3e50', display: 'block' }}>
                              Outlook / Microsoft
                            </strong>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                              Outlook, Office 365, Hotmail
                            </span>
                          </div>
                          {emailProvider === 'outlook' && (
                            <div style={{ marginLeft: 'auto', fontSize: '20px' }}>✓</div>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666', lineHeight: '1.5' }}>
                          Connect your Outlook, Office 365, or Microsoft account. Simple one-click setup!
                        </p>
                      </div>
                    </div>

                    {/* Connection Button */}
                    {emailProvider && emailProvider !== 'other' && (
                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleConnectEmail(emailProvider as 'gmail' | 'outlook')}
                          disabled={isConnecting}
                          style={{
                            padding: '16px 40px',
                            background: isConnecting 
                              ? '#6c757d' 
                              : emailProvider === 'gmail'
                                ? 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)'
                                : 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: isConnecting ? 'not-allowed' : 'pointer',
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            transition: 'all 0.3s ease',
                            boxShadow: isConnecting 
                              ? 'none' 
                              : emailProvider === 'gmail'
                                ? '0 4px 12px rgba(26, 115, 232, 0.3)'
                                : '0 4px 12px rgba(0, 120, 212, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            margin: '0 auto',
                            minWidth: '250px'
                          }}
                          onMouseEnter={(e) => {
                            if (!isConnecting) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              if (emailProvider === 'gmail') {
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(26, 115, 232, 0.4)';
                              } else {
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 120, 212, 0.4)';
                              }
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isConnecting) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              if (emailProvider === 'gmail') {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.3)';
                              } else {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 120, 212, 0.3)';
                              }
                            }
                          }}
                        >
                          {isConnecting ? (
                            <>
                              <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                              Connecting...
                            </>
                          ) : (
                            <>
                              {emailProvider === 'gmail' ? (
                                <>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="white"/>
                                  </svg>
                                  Connect Gmail
                                </>
                              ) : (
                                <>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.518 11.091l-5.008 2.234c-1.337.594-1.335 2.747.004 3.339l5.008 2.234c.526.234.786.234 1.312 0l4.972-2.234c1.337-.593 1.339-2.744.004-3.339l-4.972-2.234c-.526-.234-.786-.234-1.312 0zm10.334 0l-5.008 2.234c-1.337.594-1.335 2.747.004 3.339l5.008 2.234c.526.234.786.234 1.312 0l4.972-2.234c1.337-.593 1.339-2.744.004-3.339l-4.972-2.234c-.526-.234-.786-.234-1.312 0z" fill="white"/>
                                    <path d="M12 0L2.186 4.644v6.734c0 5.573 3.158 10.745 8.07 13.317.117.064.239.124.362.18.123-.056.245-.116.362-.18 4.912-2.572 8.07-7.744 8.07-13.317V4.644L12 0zm0 1.806l8.527 3.808v7.35c0 4.872-2.751 9.396-7.027 11.7-.104.057-.211.111-.32.163a11.384 11.384 0 0 1-.36.162c-4.276-2.304-7.027-6.828-7.027-11.7v-7.35L12 1.806z" fill="white"/>
                                  </svg>
                                  Connect Outlook
                                </>
                              )}
                            </>
                          )}
                        </button>

                        <div style={{
                          background: '#fff',
                          borderRadius: '8px',
                          padding: '15px',
                          marginTop: '20px',
                          border: '1px solid #dee2e6'
                        }}>
                          <p style={{ margin: '0', fontSize: '0.85rem', color: '#666', lineHeight: '1.6' }}>
                            <strong>What happens:</strong><br />
                            1. Click "Connect {emailProvider === 'gmail' ? 'Gmail' : 'Outlook'}" above<br />
                            2. Sign in to {emailProvider === 'gmail' ? 'Google' : 'Microsoft'} (if not already signed in)<br />
                            3. Click "Allow" on the permission screen<br />
                            4. You're done! Emails will send from your {emailProvider === 'gmail' ? 'Gmail' : 'Outlook'} address ✅
                          </p>
                        </div>
                      </div>
                    )}

                    <div style={{
                      marginTop: '30px',
                      padding: '20px',
                      background: '#fff',
                      borderRadius: '10px',
                      borderLeft: '4px solid #674580'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
                        📋 How It Works
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#666', lineHeight: '1.8' }}>
                        <li>Select your email provider (Gmail or Outlook)</li>
                        <li>Connect with one click - simple OAuth flow</li>
                        <li>Prescriptions will be sent <strong>from your email address</strong></li>
                        <li>All emails are sent securely through {emailProvider === 'gmail' ? "Google's" : "Microsoft's"} servers</li>
                        <li>You can disconnect your account at any time</li>
                        <li>Your password is never shared or stored - only secure access tokens</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

