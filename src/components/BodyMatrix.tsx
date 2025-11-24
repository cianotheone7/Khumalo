import { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

interface BodyMetrics {
  rowKey: string;
  partitionKey: string;
  patientId: string;
  patientName: string;
  date: string;
  weight: string;
  bodyFat: string;
  bmi: string;
  skeletalMuscle: string;
  muscleMass: string;
  protein: string;
  bmr: string;
  fatFreeBodyWeight: string;
  subcutaneousFat: string;
  visceralFat: string;
  bodyWater: string;
  boneMass: string;
  metabolicAge: string;
  imageUrl?: string;
  createdBy: string;
  createdAt: string;
}

interface BodyMatrixProps {
  user: {
    id?: string;
    email: string;
    name: string;
  };
}

export function BodyMatrix({ user }: BodyMatrixProps) {
  const [metrics, setMetrics] = useState<BodyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editingMetric, setEditingMetric] = useState<BodyMetrics | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<BodyMetrics>>({});
  const [ocrProgress, setOcrProgress] = useState(0);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://cortexha.table.core.windows.net/BodyMetrics?se=2030-10-21T20%3A49%3A23Z&sp=rwdlacup&sv=2022-11-02&ss=t&srt=sco&sig=X6MpEcxeG3qdxQa95%2Bl1KJl2aVsEfY8uaQVzljZ1Y1M%3D`,
        {
          headers: {
            'Accept': 'application/json;odata=nometadata',
            'x-ms-date': new Date().toUTCString(),
            'x-ms-version': '2019-02-02'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.value || []);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    setProcessing(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const text = result.data.text;
      console.log('OCR Result:', text);

      // Extract metrics using regex patterns
      const extracted: Partial<BodyMetrics> = {};
      
      // Weight (e.g., "64.95kg")
      const weightMatch = text.match(/(\d+\.?\d*)\s*kg/i);
      if (weightMatch) extracted.weight = weightMatch[1] + 'kg';

      // Body Fat (e.g., "24.8%")
      const bodyFatMatch = text.match(/Body\s*Fat[:\s]*(\d+\.?\d*)\s*%/i);
      if (bodyFatMatch) extracted.bodyFat = bodyFatMatch[1] + '%';

      // BMI (e.g., "24.1")
      const bmiMatch = text.match(/BMI[:\s]*(\d+\.?\d*)/i);
      if (bmiMatch) extracted.bmi = bmiMatch[1];

      // Skeletal Muscle (e.g., "48.5%")
      const skeletalMatch = text.match(/Skeletal\s*Muscle[:\s]*(\d+\.?\d*)\s*%/i);
      if (skeletalMatch) extracted.skeletalMuscle = skeletalMatch[1] + '%';

      // Muscle Mass (e.g., "46.4kg")
      const muscleMatch = text.match(/Muscle\s*Mass[:\s]*(\d+\.?\d*)\s*kg/i);
      if (muscleMatch) extracted.muscleMass = muscleMatch[1] + 'kg';

      // Protein (e.g., "17.2%")
      const proteinMatch = text.match(/Protein[:\s]*(\d+\.?\d*)\s*%/i);
      if (proteinMatch) extracted.protein = proteinMatch[1] + '%';

      // BMR (e.g., "1424kcal")
      const bmrMatch = text.match(/(\d+)\s*kcal/i);
      if (bmrMatch) extracted.bmr = bmrMatch[1] + 'kcal';

      // Fat-free Body Weight (e.g., "48.8kg")
      const fatFreeMatch = text.match(/Fat-free\s*Body\s*Weight[:\s]*(\d+\.?\d*)\s*kg/i);
      if (fatFreeMatch) extracted.fatFreeBodyWeight = fatFreeMatch[1] + 'kg';

      // Subcutaneous Fat (e.g., "22.3%")
      const subcutMatch = text.match(/Subcutaneous\s*Fat[:\s]*(\d+\.?\d*)\s*%/i);
      if (subcutMatch) extracted.subcutaneousFat = subcutMatch[1] + '%';

      // Visceral Fat (e.g., "7")
      const visceralMatch = text.match(/Visceral\s*Fat[:\s]*(\d+)/i);
      if (visceralMatch) extracted.visceralFat = visceralMatch[1];

      // Body Water (e.g., "54.2%")
      const waterMatch = text.match(/Body\s*Water[:\s]*(\d+\.?\d*)\s*%/i);
      if (waterMatch) extracted.bodyWater = waterMatch[1] + '%';

      // Bone Mass (e.g., "2.44kg")
      const boneMatch = text.match(/Bone\s*Mass[:\s]*(\d+\.?\d*)\s*kg/i);
      if (boneMatch) extracted.boneMass = boneMatch[1] + 'kg';

      // Metabolic Age (e.g., "46")
      const metabolicMatch = text.match(/Metabolic\s*Age[:\s]*(\d+)/i);
      if (metabolicMatch) extracted.metabolicAge = metabolicMatch[1];

      setExtractedData(extracted);
      setShowUploadModal(true);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const saveMetrics = async () => {
    if (!user || !extractedData) return;

    setUploading(true);
    try {
      const rowKey = Date.now().toString();
      const partitionKey = 'bodymetrics';

      const newMetric: BodyMetrics = {
        rowKey,
        partitionKey,
        patientId: user.id || user.email,
        patientName: user.name || user.email,
        date: new Date().toISOString(),
        weight: extractedData.weight || '',
        bodyFat: extractedData.bodyFat || '',
        bmi: extractedData.bmi || '',
        skeletalMuscle: extractedData.skeletalMuscle || '',
        muscleMass: extractedData.muscleMass || '',
        protein: extractedData.protein || '',
        bmr: extractedData.bmr || '',
        fatFreeBodyWeight: extractedData.fatFreeBodyWeight || '',
        subcutaneousFat: extractedData.subcutaneousFat || '',
        visceralFat: extractedData.visceralFat || '',
        bodyWater: extractedData.bodyWater || '',
        boneMass: extractedData.boneMass || '',
        metabolicAge: extractedData.metabolicAge || '',
        createdBy: user.id || user.email,
        createdAt: new Date().toISOString()
      };

      const response = await fetch(
        `https://cortexha.table.core.windows.net/BodyMetrics?se=2030-10-21T20%3A49%3A23Z&sp=rwdlacup&sv=2022-11-02&ss=t&srt=sco&sig=X6MpEcxeG3qdxQa95%2Bl1KJl2aVsEfY8uaQVzljZ1Y1M%3D`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json;odata=nometadata',
            'x-ms-date': new Date().toUTCString(),
            'x-ms-version': '2019-02-02'
          },
          body: JSON.stringify(newMetric)
        }
      );

      if (response.ok) {
        alert('✅ Body metrics saved successfully!');
        setShowUploadModal(false);
        setSelectedImage(null);
        setExtractedData({});
        await loadMetrics();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      alert('Failed to save metrics. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const updateMetrics = async () => {
    if (!editingMetric) return;

    setUploading(true);
    try {
      const response = await fetch(
        `https://cortexha.table.core.windows.net/BodyMetrics(PartitionKey='${editingMetric.partitionKey}',RowKey='${editingMetric.rowKey}')?se=2030-10-21T20%3A49%3A23Z&sp=rwdlacup&sv=2022-11-02&ss=t&srt=sco&sig=X6MpEcxeG3qdxQa95%2Bl1KJl2aVsEfY8uaQVzljZ1Y1M%3D`,
        {
          method: 'MERGE',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json;odata=nometadata',
            'If-Match': '*',
            'x-ms-date': new Date().toUTCString(),
            'x-ms-version': '2019-02-02'
          },
          body: JSON.stringify(editingMetric)
        }
      );

      if (response.ok || response.status === 204) {
        alert('✅ Metrics updated successfully!');
        setEditingMetric(null);
        await loadMetrics();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating metrics:', error);
      alert('Failed to update metrics. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteMetrics = async (metric: BodyMetrics) => {
    if (!confirm(`Delete metrics from ${new Date(metric.date).toLocaleDateString()}?`)) return;

    try {
      const response = await fetch(
        `https://cortexha.table.core.windows.net/BodyMetrics(PartitionKey='${metric.partitionKey}',RowKey='${metric.rowKey}')?se=2030-10-21T20%3A49%3A23Z&sp=rwdlacup&sv=2022-11-02&ss=t&srt=sco&sig=X6MpEcxeG3qdxQa95%2Bl1KJl2aVsEfY8uaQVzljZ1Y1M%3D`,
        {
          method: 'DELETE',
          headers: {
            'If-Match': '*',
            'x-ms-date': new Date().toUTCString(),
            'x-ms-version': '2019-02-02'
          }
        }
      );

      if (response.ok || response.status === 204) {
        alert('✅ Metrics deleted successfully!');
        await loadMetrics();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting metrics:', error);
      alert('Failed to delete metrics. Please try again.');
    }
  };

  const exportToExcel = () => {
    const data = metrics.map(m => ({
      'Date': new Date(m.date).toLocaleDateString(),
      'Patient': m.patientName,
      'Weight': m.weight,
      'Body Fat': m.bodyFat,
      'BMI': m.bmi,
      'Skeletal Muscle': m.skeletalMuscle,
      'Muscle Mass': m.muscleMass,
      'Protein': m.protein,
      'BMR': m.bmr,
      'Fat-free Weight': m.fatFreeBodyWeight,
      'Subcutaneous Fat': m.subcutaneousFat,
      'Visceral Fat': m.visceralFat,
      'Body Water': m.bodyWater,
      'Bone Mass': m.boneMass,
      'Metabolic Age': m.metabolicAge
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Body Metrics');
    XLSX.writeFile(wb, `BodyMetrics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="body-matrix">
      <style>{`
        .body-matrix {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .body-matrix-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .metric-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .metric-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .metric-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }
        .metric-value {
          color: #4ecdc4;
          font-weight: 600;
        }
        .upload-area {
          border: 2px dashed rgba(78, 205, 196, 0.5);
          border-radius: 12px;
          padding: 3rem;
          text-align: center;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .upload-area:hover {
          border-color: #4ecdc4;
          background: rgba(78, 205, 196, 0.1);
        }
        .ocr-progress {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 1rem;
        }
        .ocr-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4ecdc4, #45b7d1);
          transition: width 0.3s ease;
        }
      `}</style>

      <div className="body-matrix-header">
        <h2>📊 Body Matrix</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={exportToExcel} disabled={metrics.length === 0}>
            📥 Export to Excel
          </button>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            📸 Upload Body Scan
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              disabled={processing}
            />
          </label>
        </div>
      </div>

      {processing && (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <h3>🔍 Processing Image with OCR...</h3>
          <div className="ocr-progress">
            <div className="ocr-progress-bar" style={{ width: `${ocrProgress}%` }}></div>
          </div>
          <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>{ocrProgress}% Complete</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading metrics...</div>
      ) : metrics.length === 0 ? (
        <div className="upload-area">
          <h3>📸 No body metrics yet</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '1rem' }}>Upload a body composition scan to get started</p>
        </div>
      ) : (
        <div className="metrics-grid">
          {metrics.map((metric) => (
            <div key={metric.rowKey} className="metric-card">
              <div className="metric-card-header">
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{metric.patientName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {new Date(metric.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setEditingMetric(metric)}
                    style={{ background: '#4ecdc4', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteMetrics(metric)}
                    style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="metric-row">
                <span className="metric-label">⚖️ Weight</span>
                <span className="metric-value">{metric.weight}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">% Body Fat</span>
                <span className="metric-value">{metric.bodyFat}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">📏 BMI</span>
                <span className="metric-value">{metric.bmi}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">💪 Skeletal Muscle</span>
                <span className="metric-value">{metric.skeletalMuscle}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">🏋️ Muscle Mass</span>
                <span className="metric-value">{metric.muscleMass}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">🥩 Protein</span>
                <span className="metric-value">{metric.protein}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">🔥 BMR</span>
                <span className="metric-value">{metric.bmr}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">🏃 Fat-free Weight</span>
                <span className="metric-value">{metric.fatFreeBodyWeight}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">📊 Subcutaneous Fat</span>
                <span className="metric-value">{metric.subcutaneousFat}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">🫀 Visceral Fat</span>
                <span className="metric-value">{metric.visceralFat}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">💧 Body Water</span>
                <span className="metric-value">{metric.bodyWater}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">🦴 Bone Mass</span>
                <span className="metric-value">{metric.boneMass}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">⏰ Metabolic Age</span>
                <span className="metric-value">{metric.metabolicAge}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3>📊 Review Extracted Data</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Weight</label>
                <input
                  type="text"
                  value={extractedData.weight || ''}
                  onChange={(e) => setExtractedData({...extractedData, weight: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Body Fat</label>
                <input
                  type="text"
                  value={extractedData.bodyFat || ''}
                  onChange={(e) => setExtractedData({...extractedData, bodyFat: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>BMI</label>
                <input
                  type="text"
                  value={extractedData.bmi || ''}
                  onChange={(e) => setExtractedData({...extractedData, bmi: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Skeletal Muscle</label>
                <input
                  type="text"
                  value={extractedData.skeletalMuscle || ''}
                  onChange={(e) => setExtractedData({...extractedData, skeletalMuscle: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Muscle Mass</label>
                <input
                  type="text"
                  value={extractedData.muscleMass || ''}
                  onChange={(e) => setExtractedData({...extractedData, muscleMass: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Protein</label>
                <input
                  type="text"
                  value={extractedData.protein || ''}
                  onChange={(e) => setExtractedData({...extractedData, protein: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>BMR</label>
                <input
                  type="text"
                  value={extractedData.bmr || ''}
                  onChange={(e) => setExtractedData({...extractedData, bmr: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Fat-free Weight</label>
                <input
                  type="text"
                  value={extractedData.fatFreeBodyWeight || ''}
                  onChange={(e) => setExtractedData({...extractedData, fatFreeBodyWeight: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Subcutaneous Fat</label>
                <input
                  type="text"
                  value={extractedData.subcutaneousFat || ''}
                  onChange={(e) => setExtractedData({...extractedData, subcutaneousFat: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Visceral Fat</label>
                <input
                  type="text"
                  value={extractedData.visceralFat || ''}
                  onChange={(e) => setExtractedData({...extractedData, visceralFat: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Body Water</label>
                <input
                  type="text"
                  value={extractedData.bodyWater || ''}
                  onChange={(e) => setExtractedData({...extractedData, bodyWater: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Bone Mass</label>
                <input
                  type="text"
                  value={extractedData.boneMass || ''}
                  onChange={(e) => setExtractedData({...extractedData, boneMass: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Metabolic Age</label>
                <input
                  type="text"
                  value={extractedData.metabolicAge || ''}
                  onChange={(e) => setExtractedData({...extractedData, metabolicAge: e.target.value})}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMetrics} disabled={uploading}>
                {uploading ? 'Saving...' : '💾 Save to Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMetric && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3>✏️ Edit Metrics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              {Object.entries({
                weight: 'Weight',
                bodyFat: 'Body Fat',
                bmi: 'BMI',
                skeletalMuscle: 'Skeletal Muscle',
                muscleMass: 'Muscle Mass',
                protein: 'Protein',
                bmr: 'BMR',
                fatFreeBodyWeight: 'Fat-free Weight',
                subcutaneousFat: 'Subcutaneous Fat',
                visceralFat: 'Visceral Fat',
                bodyWater: 'Body Water',
                boneMass: 'Bone Mass',
                metabolicAge: 'Metabolic Age'
              }).map(([key, label]) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <input
                    type="text"
                    value={(editingMetric as any)[key] || ''}
                    onChange={(e) => setEditingMetric({...editingMetric, [key]: e.target.value})}
                  />
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingMetric(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={updateMetrics} disabled={uploading}>
                {uploading ? 'Updating...' : '💾 Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
