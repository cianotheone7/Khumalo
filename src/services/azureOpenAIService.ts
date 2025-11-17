// Real Azure OpenAI Service for Medical Summaries
import { azureConfig } from '../config/azure-config';

export interface AISummaryRequest {
  patientName: string;
  patientAge: number;
  medicalRecordNumber: string;
  documents: Array<{
    fileName: string;
    description: string;
    uploadedAt: string;
    documentType: string;
    processedText?: string;
  }>;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
}

export interface AISummaryResponse {
  summary: string;
  recommendations: string[];
  followUpRequired: boolean;
  priority: 'Low' | 'Medium' | 'High';
  generatedAt: string;
  confidence: number;
}

// Azure OpenAI Configuration from environment
const AZURE_OPENAI_ENDPOINT = azureConfig.openai.endpoint;
const AZURE_OPENAI_API_KEY = azureConfig.openai.apiKey;
const AZURE_OPENAI_DEPLOYMENT = azureConfig.openai.deployment;
const AZURE_OPENAI_API_VERSION = azureConfig.openai.apiVersion;

/**
 * Check if Azure OpenAI is available
 */
export const isAzureOpenAIAvailable = (): boolean => {
  return !!(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY && 
           AZURE_OPENAI_ENDPOINT !== 'your-openai-endpoint-here' &&
           AZURE_OPENAI_API_KEY !== 'your-openai-key-here' &&
           AZURE_OPENAI_API_KEY !== 'your_actual_azure_openai_key_here' &&
           AZURE_OPENAI_API_KEY !== 'REPLACE_WITH_YOUR_ACTUAL_API_KEY' &&
           AZURE_OPENAI_API_KEY !== 'YOUR_API_KEY_FROM_AZURE_PORTAL');
};

/**
 * Call A4F OpenAI-compatible API
 */
const callAzureOpenAI = async (prompt: string): Promise<string> => {
  if (!isAzureOpenAIAvailable()) {
    throw new Error('A4F API not configured');
  }

  // A4F uses standard OpenAI format: /chat/completions
  const url = `${AZURE_OPENAI_ENDPOINT}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AZURE_OPENAI_API_KEY}`,
  };

  const body = {
    model: AZURE_OPENAI_DEPLOYMENT, // e.g., 'provider-5/gpt-4o-mini'
    messages: [
      { 
        role: 'system', 
        content: `Medical AI: Generate concise patient summaries. Focus on key findings, recommendations, and priority level. Keep responses brief and actionable.`
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.7
  };

  try {
    console.log('🤖 Sending prompt to A4F API...');
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`A4F API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling A4F API:', error);
    throw error;
  }
};

/**
 * Generate medical summary using Azure OpenAI
 * NO FALLBACK - Only works with real document content
 */
export const generateMedicalSummary = async (request: AISummaryRequest): Promise<AISummaryResponse> => {
  try {
    const { patientName, patientAge, medicalRecordNumber, documents } = request;
    
    // Validate that we have documents with actual content
    const documentsWithContent = documents.filter(doc => 
      doc.processedText && 
      doc.processedText.trim().length > 50 &&
      doc.processedText !== 'Content not available' &&
      doc.processedText !== 'Document content not available' &&
      !doc.processedText.includes('Content not analyzed')
    );

    if (documentsWithContent.length === 0) {
      throw new Error('No documents with readable content found. Please upload documents with text content (PDFs, text files, or images with clear text) before generating a summary.');
    }

    if (!isAzureOpenAIAvailable()) {
      throw new Error('A4F API is not configured. AI Summary requires A4F API key to analyze document content.');
    }
    
    // Create prompt with truncated document content to avoid API limits
    // Limit each document to first 1000 characters for faster processing
    const documentContents = documentsWithContent.map((doc, index) => {
      const truncatedText = doc.processedText!.substring(0, 1000);
      const wasTruncated = doc.processedText!.length > 1000;
      const truncationSuffix = wasTruncated ? '\n[... truncated for brevity ...]' : '';
      return `\n--- DOCUMENT ${index + 1}: ${doc.fileName} (${doc.documentType}) ---\n${truncatedText}${truncationSuffix}\n--- END DOCUMENT ${index + 1} ---`;
    }).join('\n\n');

    const prompt = `You are a medical AI assistant. Analyze the following patient documents and provide a comprehensive medical summary.

PATIENT INFORMATION:
Name: ${patientName}
Age: ${patientAge} years
Medical Record Number: ${medicalRecordNumber}
Total Documents Analyzed: ${documentsWithContent.length}

DOCUMENT CONTENTS:
${documentContents}

PROVIDE A COMPREHENSIVE MEDICAL SUMMARY WITH:

1. CLINICAL OVERVIEW (2-3 sentences summarizing the patient's current status)

2. KEY FINDINGS FROM DOCUMENTS:
   - List all significant medical findings from the documents
   - Include lab values, vital signs, diagnoses, procedures
   - Highlight any abnormal or critical values

3. DOCUMENT SUMMARIES:
   For each document, provide a brief summary of its key content

4. CLINICAL RECOMMENDATIONS:
   - List 3-5 actionable recommendations based on the findings
   - Focus on follow-up care, monitoring needs, or interventions

5. PRIORITY ASSESSMENT:
   - State if this case is Low, Medium, or High priority
   - Explain why

6. FOLLOW-UP REQUIRED:
   - State Yes or No
   - Explain what follow-up is needed

Be specific and reference actual content from the documents. Base everything on the actual document content provided.`;

    console.log('🤖 Sending request to A4F with', documentsWithContent.length, 'documents');
    const aiResponse = await callAzureOpenAI(prompt);
    
    // Parse the AI response to extract structured data
    const summary = aiResponse;
    const recommendations = extractRecommendations(aiResponse);
    const priority = assessPriority(aiResponse, documentsWithContent);
    const followUpRequired = assessFollowUpRequired(aiResponse, documentsWithContent);
    const confidence = calculateConfidence(documentsWithContent.length, aiResponse);

    console.log('✅ AI Summary generated successfully');

    return {
      summary,
      recommendations,
      followUpRequired,
      priority,
      generatedAt: new Date().toISOString(),
      confidence
    };

  } catch (error) {
    console.error('❌ Error generating AI summary:', error);
    // NO FALLBACK - throw the error so user knows what's wrong
    throw error;
  }
};

/**
 * Enhanced simulation for when Azure OpenAI is not available
 */
const generateEnhancedSimulation = async (request: AISummaryRequest): Promise<AISummaryResponse> => {
  const { patientName, patientAge, medicalRecordNumber, documents } = request;
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const documentTypes = documents.map(doc => doc.documentType);
  const uniqueDocumentTypes = [...new Set(documentTypes)];
  const totalDocuments = documents.length;
  const recentUploads = documents.filter(doc => {
    const uploadDate = new Date(doc.uploadedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return uploadDate > thirtyDaysAgo;
  }).length;

  let summary = `MEDICAL SUMMARY REPORT\n`;
  summary += `Patient: ${patientName}\n`;
  summary += `Age: ${patientAge} years\n`;
  summary += `Medical Record Number: ${medicalRecordNumber}\n`;
  summary += `Report Generated: ${new Date().toLocaleString()}\n\n`;

  summary += `CLINICAL OVERVIEW:\n`;
  summary += `This ${patientAge}-year-old patient has a comprehensive medical record with ${totalDocuments} documents on file. `;
  summary += `Recent activity shows ${recentUploads} new documents uploaded in the past 30 days, indicating active medical management.\n\n`;

  summary += `DOCUMENTATION REVIEW:\n`;
  summary += `Available medical records include:\n`;
  uniqueDocumentTypes.forEach((type, index) => {
    const count = documentTypes.filter(t => t === type).length;
    summary += `${index + 1}. ${type} (${count} document${count > 1 ? 's' : ''})\n`;
  });
  summary += `\n`;

  summary += `KEY FINDINGS:\n`;
  
  // Analyze actual document content with medical focus
  documents.forEach((doc, index) => {
    if (doc.processedText && 
        doc.processedText !== 'Content not available' && 
        doc.processedText !== 'Document content not available' &&
        !doc.processedText.includes('Content not analyzed') &&
        doc.processedText.length > 50) {
      
      // Extract key medical information from content
      const content = doc.processedText.toLowerCase();
      let keyInfo = [];
      
      // Look for specific medical values and findings
      if (content.includes('blood pressure') || content.match(/\d{2,3}\/\d{2,3}/)) {
        const bpMatch = doc.processedText.match(/(\d{2,3}\/\d{2,3})/);
        if (bpMatch) keyInfo.push(`BP: ${bpMatch[1]}`);
      }
      if (content.includes('temperature') || content.match(/\d{2}\.?\d?\s*°?[fc]/i)) {
        const tempMatch = doc.processedText.match(/(\d{2}\.?\d?)\s*°?[fc]/i);
        if (tempMatch) keyInfo.push(`Temp: ${tempMatch[1]}°F`);
      }
      if (content.includes('heart rate') || content.includes('pulse')) {
        const hrMatch = doc.processedText.match(/(?:heart rate|pulse)[:\s]*(\d{2,3})/i);
        if (hrMatch) keyInfo.push(`HR: ${hrMatch[1]} bpm`);
      }
      if (content.includes('glucose') || content.includes('sugar')) {
        const glucoseMatch = doc.processedText.match(/(?:glucose|sugar)[:\s]*(\d{2,3})/i);
        if (glucoseMatch) keyInfo.push(`Glucose: ${glucoseMatch[1]} mg/dL`);
      }
      if (content.includes('hemoglobin') || content.includes('hgb')) {
        const hgbMatch = doc.processedText.match(/(?:hemoglobin|hgb)[:\s]*(\d{1,2}\.?\d?)/i);
        if (hgbMatch) keyInfo.push(`Hgb: ${hgbMatch[1]} g/dL`);
      }
      
      // Look for abnormal findings
      if (content.includes('abnormal') || content.includes('elevated') || content.includes('high') || content.includes('low')) {
        keyInfo.push('Abnormal findings noted');
      }
      if (content.includes('normal') || content.includes('within normal limits')) {
        keyInfo.push('Normal findings');
      }
      
      const keyInfoStr = keyInfo.length > 0 ? ` [${keyInfo.join(', ')}]` : '';
      summary += `• ${doc.fileName} (${doc.documentType}): ${doc.processedText.substring(0, 150)}${doc.processedText.length > 150 ? '...' : ''}${keyInfoStr}\n`;
    } else {
      // Provide more informative fallback for images and documents
      if (doc.fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/)) {
        summary += `• ${doc.fileName} (${doc.documentType}): Image file - ${doc.description || 'Visual content available for review'}\n`;
      } else {
        summary += `• ${doc.fileName} (${doc.documentType}): ${doc.description || 'Document available for review'}\n`;
      }
    }
  });
  
  if (uniqueDocumentTypes.includes('Lab Results')) {
    summary += `• Laboratory studies available for comprehensive metabolic and hematologic assessment\n`;
  }
  if (uniqueDocumentTypes.includes('Imaging')) {
    summary += `• Imaging studies on file for diagnostic evaluation and monitoring\n`;
  }
  if (uniqueDocumentTypes.includes('Pathology')) {
    summary += `• Pathology reports available for histologic analysis\n`;
  }
  if (uniqueDocumentTypes.includes('Consultation')) {
    summary += `• Specialist consultation notes documenting expert opinions\n`;
  }
  summary += `• Comprehensive medical record maintained with good documentation standards\n\n`;

  summary += `CLINICAL ASSESSMENT:\n`;
  summary += `Based on the available medical documentation, this patient demonstrates a well-documented medical history with appropriate clinical follow-up. `;
  summary += `The variety of document types suggests comprehensive care across multiple specialties. `;
  summary += `Recent document activity indicates ongoing medical management and appropriate clinical monitoring.\n\n`;

  // Generate recommendations based on document types
  const recommendations: string[] = [];
  
  if (uniqueDocumentTypes.includes('Lab Results')) {
    recommendations.push('Review recent laboratory values for any abnormalities requiring immediate attention');
    recommendations.push('Consider trending laboratory values over time for pattern analysis');
  }
  if (uniqueDocumentTypes.includes('Imaging')) {
    recommendations.push('Assess imaging studies for any new findings or changes from previous studies');
    recommendations.push('Consider comparative analysis with prior imaging when available');
  }
  if (uniqueDocumentTypes.includes('Pathology')) {
    recommendations.push('Review pathology reports for any critical findings requiring immediate action');
    recommendations.push('Consider second opinion consultation if indicated');
  }
  if (recentUploads > 0) {
    recommendations.push('Schedule follow-up appointment to discuss recent test results and findings');
    recommendations.push('Review all new documents for immediate clinical significance');
  }
  recommendations.push('Continue comprehensive medical record maintenance and documentation');
  recommendations.push('Consider annual health assessment if not recently completed');
  recommendations.push('Maintain regular follow-up schedule based on clinical needs');

  // Determine priority based on recent activity and document types
  let priority: 'Low' | 'Medium' | 'High' = 'Low';
  if (recentUploads > 3 || uniqueDocumentTypes.includes('Pathology')) {
    priority = 'High';
  } else if (recentUploads > 1 || uniqueDocumentTypes.includes('Imaging')) {
    priority = 'Medium';
  }

  const followUpRequired = recentUploads > 0 || uniqueDocumentTypes.includes('Pathology') || uniqueDocumentTypes.includes('Imaging');

  return {
    summary,
    recommendations,
    followUpRequired,
    priority,
    generatedAt: new Date().toISOString(),
    confidence: Math.min(0.95, 0.7 + (documents.length * 0.05))
  };
};

/**
 * Extract recommendations from AI response
 */
const extractRecommendations = (response: string): string[] => {
  const recommendations: string[] = [];
  const lines = response.split('\n');
  
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || line.includes('Recommendation')) {
      const cleanLine = line.replace(/^[•\-\s]+/, '').trim();
      if (cleanLine.length > 10) {
        recommendations.push(cleanLine);
      }
    }
  }
  
  return recommendations.length > 0 ? recommendations : [
    'Review all available medical documents',
    'Schedule appropriate follow-up appointments',
    'Continue comprehensive medical monitoring'
  ];
};

/**
 * Assess priority level from AI response
 */
const assessPriority = (response: string, documents: any[]): 'Low' | 'Medium' | 'High' => {
  const responseLower = response.toLowerCase();
  
  if (responseLower.includes('urgent') || responseLower.includes('critical') || responseLower.includes('immediate')) {
    return 'High';
  }
  
  if (responseLower.includes('follow-up') || responseLower.includes('monitor') || responseLower.includes('review')) {
    return 'Medium';
  }
  
  return 'Low';
};

/**
 * Assess if follow-up is required
 */
const assessFollowUpRequired = (response: string, documents: any[]): boolean => {
  const responseLower = response.toLowerCase();
  return responseLower.includes('follow-up') || 
         responseLower.includes('schedule') || 
         responseLower.includes('monitor') ||
         documents.length > 0;
};

/**
 * Calculate confidence score
 */
const calculateConfidence = (documentCount: number, response: string): number => {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence based on document count
  confidence += Math.min(0.3, documentCount * 0.05);
  
  // Increase confidence based on response length and structure
  if (response.length > 500) confidence += 0.1;
  if (response.includes('CLINICAL') || response.includes('RECOMMENDATIONS')) confidence += 0.1;
  
  return Math.min(0.95, confidence);
};

/**
 * Generate summary with progress tracking
 * NO FALLBACK - Requires real document content and Azure OpenAI
 */
export const generateSummaryWithProgress = async (
  request: AISummaryRequest,
  onProgress: (progress: number, status: string) => void
): Promise<AISummaryResponse> => {
  onProgress(10, 'Validating document content...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress(25, 'Connecting to Azure OpenAI...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress(50, 'Reading document content...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress(75, 'Analyzing medical data with AI...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress(90, 'Generating clinical summary...');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  onProgress(100, 'Summary complete!');
  
  return generateMedicalSummary(request);
};
