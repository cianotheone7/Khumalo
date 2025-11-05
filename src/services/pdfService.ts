import { Prescription } from '../types/prescription';

export const generatePrescriptionPDF = async (prescription: Prescription): Promise<Blob> => {
  // Create a simple HTML template for the prescription
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Prescription - ${prescription.prescriptionNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          color: #333;
        }
        .prescription-header {
          text-align: center;
          border-bottom: 2px solid #007bff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .clinic-info {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        .prescription-title {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
          margin: 10px 0;
        }
        .prescription-number {
          font-size: 16px;
          color: #666;
        }
        .patient-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .patient-info h3 {
          margin: 0 0 10px 0;
          color: #007bff;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .info-label {
          font-weight: bold;
          color: #495057;
        }
        .info-value {
          color: #666;
        }
        .medications-section {
          margin-bottom: 30px;
        }
        .medications-title {
          font-size: 18px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 15px;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 5px;
        }
        .medication-item {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .medication-name {
          font-size: 16px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 8px;
        }
        .medication-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        .detail-label {
          font-size: 12px;
          color: #666;
          font-weight: bold;
          text-transform: uppercase;
        }
        .detail-value {
          font-size: 14px;
          color: #333;
          margin-top: 2px;
        }
        .instructions {
          background: #e3f2fd;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
          font-style: italic;
        }
        .diagnosis-section {
          background: #fff3cd;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #ffc107;
        }
        .diagnosis-title {
          font-weight: bold;
          color: #856404;
          margin-bottom: 5px;
        }
        .diagnosis-text {
          color: #856404;
        }
        .notes-section {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .notes-title {
          font-weight: bold;
          color: #495057;
          margin-bottom: 5px;
        }
        .notes-text {
          color: #666;
        }
        .doctor-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
        }
        .doctor-details {
          text-align: left;
        }
        .doctor-name {
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        .doctor-license {
          color: #666;
          font-size: 14px;
        }
        .signature-section {
          text-align: right;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          width: 200px;
          margin-bottom: 5px;
        }
        .signature-label {
          font-size: 12px;
          color: #666;
        }
        .date-section {
          text-align: right;
          margin-top: 20px;
          color: #666;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          color: #666;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; }
          .medication-item { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="prescription-header">
        <div class="clinic-info">
          <div>${prescription.clinicName}</div>
          <div>${prescription.clinicAddress}</div>
          <div>Tel: ${prescription.clinicPhone}</div>
        </div>
        <div class="prescription-title">PRESCRIPTION</div>
        <div class="prescription-number">No: ${prescription.prescriptionNumber}</div>
      </div>

      <div class="patient-info">
        <h3>Patient Information</h3>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${prescription.patientName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${prescription.patientEmail}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${new Date(prescription.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      <div class="diagnosis-section">
        <div class="diagnosis-title">Diagnosis:</div>
        <div class="diagnosis-text">${prescription.diagnosis}</div>
      </div>

      <div class="medications-section">
        <div class="medications-title">Medications Prescribed</div>
        ${prescription.medications.map(med => `
          <div class="medication-item">
            <div class="medication-name">${med.medication.name} (${med.medication.genericName})</div>
            <div class="medication-details">
              <div class="detail-item">
                <span class="detail-label">Dosage</span>
                <span class="detail-value">${med.dosage}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Frequency</span>
                <span class="detail-value">${med.frequency}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Duration</span>
                <span class="detail-value">${med.duration}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Quantity</span>
                <span class="detail-value">${med.quantity} ${med.medication.form}s</span>
              </div>
            </div>
            <div class="instructions">
              <strong>Instructions:</strong> ${med.instructions}
            </div>
          </div>
        `).join('')}
      </div>

      ${prescription.notes ? `
        <div class="notes-section">
          <div class="notes-title">Additional Notes:</div>
          <div class="notes-text">${prescription.notes}</div>
        </div>
      ` : ''}

      <div class="doctor-info">
        <div class="doctor-details">
          <div class="doctor-name">Dr. ${prescription.doctorName}</div>
          <div class="doctor-license">License: ${prescription.doctorLicense}</div>
        </div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">Doctor's Signature</div>
        </div>
      </div>

      <div class="date-section">
        Date: ${new Date(prescription.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>

      <div class="footer">
        <p>This prescription is valid for 6 months from the date of issue.</p>
        <p>Please keep this prescription safe and bring it to your pharmacy.</p>
      </div>
    </body>
    </html>
  `;

  // For now, we'll return the HTML as a blob
  // In a real implementation, you would use a library like jsPDF or Puppeteer
  // to convert HTML to PDF
  return new Blob([htmlContent], { type: 'text/html' });
};

export const downloadPrescriptionPDF = async (prescription: Prescription) => {
  try {
    const pdfBlob = await generatePrescriptionPDF(prescription);
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prescription-${prescription.prescriptionNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

