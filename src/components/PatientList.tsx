import { useState, useMemo } from 'react';
import type { Patient } from '../services/azurePatientRestService';

type PatientListProps = {
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  loading: boolean;
};

const PATIENTS_PER_PAGE = 50;

export function PatientList({ patients, selectedPatient, onSelectPatient, loading }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;
    
    const term = searchTerm.toLowerCase();
    return patients.filter(patient => {
      const name = patient.name || '';
      const mrn = patient.medicalRecordNumber || '';
      return name.toLowerCase().includes(term) || mrn.toLowerCase().includes(term);
    });
  }, [patients, searchTerm]);

  const totalPages = Math.ceil(filteredPatients.length / PATIENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PATIENTS_PER_PAGE;
  const endIndex = startIndex + PATIENTS_PER_PAGE;
  const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="patient-list">
        <div className="loading-state">Loading patients...</div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <div className="patient-list-container">
      <div className="patient-search">
        <input
          type="text"
          placeholder="Search patients by name or file number..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
        <div className="patient-count">
          Showing {paginatedPatients.length} of {filteredPatients.length} patients
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="patient-list">
          <div className="empty-list">
            {searchTerm ? 'No patients found matching your search.' : 'No patients found. Create a new patient to get started.'}
          </div>
        </div>
      ) : (
        <>
          <div className="patient-list">
            {paginatedPatients.map((patient) => {
              const nameParts = (patient.name || '').split(' ');
              const initials = nameParts.length >= 2 
                ? `${nameParts[0][0] || ''}${nameParts[nameParts.length - 1][0] || ''}`
                : (patient.name?.[0] || 'P') + (patient.name?.[1] || 'T');
              
              return (
                <div
                  key={patient.rowKey || patient.id}
                  className={`patient-item ${selectedPatient?.rowKey === patient.rowKey ? 'active' : ''}`}
                  onClick={() => onSelectPatient(patient)}
                >
                  <div className="patient-avatar">
                    {initials.toUpperCase()}
                  </div>
                  <div className="patient-info">
                    <div className="patient-name">
                      {patient.name || 'Unknown Patient'}
                    </div>
                    <div className="patient-meta">
                      File: {patient.medicalRecordNumber || 'N/A'}
                    </div>
                    {patient.dateOfBirth && (
                      <div className="patient-meta">
                        DOB: {formatDate(patient.dateOfBirth)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
