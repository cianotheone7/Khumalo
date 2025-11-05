export interface Medication {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'inhaler' | 'patch';
  strength: string;
  unit: 'mg' | 'g' | 'ml' | 'mcg' | 'units';
  category: string;
  description?: string;
  sideEffects?: string[];
  contraindications?: string[];
}

export interface PrescriptionItem {
  medication: Medication;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  refills?: number;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  doctorLicense: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  date: string;
  diagnosis: string;
  medications: PrescriptionItem[];
  notes?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  pdfUrl?: string;
  emailSent?: boolean;
  emailSentAt?: string;
}

export interface PrescriptionFormData {
  patientId: string;
  patientName: string;
  patientEmail: string;
  diagnosis: string;
  medications: PrescriptionItem[];
  notes?: string;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  description: string;
  medications: PrescriptionItem[];
  category: string;
  isDefault: boolean;
}

