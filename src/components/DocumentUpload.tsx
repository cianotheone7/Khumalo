import { useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadDocument, batchUploadDocuments } from '../services/azureBlobService';
// import { processDocument, processMedicalDocument, validateMedicalDocument } from '../lib/document-processor';
import ComprehensiveManualInput from './CBCManualInput';
import { createDocument } from '../services/azureTableRestService';

type DocumentUploadProps = {
  patientId: string;
  onClose: () => void;
  onDocumentUploaded: () => void;
};

export function DocumentUpload({ patientId, onClose, onDocumentUploaded }: DocumentUploadProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
  const [processingStep, setProcessingStep] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🟢 FILES SELECTED:', e.target.files?.length || 0);
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setError('');
    console.log('🟢 FILES STATE UPDATED:', selectedFiles.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || files.length === 0) {
      setError('Please select files to upload');
      setLoading(false);
      return;
    }

    console.log('🚀 Form submitted - upload process starting...');
    console.log('📊 Loading should already be visible from button click');
    
    // Ensure loading state is set (might already be set from button click)
    if (!loading) {
      flushSync(() => {
        setError('');
        setUploadComplete(false);
        setUploadSuccess(false);
        setUploadProgress({ completed: 0, total: files.length });
        setProcessingStep('Preparing upload...');
        setLoading(true);
      });
    }
    
    // Now start the upload after ensuring UI has updated
    setTimeout(() => {
      performUpload();
    }, 50);
  };

  const performUpload = async () => {
    console.log('✅ Loading overlay should be visible now');
    console.log('📊 Starting actual upload...');
    
    // Additional delay to ensure loading screen is fully rendered
    await new Promise(resolve => setTimeout(resolve, 200));

    setProcessingStep('Uploading to secure storage...');
    
    try {
      // Skip document processing - will be done during AI summary generation for better performance
      const processedDocuments = files.map(file => ({
        file,
        text: '', // Will be processed during AI summary
        metadata: {
          wordCount: 0,
          confidence: 0,
          language: 'en',
          pageCount: 1,
          extractionMethod: 'Deferred - will process during AI summary'
        }
      }));

      // Upload to Azure Storage
      const uploadResults = await batchUploadDocuments(
        files,
        patientId,
        (completed, total) => {
          setUploadProgress({ completed, total });
        }
      );

      // Save document metadata to database in parallel for better performance
      setProcessingStep('Saving document records...');
      
      const savePromises = uploadResults.successful.map((result, i) => {
        const file = files[i];
        const processed = processedDocuments.find(p => p.file === file);
        
        return createDocument({
          patientId: patientId,
          fileName: file.name,
          blobUrl: result.url || '',
          documentType: 'Other', // Default document type
          contentType: file.type,
          fileSize: file.size,
          description: description || '',
          processedText: processed ? processed.text : undefined
        });
      });
      
      await Promise.all(savePromises);

      console.log('✅ Upload complete! Results:', uploadResults);
      
      if (uploadResults.failed.length > 0) {
        // Show partial success or full failure
        setUploadComplete(true);
        setUploadSuccess(false);
        setProcessingStep(`Failed: ${uploadResults.failed.length} files failed to upload`);
        setError(`${uploadResults.failed.length} files failed to upload. ${uploadResults.successful.length} files uploaded successfully.`);
        
        // If some succeeded, still refresh after showing message
        if (uploadResults.successful.length > 0) {
          setTimeout(() => {
            onDocumentUploaded();
            onClose();
          }, 3000);
        } else {
          // All failed - keep modal open
          setLoading(false);
        }
      } else {
        // Show success message
        console.log('✅ All files uploaded successfully, refreshing document list...');
        setUploadComplete(true);
        setUploadSuccess(true);
        setProcessingStep('Upload Successful! 🎉');
        
        // Wait 2 seconds to show success message, then close and refresh
        setTimeout(async () => {
          await onDocumentUploaded();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadComplete(true);
      setUploadSuccess(false);
      setProcessingStep('Upload Failed ❌');
      setError(error instanceof Error ? error.message : 'Upload failed');
      setLoading(false);
    }
  };

  const handleManualInputSave = async (data: {
    text: string;
    metadata: {
      wordCount: number;
      confidence: number;
      extractionMethod: string;
      documentType: string;
    };
  }) => {
    if (!user || !failedFile) return;

    setLoading(true);
    setError('');

    try {
      // Upload the file to Azure Storage
      const uploadResult = await uploadDocument(failedFile, patientId);
      
      // Create document record in Azure Table Storage
      await createDocument({
        id: uploadResult.id,
        patientId,
        fileName: failedFile.name,
        fileType: failedFile.type,
        fileSize: failedFile.size,
        uploadDate: new Date().toISOString(),
        description: description || 'Manually processed document',
        text: data.text,
        metadata: data.metadata,
        blobUrl: uploadResult.url
      });

      setShowManualInput(false);
      setFailedFile(null);
      onDocumentUploaded();
      onClose();
    } catch (error) {
      console.error('Error saving manual input:', error);
      setError(`Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualInputCancel = () => {
    setShowManualInput(false);
    setFailedFile(null);
    setLoading(false);
  };

  // Show manual input if processing failed
  if (showManualInput && failedFile) {
    return (
      <div className="modal-overlay" onClick={handleManualInputCancel}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <ComprehensiveManualInput
            onSave={handleManualInputSave}
            onCancel={handleManualInputCancel}
            fileName={failedFile.name}
            fileType={failedFile.type}
          />
        </div>
      </div>
    );
  }

  // Debug: Log loading state
  console.log('🔍 DocumentUpload render - loading:', loading, 'files:', files.length);

  // Loading overlay component (rendered via portal)
  const LoadingOverlay = () => loading ? createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      color: 'white'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        {/* Show different content based on upload state */}
        {uploadComplete && uploadSuccess ? (
          // SUCCESS STATE
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              animation: 'scaleIn 0.5s ease'
            }}>
              <span style={{ fontSize: '3rem' }}>✓</span>
            </div>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#10b981', fontWeight: 'bold' }}>
              Upload Successful! 🎉
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem' }}>
              {uploadProgress.total} file(s) uploaded successfully
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginTop: '1rem' }}>
              Refreshing document list...
            </p>
          </>
        ) : uploadComplete && !uploadSuccess ? (
          // FAILURE STATE
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              animation: 'scaleIn 0.5s ease'
            }}>
              <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>✕</span>
            </div>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#ef4444', fontWeight: 'bold' }}>
              Upload Failed ❌
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem' }}>
              {error || 'An error occurred during upload'}
            </p>
          </>
        ) : (
          // UPLOADING STATE
          <>
            <div className="loading-spinner" style={{
              width: '60px',
              height: '60px',
              border: '5px solid rgba(255, 255, 255, 0.3)',
              borderTop: '5px solid #4ecdc4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }}></div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'white' }}>
              {processingStep || 'Uploading Document...'}
            </h3>
            {uploadProgress.total > 0 && (
              <div style={{ margin: '1.5rem 0' }}>
                <p style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'white' }}>
                  Uploading {uploadProgress.completed} of {uploadProgress.total} file(s)
                </p>
                <div style={{
                  width: '300px',
                  height: '12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  margin: '1rem auto'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #4ecdc4, #45b7d1)',
                    width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <p style={{ fontSize: '1.8rem', fontWeight: 700, color: '#4ecdc4' }}>
                  {Math.round((uploadProgress.completed / uploadProgress.total) * 100)}%
                </p>
              </div>
            )}
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Please wait, do not close this window...
            </p>
          </>
        )}
      </div>
      <style>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <LoadingOverlay />
      <div className="modal-overlay" onClick={loading ? undefined : onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
          opacity: loading ? 0.6 : 1,
          pointerEvents: loading ? 'none' : 'auto',
          transition: 'opacity 0.3s ease',
          position: 'relative'
        }}>
        {/* Inline loading indicator - shows IMMEDIATELY */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '8px'
          }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '5px solid rgba(255, 255, 255, 0.3)',
                borderTop: '5px solid #4ecdc4',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <h2 style={{ 
                fontSize: '24px', 
                margin: '0 0 10px 0', 
                fontWeight: 'bold',
                color: '#4ecdc4'
              }}>UPLOADING...</h2>
              <p style={{ fontSize: '16px', margin: 0, opacity: 0.9 }}>
                {processingStep || 'Please wait...'}
              </p>
              {uploadProgress.total > 0 && (
                <p style={{ fontSize: '14px', margin: '10px 0 0 0', opacity: 0.8 }}>
                  {uploadProgress.completed} of {uploadProgress.total} files
                </p>
              )}
            </div>
          </div>
        )}
        <div className="modal-header">
          <h2>Upload Document v2.1</h2>
          <button onClick={onClose} className="close-button" disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Upload Method *</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => setCaptureMode('file')}
                className={`btn ${captureMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                disabled={loading}
                style={{ flex: 1 }}
              >
                📁 Choose Files
              </button>
              <button
                type="button"
                onClick={() => setCaptureMode('camera')}
                className={`btn ${captureMode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
                disabled={loading}
                style={{ flex: 1 }}
              >
                📷 Take Photo
              </button>
            </div>

            {captureMode === 'file' ? (
              <div>
                <label htmlFor="files" style={{ fontWeight: 'normal', fontSize: '0.9em', color: '#666' }}>
                  Select files from your device (multiple files supported)
                </label>
                <input
                  id="files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  required
                  disabled={loading}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.tiff,.bmp"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="camera" style={{ fontWeight: 'normal', fontSize: '0.9em', color: '#666' }}>
                  Take a photo using your device camera
                </label>
                <input
                  id="camera"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  required
                  disabled={loading}
                />
                <small style={{ display: 'block', marginTop: '8px', color: '#666', fontSize: '0.85em' }}>
                  📸 This will open your device camera. Use "environment" for back camera (better for documents).
                </small>
              </div>
            )}

            {files.length > 0 && (
              <div className="files-info" style={{ marginTop: '15px' }}>
                <div className="files-count">{files.length} file(s) selected</div>
                <div className="files-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document (optional)"
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || files.length === 0}
              onClick={(e) => {
                // Show loading IMMEDIATELY on button click, before form submission
                console.log('🔵 UPLOAD BUTTON CLICKED! Loading:', loading, 'Files:', files.length);
                if (!loading && files.length > 0) {
                  console.log('🟡 SETTING LOADING STATE NOW!');
                  flushSync(() => {
                    setLoading(true);
                    setProcessingStep('Preparing upload...');
                  });
                  console.log('🟢 LOADING STATE SET! Should show overlay now!');
                }
              }}
              style={{
                position: 'relative',
                minWidth: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading && (
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></span>
              )}
              <span>{loading ? 'Uploading...' : `📤 Upload ${files.length} Document${files.length !== 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
