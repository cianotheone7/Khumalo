// Azure Appointment Service - Azure Table Storage integration
// Manages appointments in Azure Table Storage

// Azure Table Storage Configuration
const AZURE_STORAGE_ACCOUNT_NAME = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || 'medprac20241008';
const AZURE_STORAGE_ENDPOINT = `https://${AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`;

// SAS Token for Appointments Table from environment
// Using general SAS token that works for all tables
const APPOINTMENTS_SAS_TOKEN = import.meta.env.VITE_APPOINTMENTS_SAS_TOKEN || 
  '?sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-12-30T20:02:20Z&st=2025-10-29T11:47:20Z&spr=https&sig=aYu9vvB7FVKK9XeGr5%2BqVoEyXRTYYP1jgqW8%2BvjOlYE%3D';

// Table name
const APPOINTMENTS_TABLE = 'Appointments';

// Appointment interfaces
export interface Appointment {
  partitionKey: string; // 'appointment'
  rowKey: string; // unique ID
  id: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  date: string; // ISO date string
  time: string; // HH:mm format
  duration: number; // minutes
  type: 'consultation' | 'follow-up' | 'procedure' | 'checkup' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}

// Helper functions
function getTableUrl(): string {
  return `${AZURE_STORAGE_ENDPOINT}/${APPOINTMENTS_TABLE}${APPOINTMENTS_SAS_TOKEN}`;
}

function getEntityUrl(partitionKey: string, rowKey: string): string {
  const encodedPartitionKey = encodeURIComponent(partitionKey);
  const encodedRowKey = encodeURIComponent(rowKey);
  return `${AZURE_STORAGE_ENDPOINT}/${APPOINTMENTS_TABLE}(PartitionKey='${encodedPartitionKey}',RowKey='${encodedRowKey}')${APPOINTMENTS_SAS_TOKEN}`;
}

// Generate time slots for a day (9 AM - 5 PM, 30-minute intervals)
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

// Get all appointments
export const getAppointments = async (filters?: {
  patientId?: string;
  doctorId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<Appointment[]> => {
  try{
    
    const tableUrl = getTableUrl();
    
    const response = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      mode: 'cors'
    });

    if (response.ok) {
      const data = await response.json();
      const appointments = data.value || [];
      
      let formattedAppointments: Appointment[] = appointments.map((a: any) => ({
        partitionKey: a.PartitionKey || '',
        rowKey: a.RowKey || '',
        id: a.id || a.RowKey,
        patientId: a.patientId || '',
        patientName: a.patientName || '',
        patientEmail: a.patientEmail || '',
        patientPhone: a.patientPhone || '',
        doctorId: a.doctorId || '',
        doctorName: a.doctorName || '',
        date: a.date || '',
        time: a.time || '',
        duration: a.duration || 30,
        type: a.type || 'consultation',
        status: a.status || 'scheduled',
        reason: a.reason || '',
        notes: a.notes || '',
        createdAt: a.createdAt || '',
        updatedAt: a.updatedAt || ''
      }));
      
      // Apply filters
      if (filters) {
        if (filters.patientId) {
          formattedAppointments = formattedAppointments.filter(a => a.patientId === filters.patientId);
        }
        if (filters.doctorId) {
          formattedAppointments = formattedAppointments.filter(a => a.doctorId === filters.doctorId);
        }
        if (filters.startDate) {
          formattedAppointments = formattedAppointments.filter(a => a.date >= filters.startDate!);
        }
        if (filters.endDate) {
          formattedAppointments = formattedAppointments.filter(a => a.date <= filters.endDate!);
        }
        if (filters.status) {
          formattedAppointments = formattedAppointments.filter(a => a.status === filters.status);
        }
      }
      
      return formattedAppointments;
    } else if (response.status === 403 || response.status === 404) {
      console.warn('⚠️ Appointments table not accessible.');
      console.warn('💡 To fix: Create "Appointments" table in Azure Table Storage');
      console.warn('💡 Or run: https://lemon-mushroom-0a5856d10.1.azurestaticapps.net/api/initPrescriptionsTable');
      return [];
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to get appointments:', response.status, errorText);
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting appointments:', error);
    return [];
  }
};

// Get available time slots for a specific date
export const getAvailableSlots = async (date: string, doctorId?: string): Promise<TimeSlot[]> => {
  try {
    const allSlots = generateTimeSlots();
    const appointments = await getAppointments({ 
      doctorId,
      startDate: date,
      endDate: date
    });
    
    const activeAppointments = appointments.filter(
      a => a.status !== 'cancelled' && a.status !== 'no-show'
    );
    
    return allSlots.map(time => {
      const appointment = activeAppointments.find(a => a.time === time);
      return {
        time,
        available: !appointment,
        appointmentId: appointment?.id
      };
    });
  } catch (error) {
    console.error('❌ Error getting available slots:', error);
    return [];
  }
};

// Create appointment
export const createAppointment = async (
  appointmentData: Omit<Appointment, 'id' | 'partitionKey' | 'rowKey' | 'createdAt' | 'updatedAt'>
): Promise<Appointment | null> => {
  try {
    const appointment: Appointment = {
      partitionKey: 'appointment',
      rowKey: `${appointmentData.patientId}_${Date.now()}`,
      id: `appt-${Date.now()}`,
      ...appointmentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const tableUrl = getTableUrl();
    
    const requestBody = {
      PartitionKey: appointment.partitionKey,
      RowKey: appointment.rowKey,
      id: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail || '',
      patientPhone: appointment.patientPhone || '',
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      type: appointment.type,
      status: appointment.status,
      reason: appointment.reason || '',
      notes: appointment.notes || '',
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    };

    const response = await fetch(tableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'Prefer': 'return-no-content',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(requestBody),
      mode: 'cors'
    });

    if (response.ok || response.status === 201 || response.status === 204) {
      return appointment;
    } else if (response.status === 403 || response.status === 404) {
      console.error('❌ Appointments table not accessible.');
      return null;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create appointment:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    return null;
  }
};

// Update appointment
export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<boolean> => {
  try {
    const appointments = await getAppointments();
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return false;

    const entityUrl = getEntityUrl(appointment.partitionKey, appointment.rowKey);
    
    const updateData: any = {
      PartitionKey: appointment.partitionKey,
      RowKey: appointment.rowKey,
      updatedAt: new Date().toISOString()
    };
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.time !== undefined) updateData.time = updates.time;
    
    const response = await fetch(entityUrl, {
      method: 'MERGE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      body: JSON.stringify(updateData),
      mode: 'cors'
    });

    return response.ok || response.status === 204;
  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    return false;
  }
};

// Delete appointment
export const deleteAppointment = async (id: string): Promise<boolean> => {
  try {
    const appointments = await getAppointments();
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return false;

    const entityUrl = getEntityUrl(appointment.partitionKey, appointment.rowKey);
    
    const response = await fetch(entityUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json;odata=nometadata',
        'If-Match': '*',
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2019-02-02'
      },
      mode: 'cors'
    });

    return response.ok || response.status === 204;
  } catch (error) {
    console.error('❌ Error deleting appointment:', error);
    return false;
  }
};

// Cancel appointment
export const cancelAppointment = async (id: string, reason?: string): Promise<boolean> => {
  return updateAppointment(id, { 
    status: 'cancelled',
    notes: reason ? `Cancelled: ${reason}` : 'Cancelled'
  });
};

