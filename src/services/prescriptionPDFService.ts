// Prescription PDF Generation Service - South African Format
// Generates PDFs from prescription data using SA template
// Compliant with South African prescription requirements

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Prescription, PrescriptionMedication } from './azurePrescriptionService';

// Helper function to convert numbers to words (for Schedule 6 medications)
function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  
  if (num === 0) return 'zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' hundred' + 
           (num % 100 !== 0 ? ' and ' + numberToWords(num % 100) : '');
  }
  return num.toString(); // Fallback for large numbers
}

// Helper to calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Load the PDF template
async function loadPDFTemplate(): Promise<PDFDocument> {
  try {
    // Try multiple possible template locations
    const templatePaths = [
      '/prescription-template.pdf', // Actual template file name
      '/prescription 2-1.pdf',
      '/prescription-2-1.pdf',
      '/prescription.pdf',
      '/templates/prescription-template.pdf',
      '/templates/prescription-2-1.pdf'
    ];
    
    let lastError: Error | null = null;
    
    for (const templateUrl of templatePaths) {
      try {
        console.log(`Trying to load template from: ${templateUrl}`);
        const response = await fetch(templateUrl);
        
        if (!response.ok) {
          console.warn(`Template not found at ${templateUrl}: ${response.status}`);
          continue;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          console.warn(`Template is empty at ${templateUrl}`);
          continue;
        }
        
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        console.log(`✅ Successfully loaded template from: ${templateUrl}`);
        return pdfDoc;
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        console.warn(`Failed to load template from ${templateUrl}:`, fetchError);
        continue;
      }
    }
    
    // If no template found, create a blank PDF instead
    console.warn('⚠️ No PDF template found. Creating blank PDF...');
    const pdfDoc = await PDFDocument.create();
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF template:', error);
    // Create blank PDF as fallback
    try {
      const pdfDoc = await PDFDocument.create();
      return pdfDoc;
    } catch (createError) {
      throw new Error(`Failed to load PDF template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Generate prescription PDF from template with text overlay
export async function generatePrescriptionFromTemplate(
  prescription: Prescription
): Promise<Blob> {
  try {
    console.log('📄 Generating prescription PDF from SA template...');
    console.log('📋 Prescription data:', {
      prescriptionNumber: prescription.prescriptionNumber,
      patientName: prescription.patientName,
      doctorName: prescription.doctorName,
      medicationCount: prescription.medications?.length || 0
    });
    
    // Validate required fields (with fallbacks)
    const prescriptionNumber = prescription.prescriptionNumber || prescription.rowKey;
    if (!prescriptionNumber) {
      throw new Error('Prescription number or rowKey is required');
    }
    if (!prescription.patientName) {
      throw new Error('Patient name is required');
    }
    if (!prescription.doctorName) {
      throw new Error('Doctor name is required');
    }
    if (!prescription.medications || prescription.medications.length === 0) {
      console.warn('⚠️ No medications found in prescription');
    }
    
    // Load the template
    const pdfDoc = await loadPDFTemplate();
    
    // Add text overlay with prescription data
    await addTextOverlay(pdfDoc, prescription);
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    console.log('✅ Prescription PDF generated successfully! Size:', blob.size, 'bytes');
    return blob;
    
  } catch (error) {
    console.error('❌ Error generating prescription PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    throw new Error(`Failed to generate PDF: ${errorMessage}`);
  }
}

// Add text overlay to PDF with South African prescription format
async function addTextOverlay(
  pdfDoc: PDFDocument, 
  prescription: Prescription
): Promise<void> {
  try {
    console.log('🖊️ Adding text overlay to prescription template...');
    let pages = pdfDoc.getPages();
    let firstPage = pages[0];
    
    // If PDF is blank (no pages), add a page
    if (pages.length === 0) {
      console.log('⚠️ PDF has no pages, creating new page...');
      firstPage = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
      pages = pdfDoc.getPages();
      firstPage = pages[0];
    }
    
    // Check for form fields first (AcroForm)
    // Temporarily disabled to use text overlay positioning instead
    try {
      const form = pdfDoc.getForm();
      const formFields = form.getFields();
      console.log(`📋 Found ${formFields.length} form fields in template`);
      
      // Skip form fields and use text overlay only for better control
      if (formFields.length > 0) {
        console.log('ℹ️ Template has form fields, but using text overlay for better positioning control');
        // Don't fill form fields - use text overlay instead
        // await fillFormFields(pdfDoc, prescription, form);
      }
    } catch (formError) {
      console.log('ℹ️ No form fields found or error checking forms:', formError);
      // Continue with text overlay method
    }
    
    // Get page size
    const { width, height } = firstPage.getSize();
    console.log(`📐 Page size: ${width} x ${height}`);
    console.log('⚠️ No form fields found - using text overlay method');
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const fontSize = 9.5;
    const lineHeight = 13;
    
    // Helper function to add text with better visibility
    const addText = (text: string, x: number, y: number, size: number = fontSize, bold: boolean = false) => {
      try {
        if (!text || text.trim() === '') {
          return; // Skip empty text
        }
        
        // Ensure text fits on page
        if (y < 0 || y > height || x < 0 || x > width) {
          console.warn(`⚠️ Text out of bounds: "${text.substring(0, 20)}" at (${x}, ${y})`);
          return;
        }
        
        console.log(`📝 Drawing: "${text.substring(0, 30)}" at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        
        firstPage.drawText(text, {
          x,
          y,
          size,
          font: bold ? helveticaBold : helveticaFont,
          color: rgb(0, 0, 0), // Pure black for visibility
        });
      } catch (err) {
        console.error(`❌ Error drawing text "${text.substring(0, 20)}":`, err);
      }
    };
    
    console.log('📝 Writing prescription data...');
    console.log(`📐 Template dimensions: ${width} x ${height}`);
    
    // Calculate center coordinates
    const x = width / 2;           // Centered horizontally
    
    console.log(`📍 Exact coordinates: x=${x.toFixed(2)}`);
    console.log(`📐 Page dimensions: width=${width.toFixed(2)}, height=${height.toFixed(2)}`);
    
    // Try to find appropriate positions on the template
    // SA prescription template typically has fields starting around:
    // - Top section: Patient info (around y = height - 50 to height - 150)
    // - Middle section: Medications (around y = height - 200 to height - 400)
    // - Bottom section: Signature (below y = 150)
    
    // Starting position - using center coordinates
    const leftMargin = width < 600 ? 30 : 50; // Adjust based on template width
    
    // Rx # removed per user request
    
    // Fixed positions for each section - simpler approach
    // For A4 (841.89 height): 
    // - Top ~150-200 is header area
    // - Patient/Doctor info: Start a bit higher (moved up)
    // - Medications: Let flow naturally after diagnosis
    
    const patientStartY = height - 240; // Moved higher (about 240 points from top, closer to top)
    let yPosition = patientStartY;
    
    // PATIENT INFORMATION SECTION - using centerX for horizontal positioning
    const patientSectionX = leftMargin; // Or use centerX - (estimated text width / 2) for true centering
    addText('PATIENT INFORMATION', patientSectionX, yPosition, 10, true);
    yPosition -= lineHeight * 2.0; // Much larger gap after heading to prevent overlap
    
    // Patient Name (with fallback)
    const patientName = prescription.patientName || 'Not specified';
    addText(`Name: ${patientName}`, leftMargin, yPosition, 9.5);
    yPosition -= lineHeight;
    
    // Patient Email (if available)
    if (prescription.patientEmail) {
      addText(`Email: ${prescription.patientEmail}`, leftMargin, yPosition, 9);
      yPosition -= lineHeight;
    }
    
    // Patient ID/Passport (from extended prescription data if available)
    if ((prescription as any).patientIdNumber) {
      addText(`ID/Passport: ${(prescription as any).patientIdNumber}`, leftMargin, yPosition, 9);
      yPosition -= lineHeight;
    }
    
    // Patient Address (if available)
    if ((prescription as any).patientAddress) {
      addText(`Address: ${(prescription as any).patientAddress}`, leftMargin, yPosition, 9);
      yPosition -= lineHeight;
    }
    
    // Age and Gender (if available)
    let ageGenderText = '';
    if ((prescription as any).patientAge) {
      ageGenderText = `Age: ${(prescription as any).patientAge}`;
    }
    if ((prescription as any).patientGender) {
      ageGenderText += (ageGenderText ? ' | ' : '') + `Gender: ${(prescription as any).patientGender}`;
    }
    if (ageGenderText) {
      addText(ageGenderText, leftMargin, yPosition, 9);
      yPosition -= lineHeight;
    }
    
    yPosition -= lineHeight * 0.3; // Reduced spacing before diagnosis
    
    // DIAGNOSIS / INDICATION
    if (prescription.diagnosis) {
      addText('DIAGNOSIS / INDICATION', leftMargin, yPosition, 10, true);
      yPosition -= lineHeight * 1.0; // Reduced spacing after heading
      
      // Word wrap diagnosis
      const diagnosisWords = prescription.diagnosis.split(' ');
      let currentLine = '';
      const maxWidth = width - 120;
      
      for (const word of diagnosisWords) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = helveticaFont.widthOfTextAtSize(testLine, 9);
        
        if (textWidth > maxWidth && currentLine) {
          addText(currentLine, leftMargin, yPosition, 9);
          yPosition -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        addText(currentLine, leftMargin, yPosition, 9);
        yPosition -= lineHeight;
      }
      // Minimal spacing after diagnosis to minimize gap before medications
      yPosition -= lineHeight * 0.2; // Very small gap
    }
    
    // Rx - MEDICATIONS PRESCRIBED
    // Format: Medication name + dosage instructions + quantity (circled)
    if (prescription.medications && prescription.medications.length > 0) {
      addText('Rx:', leftMargin, yPosition, 11, true);
      yPosition -= lineHeight * 1.5;
      
      prescription.medications.forEach((med, index) => {
        // Check if we're too close to the signature area (stop at y=150 to avoid footer)
        // If many medications, create additional page
        if (yPosition < 150) {
          console.log(`⚠️ Reached signature area at y=${yPosition.toFixed(1)}, adding new page for remaining medications`);
          // Add a new page if there are more medications
          if (index < prescription.medications.length - 1) {
            const newPage = pdfDoc.addPage([width, height]);
            firstPage = newPage; // Switch to new page
            yPosition = height - 100; // Start near top of new page
            console.log(`📄 Created new page for medications, continuing at y=${yPosition.toFixed(1)}`);
          } else {
            return; // Last medication and no room, skip it
          }
        }
        
        // Build medication line in format: "MEDICATION NAME FORM STRENGTH Instructions Quantity"
        const medName = med.medicationName || 'Unknown';
        const formInfo = (med as any).form || 'TAB';
        const strength = med.dosage ? ` ${med.dosage}` : '';
        
        // Build instructions similar to reference: "Take X Tablet(s) Y Orally" or "Insert X Spray(s) Y Orally"
        let instructionText = med.instructions || '';
        if (!instructionText) {
          // Auto-generate from frequency
          const frequency = med.frequency || '';
          const quantityPerDose = (med as any).quantityPerDose || 1;
          const unit = formInfo === 'NAS' ? 'Spray(s)' : 'Tablet(s)';
          const route = formInfo === 'NAS' ? 'Nasally' : 'Orally';
          
          if (frequency.toLowerCase().includes('hourly')) {
            instructionText = `Take ${quantityPerDose} ${unit} ${frequency} ${route}`;
          } else if (frequency.toLowerCase().includes('times')) {
            instructionText = `Take ${quantityPerDose} ${unit} ${frequency} ${route}`;
          } else {
            instructionText = `Take ${quantityPerDose} ${unit} ${frequency} ${route}`;
          }
          
          // Add duration if available
          if (med.duration) {
            instructionText += ` x ${med.duration}`;
          }
        }
        
        // Build full medication line
        const medicationLine = `${medName} ${formInfo}${strength} ${instructionText}`;
        
        // Add medication line (will wrap if needed)
        const maxLineWidth = width - leftMargin - 80; // Leave space for quantity at end
        const textWidth = helveticaFont.widthOfTextAtSize(medicationLine, 9);
        
        if (textWidth > maxLineWidth) {
          // Word wrap the medication line
          const words = medicationLine.split(' ');
          let line = '';
          const quantity = med.quantity || 0;
          
          for (const word of words) {
            const testLine = line ? `${line} ${word}` : word;
            const testWidth = helveticaFont.widthOfTextAtSize(testLine, 9);
            
            if (testWidth > maxLineWidth && line) {
              addText(line, leftMargin, yPosition, 9);
              yPosition -= lineHeight * 0.9;
              line = word;
            } else {
              line = testLine;
            }
          }
          
          // Add quantity at the end (on same line if space, otherwise new line)
          if (line) {
            const lineWithQuantity = `${line} (${quantity})`;
            const lineWithQuantityWidth = helveticaFont.widthOfTextAtSize(lineWithQuantity, 9);
            
            if (lineWithQuantityWidth <= maxLineWidth) {
              addText(lineWithQuantity, leftMargin, yPosition, 9);
            } else {
              addText(line, leftMargin, yPosition, 9);
              yPosition -= lineHeight * 0.9;
              // Draw quantity in a circle-like format (using parentheses as visual indicator)
              addText(`(${quantity})`, width - 60, yPosition, 9, true);
            }
          }
        } else {
          // Single line - add quantity at the end
          const fullLine = `${medicationLine} (${med.quantity || 0})`;
          addText(fullLine, leftMargin, yPosition, 9);
        }
        
        yPosition -= lineHeight * 1.2;
      });
    }
    
    // Additional Notes (if space available and not too close to signature)
    if (prescription.notes && yPosition > 170) {
      yPosition -= lineHeight * 0.5;
      addText('ADDITIONAL NOTES', leftMargin, yPosition, 10, true);
      yPosition -= lineHeight * 1.2;
      
      // Word wrap notes
      const notesWords = prescription.notes.split(' ');
      let currentLine = '';
      const maxWidth = width - 120;
      
      for (const word of notesWords) {
        if (yPosition < 170) break; // Stop if too close to signature area
        
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = helveticaFont.widthOfTextAtSize(testLine, 9);
        
        if (textWidth > maxWidth && currentLine) {
          addText(currentLine, leftMargin, yPosition, 9);
          yPosition -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine && yPosition > 170) {
        addText(currentLine, leftMargin, yPosition, 9);
      }
    }
    
    // Add date at bottom right
    const prescriptionDate = prescription.prescriptionDate 
      ? new Date(prescription.prescriptionDate)
      : prescription.createdDate 
        ? new Date(prescription.createdDate)
        : new Date();
    
    // Format date as "DD Month YYYY" (e.g., "3 August 2025")
    const dateOptions: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    const formattedDate = prescriptionDate.toLocaleDateString('en-ZA', dateOptions);
    
    // Position date at bottom right
    const dateY = 45; // A bit lower on the page
    const dateX = width - 150; // Right side with margin
    
    addText(formattedDate, dateX, dateY, 9);
    
    console.log('✅ Text overlay completed successfully');
    
  } catch (error) {
    console.error('❌ Error adding text overlay:', error);
    throw error;
  }
}

// Fill PDF form fields if template uses AcroForm
async function fillFormFields(
  pdfDoc: PDFDocument,
  prescription: Prescription,
  form: any
): Promise<void> {
  try {
    console.log('📝 Filling PDF form fields...');
    
    const fields = form.getFields();
    const fieldNames = fields.map((f: any) => f.getName()).join(', ');
    console.log(`📋 Available form fields: ${fieldNames}`);
    
    // Common field name patterns - try different variations
    const fieldMap: { [key: string]: string } = {
      // Prescription number - REMOVED per user request
      // 'prescriptionNumber': prescription.prescriptionNumber || prescription.rowKey || '',
      // 'rxNumber': prescription.prescriptionNumber || prescription.rowKey || '',
      // 'rx': prescription.prescriptionNumber || prescription.rowKey || '',
      
      // Patient info
      'patientName': prescription.patientName || '',
      'name': prescription.patientName || '',
      'patient': prescription.patientName || '',
      'patientEmail': prescription.patientEmail || '',
      'email': prescription.patientEmail || '',
      'patientId': (prescription as any).patientIdNumber || '',
      'idNumber': (prescription as any).patientIdNumber || '',
      
      // Doctor info
      'doctorName': prescription.doctorName || '',
      'doctor': prescription.doctorName || '',
      'doctorLicense': prescription.doctorLicense || '',
      'license': prescription.doctorLicense || '',
      'doctorQualification': (prescription as any).doctorQualification || '',
      'qualification': (prescription as any).doctorQualification || '',
      
      // Clinic info
      'clinicName': prescription.clinicName || '',
      'practice': prescription.clinicName || '',
      'clinicAddress': prescription.clinicAddress || '',
      'address': prescription.clinicAddress || '',
      'clinicPhone': prescription.clinicPhone || '',
      'phone': prescription.clinicPhone || '',
      
      // Diagnosis
      'diagnosis': prescription.diagnosis || '',
      'indication': prescription.diagnosis || '',
    };
    
    // Try to fill each field
    fields.forEach((field: any) => {
      try {
        const fieldName = field.getName().toLowerCase();
        console.log(`🔍 Processing field: ${fieldName}`);
        
        // Try exact match first
        let value = fieldMap[fieldName];
        
        // Try partial matches
        if (!value) {
          for (const [key, val] of Object.entries(fieldMap)) {
            if (fieldName.includes(key) || key.includes(fieldName)) {
              value = val;
              break;
            }
          }
        }
        
        if (value) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              field.setText(value);
              console.log(`✅ Filled field "${fieldName}" with: ${value.substring(0, 30)}`);
            } else if (field.constructor.name === 'PDFDropdown') {
              field.select(value);
              console.log(`✅ Selected field "${fieldName}" with: ${value.substring(0, 30)}`);
            }
          } catch (fillError) {
            console.warn(`⚠️ Could not fill field "${fieldName}":`, fillError);
          }
        } else {
          console.log(`ℹ️ No data found for field: ${fieldName}`);
        }
      } catch (fieldError) {
        console.warn(`⚠️ Error processing field:`, fieldError);
      }
    });
    
    // Handle medications - usually in a list or text area
    if (prescription.medications && prescription.medications.length > 0) {
      const medicationsText = prescription.medications.map((med, idx) => {
        return `${idx + 1}. ${med.medicationName} - ${med.dosage} - ${med.frequency} - ${med.duration}`;
      }).join('\n');
      
      // Try to find medication field
      fields.forEach((field: any) => {
        const fieldName = field.getName().toLowerCase();
        if (fieldName.includes('medication') || fieldName.includes('rx') || fieldName.includes('drug')) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              field.setText(medicationsText);
              console.log(`✅ Filled medications field: ${fieldName}`);
            }
          } catch (e) {
            console.warn(`⚠️ Could not fill medications field:`, e);
          }
        }
      });
    }
    
    // Flatten form to prevent further editing
    try {
      form.flatten();
      console.log('✅ Form flattened (fields are now permanent)');
    } catch (flattenError) {
      console.warn('⚠️ Could not flatten form:', flattenError);
    }
    
    console.log('✅ Form fields filled successfully');
  } catch (error) {
    console.error('❌ Error filling form fields:', error);
    throw error;
  }
}

// Download prescription PDF locally
export async function downloadPrescriptionPDF(
  prescription: Prescription
): Promise<void> {
  try {
    console.log('📥 Downloading prescription PDF...');
    console.log('📋 Prescription:', prescription.prescriptionNumber);
    
    if (!prescription) {
      throw new Error('Prescription data is missing');
    }
    
    const pdfBlob = await generatePrescriptionFromTemplate(prescription);
    
    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prescription-${prescription.prescriptionNumber || 'unknown'}.pdf`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('✅ Prescription PDF downloaded!');
  } catch (error) {
    console.error('❌ Error downloading prescription PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download prescription PDF: ${errorMessage}`);
  }
}

// View/Print prescription PDF
export async function viewPrescriptionPDF(
  prescription: Prescription
): Promise<void> {
  try {
    console.log('👁️ Opening prescription PDF...');
    
    const pdfBlob = await generatePrescriptionFromTemplate(prescription);
    
    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    // Open in new window for viewing/printing
    const url = URL.createObjectURL(pdfBlob);
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      // Pop-up blocked, try to download instead
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prescription-${prescription.prescriptionNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up after download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      alert('Pop-up was blocked. PDF downloaded instead.');
    } else {
      // Clean up after viewing (longer delay for viewing)
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    
    console.log('✅ Prescription PDF opened!');
  } catch (error) {
    console.error('❌ Error viewing prescription PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to view prescription PDF: ${errorMessage}`);
  }
}
