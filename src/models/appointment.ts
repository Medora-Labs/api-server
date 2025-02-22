import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  doctorId: string;
  patientName: string;
  patientPhone: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    doctorId: {
      type: String,
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientPhone: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled', 'completed'],
      default: 'scheduled',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for doctorId and startTime for efficient querying
appointmentSchema.index({ doctorId: 1, startTime: 1 });

export default mongoose.model<IAppointment>('Appointment', appointmentSchema); 