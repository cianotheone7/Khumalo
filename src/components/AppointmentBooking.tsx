import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients } from '../services/azurePatientRestService';
import { 
  getAppointments,
  getAvailableSlots,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointment,
  type Appointment,
  type TimeSlot
} from '../services/azureAppointmentService';
import './AppointmentBooking.css';

// Types for calendar
type Doctor = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  workingHours: {
    start: string;
    end: string;
    days: number[];
  };
  breakTimes: Array<{ start: string; end: string }>;
};

const AppointmentBooking: React.FC = () => {
  const navigate = useNavigate();
  
  // Core state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('month');
  
  // UI state
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  // Refs for drag and drop
  const dragRef = useRef<HTMLDivElement>(null);

  // Mock doctor data - in real app, this would come from user context
  const currentDoctor: Doctor = {
    id: 'doctor-1',
    name: 'Dr. Smith',
    email: 'dr.smith@clinic.com',
    specialization: 'General Practice',
    workingHours: {
      start: '09:00',
      end: '17:00',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    },
    breakTimes: [
      { start: '12:00', end: '13:00' } // Lunch break
    ]
  };

  // Load appointments on component mount
  // Patients loaded only when needed (when booking appointment)
  useEffect(() => {
    loadAppointments();
  }, []);

  // DON'T load all patients upfront - way too slow!
  // Patients will be loaded on-demand when user searches

  const loadAppointments = async () => {
    try {
      const appts = await getAppointments({ doctorId: currentDoctor.id });
      setAppointments(appts);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      weekDays.push(weekDay);
    }
    return weekDays;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateString);
  };

  const getAppointmentsForWeek = (date: Date) => {
    const weekDays = getWeekDays(date);
    const weekAppointments = [];
    
    weekDays.forEach(day => {
      const dayAppointments = getAppointmentsForDate(day);
      weekAppointments.push({
        date: day,
        appointments: dayAppointments
      });
    });
    
    return weekAppointments;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minutes = 0; minutes < 60; minutes += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const getAppointmentColor = (type: string) => {
    const colors = {
      'consultation': '#4f7cac',
      'follow-up': '#6b9f5e',
      'emergency': '#e74c3c',
      'routine': '#8764b8',
      'specialist': '#d97f42'
    };
    return colors[type as keyof typeof colors] || '#4f7cac';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (currentView === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      } else if (currentView === 'week') {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (currentView === 'month') {
      setCurrentView('day');
    }
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setShowAppointmentForm(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowAppointmentForm(true);
  };

  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, targetTime?: string) => {
    e.preventDefault();
    if (draggedAppointment) {
      const newDate = targetDate.toISOString().split('T')[0];
      const newTime = targetTime || draggedAppointment.time;
      
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === draggedAppointment.id 
            ? { ...apt, date: newDate, time: newTime, updatedAt: new Date().toISOString() }
            : apt
        )
      );
      setDraggedAppointment(null);
    }
  };

  const handleCreateAppointment = async (formData: AppointmentFormData) => {
    try {
      const appointmentData = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        patientEmail: formData.patientEmail,
        doctorId: currentDoctor.id,
        doctorName: currentDoctor.name,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        status: 'scheduled' as const,
        type: formData.type as any,
        reason: formData.reason,
        notes: formData.notes
      };

      const newAppointment = await createAppointment(appointmentData);
      
      if (newAppointment) {
        await loadAppointments(); // Reload from Azure
        setShowAppointmentForm(false);
        setEditingAppointment(null);
        alert('Appointment created successfully!');
      } else {
        console.error('❌ Failed to create appointment');
        alert('Failed to create appointment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error creating appointment:', error);
      alert('Error creating appointment. Please try again.');
    }
  };

  const handleUpdateAppointment = async (updatedData: AppointmentFormData) => {
    if (editingAppointment) {
      try {
        console.log('📝 Updating appointment in Azure...');
        
        const success = await updateAppointment(editingAppointment.id, {
          date: updatedData.date,
          time: updatedData.time,
          status: editingAppointment.status,
          notes: updatedData.notes
        });
        
        if (success) {
          console.log('✅ Appointment updated successfully!');
          await loadAppointments(); // Reload from Azure
          setEditingAppointment(null);
          setShowAppointmentForm(false);
          alert('Appointment updated successfully!');
        } else {
          console.error('❌ Failed to update appointment');
          alert('Failed to update appointment. Please try again.');
        }
      } catch (error) {
        console.error('❌ Error updating appointment:', error);
        alert('Error updating appointment. Please try again.');
      }
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      console.log('🗑️ Deleting appointment from Azure...');
      
      const success = await deleteAppointment(appointmentId);
      
      if (success) {
        console.log('✅ Appointment deleted successfully!');
        await loadAppointments(); // Reload from Azure
        setShowDeleteConfirm(null);
        alert('Appointment deleted successfully!');
      } else {
        console.error('❌ Failed to delete appointment');
        alert('Failed to delete appointment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error deleting appointment:', error);
      alert('Error deleting appointment. Please try again.');
    }
  };

  return (
    <div className="outlook-calendar">
      {/* Top Navigation Bar */}
      <div className="calendar-header">
        <div className="header-left">
          <button className="today-btn" onClick={goToToday}>
            Today
          </button>
          <div className="date-navigation">
            <button 
              className="nav-btn prev"
              onClick={() => navigateDate('prev')}
            >
              ‹
            </button>
            <button 
              className="nav-btn next"
              onClick={() => navigateDate('next')}
            >
              ›
            </button>
          </div>
          <h2 className="current-date">
            {currentView === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {currentView === 'week' && `Week of ${getWeekDays(currentDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            {currentView === 'day' && formatDate(currentDate)}
          </h2>
        </div>
        
        <div className="header-right">
          <div className="view-toggles">
            <button 
              className={`view-btn ${currentView === 'day' ? 'active' : ''}`}
              onClick={() => setCurrentView('day')}
            >
              Day
            </button>
            <button 
              className={`view-btn ${currentView === 'week' ? 'active' : ''}`}
              onClick={() => setCurrentView('week')}
            >
              Week
            </button>
            <button 
              className={`view-btn ${currentView === 'month' ? 'active' : ''}`}
              onClick={() => setCurrentView('month')}
            >
              Month
            </button>
          </div>
          <button 
            className="patient-booking-link-btn"
            onClick={() => navigate('/book-appointment')}
            title="Patient Booking Form"
          >
            Patient Booking Form
          </button>
          <button 
            className="new-appointment-btn"
            onClick={() => setShowAppointmentForm(true)}
          >
            + New Appointment
          </button>
        </div>
      </div>

      <div className="calendar-container">
        {/* Left Sidebar */}
        <div className="calendar-sidebar">
          <div className="mini-calendar">
            <div className="mini-calendar-header">
              <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                ‹
              </button>
              <span>{currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              <button onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                ›
              </button>
            </div>
            <div className="mini-calendar-grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="mini-day-header">{day}</div>
              ))}
              {getDaysInMonth(currentDate).map((day, index) => (
                <button
                  key={index}
                  className={`mini-day ${day && day.toDateString() === selectedDate.toDateString() ? 'selected' : ''} ${day && day.toDateString() === new Date().toDateString() ? 'today' : ''}`}
                  onClick={() => day && handleDateClick(day)}
                >
                  {day?.getDate()}
                </button>
              ))}
            </div>
          </div>

          <div className="calendar-lists">
            <h4>Appointment Types</h4>
            <div className="type-list">
              <div className="type-item">
                <div className="type-color" style={{ backgroundColor: '#4f7cac' }}></div>
                <span>Consultation</span>
              </div>
              <div className="type-item">
                <div className="type-color" style={{ backgroundColor: '#6b9f5e' }}></div>
                <span>Follow-up</span>
              </div>
              <div className="type-item">
                <div className="type-color" style={{ backgroundColor: '#e74c3c' }}></div>
                <span>Emergency</span>
              </div>
              <div className="type-item">
                <div className="type-color" style={{ backgroundColor: '#8764b8' }}></div>
                <span>Routine</span>
              </div>
              <div className="type-item">
                <div className="type-color" style={{ backgroundColor: '#d97f42' }}></div>
                <span>Specialist</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="calendar-main">
          {currentView === 'month' && (
            <div className="month-view">
              <div className="month-header">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <div key={day} className="month-day-header">{day}</div>
                ))}
              </div>
              <div className="month-grid">
                {getDaysInMonth(currentDate).map((day, index) => (
                  <div
                    key={index}
                    className={`month-day ${day && day.toDateString() === selectedDate.toDateString() ? 'selected' : ''} ${day && day.toDateString() === new Date().toDateString() ? 'today' : ''}`}
                    onClick={() => day && handleDateClick(day)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => day && handleDrop(e, day)}
                  >
                    {day && (
                      <>
                        <div className="day-number">{day.getDate()}</div>
                        <div className="day-appointments">
                          {getAppointmentsForDate(day).slice(0, 3).map(appointment => (
                            <div
                              key={appointment.id}
                              className="appointment-item"
                              style={{ backgroundColor: getAppointmentColor(appointment.type) }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAppointmentClick(appointment);
                              }}
                              draggable
                              onDragStart={(e) => handleDragStart(e, appointment)}
                            >
                              <div className="appointment-time">{appointment.time}</div>
                              <div className="appointment-title">{appointment.patientName}</div>
                            </div>
                          ))}
                          {getAppointmentsForDate(day).length > 3 && (
                            <div className="more-appointments">
                              +{getAppointmentsForDate(day).length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'week' && (
            <div className="week-view">
              <div className="week-header">
                <div className="time-column"></div>
                {getWeekDays(currentDate).map(day => (
                  <div key={day.toISOString()} className="week-day-header">
                    <div className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="day-number">{day.getDate()}</div>
                  </div>
                ))}
              </div>
              <div className="week-grid">
                <div className="time-slots-column">
                  {getTimeSlots().map(timeSlot => (
                    <div key={timeSlot} className="time-slot-label">{timeSlot}</div>
                  ))}
                </div>
                {getWeekDays(currentDate).map(day => (
                  <div
                    key={day.toISOString()}
                    className="week-day-column"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                  >
                    {getTimeSlots().map(timeSlot => (
                      <div
                        key={timeSlot}
                        className="time-slot"
                        onClick={() => handleTimeSlotClick(timeSlot)}
                      >
                        {getAppointmentsForDate(day).filter(apt => apt.time === timeSlot).map(appointment => (
                          <div
                            key={appointment.id}
                            className="appointment-block"
                            style={{ backgroundColor: getAppointmentColor(appointment.type) }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(appointment);
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, appointment)}
                          >
                            <div className="appointment-title">{appointment.patientName}</div>
                            <div className="appointment-time">{appointment.time}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'day' && (
            <div className="day-view">
              <div className="day-header">
                <div className="time-column"></div>
                <div className="day-column">
                  <div className="day-name">{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                  <div className="day-number">{selectedDate.getDate()}</div>
                </div>
              </div>
              <div className="day-grid">
                <div className="time-slots-column">
                  {getTimeSlots().map(timeSlot => (
                    <div key={timeSlot} className="time-slot-label">{timeSlot}</div>
                  ))}
                </div>
                <div
                  className="day-column"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, selectedDate)}
                >
                  {getTimeSlots().map(timeSlot => (
                    <div
                      key={timeSlot}
                      className="time-slot"
                      onClick={() => handleTimeSlotClick(timeSlot)}
                    >
                      {getAppointmentsForDate(selectedDate).filter(apt => apt.time === timeSlot).map(appointment => (
                        <div
                          key={appointment.id}
                          className="appointment-block"
                          style={{ backgroundColor: getAppointmentColor(appointment.type) }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAppointmentClick(appointment);
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, appointment)}
                        >
                          <div className="appointment-title">{appointment.patientName}</div>
                          <div className="appointment-time">{appointment.time}</div>
                          <div className="appointment-reason">{appointment.reason}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Form Modal */}
      {showAppointmentForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <AppointmentForm
              selectedDate={selectedDate.toISOString().split('T')[0]}
              selectedTime={selectedTimeSlot}
              patients={patients}
              onPatientSelect={() => {}}
              selectedPatient={null}
              onCreateAppointment={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
              onCancel={() => {
                setShowAppointmentForm(false);
                setEditingAppointment(null);
                setSelectedTimeSlot('');
              }}
              isEdit={!!editingAppointment}
              editData={editingAppointment}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this appointment? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={() => handleDeleteAppointment(showDeleteConfirm)}
              >
                Delete Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AppointmentFormProps {
  selectedDate: string;
  selectedTime: string;
  patients: any[];
  onPatientSelect: (patient: any) => void;
  selectedPatient: any;
  onCreateAppointment: (data: AppointmentFormData) => void;
  onCancel: () => void;
  isEdit?: boolean;
  editData?: Appointment;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  selectedDate,
  selectedTime,
  patients,
  onPatientSelect,
  selectedPatient,
  onCreateAppointment,
  onCancel,
  isEdit = false,
  editData
}) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: editData?.patientId || selectedPatient?.id || '',
    patientName: editData?.patientName || selectedPatient?.name || '',
    patientEmail: editData?.patientEmail || selectedPatient?.email || '',
    date: editData?.date || selectedDate,
    time: editData?.time || selectedTime,
    duration: editData?.duration || 30,
    type: editData?.type || 'consultation',
    reason: editData?.reason || '',
    notes: editData?.notes || ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Cache patients to avoid loading them multiple times
  const patientsCacheRef = useRef<any[]>([]);
  const [patientsCacheLoaded, setPatientsCacheLoaded] = useState(false);

  // Optimized patient search with caching and debouncing
  const searchPatients = useCallback(async (searchValue: string) => {
    if (!searchValue || searchValue.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      // Use cached patients if available, otherwise load once
      let patientsToSearch = patientsCacheRef.current;
      if (!patientsCacheLoaded || patientsCacheRef.current.length === 0) {
        const { getPatients } = await import('../services/azurePatientRestService');
        const allPatients = await getPatients();
        patientsCacheRef.current = allPatients;
        setPatientsCacheLoaded(true);
        patientsToSearch = allPatients;
      }
      
      // Filter on client side (much faster)
      const results = patientsToSearch
        .filter(p => 
          p.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchValue.toLowerCase()) ||
          p.phone?.includes(searchValue) ||
          p.mobilePhone?.includes(searchValue)
        )
        .slice(0, 20); // Show top 20 results
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [patientsCacheLoaded]);

  // Debounced search - shorter delay for faster feel
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(searchTerm);
    }, 150); // Wait 150ms after user stops typing (faster response)

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchPatients]);

  // Search patients on-demand (only when user types)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (!value || value.length < 2) {
      setSearchResults([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.patientId && formData.reason) {
      onCreateAppointment(formData);
    }
  };

  const handlePatientClick = (patient: any) => {
    const patientId = patient.id || patient.rowKey || patient.medicalRecordNumber;
    setFormData(prev => ({
      ...prev,
      patientId: patientId,
      patientName: patient.name,
      patientEmail: patient.email || ''
    }));
    setSearchTerm(''); // Clear search after selection
    onPatientSelect(patient);
  };

  return (
    <div className="appointment-form">
      <h3>{isEdit ? 'Edit Appointment' : 'Create New Appointment'}</h3>
      
      {!isEdit && (
        <div className="form-summary">
          <p className="form-instruction">Fill in the details below to create a new appointment</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Select Patient</label>
          <input
            type="text"
            placeholder="Type to search patients... (min 2 characters)"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="patient-search"
          />
          {isSearching && (
            <div className="patient-list">
              <div className="patient-option no-results">
                <span>Searching...</span>
              </div>
            </div>
          )}
          {!isSearching && searchTerm && searchTerm.length >= 2 && (
            <div className="patient-list">
              {searchResults.length > 0 ? (
                searchResults.map(patient => (
                  <div
                    key={patient.id || patient.rowKey}
                    className={`patient-option ${formData.patientId === (patient.id || patient.rowKey) ? 'selected' : ''}`}
                    onClick={() => handlePatientClick(patient)}
                  >
                    <div className="patient-info">
                      <strong>{patient.name}</strong>
                      <span>{patient.email || patient.phone}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="patient-option no-results">
                  <span>No patients found</span>
                </div>
              )}
            </div>
          )}
          {formData.patientName && (
            <div className="selected-patient-display">
              ✓ Selected: <strong>{formData.patientName}</strong>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label>Time *</label>
          <select
            value={formData.time}
            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            required
          >
            <option value="">Select time...</option>
            <option value="08:00">08:00 AM</option>
            <option value="08:30">08:30 AM</option>
            <option value="09:00">09:00 AM</option>
            <option value="09:30">09:30 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="10:30">10:30 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="11:30">11:30 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="12:30">12:30 PM</option>
            <option value="13:00">01:00 PM</option>
            <option value="13:30">01:30 PM</option>
            <option value="14:00">02:00 PM</option>
            <option value="14:30">02:30 PM</option>
            <option value="15:00">03:00 PM</option>
            <option value="15:30">03:30 PM</option>
            <option value="16:00">04:00 PM</option>
            <option value="16:30">04:30 PM</option>
            <option value="17:00">05:00 PM</option>
          </select>
        </div>

        <div className="form-group">
          <label>Appointment Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="consultation">Consultation</option>
            <option value="follow-up">Follow-up</option>
            <option value="emergency">Emergency</option>
            <option value="checkup">Check-up</option>
            <option value="procedure">Procedure</option>
          </select>
        </div>

        <div className="form-group">
          <label>Reason for Visit</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Describe the reason for this appointment..."
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label>Duration (minutes)</label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>

        <div className="form-group">
          <label>Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes for this appointment..."
            rows={2}
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button type="submit" className="submit-button" disabled={!formData.patientId || !formData.time || !formData.reason}>
            {isEdit ? 'Update Appointment' : 'Create Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentBooking;
