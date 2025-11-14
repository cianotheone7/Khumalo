import React, { useState, useEffect } from 'react';
import { getActivityIcon, getActivityColor, type Activity } from '../services/activityService';
import { getRecentActivities } from '../services/dataService';
import './Activities.css';

export function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<'all' | Activity['type']>('all');
  const [timeFilter, setTimeFilter] = useState<'24h' | '3days' | '7days'>('3days');

  useEffect(() => {
    loadActivities();
    // Refresh activities every 10 seconds
    const interval = setInterval(loadActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    const allActivities = await getRecentActivities(500); // Get all activities from Azure Table Storage
    setActivities(allActivities);
  };

  // Filter activities by time range
  const getFilteredActivities = () => {
    const now = new Date();
    let cutoffTime: Date;

    switch (timeFilter) {
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '3days':
        cutoffTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '7days':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    }

    let filtered = activities.filter(activity => {
      const activityTime = new Date(activity.timestamp);
      return activityTime >= cutoffTime;
    });

    if (filter !== 'all') {
      filtered = filtered.filter(activity => activity.type === filter);
    }

    return filtered;
  };

  const filteredActivities = getFilteredActivities();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityTypeLabel = (type: Activity['type']): string => {
    switch (type) {
      case 'patient_added': return 'Patient Added';
      case 'patient_deleted': return 'Patient Deleted';
      case 'symptom_checker': return 'Symptom Check';
      case 'prescription_created': return 'Prescription';
      case 'summary_generated': return 'AI Summary Generated';
      case 'summary_deleted': return 'AI Summary Deleted';
      case 'appointment_created': return 'Appointment';
      case 'document_uploaded': return 'Document Uploaded';
      case 'document_deleted': return 'Document Deleted';
      default: return type;
    }
  };

  return (
    <div className="activities-page">
      <div className="activities-header">
        <div className="activities-title">
          <div className="activities-title-left">
            <div className="activities-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="8" fill="#ffffff"/>
                <rect x="8" y="20" width="6" height="12" rx="2" fill="#10b981"/>
                <rect x="17" y="14" width="6" height="18" rx="2" fill="#ec4899"/>
                <rect x="26" y="24" width="6" height="8" rx="2" fill="#3b82f6"/>
              </svg>
            </div>
            <div>
              <h1>System Activities</h1>
              <p>Track all system events and actions</p>
            </div>
          </div>
        </div>
        <div className="activities-stats">
          <div className="stat-badge">
            <span className="stat-number">{filteredActivities.length}</span>
            <span className="stat-label">Activities</span>
          </div>
        </div>
      </div>

      <div className="activities-filters">
        <div className="filter-group">
          <label>Time Range:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${timeFilter === '24h' ? 'active' : ''}`}
              onClick={() => setTimeFilter('24h')}
            >
              Last 24 Hours
            </button>
            <button
              className={`filter-btn ${timeFilter === '3days' ? 'active' : ''}`}
              onClick={() => setTimeFilter('3days')}
            >
              Last 3 Days
            </button>
            <button
              className={`filter-btn ${timeFilter === '7days' ? 'active' : ''}`}
              onClick={() => setTimeFilter('7days')}
            >
              Last 7 Days
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Activity Type:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="patient_added">Patients Added</option>
            <option value="patient_deleted">Patients Deleted</option>
            <option value="appointment_created">Appointments</option>
            <option value="prescription_created">Prescriptions</option>
            <option value="document_uploaded">Documents Uploaded</option>
            <option value="document_deleted">Documents Deleted</option>
            <option value="summary_generated">AI Summaries Generated</option>
            <option value="summary_deleted">AI Summaries Deleted</option>
            <option value="symptom_checker">Symptom Checks</option>
          </select>
        </div>
      </div>

      <div className="activities-list">
        {filteredActivities.length === 0 ? (
          <div className="no-activities">
            <div className="empty-icon">📭</div>
            <h3>No Activities Found</h3>
            <p>No activities recorded in the selected time range.</p>
          </div>
        ) : (
          <div className="activities-timeline">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="activity-card">
                <div
                  className="activity-icon-circle"
                  style={{ backgroundColor: getActivityColor(activity.type) }}
                >
                  <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                </div>
                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-type-badge" style={{ backgroundColor: getActivityColor(activity.type) }}>
                      {getActivityTypeLabel(activity.type)}
                    </span>
                    <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                  <div className="activity-description">{activity.description}</div>
                  <div className="activity-meta">
                    <span className="activity-user">👤 {activity.userName}</span>
                    <span className="activity-datetime">🕐 {formatDateTime(activity.timestamp)}</span>
                    {activity.patientName && (
                      <span className="activity-patient">🏥 {activity.patientName}</span>
                    )}
                  </div>
                  {activity.metadata && (
                    <div className="activity-metadata">
                      {activity.metadata.symptoms && activity.metadata.symptoms.length > 0 && (
                        <div className="metadata-item">
                          <strong>Symptoms:</strong> {activity.metadata.symptoms.join(', ')}
                        </div>
                      )}
                      {activity.metadata.medications && activity.metadata.medications.length > 0 && (
                        <div className="metadata-item">
                          <strong>Medications:</strong> {activity.metadata.medications.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

