export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  duration: number; // in minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  type: 'consultation' | 'follow-up' | 'emergency' | 'routine' | 'specialist';
  reason: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}

export interface DaySchedule {
  date: string;
  slots: TimeSlot[];
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  workingHours: {
    start: string;
    end: string;
    days: number[]; // 0 = Sunday, 1 = Monday, etc.
  };
  breakTimes: {
    start: string;
    end: string;
  }[];
}

export interface AppointmentFormData {
  patientId: string;
  patientName: string;
  patientEmail: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  reason: string;
  notes?: string;
}

