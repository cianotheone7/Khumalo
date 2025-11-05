import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAppointment, getAvailableSlots, type Appointment } from '../services/azureAppointmentService';
import { createPatient, getPatients, type Patient } from '../services/azurePatientRestService';
import './PatientAppointmentBooking.css';

interface AppointmentFormData {
  // Patient Information
  fullName: string;
  email: string;
  phone: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | '';
  address?: string;
  
  // Appointment Information
  date: string;
  time: string;
  duration: number;
  type: 'consultation' | 'follow-up' | 'checkup' | 'emergency' | 'procedure';
  reason: string;
  notes?: string;
}

const PatientAppointmentBooking: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AppointmentFormData>({
    fullName: '',
    email: '',
    phone: '',
    idNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    duration: 30,
    type: 'consultation',
    reason: '',
    notes: ''
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  // Mock doctor data - in real app, this would come from settings or context
  const currentDoctor = {
    id: 'doctor-1',
    name: 'Dr. Smith',
    email: 'dr.smith@clinic.com'
  };

  // Load available time slots when date changes
  useEffect(() => {
    if (formData.date) {
      loadAvailableSlots();
    }
  }, [formData.date]);

  const loadAvailableSlots = async () => {
    try {
      const slots = await getAvailableSlots({
        doctorId: currentDoctor.id,
        date: formData.date
      });
      
      // Format time slots
      const timeSlots: string[] = [];
      for (let hour = 9; hour < 17; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      
      // Filter out booked slots
      const available = timeSlots.filter(slot => {
        return !slots.some(bookedSlot => bookedSlot.time === slot && !bookedSlot.available);
      });
      
      setAvailableSlots(available);
    } catch (error) {
      console.error('Error loading available slots:', error);
      // Default slots if API fails
      const timeSlots: string[] = [];
      for (let hour = 9; hour < 17; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      setAvailableSlots(timeSlots);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Validate date format and prevent invalid years
    if (value) {
      const date = new Date(value);
      const year = date.getFullYear();
      // Ensure year is between 1900 and current year + 1
      if (year >= 1900 && year <= new Date().getFullYear() + 1) {
        setFormData(prev => ({
          ...prev,
          date: value,
          time: '' // Reset time when date changes
        }));
        setError('');
      }
    } else {
      setFormData(prev => ({
        ...prev,
        date: value,
        time: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.fullName || !formData.email || !formData.phone || !formData.date || !formData.time || !formData.reason) {
        setError('Please fill in all required fields.');
        setIsSubmitting(false);
        return;
      }

      // Check if patient exists, if not create one
      let patient: Patient | null = null;
      try {
        const patients = await getPatients();
        patient = patients.find(p => 
          (p.email && p.email.toLowerCase() === formData.email.toLowerCase()) ||
          (p.phone && p.phone === formData.phone)
        ) || null;

        if (!patient) {
          // Create new patient
          patient = await createPatient({
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            idNumber: formData.idNumber || '',
            dateOfBirth: formData.dateOfBirth || '',
            gender: formData.gender || '',
            streetAddress: formData.address || '',
            medicalRecordNumber: `MRN-${Date.now()}`
          });
        }
      } catch (patientError) {
        console.error('Error handling patient:', patientError);
        // Continue anyway - appointment can still be created
      }

      // Create appointment
      const appointmentData: Partial<Appointment> = {
        patientId: patient?.id || patient?.rowKey || 'unknown',
        patientName: formData.fullName,
        patientEmail: formData.email,
        patientPhone: formData.phone,
        doctorId: currentDoctor.id,
        doctorName: currentDoctor.name,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        type: formData.type,
        status: 'scheduled',
        reason: formData.reason,
        notes: formData.notes || ''
      };

      await createAppointment(appointmentData);

      setSubmitSuccess(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          idNumber: '',
          dateOfBirth: '',
          gender: '',
          address: '',
          date: new Date().toISOString().split('T')[0],
          time: '',
          duration: 30,
          type: 'consultation',
          reason: '',
          notes: ''
        });
        setSubmitSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Error submitting appointment:', error);
      setError(error.message || 'Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="patient-appointment-booking">
      <div className="booking-header">
        <h1>Book an Appointment</h1>
        <p className="booking-subtitle">Fill in your details to schedule an appointment with our medical practice.</p>
      </div>

      {submitSuccess && (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h2>Appointment Booked Successfully!</h2>
          <p>Your appointment has been confirmed. You will receive a confirmation email shortly.</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="patient-booking-form">
        {/* Patient Information Section */}
        <div className="form-section">
          <h2 className="section-title">Patient Information</h2>
          
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="fullName">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                Phone Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+27 XX XXX XXXX"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="idNumber">ID Number / Passport</label>
              <input
                type="text"
                id="idNumber"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                min="1900-01-01"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street address (optional)"
              />
            </div>
          </div>
        </div>

        {/* Appointment Details Section */}
        <div className="form-section">
          <h2 className="section-title">Appointment Details</h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="date">
                Preferred Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
                required
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">
                Preferred Time <span className="required">*</span>
              </label>
              <select
                id="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
                disabled={!formData.date || availableSlots.length === 0}
              >
                <option value="">Select time...</option>
                {availableSlots.map(slot => (
                  <option key={slot} value={slot}>
                    {new Date(`2000-01-01T${slot}`).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </option>
                ))}
              </select>
              {!formData.date && (
                <small className="field-hint">Please select a date first</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration</label>
              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="type">Appointment Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
              >
                <option value="consultation">Consultation</option>
                <option value="follow-up">Follow-up</option>
                <option value="checkup">Check-up</option>
                <option value="emergency">Emergency</option>
                <option value="procedure">Procedure</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="reason">
                Reason for Visit <span className="required">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Please describe the reason for your appointment..."
                rows={4}
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Additional Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information you'd like to provide..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientAppointmentBooking;

