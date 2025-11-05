import { useState } from 'react';
import { createPatient } from '../services/azurePatientRestService';
import { useAuth } from '../contexts/AuthContext';
import { DateOfBirthPicker } from './DateOfBirthPicker';

type NewPatientModalProps = {
  onClose: () => void;
  onPatientCreated: () => void;
};

export function NewPatientModal({ onClose, onPatientCreated }: NewPatientModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    medicalRecordNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
    customInsuranceProvider: '',
    medicalAidNumber: '',
    dependentCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      await createPatient({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        dateOfBirth: formData.dateOfBirth,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        medicalRecordNumber: formData.medicalRecordNumber || undefined,
        emergencyContact: formData.emergencyContactName && formData.emergencyContactPhone 
          ? `${formData.emergencyContactName} (${formData.emergencyContactPhone})`
          : formData.emergencyContactName || formData.emergencyContactPhone || '',
        insuranceProvider: formData.insuranceProvider === 'Other' ? formData.customInsuranceProvider : formData.insuranceProvider || undefined,
        medicalAidNumber: formData.medicalAidNumber || undefined,
        dependentCode: formData.dependentCode || undefined
      });

      onPatientCreated();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create patient');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value
    };
    console.log('Form data updated:', newFormData);
    setFormData(newFormData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Patient Registration</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth 📅</label>
              <DateOfBirthPicker
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={(date) => setFormData({...formData, dateOfBirth: date})}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="medicalRecordNumber">Medical Record Number (File Number)</label>
              <input
                id="medicalRecordNumber"
                name="medicalRecordNumber"
                type="text"
                value={formData.medicalRecordNumber}
                onChange={handleChange}
                placeholder="File 123 (or leave empty to auto-generate)"
                disabled={loading}
              />
              <small style={{ color: '#666', fontSize: '0.85em' }}>Leave empty to auto-generate</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="patient@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emergencyContactName">Emergency Contact Name</label>
              <input
                id="emergencyContactName"
                name="emergencyContactName"
                type="text"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Full name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactPhone">Emergency Contact Phone</label>
              <input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="insuranceProvider">Medical Aid Scheme</label>
            <select
              id="insuranceProvider"
              name="insuranceProvider"
              value={formData.insuranceProvider}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select Medical Aid Scheme</option>
              <option value="Discovery Health">Discovery Health</option>
              <option value="Bonitas">Bonitas</option>
              <option value="Momentum Health">Momentum Health</option>
              <option value="Medihelp">Medihelp</option>
              <option value="Fedhealth">Fedhealth</option>
              <option value="GEMS">GEMS</option>
              <option value="Bestmed">Bestmed</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {formData.insuranceProvider === 'Other' ? (
            <div className="form-group">
              <label htmlFor="customInsuranceProvider">Specify Medical Aid Scheme</label>
              <input
                id="customInsuranceProvider"
                name="customInsuranceProvider"
                type="text"
                value={formData.customInsuranceProvider}
                onChange={handleChange}
                placeholder="Enter medical aid scheme name"
                disabled={loading}
                required
              />
            </div>
          ) : null}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="medicalAidNumber">Medical Aid Number</label>
              <input
                id="medicalAidNumber"
                name="medicalAidNumber"
                type="text"
                value={formData.medicalAidNumber}
                onChange={handleChange}
                placeholder="Medical aid membership number"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dependentCode">Dependent Code</label>
              <input
                id="dependentCode"
                name="dependentCode"
                type="text"
                value={formData.dependentCode}
                onChange={handleChange}
                placeholder="Dependent code (if applicable)"
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
