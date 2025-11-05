import React from 'react';
import './Sidebar.css';
import brainLogo from '/brain-logo.svg';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onSymptomCheckerClick: () => void;
  user: {
    name: string;
    role: string;
  };
  onEditProfile: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onSymptomCheckerClick, user, onEditProfile, onLogout }) => {
  const menuItems = [
    {
      id: 'dashboard',
      icon: '⏹️',
      label: 'Dashboard',
      view: 'dashboard'
    },
    {
      id: 'patients',
      icon: '👥',
      label: 'Patients',
      view: 'patients'
    },
    {
      id: 'symptom-checker',
      icon: '🩺',
      label: 'Symptom Checker',
      isExternal: true,
      onClick: onSymptomCheckerClick
    },
    {
      id: 'appointments',
      icon: '📅',
      label: 'Appointments',
      view: 'appointments'
    },
    {
      id: 'prescriptions',
      icon: '💊',
      label: 'Prescriptions',
      view: 'prescriptions'
    },
    {
      id: 'activities',
      icon: '📊',
      label: 'Activities',
      view: 'activities'
    }
  ];

  const bottomMenuItems = [
    {
      id: 'settings',
      icon: '⚙️',
      label: 'Settings',
      view: 'settings'
    }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <div className="sidebar-logo">
            <img 
              src={brainLogo} 
              alt="Cortexha" 
              className="brain-logo"
              onError={(e) => {
                console.error('Failed to load brain logo:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h1>Cortexha</h1>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => {
              if (item.isExternal && item.onClick) {
                item.onClick();
              } else if (item.view) {
                onViewChange(item.view);
              }
            }}
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="sidebar-bottom">
        {bottomMenuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => onViewChange(item.view)}
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
        
        {/* Logout Button */}
        <button 
          className="sidebar-logout-btn" 
          onClick={onLogout}
          title="Logout"
        >
          <span className="sidebar-icon">↪</span>
          <span className="sidebar-label">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
