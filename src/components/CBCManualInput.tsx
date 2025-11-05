import React, { useState } from 'react';

interface CBCManualInputProps {
  onCBCDataSubmit: (data: CBCData) => void;
  onClose: () => void;
}

interface CBCData {
  ageSex: string;
  hemoglobin: string;
  hematocrit: string;
  wbc: string;
  neutrophils: string;
  lymphocytes: string;
  monocytes: string;
  eosinophils: string;
  basophils: string;
  platelets: string;
  mcv: string;
  mch: string;
  rdw: string;
  notes: string;
}

export function CBCManualInput({ onCBCDataSubmit, onClose }: CBCManualInputProps) {
  const [formData, setFormData] = useState<CBCData>({
    ageSex: '',
    hemoglobin: '',
    hematocrit: '',
    wbc: '',
    neutrophils: '',
    lymphocytes: '',
    monocytes: '',
    eosinophils: '',
    basophils: '',
    platelets: '',
    mcv: '',
    mch: '',
    rdw: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCBCDataSubmit(formData);
  };

  const handleChange = (field: keyof CBCData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>📋 Manual CBC Input</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
            <p><strong>📄 OCR Alternative:</strong> Since PDF text extraction was limited, please enter the CBC values manually below.</p>
          </div>

          <div className="form-group">
            <label htmlFor="ageSex">Age/Sex *</label>
            <input
              id="ageSex"
              type="text"
              value={formData.ageSex}
              onChange={(e) => handleChange('ageSex', e.target.value)}
              placeholder="e.g., 45M, 32F"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="hemoglobin">Hemoglobin (g/dL)</label>
              <input
                id="hemoglobin"
                type="text"
                value={formData.hemoglobin}
                onChange={(e) => handleChange('hemoglobin', e.target.value)}
                placeholder="e.g., 14.2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="hematocrit">Hematocrit (%)</label>
              <input
                id="hematocrit"
                type="text"
                value={formData.hematocrit}
                onChange={(e) => handleChange('hematocrit', e.target.value)}
                placeholder="e.g., 42.5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="wbc">WBC (×10³/μL)</label>
              <input
                id="wbc"
                type="text"
                value={formData.wbc}
                onChange={(e) => handleChange('wbc', e.target.value)}
                placeholder="e.g., 7.2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="platelets">Platelets (×10³/μL)</label>
              <input
                id="platelets"
                type="text"
                value={formData.platelets}
                onChange={(e) => handleChange('platelets', e.target.value)}
                placeholder="e.g., 250"
              />
            </div>

            <div className="form-group">
              <label htmlFor="neutrophils">Neutrophils (%)</label>
              <input
                id="neutrophils"
                type="text"
                value={formData.neutrophils}
                onChange={(e) => handleChange('neutrophils', e.target.value)}
                placeholder="e.g., 65"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lymphocytes">Lymphocytes (%)</label>
              <input
                id="lymphocytes"
                type="text"
                value={formData.lymphocytes}
                onChange={(e) => handleChange('lymphocytes', e.target.value)}
                placeholder="e.g., 25"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mcv">MCV (fL)</label>
              <input
                id="mcv"
                type="text"
                value={formData.mcv}
                onChange={(e) => handleChange('mcv', e.target.value)}
                placeholder="e.g., 88"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mch">MCH (pg)</label>
              <input
                id="mch"
                type="text"
                value={formData.mch}
                onChange={(e) => handleChange('mch', e.target.value)}
                placeholder="e.g., 29"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Additional Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional findings, flags, or clinical context..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Generate AI Summary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




