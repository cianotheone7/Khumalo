import { useState, useEffect } from 'react';
import { getDocuments, getAISummaries, createAISummary, permanentDeleteDocument, restoreDocument } from '../services/azureTableRestService';
import type { Document, AISummary } from '../services/azureTableRestService';
import type { Patient } from '../services/azurePatientRestService';
import { updatePatient } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { generateMedicalSummary } from '../services/azureOpenAIService';
import { DocumentUpload } from './DocumentUpload';
// import { deleteDocument as deleteBlobDocument } from '../services/azureBlobService';
import { logDocumentDeleted } from '../services/activityService';

// Add CSS for clickable documents
const documentRowStyle = `
  .documents-table tbody tr {
    transition: background-color 0.2s ease;
  }
  .documents-table tbody tr:hover {
    background-color: #f0f7ff;
  }
  .doc-filename:hover {
    text-decoration: underline;
  }
`;

type PatientDetailsProps = {
  patient: Patient;
  onPatientUpdated: () => void;
};

export function PatientDetails({ patient }: PatientDetailsProps) {
  console.log('🔍 PatientDetails received patient:', patient);
  console.log('🏠 Address fields:', {
    homeNumber: patient.homeNumber,
    streetAddress: patient.streetAddress,
    city: patient.city,
    province: patient.province,
    postalCode: patient.postalCode,
    country: patient.country
  });
  
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deletedDocuments, setDeletedDocuments] = useState<Document[]>([]);
  const [showDeletedDocs, setShowDeletedDocs] = useState(false);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [editingChronicConditions, setEditingChronicConditions] = useState(false);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [savingConditions, setSavingConditions] = useState(false);

  const loadDocuments = async (silent: boolean = false) => {
    if (!silent) {
      setLoadingDocs(true);
    }
    try {
      console.log(`🔥 PatientDetails - Loading docs for patient:`, {
        name: (patient as any).fullName || patient.name,
        rowKey: patient.rowKey,
        medicalRecordNumber: patient.medicalRecordNumber,
        partitionKey: patient.partitionKey
      });
      
      // CRITICAL CHECK: Ensure patient has a valid rowKey
      if (!patient.rowKey || patient.rowKey.trim() === '') {
        console.error('❌ ERROR: Patient has no valid rowKey! Cannot load documents.');
        console.error('❌ Patient data:', patient);
        setDocuments([]);
        setDeletedDocuments([]);
        setLoadingDocs(false);
        return;
      }
      
      // Try rowKey first (most consistent with legacy data); fallback to MRN if empty
      const primaryId = patient.rowKey;
      const secondaryId = patient.medicalRecordNumber && patient.medicalRecordNumber !== primaryId
        ? patient.medicalRecordNumber
        : undefined;

      let data: Document[] = [];
      if (secondaryId) {
        const [a, b] = await Promise.all([
          getDocuments(primaryId, false),
          getDocuments(secondaryId, false)
        ]);
        const seen = new Set<string>();
        data = [...a, ...b].filter(d => {
          if (seen.has(d.rowKey)) return false;
          seen.add(d.rowKey);
          return !d.isDeleted;
        });
      } else {
        data = await getDocuments(primaryId, false);
      }
      console.log(`🔥 PatientDetails - Got ${data.length} active documents`);
      console.log('📄 Document list:', data.map(d => ({ fileName: d.fileName, rowKey: d.rowKey, patientId: d.patientId })));
      setDocuments(data);
      
      // Also load deleted documents count
      let deletedData: Document[] = [];
      if (secondaryId) {
        const [aDel, bDel] = await Promise.all([
          getDocuments(primaryId, true),
          getDocuments(secondaryId, true)
        ]);
        const seenDel = new Set<string>();
        deletedData = [...aDel, ...bDel].filter(d => {
          if (seenDel.has(d.rowKey)) return false;
          seenDel.add(d.rowKey);
          return !!d.isDeleted;
        });
      } else {
        deletedData = (await getDocuments(primaryId, true)).filter(d => !!d.isDeleted);
      }
      const deleted = deletedData.filter(d => d.isDeleted);
      console.log(`🔥 PatientDetails - Got ${deleted.length} deleted documents`);
      setDeletedDocuments(deleted);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      if (!silent) {
        setLoadingDocs(false);
      }
    }
  };

  const loadSummaries = async () => {
    try {
      const data = await getAISummaries(patient.rowKey);
      setSummaries(data);
    } catch (error) {
      console.error('Error loading summaries:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadSummaries();
    // Initialize chronic conditions from patient data
    if (patient.chronicConditions) {
      const conditions = patient.chronicConditions.split(',').map(c => c.trim()).filter(Boolean);
      setChronicConditions(conditions);
    } else {
      setChronicConditions([]);
    }
  }, [patient.rowKey]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDocumentClick = async (doc: Document) => {
    if (!doc.blobUrl) {
      alert('Document URL not available. Please try uploading the document again.');
      return;
    }

    try {
      console.log('📄 Document clicked:', doc.fileName);
      console.log('🔗 Opening blob URL:', doc.blobUrl);
      console.log('🚀 Opening document in new tab...');
      
      // Open document directly (container must be public for this to work)
      const newWindow = window.open(doc.blobUrl, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        alert('Pop-up blocked! Please allow pop-ups for this site to view documents.');
      } else {
        console.log('✅ Document opened successfully');
      }
    } catch (error) {
      console.error('❌ Error opening document:', error);
      alert(`Failed to open document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleWhatsAppClick = (doc: Document) => {
    console.log('📱 WhatsApp click for document:', doc.fileName);
    setSelectedDocument(doc);
    
    // Pre-populate phone numbers
    const phoneNumbers = [
      patient.whatsappPhone,
      patient.mobilePhone,
      patient.phone
    ].filter(Boolean);
    
    setWhatsappPhone(phoneNumbers[0] || '');
    
    // Default message
    setWhatsappMessage(
      `Hello ${patient.name},

Please find your medical document attached: ${doc.fileName}

From ${user?.name || 'your medical practice'}`
    );
    
    setShowWhatsAppModal(true);
  };

  const sendViaWhatsApp = () => {
    if (!selectedDocument || !whatsappPhone) {
      alert('Please select a phone number');
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = whatsappPhone.replace(/[^\d+]/g, '');
    
    // Encode message
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const encodedUrl = encodeURIComponent(selectedDocument.blobUrl);
    
    // WhatsApp Web URL with message and link to document
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}%0A%0ADocument:%20${encodedUrl}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Close modal
    setShowWhatsAppModal(false);
    setSelectedDocument(null);
  };

  const generateAISummary = async () => {
    if (!user) return;

    setGeneratingSummary(true);
    try {
      // Calculate patient age
      const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : 0;
      
      // Prepare request for Azure OpenAI
      const summaryRequest = {
        patientName: patient.name,
        patientAge: typeof age === 'string' ? parseInt(age) || 0 : age,
        medicalRecordNumber: patient.medicalRecordNumber || '',
        documents: documents.map(doc => ({
          fileName: doc.fileName,
          description: doc.description || '',
          uploadedAt: doc.uploadedAt,
          documentType: doc.documentType || 'Other',
          processedText: doc.processedText
        }))
      };
      
      const summaryResponse = await generateMedicalSummary(summaryRequest);

      await createAISummary({
        patientId: patient.rowKey,
        summaryText: summaryResponse.summary,
        generatedBy: user.id,
        documentIds: documents.map(d => d.rowKey).join(',')
      });

      await loadSummaries();
      alert('✅ AI Summary generated successfully!');
    } catch (error) {
      console.error('Error generating summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Failed to generate AI summary:\n\n${errorMessage}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '?';
    
    try {
      const today = new Date();
      const birthDate = new Date(dob);
      
      if (isNaN(birthDate.getTime())) {
        return '?';
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      return '?';
    }
  };

  const saveChronicConditions = async () => {
    setSavingConditions(true);
    try {
      const conditionsString = chronicConditions.join(', ');
      const updated = await updatePatient(patient.id || patient.rowKey, {
        chronicConditions: conditionsString
      });
      
      if (updated) {
        alert('Chronic conditions updated successfully!');
        setEditingChronicConditions(false);
      } else {
        alert('Failed to update chronic conditions. Please try again.');
      }
    } catch (error) {
      console.error('Error updating chronic conditions:', error);
      alert('Failed to update chronic conditions. Please try again.');
    } finally {
      setSavingConditions(false);
    }
  };

  const handleDocumentUploaded = async () => {
    setShowUploadModal(false);
    console.log('📄 Document uploaded, refreshing list...');
    
    // Add a small delay to allow Azure Table Storage to index the new document
    // Azure Table Storage has eventual consistency, so we wait briefly before querying
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await loadDocuments();
    await loadSummaries();
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
    try {
      console.log('🗑️ Starting deletion for:', doc.fileName, 'RowKey:', doc.rowKey);
      
      // Delete the specific document by its unique rowKey
      const success = await permanentDeleteDocument(doc.partitionKey, doc.rowKey);
      console.log(`✅ Delete result: ${success}`);
      
      if (success) {
        // Remove from UI immediately
        setDocuments(prev => prev.filter(d => d.rowKey !== doc.rowKey));
        
        // Also update deleted documents list
        setDeletedDocuments(prev => [...prev, doc]);
        
        if (user) {
          await logDocumentDeleted(
            patient.rowKey,
            patient.name,
            user.id || user.email,
            user.name || user.email,
            doc.rowKey,
            doc.fileName
          );
        }
        
        // Force reload after 1 second to verify deletion stuck
        setTimeout(() => {
          loadDocuments(true); // silent reload
        }, 1000);
      } else {
        alert('Failed to delete document. Please check console for details.');
      }
    } catch (e) {
      console.error('❌ Delete error:', e);
      alert('Failed to delete document. Please check console for details.');
    }
  };

  const handleRestoreDocument = async (doc: Document) => {
    if (!confirm(`Restore "${doc.fileName}"?`)) {
      return;
    }

    try {
      console.log('♻️ Restoring document:', doc.fileName);
      
      const restoreSuccess = await restoreDocument(doc.partitionKey, doc.rowKey);
      
      if (restoreSuccess) {
        console.log('✅ Document restored successfully!');
        alert('Document restored successfully!');
      } else {
        console.error('❌ Failed to restore document');
        alert('Failed to restore document. Please try again.');
      }
      
      // Refresh the documents list
      await loadDocuments();
      
    } catch (error) {
      console.error('❌ Unexpected error restoring document:', error);
      alert(`Failed to restore document: ${error instanceof Error ? error.message : 'Unknown error'}.`);
      await loadDocuments();
    }
  };

  return (
    <>
      <style>{documentRowStyle}</style>
      <div className="patient-details">
        <div className="patient-header">
          <div className="patient-avatar-large">
            {patient.name ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'}
          </div>
          <div className="patient-header-info">
            <h2>{patient.name || 'Unknown Patient'}</h2>
            <div className="patient-metadata">
              <span>File: {patient.medicalRecordNumber}</span>
              <span>DOB: {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'Not specified'}</span>
            <span>Age: {patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : '?'} years</span>
          </div>
          {patient.email && <div className="patient-contact">📧 {patient.email}</div>}
          {patient.phone && <div className="patient-contact">📞 {patient.phone}</div>}
        </div>
      </div>

      <div className="section">
        <h3>Basic Information</h3>
        <div className="patient-info-grid">
          <div className="info-item">
            <label>Full Name:</label>
            <span>{patient.name || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Medical Record #:</label>
            <span>{patient.medicalRecordNumber || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Email:</label>
            <span>{patient.email || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Phone:</label>
            <span>{patient.phone || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Mobile Phone:</label>
            <span>{patient.mobilePhone || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>WhatsApp Phone:</label>
            <span>{patient.whatsappPhone || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Passport/ID Number:</label>
            <span>{patient.passportId || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Gender:</label>
            <span>{patient.gender || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Date of Birth:</label>
            <span>{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Age:</label>
            <span>{patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : '?'} years</span>
          </div>
          <div className="info-item">
            <label>Status:</label>
            <span style={{ 
              color: patient.status === 'Deceased' ? '#dc3545' : patient.status === 'Living' ? '#28a745' : '#6c757d',
              fontWeight: '500'
            }}>
              {patient.status || 'Unknown'}
              {patient.status === 'Deceased' && patient.deceasedDate && ` (${formatDate(patient.deceasedDate)})`}
            </span>
          </div>
          <div className="info-item">
            <label>Emergency Contact:</label>
            <span>{patient.emergencyContact || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Medical Aid Scheme:</label>
            <span>{patient.insuranceProvider || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Medical Aid Number:</label>
            <span>{patient.medicalAidNumber || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Dependent Code:</label>
            <span>{patient.dependentCode || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Allergies:</label>
            <span>{patient.allergies || 'None reported'}</span>
          </div>
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Chronic Conditions:</span>
              {!editingChronicConditions && (
                <button
                  onClick={() => setEditingChronicConditions(true)}
                  style={{
                    background: '#4ecdc4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </label>
            {editingChronicConditions ? (
              <div style={{ marginTop: '10px' }}>
                <select
                  multiple
                  value={chronicConditions}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                    setChronicConditions(selectedOptions);
                  }}
                  style={{
                    minHeight: '150px',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#000',
                    marginBottom: '15px'
                  }}
                >
                  <option value="Diabetes Type 1" style={{ color: '#000' }}>Diabetes Type 1</option>
                  <option value="Diabetes Type 2" style={{ color: '#000' }}>Diabetes Type 2</option>
                  <option value="Hypertension" style={{ color: '#000' }}>Hypertension</option>
                  <option value="Asthma" style={{ color: '#000' }}>Asthma</option>
                  <option value="COPD" style={{ color: '#000' }}>COPD</option>
                  <option value="Heart Disease" style={{ color: '#000' }}>Heart Disease</option>
                  <option value="Chronic Kidney Disease" style={{ color: '#000' }}>Chronic Kidney Disease</option>
                  <option value="Arthritis" style={{ color: '#000' }}>Arthritis</option>
                  <option value="Epilepsy" style={{ color: '#000' }}>Epilepsy</option>
                  <option value="HIV/AIDS" style={{ color: '#000' }}>HIV/AIDS</option>
                  <option value="Cancer" style={{ color: '#000' }}>Cancer</option>
                  <option value="Depression" style={{ color: '#000' }}>Depression</option>
                  <option value="Anxiety Disorder" style={{ color: '#000' }}>Anxiety Disorder</option>
                  <option value="Bipolar Disorder" style={{ color: '#000' }}>Bipolar Disorder</option>
                  <option value="Schizophrenia" style={{ color: '#000' }}>Schizophrenia</option>
                  <option value="Thyroid Disorder" style={{ color: '#000' }}>Thyroid Disorder</option>
                  <option value="Obesity" style={{ color: '#000' }}>Obesity</option>
                  <option value="High Cholesterol" style={{ color: '#000' }}>High Cholesterol</option>
                </select>
                <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '10px', display: 'block' }}>Hold Ctrl (Windows) or Cmd (Mac) to select multiple</small>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={saveChronicConditions}
                    disabled={savingConditions}
                    style={{
                      background: '#4ecdc4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.6rem 1.2rem',
                      cursor: savingConditions ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      opacity: savingConditions ? 0.6 : 1
                    }}
                  >
                    {savingConditions ? '💾 Saving...' : '💾 Save to Database'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingChronicConditions(false);
                      // Reset to original values
                      if (patient.chronicConditions) {
                        const conditions = patient.chronicConditions.split(',').map(c => c.trim()).filter(Boolean);
                        setChronicConditions(conditions);
                      } else {
                        setChronicConditions([]);
                      }
                    }}
                    disabled={savingConditions}
                    style={{
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.6rem 1.2rem',
                      cursor: savingConditions ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      opacity: savingConditions ? 0.6 : 1
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <span>{chronicConditions.length > 0 ? chronicConditions.join(', ') : 'None reported'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Address Section - Always show */}
      <div className="section">
        <h3>Address Information</h3>
        <div className="patient-info-grid">
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label>Home/Unit Number or Estate:</label>
            <span>{patient.homeNumber || 'Not specified'}</span>
          </div>
          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
            <label>Street Address:</label>
            <span>{patient.streetAddress || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Suburb:</label>
            <span>{patient.suburb || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>City:</label>
            <span>{patient.city || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Province:</label>
            <span>{patient.province || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Postal Code:</label>
            <span>{patient.postalCode || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <label>Country:</label>
            <span>{patient.country || 'Not specified'}</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h3>AI Summary</h3>
          <button
            onClick={generateAISummary}
            disabled={generatingSummary}
            className="btn-primary btn-sm"
          >
            {generatingSummary ? 'Generating...' : '✨ Generate Summary'}
          </button>
        </div>
        <div className="summaries-list">
          {summaries.length === 0 ? (
            <div className="empty-section">
              No summaries generated yet. Click "Generate Summary" to create an AI-powered summary of this patient's records.
            </div>
          ) : (
            summaries.map((summary) => {
              // Remove ALL markdown formatting for clean professional display
              let cleanText = summary.summaryText
                // Remove headers (##, ###, ####)
                .replace(/^#{1,6}\s+(.+)$/gm, '$1')
                // Remove bold+italic (*** or ___)
                .replace(/[*_]{3}([^*_]+)[*_]{3}/g, '$1')
                // Remove bold (** or __)
                .replace(/[*_]{2}([^*_]+)[*_]{2}/g, '$1')
                // Remove italic (* or _)
                .replace(/[*_]([^*_]+)[*_]/g, '$1')
                // Remove code markers (`)
                .replace(/`([^`]+)`/g, '$1')
                // Convert bullet points to clean bullets
                .replace(/^[*+-]\s+/gm, '• ')
                // Remove excessive newlines (max 2)
                .replace(/\n{3,}/g, '\n\n');
              
              return (
                <div key={summary.rowKey} className="summary-card">
                  <div className="summary-header">
                    <span className="summary-date">{formatDateTime(summary.createdAt)}</span>
                  </div>
                  <pre className="summary-text">{cleanText}</pre>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '12px', 
        padding: '1.5rem 2rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '1.3rem', 
            margin: 0,
            fontWeight: '600'
          }}>📄 Documents ({documents.length})</h3>
          <button
            onClick={() => {
              console.log('🔴 UPLOAD BUTTON CLICKED - Opening modal');
              setShowUploadModal(true);
            }}
            className="btn-primary btn-sm"
          >
            📎 Upload Document {/* v2.1 */}
          </button>
        </div>
        <div className="documents-list">
          {loadingDocs ? (
            <div className="loading-section">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="empty-section">
              No documents uploaded yet. Click "Upload Document" to add patient files.
            </div>
          ) : (
            <table className="documents-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Description</th>
                  <th>Uploaded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.rowKey}>
                    <td className="doc-filename">
                      📄 {doc.fileName}
                    </td>
                    <td>{doc.documentType}</td>
                    <td>{formatFileSize(doc.fileSize)}</td>
                    <td>{doc.description || '-'}</td>
                    <td>{formatDateTime(doc.uploadedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleDocumentClick(doc)}
                          className="document-view-btn"
                          title="View document in new tab"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleWhatsAppClick(doc)}
                          className="document-whatsapp-btn"
                          title="Send via WhatsApp"
                          style={{
                            background: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#128C7E'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
                        >
                          📱
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="document-delete-btn"
                          title="Delete document"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Deleted Documents Section */}
      {deletedDocuments.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h3>🗑️ Deleted Documents ({deletedDocuments.length})</h3>
            <button
              onClick={() => setShowDeletedDocs(!showDeletedDocs)}
              className="btn-secondary btn-sm"
            >
              {showDeletedDocs ? 'Hide' : 'Show'} Deleted
            </button>
          </div>
          {showDeletedDocs && (
            <div className="documents-list" style={{ opacity: 0.8 }}>
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Deleted At</th>
                    <th>Deleted By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedDocuments.map((doc) => (
                    <tr key={doc.rowKey} style={{ backgroundColor: '#fff3cd' }}>
                      <td className="doc-filename">
                        🗑️ {doc.fileName}
                      </td>
                      <td>{doc.documentType}</td>
                      <td>{doc.deletedAt ? formatDateTime(doc.deletedAt) : '-'}</td>
                      <td>{doc.deletedBy || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleRestoreDocument(doc)}
                            className="btn-primary btn-sm"
                            title="Restore document"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            ♻️ Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <DocumentUpload
          patientId={patient.rowKey}
          onClose={() => setShowUploadModal(false)}
          onDocumentUploaded={handleDocumentUploaded}
        />
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && selectedDocument && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                color: '#fff', 
                fontSize: '1.5rem', 
                margin: 0, 
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📱 Send via WhatsApp
              </h3>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
                Document: {selectedDocument.fileName}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#cbd5e1', 
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Phone Number
              </label>
              <select
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              >
                {patient.whatsappPhone && (
                  <option value={patient.whatsappPhone}>
                    WhatsApp: {patient.whatsappPhone}
                  </option>
                )}
                {patient.mobilePhone && (
                  <option value={patient.mobilePhone}>
                    Mobile: {patient.mobilePhone}
                  </option>
                )}
                {patient.phone && (
                  <option value={patient.phone}>
                    Phone: {patient.phone}
                  </option>
                )}
                <option value="">Custom number...</option>
              </select>
              
              {whatsappPhone === '' && (
                <input
                  type="tel"
                  placeholder="Enter phone number with country code (e.g., +27...)"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '1rem',
                    marginTop: '0.5rem'
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                color: '#cbd5e1', 
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                Message
              </label>
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setSelectedDocument(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendViaWhatsApp}
                disabled={!whatsappPhone}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: whatsappPhone ? '#25D366' : '#64748b',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: whatsappPhone ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  fontWeight: '600'
                }}
              >
                Send to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
