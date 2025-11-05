// Redesigned Prescription Management - Fast & Optimized with PDF Overlay
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPatients, type Patient } from '../services/azurePatientRestService';
import { 
  getPrescriptions, 
  createPrescription, 
  updatePrescription, 
  deletePrescription,
  type Prescription,
  type PrescriptionMedication 
} from '../services/azurePrescriptionService';
import { 
  downloadPrescriptionPDF, 
  viewPrescriptionPDF 
} from '../services/prescriptionPDFService';
import { logPrescriptionSent } from '../services/activityService';
import { 
  searchMedications,
  getMedicationsByCategory,
  getAllCategories,
  type SAMedication
} from '../services/southAfricanFormulary';
import './PrescriptionManagement.css';

// Virtual scrolling configuration
const ITEMS_PER_PAGE = 20;

interface PrescriptionManagementProps {
  user?: any; // Optional user prop from parent
}

const PrescriptionManagement: React.FC<PrescriptionManagementProps> = ({ user: propUser }) => {
  // Try to get auth context - may not be available if not wrapped in AuthProvider
  let auth: any = null;
  let contextUser: any = null;
  
  // Only try useAuth if we don't have a user prop
  if (!propUser) {
    try {
      auth = useAuth();
      contextUser = auth?.user || null;
  } catch (error) {
      // AuthProvider not available - this is okay, we'll handle it gracefully
      console.log('⚠️ AuthProvider not available, will use alternative methods');
      auth = null;
    }
  }
  
  // Prefer prop user, then context user
  const user = propUser || contextUser || null;

  // State management with optimization
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patientsCache, setPatientsCache] = useState<Patient[]>([]);
  const patientsCacheRef = useRef<Patient[]>([]); // Use ref for faster access
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [loading, setLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Patient search state (optimized)
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<PrescriptionMedication[]>([]);
  
  // Medication search state
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medCategory, setMedCategory] = useState('all');
  const [showMedSearch, setShowMedSearch] = useState(false);
  const [selectedMedForAdd, setSelectedMedForAdd] = useState<SAMedication | null>(null);
  
  // Email sending state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPrescription, setEmailPrescription] = useState<Prescription | null>(null);
  const [emailMessage, setEmailMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Refs for performance
  const prescriptionsCache = useRef<Prescription[]>([]);
  const loadingRef = useRef(false);

  // Load prescriptions on mount
  useEffect(() => {
    loadPrescriptions();
  }, []);

  // Optimized prescription loading with caching
  const loadPrescriptions = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      
      const data = await getPrescriptions();
      prescriptionsCache.current = data;
      setPrescriptions(data);
      
      if (data.length === 0) {
        console.log('💡 No prescriptions found. Create your first prescription!');
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      console.warn('Prescriptions could not be loaded.');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Optimized patient search - only searches when user types (on-demand)
  const searchPatients = useCallback(async (searchValue: string) => {
    if (!searchValue || searchValue.length < 2) {
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
      return;
    }

    // First, try to search cached data immediately (instant results)
    const cachedPatients = patientsCacheRef.current;
    if (cachedPatients.length > 0) {
      setShowPatientDropdown(true);
      setIsSearchingPatients(false);
      
      // Filter on client side (instant - no API call)
      const results = cachedPatients
        .filter(p => 
          p.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchValue.toLowerCase()) ||
          p.phone?.includes(searchValue) ||
          p.mobilePhone?.includes(searchValue)
        )
        .slice(0, 20); // Limit to top 20 results for performance
      
      setPatientSearchResults(results);
      return; // Exit early if we have cached data
    }

    // Only fetch if cache is empty (first search)
    try {
      setIsSearchingPatients(true);
      setShowPatientDropdown(true);
      
      const allPatients = await getPatients();
      patientsCacheRef.current = allPatients; // Update ref
      setPatientsCache(allPatients); // Update state
      
      // Filter immediately after loading
      const results = allPatients
        .filter(p => 
          p.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchValue.toLowerCase()) ||
          p.phone?.includes(searchValue) ||
          p.mobilePhone?.includes(searchValue)
        )
        .slice(0, 20);
      
      setPatientSearchResults(results);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientSearchResults([]);
    } finally {
      setIsSearchingPatients(false);
    }
  }, []);

  // Debounced patient search - shorter delay for faster feel
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(patientSearchTerm);
    }, 150); // Wait 150ms after user stops typing (faster response)

    return () => clearTimeout(timeoutId);
  }, [patientSearchTerm, searchPatients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.patient-search-container')) {
        setShowPatientDropdown(false);
      }
    };

    if (showPatientDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPatientDropdown]);

  const resetForm = useCallback(() => {
    setSelectedPatientId('');
    setSelectedPatientName('');
    setPatientSearchTerm('');
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
    setDiagnosis('');
    setNotes('');
    setMedications([]);
    setEditingPrescription(null);
    setMedSearchQuery('');
    setMedCategory('all');
    setShowMedSearch(false);
    setSelectedMedForAdd(null);
  }, []);

  const handleCreateNew = useCallback(() => {
    resetForm();
    setCurrentView('create');
    setCurrentPage(0);
  }, [resetForm]);

  const handleEdit = useCallback((prescription: Prescription) => {
    setEditingPrescription(prescription);
    setSelectedPatientId(prescription.patientId);
    // Try to find patient name from cache or set from prescription
    const patient = patientsCacheRef.current.find(p => p.rowKey === prescription.patientId) || 
                    patientsCache.find(p => p.rowKey === prescription.patientId);
    if (patient) {
      setSelectedPatientName(`${patient.name}${patient.email ? ` - ${patient.email}` : ''}`);
    } else if (prescription.patientName) {
      setSelectedPatientName(prescription.patientName);
    }
    setDiagnosis(prescription.diagnosis || '');
    setNotes(prescription.notes || '');
    setMedications(prescription.medications);
    setCurrentView('edit');
  }, [patientsCache]);

  const handleBack = useCallback(() => {
    resetForm();
    setCurrentView('list');
    setCurrentPage(0);
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!selectedPatientId) {
      alert('Please select a patient');
      return;
    }

    if (medications.length === 0) {
      alert('Please add at least one medication');
      return;
    }

    const patient = patientsCacheRef.current.find(p => p.rowKey === selectedPatientId) || 
                    patientsCache.find(p => p.rowKey === selectedPatientId);
    if (!patient) {
      alert('Selected patient not found');
      return;
    }

    try {
      setLoading(true);

      // Calculate patient age from date of birth
      const patientAge = patient.dateOfBirth 
        ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
        : undefined;

      // Build patient address from available fields
      const addressParts = [
        patient.streetAddress,
        patient.suburb,
        patient.city,
        patient.province,
        patient.postalCode
      ].filter(Boolean);
      const patientAddress = addressParts.length > 0 ? addressParts.join(', ') : patient.address;

      const prescriptionData = {
        patientId: selectedPatientId,
        patientName: patient.name,
        patientEmail: patient.email,
        patientIdNumber: patient.passportId || patient.medicalRecordNumber,
        patientAddress: patientAddress,
        patientAge: patientAge,
        patientGender: patient.gender,
        patientDateOfBirth: patient.dateOfBirth,
        doctorId: user?.email || 'unknown',
        doctorName: user?.name || 'Unknown Doctor',
        doctorQualification: user?.qualification || 'MBBCh',
        doctorLicense: user?.licenseNumber || user?.hpcsaNumber || '',
        clinicName: user?.practiceName || '',
        clinicAddress: user?.practiceAddress || '',
        clinicPhone: user?.practicePhone || user?.phone || '',
        date: new Date().toISOString(),
        diagnosis,
        notes,
        medications,
        status: 'active' as const
      };

      if (editingPrescription) {
        await updatePrescription('prescription', editingPrescription.rowKey, prescriptionData);
        console.log('✅ Prescription updated successfully!');
      } else {
        await createPrescription(prescriptionData);
        console.log('✅ Prescription created successfully!');
      }

      await loadPrescriptions();
      handleBack();
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId, medications, patientsCache, user, diagnosis, notes, editingPrescription, loadPrescriptions, handleBack]);

  const handleDelete = useCallback(async (prescriptionId: string) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) {
      return;
    }

    try {
      setLoading(true);
      await deletePrescription('prescription', prescriptionId);
      await loadPrescriptions();
      console.log('✅ Prescription deleted!');
    } catch (error) {
      console.error('Error deleting prescription:', error);
      alert('Failed to delete prescription');
    } finally {
      setLoading(false);
    }
  }, [loadPrescriptions]);

  const handleAddMedication = useCallback(() => {
    if (!selectedMedForAdd) return;

    const newMedication: PrescriptionMedication = {
      medicationId: selectedMedForAdd.id,
      medicationName: selectedMedForAdd.brandName,
      genericName: selectedMedForAdd.genericName,
      dosage: selectedMedForAdd.strength || '',
      frequency: selectedMedForAdd.commonFrequency || '',
      duration: '',
      instructions: selectedMedForAdd.commonDosage || '',
      quantity: 30,
      refills: 0,
      form: selectedMedForAdd.form,
      schedule: selectedMedForAdd.schedule,
      route: 'Oral' // Default route
    };

    setMedications(prev => [...prev, newMedication]);
    setShowMedSearch(false);
    setSelectedMedForAdd(null);
    setMedSearchQuery('');
  }, [selectedMedForAdd]);

  const handleUpdateMedication = useCallback((index: number, field: keyof PrescriptionMedication, value: any) => {
    setMedications(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleRemoveMedication = useCallback((index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Optimized filtered and paginated prescriptions with memoization
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(prescription => {
      const matchesSearch = searchTerm === '' || 
        prescription.prescriptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || prescription.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, searchTerm, filterStatus]);

  // Paginated prescriptions for virtual scrolling
  const paginatedPrescriptions = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredPrescriptions.slice(start, end);
  }, [filteredPrescriptions, currentPage]);

  const totalPages = Math.ceil(filteredPrescriptions.length / ITEMS_PER_PAGE);

  // Optimized medication search with debouncing effect
  const filteredMedications = useMemo(() => {
    if (!medSearchQuery && medCategory === 'all') {
      return [];
    }

    if (medCategory !== 'all') {
      const categoryMeds = getMedicationsByCategory(medCategory);
      if (medSearchQuery) {
        return categoryMeds.filter(med =>
          med.brandName.toLowerCase().includes(medSearchQuery.toLowerCase()) ||
          med.genericName.toLowerCase().includes(medSearchQuery.toLowerCase())
        );
      }
      return categoryMeds.slice(0, 50); // Limit for performance
    }

    return medSearchQuery ? searchMedications(medSearchQuery).slice(0, 50) : [];
  }, [medSearchQuery, medCategory]);

  const categories = useMemo(() => getAllCategories(), []);

  // Fast PDF actions
  const handleViewPDF = useCallback(async (prescription: Prescription) => {
    try {
      setLoading(true);
      await viewPrescriptionPDF(prescription);
    } catch (error) {
      console.error('Error viewing PDF:', error);
      alert('Failed to view prescription PDF');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadPDF = useCallback(async (prescription: Prescription) => {
    try {
      setLoading(true);
      await downloadPrescriptionPDF(prescription);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download prescription PDF');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSendEmail = useCallback((prescription: Prescription) => {
    setEmailPrescription(prescription);
    setEmailMessage(`Dear ${prescription.patientName},\n\nPlease find attached your prescription.\n\nBest regards,\n${prescription.doctorName}`);
    // Pre-fill with patient email if available
    setRecipientEmail(prescription.patientEmail || '');
    setShowEmailModal(true);
  }, []);

  const handleSendEmailConfirm = useCallback(async () => {
    if (!emailPrescription) return;
    
    // Get user email from prop, auth context, or storage
    let userEmail = null;
    
    // First try: use user prop (from Dashboard)
    if (user?.email) {
      userEmail = user.email;
      console.log('✅ Using user email from prop:', userEmail);
    }
    // Second try: use auth context
    else if (auth?.user?.email) {
      userEmail = auth.user.email;
      console.log('✅ Using user email from auth context:', userEmail);
    }
    // Third try: try localStorage using the same method Dashboard uses (getLocalData)
    else {
      try {
        // Use the same storage key and method as Dashboard component
        const storedUserStr = localStorage.getItem('currentUser');
        
        if (storedUserStr) {
          try {
            const storedUser = JSON.parse(storedUserStr);
            userEmail = storedUser?.email || storedUser?.Email;
            if (userEmail) {
              console.log('✅ Using user email from localStorage (currentUser):', userEmail);
            } else {
              console.warn('⚠️ Stored user found but no email field:', storedUser);
            }
          } catch (parseError) {
            console.error('Failed to parse currentUser from localStorage:', parseError);
          }
        } else {
          // Try other common storage locations
          const storageKeys = ['user', 'healthcare_user', 'app_user', 'loggedInUser'];
          for (const key of storageKeys) {
            const value = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (value) {
              try {
                const parsed = JSON.parse(value);
                const email = parsed?.email || parsed?.Email;
                if (email) {
                  userEmail = email;
                  console.log(`✅ Using user email from storage key "${key}":`, userEmail);
                  break;
                }
              } catch (e) {
                // Skip this key
              }
            }
          }
        }
      } catch (e) {
        console.error('Error accessing storage:', e);
      }
    }
    
    if (!userEmail) {
      console.error('❌ No user email found. User prop:', user, 'Auth context:', auth);
      alert('⚠️ User email not found. Please ensure you are logged in. If you are logged in, please refresh the page.');
      return;
    }

    // Use recipient email from input field, fallback to prescription patient email
    const emailToSendTo = recipientEmail.trim() || emailPrescription.patientEmail;
    
    if (!emailToSendTo) {
      alert('⚠️ Please enter a recipient email address.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSendTo)) {
      alert('⚠️ Please enter a valid email address.');
      return;
    }
    
    console.log(`📧 Sending prescription email from ${userEmail} to ${emailToSendTo}`);
    
    try {
      setSendingEmail(true);
      
      const response = await fetch('/api/send-prescription-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: userEmail,
          prescription: {
            ...emailPrescription,
            patientEmail: emailToSendTo // Use the recipient email from the input
          },
          message: emailMessage
        })
      });
      
      let errorMessage = 'Failed to send prescription via email.';
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          
          if (errorData.details) {
            console.error('📧 Email send error details:', errorData.details);
          }
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Provide specific error messages
        if (errorMessage.includes('not connected') || errorMessage.includes('Email not connected')) {
          errorMessage = '⚠️ Your email is not connected. Please go to Settings → Email Settings and connect your Gmail or Outlook account first.';
        } else if (errorMessage.includes('Patient email not available')) {
          errorMessage = '⚠️ Patient email address is not available. Please update the patient information with an email address.';
        } else if (errorMessage.includes('Storage account key')) {
          errorMessage = '⚠️ Email service configuration error. Please contact support.';
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Log prescription email sent to database (Activities table)
      try {
        if (user) {
          console.log('📝 Logging prescription email sent to database...', {
            patientId: emailPrescription.patientId || '',
            patientName: emailPrescription.patientName || '',
            userId: user.id || user.email || '',
            userName: user.name || user.email || '',
            prescriptionId: emailPrescription.prescriptionNumber || emailPrescription.rowKey || '',
            recipientEmail: emailToSendTo
          });
          
          const activity = await logPrescriptionSent(
            emailPrescription.patientId || '',
            emailPrescription.patientName || '',
            user.id || user.email || '',
            user.name || user.email || '',
            emailPrescription.prescriptionNumber || emailPrescription.rowKey || '',
            emailToSendTo
          );
          console.log('✅ Prescription email sent logged to database:', activity);
        } else {
          console.warn('⚠️ User not available, skipping activity log');
        }
      } catch (error) {
        console.error('❌ Error tracking prescription email in database:', error);
        // Don't fail the send if tracking fails
      }
      
      setShowEmailModal(false);
      setShowSuccessPopup(true);
      setEmailPrescription(null);
      setEmailMessage('');
      setRecipientEmail('');
      // Auto-hide success popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
      
      // Trigger a custom event to notify dashboard to refresh KPIs
      // Add a small delay to ensure database write is complete
      setTimeout(() => {
        console.log('📡 Dispatching prescriptionEmailSent event...');
        window.dispatchEvent(new CustomEvent('prescriptionEmailSent'));
      }, 1500);
    } catch (error: any) {
      console.error('❌ Error sending email:', error);
      alert(error.message || 'Failed to send prescription via email. Please check your email connection in Settings.');
    } finally {
      setSendingEmail(false);
    }
      }, [emailPrescription, emailMessage, recipientEmail, user, auth]);

  return (
    <div className="prescription-management">
      <div className="prescription-header">
        <h2>Prescription Management</h2>
        {currentView === 'list' && (
          <button onClick={handleCreateNew} className="btn-primary" disabled={loading}>
            ➕ New Prescription
          </button>
        )}
      </div>

      {/* LIST VIEW with Virtual Scrolling */}
      {currentView === 'list' && (
        <>
          <div className="prescription-filters">
            <input
              type="text"
              placeholder="🔍 Search by patient or prescription number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(0);
              }}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="filled">Filled</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading prescriptions...</p>
            </div>
          ) : paginatedPrescriptions.length === 0 ? (
            <div className="empty-state">
              <p>📋 No prescriptions found</p>
              <p>Create your first prescription to get started!</p>
            </div>
          ) : (
            <>
              <div className="prescriptions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Prescription #</th>
                      <th>Patient</th>
                      <th>Date</th>
                      <th>Diagnosis</th>
                      <th>Medications</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrescriptions.map((prescription) => (
                      <tr key={prescription.rowKey} className="prescription-row">
                        <td className="prescription-number">
                          {prescription.prescriptionNumber}
                        </td>
                        <td>{prescription.patientName}</td>
                        <td>{new Date(prescription.date).toLocaleDateString()}</td>
                        <td className="diagnosis-cell">
                          {prescription.diagnosis || 'N/A'}
                        </td>
                        <td>
                          <span className="med-count">
                            {prescription.medications.length} med{prescription.medications.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${prescription.status}`}>
                            {prescription.status}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <div className="action-buttons-container">
                            <button
                              onClick={() => handleEdit(prescription)}
                              className="action-btn action-btn-edit"
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleViewPDF(prescription)}
                              className="action-btn action-btn-view"
                              title="View PDF"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <path d="M14 2v6h6"></path>
                                <path d="M16 13H8"></path>
                                <path d="M16 17H8"></path>
                                <path d="M10 9H8"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(prescription)}
                              className="action-btn action-btn-camera"
                              title="Download PDF"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleSendEmail(prescription)}
                              className="action-btn action-btn-email"
                              title="Send via Email"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(prescription.rowKey)}
                              className="action-btn action-btn-delete"
                              title="Delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="btn-secondary"
                  >
                    ← Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage + 1} of {totalPages}
                    ({filteredPrescriptions.length} total)
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="btn-secondary"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* CREATE/EDIT VIEW */}
      {(currentView === 'create' || currentView === 'edit') && (
        <div className="prescription-form">
          <div className="form-header">
            <h3>{editingPrescription ? 'Edit Prescription' : 'New Prescription'}</h3>
            <button onClick={handleBack} className="btn-secondary">
              ← Back
            </button>
          </div>

            <div className="form-content">
              {/* Patient Selection - Optimized with Search */}
              <div className="form-group patient-search-container" style={{ position: 'relative' }}>
                <label>Patient *</label>
                <input
                  type="text"
                  value={selectedPatientName || patientSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPatientSearchTerm(value);
                    if (!value) {
                      setSelectedPatientId('');
                      setSelectedPatientName('');
                      setShowPatientDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (patientSearchTerm.length >= 2) {
                      setShowPatientDropdown(true);
                    }
                  }}
                  placeholder="Type patient name, email, or phone to search..."
                  className="form-input"
                  required
                  style={{ width: '100%' }}
                />
                {showPatientDropdown && patientSearchResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    marginTop: '4px'
                  }}>
                    {isSearchingPatients && (
                      <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                        Searching...
                      </div>
                    )}
                    {!isSearchingPatients && patientSearchResults.map((patient) => (
                      <div
                        key={patient.rowKey}
                        onClick={() => {
                          setSelectedPatientId(patient.rowKey);
                          setSelectedPatientName(`${patient.name}${patient.email ? ` - ${patient.email}` : ''}`);
                          setPatientSearchTerm('');
                          setShowPatientDropdown(false);
                        }}
                        style={{
                          padding: '10px 15px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                        }}
                      >
                        <div style={{ fontWeight: 500, color: '#333' }}>{patient.name || 'Unknown'}</div>
                        {patient.email && (
                          <div style={{ fontSize: '0.9em', color: '#666' }}>{patient.email}</div>
                        )}
                        {(patient.phone || patient.mobilePhone) && (
                          <div style={{ fontSize: '0.85em', color: '#999' }}>
                            {patient.phone || patient.mobilePhone}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {selectedPatientId && (
                  <div style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                    Selected: <strong>{selectedPatientName}</strong>
                  </div>
                )}
              </div>

              {/* Diagnosis */}
              <div className="form-group">
                <label>Diagnosis / Indication</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="form-textarea"
                  rows={3}
                  placeholder="Enter diagnosis or medical indication..."
                />
              </div>

              {/* Medications Section */}
              <div className="medications-section">
                <div className="section-header">
                  <h4>Medications</h4>
                  <button
                    onClick={() => setShowMedSearch(!showMedSearch)}
                    className="btn-primary"
                  >
                    {showMedSearch ? '✕ Cancel' : '➕ Add Medication'}
                  </button>
                </div>

                {/* Medication Search */}
                {showMedSearch && (
                  <div className="med-search-panel">
                    <div className="search-controls">
                      <input
                        type="text"
                        placeholder="Search medications..."
                        value={medSearchQuery}
                        onChange={(e) => setMedSearchQuery(e.target.value)}
                        className="search-input"
                      />
                      <select
                        value={medCategory}
                        onChange={(e) => setMedCategory(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="med-search-results">
                      {filteredMedications.length === 0 ? (
                        <p className="no-results">
                          {medSearchQuery || medCategory !== 'all' 
                            ? 'No medications found' 
                            : 'Search or select a category'}
                        </p>
                      ) : (
                        filteredMedications.map((med) => (
                          <div
                            key={med.id}
                            className={`med-result-item ${selectedMedForAdd?.id === med.id ? 'selected' : ''}`}
                            onClick={() => setSelectedMedForAdd(med)}
                          >
                            <div className="med-name">{med.brandName}</div>
                            <div className="med-generic">{med.genericName}</div>
                            {med.strength && <div className="med-strength">{med.strength}</div>}
                          </div>
                        ))
                      )}
                    </div>

                    {selectedMedForAdd && (
                      <button onClick={handleAddMedication} className="btn-primary">
                        Add Selected Medication
                      </button>
                    )}
                  </div>
                )}

                {/* Added Medications List */}
                <div className="medications-list">
                  {medications.length === 0 ? (
                    <p className="empty-medications">No medications added yet</p>
                  ) : (
                    medications.map((med, index) => (
                      <div key={index} className="medication-card">
                        <div className="med-card-header">
                          <h5>{med.medicationName}</h5>
                          <button
                            onClick={() => handleRemoveMedication(index)}
                            className="btn-sm btn-danger"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {med.genericName && (
                          <p className="generic-name">Generic: {med.genericName}</p>
                        )}

                        <div className="med-card-fields">
                          <div className="field-group">
                            <label>Dosage</label>
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => handleUpdateMedication(index, 'dosage', e.target.value)}
                              placeholder="e.g., 500mg"
                              className="form-input"
                            />
                          </div>

                          <div className="field-group">
                            <label>Frequency</label>
                            <input
                              type="text"
                              value={med.frequency}
                              onChange={(e) => handleUpdateMedication(index, 'frequency', e.target.value)}
                              placeholder="e.g., Twice daily"
                              className="form-input"
                            />
                          </div>

                          <div className="field-group">
                            <label>Duration</label>
                            <input
                              type="text"
                              value={med.duration}
                              onChange={(e) => handleUpdateMedication(index, 'duration', e.target.value)}
                              placeholder="e.g., 7 days"
                              className="form-input"
                            />
                          </div>

                          <div className="field-group">
                            <label>Quantity</label>
                            <input
                              type="number"
                              value={med.quantity}
                              onChange={(e) => handleUpdateMedication(index, 'quantity', parseInt(e.target.value) || 0)}
                              min="1"
                              className="form-input"
                            />
                          </div>

                          <div className="field-group">
                            <label>Refills</label>
                            <input
                              type="number"
                              value={med.refills}
                              onChange={(e) => handleUpdateMedication(index, 'refills', parseInt(e.target.value) || 0)}
                              min="0"
                              className="form-input"
                            />
                          </div>
                        </div>

                        <div className="field-group">
                          <label>Instructions</label>
                          <textarea
                            value={med.instructions}
                            onChange={(e) => handleUpdateMedication(index, 'instructions', e.target.value)}
                            placeholder="Special instructions..."
                            rows={2}
                            className="form-textarea"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                  rows={3}
                  placeholder="Any additional notes or instructions..."
                />
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button onClick={handleBack} className="btn-secondary" disabled={loading}>
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingPrescription ? 'Update Prescription' : 'Create Prescription'}
                </button>
            </div>
              </div>
            </div>
          )}

      {/* Email Modal */}
      {showEmailModal && emailPrescription && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Send Prescription via Email</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>Prescription:</strong> {emailPrescription.prescriptionNumber}
        </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#2c3e50' }}>
                To (Email Address):
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={emailPrescription.patientEmail || 'Enter recipient email address'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
              {emailPrescription.patientEmail && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                  Patient email: <strong>{emailPrescription.patientEmail}</strong>
                </p>
              )}
              {!emailPrescription.patientEmail && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                  <em>No patient email on file. Please enter recipient email.</em>
                </p>
              )}
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#2c3e50' }}>
                Message:
              </label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                placeholder="Enter your message..."
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailPrescription(null);
                  setEmailMessage('');
                  setRecipientEmail('');
                }}
                disabled={sendingEmail}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef',
                  background: 'white',
                  color: '#2c3e50',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmailConfirm}
                disabled={sendingEmail || !recipientEmail.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: sendingEmail ? '#6c757d' : '#8b5cf6',
                  color: 'white',
                  fontWeight: 600,
                  cursor: sendingEmail ? 'not-allowed' : 'pointer'
                }}
              >
                {sendingEmail ? 'Sending...' : '📧 Send Email'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Beautiful Success Popup */}
      {showSuccessPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            animation: 'slideUp 0.4s ease-out',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative background elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(40px)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(30px)'
            }}></div>

            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              position: 'relative',
              zIndex: 1
            }}>
              <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </div>

            {/* Message */}
            <h2 style={{
              margin: '0 0 0.75rem 0',
              color: 'white',
              fontSize: '1.75rem',
              fontWeight: 700,
              position: 'relative',
              zIndex: 1
            }}>
              Success!
            </h2>
            <p style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              position: 'relative',
              zIndex: 1
            }}>
              Prescription sent successfully via email!
            </p>

            {/* Close Button */}
            <button
              onClick={() => setShowSuccessPopup(false)}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 2rem',
                background: 'rgba(255, 255, 255, 0.25)',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                zIndex: 1,
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PrescriptionManagement;
