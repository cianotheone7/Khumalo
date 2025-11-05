const fetch = require('node-fetch');
const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

module.exports = async function (context, req) {
    context.log('Send prescription email request received');

    const { userEmail, prescription, message } = req.body;

    if (!userEmail || !prescription || !message) {
        context.res = {
            status: 400,
            body: { error: 'User email, prescription, and message are required' }
        };
        return;
    }

    if (!prescription.patientEmail) {
        context.res = {
            status: 400,
            body: { error: 'Patient email not available' }
        };
        return;
    }

    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
    const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const tableName = 'EmailConnections';

    if (!storageAccountKey) {
        context.log('ERROR: AZURE_STORAGE_ACCOUNT_KEY not configured');
        context.res = {
            status: 500,
            body: { error: 'Storage account key not configured' }
        };
        return;
    }

    try {
        // Get email connection for the user
        const credential = new AzureNamedKeyCredential(storageAccountName, storageAccountKey);
        const tableClient = new TableClient(
            `https://${storageAccountName}.table.core.windows.net`,
            tableName,
            credential
        );

        let entity;
        try {
            entity = await tableClient.getEntity('user', userEmail);
        } catch (getError) {
            if (getError.statusCode === 404) {
                context.log(`❌ No email connection found for ${userEmail}`);
                context.res = {
                    status: 400,
                    body: { 
                        error: 'Email not connected. Please connect your email in Settings.',
                        details: 'No email connection found in database'
                    }
                };
                return;
            }
            throw getError;
        }
        
        if (!entity || !entity.accessToken) {
            context.log(`❌ Email connection exists but no access token for ${userEmail}`);
            context.res = {
                status: 400,
                body: { 
                    error: 'Email not connected. Please connect your email in Settings.',
                    details: 'Access token missing from connection'
                }
            };
            return;
        }

        const provider = entity.provider;
        let accessToken = entity.accessToken;
        const refreshToken = entity.refreshToken;

        context.log(`📧 Sending email via ${provider} to ${prescription.patientEmail}`);

        // Generate PDF prescription
        context.log('📄 Generating prescription PDF...');
        const pdfBytes = await generatePrescriptionPDF(prescription, context);
        context.log(`✅ PDF generated: ${pdfBytes.length} bytes`);

        // Send email based on provider - with automatic token refresh on 401
        try {
            if (provider === 'gmail') {
                await sendGmailEmail(context, accessToken, prescription, message, pdfBytes);
            } else if (provider === 'outlook') {
                await sendOutlookEmail(context, accessToken, prescription, message, pdfBytes);
            } else {
                throw new Error(`Unknown email provider: ${provider}`);
            }
        } catch (sendError) {
            // If we get a 401 and have a refresh token, try to refresh
            if ((sendError.message.includes('401') || sendError.message.includes('Unauthorized')) && refreshToken) {
                context.log('🔄 Access token expired, attempting to refresh...');
                
                try {
                    let newAccessToken;
                    let newRefreshToken;
                    
                    if (provider === 'gmail') {
                        const refreshed = await refreshGmailToken(context, refreshToken);
                        newAccessToken = refreshed.accessToken;
                        newRefreshToken = refreshed.refreshToken || refreshToken; // Keep old refresh token if new one not provided
                    } else if (provider === 'outlook') {
                        const refreshed = await refreshOutlookToken(context, refreshToken);
                        newAccessToken = refreshed.accessToken;
                        newRefreshToken = refreshed.refreshToken || refreshToken;
                    } else {
                        throw sendError; // Re-throw if unknown provider
                    }
                    
                    // Update stored tokens in database
                    await tableClient.updateEntity({
                        partitionKey: 'user',
                        rowKey: userEmail,
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken
                    }, 'Merge');
                    
                    context.log('✅ Token refreshed successfully, retrying email send...');
                    
                    // Retry sending email with new token
                    if (provider === 'gmail') {
                        await sendGmailEmail(context, newAccessToken, prescription, message, pdfBytes);
                    } else if (provider === 'outlook') {
                        await sendOutlookEmail(context, newAccessToken, prescription, message, pdfBytes);
                    }
                } catch (refreshError) {
                    context.log(`❌ Token refresh failed: ${refreshError.message}`);
                    throw new Error('Email connection expired. Please reconnect your email in Settings.');
                }
            } else {
                // Re-throw if not a 401 or no refresh token
                throw sendError;
            }
        }

        context.log(`✅ Email sent successfully to ${prescription.patientEmail}`);
        context.res = {
            status: 200,
            body: { 
                success: true,
                message: 'Email sent successfully'
            }
        };
    } catch (error) {
        context.log(`❌ Error sending email: ${error.message}`);
        context.log(`❌ Error stack: ${error.stack}`);
        
        // Provide more detailed error information
        let errorMessage = 'Failed to send email';
        let errorDetails = error.message;
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Email connection expired. Please reconnect your email in Settings.';
            errorDetails = 'Access token may have expired';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'Email permissions insufficient. Please reconnect with proper permissions.';
            errorDetails = 'Missing required email permissions';
        }
        
        context.res = {
            status: 500,
            body: { 
                error: errorMessage,
                details: errorDetails
            }
        };
    }
};

async function loadPDFTemplate(context) {
    const templatePaths = [
        'https://lemon-mushroom-0a5856d10.1.azurestaticapps.net/prescription-template.pdf',
        'https://lemon-mushroom-0a5856d10.1.azurestaticapps.net/prescription 2-1.pdf',
        'https://lemon-mushroom-0a5856d10.1.azurestaticapps.net/prescription-2-1.pdf',
        'https://cortexha.com/prescription-template.pdf',
        'https://cortexha.com/prescription 2-1.pdf'
    ];
    
    for (const templateUrl of templatePaths) {
        try {
            context.log(`Trying to load template from: ${templateUrl}`);
            const response = await fetch(templateUrl);
            
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                if (arrayBuffer.byteLength > 0) {
                    const pdfDoc = await PDFDocument.load(arrayBuffer);
                    context.log(`✅ Successfully loaded template from: ${templateUrl}`);
                    return pdfDoc;
                }
            }
        } catch (error) {
            context.log(`Failed to load template from ${templateUrl}: ${error.message}`);
            continue;
        }
    }
    
    // Fallback: create blank PDF
    context.log('⚠️ No PDF template found. Creating blank PDF...');
    return await PDFDocument.create();
}

async function generatePrescriptionPDF(prescription, context) {
    try {
        context.log('📄 Creating PDF document from template...');
        
        // Load the PDF template (same as frontend)
        const pdfDoc = await loadPDFTemplate(context);
        
        // Add text overlay using the same logic as frontend
        context.log('🖊️ Adding text overlay to template...');
        
        const pages = pdfDoc.getPages();
        let firstPage = pages[0];
        
        // If template has no pages, add one
        if (pages.length === 0) {
            firstPage = pdfDoc.addPage([595.28, 841.89]);
        }
        
        const { width, height } = firstPage.getSize();
        context.log(`📐 Template size: ${width} x ${height}`);
        
        // Embed fonts
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const fontSize = 9.5;
        const lineHeight = 13;
        const leftMargin = width < 600 ? 30 : 50;
        
        // Helper to add text
        const addText = (text, x, y, size = fontSize, bold = false) => {
            if (!text) return;
            firstPage.drawText(String(text), {
                x,
                y,
                size,
                font: bold ? helveticaBold : helveticaFont,
                color: rgb(0, 0, 0),
            });
        };
        
        // Use same positioning as frontend - moved higher
        const patientStartY = height - 240;
        let yPosition = patientStartY;
        
        // PATIENT INFORMATION
        addText('PATIENT INFORMATION', leftMargin, yPosition, 10, true);
        yPosition -= lineHeight * 2.0; // Much larger gap after heading to prevent overlap
        
        const patientName = prescription.patientName || 'Not specified';
        addText(`Name: ${patientName}`, leftMargin, yPosition, 9.5);
        yPosition -= lineHeight;
        
        if (prescription.patientEmail) {
            addText(`Email: ${prescription.patientEmail}`, leftMargin, yPosition, 9);
            yPosition -= lineHeight;
        }
        
        if (prescription.patientIdNumber) {
            addText(`ID/Passport: ${prescription.patientIdNumber}`, leftMargin, yPosition, 9);
            yPosition -= lineHeight;
        }
        
        yPosition -= lineHeight * 0.3;
        
        // DIAGNOSIS
        if (prescription.diagnosis) {
            addText('DIAGNOSIS / INDICATION', leftMargin, yPosition, 10, true);
            yPosition -= lineHeight * 1.0;
            
            // Word wrap
            const words = prescription.diagnosis.split(' ');
            let line = '';
            const maxWidth = width - 120;
            
            for (const word of words) {
                const testLine = line ? `${line} ${word}` : word;
                const textWidth = helveticaFont.widthOfTextAtSize(testLine, 9);
                
                if (textWidth > maxWidth && line) {
                    addText(line, leftMargin, yPosition, 9);
                    yPosition -= lineHeight;
                    line = word;
                } else {
                    line = testLine;
                }
            }
            
            if (line) {
                addText(line, leftMargin, yPosition, 9);
                yPosition -= lineHeight;
            }
            
            yPosition -= lineHeight * 0.2;
        }
        
        // MEDICATIONS - Format: Medication name + dosage instructions + quantity (circled)
        if (prescription.medications && prescription.medications.length > 0) {
            addText('Rx:', leftMargin, yPosition, 11, true);
            yPosition -= lineHeight * 1.5;
            
            let currentPage = firstPage;
            
            prescription.medications.forEach((med, index) => {
                if (yPosition < 150) {
                    const newPage = pdfDoc.addPage([width, height]);
                    currentPage = newPage;
                    yPosition = height - 100;
                }
                
                // Build medication line in format: "MEDICATION NAME FORM STRENGTH Instructions Quantity"
                const medName = med.medicationName || med.name || 'Unknown';
                const formInfo = med.form || 'TAB';
                const strength = med.dosage ? ` ${med.dosage}` : '';
                
                // Build instructions similar to reference: "Take X Tablet(s) Y Orally"
                let instructionText = med.instructions || '';
                if (!instructionText) {
                    // Auto-generate from frequency
                    const frequency = med.frequency || '';
                    const quantityPerDose = med.quantityPerDose || 1;
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
                const medicationLine = `${medName} ${formInfo}${strength} ${instructionText} (${med.quantity || 0})`;
                
                // Check if line fits, otherwise wrap
                const maxLineWidth = width - leftMargin - 60;
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
                            currentPage.drawText(line, {
                                x: leftMargin,
                                y: yPosition,
                                size: 9,
                                font: helveticaFont,
                                color: rgb(0, 0, 0),
                            });
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
                            currentPage.drawText(lineWithQuantity, {
                                x: leftMargin,
                                y: yPosition,
                                size: 9,
                                font: helveticaFont,
                                color: rgb(0, 0, 0),
                            });
                        } else {
                            currentPage.drawText(line, {
                                x: leftMargin,
                                y: yPosition,
                                size: 9,
                                font: helveticaFont,
                                color: rgb(0, 0, 0),
                            });
                            yPosition -= lineHeight * 0.9;
                            // Draw quantity at the end (using parentheses as visual indicator)
                            currentPage.drawText(`(${quantity})`, {
                                x: width - 60,
                                y: yPosition,
                                size: 9,
                                font: helveticaBold,
                                color: rgb(0, 0, 0),
                            });
                        }
                    }
                } else {
                    // Single line - add quantity at the end
                    currentPage.drawText(medicationLine, {
                        x: leftMargin,
                        y: yPosition,
                        size: 9,
                        font: helveticaFont,
                        color: rgb(0, 0, 0),
                    });
                }
                
                yPosition -= lineHeight * 1.2;
            });
        }
        
        // NOTES
        if (prescription.notes && yPosition > 170) {
            yPosition -= lineHeight * 0.5;
            addText('ADDITIONAL NOTES', leftMargin, yPosition, 10, true);
            yPosition -= lineHeight * 1.2;
            
            const words = prescription.notes.split(' ');
            let line = '';
            const maxWidth = width - 120;
            
            for (const word of words) {
                if (yPosition < 170) break;
                
                const testLine = line ? `${line} ${word}` : word;
                const textWidth = helveticaFont.widthOfTextAtSize(testLine, 9);
                
                if (textWidth > maxWidth && line) {
                    addText(line, leftMargin, yPosition, 9);
                    yPosition -= lineHeight;
                    line = word;
                } else {
                    line = testLine;
                }
            }
            
            if (line && yPosition > 170) {
                addText(line, leftMargin, yPosition, 9);
            }
        }
        
        // Add date at bottom right
        const prescriptionDate = prescription.prescriptionDate 
            ? new Date(prescription.prescriptionDate)
            : prescription.createdDate 
                ? new Date(prescription.createdDate)
                : new Date();
        
        // Format date as "DD Month YYYY" (e.g., "3 August 2025")
        const dateOptions = { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        };
        const formattedDate = prescriptionDate.toLocaleDateString('en-ZA', dateOptions);
        
        // Position date at bottom right
        const dateY = 45; // A bit lower on the page
        const dateX = width - 150; // Right side with margin
        
        addText(formattedDate, dateX, dateY, 9);
        
        // Save PDF
        context.log('💾 Saving PDF document...');
        const pdfBytes = await pdfDoc.save();
        
        // Validate PDF was created and has proper structure
        if (!pdfBytes || pdfBytes.length === 0) {
            throw new Error('Generated PDF is empty');
        }
        
        // Convert to Uint8Array if needed
        let pdfBytesArray;
        if (pdfBytes instanceof Uint8Array) {
            pdfBytesArray = pdfBytes;
        } else if (Buffer.isBuffer(pdfBytes)) {
            pdfBytesArray = new Uint8Array(pdfBytes);
        } else {
            pdfBytesArray = Uint8Array.from(pdfBytes);
        }
        
        // Check PDF header to ensure it's valid (first 4 bytes should be '%PDF')
        const pdfHeader = String.fromCharCode(...pdfBytesArray.slice(0, 4));
        context.log(`📄 PDF header check: "${pdfHeader}" (length: ${pdfBytesArray.length} bytes)`);
        
        if (!pdfHeader.startsWith('%PDF')) {
            context.log(`⚠️ Warning: PDF header may be invalid: ${pdfHeader}`);
            // Don't throw error, just log - pdf-lib should generate valid PDFs
            // The header check might be failing due to encoding
        }
        
        context.log(`✅ PDF saved successfully: ${pdfBytesArray.length} bytes`);
        return pdfBytesArray; // Return as Uint8Array
        
    } catch (error) {
        context.log(`❌ Error generating PDF: ${error.message}`);
        context.log(`❌ Error stack: ${error.stack}`);
        throw new Error(`Failed to generate PDF: ${error.message}`);
    }
}

async function refreshGmailToken(context, refreshToken) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
    }
    
    context.log('🔄 Refreshing Gmail token...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        context.log(`❌ Token refresh failed: ${errorText}`);
        throw new Error(`Failed to refresh Gmail token: ${response.status}`);
    }
    
    const tokenData = await response.json();
    context.log('✅ Gmail token refreshed successfully');
    
    return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token // May be undefined if not provided
    };
}

async function refreshOutlookToken(context, refreshToken) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
    
    if (!clientId || !clientSecret) {
        throw new Error('Microsoft OAuth credentials not configured');
    }
    
    context.log('🔄 Refreshing Outlook token...');
    
    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: 'https://graph.microsoft.com/Mail.Send offline_access'
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        context.log(`❌ Token refresh failed: ${errorText}`);
        throw new Error(`Failed to refresh Outlook token: ${response.status}`);
    }
    
    const tokenData = await response.json();
    context.log('✅ Outlook token refreshed successfully');
    
    return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token // May be undefined if not provided
    };
}

async function sendGmailEmail(context, accessToken, prescription, message, pdfBytes) {
    // Validate PDF bytes
    if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error('PDF bytes are empty, cannot attach to email');
    }
    
    context.log(`📎 Preparing PDF attachment: ${pdfBytes.length} bytes`);
    
    // Create multipart MIME email with PDF attachment
    const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    // Convert PDF bytes to base64 - ensure proper buffer conversion
    const pdfBuffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfName = `Prescription_${prescription.prescriptionNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    context.log(`📎 PDF base64 length: ${pdfBase64.length} chars`);
    
    // Build MIME message - using proper line endings
    const emailParts = [
        `To: ${prescription.patientEmail}`,
        `Subject: Prescription from ${prescription.doctorName} - ${prescription.prescriptionNumber}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        message,
        '',
        `--${boundary}`,
        `Content-Type: application/pdf`,
        `Content-Disposition: attachment; filename="${pdfName}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        // Split base64 into lines (76 chars) with proper line breaks
        pdfBase64.match(/.{1,76}/g) ? pdfBase64.match(/.{1,76}/g).join('\r\n') : pdfBase64,
        '',
        `--${boundary}--`
    ];
    
    const emailContent = emailParts.join('\r\n');

    // Encode email in base64url format for Gmail API
    const encodedMessage = Buffer.from(emailContent).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            raw: encodedMessage
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        context.log(`Gmail API error: ${errorText}`);
        const errorMessage = `Failed to send Gmail: ${response.status}`;
        if (response.status === 401) {
            throw new Error('401 Unauthorized');
        }
        throw new Error(errorMessage);
    }

    context.log(`✅ Email with PDF attachment sent via Gmail to ${prescription.patientEmail}`);
}

async function sendOutlookEmail(context, accessToken, prescription, message, pdfBytes) {
    // Validate PDF bytes
    if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error('PDF bytes are empty, cannot attach to email');
    }
    
    context.log(`📎 Preparing PDF attachment for Outlook: ${pdfBytes.length} bytes`);
    
    // Convert PDF bytes to base64 - ensure we use Buffer properly
    // pdfBytes should be Uint8Array from pdf-lib
    const pdfBuffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfName = `Prescription_${prescription.prescriptionNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    context.log(`📎 PDF base64 length: ${pdfBase64.length} chars`);
    
    // Microsoft Graph API email with attachment
    const emailPayload = {
        message: {
            subject: `Prescription from ${prescription.doctorName} - ${prescription.prescriptionNumber}`,
            body: {
                contentType: 'Text',
                content: message
            },
            toRecipients: [{
                emailAddress: {
                    address: prescription.patientEmail
                }
            }],
            attachments: [{
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: pdfName,
                contentType: 'application/pdf',
                contentBytes: pdfBase64,
                size: pdfBytes.length
            }]
        }
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        context.log(`Outlook API error: ${errorText}`);
        const errorMessage = `Failed to send Outlook email: ${response.status}`;
        if (response.status === 401) {
            throw new Error('401 Unauthorized');
        }
        throw new Error(errorMessage);
    }

    context.log(`✅ Email with PDF attachment sent via Outlook to ${prescription.patientEmail}`);
}

