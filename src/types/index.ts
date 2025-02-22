export interface Doctor {
  id: string;
  userId: string;
  name: string;
  specialization: string;
  description: string;
  phoneNumber: string;
  calendarId?: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  patientPhone: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'cancelled' | 'completed';
  googleEventId?: string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
} 